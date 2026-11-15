// HAI THANH CỦA VỎ BÀI HỌC PHẢI GHIM ĐƯỢC — và thứ phá chúng không nằm trong
// file khai chúng.
//
// ĐO TRÊN PRODUCTION 08/11/2026 (Chrome, 390×844 emulate mobile, màn tổng kết
// của `/lesson/python_advanced`): cả `.topBar` lẫn `.bottomBar` khai
// `position: sticky` + `z-index: 50`, mà KHÔNG thanh nào ghim —
// `topBar.y = -400` ở `scrollY = 400`, `bottomBar.y = 1362 - scrollY` đúng dòng
// chảy TĨNH. Nút "Quay lại" (thứ NĂM người thử đòi ngày 27/10) và nút chính của
// màn chỉ thấy được ở ĐÁY TUYỆT ĐỐI: phải cuộn **606px**.
//
// Nguyên nhân ở một file KHÁC: `edu-responsive.css` §6 khai
// `html, body { overflow-x: hidden }` cho khổ ≤ 1023.98px. Một `overflow` khác
// `visible` ở GỐC biến html/body thành scroll container, nên `sticky` thôi ghim
// theo viewport. `clip` thì clip mà KHÔNG tạo scroll container.
//
// Nên bộ này canh HAI NỬA ở HAI FILE, và một nửa thôi là cổng rỗng: khai sticky
// mà gốc `hidden` thì không ghim, còn gốc đúng mà thanh thôi khai sticky thì
// cũng không ghim. Đó là lý do nó là một bộ riêng chứ không phải một ca thêm
// vào `ds-contrast` (bộ đó canh MÀU của cạnh hai thanh, không canh cơ chế).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CHROME = readFileSync(
  join(GOC, 'src/components/lesson-chrome/LessonChrome.module.css'), 'utf8',
);
const RESP = readFileSync(join(GOC, 'public/static/css/edu-responsive.css'), 'utf8');

/** Bỏ chú thích: cả hai file nhắc `overflow-x: hidden` để nói vì sao KHÔNG dùng
 *  nó, nên so trên văn bản thô là ĐỎ OAN trên chính lời giải thích của bản sửa
 *  — bẫy đã mắc hai lần trong repo này. */
const boChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ');

test('vỏ bài học: phép đọc tìm được cả hai file (tự kiểm)', () => {
  // Đọc trượt thì mọi luật dưới đạt RỖNG mà không chứng minh gì.
  assert.ok(CHROME.length > 2000, `LessonChrome.module.css chỉ ${CHROME.length} byte`);
  assert.ok(RESP.length > 2000, `edu-responsive.css chỉ ${RESP.length} byte`);
  assert.match(CHROME, /\.topBar/);
  assert.match(CHROME, /\.bottomBar/);
});

test('vỏ bài học: hai thanh vẫn khai `position: sticky`', () => {
  // Nửa thứ nhất. Gỡ nó ra thì thanh không ghim dù gốc đã đúng.
  const ma = boChuThich(CHROME);
  for (const ten of ['topBar', 'bottomBar']) {
    // Phải neo vào `.topBar {` CÓ DẤU NGOẶC: file mở đầu bằng một rule DÙNG
    // CHUNG (`.topBar, .topBar *, .bottomBar, .bottomBar * { … }`) không có
    // `position`, nên `indexOf('.topBar')` thuần bắt rule ấy và ca BÁO OAN —
    // bản đầu của ca này đã đỏ đúng như vậy.
    const i = ma.indexOf(`.${ten} {`);
    assert.ok(i > 0, `không còn rule \`.${ten} {\` — đổi tên thì phải sửa ca này`);
    const than = ma.slice(i, ma.indexOf('}', i));
    assert.match(than, /position:\s*sticky/, `.${ten} thôi khai position: sticky`);
    assert.match(than, /(top|bottom):\s*0/, `.${ten} thiếu mốc ghim (top/bottom: 0)`);
  }
});

test('gốc trang: KHÔNG được `overflow-x: hidden` trên html/body — nó phá sticky', () => {
  // Nửa thứ hai, và là nửa mà file khai sticky KHÔNG nhìn thấy. Quét MỌI CSS
  // tĩnh, không chỉ `edu-responsive.css`: luật này đúng ở bất cứ file nào đặt
  // overflow cho html/body, và trang bài học nạp nhiều file hơn nó khai.
  const thuMuc = join(GOC, 'public/static/css');
  const tep = readdirSync(thuMuc).filter((t) => t.endsWith('.css'));
  assert.ok(tep.length >= 5, `chỉ thấy ${tep.length} tệp CSS — phép quét trượt?`);

  // Phép so phải nhắm COMPOUND CUỐI của selector, vì `overflow` áp cho phần tử
  // mà selector CHỌN. Bản đầu của ca này so "selector có chứa html/body" và báo
  // oan HAI chỗ hợp lệ: `body #sidebar-detail { overflow-x: hidden }` (overflow
  // áp cho CON, không cho body) và `body.rm-sidebar-open { overflow: hidden }`.
  //
  // Chỗ thứ hai là một NGOẠI LỆ CÓ CHỦ ĐÍCH chứ không phải lỗi: khoá cuộn khi
  // một drawer đang mở là khuôn thường dùng, nó chỉ sống trong lúc có class ấy,
  // và nó ở trang dashboard di sản — trang bài học không bao giờ mang class đó.
  // Nên luật là: cấm khi compound cuối là ĐÚNG `html`/`body`, không class không
  // id. Một `overflow` bật/tắt theo class thì nằm ngoài tầm cổng này.
  const laGoc = (compound) => /^(html|body)$/.test(compound.trim());
  const xau = [];
  for (const t of tep) {
    const van = boChuThich(readFileSync(join(thuMuc, t), 'utf8'));
    for (const m of van.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const sel = m[1].split(/[\n;]/).pop().trim();
      // Mỗi selector trong danh sách, lấy compound CUỐI (phần sau khoảng trắng
      // hoặc `>`/`+`/`~` cuối cùng).
      const chon = sel.split(',').map((s) => s.trim().split(/[\s>+~]+/).pop() || '');
      if (!chon.some(laGoc)) continue;
      const than = m[2];
      const ov = /overflow(-x)?\s*:\s*(hidden|auto|scroll)/.exec(than);
      if (ov) xau.push(`${t}: \`${sel}\` đặt \`${ov[0].trim()}\``);
    }
  }
  assert.deepEqual(
    xau, [],
    'một `overflow` khác `visible`/`clip` trên html/body biến gốc trang thành '
    + 'scroll container, và `position: sticky` của hai thanh vỏ bài học thôi ghim '
    + 'theo viewport — đo được: phải cuộn 606px mới tới nút chính. Dù'
    + 'ng `overflow-x: clip` (clip mà KHÔNG tạo scroll container).\n   '
    + xau.join('\n   '),
  );
});

test('gốc trang: phép chống tràn ngang vẫn còn, chỉ đổi cách clip', () => {
  // `clip` giữ nguyên tác dụng chặn cuộn ngang — đo trên production:
  // `scrollWidth` giữ 390 sau khi đổi. Nên mục §6 không được biến mất, chỉ đổi
  // giá trị. Gỡ nó đi là trả lại lỗi tràn ngang mà nó ra đời để chặn.
  const ma = boChuThich(RESP);
  assert.match(ma, /html,\s*body\s*\{\s*overflow-x:\s*clip;?\s*\}/,
    'mục CHỐNG TRÀN NGANG không còn khai `overflow-x: clip` cho html/body');
  // Và KHÔNG khai thêm `overflow-y`: `clip` đi cùng `visible` được, nên một
  // thuộc tính là đủ; khai thêm là đè một thứ có thể do chỗ khác đặt có chủ đích.
  const i = ma.indexOf('html, body { overflow-x: clip');
  assert.ok(i > 0);
  assert.ok(
    !/overflow-y/.test(ma.slice(i, i + 80)),
    'khai thêm overflow-y ở đây là dư: `clip` không buộc trục kia thành `auto`',
  );
});
