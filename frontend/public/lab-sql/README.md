# lab-sql — phòng thí nghiệm SQL trong bài học (bản THỬ NGHIỆM, bài AD01)

Trang tĩnh tự chứa, cùng kiểu với `public/quan-may/`: không đi qua Next, không framework. Mở ở
`/lab-sql/ad01.html` (noindex). Chạy SQL bằng **sql.js** (SQLite) trong một Web Worker; chấm bài bằng cách
chạy câu của người học trên dữ liệu của quán và trên dữ liệu thử thêm rồi so tập hợp hàng với đáp án mẫu.

## Bốn bước, mỗi bước là một việc tay làm
Phản hồi người thử 26/11/2026: bản đầu "chỉ bấm bấm rồi trôi qua", chữ bị đọc lướt, đáp án trắc nghiệm đoán được bằng
cách chọn câu dài nhất; đợt sau: "vẫn quá nhiều lỗi và đọc vẫn chưa hiểu toàn bộ ngữ cảnh". Kiểm toán bản đang chạy ra gốc
rễ: người học KHÔNG BAO GIỜ THẤY dữ liệu (ba bảng), không thấy luật của báo cáo (một hàng một đơn, NULL khác 0, `amount` đầu
đơn không thay được tổng chi tiết), và gặp JOIN/NULL/grain khi chưa ai giải thích. Trang trí (cảnh quầy) chiếm chỗ của đúng
thứ cần đọc; trên điện thoại ô gõ nằm dưới ba màn hình cuộn; lỗi SQL hiện nguyên tiếng Anh. Nên:
0. **Vụ việc**: ba bảng thật, luật báo cáo, bảng "Từ cần biết", và một việc tay làm: bấm tìm mọi dòng của đơn 101 (5 dòng).
   Dữ liệu và luật đến TRƯỚC câu hỏi đầu tiên.
1. **Đoán**: gõ HAI con số (số hàng sau khi nối, tổng tiền hàng), không có phương án nào để chọn. Chốt xong bảng nối hiện từng
   hàng; bấm một hàng thì nét nối tương ứng trên quầy đổi màu.
2. **Thử**: ba núm vặn (gom dòng hàng · gom thanh toán · giữ đơn thiếu). Mỗi lần vặn, số nét nối trên quầy đổi 4 → 2 → 1,
   câu SQL sinh ra đổi theo (`xayCau` trong `ad01-data.js`, có test 8 tổ hợp) và bảng kết quả chạy lại ngay.
3. **Viết**: tự gõ lại câu sửa, chấm trên dữ liệu của quán và dữ liệu thử thêm (ẩn).

Bối cảnh để người học muốn làm thêm (26/11, sau khi xem bản mô phỏng Call Stack 2.5D của nhóm làm script): chủ quán ĐỌC báo cáo
để chốt tiền và quyết định nhập hàng, nên có "sổ báo cáo" nói bằng hậu quả (báo cáo ghi 250k, két chỉ 150k → chủ quán định đặt thêm
hàng); "tòa nhà truy vấn" mỗi phép nối là một tầng, sàn phình theo số hàng (đếm bằng chính SQL, không tính tay); dòng "điều vừa
đổi" nối lời Linh với số thật sau mỗi lần vặn; và ở cuối, câu của người học chạy trên số liệu NGÀY MAI để thấy vì sao bài chấm
có dữ liệu ẩn.

Quy tắc rút ra cho bài sau: mỗi bước phải có một thao tác người học TỰ làm và thấy hậu quả ngay; câu hỏi có phương án thì
phương án phải cùng độ dài và cùng giọng; nhiệm vụ không được đạt sẵn từ lúc mở (đã gặp: nhiệm vụ "giữ đơn 104" đạt ngay vì
dữ liệu mẫu luôn có đơn đó, nên được viết lại thành "cả bảng khớp").

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
