# Nhánh `test` ↔ `main`: cái gì đã lấy, cái gì cố ý chưa

Sổ cái của đợt rà soát 23/11/2026 (Kanzo #363). Nguồn: `git log c53617c..tester/test` (58 commit, 55 thường + 3 merge) và `git diff` từng tệp.
Mỗi mục "ĐÃ LẤY" có thông điệp commit trên `main` ghi số đo, ablate và phần sửa khi port. Muốn biết vì sao một mục chưa lấy: đọc cột lý do **trước khi**
bê nó — nhiều mục trông "sạch" về văn bản nhưng làm ngược một quyết định của `main`.

**Luật port:** lấy QUYẾT ĐỊNH, không lấy mã nguyên khối; lấy SỐ của `main`. `test` là một khung frontend khác (`LofiWorkspace`, 3 531 dòng; xoá 237 tệp mà `main` còn nạp),
gộp cả nhánh = 130 xung đột. Nhiều commit của `test` là commit gộp (736a82a 71 tệp, ad130c3 195 tệp, 929aff1 195 tệp): lấy THEO ĐƯỜNG DẪN, đừng cherry-pick nguyên hash.

## ĐÃ LẤY vào `main`

| Từ `test` | Cái gì | Ghi chú |
|---|---|---|
| 7f5c8d6 | lockfile backend (Prisma 7.10.1, multer 2.5.0…) | `npm audit` phần production 12 → 3. Chưa chạy Prisma 7.10.1 trên Neon thật |
| d0ede61 · 8cf3a96 · 047ad35 | BE3 hoàn thành bài song song · BE7 diễn đàn đếm ở DB + 26 ca | |
| 846eea1 · 2e5d04d | BE5 `/enrolled` một vòng DB | SQL thô đã chạy trên Postgres thật (PGlite); jest-mock không bắt được lỗi JOIN |
| 71d3337 | cảnh báo thiếu migration lúc khởi động | chỉ log, chạy nền |
| 83e1cf1 | dọn tài khoản khách (mặc định chạy thử) | sửa: thêm `learning_events`, `learning_event_consents` vào `CASCADE_REFS`; regex đọc migration một dòng → `\s+` |
| 8a7af2e | hạn mức riêng cho tạo bài/bình luận diễn đàn | bỏ khoá `THROTTLE_PY_*` (runner Python ở máy chủ đã xoá) |
| 41b5096 | `check-db-invariants.ts` (chỉ đọc) + `fix-course-lessons.ts` + luật đếm bài hoạt động | mục 7 báo 22 khoá ngoại thiếu chỉ mục |
| 736a82a (một phần) | `redact-url` (che query ở log 5xx) · `restore-lesson-content.ts` · `db-errors` + `RetryReadInterceptor` · `Semaphore` (vách ngăn `completeLesson`) | xem các mục ở AGENTS.md. Phần còn lại của commit này: bảng dưới |
| cf16be7 + 33834e6 (viết lại) | nav SSR cho trang chủ | chỉ MỘT liên kết (e2e đòi "một cửa"); KHÔNG lấy phần glow nạp lười |
| 929aff1 (ý tưởng) | `LESSON_META` trong `curricula.json` | viết lại ~11 dòng, không lấy script 810 dòng |

## Nhánh `thu/test-cherry-db` (CHƯA vào `main`: cần migration áp lên DB thật TRƯỚC)

`e8eb0a9` (XP theo ngày, unique + upsert — mã chạy trước migration sẽ lỗi), `fk_indexes` (từ ad130c3; 22 khoá ngoại thiếu chỉ mục → 0), `forum_post_indexes` (6897f9d),
`autovacuum_tuning` (từ 736a82a). Đã áp sạch toàn chuỗi 10 migration lên Postgres thật cục bộ (DB rỗng). Thứ tự: chạy `check-db-invariants.ts` → áp migration → push.

## CHƯA LẤY — cần chủ dự án quyết

| Từ `test` | Cái gì | Vì sao chưa |
|---|---|---|
| ac64816 · 7f3242f · 997bf0d | "học lại khoá" (xoá `lesson_progress`), hồ sơ, cờ `NEXT_PUBLIC_*_MOCK` | mock mặc định BẬT (báo thành công giả); xoá tiến độ lệch phễu/giữ chân |
| 85e1747 · 1bbd05a · d4efbbe · `placement/*` | câu hỏi đầu vào / placement | FE gọi route khác BE; bảng `questionnaires` 0 hàng |
| dd3ea99 | đăng nhập/đăng ký giao diện | `main` là khách-chỉ (quyết định 04/11) |
| ace0e55 + 8d95a7f | diễn đàn Góc học (UI 2 034 dòng) | quyết định sản phẩm (tự học, không lớp học); BE7 đã vào |
| 736a82a: BE12 (`auth.service`, `login-attempt-limiter`, upgrade khách) + `users_phone_unique` | khoá đoán mật khẩu, nâng khách thành tài khoản giữ `user_id` | gắn migration unique phone (có thể trượt dữ liệu thật; Django dùng chung DB); lockout 15 phút là đánh đổi |
| 736a82a: `neon-pool`, `events-prisma.service` | pool có giám sát, Prisma riêng cho sự kiện | đụng lõi kết nối DB; thêm pool = thêm kết nối Neon |
| ad130c3 / 736a82a: `event-retention`, `rollup-heartbeats`, `learning_time_daily` | gộp Heartbeat, xoá quá 90 ngày | `main` CỐ Ý "không có job tự xoá" (`learning-event-kinds.ts`); gộp Heartbeat đổi phạm vi thu thập và làm mất `screen_key` |
| 736a82a: `scripts/db/create-app-roles.sql` (DB9) | hai role `pe_app`/`pe_migrator` | ĐỔI CHỦ SỞ HỮU mọi bảng của DB dùng chung với Django; tác giả ghi "DB thật CHƯA chạy" |
| 736a82a: `course-bundle`, `seed-course-bundle.ts` | nạp khoá mới bằng bundle | thuộc kế hoạch khoá Database (#310), chưa có quyết định |
| 48ca468 · 4feeb38 · d6074fe | BE4 cache `step_2`, BE10 giảm vòng transaction | `quizzes.service` của `main` viết lại 411 dòng; BE10 trộn với code "học lại" |
| d650f94 | `BE1-MOC-DO.md` | lộ định danh endpoint Neon trên repo CÔNG KHAI |
| glow lười (phần của cf16be7) | chỉ tải ảnh `-g.webp` khi hover | xoá vầng sáng "thở" nghỉ (`.glowi`, opacity 0,1–0,28). Nếu muốn tiết kiệm ~414 KB: nạp khi rảnh sau load, và đo |

## KHÔNG LẤY — đã có, đã thay thế hoặc thuộc khung khác

`206708e` `4228229` `3f7631b` `fd38f31` `4c3494d` `c07cfa8` `7af7646` `a3941c3` (chuỗi `LofiWorkspace`/tủ sách/ôn tập mock) · `b5a054d` `95b9a52` (xoá tệp `main` còn nạp) ·
`cd206ad` `9bb800b` `c086bc0` `ced0611` (dashboard Figma, đã thay bằng cảnh Góc học) · `5c7c439` `439adb3` (màn lắp khung mã, `ScaffoldBook` không còn) · `a583685` `d41abf5` `c817a03`
`fa42c05` `22224a8` `315c624` `a6cda06` (`main` đã có bản tốt hơn hoặc đã sửa) · `d60e49d` (learning-events API: `main` đã có bản mới hơn) · `ci.yml` / `AGENTS.md` / `db-jobs.yml` của `test`
(trần lint 170, thiếu ~19 bước kiểm; `db-jobs.yml` bật cron xoá dữ liệu).

## Bẫy khi port (đã gặp)

- `core.autocrlf=true` cấp hệ thống: worktree mới và mọi lệnh git GHI vào cây phải kèm `-c core.autocrlf=false` (xem BAY-DA-GAP.md).
- `git switch` / `git stash pop` không kèm cờ trên cũng ghi lại tệp bằng CRLF — kiểm `git ls-files --eol | grep -c w/crlf` trước khi sửa tệp bằng chuỗi nhiều dòng.
- Junction `node_modules` dùng được cho typecheck/unit/lint, KHÔNG dùng được cho `next build`/e2e (Turbopack từ chối): `npm ci` thật.
- Số hiệu năng trong thông điệp commit của `test` là của tác giả, đo trên nhánh Neon riêng; chưa số nào được tái hiện ở đây.
