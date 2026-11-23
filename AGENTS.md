# pe_usth — hướng dẫn làm việc trong repo này

Nền tảng học lập trình: NestJS 11 + Prisma 7 + PostgreSQL (Neon), Next.js 16 + React 19,
giáo trình Python chạy trong trình duyệt bằng Pyodide. Chi tiết kiến trúc: [README.md](README.md).

## Lệnh hay dùng

```bash
# Backend (từ thư mục gốc)
npm run typecheck          # phải sạch
npx jest --ci              # phải xanh
npm run start:dev          # cổng 5000

# Frontend
cd frontend && npm run typecheck && npm run lint && npm run build
cd frontend && npm run dev # cổng 3000

# Giáo trình Python (khoá đang chạy: Advanced Python, 48 bài — pe-v4)
py scripts/pe-v4/build.py              # dựng lại 48 bài -> scripts/pe-v4/out/
py scripts/pe-v4/build_advanced.py     # sinh mini-game -> scripts/pe-v4/out-advanced/
py scripts/pe-v4/sync_curricula.py     # chép giáo trình sang frontend/src/lib/curricula.json
py scripts/pe-v4/anim/check.py         # kiểm 23 hình SVG + đếm hình được bài dùng
py scripts/pe-v4/anim/check.py --strict # thêm: hình chưa bài nào khai cũng là lỗi (CI chạy bản này)
npm i --no-save pyodide@0.27.7         # CẢ HAI lệnh dưới đều import pyodide
node scripts/pe-v4/check-advanced.mjs  # chấm thử game chạy code trong Pyodide
node scripts/pe-v4/check-pyodide.mjs   # chấm thử 427 ca bằng chính bộ chấm của trình duyệt
```

Trên Windows dùng `py`, không dùng `python` — `python` là stub của Microsoft Store.

## Mốc nền

Đo lại ngày 15/10/2026. Đừng để tụt xuống dưới
mức này:

| Hạng mục | Mốc | Đo ngày |
|---|---|---|
| Backend typecheck | sạch | 15/11/2026 |
| Backend test | 58 bộ, 664 ca, tất cả đạt (máy đặt múi giờ UTC thì 1 ca `streak.service.spec.ts` trượt — chạy `TZ=Asia/Ho_Chi_Minh npx jest --ci`) | 23/11/2026 |
| Backend lint | 157 lỗi, 2 cảnh báo — **mốc trần trong CI là 170, chỉ được hạ** | 23/11/2026 |
| Frontend typecheck | sạch | 23/11/2026 |
| Frontend lint | 0 lỗi, 42 cảnh báo | 23/11/2026 |
| Frontend unit test | `cd frontend && npm run test:unit` → 158 ca, 158 đạt, 0 trượt | 23/11/2026 |
| Giáo trình pe-v4 | 48 bài, 427 ca chấm, 176 biến thể sai + 48 khung trống đều trượt | 15/10/2026 |

**CẬP NHẬT BẢNG NÀY MỖI KHI SỐ ĐO ĐỔI ĐÁNG KỂ, không chỉ ở commit đầu phiên.**
Đã trả giá một lần: phiên 15/10 sửa bảng ở commit ĐẦU rồi 14 commit sau thêm
test và dọn 124 file mà không sửa lại, nên bảng ghi "204 ca / 178 cảnh báo"
trong khi thực đo là "390 ca / 118 cảnh báo". Bảng này nói "đừng để tụt xuống
dưới mức này", nên một con số cũ KHÔNG phải chú thích lỗi thời vô hại: nó là
mất lưới an toàn cho 186 ca test, và là giấy phép thêm 60 cảnh báo mới mà vẫn
tưởng đang đạt mốc. Thêm/bớt ca test, dọn lint, xoá file ⇒ đo lại rồi sửa bảng
TRONG CÙNG commit đó.

`next build` KHÔNG có trong bảng vì chưa ai đo nó thành một con số ổn định;
đừng thêm dòng nào vào bảng mà không tự chạy lệnh để lấy số.

Số lỗi lint backend phải đo bằng ĐÚNG lệnh CI dùng, KHÔNG bằng `npm run lint` (script đó mang
`--fix` nên vừa sửa file vừa làm con số lệch). Đo khác lệnh là lý do mốc này từng bị ghi 551
trong khi thực tế là 557:

```bash
npx eslint "{src,apps,libs,test}/**/*.ts" --ignore-pattern "src/generated/**"
```

## Ràng buộc không được phá

- **DB dùng chung với bản Django cũ.** Migration chỉ được THÊM: thêm cột nullable hoặc có
  default, thêm index. Không đổi tên, không xoá cột, không đổi kiểu.
- **Mật khẩu giữ định dạng hash của Werkzeug** (`scrypt:…`, `pbkdf2:sha256:…`) để bản Django
  vẫn đăng nhập được. Xem `src/common/security/`.
- **Gateway giữ độc quyền prefix/version/CORS/rate-limit.** Module nghiệp vụ viết
  `@Controller('courses')`, không viết `@Controller('api/v1/courses')`. Xem
  [src/api-gateway/README.md](src/api-gateway/README.md).
- **Không `res.json()` thủ công khi lỗi** — `throw` để filter ở gateway định dạng response.

## Những cái bẫy đã gặp

Ghi lại để không ai vấp lại. Mỗi dòng là một lỗi có thật đã sửa hoặc còn mở.

- **Fixture test không giống dữ liệu thật thì test vô dụng.** `quizzes.service.spec.ts` từng
  khẳng định "không bao giờ lộ đáp án" bằng fixture `options: ['a','b']`, trong khi dữ liệu
  thật là mảng object mang cờ `correct` — lỗ lộ đáp án sống sót qua mọi lần chạy test. Khi
  viết test cho dữ liệu đọc từ `content_json`, lấy hình dạng thật từ
  `scripts/pe-v4/out-advanced/lessons/*.json` (đúng bản đang seed vào DB).
- **Chấm bài nằm ở trình duyệt.** Server không chấm lại gì; `POST /lessons/:n/complete` tin
  `quizScore` do client gửi. XP bị chặn trần bằng `lessons.xp_reward` nên không farm vô hạn
  được, nhưng đừng nhầm đây là hệ thống chống gian lận.
- **Bài tra theo `(course_id, sort_order)`, không theo `id`.** Lỗ hổng trùng bài từng tồn tại
  vì `lesson_code` NULL làm ràng buộc unique cũ vô hiệu. Ràng buộc đúng nay nằm trong
  migration `20261012000000_…`; chạy câu kiểm tra dữ liệu trùng trong README trước khi deploy.
- **`style-src 'unsafe-inline'` còn hai nguyên nhân, không phải một.** Chú thích trong
  `frontend/next.config.ts` chỉ nói tới ~70 handler nội tuyến của JS legacy. Nhưng còn 257 chỗ
  dùng `style={{…}}` trong 40 file React — SSR tuần tự hoá chúng thành thuộc tính `style="…"`,
  cũng bị `style-src` chặn. Phải dọn cả hai mới bỏ được chỉ thị này.
- **Pyodide KHÔNG còn tải lại mỗi lần chạy, và không lấy từ CDN.** Mô tả cũ ("mỗi lần bấm Chạy
  tạo Worker mới và nạp lại ~10 MB từ CDN") đã lỗi thời.
  `frontend/public/static/js/studio-lesson.worker.js:19-33` nạp runtime từ CÙNG ORIGIN
  `/pyodide/v0.27.7/` (đã commit vào repo) và GIỮ LẠI runtime giữa các lần chạy — trước đây
  worker nạp Pyodide bên trong `onmessage` nên mỗi lần bấm Chạy là nạp lại ~13 MB. Wheel của
  numpy/pandas/matplotlib/sqlite3 cũng nằm cùng origin và chỉ tải cho bài nào khai
  `step_4.packages`.
  **Phần còn đúng:** giới hạn 5 giây VẪN dựa vào `worker.terminate()` ở phía React, không phải
  worker tự cắt — `runPythonAsync` chặn luôn vòng lặp sự kiện nên worker treo thì không tự ngắt
  mình được. Sau khi terminate, React nạp sẵn một worker thay thế ở nền. Đổi cách dùng lại
  worker thì phải giữ được khả năng cắt vòng lặp vô hạn này.
- **Hai nguồn danh sách bài.** Trang khoá học đọc `frontend/src/lib/curricula.json` (file tĩnh,
  chép từ `scripts/pe-v4/out-advanced/curriculum-python-advanced.json` bằng
  `py scripts/pe-v4/sync_curricula.py`), còn nội dung bài đọc từ DB. Dựng lại pe-v4 mà quên
  chạy bước chép thì trang khoá học hiện giáo trình cũ; sau mỗi lần seed phải kiểm hai nguồn
  có lệch không.
  Từ 19/10/2026 bước chép còn ghi khối `LESSON_META` (phút, XP, cờ boss, danh sách màn từng
  bài) cho trang chủ `/` (dashboard). Danh sách màn do `screen_keys()` trong `sync_curricula.py` dựng bằng
  Python, phải KHỚP TỪNG KHOÁ với `buildScreens()` (TS) vì dashboard đếm "màn đã học" bằng
  cách so khoá với bản nháp localStorage. Sửa luồng màn ở `studio-lesson.ts` thì sửa cả
  `screen_keys()` rồi chạy lại sync — `e2e/unit/dashboard-plan.test.mjs` so cả 48 bài và đỏ
  nếu lệch.
- **Frontend không còn đăng nhập, nhưng backend vẫn đòi JWT.** Trang chủ `/` và `/courses/*` đọc
  danh mục tĩnh `frontend/src/lib/catalog.ts` (chép từ `prisma/seed-courses.js`, số bài lấy từ
  `curricula.json`) chứ không gọi `/api/courses` — gọi thì khách nhận 401. Sửa seed khoá học thì
  sửa cả file này. Trang bài học (`/lesson/*`) vẫn gọi API có JWT: `apiFetch` gặp 401 mà không
  refresh được thì gọi `POST /auth/guest` để nhận tài khoản khách (email `@guest.local`, mật
  khẩu rỗng nên không đăng nhập bằng mật khẩu được), rồi bài học tự ghi danh. Tắt bằng
  `GUEST_LOGIN=off`. Deploy khác domain thì phải đặt `REFRESH_COOKIE_SAMESITE=none`, không thì
  hết hạn access token là khách mất phiên và nhận tài khoản mới (mất tiến độ).
- **`prisma/seed-courses.js` nay tạo khoá `python` RỖNG, không phải 40 bài.** Nó đọc
  `curricula[def.id]`, mà `sync_curricula.py` đã bỏ hẳn khối `python` khỏi `curricula.json`,
  nên vòng sinh bài không chạy lần nào. Bẫy cũ (sinh `python-1…python-40` trùng sort_order)
  không còn, nhưng chạy nhầm vẫn dựng lại một khoá rỗng trong danh mục.
- **Lỗi lint backend KHÔNG phải lỗi định dạng, và nguồn gần như luôn là MỘT dòng `: any`.**
  Đã đo (lúc còn 527 lỗi): chỉ 6% chạy `--fix` là xong; 89% là nhóm `no-unsafe-*` — `any` chảy
  xuyên qua code ở các trang chuyển từ bản Django. Đã dọn `quizzes` + `lessons` ngày 14/10/2026:
  **553 → 263 lỗi** (`-290`), và toàn bộ 290 lỗi đó đến từ đúng hai khuôn trong file spec:
  `let prisma: any` và `const res: any = await service.…`. Cách dọn, lặp lại được cho module
  sau:
  1. `let prisma: any` → một type `PrismaMock` chỉ khai những bảng/hàm service thật sự gọi, mỗi
     hàm là `jest.Mock<Promise<unknown>, [ĐốiSố]>`. Chỉ cần kiểu thật ở phần ĐỐI SỐ (test đọc
     lại `mock.calls` để chứng minh "XP/đáp án do SERVER quyết"); giá trị trả về để
     `Promise<unknown>` là đủ vì mỗi ca tự `mockResolvedValue()`.
  2. `jest.fn()` trần trả `Mock<any, any>` nên gán vào field đã khai kiểu lại thành
     `no-unsafe-assignment`. Dùng một helper `asyncMock<[ĐốiSố]>()` bọc `jest.fn<…>()`.
  3. `const res: any = await service.X()` → bỏ hẳn `: any`. Các method public của service đều
     để TS TỰ SUY return type, nên chính dòng `: any` mới là chỗ tạo ra `any`.
  4. Dữ liệu `content_json` (`Prisma.JsonValue`) không chấm thẳng `.step_4` được — đó là lý do
     người ta ép `any`. Thay bằng MỘT helper có tên và kiểu đích thật (`asRecord()` trong
     service, `asContent()` trong spec), đừng rải `as any`.
  **Vì sao đáng làm, chứ không chỉ để con số đẹp:** `any` ở spec làm test nói dối. Gõ
  `solution_code` thay cho `solutionCode` vẫn biên dịch, `toBeUndefined()` vẫn ĐẠT, và lỗ lộ
  lời giải vẫn còn nguyên. Làm dần từng module rồi hạ mốc trần trong `ci.yml` (chỉ được hạ).

  Đã dọn `courses` ngày 15/10/2026: **263 → 175 lỗi** (`-88`), một file duy nhất
  (`courses.service.spec.ts`) chiếm cả 88. Hai số đo của lần đó, ghi lại vì chúng chỉnh lại
  câu "test nói dối" cho chính xác hơn:
  · Gõ sai TÊN HÀM MOCK (`createMnay`) thì bản `any` VẪN trượt — nhưng trượt lúc chạy, với
    thông báo của Jest về "received value must be a mock", không phải một câu nói rằng service
    vừa bỏ mất cái cổng. Bản có kiểu trượt ngay ở `tsc` kèm "Did you mean 'createMany'?".
  · Gõ sai TÊN FIELD trên kết quả (`res.okk`) kèm matcher phủ định thì bản `any` **im lặng
    đạt 13/13**, còn bản có kiểu báo "Property 'okk' does not exist". Đây mới là trường hợp
    test nói dối thật sự — và nó chỉ xảy ra khi matcher phủ định, nên đừng tin rằng mọi lỗi
    gõ sai đều tự lộ ra.
  Một thứ nữa đáng biết trước khi làm module sau: bỏ `: any` khỏi `const res` làm lộ ra
  những lỗi `strictNullChecks` thật mà `any` đang che (`whereDaGui()` có thể `undefined`,
  `Array.find()` có thể `undefined`). Đừng dập chúng bằng `!` — ở đây mỗi chỗ đó là một
  khẳng định riêng (`expect(where).toBeDefined()`), vì nếu service ngừng gửi `where` thì `!`
  sẽ ném TypeError vô nghĩa trong khi bản chất là cái cổng `is_published` vừa mất.
- **Khoá Advanced có ĐÚNG 3 bài cửa tự kiểm tra, không phải 5.** Danh sách 5 bài
  (B20, I07, I12, N04, N08) là của khoá cơ bản pe-v3 ĐÃ XOÁ; chú thích nào còn ghi nó là chú
  thích cũ. Ba bài hiện tại: **R02** (`sort_order` 20), **DA01** (47), **DA02** (48) — đếm bằng
  `grep '"gate": true' scripts/pe-v4/out-advanced/lessons/*.json`. Cả backend
  (`isSelfTestGateLesson`) và frontend đều nhận diện theo CỜ `step_4.gate` chứ không hard-code
  mã bài, nên đừng viết test khoá cứng con số 3 — thêm cửa mới là server tự khoá theo.
- **Server biết "đã hoàn thành", không biết "đã nộp".** Ở bài cửa tự kiểm tra, lời giải mẫu
  bị giữ lại tới khi bài được ghi nhận hoàn thành. Frontend từng chỉ nạp nội dung một lần lúc
  mở bài nên phải tải lại trang mới thấy lời giải; nay `useLessonData.complete` thấy cờ
  `solutionWithheld` thì nạp lại nội dung ngay sau `POST /lessons/:n/complete`. Lời giải vẫn
  chỉ mở khi đã HOÀN THÀNH, không phải khi vừa nộp lần đầu.
- **Test `python-runner` trượt khi chạy CẢ BỘ nhưng chạy riêng thì đạt — là ĐỒNG HỒ, không
  phải rò trạng thái giữa các file.** Đã kiểm: `npx jest --ci --runInBand` (tất cả 29 file
  trong một tiến trình, tức mức rò `process.env`/singleton cao nhất) luôn xanh, nên nguyên
  nhân là tranh CPU. Hai chỗ đã sửa, đừng dựng lại: (1) `python-runner.controller.spec.ts`
  dựng app Nest thật rồi gọi 11 lượt HTTP trong MỘT ca — 0,3 s khi chạy riêng nhưng đo được
  2,96 s khi chạy cả bộ với cache ts-jest nguội, có lần vượt 5 s rồi báo "Exceeded timeout of
  5000 ms"; vì vậy `jest.testTimeout` trong `package.json` đặt 30 s (đồng hồ canh treo, không
  phải khẳng định về tốc độ). (2) `local-executor.spec.ts` từng ngủ cố định 50 ms để chờ
  executor đi tới `execFile`, trong khi trước đó còn `mkdtemp`+`writeFile` thật — nay chờ theo
  ĐIỀU KIỆN (`spawned`/`killed`). Chờ theo đồng hồ còn làm lời gọi muộn rơi vào mock của ca
  SAU và lệch bộ đếm của nó.
- **Kho quiz chỉ đọc khoá `text`/`label` của lựa chọn — câu "dự đoán" dùng `title`.**
  `normalizeQuestion` (`src/quizzes/quizzes.service.ts`, nhánh quy đổi `options`) làm
  `String(o.text ?? o.label ?? '')`, trong khi `predict_block()` ở `scripts/pe-v4/build.py:210`
  sinh lựa chọn với khoá `{id, title, detail, correct}`. Đưa câu dự đoán vào kho quiz mà không
  thêm `?? o.title` thì MỌI lựa chọn thành **chuỗi rỗng** và gửi thẳng ra frontend — không ngoại
  lệ nào được ném, không log nào đỏ, chỉ là 4 nút trắng. Hiện kho quiz chỉ lấy `step_2.mcq` nên
  chưa vỡ; đổi nguồn câu hỏi thì phải đổi `normalizeQuestion` CÙNG LÚC.
- **Muốn ôn tập phải xong 2 bài, không phải 1.** `buildQuestionPool` đòi `MIN_POOL = 5` câu mới
  cho ra đề, mà mỗi bài Advanced chỉ có **3** câu trắc nghiệm (46/48 bài có 3 câu, 2 bài có 4 —
  đếm `step_2.mcq`). Nên thực tế học viên phải hoàn thành 2 bài mới mở được quiz ôn. Thông báo
  gửi FE (`min_questions: 5`) nói theo SỐ CÂU nên dễ đọc nhầm thành "xong 1 bài là đủ"; sửa
  `MIN_POOL` là đổi hành vi người dùng thấy được.
- **Hạn của tài khoản khách là cửa sổ TRƯỢT, và frontend đang ghi cứng 8 giờ ở nhiều chỗ.**
  `JWT_REFRESH_EXPIRES` mặc định `'8h'` (`src/config/env.validation.ts`), nhưng
  `RefreshTokenService.lifetimeMs` là hằng đọc MỘT LẦN trong constructor và `expiresAt` được
  tính trong `issue()` — mà `rotateAndBlacklist()` gọi lại `issue()`, nên mỗi lần refresh là
  một hạn 8 giờ MỚI. Hệ quả: muốn đổi luật hết hạn (ví dụ "khách giữ tiến độ 30 ngày") thì
  phải quyết ở `issue()`, đặt ở controller là vô ích. Phía frontend, cookie mốc
  `pe_has_session` đang ghi cứng `max-age=28800` ở **bốn** chỗ — `frontend/src/lib/api.ts:90`
  và `:130`, `frontend/public/static/js/pe-bridge.js:36`, `frontend/public/static/js/pages/login.inline.js:19`
  (thêm một chú thích nhắc tới 8 giờ ở `frontend/src/lib/course-progress.ts`). Đổi
  `JWT_REFRESH_EXPIRES` mà quên bốn chỗ này thì cookie và token lệch nhau: FE tưởng còn phiên
  trong khi token đã hết, hoặc ngược lại.
- **`apiFetch` gặp 401 là TỰ TẠO tài khoản khách — đừng gọi nó ở trang công khai.**
  `apiFetch` (`frontend/src/lib/api.ts`) khi refresh không được sẽ rơi xuống `ensureGuest()`.
  Gọi nó trên một trang ai cũng vào được nghĩa là **mỗi bot quét web sinh một tài khoản khách**,
  ăn hết hạn mức `THROTTLE_GUEST_LIMIT` (mặc định 120 lượt/giờ/IP, `src/auth/auth.controller.ts`)
  và nhồi rác `@guest.local` vào bảng users. Hạn mức tính theo IP nên cả phòng máy chung một
  NAT sẽ nhận 429 đúng lúc có người cần tài khoản thật. Luật dùng:
  · trang BÀI HỌC (`/lesson/*`) — nơi học viên thật sự cần một danh tính để lưu tiến độ — dùng
    `apiFetch`;
  · mọi trang công khai (trang chủ, `/courses/*`, badge "Tiếp tục ở bài X"…) dùng
    **`apiFetchSessionOnly`**: nó chỉ gửi kèm phiên đang có, 401 thì trả về 401 và để UI hiện
    trạng thái "chưa đăng nhập", KHÔNG tạo tài khoản.
- **Đừng `DELETE FROM users` để dọn khách.** `DELETE ... WHERE email LIKE '%@guest.local'`
  (từng được gợi ý trong chú thích `AuthService.guest`) vỡ ngay: 22 khoá ngoại tới `users` là
  `ON DELETE RESTRICT`; và LIKE đó trúng cả người thật đăng ký bằng email đuôi ấy. Dùng
  `scripts/cleanup-guest-accounts.ts` (mục dưới). Thứ tự xoá bảng con nằm ở
  `src/auth/guest-cleanup.ts` và theo `schema.prisma`/migration: thêm bảng trỏ vào `users`
  thì thêm vào danh sách ở file đó — spec đọc migration và đỏ nếu thiếu, hoặc nếu thứ tự
  xoá ngược một khoá ngoại.

## Nạp dữ liệu vào DB — đừng mặc định dùng seed

Hai đường, chọn sai là xoá tiến độ của người đang học:

- **`scripts/seed-python-advanced-v4.ts --apply` — chỉ khi khoá CÒN TRỐNG.** Nó `deleteMany`
  cả 48 bài VÀ toàn bộ `lesson_progress` của khoá, rồi đặt mọi ghi danh về
  `completedLessons: 0, progress: 0`. Có sao lưu trước khi xoá, nhưng "sao lưu" không cứu được
  tester đang học dở. Sửa vài chữ trong 4 bài mà chạy cái này là xoá tiến độ của mọi người.
Hướng dẫn một trang chọn đúng đường nạp (kèm khôi phục từ file sao lưu): [HUONG-DAN-NAP-GIAO-TRINH.md](HUONG-DAN-NAP-GIAO-TRINH.md).

- **`scripts/update-lesson-content.ts` — đường nạp AN TOÀN khi đã có người học.** Chỉ chạy
  `UPDATE lessons SET content_json = …` theo `(course_id, sort_order)` và phải trùng
  `lesson_code` của gói; KHÔNG đụng `lesson_progress`, `enrollments`, `courses`, không tạo/xoá
  bài, không đổi cột khác của `lessons`. Mặc định CHẠY THỬ (in sha256 cũ → mới, không ghi);
  `--apply` bắt buộc kèm `--backup=<file.json>`; `--offline` xem trước mà không cần DB. Mọi
  UPDATE trong một transaction, mỗi câu phải trúng đúng 1 hàng.

  ```bash
  npx ts-node scripts/update-lesson-content.ts --codes=P01,P02,P03 --offline   # kiểm gói
  npx ts-node scripts/update-lesson-content.ts --codes=P01,P02,P03             # xem trước
  npx ts-node scripts/update-lesson-content.ts --codes=P01,P02,P03 --apply --backup=bak.json
  ```

  Sau mỗi lần thêm/xoá bài, chạy `npx ts-node scripts/fix-course-lessons.ts` trước (mặc định
  chỉ xem, `--apply` luôn cần `--backup=<file.json>`), rồi chạy
  `npx ts-node scripts/check-db-invariants.ts`. Script chỉ đếm bài có `1 <= sort_order < 1000`
  và dừng nếu dãy số bị hở: `courses.lessons` còn là số thứ tự tối đa của route bài học, nên
  không được tự dồn `sort_order` vì sẽ làm lệch tiến độ có sẵn.

  Luật chọn/so sánh nằm ở `src/course-admin/lesson-content-update.ts` (có test Jest).

Sau MỌI lần nạp, vẫn phải chạy `py scripts/pe-v4/sync_curricula.py` — xem bẫy "Hai nguồn
danh sách bài" ở trên.

### Dọn tài khoản khách

`scripts/cleanup-guest-accounts.ts` xoá khách (`guest_<uuid>@guest.local`, mật khẩu rỗng,
không OAuth) mà không còn ai vào lại được: không còn phiên refresh sống, và mốc hoạt động cuối
cũ hơn N ngày (mặc định 30). Mặc định chỉ xoá khách CHƯA HỌC (không `lesson_progress`, xp = 0)
để giữ số liệu buổi test; `--include-with-progress` xoá cả khách đã
học. Khách có bài viết/bình luận hoặc là giảng viên luôn bị bỏ qua và in ra để xử lý bằng tay.
Mặc định CHẠY THỬ; `--apply` bắt buộc kèm `--backup=<file.json>` (ghi `users` + mọi hàng con,
kể cả bảng CASCADE, TRƯỚC khi xoá); `--limit` chặn số khách mỗi lần, xoá trong một transaction.

```bash
npx ts-node scripts/cleanup-guest-accounts.ts                                  # xem trước
npx ts-node scripts/cleanup-guest-accounts.ts --older-than=60d --include-with-progress
npx ts-node scripts/cleanup-guest-accounts.ts --progress-older-than=180d       # CHÍNH SÁCH, xem dưới
npx ts-node scripts/cleanup-guest-accounts.ts --apply --backup=guests-bak.json --limit=200
```

Luật chọn và thứ tự xoá nằm ở `src/auth/guest-cleanup.ts` (có test Jest).

**Chính sách giữ tài khoản khách (DB6, ghi 19/11/2026 theo đề xuất Q9 — Nhân xác nhận trước khi chạy `--apply` đầu tiên):**
- Khách CHƯA có tiến độ (không `lesson_progress`, xp = 0): xoá sau **30 ngày** không hoạt động.
- Khách CÓ tiến độ: giữ **180 ngày kể từ lần học cuối** (muộn nhất của `last_study_date`, `lesson_progress`, nhật ký XP) rồi mới xoá.
- Người đăng nhập thật (mật khẩu không rỗng hoặc có OAuth): **giữ không hạn**; script không bao giờ chọn họ.
- Luôn bỏ qua khách còn phiên refresh sống, có bài viết/bình luận, hoặc là giảng viên.
- Một lệnh áp cả hai mốc: `--progress-older-than=180d` (kèm `--older-than=30d` mặc định). Không có cờ này thì khách đã học KHÔNG bị đụng.
- Khách chỉ giữ được tiến độ lâu hơn 30 ngày nếu refresh token cũng sống lâu hơn: đổi chính sách thì đổi `JWT_REFRESH_EXPIRES`
  cùng lúc, và đổi cả bốn chỗ ghi cứng `max-age=28800` ở frontend (xem bẫy "Hạn của tài khoản khách").
- Đo trên branch thử 19/11/2026: 109 khách; chạy thử theo chính sách báo xoá 26, giữ 40 (mới hoạt động) và 43 (còn phiên).
- `--apply` phải duyệt từng đợt: chạy thử → Nhân duyệt danh sách → `--apply --backup=<file> --limit=<n>`. Không chạy `--apply` từ CI
  (xem "Lịch chạy các job dọn dữ liệu").

## Quy ước migration và môi trường DB

**Ba môi trường, ba cặp biến.** Không ghi link kết nối vào repo, vào chat hay vào `.env.example`.

| Môi trường | Dùng để | `DATABASE_URL` (app) | `DIRECT_URL` (Prisma CLI) |
|---|---|---|---|
| Thật (nhánh production trên Neon, dùng chung bản deploy của `main`) | chỉ áp migration đã qua thử | host CÓ `-pooler` | host KHÔNG có `-pooler` |
| Thử (branch Neon con của production) | làm và kiểm mọi thay đổi DB trước | như trên, của branch | như trên, của branch |
| Máy cá nhân | `npm run start:dev` | trỏ vào branch thử, không trỏ vào DB thật | |

`DIRECT_URL` mà có `-pooler` (qua PgBouncer) thì `prisma migrate` có thể treo vì khoá advisory.
Đã gặp: `.env` đặt cả hai biến cùng một host có `-pooler`. Khi chạy tạm, bỏ `-pooler` khỏi
host trong biến shell, đừng sửa lệnh. Trước khi chạy bất kỳ lệnh ghi nào, kiểm `DATABASE_URL`
đang trỏ đúng branch thử (script tạm nên tự dừng nếu host không khớp).

**Làm một thay đổi DB:**
1. Sửa `prisma/schema.prisma`, rồi `npx prisma validate`.
2. Xem SQL sẽ chạy mà không cần shadow DB: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
   (Prisma 7 đã bỏ `--from-url`). Đọc nó: có `DROP`/`RENAME`/`ALTER COLUMN … TYPE` là phải dừng,
   trừ ngoại lệ có lý do ghi trong đầu `migration.sql` (xem migration bỏ chỉ mục GIN).
3. Tạo `prisma/migrations/<YYYYMMDDHHMMSS>_<tên>/migration.sql` (mốc thời gian SAU migration cuối).
   Đầu file ghi VÌ SAO, số đo, và cách hoàn tác. Dùng `IF NOT EXISTS` / `IF EXISTS`.
4. `npx prisma migrate deploy`, rồi chạy lại lệnh ở bước 2: phải ra `-- This is an empty migration.`
5. `npx prisma generate`, `npm run typecheck`, `npx jest --ci`.

**Luật cho bảng/cột mới** (DB còn dùng chung bản Django, nên chỉ THÊM):
- Bảng mới: khoá chính `BIGINT` hoặc `UUID`; thời gian `timestamptz`; mọi khoá ngoại có chỉ mục
  (Postgres không tự tạo); `CHECK` cho giá trị hợp lệ (progress 0–100, XP ≥ 0).
- Cột mới trên bảng cũ: nullable hoặc có default, để không viết lại bảng.
- Không `CREATE INDEX CONCURRENTLY` trong migration (Prisma bọc cả file trong một transaction).
- Thêm bảng trỏ vào `users` ⇒ thêm vào `src/auth/guest-cleanup.ts` (spec đỏ nếu quên).
- Không viết truy vấn lọc theo NỘI DUNG JSONB của `lessons.content_json` (path, `@>`, `->`).
  Chỉ mục GIN của nó đã bị bỏ (idx_scan = 0, 3,5 MB); cần lọc thì thêm cột riêng.
- `lesson_progress.course_id` lặp thông tin của `lessons.course_id` mà DB không bắt được lệch.
  Giữ cột, đừng xoá (đang có chỉ mục phục vụ tiến độ).

**Thời hạn giữ `learning_events`** (chính sách ghi 15/11/2026; chạy bằng
`npx ts-node scripts/learning-events/rollup-heartbeats.ts`, mặc định chạy thử, `--apply` mới ghi):
- `X-Lesson.Heartbeat` (một hàng mỗi 30 giây, 52% bảng) chỉ giữ **7 ngày**, sau đó gộp thành số phút
  trong `learning_time_daily` (một dòng mỗi người, ngày, bài) rồi xoá hàng thô, bằng MỘT câu SQL nên
  không thể xoá mà không gộp; job tự kiểm số heartbeat gộp = số xoá, lệch là huỷ cả lần.
- Mọi loại khác và bảng tóm tắt giữ **90 ngày** = `HAN_LUU_NGAY` (frontend/src/lib/learning-event-kinds.ts),
  không giữ lâu hơn điều đã hứa với người học. Đổi một nơi thì đổi cả `DEFAULT_KEEP_DAYS`
  (src/learning-events/event-retention.ts). Không rút các loại khác xuống 30 ngày: `truy-van.sql` đọc payload
  của Run.Test/Submit/Abandon (ca trượt, exception, màn bỏ dở) mà bảng tóm tắt không giữ.
- Không câu nào trong `truy-van.sql` dùng Heartbeat, nên gộp nó không làm mất kết quả đang có.
- Mốc cắt theo NGÀY UTC để mỗi (user, ngày) được gộp trọn một lần; chạy lại ngay sau đó là no-op.
  Mỗi ngày qua đi lại có thêm Heartbeat vượt 7 ngày (đã thấy: một ngày sau lần `--apply` đầu, dry-run báo thêm 3 hàng),
  nên job phải chạy định kỳ — lịch dry-run nằm ở mục "Lịch chạy các job dọn dữ liệu" ngay dưới.
- Ước lượng dung lượng — GIẢ ĐỊNH, không phải số đo: 10.000 người học × 30 phút/ngày, nhịp 30 giây
  ⇒ 60 hàng/người/ngày × ~241 byte ≈ 145 MB/ngày hàng thô Heartbeat. Không gộp thì tăng mãi; gộp sau
  7 ngày thì trần ≈ 1 GB. `learning_time_daily` ≈ 1 dòng/người/bài/ngày (cỡ 1 MB/ngày, ≈ 90 MB ở trần
  90 ngày). Số đo thật (15/11, 10 người): 494 → 247 hàng sau lần gộp đầu.
- Gộp Heartbeat làm mất `screen_key` và payload (`step`, `completed`) của nó: sau 7 ngày chỉ còn thời gian
  theo BÀI, không theo MÀN. Cần theo màn thì thêm `screen_key` vào khoá bảng tóm tắt trước khi chạy `--apply`
  trên DB thật (không làm lại được sau khi đã xoá hàng thô).

**Lịch chạy các job dọn dữ liệu (DB12, viết 19/11/2026):**
- `.github/workflows/db-jobs.yml` chạy **chỉ chế độ CHẠY THỬ** mỗi ngày 02:00 UTC (09:00 giờ Việt Nam): `rollup-heartbeats.ts` (gộp
  Heartbeat > 7 ngày, xoá sự kiện và tóm tắt > 90 ngày) rồi `cleanup-guest-accounts.ts --progress-older-than=180d`. Kết quả nằm ở trang
  tóm tắt của lượt chạy (Actions → DB jobs → lượt chạy → Summary).
- **Chưa bật được thật:** GitHub chỉ chạy cron của workflow trên nhánh mặc định (`main`), nên khi file còn ở nhánh `test` chỉ chạy được
  bằng Run workflow. Cần thêm secret `DATABASE_URL` (chuỗi `pe_app`, host `-pooler`; branch thử khi thử, DB thật khi vận hành). Chưa có lượt
  chạy nào trên GitHub; hai lệnh đã chạy thử ở máy trên branch thử, đều ra "CHẠY THỬ — chưa ghi gì".
- Thất bại báo bằng email GitHub gửi cho người sửa dòng cron gần nhất; thêm secret `DB_JOBS_WEBHOOK_URL` (Slack/Discord, nhận JSON `{"text":…}`)
  thì báo cả kênh nhóm.
- **Tắt:** Actions → DB jobs → ⋯ → Disable workflow, hoặc xoá khối `schedule` trong file.
- `--apply` KHÔNG chạy trên Actions: file `--backup` chứa dữ liệu người dùng mà repo có remote công khai nên không được đẩy lên artifact.
  Nhân duyệt kết quả chạy thử rồi tự chạy `--apply` ở máy mình. **Trước `--apply` đầu tiên của rollup trên DB thật phải quyết định giữ
  `screen_key` của Heartbeat hay không** (xem mục trên: gộp xong không làm lại được). Chưa quyết ⇒ chưa `--apply`.

**Hai bẫy đã gặp khi làm việc này:**
- **DB thật không có cùng giáo trình với gói trong repo.** `python_advanced` trong DB có 179 bài
  (mã `PY01…TH07`, bài 47 là `PD06`), còn `scripts/pe-v4/out-advanced/` có 48 bài (`P01…DA02`, bài 47
  là `DA01`). `update-lesson-content.ts` khớp theo `(sort_order, lesson_code)` nên không nạp được gói
  này vào DB thật, và `seed-python-advanced-v4.ts --apply` sẽ xoá cả 179 bài lẫn tiến độ.
  Giáo trình của DB là gói `scripts/pe-da/out/lessons.json` (172 bài `PY01…RD05`, **chưa commit**, và là
  bản dựng thô chưa qua `build_advanced.py` nên validator của `update-lesson-content.ts` từ chối).
  Bảy bài `TH01…TH07` (sort_order 173–179) **chỉ có trong DB**, không có file nguồn nào trong repo:
  mất DB là mất chúng. Sao lưu nội dung bài: xuất bảng `lessons` ra `backups/` (đã ignore) trước mỗi
  lần sửa lớn, và commit `scripts/pe-da/` cùng nguồn của module 11.
  `courses.lessons` phải bằng số bài thật, không thì `POST /lessons/:n/complete` trả 400 cho bài
  vượt số khai và `enrollments.progress` không bao giờ tính tới chúng. Nhật ký: 15/11/2026 sửa
  172 → 179 trên branch Neon `test` (lý do: bảng `lessons` có 179 bài, `courses.lessons` ghi 172;
  sao lưu hàng cũ ở `backups/`, không commit). **DB production CHƯA sửa** — cần Nhân duyệt rồi
  mới ghi, theo đúng thứ tự: sao lưu → UPDATE trong transaction → `check-db-invariants.ts`.
- **Kiểm bất biến DB sau mỗi lần sửa:** `npx ts-node scripts/check-db-invariants.ts` (chỉ đọc, thoát
  mã 1 nếu trượt): `courses.lessons` = số bài thật, không bài trùng, `lesson_progress.course_id` khớp
  `lessons.course_id`, `enrollments.progress` khớp công thức, mọi khoá ngoại có chỉ mục dẫn đầu.
- **Nhánh git lệch migration với DB.** Khi nhánh thiếu migration mà DB đã áp, `prisma migrate dev`
  coi đó là drift và có thể đề nghị RESET. Gộp migration của `main` vào trước, rồi `migrate status`
  phải sạch, rồi mới chạy lệnh nào khác.

## Role DB, sao lưu và áp thay đổi lên DB thật (DB9)

**Role riêng — đã làm và kiểm trên branch `test` ngày 19/11/2026; DB thật CHƯA đổi.** SQL ở `scripts/db/create-app-roles.sql`:
- `pe_app`: chỉ SELECT/INSERT/UPDATE/DELETE và dùng sequence; không DDL, không đọc `_prisma_migrations`. Dùng cho `DATABASE_URL` (host `-pooler`).
- `pe_migrator`: CHỦ SỞ HỮU các bảng, dùng cho `DIRECT_URL` (host KHÔNG `-pooler`) khi `migrate deploy`. Không dùng `neondb_owner` làm chủ vì
  Neon từ chối `GRANT neondb_owner TO …`; muốn chuyển chủ bảng thì chuyển sang chính role mới.
- Bảng mới do `pe_migrator` tạo tự cấp DML cho `pe_app` (default privileges) — đã thử tạo/xoá một bảng mẫu.
- Đã đo trên branch thử: `pe_app` bị chặn DROP/ALTER/CREATE TABLE, TRUNCATE, CREATE INDEX và đọc `_prisma_migrations`; backend chạy bằng `pe_app`
  tạo khách, ghi danh, mở bài, hoàn thành bài (ghi XP) đều chạy, log server không có lỗi quyền; `pe_migrator` chạy `migrate deploy` được
  (đã áp `20261116000000_forum_post_indexes`), `migrate status` sạch, `migrate diff` rỗng; `check-db-invariants.ts` chạy bằng `pe_app` đạt 7/7.
- Đổi role = đổi `DATABASE_URL`/`DIRECT_URL` ở Render, Vercel và `.env`. Mật khẩu role nằm ngoài repo (branch thử: `backups/roles-test-branch.env`, git bỏ qua).
- **Khi áp lên DB thật:** `ALTER … OWNER` đổi chủ MỌI bảng. Làm lúc ít người dùng, sau khi sao lưu, và chạy `check-db-invariants.ts` ngay sau đó.

**Đã kiểm trong mã (19/11/2026):**
- Mật khẩu giữ định dạng Werkzeug: `src/common/security/` sinh `scrypt:N:r:p$salt$hex` và `pbkdf2:sha256:…`; `check-password.ts` từ chối chuỗi không phải hai dạng đó.
- Refresh token chỉ lưu hash SHA-256 (`auth/refresh-token.service.ts`, `createHash('sha256')`) kèm `family_id`; không còn token thô trong DB.
- SQL thô: không có `$queryRawUnsafe`/`$executeRawUnsafe` trong `src/`; chỉ `$queryRaw` dạng tagged template (tham số hoá). (Nghĩa sẽ thêm luật eslint chặn `Unsafe`.)
- **Log từng rò thông tin — đã sửa:** `AllExceptionsFilter` và `PrismaExceptionFilter` ghi `request.url` thô (kèm `?refresh=<token>&email=…`) và message/stack của lỗi
  Prisma (V8 lặp message ở đầu stack, mà message Prisma chứa cả giá trị tham số). Nay cả hai che query bằng `src/common/logging/redact-url.ts` (thêm `email`,
  `phone` vào danh sách che) và Prisma chỉ ghi mã lỗi + các dòng `at …` của stack. Test `redact-url.spec.ts`: trả bản filter cũ về thì 2 ca trượt. Log còn lại
  chỉ in `user.id` (số), không in email/tên.

**Sao lưu khôi phục theo thời điểm (PITR) của Neon — CHƯA làm, cần tài khoản Neon:** bật ở Neon Console (Settings → Storage → cửa sổ lịch sử; số ngày phụ thuộc gói),
rồi diễn tập trên branch con: Console → Branches → Create branch → chọn thời điểm → so `SELECT count(*)` các bảng chính với hiện tại. Không diễn tập trên DB thật.
Việc này không làm từ dòng lệnh được vì repo không có Neon API key.

**Thứ tự áp lên DB thật** (mỗi bước dừng nếu lỗi; Nhân tự gộp và triển khai):
1. Sao lưu: tạo branch sao lưu của Neon từ production, và xuất hàng sắp sửa ra `backups/` (`courses`, `lessons` nếu đụng tới).
2. `DIRECT_URL` KHÔNG có `-pooler`; `npx prisma migrate status` — ghi lại migration nào chưa áp.
3. Câu kiểm trùng ở đầu `prisma/migrations/20261111000000_daily_xp_log_unique/migration.sql` phải ra **0 dòng**; câu kiểm trùng `(course_id, sort_order)` trong README cũng 0 dòng.
4. `npx prisma migrate deploy`. Với nhánh `test` hiện tại sẽ áp: `20261111000000_daily_xp_log_unique`, `20261115000000_drop_lessons_content_json_gin` (**DROP INDEX — ngoại lệ có
   lý do, cần Nhân duyệt**), `20261115010000_fk_indexes`, `20261115020000_content_version_and_hash`, `20261115030000_learning_time_daily`, `20261116000000_forum_post_indexes`
   (và các migration `20261028*` nếu production chưa có). **Phải áp `20261111000000` TRƯỚC khi triển khai code mới**: code ghi XP dùng upsert dựa vào `uq_daily_xp_user_date`.
5. `UPDATE courses SET lessons = (SELECT count(*) FROM lessons WHERE course_id = 'python_advanced' AND sort_order < 1000) WHERE id = 'python_advanced'` trong một transaction.
6. `npx ts-node scripts/check-db-invariants.ts` phải "Tất cả đạt".
7. Ghi nhật ký vào mục "Hai bẫy đã gặp" như lần sửa 172 → 179 trên branch thử.
8. Sau cùng (nếu duyệt): chạy `scripts/db/create-app-roles.sql`, đổi chuỗi kết nối ở Render/Vercel, chạy lại `check-db-invariants.ts` bằng `pe_app`.

## Đo tải và vùng đặt máy chủ (DB10, DB14)

**Đo tải trên branch thử, 19/11/2026** — `scripts/loadtest-scenarios.js` (`nen` | `don` | `cleanup`), backend `node dist/main` chạy bằng `pe_app`, `THROTTLE_DISABLED=true`,
`DB_POOL_MAX` mặc định 50. **Chạy cả client lẫn backend trên MỘT máy cá nhân ở Việt Nam, trung vị một vòng tới Neon ≈ 64 ms**; nếu Render xa Neon hơn (mục dưới) thì số
trên production sẽ CAO hơn. Chưa có route `/api/events` trên nhánh `test` (chỉ ở `main`) nên bài đo không gồm nó.

| Kịch bản | Route | p50 (ms) | p95 (ms) | Lỗi |
|---|---|---|---|---|
| NỀN: 20 người, 120 s, ~3,5 req/s | hoàn thành bài (n=90) | 1 659 | 2 101 | 0% (445 request) |
| | mở nội dung bài (n=239) | 491 | 827 | |
| | danh sách ghi danh (n=96) | 174 | 260 | |
| DỒN: 100 người cùng lúc (lần 1) | hoàn thành bài (n=300) | 1 139 | 1 344 | 0% (700 request) |
| DỒN (lần 2, dữ liệu sạch) | hoàn thành bài (n=300) | 1 169 | 1 337 | 0% (700 request) |

- Tiêu chí đề xuất (p95 hoàn thành bài ≤ 3 s, 5xx < 1%): **đạt cả hai** trong điều kiện trên.
- **Kết nối DB đỉnh: NỀN 20, DỒN 47 rồi 50/50** — kịch bản DỒN chạm trần pool 50. Vẫn đạt vì mỗi người chỉ có ~7 request, nhưng lớp 100 người làm bài lâu hơn hoặc độ trễ
  tới Neon tăng lên (Render xa) thì request sẽ xếp hàng chờ connection. **CHƯA đo p95 thời gian chờ connection** (backend không xuất số này; chỉ có đỉnh kết nối từ `pg_stat_activity`).
  Chưa đo "lỗi khi Neon thức dậy" (không ép được branch suspend từ đây); lần kết nối đầu tiên đo được 341–378 ms.
- EXPLAIN trên dữ liệu giả (20.117 user, 200.081 `lesson_progress`, 60.033 nhật ký XP; trong transaction rồi rollback, đã kiểm user giả còn 0): bài theo `(course_id, sort_order)`,
  tiến độ một bài, ghi danh, đếm bài xong, nhật ký XP hôm nay, bảng xếp hạng top 20, đăng nhập theo email đều dùng chỉ mục, 0,03–0,08 ms. Kiểm khoá ngoại `auth_sessions.user_id`
  ra quét tuần tự vì lần đo này KHÔNG nhân bảng `auth_sessions` (~54 dòng) — không phải lỗi chỉ mục (đã thử ép planner ở lần đo trước: chọn đúng chỉ mục 22/22).
- **Chỉ mục `idx_scan = 0` (44 cái, bảng còn nhỏ nên phần lớn là bình thường).** Hai cái dư thật, đề xuất bỏ (DROP — ngoại lệ, cần duyệt, CHƯA làm):
  `idx_daily_xp_user_date` (trùng hệt unique `uq_daily_xp_user_date`) và `quizzes_user_id_course_id_idx` (là tiền tố của `idx_quizzes_user_course_kind`). 22 chỉ mục khoá ngoại và 3 chỉ mục
  `posts` mới thêm cố ý chưa được dùng: đừng bỏ.
- Dọn người dùng giả: `node scripts/loadtest-scenarios.js cleanup` (xoá theo `DELETE_ORDER`; đã chạy, còn 0 người `@pe-loadtest.local`).

**Vùng đặt máy chủ (DB14):**

| Dịch vụ | Vùng | Độ trễ một vòng | Nguồn |
|---|---|---|---|
| Neon (DB thật và branch `test`) | `ap-southeast-1` (Singapore) | — | đọc từ host `c-2.ap-southeast-1.aws.neon.tech` trong `.env` |
| Máy dev ở Việt Nam → Neon | — | **p50 64 ms, p95 76–80 ms** (40 vòng `SELECT 1`, 2 lần đo) | đo 19/11/2026 |
| Render (backend) | **Ohio (us-east-2), Nhân xác nhận 19/11/2026** — xa Neon Singapore | CHƯA ĐO (ước lượng ~200–240 ms/vòng, chưa phải số đo) | Nhân đọc từ Render Dashboard |

- Chú thích trong `src/prisma/prisma.service.ts` và `src/health/health.controller.ts` ghi "Neon us-east-2, ~237 ms/vòng" **đã lỗi thời**: DB đã chuyển sang Singapore ngày 27/10. Con số 237 ms
  chỉ đúng nếu Render đặt ở xa Singapore (Oregon/Ohio). Cần đo lại từ Render trước khi tin.
- **Khuyến nghị:** nếu Render không ở Singapore thì chuyển **Render** sang Singapore (dịch vụ không giữ dữ liệu, đổi vùng chỉ là dựng lại service), không chuyển Neon: DB đã ở gần người dùng
  Việt Nam, và đổi vùng Neon là tạo project mới + `pg_dump`/restore + đổi chuỗi kết nối, rủi ro cao hơn nhiều. Chốt ngày sau khi biết vùng Render (phải xong TRƯỚC 25/11).
- Cách đo từ Render: mở Shell của service, chạy 30 lần `SELECT 1` trên một kết nối rồi lấy trung vị; hoặc gọi `GET /health/ready` nhiều lần (route này chạm DB).

## Chịu tải và chống phình DB (quyết định 19/11/2026)

Mục tiêu: lớp 100 người vào cùng lúc không làm sập, và DB không tự phình theo thời gian. Mỗi quyết định dưới đây có số đo hoặc lý do kèm theo.

**1. Vách ngăn cho hoàn thành bài — `COMPLETE_LESSON_MAX_CONCURRENT`, mặc định 25** (`src/common/concurrency/semaphore.ts`, dùng trong `LessonsService.completeLesson`).
- Vì sao: transaction hoàn thành bài giữ một connection 1–2,6 s (11–16 vòng tới Neon). Cả lớp bấm cùng lúc thì chúng chiếm hết pool 50 và route ĐỌC (mở bài, danh sách) phải xếp hàng sau.
  Vách ngăn dời hàng chờ từ pool (giữ socket) sang bộ nhớ (rẻ). Chờ quá 10 s thì trả 503. `0` = tắt.
- Đo (branch thử, 100 người DỒN + 1 đầu dò đọc `/api/enrolled` mỗi 100 ms, mỗi mức chạy 2 lần; `scripts/loadtest-scenarios.js don --probe`):

  | Giới hạn | Đầu dò đọc p95 | Lượt đọc phục vụ được | Mở bài p95 | Hoàn thành bài p95 |
  |---|---|---|---|---|
  | 0 (tắt) | 735 và 1 015 ms | 25 và 15 | 1 740 và 932 ms | 1 726 và 1 502 ms |
  | **25** | **255 và 215 ms** | **46 và 43** | **685 và 628 ms** | 2 506 và 2 400 ms |
  | 30 | 499 ms | 38 | 905 ms | 1 959 ms |
  | 40 | 404 ms | 25 | 710 ms | 1 988 ms |

- Cái giá: hoàn thành bài chậm hơn (p95 ≈ 1,6 s → 2,4 s) vì phải xếp hàng, vẫn dưới mốc 3 s. Lớp lớn hơn 100 người sẽ vượt 3 s — khi đó tăng `DB_POOL_MAX` trước, không nâng vách ngăn.
- Mỗi mức chỉ chạy 2 lần trên một máy cá nhân: đủ thấy xu hướng, chưa đủ để chia nhỏ giữa 25 và 30. Đo lại từ Render khi biết vùng đặt.
- Vách ngăn nằm TRONG từng tiến trình: chạy N bản backend thì tổng đồng thời là N × 25 và pool của mỗi bản vẫn riêng.

**2. Giới hạn thời gian.** Transaction tối đa 20 s và chờ connection 10 s (`src/common/prisma-tx.options.ts`); chờ connection ngoài transaction 30 s (`DB_CONNECT_TIMEOUT_MS`, giữ 30 s vì Neon cần ~10 s để thức dậy; chưa đo nên chưa hạ).
`statement_timeout` 30 s và `idle_in_transaction_session_timeout` 15 s đặt trên role `pe_app` CHỈ có tác dụng với kết nối trực tiếp, KHÔNG qua pooler (đã đo: `SHOW` trả 0). Đừng tin rằng app nhờ đó mà tự cắt được truy vấn treo.

**3. Chống phình.**
- Dữ liệu tự lớn: `learning_events` (gộp Heartbeat 7 ngày, giữ 90 ngày), `auth_sessions` (`pruneExpired` mỗi giờ), khách rác (`cleanup-guest-accounts.ts`) — lịch ở mục "Lịch chạy các job dọn dữ liệu".
- Migration `20261119000000_autovacuum_tuning`: autovacuum chạy khi dead tuple vượt 2% (`learning_events`) và 5% (`auth_sessions`) thay vì 20% mặc định, vì rollup xoá cả loạt mỗi ngày. Chỉ đổi tham số lưu trữ, hoàn tác bằng `RESET`.
- **Phình ở CHỈ MỤC, không ở bảng, và autovacuum không thu file lại.** Đo trên branch thử: `auth_sessions` 57 hàng mà chỉ mục 16 MB, `lesson_progress` 81 hàng mà chỉ mục 10 MB (do các lần test chèn rồi rollback của tôi); `REINDEX TABLE`
  đưa cả DB từ 46 MB xuống 12 MB (16 MB → 64 kB, 10 MB → 64 kB). Trên DB thật dùng `REINDEX TABLE CONCURRENTLY` (ngoài transaction, không chặn ghi; Prisma không chạy được trong migration) khi chỉ mục lớn hơn nhiều so với số hàng.
  Câu kiểm: `SELECT relname, pg_size_pretty(pg_indexes_size(relid)), n_live_tup FROM pg_stat_user_tables ORDER BY pg_indexes_size(relid) DESC LIMIT 10;`
- Kết quả đo tải chèn/xoá dữ liệu giả trong transaction rồi ROLLBACK vẫn để lại chỉ mục phình: sau mỗi đợt đo trên branch thử nên `REINDEX`.
- Chỉ mục `idx_users_xp_desc` (bảng xếp hạng) khiến mọi `UPDATE users SET xp` không còn là HOT update, nên mỗi lần hoàn thành bài để lại một phiên bản chỉ mục mới. Chưa đau ở quy mô này; nếu `users` lớn lên
  thì xem lại (ví dụ bảng xếp hạng tính từ `user_daily_xp_logs`). **Mốc xem lại (Nhân chọn phương án A ngày 19/11/2026, giữ nguyên chỉ mục):** khi `users` vượt ~50.000 dòng,
  hoặc `n_tup_hot_upd` của `users` (pg_stat_user_tables) gần 0 trong khi ghi XP nhiều. Khi đó cân nhắc phương án B: bảng xếp hạng tính từ `user_daily_xp_logs` (đổi nghĩa thành "XP trong N ngày").

## Tuần demo: chịu tải DB, đăng nhập cho lớp chung mạng (BE11, BE12 — 19/11/2026)

**Đặt trước tuần demo (Render → Environment):**

| Biến | Mặc định | Tuần demo | Vì sao |
|---|---|---|---|
| `THROTTLE_REGISTER_LIMIT` | 10/phút/IP | 60 | cả lớp chung một IP NAT; `/auth/upgrade` dùng chung ngưỡng này |
| `THROTTLE_LOGIN_LIMIT` | 20/phút/IP | 120 | như trên; chặn đoán mật khẩu đã có riêng: 5 lần sai/15 phút mỗi email (trong bộ nhớ, 1 tiến trình) |
| `THROTTLE_GUEST_LIMIT` | 120/giờ/IP | 600 | mỗi trình duyệt chỉ gọi 1 lần |
| `DB_CONNECT_TIMEOUT_MS` | 10000 | giữ | hết pool thì 503 + `Retry-After: 3` sau ≤10 s (trước: 30 s). Thấp hơn thời gian Neon thức dậy nên lượt đầu sau khoảng lặng có thể 503 — ping giữ thức bên dưới |
| `EVENTS_POOL_MAX` / `EVENTS_CONNECT_TIMEOUT_MS` | 5 / 2500 | giữ | pool RIÊNG cho `learning_events` (`EventsPrismaService.tryWrite`): hết thì bỏ lô, không lấy connection của pool chính |

**Ping giữ thức (CHƯA cài — cần tài khoản dịch vụ ngoài):** UptimeRobot/cron-job.org gọi `GET /health/ready` mỗi 4 phút
(route này chạm DB nên giữ cả Render lẫn Neon thức), từ trước tuần demo đến hết tuần đầu có người dùng thật.

**Còn mở:** (1) route ghi `learning_events` chưa có trên nhánh `test` (chỉ ở `main`) nên `EventsPrismaService` chưa có ai gọi — khi route
được đưa sang, bọc `createMany` bằng `tryWrite` và trả 202 dù kết quả `undefined`. (2) Migration `20261120000000_users_phone_unique`
CHƯA áp lên DB nào; chạy 2 câu kiểm trùng ở đầu file (0 dòng) trên branch thử trước. (3) Hàng chờ pool chỉ đo bằng mẫu `waitingCount`
mỗi giây (log mỗi 60 s; cảnh báo khi >1 s), không phải thời gian chờ từng request.


## Quy ước khi sửa

- Chú thích bằng tiếng Việt, giải thích **vì sao**, thường dẫn ra lỗi đang sửa. Đọc code quanh
  chỗ sắp sửa và viết cùng giọng.
- Test phải chứng minh được là nó bắt lỗi: gỡ bản sửa ra, test phải trượt. Ghi số ca trượt vào
  mô tả commit.
- Mỗi commit một việc, mô tả nói rõ triệu chứng → nguyên nhân → cách sửa.
- Thay đổi làm đổi hành vi người dùng thấy được thì nói thẳng trong mô tả commit.

### Học lại khoá (BE8)

`POST /api/courses/:id/reset` chỉ do người học tự yêu cầu sau khi FE xác nhận.
Lưu archive → xoá tiến độ → đặt ghi danh về 0 trong một transaction.
`reset()` và `completeLesson()` cùng khoá hàng enrollment trước khi đọc/ghi;
đừng bỏ khoá ở một phía vì reset/nộp bài đồng thời có thể mất bằng chứng thưởng.
Lịch sử đã hoàn thành/đã nhận XP chặn cộng lại XP và gems, nhưng bài học dở
chưa thưởng vẫn nhận thưởng lần đầu. Bảng archive đã được thêm vào job dọn khách.
