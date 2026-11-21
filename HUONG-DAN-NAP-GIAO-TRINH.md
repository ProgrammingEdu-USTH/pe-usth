# Nạp giáo trình vào DB — chọn đúng đường

Chọn sai là xoá tiến độ của người đang học. Đọc bảng này trước khi chạy bất kỳ lệnh nào.

| Việc cần làm | Dùng | Đụng tiến độ? |
|---|---|---|
| Sửa NỘI DUNG bài đã có trong DB | `scripts/update-lesson-content.ts` | Không |
| Thêm BÀI/KHOÁ mới (chưa có `sort_order` đó) | Đường admin: `POST /admin/lessons/import` → `POST /admin/courses` → `POST /admin/lessons` | Không |
| Khoá còn TRỐNG, nạp lần đầu | `scripts/seed-python-advanced-v4.ts --apply` | **XOÁ hết** bài và `lesson_progress` của khoá |
| Hoàn tác một lần sửa nội dung | `scripts/restore-lesson-content.ts --from=<file sao lưu>` | Không |

Mọi lệnh ghi chạy trên branch Neon thử trước (`DATABASE_URL` trỏ branch thử, xem AGENTS.md mục "Quy ước migration và môi trường DB"). Không bao giờ chạy lần đầu trên DB thật.

## 1. Sửa nội dung bài đã có — `update-lesson-content.ts`

Chỉ chạy `UPDATE lessons SET content_json` theo `(course_id, sort_order)` và phải trùng `lesson_code`; không tạo/xoá bài, không đổi cột khác. Chỉ dùng cho khoá `python_advanced` và gói `scripts/pe-v4/out-advanced/lessons.json`.

```bash
npx ts-node scripts/update-lesson-content.ts --codes=P01,P02 --offline      # kiểm gói, không cần DB
npx ts-node scripts/update-lesson-content.ts --codes=P01,P02                # xem trước (sha256 cũ → mới)
npx ts-node scripts/update-lesson-content.ts --codes=P01,P02 --apply --backup=backups/noi-dung-<ngay>.json
npx ts-node scripts/check-db-invariants.ts                                   # PHẢI "Tất cả đạt"
py scripts/pe-v4/sync_curricula.py                                           # chép giáo trình sang frontend
```

Nếu script báo "bố cục khoá lệch gói, không ghi" thì DB đang có giáo trình khác gói (xem AGENTS.md, bẫy "DB thật không có cùng giáo trình"). Đó là chốt chặn đúng, đừng sửa script để lách.

## 2. Thêm bài/khoá mới — đường admin

Cần tài khoản `admin` (JWT). Định dạng bài: [LESSON-IMPORT-FORMAT.md](LESSON-IMPORT-FORMAT.md).

1. `POST /admin/lessons/import` (multipart, trường `file` là `.md` hoặc `.pdf`): chỉ trả BẢN NHÁP, không ghi DB. Đọc lại, sửa JSON nếu cần.
2. Khoá mới: `POST /admin/courses`. Id ngắn, không dấu (ví dụ `sql_co_ban`) — id nằm trong URL `/courses/:id` và trong `frontend/src/lib/catalog.ts`.
3. `POST /admin/lessons` cho từng bài. `sort_order` đánh liên tục từ 1; `lesson_code` duy nhất trong khoá (bài tra theo `(course_id, sort_order)`). Mỗi lần tạo/xoá bài, service tự cập nhật `courses.lessons` (`syncLessonCount`).
4. `npx ts-node scripts/check-db-invariants.ts` — `courses.lessons` phải bằng số bài thật.
5. Thêm khoá vào `frontend/src/lib/catalog.ts` và chép giáo trình (`sync_curricula.py`), rồi mở thử bài đầu và bài cuối.

## 3. Nạp lần đầu khoá trống — `seed-python-advanced-v4.ts --apply`

`deleteMany` cả bài lẫn `lesson_progress` của khoá, rồi đặt mọi ghi danh về 0%. Chỉ dùng khi khoá CHƯA có ai học. Khoá đang có học viên thì dùng mục 1 hoặc 2.

## 4. Khôi phục từ file sao lưu

`--backup=<file>` của `update-lesson-content.ts` ghi `content_json` CŨ của đúng các bài sắp đổi. Đọc ngược bằng:

```bash
npx ts-node scripts/restore-lesson-content.ts --from=backups/noi-dung-<ngay>.json           # xem trước
npx ts-node scripts/restore-lesson-content.ts --from=backups/noi-dung-<ngay>.json --apply
npx ts-node scripts/check-db-invariants.ts
```

Một transaction; mỗi câu phải trúng đúng 1 hàng (bài đã bị xoá/đổi mã thì huỷ cả lần). Thư mục `backups/` đã bị git bỏ qua: file sao lưu chứa nội dung bài, không commit.

## Sau mọi lần nạp

1. `npx ts-node scripts/check-db-invariants.ts` phải "Tất cả đạt".
2. `py scripts/pe-v4/sync_curricula.py` để `curricula.json` khớp DB.
3. Mở thử một bài trong trình duyệt: đọc, chạy mã, hoàn thành.
