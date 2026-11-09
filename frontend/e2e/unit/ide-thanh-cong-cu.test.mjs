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

const GUARD = '(hover: hover) and (pointer: fine)';

/**
 * Rule `:hover` được phép NGOÀI guard, kèm lý do.
 *
 * Hai chiều như mọi danh sách khai khác: một rule `:hover` không guard mà
 * không có tên ở đây là LỖI, và một mục ở đây mà rule ấy đã vào guard (hoặc
 * không còn) cũng là LỖI — nếu không thì danh sách chỉ dài ra rồi thành chỗ
 * giấu rác (bài học `DAP_AN_MAU_KHONG_CHAY`).
 */
const NGOAI_GUARD = {
  // (trống — sáu rule của hai tệp đều đã vào guard ngày 10/11/2026)
};

/**
 * `@media` KHÔNG tính là guard, kèm lý do — chúng là OVERRIDE, không phải
 * trạng thái gốc. `prefers-reduced-motion` tắt `transform` cho người đã nói
 * "ít chuyển động"; nó không nói gì về việc có con trỏ hay không, nên một rule
 * `:hover` chỉ nằm trong đó thì vẫn dính sau cú chạm.
 */
const KHONG_PHAI_GUARD = /prefers-reduced-motion|max-width|min-width|forced-colors/;

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

test('thanh công cụ /ide: mọi `:hover` phải nằm trong guard con trỏ thật', () => {
  const chuaGuard = [];
  const daGuard = new Set();
  for (const [p, rs] of Object.entries(RULES)) {
    for (const r of rs) {
      const sels = r.sels.filter((s) => s.includes(':hover'));
      if (!sels.length) continue;
      const laGuard = r.media !== null
        && r.media.includes('hover: hover') && r.media.includes('pointer: fine');
      for (const s of sels) {
        if (laGuard) { daGuard.add(s); continue; }
        // Trong một override đã khai (reduced-motion…) thì không tính là thiếu
        // guard — nhưng nó cũng KHÔNG làm cho rule gốc được miễn.
        if (r.media !== null && KHONG_PHAI_GUARD.test(r.media)) continue;
        if (NGOAI_GUARD[s]) continue;
        chuaGuard.push(`${p} → ${s}` + (r.media ? ` [@media ${r.media}]` : ''));
      }
    }
  }
  assert.deepEqual(
    chuaGuard, [],
    `RULE \`:hover\` KHÔNG NẰM TRONG \`@media ${GUARD}\`:\n   `
    + chuaGuard.join('\n   ')
    + '\n   Trên màn cảm ứng `:hover` DÍNH LẠI sau cú chạm — đo 10/11/2026: nút '
    + 'không guard còn `:hover` true và `transform: matrix(1,0,0,1,0,-1)` sau khi '
    + 'ngón tay rời. Bọc nó, hoặc khai vào `NGOAI_GUARD` kèm lý do.',
  );
  // Chiều hai: mục khai mà rule ấy đã vào guard là ngoại lệ LỖI THỜI.
  const loiThoi = Object.keys(NGOAI_GUARD).filter((s) => daGuard.has(s));
  assert.deepEqual(
    loiThoi, [],
    `NGOẠI LỆ ĐÃ LỖI THỜI — đã vào guard rồi: ${loiThoi.join(', ')}. Gỡ dòng khai.`,
  );
  // Và phép đếm phải THẬT SỰ thấy các rule đã guard, nếu không ca này đạt rỗng.
  assert.ok(
    daGuard.size >= 6,
    `chỉ thấy ${daGuard.size} rule \`:hover\` đã guard — phép đọc \`@media\` trượt?`,
  );
});
