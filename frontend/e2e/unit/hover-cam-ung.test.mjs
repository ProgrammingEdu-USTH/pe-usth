/**
 * `:hover` DÍNH LẠI SAU CÚ CHẠM — luật cho TOÀN `src/`, không riêng `/ide`.
 *
 * Trên màn cảm ứng, trình duyệt đặt trạng thái `:hover` lúc chạm và KHÔNG gỡ
 * nó khi ngón tay rời, nên mọi khai báo trong một rule `:hover` kẹt lại cho tới
 * khi người dùng chạm chỗ khác. Với một nút đổi `transform` thì nó kẹt ở tư thế
 * nhấc; với một nút đổi `background` thì nó kẹt ở màu "đang trỏ vào".
 *
 * ── Đã TÁI HIỆN, hai lần, hai mức ───────────────────────────────────────────
 * 09/11/2026, hai nút thử cùng khuôn CSS ở 390×844 cảm ứng: nút KHÔNG guard →
 * `:hover` còn **true**, `transform: matrix(1,0,0,1,0,-1)`, `top` 299 thay vì
 * 300; nút CÓ guard → `:hover` **false**, `transform: none`.
 * 10/11/2026, một control THẬT của sản phẩm (nút đổi giao diện ở trang khoá
 * học — chọn trang đó vì nó không gọi `apiFetch` nên không tạo tài khoản
 * khách): nền `rgb(255,255,255)` trước khi chạm, **`rgb(232,240,254)`** sau
 * khi chạm, `:hover` còn true; một nút KHÔNG chạm trong cùng header thì false.
 *
 * `(hover: hover) and (pointer: fine)` đo được **false** dưới cảm ứng, nên
 * guard chặn đúng chỗ. Thiết bị LAI (laptop có màn chạm) vẫn có con trỏ fine
 * nên vẫn được hover — guard không lấy đi gì của ai.
 *
 * ── Vì sao luật này đáng có một cổng riêng ──────────────────────────────────
 * Khối guard từng CÓ trong repo kèm đúng câu giải thích, và `070886a` — commit
 * revert đưa main về `2c12049`, "95 commit thiết kế bị gỡ theo" — cuốn nó đi.
 * Tức đây không phải chuyện chưa ai nghĩ tới, mà là một quyết định đã mất.
 * Đo 10/11/2026 trước khi sửa: **43 rule `:hover` / 13 tệp, chỉ 7 đã guard
 * (16%)**.
 *
 * Ca này THAY ca `:hover` cũ của `ide-thanh-cong-cu.test.mjs` (phủ 2 tệp).
 * Hai cổng hỏi cùng một câu trên hai tập chồng nhau thì không ai biết cái nào
 * là thẩm quyền, và bản hẹp hơn sẽ trôi khỏi bản rộng.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { moiRule } from './_css-rule.mjs';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Mọi `.css` trong `src/`, đường dẫn tương đối kiểu `/`. */
function moiCss(thuMuc = 'src') {
  const ra = [];
  for (const m of readdirSync(join(GOC, thuMuc), { withFileTypes: true })) {
    const p = `${thuMuc}/${m.name}`;
    if (m.isDirectory()) ra.push(...moiCss(p));
    else if (m.name.endsWith('.css')) ra.push(p);
  }
  return ra;
}

/**
 * Tệp CÓ rule `:hover` mà cổng CỐ Ý không phủ, kèm lý do.
 *
 * Hai chiều như mọi danh sách khai khác trong repo: một tệp có `:hover` không
 * guard mà không có tên ở đây là LỖI, và một mục ở đây mà tệp ấy nay đã guard
 * hết (hoặc không còn rule `:hover` nào) cũng là LỖI — thiếu chiều sau thì
 * danh sách chỉ dài ra rồi thành chỗ giấu rác (bài học `DAP_AN_MAU_KHONG_CHAY`).
 */
const NGOAI_TAM = {
  'src/components/goc-hoc/scene.css':
    'Góc học — ràng buộc đứng của vòng lặp cấm đầu tư vào bề mặt này (dashboard / '
    + 'Góc học / minigame / leaderboard: nghiên cứu kết luận bằng chứng hướng âm '
    + 'hoặc không có). 13 rule `:hover`, trong đó `.bk:not(.lock):hover` đổi '
    + '`transform: translateY(-8px)` — tức nó CÓ dính, chỉ là ngoài phạm vi.',
  'src/components/python-studio/studio.module.css':
    'PythonStudio — component đã khai CHẾT-MÀ-GIỮ ở vòng #142 (`/lesson/python` nay '
    + '404 ở MỌI tham số, 0 chỗ mount). 2 rule `:hover`. Sửa CSS của một component '
    + 'không ai tới là việc không có người dùng; nó nằm trong danh sách bốn việc '
    + 'phải làm nếu có ngày hồi sinh demo.',
};

const laGuard = (media) => media !== null
  && media.includes('hover: hover') && media.includes('pointer: fine');

/** Mọi rule `:hover` của một tệp: [{sel, media}]. */
function hoverCua(p) {
  const ra = [];
  for (const r of moiRule(readFileSync(join(GOC, p), 'utf8'))) {
    for (const sel of r.sels) {
      if (sel.includes(':hover')) ra.push({ sel, media: r.media });
    }
  }
  return ra;
}

test('hover cảm ứng: phép duyệt tìm được tệp và rule (tự kiểm)', () => {
  // Duyệt trượt thì mọi luật dưới đạt RỖNG mà không chứng minh gì — đúng cách
  // một cổng tự khai khống độ phủ. Đo 10/11/2026: 17 tệp `.css` trong `src/`,
  // 13 tệp có `:hover`. Sàn đặt THẤP hơn số thật một nhịp: ghim đúng con số thì
  // một đợt dọn tài nguyên chết là đỏ oan.
  const tep = moiCss();
  assert.ok(tep.length >= 10, `chỉ duyệt được ${tep.length} tệp .css trong src/`);
  const coHover = tep.filter((p) => hoverCua(p).length);
  assert.ok(coHover.length >= 8, `chỉ thấy ${coHover.length} tệp có \`:hover\``);
  const tongRule = coHover.reduce((n, p) => n + hoverCua(p).length, 0);
  assert.ok(tongRule >= 30, `chỉ thấy ${tongRule} rule \`:hover\` — phép bóc trượt?`);
});

test('hover cảm ứng: mọi `:hover` nằm trong guard con trỏ thật, hoặc tệp được KHAI', () => {
  const chuaGuard = [];
  const daGuard = new Map();   // tệp -> số rule đã guard
  for (const p of moiCss()) {
    const rs = hoverCua(p);
    if (!rs.length) continue;
    const g = rs.filter((r) => laGuard(r.media)).length;
    if (g) daGuard.set(p, g);
    if (NGOAI_TAM[p]) continue;
    // GOM THEO SELECTOR, không duyệt từng rule — ablate 10/11/2026 tìm ra lỗ của
    // bản đầu: nó viết `if (media khác) continue`, nên một selector mà định nghĩa
    // DUY NHẤT của nó nằm trong `prefers-reduced-motion` thì lọt hoàn toàn (0 đỏ).
    // Ý định của dòng ấy là bỏ qua một OVERRIDE đi KÈM một rule gốc đã guard
    // (`.start:hover { transform: none }`), nhưng nó không phân biệt được
    // "override kèm theo" với "chỗ duy nhất".
    //
    // Luật đúng gọn hơn: mỗi SELECTOR phải có ÍT NHẤT MỘT lần xuất hiện trong
    // guard thật. `.start:hover` có mặt ở cả guard lẫn reduced-motion nên đạt.
    const theoSel = new Map();
    for (const r of rs) {
      if (!theoSel.has(r.sel)) theoSel.set(r.sel, []);
      theoSel.get(r.sel).push(r.media);
    }
    for (const [sel, medias] of theoSel) {
      if (medias.some(laGuard)) continue;
      const cho = medias.map((m) => (m === null ? 'tầng gốc' : `@media ${m}`)).join(' · ');
      chuaGuard.push(`${p} → ${sel}  [${cho}]`);
    }
  }
  assert.deepEqual(
    chuaGuard, [],
    `RULE \`:hover\` KHÔNG NẰM TRONG \`@media (hover: hover) and (pointer: fine)\`:\n   `
    + chuaGuard.join('\n   ')
    + '\n   Trên màn cảm ứng `:hover` DÍNH LẠI sau cú chạm — đo được nút không guard '
    + 'còn `:hover` true và nền hover sau khi ngón tay rời. Bọc nó, hoặc khai cả TỆP '
    + 'vào `NGOAI_TAM` kèm lý do.',
  );

  // Chiều hai: tệp khai NGOÀI TẦM mà nay đã guard hết là ngoại lệ LỖI THỜI.
  const loiThoi = Object.keys(NGOAI_TAM).filter((p) => {
    const rs = hoverCua(p);
    if (rs.length === 0) return true;
    const theoSel = new Map();
    for (const r of rs) theoSel.set(r.sel, [...(theoSel.get(r.sel) || []), r.media]);
    return [...theoSel.values()].every((ms) => ms.some(laGuard));
  });
  assert.deepEqual(
    loiThoi, [],
    `NGOẠI LỆ ĐÃ LỖI THỜI — tệp này nay không còn rule \`:hover\` nào ngoài guard: `
    + `${loiThoi.join(', ')}. Gỡ dòng khai đi, nếu không danh sách chỉ dài ra rồi `
    + 'thành chỗ giấu rác.',
  );

  // Và phép đếm phải THẬT SỰ thấy rule đã guard, nếu không ca này đạt rỗng.
  const tongGuard = [...daGuard.values()].reduce((a, b) => a + b, 0);
  assert.ok(
    tongGuard >= 20,
    `chỉ thấy ${tongGuard} rule \`:hover\` đã guard — phép đọc \`@media\` trượt?`,
  );
});

test('hover cảm ứng: mỗi lý do NGOÀI TẦM phải nói ra số rule và vì sao', () => {
  // Một danh sách ngoại lệ không kèm lý do là danh sách không ai dám dọn — cùng
  // luật mà cổng 44px đã phải đặt cho `CHUA_DO`.
  for (const [p, vi] of Object.entries(NGOAI_TAM)) {
    assert.ok(
      moiCss().includes(p),
      `\`NGOAI_TAM\` khai \`${p}\` nhưng không có tệp nào tên đó trong src/ — `
      + 'tệp đã đổi tên hoặc bị xoá thì gỡ dòng khai.',
    );
    assert.ok(vi.length >= 120, `lý do cho \`${p}\` quá ngắn (${vi.length} ký tự)`);
    assert.match(vi, /\d/, `lý do cho \`${p}\` không mang một con số nào`);
  }
});
