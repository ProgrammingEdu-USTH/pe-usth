/**
 * GIAO DIỆN "ĐÀI THIÊN VĂN" — giao diện DUY NHẤT của nhánh `chiem-tinh`.
 *
 * Từ 12/11/2026 lofi đã bỏ: `data-theme="thien-van"` là thuộc tính TĨNH ở <html>
 * và theme áp cho MỌI trang. Mỗi mục dưới đây canh một cách hỏng im lặng, kèm phép
 * ablate đã chứng minh nó có răng:
 *
 *  1. SCRIPT TRƯỚC-PAINT chỉ còn lo sáng/tối. Nó KHÔNG được chạm `data-theme`
 *     (giao diện không đi qua localStorage nữa: một chuỗi lạ do ai đó gõ vào đó
 *     không được thành thuộc tính). Chạy trong `node:vm`, không so chuỗi regex.
 *  2. THUỘC TÍNH TĨNH: `layout.tsx` khai `data-theme={GIAO_DIEN_MAC_DINH}`, CSS chỉ
 *     nhắc đúng id đó, và không còn `data-tv-surface` / `:has([data-tv-surface])`
 *     nào (cổng cũ giới hạn theme vào bề mặt đã thiết kế; còn sót một cái là còn
 *     một chỗ đọc ra "theme chưa áp" trong khi nó đã áp).
 *  3. CẤU TRÚC TỆP TOKEN: mọi selector bắt đầu `html[data-theme="thien-van"]`;
 *     khối ngày/đêm chỉ khai biến; ngày KHÔNG chứa `var()` hay `--st-*` (bí danh
 *     trên `body` che mất nó: code chết); đêm KHÔNG chứa `--edu-scrollbar-thumb`
 *     (tính trên <html>, đặt ở `body.dark` thì không bao giờ tới).
 *  4. ĐÊM KHÔNG RÒ: token nào khối ngày đặt mà `body.dark` của bảng nền (lofi, còn
 *     lại làm nền cho token chưa ghi đè) cũng khai thì khối đêm phải khai lại.
 *  5. TƯƠNG PHẢN, cả hai chế độ, TÍNH từ chính tệp CSS (không giữ bảng giá trị
 *     thứ hai). Các sàn nằm trong `scripts/nguong-mot-chieu.json`: chỉ được NÂNG.
 *
 * Giới hạn: đọc CSS TĨNH. Nó chứng minh "token đã khai đúng", không chứng minh
 * "bề mặt nào đó đổi màu" — phần đó là ảnh chụp trình duyệt của từng vòng.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

import {
  GIAO_DIEN,
  GIAO_DIEN_MAC_DINH,
  KHOA_CHE_DO,
  SCRIPT_TRUOC_PAINT,
  THUOC_TINH,
} from '../../src/lib/giao-dien.ts';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const doc = (p) => readFileSync(`${GOC}${p}`, 'utf8');
const boChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const TV = 'thien-van';
const NGAY = `html[data-theme="${TV}"]`;
const DEM = `${NGAY} body.dark`;
const SCHEME = `${NGAY}:has(> body.dark)`;

// ── SÀN TƯƠNG PHẢN (chỉ được NÂNG — mỗi hằng có một mục trong nguong-mot-chieu.json) ──
const SAN_CHU_NGAY = 5.3;
const SAN_CHU_DEM = 6.2;
const SAN_CHIP_NGAY = 1.35;
const SAN_CHIP_DEM = 1.4;
const SAN_TINT_DEM = 1.12;
const SAN_THANH_CUON = 3.6;

// ── đọc CSS ────────────────────────────────────────────────────────────────
const THEME = boChuThich(doc('public/static/css/theme-thien-van.css'));

function docKhoi(css) {
  const ra = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    const dec = {};
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      dec[d.slice(0, i).trim()] = d.slice(i + 1).trim().replace(/\s+/g, ' ');
    }
    ra.push({ sel, dec });
  }
  return ra;
}
const KHOI = docKhoi(THEME);
const khoi = (sel) => KHOI.find((k) => k.sel === sel);

/** Khối đầu tiên của `selector {` trong CSS của lofi (đã bỏ chú thích). */
function khoiLofi(tep, sel) {
  const css = boChuThich(doc(tep));
  const i = css.search(new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`));
  assert.ok(i >= 0, `${tep}: không thấy khối "${sel}"`);
  const m = css.slice(i).match(/\{([^{}]*)\}/);
  return Object.fromEntries(
    m[1]
      .split(';')
      .map((d) => d.split(/:(.*)/s))
      .filter((p) => p.length > 1)
      .map((p) => [p[0].trim(), p[1].trim().replace(/\s+/g, ' ')]),
  );
}
const LOFI_NGAY = { ...khoiLofi('public/static/css/studio-tokens.css', ':root'), ...khoiLofi('public/static/css/edu-theme.css', ':root') };
const LOFI_DEM = { ...khoiLofi('public/static/css/studio-tokens.css', 'body.dark'), ...khoiLofi('public/static/css/edu-theme.css', 'body.dark') };

// ── tương phản WCAG ─────────────────────────────────────────────────────────
const tuyen = (c) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const sang = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * tuyen((n >> 16) & 255) + 0.7152 * tuyen((n >> 8) & 255) + 0.0722 * tuyen(n & 255);
};
const tuongPhan = (a, b) => {
  const x = sang(a);
  const y = sang(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/**
 * Giá trị của một token trong MỘT chế độ, theo đúng thứ tự trình duyệt áp:
 * đêm = khối đêm của theme → `body.dark` lofi → khối ngày của theme (kế thừa từ
 * <html>) → `:root` lofi. Ngày = khối ngày → `:root` lofi.
 */
function giaTri(ten, che) {
  const ngay = khoi(NGAY).dec;
  const dem = khoi(DEM).dec;
  const nguon = che === 'dem' ? [dem, LOFI_DEM, ngay, LOFI_NGAY] : [ngay, LOFI_NGAY];
  for (const n of nguon) {
    if (n[ten] !== undefined) {
      const v = n[ten];
      const bi = v.match(/^var\((--[\w-]+)\)$/);
      return bi ? giaTri(bi[1], che) : v;
    }
  }
  return undefined;
}
const mau = (ten, che) => {
  const v = giaTri(ten, che);
  assert.match(v ?? '', /^#[0-9a-fA-F]{6}$/, `${che}: ${ten} không giải ra mã màu #rrggbb (ra ${v})`);
  return v;
};

// ═════════════════════════════════════════════════════════════════════════
/** Mọi tệp mã (.ts/.tsx/.js/.css) trong src. */
function moiTepSrc(thuMuc = 'src') {
  const ra = [];
  for (const m of readdirSync(`${GOC}${thuMuc}`, { withFileTypes: true })) {
    const p = `${thuMuc}/${m.name}`;
    if (m.isDirectory()) ra.push(...moiTepSrc(p));
    else if (/\.(tsx?|jsx?|css)$/.test(m.name)) ra.push(p);
  }
  return ra;
}

test('script trước-paint: chỉ đặt sáng/tối, KHÔNG chạm data-theme dù localStorage bị bơm chuỗi lạ', () => {
  const chay = (luu, { ne = false } = {}) => {
    const thuocTinh = [];
    const lop = {};
    const ctx = {
      localStorage: {
        getItem: (k) => {
          if (ne) throw new Error('bị chặn');
          return k in luu ? luu[k] : null;
        },
      },
      document: {
        body: { classList: { toggle: (c, v) => (lop[c] = v) } },
        documentElement: { setAttribute: (k, v) => thuocTinh.push([k, v]) },
      },
    };
    vm.runInNewContext(SCRIPT_TRUOC_PAINT, ctx);
    return { thuocTinh, lop };
  };

  // mọi giá trị trong mọi khoá đều KHÔNG được thành thuộc tính trên <html>
  const LA = [TV, 'lofi', '', 'THIEN-VAN', '"><script>alert(1)</script>', '__proto__', 'constructor', undefined, null];
  for (const v of LA) {
    for (const khoa of ['pe-giao-dien', KHOA_CHE_DO]) {
      assert.deepEqual(chay(v === undefined ? {} : { [khoa]: v }).thuocTinh, [], `giá trị ${JSON.stringify(v)} ở khoá ${khoa} chạm vào <html>`);
    }
  }

  // hành vi sáng/tối không được mất
  assert.deepEqual(chay({ [KHOA_CHE_DO]: 'dark' }).lop, { dark: true, light: false });
  assert.deepEqual(chay({}).lop, { dark: false, light: true });

  // localStorage ném (chế độ riêng tư) → không ném ra ngoài
  assert.doesNotThrow(() => chay({}, { ne: true }));
});

test('thuộc tính tĩnh: layout khai data-theme bằng hằng, CSS chỉ nhắc id đó, không còn cổng data-tv-surface', () => {
  assert.deepEqual([...GIAO_DIEN], [TV], 'nhánh này chỉ có MỘT giao diện: thêm giao diện thứ hai là quay lại bài toán trục chọn, phải làm có chủ đích');
  assert.equal(GIAO_DIEN_MAC_DINH, TV);
  assert.equal(THUOC_TINH, 'data-theme');

  const layout = boChuThich(doc('src/app/layout.tsx'));
  assert.match(layout, /<html[^>]*data-theme=\{GIAO_DIEN_MAC_DINH\}/, 'layout.tsx không khai data-theme tĩnh ở <html>: theme không bao giờ bật');
  assert.match(layout, /SCRIPT_TRUOC_PAINT/, 'layout.tsx phải nhúng SCRIPT_TRUOC_PAINT');
  assert.ok(!layout.includes("getItem('theme')"), 'layout.tsx vẫn giữ bản chép script sáng/tối');

  // mọi giá trị `data-theme="…"` trong CSS là đúng id thật
  const trongCss = [...THEME.matchAll(/data-theme="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(trongCss.length >= 3, 'CSS phải nhắc data-theme ở ít nhất ba selector');
  for (const v of trongCss) assert.equal(v, TV, `CSS nhắc data-theme="${v}" mà danh sách không có`);

  // cổng cũ đã bỏ: không còn marker nào, không còn selector nào đọc marker
  const sot = [];
  for (const tep of moiTepSrc()) {
    if (boChuThich(doc(tep)).includes('data-tv-surface')) sot.push(tep);
  }
  assert.deepEqual(sot, [], `còn data-tv-surface trong mã (cổng giới hạn theme đã bỏ): ${sot.join(', ')}`);
  assert.ok(!THEME.includes('data-tv-surface'), 'theme-thien-van.css còn nhắc data-tv-surface');
});

test('đường tới: nút chế độ mount ở khung bài học, tệp token nạp ở mọi trang, không còn nút chọn giao diện', () => {
  const chrome = boChuThich(doc('src/components/lesson-chrome/LessonChrome.tsx'));
  assert.match(chrome, /<ThemePicker\s*\/>/, 'LessonChrome không dựng <ThemePicker />: trong bài học không còn chỗ đổi sáng/tối');

  // VĂN BẢN THÔ, không bóc chú thích: một dòng `// … pages/*.inline.css …` trong
  // PageStyles mở một khối `/*` giả và bộ bóc nuốt mất cả bảng RANK (đã đo).
  const ps = doc('src/components/PageStyles.tsx');
  assert.match(ps, /const THEME_CSS = '\/static\/css\/theme-thien-van\.css';/, 'PageStyles không khai THEME_CSS với đường dẫn đầy đủ của tệp theme');
  // KHÔNG dựng regex từ template literal: `\s` trong template là chữ `s`, regex
  // thành "…:s*(d+)" và không khớp gì (bẫy đã ghi ở AGENTS.md, ca trang 404).
  const hang = (f) => {
    const i = ps.indexOf(`'${f}':`);
    return i < 0 ? NaN : Number(/\d+/.exec(ps.slice(i + f.length + 3))?.[0]);
  };
  assert.ok(Number.isFinite(hang('theme-thien-van.css')) && Number.isFinite(hang('studio-tokens.css')), 'không đọc được hạng trong RANK của PageStyles');
  assert.ok(hang('theme-thien-van.css') > hang('studio-tokens.css'), 'theme phải nạp SAU studio-tokens (cùng đặc hiệu thì file sau thắng)');
  assert.ok(hang('theme-thien-van.css') < hang('edu-responsive.css'), 'lớp co giãn phải vẫn cuối cùng');
  assert.match(ps, /co\(THEME_CSS,/, 'PageStyles không tự thêm tệp theme vào mọi trang');

  // nút chọn: chỉ còn nhóm sáng/tối; mọi dấu vết của trục giao diện đã gỡ
  const nut = boChuThich(doc('src/components/ThemePicker.tsx'));
  assert.ok(!/datGiaoDien|NHAN_GIAO_DIEN|GIAO_DIEN\.map/.test(nut), 'ThemePicker còn nhóm chọn giao diện — chỉ còn một giao diện');
  assert.match(nut, /datCheDoToi/, 'ThemePicker không còn đổi được sáng/tối');
  assert.ok(!/ThemePicker/.test(boChuThich(doc('src/app/(standalone)/courses/[courseId]/CourseDetail.tsx'))), 'trang khoá học còn nút chọn: nút trăng/mặt trời của SiteHeader đã đủ');
  assert.ok(!/id="tTv"/.test(doc('src/components/goc-hoc/shell.js')), 'panel trang chủ còn công tắc giao diện (#tTv)');
});

test('cấu trúc tệp token: mọi selector mở bằng html[data-theme], ngày không var()/--st-*, đêm không thanh cuộn', () => {
  assert.ok(KHOI.length >= 3, `phép đọc CSS ra ${KHOI.length} khối (< 3): bộ đọc hỏng, mọi ca dưới sẽ đạt rỗng`);
  assert.ok(!/@import/.test(THEME), 'theme-thien-van.css không được @import: nó nạp trên MỌI trang, kể cả của người dùng lofi');

  for (const k of KHOI) {
    assert.ok(k.sel.startsWith(`html[data-theme="${TV}"]`), `selector "${k.sel}" không bắt đầu bằng html[data-theme="${TV}"] — nó sẽ đè lên người dùng lofi`);
  }
  const ngay = khoi(NGAY);
  const dem = khoi(DEM);
  const scheme = khoi(SCHEME);
  assert.ok(ngay && dem && scheme, 'thiếu khối ngày / đêm / color-scheme');

  for (const [ten, k] of [['ngày', ngay], ['đêm', dem]]) {
    for (const [d, v] of Object.entries(k.dec)) {
      assert.ok(d.startsWith('--'), `khối ${ten} khai "${d}" — chỉ được khai biến CSS (--*), không áp quy tắc lên phần tử`);
      assert.ok(!/var\(/.test(v), `khối ${ten}: ${d} chứa var() — token dẫn xuất phải khai trên body (resolve tại phần tử khai), không ở html`);
      assert.ok(!d.startsWith('--st-'), `khối ${ten}: ${d} — bí danh --st-* được khai lại trên body nên khai ở đây là code chết; đổi --ds-* là chúng tự đi theo`);
    }
  }
  assert.ok(!('--edu-scrollbar-thumb' in dem.dec), '--edu-scrollbar-thumb không được ở khối đêm: scrollbar-color tính trên <html>, giá trị ở body.dark không bao giờ tới');
  assert.ok('--edu-scrollbar-thumb' in ngay.dec, 'thiếu --edu-scrollbar-thumb (một giá trị cho cả hai chế độ)');
  assert.equal(scheme.dec['color-scheme'], 'dark');
});

test('đêm KHÔNG RÒ: token ngày đặt mà body.dark của lofi cũng khai thì đêm phải khai lại', () => {
  assert.ok(Object.keys(LOFI_DEM).length > 30, `phép đọc body.dark của lofi chỉ ra ${Object.keys(LOFI_DEM).length} token — bộ đọc hỏng`);
  const ngay = khoi(NGAY).dec;
  const dem = khoi(DEM).dec;
  const thieu = Object.keys(ngay).filter((t) => !t.startsWith('--tv-') && t in LOFI_DEM && !(t in dem));
  assert.deepEqual(thieu, [], `đặt ở ngày, lofi-đêm cũng khai, mà đêm của theme quên khai lại: ${thieu.join(', ')} — ban đêm sẽ lấy giá trị của LOFI`);
});

test('tương phản NGÀY: thang chữ, tint, chip code, thanh cuộn', () => {
  const nen = ['--ds-card', '--edu-panel-bg-solid', '--edu-bg-solid', '--edu-card-bg'].map((t) => [t, mau(t, 'ngay')]);
  for (const b of ['t1', 't2', 't3', 't4', 't5', 't6']) {
    for (const [tn, nm] of nen) {
      const r = tuongPhan(mau(`--edu-${b}`, 'ngay'), nm);
      assert.ok(r >= SAN_CHU_NGAY, `ngày: --edu-${b} trên ${tn} chỉ ${r.toFixed(2)}:1 (sàn ${SAN_CHU_NGAY})`);
    }
  }
  // mực và nền phụ mà TRANG KHOÁ HỌC / SiteHeader dùng (--ds-*, không phải --edu-t*)
  for (const m of ['--ds-ink', '--ds-soft']) {
    for (const n of ['--ds-card', '--ds-paper', '--ds-page', '--ds-tint']) {
      const r = tuongPhan(mau(m, 'ngay'), mau(n, 'ngay'));
      assert.ok(r >= SAN_CHU_NGAY, `ngày: ${m} trên ${n} chỉ ${r.toFixed(2)}:1 (sàn ${SAN_CHU_NGAY})`);
    }
  }
  const trang = mau('--ds-card', 'ngay');
  for (const [fg, bg] of [['--ds-ochre', '--ds-ochre-tint'], ['--ds-sanguine', '--ds-sanguine-tint'], ['--ds-violet-deep', '--ds-violet-tint'], ['--ds-violet', '--ds-violet-tint']]) {
    const r = tuongPhan(mau(fg, 'ngay'), mau(bg, 'ngay'));
    assert.ok(r >= 4.5, `ngày: ${fg} trên ${bg} chỉ ${r.toFixed(2)}:1 (AA 4,5)`);
  }
  const chip = mau('--edu-code-inline-bg', 'ngay');
  assert.ok(tuongPhan(chip, trang) >= SAN_CHIP_NGAY, `ngày: chip code tách khỏi thẻ chỉ ${tuongPhan(chip, trang).toFixed(2)}:1 (sàn ${SAN_CHIP_NGAY})`);
  assert.ok(tuongPhan(mau('--edu-t1', 'ngay'), chip) >= 4.5, 'ngày: chữ t1 trên chip code dưới AA');
  const thumb = tuongPhan(mau('--edu-scrollbar-thumb', 'ngay'), mau('--edu-bg-solid', 'ngay'));
  assert.ok(thumb >= SAN_THANH_CUON, `ngày: thanh cuộn trên nền trang chỉ ${thumb.toFixed(2)}:1 (WCAG 1.4.11 đòi 3:1; sàn ${SAN_THANH_CUON})`);
  // một mặt phẳng "đang chọn" mà trùng thẻ thì viền là thứ duy nhất báo — không được mất cả hai
  assert.ok(tuongPhan(mau('--ds-violet-tint', 'ngay'), trang) >= 1.1, 'ngày: tint đang-chọn gần như trùng thẻ');
});

test('tương phản ĐÊM: thang chữ, tint (lofi-đêm vô hình trên thẻ nâu), chip code, thanh cuộn', () => {
  const nen = ['--ds-card', '--edu-panel-bg-solid', '--edu-bg-solid', '--edu-card-bg'].map((t) => [t, mau(t, 'dem')]);
  for (const b of ['t1', 't2', 't3', 't4', 't5', 't6']) {
    for (const [tn, nm] of nen) {
      const r = tuongPhan(mau(`--edu-${b}`, 'dem'), nm);
      assert.ok(r >= SAN_CHU_DEM, `đêm: --edu-${b} trên ${tn} chỉ ${r.toFixed(2)}:1 (sàn ${SAN_CHU_DEM})`);
    }
  }
  // mực và nền phụ mà TRANG KHOÁ HỌC / SiteHeader dùng (--ds-*, không phải --edu-t*)
  for (const m of ['--ds-ink', '--ds-soft']) {
    for (const n of ['--ds-card', '--ds-paper', '--ds-page', '--ds-tint']) {
      const r = tuongPhan(mau(m, 'dem'), mau(n, 'dem'));
      assert.ok(r >= SAN_CHU_DEM, `đêm: ${m} trên ${n} chỉ ${r.toFixed(2)}:1 (sàn ${SAN_CHU_DEM})`);
    }
  }
  const the = mau('--ds-card', 'dem');
  for (const [fg, bg] of [['--ds-ochre', '--ds-ochre-tint'], ['--ds-sanguine', '--ds-sanguine-tint'], ['--ds-violet-deep', '--ds-violet-tint'], ['--ds-violet', '--ds-violet-tint']]) {
    const r = tuongPhan(mau(fg, 'dem'), mau(bg, 'dem'));
    assert.ok(r >= 4.5, `đêm: ${fg} trên ${bg} chỉ ${r.toFixed(2)}:1 (AA 4,5)`);
  }
  // tint của lofi-đêm trên thẻ #2A2416 là 1,00–1,01:1 (vô hình) — theme phải tách được
  for (const t of ['--ds-ochre-tint', '--ds-sanguine-tint', '--ds-violet-tint']) {
    const r = tuongPhan(mau(t, 'dem'), the);
    assert.ok(r >= SAN_TINT_DEM, `đêm: ${t} tách khỏi thẻ chỉ ${r.toFixed(2)}:1 (sàn ${SAN_TINT_DEM})`);
  }
  const chip = mau('--edu-code-inline-bg', 'dem');
  assert.ok(tuongPhan(chip, the) >= SAN_CHIP_DEM, `đêm: chip code tách khỏi thẻ chỉ ${tuongPhan(chip, the).toFixed(2)}:1 (sàn ${SAN_CHIP_DEM})`);
  assert.ok(tuongPhan(mau('--edu-t1', 'dem'), chip) >= 4.5, 'đêm: chữ t1 trên chip code dưới AA');
  const thumb = tuongPhan(mau('--edu-scrollbar-thumb', 'dem'), mau('--edu-bg-solid', 'dem'));
  assert.ok(thumb >= SAN_THANH_CUON, `đêm: thanh cuộn trên nền đêm chỉ ${thumb.toFixed(2)}:1 (sàn ${SAN_THANH_CUON})`);
});
