// Chấm bài SQL của bài thử AD01 (public/lab-sql). Chạy sql.js THẬT trong node, không giả.
//
// Test này khoá hai tính chất mà một cổng chấm SQL dễ mất:
//  1. ĐÚNG KHÔNG PHỤ THUỘC CÁCH VIẾT: CTE, truy vấn con, bí danh khác đều đạt.
//  2. SAI BỊ BẮT, kể cả cách sai chỉ "đúng tình cờ" trên dữ liệu mẫu (SUM(DISTINCT)) — đó là lý do
//     đề có bộ dữ liệu thử thêm. Gỡ bộ đó ra thì ca SUM(DISTINCT) phải đỏ (xem ablate trong mô tả commit).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'lab-sql');
const initSqlJs = require(join(DIR, 'vendor', 'sql-wasm.js'));
const Lab = require(join(DIR, 'grade.js'));
const AD01 = require(join(DIR, 'ad01-data.js'));

let SQL;
before(async () => {
  SQL = await initSqlJs({ locateFile: (f) => join(DIR, 'vendor', f) });
});

const cham = (sql) => Lab.chamBai(SQL, AD01.de, sql);

test('đáp án mẫu đạt trên cả hai bộ dữ liệu', () => {
  const r = cham(AD01.DAP_AN);
  assert.equal(r.dat, true, JSON.stringify(r.theoBo.map((x) => x.lech)));
  assert.equal(r.theoBo.length, 2);
});

test('câu SAI của đề (JOIN hai bảng con) trượt, và phản hồi chỉ ra hàng bị nhân', () => {
  const r = cham(AD01.SAI);
  assert.equal(r.dat, false);
  assert.match(r.phanHoi, /SAI|hàng|giá trị/);
  // Trên dữ liệu của quán nó ra 200 ở đơn 101: số hàng đúng (3) nhưng giá trị sai.
  const chinh = r.theoBo.find((x) => !x.an);
  assert.equal(chinh.dat, false);
  assert.deepEqual(chinh.nhan.values[0], [101, 200, 200]);
});

test('một cách viết KHÁC (truy vấn con tương quan, bí danh khác) vẫn đạt', () => {
  const r = cham(`SELECT p.id AS don,
  (SELECT SUM(amount) FROM purchase_lines WHERE order_id = p.id) AS tien_hang,
  (SELECT SUM(amount) FROM payments WHERE order_id = p.id) AS da_tra
FROM purchases p WHERE p.status = 'paid'`);
  assert.equal(r.dat, true, r.phanHoi);
});

test('SUM(DISTINCT) đúng ở dữ liệu của quán nhưng SAI ở dữ liệu thử thêm', () => {
  const r = cham(`SELECT p.id, SUM(DISTINCT l.amount) AS line_total, SUM(DISTINCT m.amount) AS paid_total
FROM purchases p LEFT JOIN purchase_lines l ON l.order_id = p.id LEFT JOIN payments m ON m.order_id = p.id
WHERE p.status = 'paid' GROUP BY p.id`);
  const chinh = r.theoBo.find((x) => !x.an);
  const an = r.theoBo.find((x) => x.an);
  assert.equal(chinh.dat, true, 'phải tình cờ đúng ở dữ liệu của quán — nếu không thì ca này không chứng minh được gì');
  assert.equal(an.dat, false);
  assert.equal(r.dat, false);
  assert.match(r.phanHoi, /thử thêm/);
});

test('INNER JOIN làm mất đơn 104 (chưa có dòng hàng) — trượt vì thiếu hàng', () => {
  const r = cham(`SELECT p.id, SUM(l.amount), SUM(m.amount) FROM purchases p
JOIN (SELECT order_id, SUM(amount) amount FROM purchase_lines GROUP BY order_id) l ON l.order_id = p.id
JOIN (SELECT order_id, SUM(amount) amount FROM payments GROUP BY order_id) m ON m.order_id = p.id
WHERE p.status = 'paid' GROUP BY p.id`);
  assert.equal(r.dat, false);
  assert.match(r.phanHoi, /hàng/);
});

test('đổi NULL thành 0 (COALESCE) bị bắt: "chưa có thanh toán" khác "đã trả 0"', () => {
  const r = cham(DAP_AN_COALESCE());
  assert.equal(r.dat, false);
});

test('sai số cột bị báo bằng số cột, không bằng tên cột', () => {
  const r = cham(`SELECT p.id FROM purchases p WHERE p.status = 'paid'`);
  assert.equal(r.dat, false);
  assert.match(r.phanHoi, /3 cột/);
});

test('lỗi cú pháp trả phản hồi nói là lỗi SQL, không ném ra ngoài', () => {
  const r = cham('SELEC 1');
  assert.equal(r.dat, false);
  assert.match(r.phanHoi, /SQL báo lỗi/);
});

test('câu phá dữ liệu (DROP/DELETE) không làm hỏng lần chấm sau', () => {
  const xau = cham('DROP TABLE purchases; SELECT 1,2,3');
  assert.equal(xau.dat, false);
  const tot = cham(AD01.DAP_AN);
  assert.equal(tot.dat, true, 'mỗi lần chấm phải dựng CSDL mới');
});

test('thứ tự hàng không bị chấm (đề không đòi ORDER BY)', () => {
  const r = cham(AD01.DAP_AN.replace('ORDER BY p.id', 'ORDER BY p.id DESC'));
  assert.equal(r.dat, true);
});

function DAP_AN_COALESCE() {
  return AD01.DAP_AN.replace('l.total AS line_total', 'COALESCE(l.total,0) AS line_total').replace('m.total AS paid_total', 'COALESCE(m.total,0) AS paid_total');
}

// ---------------------------------------------------------------------------
// Trang dùng lại CSS và bộ vẽ của Quán Mây (không sao chép). Phụ thuộc đó phải bị canh:
// đổi tên một lớp hay bỏ một hàm ở Quán Mây sẽ làm trang này hỏng ÂM THẦM (mất kiểu, hoặc ném lỗi khi vẽ cảnh).
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
const doc = (...p) => readFileSync(join(DIR, '..', ...p), 'utf8');

test('mọi lớp CSS của Quán Mây mà trang dùng vẫn còn trong quan-may.css', () => {
  const css = doc('quan-may', 'quan-may.css');
  const js = doc('lab-sql', 'ad01.js');
  const dung = new Set();
  for (const m of js.matchAll(/class:\s*'([^']+)'/g)) m[1].split(/\s+/).forEach((c) => dung.add(c));
  for (const m of js.matchAll(/btn\([^)]*?,\s*'([^']*)'/g)) m[1].split(/\s+/).filter(Boolean).forEach((c) => dung.add(c));
  // Lớp do chính lab-sql.css định nghĩa thì không cần có ở Quán Mây.
  const rieng = doc('lab-sql', 'lab-sql.css');
  // 'who-linh' và 'ketqua' là móc chọn phần tử (test/CSS có thể bám vào), không có kiểu riêng.
  const MOC = new Set(['btn', 'who-linh', 'ketqua']);
  const coKieu = (c, nguon) => nguon.includes('.' + c) && new RegExp('\\.' + c.replace(/-/g, '\\-') + '(?![\\w-])').test(nguon);
  const thieu = [...dung].filter((c) => !MOC.has(c) && !coKieu(c, css) && !coKieu(c, rieng));
  assert.deepEqual(thieu, [], 'lớp không còn ở quan-may.css hay lab-sql.css: ' + thieu.join(', '));
  assert.ok(dung.size >= 20, 'phép quét lớp phải thấy nhiều lớp (đang thấy ' + dung.size + '), nếu không nó đang mù');
});

test('mọi hàm vẽ của QuanMayIso mà trang gọi vẫn được iso.js xuất ra', () => {
  const iso = doc('quan-may', 'iso.js');
  const js = doc('lab-sql', 'ad01.js');
  const xuat = /window\.QuanMayIso = \{([^}]*)\}/.exec(iso)[1].split(',').map((x) => x.trim());
  const kit = /\n  return \{ u, P, ([^}]*)\};/.exec(iso)[1].split(',').map((x) => x.trim());
  const parts = [...(/const parts = \{([\s\S]*?)\n  \};\n  return \{ u, P/.exec(iso)[1].matchAll(/^    (\w+)[:(]/gm))].map((m) => m[1]);
  const goi = (re, nguon = js) => [...new Set([...nguon.matchAll(re)].map((m) => m[1]))];
  const iso1 = goi(/ISO\.(\w+)/g);
  const k = goi(/\bk\.(\w+)\(/g).filter((x) => x !== 'parts' && !(x in String.prototype)); // `k` ở chỗ khác là một chuỗi (k.startsWith)
  // `p` còn là tên của một mục trong hàng đợi worker (p.ok/p.no) — chỉ quét phần SAU dòng `const p = k.parts`.
  const p = goi(/\bp\.(\w+)\(/g, js.slice(js.indexOf('const p = k.parts')));
  assert.ok(iso1.length >= 3 && k.length >= 5 && p.length >= 2, `phép quét phải thấy lời gọi: ISO ${iso1}, k ${k}, p ${p}`);
  assert.deepEqual(iso1.filter((x) => !xuat.includes(x)), [], 'QuanMayIso không xuất');
  assert.deepEqual(k.filter((x) => !kit.includes(x)), [], 'kit không có');
  assert.deepEqual(p.filter((x) => !parts.includes(x)), [], 'parts không có');
});
