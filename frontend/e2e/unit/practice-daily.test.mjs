/**
 * Unit test cho Ôn tập hằng ngày:
 *  1. Kiểm định hợp đồng schema `practice-daily.json` (dùng chung cho API thật).
 *  2. Mô phỏng 1 lượt ôn hoàn chỉnh từ câu 1 → Tổng kết (sai lần 1 không lộ
 *     đáp án, khoá phương án sai, nghĩ lại lần 2 mới lộ, code chạy/đạt/tổng kết).
 *  3. Thực thi thật `solution` của các bài code trong `practice-daily.json`
 *     bằng Python để chắc chắn toàn bộ test case khớp `studio-harness.py`.
 *  4. Kiểm tra cờ chuyển đổi mock ↔ API trong `fetchDailyPracticeSession()`.
 *  5. Cổng chặn tĩnh trên `DailyPracticeView.tsx` & `daily-practice.module.css`:
 *     cấm đọc thẳng `.correctIndex` / `.explanation`, bắt buộc dùng `useCodeRunner`
 *     có `cancel()`, không hex cứng, không ẩn thanh cuộn.
 *
 * Chạy bằng: node --test e2e/unit/practice-daily.test.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createDailyRun,
  fetchDailyPracticeSession,
  isDailyQuizResolved,
  parseDailyPracticeSession,
  pickDailyQuizOption,
  recordDailyCodeRun,
  summarizeDailyRun,
  validateDailyPracticeSession,
  visibleCorrectIndex,
  visibleExplanation,
} from '../../src/lib/daily-practice.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');

const mockRaw = readFileSync(
  join(FE, 'src', 'lib', 'mock', 'practice-daily.json'),
  'utf8',
);
const mockData = JSON.parse(mockRaw);

const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/[ \t]+\/\/.*$/gm, '');

test('validateDailyPracticeSession & parseDailyPracticeSession: hợp đồng mock JSON và từ chối payload lỗi', () => {
  assert.deepEqual(validateDailyPracticeSession(mockData), []);
  const parsed = parseDailyPracticeSession(mockData);
  assert.ok(parsed);
  assert.equal(parsed.items.length, 4);

  const types = new Set(parsed.items.map((i) => i.type));
  assert.ok(types.has('quiz'), 'Phiên ôn tập phải có câu trắc nghiệm');
  assert.ok(types.has('code'), 'Phiên ôn tập phải có bài code');

  // Từ chối payload thiếu bài code hoặc sai correctIndex
  const badOnlyQuiz = {
    ...mockData,
    items: mockData.items.filter((i) => i.type === 'quiz'),
  };
  assert.ok(validateDailyPracticeSession(badOnlyQuiz).length > 0);
  assert.equal(parseDailyPracticeSession(badOnlyQuiz), null);

  const badRange = {
    ...mockData,
    items: mockData.items.map((i) =>
      i.type === 'quiz' ? { ...i, correctIndex: 99 } : i,
    ),
  };
  assert.ok(validateDailyPracticeSession(badRange).length > 0);
});

test('mô phỏng đủ 1 lượt ôn từ câu 1 đến tổng kết & bảo mật đáp án khi sai lần đầu', () => {
  const cells = createDailyRun(mockData);
  assert.equal(cells.length, 4);

  // Câu 1 (quiz q1, correctIndex = 0): chọn sai lần 1 (index = 1)
  assert.equal(visibleCorrectIndex(cells[0]), null);
  assert.equal(visibleExplanation(cells[0]), null);

  const step1Wrong = pickDailyQuizOption(cells[0], 1);
  cells[0] = step1Wrong.cell;
  assert.equal(cells[0].state, 'rethinking');
  assert.equal(step1Wrong.xpDelta, 0);
  assert.equal(isDailyQuizResolved(cells[0]), false);
  // Bảo mật: ở trạng thái rethinking TUYỆT ĐỐI chưa lộ đáp án & giải thích
  assert.equal(visibleCorrectIndex(cells[0]), null);
  assert.equal(visibleExplanation(cells[0]), null);
  // Tương thích cả chữ ký 2 tham số cũ
  assert.equal(visibleCorrectIndex(mockData.items[0], false), null);
  assert.equal(visibleExplanation(mockData.items[0], false), null);

  // Chọn lại chính phương án đã khoá ở lần 1 -> không đổi
  const rePickLocked = pickDailyQuizOption(cells[0], 1);
  assert.equal(rePickLocked.cell, cells[0]);
  assert.equal(rePickLocked.xpDelta, 0);

  // Nghĩ lại chọn đúng ở lần 2 (index = 0)
  const step1RetryOk = pickDailyQuizOption(cells[0], 0);
  cells[0] = step1RetryOk.cell;
  assert.equal(cells[0].state, 'again');
  assert.equal(step1RetryOk.xpDelta, 10);
  assert.equal(isDailyQuizResolved(cells[0]), true);
  assert.equal(visibleCorrectIndex(cells[0]), 0);
  assert.equal(visibleExplanation(cells[0]), mockData.items[0].explanation);

  // Câu 2 (code c1): chạy sai 1 ca -> chưa đạt, sau đó chạy đúng hết -> +25 XP
  const code1Fail = recordDailyCodeRun(cells[1], {
    code: 'def filter_even(numbers): return []',
    output: 'out',
    testResults: [
      { name: 't1', passed: false, detail: 'Mong đợi [2, 4, 6] nhưng nhận []' },
    ],
    graded: true,
  });
  cells[1] = code1Fail.cell;
  assert.equal(cells[1].passed, false);
  assert.equal(cells[1].attempts, 1);
  assert.equal(code1Fail.xpDelta, 0);

  const code1Pass = recordDailyCodeRun(cells[1], {
    code: mockData.items[1].solution,
    output: '✓ Đã chạy xong',
    testResults: mockData.items[1].tests.map((t) => ({
      name: t.name,
      passed: true,
      detail: `Đạt: ${t.expected}`,
    })),
    graded: true,
  });
  cells[1] = code1Pass.cell;
  assert.equal(cells[1].passed, true);
  assert.equal(cells[1].attempts, 2);
  assert.equal(code1Pass.xpDelta, 25);

  // Nộp lại bài đã đạt -> không cộng trùng XP
  const code1RePass = recordDailyCodeRun(cells[1], {
    code: cells[1].code,
    output: 'ok',
    testResults: cells[1].testResults,
    graded: true,
  });
  assert.equal(code1RePass.xpDelta, 0);

  // Câu 3 (quiz q2, correctIndex = 1): đúng ngay lần đầu -> +15 XP
  const step3Ok = pickDailyQuizOption(cells[2], 1);
  cells[2] = step3Ok.cell;
  assert.equal(cells[2].state, 'ok');
  assert.equal(step3Ok.xpDelta, 15);
  assert.equal(visibleCorrectIndex(cells[2]), 1);

  // Kiểm thêm nhánh sai cả 2 lần ('bad')
  let wrongQuiz = createDailyRun(mockData)[2];
  wrongQuiz = pickDailyQuizOption(wrongQuiz, 0).cell;
  assert.equal(wrongQuiz.state, 'rethinking');
  assert.equal(visibleCorrectIndex(wrongQuiz), null);
  wrongQuiz = pickDailyQuizOption(wrongQuiz, 2).cell;
  assert.equal(wrongQuiz.state, 'bad');
  assert.equal(visibleCorrectIndex(wrongQuiz), 1);

  // Câu 4 (code c2): vượt qua tất cả test -> +25 XP
  const code2Pass = recordDailyCodeRun(cells[3], {
    code: mockData.items[3].solution,
    output: '✓ Đã chạy xong',
    testResults: mockData.items[3].tests.map((t) => ({
      name: t.name,
      passed: true,
      detail: `Đạt: ${t.expected}`,
    })),
    graded: true,
  });
  cells[3] = code2Pass.cell;
  assert.equal(code2Pass.xpDelta, 25);

  // Tổng kết lượt
  const sum = summarizeDailyRun(cells);
  assert.deepEqual(sum, {
    totalItems: 4,
    quizTotal: 2,
    codeTotal: 2,
    quizFirstTry: 1,
    quizSecondTry: 1,
    quizWrong: 0,
    codePassed: 2,
    answeredCount: 4,
    xpEarned: 75,
    allDone: true,
  });
});

test('lời giải mẫu (solution) của bài code trong practice-daily.json vượt qua mọi test case khi chạy Python', () => {
  const codeItems = mockData.items.filter((i) => i.type === 'code');
  const script = [
    'import json, sys',
    'items = json.loads(sys.argv[1])',
    'for it in items:',
    '    ns = {}',
    '    exec(it["solution"], ns)',
    '    for tc in it["tests"]:',
    '        actual = eval(tc["call"], ns)',
    '        expected = eval(tc["expected"], ns)',
    '        assert actual == expected, f"{it[\'id\']} {tc[\'name\']}: {actual!r} != {expected!r}"',
    'print("ALL_DAILY_CODE_PASS")',
  ].join('\n');

  const out = execFileSync('python3', ['-c', script, JSON.stringify(codeItems)], {
    encoding: 'utf8',
  });
  assert.match(out, /ALL_DAILY_CODE_PASS/);
});

test('fetchDailyPracticeSession chuyển đổi giữa mock và API thật không cần sửa UI', async () => {
  let called = 0;
  const mockResult = await fetchDailyPracticeSession({
    useMock: true,
    fetcher: async () => {
      called += 1;
      throw new Error('Không được gọi mạng khi useMock=true');
    },
  });
  assert.equal(called, 0);
  assert.equal(mockResult.source, 'mock');
  assert.equal(mockResult.session.items.length, 4);

  const apiPayload = {
    ...mockData,
    session_id: 'api_session_999',
  };
  const apiResult = await fetchDailyPracticeSession({
    useMock: false,
    fetcher: async () =>
      new Response(JSON.stringify(apiPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  });
  assert.equal(apiResult.source, 'api');
  assert.equal(apiResult.session.session_id, 'api_session_999');

  // Response rác khi API trả lỗi phải rơi về mock an toàn, không ném
  const fallbackResult = await fetchDailyPracticeSession({
    useMock: false,
    fetcher: async () =>
      new Response(JSON.stringify({ items: [{ type: 'quiz' }] }), { status: 200 }),
  });
  assert.equal(fallbackResult.source, 'mock');
  assert.equal(fallbackResult.session.session_id, mockData.session_id);
});

test('NỐI DÂY & BẢO MẬT UI: DailyPracticeView chỉ đọc đáp án qua visible*, dùng useCodeRunner và CSS sạch token', () => {
  const viewSrc = stripComments(
    readFileSync(join(FE, 'src', 'components', 'practice', 'DailyPracticeView.tsx'), 'utf8'),
  );
  const bareCorrect = viewSrc.match(/(?<!visible)[Cc]orrectIndex/g) ?? [];
  assert.deepEqual(
    bareCorrect,
    [],
    'DailyPracticeView không được đọc thẳng correctIndex — phải đi qua visibleCorrectIndex()',
  );
  assert.equal(
    /\.explanation\b/.test(viewSrc.replace(/visibleExplanation/g, '')),
    false,
    'DailyPracticeView không được đọc thẳng .explanation — phải đi qua visibleExplanation()',
  );
  assert.match(viewSrc, /visibleCorrectIndex\(/);
  assert.match(viewSrc, /visibleExplanation\(/);
  assert.match(viewSrc, /useCodeRunner\(/);
  assert.match(viewSrc, /runner\.cancel\(/);

  const wsSrc = stripComments(
    readFileSync(join(FE, 'src', 'components', 'goc-hoc', 'LofiWorkspace.tsx'), 'utf8'),
  );
  assert.match(wsSrc, /<DailyPracticeView\b/);

  const cssSrc = readFileSync(
    join(FE, 'src', 'components', 'practice', 'daily-practice.module.css'),
    'utf8',
  );
  assert.equal(/#[0-9a-fA-F]{3,8}/.test(cssSrc), false, 'daily-practice.module.css không được chứa mã hex cứng');
  assert.equal(/scrollbar-width\s*:\s*none/.test(cssSrc), false, 'Không được ẩn thanh cuộn');
  assert.equal(
    /::-webkit-scrollbar\s*\{[^}]*display\s*:\s*none/.test(cssSrc),
    false,
    'Không được ẩn thanh cuộn webkit',
  );
});
