/**
 * GIAO DIỆN "ĐÀI THIÊN VĂN" Ở /ide, 404 VÀ TRANG LỖI (vòng H2), và theme Monaco.
 *
 * Monaco không đọc CSS của trang: `theme={dark ? 'vs-dark' : 'light'}` cho nền
 * trắng tinh / xám #1e1e1e cạnh khung kết quả mang màu giấy kem / nâu của theme.
 * `lib/monaco-thien-van.ts` định nghĩa hai theme riêng; nền của chúng là BẢN CHÉP
 * của `--ds-card` (Monaco nhận mã màu, không nhận `var()`), nên:
 *
 *   1. NỀN KHỚP CSS — nền Monaco ngày/đêm = `--ds-card` ngày/đêm của theme. Đổi
 *      một bên là hai mặt phẳng cạnh nhau lệch màu, và không gì báo.
 *   2. TƯƠNG PHẢN — chữ, từ khoá, chuỗi, số, chú thích, số dòng trên nền và trên
 *      dòng đang đứng. Cú pháp tô màu là chỗ dễ tụt dưới AA nhất.
 *   3. ĐƯỜNG TỚI — IdeClient chọn theme theo giao diện và gọi `beforeMount`;
 *      thiếu `beforeMount` thì `theme` trỏ vào một tên Monaco chưa biết và rơi
 *      im lặng về `vs`. Ba bề mặt (/ide, 404, trang lỗi) khai `data-tv-surface`.
 *
 * Giới hạn: đọc mã TĨNH. Màu Monaco thật hiện ra là chuyện của trình duyệt (đã
 * xem bằng Chrome ở cả hai chế độ), không phải của cổng này.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { boChuThich, moiRule } from './_css-rule.mjs';

import {
  dinhNghiaThemeThienVan,
  dungTheme,
  MAU_DEM,
  MAU_NGAY,
  MONACO_THIEN_VAN_DEM,
  MONACO_THIEN_VAN_NGAY,
} from '../../src/lib/monaco-thien-van.ts';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const doc = (p) => readFileSync(`${GOC}${p}`, 'utf8');

// Sàn tương phản mọi chữ trong ô mã, trên nền VÀ trên dòng đang đứng. Chỉ được NÂNG
// (mục `san-chu-monaco-thien-van` trong scripts/nguong-mot-chieu.json).
const SAN_CHU_MONACO = 5.4;

const NGAY = 'html[data-theme="thien-van"]:has([data-tv-surface])';
const DEM = `${NGAY} body.dark`;

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

/** Giá trị của `--ds-card` trong khối NGÀY hoặc khối ĐÊM của tệp token. */
function theCuaTheme(selector) {
  const css = boChuThich(doc('public/static/css/theme-thien-van.css'));
  for (const r of moiRule(css)) {
    if (r.media !== null || !r.sels.includes(selector)) continue;
    const m = /--ds-card\s*:\s*(#[0-9a-fA-F]{6})\s*;/.exec(r.than);
    if (m) return m[1].toUpperCase();
  }
  assert.fail(`không đọc được --ds-card trong khối "${selector}" của theme-thien-van.css`);
}

test('nền Monaco = --ds-card của theme, cả ngày lẫn đêm (bản chép không được trôi)', () => {
  assert.equal(MAU_NGAY.nen.toUpperCase(), theCuaTheme(NGAY), 'nền Monaco NGÀY lệch --ds-card ngày: ô mã và khung kết quả nằm cạnh nhau, hai bảng màu');
  assert.equal(MAU_DEM.nen.toUpperCase(), theCuaTheme(DEM), 'nền Monaco ĐÊM lệch --ds-card đêm');
});

test('tương phản: chữ, từ khoá, chuỗi, số, chú thích, số dòng ≥ sàn trên nền và trên dòng đang đứng', () => {
  for (const [ten, m] of [['ngày', MAU_NGAY], ['đêm', MAU_DEM]]) {
    for (const k of ['chu', 'tuKhoa', 'chuoi', 'so', 'chuThich', 'soDong']) {
      for (const [tn, nen] of [['nền', m.nen], ['dòng đang đứng', m.dongDangDung]]) {
        const r = tuongPhan(m[k], nen);
        assert.ok(r >= SAN_CHU_MONACO, `${ten}: ${k} trên ${tn} chỉ ${r.toFixed(2)}:1 (sàn ${SAN_CHU_MONACO})`);
      }
    }
    // dòng đang đứng phải TÁCH được khỏi nền, nếu không nó vô hình (cùng họ lỗi "trắng trên trắng")
    assert.ok(tuongPhan(m.dongDangDung, m.nen) >= 1.08, `${ten}: dòng đang đứng gần như trùng nền`);
    assert.ok(tuongPhan(m.chu, m.vungChon) >= 7, `${ten}: chữ trên vùng bôi chọn dưới 7:1`);
  }
});

test('theme Monaco: dungTheme sinh đủ khoá, và dinhNghiaThemeThienVan đăng ký ĐÚNG hai tên', () => {
  const da = [];
  dinhNghiaThemeThienVan({ editor: { defineTheme: (ten, t) => da.push([ten, t]) } });
  assert.deepEqual(da.map((x) => x[0]), [MONACO_THIEN_VAN_NGAY, MONACO_THIEN_VAN_DEM]);
  for (const [, t] of da) {
    for (const k of ['editor.background', 'editor.foreground', 'editor.lineHighlightBackground', 'editorLineNumber.foreground', 'editorGutter.background']) {
      assert.match(t.colors[k] ?? '', /^#[0-9A-Fa-f]{6}$/, `thiếu hoặc sai màu cho ${k}`);
    }
    assert.ok(t.rules.every((r) => !String(r.foreground ?? '').startsWith('#')), 'rules của Monaco cần mã KHÔNG có dấu #');
  }
  assert.equal(dungTheme(MAU_NGAY, false).base, 'vs');
  assert.equal(dungTheme(MAU_DEM, true).base, 'vs-dark');
});

test('đường tới: IdeClient chọn theme theo giao diện và gọi beforeMount; ba bề mặt khai data-tv-surface', () => {
  const ide = doc('src/app/ide/IdeClient.tsx');
  assert.match(ide, /beforeMount=\{dinhNghiaThemeThienVan\}/, 'thiếu beforeMount: theme Monaco chưa được định nghĩa, rơi im lặng về `vs`');
  assert.match(ide, /thienVan \? \(dark \? MONACO_THIEN_VAN_DEM : MONACO_THIEN_VAN_NGAY\)/, 'prop theme không chọn theme chiêm tinh theo giao diện');
  assert.match(ide, /dangKyGiaoDien/, 'IdeClient không lắng nghe giao diện: đổi theme giữa chừng không đổi ô mã');
  assert.match(ide, /<div className=\{styles\.page\} data-tv-surface=""/, '/ide không khai data-tv-surface');
  assert.match(doc('src/app/not-found.tsx'), /<main className=\{styles\.wrap\} data-tv-surface=""/, 'trang 404 không khai data-tv-surface');
  assert.match(doc('src/app/error.tsx'), /<main className=\{styles\.wrap\} data-tv-surface=""/, 'trang lỗi không khai data-tv-surface');
});
