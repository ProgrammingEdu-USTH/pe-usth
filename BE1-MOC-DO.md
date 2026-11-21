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

## Sau BE4: `GET /api/quiz/today`

Đo ngày 12/11/2026 trên nhánh `test`, cùng branch Neon `ep-late-hill`. **Trước** là `e8eb0a9`
(ngay trước BE4), **sau** là `test` có cả hai phần của BE4 (chỉ đọc `step_2` + cache). Cách đo
giống mục "Sau BE3": hai bản chạy cùng lúc ở hai cổng, gọi **xen kẽ từng lượt**, mỗi ca 30 lượt,
cùng một khách. Ca 30 bài và 172 bài đều là bài **hoàn thành trong hôm nay**, vì `quiz/today`
chỉ đếm bài trong ngày. Không lượt nào gặp 5xx. Hai bản trả **cùng một kết quả** ở cả hai ca:
30 bài ra 90 câu, 172 bài ra 516 câu, cùng danh sách bài, cùng tên khoá, cùng số câu mỗi bài.

| Ca đo | Số truy vấn trước → sau | Byte đọc từ DB trước → sau (lượt đầu / các lượt sau) | p50 trước → sau (ms) | p95 trước → sau (ms) |
|---|---|---|---|---|
| hôm nay xong 30 bài | 3 → **2** | 198 374 → **75 484 / 0** | 395 → **182** | 846 → **272** |
| hôm nay xong 172 bài | 3 → **2** | 1 383 532 → **533 011 / 0** | 1 166 → **296** | 1 986 → **648** |

- **Byte** là `octet_length` của phần JSON được đọc: trước là cả `content_json`, sau là
  `content_json->'step_2'`. "Lượt sau" là khi mọi bài đã nằm trong cache: Postgres trả
  `hit = true` cho cả 172 bài và không gửi `step_2` nào. Mỗi hàng chỉ còn id, tiêu đề, tên
  khoá và `updated_at`.
- **Số truy vấn** do máy đếm. Một lượt ở mỗi ca bản trước ra 4, đó là khoản "+1 khi cache
  user hết hạn" đã ghi ở bảng mốc. Truy vấn bớt đi là `SELECT courses.title` của quan hệ lồng,
  nay đã nằm trong JOIN của chính câu đọc bài.
- **Lượt đầu tiên** (cache của bản sau còn lạnh): 30 bài 1 175 → 356 ms; 172 bài 1 986 → 808 ms.
  Ở ca 172 bài, cache đang giữ 30 bài từ ca trước nên 142 bài phải đọc `step_2`. Bỏ lượt đầu
  thì p95 của bản sau là 262 ms (30 bài) và 430 ms (172 bài).
- Trong lượt mẫu ở ca 172 bài, riêng câu `SELECT lessons` của bản trước mất 818 ms, câu của
  bản sau mất 260 ms.

**Chưa đo `GET /api/courses/:id/quiz/status`.** Route này và `getCourseQuizStatus` nằm trong 5
commit ôn tập/hậu kiểm của `origin/main` mà `test` chưa có, nên trên `test` không gọi được.
Route đó gom câu bằng cùng `collectQuestions()`. Khi `test` gộp với main, chỉ cần đổi lời gọi
`lesson.findMany` của nó sang `layStep2(ids, courseId)` rồi đo lại theo mục dưới.

## Sau BE5: `GET /api/enrolled` và `GET /api/courses-enrolled`

Đo ngày 12/11/2026 trên nhánh `test`, cùng branch Neon `ep-late-hill`. **Trước** là `4feeb38`
(ngay trước BE5), **sau** là `test` có cả hai phần của BE5. Cách đo giống "Sau BE4": hai bản ở
hai cổng, gọi **xen kẽ từng lượt**, 30 lượt mỗi ca, cùng một khách ghi danh `python_advanced`.
Không lượt nào gặp 5xx.

| Route | Ca đo | Số truy vấn trước → sau | Vòng tuần tự trước → sau | p50 trước → sau (ms) | p95 trước → sau (ms) |
|---|---|---|---|---|---|
| `GET /api/enrolled` | 1 khoá, 0 bài xong | 5 → **2** | 5 → **1** | 304 → **67** | 567 → **142** |
| `GET /api/enrolled` | 1 khoá, 172 bài xong | 5 → **2** | 5 → **1** | 356 → **81** | 502 → **136** |
| `GET /api/courses-enrolled` | 1 khoá, 0 bài xong | 5 → **3** | 4 → **2** | 288 → **131** | 580 → **307** |
| `GET /api/courses-enrolled` | 1 khoá, 172 bài xong | 5 → **3** | 4 → **2** | 322 → **178** | 485 → **276** |

- **Số truy vấn** do máy đếm. Mỗi ca `enrolled` của bản trước có đúng 1 lượt ra 6, đó là
  khoản "+1 khi cache user hết hạn" đã ghi ở bảng mốc.
- **`/enrolled` còn MỘT vòng:** hai câu (`enrollments` JOIN `courses` + tên bài, và
  `lesson_progress` JOIN `lessons` của khoá studio) cùng bắt đầu và chạy song song, mỗi câu
  ~55 ms trong lượt mẫu. Trong cùng lượt mẫu, bản trước đi 5 câu nối đuôi.
- **`/courses-enrolled` còn hai vòng:** `isAdmin`, rồi (`courses` ‖ câu ghi danh). Vòng
  `isAdmin` vẫn phải đi trước vì điều kiện lọc `is_published` gửi xuống DB phụ thuộc vào nó.
- **Response giống hệt** giữa hai bản ở cả 4 ca, và ở ca thêm 2 khoá nữa (3 khoá), trừ thứ tự
  của `completedLessonNumbers`: nay tăng dần thay vì theo thứ tự ngẫu nhiên của DB. Frontend chỉ
  dùng mảng này như một tập.
- Bản "trước" ở đây không ra đúng số của bảng mốc BE1 (p50 304 so với 290 ms ở ca 0 bài),
  vì mạng mỗi ngày một khác. **Chỉ so trước/sau trong cùng bảng này.**
- **Chưa làm cache 5–10 giây** (mục 4 của sheet BE5). Sau khi còn một vòng, cache chỉ bớt được
  ~70 ms. Muốn cache đúng thì phải xoá nó từ `completeLesson`, `enroll` và `unenroll`, bỏ sót
  một chỗ là dashboard hiện tiến độ cũ.

## Sau BE7: diễn đàn (`GET /api/posts`, chi tiết bài, bình luận)

Đo ngày 15/11/2026 trên nhánh `test`, branch Neon `ep-late-hill`. **Trước** là `4034a0a`, **sau**
là `test` có BE7. Hai bản chạy ở hai cổng, gọi **xen kẽ từng lượt**, 30 lượt mỗi ca (bỏ lượt làm
nóng). Người xem là một khách mới đã thả cảm xúc lên 3 bài và 4 bình luận.

Bảng `posts` trên DB đo vốn rỗng, nên phải tạo dữ liệu giả và xoá sau khi đo:
- 200 khách giả;
- 40 bài trải đều 4 chuyên mục, mỗi bài 0–200 cảm xúc, tổng 3 936;
- 80 bình luận trên bài mới nhất (20 gốc × 3 trả lời), tổng 2 320 cảm xúc.

**Số này là của dữ liệu giả, không phải của production.** Chỉ đúng về hình dạng: số hàng tỉ
lệ với số cảm xúc.

| Ca đo | Số truy vấn trước → sau | Hàng cảm xúc kéo về trước → sau | p50 trước → sau (ms) | p95 trước → sau (ms) |
|---|---|---|---|---|
| `GET /api/posts` (20 bài) | 4 → 5 | 2 138 → **123** | 278 → **156** | 507 → **295** |
| `GET /api/posts?category=question` (10 bài) | 4 → 5 | 1 002 → **61** | 214 → **146** | 316 → 345 |
| `GET /api/posts?sort=likes` (20 bài) | 4 → 5 | 3 008 → **122** | 278 → **202** | 676 → **382** |
| `GET /api/posts/:id` | 3 → 4 | 38 → **7** | 124 → 145 | 339 → 352 |
| `GET /api/posts/:id/comments` (80 bình luận) | 7 → **6** | 2 328 → **453** | 395 → **258** | 614 → **368** |

- **Hàng cảm xúc kéo về:**
  - trước = tổng số cảm xúc của mọi bài/bình luận trong response, vì `include` tải từng hàng;
  - sau = số cặp (bài, loại) có trong `groupBy` + số cảm xúc của chính người xem.

  Con số "sau" không tăng theo số cảm xúc nữa: một trang 20 bài tối đa 20×6 + 20 = 140 hàng,
  dù mỗi bài có bao nhiêu cảm xúc đi nữa.
- **Thêm một truy vấn nhưng không thêm vòng tuần tự:** hai câu đếm (`groupBy` và cảm xúc của
  người xem) chạy **song song** với câu nạp tác giả.
  - Bản đầu tiên của BE7 để Prisma `include: { user }`. Prisma nạp user thành một vòng riêng
    ngay sau `posts`, nên việc đếm phải chờ tới vòng thứ ba. Lần đo đó cho chi tiết bài p50
    157 → 191 ms và p95 bình luận tệ hơn, nên đã đổi sang tự nạp tác giả bằng `userId`.
  - Chi tiết bài thì đếm song song ngay với `findUnique`, vì đã biết id từ URL.
- **Response giống hệt** giữa hai bản ở cả 5 ca, đã so sau khi sắp khoá trong `reactions`.
  Thứ tự khoá có thể khác, nhưng FE đọc theo tên loại.
- **p95 của ca lọc chuyên mục và ca chi tiết** ngang nhau trong sai số mạng. Không nói là
  nhanh hơn.
- **Chỉ mục `posts` (migration `20261116000000_forum_post_indexes`) chưa áp lên DB đo**, nên
  không nằm trong số đo này. `ep-late-hill` đang lệch migration với repo:
  - thiếu 4 migration ngày 15/11;
  - có 2 migration `arena` / `playground_snippets` không nằm trong repo.

  AGENTS.md dặn phải gỡ lệch trước rồi mới chạy lệnh migrate.

## Sau BE9: phụ thuộc, bí mật và trạng thái migration

Kiểm ngày 19/11/2026 trên nhánh `test`, nền code `ac64816`, branch Neon thử
`ep-late-hill`. Đây là số đo rà soát bảo mật và tính sẵn sàng của DB;
**chưa đo lại số truy vấn, vòng tuần tự, p50 hoặc p95 của các route**.
Việc đo hiệu năng API tiếp theo thuộc BE15. Các bảng trước vẫn là số đo tại
thời điểm của chúng, không đại diện hiệu năng sau khi áp thêm migration.

### Phụ thuộc production

Chạy `npm audit --omit=dev --json` ở thư mục gốc và `runner/`.
Số dưới đây là số package npm báo bị ảnh hưởng, không phải số lỗ hổng độc lập:

| Phạm vi | Critical trước → sau | High trước → sau | Moderate trước → sau | Tổng trước → sau |
|---|---|---|---|---|
| Backend gốc | 1 → 0 | 9 → 0 | 1 → 0 | **11 → 0** |
| `runner/` | 0 → 0 | 0 → 0 | 0 → 0 | **0 → 0** |

Các bản vá được khoá trong `package-lock.json`, trong phạm vi phiên bản cho phép
của `package.json`; không dùng `npm audit fix --force`:

- `@nestjs/platform-express`: 11.1.28 → 11.2.11.
- `prisma`, `@prisma/client`, `@prisma/adapter-neon`: 7.9.1 → 7.10.1;
  đã sinh lại Prisma client.
- `joi`: 18.2.3 → 18.3.2; `multer`: 2.2.0 → 2.5.0.
- `body-parser`: 2.3.0 → 2.4.0; `proxy-addr`: 2.0.7 → 2.0.8;
  `qs`: 6.15.3 → 6.17.1; các dependency gián tiếp liên quan cũng nhận bản vá.

Không suy ra toàn hệ thống không còn lỗ hổng từ kết quả 0 này:
audit chỉ xét dependency production của hai package trên, theo dữ liệu advisory
tại thời điểm chạy; không bao gồm audit frontend hoặc dependency chỉ dùng khi phát triển.

### Bí mật và các giới hạn đã xác nhận

- Quét lịch sử Git qua `git log --all -p` (576 commit có diff được xử lý),
  theo mẫu Google API key, GitHub token, private key, URI PostgreSQL và
  giá trị bí mật gán trực tiếp. Không phát hiện bí mật thật theo các mẫu này.
- Hai URI PostgreSQL tìm thấy là placeholder: dữ liệu test trong
  `src/config/env.validation.spec.ts` (commit `9b7e6c492b`) và cấu hình CI trong
  `.github/workflows/ci.yml` (commit `c3b0dbbb1f`). Không đưa giá trị kết nối vào báo cáo.
- Quét thêm 1.100 file văn bản hiện được Git theo dõi theo mẫu Google key,
  GitHub token và private key: không có phát hiện. Đây là quét theo mẫu,
  không chứng minh rằng mọi dạng bí mật đều đã được phát hiện.
- `.env` bị ignore; `.env.example` được theo dõi. Access token `pe_access`
  vẫn ở localStorage; refresh token dùng cookie HTTP-only. CSP frontend còn
  `unsafe-inline` cho script và style: ghi nhận rủi ro XSS, chưa đổi kiến trúc
  lưu token/CSP trong BE9.
- `FixedWindowThrottlerStorage` và `CachedUserService` giữ dữ liệu trong RAM
  từng tiến trình; chạy nhiều instance sẽ đếm hạn mức riêng, cache vai trò có
  thể cũ tối đa 60 giây. Chuyển cache/rate-limit dùng chung là việc tiếp theo.
- JWT/throttle là global guard; ValidationPipe bật `whitelist` và
  `forbidNonWhitelisted`. SQL trong đường người dùng dùng tham số hoá;
  `$queryRawUnsafe` ở script kiểm bất biến chỉ chạy câu SQL cố định nội bộ.

### Migration của branch đo

`npx prisma migrate status` trả **Database schema is up to date!**.
Đối chiếu `_prisma_migrations` với file SQL trong repo:

| Mục kiểm | Kết quả |
|---|---|
| Migration trong repo | 13 |
| Migration repo đã hoàn thành trên DB | 13/13 |
| Checksum không khớp | 0 |
| Migration thất bại chưa rollback | 0 |
| Migration riêng của branch | `20261017000000_arena`, `20261018000000_playground_snippets` |

Hai migration riêng được giữ nguyên, không xoá bảng hoặc lịch sử migration.
Các migration ngày 15–16/11 và BE8 `20261119000000_course_reset` đều đã áp;
ghi chú thiếu migration ở mục "Sau BE7" là trạng thái lịch sử ngày đo BE7.
Trong lượt BE9 này chỉ kiểm đọc trạng thái/checksum, không áp thêm migration.

### Kiểm hồi quy sau cập nhật dependency

| Lệnh kiểm | Kết quả |
|---|---|
| `npm run typecheck` | Sạch |
| `TZ=Asia/Ho_Chi_Minh npx jest --ci` | **46 bộ, 554 ca, tất cả đạt** |
| `npx eslint "{src,apps,libs,test}/**/*.ts" --ignore-pattern "src/generated/**"` | **155 lỗi, 2 cảnh báo**, giữ nguyên mốc |
| `git diff --check` | Sạch |

## Sau BE10: hoàn thành bài và trao thành tích theo lô

Đo ngày 20/11/2026, branch Neon thử `ep-late-hill`. Bản trước là `8704525`
(đã có BE8/BE9). Bốn phiên bản: trước, bước 1 đưa đọc bài ra ngoài transaction,
bước 2 gộp COUNT/UPDATE tiến độ, cuối cùng gom trao thành tích.

Mỗi ca 30 lượt/phiên bản, bỏ lượt làm nóng; tổng 480 request được đo.
Dùng controller `LessonsController` thật của Nest trên localhost, prefix `/api`,
Prisma 7.10.1 và PostgreSQL thật trong schema ngẫu nhiên riêng. Danh tính được
gán cố định theo user đo, **không chạy JWT/throttle/gateway đầy đủ**. p50/p95
bao gồm HTTP localhost và parse response; không phải số đo bản deploy.
Bốn phiên bản có client và user riêng, chạy ghép từng lượt song song trên cùng
DB; không phải đo chịu tải. Không so trực tiếp ms với các bảng cũ khác môi trường.
Schema của cả lượt đo hoàn tất và lượt bị ngắt trước đó đã được xoá sau kiểm.

### Kết quả cuối so với bản trước

| Ca | Truy vấn trước → sau | Vòng tuần tự toàn luồng trước → sau | Vòng trong transaction trước → sau | p50 (ms) trước → sau | p95 (ms) trước → sau | p50 thời gian transaction (ms) trước → sau |
|---|---|---|---|---|---|---|
| Hoàn thành lần đầu, không có thành tích mới | 17 → 16 | 13 → 11 | **11 → 9** | 701 → 554 | 824 → 685 | 587 → 452 |
| Nộp lại bài đã xong, có quizScore | 13 → 12 | 12 → 10 | **11 → 9** | 627 → 504 | 695 → 557 | 574 → 448 |
| Hoàn thành sau reset, không thưởng lại | 16 → 15 | 12 → 10 | **10 → 8** | 636 → 516 | 711 → 590 | 527 → 408 |
| Hoàn thành và nhận ba thành tích | 20 → 17 | 16 → 12 | **11 → 9** | 865 → 614 | 1218 → 709 | 587 → 457 |

Số truy vấn lấy từ event SQL của Prisma, cộng một BEGIN không hiện trong log.
Số vòng trong transaction là các câu SQL tuần tự, gồm BEGIN/COMMIT.
Vòng toàn luồng được suy từ nhóm gọi song song trong code và trace SQL:
trước có hai câu đọc đầu song song, sau có ba; bốn câu đọc metrics/owned
chạy song song khi cache danh mục đã nóng. Đây là vòng phụ thuộc logic,
không phải số gói TCP. Nhánh tạo bài chưa có trong DB chưa nằm trong bảng này.

Thời gian transaction đo quanh `$transaction`, gồm cả thời gian chờ lấy
connection; không khẳng định toàn bộ khoảng đó là thời gian giữ connection.
Reset/dọn fixture chạy ngoài khoảng đo; request sau reset phải trả XP=0.
Ca thành tích dùng bài 32: trước mỗi lượt xoá tiến độ và ba hàng thành tích
của user giả để luôn có đúng ba thành tích mới. Không thao tác dữ liệu public.

### Số đo sau từng bước

| Phiên bản | Vòng transaction: lần đầu / nộp lại | Lần đầu p50 / p95 (ms) | Nộp lại p50 / p95 (ms) | Ba thành tích p50 / p95 (ms) |
|---|---|---|---|---|
| Trước BE10 | 11 / 11 | 701 / 824 | 627 / 695 | 865 / 1218 |
| Bước 1: đọc bài trước transaction | 10 / 10 | 723 / 844 | 649 / 682 | 913 / 1205 |
| Bước 2: gộp đếm/cập nhật tiến độ | 9 / 9 | 585 / 706 | 520 / 578 | 741 / 1085 |
| Bước 3: trao thành tích theo lô | 9 / 9 | 554 / 685 | 504 / 557 | 614 / 709 |

Bước 1 bớt một vòng trong transaction nhưng chưa giảm ms trong lượt này;
không khẳng định bước 1 riêng lẻ nhanh hơn. Sai số/cạnh tranh giữa bốn client
ảnh hưởng thời gian đo. Bước 3 không đổi đường không có thành tích mới, nên
chênh lệch ms ở các ca đó không được quy riêng cho sửa trao thành tích.

### Hành vi được giữ và kiểm hồi quy

- Chỉ đọc bài song song với course/enrollment; giữ thứ tự lỗi 404 → 403 → 400.
  Số bài ngoài miền Int không gửi vào Prisma sớm. Chỉ nhánh hợp lệ mới tạo
  bản ghi bài còn thiếu. Khoá ghi danh và kiểm archive vẫn ở trong transaction.
- `recomputeProgress` gộp thành CTE COUNT + UPDATE; `ROUND(numeric)` cho số
  không âm giữ cách làm tròn cũ, trần 100%, tổng 0 thì 0%. Bài lưu trữ không tính.
- Thành tích dùng một `createManyAndReturn` với `skipDuplicates`, chỉ trả ID
  chính request vừa tạo. Không đọc toàn bộ owned sau INSERT để đoán thành tích mới.
- Kiểm PostgreSQL thật bằng `scripts/check-course-reset.ts`: reset/nộp đồng
  thời không thưởng lại, rollback ở UPDATE cuối không mất tiến độ; thêm các ca
  0 bài, chưa hoàn thành, 12.5% → 13%, bài cuối, bỏ bài lưu trữ và ghi danh lại.
  Hai request trao ba thành tích đồng thời: mỗi ID mới chỉ có trong một response.
- Jest: **47 bộ, 564 ca đạt**; typecheck sạch; lint CI giữ **155 lỗi, 2 cảnh báo**.
  Đối chứng: bỏ dùng kết quả đọc bài sớm làm 1 ca trượt; bỏ lọc theo ID vừa
  INSERT làm 1 ca trao thành tích trượt. Đã khôi phục code sau mỗi đối chứng.

Chưa gộp SELECT/UPDATE user: hai bước chính đã đạt mục tiêu giảm hai vòng;
giữ logic streak/ngày học hiện tại. Không có migration mới trong BE10.

## Sau BE13: ETag cho bài học và danh mục thuần

Đo ngày 21/11/2026 trên `test`, branch Neon thử `ep-late-hill`, schema ngẫu nhiên
riêng được xoá khi xong. Controller/service Nest và Prisma thật, HTTP localhost;
danh tính user đo được gán cố định, không gồm JWT/throttle toàn gateway.
Mỗi route chạy xen kẽ 30 lượt GET 200 và 30 lượt conditional GET với cùng ETag,
sau làm nóng. Fixture nội dung lấy từ `001-P01.json` của gói pe-v4, bật cờ gate.

| Route / chế độ | Body JSON (byte, trước nén) | Truy vấn DB | p50 (ms) | p95 (ms) |
|---|---|---|---|---|
| Nội dung bài, 200 | 18 961 | 4 | 174 | 241 |
| Nội dung bài, `If-None-Match` khớp → 304 | **0** | 4 | 172 | 214 |
| `/api/courses/catalog`, 200 | 314 | 3 | 108 | 174 |
| `/api/courses/catalog`, ETag khớp → 304 | **0** | 3 | 102 | 174 |

Đây là so 200/304 của bản BE13, không phải benchmark hai commit trước/sau.
Không tính header hoặc kích thước gói mạng vào cột body. Response 200 trong phép
đo không yêu cầu nén. Dung lượng thật phụ thuộc bài: không dùng số 4 KB ước lượng
trong sheet làm số đo. Số DB không giảm, chênh lệch thời gian nhỏ; không kết luận
BE13 giảm đáng kể latency hoặc áp lực truy vấn. Quyền vẫn phải kiểm mỗi lần.

### Chính sách và phạm vi

- Gateway cấp weak ETag từ phiên bản nhỏ, không băm toàn bộ JSON bài mỗi lượt.
  Nội dung dùng `updated_at`, `content_hash` nullable, metadata bài, `completed`
  và trạng thái giữ lời giải. ETag còn phân biệt URL và user; `Vary` có
  Authorization/Cookie. Metadata phiên bản không xuất hiện trong JSON response.
- `Cache-Control: private, no-cache`: trình duyệt được giữ bản sao nhưng phải
  revalidate trước khi dùng. Chọn cách này thay max-age=60 vì ngay sau complete
  hoặc reset, response có `completed` và quyền mở lời giải đã thay đổi.
- Guard/service kiểm quyền trước khi xét 304. Mất ghi danh vẫn 403, mất phiên
  vẫn 401, kể cả client có ETag đúng của lượt trước.
- `GET /api/courses` hiện có cờ enrolled theo user nên giữ `no-store`.
  Thêm `GET /api/courses/catalog` dùng cùng bộ lọc/quyền xem khoá nháp, bỏ cờ
  enrolled. ETag băm các trường thẻ khoá nhỏ. Route mới tái dùng listCourses
  nên hiện vẫn đọc ghi danh rồi bỏ trường đó; chưa tối ưu số query ở BE13.
- Các route chưa bật cache, gồm `/enrolled`, mặc định no-store. Tắt ETag tự động
  của Express; bỏ conditional header ở nhánh không cache vì Express có thể
  tự trả 304 cho If-None-Match:* dù không sinh ETag.
- CORS expose ETag; preflight vẫn cho phép If-None-Match. FE hiện dùng fetch
  mặc định, để HTTP cache của trình duyệt revalidate và ghép lại body; không
  thêm kho JSON/ETag thủ công trong JavaScript. Các trang danh mục tĩnh hiện
  chưa chuyển sang route catalog mới nên chưa nhận lợi ích cache của API đó.
- Thiếu updatedAt đáng tin thì không cache. Các đường ghi qua Prisma, gồm
  updateMany trong update-lesson-content.ts, cập nhật updatedAt. Nếu ghi SQL
  tay/bản Django phải đồng thời cập nhật timestamp; chỉ sửa content_json mà
  giữ nguyên timestamp và hash thì không thể làm ETag biết nội dung đã đổi.

### Kiểm hồi quy và bảo vệ lời giải

Jest qua controller/service thật kiểm: 200→304 không body, danh sách weak/strong
ETag và wildcard, header sai, đổi nội dung/tiêu đề, hoàn thành/reset, admin/học viên,
đổi user, mất quyền, catalog thuần và route no-store, CORS, thiếu phiên bản.
Fixture có hình dạng thực từ gói bài (lựa chọn object, lời giải ở step_4).

Kiểm PostgreSQL thật: updateMany đổi nội dung thì ETag đổi; complete mở lời giải;
reset ẩn lại; unenroll xong request có ETag cũ vẫn 403. Các schema thử đã dọn.
Đối chứng tắt cơ chế cấp ETag: 3 ca HTTP trượt; đã khôi phục code sau thử.
Toàn bộ **48 bộ, 577 test đạt**; typecheck sạch; lint CI giữ **155 lỗi, 2 cảnh báo**.
Không có migration mới. Chưa kiểm bằng browser trên bản deploy khác origin.

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
