# BE1 — Mốc đo trước khi sửa: số truy vấn và thời gian của các route nóng

Đo ngày 11/11/2026 trên bản `origin/main` commit `4966480`. Đây là phần BE do Kiên viết; mọi
số dòng trong sheet phân việc đều trỏ vào bản này. Sau mỗi task BE3–BE7, đo lại đúng các dòng
dưới đây rồi thêm cột "sau".

## Bảng mốc

Mỗi ca gọi **30 lần tuần tự**. p50/p95 đo phía client, tính cả thời gian HTTP. Số truy vấn do
**máy đếm** từ log `query` của Prisma theo từng request, cộng thêm 1 cho `BEGIN` ẩn ở những
route có transaction (giải thích ở mục sau).

| Route | Ca đo | Số truy vấn | Vòng tuần tự | p50 (ms) | p95 (ms) |
|---|---|---|---|---|---|
| `GET /api/enrolled` | đã ghi danh 1 khoá, 0 bài xong | 5 | 5 | 290 | 343 |
| `GET /api/enrolled` | đã xong 172 bài | 5 | 5 | 420 | 524 |
| `GET /api/courses/:id/lessons/:n/content` | bài 1–30, chưa xong, không phải bài cửa | 3 | 2 | 142 | 377 |
| `POST /api/lessons/:n/complete` | hoàn thành lần đầu, bài 1–30 | 16 (+3 mỗi thành tích trao được) | 13 (+3 mỗi thành tích) | 881 | 1 588 |
| `POST /api/lessons/:n/complete` | làm lại bài đã xong, có `quizScore` | 11 | 11 | 744 | 1 127 |
| `GET /api/quiz/today` | hôm nay xong 30 bài | 3 | 3 | 372 | 765 |
| `GET /api/quiz/today` | hôm nay xong 172 bài (ca biên) | 3 | 3 | 822 | 2 369 |
| `GET /api/courses/:id/quiz/status` | đã xong 30 bài | 2 | 2 | 165 | 207 |
| `GET /api/courses/:id/quiz/status` | đã xong 172 bài | 2 | 2 | 563 | 2 298 |
| `POST /api/events` | lô 20 sự kiện, đã đồng ý ghi | 4 | 4 | 285 | 318 |

Số truy vấn ổn định qua cả 30 lượt của mỗi ca. Các lượt lệch đều do hai khoản cộng thêm dưới
đây, không lượt nào lệch vì lý do khác.

**Khoản cộng thêm (không tính trong bảng):**
- **+1 truy vấn, +1 vòng:** cache user của JWT hết hạn. Cache sống 60 giây; lúc đó máy chủ đọc
  lại cả hàng `users` (`CachedUserService.findById`). Trong lần đo, khoản này rơi vào 1 lượt
  `complete_repeat` và 1 lượt `quiz_status_172`.
- **`complete` lần đầu, +3 cho mỗi thành tích vừa trao:** `INSERT user_achievements`, `COMMIT`,
  và `BEGIN` ẩn, vì mỗi `createMany` tự mở transaction riêng. Ngoài ra +1 khi cache danh mục
  thành tích (5 phút) hết hạn. Đo được 4 lượt có trao thành tích, mất 1 011–1 905 ms.

## Môi trường đo

- **Máy chủ:** bản `origin/main` build ra `dist`, chạy trên máy dev (WSL2). `NODE_ENV=development`,
  `THROTTLE_DISABLED=true`.
- **DB:** branch Neon riêng `ep-late-hill-…` (ap-southeast-1), **không phải DB thật**. Đã chạy 4
  migration main còn thiếu: `critical_indexes_and_lesson_sort_unique`, `learning_events`,
  `quizzes_kind_post_test`, `learning_event_consents`.
- **Dữ liệu:**
  - `python_advanced` có 179 bài lấy từ `scripts/pe-da/out/lessons.json`, với
    `courses.lessons = 172`, giống production theo sheet (BE2).
  - 6 khoá còn lại nạp bằng `prisma/seed-courses.js`.
  - 7 thành tích mẫu `bench_*`. Repo không có dữ liệu thành tích, nên danh mục thật trên
    production có thể khác. Số này chỉ ảnh hưởng khoản "+3 mỗi thành tích".
- **Người dùng đo:** một tài khoản khách lấy qua `POST /auth/guest`. Đã xoá sau khi đo.
- **Độ trễ một vòng tới Neon từ máy đo:** trung vị 63 ms, tính trên các truy vấn nhỏ. Chú thích
  trong code ghi ~237 ms từ Render, nên trên production số ms sẽ cao hơn bảng này nhiều. Phải so
  "trước/sau" trên **cùng môi trường này**. Cột số truy vấn và cột vòng tuần tự thì không phụ
  thuộc môi trường.

## Cách đếm truy vấn

Trên một worktree tạm của `origin/main` (không commit), tôi bật
`log: [{ emit: 'event', level: 'query' }]` cho `PrismaService`. Mỗi request được gắn một bộ đếm
riêng bằng `AsyncLocalStorage` từ middleware đầu tiên. Khi response xong, bộ đếm ghi ra một dòng
JSON gồm route, số truy vấn, ms và câu SQL.

**`BEGIN` không xuất hiện trong log, nhưng nó là một vòng thật.** Log của Prisma 7 với
`PrismaNeon` có ghi `COMMIT` nhưng không ghi `BEGIN`. Kiểm bằng phần chênh lệch giữa thời gian
máy chủ và tổng thời gian các truy vấn đã log:
- route không có transaction (`enrolled`, `quiz/status`): chênh ~7 ms;
- route có transaction (`events`, `complete`): chênh ~79 ms, tức khoảng một vòng tới Neon.

Vì vậy bảng cộng 1 cho mỗi transaction.

## Chi tiết từng route (thứ tự SQL thật lấy từ log)

### `GET /api/enrolled`: 5 truy vấn, 5 vòng

1. `SELECT enrollments` (mọi cột)
2. `SELECT courses` (mọi cột), từ `include: { course: true }`
3. `SELECT lessons` để lấy tên bài vừa học và bài kế (`fetchLessonTitles`)
4. `SELECT lesson_progress` các bài đã xong của khoá studio
5. `SELECT lessons.sort_order`, từ quan hệ lồng của #4

Hai điểm đáng sửa:
- **#3 và #4 độc lập nhưng chạy nối đuôi.** Cho vào cùng một `Promise.all` thì còn 3 vòng (BE5).
- **#5 vẫn chạy khi chưa có bài nào xong.** Log ghi `WHERE lessons.id IN (NULL)`: một vòng gửi
  đi chỉ để nhận về rỗng.

### `GET /api/courses/:id/lessons/:n/content`: 3 truy vấn, 2 vòng

1. `SELECT enrollments` (song song với #2)
2. `SELECT lessons` kèm `content_json`
3. `SELECT lesson_progress`, từ quan hệ lồng của #2, chạy sau #2

Chú thích ở `lessons.service.ts:190` nói "HAI truy vấn song song". Đó là hai lời gọi Prisma; về
SQL thì là 3 truy vấn, vì repo không bật `relationJoins` nên quan hệ lồng thành truy vấn riêng.

### `POST /api/lessons/:n/complete`, hoàn thành lần đầu: 16 truy vấn, 13 vòng

1. `SELECT courses` (**mọi cột**, kể cả JSONB `content_meta`)
2. `SELECT enrollments` (mọi cột), **chờ #1** dù không cần kết quả của #1
3. `BEGIN` (ẩn)
4. `SELECT lessons` (`resolveLesson`)
5. `INSERT lesson_progress … ON CONFLICT DO NOTHING`
6. `SELECT COUNT(*) lesson_progress` (`recomputeProgress`)
7. `UPDATE enrollments`
8. `SELECT users` (streak)
9. `UPDATE users` (xp, gems, streak)
10. `SELECT user_daily_xp_logs`
11. `UPDATE` hoặc `INSERT user_daily_xp_logs`, tức đọc rồi mới ghi
12. `COMMIT`
13. Trao thành tích, sau khi đã commit: 4 truy vấn song song trong 1 vòng (`SELECT users`, hai
    `COUNT`, `SELECT user_achievements`)

Từ #3 đến #12 là **10 vòng nằm trong transaction**, và suốt lúc đó một connection của pool bị
giữ. Đây là route đắt nhất trong bảng. Hướng sửa (BE3):
- #1 và #2 chạy song song kèm `select` hẹp thì bớt 1 vòng.
- #10 và #11 gộp thành `upsert` trên unique `(user_id, log_date)` thì bớt 1 vòng trong
  transaction.

### `POST /api/lessons/:n/complete`, làm lại bài đã xong: 11 truy vấn, 11 vòng

Các bước: `SELECT courses`, `SELECT enrollments`, `BEGIN`, `SELECT lessons`, `INSERT` (không có
hàng nào được ghi), `UPDATE` giành quyền (0 hàng), `UPDATE xp_earned`, `UPDATE quiz_score`,
`COUNT`, `UPDATE enrollments`, `COMMIT`. Không có bước trao thành tích. Không gửi `quizScore` thì
còn 10.

### `GET /api/quiz/today`: 3 truy vấn, 3 vòng

1. `SELECT lesson_progress` các bài xong trong 48 giờ; lọc "hôm nay" bằng JS
2. `SELECT lessons` kèm **`content_json`**
3. `SELECT courses.title`, từ quan hệ lồng của #2

### `GET /api/courses/:id/quiz/status`: 2 truy vấn, 2 vòng

1. `SELECT lesson_progress` mọi bài đã xong của khoá
2. `SELECT lessons` kèm **`content_json`** của mọi bài đó

### `POST /api/events`: 4 truy vấn, 4 vòng

1. `SELECT learning_event_consents`, đọc lại ở **mỗi lô**
2. `BEGIN` (ẩn)
3. `INSERT learning_events` cả lô trong một câu
4. `COMMIT`

`createMany` tự bọc trong transaction, nên ghi một lô tốn 3 vòng chứ không phải 1. Bản ước tính
trước khi đo (2 truy vấn) đã bỏ sót điểm này. Theo chú thích của controller, frontend gửi tối đa
~360 lô mỗi giờ cho mỗi người, nên #1 là ~360 lượt đọc lặp lại mỗi giờ (BE6: cache trạng thái
đồng ý).

## Số byte `content_json` hai route ôn tập kéo về (mốc cho BE4)

Hai route này đọc nguyên `content_json` của từng bài chỉ để đếm câu trắc nghiệm. Số byte đo
bằng `octet_length(content_json::text)` trên DB đo:

| Số bài đã xong | Byte đọc từ DB mỗi request | `quiz/status` p50 / p95 | `quiz/today` p50 / p95 |
|---|---|---|---|
| 5 | ~39 KB | | |
| 30 | ~198 KB | 165 / 207 ms | 372 / 765 ms |
| 172 | ~1,38 MB | 563 / 2 298 ms | 822 / 2 369 ms |

Response của `quiz/status` chỉ có ~115 byte. Với người đã học hết khoá, mỗi lần gọi phải kéo
1,38 MB qua mạng để trả về vài con số, và p95 vượt 2 giây. Thời gian của riêng truy vấn
`SELECT lessons` tăng theo số bài: ~130 ms với 30 bài, ~360 ms trong một lượt `quiz/today`.

## Phát hiện phụ trong lúc đo

Lần chạy đầu, một lượt `quiz/status` nhận **503 "Hệ thống đang quá tải, vui lòng thử lại sau ít
phút"**. Nguyên nhân thật trong log là `Error: Connection terminated unexpectedly`: Neon cắt một
connection đang nằm trong pool. Lúc đó máy chủ không hề quá tải, vì bộ đo gọi tuần tự từng
request một.

Lỗi này có hai vấn đề:
- Thông điệp gửi người học nói sai nguyên nhân.
- Không có lần thử lại nào cho một lỗi mạng tạm thời trên route chỉ đọc.

Lần chạy chính thức (bảng trên) không gặp 5xx nào. Bộ đo được dặn thử lại một lần khi gặp 5xx và
ghi số lỗi; số lỗi ghi được là 0.

## Sau BE3: `POST /api/lessons/:n/complete`

Đo ngày 11/11/2026 trên nhánh `test`, cùng branch Neon `ep-late-hill`. **Trước** là `test` ngay
trước BE3 (`d0ede61^`), **sau** là `test` có cả hai phần của BE3. Hai bản chạy cùng lúc ở hai
cổng và được gọi **xen kẽ từng lượt** (trước, sau, trước, sau…), mỗi ca 30 lượt, để độ trôi
của mạng chia đều cho hai bên. Mạng hôm nay chậm hơn hôm đo BE1 (bản "trước" ra p50 1 092 ms
so với 881 ms), nên **chỉ so trước/sau trong cùng bảng này**, đừng so với bảng mốc phía trên.

| Ca đo | Số truy vấn trước → sau | Vòng trước → sau | p50 trước → sau (ms) | p95 trước → sau (ms) |
|---|---|---|---|---|
| hoàn thành lần đầu, bài 1–30 | 16 → **15** | 13 → **11** | 1 092 → **921** | 1 702 → **1 568** |
| làm lại bài đã xong, có `quizScore` | 11 → 11 | 11 → **10** | 980 → **768** | 1 694 → **1 034** |

Cách tính giống bảng mốc: đã cộng 1 cho `BEGIN` ẩn, chưa tính khoản cộng thêm (cache user,
trao thành tích). Từng lượt lệch nhau đúng như cũ (máy đếm ra 15/16/17/18 trước và 14/15/16/17
sau); lượt nào cũng giảm đúng 1 truy vấn ở ca hoàn thành lần đầu.

**Bớt ở đâu, xác nhận từ log:**
- `SELECT courses` và `SELECT enrollments` nay chạy song song (cùng bắt đầu, mỗi câu ~137 ms
  trong lượt mẫu), và chỉ lấy `id, lessons` / `user_id, course_id`, không còn kéo `content_meta`.
  Bớt 1 vòng ở cả hai ca.
- Nhật ký XP còn đúng một câu
  `INSERT INTO user_daily_xp_logs … ON CONFLICT ("user_id","log_date") DO UPDATE`. Prisma dịch
  thẳng thành upsert gốc của Postgres, không quay về kiểu SELECT rồi mới ghi. Bớt 1 truy vấn
  và 1 vòng **trong transaction**, tức connection của pool được trả sớm hơn một vòng.
- Sau 30 lượt hoàn thành bài, mỗi khách thử chỉ có **1 hàng** nhật ký XP trong ngày, đúng như
  unique `uq_daily_xp_user_date` đòi hỏi.

Ca làm lại bài không ghi nhật ký XP nên chỉ được lợi từ phần song song. Phần còn lại của route
(10 vòng trong transaction ở ca lần đầu) không thuộc BE3.

## Đo lại sau mỗi task

1. Trỏ `.env` vào branch Neon đo (đã có sẵn dữ liệu ở trên, chỉ thiếu người dùng đo).
2. Bật bộ đếm truy vấn như mục "Cách đếm truy vấn". Đây là ba thay đổi tạm:
   - thêm file `src/prisma/query-counter.ts`;
   - thêm 2 dòng trong `prisma.service.ts`;
   - thêm 1 dòng `app.use(...)` trong `main.ts`.

   Build bằng `nest build`, rồi chép `src/generated/prisma` và các file không phải `.ts` trong
   `src` sang `dist/src` (`nest build` không tự chép).
3. Chạy server với `THROTTLE_DISABLED=true`. Lấy khách bằng `POST /auth/guest`, ghi danh
   `python_advanced`, bật đồng ý ghi sự kiện. Gọi mỗi ca 30 lần tuần tự theo đúng thứ tự trong
   bảng (`complete` lần đầu dùng bài 1–30, làm lại dùng bài 1; sau đó hoàn thành nốt bài 31–172
   rồi đo các ca "172 bài").
4. Xoá khách đo sau khi xong.
