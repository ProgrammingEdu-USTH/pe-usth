/**
 * onboarding-questionnaire.ts — Hợp đồng dữ liệu, kiểm định, chấm xếp module
 * (theo docs/questionnaire-spec.md) và gọi API cho màn Bộ câu hỏi đầu vào (/onboarding).
 *
 * File thuần, không import alias '@/...' để `node --test` chạy trực tiếp.
 */

import mockQuestionnaire from './mock/questionnaire.json' with { type: 'json' };
import { friendlyApiError } from './friendly-api-error.mjs';

export { friendlyApiError };

export const USE_QUESTIONNAIRE_MOCK =
  process.env.NEXT_PUBLIC_QUESTIONNAIRE_MOCK === 'true';

export type QuestionnaireOption = {
  text: string;
};

export type QuestionnaireSelfAssessOption = {
  text: string;
  value: number;
};

export type QuestionnaireSelfAssess = {
  id: string;
  module_code: string;
  question: string;
  options: QuestionnaireSelfAssessOption[];
};

export type QuestionnaireItem = {
  id: string;
  module_code: string;
  level?: 'basic' | 'intermediate' | 'advanced' | string;
  question: string;
  code?: string | null;
  options: QuestionnaireOption[];
};

export type QuestionnaireParams = {
  items_per_module?: number;
  mastery_threshold: number;
  self_assess_weight: number;
  skip_policy: 'wrong' | 'exclude' | string;
  max_duration_min?: number;
};

export type QuestionnaireAnswerKey = Record<
  string,
  { correct: number; explanation?: string }
>;

export type QuestionnaireModuleRow = {
  code: string;
  first_lesson_no: number;
  title?: string;
};

export type QuestionnairePayload = {
  course_id: string;
  version: number;
  questionnaire_id?: number;
  title?: string;
  params: QuestionnaireParams;
  modules?: QuestionnaireModuleRow[];
  self_assess?: QuestionnaireSelfAssess[];
  items: QuestionnaireItem[];
  mock_answer_key?: QuestionnaireAnswerKey;
};

export type PlacementItemReview = {
  item_id: string;
  module_code?: string;
  correct: number;
  picked: number | null;
  is_correct: boolean;
  explanation?: string;
};

export type PlacementExplanation = PlacementItemReview;

export type QuestionnaireAnswersPayload = {
  course_id?: string;
  questionnaire_id?: number;
  answers: Record<string, number | null>;
  self?: Record<string, number | null>;
};

export type PlacementResult = {
  start_module: string;
  start_lesson_no: number;
  module_scores: Record<string, number>;
  review_modules: string[];
  level_title: string;
  skipped_all: boolean;
  explanations?: Record<string, string>;
  review?: PlacementItemReview[];
  score?: number;
  total?: number;
  level?: 'beginner' | 'intermediate' | 'advanced';
  updated?: boolean;
  questionnaire_id?: number;
  version?: number;
  submitted_at?: string;
};

export type ModuleCurriculumRow = {
  title: string;
  lessons: string[];
};

export type OnboardingViewerKind = 'authenticated' | 'guest' | 'anonymous';

export type FetcherLike = (path: string, opts?: RequestInit) => Promise<Response>;

/** Danh sách trắng đúng 11 trường của `SurveyDto` (src/user/dto/user.dto.ts). */
export const SURVEY_DTO_FIELDS = [
  'job',
  'purpose',
  'experience',
  'language',
  'level',
  'skill_detail',
  'goal',
  'domain',
  'career_target',
  'time',
  'timeline',
] as const;

export type SurveyDtoField = (typeof SURVEY_DTO_FIELDS)[number];
export type SurveyDtoPayload = Partial<Record<SurveyDtoField, string>>;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/** Kiểm định cấu trúc bộ câu hỏi (dùng chung cho mock JSON và GET /api/questionnaire/:courseId). */
export function validateQuestionnaire(raw: unknown): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return ['Dữ liệu bộ câu hỏi phải là object JSON.'];
  }
  const q = raw as Record<string, unknown>;
  if (!isNonEmptyString(q.course_id)) errors.push('Thiếu `course_id`.');
  if (typeof q.version !== 'number' || !Number.isFinite(q.version) || q.version < 1) {
    errors.push('Thiếu hoặc sai `version`.');
  }
  if (
    q.questionnaire_id !== undefined &&
    (typeof q.questionnaire_id !== 'number' ||
      !Number.isInteger(q.questionnaire_id) ||
      q.questionnaire_id < 1)
  ) {
    errors.push('Sai `questionnaire_id`.');
  }
  if (!q.params || typeof q.params !== 'object') {
    errors.push('Thiếu `params` cấu hình chấm điểm.');
  } else {
    const p = q.params as Record<string, unknown>;
    if (
      typeof p.mastery_threshold !== 'number' ||
      !Number.isFinite(p.mastery_threshold) ||
      p.mastery_threshold <= 0 ||
      p.mastery_threshold > 1
    ) {
      errors.push('`params.mastery_threshold` phải nằm trong (0, 1].');
    }
    if (
      typeof p.self_assess_weight !== 'number' ||
      !Number.isFinite(p.self_assess_weight) ||
      p.self_assess_weight < 0 ||
      p.self_assess_weight > 1
    ) {
      errors.push('`params.self_assess_weight` phải nằm trong [0, 1].');
    }
  }

  if (q.modules !== undefined) {
    if (!Array.isArray(q.modules)) {
      errors.push('`modules` phải là mảng.');
    } else {
      q.modules.forEach((entry, i) => {
        if (!entry || typeof entry !== 'object') {
          errors.push(`modules[${i}] phải là object.`);
          return;
        }
        const m = entry as Record<string, unknown>;
        if (!isNonEmptyString(m.code)) errors.push(`modules[${i}] thiếu code.`);
        if (
          typeof m.first_lesson_no !== 'number' ||
          !Number.isInteger(m.first_lesson_no) ||
          m.first_lesson_no < 1
        ) {
          errors.push(`modules[${i}] sai first_lesson_no.`);
        }
      });
    }
  }

  if (q.self_assess !== undefined) {
    if (!Array.isArray(q.self_assess)) {
      errors.push('`self_assess` phải là mảng.');
    } else {
      q.self_assess.forEach((sa, i) => {
        if (!sa || typeof sa !== 'object') {
          errors.push(`self_assess[${i}] phải là object.`);
          return;
        }
        const s = sa as Record<string, unknown>;
        if (!isNonEmptyString(s.id)) errors.push(`self_assess[${i}] thiếu id.`);
        if (!isNonEmptyString(s.module_code)) errors.push(`self_assess[${i}] thiếu module_code.`);
        if (!isNonEmptyString(s.question)) errors.push(`self_assess[${i}] thiếu question.`);
        if (!Array.isArray(s.options) || s.options.length < 2) {
          errors.push(`self_assess[${i}] cần ít nhất 2 lựa chọn.`);
        } else {
          s.options.forEach((opt, j) => {
            const o = opt as Record<string, unknown>;
            if (!o || !isNonEmptyString(o.text)) {
              errors.push(`self_assess[${i}].options[${j}] thiếu text.`);
            }
            if (typeof o?.value !== 'number' || !Number.isFinite(o.value) || o.value < 0 || o.value > 1) {
              errors.push(`self_assess[${i}].options[${j}] sai value.`);
            }
          });
        }
      });
    }
  }

  if (!Array.isArray(q.items) || q.items.length === 0) {
    errors.push('`items` phải là mảng có ít nhất 1 câu hỏi.');
  } else {
    const seen = new Set<string>();
    q.items.forEach((entry, idx) => {
      if (!entry || typeof entry !== 'object') {
        errors.push(`items[${idx}] phải là object.`);
        return;
      }
      const it = entry as Record<string, unknown>;
      if (!isNonEmptyString(it.id)) errors.push(`items[${idx}] thiếu id.`);
      else if (seen.has(it.id)) errors.push(`items[${idx}] trùng id "${it.id}".`);
      else seen.add(it.id);

      if ('correct' in it || 'correctIndex' in it) {
        errors.push(`items[${idx}] không được phép chứa đáp án đúng.`);
      }
      if (!isNonEmptyString(it.module_code)) errors.push(`items[${idx}] thiếu module_code.`);
      if (!isNonEmptyString(it.question)) errors.push(`items[${idx}] thiếu question.`);
      if (!Array.isArray(it.options) || it.options.length < 2) {
        errors.push(`items[${idx}] cần ít nhất 2 lựa chọn.`);
      } else {
        it.options.forEach((opt, j) => {
          const o = opt as Record<string, unknown>;
          if (!o || !isNonEmptyString(o.text)) {
            errors.push(`items[${idx}].options[${j}] thiếu trường text.`);
          }
        });
      }
    });
  }
  return errors;
}

/** Kiểm định kết quả xếp module trả về từ mock hoặc POST /api/questionnaire/:courseId/submit. */
export function validatePlacementResult(raw: unknown): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return ['Kết quả xếp module phải là object JSON.'];
  }
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.start_module)) errors.push('Thiếu `start_module`.');
  if (typeof r.start_lesson_no !== 'number' || !Number.isInteger(r.start_lesson_no) || r.start_lesson_no < 1) {
    errors.push('`start_lesson_no` phải là số nguyên >= 1.');
  }
  if (!r.module_scores || typeof r.module_scores !== 'object' || Array.isArray(r.module_scores)) {
    errors.push('Thiếu `module_scores`.');
  }
  if (!Array.isArray(r.review_modules)) errors.push('Thiếu mảng `review_modules`.');
  if (!isNonEmptyString(r.level_title)) errors.push('Thiếu `level_title`.');
  if (typeof r.skipped_all !== 'boolean') errors.push('Thiếu cờ boolean `skipped_all`.');
  return errors;
}

/** Tìm bài bắt đầu (`sort_order` 1-based và chỉ số `?lesson=` 0-based) cho module `M1..M11`. */
export function resolveModuleStartLesson(
  modules: ModuleCurriculumRow[] | null | undefined,
  moduleCode: string,
): { lessonNo: number; lessonIndex: number; moduleTitle: string } {
  const list = modules ?? [];
  let cursor = 1;
  const normalized = moduleCode.trim().toUpperCase();
  for (const mod of list) {
    const codeMatch = /^(M\d+)\b/i.exec(mod.title.trim());
    if (codeMatch && codeMatch[1].toUpperCase() === normalized) {
      return {
        lessonNo: cursor,
        lessonIndex: Math.max(0, cursor - 1),
        moduleTitle: mod.title,
      };
    }
    cursor += mod.lessons.length;
  }
  return {
    lessonNo: 1,
    lessonIndex: 0,
    moduleTitle: list[0]?.title ?? `${normalized} · Bắt đầu khoá học`,
  };
}

/** Lấy tiêu đề hiển thị cho module bắt đầu: ưu tiên `modules` từ đề thi rồi tới `curricula.json`. */
export function resolvePlacementModuleTitle(
  questionnaireModules: QuestionnaireModuleRow[] | null | undefined,
  curriculaModules: ModuleCurriculumRow[] | null | undefined,
  moduleCode: string,
): string {
  const normalized = moduleCode.trim().toUpperCase();
  const fromQ = (questionnaireModules ?? []).find(
    (m) => m.code.trim().toUpperCase() === normalized && isNonEmptyString(m.title),
  );
  if (fromQ?.title) return fromQ.title.trim();

  for (const mod of curriculaModules ?? []) {
    const match = /^(M\d+)\b/i.exec(mod.title.trim());
    if (match && match[1].toUpperCase() === normalized) {
      return mod.title.trim();
    }
  }
  return normalized || moduleCode;
}

/** Chấm xếp module ở chế độ mock đúng công thức §3 docs/questionnaire-spec.md. */
export function scoreQuestionnaireMock(
  questionnaire: QuestionnairePayload,
  answers: Record<string, number | null | undefined>,
  selfAnswers: Record<string, number | null | undefined>,
  modules: ModuleCurriculumRow[],
  answerKey: QuestionnaireAnswerKey | undefined = questionnaire.mock_answer_key,
  moduleOrder?: string[],
): PlacementResult {
  const params = questionnaire.params;
  const threshold = params.mastery_threshold ?? 0.67;
  const weight = params.self_assess_weight ?? 0.2;
  const skipPolicy = params.skip_policy ?? 'wrong';

  const modulePosMap = new Map<string, number>();
  modules.forEach((m, idx) => {
    const match = /^(M\d+)\b/i.exec(m.title.trim());
    if (match) modulePosMap.set(match[1].toUpperCase(), idx);
  });

  const testedSet: string[] = [];
  if (moduleOrder?.length) {
    for (const c of moduleOrder) {
      const upper = c.trim().toUpperCase();
      if (!testedSet.includes(upper)) testedSet.push(upper);
    }
  } else {
    for (const it of questionnaire.items) {
      const upper = it.module_code.trim().toUpperCase();
      if (!testedSet.includes(upper)) testedSet.push(upper);
    }
    if (modulePosMap.size > 0) {
      testedSet.sort((a, b) => (modulePosMap.get(a) ?? 999) - (modulePosMap.get(b) ?? 999));
    }
  }

  const allItemsSkipped =
    questionnaire.items.length > 0 &&
    questionnaire.items.every((it) => answers[it.id] === undefined || answers[it.id] === null);

  const round4 = (n: number) => Math.round(n * 10000) / 10000;
  const moduleScores: Record<string, number> = {};
  const explanations: Record<string, string> = {};
  const review: PlacementItemReview[] = [];
  let correctCount = 0;

  for (const it of questionnaire.items) {
    const rawPicked = answers[it.id];
    const picked = typeof rawPicked === 'number' && Number.isInteger(rawPicked) ? rawPicked : null;
    const keyEntry = answerKey?.[it.id];
    const expected = keyEntry?.correct ?? (it as { correct?: number }).correct;
    if (keyEntry?.explanation) explanations[it.id] = keyEntry.explanation;
    const isCorrect = typeof expected === 'number' && picked === expected;
    if (isCorrect) correctCount += 1;
    if (typeof expected === 'number') {
      review.push({
        item_id: it.id,
        module_code: it.module_code.trim().toUpperCase(),
        picked,
        correct: expected,
        is_correct: isCorrect,
        ...(keyEntry?.explanation ? { explanation: keyEntry.explanation } : {}),
      });
    }
  }

  if (allItemsSkipped) {
    for (const modCode of testedSet) {
      moduleScores[modCode] = 0;
    }
    const firstMod = testedSet[0] ?? 'M1';
    const loc = resolveModuleStartLesson(modules, firstMod);
    return {
      start_module: firstMod,
      start_lesson_no: loc.lessonNo,
      module_scores: moduleScores,
      review_modules: [],
      level_title: 'Khởi đầu vững chắc',
      skipped_all: true,
      ...(review.length > 0 ? { score: 0, total: questionnaire.items.length, review } : {}),
      ...(Object.keys(explanations).length > 0 ? { explanations } : {}),
    };
  }

  for (const modCode of testedSet) {
    const modItems = questionnaire.items.filter(
      (it) => it.module_code.trim().toUpperCase() === modCode,
    );
    let right = 0;
    let denom = 0;
    for (const it of modItems) {
      const picked = answers[it.id];
      const keyEntry = answerKey?.[it.id];
      const expected = keyEntry?.correct ?? (it as { correct?: number }).correct;

      if (picked === undefined || picked === null) {
        if (skipPolicy !== 'exclude') denom += 1;
        continue;
      }
      denom += 1;
      if (typeof expected === 'number' && picked === expected) {
        right += 1;
      }
    }
    const testScore = denom > 0 ? right / denom : 0;

    const sa = (questionnaire.self_assess ?? []).find(
      (s) => s.module_code.trim().toUpperCase() === modCode,
    );
    const saPicked = sa ? selfAnswers[sa.id] : null;
    const saOpt = sa && typeof saPicked === 'number' ? sa.options[saPicked] : undefined;

    const finalScore = saOpt
      ? (1 - weight) * testScore + weight * saOpt.value
      : testScore;
    moduleScores[modCode] = round4(finalScore);
  }

  const failIdx = testedSet.findIndex((m) => moduleScores[m] < threshold);
  let startModule: string;
  let reviewModules: string[] = [];

  if (failIdx >= 0) {
    startModule = testedSet[failIdx];
    reviewModules = testedSet.slice(failIdx + 1).filter((m) => moduleScores[m] < threshold);
  } else {
    // Mọi module được hỏi đều đạt -> tiến tới module kế tiếp trong giáo trình (vd M5 hoặc M9).
    const lastTested = testedSet[testedSet.length - 1];
    const lastPos = lastTested ? modulePosMap.get(lastTested) : undefined;
    const nextModRow =
      lastPos !== undefined && lastPos + 1 < modules.length ? modules[lastPos + 1] : null;
    const nextCodeMatch = nextModRow ? /^(M\d+)\b/i.exec(nextModRow.title.trim()) : null;
    startModule = nextCodeMatch ? nextCodeMatch[1].toUpperCase() : lastTested ?? 'M1';
  }

  const passedCount = testedSet.filter((m) => moduleScores[m] >= threshold).length;
  let levelTitle = 'Khởi đầu vững chắc';
  if (passedCount >= 6 || (testedSet.length > 0 && testedSet.length < 6 && passedCount === testedSet.length)) {
    levelTitle = 'Sẵn sàng bứt phá';
  } else if (passedCount >= 3) {
    levelTitle = 'Nền tảng vững vàng';
  }

  const loc = resolveModuleStartLesson(modules, startModule);
  return {
    start_module: startModule,
    start_lesson_no: loc.lessonNo,
    module_scores: moduleScores,
    review_modules: reviewModules,
    level_title: levelTitle,
    skipped_all: false,
    ...(review.length > 0 ? { score: correctCount, total: questionnaire.items.length, review } : {}),
    ...(Object.keys(explanations).length > 0 ? { explanations } : {}),
  };
}

/**
 * Chuẩn hoá payload gửi `POST /api/survey`:
 * chỉ giữ đúng các trường trong `SurveyDto`, nối mảng bằng `', '`, bỏ rỗng.
 */
export function buildSurveyDtoPayload(input: Record<string, unknown>): SurveyDtoPayload {
  const out: SurveyDtoPayload = {};
  for (const field of SURVEY_DTO_FIELDS) {
    const raw = input[field];
    if (Array.isArray(raw)) {
      const joined = raw
        .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
        .map((v) => v.trim())
        .join(', ');
      if (joined) out[field] = joined;
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed) out[field] = trimmed;
    }
  }
  return out;
}

/** Phân biệt tài khoản đã đăng nhập thật với khách (@guest.local) và khách vãng lai. */
export function classifyOnboardingViewer(profile: unknown): OnboardingViewerKind {
  if (!profile || typeof profile !== 'object') return 'anonymous';
  const u = profile as Record<string, unknown>;
  if (u.guest === true) return 'guest';
  const email = typeof u.email === 'string' ? u.email.trim() : '';
  if (email && /^guest_.*@guest\.local$/i.test(email)) return 'guest';
  if (email || typeof u.id === 'number') return 'authenticated';
  return 'anonymous';
}

export class QuestionnaireConflictError extends Error {
  readonly status = 409;

  constructor(
    message = 'Bộ câu hỏi vừa được cập nhật, hãy tải lại trang để làm bản mới.',
  ) {
    super(message);
    this.name = 'QuestionnaireConflictError';
  }
}

export function isVersionConflictError(err: unknown): boolean {
  return (
    err instanceof QuestionnaireConflictError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as { status?: unknown }).status === 409)
  );
}

/**
 * Chuẩn hoá payload `questionnaire` gửi kèm `POST /api/survey` hoặc `POST /api/questionnaire/:courseId/submit`:
 * chỉ giữ id thuộc bộ câu đang dùng để tránh `BadRequestException` khi payload chứa key lạ.
 */
export function buildQuestionnaireAnswersPayload(
  courseId: string,
  questionnaire: QuestionnairePayload,
  answers: Record<string, number | null | undefined>,
  selfAnswers: Record<string, number | null | undefined> = {},
): QuestionnaireAnswersPayload {
  const cleanAnswers: Record<string, number | null> = {};
  for (const it of questionnaire.items) {
    const val = answers[it.id];
    if (val === null) {
      cleanAnswers[it.id] = null;
    } else if (
      typeof val === 'number' &&
      Number.isInteger(val) &&
      val >= 0 &&
      val < it.options.length
    ) {
      cleanAnswers[it.id] = val;
    }
  }

  const cleanSelf: Record<string, number | null> = {};
  for (const sa of questionnaire.self_assess ?? []) {
    const val = selfAnswers[sa.id];
    if (val === null) {
      cleanSelf[sa.id] = null;
    } else if (
      typeof val === 'number' &&
      Number.isInteger(val) &&
      val >= 0 &&
      val < sa.options.length
    ) {
      cleanSelf[sa.id] = val;
    }
  }

  const hasSelfAssess = (questionnaire.self_assess ?? []).length > 0;
  return {
    course_id: courseId,
    ...(typeof questionnaire.questionnaire_id === 'number' &&
    Number.isInteger(questionnaire.questionnaire_id)
      ? { questionnaire_id: questionnaire.questionnaire_id }
      : {}),
    answers: cleanAnswers,
    ...(hasSelfAssess && Object.keys(cleanSelf).length > 0 ? { self: cleanSelf } : {}),
  };
}

function normalizePlacementResult(raw: Record<string, unknown>): PlacementResult {
  const scoresRaw = (raw.module_scores ?? {}) as Record<string, unknown>;
  const module_scores: Record<string, number> = {};
  for (const [k, v] of Object.entries(scoresRaw)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      module_scores[k] = v;
    }
  }

  const review_modules = Array.isArray(raw.review_modules)
    ? raw.review_modules.filter((x): x is string => isNonEmptyString(x))
    : [];

  const explanations: Record<string, string> = {};
  if (raw.explanations && typeof raw.explanations === 'object' && !Array.isArray(raw.explanations)) {
    for (const [k, v] of Object.entries(raw.explanations as Record<string, unknown>)) {
      if (isNonEmptyString(v)) explanations[k] = v;
    }
  }

  const review: PlacementItemReview[] = [];
  if (Array.isArray(raw.review)) {
    for (const entry of raw.review) {
      if (!entry || typeof entry !== 'object') continue;
      const r = entry as Record<string, unknown>;
      if (!isNonEmptyString(r.item_id) || typeof r.correct !== 'number') continue;
      const picked = typeof r.picked === 'number' ? r.picked : null;
      review.push({
        item_id: r.item_id,
        ...(isNonEmptyString(r.module_code) ? { module_code: r.module_code } : {}),
        correct: r.correct,
        picked,
        is_correct: typeof r.is_correct === 'boolean' ? r.is_correct : picked === r.correct,
        ...(isNonEmptyString(r.explanation) ? { explanation: r.explanation } : {}),
      });
    }
  }

  return {
    start_module: String(raw.start_module).trim(),
    start_lesson_no: raw.start_lesson_no as number,
    module_scores,
    review_modules,
    level_title: String(raw.level_title).trim(),
    skipped_all: Boolean(raw.skipped_all),
    ...(Object.keys(explanations).length > 0 ? { explanations } : {}),
    ...(review.length > 0 ? { review } : {}),
    ...(typeof raw.score === 'number' ? { score: raw.score } : {}),
    ...(typeof raw.total === 'number' ? { total: raw.total } : {}),
    ...(raw.level === 'beginner' || raw.level === 'intermediate' || raw.level === 'advanced'
      ? { level: raw.level }
      : {}),
    ...(typeof raw.updated === 'boolean' ? { updated: raw.updated } : {}),
    ...(typeof raw.questionnaire_id === 'number' ? { questionnaire_id: raw.questionnaire_id } : {}),
    ...(typeof raw.version === 'number' ? { version: raw.version } : {}),
    ...(typeof raw.submitted_at === 'string' ? { submitted_at: raw.submitted_at } : {}),
  };
}

export async function loadMyPlacement(opts: {
  courseId: string;
  fetcher: FetcherLike;
}): Promise<PlacementResult | null> {
  try {
    const res = await opts.fetcher(
      `/api/me/questionnaire/${encodeURIComponent(opts.courseId)}`,
    );
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object' || body.done !== true) return null;
    if (validatePlacementResult(body).length > 0) return null;
    return normalizePlacementResult(body);
  } catch {
    return null;
  }
}

export function getMockQuestionnaire(): QuestionnairePayload {
  const raw = mockQuestionnaire as unknown as QuestionnairePayload;
  const errs = validateQuestionnaire(raw);
  if (errs.length > 0) {
    throw new Error(`Dữ liệu giả questionnaire.json không hợp lệ: ${errs.join('; ')}`);
  }
  return raw;
}

export async function loadQuestionnaire(
  courseId: string,
  opts: { useMock?: boolean; fetcher?: FetcherLike } = {},
): Promise<{ questionnaire: QuestionnairePayload; source: 'mock' | 'api' }> {
  const useMock = opts.useMock ?? USE_QUESTIONNAIRE_MOCK;
  if (useMock) {
    return { questionnaire: getMockQuestionnaire(), source: 'mock' };
  }
  const path = `/api/questionnaire/${encodeURIComponent(courseId)}`;
  if (!opts.fetcher) {
    throw new Error(`Thiếu hàm fetcher để gọi GET ${path}.`);
  }
  let res: Response;
  try {
    res = await opts.fetcher(path);
  } catch {
    throw new Error(friendlyApiError(0, null));
  }
  const body = await res.json().catch(() => null);
  if (res.status === 404) {
    throw new Error('Chưa có bộ câu hỏi đầu vào cho khoá học này.');
  }
  if (!res.ok) {
    throw new Error(friendlyApiError(res.status, body, 'Không tải được bộ câu hỏi đầu vào.'));
  }
  const errs = validateQuestionnaire(body);
  const rec = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  if (
    !rec ||
    typeof rec.questionnaire_id !== 'number' ||
    !Number.isInteger(rec.questionnaire_id) ||
    rec.questionnaire_id < 1
  ) {
    errs.push('Thiếu hoặc sai `questionnaire_id`.');
  }
  if (errs.length > 0) {
    throw new Error(`Dữ liệu ${path} không hợp lệ: ${errs.join('; ')}`);
  }
  return {
    questionnaire: body as QuestionnairePayload,
    source: 'api',
  };
}

export async function submitQuestionnaireAndSurvey(params: {
  courseId: string;
  questionnaire: QuestionnairePayload;
  answers: Record<string, number | null>;
  selfAnswers: Record<string, number | null>;
  surveyInput: Record<string, unknown>;
  modules: ModuleCurriculumRow[];
  saveSurvey: boolean;
  useMock?: boolean;
  fetcher?: FetcherLike;
}): Promise<{
  placement: PlacementResult;
  surveySaved: boolean;
  surveyError: string | null;
  roadmapId: string | null;
  placementSource: 'mock' | 'api';
}> {
  const useMock = params.useMock ?? USE_QUESTIONNAIRE_MOCK;

  if (useMock) {
    let surveySaved = false;
    let surveyError: string | null = null;
    let roadmapId: string | null = null;

    if (params.saveSurvey && params.fetcher) {
      const payload = buildSurveyDtoPayload(params.surveyInput);
      try {
        const res = await params.fetcher('/api/survey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => null);
        if (res.ok) {
          surveySaved = true;
          if (body && typeof body === 'object' && typeof (body as { roadmap_id?: unknown }).roadmap_id === 'string') {
            roadmapId = (body as { roadmap_id: string }).roadmap_id;
          }
        } else {
          surveyError = friendlyApiError(res.status, body, 'Không lưu được khảo sát.');
        }
      } catch {
        surveyError = friendlyApiError(0, null);
      }
    }

    const placement = scoreQuestionnaireMock(
      params.questionnaire,
      params.answers,
      params.selfAnswers,
      params.modules,
    );
    const errs = validatePlacementResult(placement);
    if (errs.length > 0) {
      throw new Error(`Kết quả xếp module mock không hợp lệ: ${errs.join('; ')}`);
    }
    return {
      placement,
      surveySaved,
      surveyError,
      roadmapId,
      placementSource: 'mock',
    };
  }

  if (!params.fetcher) {
    throw new Error('Thiếu hàm fetcher để nộp bộ câu hỏi.');
  }
  if (typeof params.questionnaire.questionnaire_id !== 'number') {
    throw new Error('Thiếu mã bộ câu hỏi (`questionnaire_id`) — hãy tải lại trang.');
  }

  const surveyFields = buildSurveyDtoPayload(params.surveyInput);
  const questionnairePayload = buildQuestionnaireAnswersPayload(
    params.courseId,
    params.questionnaire,
    params.answers,
    params.selfAnswers,
  );

  let submitRes: Response;
  try {
    submitRes = await params.fetcher('/api/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...surveyFields,
        questionnaire: questionnairePayload,
      }),
    });
  } catch {
    throw new Error(friendlyApiError(0, null));
  }

  const submitBody = await submitRes.json().catch(() => null);
  if (submitRes.status === 409) {
    throw new QuestionnaireConflictError();
  }
  if (!submitRes.ok) {
    throw new Error(friendlyApiError(submitRes.status, submitBody, 'Không nộp được bộ câu hỏi.'));
  }

  const bodyObj = submitBody && typeof submitBody === 'object' ? (submitBody as Record<string, unknown>) : null;
  const rawPlacement = bodyObj?.placement;
  const placementErrs = validatePlacementResult(rawPlacement);
  if (placementErrs.length > 0) {
    throw new Error(`Kết quả xếp module không hợp lệ: ${placementErrs.join('; ')}`);
  }

  const placement = normalizePlacementResult(rawPlacement as Record<string, unknown>);
  const roadmapId = typeof bodyObj?.roadmap_id === 'string' ? bodyObj.roadmap_id : null;

  return {
    placement,
    surveySaved: true,
    surveyError: null,
    roadmapId,
    placementSource: 'api',
  };
}
