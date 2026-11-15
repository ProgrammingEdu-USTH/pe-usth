// Nhãn phiên bản Python trong giao diện.
//
// VÌ SAO CÓ FILE NÀY: soi trang thật ngày 25/10/2026, màn "Thử thách độc lập"
// hiện **"CPython 3.12"** ở đầu ô soạn mã trước lần chạy đầu, rồi đổi sang
// "CPython 3.14.2" sau khi chạy. 3.12 là số của ảnh Docker `python:3.12-slim`
// đã bỏ từ lần chuyển sang Pyodide; nó sống sót vì nó là giá trị MẶC ĐỊNH, chỉ
// hiện lúc runtime chưa kịp nói nó là bản nào. Trang chủ cũng dán thẻ
// "Python 3.12" lên mọi ô khoá học, và một màn còn ghi "CPython 3.11".
//
// Luật: nhãn nào chỉ MÔ TẢ runtime thì không được ghi số. Số thật đến từ
// `runtimeStatus` lúc chạy; nhãn mặc định không có số thì không bao giờ lệch
// sau một lần nâng Pyodide.
//
// ĐÃ GỠ BẢN SỬA RA: trả một nhãn về "CPython 3.12" → 1 ca trượt, và nó in ra
// đúng tên file + số dòng.
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const GOC = fileURLToPath(new URL('../../src/', import.meta.url));

function moiFileNguon(dir = GOC, ra = []) {
  for (const ten of readdirSync(dir)) {
    const duong = join(dir, ten);
    if (statSync(duong).isDirectory()) moiFileNguon(duong, ra);
    else if (/\.(ts|tsx)$/.test(ten)) ra.push(duong);
  }
  return ra;
}

/** Bỏ chú thích để chỉ còn thứ người dùng ĐỌC ĐƯỢC. Chú thích thì được phép
 *  nhắc tới 3.12 — chính các chú thích giải thích vì sao bỏ nó đi. */
function boChuThich(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Bỏ \r TRƯỚC khi cắt `//`: file trong repo này là CRLF, mà `.` trong regex
    // không khớp \r nên `//.*$` không bóc được chú thích cuối dòng CRLF — bản
    // đầu của ca này báo đúng 3 dòng CHÚ THÍCH là vi phạm.
    .replace(/\r/g, '')
    .split('\n')
    .map((d) => d.replace(/\/\/.*$/, ''))
    .join('\n');
}

test('không nhãn nào ghi cứng số phiên bản Python', () => {
  const pham = [];
  for (const duong of moiFileNguon()) {
    const sach = boChuThich(readFileSync(duong, 'utf8'));
    sach.split('\n').forEach((dong, i) => {
      if (/C?Python \d+\.\d+/.test(dong)) {
        pham.push(`${duong.slice(GOC.length)}:${i + 1}  ${dong.trim().slice(0, 90)}`);
      }
    });
  }
  assert.deepEqual(
    pham, [],
    'nhãn ghi cứng số phiên bản — số thật đến từ runtimeStatus, nhãn mặc định đừng ghi số:\n  '
      + pham.join('\n  '),
  );
});

test('ô soạn mã của bài học hứa chạy ĐÚNG tên file nó đang hiện', () => {
  // Màn "Thử thách độc lập" truyền filename="main.py", nhưng ô kết quả ghi cứng
  // 'Bấm "Chạy thử" để thực thi solution.py' — hai tên cho một file, ngay cạnh
  // nhau trên cùng màn hình.
  const src = readFileSync(
    new URL('../../src/components/lesson-chrome/exercises/SandboxEditor.tsx', import.meta.url),
    'utf8',
  );
  const cho = /placeholder=\{?[`'"]Bấm "Chạy thử"[^`'"]*/.exec(src);
  assert.ok(cho, 'không tìm thấy placeholder của ô kết quả');
  assert.ok(
    /\$\{filename\}/.test(cho[0]),
    `placeholder phải dùng \${filename}, đang là: ${cho[0].slice(0, 90)}`,
  );
});

// Mô tả (meta description) của hai cửa vào phải nói đúng điều đang xảy ra. Kiểm toán 16/11/2026
// đo được hai câu sai: /ide hứa "sandbox cách ly trên máy chủ" (bộ chạy máy chủ đã xoá từ 25/10, mã
// chạy trong trình duyệt) và trang bài học ghi cứng "172 bài" khi khoá có 179. Một mô tả sai nằm ở
// kết quả tìm kiếm — nơi người mới thấy ĐẦU TIÊN.
test('mo ta cua /ide va trang bai hoc khong noi sai (may chu, so bai ghi cung)', () => {
  const doc = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\r/g, '');
  const ide = doc('../../src/app/ide/page.tsx');
  const moTaIde = /description:\s*'([^']*)'/.exec(ide);
  assert.ok(moTaIde, 'ide/page.tsx không còn khai description kiểu chuỗi đơn');
  assert.ok(!/máy chủ|sandbox/i.test(moTaIde[1]), 'mô tả /ide còn nói máy chủ/sandbox: ' + moTaIde[1]);
  const bai = doc('../../src/app/(standalone)/lesson/python_advanced/page.tsx');
  const khoiMoTa = bai.slice(bai.indexOf('description:'), bai.indexOf('};', bai.indexOf('description:')));
  assert.ok(khoiMoTa.length > 40, 'không bóc được khối description của trang bài học');
  assert.ok(!/\b1\d\d bài/.test(khoiMoTa), 'mô tả trang bài học ghi cứng số bài, phải lấy từ catalog: ' + khoiMoTa.slice(0, 80));
  assert.ok(/findCourse\(/.test(khoiMoTa), 'mô tả trang bài học phải lấy số bài từ findCourse (catalog.ts)');
});
