/**
 * Bộ đọc nguồn của pipeline sinh đề (docs/ml-pipeline.md §1): mỗi bài trong gói đã build
 * thành một "chunk" — phần lý thuyết đưa vào prompt + thứ để kiểm trùng.
 *
 * Đọc FILE, không đọc DB: `scripts/pe-v4/out-advanced/lessons/*.json` là đúng bản đang
 * seed. Thêm môn mới = thêm một bộ đọc trả về `LessonChunk[]`, không sửa lõi.
 *
 * Lệch so với thiết kế, đo ngày 23/11/2026: thiết kế lấy `concepts` từ title của
 * `step_1.theory`, nhưng 28/48 bài (toàn bộ M4–M8, X01…DA02) KHÔNG có `step_1.theory`.
 * Làm đúng thiết kế thì 28 bài đó có 0 khái niệm và mọi câu sinh ra trượt A7. Nên:
 *   · có theory  → concepts = title các mục theory, lý thuyết = title + body + bullets;
 *   · không có   → concepts = [brief.title], lý thuyết = context (title, body, example).
 * `misconception` (lỗi người mới hay mắc) có ở cả 48 bài và luôn được đưa vào: đó đúng là
 * chất liệu cho lựa chọn sai "có sức hút" mà tầng B chấm.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Mcq } from './mcq-filters';

export interface LessonChunk {
  course_id: string;
  lesson_code: string;
  sort_order: number;
  module_code: string;
  title: string;
  concepts: string[];
  theory_text: string;
  explain_text: string;
  misconception_text: string;
  existing_mcq: Mcq[];
  packages: string[];
}

type Rec = Record<string, unknown>;

const isRecord = (v: unknown): v is Rec =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** `"M1 · Tiến trình và subprocess"` → `"M1"`; không khớp thì chuỗi rỗng (A7 sẽ loại). */
export function moduleCodeOf(module: string): string {
  return /^\s*(M\d+)\b/.exec(module)?.[1] ?? '';
}

function joinLines(parts: string[]): string {
  return parts.filter(Boolean).join('\n');
}

function theoryText(theory: unknown[]): string {
  return theory
    .filter(isRecord)
    .map((t) =>
      joinLines([
        str(t.title) && `## ${str(t.title)}`,
        str(t.body),
        ...arr(t.bullets).map((b) => (str(b) ? `- ${str(b)}` : '')),
      ]),
    )
    .join('\n\n');
}

/**
 * Chuyển một bài (hình dạng file trong `out-advanced/lessons/`) thành chunk.
 * Trả `error` thay vì ném: một bài hỏng không được làm dừng cả lượt sinh đề.
 */
export function toChunk(
  lesson: unknown,
  courseId: string,
): { chunk?: LessonChunk; error?: string } {
  if (!isRecord(lesson) || !isRecord(lesson.content_json)) {
    return { error: 'thiếu content_json' };
  }
  const code = str(lesson.lesson_code);
  const c = lesson.content_json;
  const s1 = isRecord(c.step_1) ? c.step_1 : {};
  const s2 = isRecord(c.step_2) ? c.step_2 : {};
  const s4 = isRecord(c.step_4) ? c.step_4 : {};
  const brief = isRecord(s1.brief) ? s1.brief : {};
  const context = isRecord(s1.context) ? s1.context : {};
  const misc = isRecord(s1.misconception) ? s1.misconception : {};
  const theory = arr(s1.theory);

  const concepts = theory.length
    ? theory
        .filter(isRecord)
        .map((t) => str(t.title))
        .filter(Boolean)
    : [str(brief.title) || str(lesson.title)].filter(Boolean);

  const theory_text = theory.length
    ? theoryText(theory)
    : joinLines([
        str(context.title) && `## ${str(context.title)}`,
        str(context.body),
        str(context.example) && `Ví dụ: ${str(context.example)}`,
      ]);

  const explain_text = arr(s1.explain)
    .filter(isRecord)
    .map((e) => joinLines([str(e.title), str(e.body)]))
    .filter(Boolean)
    .map((t, i) => `${i + 1}. ${t}`)
    .join('\n');

  if (!code) return { error: 'thiếu lesson_code' };
  if (!theory_text && !explain_text)
    return { error: `${code}: không có lý thuyết nào để sinh đề` };

  return {
    chunk: {
      course_id: courseId,
      lesson_code: code,
      sort_order: typeof lesson.sort_order === 'number' ? lesson.sort_order : 0,
      module_code: moduleCodeOf(str(lesson.module)),
      // Gói ghi "N01 · Array, dtype…": bỏ tiền tố mã để prompt không lặp "Bài N01: N01 · …".
      title: str(lesson.title).replace(new RegExp(`^${code}\\s*·\\s*`), ''),
      concepts,
      theory_text,
      explain_text,
      misconception_text: joinLines([str(misc.title), str(misc.body)]),
      existing_mcq: arr(s2.mcq) as Mcq[],
      packages: arr(s4.packages).map(str).filter(Boolean),
    },
  };
}

/** Đọc mọi `*.json` trong thư mục gói bài, theo thứ tự tên file (= thứ tự sort_order). */
export function loadLessonDir(
  dir: string,
  courseId: string,
): { chunks: LessonChunk[]; errors: string[] } {
  const chunks: LessonChunk[] = [];
  const errors: string[] = [];
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch (err) {
      errors.push(`${file}: JSON hỏng (${(err as Error).message})`);
      continue;
    }
    const { chunk, error } = toChunk(raw, courseId);
    if (chunk) chunks.push(chunk);
    else errors.push(`${file}: ${error}`);
  }
  return { chunks, errors };
}
