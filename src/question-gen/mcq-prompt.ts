/**
 * Dựng prompt sinh trắc nghiệm (docs/ml-pipeline.md §3) — phần thuần của
 * `scripts/gen-questions/mcq.ts`.
 *
 * Mẫu prompt là FILE trong `scripts/gen-questions/prompts/<prompt_version>.md`, không sửa
 * đè: mỗi bản prompt một file, để so được bản nào tốt hơn bằng chỉ số §4.
 * File chia hai phần bằng dòng `---USER---`:
 *   · phần trên → systemInstruction (chỉ dẫn + ví dụ few-shot);
 *   · phần dưới → nội dung người dùng (tài liệu bài, coi là DỮ LIỆU).
 * Tách như vậy để chỉ dẫn và tài liệu không trộn trong cùng một lượt — tài liệu bài có thể
 * chứa câu kiểu "bỏ qua chỉ dẫn trên" (§6, rủi ro prompt injection).
 */
import {
  ruleA2SingleAnswer,
  ruleA3OptionText,
  ruleA4Explained,
  ruleA5NoLeak,
  type Mcq,
} from './mcq-filters';
import type { LessonChunk } from './lesson-chunks';

export const USER_SEPARATOR = '---USER---';

export interface PromptParts {
  system: string;
  user: string;
}

export interface FewShot {
  label: string;
  mcq: Mcq;
}

/** Thay `{{khoa}}`; khoá không có trong `vars` là lỗi — mẫu sai tên biến thì phải biết ngay. */
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in vars))
      throw new Error(`Mẫu prompt dùng {{${key}}} nhưng không có giá trị`);
    return vars[key];
  });
}

export function splitTemplate(template: string): {
  system: string;
  user: string;
} {
  const idx = template.indexOf(USER_SEPARATOR);
  if (idx < 0) throw new Error(`Mẫu prompt thiếu dòng ${USER_SEPARATOR}`);
  return {
    system: template.slice(0, idx).trim(),
    user: template.slice(idx + USER_SEPARATOR.length).trim(),
  };
}

/**
 * Câu nào của giáo trình được làm ví dụ few-shot: phải tự qua A2–A5.
 * Đo ngày 23/11/2026: 104/146 câu step_2.mcq có sẵn trượt A5 vì đáp án đúng dài hơn 1,5 lần
 * lựa chọn sai dài nhất (ví dụ G03#2: 43 ký tự so với 4). Đưa chúng làm ví dụ là dạy mô
 * hình đúng thói "đáp án đúng là câu dài nhất", rồi chính bộ lọc A5 loại hết câu sinh ra.
 */
export function isGoodExample(m: Mcq): boolean {
  return [
    ruleA2SingleAnswer,
    ruleA3OptionText,
    ruleA4Explained,
    ruleA5NoLeak,
  ].every((rule) => rule(m).ok);
}

/**
 * Chọn `n` ví dụ: ưu tiên bài KHÁC trong cùng module (cùng giọng, cùng chủ đề nhưng không
 * phải câu của chính bài — tránh mô hình chép lại); thiếu thì lấy từ module khác.
 * Xoay điểm bắt đầu theo sort_order để các bài cùng module không dùng chung đúng một bộ ví
 * dụ. Tất định: cùng đầu vào cho cùng ví dụ, để so hai bản prompt công bằng.
 */
export function pickFewShot(
  all: LessonChunk[],
  target: LessonChunk,
  n: number,
): FewShot[] {
  if (n <= 0) return [];
  const pool = (chunks: LessonChunk[]) =>
    chunks.flatMap((c) =>
      c.existing_mcq
        .map((mcq, i) => ({ label: `${c.lesson_code}#${i}`, mcq }))
        .filter((e) => isGoodExample(e.mcq)),
    );
  const others = all.filter((c) => c.lesson_code !== target.lesson_code);
  const same = pool(others.filter((c) => c.module_code === target.module_code));
  const rest = pool(others.filter((c) => c.module_code !== target.module_code));
  const rotate = <T>(xs: T[]): T[] => {
    if (!xs.length) return xs;
    const k = target.sort_order % xs.length;
    return [...xs.slice(k), ...xs.slice(0, k)];
  };
  return [...rotate(same), ...rotate(rest)].slice(0, n);
}

const bulletList = (xs: string[]) => xs.map((x) => `- ${x}`).join('\n');

export function buildMcqPrompt(
  template: string,
  chunk: LessonChunk,
  examples: FewShot[],
  count: number,
): PromptParts {
  const { system, user } = splitTemplate(template);
  const vars: Record<string, string> = {
    count: String(count),
    lesson_code: chunk.lesson_code,
    title: chunk.title,
    module_code: chunk.module_code,
    concepts: bulletList(chunk.concepts),
    theory: chunk.theory_text || '(không có)',
    explain: chunk.explain_text || '(không có)',
    misconception: chunk.misconception_text || '(không có)',
    existing:
      chunk.existing_mcq.map((m) => `- ${m.question}`).join('\n') ||
      '(chưa có)',
    examples: examples.length
      ? examples.map((e) => JSON.stringify(e.mcq)).join('\n')
      : '(không có ví dụ)',
  };
  return {
    system: renderTemplate(system, vars),
    user: renderTemplate(user, vars),
  };
}

/**
 * Lấy mảng câu từ chữ mô hình trả về. Nhận `{"questions":[…]}` (dạng prompt yêu cầu) hoặc
 * mảng trần; bỏ rào ```json nếu mô hình lỡ thêm. Không parse được thì ném — bên gọi ghi
 * lỗi cho bài đó và đi tiếp.
 */
export function extractQuestions(text: string): unknown[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const parsed: unknown = JSON.parse(cleaned);
  if (Array.isArray(parsed)) return parsed;
  if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as { questions?: unknown }).questions)
  ) {
    return (parsed as { questions: unknown[] }).questions;
  }
  throw new Error('JSON không có mảng questions');
}

const DIFFICULTIES = new Set(['basic', 'intermediate', 'advanced']);

/** `difficulty` mô hình tự gắn; giá trị lạ thành null (cột có CHECK, không loại cả câu vì nó). */
export function difficultyOf(raw: unknown): string | null {
  const d = (raw as { difficulty?: unknown } | null)?.difficulty;
  return typeof d === 'string' && DIFFICULTIES.has(d) ? d : null;
}

/**
 * Khái niệm của câu: chỉ nhận những khái niệm mô hình chọn mà CÓ trong danh sách của bài
 * (mô hình hay tự đặt tên mới); không còn cái nào thì dùng cả danh sách của bài.
 */
export function conceptsOf(raw: unknown, chunk: LessonChunk): string[] {
  const picked = (raw as { concepts?: unknown } | null)?.concepts;
  const known = new Set(chunk.concepts);
  const ok = Array.isArray(picked)
    ? picked
        .filter(
          (c): c is string => typeof c === 'string' && known.has(c.trim()),
        )
        .map((c) => c.trim())
    : [];
  return ok.length ? ok : chunk.concepts;
}
