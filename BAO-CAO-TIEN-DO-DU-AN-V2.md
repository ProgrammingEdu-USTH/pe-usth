# PHÂN CÔNG CÔNG VIỆC — DỰ ÁN PE (Programming EDU — USTH)

> Lập ngày 15/10/2026 trên mã nguồn nhánh `test` (commit `c53617c`) và file `.env` mới thêm (đã đọc tên biến, **không** ghi giá trị bí mật vào file này). Gợi ý trong bảng dựa trên việc **đọc mã nguồn và cấu hình**; chưa chạy ứng dụng. **Chưa đọc được dữ liệu trong cơ sở dữ liệu**: lượt kết nối đọc thử tới Neon bị hệ thống chặn (xem BE-01), nên mọi con số về dữ liệu thật vẫn là câu hỏi mở.
> **Phát hiện từ `.env`:** (1) `DIRECT_URL` đang trỏ vào endpoint **pooler** giống `DATABASE_URL` trong khi Prisma CLI cần kết nối trực tiếp → BE-20; (2) cơ sở dữ liệu là Neon `neondb` ở vùng ap-southeast-1, chưa rõ là bản thật hay bản thử, mà máy dev đang trỏ vào đó → BE-21; (3) khoá Gemini đang bật, trong khi giao diện không còn gọi chatbot nhưng API vẫn mở cho mọi tài khoản khách → BE-22; (4) khoá Google OAuth đang có dù giao diện đăng nhập đã gỡ → ghi trong BE-03; (5) `JWT_ACCESS_SECRET` đủ dài (88 ký tự); `.env` đã nằm trong `.gitignore`, không bị theo dõi.
> Mỗi task có: **mã · tên task · mục tiêu cụ thể (xong khi…) · gợi ý thực hiện · người phụ trách** (để trống — điền sau).
> Task đánh dấu **(chờ Qx)** chỉ bắt đầu sau khi nhóm chốt câu hỏi Qx ở mục 0. 🎨 = cần Figma hoàn chỉnh; 🖌️ = cần Figma một phần.
> **Ràng buộc chung** (theo `AGENTS.md`): migration chỉ được **thêm**; giữ định dạng hash mật khẩu Werkzeug; module nghiệp vụ không tự thêm prefix `api/v1`; lỗi thì `throw`, không `res.json()` thủ công; test phải **trượt khi gỡ bản sửa**; đổi số đo thì cập nhật bảng "Mốc nền" trong `AGENTS.md` trong cùng commit.
> **File này chưa `git add`/commit** — cẩn thận với `git add -A`.

---

## 0. CÂU HỎI CẦN NHÓM CHỐT TRƯỚC (các task bên dưới tham chiếu tới)

| # | Câu hỏi | Task bị chặn |
|---|---|---|
| Q1 | Bỏ trang đầu `/` thì người vào web rơi vào đâu? Đề xuất: chuyển hướng sang `/courses/python_advanced` (khoá duy nhất). | FE-01…03 |
| Q2 | Còn cần giao diện quản trị không? Hiện cập nhật nội dung chỉ bằng dòng lệnh. Nếu có, ai dùng (admin/giảng viên)? | BE-05, 08, 10, 15; FE-05, 07 |
| Q3 | Gộp về ~15 bảng hay chỉ ngừng dùng bảng thừa? (Khuyến nghị: ngừng dùng trước, chưa xoá — cơ sở dữ liệu dùng chung với Django.) | BE-12, BE-18 |
| Q4 | Định nghĩa "adaptive" đo bằng dữ liệu nào, khi thiết kế đã bỏ chuỗi ngày/xếp hạng? | CHUNG-02, FE-08 |
| Q5 | Gems/XP/chuỗi ngày còn dùng không? (Mã vẫn cộng dù giao diện đã bỏ.) | BE-13 |
| Q6 | Diễn đàn, thông báo, lộ trình, bảng xếp hạng, chatbot: bỏ hẳn hay giữ cho bản sau? | BE-12, BE-22 |
| Q7 | Tài khoản khách là danh tính duy nhất? Có cho nâng cấp lên tài khoản bền khi cần Arena không? | BE-03, 04; AR-04 |
| Q8 | Arena có xếp hạng người–người không? Nếu có, phải bác bỏ có căn cứ 3 lý do trong commit `e7c41c0` và sửa `design-system-v2.md`. | Toàn bộ mục 4, 5 |
| Q9 | Chấm bài phía máy chủ cho bài học (chống gian lận) hay chỉ cho Arena? | BE-17 |
| Q10 | Bản trên Neon/Render đã áp 3 migration và nạp 48 bài chưa? `neondb` trong `.env` là bản thật hay bản thử? (BE-01, BE-21 trả lời.) | BE-01, BE-21 |

---

## 1. BẢNG BE (backend + cơ sở dữ liệu)

#### Nhóm A — Nền tảng, đăng nhập, tài khoản khách

| Mã | Tên task | Mục tiêu cụ thể (xong khi…) | Gợi ý thực hiện | Phụ trách |
|---|---|---|---|---|
| **BE-01** | Xác nhận trạng thái cơ sở dữ liệu thật | Có biên bản ngắn trả lời được: (1) 3 migration đã áp chưa; (2) khoá `python_advanced` có đủ 48 bài chưa, nội dung có khớp gói `scripts/pe-v4/out-advanced` không; (3) có cặp bài trùng `(course_id, sort_order)` không; (4) có bao nhiêu tài khoản `@guest.local`, bao nhiêu trong số đó chưa học bài nào. | **Làm sau BE-20 và BE-21.** Đã có sẵn một script **chỉ đọc** (mọi truy vấn trong giao dịch READ ONLY, chỉ in số tổng hợp, không in email/mật khẩu): `C:\Users\tuf\AppData\Local\Temp\claude\c--Users-tuf-Desktop-Nhan-PE-2-PE-USTH--deploy--pe-usth\afe1e76a-316f-4c8f-bc1b-aa7541260d80\scratchpad\dbcheck\inspect.cjs` (cần `npm i pg` cùng thư mục, đọc `.env`). Nó in: migration đã áp, số dòng 28 bảng, khoá/bài, bài trùng, chỉ mục, số khách và khách chưa học, tiến độ lệch, và đối chiếu từng bài với gói `scripts/pe-v4/out-advanced`. **Người chạy phải là người có quyền trên DB** (hoặc cấp quyền cho Claude Code chạy). Hoặc dùng `npx prisma migrate status` (cần `DIRECT_URL` đúng, xem BE-20). Câu kiểm trùng đã có trong README; migration 3 (`20261012000000_…`) tự dừng nếu có trùng. Đối chiếu nội dung cũng có thể dùng chế độ "chạy thử" của `scripts/update-lesson-content.ts`. | |
| **BE-02** | Đổi mật khẩu tài khoản test đã lộ và rà bí mật trong lịch sử git | Mọi tài khoản từng có mật khẩu trong tài liệu test (20 tài khoản, đã bỏ ở commit `2c51723`) hoặc đã đổi mật khẩu, hoặc đã xoá; có kết luận lịch sử git không còn khoá API/chuỗi kết nối thật. | `git log -p -S"<chuỗi nhạy cảm>"` để tìm; nếu có bí mật thật thì **xoay khoá** (không chỉ xoá khỏi repo). Tài khoản test: cập nhật mật khẩu bằng cùng định dạng hash Werkzeug, hoặc xoá nếu chỉ là dữ liệu thử. | |
| **BE-03** | Tắt API đăng nhập/đăng ký/OAuth bằng cấu hình **(chờ Q7)** | Với cờ cấu hình tắt: `POST /auth/login`, `/auth/register`, `GET /auth/google\|facebook` (và callback) trả 403 rõ ràng; `POST /auth/guest`, `/auth/refresh`, `/auth/logout` vẫn chạy; ứng dụng khởi động được **không cần** `GOOGLE_*`/`FACEBOOK_*`; không xoá bảng nào, không đổi hash mật khẩu. | Làm theo đúng mẫu của `GUEST_LOGIN=off` trong `auth.service.ts` (trả 403) và khai biến mới trong `src/config/env.validation.ts` (Joi, có giá trị mặc định). Sửa/thêm kiểm thử cạnh `auth.guest.spec.ts`, `oauth-state.spec.ts`, `oauth-login-csrf.spec.ts`. Bắt đầu bằng cờ tắt; **chỉ xoá mã** sau khi chạy ổn một thời gian vì cơ sở dữ liệu còn dùng chung với bản Django. `.env` hiện có `GOOGLE_CLIENT_ID/SECRET` (Facebook thì không): khi tắt OAuth nên gỡ hai biến này khỏi môi trường chạy và, nếu từng bị lộ, thu hồi/xoay trên Google Cloud Console. | |
| **BE-04** | Làm cứng chế độ tài khoản khách | (1) Có tác vụ dọn khách không hoạt động quá N ngày (cấu hình được), xoá đúng thứ tự khoá ngoại và **không đụng** tài khoản đã có tiến độ nếu chọn chế độ an toàn; (2) có số liệu: tổng khách, khách hoạt động 7 ngày; (3) quota tạo khách không làm cả phòng máy chung một Wi-Fi bị 429 (hiện `THROTTLE_GUEST_LIMIT` 120 lượt/giờ/IP); (4) cột biệt danh tuỳ chọn (nullable) nếu Q7 yêu cầu. | Mẫu tác vụ định kỳ có sẵn: `RefreshTokenService` dùng `setInterval` + `unref()` (hiện không có thư viện lập lịch nào trong `package.json`). Nhận diện khách bằng email `%@guest.local`. Các bảng phụ thuộc: `auth_sessions`, `enrollments`, `lesson_progress`, `quizzes`, `review_quiz_results`, `user_daily_xp_logs`, `user_achievements`… — kiểm bằng `schema.prisma`. Thêm kiểm thử với dữ liệu giống thật. | |

| **BE-20** | Sửa `DIRECT_URL` trỏ kết nối trực tiếp (không qua pooler) | `DIRECT_URL` dùng host **không** có `-pooler`; `npx prisma migrate status` chạy được và báo đúng trạng thái; ghi rõ trong README/`.env.example` hai biến khác nhau thế nào. | Trong `.env` hiện cả `DATABASE_URL` lẫn `DIRECT_URL` đều là host pooler. `prisma.config.ts` đọc `DIRECT_URL` cho Prisma CLI; migrate qua pooler dễ treo hoặc lỗi khoá. Lấy chuỗi "Direct connection" trong bảng điều khiển Neon (bỏ phần `-pooler` trong tên host). **Không** dán chuỗi thật vào tài liệu hay commit. | |
| **BE-21** | Tách môi trường thử khỏi cơ sở dữ liệu thật | Máy dev và CI trỏ vào **nhánh Neon riêng**, không phải bản đang phục vụ người dùng; mọi script ghi (`seed-*`, `update-lesson-content.ts --apply`, migration) mặc định chạy trên nhánh thử trước. Xác nhận bằng văn bản `neondb` hiện tại là bản nào. | Neon cho tạo nhánh từ bản hiện có (chép-khi-ghi). Đặt tên biến hoặc kiểm tra tên host trong script ghi để từ chối chạy nếu trỏ nhầm. Các script ghi mặc định "chạy thử" nên giữ nguyên thói quen đó. | |
| **BE-22** | Chatbot: khoá hoặc bỏ nếu không dùng **(chờ Q6)** | Nếu bỏ chatbot: `POST /chatbot/message` trả 403/404 và khoá Gemini được gỡ khỏi môi trường chạy; nếu giữ: có giới hạn theo tài khoản (không chỉ theo IP) và có trần chi phí. | Hiện giao diện không còn nút chatbot, nhưng `chatbot.controller.ts` không `@Public` mà chỉ bị chặn bởi JWT — **tài khoản khách nào cũng có JWT** nên API vẫn dùng được với khoá Gemini thật (giới hạn hiện tại 60 lượt/giờ/IP). Dùng cờ cấu hình như `GUEST_LOGIN`. | |

#### Nhóm B — Luồng sửa bài và dữ liệu bài học

| Mã | Tên task | Mục tiêu cụ thể (xong khi…) | Gợi ý thực hiện | Phụ trách |
|---|---|---|---|---|
| **BE-05** | Dồn lại thứ tự bài và thêm API đổi thứ tự **(chờ Q2)** | Xoá/chèn bài giữa khoá thì `sort_order` luôn liên tục 1..N (không tính bài lưu trữ có thứ tự ≥ 1000); có API đổi thứ tự hàng loạt, tráo hai bài không đụng ràng buộc duy nhất; học viên luôn hoàn thành được bài cuối. | Sửa tạo/sửa/xoá bài trong `course-admin.service.ts`; làm trong **một giao dịch**; tráo chỗ bằng hai pha (đưa về giá trị tạm lớn rồi đặt lại) vì ràng buộc `uq_lessons_course_sort` đã có. Giữ hằng `ARCHIVED_SORT_ORDER` trong `dto/course-admin.dto.ts`. | |
| **BE-06** | Tính lại tiến độ học viên sau khi đổi số bài | Thêm hoặc xoá bài ⇒ `enrollments.progress` và `completed_lessons` của mọi học viên khoá đó được tính lại đúng; không bao giờ có `completed_lessons` lớn hơn tổng số bài. | Dùng lại hàm tính tiến độ trong `courses.service.ts` (`recomputeProgress`, đã dùng khi ghi danh và hoàn thành bài). Gọi sau bước đồng bộ số bài của khoá. Cân nhắc một câu `UPDATE` tổng hợp nếu số học viên lớn. | |
| **BE-07** | Bắt buộc kiểm tra cấu trúc bài khi lưu | Lưu bài có nội dung sai cấu trúc ⇒ 400 kèm danh sách lỗi; **không còn** tự bọc thành `{text: …}`; đường nhập file và đường lưu tay dùng cùng một bộ kiểm tra. | Hàm kiểm tra `validateStudioLesson` đã có ở `course-admin/studio-lesson.schema.ts` (có spec) — gọi nó ở tạo/sửa bài thay cho hàm đọc nội dung hiện bọc văn bản. Giữ bản sao schema ở `frontend/src/lib/studio-lesson.ts` khớp. Lấy mẫu dữ liệu thật từ `scripts/pe-v4/out-advanced/lessons/*.json` khi viết test. | |
| **BE-08** | API mục lục khoá lấy từ cơ sở dữ liệu **(chờ Q2)** | Một `GET` trả danh sách module → bài (mã bài, tiêu đề, thứ tự) của một khoá; khớp với giáo trình trong DB; không lộ nội dung bài. | Gom từ bảng `lessons` theo `module`, sắp theo `sort_order`. Thêm vào module `courses` (không viết prefix `api/v1`). Trang khoá là trang **công khai** nên cân nhắc đường không bắt tạo tài khoản khách (xem FE-05). | |
| **BE-09** | Kiểm thử cho quản trị khoá/bài | Có bộ kiểm thử phủ: tạo/sửa/xoá/đổi thứ tự bài ⇒ số bài của khoá, tiến độ, hoàn thành được bài cuối; gỡ bản sửa BE-05/06/07 thì test trượt (ghi số ca trượt vào mô tả commit). | Phần quản trị hiện **chưa có file spec** (chỉ có `lesson-content-update.spec.ts` cho công cụ cập nhật nội dung). Dùng mẫu giả lập Prisma của `courses.service.spec.ts`. | |
| **BE-13** | Ngừng cộng chuỗi ngày và gems **(chờ Q5)** | Hoàn thành bài không còn ghi `streak`/`gems`/ngày học cuối nếu quyết định bỏ; số đo kiểm thử giữ nguyên hoặc được cập nhật. | `lessons.service.ts` và `common/streak/streak.service.ts`; giao diện đã gỡ chuỗi ngày nên dữ liệu này không ai đọc. **Không xoá cột** (cơ sở dữ liệu dùng chung). | |

#### Nhóm C — Cơ sở dữ liệu

| Mã | Tên task | Mục tiêu cụ thể (xong khi…) | Gợi ý thực hiện | Phụ trách |
|---|---|---|---|---|
| **BE-10** | Vai trò dạng liệt kê, trạng thái bài và phiên bản **(chờ Q2)** | Vai trò người dùng có tập giá trị cố định (học viên/biên tập/quản trị) mà dữ liệu cũ vẫn đọc được; `lessons` có trạng thái nháp/xuất bản và số phiên bản; học viên không thấy bài nháp. | Migration **chỉ thêm** cột có giá trị mặc định (ví dụ cột trạng thái mặc định "đã xuất bản" để không đổi hành vi hiện tại). Không đổi kiểu cột `role` — thêm cột mới song song rồi chuyển dần. Thử trên nhánh Neon. | |
| **BE-11** | Bổ sung các ràng buộc còn thiếu | `user_daily_xp_logs` có duy nhất `(user_id, log_date)`; kiểu thời gian đồng nhất ở bảng còn lệch; dữ liệu cũ vi phạm đã được xử lý trước khi thêm ràng buộc. | Theo mẫu migration 3: **kiểm dữ liệu vi phạm trước, dừng có thông báo rõ nếu có**. `posts.created_at` và `enrollments.time_spent` chỉ nên đổi bằng cột mới song song, không đổi kiểu tại chỗ. | |
| **BE-12** | Lập danh sách bảng ngừng dùng **(chờ Q3, Q6)** | Có bảng liệt kê 28 bảng: đang dùng / chỉ backend dùng / không ai dùng, kèm quyết định; chú thích "ngừng dùng" trong `schema.prisma`; chưa xoá bảng nào. | Phân loại đề xuất: 9 bảng lõi đang chạy (`users`, `auth_sessions`, `courses`, `lessons`, `enrollments`, `lesson_progress`, `user_daily_xp_logs`, `quizzes`, `review_quiz_results`); 14 bảng chỉ backend dùng, không có giao diện (`posts`, `comments`, `post_reactions`, `comment_reactions`, `user_follows`, `notifications`, `notification_settings`, `surveys`, `roadmaps`, `roadmap_progress`, `missions`, `course_ratings`, `achievements`, `user_achievements`); 5 bảng không mã nào dùng (`badges`, `user_badges`, `email_verifications`, `user_oauth_accounts`, `questionnaires`). Grep lại trước khi chốt. | |
| **BE-18** | Chuẩn hoá về ~15 bảng **(chỉ khi Q3 = gộp)** | Có kế hoạch migration từng bước (tạo bảng mới → chép dữ liệu → đổi mã → ngừng bảng cũ), có script đối soát số dòng, có bước hoàn tác. | Làm **sau** BE-10…BE-12 và khi phạm vi đã ổn định. Mọi bước chạy thử trên nhánh Neon; bản Django cũ không được hỏng. | |

#### Nhóm D — Chất lượng, vận hành, quyền

| Mã | Tên task | Mục tiêu cụ thể (xong khi…) | Gợi ý thực hiện | Phụ trách |
|---|---|---|---|---|
| **BE-14** | Hạ trần lỗi lint backend | Số lỗi đo bằng đúng lệnh CI thấp hơn mốc hiện tại (155); trần trong `ci.yml` được hạ theo; bảng "Mốc nền" trong `AGENTS.md` được cập nhật. | Lệnh đo: `npx eslint "{src,apps,libs,test}/**/*.ts" --ignore-pattern "src/generated/**"` (**không** dùng `npm run lint` vì có `--fix`). 89% là nhóm `no-unsafe-*`; xử lý bằng cách đặt lại kiểu ở ranh giới dữ liệu từng module (mẫu: các commit `refactor(lint)` cho spec của stats và courses). | |
| **BE-15** | Phân quyền soạn bài **(chờ Q2, sau BE-10)** | Có vai trò biên tập/giảng viên; người này chỉ sửa được khoá của mình; người học không gọi được API quản trị. | Thay kiểm tra cứng `role === 'admin'` trong `common/guards/admin/admin.guard.ts` bằng guard theo vai trò; dùng cột `courses.instructor_id` đã có để giới hạn theo khoá. | |
| **BE-16** | Bản nháp và lịch sử sửa bài **(sau BE-10)** | Sửa bài không ghi đè mất bản cũ; xem được lịch sử; hoàn tác được; học viên chỉ thấy bản đã xuất bản. | Bảng lịch sử mới (chỉ thêm), ghi một dòng mỗi lần lưu; kết hợp với `scripts/update-lesson-content.ts` (đã có dấu vân tay nội dung trước/sau). | |
| **BE-17** | Chấm bài phía máy chủ cho bài học **(chờ Q9)** | Ca kiểm thử và lời giải **không** gửi về trình duyệt; máy chủ chấm và ghi kết quả; người dùng không tự cộng điểm bằng cách gửi `quizScore` giả. | Dùng lại `python-runner` (hàng đợi + Docker); cần tách phần "đề kèm ca chấm" khỏi nội dung gửi xuống. Cùng bài toán với nghiên cứu R-BE của Arena (mục 4). | |
| **BE-19** | Giám sát sau triển khai | Có cảnh báo khi `/health/ready` trả 503 hoặc bộ chạy mã chết; có tài liệu một trang "khi sự cố làm gì". | Endpoint `/health/ready` đã có (kiểm DB). Bộ chạy mã: xem `runner/README.md` (Caddy + pm2). Chọn công cụ theo hạ tầng đang dùng (Render/Azure). | |

## 2. BẢNG FE (frontend)

#### Nhóm A — Bỏ trang đầu và dọn phần sót

| Mã | Tên task | Mục tiêu cụ thể (xong khi…) | Gợi ý thực hiện | Phụ trách |
|---|---|---|---|---|
| **FE-01** | Chuyển hướng `/` sang trang khoá **(chờ Q1)** | Mở `/` tự chuyển sang `/courses/python_advanced`; logo, mục "Khoá học" trên thanh trên và nút "←" ở trang khoá đều trỏ về đích mới (hoặc bỏ nút "←"); không còn liên kết nào dẫn về `/`. | Thêm chuyển hướng trong `next.config.ts` (hiện chưa có) hoặc dùng `redirect()` của Next. Chỗ trỏ về `/`: `SiteHeader.tsx`, `lib/site-nav.ts`, `CourseDetail.tsx`, `CourseDbDesign.tsx`. Đọc tài liệu Next trong `node_modules/next/dist/docs/` trước vì bản này khác kiến thức cũ. | |
| **FE-02** | Xoá cụm file trang đầu | Xoá `app/page.tsx`, `WorldMap.tsx`, `CatalogTile.tsx`, `home.module.css`, `world-map.module.css`, `lib/home-copy.ts`, `lib/world-map.ts`, `e2e/unit/home-page.test.mjs`; mọi test còn lại xanh; chú thích nhắc `home-copy.ts` ở `CourseDetail.tsx`, `PracticeClient.tsx`, `ide/page.tsx` được sửa; bảng "Mốc nền" trong `AGENTS.md` cập nhật **cùng commit**. | Chạy `npm run test:unit` để biết bộ nào còn tham chiếu `/`: `dead-routes`, `site-nav`, `route-metadata`, `seo-copy`, và kiểm `ds-*`, `fonts-naming`, `legacy-js-wording`, `course-progress`. Sửa có chủ ý (ví dụ "bốn trang sống" thành ba), không tắt test. | |
| **FE-03** | Kiểm trang khoá làm được vai trò trang đầu | Người chưa có phiên thấy "Bắt đầu học"; người quay lại thấy "Tiếp tục" đúng bài; IDE và Ôn tập vào được từ thanh trên; **chỉ mở trang thì không sinh tài khoản khách**. | Đọc `lib/course-progress.ts` và test của nó (nguyên tắc: chỉ gọi API khi máy đã có phiên, qua `apiFetchSessionOnly`). Thêm ca Playwright nếu chưa có. | |
| **FE-04** | Dọn phần sót của đăng nhập/landing/admin cũ | Xoá `public/static/js/pages/login.inline.js`, `register.inline.js`, `landing.inline.js`, `admin.inline.js`, CSS `login.css`, `register.css`, `edu-landing.css` và mục tương ứng trong `components/PageStyles.tsx`; sửa chú thích nhắc `/login`, `/register` trong `app/layout.tsx`; bộ "route chết" canh cả các file này. | Mở rộng danh sách file đã xoá trong `e2e/unit/dead-routes.test.mjs` (kiểm theo hai chiều: đã xoá phải xoá hẳn, trang sống phải còn). `grep` lại không ai nạp trước khi xoá. | |

#### Nhóm B — Mục lục, hệ thiết kế, tương tác

| Mã | Tên task | Mục tiêu cụ thể (xong khi…) | Gợi ý thực hiện | Phụ trách |
|---|---|---|---|---|
| **FE-05** | Trang khoá lấy mục lục từ API **(sau BE-08, chờ Q2)** | Thêm/sửa/xoá bài trong DB ⇒ trang khoá đổi theo, không cần chép tay `curricula.json`; hoặc, nếu giữ file tĩnh, có kiểm tra trong CI báo lệch giữa file và DB. | Hiện `catalog.ts` và `CourseDetail.tsx` đọc `lib/curricula.json` (sinh bằng `scripts/pe-v4/sync_curricula.py`). Phương án an toàn trước mắt: giữ trang công khai không gọi API, thêm bước CI so file với gói giáo trình (job `giao-trinh` đã có sẵn). | |
| **FE-06** | 🎨 Rà hệ thiết kế: quy CSS cũ về token | Không còn CSS legacy nào không trang nào nạp; phần còn lại dùng thang `--ds-*`; có danh sách những gì còn chặn việc bỏ `style-src 'unsafe-inline'` (~70 handler nội tuyến JS cũ + 257 chỗ `style={{…}}`). | Dựa `design-system-v2.md` và `npm run lint:tokens`. Xoá từng file CSS sau khi grep không còn trang nào nạp (`PageStyles.tsx` có bảng thứ hạng nạp). Giữ các bộ kiểm thử câu chữ/tương phản xanh. | |
| **FE-07** | 🎨 Giao diện quản trị mới **(chờ Q2)** | Admin/biên tập xem danh sách khoá/bài, sắp thứ tự, sửa nội dung có báo lỗi theo từng trường, xem trước bài, nhập PDF/Markdown (bản nháp → duyệt → lưu). | Hiện không còn trang `/admin` (chỉ còn `AdminAnswerKey.tsx`). Dùng API `/admin/*` có sẵn (`course-admin.controller.ts`) cùng kết quả của BE-05/07. Tái dùng `StudioLesson`/khung bài để xem trước. | |
| **FE-08** | 🎨 Giao diện "thích ứng" **(chờ Q4, sau CHUNG-04)** | Gợi ý bài kế tiếp hoặc ôn theo điểm yếu, có giải thích vì sao; **không ổ khoá, không chuỗi ngày, không xếp hạng**. | Tái dùng `/practice` (đã có ôn theo trọng số). Chạy đủ bộ kiểm thử câu chữ để không lọt lại giọng dỗ dành. | |
| **FE-09** | 🖌️ Khôi phục kéo-thả thật | Phân loại/nối cặp/sắp xếp/ghép code/Parsons dùng được bằng kéo-thả **và** bằng bàn phím; giữ thao tác "bấm chọn rồi bấm đích" làm phương án thay thế. | Xem `frontend/e2e/drag-regression.spec.ts` để biết hành vi đang canh. Thư viện: dnd-kit hoặc pointer events thuần. Cần Figma trạng thái cầm lên/kéo/thả hợp lệ/thả sai. | |
| **FE-10** | Xoá JS đời cũ của các trang CSDL **(chờ quyết định phạm vi)** | Xoá `lesson_db_design.js`, `lesson_content*.js`, `course_db_design.js`, `table_explorer.js`, `drag_game.js`, `decomp_game.js`, `pe-bridge.js`, trang `/courses/db_design*`, `/card/*` nếu quyết định không quay lại; test xanh. | Theo cách `dead-routes.test.mjs`: ghi rõ **vì sao chết** cho từng file; kiểm `grep` không còn nạp. Giảm bề mặt XSS (JS cũ dùng `innerHTML`). | |
| **FE-11** | Playwright luồng chính | Một ca đầu-cuối chạy được: khách mở link → vào bài → hoàn thành → ôn tập → mở IDE chạy mã. | Cấu hình ở `frontend/e2e/playwright.config.ts`; script `test:e2e` hiện chạy `python-advanced` và `mobile-responsive`. | |

---

## 3. VIỆC CHUNG (không chia FE/BE)

| Mã | Tên task | Mục tiêu cụ thể (xong khi…) | Gợi ý thực hiện | Phụ trách |
|---|---|---|---|---|
| **CHUNG-01** | Cập nhật tài liệu | `README.md`, `AGENTS.md` (bảng "Hai nguồn danh sách bài", phần đăng nhập, mốc nền) khớp thực tế; hai báo cáo cũ có ghi chú "đã thay bằng bản 2". | Đối chiếu với file này, sửa trong cùng commit khi đổi số đo. | |
| **CHUNG-02** | Đặc tả "adaptive" **(chờ Q4)** | Một tài liệu ngắn: dữ liệu đầu vào, quyết định đầu ra, chỉ số đo thành công, **phù hợp triết lý không-xếp-hạng, không-chuỗi-ngày**. | Đọc `design-system-v2.md`, màn "Thử thách ôn" và cách quiz ôn tập đang tính trọng số (`quizzes.service.ts`). | |
| **CHUNG-03** | Kiểm kê dữ liệu học tập | Biết dữ liệu hiện có (`review_quiz_results`, `lesson_progress`) đủ để ước lượng độ khó câu hỏi chưa; danh sách sự kiện cần ghi thêm. | Truy vấn trên bản sao DB; ghi rõ cỡ mẫu (nhiều người dùng là khách, dữ liệu có thể ít). | |
| **CHUNG-04** | Luật gợi ý ôn tập (adaptive v1) | Có luật đơn giản (ôn lại theo độ quên hoặc theo bài hay sai) đã chạy thử, có kiểm thử. | Nâng cấp trọng số `1 + tỉ lệ sai` hiện có; làm **sau** CHUNG-02/03. | |
| **CHUNG-05** | Hoàn thiện nội dung Advanced Python | Các bài cần Linux/WSL để nghiệm thu thật được ghi chú rõ; rà soát câu chữ/hình tiếp. | Quy trình ở `scripts/pe-v4` (`build.py`, `check-pyodide.mjs`, `sync_curricula.py`); đã có đợt rà sửa lỗi hình và nội dung ở P03, G01. | |

---

## 4. NGHIÊN CỨU ARENA — giao cho từng thành viên trước khi viết bất kỳ mã nào

> **Bối cảnh bắt buộc đọc:** commit `e7c41c0` (15/10) đã kết luận **không làm đấu người–người** vì 3 lý do: (1) ghép cặp trực tiếp không đủ người chơi (ngay CodinGame còn phải thả bot); (2) trạng thái trận nằm trong RAM một tiến trình Render nên mất mỗi lần deploy; (3) thứ hạng tiêu cực hại động lực hơn không báo gì. `design-system-v2.md` ghi "Đấu trường" là thi đua và yêu cầu bỏ; hai file `design/project/Arena*.dc.html` thực chất là màn "Thử thách ôn" (tự so với chính mình), không phải đấu trường. Mọi nghiên cứu dưới đây phải **trả lời được 3 lý do trên** hoặc nói rõ vì sao chúng không còn đúng.
> Hiện chưa có trong mã: WebSocket/SSE, Redis/hàng đợi, kho đề riêng không lộ đáp án, biệt danh người chơi. Bộ chạy mã Docker có sẵn nhưng cấu hình mặc định chỉ chạy 2 bài đồng thời.
> Mỗi việc nghiên cứu cần **con số hoặc bản thử nhỏ**, không chỉ ý kiến. Thời hạn gợi ý: 2–3 ngày làm việc, rồi họp tổng hợp.

| Mã | Vai trò | Tên task | Sản phẩm bàn giao (xong khi…) | Câu hỏi cần trả lời / gợi ý thực hiện | Phụ trách |
|---|---|---|---|---|---|
| **R-PROD** | Sản phẩm + thiết kế | Định nghĩa Arena của PE | Tài liệu 2 trang "Arena của PE là gì / không là gì" + 1 luồng người dùng; **là điều kiện để các nhóm khác bắt đầu** | (1) Chọn một hoặc kết hợp: thử thách riêng theo ngày/tuần; bất đồng bộ cùng một đề; phòng theo lớp do giáo viên bật; đấu trực tiếp 1–1. (2) Ai chơi, bao nhiêu người cùng lúc (cả lớp ~40 máy chung Wi-Fi hay vài người rải rác)? (3) Có xếp hạng không, hiển thị cho ai — mâu thuẫn "không xếp hạng". (4) Đề trắc nghiệm hay bài code có ca chấm? (5) Chấp nhận gian lận đến đâu. Phân tích 3–5 sản phẩm tương tự (CodinGame, LeetCode contest, Kahoot, Codewars, Duolingo league): cách xử lý thiếu người chơi, cách đối xử người yếu. | |
| **R-BE** | Backend | Thời gian thực, trạng thái, chấm bài | Báo cáo có số đo + khuyến nghị kiến trúc 1 trang; nếu có bản demo thì để ở nhánh riêng, **không đưa vào `test`** | (1) So WebSocket/SSE/polling cho 40 người cùng lúc; Render có hỗ trợ không, giới hạn kết nối, hành vi khi dịch vụ ngủ/deploy lại. (2) Lưu trạng thái trận bền: Postgres / Redis / hoặc không có trạng thái (bất đồng bộ); độ trễ Neon từng đo ~237 ms/truy vấn. (3) Đo thông lượng bộ chạy với 20/40 bài nộp cùng lúc bằng `runner/load-test.mjs`; nút thắt (`PY_RUN_MAX_CONCURRENT`, hàng đợi, RAM VM). (4) Kho đề + ca chấm chỉ ở máy chủ, đối chiếu cách `quizzes` giấu đáp án. (5) Quota theo IP sẽ gây 429 khi cả lớp cùng thi — đề xuất quota theo phiên/phòng. | |
| **R-FE** | Frontend | Trải nghiệm và kết nối | Danh sách màn + sơ đồ trạng thái từng màn + rủi ro kỹ thuật; xác định màn nào cần Figma | (1) Nối WebSocket/SSE trong Next.js 16 / React 19 (đọc `node_modules/next/dist/docs/`, bản này khác kiến thức cũ); mất kết nối, vào lại phòng, nhiều tab; đồng hồ đếm ngược lệch giờ máy khách. (2) Màn cần thiết kế: sảnh, phòng chờ, màn thi, kết quả; trạng thái rỗng/đang tải/lỗi; mobile. (3) Thành phần tái dùng được từ khung bài học (27 kiểu màn), "Thử thách ôn", IDE (Monaco, chạy mã). (4) Các bộ kiểm thử câu chữ/tương phản/chuyển động giảm áp vào màn mới thế nào; cách giữ Arena không lọt lại chuỗi ngày/xếp hạng nếu Q8 = không. | |
| **R-DB** | Cơ sở dữ liệu | Mô hình dữ liệu và danh tính | ERD bảng mới + bản nháp migration (chưa chạy) + ước lượng dung lượng | (1) Bảng cho phòng/trận, người tham gia, lượt nộp, điểm — hoặc bảng sự kiện để tính bảng xếp hạng bằng truy vấn; tất cả **chỉ thêm**, tương thích Django. (2) Biệt danh cho khách (cột nullable), duy nhất hay không, kiểm duyệt. (3) Chỉ mục cho bảng xếp hạng, số dòng/ngày dự kiến. (4) Nếu có hệ điểm (Elo/Glicko hay điểm đơn giản): nơi lưu, cách tính lại. | |
| **R-CONTENT** | Nội dung / học máy | Kho đề và công bằng | Đề xuất kho đề tối thiểu + phương pháp hiệu chuẩn độ khó + cảnh báo thống kê khi dữ liệu ít | (1) Cần bao nhiêu đề, cấp độ nào; dựng theo quy trình `pe-v4` (đề + ca chấm + biến thể sai bị bắt). (2) Hiệu chuẩn độ khó bằng dữ liệu làm bài thật — `review_quiz_results` có đủ không. (3) Nếu có xếp hạng/ghép theo năng lực: tác động lên người yếu; khi ít người chơi thì bot hoặc bản ghi phát lại (ghost) có hợp lý không. | |
| **R-SEC** | Bảo mật / vận hành | Đe doạ, tải, chi phí | Danh sách rủi ro xếp theo mức + kiểm soát đề xuất | (1) Gian lận: chép đáp án, nhiều tài khoản khách, tự động hoá bằng script. (2) Tấn công qua chạy mã (bộ chạy hiện cách ly: không mạng, giới hạn tài nguyên). (3) Số người đồng thời kỳ vọng và chi phí VM Azure/Render/Neon ở mức đó; kế hoạch khi quá tải. (4) Biệt danh hiển thị công khai, dữ liệu người dưới tuổi (nếu có). | |

---

## 5. VIỆC XÂY ARENA — chỉ mở sau khi mục 4 hoàn thành và Q8 được chốt

| Mã | Bên | Tên task | Mục tiêu cụ thể (xong khi…) | Gợi ý thực hiện | Phụ trách |
|---|---|---|---|---|---|
| **AR-01** | BE | Kho đề riêng cho Arena | Đề, ca chấm và lời giải lưu ở máy chủ, **không bao giờ** gửi về trình duyệt trước khi nộp; có quy trình dựng đề kiểm được. | Theo khuôn `pe-v4` (đề + ca chấm + biến thể sai bị bắt, kiểm bằng `check-pyodide.mjs`). Tham khảo cách `quizzes` giấu đáp án và lịch sử lỗi lộ đáp án trong `AGENTS.md`. | |
| **AR-02** | BE | Chấm nhiều ca phía máy chủ + đo thông lượng | Chấm một bài nộp qua tất cả ca trong một lượt; biết bộ chạy chịu được bao nhiêu bài nộp đồng thời, nút thắt nằm đâu. | Dùng lại `python-runner`; đo bằng `runner/load-test.mjs`. Tham số: `PY_RUN_MAX_CONCURRENT` (mặc định 2), hàng đợi 50, quota 10 lượt/phút/IP — **không đủ cho 40 người cùng nộp**. | |
| **AR-03** | BE | Quota theo phiên/phòng | Cả lớp cùng thi không bị 429 vì chung IP, trong khi vẫn chặn spam. | Sửa cách khoá quota trong `common/guards/throttler/`; kiểm bằng `fixed-window-throttler.storage.spec.ts`. | |
| **AR-04** | BE + FE | Biệt danh hiển thị | Người chơi đặt được biệt danh; có kiểm duyệt cơ bản; lưu bền với tài khoản khách. | Cột nullable mới ở `users` (BE-04); ô nhập ở frontend. Cân nhắc nâng cấp khách thành tài khoản bền (Q7). | |
| **AR-05** | BE + FE | Thử thách bất đồng bộ (giai đoạn A1) | Đề theo ngày/tuần, ai làm lúc nào cũng được, nộp → chấm phía máy chủ → xem kết quả; không cần thời gian thực. | Tái dùng màn "Thử thách ôn" (`practice/challenge`) và IDE; bảng lượt thi mới (chỉ thêm). | |
| **AR-06** | FE | 🎨 Thiết kế và dựng màn Arena | Sảnh, đề, kết quả (và phòng chờ nếu có) theo `design-system-v2.md`; đạt các bộ kiểm thử câu chữ/tương phản/chuyển động giảm. | Bắt đầu từ ghi chú trong tài liệu thiết kế về "Đấu trường"; thống nhất với Q8 về thứ hạng. | |
| **AR-07** | BE + FE | Phòng theo lớp (A2) | Giáo viên mở phòng, học viên vào bằng mã, xem tiến độ cả phòng. | Cần vai trò người điều hành (BE-10, BE-15). | |
| **AR-08** | BE + FE | Đối kháng thời gian thực (A3) | Chỉ khi A1–A2 đã có người dùng thật và R-BE chứng minh kênh + trạng thái bền vững. | Hiện **chưa có** WebSocket/SSE/Redis/hàng đợi nào trong mã. | |
| **AR-09** | BE + FE | Kiểm thử tải 40 máy | Mô phỏng 40 người vào và nộp cùng lúc; ghi số liệu. | Dựa `scripts/loadtest*.js`, `runner/load-test.mjs`. | |

---

## 6. THỨ TỰ GỢI Ý VÀ RỦI RO

**Thứ tự gợi ý (không bắt buộc, chỉ để tránh làm trước việc phụ thuộc):**
1. Họp chốt mục 0 (đặc biệt Q1, Q2, Q7, Q8).
2. Làm ngay, độc lập nhau: **BE-20 → BE-21 → BE-01** (cấu hình DB trước, rồi mới đọc dữ liệu), **BE-02**, **BE-22** (nếu Q6 = bỏ), **FE-01 → FE-02 → FE-03**, **FE-04**, **CHUNG-01**.
3. Sau BE-01: **BE-03**, **BE-04**, rồi nhóm sửa bài **BE-05 → BE-06**, **BE-07**, **BE-08 → FE-05**, **BE-09**.
4. Sau khi nhóm sửa bài ổn định: **BE-10 → BE-11 → BE-12**, rồi mới tới BE-15, BE-16 (và BE-18 nếu Q3 = gộp).
5. Song song: nghiên cứu **R-xx** (mục 4); kết quả quyết định có mở **AR-xx** (mục 5) hay không.

**Rủi ro khi chia việc:**
1. **Cơ sở dữ liệu dùng chung với Django:** mọi thay đổi chỉ-thêm; sao lưu và thử trên nhánh Neon trước.
2. **Bỏ API đăng nhập quá sớm** có thể làm bản Django cũ (nếu còn chạy) mất tương thích — xác nhận ở BE-01 / Q10.
3. **Nhiều bộ kiểm thử canh câu chữ, màu, route** sẽ trượt nếu mã mới vi phạm — đây là chủ ý; đọc `AGENTS.md` trước khi sửa.
4. **Bảng "Mốc nền" trong `AGENTS.md`** phải cập nhật trong cùng commit khi số đo đổi.
5. **Hai nguồn danh sách bài** (cơ sở dữ liệu và `curricula.json`): sau mỗi lần nạp dữ liệu phải kiểm lệch.
6. **Q8 chưa chốt** ⇒ chỉ nghiên cứu Arena, chưa viết mã.
7. **Chưa kiểm chứng trên môi trường thật:** mọi nhận định về DB thật, Neon, Render, VM Azure chỉ dựa trên mã và tài liệu.
