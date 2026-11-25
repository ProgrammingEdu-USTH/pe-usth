/**
 * Kiểm chứng bài code của out/lesson-items.json (do import-lesson-items.ts ghi) bằng CHÍNH
 * Pyodide và CHÍNH bộ chấm của trình duyệt: frontend/public/pyodide/v314.0.7/ (đúng thư mục
 * studio-lesson.worker.js nạp) và frontend/public/static/js/studio-harness.py. Không cần npm.
 *
 * Vì sao phải chạy thật: ca chấm đã được đổi từ dạng dữ liệu (`input`/`expected`, bộ chấm
 * chuẩn hoá tuple/ndarray về list) sang dạng biểu thức `call` (so bằng `==` trần) — lời giải
 * trả tuple mà ca mong list là trượt, dù ở bài học gốc nó đạt.
 *
 * Luật cho mỗi bài (như scripts/pe-da/check-pyodide.mjs):
 *   1. lời giải mẫu đạt MỌI ca, trong 5 giây;
 *   2. code khởi tạo trượt ít nhất một ca (không thì ôn tập "đạt" mà không viết gì).
 * Gói (numpy, pandas…) tải và import sẵn TRƯỚC khi đo, như worker.
 *
 *   node scripts/gen-questions/check-lesson-items.mjs [--verbose]
 * Ghi out/lesson-items.verified.json; thoát mã 1 nếu có bài trượt (bài trượt vẫn được ghi
 * vào file để import bỏ qua nó).
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const RUNTIME = join(ROOT, 'frontend', 'public', 'pyodide', 'v314.0.7') + '/';
const LIMIT_MS = 5000;
const verbose = process.argv.includes('--verbose');

const { loadPyodide } = await import(pathToFileURL(join(RUNTIME, 'pyodide.mjs')).href);
const harness = readFileSync(join(ROOT, 'frontend', 'public', 'static', 'js', 'studio-harness.py'), 'utf8');
const file = JSON.parse(readFileSync(join(HERE, 'out', 'lesson-items.json'), 'utf8'));

const py = await loadPyodide({ indexURL: RUNTIME });
await py.runPythonAsync(harness);
const grade = py.globals.get('_studio_main');
const preload = py.globals.get('_studio_preload');
const warmed = new Set();

function run(code, tests) {
  const t0 = performance.now();
  // Màn ôn gửi ca dạng { name, call, expect } (DailyPracticeView.tsx), không files, không contract.
  const cases = tests.map((t) => ({ name: t.name, call: t.call, expect: t.expected }));
  const res = JSON.parse(grade(code, JSON.stringify(cases), '[]'));
  res.ms = Math.round(performance.now() - t0);
  return res;
}

const allPass = (res, n) => !res.error && res.tests.length === n && res.tests.every((t) => t.passed);

const passed = [];
const failed = [];
const started = Date.now();
const code = file.items.filter((i) => i.type === 'code');

for (const item of code) {
  const p = item.payload;
  const missing = p.packages.filter((x) => !warmed.has(x));
  if (missing.length) {
    await py.loadPackage(missing, { messageCallback: () => {} });
    const errors = JSON.parse(preload(JSON.stringify(missing)));
    if (errors.length) console.log(`  ! import sẵn ${missing.join(',')} lỗi: ${errors.join('; ')}`);
    missing.forEach((x) => warmed.add(x));
  }
  const fail = (reason) => failed.push({ content_hash: item.content_hash, lesson_code: item.lesson_code, reason });

  const good = run(p.solutionCode, p.tests);
  if (!allPass(good, p.tests.length)) {
    const why = good.error
      ? good.error.trim().split('\n').pop()
      : good.tests.filter((t) => !t.passed).map((t) => `${t.name}: ${t.detail}`).join(' | ');
    fail(`lời giải mẫu trượt — ${why.slice(0, 300)}`);
    continue;
  }
  if (good.ms > LIMIT_MS) {
    fail(`lời giải chạy ${good.ms} ms, vượt 5 s của trình duyệt`);
    continue;
  }
  const shell = run(p.starterCode, p.tests);
  if (allPass(shell, p.tests.length)) {
    fail('code khởi tạo vẫn qua hết ca');
    continue;
  }
  passed.push(item.content_hash);
  if (verbose) console.log(`${item.lesson_code}: đạt ${p.tests.length} ca (${good.ms} ms)`);
}

writeFileSync(
  join(HERE, 'out', 'lesson-items.verified.json'),
  JSON.stringify({ pyodide: py.version, checked_at: new Date().toISOString(), passed, failed }, null, 1),
);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(`Pyodide ${py.version}: ${code.length} bài code — ${passed.length} đạt, ${failed.length} trượt (${seconds}s).`);
failed.forEach((f) => console.log(`  ✗ ${f.lesson_code}: ${f.reason}`));
if (failed.length) process.exitCode = 1;
