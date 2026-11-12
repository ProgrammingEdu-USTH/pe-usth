/**
 * GIẢM CHUYỂN ĐỘNG — mọi hoạt ảnh DỊCH CHUYỂN phải tắt được, hoặc tệp phải KHAI.
 *
 * WCAG 2.3.3 (Animation from Interactions): chuyển động do tương tác phải tắt
 * được, trừ khi nó là thiết yếu. Người có rối loạn tiền đình thấy chóng mặt vì
 * những cú trượt/xoay/phóng mà người khác không để ý.
 *
 * ── Vì sao luật nhắm vào DỊCH CHUYỂN, không nhắm mọi `@keyframes` ───────────
 * Bản đo đầu của tôi đòi MỌI keyframe phải tắt, và nó báo oan ngay: `pe-burst-life`
 * trong `studio-chrome.module.css` là `from { opacity: 1 } to { opacity: 1 }` —
 * nó KHÔNG đổi một pixel nào, nó là một bộ đếm thời gian 1,8 s dùng `forwards`
 * để JS biết lúc nào gỡ phần tử. Bắt nó khai ngoại lệ là bắt người ta khai một
 * thứ không phải chuyển động. `blink` (chỉ `opacity`) cũng vậy: một chỗ nhấp
 * nháy không phải thứ gây chóng mặt.
 *
 * Nên luật là: keyframe nào đổi `transform` (hoặc `top`/`left`/`right`/`bottom`/
 * `width`/`height`/`margin`) thì nó DỊCH CHUYỂN, và selector chạy nó phải được
 * tắt trong một khối `prefers-reduced-motion`.
 *
 * ── Khe đã đo, 10/11/2026 ───────────────────────────────────────────────────
 * 7 tệp có keyframe dịch chuyển; 6 tệp đủ; **1 khe thật**:
 * `feedbackIn → .feedbackBanner` (băng phản hồi sau khi chấm, trượt lên 12px,
 * hiện ở MỌI lần nộp bài được chấm — 143 bài).
 *
 * Bằng chứng không phải một nguyên tắc nhập khẩu: nó nằm ngay trong chính file
 * ấy. `consoleIn` chỉ trượt **4px** và khối reduced-motion ĐÃ tắt nó. Một cú
 * trượt 12px không tắt là lệch với quyết định mà tác giả file đã ra.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { moiRule } from './_css-rule.mjs';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function moiCss(thuMuc = 'src') {
  const ra = [];
  for (const m of readdirSync(join(GOC, thuMuc), { withFileTypes: true })) {
    const p = `${thuMuc}/${m.name}`;
    if (m.isDirectory()) ra.push(...moiCss(p));
    else if (m.name.endsWith('.css')) ra.push(p);
  }
  return ra;
}

/** Thân rule có TẮT hoạt ảnh không? Bốn cách đều tính — repo dùng cả bốn. */
const TAT = /animation\s*:\s*none|animation-duration\s*:\s*0(?:\.0*1)?m?s|animation-play-state\s*:\s*paused|display\s*:\s*none/;

/** Khai báo nào làm một keyframe DỊCH CHUYỂN (chứ không chỉ đổi màu/độ mờ). */
const DICH = /transform\s*:|(?:^|[;{\s])(?:top|left|right|bottom|width|height|margin)\s*:/;

/**
 * Tệp có keyframe dịch chuyển mà cổng CỐ Ý không phủ, kèm lý do.
 *
 * Hai chiều, như mọi danh sách khai khác: một tệp hở mà không có tên ở đây là
 * LỖI, và một mục ở đây mà tệp ấy nay đã tắt hết (hoặc không còn keyframe dịch
 * chuyển nào) cũng là LỖI.
 */
const NGOAI_TAM = {
  'src/components/goc-hoc/scene.css':
    'Góc học — ràng buộc đứng của vòng lặp cấm đầu tư vào bề mặt này. VÀ nó KHÔNG '
    + 'hở thật: 9 keyframe dịch chuyển của nó tắt qua một class `.rm` do nút "Giảm '
    + 'chuyển động" trong cảnh bật (scene.css dòng 623+, `animation-play-state: '
    + 'paused`), chứ không qua media query — nên phép quét theo `@media` của cổng '
    + 'này mù với nó. Đo 07/11/2026: bật nút ấy tạm dừng 127/131 hoạt ảnh.',
};

/** keyframe nào trong file này DỊCH CHUYỂN. */
function keyframeDich(van) {
  const ra = new Set();
  for (const m of van.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    let i = m.index + m[0].length;
    let d = 1;
    while (i < van.length && d > 0) {
      if (van[i] === '{') d += 1;
      else if (van[i] === '}') d -= 1;
      i += 1;
    }
    if (DICH.test(van.slice(m.index, i))) ra.add(m[1]);
  }
  return ra;
}

/** [{kf, sels}] — selector nào CHẠY một keyframe dịch chuyển (ngoài khối RM). */
function cheChay(rules, dich) {
  const ra = new Map();
  for (const r of rules) {
    if (r.media && /prefers-reduced-motion/.test(r.media)) continue;
    const m = /animation\s*:\s*([^;]+)/.exec(r.than);
    if (!m) continue;
    for (const k of dich) {
      if (!new RegExp(`\\b${k}\\b`).test(m[1])) continue;
      if (!ra.has(k)) ra.set(k, new Set());
      for (const s of r.sels) ra.get(k).add(s);
    }
  }
  return ra;
}

/** selector nào được TẮT trong một khối `prefers-reduced-motion`. */
function daTat(rules) {
  const ra = new Set();
  for (const r of rules) {
    if (!r.media || !/prefers-reduced-motion/.test(r.media)) continue;
    if (!TAT.test(r.than)) continue;
    for (const s of r.sels) ra.add(s);
  }
  return ra;
}

/** Mọi khe của một tệp: [`<keyframe> → <selector>`]. */
function heCua(p) {
  const van = readFileSync(join(GOC, p), 'utf8');
  const dich = keyframeDich(van);
  if (!dich.size) return [];
  const rules = moiRule(van);
  const tat = daTat(rules);
  const ra = [];
  for (const [k, sels] of cheChay(rules, dich)) {
    for (const s of sels) if (!tat.has(s)) ra.push(`${k} → ${s}`);
  }
  return ra;
}

test('giảm chuyển động: phép duyệt tìm được tệp, keyframe và khối RM (tự kiểm)', () => {
  // Duyệt trượt thì mọi luật dưới đạt RỖNG mà không chứng minh gì. Sàn đặt
  // THẤP hơn số thật một nhịp: ghim đúng con số thì một đợt dọn là đỏ oan.
  const tep = moiCss();
  assert.ok(tep.length >= 10, `chỉ duyệt được ${tep.length} tệp .css trong src/`);
  const coDich = tep.filter((p) => keyframeDich(readFileSync(join(GOC, p), 'utf8')).size);
  assert.ok(coDich.length >= 5, `chỉ thấy ${coDich.length} tệp có keyframe dịch chuyển`);
  const coKhoi = tep.filter((p) => /prefers-reduced-motion/.test(readFileSync(join(GOC, p), 'utf8')));
  assert.ok(coKhoi.length >= 6, `chỉ thấy ${coKhoi.length} tệp có khối reduced-motion`);
});

test('giảm chuyển động: mọi hoạt ảnh DỊCH CHUYỂN tắt được, hoặc tệp được KHAI', () => {
  const ho = [];
  for (const p of moiCss()) {
    if (NGOAI_TAM[p]) continue;
    for (const h of heCua(p)) ho.push(`${p} → ${h}`);
  }
  assert.deepEqual(
    ho, [],
    'HOẠT ẢNH DỊCH CHUYỂN KHÔNG TẮT ĐƯỢC dưới `prefers-reduced-motion`:\n   '
    + ho.join('\n   ')
    + '\n   WCAG 2.3.3: chuyển động do tương tác phải tắt được. Thêm selector vào '
    + 'khối `@media (prefers-reduced-motion: reduce)` của chính file đó '
    + '(`animation: none` hoặc `animation-duration: 0.01ms`), hoặc khai cả TỆP vào '
    + '`NGOAI_TAM` kèm lý do.',
  );

  // Chiều hai: tệp khai NGOÀI TẦM mà nay không còn khe là ngoại lệ LỖI THỜI.
  const loiThoi = Object.keys(NGOAI_TAM).filter((p) => heCua(p).length === 0);
  assert.deepEqual(
    loiThoi, [],
    `NGOẠI LỆ ĐÃ LỖI THỜI — tệp này nay không còn hoạt ảnh dịch chuyển nào ngoài `
    + `khối reduced-motion: ${loiThoi.join(', ')}. Gỡ dòng khai đi.`,
  );

  // Và phép đếm phải THẬT SỰ thấy selector đã tắt, nếu không ca này đạt rỗng.
  const tongTat = moiCss()
    .reduce((n, p) => n + daTat(moiRule(readFileSync(join(GOC, p), 'utf8'))).size, 0);
  assert.ok(tongTat >= 10, `chỉ thấy ${tongTat} selector đã tắt — phép đọc trượt?`);
});

test('giảm chuyển động: keyframe chỉ đổi MÀU/ĐỘ MỜ thì KHÔNG bị đòi', () => {
  /*
   * Đây là luật giữ cho cổng khỏi kêu oan, và nó có một ca cụ thể: `pe-burst-life`
   * là `from { opacity: 1 } to { opacity: 1 }` — một bộ đếm thời gian 1,8 s dùng
   * `forwards`, KHÔNG đổi một pixel nào. Bản đo đầu của tôi đòi mọi keyframe phải
   * tắt và nó báo oan đúng chỗ này.
   *
   * Ca kiểm trên CHUỖI, không trên file thật: một ngày ai đó xoá `pe-burst-life`
   * thì luật vẫn phải đúng, và một ca đọc file sẽ chết theo nội dung.
   */
  const chiMo = '@keyframes x { from { opacity: 0; } to { opacity: 1; } }';
  const coDich = '@keyframes y { from { transform: translateY(12px); } to { transform: none; } }';
  const mauNen = '@keyframes z { 50% { background: red; color: blue; } }';
  assert.deepEqual([...keyframeDich(chiMo)], [], 'keyframe chỉ đổi độ mờ KHÔNG phải dịch chuyển');
  assert.deepEqual([...keyframeDich(mauNen)], [], 'keyframe chỉ đổi màu KHÔNG phải dịch chuyển');
  assert.deepEqual([...keyframeDich(coDich)], ['y'], 'keyframe đổi `transform` PHẢI bị tính');
  // và `top`/`height` cũng là dịch chuyển, không chỉ `transform`
  assert.deepEqual([...keyframeDich('@keyframes t { to { top: 20px; } }')], ['t']);
  assert.deepEqual([...keyframeDich('@keyframes h { to { height: 0; } }')], ['h']);
});
