/**
 * GIAO DIỆN "ĐÀI THIÊN VĂN" Ở TRANG CHỦ (Góc học) — lớp khoác, và cổng của nó.
 *
 * Chủ dự án (12/11/2026): theme phải phủ cả dashboard lẫn khoá học, không chỉ
 * màn bài học. Trang chủ không đọc một token `--ds-*`/`--edu-*` nào — cảnh có
 * bảng riêng ở `:root` của scene.css (`--glass`, `--amber`…) — nên lớp ghi đè
 * token của theme không chạm tới nó. `scene-thien-van.css` là lớp khoác riêng.
 *
 * Bốn điều cổng này canh, mỗi điều từng là một cách im lặng hỏng:
 *   1. ĐƯỜNG TỚI — tệp CSS được import SAU scene.css. Thiếu là theme "đã dựng"
 *      mà trang chủ y nguyên (lỗi thống trị của repo này, lần thứ mười ba).
 *   2. CẤU TRÚC — mọi selector mở bằng tiền tố theme; không animation, không
 *      `:hover`, không `cursor` (tệp này chỉ khai MÀU, nên ba cổng quét src/ không
 *      có gì để canh ở đây — nếu có thì phải là cổng KHÁC, không lách).
 *   3. TOKEN CÓ THẬT — mọi `--x` tệp này ghi đè phải được scene.css khai ở
 *      `:root`. Đổi tên một token ở scene.css thì lớp khoác thành code chết mà
 *      CSS không báo gì (biến không dùng là biến không ai thấy).
 *   4. TƯƠNG PHẢN — chữ HUD trên "kính" (nền kính hợp thành lên tường tối).
 *
 * Giới hạn: đọc CSS TĨNH. Tranh phòng phía sau kính đổi theo giờ trong ngày, nên
 * nền thật của một panel biến thiên; phép đo ở đây dùng nền TỐI nhất có thể
 * (tường `#1F1110` của tranh và `--ground`) — tức một cận, không phải mọi khung hình.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { boChuThich, moiRule } from './_css-rule.mjs';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const doc = (p) => readFileSync(`${GOC}${p}`, 'utf8');

const TIEN_TO = 'html[data-theme="thien-van"]';

// Sàn tương phản chữ HUD trên kính hợp thành lên tường tối. Chỉ được NÂNG
// (mục `san-chu-hud-trang-chu` trong scripts/nguong-mot-chieu.json).
const SAN_CHU_HUD = 7.5;

const LOP_KHOAC = doc('src/components/goc-hoc/scene-thien-van.css');
const SCENE = boChuThich(doc('src/components/goc-hoc/scene.css'));
const STUDY = doc('src/components/goc-hoc/StudyRoom.tsx');
const SHELL = doc('src/components/goc-hoc/shell.js');

/** Khối token của lớp khoác: các khai báo `--x: v` trong rule mang đúng tiền tố, không kèm phần tử. */
function tokenCuaLopKhoac() {
  const ra = {};
  for (const r of moiRule(LOP_KHOAC)) {
    if (r.media !== null) continue;
    if (!r.sels.includes(TIEN_TO)) continue;
    for (const m of r.than.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) ra[m[1]] = m[2].trim();
  }
  return ra;
}
const TOKEN = tokenCuaLopKhoac();

// ── tương phản ──────────────────────────────────────────────────────────────
const tuyen = (c) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const sangRgb = ([r, g, b]) => 0.2126 * tuyen(r) + 0.7152 * tuyen(g) + 0.0722 * tuyen(b);
const tuongPhan = (a, b) => {
  const x = sangRgb(a);
  const y = sangRgb(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** `#rrggbb` hoặc `rgba(r,g,b,a)` → {rgb, a}. */
function mauCua(v) {
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: 1 };
  }
  const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(v);
  assert.ok(m, `không đọc được màu "${v}"`);
  return { rgb: [+m[1], +m[2], +m[3]], a: +m[4] };
}
/** Màu `fg` (có thể trong suốt) trên nền đặc `bg` → rgb đã hợp thành. */
const hopThanh = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a));

// ═════════════════════════════════════════════════════════════════════════
test('đường tới: StudyRoom import lớp khoác SAU scene.css; panel không còn công tắc giao diện', () => {
  assert.match(STUDY, /import '\.\/scene-thien-van\.css';/, 'StudyRoom.tsx không import scene-thien-van.css: theme đã dựng mà trang chủ y nguyên');
  // phải đứng SAU scene.css: cùng đặc hiệu không đủ, và thứ tự nạp là thứ phân xử khi bằng nhau
  assert.ok(STUDY.indexOf("import './scene-thien-van.css'") > STUDY.indexOf("import './scene.css'"), 'lớp khoác phải nạp SAU scene.css');
  assert.ok(!STUDY.includes('data-tv-surface'), 'StudyRoom còn data-tv-surface: cổng giới hạn theme đã bỏ');
  assert.ok(!/id="tTv"|Giao diện bài học/.test(SHELL), 'panel trang chủ còn công tắc giao diện: chỉ còn một giao diện');
});

test('cấu trúc: mọi selector mở bằng tiền tố theme, không animation, không :hover, không cursor', () => {
  const css = boChuThich(LOP_KHOAC);
  assert.ok(!/@keyframes|animation\s*:|animation-[a-z-]+\s*:|:hover|cursor\s*:|transition\s*:/.test(css), 'lớp khoác chỉ khai MÀU: animation / :hover / cursor / transition thuộc cổng khác');
  const rules = moiRule(LOP_KHOAC);
  assert.ok(rules.length >= 8, `phép bóc chỉ thấy ${rules.length} rule: bộ đọc hỏng`);
  for (const r of rules) {
    for (const s of r.sels) {
      assert.ok(s.startsWith(TIEN_TO), `selector "${s}" không mở bằng ${TIEN_TO}: người dùng lofi sẽ đổi`);
    }
  }
});

test('token có thật: mọi --x lớp khoác ghi đè đều được scene.css khai ở :root', () => {
  const ten = Object.keys(TOKEN);
  assert.ok(ten.length >= 10, `lớp khoác chỉ khai ${ten.length} token: bộ đọc hỏng`);
  const root = /:root\s*\{([^}]*)\}/.exec(SCENE);
  assert.ok(root, 'scene.css không còn :root');
  for (const t of ten) {
    assert.ok(new RegExp(`${t.replace(/[-]/g, '\\-')}\\s*:`).test(root[1]), `${t}: lớp khoác ghi đè một token scene.css KHÔNG khai ở :root (đổi tên rồi? lớp khoác thành code chết)`);
  }
});

test('tương phản: chữ HUD và các màu icon trên kính hợp thành lên tường tối ≥ sàn', () => {
  const tuong = [0x1f, 0x11, 0x10];
  const ground = mauCua(TOKEN['--ground']).rgb;
  const kinh = mauCua(TOKEN['--glass']);
  for (const [ten, nen] of [['tường tranh', tuong], ['--ground', ground]]) {
    const dayKinh = hopThanh(kinh, nen);
    for (const t of ['--ink', '--mute', '--faint', '--amber', '--sky', '--ok', '--sakura', '--lilac']) {
      const m = mauCua(TOKEN[t]);
      const chu = hopThanh(m, dayKinh);
      const r = tuongPhan(chu, dayKinh);
      assert.ok(r >= SAN_CHU_HUD, `${t} trên kính (nền ${ten}) chỉ ${r.toFixed(2)}:1 (sàn ${SAN_CHU_HUD})`);
    }
  }
  // chữ nâu đậm đặt TRÊN nền đồng (huy hiệu cấp, nút Play, nút .btn): AA 4,5
  const dong = mauCua(TOKEN['--amber']).rgb;
  const chuTrenDong = mauCua('#2A1D0A').rgb;
  assert.ok(tuongPhan(chuTrenDong, dong) >= 7, `chữ nâu #2A1D0A trên nền đồng --amber chỉ ${tuongPhan(chuTrenDong, dong).toFixed(2)}:1`);
});
