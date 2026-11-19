/**
 * daily-practice.ts — Luồng dữ liệu, kiểm định hợp đồng và máy trạng thái
 * cho màn "Ôn tập hằng ngày: trắc nghiệm và bài code".
 *
 * File thuần (không import alias `@/...`) để `node --test` nạp trực tiếp giống
 * `challenge-run.ts` và `practice-plan.ts`.
 *
 * Mọi phép kiểm tra `correctIndex` và quyết định lộ đáp án/lời giải đều đóng
 * gói tại đây qua `pickDailyQuizOption()`, `visibleCorrectIndex()`,
 * `visibleExplanation()` để UI không bao giờ đọc thẳng đáp án ở lần sai đầu.
 */

import mockData from './mock/practice-daily.json' with { type: 'json' };

export type DailyQuizItem = {
  id: string;
  type: 'quiz';
  lesson_id: number;
  lesson_title: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type DailyCodeTestCase = {
  name: string;
  call: string;
  expected: string;
};

export type DailyCodeItem = {
  id: string;
  type: 'code';
  lesson_id: number;
  lesson_title: string;
  title: string;
  description: string;
  starterCode: string;
  tests: DailyCodeTestCase[];
  solution?: string;
  hints?: { title: string; body: string }[];
};

export type DailyPracticeItem = DailyQuizItem | DailyCodeItem;

export type DailyPracticeSession = {
  session_id: string;
  course_id: string;
  title: string;
  total_items: number;
  items: DailyPracticeItem[];
};

/**
 * Cờ cấu hình: mặc định dùng dữ liệu giả (`true`).
 * Khi backend sẵn sàng, đặt `NEXT_PUBLIC_DAILY_PRACTICE_MOCK=false`.
 */
export const USE_DAILY_PRACTICE_MOCK =
  process.env.NEXT_PUBLIC_DAILY_PRACTICE_MOCK !== 'false';

export const DEFAULT_CODE_OUTPUT =
  '$ python3 solution.py\nNhập mã của bạn rồi bấm "Chạy thử" hoặc "Nộp để kiểm" (giới hạn 5 giây).';

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Kiểm định cấu trúc phiên ôn tập hằng ngày (dùng chung cho mock JSON lẫn
 * response từ API thật khi tắt cờ mock). Trả về mảng lỗi rỗng nếu hợp lệ.
 */
export function validateDailyPracticeSession(raw: unknown): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return ['Phiên ôn tập phải là một object JSON.'];
  }

  const s = raw as Record<string, unknown>;
  if (!isNonEmptyString(s.session_id)) errors.push('Thiếu `session_id` hợp lệ.');
  if (!isNonEmptyString(s.course_id)) errors.push('Thiếu `course_id` hợp lệ.');
  if (!isNonEmptyString(s.title)) errors.push('Thiếu `title` hợp lệ.');

  if (!Array.isArray(s.items) || s.items.length < 2) {
    errors.push('`items` phải là mảng có ít nhất 2 câu.');
    return errors;
  }

  const seenIds = new Set<string>();
  let hasQuiz = false;
  let hasCode = false;

  s.items.forEach((entry, idx) => {
    const prefix = `items[${idx}]`;
    if (!entry || typeof entry !== 'object') {
      errors.push(`${prefix} phải là object.`);
      return;
    }

    const item = entry as Record<string, unknown>;
    if (!isNonEmptyString(item.id)) {
      errors.push(`${prefix}: thiếu id.`);
    } else if (seenIds.has(item.id)) {
      errors.push(`${prefix}: trùng id "${item.id}".`);
    } else {
      seenIds.add(item.id);
    }

    if (item.type === 'quiz') {
      hasQuiz = true;
      if (!isNonEmptyString(item.question)) {
        errors.push(`${prefix}: câu hỏi trắc nghiệm rỗng.`);
      }
      if (
        !Array.isArray(item.options) ||
        item.options.length < 2 ||
        item.options.some((opt) => !isNonEmptyString(opt))
      ) {
        errors.push(`${prefix}: cần ít nhất 2 phương án hợp lệ.`);
      } else if (
        typeof item.correctIndex !== 'number' ||
        !Number.isInteger(item.correctIndex) ||
        item.correctIndex < 0 ||
        item.correctIndex >= item.options.length
      ) {
        errors.push(`${prefix}: correctIndex ngoài phạm vi [0, ${item.options.length - 1}].`);
      }
      if (!isNonEmptyString(item.explanation)) {
        errors.push(`${prefix}: thiếu lời giải thích (explanation).`);
      }
    } else if (item.type === 'code') {
      hasCode = true;
      if (!isNonEmptyString(item.title)) errors.push(`${prefix}: thiếu title bài code.`);
      if (!isNonEmptyString(item.description)) errors.push(`${prefix}: thiếu description bài code.`);
      if (!isNonEmptyString(item.starterCode)) errors.push(`${prefix}: thiếu starterCode.`);
      if (!Array.isArray(item.tests) || item.tests.length < 1) {
        errors.push(`${prefix}: cần ít nhất 1 test case.`);
      } else {
        item.tests.forEach((tc, tIdx) => {
          if (!tc || typeof tc !== 'object') {
            errors.push(`${prefix}.tests[${tIdx}]: phải là object.`);
            return;
          }
          const t = tc as Record<string, unknown>;
          if (!isNonEmptyString(t.name)) errors.push(`${prefix}.tests[${tIdx}]: thiếu name.`);
          if (!isNonEmptyString(t.call)) errors.push(`${prefix}.tests[${tIdx}]: thiếu call.`);
          if (!isNonEmptyString(t.expected)) {
            errors.push(`${prefix}.tests[${tIdx}]: thiếu expected.`);
          }
        });
      }
    } else {
      errors.push(`${prefix}: type không hợp lệ ("${String(item.type)}").`);
    }
  });

  if (!hasQuiz) errors.push('Phiên ôn tập phải có ít nhất 1 câu trắc nghiệm (`quiz`).');
  if (!hasCode) errors.push('Phiên ôn tập phải có ít nhất 1 bài tập code (`code`).');

  return errors;
}

export function parseDailyPracticeSession(raw: unknown): DailyPracticeSession | null {
  return validateDailyPracticeSession(raw).length === 0
    ? (raw as DailyPracticeSession)
    : null;
}

/* ───────────────────── máy trạng thái từng câu ─────────────────────── */

export type DailyQuizState = 'empty' | 'rethinking' | 'ok' | 'again' | 'bad';

export type DailyQuizCell = {
  id: string;
  type: 'quiz';
  item: DailyQuizItem;
  firstPick: number | null;
  rethinkPick: number | null;
  state: DailyQuizState;
};

export type DailyCodeTestResult = {
  name: string;
  passed: boolean;
  detail: string;
};

export type DailyCodeCell = {
  id: string;
  type: 'code';
  item: DailyCodeItem;
  code: string;
  output: string;
  testResults: DailyCodeTestResult[];
  passed: boolean;
  attempts: number;
};

export type DailyRunCell = DailyQuizCell | DailyCodeCell;

export type DailyRunSummary = {
  totalItems: number;
  quizTotal: number;
  codeTotal: number;
  quizFirstTry: number;
  quizSecondTry: number;
  quizWrong: number;
  codePassed: number;
  answeredCount: number;
  xpEarned: number;
  allDone: boolean;
};

export function createDailyRun(session: DailyPracticeSession): DailyRunCell[] {
  return session.items.map((item) => {
    if (item.type === 'quiz') {
      return {
        id: item.id,
        type: 'quiz',
        item,
        firstPick: null,
        rethinkPick: null,
        state: 'empty',
      };
    }
    return {
      id: item.id,
      type: 'code',
      item,
      code: item.starterCode,
      output: DEFAULT_CODE_OUTPUT,
      testResults: [],
      passed: false,
      attempts: 0,
    };
  });
}

export function isDailyQuizResolved(cell: DailyQuizCell): boolean {
  return cell.state === 'ok' || cell.state === 'again' || cell.state === 'bad';
}

function isQuizCell(target: DailyQuizCell | DailyQuizItem): target is DailyQuizCell {
  return 'item' in target && 'state' in target;
}

/**
 * Đáp án ĐƯỢC PHÉP hiển thị: chỉ khi câu trắc nghiệm đã kết thúc
 * (`ok`, `again`, `bad`). Ở trạng thái `empty` hoặc `rethinking` luôn trả `null`.
 */
export function visibleCorrectIndex(cell: DailyQuizCell): number | null;
export function visibleCorrectIndex(item: DailyQuizItem, resolved: boolean): number | null;
export function visibleCorrectIndex(
  target: DailyQuizCell | DailyQuizItem,
  resolved = false,
): number | null {
  if (isQuizCell(target)) {
    return isDailyQuizResolved(target) ? target.item.correctIndex : null;
  }
  return resolved ? target.correctIndex : null;
}

/**
 * Lời giải thích ĐƯỢC PHÉP hiển thị: chỉ khi câu trắc nghiệm đã kết thúc.
 */
export function visibleExplanation(cell: DailyQuizCell): string | null;
export function visibleExplanation(item: DailyQuizItem, resolved: boolean): string | null;
export function visibleExplanation(
  target: DailyQuizCell | DailyQuizItem,
  resolved = false,
): string | null {
  if (isQuizCell(target)) {
    return isDailyQuizResolved(target) ? target.item.explanation : null;
  }
  return resolved ? target.explanation : null;
}

/**
 * Chốt một phương án cho câu trắc nghiệm:
 *  - Sai lần 1 → `rethinking` (giữ kín đáp án, khoá phương án vừa chọn sai).
 *  - Đúng lần 1 → `ok` (+15 XP).
 *  - Đúng lần 2 → `again` (+10 XP).
 *  - Sai lần 2 → `bad` (mở đáp án & giải thích).
 */
export function pickDailyQuizOption(
  cell: DailyQuizCell,
  optIdx: number,
): { cell: DailyQuizCell; xpDelta: number } {
  if (
    isDailyQuizResolved(cell) ||
    !Number.isInteger(optIdx) ||
    optIdx < 0 ||
    optIdx >= cell.item.options.length
  ) {
    return { cell, xpDelta: 0 };
  }

  if (cell.state === 'empty') {
    const isCorrect = optIdx === cell.item.correctIndex;
    return {
      cell: {
        ...cell,
        firstPick: optIdx,
        state: isCorrect ? 'ok' : 'rethinking',
      },
      xpDelta: isCorrect ? 15 : 0,
    };
  }

  if (optIdx === cell.firstPick) {
    return { cell, xpDelta: 0 };
  }

  const isCorrect = optIdx === cell.item.correctIndex;
  return {
    cell: {
      ...cell,
      rethinkPick: optIdx,
      state: isCorrect ? 'again' : 'bad',
    },
    xpDelta: isCorrect ? 10 : 0,
  };
}

/**
 * Ghi nhận một lượt chạy code (Chạy thử hoặc Nộp để kiểm) cho bài code.
 * Chỉ cộng +25 XP một lần duy nhất khi bài đạt toàn bộ test case lần đầu.
 */
export function recordDailyCodeRun(
  cell: DailyCodeCell,
  params: {
    code: string;
    output: string;
    testResults?: DailyCodeTestResult[];
    graded: boolean;
  },
): { cell: DailyCodeCell; xpDelta: number } {
  if (!params.graded) {
    return {
      cell: {
        ...cell,
        code: params.code,
        output: params.output,
      },
      xpDelta: 0,
    };
  }

  const results = params.testResults ?? [];
  const allPassed = results.length > 0 && results.every((t) => t.passed);
  const xpDelta = !cell.passed && allPassed ? 25 : 0;

  return {
    cell: {
      ...cell,
      code: params.code,
      output: params.output,
      testResults: results,
      passed: cell.passed || allPassed,
      attempts: cell.attempts + 1,
    },
    xpDelta,
  };
}

export function summarizeDailyRun(cells: ReadonlyArray<DailyRunCell>): DailyRunSummary {
  let quizTotal = 0;
  let codeTotal = 0;
  let quizFirstTry = 0;
  let quizSecondTry = 0;
  let quizWrong = 0;
  let codePassed = 0;
  let answeredCount = 0;

  for (const cell of cells) {
    if (cell.type === 'quiz') {
      quizTotal += 1;
      if (cell.state === 'ok') {
        quizFirstTry += 1;
        answeredCount += 1;
      } else if (cell.state === 'again') {
        quizSecondTry += 1;
        answeredCount += 1;
      } else if (cell.state === 'bad') {
        quizWrong += 1;
        answeredCount += 1;
      }
    } else {
      codeTotal += 1;
      if (cell.passed) {
        codePassed += 1;
        answeredCount += 1;
      }
    }
  }

  const xpEarned = quizFirstTry * 15 + quizSecondTry * 10 + codePassed * 25;
  return {
    totalItems: cells.length,
    quizTotal,
    codeTotal,
    quizFirstTry,
    quizSecondTry,
    quizWrong,
    codePassed,
    answeredCount,
    xpEarned,
    allDone: cells.length > 0 && answeredCount === cells.length,
  };
}

/**
 * Nạp phiên ôn tập hằng ngày:
 * Khi cờ mock bật trả dữ liệu giả ngay; khi cờ tắt gọi API backend qua `fetcher`
 * và kiểm định bằng `parseDailyPracticeSession()` trước khi dùng.
 */
export async function fetchDailyPracticeSession(opts?: {
  useMock?: boolean;
  fetcher?: (path: string, init?: RequestInit) => Promise<Response>;
}): Promise<{ session: DailyPracticeSession; source: 'mock' | 'api' }> {
  const shouldUseMock = opts?.useMock ?? USE_DAILY_PRACTICE_MOCK;
  if (shouldUseMock) {
    return { session: mockData as DailyPracticeSession, source: 'mock' };
  }

  const doFetch = opts?.fetcher ?? fetch;
  try {
    const res = await doFetch('/api/quiz/generate-review', { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as unknown;
      const valid = parseDailyPracticeSession(data);
      if (valid) {
        return { session: valid, source: 'api' };
      }
    }
  } catch {
    /* Fallback sang dữ liệu giả nếu backend chưa sẵn sàng */
  }

  return { session: mockData as DailyPracticeSession, source: 'mock' };
}
