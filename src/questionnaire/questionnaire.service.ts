import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { TX_OPTIONS } from 'src/common/prisma-tx.options';
import { levelFromScore } from 'src/placement/placement.logic';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuestionnaireAnswersDto } from './dto/questionnaire.dto';
import {
  answersToArray,
  checkAnswers,
  isQuestionnaireDoc,
  moduleRowsFromLessons,
  parseQuestionnaireDoc,
  publicQuestionnaire,
  scorePlacement,
  type AnswerMap,
  type ModuleRow,
  type PlacementOutcome,
  type QuestionnaireDoc,
} from './questionnaire.logic';

export const DEFAULT_COURSE_ID = 'python_advanced';

type Active = { id: number; version: number; doc: QuestionnaireDoc };

/** Một lần nộp đã chấm, chưa ghi: tách ra để POST /survey kiểm hợp lệ TRƯỚC khi ghi survey. */
export type PreparedSubmission = {
  courseId: string;
  active: Active;
  answers: AnswerMap;
  self: AnswerMap;
  outcome: PlacementOutcome;
};

/** Trang làm bài là route công khai: cache ngắn để cả lớp mở cùng lúc không dội DB (như /placement). */
const ACTIVE_TTL_MS = 60_000;
/** Danh sách module đổi khi nạp lại giáo trình; 5 phút là đủ mới. */
const MODULES_TTL_MS = 5 * 60_000;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

@Injectable()
export class QuestionnaireService {
  private readonly active = new Map<
    string,
    { at: number; value: Active | null }
  >();
  private readonly modules = new Map<
    string,
    { at: number; rows: ModuleRow[] }
  >();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bản đang bật của khoá. Bảng `questionnaires` không có cột course_id (chỉ THÊM được cột,
   * và hiện chỉ có một khoá), nên khoá học nằm trong `questions_json.course_id`. Bản mảng cũ
   * của /placement không có course_id: bỏ qua.
   */
  private async loadActive(courseId: string): Promise<Active | null> {
    const hit = this.active.get(courseId);
    if (hit && Date.now() - hit.at < ACTIVE_TTL_MS) return hit.value;
    const rows = await this.prisma.questionnaire.findMany({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });
    let value: Active | null = null;
    for (const row of rows) {
      if (!isQuestionnaireDoc(row.questionsJson)) continue;
      // Sai hình thì ném ở đây (500 có log), không lọt ra thành nút trắng ở FE.
      const doc = parseQuestionnaireDoc(row.questionsJson);
      if (doc.course_id !== courseId) continue;
      value = { id: row.id, version: row.version, doc };
      break;
    }
    this.active.set(courseId, { at: Date.now(), value });
    return value;
  }

  private async requireActive(courseId: string): Promise<Active> {
    const a = await this.loadActive(courseId);
    if (!a)
      throw new NotFoundException(
        `Chưa có bộ câu hỏi đầu vào cho khoá ${courseId}`,
      );
    return a;
  }

  /**
   * Thứ tự module và bài đầu của từng module, đọc từ bảng `lessons` (spec §3: không ghi cứng).
   * Khoá chưa có bài mang mã module thì dùng `modules` ghi trong bộ câu lúc dựng.
   */
  private async moduleRows(courseId: string, doc: QuestionnaireDoc) {
    const hit = this.modules.get(courseId);
    if (hit && Date.now() - hit.at < MODULES_TTL_MS) return hit.rows;
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId, sortOrder: { gte: 1, lt: 1000 } },
      select: { module: true, sortOrder: true },
    });
    const fromDb = moduleRowsFromLessons(lessons);
    const rows = fromDb.length ? fromDb : (doc.modules ?? []);
    this.modules.set(courseId, { at: Date.now(), rows });
    return rows;
  }

  /** GET /questionnaire[/:courseId]: bộ câu KHÔNG kèm đáp án đúng và lời giải. */
  async getQuestionnaire(courseId: string) {
    const a = await this.requireActive(courseId);
    return {
      ok: true,
      questionnaire_id: a.id,
      ...publicQuestionnaire({ ...a.doc, version: a.version }),
    };
  }

  /** Kiểm và chấm, chưa ghi gì. Ném 404/409/400 như route submit. */
  async prepare(
    courseId: string,
    dto: QuestionnaireAnswersDto,
  ): Promise<PreparedSubmission> {
    const active = await this.requireActive(courseId);
    if (
      dto.questionnaire_id !== undefined &&
      dto.questionnaire_id !== active.id
    )
      throw new ConflictException(
        'Bộ câu hỏi đã được cập nhật, hãy tải lại trang',
      );
    const err = checkAnswers(active.doc, dto.answers, dto.self);
    if (err) throw new BadRequestException(err);
    const answers = dto.answers;
    const self = dto.self ?? {};
    const outcome = scorePlacement(
      active.doc,
      answers,
      self,
      await this.moduleRows(courseId, active.doc),
    );
    return { courseId, active, answers, self, outcome };
  }

  /**
   * Ghi kết quả ở hai nơi trong MỘT transaction:
   *  1. `placement_attempts` (một dòng mỗi người mỗi bản câu hỏi): nộp lại thì CẬP NHẬT, không
   *     nhân đôi; cùng bảng với /placement nên phân tích một chỗ.
   *  2. `surveys.data_json.placement[courseId]` của bản survey MỚI NHẤT (sheet: "lưu vào
   *     surveys.data_json"). Gộp vào bản đó chứ KHÔNG tạo bản mới: RoadmapService đọc bản mới
   *     nhất để chọn lộ trình, tạo bản chỉ có kết quả xếp module sẽ làm mất career_target /
   *     language / domain của người đó (docs/questionnaire-spec.md §5). Chưa có survey nào thì
   *     tạo một bản chỉ chứa placement; POST /survey sau đó mang nó sang bản mới.
   */
  async persist(userId: number, p: PreparedSubmission) {
    const { active, outcome, courseId } = p;
    const record = {
      questionnaire_id: active.id,
      version: active.version,
      answers: p.answers,
      self: p.self,
      result: resultOf(outcome),
      submitted_at: new Date().toISOString(),
    };
    const updated = await this.prisma.$transaction(async (tx) => {
      const key = {
        userId_questionnaireId: { userId, questionnaireId: active.id },
      };
      const prev = await tx.placementAttempt.findUnique({
        where: key,
        select: { id: true },
      });
      const row = {
        answers: answersToArray(active.doc, p.answers),
        score: outcome.correct_count,
        total: outcome.total,
      };
      await tx.placementAttempt.upsert({
        where: key,
        create: { userId, questionnaireId: active.id, ...row },
        update: row,
      });

      const latest = await tx.survey.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, dataJson: true },
      });
      const data = isObj(latest?.dataJson) ? latest.dataJson : {};
      const placement = {
        ...(isObj(data.placement) ? data.placement : {}),
        [courseId]: record,
      };
      const dataJson = { ...data, placement } as Prisma.InputJsonValue;
      if (latest)
        await tx.survey.update({
          where: { id: latest.id },
          data: { dataJson },
        });
      else await tx.survey.create({ data: { userId, dataJson } });
      return prev !== null;
    }, TX_OPTIONS);

    return {
      ok: true,
      done: true,
      updated,
      course_id: courseId,
      questionnaire_id: active.id,
      version: active.version,
      ...resultOf(outcome),
    };
  }

  async submit(userId: number, courseId: string, dto: QuestionnaireAnswersDto) {
    return this.persist(userId, await this.prepare(courseId, dto));
  }

  /** Kết quả gần nhất của chính người dùng cho khoá (đọc từ survey mới nhất). */
  async getMine(userId: number, courseId: string) {
    const latest = await this.prisma.survey.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { dataJson: true },
    });
    const data = isObj(latest?.dataJson) ? latest.dataJson : {};
    const all = isObj(data.placement) ? data.placement : {};
    const rec = all[courseId];
    if (!isObj(rec) || !isObj(rec.result))
      return { ok: true, done: false, course_id: courseId };
    return {
      ok: true,
      done: true,
      course_id: courseId,
      questionnaire_id: rec.questionnaire_id,
      version: rec.version,
      submitted_at: rec.submitted_at,
      ...rec.result,
    };
  }
}

/**
 * Phần kết quả gửi FE (khớp `PlacementResult` của onboarding-questionnaire.ts), kèm
 * score/total/level theo nghĩa của /placement để màn cũ vẫn đọc được. Lời giải được gửi
 * vì lúc này đã nộp (spec §5).
 */
function resultOf(o: PlacementOutcome) {
  return {
    start_module: o.start_module,
    start_lesson_no: o.start_lesson_no,
    module_scores: o.module_scores,
    review_modules: o.review_modules,
    level_title: o.level_title,
    skipped_all: o.skipped_all,
    score: o.correct_count,
    total: o.total,
    level: levelFromScore(o.correct_count, o.total),
    explanations: o.explanations,
    review: o.review,
  };
}
