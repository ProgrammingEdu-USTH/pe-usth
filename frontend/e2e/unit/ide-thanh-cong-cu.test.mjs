/**
 * THANH CÔNG CỤ /ide — căn hàng, thứ bậc, và trạng thái `:hover` trên cảm ứng.
 *
 * Ba trục này KHÔNG trùng cổng nào đang có. `dich-bam-vo-bai-hoc.test.mjs` canh
 * SÀN 44px ở khổ ĐIỆN THOẠI (`hieuLuc` giải giá trị trong `max-width`), nên nó
 * mù với việc bốn control cùng một hàng lệch nhau ở DESKTOP. `ds-contrast` canh
 * màu và tương phản, không canh thứ bậc. Và không cổng nào đọc `@media` của một
 * rule `:hover`.
 *
 * ── Vì sao bốn control này là MỘT hàng ───────────────────────────────────────
 * `.visualizeSlot { display: contents }` (ide.module.css) nên nút "Xem từng
 * bước" của CodeVisualizer trở thành con TRỰC TIẾP của `.actions`, đứng cùng
 * hàng flex với `.select`, `.run` và `.stop`. Hai nửa ấy ở HAI TỆP, nên chúng
 * trôi được — và đã trôi: đo trên production ở 1442px ngày 10/11/2026,
 * `.select` 42 · `.run` 42 · `.start` **38**, top 92/bot 130 so với 90/132.
 *
 * ── `:hover` dính sau cú chạm ────────────────────────────────────────────────
 * Tái hiện cùng ngày ở 390×844 cảm ứng, bằng hai nút thử cùng khuôn CSS: chạm
 * nút KHÔNG guard rồi đọc lại → `:hover` còn **true** và
 * `transform: matrix(1,0,0,1,0,-1)`, tức nút KẸT ở trạng thái nhấc; nút CÓ
 * guard → `:hover` false, `transform: none`. `(hover: hover) and
 * (pointer: fine)` đo được **false** dưới cảm ứng, nên guard chặn đúng chỗ.
 * Sáu rule `:hover` của hai tệp này đều KHÔNG guard trước vòng 10/11/2026 —
 * khối guard từng có ở merge-base kèm đúng câu giải thích, và `070886a` (đưa
 * main về `2c12049`, "95 commit thiết kế bị gỡ theo") gỡ nó đi.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { moiRule, px } from './_css-rule.mjs';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const TEP_IDE = 'src/app/ide/ide.module.css';
const TEP_CV = 'src/components/code-visualizer/CodeVisualizer.module.css';

const doc = (p) => readFileSync(join(GOC, p), 'utf8');
const RULES = { [TEP_IDE]: moiRule(doc(TEP_IDE)), [TEP_CV]: moiRule(doc(TEP_CV)) };

/** Giá trị khai ở TẦNG GỐC (ngoài mọi `@media`) — khác `hieuLuc` của cổng 44px,
 *  thứ cố ý giải về khổ điện thoại. Ở đây câu hỏi là desktop. */
function coBan(p, sel, prop) {
  for (const r of RULES[p]) {
    if (r.media !== null || !r.sels.includes(sel)) continue;
    const v = px(r.than, prop);
    if (v !== null) return v;
  }
  return null;
}

/** Thân rule ở tầng gốc của một selector, gộp lại. */
function thanCoBan(p, sel) {
  return RULES[p].filter((r) => r.media === null && r.sels.includes(sel))
    .map((r) => r.than).join(';');
}

test('thanh công cụ /ide: phép đọc tìm được hai tệp và các rule (tự kiểm)', () => {
  // Đọc hoặc duyệt trượt thì mọi luật dưới đạt RỖNG mà không chứng minh gì.
  for (const [p, rs] of Object.entries(RULES)) {
    assert.ok(rs.length >= 30, `${p}: phép duyệt rule trượt, chỉ thấy ${rs.length}`);
  }
  const hover = Object.values(RULES).flat()
    .filter((r) => r.sels.some((s) => s.includes(':hover')));
  assert.ok(hover.length >= 6, `chỉ thấy ${hover.length} rule \`:hover\` — trượt?`);
  // Và `.visualizeSlot { display: contents }` LÀ tiền đề của ca căn hàng: không
  // có nó thì nút kia không nằm cùng hàng và cả ca ấy mất lý do tồn tại.
  assert.match(
    thanCoBan(TEP_IDE, '.visualizeSlot'), /display\s*:\s*contents/,
    '`.visualizeSlot` thôi dùng `display: contents` — nút "Xem từng bước" không '
    + 'còn là con trực tiếp của `.actions`, nên ca căn hàng dưới đây phải xem lại.',
  );
});

test('thanh công cụ /ide: bốn control CÙNG một hàng phải khai CÙNG chiều cao', () => {
  // Con số KHÔNG ghim: ca này ghim QUAN HỆ (bốn cái bằng nhau). Ghim 42 thì một
  // đợt đổi thang chiều cao là đỏ oan ở bốn chỗ, mà thứ thật sự hỏng chỉ xảy ra
  // khi chúng LỆCH nhau. Sàn 44px ở khổ điện thoại là cổng KHÁC
  // (`dich-bam-vo-bai-hoc.test.mjs`), đừng ghim lại ở đây.
  const HANG = [[TEP_IDE, '.select'], [TEP_IDE, '.run'], [TEP_IDE, '.stop'],
                [TEP_CV, '.start']];
  const cao = HANG.map(([p, sel]) => {
    const v = coBan(p, sel, 'height') ?? coBan(p, sel, 'min-height');
    assert.ok(
      v !== null,
      `\`${sel}\` (${p}) không khai chiều cao nào ở tầng gốc — nó đứng cùng hàng `
      + 'flex với ba control kia, nên chiều cao do nội dung quyết là chiều cao sẽ lệch.',
    );
    return [sel, v];
  });
  const khac = new Set(cao.map(([, v]) => v));
  assert.equal(
    khac.size, 1,
    'BỐN CONTROL CÙNG HÀNG KHAI CHIỀU CAO KHÁC NHAU: '
    + cao.map(([s, v]) => `${s} ${v}`).join(' · ')
    + `. Chúng nằm cùng hàng flex (\`.visualizeSlot { display: contents }\`) với `
    + '`align-items: center`, nên lệch là thụt mép. Đo 10/11/2026: `.start` 38 '
    + 'trong khi ba cái kia 42. Nếu đổi thang thì đổi CẢ BỐN — và đừng lấy con số '
    + 'của nhánh `test` (52 ở đó), vì thanh công cụ bên ấy đã thiết kế lại.',
  );
});

test('thanh công cụ /ide: "Xem từng bước" là nút PHỤ, không phải nút chính thứ hai', () => {
  // Ghim THỨ BẬC, không ghim mã màu — cùng khuôn ca "nền code phải ẤM" của
  // `ds-contrast`. Trước 10/11/2026 cả hai nút cùng `background: var(--ds-action)`,
  // cùng bóng, cùng bán kính: đo trên production ra CẢ HAI `rgb(31, 95, 224)`.
  // "Chạy" là việc của trang; "Xem từng bước" là đọc lại thứ vừa chạy.
  const than = thanCoBan(TEP_CV, '.start');
  const nenRun = /background\s*:\s*([^;]+)/.exec(thanCoBan(TEP_IDE, '.run'));
  assert.ok(nenRun, '`.run` không khai `background` — ca này so với nó, nên sửa ca.');
  assert.ok(
    !than.includes(nenRun[1].trim()),
    `\`.start\` dùng CÙNG nền với \`.run\` (${nenRun[1].trim()}) — hai nút trông `
    + 'chính ngang nhau. Nút phụ phải nói ra thứ bậc (viền + nền trong suốt), '
    + 'không mượn nền của nút chính.',
  );
  assert.match(
    than, /background\s*:\s*transparent/,
    '`.start` thôi dùng nền trong suốt — xem lý lẽ thứ bậc ở chú thích của nó.',
  );
  // Và KHÔNG bóng: một mặt NỔI là dấu của nút chính.
  assert.ok(
    !/box-shadow/.test(than),
    '`.start` lại có `box-shadow` — bóng là dấu của mặt NỔI, tức của nút chính.',
  );
  // Ink phải ẤM (R >= B), đúng luật bảng lofi: `--ds-ink` là #0F1B33, navy LẠNH.
  assert.ok(
    !than.includes('var(--ds-ink)'),
    '`.start` dùng `var(--ds-ink)` = #0F1B33 — navy LẠNH (B > R) trên trang giấy '
    + 'kem. Tệp này vốn dùng `--edu-t1` (#2A2018, 13,8:1 trên #F4EEE3).',
  );
});

// Ca `:hover` của /ide đã DỜI sang `hover-cam-ung.test.mjs` ngày 10/11/2026.
// Ở đây nó phủ 2 tệp; ca mới phủ MỌI `.css` trong `src/` (đo khi dời: 43 rule
// `:hover` / 13 tệp, 7 đã guard). Giữ cả hai là để hai cổng hỏi cùng một câu
// trên hai tập chồng nhau — không ai biết cái nào là thẩm quyền, và bản hẹp
// hơn sẽ trôi khỏi bản rộng.
test('thanh công cụ /ide: hai khung có dải tiêu đề, và nó ẤM — không phải bộ token lạnh của nhánh `test`', () => {
  /*
   * Port từ `tester/test` ngày 10/11/2026. Thứ đáng port là CẤU TRÚC (hai mặt
   * phẳng trắng cạnh nhau mà không gì gọi tên chúng — "hai tấm thẻ trắng trống
   * không"); thứ KHÔNG đáng port là bảng màu, vì cả ba token bên ấy dùng đều
   * LẠNH trên trang giấy kem #F4EEE3 của main:
   *
   *   --ds-tint  #E8F0FE   --ds-soft  #3A4A66   --ds-line  #CFD9E8
   *
   * Đây là lần THỨ HAI cùng lớp lỗi chặn được một bản port mù từ nhánh đó —
   * lần trước là `--ds-ink` #0F1B33 cho nút "Xem từng bước". Ca này ghim
   * QUYẾT ĐỊNH ấy, không ghim mã màu: luật là kênh đỏ >= kênh xanh dương,
   * cùng khuôn ca "nền code phải ẤM" của `ds-contrast`.
   */
  const CSS_IDE = doc(TEP_IDE);
  const TSX = readFileSync(join(GOC, 'src/app/ide/IdeClient.tsx'), 'utf8');

  // 1. cả HAI khung phải dựng một dải — một cái thôi là nửa bản sửa
  const n = TSX.split('styles.paneHead').length - 1;
  assert.equal(
    n, 2,
    `\`styles.paneHead\` dựng ${n} lần trong IdeClient.tsx, phải 2 (khung soạn `
    + 'thảo và khung kết quả). Một dải thôi là nửa bản sửa — khung kia lại thành '
    + 'một tấm thẻ trắng không tên.',
  );
  // và cả hai phải ẩn với trình đọc màn hình: hai `<section>` ĐÃ có aria-label
  // nói đúng điều dải nói, nên để nó đọc được là bắt nó đọc hai lần.
  const an = TSX.split('className={styles.paneHead} aria-hidden="true"').length - 1;
  assert.equal(an, 2, `chỉ ${an}/2 dải mang \`aria-hidden\` — xem chú thích tại chỗ.`);

  // 2. dải KHÔNG được mang bộ token lạnh của nhánh `test`
  const than = thanCoBan(TEP_IDE, '.paneHead');
  assert.ok(than, '`.paneHead` không có rule nào ở tầng gốc của ide.module.css');
  for (const t of ['--ds-tint', '--ds-soft', '--ds-line']) {
    assert.ok(
      !than.includes(`var(${t})`),
      `\`.paneHead\` dùng \`var(${t})\` — đó là bộ token LẠNH của nhánh \`test\` `
      + '(#E8F0FE · #3A4A66 · #CFD9E8, B > R) trên một trang giấy kem #F4EEE3. '
      + 'Dùng `--edu-t2` / `--edu-bg-solid` / `--edu-card-line`.',
    );
  }

  // 3. ba màu nó DÙNG phải ẤM — đọc giá trị thật từ edu-theme.css, không ghim mã
  const THEME = readFileSync(join(GOC, 'public/static/css/edu-theme.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');   // bỏ chú thích: một câu văn xuôi nhắc
  const NGAY = THEME.slice(0, THEME.indexOf('body.dark {'));  // tên token đã làm
  const mau = (ten) => {                                       // cổng đỏ oan 3 lần
    const i = NGAY.indexOf(ten + ':');
    assert.ok(i >= 0, `khối NGÀY của edu-theme.css không khai ${ten}`);
    const m = /^\s*(#[0-9a-fA-F]{6})\s*;/.exec(NGAY.slice(i + ten.length + 1, i + ten.length + 40));
    assert.ok(m, `${ten} ở khối NGÀY không phải một mã màu`);
    return [1, 3, 5].map((k) => parseInt(m[1].slice(k, k + 2), 16));
  };
  for (const ten of ['--edu-t2', '--edu-bg-solid', '--edu-card-line']) {
    assert.ok(
      than.includes(`var(${ten})`),
      `\`.paneHead\` thôi dùng \`var(${ten})\` — ba màu của dải phải đến từ bảng ấm.`,
    );
    const [r, , b] = mau(ten);
    assert.ok(
      r >= b,
      `${ten} nay có kênh xanh dương (${b}) cao hơn kênh đỏ (${r}) — dải tiêu đề `
      + 'của /ide đọc màu từ nó, và bảng lofi đòi ẤM.',
    );
  }

  // 4. phần cuộn phải ở THÂN, không ở pane: pane giữ `overflow: hidden` của rule
  //    dùng chung để bo góc 16px cắt đúng hai đầu dải.
  assert.ok(
    !/overflow\s*:\s*auto/.test(thanCoBan(TEP_IDE, '.outputPane')),
    '`.outputPane` lại tự đặt `overflow: auto` — nó đè `hidden` của rule dùng '
    + 'chung, và khi đó dải tiêu đề thò ra ngoài bo góc. Phần cuộn thuộc `.outputBody`.',
  );
  assert.match(
    thanCoBan(TEP_IDE, '.outputBody'), /overflow\s*:\s*auto/,
    '`.outputBody` phải là chỗ cuộn — nếu không thì kết quả dài đẩy vỡ khung.',
  );
  // và phép đọc phải THẬT SỰ thấy ba rule, nếu không mọi luật trên đạt rỗng
  for (const sel of ['.paneHead', '.editorBody', '.outputBody']) {
    assert.ok(thanCoBan(TEP_IDE, sel).length > 10, `không đọc được rule \`${sel}\``);
  }
  assert.ok(CSS_IDE.length > 3000, 'ide.module.css quá ngắn — đọc trượt?');
});
