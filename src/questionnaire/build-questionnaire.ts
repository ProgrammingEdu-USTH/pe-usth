/**
 * Dựng bộ câu hỏi đầu vào từ câu trắc nghiệm có sẵn của giáo trình (`step_2.mcq`).
 * Hàm thuần: đầu vào là danh sách bài đã đọc từ file, đầu ra là `QuestionnaireDoc`.
 *
 * Vì sao lọc chứ không lấy bừa:
 *  · Luật A5 (src/question-gen/mcq-filters.ts): đáp án đúng dài vượt trội là đoán được bằng
 *    "chọn câu dài nhất". Bài kiểm tra đầu vào mà đoán được thì xếp module vô nghĩa.
 *  · Câu trong bài thường dựa vào ngữ cảnh của bài ("đoạn code ở trên", "trong bài này").
 *    Tách khỏi bài thì người làm không có ngữ cảnh đó: bỏ.
 *  · Ba câu của một module lấy từ ĐẦU, GIỮA, CUỐI module (chia ba theo thứ tự bài) và gắn mức
 *    basic / intermediate / advanced tương ứng, để module không chỉ được hỏi kiến thức mở đầu.
 */
import { isGoodExample } from '../question-gen/mcq-prompt';
import { ruleA1Schema } from '../question-gen/mcq-filters';
import {
  DEFAULT_PARAMS,
  moduleCodeOf,
  moduleRowsFromLessons,
  parseQuestionnaireDoc,
  type ModuleRow,
  type QuestionnaireDoc,
  type QuestionnaireItem,
  type QuestionnaireParams,
} from './questionnaire.logic';

/** Đúng hình một bài trong scripts/pe-da/out/lessons.json (gói đang nạp vào DB). */
export type LessonLike = {
  lesson_code: string;
  sort_order: number;
  module: string | null;
  content_json: unknown;
};

export type BuildOptions = {
  courseId: string;
  /** Module được hỏi, theo thứ tự giáo trình. */
  moduleCodes: string[];
  perModule: number;
  params?: Partial<QuestionnaireParams>;
  title?: string;
};

export type BuildReport = {
  module_code: string;
  lessons: number;
  candidates: number;
  picked: string[];
  short: number;
};

/** Cụm từ cho thấy câu dựa vào ngữ cảnh của bài, tách ra thì không trả lời được. */
const CONTEXT_PHRASE =
  /(ở trên|phía trên|bên trên|như trên|vừa rồi|vừa xem|vừa chạy|màn trước|bài này|bài trước|trong bài|của bài|trong sơ đồ|ví dụ trên|đoạn (code|mã) trên|hình trên|bảng trên|câu trên)/i;

export const LEVELS = ['basic', 'intermediate', 'advanced'] as const;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Câu `step_2.mcq` của gói pe-da đánh dấu đáp án bằng cờ `correct: true` trên lựa chọn và
 * KHÔNG có chỉ số `correct` ở ngoài. Suy chỉ số từ cờ để chạy chung bộ luật A1–A5.
 */
function asMcq(raw: unknown) {
  if (!isObj(raw) || !Array.isArray(raw.options)) return null;
  const flagged = raw.options.findIndex((o) => isObj(o) && o.correct === true);
  const withIndex =
    typeof raw.correct === 'number' ? raw : { ...raw, correct: flagged };
  const a1 = ruleA1Schema(withIndex);
  return a1.ok && a1.mcq ? a1.mcq : null;
}

function mcqsOf(lesson: LessonLike): unknown[] {
  let c = lesson.content_json;
  if (typeof c === 'string') {
    try {
      c = JSON.parse(c);
    } catch {
      return [];
    }
  }
  if (!isObj(c) || !isObj(c.step_2) || !Array.isArray(c.step_2.mcq)) return [];
  return c.step_2.mcq;
}

/** Mức của nhóm thứ g trong `n` nhóm: chia đều ba mức theo vị trí. */
function levelOf(g: number, n: number): string {
  if (n <= 1) return LEVELS[0];
  return LEVELS[Math.min(2, Math.floor((g * 3) / n))];
}

export function buildQuestionnaireFromLessons(
  lessons: LessonLike[],
  opts: BuildOptions,
): { doc: QuestionnaireDoc; report: BuildReport[] } {
  const sorted = [...lessons].sort((a, b) => a.sort_order - b.sort_order);
  const seenQuestion = new Set<string>();
  const items: QuestionnaireItem[] = [];
  const report: BuildReport[] = [];

  for (const code of opts.moduleCodes) {
    const inModule = sorted.filter((l) => moduleCodeOf(l.module) === code);
    // Ứng viên theo từng bài, giữ thứ tự bài và thứ tự câu trong bài: kết quả tất định.
    const perLesson = inModule.map((l) => ({
      lesson: l,
      good: mcqsOf(l)
        .map((raw, index) => ({ mcq: asMcq(raw), index }))
        .filter(
          (
            c,
          ): c is {
            mcq: NonNullable<ReturnType<typeof asMcq>>;
            index: number;
          } =>
            c.mcq !== null &&
            isGoodExample(c.mcq) &&
            !CONTEXT_PHRASE.test(c.mcq.question),
        ),
    }));
    const candidates = perLesson.reduce((n, p) => n + p.good.length, 0);

    const n = opts.perModule;
    const used = new Set<string>();
    const picked: string[] = [];
    for (let g = 0; g < n; g++) {
      // Nhóm g = đoạn thứ g khi chia đều các bài của module; thiếu câu tốt trong nhóm thì
      // lấy ở bài bất kỳ còn lại của module (vẫn giữ đủ số câu, mức theo vị trí nhóm).
      const lo = Math.floor((g * perLesson.length) / n);
      const hi = Math.floor(((g + 1) * perLesson.length) / n);
      const order = [
        ...perLesson.slice(lo, hi),
        ...perLesson.slice(0, lo),
        ...perLesson.slice(hi),
      ];
      let chosen: {
        lesson: LessonLike;
        mcq: NonNullable<ReturnType<typeof asMcq>>;
        index: number;
      } | null = null;
      // Lượt 1: mỗi câu một bài khác nhau (trải rộng kiến thức). Lượt 2: module ít bài
      // (M7 chỉ có 3 bài) thì cho lấy câu thứ hai của một bài đã dùng, hơn là thiếu câu.
      for (const allowUsed of [false, true]) {
        for (const p of order) {
          if (!allowUsed && used.has(p.lesson.lesson_code)) continue;
          const c = p.good.find(
            (x) => !seenQuestion.has(x.mcq.question.trim()),
          );
          if (c) {
            chosen = { lesson: p.lesson, ...c };
            break;
          }
        }
        if (chosen) break;
      }
      if (!chosen) continue;
      used.add(chosen.lesson.lesson_code);
      seenQuestion.add(chosen.mcq.question.trim());
      const id = `q-${code.toLowerCase()}-${picked.length + 1}`;
      picked.push(`${chosen.lesson.lesson_code}#${chosen.index + 1}`);
      const right = chosen.mcq.options[chosen.mcq.correct];
      items.push({
        id,
        module_code: code,
        level: levelOf(g, n),
        question: chosen.mcq.question,
        code: null,
        options: chosen.mcq.options.map((o) => ({ text: o.text })),
        correct: chosen.mcq.correct,
        // Lời giải chung của câu; thiếu thì dùng giải thích của chính đáp án đúng.
        explanation: chosen.mcq.explanation || right.detail,
        source: {
          lesson_code: chosen.lesson.lesson_code,
          sort_order: chosen.lesson.sort_order,
          index: chosen.index,
        },
      });
    }
    report.push({
      module_code: code,
      lessons: inModule.length,
      candidates,
      picked,
      short: n - picked.length,
    });
  }

  const modules: ModuleRow[] = moduleRowsFromLessons(
    sorted.map((l) => ({ module: l.module, sortOrder: l.sort_order })),
  );
  const doc = parseQuestionnaireDoc({
    course_id: opts.courseId,
    ...(opts.title ? { title: opts.title } : {}),
    params: {
      ...DEFAULT_PARAMS,
      items_per_module: opts.perModule,
      ...opts.params,
    },
    modules,
    items,
  });
  return { doc, report };
}
