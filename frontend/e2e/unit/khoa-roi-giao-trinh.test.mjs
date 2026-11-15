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

test('/lesson/python: 404 ở MỌI tham số, không mount PythonStudio nữa', () => {
  const p = join(LESSON, 'python/page.tsx');
  const nguon = boChuThich(readFileSync(p, 'utf8'));
  assert.ok(!/<StudioLesson\b/.test(nguon),
    'không được dựng nội dung bài cho khoá python: khoá đó không còn giáo trình');

  // ĐÃ VIẾT LẠI 08/11/2026, và lý do là một PHÉP ĐO BÁC CHÍNH CA NÀY.
  //
  // Bản trước đòi `<PythonStudio` phải CÒN và `notFound()` phải có điều kiện
  // trên `PYTHON_DEMO_PARAM`, với lý lẽ "?demo=list là lối DUY NHẤT tới
  // PythonStudio". Lý lẽ ấy giữ nhánh vì component CÓ CHỖ MOUNT, không vì trang
  // CHẠY ĐƯỢC. Đo trên production: `/lesson/python?demo=list` tới trạng thái
  // cuối sau 39,3 s cold start rồi hiện "Đăng ký khóa học miễn phí để lưu tiến
  // độ", nút bước tiếp `disabled`, và một liên kết thoát tới `/courses/python`
  // (404). Tức nhánh ấy KHÔNG dùng được — ca cũ đang bảo vệ một đường chết.
  //
  // Nay luật là: trang này 404 ở MỌI tham số, và `PythonStudio` được khai vào
  // `GIU_DU_CHET` của `check-tai-nguyen-chet.mjs` kèm ba việc phải sửa nếu hồi
  // sinh. Hai cổng khoá nhau: bỏ khai thì cổng tài nguyên chết đỏ; nối lại
  // mount mà không khai thì ca dưới đỏ.
  assert.ok(!/<PythonStudio\b/.test(nguon),
    'trang này không được mount PythonStudio nữa — đường đó đã đo là không dùng '
    + 'được; nếu hồi sinh thì phải sửa cả ba việc đã khai trong GIU_DU_CHET và gỡ '
    + 'mục khai đó đi');

  // `notFound()` phải đứng ở nhánh MẶC ĐỊNH, không sau một điều kiện nào — nếu
  // không thì một tham số nào đó lại mở ra trang cũ.
  const canh = nguon
    .split(/[;{}\n]/)
    .map((s) => s.trim())
    .filter((s) => s.includes('notFound()'));
  assert.equal(canh.length, 1, 'phải có đúng một lời gọi notFound()');
  assert.equal(canh[0], 'notFound()',
    `notFound() phải đứng TRẦN, đo được "${canh[0]}" — mọi tham số đều 404`);
});

test('PythonStudio được KHAI là chết-mà-giữ, kèm ba việc phải sửa nếu hồi sinh', () => {
  // Cổng tài nguyên chết đã bắt đúng 69 126 byte này ngay khi mount bị gỡ. Ca
  // này canh nửa còn lại: lời khai phải nói ra VÌ SAO, không chỉ có tên. Một
  // danh sách ngoại lệ không kèm lý do là một danh sách không ai dám dọn.
  const nguon = readFileSync(join(GOC, '../scripts/check-tai-nguyen-chet.mjs'), 'utf8');
  const i = nguon.indexOf("'component/PythonStudio.tsx'");
  assert.ok(i > 0, 'chưa khai component/PythonStudio.tsx vào GIU_DU_CHET');
  const khai = nguon.slice(i, nguon.indexOf('\n  }', i) + 4);
  for (const viec of ['hasStoredSession', '!enrolled', '404']) {
    assert.ok(khai.includes(viec), `lời khai thiếu việc phải sửa: ${viec}`);
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
