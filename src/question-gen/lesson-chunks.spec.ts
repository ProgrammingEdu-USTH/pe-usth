import { readFileSync } from 'fs';
import { join } from 'path';
import { loadLessonDir, moduleCodeOf, toChunk } from './lesson-chunks';

// Gói bài THẬT đang seed — không dựng fixture tay (bẫy đầu tiên trong AGENTS.md).
const LESSON_DIR = join(__dirname, '../../scripts/pe-v4/out-advanced/lessons');
const readLesson = (file: string): unknown =>
  JSON.parse(readFileSync(join(LESSON_DIR, file), 'utf8'));

describe('lesson-chunks — gói python_advanced thật', () => {
  const { chunks, errors } = loadLessonDir(LESSON_DIR, 'python_advanced');

  it('48 bài thành 48 chunk, không lỗi', () => {
    expect(errors).toEqual([]);
    expect(chunks).toHaveLength(48);
    expect(chunks.map((c) => c.sort_order)).toEqual(
      Array.from({ length: 48 }, (_, i) => i + 1),
    );
  });

  it('đủ 8 module M1–M8, mã lấy từ phần đầu của module', () => {
    expect([...new Set(chunks.map((c) => c.module_code))]).toEqual([
      'M1',
      'M2',
      'M3',
      'M4',
      'M5',
      'M6',
      'M7',
      'M8',
    ]);
  });

  it('MỌI bài có khái niệm, lý thuyết và misconception — kể cả 28 bài không có step_1.theory', () => {
    const thieu = chunks
      .filter(
        (c) =>
          !c.concepts.length ||
          !c.theory_text ||
          !c.explain_text ||
          !c.misconception_text,
      )
      .map((c) => c.lesson_code);
    expect(thieu).toEqual([]);
  });

  it('146 câu step_2.mcq có sẵn đi kèm chunk để kiểm trùng', () => {
    expect(chunks.reduce((n, c) => n + c.existing_mcq.length, 0)).toBe(146);
  });
});

describe('toChunk', () => {
  it('bài có theory: khái niệm = title các mục theory (P01)', () => {
    const { chunk } = toChunk(readLesson('001-P01.json'), 'python_advanced');
    expect(chunk?.module_code).toBe('M1');
    expect(chunk?.concepts[0]).toBe('Program trên đĩa, process là lần chạy');
    expect(chunk?.theory_text).toContain(
      '- PID: số hệ điều hành cấp cho từng process',
    );
    expect(
      chunk?.explain_text.startsWith('1. Program là mã nằm yên trên đĩa'),
    ).toBe(true);
  });

  it('bài KHÔNG có theory: khái niệm = brief.title, lý thuyết = context (N01)', () => {
    const { chunk } = toChunk(readLesson('026-N01.json'), 'python_advanced');
    expect(chunk?.concepts).toEqual(['Array, dtype, shape và axis']);
    expect(chunk?.theory_text).toContain('make_grid(n, n_cols)');
    expect(chunk?.misconception_text).toContain('axis là chiều bị GỘP mất');
  });

  it('bài hỏng trả lỗi chứ không ném', () => {
    expect(toChunk({ lesson_code: 'X' }, 'c').error).toBe('thiếu content_json');
    expect(
      toChunk({ lesson_code: 'X', content_json: {} }, 'c').error,
    ).toContain('không có lý thuyết');
  });

  it.each([
    ['M1 · Tiến trình và subprocess', 'M1'],
    ['M12 · Gì đó', 'M12'],
    ['Tiến trình', ''],
  ])('moduleCodeOf(%j) = %j', (input, out) => {
    expect(moduleCodeOf(input)).toBe(out);
  });
});
