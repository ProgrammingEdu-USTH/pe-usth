import {
  answersToArray,
  checkAnswers,
  LEVEL_TITLES,
  moduleRowsFromLessons,
  parseQuestionnaireDoc,
  publicQuestionnaire,
  scorePlacement,
  type AnswerMap,
  type QuestionnaireDoc,
} from './questionnaire.logic';

/**
 * Bộ câu theo đúng giả định của bảng ví dụ ở docs/questionnaire-spec.md §6: 2 câu cho mỗi
 * module M1–M7, ngưỡng 0,67, w = 0,2, bỏ qua tính sai; M8 là module kế tiếp không có câu.
 * Đáp án đúng của mọi câu là lựa chọn 1, để "đúng"/"sai" trong bảng dịch thẳng ra chỉ số.
 */
const MODS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];
const FIRST = { M1: 1, M2: 8, M3: 14, M4: 21, M5: 26, M6: 32, M7: 41, M8: 47 };
const ROWS = Object.entries(FIRST).map(([code, first_lesson_no]) => ({
  code,
  first_lesson_no,
}));

const SPEC_DOC: QuestionnaireDoc = parseQuestionnaireDoc({
  course_id: 'python_advanced',
  params: {
    mastery_threshold: 0.67,
    self_assess_weight: 0.2,
    skip_policy: 'wrong',
  },
  self_assess: [
    {
      id: 'sa-m1',
      module_code: 'M1',
      question: 'Bạn đã dùng subprocess tới mức nào?',
      options: [
        { text: 'Chưa nghe tới', value: 0 },
        { text: 'Đã đọc qua', value: 0.33 },
        { text: 'Đã dùng vài lần', value: 0.67 },
        { text: 'Dùng thường xuyên', value: 1 },
      ],
    },
  ],
  items: MODS.flatMap((m) =>
    [1, 2].map((k) => ({
      id: `q-${m.toLowerCase()}-${k}`,
      module_code: m,
      question: `Câu ${k} của ${m}`,
      options: [{ text: 'sai A' }, { text: 'đúng' }, { text: 'sai B' }],
      correct: 1,
      explanation: `Giải thích ${m}#${k}`,
    })),
  ),
});

/** Số câu đúng mỗi module ("2/2", "1/2", "0/2") → map câu trả lời. */
function answersFor(right: Partial<Record<string, number>>): AnswerMap {
  const a: AnswerMap = {};
  for (const m of MODS) {
    const r = right[m] ?? 2;
    a[`q-${m.toLowerCase()}-1`] = r >= 1 ? 1 : 0;
    a[`q-${m.toLowerCase()}-2`] = r >= 2 ? 1 : 0;
  }
  return a;
}

describe('scorePlacement — bảng ví dụ tính tay của spec §6', () => {
  it.each([
    {
      n: 1,
      right: { M2: 1 },
      start: 'M2',
      lesson: 8,
      review: [],
      level: LEVEL_TITLES.high,
    },
    {
      n: 4,
      right: { M3: 0 },
      start: 'M3',
      lesson: 14,
      review: [],
      level: LEVEL_TITLES.high,
    },
    {
      n: 5,
      right: { M5: 1, M7: 0 },
      start: 'M5',
      lesson: 26,
      review: ['M7'],
      level: LEVEL_TITLES.mid,
    },
    {
      n: 6,
      right: {},
      start: 'M8',
      lesson: 47,
      review: [],
      level: LEVEL_TITLES.high,
    },
  ])(
    'ví dụ $n → bắt đầu $start (bài $lesson)',
    ({ right, start, lesson, review, level }) => {
      const r = scorePlacement(SPEC_DOC, answersFor(right), {}, ROWS);
      expect(r.start_module).toBe(start);
      expect(r.start_lesson_no).toBe(lesson);
      expect(r.review_modules).toEqual(review);
      expect(r.level_title).toBe(level);
      expect(r.skipped_all).toBe(false);
    },
  );

  it('ví dụ 2: tự khai cao không bù được câu sai (0,8 × 0,5 + 0,2 × 1 = 0,6 < 0,67)', () => {
    const r = scorePlacement(
      SPEC_DOC,
      answersFor({ M1: 1 }),
      { 'sa-m1': 3 },
      ROWS,
    );
    expect(r.module_scores.M1).toBeCloseTo(0.6, 4);
    expect(r.start_module).toBe('M1');
  });

  it('ví dụ 3: đúng 2/2 mà tự khai "chưa nghe" vẫn đạt (0,8)', () => {
    const r = scorePlacement(SPEC_DOC, answersFor({}), { 'sa-m1': 0 }, ROWS);
    expect(r.module_scores.M1).toBeCloseTo(0.8, 4);
    expect(r.start_module).toBe('M8');
  });

  it('ví dụ 7: bỏ qua tất cả → M1, skipped_all, mức thấp nhất', () => {
    const r = scorePlacement(SPEC_DOC, {}, {}, ROWS);
    expect(r.start_module).toBe('M1');
    expect(r.start_lesson_no).toBe(1);
    expect(r.skipped_all).toBe(true);
    expect(r.level_title).toBe(LEVEL_TITLES.low);
    expect(Object.values(r.module_scores).every((s) => s === 0)).toBe(true);
  });
});

describe('scorePlacement — bỏ qua và thứ tự module', () => {
  it('bỏ qua một câu tính là SAI (skip_policy = wrong): M1 đúng 1 + bỏ 1 = 0,5', () => {
    const a = answersFor({});
    a['q-m1-2'] = null;
    const r = scorePlacement(SPEC_DOC, a, {}, ROWS);
    expect(r.module_scores.M1).toBe(0.5);
    expect(r.start_module).toBe('M1');
  });

  it('skip_policy = exclude: câu bỏ qua ra khỏi mẫu số; bỏ hết câu của module thì 0', () => {
    const doc = {
      ...SPEC_DOC,
      params: { ...SPEC_DOC.params, skip_policy: 'exclude' as const },
    };
    const a = answersFor({});
    a['q-m1-2'] = null;
    a['q-m2-1'] = null;
    a['q-m2-2'] = null;
    const r = scorePlacement(doc, a, {}, ROWS);
    expect(r.module_scores.M1).toBe(1);
    expect(r.module_scores.M2).toBe(0);
    expect(r.start_module).toBe('M2');
  });

  it('thứ tự xếp theo GIÁO TRÌNH, không theo thứ tự câu trong bộ câu', () => {
    // Đảo ngược thứ tự câu: M7 được hỏi trước nhưng M2 vẫn là module dưới ngưỡng đầu tiên.
    const doc = { ...SPEC_DOC, items: [...SPEC_DOC.items].reverse() };
    const r = scorePlacement(doc, answersFor({ M2: 0, M7: 0 }), {}, ROWS);
    expect(r.start_module).toBe('M2');
    expect(r.review_modules).toEqual(['M7']);
  });

  it('không có module từ DB thì dùng modules ghi trong bộ câu', () => {
    const doc = { ...SPEC_DOC, modules: ROWS };
    expect(scorePlacement(doc, answersFor({ M3: 0 })).start_lesson_no).toBe(14);
  });

  it('đếm câu đúng và trả lời giải từng câu sau khi nộp', () => {
    const r = scorePlacement(SPEC_DOC, answersFor({ M1: 0 }), {}, ROWS);
    expect(r.total).toBe(14);
    expect(r.correct_count).toBe(12);
    expect(r.explanations['q-m1-1']).toBe('Giải thích M1#1');
    expect(r.review.find((x) => x.item_id === 'q-m1-1')).toMatchObject({
      picked: 0,
      correct: 1,
      is_correct: false,
    });
  });
});

describe('publicQuestionnaire', () => {
  it('không bao giờ kèm đáp án đúng, lời giải hay nguồn câu', () => {
    const doc = parseQuestionnaireDoc({
      ...SPEC_DOC,
      items: SPEC_DOC.items.map((it) => ({
        ...it,
        source: { lesson_code: 'PY01', sort_order: 1, index: 0 },
        // Trường lạ thêm về sau cũng không được lọt ra: bản public CHỌN trường, không xoá trường.
        secret_note: 'đáp án là B',
      })),
    });
    const pub = publicQuestionnaire(doc);
    for (const it of pub.items) {
      expect(Object.keys(it).sort()).toEqual(
        ['code', 'id', 'module_code', 'options', 'question'].sort(),
      );
      for (const o of it.options) expect(Object.keys(o)).toEqual(['text']);
    }
    const json = JSON.stringify(pub);
    expect(json).not.toContain('Giải thích');
    expect(json).not.toContain('PY01');
    expect(json).not.toContain('đáp án là B');
  });
});

describe('checkAnswers', () => {
  it('nhận null (bỏ qua) và câu thiếu', () => {
    expect(checkAnswers(SPEC_DOC, { 'q-m1-1': null }, undefined)).toBeNull();
    expect(checkAnswers(SPEC_DOC, {}, {})).toBeNull();
  });

  it.each([
    ['id lạ', { 'q-x-9': 0 }, undefined, 'không thuộc'],
    ['chỉ số ngoài khoảng', { 'q-m1-1': 3 }, undefined, '0–2'],
    ['số âm', { 'q-m1-1': -1 }, undefined, '0–2'],
    ['không phải số nguyên', { 'q-m1-1': 1.5 }, undefined, '0–2'],
    ['chuỗi', { 'q-m1-1': '1' }, undefined, '0–2'],
    ['answers là mảng', [0, 1], undefined, 'object'],
    ['câu tự khai lạ', {}, { 'sa-m9': 0 }, 'không thuộc'],
    ['tự khai ngoài khoảng', {}, { 'sa-m1': 4 }, '0–3'],
  ])('%s → lỗi', (_label, answers, self, msg) => {
    expect(checkAnswers(SPEC_DOC, answers, self)).toContain(msg);
  });
});

describe('parseQuestionnaireDoc', () => {
  const base = (item: Record<string, unknown>) => ({
    course_id: 'python_advanced',
    items: [
      {
        id: 'q1',
        module_code: 'M1',
        question: 'Hỏi?',
        options: [{ text: 'a' }, { text: 'b' }],
        correct: 0,
        ...item,
      },
    ],
  });

  it.each([
    [
      'lựa chọn dùng khoá title',
      base({ options: [{ title: 'a' }, { text: 'b' }] }),
      'title',
    ],
    ['correct ngoài khoảng', base({ correct: 2 }), 'correct'],
    ['module_code sai dạng', base({ module_code: 'Module 1' }), 'module_code'],
    ['thiếu course_id', { items: base({}).items }, 'course_id'],
    [
      'trùng id',
      { course_id: 'c', items: [...base({}).items, ...base({}).items] },
      'trùng id',
    ],
    [
      'ngưỡng ngoài (0, 1]',
      { ...base({}), params: { mastery_threshold: 67 } },
      'mastery_threshold',
    ],
  ])('%s → ném lỗi nói rõ chỗ sai', (_label, raw, msg) => {
    expect(() => parseQuestionnaireDoc(raw)).toThrow(msg);
  });

  it('điền tham số mặc định của spec khi thiếu', () => {
    expect(parseQuestionnaireDoc(base({})).params).toEqual({
      mastery_threshold: 0.67,
      self_assess_weight: 0.2,
      skip_policy: 'wrong',
    });
  });
});

describe('moduleRowsFromLessons và answersToArray', () => {
  it('lấy mã module ở đầu tên và bài đầu nhỏ nhất, xếp theo bài đầu', () => {
    expect(
      moduleRowsFromLessons([
        { module: 'M2 · NumPy', sortOrder: 20 },
        { module: 'M1 · Python nền tảng', sortOrder: 3 },
        { module: 'M2 · NumPy', sortOrder: 19 },
        { module: null, sortOrder: 1 },
        { module: 'M1 · Python nền tảng', sortOrder: 1 },
      ]),
    ).toEqual([
      { code: 'M1', title: 'M1 · Python nền tảng', first_lesson_no: 1 },
      { code: 'M2', title: 'M2 · NumPy', first_lesson_no: 19 },
    ]);
  });

  it('câu trả lời theo thứ tự câu, bỏ qua = -1 (hình cột placement_attempts.answers)', () => {
    const arr = answersToArray(SPEC_DOC, { 'q-m1-1': 1, 'q-m1-2': null });
    expect(arr).toHaveLength(14);
    expect(arr.slice(0, 3)).toEqual([1, -1, -1]);
  });
});
