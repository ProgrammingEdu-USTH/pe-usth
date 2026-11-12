/**
 * Phép bóc rule CSS — DÙNG CHUNG, không chép.
 *
 * Tách ra khỏi `dich-bam-vo-bai-hoc.test.mjs` ngày 10/11/2026, khi cổng thứ hai
 * (`ide-thanh-cong-cu.test.mjs`) cần đúng phép bóc này. Lý do không chép: chính
 * `selCua` ở đây đã TỪNG hỏng — bản đầu lấy dòng CUỐI của phần selector nên một
 * rule viết `.restoredAction,\n.restoredClose {` đánh rơi hẳn tên đầu, và nó rơi
 * IM LẶNG (độ phủ chỉ co lại, không luật nào đỏ). Một bản chép thứ hai sẽ giữ
 * nguyên lớp lỗi đó vào ngày ai sửa bản gốc. Cùng lý lẽ đã buộc `raw_doan()`
 * trong `check_vanphong.py` gom hai người dùng về một hàm.
 *
 * Tên tệp mở đầu bằng `_` và KHÔNG mang `.test.mjs`: bộ chạy dùng glob
 * `e2e/unit/*.test.mjs` (xem `package.json` và `scripts/dem-ca-test.mjs`), nên
 * tệp này không bị chạy như một bộ test rỗng.
 */

/** Bỏ chú thích TRƯỚC khi quét — một câu văn xuôi nhắc tên thuộc tính đã làm
 *  cổng đỏ oan ba lần trong repo này. */
export const boChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ');

/**
 * MỌI selector của một rule, không chỉ dòng cuối.
 *
 * Bản đầu lấy `.split(/[\n;]/).pop()` — tức DÒNG CUỐI — nên một rule viết
 * `.restoredAction,\n.restoredClose {` chỉ còn `.restoredClose`, và
 * `.restoredAction` RƠI KHỎI phép quét hoàn toàn. Một đích bấm không bao giờ
 * được kiểm trong khi cổng vẫn in 0 lỗi: đúng hình dạng "cổng rỗng".
 *
 * Cắt sau dấu `;` CUỐI để bỏ các at-rule không có khối (`@import …;`) lọt vào
 * phần văn bản giữa hai dấu ngoặc.
 */
export function selCua(tho) {
  return tho.slice(tho.lastIndexOf(';') + 1)
    .split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Mọi rule trong file, kèm điều kiện `@media` nếu có.
 *
 * Phải cắt `@media` TRƯỚC khi duyệt rule: một `height: 44px` nằm trong
 * `@media (max-width: 560px)` là giá trị của KHỔ ĐIỆN THOẠI, còn `height: 40px`
 * ngoài đó là giá trị desktop. Gộp chúng lại là đọc sai cả hai.
 *
 * Tham số BẮT BUỘC: bản cũ có `van = CSS` mặc định trỏ vào một file cụ thể, và
 * một mặc định như thế trong một module dùng chung là chỗ để gọi sai mà không
 * ai thấy.
 */
export function moiRule(van) {
  const ma = boChuThich(van);
  const ra = [];
  for (const mm of ma.matchAll(/@media([^{]*)\{([\s\S]*?)\n\}/g)) {
    for (const m of mm[2].matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      ra.push({ sels: selCua(m[1]), than: m[2], media: mm[1].trim() });
    }
  }
  const ngoai = ma.replace(/@media[^{]*\{[\s\S]*?\n\}/g, ' ');
  for (const m of ngoai.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    ra.push({ sels: selCua(m[1]), than: m[2], media: null });
  }
  return ra;
}

/** Giá trị px của một thuộc tính trong thân rule, hoặc null. */
export const px = (than, prop) => {
  const m = new RegExp(`(?:^|[;{\\s])${prop}\\s*:\\s*([\\d.]+)px`).exec(than);
  return m ? parseFloat(m[1]) : null;
};

export const phanTram = (than, prop) => new RegExp(`${prop}\\s*:\\s*100%`).test(than);
