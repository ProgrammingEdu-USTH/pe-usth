1. Tạo 1 thư mục riêng cho môn học (vd `sql/` hoặc `ml/`) rồi gửi nguyên thư mục cho Nhân — Nam không cần chạy code.
2. Đặt file `course.json` trong thư mục gồm: `id` (vd `sql`), `title`, `subtitle`, `description`, `level` (`beginner` / `intermediate` / `advanced`).
3. Đặt kèm file `lessons.json` (hoặc thư mục `lessons/` gồm các file `001-MA01.json`...) đúng mẫu ở `scripts/fixtures/sample-course/`.
4. Mỗi bài bắt buộc có đủ: `lesson_code`, `sort_order` (1, 2, 3… liên tục), `module` (`M1 · Tên chặng`), `title`, `estimated_minutes` (> 0), `xp_reward`, và `content_json`.
5. Khi nhận bài, Nhân chỉ chạy 1 lệnh `python3 scripts/sync_curricula.py --bundle <thư_mục> --course <mã_môn>` để tự chép giáo trình, tính số bài/giờ thật và kiểm bằng unit test.
