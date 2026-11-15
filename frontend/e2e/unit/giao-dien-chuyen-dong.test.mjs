/**
 * CHUYỂN ĐỘNG CỦA GIAO DIỆN "ĐÀI THIÊN VĂN" — ngân sách, và lời hứa "phải sống".
 *
 * Chủ dự án (12/11/2026): theme chiêm tinh phải có animation như lofi đang chạy
 * trên production. Đo trang chủ lofi: **133 animation vô hạn** (breathe 39, twk
 * ~55, tw 25, city 5, steam 4, blink 1). Số đó tốn ~11% luồng chính trên GPU rời
 * và **62–98% trên điện thoại + CPU 4×** (AGENTS.md, mục độ giật của trang chủ),
 * nên theme KHÔNG sao chép số lượng — nó có một NGÂN SÁCH:
 *
 *   · tối đa BUDGET_VO_HAN animation vô hạn trên màn bài học;
 *   · tối đa BUDGET_DIEN_THOAI trong số đó còn chạy dưới 561px;
 *   · chỉ `opacity` / `transform` (compositor, không layout, không paint);
 *   · MỌI hoạt ảnh của theme tắt được dưới `prefers-reduced-motion`;
 *   · không `forwards`/`both` (giữ trạng thái cuối đè style nội tuyến của màn);
 *   · hai ca TỰ KIỂM: theme phải CÓ chuyển động sự kiện (vào màn) và nền sống.
 *     Ca này là lời hứa với chủ dự án: gỡ hết animation để "cho xanh" thì đỏ.
 *
 * ── Vì sao không dựa vào `giam-chuyen-dong.test.mjs` ─────────────────────────
 * Cổng đó chỉ đòi tắt keyframe DỊCH CHUYỂN (`transform`, `top`, …) và coi hoạt
 * ảnh chỉ đổi `opacity` là vô hại — đúng với một lần nhấp nháy, SAI với một
 * vòng lặp vô hạn: nó vẫn chiếm một lớp compositor và một lượt tính style mỗi
 * khung, và người nhạy cảm vẫn thấy nhấp nháy. Cổng này đòi chặt hơn, riêng cho
 * theme. Nó cũng không đọc longhand (`animation-name`), nên theme cấm longhand.
 *
 * Giới hạn: đọc CSS TĨNH. Chi phí thật đo bằng `document.getAnimations()` và
 * luồng chính ở 390px + CPU 4× (ghi ở AGENTS.md, không ở đây).
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { boChuThich, moiRule } from './_css-rule.mjs';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// ── NGÂN SÁCH (chỉ được HẠ — mỗi hằng có một mục trong nguong-mot-chieu.json) ──
const BUDGET_VO_HAN = 12;
const BUDGET_DIEN_THOAI = 4;

const TIEN_TO = 'html[data-theme="thien-van"]';
const TAT = /animation\s*:\s*none|animation-duration\s*:\s*0(?:\.0*1)?m?s|animation-play-state\s*:\s*paused|display\s*:\s*none/;
/** Khổ "điện thoại" của repo: dưới 561px (xem LessonChrome.module.css, `max-width: 560px`). */
const KHO_DIEN_THOAI = /max-width\s*:\s*(?:[1-4]\d\d|5[0-5]\d|560(?:\.\d+)?)(?:\.\d+)?px/;

function moiCss(thuMuc = 'src') {
  const ra = [];
  for (const m of readdirSync(join(GOC, thuMuc), { withFileTypes: true })) {
    const p = `${thuMuc}/${m.name}`;
    if (m.isDirectory()) ra.push(...moiCss(p));
    else if (m.name.endsWith('.css')) ra.push(p);
  }
  return ra;
}

/** @keyframes → tập thuộc tính nó đổi. */
function keyframes(van) {
  const ra = new Map();
  for (const m of boChuThich(van).matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    const s = boChuThich(van);
    let i = m.index + m[0].length;
    let d = 1;
    while (i < s.length && d > 0) {
      if (s[i] === '{') d += 1;
      else if (s[i] === '}') d -= 1;
      i += 1;
    }
    const than = s.slice(m.index + m[0].length, i - 1);
    const props = new Set();
    for (const p of than.matchAll(/([a-z-]+)\s*:/g)) props.add(p[1]);
    ra.set(m[1], props);
  }
  return ra;
}

/** Mọi hoạt ảnh của theme: [{tep, sel, media, kf, vo_han, giaTri}]. */
function hoatAnhTheme() {
  const ra = [];
  for (const tep of moiCss()) {
    const van = readFileSync(join(GOC, tep), 'utf8');
    const kf = keyframes(van);
    for (const r of moiRule(van)) {
      const ma = /(?:^|[;\s])animation\s*:\s*([^;]+)/.exec(r.than);
      for (const s of r.sels) {
        if (!s.includes(TIEN_TO)) continue;
        if (!ma) continue;
        const gt = ma[1].trim();
        const ten = [...kf.keys()].find((k) => new RegExp(`(?:^|\\s)${k}(?:\\s|$)`).test(gt));
        ra.push({ tep, sel: s, media: r.media, kf: ten ?? null, voHan: /\binfinite\b/.test(gt), gt });
      }
    }
  }
  return ra;
}

/** Selector bị TẮT trong một khối prefers-reduced-motion / khổ điện thoại. */
function tatTrong(tep, dk) {
  const ra = new Set();
  for (const r of moiRule(readFileSync(join(GOC, tep), 'utf8'))) {
    if (!r.media || !dk.test(r.media) || !TAT.test(r.than)) continue;
    for (const s of r.sels) ra.add(s);
  }
  return ra;
}

// `animation: none` là cách TẮT, không phải một hoạt ảnh — bỏ ra, cùng các khối reduced-motion.
const TAT_ANIM = hoatAnhTheme().filter((a) => (a.media === null || !/prefers-reduced-motion/.test(a.media)) && !/^none/.test(a.gt));
const VO_HAN = TAT_ANIM.filter((a) => a.voHan);

test('chuyển động theme: phép đọc tìm được hoạt ảnh, và theme CÓ chuyển động (lời hứa với chủ dự án)', () => {
  assert.ok(moiCss().length >= 10, 'phép duyệt tìm ít hơn 10 tệp .css: bộ đọc hỏng');
  // sự kiện: vào màn
  const vaoMan = TAT_ANIM.filter((a) => /\.stepEnter$/.test(a.sel) && !a.voHan);
  assert.ok(vaoMan.length >= 1, 'theme không có chuyển động VÀO MÀN — lofi có (`stepIn`), theme chiêm tinh phải có bản của nó');
  // nền sống: theo yêu cầu "như lofi". Sàn 3 = quầng đèn + hai lớp sao.
  assert.ok(VO_HAN.length >= 3, `theme chỉ còn ${VO_HAN.length} hoạt ảnh nền (cần ≥ 3): gỡ hết animation để cho xanh là phá yêu cầu "phải có animation như lofi"`);
  for (const a of TAT_ANIM) assert.ok(a.kf, `${a.sel}: không tìm thấy @keyframes cho "${a.gt}" trong ${a.tep}`);
});

test('chuyển động theme: NGÂN SÁCH vô hạn — tổng và trên điện thoại', () => {
  assert.ok(VO_HAN.length <= BUDGET_VO_HAN, `${VO_HAN.length} animation vô hạn > ngân sách ${BUDGET_VO_HAN}: ${VO_HAN.map((a) => a.sel).join(' | ')}`);
  const choDienThoai = VO_HAN.filter((a) => !tatTrong(a.tep, KHO_DIEN_THOAI).has(a.sel));
  assert.ok(choDienThoai.length <= BUDGET_DIEN_THOAI, `${choDienThoai.length} animation vô hạn còn chạy dưới 561px > ngân sách ${BUDGET_DIEN_THOAI}`);
});

test('chuyển động theme: chỉ opacity/transform, không fill both/forwards, không longhand', () => {
  for (const a of TAT_ANIM) {
    const kf = keyframes(readFileSync(join(GOC, a.tep), 'utf8')).get(a.kf);
    for (const p of kf) {
      assert.ok(['opacity', 'transform'].includes(p), `${a.sel} → ${a.kf} đổi "${p}": chỉ opacity/transform (compositor) được phép`);
    }
    assert.ok(!/\b(?:both|forwards)\b/.test(a.gt), `${a.sel}: fill-mode both/forwards giữ trạng thái cuối và đè style nội tuyến của màn — dùng backwards`);
  }
  // longhand: cổng chỉ đọc shorthand `animation:`
  for (const tep of moiCss()) {
    for (const r of moiRule(readFileSync(join(GOC, tep), 'utf8'))) {
      if (!r.sels.some((s) => s.includes(TIEN_TO))) continue;
      assert.ok(!/animation-(?:name|iteration-count)\s*:/.test(r.than), `${tep}: ${r.sels.join(', ')} dùng longhand animation-* — cổng này chỉ đọc shorthand`);
    }
  }
});

test('thước đồng: con trượt chạy bằng transform ≤ 420 ms (không animate left/width), và tắt dưới reduced-motion', () => {
  const tep = 'src/components/lesson-chrome/LessonChrome.module.css';
  const rules = moiRule(readFileSync(join(GOC, tep), 'utf8'));
  const r = rules.find((x) => x.media === null && x.sels.some((s) => s.includes(TIEN_TO) && s.endsWith('.thuoc')));
  assert.ok(r, 'không có .thuoc dưới theme');
  const tr = /transition\s*:\s*([^;]+)/.exec(r.than)?.[1] ?? '';
  assert.match(tr, /^transform\b/, 'con trượt chỉ được chuyển transform, đang là: ' + tr);
  assert.ok(thoiLuongMs(tr) <= 420, 'con trượt ' + thoiLuongMs(tr) + ' ms > 420');
  assert.ok(!/\b(?:left|width)\b/.test(tr), 'không animate left/width (kích hoạt layout)');
  const tat = rules.some((x) => x.media && /prefers-reduced-motion/.test(x.media) && x.sels.some((s) => s.includes(TIEN_TO) && s.endsWith('.thuoc')) && /transition\s*:\s*none/.test(x.than));
  assert.ok(tat, 'con trượt không tắt (transition: none) dưới prefers-reduced-motion');
});

test('vào so le của phương án: backwards, bước ≤ 60 ms, ≤ 6 bậc (Mcq.tsx kẹp), tắt dưới reduced-motion', () => {
  const tep = 'src/components/lesson-chrome/exercises/exercises.module.css';
  const rules = moiRule(readFileSync(join(GOC, tep), 'utf8'));
  const r = rules.find((x) => x.media === null && x.sels.some((s) => s.includes(TIEN_TO) && s.endsWith('.optionCard')));
  assert.ok(r, 'không có hoạt ảnh vào so le trên .optionCard');
  assert.match(r.than, /animation\s*:\s*tvOpt\b[^;]*\bbackwards\b/);
  const buoc = /animation-delay\s*:\s*calc\(\s*var\(--tv-i[^)]*\)\s*\*\s*(\d+)ms\s*\)/.exec(r.than);
  assert.ok(buoc && Number(buoc[1]) <= 60, 'bước so le phải ≤ 60 ms, đang là ' + buoc?.[1]);
  const tsx = readFileSync(join(GOC, 'src/components/lesson-chrome/exercises/Mcq.tsx'), 'utf8');
  const kep = /'--tv-i':\s*Math\.min\(\s*idx\s*,\s*(\d+)\s*\)/.exec(tsx);
  assert.ok(kep && Number(kep[1]) <= 5, 'Mcq.tsx phải kẹp chỉ số so le ≤ 5 (6 bậc), đang là ' + kep?.[1]);
  assert.ok(tatTrong(tep, /prefers-reduced-motion/).has(r.sels.find((s) => s.includes(TIEN_TO))), 'vào so le không tắt dưới prefers-reduced-motion');
});

test('chuyển động theme: MỌI hoạt ảnh tắt được dưới prefers-reduced-motion (kể cả chỉ-opacity)', () => {
  const ho = [];
  for (const a of TAT_ANIM) {
    if (!tatTrong(a.tep, /prefers-reduced-motion/).has(a.sel)) ho.push(`${a.tep} → ${a.sel}`);
  }
  assert.deepEqual(ho, [], `hoạt ảnh của theme không tắt được khi người dùng xin giảm chuyển động:\n${ho.join('\n')}`);
});

test('chuyển động theme: tệp token công khai không chứa animation (để mọi hoạt ảnh đi qua các cổng trong src/)', () => {
  const css = boChuThich(readFileSync(join(GOC, 'public/static/css/theme-thien-van.css'), 'utf8'));
  assert.ok(!/@keyframes|animation\s*:/.test(css), 'theme-thien-van.css không được khai animation: ba cổng chuyển động chỉ quét src/**/*.css');
});

// ── Chuyển động VÀO MÀN: đủ nhanh để không ngáng đường, và "Quay lại" không trượt ──
// Bản đầu `tvSlip` 520 ms / 20px / -0,5° — mỗi lần bấm "Tiếp theo" người học đợi
// nửa giây cho tờ giấy đặt xuống. Trần 320 ms: dưới ngưỡng ~0,3 s mà người ta
// còn coi là "tức thì" (Nielsen); 12px và 0,4° giữ cú trượt đủ thấy mà không lắc.
// "Quay lại" là hành động LÙI: nếu vẫn trượt từ dưới lên thì trông như đi tiếp.
const TRAN_TVSLIP_MS = 320;
const TRAN_TVSLIP_PX = 12;
const TRAN_TVSLIP_DO = 0.4;
const TRAN_LUI_MS = 120;

/** Giải `var(--x)` bằng khai báo đầu tiên của --x trong tệp token (đủ cho giá trị một-nấc). */
function giaiVar(gt) {
  const tok = boChuThich(readFileSync(join(GOC, 'public/static/css/theme-thien-van.css'), 'utf8'));
  return gt.replace(/var\((--[\w-]+)\)/g, (_, ten) => {
    const m = new RegExp(`${ten}\s*:\s*([^;]+);`).exec(tok);
    assert.ok(m, `không giải được ${ten}`);
    return m[1].trim();
  });
}
function thoiLuongMs(gt) {
  const m = /(?:^|\s)(\d*\.?\d+)(ms|s)(?=\s|$)/.exec(giaiVar(gt));
  assert.ok(m, `không đọc được thời lượng trong "${gt}"`);
  return m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1]);
}
function khungDau(tep, ten) {
  const van = boChuThich(readFileSync(join(GOC, tep), 'utf8'));
  const i = van.indexOf(`@keyframes ${ten}`);
  assert.ok(i >= 0, `thiếu @keyframes ${ten}`);
  const j = van.indexOf('{', i);
  let d = 1;
  let k = j + 1;
  while (k < van.length && d > 0) {
    if (van[k] === '{') d += 1;
    else if (van[k] === '}') d -= 1;
    k += 1;
  }
  return van.slice(j + 1, k - 1);
}
const CHROME = 'src/components/lesson-chrome/LessonChrome.module.css';
const anh = (re) => TAT_ANIM.find((a) => a.tep === CHROME && re.test(a.sel));

test('chuyển động theme: tvSlip ≤ 320 ms, trượt ≤ 12px, xoay ≤ 0,4°', () => {
  const a = anh(/\.stepEnter$/);
  assert.ok(a && a.kf === 'tvSlip', 'không tìm thấy hoạt ảnh vào màn tvSlip');
  assert.ok(thoiLuongMs(a.gt) <= TRAN_TVSLIP_MS, `tvSlip ${thoiLuongMs(a.gt)} ms > ${TRAN_TVSLIP_MS}`);
  const kf = khungDau(CHROME, 'tvSlip');
  const px = /translateY\(\s*(-?[\d.]+)px/.exec(kf);
  const do_ = /rotate\(\s*(-?[\d.]+)deg/.exec(kf);
  assert.ok(px && Math.abs(Number(px[1])) <= TRAN_TVSLIP_PX, `tvSlip trượt ${px?.[1]}px > ${TRAN_TVSLIP_PX}`);
  assert.ok(do_ && Math.abs(Number(do_[1])) <= TRAN_TVSLIP_DO, `tvSlip xoay ${do_?.[1]}° > ${TRAN_TVSLIP_DO}`);
});

test('chuyển động theme: "Quay lại" chỉ mờ vào ≤ 120 ms, không translate/rotate, và tắt dưới reduced-motion', () => {
  const a = anh(/\.stepEnter\[data-huong="lui"\]$/);
  assert.ok(a, 'thiếu hoạt ảnh riêng cho .stepEnter[data-huong="lui"] — lùi mà vẫn trượt từ dưới lên thì trông như đi tiếp');
  assert.ok(thoiLuongMs(a.gt) <= TRAN_LUI_MS, `đi lùi ${thoiLuongMs(a.gt)} ms > ${TRAN_LUI_MS}`);
  const kf = khungDau(CHROME, a.kf);
  assert.ok(!/transform|translate|rotate|scale/.test(kf), `keyframe đi lùi (${a.kf}) không được dịch chuyển`);
  // LessonChrome.tsx phải thật sự đặt thuộc tính, nếu không CSS là code chết
  const tsx = boChuThich(readFileSync(join(GOC, 'src/components/lesson-chrome/LessonChrome.tsx'), 'utf8'));
  assert.ok(/data-huong=\{[^}]*'lui'/.test(tsx), 'LessonChrome.tsx không đặt data-huong="lui" khi lùi');
  assert.ok(/step\s*<\s*buocTruoc/.test(tsx), 'hướng lùi phải suy từ step < bước trước');
});
