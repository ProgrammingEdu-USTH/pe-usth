# Nạp nội dung giáo trình vào DB production — câu lệnh cho chủ dự án

Viết 17/11/2026. Việc này **chỉ chủ dự án làm được** (cần `DATABASE_URL` của Neon trong `.env`). Nội dung bài học
đọc từ DB, không từ repo: mọi sửa chữ ở bài đọc, đề bài, câu hỏi, gợi ý chỉ tới người học **sau bước này**.

Đã kiểm ngày 17/11/2026 ở chế độ `--offline` (không đụng DB): **179 bài, 0 bài bị từ chối** bởi `validateStudioLesson()`.
Lần nạp trước: 2026-11-07T21:26 UTC. Từ đó đến nay **145/179 bài đã đổi** (`node scripts/check-da-nap.mjs` in danh sách).

## Cách làm (PowerShell, thư mục gốc repo `D:\pe_usth`)

```powershell
cd D:\pe_usth

# 0. Đảm bảo đang ở bản mới nhất của main (bỏ qua nếu đang làm trên chính máy này).
git pull tester main

# 1. Kiểm gói dựng: phải in "0 lỗi, 0 cảnh báo". (Không chạy song song với test: nó đọc out/lessons.json.)
py scripts/pe-da/check.py --strict

# 2. XEM TRƯỚC — chỉ ĐỌC DB, không ghi. In từng bài: giữ nguyên hay đổi (kích thước + sha256 cũ → mới).
npx ts-node scripts/update-lesson-content.ts --all

# 3. NẠP THẬT. Tự ghi file sao lưu content_json CŨ TRƯỚC khi ghi DB; mọi UPDATE nằm trong MỘT transaction
#    (hạn 120 s, thực tế ~5 s); lệch mã bài hoặc một câu không trúng đúng 1 hàng là HUỶ CẢ GÓI.
npx ts-node scripts/update-lesson-content.ts --all --apply --backup=bak-2026-11-17.json

# 4. Kiểm: phải in "179/179 khớp".
node scripts/check-da-nap.mjs

# 5. Commit biên nhận (script tự ghi scripts/pe-da/da-nap.json SAU khi transaction commit).
git add scripts/pe-da/da-nap.json
git commit -m "chore: bien nhan nap DB 17/11/2026"
git push tester main
```

Sau bước 5, báo tôi (hoặc ai chạy vòng lặp): cần **gộp `main` vào `chiem-tinh`** để nhánh đó có cùng biên nhận,
và **lật trigger CI** (`.github/workflows/ci.yml`: `branches: [master]` → `[main, master]`). Lật CI **sau** khi biên nhận
đã vào, không trước: job `giao-trinh-da` chạy `check-da-nap`, và nó đỏ cứng khi biên nhận lệch — lật trước là `main`
đỏ thường trực vì một việc chỉ bạn làm được.

## Nạp được gì, không đụng gì

- Chỉ chạy `UPDATE lessons SET content_json = … WHERE course_id='python_advanced' AND sort_order=… AND lesson_code=…`.
- **Không đụng** `lesson_progress`, `enrollments`, `courses`, không tạo/xoá bài, không đổi cột khác. Tiến độ của tester còn nguyên.
- **KHÔNG dùng `seed-python-advanced-v4.ts --apply`**: nó xoá cả khoá và đặt mọi ghi danh về 0%.

## Sẽ thấy gì sau khi nạp

- Tiêu đề màn bài tập chấm "Tự viết và chạy trong terminal" → **"Tự viết rồi chạy Python"** (108 bài).
- Gợi ý ở 22 bài biểu đồ: "mở một file riêng và gọi plt.show()" → **"mở Bàn thí nghiệm (/ide)"**.
- Đề bài 17 bài không còn chữ "wheel", "WASM", "/pyodide/…".
- Văn phong: bảng thay câu liệt kê, bỏ chữ "Việc…", dịch thuật ngữ nhóm B, bọc backtick định danh.
- Alt text 80 hình, ô ví dụ đầu vào/đầu ra của 130 bài tập, 8 bài tập chấm mới.

## Nếu lỗi

| Dấu hiệu | Nghĩa là | Việc làm |
|---|---|---|
| `22P05 unsupported Unicode escape sequence` | một chuỗi có ký tự NUL (`\u0000`) | `py scripts/pe-da/check.py --strict` sẽ chỉ bài; **đừng** nạp tiếp |
| `Transaction already closed` / `timeout: 5000` | hạn transaction quá thấp | script đã đặt 120 s; nếu vẫn thấy, báo lại |
| "0 câu nào chạy ⇒ hỏng ở bước lấy kết nối" | sai `DATABASE_URL` / Neon đang ngủ | chạy lại sau 30 s; chưa ghi gì |
| "có câu đã chạy ⇒ hỏng giữa chừng" | transaction đã **rollback**, DB nguyên vẹn | file `bak-*.json` vẫn được ghi — **file sao lưu tồn tại KHÔNG có nghĩa là đã nạp**; chỉ biên nhận mới nói đã nạp |
| lệch `lesson_code` ở `sort_order` nào đó | bố cục khoá trong DB khác gói | dừng, không ghi gì; xử lý bằng tay |

## Hoàn tác (nếu sau khi nạp thấy nội dung hỏng)

Không có script khôi phục riêng; dùng chính đường nạp với **gói cũ**. Gói đang nằm trong DB trước ngày 17/11 là bản ở
commit `47286fc` (lần cuối đổi `out/lessons.json` trước lần nạp 07/11):

```powershell
git checkout 47286fc -- scripts/pe-da/out
npx ts-node scripts/update-lesson-content.ts --all --apply --backup=bak-2026-11-17-hoantac.json
git checkout HEAD -- scripts/pe-da/out        # trả gói về bản mới nhất
```

Rồi **không** commit `da-nap.json` mới (biên nhận sẽ ghi gói cũ). Hoặc dùng `bak-2026-11-17.json` làm nguồn đối chiếu:
file có dạng `{ exportedAt, courseId, lessons: [...] }` chứa `content_json` cũ của từng bài.

## Chỗ khai báo giới hạn

Biên nhận nói "lần nạp ĐÃ xảy ra", **không** nói "DB hiện giờ vẫn đúng bản đó" — ai ghi đè bằng đường khác thì cổng
`check-da-nap` mù. Đó là cổng chống QUÊN NẠP, không phải chống DB trôi.
