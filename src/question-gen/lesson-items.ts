/**
 * Đổi một bài của giáo trình (gói pe-da, `scripts/pe-da/out/lessons.json`) thành các câu
 * cho `question_bank`: trắc nghiệm từ `step_2.mcq`, bài code từ `step_4`.
 *
 * Phần THUẦN của `scripts/gen-questions/import-lesson-items.ts` (không DB, không Pyodide) để
 * Jest kiểm được. Bài code đổi xong CHƯA chắc chạy đúng: phải qua
 * `scripts/gen-questions/check-lesson-items.mjs` (Pyodide của trình duyệt) mới được nhập.
 *
 * Vì sao phải đổi ca chấm: màn ôn hằng ngày của FE (`DailyCodeTestCase`) chỉ nhận ca dạng
 * BIỂU THỨC `{name, call, expected}`, còn pe-da viết ca dạng DỮ LIỆU `{name, input, expected}`
 * kèm `contract`. Hai dạng không tương đương: ca dữ liệu được bộ chấm chuẩn hoá (tuple và
 * ndarray hạ về list, số so bằng isclose), còn ca `call` so bằng `==` trần. Vì vậy mọi bài
 * code đều phải chạy thử sau khi đổi, và bài nào lệch thì bị loại chứ không sửa tay.
 */
import { createHash } from 'crypto';
import {
  cleanMcq,
  contentHash,
  normalizeText,
  ruleA1Schema,
  ruleA2SingleAnswer,
  ruleA3OptionText,
  ruleA4Explained,
  type Mcq,
} from './mcq-filters';
import { moduleCodeOf } from './lesson-chunks';

/**
 * Gói mà worker của trình duyệt nạp được (PACKAGES trong
 * frontend/public/static/js/studio-lesson.worker.js). Worker tự dò `import` trong code để
 * nạp, nên bài pandas/numpy chạy được ở màn ôn dù màn đó gửi `packages: []`.
 */
export const RUNNABLE_PACKAGES = new Set([
  'numpy',
  'pandas',
  'matplotlib',
  'tzdata',
]);

export interface CodeTest {
  name: string;
  call: string;
  expected: string;
}

/** `question_bank.payload` của một bài code. `solutionCode` KHÔNG bao giờ gửi FE trước khi nộp. */
export interface CodePayload {
  title: string;
  description: string;
  starterCode: string;
  solutionCode: string;
  tests: CodeTest[];
  hints: { title: string; body: string }[];
  packages: string[];
}

export interface LessonItem {
  type: 'mcq' | 'code';
  lesson_code: string;
  sort_order: number;
  module_code: string;
  payload: Mcq | CodePayload;
  content_hash: string;
}

export interface SkippedItem {
  lesson_code: string;
  type: 'mcq' | 'code';
  index?: number;
  reason: string;
}

type Rec = Record<string, unknown>;
const isRecord = (v: unknown): v is Rec =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Giá trị JSON → literal Python mà `eval()` dựng lại được đúng giá trị đó.
 * Chuỗi dùng `JSON.stringify`: mọi lối thoát JSON (`\"`, `\\`, `\n`, `\uXXXX`) cũng là lối
 * thoát hợp lệ trong chuỗi Python. Số nguyên và số thực JSON không phân biệt (6.0 đọc ra 6),
 * nhưng Python coi `6 == 6.0` nên không lệch kết quả so sánh.
 */
export function toPyLiteral(v: unknown): string {
  if (v === null) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`số không hữu hạn: ${v}`);
    return String(v);
  }
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(toPyLiteral).join(', ')}]`;
  if (isRecord(v)) {
    const parts = Object.entries(v).map(
      ([k, x]) => `${JSON.stringify(k)}: ${toPyLiteral(x)}`,
    );
    return `{${parts.join(', ')}}`;
  }
  throw new Error(`không đổi được kiểu ${typeof v} sang Python`);
}

/** sha256 của đề + khung + ca chấm. Tiền tố `code` để không bao giờ trùng băm của trắc nghiệm. */
export function codeContentHash(
  p: Pick<CodePayload, 'description' | 'starterCode' | 'tests'>,
): string {
  return createHash('sha256')
    .update(
      [
        'code',
        normalizeText(p.description),
        p.starterCode.trim(),
        ...p.tests.map((t) => `${t.call} == ${t.expected}`),
      ].join('\n'),
    )
    .digest('hex');
}

function mcqItems(
  step2: unknown,
): { mcq?: Mcq; index: number; reason?: string }[] {
  const list = isRecord(step2) && Array.isArray(step2.mcq) ? step2.mcq : [];
  return list.map((raw: unknown, index) => {
    // Giáo trình đánh dấu đáp án bằng cờ `correct: true` trên lựa chọn; A1 lại đòi chỉ số
    // `correct` ở cấp câu, nên suy chỉ số từ cờ (A2 kiểm lại là đúng MỘT cờ).
    const options: unknown[] =
      isRecord(raw) && Array.isArray(raw.options) ? raw.options : [];
    const correct = options.findIndex((o) => isRecord(o) && o.correct === true);
    const a1 = ruleA1Schema(isRecord(raw) ? { ...raw, correct } : raw);
    if (!a1.ok || !a1.mcq) return { index, reason: `A1: ${a1.reason}` };
    // A5 (đáp án dài vượt trội) KHÔNG áp ở đây: 71% câu của giáo trình trượt nó (AGENTS.md),
    // và đây là câu người soạn đã duyệt, không phải câu máy sinh.
    for (const [code, rule] of [
      ['A2', ruleA2SingleAnswer],
      ['A3', ruleA3OptionText],
      ['A4', ruleA4Explained],
    ] as const) {
      const r = rule(a1.mcq);
      if (!r.ok) return { index, reason: `${code}: ${r.reason}` };
    }
    return { index, mcq: cleanMcq(a1.mcq) };
  });
}

/** Lý do bài code KHÔNG đổi được, hoặc null nếu đổi được. */
function codeBlocker(step4: Rec): string | null {
  const tests = Array.isArray(step4.tests) ? step4.tests : [];
  if (tests.length === 0) return 'không có ca chấm';
  if (!str(step4.solutionCode).trim()) return 'không có lời giải mẫu';
  if (!str(step4.starterCode).trim()) return 'không có code khởi tạo';
  const contract = isRecord(step4.contract) ? step4.contract : {};
  if (contract.mode === 'script') {
    return 'hợp đồng script (tiêm biến đầu vào) không viết được thành một biểu thức call';
  }
  if (contract.returnType) {
    return `ghim kiểu trả về ${JSON.stringify(contract.returnType)}: ca call so bằng == nên không kiểm được kiểu`;
  }
  if (Array.isArray(step4.dataFiles) && step4.dataFiles.length > 0) {
    return 'cần file dữ liệu, màn ôn không gửi file';
  }
  const packages = Array.isArray(step4.packages) ? step4.packages : [];
  const missing = packages.filter((p) => !RUNNABLE_PACKAGES.has(String(p)));
  if (missing.length > 0)
    return `cần gói trình duyệt không nạp được: ${missing.join(', ')}`;
  const usesCall = tests.every((t) => isRecord(t) && 'call' in t);
  if (!usesCall && !/^def solve\s*\(/m.test(str(step4.solutionCode))) {
    return 'lời giải không định nghĩa solve(data)';
  }
  return null;
}

function toCodeTest(raw: unknown): CodeTest {
  if (!isRecord(raw)) throw new Error('ca chấm không phải object');
  const name = str(raw.name) || 'Kiểm tra';
  // Ca đã ở dạng biểu thức (kiểu pe-v4) thì giữ nguyên.
  if (typeof raw.call === 'string' && typeof raw.expect === 'string') {
    return { name, call: raw.call, expected: raw.expect };
  }
  if (!('input' in raw) || !('expected' in raw)) {
    throw new Error(`ca "${name}" thiếu input/expected`);
  }
  return {
    name,
    call: `solve(${toPyLiteral(raw.input)})`,
    expected: toPyLiteral(raw.expected),
  };
}

function describeTask(title: string, task: Rec): string {
  const io = Array.isArray(task.io) ? task.io.filter(isRecord) : [];
  const lines = io.map((x) => `${str(x.label)} ${str(x.value)}`.trim());
  return (
    [str(task.body).trim(), lines.length ? lines.join('\n') : '']
      .filter(Boolean)
      .join('\n\n')
      .trim() || title
  );
}

function codeItem(
  lesson: Rec,
  step4: Rec,
): { payload?: CodePayload; reason?: string } {
  const blocker = codeBlocker(step4);
  if (blocker) return { reason: blocker };
  let tests: CodeTest[];
  try {
    tests = (step4.tests as unknown[]).map(toCodeTest);
  } catch (e) {
    return { reason: (e as Error).message };
  }
  const task = isRecord(step4.task) ? step4.task : {};
  const title = str(lesson.title).trim() || str(task.title).trim();
  const hints = (Array.isArray(step4.hints) ? step4.hints : [])
    .filter(isRecord)
    .map((h) => ({ title: str(h.title), body: str(h.body) }))
    .filter((h) => h.body.trim());
  return {
    payload: {
      title,
      description: describeTask(title, task),
      starterCode: str(step4.starterCode),
      solutionCode: str(step4.solutionCode),
      tests,
      hints,
      packages: (Array.isArray(step4.packages) ? step4.packages : []).map(
        String,
      ),
    },
  };
}

/** Mọi câu đổi được từ một bài, kèm lý do của từng câu bị bỏ. */
export function lessonItems(lesson: unknown): {
  items: LessonItem[];
  skipped: SkippedItem[];
} {
  const items: LessonItem[] = [];
  const skipped: SkippedItem[] = [];
  if (!isRecord(lesson)) return { items, skipped };
  const lesson_code = str(lesson.lesson_code);
  const sort_order = Number(lesson.sort_order);
  const module_code = moduleCodeOf(str(lesson.module));
  const content = isRecord(lesson.content_json) ? lesson.content_json : {};
  const base = { lesson_code, sort_order, module_code };

  for (const r of mcqItems(content.step_2)) {
    if (r.mcq) {
      items.push({
        ...base,
        type: 'mcq',
        payload: r.mcq,
        content_hash: contentHash(r.mcq),
      });
    } else {
      skipped.push({
        lesson_code,
        type: 'mcq',
        index: r.index,
        reason: r.reason ?? '',
      });
    }
  }

  if (isRecord(content.step_4)) {
    const r = codeItem(lesson, content.step_4);
    if (r.payload) {
      items.push({
        ...base,
        type: 'code',
        payload: r.payload,
        content_hash: codeContentHash(r.payload),
      });
    } else if (Array.isArray(content.step_4.tests)) {
      // Bài không có ca chấm nào (bài quy trình, Tkinter…) không phải "bị bỏ": nó chưa bao
      // giờ là bài code. Chỉ ghi lý do cho bài CÓ ca mà không đổi được.
      skipped.push({ lesson_code, type: 'code', reason: r.reason ?? '' });
    }
  }
  return { items, skipped };
}
