/* Dữ liệu và đề của bài thử AD01 "Một tổng đúng có thể đến từ query sai".
 * Nguồn nội dung: Database Advanced AD01, mục "Một tổng đúng có thể đến từ query sai"
 * (D:\Giao_Trinh_PE nhánh Advanced_DB: PE_Database_Advanced/lessons/AD01.md).
 *
 * NHÃN NGUỒN KẾT QUẢ: chạy bằng SQLite (sql.js) trong trình duyệt. Gói gốc dùng MySQL 8.4 với
 * fixture advanced_core.sql; ở đây bảng được dựng lại NHỎ HƠN và chỉ cho đúng phần JOIN/GROUP BY/CTE,
 * nơi hai hệ cho cùng kết quả. Đừng dùng đề này để dạy hành vi riêng của MySQL.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LabSqlAd01 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BANG = `
CREATE TABLE purchases      (id INTEGER PRIMARY KEY, status TEXT, amount INTEGER);
CREATE TABLE purchase_lines (id INTEGER PRIMARY KEY, order_id INTEGER, item TEXT, amount INTEGER);
CREATE TABLE payments       (id INTEGER PRIMARY KEY, order_id INTEGER, amount INTEGER);
`;

  // Dữ liệu của quán: đơn 101 có hai dòng hàng (60, 40) và hai lần thanh toán (60, 40).
  const QUAN = BANG + `
INSERT INTO purchases VALUES (101,'paid',100),(102,'paid',50),(103,'pending',70),(104,'paid',30);
INSERT INTO purchase_lines VALUES (1,101,'Trà đào',60),(2,101,'Bánh',40),(3,102,'Cà phê',50);
INSERT INTO payments VALUES (1,101,60),(2,101,40),(3,102,50);
`;

  // Dữ liệu thử thêm (ẩn): đơn 201 có HAI món cùng giá 40 (bác SUM(DISTINCT)); đơn 202 đã paid,
  // có dòng hàng nhưng chưa có thanh toán (bác INNER JOIN và việc đổi NULL thành 0).
  const THU_THEM = QUAN + `
INSERT INTO purchases VALUES (201,'paid',80),(202,'paid',25),(203,'pending',10);
INSERT INTO purchase_lines VALUES (4,201,'Latte',40),(5,201,'Mocha',40),(6,202,'Trà',25),(7,203,'Nước',10);
INSERT INTO payments VALUES (4,201,40),(5,201,40);
`;

  const SAI = `SELECT p.id, SUM(l.amount) AS line_total, SUM(m.amount) AS paid_total
FROM purchases p
LEFT JOIN purchase_lines l ON l.order_id = p.id
LEFT JOIN payments m ON m.order_id = p.id
WHERE p.status = 'paid'
GROUP BY p.id
ORDER BY p.id;`;

  const DAP_AN = `WITH line_sum AS (
  SELECT order_id, SUM(amount) AS total FROM purchase_lines GROUP BY order_id
), pay_sum AS (
  SELECT order_id, SUM(amount) AS total FROM payments GROUP BY order_id
)
SELECT p.id, l.total AS line_total, m.total AS paid_total
FROM purchases p
LEFT JOIN line_sum l ON l.order_id = p.id
LEFT JOIN pay_sum m ON m.order_id = p.id
WHERE p.status = 'paid'
ORDER BY p.id;`;

  return {
    ma: 'AD01-L1',
    tieuDe: 'Hai lần thanh toán, tổng gấp đôi',
    QUAN,
    SAI,
    DAP_AN,
    de: {
      dapAn: DAP_AN,
      duLieu: [
        { ten: 'Dữ liệu của quán', an: false, sql: QUAN },
        { ten: 'Dữ liệu thử thêm', an: true, sql: THU_THEM },
      ],
    },
    doan: {
      cauHoi: 'Đơn 101 có hai dòng hàng (60 và 40) và hai lần thanh toán (60 và 40). Sau khi nối cả hai bảng vào đơn rồi cộng, tổng tiền hàng (line_total) của đơn 101 sẽ là bao nhiêu?',
      luaChon: ['100', '150', '200', 'SQL báo lỗi'],
      dung: 2,
      giaiThich: 'Mỗi dòng hàng ghép với MỖI lần thanh toán của cùng đơn: 2 × 2 = 4 cặp (60,60), (60,40), (40,60), (40,40). Cộng cột tiền hàng qua 4 cặp ra 60 + 60 + 40 + 40 = 200. Không có lỗi cú pháp, chỉ có số sai.',
    },
    goiY: [
      'Tầng 1: đếm số hàng của đơn 101 sau hai lần JOIN. Nếu nhiều hơn số dòng hàng thì dòng hàng đã bị nhân bản.',
      'Tầng 2: cộng tiền hàng và cộng tiền thanh toán RIÊNG, mỗi bên gom về một hàng cho mỗi đơn, rồi mới ghép với bảng đơn.',
      'Tầng 3: dựng hai bảng tạm bằng WITH (line_sum và pay_sum, mỗi bảng GROUP BY order_id), rồi LEFT JOIN cả hai vào purchases. Nhớ vẫn giữ đơn 104 chưa có dòng nào.',
    ],
  };
});
