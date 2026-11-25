# Nguồn được chọn cho Database Advanced

Giữ file này cùng các bản sao hoặc phần chuyển thể liên quan. Không hàm ý tác giả upstream xác nhận khóa PE.

## Hermitage

Copyright Martin Kleppmann, 2014. Nguồn: https://github.com/ept/hermitage tại commit `f029bec8e32af6a9506508638fdf74ef61286225`. License: Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/ . Văn bản: https://creativecommons.org/licenses/by/4.0/legalcode.en . Thông báo license upstream được giữ trong `hermitage-license-notice.md`.

Phần chuyển thể của PE: chọn các lịch G1a/PMP/P4 từ `mysql.md`, đổi sang bước có cấu trúc cho hai session web, dùng MySQL 8.4.13 và `@@transaction_isolation`, thêm kiểm lock wait và bài sửa atomic increment. Giảng giải, fixture chuyển giao và code kiểm mới do PE biên soạn. Không sao chép epigraph Bertrand Russell hoặc chương sách DDIA.

Với phần CC BY được chuyển thể, giữ tác giả, link nguồn/license và thông báo thay đổi ở bài/nguồn xuất ra; không áp hạn chế bổ sung ngăn người nhận thực hiện các quyền license đã cấp. Việc khóa có thu phí không đổi grant này.

## E-commerce query optimizer demo

Copyright (c) 2026 Jennifer Sengun. MIT License, nguyên văn tại `ecommerce-MIT.txt`. Nguồn: https://github.com/jsengun/ecommerce-query-optimizer-demo tại commit `c594df3824a82db731946a3fa106ccd679eb1848`.

Phần chuyển thể: mẫu query equality/range và ý tưởng thí nghiệm index; đổi placeholder và DDL sang MySQL, thêm tie-breaker, fixture/oracle độc lập và ca lỗi. Không dùng số timing/speedup trong README làm đáp án chuẩn. Bộ test gốc không được dùng như checker đủ tin cậy.

## Chinook Database

Copyright (c) 2008-2024 Luis Rocha. MIT License, nguyên văn tại `chinook-MIT.txt`. Nguồn: https://github.com/lerocha/chinook-database tại commit `7f67772503d71ba90f19283c38e93923addb43fa`.

Phần dùng: table/data payload MySQL của fixture Chinook1.4.5. Bản đóng gói đã bỏ ba lệnh DROP/CREATE/USE database; backend phải cấp schema mới, rỗng, chọn schema đó trên connection và dừng nếu có lỗi. Không nhận schema đã tồn tại để nạp lại. Bài tập PE mới không phải bài tập upstream. Không phân phối audio hoặc tác phẩm âm nhạc. Giữ copyright/permission cùng script hoặc phần đáng kể được phân phối.

## BusTub — chưa tích hợp

Copyright (c) 2019 CMU Database Group. MIT core license được lưu ở `bustub-MIT.txt` để phục vụ audit. Nguồn: https://github.com/cmu-db/bustub tại commit `e42a66f171093c138464b8302f5c3677a08e2ce4`.

Lần này không nhập code/lab BusTub vào đường bắt buộc, chưa build/test. Nếu dùng về sau, rà từng third-party notice, điều kiện môi trường và hướng dẫn academic integrity; không đăng lời giải project của sinh viên.
