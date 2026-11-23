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

export type QuestionnairePayload = {
  course_id: string;
  version: number;
  questionnaire_id?: number;
  title?: string;
  params: QuestionnaireParams;
  self_assess?: QuestionnaireSelfAssess[];
  items: QuestionnaireItem[];
  mock_answer_key?: QuestionnaireAnswerKey;
};

export type BackendPlacementQuestion = {
  id: number;
  topic?: string;
  question: string;
  code?: string | null;
  options: string[];
};

export type BackendPlacementQuestionsResponse = {
  ok: true;
  questionnaire_id: number;
  version: number;
  questions: BackendPlacementQuestion[];
};

export type BackendPlacementSubmitResponse = {
  ok: true;
  done: true;
  repeated?: boolean;
  score: number;
  total: number;
  level: 'beginner' | 'intermediate' | 'advanced';
};

export type PlacementExplanation = {
  item_id: string;
  correct: number;
  picked: number | null;
  is_correct: boolean;
  explanation?: string;
};

export type PlacementResult = {
  start_module: string;
  start_lesson_no: number;
  module_scores: Record<string, number>;
  review_modules: string[];
  level_title: string;
  skipped_all: boolean;
  explanations?: Record<string, string>;
  score?: number;
  total?: number;
  level?: 'beginner' | 'intermediate' | 'advanced';
  repeated?: boolean;
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
      if (keyEntry?.explanation) explanations[it.id] = keyEntry.explanation;

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
    // Mọi module được hỏi đều đạt -> tiến tới module kế tiếp trong giáo trình (vd M5 hoặc M8).
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

const PLACEMENT_LEVEL_META: Record<
  'beginner' | 'intermediate' | 'advanced',
  { startModule: string; levelTitle: string; surveyLevel: string }
> = {
  beginner: {
    startModule: 'M1',
    levelTitle: 'Khởi đầu vững chắc',
    surveyLevel: 'Cơ bản',
  },
  intermediate: {
    startModule: 'M4',
    levelTitle: 'Nền tảng vững vàng',
    surveyLevel: 'Trung cấp',
  },
  advanced: {
    startModule: 'M7',
    levelTitle: 'Sẵn sàng bứt phá',
    surveyLevel: 'Nâng cao',
  },
};

export function vietnameseLevelForPlacement(level?: string): string {
  if (level === 'advanced') return PLACEMENT_LEVEL_META.advanced.surveyLevel;
  if (level === 'intermediate') return PLACEMENT_LEVEL_META.intermediate.surveyLevel;
  return PLACEMENT_LEVEL_META.beginner.surveyLevel;
}

/** Kiểm định phản hồi GET /api/placement/questions và đảm bảo không lộ đáp án. */
export function validateBackendPlacementQuestions(raw: unknown): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Phản hồi /api/placement/questions phải là object JSON.'];
  }
  const r = raw as Record<string, unknown>;
  if (r.ok !== true) errors.push('`ok` phải bằng true.');
  if (typeof r.questionnaire_id !== 'number' || !Number.isInteger(r.questionnaire_id) || r.questionnaire_id < 1) {
    errors.push('Thiếu hoặc sai `questionnaire_id`.');
  }
  if (typeof r.version !== 'number' || !Number.isInteger(r.version) || r.version < 1) {
    errors.push('Thiếu hoặc sai `version`.');
  }
  if (!Array.isArray(r.questions) || r.questions.length === 0) {
    errors.push('`questions` phải là mảng có ít nhất 1 câu hỏi.');
    return errors;
  }
  r.questions.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`questions[${idx}] phải là object.`);
      return;
    }
    const q = entry as Record<string, unknown>;
    if (typeof q.id !== 'number' || !Number.isInteger(q.id)) {
      errors.push(`questions[${idx}] thiếu id nguyên.`);
    }
    if (!isNonEmptyString(q.question)) {
      errors.push(`questions[${idx}] thiếu question.`);
    }
    if ('correctIndex' in q || 'correct' in q) {
      errors.push(`questions[${idx}] không được phép chứa đáp án đúng.`);
    }
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 10) {
      errors.push(`questions[${idx}].options phải có từ 2 đến 10 lựa chọn.`);
    } else {
      q.options.forEach((opt, j) => {
        if (!isNonEmptyString(opt)) {
          errors.push(`questions[${idx}].options[${j}] phải là chuỗi không rỗng.`);
        }
      });
    }
  });
  return errors;
}

export function adaptPlacementQuestionsPayload(
  raw: BackendPlacementQuestionsResponse,
  courseId: string,
): QuestionnairePayload {
  return {
    course_id: courseId,
    version: raw.version,
    questionnaire_id: raw.questionnaire_id,
    params: {
      mastery_threshold: 0.67,
      self_assess_weight: 0,
      skip_policy: 'wrong',
    },
    items: raw.questions.map((q) => ({
      id: String(q.id),
      module_code: isNonEmptyString(q.topic) ? q.topic.trim() : 'Python',
      question: q.question,
      code: typeof q.code === 'string' && q.code.length > 0 ? q.code : null,
      options: q.options.map((text) => ({ text })),
    })),
  };
}

export function validateBackendPlacementSubmitResponse(raw: unknown): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Kết quả từ /api/placement phải là object JSON.'];
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.score !== 'number' || !Number.isInteger(r.score) || r.score < 0) {
    errors.push('Thiếu hoặc sai `score`.');
  }
  if (typeof r.total !== 'number' || !Number.isInteger(r.total) || r.total < 1) {
    errors.push('Thiếu hoặc sai `total`.');
  }
  if (r.level !== 'beginner' && r.level !== 'intermediate' && r.level !== 'advanced') {
    errors.push('`level` phải là beginner, intermediate hoặc advanced.');
  }
  return errors;
}

export function mapPlacementApiResult(
  raw: BackendPlacementSubmitResponse,
  modules: ModuleCurriculumRow[],
  skippedAll = false,
): PlacementResult {
  const meta = PLACEMENT_LEVEL_META[raw.level] ?? PLACEMENT_LEVEL_META.beginner;
  const loc = resolveModuleStartLesson(modules, meta.startModule);
  return {
    start_module: meta.startModule,
    start_lesson_no: loc.lessonNo,
    module_scores: {},
    review_modules: [],
    level_title: meta.levelTitle,
    skipped_all: Boolean(skippedAll),
    score: raw.score,
    total: raw.total,
    level: raw.level,
    repeated: Boolean(raw.repeated),
  };
}

export async function loadMyPlacement(opts: {
  fetcher: FetcherLike;
  modules: ModuleCurriculumRow[];
}): Promise<PlacementResult | null> {
  try {
    const res = await opts.fetcher('/api/me/placement');
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object' || body.done !== true) return null;
    if (validateBackendPlacementSubmitResponse(body).length > 0) return null;
    return mapPlacementApiResult(body as unknown as BackendPlacementSubmitResponse, opts.modules, false);
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
  if (!opts.fetcher) {
    throw new Error('Thiếu hàm fetcher để gọi GET /api/placement/questions.');
  }
  let res: Response;
  try {
    res = await opts.fetcher('/api/placement/questions');
  } catch {
    throw new Error(friendlyApiError(0, null));
  }
  const body = await res.json().catch(() => null);
  if (res.status === 404) {
    throw new Error('Chưa có bộ câu hỏi đầu vào trên máy chủ.');
  }
  if (!res.ok) {
    throw new Error(friendlyApiError(res.status, body, 'Không tải được bộ câu hỏi đầu vào.'));
  }
  const errs = validateBackendPlacementQuestions(body);
  if (errs.length > 0) {
    throw new Error(`Dữ liệu /api/placement/questions không hợp lệ: ${errs.join('; ')}`);
  }
  return {
    questionnaire: adaptPlacementQuestionsPayload(body as BackendPlacementQuestionsResponse, courseId),
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
  let surveySaved = false;
  let surveyError: string | null = null;
  let roadmapId: string | null = null;

  const saveSurveyRequest = async (overrideLevel?: string) => {
    if (!params.saveSurvey || !params.fetcher) return;
    const rawSurvey = overrideLevel
      ? { ...params.surveyInput, level: overrideLevel }
      : params.surveyInput;
    const payload = buildSurveyDtoPayload(rawSurvey);
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
  };

  if (useMock) {
    await saveSurveyRequest();
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

  const orderedAnswers = params.questionnaire.items.map((it) => {
    const val = params.answers[it.id];
    return typeof val === 'number' && Number.isInteger(val) && val >= 0 ? val : -1;
  });

  let submitRes: Response;
  try {
    submitRes = await params.fetcher('/api/placement/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionnaireId: params.questionnaire.questionnaire_id,
        answers: orderedAnswers,
      }),
    });
  } catch {
    throw new Error(friendlyApiError(0, null));
  }

  const submitBody = await submitRes.json().catch(() => null);
  if (submitRes.status === 409) {
    throw new Error('Bộ câu hỏi vừa được cập nhật, hãy tải lại trang để làm bản mới.');
  }
  if (!submitRes.ok) {
    throw new Error(friendlyApiError(submitRes.status, submitBody, 'Không nộp được bộ câu hỏi.'));
  }
  const submitErrs = validateBackendPlacementSubmitResponse(submitBody);
  if (submitErrs.length > 0) {
    throw new Error(`Kết quả xếp hạng không hợp lệ: ${submitErrs.join('; ')}`);
  }

  const typedBody = submitBody as BackendPlacementSubmitResponse;
  const skippedAll = orderedAnswers.every((a) => a === -1);
  const placement = mapPlacementApiResult(typedBody, params.modules, skippedAll);

  // Nộp placement xong mới lưu survey để apiFetch đã tạo xong phiên khách (nếu là khách mới)
  await saveSurveyRequest(vietnameseLevelForPlacement(typedBody.level));

  return {
    placement,
    surveySaved,
    surveyError,
    roadmapId,
    placementSource: 'api',
  };
}
