// Vùng CUỘN ĐƯỢC phải có dấu hiệu cho biết nó cuộn được.
//
// VÌ SAO CÓ CỔNG NÀY. Người thử báo 07/11/2026: "scroll mà ko thấy scroll bar
// đâu". Đo trên production ở 1366×768 — độ phân giải laptop phổ biến nhất —
// thì nó không phải chuyện hiếm:
//   · `#side` tràn 28px dọc;
//   · `.shelfrow` có 11 hàng, 5 hàng TRÀN NGANG: 101 · 350 · 809 · 709 · 603 px.
// Tới 809px của một kệ mà không có gì báo là cuộn được. `scene.css` khi đó ẩn
// thanh cuộn ở BỐN chỗ bằng `scrollbar-width:none`, và `#side` còn ẩn thêm một
// lần nữa bằng `::-webkit-scrollbar{display:none}`.
//
// Đo trong Chrome trên production, tiêm đúng bộ luật mới: số phần tử CÓ thanh
// cuộn đi 1 → 7; gỡ luật ra thì về 1; tiêm lại thì 7.
//
// LUẬT HAI CHIỀU. Một selector cuộn được mà ẩn thanh cuộn thì PHẢI có tên trong
// `CO_CACH_BAO_KHAC` kèm lý do; và một mục khai ở đó mà THÔI ẩn thanh cuộn cũng
// là LỖI — thiếu chiều sau thì danh sách chỉ dài ra rồi thành chỗ giấu rác,
// đúng bài học `DAP_AN_MAU_KHONG_CHAY` của AGENTS.md.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CSS = readFileSync(join(GOC, 'src', 'components', 'goc-hoc', 'scene.css'), 'utf8');

// Selector cuộn được mà CỐ Ý không có thanh cuộn, vì nó đã có cách báo khác.
const CO_CACH_BAO_KHAC = {
  '.menu': 'đã có mặt nạ mờ mép phải (`mask-image`) kèm chú thích nói rõ lý do; '
    + 'hai cách báo chồng lên nhau là thừa',
};

/** Các khối `selector{...}` của một tệp CSS, bỏ chú thích. */
function khoi(css) {
  const sach = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const ra = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(sach))) {
    const sel = m[1].trim().split('\n').pop().trim();
    if (sel && !sel.startsWith('@')) ra.push({ sel, than: m[2] });
  }
  return ra;
}

const KHOI = khoi(CSS);

test('phép bóc CSS còn đọc được — rỗng thì mọi luật dưới đây vô nghĩa', () => {
  assert.ok(KHOI.length > 100, `chỉ bóc được ${KHOI.length} khối từ scene.css — `
    + 'regex đã trượt, và khi đó hai tập dưới cùng RỖNG nên mọi ca sau XANH vì '
    + 'không chứng minh gì. Sửa `khoi()`, đừng nới ca.');
});

test('mọi vùng cuộn được đều có dấu hiệu — thanh cuộn, hoặc một mục đã khai', () => {
  const cuonDuoc = KHOI.filter((k) => /overflow(-[xy])?\s*:\s*(auto|scroll)/.test(k.than));
  assert.ok(cuonDuoc.length >= 3,
    `chỉ thấy ${cuonDuoc.length} vùng cuộn được — phép dò hỏng`);

  const an = cuonDuoc.filter((k) => /scrollbar-width\s*:\s*none/.test(k.than));
  const chuaKhai = an.map((k) => k.sel).filter((s) => !(s in CO_CACH_BAO_KHAC));
  assert.deepEqual(chuaKhai, [],
    `vùng cuộn được mà ẩn thanh cuộn và CHƯA KHAI: ${chuaKhai.join(', ')}. `
    + 'Người học không có cách nào biết nó cuộn được. Hoặc bỏ `scrollbar-width:none`, '
    + 'hoặc khai một dòng trong CO_CACH_BAO_KHAC kèm cách báo THAY THẾ đang dùng.');
});

test('ngoại lệ phải còn đúng — khai "có cách báo khác" mà thôi ẩn thanh cuộn là lỗi thời', () => {
  for (const [sel, viSao] of Object.entries(CO_CACH_BAO_KHAC)) {
    const k = KHOI.filter((x) => x.sel.split(',').map((s) => s.trim()).includes(sel));
    assert.ok(k.length, `CO_CACH_BAO_KHAC khai "${sel}" nhưng scene.css không còn `
      + 'selector đó — NGOẠI LỆ ĐÃ LỖI THỜI, gỡ dòng ấy đi.');
    assert.ok(k.some((x) => /scrollbar-width\s*:\s*none/.test(x.than)),
      `"${sel}" khai là có cách báo khác (${viSao}) nhưng nay KHÔNG còn ẩn thanh `
      + 'cuộn — NGOẠI LỆ ĐÃ LỖI THỜI, gỡ dòng ấy đi.');
  }
});

test('không còn chỗ nào ẩn thanh cuộn bằng ::-webkit-scrollbar{display:none}', () => {
  const an = [...CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/([^{}]*)::-webkit-scrollbar\s*\{([^{}]*)\}/g)]
    .filter((m) => /display\s*:\s*none/.test(m[2]))
    .map((m) => m[1].trim().split('\n').pop().trim());
  assert.deepEqual(an, [],
    `ẩn thanh cuộn bằng đường thứ hai (webkit) ở: ${an.join(', ')}. `
    + '`scrollbar-width:none` và `::-webkit-scrollbar{display:none}` là HAI phép ẩn '
    + 'khác nhau — gỡ một cái mà để cái kia là bản sửa trông như xong.');
});

// Thanh cuộn là THÀNH PHẦN GIAO DIỆN: WCAG 1.4.11 đòi 3:1. Nó nằm trên HAI nền
// khác nhau — panel tối và ván gỗ của kệ — nên phải vượt ngưỡng trên CẢ HAI.
// Sàn đặt 3.0 vì đó là chính ngưỡng WCAG, không phải một con số chọn tay.
const NEN = { 'panel tối': [0x0d, 0x0b, 0x13], 'ván gỗ kệ': [0x5a, 0x3a, 0x26] };
const SAN = 3.0;

const tuyen = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const sang = ([r, g, b]) => 0.2126 * tuyen(r) + 0.7152 * tuyen(g) + 0.0722 * tuyen(b);
const tuongPhan = (a, b) => {
  const [x, y] = [sang(a), sang(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const hopThanh = (fg, al, bg) => fg.map((v, i) => Math.round(bg[i] + (v - bg[i]) * al));

test('màu thanh cuộn vượt 3:1 trên CẢ HAI nền nó nằm lên', () => {
  const m = CSS.match(/scrollbar-color\s*:\s*rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\)/);
  assert.ok(m, 'không tìm thấy `scrollbar-color: rgba(...)` trong scene.css — '
    + 'đổi cách khai màu thì phải sửa ca này, im lặng xanh ở đây là bỏ mất phép đo.');
  const mau = [+m[1], +m[2], +m[3]];
  const al = +m[4];
  for (const [ten, nen] of Object.entries(NEN)) {
    const tp = tuongPhan(hopThanh(mau, al, nen), nen);
    assert.ok(tp >= SAN, `thanh cuộn trên ${ten}: ${tp.toFixed(2)}:1, dưới sàn ${SAN}. `
      + 'Đã đo cả thang alpha: .26 → 2,09/1,99 · .38 → 3,24/2,68 · .44 → 3,93/3,07. '
      + '.44 là giá trị THẤP NHẤT vượt 3:1 trên cả hai nền.');
  }
});
