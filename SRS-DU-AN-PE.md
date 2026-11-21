# ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
## Nền tảng học lập trình Programming EDU (PE) — USTH

| | |
|---|---|
| Phiên bản tài liệu | **2.1** — hiện trạng **cộng** yêu cầu cần làm, có người phụ trách |
| Ngày lập | 27/10/2026 (thay bản 2.0 ngày 24/10/2026 và bản 1.0 ngày 20/10/2026) |
| Căn cứ mã nguồn | `origin/test` tại `c817a03`; `origin/main` tại `b013011` (đã `git fetch` 27/10) |
| Căn cứ phân việc | Artifact "Phân việc bốn nhánh" (22/10/2026) — tài liệu bên thứ ba, chỗ nào chưa kiểm chứng trên mã thì ghi rõ |
| Cách lập | Đọc lại mã theo ba lớp **FE → BE → DB** (27/10), đối chiếu với lịch sử git và cấu hình. **Chỉ chạy truy vấn đọc (`SELECT`) và `prisma migrate status` trên cơ sở dữ liệu đang cấu hình trong `.env`** (mục 6.7); chưa chạy typecheck/jest/lint/build. Số đo ở mục 5.4 là số ghi trong `AGENTS.md`, chưa đo lại |
| Tình trạng file | Chưa `git add`/commit |

> **Cách đọc cột "Hiện trạng":** ✅ đã có và có giao diện · 🟡 có phía máy chủ nhưng **không có giao diện** · ⚠️ có một phần / có điều kiện · ❌ chưa có · 🔧 **đang giao việc** (có mã người phụ trách ở mục 11) · ⏸ **chờ quyết định** (mục 1.6) · 🆕 **mới thêm ở bản 2.1**.

### Những gì đổi so với bản 2.0 (27/10/2026)
1. **Cơ sở dữ liệu trong `.env` đã đổi** sang một project Neon mới (vùng Singapore). Schema đã đủ 3 migration, **nhưng nội dung khoá học không khớp mã**: khoá `python_advanced` trong DB mang tên **"Python cho Data Analyst", 172 bài** (10 chặng, `studio-lesson/v2`), còn mã, giáo trình tĩnh và catalog đều nói **"Advanced Python", 48 bài** (mục 6.7, rủi ro #1). Bộ dựng của khoá 172 bài nằm ở `scripts/pe-da/` (chưa commit, dựng ngày 26/10) và chưa nối vào `sync_curricula.py`, catalog hay CI.
2. Hai nhánh git lệch thêm: `origin/main` nay hơn `origin/test` **73** commit (bản 2.0 ghi 44); `test` vẫn hơn 10 (mục 1.5).
3. Thêm hai quyết định mở **Q5** (khoá nào là khoá chính thức) và **Q6** (có cho khách nâng cấp thành tài khoản thật không), mục 1.6.
4. Thêm mục 3.10 (đồng bộ khoá học giữa DB, giáo trình tĩnh và catalog), yêu cầu FR-AUTH-11, mục 6.7 (số đo DB), rủi ro #1/#2/#16.
5. Thêm 6 việc vào phân việc: D8, B11, T10 (chờ Q5) và B12, T11, G5 (chờ Q6). Cập nhật D1, D2, D6.
6. Đọc lại FE → BE xác nhận: **chuỗi ngày vẫn được backend tính và lưu có chủ đích** (`src/common/streak/`, chú thích ở `LessonChrome.tsx` ghi "để bật lại được sau này"), chỉ giao diện không hiển thị — nên không coi là lỗi.

### Những gì đổi so với bản 1.0 (đã nêu ở bản 2.0)
1. **Trang chủ `/` không còn là dashboard** mà là cảnh "Góc học" (phòng học lofi), commit `d41abf5`. Dashboard Figma được dời sang `/dashboard`.
2. **Chuỗi ngày (streak) đã bị gỡ khỏi sản phẩm** (`330a469`). Cảnh Góc học vẫn còn màn **Xếp hạng** theo XP, nên ràng buộc R5 cũ phải viết lại (mục 2.3, quyết định Q2).
3. Thời lượng khoá nay ghi **"~29 giờ"** (`c817a03`, có test `catalog-duration.test.mjs`).
4. Thêm mục 1.5 (các nhánh git) và mục 11 (phân việc, truy vết yêu cầu → người).
5. Bản 1.0 lấy từ nhánh `test` **local đã cũ hai commit**; mọi chỗ trong bản 1.0 nói "dashboard là trang chủ" đều lỗi thời.

---

## 1. GIỚI THIỆU

### 1.1 Mục đích
Tài liệu mô tả những gì hệ thống PE **đang có**, những gì **cần làm tiếp** kèm người phụ trách, các ràng buộc và yêu cầu phi chức năng, làm cơ sở cho nhóm thống nhất phạm vi, chia việc và nghiệm thu. Tính năng chưa quyết định (Arena) chỉ nằm ở mục 9.

### 1.2 Phạm vi sản phẩm
PE là nền tảng học lập trình bằng tiếng Việt cho sinh viên. Hiện sản phẩm tập trung **một khoá duy nhất — "Advanced Python" (48 bài)** cùng ba bề mặt: **Góc học** (trang chủ dạng phòng học), **Ôn tập** và **Bàn thí nghiệm** (IDE chạy Python). Người học không cần đăng ký: mở link là học, hệ thống tự cấp tài khoản khách.

Ngoài phạm vi hiện tại (đã rời danh mục): các khoá Java, C++, HTML/CSS, Python cơ bản 40 bài và ba khoá Thiết kế CSDL.

### 1.3 Định nghĩa và viết tắt
| Thuật ngữ | Nghĩa |
|---|---|
| Góc học | Trang chủ `/`: cảnh phòng học lofi, có kệ sách 48 cuốn tương ứng 48 bài, và các vật bấm được (điện thoại = hồ sơ/xếp hạng, cúp = thành tựu…) |
| Chặng / học phần (module) | Nhóm bài; khoá Advanced có 8 chặng (M1–M8) |
| Bài | Đơn vị học, 48 bài; tra theo `(course_id, sort_order)` |
| Màn | Một bước trong bài (trắc nghiệm, điền code, chạy code…) |
| Bài cửa / bài tổng hợp chặng | Bài tự kiểm tra có cờ `step_4.gate`; lời giải được giữ tới khi hoàn thành. Hiện có 3: R02, DA01, DA02 |
| Tài khoản khách | Người dùng email `guest_<uuid>@guest.local`, mật khẩu rỗng |
| Pyodide | Trình chạy Python (WebAssembly) trong trình duyệt |
| Runner | Dịch vụ chạy mã Python trên máy chủ bằng Docker |
| `studio-lesson/v1`, `v2` | Định dạng JSON mô tả nội dung bài |
| JWT | Mã truy cập (access 30 phút) và mã làm mới (refresh, xoay vòng) |

### 1.4 Tài liệu tham chiếu
`README.md`; `AGENTS.md` (luật làm việc, mốc nền); `design-system-v2.md`; `LESSON-IMPORT-FORMAT.md`; `runner/README.md`; `src/api-gateway/README.md`; `PHAN-VIEC-NHOM.pdf` (phân việc chi tiết); artifact "Phân việc bốn nhánh".

### 1.5 Các nhánh git và nguồn sự thật
Clone này chỉ có **một remote**: `origin` = `PCBoiz/pe-usth` (artifact gọi là `tester`). Kho `TuyetMieu/demo_web` và nhánh `test-usth` mà artifact nhắc tới **không có trong clone này**.

| Nhánh (remote `origin`) | Vai trò theo artifact | Điều đo được trong clone |
|---|---|---|
| `test` | Frontend (UI/UX + visualization) | 143 commit. Có Góc học ở `/`, dashboard ở `/dashboard`, sáu bản vá bảo mật, `~29 giờ`. **Thiếu 44 commit của `main`** (trong đó có `f3363e6`) |
| `main` | Tester đánh giá | Hơn `test` **73** commit, kém 10 (`git rev-list --left-right --count origin/test...origin/main` ngày 27/10; ngày 24/10 là 44); nền chung `c53617c`; đầu nhánh `b013011` (26/10). Có `f3363e6` và `1610a4d`; mốc nền trong `AGENTS.md` của nhánh này là số khác (backend lint 263, frontend 134 ca) |
| `chiem-tinh` | Việc riêng của Sơn, **không thuộc phân công** | Chỉ liệt kê để không ai đẩy nhầm |
| `tien-canh-ban-quan-trac` | Không có trong artifact | Công việc "bản đồ sao" riêng; coi như ngoài phạm vi SRS này |

> **Hệ quả cần nhóm nhìn thẳng:** `test` và `main` là hai dòng lịch sử đã tách nhau (`test` 10 / `main` 44 commit riêng). Cùng một mục tiêu "mốc nền" mà mỗi nhánh ghi một con số khác. SRS này mô tả `test` (nhánh phát triển giao diện). Trước khi tester đánh giá hay deploy, phải quyết việc gộp hai dòng (Q4, việc D1).

### 1.6 Các quyết định đang mở
| Mã | Câu hỏi | Trạng thái | Đề xuất mặc định (làm theo nếu chưa ai phản đối) |
|---|---|---|---|
| Q1 | Trang chủ là Góc học hay dashboard? | **Đã chốt theo mã:** Góc học ở `/`, dashboard ở `/dashboard` để đối chiếu | Giữ nguyên; quyết một lần nữa là **bỏ hay giữ `/dashboard`** sau khi tester xem xong |
| Q2 | Có giữ màn Xếp hạng và làm thành tích có bậc không? | ⏸ **Mở.** Streak đã gỡ (xong). Màn Xếp hạng đã nằm trong Góc học, mâu thuẫn với R5 cũ (không thi đua/xếp hạng) và commit `e7c41c0` (bỏ đối kháng) | Giữ **thành tích** (tự thưởng). Với **xếp hạng**: chỉ giữ nếu tên hiển thị do người dùng đặt và có lọc; nếu không thì tắt màn này |
| Q3 | Màn điền khung mã dùng bản "sách mở" (Figma, trên `test`) hay bản ①②③ + gợi ý (trên `main`/`chiem-tinh`)? | ⏸ **Mở** — quyết định sản phẩm, không phải phép merge | Giữ "sách mở" làm gốc; thêm số thứ tự và gợi ý vào **thiết kế Figma trước**, rồi mới code |
| Q4 | Gộp `test` với `main` thế nào và nhánh nào là nguồn deploy? | ⏸ **Mở** | Gộp có chủ đích từng nhóm commit (cherry-pick), không hand-merge component React |
| Q5 🆕 | Khoá chính thức là **Advanced Python (48 bài, pe-v4)** hay **Python cho Data Analyst (172 bài, pe-da)**? Hay cả hai, ở hai khoá riêng? DB đang chứa khoá 172 bài dưới mã `python_advanced`, mã nguồn lại nói 48 bài | ⏸ **Mở, chặn D8, B11, T10** | Giữ mã nguồn làm chuẩn. Nếu giữ cả hai thì khoá Data Analyst dùng `course_id` **riêng** (không đè `python_advanced`), nạp bằng script có kiểm trước. Dù chọn thế nào cũng phải làm cho DB và giáo trình tĩnh cùng một khoá |
| Q6 🆕 | Có cho khách **nâng cấp thành tài khoản thật** (gắn email + mật khẩu vào đúng hàng `users` của họ) để không mất tiến độ khi xoá dữ liệu trình duyệt không? | ⏸ **Mở**, đề xuất mới, chưa ai duyệt | Chưa làm. Nếu làm: dùng hàng `users` hiện có (không cần migration), mật khẩu theo định dạng Werkzeug (R2), và phải có trang đăng nhập (hiện không có, FR-AUTH-05) |

---

## 2. MÔ TẢ TỔNG QUAN

### 2.1 Bối cảnh và kiến trúc

```
Trình duyệt (Next.js 16 / React 19)
  ├─ Trang chủ "Góc học": cảnh dựng bằng engine riêng, giáo trình đọc tĩnh từ curricula.json
  ├─ Bài học: chấm trong trình duyệt bằng Pyodide (Web Worker)
  ├─ IDE: gửi mã tới máy chủ để chạy / ghi vết
  └─ gọi API (JWT; tự xin tài khoản khách chỉ ở trang bài học)
            │ HTTPS
NestJS 11 (cổng 5000) — Gateway: request-id → chống quá tải → header bảo mật
      → CORS → giới hạn tần suất → JWT toàn cục → quyền admin
  14 module nghiệp vụ → Prisma 7 → PostgreSQL (Neon)
            │ (chế độ remote) HTTPS + Bearer
Runner (VM Linux, Caddy, pm2) → Docker `py-sandbox` dùng một lần
```

Dự kiến triển khai: frontend trên Vercel, backend trên Render (không có Docker), runner trên VM Azure. **Chưa xác nhận trên môi trường thật.** Frontend và backend ở **hai domain khác nhau** là mục tiêu — xem FR-AUTH-08.

### 2.2 Đối tượng người dùng
| Vai trò | Mô tả | Quyền |
|---|---|---|
| Học viên (khách) | Người học; không đăng nhập, danh tính là tài khoản khách gắn với trình duyệt | Học bài, ôn tập, dùng IDE, xem Góc học |
| Quản trị (`role = 'admin'`) | Soạn khoá/bài, nhập bài từ PDF/Markdown | Toàn bộ API `/admin/*` — **hiện không có giao diện** |
| Nhóm phát triển | Cập nhật nội dung bằng dòng lệnh | Script `seed-*`, `update-lesson-content` |
| Tester | Đánh giá sản phẩm trên `main` | Chỉ đọc; thay đổi vào `main` đi bằng cherry-pick có chủ đích |

Không có vai trò biên tập viên/giảng viên.

### 2.3 Ràng buộc chung (bắt buộc giữ)
- **R1.** Cơ sở dữ liệu **dùng chung với bản Django cũ**: migration chỉ được thêm (cột có giá trị mặc định/cho phép rỗng, chỉ mục); không đổi tên, xoá cột, đổi kiểu. **Không `DROP` bảng**, kể cả bảng không có mã nào dùng.
- **R2.** Mật khẩu giữ định dạng hash Werkzeug (`scrypt:…`, `pbkdf2:sha256:…`).
- **R3.** Gateway độc quyền tiền tố đường dẫn, phiên bản, CORS và giới hạn tần suất; module nghiệp vụ không tự thêm `api/v1`.
- **R4.** Lỗi trả bằng cách `throw` để bộ lọc ở gateway định dạng; không trả JSON thủ công.
- **R5 (sửa).** Giao diện theo hệ thiết kế v2: **không chuỗi ngày** (đã gỡ ở `330a469`), **không ổ khoá** (khoá này không khoá bài nào), không giọng dỗ dành; màu chỉ qua token `--ds-*`. *Phần "không thi đua/xếp hạng" của bản 1.0 đang ⏸ chờ Q2* vì màn Xếp hạng đã tồn tại trong Góc học.
- **R6 (mới).** **Số của người học là thật hoặc trống.** Không bao giờ hiện số mẫu; số chưa đọc được hiện "—" kèm lý do, không hiện 0 (luật ở `frontend/src/lib/goc-hoc.ts`, từ `d41abf5`).
- **R7 (mới).** Trang công khai (trang chủ, `/courses/*`) dùng `apiFetchSessionOnly`; chỉ trang bài học dùng `apiFetch` (vì `apiFetch` gặp 401 sẽ tự tạo tài khoản khách).

### 2.4 Giả định và phụ thuộc
- Cần mạng để gọi API; bài học chạy Python **trong trình duyệt**, không cần máy chủ cho phần chạy này.
- IDE cần runner Docker (hoặc Docker cục bộ ở chế độ `local`).
- Phụ thuộc Neon (PostgreSQL serverless), có thể có độ trễ khởi động nguội.
- Gemini (Google) là tuỳ chọn cho chatbot/nhập bài tự động.

---

## 3. YÊU CẦU CHỨC NĂNG

### 3.1 Truy cập và danh tính

| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| FR-AUTH-01 | Người dùng mở trang học mà chưa có phiên thì hệ thống tự cấp tài khoản khách (`POST /auth/guest`) và ghi danh khoá | ✅ |
| FR-AUTH-02 | Phiên giữ bằng access token 30 phút và refresh token (cookie `httpOnly`), refresh **xoay vòng**, cửa sổ hạn **trượt 8 giờ** | ✅ |
| FR-AUTH-03 | Phát hiện dùng lại refresh token đã xoay (theo `family_id`) | ✅ |
| FR-AUTH-04 | Trang công khai **không** được tự sinh tài khoản khách; chỉ trang bài học được tạo khách | ✅ (qua `apiFetchSessionOnly`) |
| FR-AUTH-05 | Đăng ký/đăng nhập email/điện thoại, Google, Facebook, đổi mật khẩu thu hồi mọi phiên | 🟡 API có và có kiểm thử; **không có trang đăng nhập/đăng ký** |
| FR-AUTH-06 | Tắt tài khoản khách bằng cấu hình `GUEST_LOGIN=off` | ✅ |
| FR-AUTH-07 | Dọn tài khoản khách không hoạt động (không `lesson_progress`, quá N ngày), có chế độ chạy thử | 🔧 B8 |
| FR-AUTH-08 | **Hai domain:** `ALLOWED_ORIGINS` (không wildcard), `FRONTEND_URL`, `REFRESH_COOKIE_SAMESITE`; `none` chỉ dùng với HTTPS vì cookie cần `Secure` | 🔧 B3 |
| FR-AUTH-09 | `/auth/refresh` trả **hạn phiên** trong body; frontend đọc hạn từ đó thay cho bốn chỗ ghi cứng `max-age=28800` | 🔧 B2 + T3 |
| FR-AUTH-11 🆕 | **Nâng cấp tài khoản khách:** khách gắn email + mật khẩu vào chính hàng `users` của mình (giữ `id`, tiến độ, XP); mật khẩu băm theo định dạng Werkzeug (R2); có trang đăng nhập/đăng ký để quay lại từ máy khác. Hiện 68/73 người dùng trong DB là khách (mục 6.7): xoá dữ liệu trình duyệt là mất tiến độ | ⏸ Q6 → 🔧 B12, T11, G5 (đề xuất, chưa duyệt) |
| FR-AUTH-10 | Tên hiển thị của khách: backend nhận, lưu, trả ra; có giới hạn độ dài, chuẩn hoá Unicode, lọc từ tục, thoát HTML. Hiện tên mặc định `Khách XXXX` (4 ký tự UUID) nên bảng Xếp hạng toàn dòng giống nhau; frontend chỉ lưu tên ở `localStorage` | ⏸ Q2 → 🔧 D5, B5, T5 |

### 3.2 Trang chủ và điều hướng

| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| FR-NAV-01 | Trang `/` là **Góc học**: một cảnh phòng học với 39 vật cắt rời, 28 vùng bấm, **48 cuốn sách đúng tên bài** trên các kệ, sáu màn mở được, mỗi lần mở/đóng màn là một mục `history` (nút Back hoạt động) | ✅ (`d41abf5`, theo mô tả commit; chưa chạy lại) |
| FR-NAV-02 | Giáo trình trong Góc học đọc **tĩnh** từ `curricula.json` ở component server: khách chưa đăng nhập thấy đủ 8 học phần, 48 bài, **không gọi mạng** | ✅ |
| FR-NAV-03 | Số của người học (XP, bài đã xong, hạng) chỉ tải khi máy **đã có phiên**, qua `apiFetchSessionOnly`; không phiên thì hiện "—" | ✅ |
| FR-NAV-04 | Trang `/dashboard`: dashboard Figma giữ lại để đối chiếu hai bản | ⚠️ chờ quyết định giữ/bỏ (Q1) |
| FR-NAV-05 | Trang khoá `/courses/[courseId]`: mục lục chặng/bài từ file giáo trình tĩnh, nút Bắt đầu/Tiếp tục theo tiến độ, nút góp ý; thời lượng khoá **"~29 giờ"** khớp tổng phút của 48 bài | ✅ (mục lục **không** lấy từ cơ sở dữ liệu) |
| FR-NAV-06 | Trang `/demo-minigame`: bản demo mini-game dữ liệu viết cứng | ⚠️ `AGENTS.md` ghi 5 ca kiểm thử trượt sẵn từ `cd206ad` (số đo 19/10); 🔧 T2 |
| FR-NAV-07 | Trang thẻ khái niệm `/card/[id]` và 3 trang khoá CSDL `/courses/db_design*` còn trong mã, không có trong danh mục | ⚠️ truy cập được bằng URL trực tiếp; 🔧 T9 (dọn) |
| FR-NAV-08 | Ô cửa sổ phải **nhất quán giờ trong ngày**: lớp trời chạy theo đồng hồ máy nhưng bức thành phố phía sau cố định hoàng hôn, nên hầu hết giờ hai lớp "cãi nhau" | ❌ theo artifact, chưa kiểm trên mã; 🔧 G1 |
| FR-NAV-09 | Chữ dọc trên gáy sách đạt tương phản ≥ 4,5:1 (artifact: 20/48 cuốn có nguy cơ trượt) | ❌ theo artifact, chưa đo; 🔧 G4 |
| FR-NAV-10 | HTML từ server của trang chủ chứa điều hướng chính để công cụ tìm kiếm đọc được | ⚠️ artifact nói gần như trống; `d41abf5` nay đọc giáo trình ở server — **cần đo lại**; 🔧 T7 |
| FR-NAV-11 | Phím `Escape` không bị engine bắt trên toàn trang (không tranh với hộp thoại React) | ⚠️ theo artifact; 🔧 T4 |
| FR-NAV-12 | Cảnh phải nhẹ: artifact ghi ~2,2 MB trên 102 tệp, 56 thẻ `<img>` tạo lúc khởi động | ⚠️ theo artifact; 🔧 T7 |
| FR-NAV-13 | Lịch tường hiện **những ngày đã học** | ❌ API chỉ trả số `streak`; chờ FR-STAT-01 |
| FR-NAV-14 | Nhạc lofi: nút có, **chưa có âm thanh** | ❌ (có chủ ý) |
| FR-NAV-15 | Mô hình kệ ↔ học phần: cảnh có 3 kệ (`shelfKey`: `book`, `pb`, `tb`, hoặc `null` = chỉ hiện ở trang Khoá học) trong khi khoá có 8 chặng/48 bài. Cần chốt mỗi cuốn sách là **một bài** hay **một học phần** — đổi thì phải vẽ lại vùng bấm | ⏸ quyết định thiết kế; 🔧 G1 |
| FR-NAV-16 | Code visualizer (bước từng dòng, biến, call stack) từ commit `9f2ac92`: kiểm xem có trên `test` không trước khi dựng lại | ⚠️ `9f2ac92` có trong kho; chưa xác nhận đã nằm trên `test`; 🔧 T6 |

### 3.3 Học bài (Python Studio)

| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| FR-LES-01 | Bài render hoàn toàn từ `lessons.content_json`; mỗi bài chia thành các **màn** | ✅ |
| FR-LES-02 | 16 loại màn: `brief, theory, context, explain, memory, misconception, predict, mcq, classify, selfExplain, scaffold, trace, counter, sandbox, recap, game` | ✅ |
| FR-LES-03 | 8 loại mini-game: `traceTable, match, trueFalse, fill, parsons, spotError, debug, selfExplain` | ✅ |
| FR-LES-03b | Game "Sổ quỹ chung" ở bài T05 (`soQuy`) | ⚠️ commit `93d96e6`, `b3dcd2b`, `d04c008` nằm trên `main`, **không nằm trong tổ tiên của `origin/test`** — cần xác nhận ở Q4 |
| FR-LES-04 | Khung bài: thanh tiến độ chia đoạn bấm được, một nút hành động chính, gợi ý 3 tầng, nút "Màn trước", màn đã xong vẫn đi tiếp được | ⚠️ commit `8d2309e` (nút "Màn trước") nằm trên `main`; xác nhận ở Q4 |
| FR-LES-05 | Màn lắp khung mã: **hai bản không tương thích**: "sách mở" theo Figma (`test`) và ①②③ + gợi ý theo ô (`main`/`chiem-tinh`, hàm `bankGroups`). Cần **một** bản hợp nhất | ⏸ Q3 → 🔧 G2, T8 |
| FR-LES-05b | **149 gợi ý ô trống** đã ghi vào `slots[].hint`, nhưng chỉ bản ①②③ mới vẽ ra | ⏸ Q3 |
| FR-LES-06 | Màn viết code: chạy Python trong trình duyệt (Pyodide, Web Worker), giới hạn **5 giây**, có nút dừng; chấm bằng ca kiểm thử | ✅ |
| FR-LES-07 | Bài cần thư viện (numpy, pandas, matplotlib, sqlite3) chỉ tải gói cho bài khai `step_4.packages`; gói nằm cùng origin | ✅ |
| FR-LES-08 | Bản nháp tiến độ các màn lưu trong `localStorage` (mỗi máy một bản) | ✅ — không đồng bộ giữa các máy |
| FR-LES-09 | Hoàn thành bài gọi `POST /lessons/:n/complete`; lời giải bài cửa chỉ mở khi bài được ghi nhận hoàn thành | ✅ |
| FR-LES-10 | Hình lý thuyết động (23 SVG cho 20 bài đầu), tôn trọng chế độ giảm chuyển động | ✅ |
| FR-LES-11 | Nút "Thử ngay trong IDE" gửi mã chạy được sang `/ide` | ✅ |
| FR-LES-12 | Ba bài cửa dùng nhãn **"Tổng hợp"**, không dùng "BOSS" | ✅ trên `origin/test` (không còn chuỗi "BOSS" trong `out-advanced/lessons`); artifact nói `main` còn — cần kiểm lại khi gộp |

### 3.4 Hoàn thành bài, điểm và tiến độ

| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| FR-PRG-01 | Chỉ ghi nhận khi người dùng đã ghi danh khoá và số bài nằm trong `[1, số bài của khoá]` | ✅ |
| FR-PRG-02 | XP do **máy chủ** quyết theo `lessons.xp_reward` (mặc định 50, trần 500); khoá Advanced: `XP = xp_reward × (50% + 50% × quizScore)` | ✅ |
| FR-PRG-03 | Chỉ cộng XP/gems ở lần hoàn thành **đầu tiên**; thao tác nguyên tử, bấm đúp không cộng hai lần | ✅ |
| FR-PRG-04 | Tính lại `enrollments.progress` và `completed_lessons`; trao thành tích sau khi giao dịch đã commit | ✅ (nhưng bảng `achievements` rỗng — xem FR-ACH-01) |
| FR-PRG-05 | Ghi `gems` và nhật ký XP theo ngày (`user_daily_xp_logs`) | ⚠️ ghi nhưng chỉ Xếp hạng/Góc học đọc một phần; **chuỗi ngày (`streak`) không còn hiển thị** |
| FR-PRG-06 | Máy chủ **tin** `quizScore` do trình duyệt gửi; không phải hệ thống chống gian lận | ⚠️ ràng buộc đã biết |
| FR-PRG-07 | Thêm/xoá bài làm tiến độ học viên được tính lại; xoá bài giữa khoá dồn lại thứ tự | ❌ (xem mục 8) |

### 3.5 Thành tích, xếp hạng và thống kê (mục mới)

| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| FR-ACH-01 | Danh mục **~24 thành tích** (code, tên, mô tả, icon, `condition_type`, `condition_value`, **bậc đồng/bạc/vàng**) được seed idempotent; hoàn thành bài/chặng thì trao đúng một lần | ⏸ Q2 → 🔧 D4 (cột `tier`), B7 (seed). Hiện **0 dòng mã** ghi vào bảng `achievements`; **đo 27/10: bảng có 0 dòng trên DB mới**. API trả `[]` kèm HTTP 200 nên màn Thành tựu rỗng vĩnh viễn, không lỗi, không log. Lưu ý `AchievementsService.getMetrics` vẫn có số liệu `streak_days` (backend còn tính chuỗi có chủ đích) — điều kiện thành tích mới **không** dùng nó (FR-ACH-03) |
| FR-ACH-02 | Màn Thành tựu trong Góc học hiển thị danh mục và trạng thái | ⚠️ màn có, danh mục rỗng; từng gây `TypeError` khi `#trophy` thiếu — đã sửa ở `d41abf5`; 🔧 T5 |
| FR-ACH-03 | Điều kiện thành tích dựa trên thứ có thật (số bài, XP, hoàn thành chặng); **không** dựa vào chuỗi ngày | ⏸ Q2 |
| FR-ACH-04 | Hệ huy hiệu thứ hai (`Badge`/`UserBadge`): 0 lời gọi trong `src/`. **Không xoá** (R1), chỉ ghi chú deprecated hoặc gộp | 🔧 D6 |
| FR-RNK-01 | Màn **Hồ sơ · Xếp hạng** (vật "điện thoại") đọc `/api/leaderboard` theo XP; thiếu phiên thì hiện trạng thái trống có giải thích | ⚠️ có; mâu thuẫn R5 cũ (Q2) |
| FR-STAT-01 | Endpoint trả **tập ngày có học** (từ `user_daily_xp_logs`, theo múi giờ Việt Nam) để vẽ lịch tiến độ; **không** tính chuỗi | ⏸ Q2 → 🔧 B6 |

### 3.6 Ôn tập

| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| FR-REV-01 | Sinh đề ôn từ kho câu trắc nghiệm `step_2.mcq` của các bài đã học, **trọng số `1 + tỉ lệ sai`** | ✅ |
| FR-REV-02 | Đề 5–10 câu; cần tối thiểu 5 câu trong kho (thực tế phải xong **2 bài**, vì mỗi bài chỉ có 3 câu) | ✅ |
| FR-REV-03 | Nộp đề một lần duy nhất (lần hai trả 409); máy chủ chấm cả đề, trả đáp án và giải thích | ✅ |
| FR-REV-04 | Lịch sử làm bài theo khoá | ✅ |
| FR-REV-05 | "Thử thách ôn" (`/practice/challenge`): chốt từng câu, sai lần đầu được nghĩ lại một lần; **chỉ điểm lượt nộp chính thức được lưu**; không đồng hồ, không chuỗi ngày | ✅ |
| FR-REV-06 | Đáp án không được lộ ở lần sai đầu; **đáp án đúng không luôn đứng đầu** danh sách lựa chọn (`7b746bf`); lý do của "bẫy" không phát đáp án ô đó (`f3363e6`, có `trap-leak.test.mjs`) | ✅ `7b746bf` trên `test`; ⚠️ `f3363e6` chỉ trên `main` (Q4) |
| FR-REV-07 | Đề ôn hằng ngày, mở khoá theo 5 bài/ngày | 🟡 API có, **không giao diện** |

### 3.7 Bàn thí nghiệm (IDE)

| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| FR-IDE-01 | Soạn Python bằng Monaco (tự lưu trữ), có phương án dự phòng ô gõ thường khi không nạp được | ✅ |
| FR-IDE-02 | Chọn ví dụ có sẵn; chạy bằng nút hoặc `Ctrl+Enter` | ✅ |
| FR-IDE-03 | Mã chạy trên **máy chủ** (`POST /python/run`): không mạng, hệ tệp chỉ đọc, 1 CPU, RAM theo cấu hình (mặc định 512 MB), 128 tiến trình, bỏ mọi capability, người dùng không phải root | ✅ |
| FR-IDE-04 | Giới hạn mã 20 KB; thời gian chạy mặc định 10 giây (cấu hình 1–60 giây); đồng thời mặc định 2; hàng đợi mặc định 50 | ✅ |
| FR-IDE-05 | "Xem từng bước" (`POST /python/trace`): ghi vết toàn bộ rồi phát lại — biến, call stack, đầu ra tới bước đó, có chuyển động | ✅ |
| FR-IDE-06 | Không hỗ trợ `input()` ở chế độ xem từng bước | ✅ (nêu trên giao diện) |
| FR-IDE-07 | Lỗi hạ tầng (runner tắt/quá tải) hiện thông báo thân thiện, giữ chi tiết kỹ thuật gập lại | ✅ |
| FR-IDE-08 | Có thể ẩn công cụ bằng `NEXT_PUBLIC_IDE_ENABLED=off` | ✅ |

### 3.8 Quản trị nội dung (chỉ phía máy chủ)

| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| FR-ADM-01 | CRUD khoá học; chặn xoá khi còn học viên ghi danh | 🟡 `/admin/courses` |
| FR-ADM-02 | CRUD bài; tự đồng bộ số bài của khoá (bài lưu trữ có thứ tự ≥ 1000 không tính) | 🟡 `/admin/lessons` |
| FR-ADM-03 | Nhập bài từ `.md`/`.pdf`: đường theo mẫu (không cần mạng) hoặc nhờ Gemini; chỉ trả **bản nháp**, không ghi cơ sở dữ liệu; PDF scan bị từ chối; tối đa 8 MB / 60.000 ký tự | 🟡 `POST /admin/lessons/import`; chất lượng bản nháp Gemini chưa đo (🔧 M1) |
| FR-ADM-04 | Cập nhật nội dung bài **không xoá tiến độ**: `update-lesson-content.ts` (mặc định chạy thử, `--apply` bắt buộc kèm sao lưu). `seed-python-advanced-v4.ts --apply` chỉ khi khoá còn trống | ✅ dòng lệnh; 🔧 D3 (viết quy trình) |
| FR-ADM-05 | Giao diện quản trị | ❌ không còn |
| FR-ADM-06 | Kiểm tra cấu trúc `studio-lesson` khi lưu bài tay (dùng lại bộ kiểm của đường nhập) | 🔧 B9 |

### 3.9 Chức năng có phía máy chủ nhưng không có giao diện
Các nhóm sau còn đủ API, có kiểm thử riêng, nhưng **không có màn hình nào** gọi chúng (ngoại lệ: thành tích và xếp hạng nay có màn trong Góc học, xem 3.5):

| Nhóm | Nội dung |
|---|---|
| Diễn đàn | Bài viết, bình luận lồng nhau, 6 loại cảm xúc, nhắc tên, chống XSS |
| Thông báo | Danh sách, huy hiệu đếm, gộp thông báo cùng loại trong 10 phút, cài đặt |
| Lộ trình | Khảo sát → lộ trình mẫu, lưu lộ trình cá nhân, đánh dấu nút; "lộ trình bằng AI" chỉ là chỗ giữ chỗ (trả 402) — 🔧 M3 (đặc tả) |
| Thống kê | XP theo khoá, nhiệm vụ |
| Chatbot (Gemini) | Hỏi đáp có ảnh; 60 lượt/giờ/IP; thiếu khoá API thì trả 503. **Cần cờ tắt mặc định** khi không có giao diện — 🔧 B4; bộ thử chống lộ lời giải bài cửa — 🔧 M2 |
| Người dùng | Hồ sơ, đổi mật khẩu, theo dõi người khác |

---

### 3.10 Đồng bộ khoá học giữa DB, giáo trình tĩnh và catalog 🆕

Một khoá được mô tả ở **ba nơi** phải khớp nhau: DB (`courses`, `lessons`), giáo trình tĩnh (`frontend/src/lib/curricula.json` + `LESSON_META`) và catalog (`frontend/src/lib/catalog.ts`). Trang khoá học, Góc học và dashboard đọc hai nơi sau; trang bài học đọc nơi đầu và tra theo `(course_id, sort_order)`. Ngày 27/10 ba nơi **không khớp** (mục 6.7).

| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| FR-CUR-01 | Với mỗi khoá đang `is_published`, số bài và `lesson_code` theo thứ tự trong DB phải bằng giáo trình tĩnh. Có script so (D6c) và CI đỏ khi lệch | ❌ chưa có script; DB 172 bài ≠ giáo trình 48 bài. 🔧 D6, D8 |
| FR-CUR-02 | Khoá "Python cho Data Analyst" (172 bài, 10 chặng, `scripts/pe-da/`) có chỗ đứng rõ ràng: khoá riêng với `course_id` riêng, hoặc thay khoá cũ. Quyết định ở Q5 | ⏸ Q5 → 🔧 D8, B11, T10 |
| FR-CUR-03 | Bộ dựng `pe-da` có đủ các bước như `pe-v4`: dựng → kiểm cấu trúc (`validateStudioLesson`) → chấm thử bằng Pyodide → chép sang `curricula.json` → seed an toàn. Hiện chỉ có `build.py` và `check-pyodide.mjs`, **không có bước sync và không có script seed** | ⏸ Q5 → 🔧 B11, T10 |
| FR-CUR-04 | Nạp nội dung vào DB **không xoá tiến độ** học viên đã có. `update-lesson-content.ts` đòi `lesson_code` trùng gói; khác bộ mã (`PY01…` so với `P01…`) thì đường này **không dùng được** và phải có quyết định sao lưu/đặt lại tiến độ | ⏸ Q5 → 🔧 D8 |
| FR-CUR-05 | Sau khi đồng bộ, mọi người dùng cũ có ghi danh/tiến độ trỏ vào bài đã đổi nội dung phải được xử lý có chủ đích (giữ, đặt lại, hoặc ghi chú) — không để `lesson_progress` trỏ vào bài khác nghĩa. DB hiện có 55 ghi danh, 16 dòng tiến độ (mục 6.7) | ⏸ Q5 → 🔧 D8 |

---

## 4. GIAO DIỆN NGOÀI

### 4.1 Giao diện người dùng
- Web tiếng Việt (`lang="vi"`), sáng/tối, đáp ứng màn hẹp.
- Hệ thiết kế v2: nền kem/xanh theo token `--ds-*`; cỡ chữ không dưới 15 px, câu người học phải đọc ≥ 17 px; vùng bấm ≥ 44 px; không opacity để làm nhạt chữ; giảm chuyển động theo `prefers-reduced-motion`.
- Các route hiện có trên `origin/test`: `/` (Góc học), `/dashboard`, `/courses/[courseId]`, `/lesson/python_advanced`, `/practice`, `/practice/challenge`, `/ide`, `/demo-minigame`, `/card/[cardId]`, `/courses/db_design{,_tc,_nc}`.

### 4.2 Giao diện phần cứng
Không có.

### 4.3 Giao diện phần mềm
| Thành phần | Giao thức |
|---|---|
| Trình duyệt ↔ Backend | HTTPS, JSON, `Authorization: Bearer`, cookie refresh `httpOnly` (hai domain: xem FR-AUTH-08) |
| Backend ↔ PostgreSQL | Prisma (adapter Neon); `DATABASE_URL` (pooled) và `DIRECT_URL` (cho Prisma CLI, **không** được trỏ vào host pooler) |
| Backend ↔ Runner | HTTPS + Bearer (`RUNNER_URL`, `RUNNER_SECRET` ≥ 32 ký tự); hoặc chạy Docker cục bộ (`PY_RUNNER_MODE=local`) |
| Backend ↔ Gemini | REST (tuỳ chọn) |
| Backend ↔ Google/Facebook | OAuth 2 (có mã, không có giao diện gọi) |

### 4.4 Các nhóm API (tiền tố do gateway quyết định)
| Nhóm | Điểm cuối chính |
|---|---|
| Auth | `POST /auth/guest, /refresh, /logout, /login, /register`; `GET /auth/google, /facebook` + callback |
| Khoá/bài | `GET /enrolled`, `/courses`, `POST/DELETE /courses/:id/enroll`, `GET /courses/:id/lessons/:n/content`, `POST /lessons/:n/complete` |
| Quiz | `POST /courses/:id/quiz/generate-review`, `POST /quizzes/:id/submit`, `GET /quizzes/:id`, `/courses/:id/quiz/history` |
| IDE | `POST /python/run`, `POST /python/trace` |
| Người dùng | `GET /user` (+ cần: nhận `display_name`, FR-AUTH-10) |
| Xếp hạng/thành tích | `GET /leaderboard`, thành tích (danh mục rỗng, FR-ACH-01) |
| Thống kê | (+ cần: ngày đã học, FR-STAT-01) |
| Sức khoẻ | `GET /health`, `GET /health/ready` (503 khi cơ sở dữ liệu chết) |
| Quản trị | `/admin/courses`, `/admin/lessons`, `/admin/lessons/import` |

Tổng khoảng 79 điểm cuối khai báo trong mã (đếm khai báo ở bản 1.0, chưa chạy lại).

---

## 5. YÊU CẦU PHI CHỨC NĂNG

### 5.1 Hiệu năng
| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| NFR-PERF-01 | Từ chối sớm khi quá tải (từng đo qua load-test 10.000 lượt đăng nhập) | ✅ |
| NFR-PERF-02 | Giao dịch cơ sở dữ liệu có thời gian chờ 20 giây vì Neon ở xa (~237 ms/lượt truy vấn từng đo) | ✅ |
| NFR-PERF-03 | Pyodide nạp một lần và giữ lại giữa các lần chạy; tải trước khi mở màn viết code | ✅ |
| NFR-PERF-04 | Runner xử lý tối đa `PY_RUN_MAX_CONCURRENT` bài đồng thời (mặc định 2) | ⚠️ chưa đo với tải lớp học (~40 người) |
| NFR-PERF-05 | Trang chủ: giảm dung lượng ảnh có **đo trước/sau** (sprite hoặc hạ độ phân giải; `loading="lazy"` một mình không đủ vì ảnh nằm trong khung ngay từ đầu) | ⚠️ 🔧 T7 |

### 5.2 Bảo mật
| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| NFR-SEC-01 | Giới hạn tần suất 2 tầng theo IP (1000/giờ, 10000/ngày) + quota riêng: đăng nhập 20/phút, đăng ký 10/phút, khách 120/giờ, chạy mã 10/phút, ghi vết 10/phút | ✅ (tính theo IP) |
| NFR-SEC-02 | Ứng dụng từ chối khởi động nếu tắt giới hạn tần suất ở production hoặc thiếu biến bắt buộc (`JWT_ACCESS_SECRET` ≥ 32 ký tự…) | ✅ |
| NFR-SEC-03 | Header bảo mật, CORS tự quản, CSP; **tắt `x-powered-by`** (có `http-app.setup.spec.ts`) | ⚠️ còn `style-src 'unsafe-inline'` (JS cũ + ~257 chỗ `style={{…}}`); `x-powered-by` ✅ |
| NFR-SEC-04 | Mã người học chạy cách ly (FR-IDE-03) | ✅ |
| NFR-SEC-05 | Đáp án quiz không lộ trước khi nộp; lời giải bài cửa giữ tới khi hoàn thành | ✅ |
| NFR-SEC-06 | Nội dung bài (kèm ca kiểm thử, lời giải) gửi về trình duyệt; chấm ở trình duyệt | ⚠️ không chống gian lận |
| NFR-SEC-07 | Access token lưu `localStorage` | ⚠️ rủi ro nếu có XSS |
| NFR-SEC-08 | **Sáu bản vá bảo mật** có mặt trên nhánh deploy, mỗi bản có test bắt được lỗi: `d0cfeb2` (quiz gửi đáp án về trình duyệt), `143bfc9` (login CSRF; lộ lời giải bài cửa), `ebf51dd` (XSS lưu qua tên người dùng ở nút "Trả lời"), `2c51723` (mật khẩu tài khoản test trong repo công khai), `7b746bf` (đáp án đúng luôn đứng đầu), `39e0b2c` (bỏ qua cờ `is_published`) | ✅ cả sáu là tổ tiên của `origin/test` (đã kiểm bằng `git merge-base --is-ancestor`); 🔧 B1 kiểm test từng cái. Mật khẩu test cũ **còn trong lịch sử git** — cần đổi ở nơi khác nếu từng dùng |
| NFR-SEC-09 | Tên hiển thị do client gửi nên phải được kiểm ở backend và thoát khi in ra HTML (FR-AUTH-10) | ⏸ Q2 → 🔧 B5 |
| NFR-SEC-10 | API chatbot không mở mặc định cho khách khi không có giao diện | 🔧 B4 |

### 5.3 Độ tin cậy và vận hành
| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| NFR-REL-01 | Giao dịch nguyên tử cho hoàn thành bài; lỗi trao thành tích không làm mất XP | ✅ |
| NFR-REL-02 | `/health/ready` báo 503 khi cơ sở dữ liệu chết; DB chết không bị báo thành "phiên không hợp lệ" | ✅ |
| NFR-REL-03 | Bắt `unhandledRejection` và `uncaughtException`, log JSON, request-id | ✅ |
| NFR-REL-04 | Giám sát và cảnh báo tự động | ❌ |
| NFR-REL-05 | Hạn tài khoản khách là cửa sổ trượt 8 giờ; luật quyết ở `RefreshTokenService.issue()`; frontend **không** được ghi cứng hạn (FR-AUTH-09) | ⚠️ 🔧 B2, T3 |
| NFR-REL-06 | Khách không bị cấp tài khoản mới (mất tiến độ) khi access token hết hạn giữa hai domain | ⚠️ 🔧 B3 |

### 5.4 Khả năng bảo trì
| Mã | Yêu cầu | Hiện trạng |
|---|---|---|
| NFR-MNT-01 | **Mốc nền — hai dòng lịch sử, hai bộ số.** `origin/test` (`AGENTS.md`, đo 15–19/10): backend 35 bộ/390 ca đạt; lint backend 155 lỗi, trần CI 170; lint frontend 0 lỗi/118 cảnh báo; unit frontend 534 ca, 5 ca trượt có sẵn. `origin/main` (`AGENTS.md`, đo 22/10): lint backend 263 lỗi, trần 283; lint frontend 0 lỗi/178 cảnh báo; unit frontend 134 ca/12 tệp đạt. **Chưa số nào được đo lại cho bản SRS này; hai nhánh không so được với nhau cho tới khi D1 hoàn tất** | ⚠️ 🔧 D1 |
| NFR-MNT-02 | Giáo trình có kiểm tra: 48 bài, 427 ca chấm, 176 biến thể sai + 48 khung trống đều bị bắt | ✅ |
| NFR-MNT-03 | CI: backend (lint trần, typecheck, test), frontend, dựng lại giáo trình phải ra đúng thứ đã commit, hình lý thuyết | ✅ |
| NFR-MNT-04 | Bộ kiểm thử canh câu chữ, tương phản màu, chuyển động giảm, route mồ côi, route chết, thời lượng khoá, rò bẫy (`trap-leak`) | ✅ (một phần chỉ trên `main`) |
| NFR-MNT-05 | Chú thích tiếng Việt giải thích lý do; mỗi commit một việc; test phải trượt khi gỡ bản sửa; đổi số đo thì cập nhật bảng mốc nền **cùng commit** | ✅ (quy ước) |
| NFR-MNT-06 | CI chạy `e2e/unit/dashboard-plan.test.mjs` và `catalog-duration.test.mjs`: lệch giữa `curricula.json`, catalog và `pe-v4` thì đỏ | ⚠️ 🔧 T6 |
| NFR-MNT-07 | Trần lint backend chỉ được hạ; mỗi module dọn xong thì hạ trần cùng commit | 🔧 B10 |

### 5.5 Khả năng truy cập
Tương phản đo 63 cặp chữ/nền × 2 chế độ; vòng tiêu điểm phủ cả 16 loại màn; vùng kết quả chấm sống (`aria-live`); tên liên kết đọc được. Kéo-thả tự do chưa có cho mọi loại màn — luôn có phương án bấm chọn. **Cảnh Góc học chưa được kiểm a11y** (gáy sách, vùng bấm 28 chỗ, điều khiển bằng bàn phím) — 🔧 G4.

### 5.6 Tương thích
Trình duyệt hiện đại hỗ trợ WebAssembly và Web Worker. Node ≥ 22 để phát triển/vận hành. Windows dùng `py`, không dùng `python`.

---

## 6. MÔ HÌNH DỮ LIỆU

### 6.1 Tổng quan
PostgreSQL (Neon), **28 bảng**, 2 kiểu liệt kê (`course_level`, `quiz_status`), 3 mốc migration: khởi tạo; thêm `family_id` cho phiên; chỉ mục và ràng buộc duy nhất `(course_id, sort_order)`.

### 6.2 Bảng đang được giao diện hiện tại dùng (9)
| Bảng | Vai trò |
|---|---|
| `users` | Người dùng (cả khách); `xp, streak, gems`; `role` là chuỗi tự do |
| `auth_sessions` | Phiên refresh (băm SHA-256, `family_id`) |
| `courses` | Khoá học; `content_meta` (JSON) chứa tiêu đề phụ, ảnh, màu |
| `lessons` | Bài; `content_json` (JSONB, chỉ mục GIN); duy nhất `(course_id, sort_order)` |
| `enrollments` | Ghi danh, `progress`, `completed_lessons`; `time_spent` là chuỗi |
| `lesson_progress` | Tiến độ từng bài (khoá chính ghép `(user_id, lesson_id)`) |
| `user_daily_xp_logs` | XP theo ngày (chưa có ràng buộc duy nhất `(user_id, log_date)`) |
| `quizzes` | Đề ôn đã sinh |
| `review_quiz_results` | Kết quả nộp |

### 6.3 Bảng chỉ phía máy chủ dùng, không (hoặc ít) giao diện (14)
`posts, comments, post_reactions, comment_reactions, user_follows, notifications, notification_settings, surveys, roadmaps, roadmap_progress, missions, course_ratings, achievements, user_achievements`. Riêng `achievements`/`user_achievements` và `users.xp` nay có màn trong Góc học (3.5).

### 6.4 Bảng không có mã nào dùng (5)
`badges, user_badges, email_verifications, user_oauth_accounts, questionnaires`. **Không `DROP`** (R1): chỉ ghi chú deprecated trong `schema.prisma`.

### 6.5 Thay đổi dữ liệu theo kế hoạch (mọi migration chỉ THÊM)
| Mã | Thay đổi | Điều kiện | Người |
|---|---|---|---|
| DB-01 | Thêm `achievements.tier` (nullable hoặc có default) | Q2 | Nhân (D4) |
| DB-02 | Thêm `users.display_name` (nullable) + chỉ mục; nếu cần duy nhất thì dùng chỉ mục một phần (`WHERE display_name IS NOT NULL`) | Q2 | Nhân (D5) |
| DB-03 | Ràng buộc duy nhất `user_daily_xp_logs(user_id, log_date)` — **chỉ sau khi** kiểm không có dòng trùng và gộp nếu có | — | Nhân (D6a) |
| DB-04 | Script so DB với `curricula.json` (hai nguồn danh sách bài) chạy trong CI | — | Nhân (D6c) + Trí Thành (T6) |

### 6.6 Vấn đề cấu trúc đã biết
`lessons.module` là chuỗi (không có bảng chặng); `courses.lessons` là cột đếm đồng bộ bằng mã; chưa có trạng thái nháp/xuất bản hay lịch sử sửa bài; kiểu thời gian không đồng nhất ở một số bảng.

### 6.7 Số đo cơ sở dữ liệu đang cấu hình (27/10/2026) 🆕
Đo bằng truy vấn **chỉ đọc** và `prisma migrate status` trên DB mà `.env` đang trỏ tới: Neon, vùng `ap-southeast-1` (Singapore), database `neondb`. Không ghi gì. Chưa biết đây là DB thật hay DB thử (việc D2).

| Hạng mục | Kết quả đo |
|---|---|
| Migration | **3/3 đã áp** (`0_init`, `20261011000000_auth_session_family`, `20261012000000_critical_indexes_and_lesson_sort_unique`); `prisma migrate status`: "Database schema is up to date" |
| Bài trùng `(course_id, sort_order)` | **0** |
| `courses` | 4 khoá, đều `is_published = true`: `db_design` (20 bài), `db_design_tc` (21), `db_design_nc` (25), `python_advanced` (**172**) |
| Khoá `python_advanced` | Tiêu đề **"Python cho Data Analyst"**, phụ đề "172 bài: từ phép cộng đầu tiên tới phân tích dữ liệu"; 172 bài đều `studio-lesson/v2`; mã bài `PY01…`, `PD05…`, `RD05`; 10 chặng M1–M10; `sort_order` 1–172 |
| `users` | 73, trong đó **68 là khách** (`@guest.local`) |
| `enrollments` / `lesson_progress` / `user_daily_xp_logs` | 55 / 16 / 10. Tiến độ nằm ở bài `sort_order` 1, 2, 3 và 19 (7+5+3+1) |
| `achievements` | **0 dòng** (khớp FR-ACH-01) |
| `DIRECT_URL` | Vẫn dùng host `-pooler`; `prisma migrate status` chạy được nhưng `migrate deploy` qua pooler chưa kiểm, và tài liệu Neon khuyên dùng host trực tiếp |

**Điều số đo cho thấy (suy ra từ mã, chưa chạy thử trên trình duyệt):** trang `/courses/python_advanced` và Góc học liệt kê **48 bài** của Advanced Python từ `curricula.json`, nhưng khi bấm bài `n` thì `GET /courses/python_advanced/lessons/n/content` trả bài thứ `n` của khoá **Data Analyst** (ví dụ bài 1 là `PY01`, không phải `P01`). `LESSON_META` và `screen_keys()` (số màn, bài cửa `step_4.gate`) cũng tính theo 48 bài Advanced nên dashboard đếm "màn đã học" sai. Đo thêm: **0/172 bài trong DB có `step_4.gate = true`**, nên ba bài cửa R02, DA01, DA02 (`sort_order` 20, 47, 48) của Advanced Python **không còn cửa tự kiểm tra**: server không giữ lời giải của chúng. Đây là lý do Q5/D8 là P0.

---

## 7. NỘI DUNG GIÁO TRÌNH

| Hạng mục | Giá trị |
|---|---|
| Khoá | `python_advanced` — Advanced Python, mức nâng cao, 48 bài, 8 chặng |
| Chặng | M1 Tiến trình và subprocess (7 bài) · M2 Đa luồng (6) · M3 GUI Tkinter và dự án (kết thúc bằng R02) · M4 Nhập dữ liệu, SQL và tra cứu · M5 NumPy · M6 pandas · M7 Matplotlib · M8 Dự án DA (DA01, DA02) |
| Bài tổng hợp chặng | R02, DA01, DA02 (cờ `step_4.gate`) |
| Thời lượng | Tổng ≈ **28,8 giờ** (48 bài cộng lại); thẻ khoá ghi "~29 giờ" |
| Chấm | 427 ca kiểm thử; 176 biến thể sai và 48 khung trống phải bị bắt |
| Hình | 23 SVG động cho 20 bài đầu (M1–M3) |
| Nguồn | `scripts/pe-v4/` dựng ra `out-advanced/`; bước `sync_curricula.py` chép giáo trình và `LESSON_META` sang `frontend/src/lib/curricula.json` |
| Hạn chế đã biết | Process/thread trong trình duyệt chỉ **mô phỏng**; nghiệm thu thật cần Linux/WSL |

**Hai nguồn danh sách bài:** nội dung bài đọc từ cơ sở dữ liệu, còn mục lục trang khoá, dashboard và **Góc học** đọc file tĩnh. Sau mỗi lần nạp dữ liệu phải chạy `sync_curricula.py` và kiểm hai nguồn có lệch không. Danh sách màn do `screen_keys()` (Python) phải khớp từng khoá với `buildScreens()` (TS).

---

## 8. RỦI RO VÀ KHOẢNG TRỐNG (đã xếp ưu tiên)

P0 chặn việc khác hoặc có thể mất dữ liệu · P1 lỗi người dùng thấy · P2 giá trị · P3 dọn dẹp.

| # | Mức | Rủi ro | Xử lý |
|---|---|---|---|
| 1 | P0 | 🆕 **DB và mã nói hai khoá khác nhau.** `python_advanced` trong DB là "Python cho Data Analyst" 172 bài; mã, catalog và giáo trình tĩnh là Advanced Python 48 bài. Bấm bài `n` trên trang khoá hiện bài `n` của khoá kia; 3 bài cửa mất cờ cửa; dashboard đếm màn sai (mục 6.7) | Q5; D8, B11, T10 |
| 2 | P0 | **Hai dòng lịch sử `test`/`main` tách nhau** (nay 10 / 73 commit); số đo nền mỗi nhánh một kiểu; fix `f3363e6` và các mini-game chỉ có ở một bên | Q4; D1 |
| 3 | P0 | Chưa biết DB thật/thử. Đã đo: migration 3/3 đã áp, không bài trùng; còn thiếu: đây là DB thật hay thử, `DIRECT_URL` vẫn host pooler, máy dev trỏ thẳng DB có 73 người dùng thật | D2 |
| 4 | P0 | Nạp nhầm bằng `seed-python-advanced-v4.ts` khi đã có người học sẽ **xoá tiến độ** | D3 (quy trình), dùng `update-lesson-content.ts` |
| 5 | P1 | Tài khoản khách là danh tính duy nhất: mất khi xoá dữ liệu trình duyệt; bảng `users` phình vì không có tác vụ dọn; quota khách tính theo IP nên phòng máy chung NAT nhận 429 | B8, B3 |
| 6 | P1 | Hạn phiên 8 giờ ghi cứng ở 4 chỗ frontend; hai kho/hai domain không ai bắt lệch | B2 + T3 |
| 7 | P1 | Cửa sổ Góc học hai lớp thời gian mâu thuẫn; tương phản gáy sách | G1, G4 |
| 8 | P1 | Màn điền khung mã có hai bản không tương thích; 149 gợi ý chưa vẽ ra | Q3; G2, T8 |
| 9 | P2 | Luồng sửa bài chưa trọn: xoá bài giữa khoá không dồn thứ tự; thêm/xoá bài không tính lại tiến độ; lưu JSON sai không bị chặn; không còn giao diện quản trị | B9; còn lại ngoài đợt này |
| 10 | P2 | Nhiều tính năng phía máy chủ không có giao diện: tốn bảo trì, tăng bề mặt tấn công (chatbot vẫn mở cho khách nếu có khoá Gemini) | B4 |
| 11 | P2 | Màn Xếp hạng mâu thuẫn R5 cũ; thành tích rỗng; tên khách giống nhau | Q2; B5–B7 |
| 12 | P2 | Hiệu năng ảnh Góc học (~2,2 MB, 56 `<img>`); SEO trang chủ cần đo lại | T7 |
| 13 | P2 | Chấm bài ở trình duyệt: không chống gian lận (ràng buộc đã biết, không sửa trong đợt này) | — |
| 14 | P3 | JavaScript đời cũ ~34.600 dòng trong `public/static/js` (phục vụ trang CSDL/thẻ khái niệm đã rời danh mục) | T9 |
| 15 | P3 | 5 ca kiểm thử frontend trượt có sẵn (`/demo-minigame`); trần lint backend chưa hạ | T2, B10 |
| 16 | P3 | Hệ huy hiệu thứ hai (`Badge`/`UserBadge`) không dùng | D6b |
| 17 | P1 | 🆕 68/73 người dùng là khách: mất tiến độ khi xoá dữ liệu trình duyệt; không có đường quay lại bằng tài khoản thật | Q6; B12, T11, G5 |

---

## 9. TÍNH NĂNG ĐỊNH HƯỚNG — ARENA (CHƯA ĐẶC TẢ)

Chưa có yêu cầu nào được chốt. Điều cần biết trước khi đặc tả:
- Commit `e7c41c0` (15/10/2026) đã kết luận **không làm đối kháng người–người** vì: không đủ người để ghép cặp; trạng thái trận nằm trong RAM một tiến trình (mất khi triển khai lại); thứ hạng tiêu cực làm giảm động lực. Chế độ "Thử thách ôn" (FR-REV-05) được làm thay thế.
- Cảnh Góc học nay có **Xếp hạng theo XP** — đây là xếp hạng *bất đồng bộ* (đọc từ bảng), không phải đối kháng; Q2 phải quyết nó có hợp với hệ thiết kế v2 không.
- Hạ tầng hiện **chưa có**: kênh thời gian thực (WebSocket/SSE), kho trạng thái dùng chung (Redis/hàng đợi), kho đề không lộ đáp án; runner mặc định chỉ chạy 2 bài đồng thời.

---

## 10. PHỤ LỤC

### 10.1 Biến môi trường chính
`DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET` (≥ 32 ký tự), `JWT_ACCESS_EXPIRES` (30m), `JWT_REFRESH_EXPIRES` (8h), `FRONTEND_URL`, `ALLOWED_ORIGINS`, `REFRESH_COOKIE_SAMESITE` (`lax`/`none`), `GUEST_LOGIN`, `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL`, `FACEBOOK_*`, `GEMINI_API_KEY/MODEL/HOUR_LIMIT`, `PY_RUNNER_MODE` (`local`/`remote`), `RUNNER_URL`, `RUNNER_SECRET`, `PY_RUNNER_PUBLIC`, `PY_SANDBOX_IMAGE`, `PY_RUN_TIMEOUT_MS`, `PY_RUN_MAX_CONCURRENT`, `PY_RUN_QUEUE_MAX`, `PY_RUN_MEMORY`, `THROTTLE_*`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_IDE_ENABLED`.

### 10.2 Lệnh chính (theo `AGENTS.md`)
```bash
npm run typecheck && npx jest --ci                      # backend (không chạy song song với test frontend: tranh CPU)
cd frontend && npm run typecheck && npm run lint && npm run test:unit
npx eslint "{src,apps,libs,test}/**/*.ts" --ignore-pattern "src/generated/**"   # đo lint đúng lệnh CI (không dùng npm run lint: có --fix)
py scripts/pe-v4/build.py && py scripts/pe-v4/sync_curricula.py                 # giáo trình
node scripts/pe-v4/check-pyodide.mjs                                            # chấm thử 427 ca
npx ts-node scripts/update-lesson-content.ts --codes=P01 --offline              # nạp nội dung an toàn
git fetch --all && git rev-list --left-right --count origin/test...origin/main  # đo độ lệch hai nhánh
```

### 10.3 Những điều SRS này **không** khẳng định
- Chưa chạy lại typecheck, jest, lint, test frontend hay build cho `c817a03`; mọi số ở 5.4 là số ghi trong `AGENTS.md`.
- Số điểm cuối (~79) là đếm khai báo ở bản 1.0.
- Các mục gắn "theo artifact" (FR-NAV-08, 09, 11, 12, 15) **chưa được kiểm trên mã**; artifact mô tả một bản Góc học có thể khác `d41abf5`.
- Đã đo (27/10, chỉ đọc) trên DB trong `.env`: migration 3/3 đã áp, không bài trùng, DB chứa khoá Data Analyst 172 bài (mục 6.7). **Chưa xác nhận:** DB này là thật hay thử, DB của môi trường deploy (Render/Vercel) có giống không, hiệu năng Neon/Render/runner.
- Mục 6.7 và 3.10 là số đo một thời điểm (27/10/2026); ai đó nạp lại DB sau ngày này thì các con số đó đổi. Số đo ở mục 5.4 (lint, test) vẫn là số ghi trong `AGENTS.md`, chưa đo lại.
- Nhận định "trang khoá hiện bài sai" ở 6.7 suy ra từ mã (tra theo `(course_id, sort_order)`), **chưa mở trình duyệt để xác nhận**.
- Không khẳng định các commit trên `main` (mini-game Sổ quỹ chung, nút "Màn trước", ①②③) có hoặc không có trên nhánh sẽ deploy — đó là Q4.

---

## 11. PHÂN VIỆC VÀ TRUY VẾT

<!-- phan-viec:begin -->
Người: **Nhân** (DB, điều phối) · **Kiên** (BE) · **Nghĩa** (BE + ML) · **Trí Thành** (FE) · **Đức** (Figma + FE). Chi tiết mô tả, kết quả cần đạt, gợi ý: `PHAN-VIEC-NHOM.pdf` (bản 27/10, dựng từ `scripts/docs/phan-viec-tasks.json`). Thời hạn: **1 tháng, 27/10 – 22/11/2026**, dự phòng 23–26/11.

| Mã | Việc | Người | Mức | Tuần | Ngày làm | Yêu cầu liên quan | Trạng thái |
|---|---|---|---|---|---|---|---|
| D1 | Gộp test và main, đo lại mốc nền | Nhân | P0 | Tuần 1–2 | 27–29/10 (nhóm a), 2/11 (nhóm b, c), 8/11 (đo lại mốc nền) | Q4, NFR-MNT-01 | Làm ngay |
| D2 | Xác nhận môi trường thật (DB nào là thật, DIRECT_URL, migration) | Nhân | P0 | Tuần 1 | 30/10 | Rủi ro 3 | Làm ngay (đã đo một phần 27/10) |
| D3 | Sao lưu trước mọi thay đổi và viết quy trình nạp nội dung | Nhân | P1 | Tuần 2 | 2/11 | FR-ADM-04 | Làm ngay |
| D4 | Migration: cột tier cho achievements | Nhân | P1 | Tuần 2 | 6/11 (nếu Q2 cho phép) | FR-ACH-01, DB-01 | ⏸ Q2 |
| D5 | Migration: display_name cho users | Nhân | P2 | Tuần 2 | 6–7/11 (nếu Q2 cho phép) | FR-AUTH-10, DB-02 | ⏸ Q2 |
| D6 | Rà bảng dữ liệu thừa và ràng buộc thiếu | Nhân | P2 | Tuần 3 | 9–11/11 | DB-03, FR-ACH-04, DB-04, FR-CUR-01 | Làm ngay |
| D8 | Đồng bộ khoá học trong DB với giáo trình đã chốt (Q5) | Nhân | P0 | Tuần 2 | 3–5/11 (sau khi Q5 chốt 31/10) | FR-CUR-01..05, Rủi ro 1 | ⏸ Q5 |
| B1 | Kiểm test cho 6 bản vá bảo mật | Kiên | P0 | Tuần 1 | 27–28/10 | NFR-SEC-08 | Làm ngay |
| B2 | /auth/refresh trả hạn phiên | Kiên | P1 | Tuần 1 | 29–30/10 | FR-AUTH-09 | Làm ngay |
| B3 | Cấu hình hai domain (frontend và backend tách) | Kiên | P1 | Tuần 1–2 | 31/10, 2–3/11 | FR-AUTH-08, NFR-REL-06 | Làm ngay |
| B4 | Giới hạn chatbot cho khách khi không có giao diện | Kiên | P2 | Tuần 2 | 4/11 | NFR-SEC-10 | Làm ngay |
| B5 | Tên hiển thị cho khách | Kiên | P2 | Tuần 3 | 9–10/11 (cần D5) | FR-AUTH-10 | ⏸ Q2, cần D5 |
| B6 | Endpoint ngày đã học | Kiên | P2 | Tuần 3 | 11/11 (nếu Q2 cho phép) | FR-STAT-01 | ⏸ Q2 |
| B7 | Thành tích: seed 24 định nghĩa và trao thành tích | Nghĩa | P2 | Tuần 3 | 9–11/11 (cần D4) | FR-ACH-01 | ⏸ Q2, cần D4 |
| B8 | Dọn tài khoản khách không hoạt động | Nghĩa | P1 | Tuần 1 | 27–28/10 | FR-AUTH-07 | Làm ngay |
| B9 | Kiểm tra cấu trúc studio-lesson khi lưu bài | Nghĩa | P2 | Tuần 1–2 | 1–2/11 | FR-ADM-06 | Làm ngay |
| B10 | Hạ trần lint backend | Nghĩa | P3 | Tuần 3–4 | 13–14/11, 18/11 | NFR-MNT-07 | Rải rác |
| B11 | Nạp khoá Data Analyst bằng đường an toàn | Nghĩa | P1 | Tuần 2 | 3–6/11 (sau khi Q5 chốt) | FR-CUR-02, FR-CUR-03 | ⏸ Q5 |
| B12 | Nâng cấp tài khoản khách thành tài khoản thật | Kiên | P2 | Tuần 2 | 5–8/11 (nếu Q6 cho phép) | FR-AUTH-11, Rủi ro 17 | ⏸ Q6 (đề xuất) |
| M1 | Đo chất lượng nhập bài tự động bằng Gemini | Nghĩa | P2 | Tuần 1 | 29–31/10 | FR-ADM-03 | Cần xác nhận phạm vi ML |
| M2 | Chatbot gia sư không làm lộ lời giải bài cửa | Nghĩa | P2 | Tuần 2 | 7–8/11 | 3.9, NFR-SEC-10 | Cần xác nhận phạm vi ML |
| M3 | Lộ trình cá nhân (thay chỗ giữ chỗ 402) | Nghĩa | P3 | Tuần 3 | 12/11 | 3.9 | ⏸ Q2 |
| M4 | Gợi ý ôn tập dựa trên tỉ lệ sai | Nghĩa | P3 | Tuần 4 | 16–17/11 | FR-REV-01 | Cần xác nhận phạm vi ML |
| T1 | Kiểm seed khoá học khớp “~29 giờ” | Trí Thành | P1 | Tuần 1 | 27/10 | FR-NAV-05 | ✅ sửa xong ở c817a03; còn kiểm seed-courses.js |
| T2 | Xử lý 5 ca test /demo-minigame trượt sẵn | Trí Thành | P1 | Tuần 1 | 28–29/10 | FR-NAV-06 | Làm ngay |
| T3 | Bỏ 4 chỗ ghi cứng hạn phiên 8 giờ | Trí Thành | P1 | Tuần 2 | 2/11 (sau khi B2 xong) | FR-AUTH-09 | Chờ B2 |
| T4 | Phím Escape bị bắt toàn trang | Trí Thành | P2 | Tuần 2 | 3/11 | FR-NAV-11 | Làm ngay (kiểm trước) |
| T5 | Tên hiển thị và màn Thành tựu | Trí Thành | P2 | Tuần 3–4 | 12–14/11, 16–17/11 (cần G3, B5, B7) | FR-AUTH-10, FR-ACH-02 | ⏸ Q2, cần G3, B5, B7 |
| T6 | Nối test vào CI và kiểm code visualizer | Trí Thành | P2 | Tuần 1, 4 | 30–31/10 (nối test), 20/11 (nối script D6c) | NFR-MNT-06, FR-NAV-16 | Làm ngay |
| T7 | Hiệu năng ảnh và SEO của trang chủ Góc học | Trí Thành | P2 | Tuần 3 | 9–11/11 | FR-NAV-10, 12, NFR-PERF-05 | Làm ngay |
| T8 | Làm màn lắp khung mã đã hợp nhất | Đức (có Trí Thành duyệt) | P1 | Tuần 3–4 | 9–13/11, hoàn thiện 16–17/11 (cần G2, D1) | FR-LES-05 | ⏸ Q3, cần G2 |
| T9 | Dọn route mồ côi và JS đời cũ | Trí Thành | P3 | Tuần 4 | 20–24/11, khi còn thời gian | FR-NAV-07, Rủi ro 14 | Khi rảnh |
| T10 | Nối khoá Data Analyst vào giao diện | Trí Thành | P1 | Tuần 2 | 4–8/11 (sau Q5 và D8) | FR-CUR-02, FR-CUR-03 | ⏸ Q5, cần D8 |
| T11 | Trang đăng nhập và nâng cấp tài khoản khách | Trí Thành | P2 | Tuần 4 | 18–19/11 (nếu Q6 cho phép) | FR-AUTH-11 | ⏸ Q6, cần B12, G5 |
| G1 | Sửa cửa sổ hai thời điểm và chốt mô hình kệ sách | Đức | P1 | Tuần 1–2 | 28–30/10 (cửa sổ), 4–5/11 (mô hình kệ) | FR-NAV-08, 15 | Làm ngay |
| G2 | Chốt thiết kế màn lắp khung mã | Đức | P1 | Tuần 2 | 31/10 (nháp), 2–3/11 | FR-LES-05 | ⏸ Q3 |
| G3 | Thiết kế đổi tên hiển thị và màn thành tích | Đức | P2 | Tuần 2 | 6–7/11 (nếu Q2 cho phép) | FR-AUTH-10, FR-ACH-02 | ⏸ Q2 |
| G4 | Kiểm tương phản chữ và gáy sách (4,5:1) | Đức | P1 | Tuần 1 | 27/10, sửa nốt 12–13/11 | FR-NAV-09, 5.5 | Làm ngay |
| G5 | Thiết kế màn đăng nhập và “giữ tiến độ của bạn” | Đức | P2 | Tuần 2 | 8/11 (nếu Q6 cho phép) | FR-AUTH-11 | ⏸ Q6 (đề xuất) |

### 11.1 Lịch theo tuần

**Tuần 1 · 27/10 – 1/11 — Nền và chốt quyết định.** Một nhánh làm việc duy nhất, biết DB nào là thật, năm quyết định Q2–Q6 chốt xong trong buổi họp 31/10.

| Người | Ngày | Việc |
|---|---|---|
| Nhân | 27–29/10 | D1 nhóm a: liệt kê 73 commit của main, chia nhóm (a vá và nội dung, b mini-game/màn học, c giao diện khác), đưa nhóm a vào test |
| Nhân | 30/10 | D2: xác định DB thật/thử, đổi DIRECT_URL sang host trực tiếp, tách DB dev |
| Nhân | 31/10 | Chủ trì buổi chốt Q2–Q6 (45 phút), ghi quyết định vào SRS mục 1.6 |
| Nhân | 1/11 | Chuẩn bị D8: chạy xem trước (không ghi) của script seed, xin sao lưu DB |
| Kiên | 27–28/10 | B1: bảng 6 bản vá bảo mật, test chứng minh, bổ sung test còn thiếu |
| Kiên | 29–30/10 | B2: /auth/refresh trả hạn phiên, tính trong RefreshTokenService.issue() |
| Kiên | 31/10 | B3 phần đầu: đặt ALLOWED_ORIGINS, FRONTEND_URL, SAMESITE trên môi trường thử |
| Nghĩa | 27–28/10 | B8: tác vụ dọn khách không hoạt động, mặc định chạy thử |
| Nghĩa | 29–31/10 | M1: đo chất lượng nhập bài Gemini trên 10 bài chuẩn (cần xác nhận phạm vi ML) |
| Nghĩa | 1/11 | Bắt đầu B9: gắn bộ kiểm studio-lesson vào lưu bài |
| Trí Thành | 27/10 | T1: kiểm seed-courses.js khớp “~29 giờ” |
| Trí Thành | 28–29/10 | T2: xử lý 5 ca test /demo-minigame |
| Trí Thành | 30–31/10 | T6 phần đầu: nối dashboard-plan, catalog-duration vào CI; kết luận visualizer 9f2ac92 |
| Đức | 27/10 | G4: chạy ds-contrast.mjs, lập danh sách cặp trượt |
| Đức | 28–30/10 | G1(a): ô cửa sổ hai thời điểm, cho thành phố theo cùng pha giờ với trời |
| Đức | 31/10 | Nháp G2 mang vào buổi chốt Q3 |

*Điều kiện qua tuần:* Nhóm commit (a) của main đã vào test; D2 có trang báo cáo; Q2–Q6 có quyết định ghi lại; B1 đủ 6 dòng.

**Tuần 2 · 2/11 – 8/11 — DB khớp giáo trình, xác thực, thiết kế.** DB và giáo trình tĩnh là cùng một khoá; hạn phiên và hai domain chạy; thiết kế các màn chờ quyết định xong.

| Người | Ngày | Việc |
|---|---|---|
| Nhân | 2/11 | D1 nhóm b, c; D3: viết quy trình sao lưu và nạp nội dung |
| Nhân | 3–5/11 | D8: sao lưu, đồng bộ khoá theo Q5, chạy sync_curricula.py, kiểm hai nguồn |
| Nhân | 6–7/11 | D4 (cột tier) và D5 (display_name) nếu Q2 cho phép |
| Nhân | 8/11 | Đo lại mốc nền sau D1, sửa bảng trong AGENTS.md cùng commit |
| Kiên | 2–3/11 | B3: kiểm trên hai tab ẩn danh, hai domain thật; ghi README |
| Kiên | 4/11 | B4: cờ tắt chatbot mặc định, có test |
| Kiên | 5–8/11 | B12: nâng cấp tài khoản khách (nếu Q6 cho phép) |
| Nghĩa | 2/11 | B9 xong |
| Nghĩa | 3–6/11 | B11: script nạp khoá Data Analyst, chạy thử 172 bài (sau Q5) |
| Nghĩa | 7–8/11 | M2: bộ 30 câu thử chatbot không lộ lời giải bài cửa |
| Trí Thành | 2/11 | T3: bỏ 4 chỗ ghi cứng 28800 (sau khi B2 xong) |
| Trí Thành | 3/11 | T4: phím Escape |
| Trí Thành | 4–8/11 | T10: nối khoá vào curricula.json, LESSON_META, catalog (sau D8) |
| Đức | 2–3/11 | G2: thiết kế màn khung mã hợp nhất, đủ trạng thái |
| Đức | 4–5/11 | G1(b): chốt mô hình kệ ↔ học phần |
| Đức | 6–7/11 | G3: màn đổi tên và lưới thành tích (nếu Q2) |
| Đức | 8/11 | G5: màn đăng nhập/giữ tiến độ (nếu Q6) |

*Điều kiện qua tuần:* grep 28800 không còn kết quả; script so DB↔curricula xanh; khách giữ phiên qua hai domain; G2 được cả nhóm duyệt; mốc nền đo lại.

**Tuần 3 · 9/11 – 15/11 — Tính năng.** Thành tích và tên hiển thị chạy từ DB tới giao diện; bắt đầu cài đặt màn khung mã.

| Người | Ngày | Việc |
|---|---|---|
| Nhân | 9–11/11 | D6: unique index user_daily_xp_logs nếu dữ liệu sạch, ghi chú deprecated Badge, script so DB↔curricula |
| Nhân | 12–15/11 | Kiểm tích hợp migration D4, D5 trên DB thử; duyệt PR của cả nhóm |
| Kiên | 9–10/11 | B5: tên hiển thị (kiểm, lọc, thoát HTML) |
| Kiên | 11/11 | B6: endpoint ngày đã học |
| Kiên | 12–15/11 | Sửa lỗi phát sinh của B3, B12; hỗ trợ API cho T5, T11 |
| Nghĩa | 9–11/11 | B7: seed 24 thành tích, trao đúng một lần |
| Nghĩa | 12/11 | M3: đặc tả lộ trình cá nhân |
| Nghĩa | 13–14/11 | B10 đợt 1: hạ trần lint |
| Trí Thành | 9–11/11 | T7: đo trước, sửa, đo sau ảnh và SEO của Góc học |
| Trí Thành | 12–14/11 | T5 phần đầu: khung đổi tên và Thành tựu với dữ liệu giả |
| Đức | 9–13/11 | T8: làm màn khung mã theo G2 (cùng Trí Thành duyệt) |
| Đức | 12–13/11 | Sửa nốt các cặp tương phản của G4 |

*Điều kiện qua tuần:* B5, B6, B7 test xanh; D4, D5 đã chạy trên DB thử; T8 chạy được với dữ liệu bài thật; T7 có số đo trước/sau.

**Tuần 4 · 16/11 – 22/11 — Hoàn thiện và kiểm tích hợp.** Nối giao diện với API mới, kiểm tay toàn bộ, đo lại mốc nền lần cuối. Khối lượng ~70%, phần còn lại để dự phòng.

| Người | Ngày | Việc |
|---|---|---|
| Nhân | 16–17/11 | Đo lại mốc nền lần cuối, sửa bảng AGENTS.md |
| Nhân | 18–19/11 | Diễn tập nạp nội dung và khôi phục trên DB thử |
| Nhân | 20/11 | Kiểm sau gộp không còn commit trùng; D7: cập nhật SRS theo quyết định cuối |
| Kiên | 16–18/11 | Kiểm tích hợp hai domain trên môi trường thật |
| Kiên | 19–20/11 | Sửa lỗi B5, B6, B12; hỗ trợ T5, T11 |
| Nghĩa | 16–17/11 | M4: phân tích trọng số ôn tập (cần dữ liệu thật) |
| Nghĩa | 18/11 | B10 đợt 2 |
| Nghĩa | 19–20/11 | Kiểm thành tích từ đầu đến cuối: hoàn thành bài → nhận đúng một lần |
| Trí Thành | 16–17/11 | T5 xong |
| Trí Thành | 18–19/11 | T11: trang đăng nhập (nếu Q6) |
| Trí Thành | 20/11 | T6 nốt: nối script D6c vào CI; T9 nếu còn |
| Đức | 16–17/11 | T8 hoàn thiện |
| Đức | 18–19/11 | Kiểm tay Góc học và màn khung mã trên máy thật: sáng/chiều/tối/đêm, bàn phím |

*Điều kiện qua tuần:* typecheck, lint, test hai phía xanh; bảng mốc đã đo lại; mọi việc P0 và P1 hoàn thành.

**Dự phòng · 23/11 – 26/11 — Đệm.** Việc trễ, T9 dọn dẹp, nghiệm thu cuối. Không nhận việc mới.

*Điều kiện qua tuần:* Cả nhóm: kiểm lần cuối trên bản deploy.

### 11.2 Ngày công theo người (ước lượng thô)

| Người | Số việc | Tổng ngày công | Ngày làm có sẵn trong 4 tuần |
|---|---|---|---|
| Nhân | 7 | ~7.5 | ~20 |
| Kiên | 7 | ~8.2 | ~20 |
| Nghĩa | 9 | ~15.5 | ~20 |
| Trí Thành | 10 | ~13.8 | ~20 |
| Đức | 6 | ~11.5 | ~20 |

**Thứ tự phụ thuộc:** Q4 → D1 → (T1, T2, T8, B10). D2 → D8 → (B11, T10); Q5 → D8. B2 → T3. D4 → B7 → T5; D5 → B5 → T5; G3 → T5. G2 → T8. Q6 → B12 → T11; G5 → T11. D6(c) → nối nốt T6 (tuần 4).

**Nếu trễ thì cắt:** Cắt trước: B12, T11, G5 (đề xuất Q6), M3, M4, T9, B10 (P3), rồi M1, M2. Nếu Q2 bỏ xếp hạng và thành tích: cắt D4, D5, B5, B6, B7, G3, T5, M3 (khoảng 9–10 ngày công). Không cắt: D1, D2, D8, B1, B2, B3, B8, T2, T3, G1, G2, G4, T8 (P0 và P1); B11, T10 nếu Q5 giữ khoá Data Analyst.

**Việc cần quyết ngay (họp 31/10, theo thứ tự):** Q5 (khoá nào là chính thức) → Q4 (gộp hai dòng lịch sử) → Q2 (xếp hạng/thành tích) → Q3 (màn khung mã) → Q6 (nâng cấp tài khoản khách). Q1 đã được mã trả lời; chỉ còn chốt số phận `/dashboard`.
<!-- phan-viec:end -->
