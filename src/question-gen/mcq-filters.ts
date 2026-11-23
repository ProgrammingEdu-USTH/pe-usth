/**
 * Bộ lọc tầng A cho câu trắc nghiệm do pipeline sinh (docs/ml-pipeline.md §4).
 *
 * Phần THUẦN của `scripts/gen-questions/mcq.ts`: không gọi mạng, không chạm DB, để Jest
 * kiểm được từng luật. Mỗi luật trả `{ ok, reason }`; câu bị loại vẫn giữ trong báo cáo
 * kèm lý do, vì đó là dữ liệu để sửa prompt.
 *
 * Vì sao luật A3 tồn tại: `normalizeQuestion` (src/quizzes/quizzes.service.ts) chỉ đọc
 * khoá `text`/`label` của lựa chọn. Mô hình hay bắt chước câu "dự đoán" của giáo trình
 * (khoá `title`), và khi đó FE nhận 4 nút TRẮNG mà không lỗi nào báo — bẫy đã ghi trong
 * AGENTS.md. Luật này là chỗ duy nhất chặn được nó trước khi câu vào DB.
 */
import { createHash } from 'crypto';

/** Đúng hình dạng `step_2.mcq` của giáo trình (scripts/pe-v4/out-advanced/lessons/*.json). */
export interface McqOption {
  text: string;
  detail: string;
  correct: boolean;
}

export interface Mcq {
  question: string;
  options: McqOption[];
  correct: number;
  explanation: string;
}

export type RuleCode = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7';

export interface RuleResult {
  ok: boolean;
  reason?: string;
}

export interface RuleFailure {
  code: RuleCode;
  reason: string;
}

/** Ngưỡng mặc định; nới khi Nam đánh giá các câu bị loại vì luật đó là câu tốt (§5). */
export const DEFAULT_THRESHOLDS = {
  /** A5: đáp án đúng dài hơn ngần này lần lựa chọn dài nhất còn lại là "lộ" bằng độ dài. */
  maxCorrectLengthRatio: 1.5,
  /** A6: Jaccard theo từ từ mức này trở lên coi là trùng. */
  maxJaccard: 0.6,
  /**
   * A5: đáp án ngắn hơn ngần này ký tự (sau chuẩn hoá) thì KHÔNG kiểm "nằm nguyên văn
   * trong câu hỏi". Đáp án "4" hay "None" trùng chữ trong câu là chuyện tình cờ, không
   * phải lộ đáp án — kiểm cả chúng thì luật loại oan câu hỏi về số và hằng.
   */
  minLeakChars: 4,
};

export type Thresholds = typeof DEFAULT_THRESHOLDS;

const ok: RuleResult = { ok: true };
const fail = (reason: string): RuleResult => ({ ok: false, reason });

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const nonEmpty = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;

/**
 * Chuẩn hoá để so trùng: NFC, viết thường, gộp khoảng trắng. GIỮ dấu tiếng Việt —
 * "bỏ dấu" sẽ làm "lặp" và "lập" thành một từ.
 * Nhận cả giá trị thiếu: A1 chỉ kiểm options là mảng object, nên lựa chọn dùng khoá
 * `title` (không có `text`) vẫn đi tới A6 — không được ném TypeError làm chết cả lượt,
 * phải để A3 loại nó kèm lý do.
 */
export function normalizeText(s: string | undefined | null): string {
  return String(s ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tập từ (chữ, số, `_`) của một chuỗi đã chuẩn hoá; ký hiệu như `(`, `.` bị bỏ. */
export function wordSet(s: string): Set<string> {
  return new Set(
    normalizeText(s)
      .split(/[^\p{L}\p{N}_]+/u)
      .filter(Boolean),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Câu hỏi + mọi lựa chọn: đơn vị dùng để so trùng (A6). */
export function mcqText(m: Pick<Mcq, 'question' | 'options'>): string {
  return [m.question, ...m.options.map((o) => o.text)].join('\n');
}

/**
 * sha256 của câu hỏi và các lựa chọn đã chuẩn hoá. Lựa chọn được SẮP XẾP trước khi băm:
 * cùng câu mà đảo thứ tự đáp án vẫn là một câu, không được lọt qua cột UNIQUE.
 */
export function contentHash(m: Pick<Mcq, 'question' | 'options'>): string {
  const opts = m.options.map((o) => normalizeText(o.text)).sort();
  return createHash('sha256')
    .update([normalizeText(m.question), ...opts].join('\n'))
    .digest('hex');
}

// ---------- Từng luật ----------

/**
 * A1: đúng schema mục 2. Chỉ kiểm KIỂU của các trường; nội dung từng lựa chọn để A2–A4
 * nói lý do cụ thể hơn. Trả về câu đã ép kiểu để các luật sau không phải đoán.
 */
export function ruleA1Schema(raw: unknown): RuleResult & { mcq?: Mcq } {
  if (!isRecord(raw)) return fail('không phải object JSON');
  if (typeof raw.question !== 'string') return fail('thiếu question (chuỗi)');
  if (!Array.isArray(raw.options)) return fail('thiếu options (mảng)');
  if (!raw.options.every(isRecord))
    return fail('có lựa chọn không phải object');
  if (typeof raw.correct !== 'number' || !Number.isInteger(raw.correct)) {
    return fail('thiếu correct (số nguyên)');
  }
  if (raw.explanation !== undefined && typeof raw.explanation !== 'string') {
    return fail('explanation không phải chuỗi');
  }
  // Ép kiểu ở đây là cố ý: A1 chỉ chặn sai CẤU TRÚC; text/detail thiếu hay sai kiểu để
  // A3/A4 báo lý do cụ thể (các luật đó và normalizeText chịu được giá trị thiếu).
  const options = raw.options.map((o) => ({
    ...o,
    text: o.text as string,
    detail: o.detail as string,
    correct: o.correct as boolean,
  }));
  return {
    ok: true,
    mcq: {
      question: raw.question,
      options,
      correct: raw.correct,
      explanation: raw.explanation ?? '',
    },
  };
}

/** A2: 3–4 lựa chọn; đúng MỘT `correct: true`; chỉ số `correct` trỏ đúng lựa chọn đó. */
export function ruleA2SingleAnswer(m: Mcq): RuleResult {
  const n = m.options.length;
  if (n < 3 || n > 4) return fail(`${n} lựa chọn, cần 3–4`);
  const flagged = m.options
    .map((o, i) => (o.correct === true ? i : -1))
    .filter((i) => i >= 0);
  if (flagged.length !== 1) {
    return fail(`${flagged.length} lựa chọn mang correct: true, cần đúng 1`);
  }
  if (m.correct !== flagged[0]) {
    return fail(
      `correct = ${m.correct} nhưng lựa chọn đúng ở chỉ số ${flagged[0]}`,
    );
  }
  return ok;
}

/** A3: mọi lựa chọn có `text` không rỗng; không lựa chọn nào dùng khoá `title`. */
export function ruleA3OptionText(m: Mcq): RuleResult {
  for (const [i, o] of m.options.entries()) {
    if ('title' in o) {
      return fail(
        `lựa chọn ${i} dùng khoá title — normalizeQuestion chỉ đọc text/label, FE sẽ hiện nút trắng`,
      );
    }
    if (!nonEmpty(o.text)) return fail(`lựa chọn ${i} thiếu text`);
  }
  const texts = m.options.map((o) => normalizeText(o.text));
  if (new Set(texts).size !== texts.length)
    return fail('hai lựa chọn trùng chữ');
  return ok;
}

/** A4: có `explanation` và mọi lựa chọn có `detail`. */
export function ruleA4Explained(m: Mcq): RuleResult {
  if (!nonEmpty(m.explanation)) return fail('thiếu explanation');
  const missing = m.options.findIndex((o) => !nonEmpty(o.detail));
  if (missing >= 0) return fail(`lựa chọn ${missing} thiếu detail`);
  return ok;
}

/**
 * A5: không lộ đáp án — chữ của đáp án đúng không nằm nguyên văn trong câu hỏi, và đáp án
 * đúng không dài vượt trội (người đoán mò hay chọn câu dài nhất).
 * Cần A2 đạt trước (biết lựa chọn nào đúng); không thì bỏ qua để khỏi báo lỗi kép.
 */
export function ruleA5NoLeak(
  m: Mcq,
  t: Thresholds = DEFAULT_THRESHOLDS,
): RuleResult {
  const right = m.options.find((o) => o.correct === true);
  if (!right || !nonEmpty(right.text)) return ok;
  const answer = normalizeText(right.text);
  if (
    answer.length >= t.minLeakChars &&
    normalizeText(m.question).includes(answer)
  ) {
    return fail('chữ của đáp án đúng nằm nguyên văn trong câu hỏi');
  }
  const others = m.options
    .filter((o) => o !== right)
    .map((o) => o.text?.length ?? 0);
  const longestOther = Math.max(0, ...others);
  if (
    longestOther > 0 &&
    right.text.length > t.maxCorrectLengthRatio * longestOther
  ) {
    return fail(
      `đáp án đúng dài ${right.text.length} ký tự > ${t.maxCorrectLengthRatio} × ${longestOther} (lựa chọn dài nhất còn lại)`,
    );
  }
  return ok;
}

/** Kho để so trùng: các câu đã có trong giáo trình + câu đã nhận trong lượt này/DB. */
export class DedupIndex {
  private readonly hashes = new Set<string>();
  private readonly entries: { label: string; words: Set<string> }[] = [];

  add(
    m: Pick<Mcq, 'question' | 'options'>,
    label: string,
    hash = contentHash(m),
  ): void {
    this.hashes.add(hash);
    this.entries.push({ label, words: wordSet(mcqText(m)) });
  }

  /** Thêm hash đã có trong DB (không có nội dung để tính Jaccard). */
  addHash(hash: string): void {
    this.hashes.add(hash);
  }

  get size(): number {
    return this.entries.length;
  }

  /** A6: không trùng hash, và Jaccard với mọi câu đã có < ngưỡng. */
  check(m: Mcq, t: Thresholds = DEFAULT_THRESHOLDS): RuleResult {
    if (this.hashes.has(contentHash(m)))
      return fail('trùng content_hash với câu đã có');
    const words = wordSet(mcqText(m));
    let best = { score: 0, label: '' };
    for (const e of this.entries) {
      const score = jaccard(words, e.words);
      if (score > best.score) best = { score, label: e.label };
    }
    if (best.score >= t.maxJaccard) {
      return fail(
        `giống ${best.label} (Jaccard ${best.score.toFixed(2)} ≥ ${t.maxJaccard})`,
      );
    }
    return ok;
  }
}

/** A7: có mã module dạng `M<số>` và ít nhất một khái niệm. */
export function ruleA7Tagged(
  moduleCode: string,
  concepts: string[],
): RuleResult {
  if (!/^M\d+$/.test(moduleCode))
    return fail(`module_code "${moduleCode}" không có dạng M<số>`);
  if (!concepts.some(nonEmpty)) return fail('không có khái niệm nào');
  return ok;
}

// ---------- Gộp ----------

export interface FilterContext {
  moduleCode: string;
  concepts: string[];
  dedup: DedupIndex;
  thresholds?: Thresholds;
}

export interface FilterOutcome {
  ok: boolean;
  mcq?: Mcq;
  failures: RuleFailure[];
}

/**
 * Chạy MỌI luật (không dừng ở luật trượt đầu tiên) để báo cáo đếm đúng số câu trượt theo
 * từng mã — chỉ A1 trượt là dừng, vì không có câu để kiểm tiếp.
 * KHÔNG tự thêm câu đạt vào `dedup`: bên gọi quyết định (chạy thử vẫn thêm để câu sau
 * trong cùng lượt không trùng câu trước).
 */
export function runMcqFilters(raw: unknown, ctx: FilterContext): FilterOutcome {
  const t = ctx.thresholds ?? DEFAULT_THRESHOLDS;
  const a1 = ruleA1Schema(raw);
  if (!a1.ok || !a1.mcq) {
    return {
      ok: false,
      failures: [{ code: 'A1', reason: a1.reason ?? 'sai schema' }],
    };
  }
  const m = a1.mcq;
  const checks: [RuleCode, RuleResult][] = [
    ['A2', ruleA2SingleAnswer(m)],
    ['A3', ruleA3OptionText(m)],
    ['A4', ruleA4Explained(m)],
    ['A5', ruleA5NoLeak(m, t)],
    ['A6', ctx.dedup.check(m, t)],
    ['A7', ruleA7Tagged(ctx.moduleCode, ctx.concepts)],
  ];
  const failures = checks
    .filter(([, r]) => !r.ok)
    .map(([code, r]) => ({ code, reason: r.reason ?? '' }));
  return { ok: failures.length === 0, mcq: m, failures };
}

/**
 * Bản sạch để lưu vào `question_bank.payload`: chỉ đúng các khoá của `step_2.mcq`. Mô
 * hình hay thêm khoá lạ (`id`, `hint`…); để nguyên thì payload không còn "cùng định dạng
 * repo đang dùng" như §2 hứa.
 */
export function cleanMcq(m: Mcq): Mcq {
  return {
    question: m.question.trim(),
    options: m.options.map((o) => ({
      text: o.text.trim(),
      detail: o.detail.trim(),
      correct: o.correct === true,
    })),
    correct: m.correct,
    explanation: m.explanation.trim(),
  };
}
