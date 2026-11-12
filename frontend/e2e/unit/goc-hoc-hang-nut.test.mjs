// Hàng nút điều hướng của Góc học phải THẤY HẾT trên điện thoại, không đòi vuốt.
//
// VÌ SAO CÓ CỔNG NÀY. Người thử `will` báo 07/11/2026: *"size nhỏ phát là mất
// nút, có thể cho làm 2 hàng xuống"*. Đo trên production:
//
//   | khổ     | hàng nút tràn ngang | mục nằm trong mép |
//   |---------|---------------------|-------------------|
//   | 360×640 | **425px**           | **2/5**           |
//   | 390×844 | **395px**           | **2/5**           |
//   | 480×800 | 305px               | 3/5               |
//   | 768×1024| 17px                | 4/5               |
//
// Ba mục KHÔNG mất hẳn — `.menu` cuộn ngang được — nhưng dấu hiệu duy nhất là
// 28px mờ ở mép phải một dải cao 48px. `will` là người thứ hai trong repo này
// đọc một đường đi phải-đoán thành "không có" (lần đầu là nút "Quay lại", năm
// người cùng báo). Nên luật ở đây KHÔNG phải "có cuộn được không" mà là **hàng
// nút không được là một vùng cuộn ngang**.
//
// Sau khi xuống hàng, đo lại trên production: **5/5 trong mép ở MỌI khổ**, tràn
// ngang **0**, chip vẫn **48px**, chữ không bị cắt. 3 hàng ở 360–390, 2 từ 480.
//
// GIỚI HẠN PHẢI NÓI RA: cổng này đọc CSS TĨNH. Nó chứng minh được "hàng nút đã
// khai xuống hàng và thôi cuộn ngang", KHÔNG chứng minh được "năm mục nằm trong
// mép" — câu đó cần layout thật, và số đo ở bảng trên là của Chrome trên
// production, không của cổng này.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CSS = readFileSync(join(GOC, 'src', 'components', 'goc-hoc', 'scene.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Thân của MỌI khối `@media (max-width: 820px){…}`, nối lại, cắt bằng phép đếm
 * ngoặc.
 *
 * PHẢI LẤY CẢ BA, không lấy khối đầu. `scene.css` có **ba** khối cùng điều kiện
 * ấy (dòng 83 · 618 · 631) và luật của hàng nút nằm ở khối CUỐI. Bản đầu của
 * hàm này `search()` rồi dừng ở khối thứ nhất — 169 ký tự, không có `.menu` nào
 * — nên nó bóc đúng một khối không liên quan. Lần này nó ĐỎ nên tôi thấy; nếu
 * khối đầu tình cờ có một luật `.menu` thì cổng đã XANH vì lý do sai. Đúng bẫy
 * "một regex mơ hồ là một cổng hỏng, và nó hỏng theo CẢ HAI chiều" trong
 * AGENTS.md.
 */
function khoiDienThoai(css) {
  const re = /@media\s*\(\s*max-width:\s*820px\s*\)\s*\{/g;
  const ra = [];
  let m;
  while ((m = re.exec(css))) {
    const mo = m.index + m[0].length - 1;
    let sau = 1;
    for (let j = mo + 1; j < css.length; j++) {
      if (css[j] === '{') sau++;
      else if (css[j] === '}' && --sau === 0) { ra.push(css.slice(mo + 1, j)); break; }
    }
  }
  return ra.length ? ra.join('\n') : null;
}

/** Thân của luật có selector ĐÚNG BẰNG `sel`, trong một đoạn CSS phẳng. */
function than(doan, sel) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  const ra = [];
  let m;
  while ((m = re.exec(doan))) {
    const ten = m[1].trim().split('\n').pop().trim();
    if (ten.split(',').map((s) => s.trim()).includes(sel)) ra.push(m[2]);
  }
  return ra;
}

const DT = khoiDienThoai(CSS);

test('phép bóc khối điện thoại còn đọc được — rỗng thì mọi luật dưới đây vô nghĩa', () => {
  assert.ok(DT && DT.length > 2000,
    `chỉ bóc được ${DT ? DT.length : 0} ký tự từ các khối @media(max-width:820px) — `
    + 'phép đếm ngoặc đã trượt, và khi đó mọi ca sau XANH vì không chứng minh gì. '
    + 'Đổi ngưỡng 820px thì sửa `khoiDienThoai`, đừng nới ca.');
  assert.ok(than(DT, '.menu').length === 1,
    `khối điện thoại có ${than(DT, '.menu').length} luật cho \`.menu\`, đòi ĐÚNG MỘT — `
    + 'nhiều luật thì cái sau đè cái trước và ca dưới có thể đọc đúng cái không có hiệu lực.');
});

test('hàng nút XUỐNG HÀNG trên điện thoại, không bóp vào một dải cuộn', () => {
  const t = than(DT, '.menu')[0];
  assert.match(t, /flex-wrap\s*:\s*wrap/,
    'khối điện thoại không khai `flex-wrap:wrap` cho `.menu`. Không xuống hàng thì '
    + 'năm mục nằm trên một dải 358px khả dụng trong khi chúng rộng 753px — đo được '
    + '2/5 mục nằm trong mép ở 360 và 390. Xem bảng số ở đầu file.');
  assert.doesNotMatch(t, /flex-wrap\s*:\s*nowrap/,
    '`.menu` khai `nowrap` — đó là chính trạng thái mà người thử đọc ra là "mất nút".');
});

test('hàng nút KHÔNG còn là vùng cuộn ngang, và mặt nạ mờ phải đi theo', () => {
  const t = than(DT, '.menu')[0];
  assert.doesNotMatch(t, /overflow(-x)?\s*:\s*(auto|scroll)/,
    '`.menu` lại cuộn ngang được. Ba mục cuối khi đó nằm ngoài mép và dấu hiệu '
    + 'duy nhất là một vệt mờ 28px — người thử đã đọc nó là "mất nút" một lần rồi.');
  assert.doesNotMatch(t, /mask-image/,
    '`.menu` còn mặt nạ mờ mép phải. Khi đã xuống hàng thì KHÔNG còn gì ở bên phải, '
    + 'nên mặt nạ nói dối: nó mời người dùng vuốt sang một chỗ trống.');
});

test('icon của mục vẫn còn trên điện thoại — biến thể "bỏ icon" đã bị loại, có số', () => {
  const ic = than(DT, '.mi .ic');
  assert.ok(ic.length >= 1, 'khối điện thoại không còn luật nào cho `.mi .ic` — '
    + 'đổi cấu trúc thì sửa ca này, im lặng xanh ở đây là bỏ mất phép đo.');
  for (const t of ic) {
    assert.doesNotMatch(t, /display\s*:\s*none/,
      'bỏ icon ở điện thoại ĐÚNG LÀ cách ép hàng nút xuống còn 2 hàng — đã đo: '
      + '2 hàng, menu cao 81px thay vì 159px. Nhưng chip tụt từ **48px xuống 37px**, '
      + 'dưới cỡ ngón tay, và icon là thứ DUY NHẤT phân biệt năm mục bằng màu '
      + '(c-map/c-book/c-pen/c-tro/c-ph). Ba hàng chip 48px là cái giá rẻ hơn.');
  }
});
