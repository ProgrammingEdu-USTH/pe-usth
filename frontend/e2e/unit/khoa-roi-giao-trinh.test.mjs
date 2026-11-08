// Một route `/lesson/<id>` chỉ được dựng NỘI DUNG BÀI khi khoá `<id>` còn một
// mục trong `curricula.json`.
//
// VÌ SAO LUẬT LÀ "CÒN GIÁO TRÌNH", KHÔNG PHẢI "CÒN TRONG DANH MỤC": bốn khoá
// rời `catalog.ts` ngày 13/10/2026 (`cpp`, `java`, `htmlcss`, `db_design`) được
// GIỮ CÓ CHỦ ĐÍCH — chú thích ở `catalog.ts` nói nguyên văn đó là "thay đổi
// TRÌNH BÀY… các route tự có của chúng vẫn chạy khi mở bằng đường dẫn trực
// tiếp". Cả bốn còn 4 học phần trong `curricula.json`. Nên "phải có trong danh
// mục" sẽ báo oan đúng bốn bài đang làm đúng.
//
// Thứ KHÔNG đứng được là một route dựng nội dung cho khoá KHÔNG có giáo trình:
// giao diện không có gì để vẽ ở thanh tiến độ, `/courses/<id>` cũng 404 nên
// không có đường quay về, mà trang vẫn mời ghi danh — và bấm vào là GHI một
// hàng `enrollments` rồi vào ngõ cụt. Đo trên production 08/11/2026: đúng một
// route ở diện đó, `/lesson/python`.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const LESSON = join(GOC, 'src/app/(standalone)/lesson');
const CURRICULA = JSON.parse(
  readFileSync(join(GOC, 'src/lib/curricula.json'), 'utf8'),
).CURRICULA;

/** Bỏ chú thích — luật này chấm CODE, và mọi chú thích ở đây nhắc tên khoá. */
function boChuThich(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

/** Mọi route TĨNH `/lesson/<id>` — bỏ route động `[courseId]`. */
function routeTinh() {
  return readdirSync(LESSON)
    .filter((t) => statSync(join(LESSON, t)).isDirectory() && !/^\[.*\]$/.test(t))
    .map((id) => ({ id, nguon: boChuThich(readFileSync(join(LESSON, id, 'page.tsx'), 'utf8')) }));
}

// Renderer dựng nội dung bài từ `lessons.content_json`. `PythonStudio` KHÔNG ở
// đây: nó là một bài dựng tay, không đọc khoá nào, nên nó không cần giáo trình.
const DUNG_NOI_DUNG = ['StudioLesson', 'LessonDbDesign'];

test('route /lesson tĩnh: phép quét tìm được đủ route và giáo trình', () => {
  const rs = routeTinh();
  // Tự kiểm: phép quét trượt thì mọi luật dưới đạt RỖNG mà không chứng minh gì.
  assert.ok(rs.length >= 3, `phép quét route trượt, chỉ thấy ${rs.length}`);
  assert.ok(rs.some((r) => r.id === 'python_advanced'), 'không thấy python_advanced');
  assert.ok(Object.keys(CURRICULA).length >= 4,
    `curricula.json chỉ có ${Object.keys(CURRICULA).length} khoá — phép đọc trượt?`);
});

test('route /lesson tĩnh: dựng nội dung bài ⇒ khoá phải còn giáo trình', () => {
  for (const { id, nguon } of routeTinh()) {
    const dung = DUNG_NOI_DUNG.filter((r) => new RegExp(`<${r}\\b`).test(nguon));
    if (dung.length === 0) continue;
    assert.ok(
      Object.prototype.hasOwnProperty.call(CURRICULA, id),
      `/lesson/${id} dựng ${dung.join('+')} nhưng curricula.json KHÔNG có khoá `
      + `"${id}" — trang sẽ mời ghi danh vào một khoá không có giáo trình, và `
      + '`/courses/' + id + '` cũng 404 nên không có đường quay về. Cho nhánh đó '
      + '`notFound()`, hoặc đưa khoá trở lại giáo trình.',
    );
  }
});

test('/lesson/python: nhánh không-demo phải 404, nhánh demo phải Ở LẠI', () => {
  const p = join(LESSON, 'python/page.tsx');
  const nguon = boChuThich(readFileSync(p, 'utf8'));
  assert.ok(!/<StudioLesson\b/.test(nguon),
    'không được dựng nội dung bài cho khoá python: khoá đó không còn giáo trình');
  // `?demo=list` là lối DUY NHẤT tới PythonStudio (grep ra đúng một chỗ mount).
  // Xoá nó là biến một component đang sống thành code không ai tới được — đúng
  // lỗi thống trị mà repo này có bốn cổng để bắt.
  assert.match(nguon, /<PythonStudio\b/, 'mất lối duy nhất tới PythonStudio');

  // `notFound()` phải CÓ ĐIỀU KIỆN trên tham số demo, không đứng trần.
  //
  // Bản đầu của ca này chỉ đòi hai CHUỖI `notFound()` và `<PythonStudio` cùng
  // có mặt — và ablate cho **0 đỏ** khi thay cả nhánh bằng một `notFound()`
  // trần: `<PythonStudio />` vẫn nằm trong JSX phía dưới, chỉ là không còn ai
  // tới được. Một ca đòi "chuỗi có mặt" không chứng minh được "nhánh còn sống".
  const canh = nguon
    .split(/[;{}\n]/)
    .map((s) => s.trim())
    .filter((s) => s.includes('notFound()'));
  assert.ok(canh.length >= 1, 'nhánh không-demo phải gọi notFound()');
  for (const c of canh) {
    assert.match(c, /PYTHON_DEMO_PARAM/,
      `notFound() đứng TRẦN ở "${c}" — nó phải có điều kiện trên tham số demo, `
      + 'nếu không thì lối duy nhất tới PythonStudio chết mà hai chuỗi kia vẫn có mặt');
  }
});

test('/lesson/python: metadata không còn hứa một khoá không tồn tại', () => {
  // PHẢI bỏ chú thích ở đây nữa, dù luật này nói về một GIÁ TRỊ: chú thích
  // nằm BÊN TRONG khối metadata cũng nhắc câu cũ để giải thích vì sao nó đi,
  // nên bản đầu của ca này ĐỎ OAN trên chính lời giải thích của bản sửa.
  const nguon = boChuThich(readFileSync(join(LESSON, 'python/page.tsx'), 'utf8'));
  const than = nguon.slice(nguon.indexOf('export const metadata'));
  const mota = than.slice(0, than.indexOf('};'));
  assert.ok(!/40 bài/.test(mota), 'metadata còn hứa "40 bài" — khoá đó không còn');
  assert.ok(!/Giáo trình Python/.test(mota),
    'metadata còn nói về giáo trình Python v3 đã rời khoá');
});
