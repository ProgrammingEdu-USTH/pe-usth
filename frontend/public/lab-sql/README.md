# lab-sql — phòng thí nghiệm SQL trong bài học (bản THỬ NGHIỆM, bài AD01)

Trang tĩnh tự chứa, cùng kiểu với `public/quan-may/`: không đi qua Next, không framework. Mở ở
`/lab-sql/ad01.html` (noindex). Chạy SQL bằng **sql.js** (SQLite) trong một Web Worker; chấm bài bằng cách
chạy câu của người học trên dữ liệu của quán và trên dữ liệu thử thêm rồi so tập hợp hàng với đáp án mẫu.

## Nguồn và giấy phép
- Engine: `vendor/sql-wasm.js` + `vendor/sql-wasm.wasm` = sql.js 1.17.0 (MIT, xem `vendor/LICENSE-sqljs.txt`);
  SQLite thuộc phạm vi công cộng. Chép từ gói npm `sql.js@1.17.0`, không sửa.
- Nội dung: Database Advanced, bài AD01, mục "Một tổng đúng có thể đến từ query sai"
  (`PE_Database_Advanced/lessons/AD01.md` ở nhánh `Advanced_DB` của repo Giao_Trinh_PE). Bảng được dựng lại NHỎ HƠN
  bằng SQLite; không phải fixture MySQL `advanced_core.sql` của gói gốc.

## Vì sao thiết kế thế này (máy yếu)
Đã đo 26/11/2026 trong Chromium: sql.js khởi động 37–52 ms bình thường, 159–229 ms khi giả lập CPU chậm 4×,
khoảng 0,34 MB gzip. PGlite (Postgres) 2,0–2,2 s và 14–15 s ở CPU chậm 4×, khoảng 5,3 MB gzip, nên chỉ dành cho
bài thật sự cần `EXPLAIN`/isolation Postgres (chưa làm). Engine KHÔNG nạp khi mở trang, chỉ ở lần chạy đầu. Hình là SVG,
hoạt ảnh duy nhất là CSS transition, tôn trọng `prefers-reduced-motion`. Mỗi lần chạy có hạn 5 giây
(terminate + dựng lại worker) vì sql.js chạy đồng bộ.

## Giới hạn đã biết
- SQLite ≠ MySQL: bài hành vi riêng của MySQL (gap lock, isolation) không nên dùng engine này.
- Đáp án mẫu và dữ liệu ẩn nằm ngay trong tệp JS tĩnh: ai mở DevTools đều thấy. Có chủ ý (đang thử nghiệm, chủ dự án
  chấp nhận lộ đáp án), nên kết quả chấm chỉ là phản hồi học, không phải bằng chứng thi.
- Chưa ghi nhật ký học tập, chưa lưu tiến độ, chưa nối vào khóa học hay vào đo phễu.
- Đây là MỘT bài. Số loại khối mới (đoán → chạy → sửa → chấm; hình ghép) cần đếm khi làm thêm vài bài trước khi
  quyết có tách thành khối khai báo dùng chung hay không.

## Thêm một bài
Một bài = một `adNN-data.js` (bảng, dữ liệu, đề: `dapAn`, `duLieu` có bộ `an: true`, gợi ý 3 tầng) + một màn hình.
Bộ dữ liệu thử thêm phải chứa đúng loại ca mà một cách sửa sai hay gặp sẽ vượt qua tình cờ. Mỗi đề cần test trong
`frontend/e2e/unit/lab-sql-*.test.mjs` chứng minh cả cách viết khác đạt lẫn cách sai bị bắt.
