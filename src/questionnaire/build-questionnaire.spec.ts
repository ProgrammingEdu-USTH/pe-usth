import { readFileSync } from 'fs';
import { join } from 'path';
import { ruleA5NoLeak } from '../question-gen/mcq-filters';
import {
  buildQuestionnaireFromLessons,
  type LessonLike,
} from './build-questionnaire';
import { parseQuestionnaireDoc, scorePlacement } from './questionnaire.logic';

// Gói bài ĐANG nạp vào DB và cùng giáo trình với curricula.json của FE (11 module, 179 bài).
// Không dùng scripts/pe-v4: module M1 ở đó là "tiến trình", ở DB là "Python nền tảng".
const ROOT = join(__dirname, '..', '..');
const PACK = JSON.parse(
  readFileSync(join(ROOT, 'scripts/pe-da/out/lessons.json'), 'utf8'),
) as { course_id: string; lessons: LessonLike[] };
const COMMITTED = join(
  ROOT,
  'scripts/placement/questionnaire-python_advanced.json',
);
const M1_M8 = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'];

/** Đúng tham số mặc định của scripts/seed-questionnaire.ts. */
const build = () =>
  buildQuestionnaireFromLessons(PACK.lessons, {
    courseId: PACK.course_id,
    moduleCodes: M1_M8,
    perModule: 3,
    params: { mastery_threshold: 0.66, max_duration_min: 10 },
    title: 'Bài kiểm tra đầu vào theo module',
  });

describe('buildQuestionnaireFromLessons — dữ liệu thật (pe-da)', () => {
  const { doc, report } = build();

  it('đủ 3 câu cho mỗi module M1–M8 (24 câu, ≥ 20 câu sheet yêu cầu)', () => {
    expect(doc.items).toHaveLength(24);
    for (const r of report) expect(r.short).toBe(0);
    for (const m of M1_M8)
      expect(doc.items.filter((it) => it.module_code === m)).toHaveLength(3);
  });

  it('mỗi câu lấy từ đúng một bài của module đó, gắn đủ ba mức', () => {
    const byCode = new Map(PACK.lessons.map((l) => [l.lesson_code, l]));
    for (const it of doc.items) {
      const lesson = byCode.get(it.source?.lesson_code ?? '');
      expect(lesson?.module?.startsWith(`${it.module_code} `)).toBe(true);
    }
    for (const m of M1_M8)
      expect(
        doc.items.filter((it) => it.module_code === m).map((it) => it.level),
      ).toEqual(['basic', 'intermediate', 'advanced']);
  });

  it('không câu nào đoán được bằng "chọn đáp án dài nhất" (A5)', () => {
    for (const it of doc.items) {
      const mcq = {
        question: it.question,
        correct: it.correct,
        explanation: it.explanation ?? '',
        options: it.options.map((o, i) => ({
          text: o.text,
          detail: 'x',
          correct: i === it.correct,
        })),
      };
      expect(ruleA5NoLeak(mcq)).toEqual({ ok: true });
    }
  });

  it('không câu nào dựa vào ngữ cảnh của bài ("ở trên", "của bài", "trong sơ đồ"…)', () => {
    for (const it of doc.items)
      expect(it.question).not.toMatch(
        /ở trên|của bài|trong bài|bài này|trong sơ đồ/i,
      );
  });

  it('mọi câu có lời giải để trả lại sau khi nộp', () => {
    for (const it of doc.items) expect(it.explanation).toBeTruthy();
  });

  it('dựng lại hai lần ra cùng kết quả, và KHỚP file đã commit', () => {
    // File trong repo là thứ Nam duyệt và thứ được nạp; lệch với lệnh dựng là nạp nhầm bản.
    expect(build().doc).toEqual(doc);
    const committed = parseQuestionnaireDoc(
      JSON.parse(readFileSync(COMMITTED, 'utf8')),
    );
    expect(committed).toEqual(doc);
  });

  it('modules đọc từ gói trùng thứ tự giáo trình của DB: đạt hết M1–M8 thì bắt đầu ở M9', () => {
    expect(doc.modules?.map((m) => m.code)).toEqual([
      'M1',
      'M2',
      'M3',
      'M4',
      'M5',
      'M6',
      'M7',
      'M8',
      'M9',
      'M10',
      'M11',
    ]);
    const all = Object.fromEntries(doc.items.map((it) => [it.id, it.correct]));
    const r = scorePlacement(doc, all);
    expect(r.start_module).toBe('M9');
    expect(r.start_lesson_no).toBe(160);
  });
});

describe('buildQuestionnaireFromLessons — luật lọc', () => {
  const mcq = (question: string, right: string, wrong: string[]) => ({
    question,
    explanation: 'vì vậy',
    options: [
      { text: right, detail: 'đúng', correct: true },
      ...wrong.map((t) => ({ text: t, detail: 'sai' })),
    ],
  });
  const lesson = (code: string, sort: number, mcqs: unknown[]): LessonLike => ({
    lesson_code: code,
    sort_order: sort,
    module: 'M1 · Thử',
    content_json: { step_2: { mcq: mcqs } },
  });
  const run = (lessons: LessonLike[], perModule = 1) =>
    buildQuestionnaireFromLessons(lessons, {
      courseId: 'c',
      moduleCodes: ['M1'],
      perModule,
    });

  it('bỏ câu có đáp án đúng dài vượt trội (A5), lấy câu sau', () => {
    const { doc } = run([
      lesson('A1', 1, [
        mcq('Câu lộ?', 'một đáp án đúng rất rất dài và chi tiết', ['a', 'b']),
        mcq('Câu ổn?', 'xy', ['ab', 'cd']),
      ]),
    ]);
    expect(doc.items.map((it) => it.question)).toEqual(['Câu ổn?']);
  });

  it('bỏ câu dựa vào ngữ cảnh của bài', () => {
    const { doc } = run([
      lesson('A1', 1, [
        mcq('Đoạn code ở trên in gì?', '1', ['2', '3']),
        mcq('1 + 1 bằng mấy?', '2', ['3', '4']),
      ]),
    ]);
    expect(doc.items.map((it) => it.question)).toEqual(['1 + 1 bằng mấy?']);
  });

  it('module ít bài thì lấy câu thứ hai của bài đã dùng thay vì thiếu câu', () => {
    const { doc, report } = run(
      [
        lesson('A1', 1, [
          mcq('Câu 1?', 'xa', ['xb', 'xc']),
          mcq('Câu 2?', 'ya', ['yb', 'yc']),
        ]),
        lesson('A2', 2, [mcq('Câu 3?', 'za', ['zb', 'zc'])]),
      ],
      3,
    );
    expect(doc.items).toHaveLength(3);
    expect(report[0].short).toBe(0);
  });

  it('đọc được content_json dạng chuỗi và câu đánh dấu đúng bằng cờ trên lựa chọn', () => {
    const { doc } = run([
      {
        ...lesson('A1', 1, []),
        content_json: JSON.stringify({
          step_2: { mcq: [mcq('Hỏi?', 'p', ['q', 'r'])] },
        }),
      },
    ]);
    expect(doc.items[0]).toMatchObject({
      correct: 0,
      options: [{ text: 'p' }, { text: 'q' }, { text: 'r' }],
    });
  });
});
