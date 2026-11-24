/**
 * Logic thuần của bộ câu hỏi đầu vào theo module (docs/questionnaire-spec.md §2–§3).
 * Không đụng DB để Jest kiểm được và đổi tham số không cần migration.
 *
 * Vì sao có file này khi đã có src/placement/: placement chấm MỘT điểm tổng
 * (beginner/intermediate/advanced), nên không nói được người học yếu ở module nào.
 * Màn /onboarding (frontend/src/lib/onboarding-questionnaire.ts) đang chấm xếp module
 * bằng dữ liệu giả với công thức của spec; `scorePlacement` dưới đây đi ĐÚNG từng bước của
 * `scoreQuestionnaireMock` ở FE, để FE tắt cờ mock mà người học vẫn nhận cùng kết quả.
 *
 * `correct` và `explanation` của từng câu CHỈ server đọc. `publicQuestionnaire` chọn từng
 * trường được phép gửi đi (không phải xoá trường cấm), nên thêm trường mới vào bộ câu cũng
 * không tự lọt ra FE (bẫy "lộ đáp án" trong AGENTS.md).
 */

export type QuestionnaireOption = { text: string };

export type QuestionnaireItem = {
  id: string;
  module_code: string;
  level?: string;
  question: string;
  code?: string | null;
  options: QuestionnaireOption[];
  /** Chỉ số lựa chọn đúng — CHỈ server đọc. */
  correct: number;
  /** Lời giải — chỉ trả ra SAU khi nộp. */
  explanation?: string;
  /** Câu lấy từ bài nào (để duyệt và truy lại); không gửi FE. */
  source?: { lesson_code?: string; sort_order?: number; index?: number };
};

export type SelfAssessOption = { text: string; value: number };

export type SelfAssessItem = {
  id: string;
  module_code: string;
  question: string;
  options: SelfAssessOption[];
};

export type QuestionnaireParams = {
  items_per_module?: number;
  mastery_threshold: number;
  self_assess_weight: number;
  skip_policy: 'wrong' | 'exclude';
  max_duration_min?: number;
};

/** Module của giáo trình: mã, tên, sort_order của bài đầu. Dùng khi DB không có cột module. */
export type ModuleRow = {
  code: string;
  title?: string;
  first_lesson_no: number;
};

export type QuestionnaireDoc = {
  course_id: string;
  version?: number;
  title?: string;
  params: QuestionnaireParams;
  modules?: ModuleRow[];
  self_assess?: SelfAssessItem[];
  items: QuestionnaireItem[];
};

/** Câu trả lời: id câu → chỉ số lựa chọn, null (hoặc thiếu) = bỏ qua. */
export type AnswerMap = Record<string, number | null>;

export const DEFAULT_PARAMS: QuestionnaireParams = {
  mastery_threshold: 0.67,
  self_assess_weight: 0.2,
  skip_policy: 'wrong',
};

/** Trần số lựa chọn mỗi câu, cùng trần với placement (answers lưu SMALLINT). */
export const MAX_OPTIONS = 10;

/** Ba tên mức FE đang dùng (spec §3 bước 4). */
export const LEVEL_TITLES = {
  low: 'Khởi đầu vững chắc',
  mid: 'Nền tảng vững vàng',
  high: 'Sẵn sàng bứt phá',
} as const;

const MODULE_CODE = /^M\d+$/;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const nonEmpty = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;

const isInt = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v);

/** Mã module ở đầu tên module: "M1 · Python nền tảng" → "M1". */
export function moduleCodeOf(title: string | null | undefined): string | null {
  const m = /^\s*(M\d+)\b/i.exec(title ?? '');
  return m ? m[1].toUpperCase() : null;
}

/** Bộ câu định dạng mới là object có mảng `items`; bản cũ của placement là một mảng câu. */
export function isQuestionnaireDoc(json: unknown): boolean {
  return isObj(json) && Array.isArray(json.items);
}

/**
 * Kiểm bộ câu đọc từ DB hoặc từ file nạp. Ném Error có câu tiếng Việt chỉ rõ chỗ sai:
 * dữ liệu sai hình mà để lọt thì người học thấy nút trắng, hoặc câu không có đáp án đúng,
 * mà không log nào đỏ. Trả về bản đã chuẩn hoá chỉ gồm các trường biết tên.
 */
export function parseQuestionnaireDoc(json: unknown): QuestionnaireDoc {
  if (!isObj(json)) throw new Error('Bộ câu hỏi phải là object JSON.');
  if (!nonEmpty(json.course_id)) throw new Error('Thiếu course_id.');

  const p = isObj(json.params) ? json.params : {};
  const params: QuestionnaireParams = {
    ...DEFAULT_PARAMS,
    ...(isInt(p.items_per_module)
      ? { items_per_module: p.items_per_module }
      : {}),
    ...(typeof p.max_duration_min === 'number'
      ? { max_duration_min: p.max_duration_min }
      : {}),
  };
  if (p.mastery_threshold !== undefined) {
    const t = p.mastery_threshold;
    if (typeof t !== 'number' || !(t > 0 && t <= 1))
      throw new Error('params.mastery_threshold phải nằm trong (0, 1].');
    params.mastery_threshold = t;
  }
  if (p.self_assess_weight !== undefined) {
    const w = p.self_assess_weight;
    if (typeof w !== 'number' || !(w >= 0 && w <= 1))
      throw new Error('params.self_assess_weight phải nằm trong [0, 1].');
    params.self_assess_weight = w;
  }
  if (p.skip_policy !== undefined) {
    if (p.skip_policy !== 'wrong' && p.skip_policy !== 'exclude')
      throw new Error('params.skip_policy chỉ nhận "wrong" hoặc "exclude".');
    params.skip_policy = p.skip_policy;
  }

  if (!Array.isArray(json.items) || json.items.length === 0)
    throw new Error('items phải là mảng có ít nhất 1 câu.');

  // id câu làm thật và câu tự khai dùng chung một không gian: answers và self là hai map
  // riêng, nhưng trùng id giữa hai bên làm báo cáo và nhật ký đọc nhầm.
  const ids = new Set<string>();
  const takeId = (id: unknown, at: string): string => {
    if (!nonEmpty(id)) throw new Error(`${at}: thiếu id.`);
    if (ids.has(id)) throw new Error(`${at}: trùng id "${id}".`);
    ids.add(id);
    return id;
  };
  const takeModule = (v: unknown, at: string): string => {
    if (typeof v !== 'string' || !MODULE_CODE.test(v.trim().toUpperCase()))
      throw new Error(`${at}: module_code phải có dạng M1, M2…`);
    return v.trim().toUpperCase();
  };

  const items: QuestionnaireItem[] = json.items.map((raw, i) => {
    const at = `items[${i}]`;
    if (!isObj(raw)) throw new Error(`${at}: phải là object.`);
    const id = takeId(raw.id, at);
    const module_code = takeModule(raw.module_code, at);
    if (!nonEmpty(raw.question)) throw new Error(`${at}: thiếu question.`);
    const opts = raw.options;
    if (!Array.isArray(opts) || opts.length < 2 || opts.length > MAX_OPTIONS)
      throw new Error(`${at}: cần 2–${MAX_OPTIONS} lựa chọn.`);
    const options = opts.map((o, j) => {
      // Lựa chọn dùng khoá `title` thay cho `text` thành nút trắng mà không lỗi nào báo
      // (bẫy normalizeQuestion trong AGENTS.md): chặn ngay lúc nạp.
      if (!isObj(o) || !nonEmpty(o.text))
        throw new Error(
          `${at}.options[${j}]: thiếu text (không dùng khoá title).`,
        );
      return { text: o.text };
    });
    if (!isInt(raw.correct) || raw.correct < 0 || raw.correct >= options.length)
      throw new Error(`${at}: correct nằm ngoài danh sách lựa chọn.`);
    if (raw.explanation !== undefined && typeof raw.explanation !== 'string')
      throw new Error(`${at}: explanation phải là chuỗi.`);
    const item: QuestionnaireItem = {
      id,
      module_code,
      question: raw.question,
      options,
      correct: raw.correct,
    };
    if (nonEmpty(raw.level)) item.level = raw.level;
    if (typeof raw.code === 'string' && raw.code.trim()) item.code = raw.code;
    if (nonEmpty(raw.explanation)) item.explanation = raw.explanation;
    if (isObj(raw.source)) {
      const s = raw.source;
      item.source = {
        ...(typeof s.lesson_code === 'string'
          ? { lesson_code: s.lesson_code }
          : {}),
        ...(isInt(s.sort_order) ? { sort_order: s.sort_order } : {}),
        ...(isInt(s.index) ? { index: s.index } : {}),
      };
    }
    return item;
  });

  const self_assess: SelfAssessItem[] = [];
  if (json.self_assess !== undefined) {
    if (!Array.isArray(json.self_assess))
      throw new Error('self_assess phải là mảng.');
    json.self_assess.forEach((raw, i) => {
      const at = `self_assess[${i}]`;
      if (!isObj(raw)) throw new Error(`${at}: phải là object.`);
      const id = takeId(raw.id, at);
      const module_code = takeModule(raw.module_code, at);
      if (!nonEmpty(raw.question)) throw new Error(`${at}: thiếu question.`);
      const opts = raw.options;
      if (!Array.isArray(opts) || opts.length < 2 || opts.length > MAX_OPTIONS)
        throw new Error(`${at}: cần 2–${MAX_OPTIONS} lựa chọn.`);
      const options = opts.map((o, j) => {
        if (!isObj(o) || !nonEmpty(o.text))
          throw new Error(`${at}.options[${j}]: thiếu text.`);
        if (typeof o.value !== 'number' || !(o.value >= 0 && o.value <= 1))
          throw new Error(`${at}.options[${j}]: value phải nằm trong [0, 1].`);
        return { text: o.text, value: o.value };
      });
      self_assess.push({ id, module_code, question: raw.question, options });
    });
  }

  let modules: ModuleRow[] | undefined;
  if (json.modules !== undefined) {
    if (!Array.isArray(json.modules)) throw new Error('modules phải là mảng.');
    modules = json.modules.map((raw, i) => {
      const at = `modules[${i}]`;
      if (!isObj(raw)) throw new Error(`${at}: phải là object.`);
      const code = takeModule(raw.code, at);
      if (!isInt(raw.first_lesson_no) || raw.first_lesson_no < 1)
        throw new Error(`${at}: first_lesson_no phải là số nguyên ≥ 1.`);
      return {
        code,
        first_lesson_no: raw.first_lesson_no,
        ...(nonEmpty(raw.title) ? { title: raw.title } : {}),
      };
    });
  }

  return {
    course_id: json.course_id,
    ...(isInt(json.version) ? { version: json.version } : {}),
    ...(nonEmpty(json.title) ? { title: json.title } : {}),
    params,
    ...(modules ? { modules } : {}),
    ...(self_assess.length ? { self_assess } : {}),
    items,
  };
}

/**
 * Bản gửi ra FE: CHỌN từng trường được phép, không kèm `correct`, `explanation`, `source`.
 * Hình dạng khớp `QuestionnairePayload` của FE (onboarding-questionnaire.ts).
 */
export function publicQuestionnaire(doc: QuestionnaireDoc) {
  return {
    course_id: doc.course_id,
    version: doc.version ?? 1,
    ...(doc.title ? { title: doc.title } : {}),
    params: { ...doc.params },
    ...(doc.modules ? { modules: doc.modules.map((m) => ({ ...m })) } : {}),
    self_assess: (doc.self_assess ?? []).map((s) => ({
      id: s.id,
      module_code: s.module_code,
      question: s.question,
      options: s.options.map((o) => ({ text: o.text, value: o.value })),
    })),
    items: doc.items.map((it) => ({
      id: it.id,
      module_code: it.module_code,
      ...(it.level ? { level: it.level } : {}),
      question: it.question,
      code: it.code ?? null,
      options: it.options.map((o) => ({ text: o.text })),
    })),
  };
}

/** Trần số khoá trong một map trả lời: chặn payload bất thường trước khi duyệt. */
const MAX_ANSWER_KEYS = 200;

function checkMap(
  raw: unknown,
  known: Map<string, number>,
  label: string,
): string | null {
  if (raw === undefined || raw === null) return null;
  if (!isObj(raw))
    return `${label} phải là object { id câu: chỉ số lựa chọn }.`;
  const keys = Object.keys(raw);
  if (keys.length > MAX_ANSWER_KEYS) return `${label} có quá nhiều khoá.`;
  for (const k of keys) {
    const n = known.get(k);
    if (n === undefined)
      return `${label}: câu "${k}" không thuộc bộ câu đang dùng.`;
    const v = raw[k];
    if (v === null) continue;
    if (!isInt(v) || v < 0 || v >= n)
      return `${label}: lựa chọn của câu "${k}" phải là số nguyên 0–${n - 1} hoặc null.`;
  }
  return null;
}

/**
 * Kiểm câu trả lời trước khi chấm (spec §5): id lạ hoặc chỉ số ngoài khoảng → trả câu lỗi
 * để service ném 400, thay vì chấm bừa. Thiếu câu = bỏ qua, không phải lỗi.
 */
export function checkAnswers(
  doc: QuestionnaireDoc,
  answers: unknown,
  self: unknown,
): string | null {
  if (!isObj(answers))
    return 'answers phải là object { id câu: chỉ số lựa chọn }.';
  return (
    checkMap(
      answers,
      new Map(doc.items.map((it) => [it.id, it.options.length])),
      'answers',
    ) ??
    checkMap(
      self,
      new Map((doc.self_assess ?? []).map((s) => [s.id, s.options.length])),
      'self',
    )
  );
}

/**
 * Module của khoá tính từ bảng `lessons` (spec §3: không ghi cứng bảng bài đầu).
 * Bài không có mã module ở đầu tên bị bỏ qua; kết quả xếp theo bài đầu.
 */
export function moduleRowsFromLessons(
  lessons: { module: string | null; sortOrder: number }[],
): ModuleRow[] {
  const rows = new Map<string, ModuleRow>();
  for (const l of lessons) {
    const code = moduleCodeOf(l.module);
    if (!code) continue;
    const row = rows.get(code);
    if (!row) {
      rows.set(code, {
        code,
        title: l.module ?? code,
        first_lesson_no: l.sortOrder,
      });
    } else if (l.sortOrder < row.first_lesson_no) {
      row.first_lesson_no = l.sortOrder;
    }
  }
  return [...rows.values()].sort(
    (a, b) => a.first_lesson_no - b.first_lesson_no,
  );
}

export type ItemReview = {
  item_id: string;
  module_code: string;
  picked: number | null;
  correct: number;
  is_correct: boolean;
  explanation?: string;
};

export type PlacementOutcome = {
  start_module: string;
  start_lesson_no: number;
  module_scores: Record<string, number>;
  review_modules: string[];
  level_title: string;
  skipped_all: boolean;
  /** Số câu làm thật trả lời đúng / tổng số câu: cùng nghĩa với score/total của placement. */
  correct_count: number;
  total: number;
  explanations: Record<string, string>;
  review: ItemReview[];
};

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Chấm và xếp module (spec §3). Đi đúng thứ tự bước của `scoreQuestionnaireMock` (FE):
 *  1. điểm làm thật từng module; bỏ qua tính SAI (`skip_policy = wrong`) hoặc bị loại khỏi
 *     mẫu số (`exclude`); module mà mọi câu bị loại được 0 (chưa đạt);
 *  2. trộn với tự khai: (1 − w) × test + w × self, chỉ khi người học có chọn câu tự khai;
 *  3. module bắt đầu = module được hỏi ĐẦU TIÊN (theo thứ tự giáo trình) dưới ngưỡng;
 *     đạt hết thì sang module KẾ TIẾP trong giáo trình (ví dụ đạt M1–M8 → M9);
 *  4. bỏ qua mọi câu → module đầu, `skipped_all = true`.
 * `modules` là thứ tự giáo trình thật (từ bảng lessons); rỗng thì dùng `doc.modules`.
 */
export function scorePlacement(
  doc: QuestionnaireDoc,
  answers: AnswerMap,
  self: AnswerMap = {},
  modules: ModuleRow[] = [],
): PlacementOutcome {
  const rows = [...(modules.length ? modules : (doc.modules ?? []))].sort(
    (a, b) => a.first_lesson_no - b.first_lesson_no,
  );
  const pos = new Map(rows.map((m, i) => [m.code, i]));
  const firstLesson = (code: string) =>
    rows.find((m) => m.code === code)?.first_lesson_no ?? 1;

  const { mastery_threshold: threshold, self_assess_weight: w } = doc.params;
  const skipPolicy = doc.params.skip_policy;

  // Module được hỏi, theo thứ tự giáo trình; module lạ (không có trong giáo trình) xếp cuối
  // theo thứ tự xuất hiện — sort của JS ổn định nên giữ được thứ tự đó.
  const tested: string[] = [];
  for (const it of doc.items)
    if (!tested.includes(it.module_code)) tested.push(it.module_code);
  tested.sort((a, b) => (pos.get(a) ?? 999) - (pos.get(b) ?? 999));

  const pickedOf = (id: string): number | null => {
    const v = answers[id];
    return typeof v === 'number' ? v : null;
  };

  const explanations: Record<string, string> = {};
  const review: ItemReview[] = doc.items.map((it) => {
    if (it.explanation) explanations[it.id] = it.explanation;
    const picked = pickedOf(it.id);
    return {
      item_id: it.id,
      module_code: it.module_code,
      picked,
      correct: it.correct,
      is_correct: picked === it.correct,
      ...(it.explanation ? { explanation: it.explanation } : {}),
    };
  });
  const correct_count = review.filter((r) => r.is_correct).length;
  const total = doc.items.length;

  const module_scores: Record<string, number> = {};
  const skippedAll = doc.items.every((it) => pickedOf(it.id) === null);
  if (skippedAll) {
    for (const m of tested) module_scores[m] = 0;
    const start = tested[0] ?? 'M1';
    return {
      start_module: start,
      start_lesson_no: firstLesson(start),
      module_scores,
      review_modules: [],
      level_title: LEVEL_TITLES.low,
      skipped_all: true,
      correct_count,
      total,
      explanations,
      review,
    };
  }

  for (const m of tested) {
    let right = 0;
    let denom = 0;
    for (const it of doc.items) {
      if (it.module_code !== m) continue;
      const picked = pickedOf(it.id);
      if (picked === null) {
        if (skipPolicy !== 'exclude') denom += 1;
        continue;
      }
      denom += 1;
      if (picked === it.correct) right += 1;
    }
    const test = denom > 0 ? right / denom : 0;

    const sa = (doc.self_assess ?? []).find((s) => s.module_code === m);
    const saPicked = sa ? self[sa.id] : null;
    const saOpt =
      sa && typeof saPicked === 'number' ? sa.options[saPicked] : undefined;
    module_scores[m] = round4(saOpt ? (1 - w) * test + w * saOpt.value : test);
  }

  const failIdx = tested.findIndex((m) => module_scores[m] < threshold);
  let start_module: string;
  let review_modules: string[] = [];
  if (failIdx >= 0) {
    start_module = tested[failIdx];
    review_modules = tested
      .slice(failIdx + 1)
      .filter((m) => module_scores[m] < threshold);
  } else {
    const last = tested[tested.length - 1];
    const lastPos = last !== undefined ? pos.get(last) : undefined;
    const next =
      lastPos !== undefined && lastPos + 1 < rows.length
        ? rows[lastPos + 1]
        : null;
    start_module = next ? next.code : (last ?? 'M1');
  }

  // Ba mức theo số module đạt (spec §3 bước 4), cùng luật với FE: 0–2, 3–5, 6+; bộ câu
  // hỏi ít hơn 6 module thì đạt hết cũng là mức cao nhất.
  const passed = tested.filter((m) => module_scores[m] >= threshold).length;
  let level_title: string = LEVEL_TITLES.low;
  if (
    passed >= 6 ||
    (tested.length > 0 && tested.length < 6 && passed === tested.length)
  ) {
    level_title = LEVEL_TITLES.high;
  } else if (passed >= 3) {
    level_title = LEVEL_TITLES.mid;
  }

  return {
    start_module,
    start_lesson_no: firstLesson(start_module),
    module_scores,
    review_modules,
    level_title,
    skipped_all: false,
    correct_count,
    total,
    explanations,
    review,
  };
}

/**
 * Câu trả lời theo THỨ TỰ câu của bộ câu (-1 = bỏ qua): hình dạng cột
 * `placement_attempts.answers`, để phân tích chung một bảng với /placement.
 */
export function answersToArray(
  doc: QuestionnaireDoc,
  answers: AnswerMap,
): number[] {
  return doc.items.map((it) => {
    const v = answers[it.id];
    return typeof v === 'number' ? v : -1;
  });
}
