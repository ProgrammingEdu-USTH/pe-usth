// BACKTEST GIAO DIỆN: bốn tổ hợp (lofi / Đài thiên văn × ngày / đêm) × hai khổ (1280 / 390) trên các
// trang chính, bằng Chromium THẬT. Đo hai thứ mà cổng tĩnh không đo được:
//   (1) TRÀN NGANG: scrollWidth > innerWidth;
//   (2) TƯƠNG PHẢN CHỮ: mọi phần tử đang hiện có chữ trực tiếp, so màu chữ với nền ĐÃ HỢP THÀNH
//       (cộng alpha dọc cây tổ tiên — bài học "đo tương phản phải hợp thành alpha thật"), ngưỡng
//       4,5:1, hoặc 3:1 cho chữ lớn (≥ 24px, hoặc ≥ 18,66px đậm). Nền là ảnh/gradient thì bỏ qua và
//       ĐẾM riêng — không đoán.
//
// Cần máy chủ đã chạy sẵn: `cd frontend && npm run build && npx next start -p 3100`, và fixture
// `frontend/public/__fx/` (API giả, không ghi gì lên production — xem memory xem-390-bang-emulate).
//   node scripts/backtest-theme.mjs [--cong 3100] [--chi lofi|thien-van] [--bai 0,4,..|--rong] [--json]
//
// Giới hạn phải nói ra: đây là phép đo trên PHẦN TỬ CÓ CHỮ, không phải trên ảnh chụp — nó không thấy
// chữ vẽ trong PNG, không thấy chồng lấn, và bỏ qua nền gradient/ảnh (đếm ở cột "nền ảnh").
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, '..', 'frontend', 'package.json'));
const { chromium } = require('playwright');

const arg = (k, mac) => {
  const i = process.argv.indexOf(k);
  return i < 0 ? mac : process.argv[i + 1];
};
const CONG = arg('--cong', '3100');
const CHI = arg('--chi', null);
const JSON_OUT = process.argv.includes('--json');
const GOC = `http://localhost:${CONG}`;
const FX = readFileSync(join(HERE, '..', 'frontend', 'public', '__fx', 'init.js'), 'utf8');

const TO_HOP = [
  { giaoDien: 'lofi', che: 'ngay' }, { giaoDien: 'lofi', che: 'dem' },
  { giaoDien: 'thien-van', che: 'ngay' }, { giaoDien: 'thien-van', che: 'dem' },
].filter((t) => !CHI || t.giaoDien === CHI);
const KHO = [{ ten: '1280', w: 1280, h: 800, mobile: false }, { ten: '390', w: 390, h: 844, mobile: true }];

/** Chạy TRONG trang: trả về { chu, loi: [...], nenAnh }. */
function kiemTuongPhan() {
  const parse = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  };
  const hopThanh = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const tuyen = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const sang = (c) => 0.2126 * tuyen(c.r) + 0.7152 * tuyen(c.g) + 0.0722 * tuyen(c.b);
  const tp = (a, b) => { const x = sang(a), y = sang(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const nenCua = (el) => {
    const lop = [];
    let anh = false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none') anh = true;
      const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0) { lop.push(bg); if (bg.a >= 1) break; }
    }
    let nen = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = lop.length - 1; i >= 0; i--) nen = hopThanh(lop[i], nen);
    return { nen, anh };
  };
  let chu = 0, nenAnh = 0, boQua = 0;
  const loi = [];
  const bo = document.querySelectorAll('.monaco-editor, .monaco-editor *, script, style, noscript, svg, svg *, img, canvas');
  const boSet = new Set(bo);
  for (const el of document.body.querySelectorAll('*')) {
    if (boSet.has(el)) continue;
    const co = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!co) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    // WCAG 1.4.3 miễn điều khiển VÔ HIỆU, và chữ trong cây `aria-hidden` là trang trí (số dòng của khối
    // code, chữ vẽ trên cảnh Góc học) — hai nhóm này từng chiếm 100% số "lỗi" của lần chạy đầu.
    if (el.closest('[disabled], [aria-disabled="true"], [aria-hidden="true"]')) { boQua += 1; continue; }
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    // phần tử bị clip/sr-only
    if (cs.clipPath !== 'none' && cs.position === 'absolute') continue;
    let opa = 1;
    for (let e = el; e; e = e.parentElement) opa *= Number(getComputedStyle(e).opacity);
    if (opa < 0.05) continue;
    chu += 1;
    const { nen, anh } = nenCua(el);
    if (anh) { nenAnh += 1; continue; }
    let fg = parse(cs.color);
    if (!fg) continue;
    fg = { ...fg, a: fg.a * opa };
    const f = hopThanh(fg, nen);
    const t = tp(f, nen);
    const px = parseFloat(cs.fontSize);
    const dam = Number(cs.fontWeight) >= 700;
    const lon = px >= 24 || (px >= 18.66 && dam);
    const nguong = lon ? 3 : 4.5;
    if (t < nguong) {
      loi.push({
        t: Math.round(t * 100) / 100, nguong, px, chu: el.textContent.trim().slice(0, 40),
        lop: String(el.className || el.tagName).slice(0, 50),
      });
    }
  }
  return { chu, loi, nenAnh, boQua };
}

// --bai 0,4,8,...: chỉ số bài (đếm từ 0) cần đi qua MỌI màn. Mặc định: PY01 · PY05 (sơ đồ). Bộ MỞ RỘNG
// `--rong` trải qua mọi chặng và có đủ các loại khối: PY09 (bảng), PD03 (bảng từng bước), VZ01 (hình sau
// cổng dự đoán), cộng bài ở giữa/cuối từng chặng — chạy lâu hơn nhiều (chạy nền).
const BAI_RONG = [0, 4, 8, 20, 43, 60, 73, 90, 110, 140, 165, 178];
const baiArg = arg('--bai', null);
const dsBai = baiArg ? baiArg.split(',').map(Number) : process.argv.includes('--rong') ? BAI_RONG : [0, 4];
const TRANG = [
  { ten: 'trang chủ', url: '/', man: false },
  { ten: 'trang khoá', url: '/courses/python_advanced', man: false },
  ...dsBai.map((i) => ({ ten: `bài #${i + 1}`, url: `/lesson/python_advanced?lesson=${i}`, man: true })),
  { ten: '/ide', url: '/ide', man: false },
  { ten: '404', url: '/khong-co-trang-nay', man: false },
];

// ĐỢI mọi hoạt ảnh/transition HỮU HẠN chạy xong rồi mới đo. Đo giữa lúc một phần tử đang mờ dần vào
// (trang chủ: nút hồ sơ `#profile` ở opacity 0 → 1 suốt ~3 s của pha `.intro`) cho chữ ở alpha giữa chừng
// trên nền tối ⇒ 1,41:1 và 1,65:1 — số của KHOẢNH KHẮC chứ không của trang (lần chạy mở rộng 16/11
// báo oan hai chữ này, mà lúc ổn định chúng ở opacity 1). Hoạt ảnh VÔ HẠN (nền sống) bị loại khỏi điều
// kiện đợi — chúng không bao giờ dừng. Quá hạn thì đo luôn: một cổng treo là một cổng bị gỡ.
const lang = (page) => page.waitForFunction(
  () => !document.getAnimations().some((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations !== Infinity),
  null, { timeout: 8000 },
).catch(() => {});

const browser = await chromium.launch();
const ket = [];
for (const th of TO_HOP) {
  for (const kho of KHO) {
    const ctx = await browser.newContext({ viewport: { width: kho.w, height: kho.h }, deviceScaleFactor: 1, isMobile: kho.mobile, hasTouch: kho.mobile });
    await ctx.addInitScript(({ gd, che }) => {
      try {
        if (gd === 'thien-van') localStorage.setItem('pe-giao-dien', 'thien-van'); else localStorage.removeItem('pe-giao-dien');
        localStorage.setItem('theme', che === 'dem' ? 'dark' : 'light');
        localStorage.setItem('__fx_done', JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
        localStorage.setItem('pe_access', 'fx');
        document.cookie = 'pe_has_session=1; path=/';
      } catch (e) { /* nhóm lưu trữ bị chặn */ }
    }, { gd: th.giaoDien, che: th.che });
    await ctx.addInitScript(FX);
    const page = await ctx.newPage();
    for (const tr of TRANG) {
      const nhan = `${th.giaoDien}/${th.che}/${kho.ten} · ${tr.ten}`;
      try {
        await page.goto(GOC + tr.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(tr.url.startsWith('/ide') ? 5000 : 2500);
        await lang(page);
        const manList = [];
        if (tr.man) {
          const n = await page.locator('button[class*=segment]').count();
          for (let i = 0; i < n; i++) manList.push(i);
        } else manList.push(null);
        let tran = 0, chu = 0, nenAnh = 0, boQua = 0;
        const loi = [];
        for (const i of manList) {
          if (i !== null) {
            await page.locator('button[class*=segment]').nth(i).click({ force: true }).catch(() => {});
            await page.waitForTimeout(500);
            await lang(page);
          }
          const r = await page.evaluate(kiemTuongPhan);
          const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          if (sw > 0) tran = Math.max(tran, sw);
          chu += r.chu; nenAnh += r.nenAnh; boQua += r.boQua;
          for (const l of r.loi) loi.push({ ...l, man: i === null ? undefined : i + 1 });
        }
        ket.push({ nhan, tran, chu, nenAnh, boQua, loi });
      } catch (e) {
        ket.push({ nhan, loiTrang: String(e).slice(0, 120), tran: 0, chu: 0, nenAnh: 0, loi: [] });
      }
    }
    await ctx.close();
  }
}
await browser.close();

if (JSON_OUT) {
  console.log(JSON.stringify(ket, null, 1));
} else {
  let tongLoi = 0, tongTran = 0, tongTrang = 0;
  for (const k of ket) {
    const gop = new Map();
    for (const l of k.loi) { const kk = `${l.lop}|${l.t}`; gop.set(kk, { ...l, n: (gop.get(kk)?.n ?? 0) + 1 }); }
    tongLoi += k.loi.length; tongTran += k.tran > 0 ? 1 : 0; tongTrang += k.loiTrang ? 1 : 0;
    console.log(`${k.loiTrang ? '✗' : k.loi.length || k.tran ? '!' : '✓'} ${k.nhan}  · ${k.chu} chữ · nền ảnh ${k.nenAnh} · bỏ qua (vô hiệu/aria-hidden) ${k.boQua} · tràn ${k.tran}px · ${k.loi.length} chữ dưới ngưỡng${k.loiTrang ? ' · LỖI TRANG ' + k.loiTrang : ''}`);
    for (const l of [...gop.values()].sort((a, b) => a.t - b.t).slice(0, 6)) {
      console.log(`      ${l.t}:1 (cần ${l.nguong}) ${l.px}px ×${l.n} "${l.chu}" .${l.lop}`);
    }
  }
  console.log(`\nTỔNG: ${ket.length} ô · ${tongLoi} chữ dưới ngưỡng · ${tongTran} ô tràn ngang · ${tongTrang} ô lỗi trang`);
}
