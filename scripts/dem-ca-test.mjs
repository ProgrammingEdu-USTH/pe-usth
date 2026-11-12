#!/usr/bin/env node
/**
 * Chạy bộ test frontend MỘT LƯỢT và in số ca THEO TỪNG TỆP.
 *
 * VÌ SAO CÓ: dòng phân rã số ca trong AGENTS.md ("catalog-duration 2 ·
 * catalog-naming 3 · …") đã TRÔI hai lần — 5 đơn vị ở vòng 07/11 và **59 đơn
 * vị** ở vòng 09/11, khi nó cộng ra 592 trong lúc bộ chạy ra 651 và mười tệp
 * test chưa bao giờ có mặt ở đó. `check-moc-chay` đối chiếu HÀNG tổng chứ
 * không đối chiếu bảng phân rã, nên nó xanh suốt chín vòng.
 *
 * VÀ VÌ SAO NÓ CHƯA ĐƯỢC DỰNG SỚM HƠN: vòng trước tôi viết rằng cổng cho nó
 * "đòi chạy 58 tệp riêng lẻ thay vì một lượt, tức đổi ~4 phút CI lấy một con
 * số mà hàng tổng đã canh". Câu ấy là một lời khai về MỘT CÁCH LÀM (vòng `for`
 * gọi `node --test` từng tệp), không phải về bài toán — đúng bài học mà
 * AGENTS.md đã ghi ở vòng dọn L4/L5/L6. API lập trình `run()` của `node:test`
 * phát sự kiện `test:pass` KÈM `file`, nên một lượt chạy duy nhất cho cả tổng
 * lẫn phân rã. Reporter TAP thì KHÔNG dùng được: nó làm phẳng và bỏ tên tệp.
 *
 * Dùng: node scripts/dem-ca-test.mjs            # in bảng + tổng
 *       node scripts/dem-ca-test.mjs --json     # bản máy đọc
 */
import { run } from 'node:test';
import { glob } from 'node:fs/promises';
import { basename } from 'node:path';
import process from 'node:process';

const GOC = new URL('../frontend/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const JSON_RA = process.argv.includes('--json');

const files = [];
for await (const f of glob('e2e/unit/*.test.mjs', { cwd: GOC })) files.push(GOC + f);
files.sort();

// Tự kiểm: phép duyệt trượt thì mọi con số dưới là 0 và cổng gọi nó sẽ đọc
// "0 ca" như một kết quả. Một phép đếm trả về 0 là thứ phải nghi ngờ trước nhất.
if (files.length < 20) {
  console.error(`LỖI: chỉ tìm thấy ${files.length} tệp test trong ${GOC}e2e/unit/ — phép duyệt trượt.`);
  process.exit(1);
}

const dat = new Map();
const truot = [];
const s = run({ files, concurrency: true });
s.on('test:pass', (d) => {
  if (!d.file) return;
  const t = basename(d.file, '.test.mjs');
  dat.set(t, (dat.get(t) || 0) + 1);
});
s.on('test:fail', (d) => {
  truot.push(`${d.file ? basename(d.file, '.test.mjs') : '?'}: ${d.name}`);
});
await new Promise((ok, loi) => { s.on('end', ok); s.on('error', loi); s.resume(); });

const muc = [...dat].sort(([a], [b]) => a.localeCompare(b));
const tong = muc.reduce((n, [, c]) => n + c, 0);

if (JSON_RA) {
  console.log(JSON.stringify({ tong, soTep: files.length, truot: truot.length, muc: Object.fromEntries(muc) }));
} else {
  // Cùng khuôn với dòng phân rã trong AGENTS.md để dán thẳng vào được.
  let dong = '';
  const ra = [];
  for (const [t, c] of muc) {
    const moi = dong ? `${dong} · ${t} ${c}` : `${t} ${c}`;
    if (moi.length > 96) { ra.push(`${dong} ·`); dong = `${t} ${c}`; } else dong = moi;
  }
  ra.push(`${dong} = ${tong}.`);
  console.log(ra.join('\n'));
  console.log(`\n${files.length} tệp · ${tong} ca đạt · ${truot.length} trượt`);
  for (const t of truot) console.log(`  TRƯỢT: ${t}`);
}
process.exitCode = truot.length ? 1 : 0;
