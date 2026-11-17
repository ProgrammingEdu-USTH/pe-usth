/**
 * "Xem từng bước" ở /ide phải NẠP GÓI như "Chạy" — lỗi đã đo ngày 17/11/2026.
 *
 * ── Lỗi ───────────────────────────────────────────────────────────────────────────────
 * `ide.worker.js` nạp gói (`packagesFor` + `loadPackage` + import làm nóng) chỉ trong `run()`. Đường
 * `trace()` chạy tracer thẳng, nên mở /ide bằng nút "Thử ngay trong IDE" ở một bài pandas rồi bấm "Xem
 * từng bước" cho: dừng ở dòng 1, 4 bước ghi được, `ModuleNotFoundError: No module named 'pandas'`. Bấm
 * "Chạy" một lần (worker nạp pandas) rồi ghi vết lại thì 7 bước, đủ biến — đã tái hiện trong Chrome
 * trên dev server, cả hai chiều.
 *
 * Vì sao không bộ kiểm nào bắt được: `do-settrace.mjs` đo hệ số chậm bằng chuỗi warmup → run → trace
 * (BỎ lượt đầu), tức worker đã có pandas lúc ghi vết; và mọi ca test của /ide chạy logic thuần, không
 * chạy worker. Nút "Xem từng bước" lại đứng TRƯỚC nút "Chạy" trên thanh công cụ, và 411 khối code của
 * khoá có nút "Thử ngay trong IDE" — phần lớn import pandas/numpy/matplotlib: đường đầu tiên của người
 * học tới bước-từng-dòng hỏng đúng ở thư viện mà khoá này dạy.
 *
 * ── Cổng ──────────────────────────────────────────────────────────────────────────────
 * Hai nửa, và nửa nào thiếu thì nửa kia đứng một mình không chứng minh gì:
 *   1. CẤU TRÚC: `run()` và `trace()` đều gọi `napGoi(py, code)`, và `trace()` gọi nó TRƯỚC khi chạy tracer;
 *   2. HÀNH VI: `packagesFor` (chạy thật, trích từ chính tệp worker) nhận ra pandas/numpy/matplotlib trong
 *      mã bài — nếu nó trả rỗng thì `napGoi` có gọi cũng không nạp gì.
 *
 * Ablate: bỏ lời gọi ở `trace()` → ca 1 đỏ; `run()` tự chép lại khối nạp (không dùng `napGoi`) → ca 2 đỏ;
 * `packagesFor` thôi nhận pandas → ca 3 đỏ.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const NGUON = readFileSync(new URL('../../public/static/js/ide.worker.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/** Thân của `async function <ten>(...) { … }` — đếm ngoặc, bỏ qua chú thích dòng và khối. */
function than(ten) {
  const i = NGUON.indexOf(`async function ${ten}(`);
  assert.ok(i >= 0, `không tìm thấy async function ${ten}`);
  const mo = NGUON.indexOf('{', i);
  let sau = 0;
  for (let k = mo; k < NGUON.length; k++) {
    if (NGUON[k] === '{') sau += 1;
    else if (NGUON[k] === '}') {
      sau -= 1;
      if (sau === 0) return NGUON.slice(mo, k + 1);
    }
  }
  throw new Error(`ngoặc của ${ten} không cân`);
}

const boChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

test('trace() nạp gói TRƯỚC khi chạy tracer (và run() dùng chung cùng một hàm)', () => {
  const t = boChuThich(than('trace'));
  const r = boChuThich(than('run'));
  const iGoi = t.indexOf('napGoi(py, code)');
  const iTracer = t.indexOf('_pe_run(');
  assert.ok(iGoi >= 0, 'trace() không gọi napGoi — bài pandas/numpy/matplotlib sẽ chết ở dòng import đầu tiên khi bấm "Xem từng bước" trước "Chạy"');
  assert.ok(iTracer > iGoi, 'napGoi phải đứng TRƯỚC `_pe_run`: nạp gói sau khi tracer đã chạy mã người học thì vô nghĩa');
  assert.ok(r.includes('napGoi(py, code)'), 'run() phải dùng CHUNG napGoi, không tự chép khối nạp riêng');
});

test('khối nạp gói chỉ còn MỘT bản (không `loadPackage` nào ngoài napGoi)', () => {
  const khac = boChuThich(NGUON.replace(than('napGoi'), ' '));
  assert.equal(
    (khac.match(/loadPackage\(/g) ?? []).length,
    0,
    'còn một lời gọi loadPackage ngoài napGoi — hai bản chép của cùng một khối sẽ trôi khỏi nhau (đúng cách lỗi này ra đời)',
  );
  assert.equal((boChuThich(than('napGoi')).match(/loadPackage\(/g) ?? []).length, 1);
});

/*
 * ── Lỗi thứ HAI cùng luồng, tìm thấy khi kiểm lỗi trên (17/11/2026) ─────────────────────────────
 * Bấm "Tôi tin đoạn mã này — cho chạy" (tin VÀ chạy) rồi "Xem từng bước" ngay: hai yêu cầu chạy CHỒNG
 * trong cùng một Pyodide; `result` của "Chạy" (không có `trace`) bị bên ghi vết nhận nhầm →
 * `doc.stats` undefined → TypeError ở <CodeVisualizer> → màn "Trang này vừa gặp lỗi". Tái hiện được
 * trong Chrome. Sửa: worker xử lý TUẦN TỰ và gắn `loai` vào kết quả/lỗi; mỗi phía nhận chỉ lấy đúng loại.
 */
const doc = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const RUNNER = doc('../../src/lib/ide-runner.ts');
const TRACE = doc('../../src/lib/ide-trace.ts');

test('worker xử lý tuần tự (hàng đợi) và gắn `loai` vào cả result lẫn fatal', () => {
  const s = boChuThich(NGUON);
  assert.match(s, /self\.onmessage\s*=\s*\(\{\s*data\s*\}\)\s*=>\s*\{\s*cola\s*=\s*cola\.then\(/, 'onmessage phải xếp yêu cầu vào hàng đợi `cola`, không chạy song song');
  assert.doesNotMatch(s, /self\.onmessage\s*=\s*async/, 'onmessage async chạy mỗi thông điệp song song — đúng cách lỗi này ra đời');
  assert.match(s, /type:\s*'result',\s*loai:\s*data\.type/, 'result phải mang loai của yêu cầu');
  assert.match(s, /type:\s*'fatal',\s*loai:\s*data\.type/, 'fatal phải mang loai của yêu cầu');
});

test('ide-runner chỉ nhận thông điệp của lần CHẠY, ide-trace chỉ nhận của lần GHI VẾT', () => {
  assert.match(boChuThich(RUNNER), /data\.loai\s*&&\s*data\.loai\s*!==\s*'run'/, 'ide-runner phải bỏ qua thông điệp không phải loai "run"');
  assert.match(boChuThich(TRACE), /data\.loai\s*&&\s*data\.loai\s*!==\s*'trace'/, 'ide-trace phải bỏ qua thông điệp không phải loai "trace"');
});

test('packagesFor (chạy thật, trích từ tệp worker) nhận ra pandas, numpy, matplotlib trong mã bài', () => {
  const lay = (re) => {
    const m = NGUON.match(re);
    assert.ok(m, `không trích được ${re}`);
    return m[0];
  };
  const goiDeclare = lay(/const PACKAGES = \{[^}]*\};/);
  const fnSrc = (() => {
    const i = NGUON.indexOf('function packagesFor(code)');
    assert.ok(i >= 0);
    const mo = NGUON.indexOf('{', i);
    let sau = 0;
    for (let k = mo; k < NGUON.length; k++) {
      if (NGUON[k] === '{') sau += 1;
      else if (NGUON[k] === '}' && --sau === 0) return NGUON.slice(i, k + 1);
    }
    throw new Error('ngoặc packagesFor không cân');
  })();
  const packagesFor = new Function(`${goiDeclare}\n${fnSrc}\nreturn packagesFor;`)();
  assert.deepEqual(packagesFor("import pandas as pd\ndf = pd.DataFrame({'a': [1]})\n"), ['pandas']);
  assert.deepEqual(packagesFor('import numpy as np\nprint(np.arange(3))\n'), ['numpy']);
  assert.deepEqual(packagesFor('import matplotlib.pyplot as plt\nplt.plot([1])\n'), ['matplotlib']);
  assert.deepEqual(packagesFor('x = 1\nprint(x)\n'), [], 'mã không import gì thì không nạp gói nào');
});
