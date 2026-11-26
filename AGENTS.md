# pe_usth — hướng dẫn làm việc trong repo này

Nền tảng học lập trình: NestJS 11 + Prisma 7 + PostgreSQL (Neon), Next.js 16 + React 19,
giáo trình Python chạy trong trình duyệt bằng Pyodide. Chi tiết kiến trúc: [README.md](README.md).
**Vì sao chọn từng công nghệ, và nó đổi lấy gì** — kèm giá đã tra và so với các cách khác:
[docs/cong-nghe-va-ha-tang.md](docs/cong-nghe-va-ha-tang.md).

## Lệnh hay dùng

```bash
# Backend (từ thư mục gốc)
npm run typecheck          # phải sạch
npx jest --ci              # phải xanh
npm run start:dev          # cổng 5000

# Frontend
cd frontend && npm run typecheck && npm run lint && npm run build
cd frontend && npm run dev # cổng 3000

# Giáo trình đang chạy: python_advanced = 172 bài "Python cho Data Analyst" (pe-da)
py scripts/pe-da/build.py              # course.json -> scripts/pe-da/out/ + chép 80 ảnh
py scripts/pe-da/check.py --strict     # kiểm cấu trúc (CI chạy bản này)
py scripts/pe-da/sync_curricula.py     # chép giáo trình sang frontend/src/lib/curricula.json
python3 scripts/pe-doc/build.py        # 3 khoá tĩnh (Database, Database Advanced, ML) -> public/static/courses
python3 scripts/pe-doc/build.py --check   # bản dựng đã commit có khớp nguồn không (CI chạy bản này)
node scripts/giao-trinh.mjs            # NỘI DUNG chép ở đây có đúng Giao_Trinh_PE @ SHA ghim không (cần mạng)
node scripts/giao-trinh.mjs lay --sha <SHA|main>   # lấy nội dung mới từ Giao_Trinh_PE và ghim SHA
py scripts/pe-da/gen_traces.py         # SINH LẠI traces.json (bảng từng bước) — ~20 phút,
                                       # chỉ chạy khi code bài ĐỔI; cần numpy/pandas/matplotlib
                                       # trên máy, nên KHÔNG chạy được trên CI (xem bẫy dưới)
npm i --no-save pyodide@314.0.7
node scripts/pe-da/check-pyodide.mjs   # chạy code từng bài trong Pyodide, so với `expected`
node scripts/pe-da/check-practice.mjs  # chấm 415 ca BÀI TẬP + đòi 556 biến thể sai trượt
node scripts/pe-da/check-phu-van-phong.mjs  # chữ màn đọc nào bộ VĂN PHONG không thấy
# 516 câu trắc nghiệm: check.py đối chiếu với nguồn (kiem_trac_nghiem), không có bộ riêng
node scripts/check-perf.mjs            # kiểm BỘ ĐO ĐỘ HIỆU QUẢ trong studio-harness.py
node scripts/check-figures.mjs         # kiểm việc XUẤT HÌNH của studio-harness.py
node scripts/check-duong-toi.mjs       # BẢN ĐỒ TÍNH NĂNG: tính năng nào có người đi qua
node scripts/check-duong-toi.mjs --json  # bản máy đọc
node scripts/check-tai-nguyen-chet.mjs  # TỆP/COMPONENT nào KHÔNG ai tới được
node scripts/check-export-chet.mjs      # KÝ HIỆU nào được export ra mà không ai gọi
node scripts/check-da-nap.mjs           # BÀI nào đã dựng mà CHƯA nạp vào DB
node scripts/check-moc-nen.mjs          # BẢNG MỐC NỀN dưới đây có nói đúng không
node scripts/dem-ca-test.mjs           # SỐ CA theo TỪNG TỆP trong MỘT lượt chạy;
                                       # in đúng khuôn dòng phân rã ở bảng
                                       # mốc nền, dán thẳng vào được
node scripts/check-moc-chay.mjs         # MỐC phải CHẠY mới biết: frontend | backend | tracer | e2e | pyodide | practice
node scripts/check-doi-hoi.mjs          # KHỐI CODE màn đọc nào chưa có lời đòi
node scripts/check-nguong.mjs           # NGƯỠNG một chiều có ai nới ngược không
node scripts/check-wheel.mjs            # WHEEL vendored: thừa megabyte chết / thiếu gói bài cần
node scripts/backtest-theme.mjs        # BACKTEST giao diện: lofi/chiêm tinh × ngày/đêm × 1280/390 trên Chromium thật — tràn ngang + tương phản chữ (hợp thành alpha); cần máy chủ đang chạy + fixture public/__fx (xem script)
npx ts-node scripts/pheu-tien-do.ts    # PHỄU tiến độ theo sort_order (CHỈ ĐỌC, cần DATABASE_URL)
npx ts-node scripts/giu-chan.ts        # GIỮ CHÂN D1/D7/D30 (CHỈ ĐỌC, cần DATABASE_URL; chưa chạy với dữ liệu thật)
node scripts/check-da-deploy.mjs       # bản trên main ĐÃ LÊN production chưa (cần mạng)
node scripts/ablate.mjs --tep <t> --ve-head --lenh "<lệnh>"   # GIEO khiếm khuyết rồi
                                       # đếm ca đỏ; nó TỪ CHỐI in một con số khi không
                                       # chứng minh được bộ test đã CHẠY. Dùng nó thay
                                       # cho script shell ad-hoc: "0 đỏ" là con số dễ
                                       # giả nhất của vòng lặp (xem bẫy cuối file).

# pe-v4 (48 bài, 427 ca chấm) — GIỮ LẠI nhưng KHÔNG còn xuất bản; xem mục dưới
py scripts/pe-v4/build.py              # dựng lại 48 bài -> scripts/pe-v4/out/
py scripts/pe-v4/build_advanced.py     # sinh mini-game -> scripts/pe-v4/out-advanced/
py scripts/pe-v4/sync_curricula.py     # chép giáo trình sang frontend/src/lib/curricula.json
py scripts/pe-v4/anim/check.py         # kiểm 23 hình SVG + đếm hình được bài dùng
py scripts/pe-v4/anim/check.py --strict # thêm: hình chưa bài nào khai cũng là lỗi (CI chạy bản này)
npm i --no-save pyodide@314.0.7         # CẢ HAI lệnh dưới đều import pyodide
node scripts/pe-v4/check-advanced.mjs  # chấm thử game chạy code trong Pyodide
node scripts/pe-v4/check-pyodide.mjs   # chấm thử 427 ca bằng chính bộ chấm của trình duyệt
```

Trên Windows dùng `py`, không dùng `python` — `python` là stub của Microsoft Store.

## Nội dung giáo trình soạn ở Giao_Trinh_PE (từ 23/11/2026)

Chủ dự án quyết: mọi việc tổng hợp và thay đổi nội dung giáo trình làm ở repo
[Giao_Trinh_PE](https://github.com/ProgrammingEdu-USTH/Giao_Trinh_PE) (gói `PE_Python_DA/`), không ở repo này.
Ở đây chỉ còn BẢN CHÉP nội dung (danh sách tệp ở `PE_Python_DA/tools/anh-xa.json` bên đó) cộng phần của nền tảng:
`build.py`, `check.py`, các `check-*.mjs`, `gen_traces.py` + `traces.json`, `out/`, `da-nap.json` và việc nạp DB.

- **Đừng vá `scripts/pe-da/source/*`, sổ thuật ngữ, tài liệu `.md`, hình hay dữ liệu ở đây.**
  `node scripts/giao-trinh.mjs` so bản chép với SHA ghim ở `scripts/pe-da/giao-trinh.json` và ĐỎ nếu lệch. Đã ablate
  (ca 9 = 8 phép gieo/đối chứng + nền sạch): sửa 1 byte, xoá một tệp, thả tệp lạ vào thư mục được ánh xạ → thoát 1; ghim nhầm SHA
  cũ, SHA không tồn tại, ghim rỗng → thoát 2; tệp văn bản bị Windows đổi CRLF → vẫn 0 (đối chứng ngược, không đỏ oan).
- **Quy trình:** sửa và chạy cổng nội dung bên Giao_Trinh_PE (`check_vanphong.py --doi-chieu`, `gen_dulieu.py`; CI bên đó chạy lại)
  → merge → ở đây `node scripts/giao-trinh.mjs lay --sha <SHA đầy đủ | main>` → `build.py`, `gen_traces.py` nếu code bài đổi,
  các cổng của nền tảng, nạp DB, ghi biên nhận. Cổng văn phong đòi sửa `VAN-PHONG.md` mục 2 khi số câu giảng đổi: sửa BÊN ĐÓ.
- **Đọc ánh xạ TẠI SHA đã ghim**, không có bản khai thứ hai ở đây để lệch. Lấy nội dung bằng git: thư mục `PE_GIAO_TRINH` hoặc
  `../Giao_Trinh_PE` nếu chứa SHA; không thì `git fetch --depth 1` từ GitHub (repo công khai, không cần khoá). Thoát 1 = lệch,
  2 = không đo được — đừng gộp hai thứ: "lệch" là lỗi nội dung, "không đo được" là lỗi chỗ đứng.
- `check_vanphong.py` và `gen_dulieu.py` là bản chép của script bên đó và chạy ở đây không đổi hành vi (đo: văn phong 68/364, sổ mốc
  0 lỗi; sinh lại dữ liệu không đổi byte nào). Chúng nhận ra nơi mình đứng bằng sự có mặt của `build.py` ngay cạnh.
- **Giới hạn:** ghim không kiểm SHA có nằm trên `main` của repo nội dung hay không. CI của repo này mới chạy ở `master` (xem bẫy
  L3400), nên bước CI mới chưa chạy tự động ở `main` cho tới khi trigger được lật; chạy tay bằng lệnh trên. Thêm tệp vào giáo
  trình thì thêm vào `anh-xa.json` BÊN ĐÓ trước, rồi `lay`.

## Ba khoá tĩnh: Database, Database Advanced, Machine Learning (từ 25/11/2026)

Chủ dự án quyết đưa trọn giáo trình lên site, chưa thu phí. Ba khoá dùng CHUNG màn bài học với khoá Python
(`/lesson/<mã>?lesson=<chỉ số từ 0>`) nhưng **không đụng backend**: nội dung là tệp dưới
`frontend/public/static/courses/`, không ghi danh, không tạo tài khoản khách, không ghi nhật ký, không XP; tiến độ
và bản nháp nằm ở `localStorage`. Chỗ rẽ nhánh duy nhất là `useLessonData` theo `lib/static-courses.ts`.

- **Nội dung soạn ở Giao_Trinh_PE.** `scripts/pe-doc/source/` là bản chép tại các commit ghi ở `source/SOURCE.json`
  (`chinook_advanced.sql` cố ý không chép: không bài nào trỏ tới). Đừng sửa tay; chép lại rồi chạy
  `python3 scripts/pe-doc/build.py`. Chưa có cổng nào đối chiếu bản chép với repo nguồn như `giao-trinh.mjs` làm cho pe-da.
- Bản dựng bỏ hai mục viết cho người dựng runner ("Học trên web", "Biến thể và cách kiểm"). Bài SQL là bài đọc kèm
  câu tự luyện: **không chấm SQL trong trình duyệt**; fixture `.sql` được phát để chạy trên máy.
- Machine Learning có ca chấm: cả 28 lời giải mẫu đạt 6/6 trong Pyodide trên trình duyệt thật (25/11/2026, đo tay,
  chưa có cổng tự động).
- Trang bài SQL cũ và ba trang khoá `db_design*` đã **xoá** (25/11/2026, chủ dự án quyết): engine kéo-thả/chạy SQL,
  CSS của chúng và hai e2e `pe-run-sql`, `drag-regression`. `/lesson/db_design*` và `/courses/db_design*` chuyển về
  `/bookshelf/sql`. **Còn giữ** `public/static/js/lesson_content{,_tc,_nc}.js` vì `scripts/seed-lesson-questions.js`
  và trang `/card/[cardId]` đọc chúng; dữ liệu khoá `db_design*` trong DB không đụng tới.

## Quán Mây (`/quan-may`, từ 25/11/2026; bản 2 ngày 26/11/2026)

Một trang tĩnh tự chứa ở `frontend/public/quan-may/`, gốc là bản thử của nhóm (artifact `f3d755bb`, bản
`1795568344-61d5`): 10 tập, hai ngôn ngữ, bản đồ 56 môn. `/quan-may/xep-don` và `/quan-may/ket-hut-tien` chuyển sang
`#ep2`, `#ep3`. **Sửa ở repo này**; sửa artifact không tự sang web.

Tệp, theo thứ tự nạp: `iso.js` (hình khối đẳng trục dựng bằng SVG) · `quan-may.js` (khung và 10 tập) · `world.js` (sơ đồ
quán, câu đoán, bài ghép, sao, sổ quán) · `cases.js` + `case-a.js` · `case-b.js` · `case-c.js` (ba vụ việc nhiều chặng).

Luật chơi, sinh ra từ phản hồi người thử ngày 26/11 ("đáp án cứ câu nào dài nhất thì chọn", "chỉ bấm bấm rồi trôi qua"):

- Đáp án đúng **không được** dài hơn mọi đáp án còn lại, ở cả hai ngôn ngữ; thứ tự phương án trộn theo từng lượt chơi.
- Mỗi tập: đoán trước → làm → quyết định → ghép ba khái niệm. Chưa ghép xong thì tập chưa tính.
- Chọn sai trừ tiền quán và điểm; vài lựa chọn để lại dấu (`S.flags`) làm đổi đề của vụ việc sau. Dấu mới phải có
  dòng trong `LEDGER`.
- Không đi một đường: `NEEDS` chỉ gợi ý thứ tự tập; vụ việc mới khoá, tới khi xong các tập nó cần.
- Màn đoán và bài ghép dùng chung `run` với tập: đừng đặt trùng tên trường (tập 4 từng hỏng vì `run.guess`).
- Không gọi mạng, không tài khoản; tiến độ ở `localStorage` (`quanmay.v1`, `quanmay.runs.v1`). Phông tải từ Google Fonts.
- `e2e/unit/quan-may.test.mjs` chạy mọi script với DOM giả: nhiệm vụ và chặng nào cũng thắng được, cách làm theo phản
  xạ thì thua. Đổi luật chơi thì ca đó đổi theo. Chưa có e2e trình duyệt trong repo.

## Mốc nền

**Đo lại ngày 04/11/2026 — MỌI hàng, bằng cách tự chạy từng lệnh.** Đừng để tụt xuống
dưới mức này.

Ngày ở đây là thứ DUY NHẤT trong bảng mà `check-moc-nen.mjs` không kiểm được: nó đối
chiếu CON SỐ với cây mã, còn "lệnh này chạy lúc nào" thì không có dấu vết nào trong
cây mã để đối chiếu. Nên nó trôi được, và đã trôi — tiêu đề giữ 28/10 suốt một tuần
trong khi các hàng bên dưới đổi nhiều lần. Đổi một con số thì sửa luôn ngày.

Hai hàng KHÔNG xác minh được bằng cách chạy lệnh, và phải đọc đúng như thế:
"Đã nạp DB chưa" đọc một BIÊN NHẬN (nó nói lần nạp ĐÃ xảy ra, không nói DB hiện giờ
còn giữ đúng bản đó), và "Giáo trình pe-v4" là gói đã ẩn — chạy được nhưng không ai
học nó.

| Hạng mục | Mốc |
|---|---|
| Backend typecheck | sạch — nay phủ **cả `scripts/**/*.ts`** (10 script, 0 lỗi) |
| Backend test | **36 bộ, 532 ca**, tất cả đạt (chạy RIÊNG — xem bẫy tranh CPU) |
| Backend lint | 92 lỗi, 2 cảnh báo — **mốc trần trong CI là 100, chỉ được hạ** |
| Frontend typecheck | sạch |
| Frontend lint | 0 lỗi, **90 cảnh báo** (hạ từ 146 ngày 25/11/2026 khi xoá engine bài SQL cũ). CI chạy `npm run lint -- --max-warnings 90` — **trần, CHỈ ĐƯỢC HẠ**, và sổ ngưỡng canh chiều (`ci-lint-frontend`). Trước 08/11/2026 con số này không cổng nào canh: `eslint` thoát 0 khi chỉ có cảnh báo. Phân rã: 80 `no-unused-vars` (75 ở JS di sản) · 4 `no-unused-expressions` · 4 `no-page-custom-font` · 1 `no-img-element` · 1 chỉ thị `eslint-disable` thừa |
| Frontend unit test | `cd frontend && npm run test:unit` → **786 ca** / 76 tệp, tất cả đạt. 26/11/2026: +12 ca `lab-sql-ad01.test.mjs` (gồm 2 ca canh phụ thuộc vào CSS và bộ vẽ của Quán Mây: đổi tên lớp hay bỏ một hàm ở Quán Mây thì đỏ; ablate bỏ export windowAt → 1 đỏ, đổi tên lớp .bubble → 1 đỏ) (chấm SQL ở trình duyệt bằng sql.js THẬT trong node: đáp án mẫu đạt, cách viết khác đạt, SUM(DISTINCT) đúng ở dữ liệu của quán nhưng sai ở dữ liệu thử thêm, INNER JOIN/COALESCE/sai số cột/lỗi cú pháp bị bắt; ablate: bỏ bộ dữ liệu thử thêm → 2 đỏ / 10, tắt so giá trị → 3 đỏ / 10). 26/11/2026: +2 ca ở `consent-banner.test.mjs` (danh sách "ghi lại" gập trong `details` đóng sẵn; cột "KHÔNG ghi" không bị gập; ablate 2 phép gieo → 1 đỏ / 17 ca mỗi phép) |
| Frontend e2e | `cd frontend && npm run test:e2e` → **11 ca** / 2 tệp spec, tất cả đạt (Playwright 1.63 + Chromium; `webServer` tự build, ~2,5 phút). Hàng này MỚI có 08/11/2026 — xem bẫy "bộ e2e chưa bao giờ nằm trong bậc thang" |
| Bộ ghi vết | `py -I scripts/tracer/pe_tracer_test.py` → **69 phép kiểm**, trượt 0 |
| Giáo trình pe-v4 (ẩn) | 48 bài, 427 ca chấm, 176 biến thể sai + 48 khung trống đều trượt |
| Giáo trình pe-da (đang chạy) | **179 bài, 11 module**, 567 màn đọc, **537 câu trắc nghiệm**, 669 câu luyện tập, **143 bài tập được chấm / 480 ca**, 2 435 phút; 139 bài chạy trong trình duyệt / 15 hỗn hợp / 25 trên máy |
| pe-da chấm nội dung | `node scripts/pe-da/check-pyodide.mjs` → 154 bài, 420 đoạn code, **0 hỏng**, **0 cảnh báo**, 30–85 s (BIẾN THIÊN theo tải máy — xem bẫy "trần 5 giây là trần của đường khác"); trần pha 1 là **15 000 ms** (`/ide`), trần pha 2 là **5 000 ms** (ô chạy trong bài), và mỗi pha in biên riêng; **pha 2: 52/53 đáp án mẫu màn luyện tập chạy đúng, 1 ngoại lệ đã khai, 10 câu bỏ qua (bài chạy trên máy)** |
| pe-da chấm BÀI TẬP | `node scripts/pe-da/check-practice.mjs` → 143 bài, **480 ca đạt**, 773 biến thể sai đều trượt, **pha 3 cổng file dữ liệu 7 bài / 0 lỗi**, **pha 4: 2 372 ca trượt / 0 ca im lặng / 7 nhánh phản hồi**, **pha 5: 11/11 lỗi Python khớp traceback thật (tên + dòng)**, ~12 s |
| pe-da VĂN PHONG | `py -I scripts/pe-da/check_vanphong.py` → 179 bài, **68 lỗi · 364 cảnh báo**, dồn ở L3 24 (câu ≥ 3 dấu phẩy) · L1 21 (câu > 30 tiếng) · L8 17 (mật độ thuật ngữ) — đúng ba thứ người thử gọi là "văn phong lủng củng" và "bạn em đọc không hiểu". `--doi-chieu` (CI chạy bản này) so TỪNG LUẬT với `scripts/pe-da/van-phong-moc.json` → **18 luật, 0 lỗi**; nó KHÔNG đỏ vì những lỗi đang tồn, chỉ đỏ khi một luật TĂNG — và một LỖI đổi thành một CẢNH BÁO tính là siết, miễn TỔNG không phình |
| pe-da ĐỘ PHỦ văn phong | `node scripts/pe-da/check-phu-van-phong.mjs` → **99 chuỗi NGOÀI TẦM / 4 mục đã khai**, 0 lỗi. Bộ văn phong đọc `source/course.json` (cố ý), nên chữ do `build.py` SINH RA thì không luật nào thấy: **80 `figure.alt`** · 19 chuỗi của `diagram`. NỢ ẨN đã đo: L3 32 → 41 · L13 cb 217 → 229 · §4-A cb 23 → 30 · L14 0 → 3 lỗi — tức tín hiệu dừng báo THIẾU ~20%. Trần 99 CHỈ ĐƯỢC HẠ (108 → 99 ngày 08/11: 9 đoạn `paragraph.text` đã về gói nguồn) |
| pe-da bảng từng bước | `py scripts/pe-da/gen_traces.py` → **56 vết / 359 khối đủ điều kiện** (303 bỏ qua — bảng từng ghi 356/300, đã CŨ từ trước 04/11: dựng lại từ HEAD cũng ra 359/303, và `check-moc-nen` không đối chiếu hàng này; phần lớn vì không ra được câu dự đoán nào ĐÁNG hỏi); build.py `return 1` nếu lệch |
| Bộ đo độ hiệu quả | `node scripts/check-perf.mjs` → 9 ca, **0 hỏng** |
| Xuất hình cho người học | `node scripts/check-figures.mjs` → 16 ca, **0 hỏng** |
| Bản đồ tính năng | `node scripts/check-duong-toi.mjs` → **19 mục, 15 có đường tới, 4 còn tối (đã khai lý do)**, 0 lỗi |
| Tài nguyên chết | `node scripts/check-tai-nguyen-chet.mjs` → **3 mục chết, 3 khai giữ, 0 chưa khai**, 0 lỗi; quét JS/CSS tĩnh + component + **21 CSS module trong `src/`** |
| Export chết | `node scripts/check-export-chet.mjs` → **4 mục chết, 3 khai giữ, 0 chưa khai**, 0 lỗi; quét 105 tệp khai, 3 338 tệp tìm người dùng. **17 "export thừa"** khai NGOÀI TẦM có chủ đích — xem bẫy |
| Đã nạp DB chưa | `node scripts/check-da-nap.mjs` → **179/179 khớp, 0 bài chờ nạp**. Lần nạp gần nhất: **2026-11-23T15:36 UTC** (22:36 giờ Việt Nam) — HAI bài PY02 · PY03 (#310 A2-nhẹ: nói thẳng phần terminal/notebook chỉ cần khi học trên máy riêng, bỏ câu mở bài PY03 giả định đã tạo môi trường ảo), nạp bằng `--codes=PY02,PY03 --apply --backup=bak-py02-03-2026-11-23.json` sau khi chạy thử `--all` xác nhận ĐÚNG 2/179 bài lệch và 177 bài còn lại khớp DB từng byte; chạy thử lại sau khi nạp cho 0/179 lệch. Biên nhận `scripts/pe-da/da-nap.json` do chính `--apply` ghi SAU khi transaction commit. Lần nạp trước: 2026-11-19T07:08 UTC (PY01, #310 A1, `--codes=PY01`); trước nữa 2026-11-19T06:55 UTC (15 bài PD02 · PD03 · PD05 · PD07 · PD14 · PD15 · PD18 · PD23 · PD25 · PD26 · VZ02 · VZ03 · VZ12 · VZ14 · VZ22, `--codes=<15 mã>`); và 2026-11-16T17:41 UTC `--all`. CÓ biên nhận rồi thì một bài lệch là ĐỎ CỨNG (`check-da-nap` thoát 1, CI chạy nó) — số chờ nạp ĐÃ về 0, nên điều kiện để lật trigger `ci.yml` sang `main` về phía nội dung đã đủ. GIỚI HẠN KHÔNG ĐỔI: biên nhận nói lần nạp ĐÃ xảy ra, không nói DB hiện giờ còn giữ đúng bản đó (lần chạy thử `--all` ở trên là phép đo trực tiếp DB, và nó đo ngay trước và ngay sau lúc nạp). |
| Lời đòi ở màn đọc | `node scripts/check-doi-hoi.mjs` → **392/508 khối (77,2%) có một lời đòi**, 116 im lặng đều đã khai lý do, 0 lỗi |
| Ngưỡng một chiều | `node scripts/check-nguong.mjs` → **47 ngưỡng**, 0 nới ngược chiều, 0 lỗi |
| Đã deploy chưa | `node scripts/check-da-deploy.mjs` → cảnh báo nếu production lệch `tester/main`; đỏ khi gọi kèm `--doi-hoi-moi-nhat` |
| Wheel vendored | `node scripts/check-wheel.mjs` → **16 wheel · 5 gói bài khai · 16 sau đóng bao phụ thuộc**, 0 lỗi |
| Mốc phải CHẠY mới biết | `node scripts/check-moc-chay.mjs` → **8 mục** (frontend 786 · backend 36 bộ/532 · tracer 69 · e2e 11 · pyodide 154/420 · practice 143/480/773 · vanphong 68/364 · duongToi 19/15/4), 0 trượt, 0 lỗi; nó CHẠY chính tám lệnh đó nên THAY cả tám bước trong CI; mục `frontend` nay gọi `dem-ca-test.mjs` nên nó đối chiếu CẢ dòng phân rã, không chỉ con số tổng — MỘT THAM SỐ mỗi job, vì chúng ở bốn job chạy song song. Hai con số LINT cố ý ngoài tầm: chúng phải đi XUỐNG |
| Bảng mốc nền | `node scripts/check-moc-nen.mjs` → **20 mục đối chiếu được** (thêm `caDat` — BẢN SAO của số ca chấm ở hàng "pe-da chấm BÀI TẬP" — và `mucDoiChieu`, tức chính con số này), 0 lỗi; 3 nhóm khai NGOÀI TẦM |
| Runtime | Pyodide **314.0.7** (Python 3.14.2 · numpy 2.4.6 · pandas 3.0.2 · matplotlib 3.10.8), 30 MB |

**pe-v4 còn trong repo nhưng không còn xuất bản.** Khoá `python_advanced` nay là bộ 179
bài. `scripts/pe-v4/**`, 427 ca chấm và job CI của nó được GIỮ NGUYÊN, vì bộ chấm
input/output đó là thứ cố vấn dự án gọi là tính năng lõi — xoá đi là mất đường quay đầu
và mất bộ kiểm duy nhất chấm được code học viên. `frontend/public/static/js/studio-harness.py`
thì bộ 172 bài dùng lại NGUYÊN VẸN: chính nó đặt `MPLBACKEND=Agg` và móc `Figure`, nên
26 bài biểu đồ chạy được trong worker. Đừng dọn "cho gọn".

**Con số 681 phải đo lại mỗi lần thêm/bớt ca, không được đoán, và nó ĐÃ TRÔI 59 đơn vị.**
Đo lại 09/11/2026 bằng cách chạy TỪNG tệp: bảng này cộng ra **592** trong khi bộ chạy ra
**651**, tức nó đứng yên suốt chín vòng trong khi hàng "Frontend unit test" được sửa đúng
mỗi lần. `check-moc-chay` chỉ đối chiếu HÀNG, không đối chiếu bảng phân rã, nên nó xanh cả
chín vòng. Đây là lần THỨ HAI cùng con số này trôi — lần trước 5 đơn vị, lần này 59 —
và mười tệp test mới (`ablate-trung-thuc`, `dich-bam-vo-bai-hoc`, `khoa-roi-giao-trinh`,
`lesson-chrome-sticky`, `o-go-16px`, `trang-404`, `trang-loi`…) chưa bao giờ có mặt ở đây.
Phân rã hiện tại, ĐO chứ không cộng tay:
ablate-trung-thuc 19 · bookshelf-progress 5 · catalog-duration 2 · catalog-naming 4 · consent-banner 17 ·
course-resume 2 · danh-thuc-may-chu 6 · data-files 18 · dich-bam-vo-bai-hoc 8 · ds-contrast 18 ·
editor-load-gate 15 · feedback-link 9 · feedback-rank 3 · forum-xss 1 · giam-chuyen-dong 3 ·
giao-dien 7 · giao-dien-chuyen-dong 5 · giao-dien-monaco 4 · giao-dien-trang-chu 4 ·
goc-hoc-cho-so 10 · goc-hoc-escape 5 · goc-hoc-hang-nut 4 · goc-hoc-khung-cho 6 ·
goc-hoc-lo-trinh 9 · goc-hoc-man-con 3 · goc-hoc-nhan-mot 6 · goc-hoc-thanh-cuon 5 ·
hover-cam-ung 4 · ide-brief-code 12 · ide-gia-tri-nhieu-dong 3 · ide-handoff 6 ·
ide-output-scroll 6 · ide-partial-output 10 · ide-stop-autosave 27 · ide-thanh-cong-cu 4 ·
ide-trace 38 · ide-trace-nap-goi 5 · inline-code 7 · insert-gate-sync 2 · khoa-roi-giao-trinh 5 ·
lab-sql-ad01 12 · label-version 3 · learning-events 50 · lesson-back 19 · lesson-chrome-sticky 4 · lesson-load 7 ·
lien-ket-noi-bo 3 · loi-mang 3 · loi-python 6 · mcq-code 12 · mcq-next-after-wrong 23 · o-go-16px 10 ·
o-nhap-nhieu-dong 2 · phan-bai 8 · practice-contract 15 · practice-run 9 · prewarm-gate 7 · quan-may 18 ·
read-diagram 12 · read-guess 19 · read-trace 17 · read-try-it 23 · recap-recall 7 ·
review-quiz 34 · run-stale 15 · sandbox-cuon-ket-qua 6 · session-marker 5 · spaced-review 18 ·
static-courses 8 · studio-lesson 44 · tracer-limits 7 · tracer-web-sync 5 · trang-404 6 · trang-loi 12 ·
trap-leak 3 · worker-csp 7 = 786.
Lịch sử các lần số ca đổi ("Mốc trước là 736; …") nằm ở [BAY-DA-GAP.md](BAY-DA-GAP.md), phần 2 — mỗi dòng ghi VÌ SAO con số đổi. Khối phân rã ở trên là số HIỆN TẠI; thêm/bớt một tệp test thì sửa CẢ hàng mốc nền LẪN khối này (`node scripts/dem-ca-test.mjs` in đúng khuôn).

**Đếm phân rã bằng `sed`, đừng bằng `grep -E "^. pass"`** — dòng tổng kết của
`node --test` mở đầu bằng `ℹ` (multibyte), nên `^.` không khớp và vòng lặp trả về RỖNG
cho mọi file mà không báo lỗi. Cùng họ bẫy CRLF ghi ở `label-version` dưới đây:

```bash
cd frontend && for f in e2e/unit/*.test.mjs; do
  node --test --experimental-strip-types "$f" 2>&1 \
    | sed -n 's/.*[[:space:]]pass \([0-9]\+\)[[:space:]]*$/\1/p' | tail -1
done
```

Dòng này từng ghi **204** trong khi cây mã chỉ có 134 — một con số cũ trong bảng không phải
chú thích lỗi thời vô hại, nó là 70 ca test tưởng có mà không có. Thêm/bớt ca ⇒ chạy lệnh,
lấy số thật, sửa bảng TRONG CÙNG commit.

Nay `node scripts/check-moc-chay.mjs` làm đúng phép so đó bằng MỘT lệnh, và nó có trong
CI — vòng lặp lấy TỔNG thì dùng nó, vòng `sed` ở trên chỉ còn để lấy số TỪNG FILE.

Backend chạy riêng mới ra số đúng: chạy `npx jest --ci` song song với bộ test frontend thì
15/15 bộ báo trượt với 0 ca chạy — tranh CPU, không phải lỗi thật (xem bẫy "Test
`python-runner` trượt khi chạy CẢ BỘ" ở dưới).

**Và có một cách thứ HAI để ra số sai, khác hẳn tranh CPU: FIXTURE DÙNG CHUNG.** Ba bộ
backend đọc thẳng `scripts/pe-da/out/lessons.json` — `lesson-insert.spec.ts`,
`lesson-content-update.spec.ts`, `quizzes.service.spec.ts` — và frontend thì
`studio-lesson.test.mjs`. Chạy test trong lúc có ai đó `build.py` là đọc một file đang bị
ghi dở: đo được **10/470 ca đỏ** ngày 30/10/2026, cả 10 ở đúng ba bộ đó, và chạy lại sau khi
build xong thì xanh hết. Đọc gói THẬT là CỐ Ý (fixture bịa làm test nói dối — xem bẫy
`quizzes.service.spec.ts` ở dưới), nên cái giá là: **dựng xong rồi mới đo**, đừng đo song song.

Số lỗi lint backend phải đo bằng ĐÚNG lệnh CI dùng, KHÔNG bằng `npm run lint` (script đó mang
`--fix` nên vừa sửa file vừa làm con số lệch). Đo khác lệnh là lý do mốc này từng bị ghi 551
trong khi thực tế là 557:

```bash
npx eslint "{src,apps,libs,test}/**/*.ts" --ignore-pattern "src/generated/**"
```

## Vòng lặp tự kiểm

**Hàng đợi việc nằm ở Kanzo** (`http://localhost:4242`, project `pe-usth`), không ở
file markdown — xem mục đầu của LOOP.md để biết nếp dùng và vì sao đổi.

Agent chạy việc trong repo này đi theo [LOOP.md](LOOP.md): bậc thang lệnh nói đúng/sai mà
không cần người đọc, bốn luật dừng (luật thứ tư: nhiệm vụ tự mâu thuẫn ⇒ khai bất khả là kết quả hợp lệ), và bốn cách một vòng lặp nói dối (nới phép kiểm cho
xanh · đo song song lúc đang build · xanh vì không ai đi qua · test không có răng). Mục
tiêu là chạy tới xanh rồi mới bàn giao, không hỏi giữa chừng.

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

Chi tiết 184 bẫy (triệu chứng → nguyên nhân → số đã đo → ablate → giới hạn) nằm ở [BAY-DA-GAP.md](BAY-DA-GAP.md),
nguyên văn như trước 17/11/2026 (#227). Chúng không còn nạp vào mỗi phiên: chiếm 662 KB trong 714 KB của tệp này.
**Trước khi sửa một vùng, tìm tên vùng trong mục lục dưới đây rồi `Read` tệp lưu trữ từ số dòng ghi sau mũi tên** (L123 = dòng 123).
Bẫy mới: thêm vào cuối phần 1 của BAY-DA-GAP.md và thêm MỘT dòng vào mục lục này.

### Mười bốn luật lặp lại nhiều nhất (đọc kỹ — mỗi luật là một lỗi đã xảy ra từ hai lần trở lên)

1. **"0 đỏ" là con số dễ giả nhất.** Ablate (gỡ bản sửa, đếm số ca đỏ) bằng `node scripts/ablate.mjs`, và hỏi trước tiên: phép gieo có THẬT SỰ vào được tệp không? Các cách "0 đỏ" nói dối đã gặp: bộ test không chạy (`tong = 0`) · phép gieo khớp 0 hoặc nhiều chỗ · gieo THÊM chứ không THAY · đổi tên mang theo cả bản sửa · khoá trùng trong object literal (cái sau thắng) · bộ kiểm tự nói ngược (in 0 lỗi mà thoát khác 0) · chuỗi gieo ăn mất dấu `\` hoặc backtick.
2. **Một phép đếm trả 0 hoặc RỖNG là thứ phải nghi ngờ trước nhất.** Bẫy `grep -E "^. pass"` (dòng tổng của `node --test` mở đầu bằng `ℹ` multibyte), grep đếm cả chú thích, regex dựng từ template literal (`\s` thành chữ `s`), biên từ bắt `f-string` trong `string`. Đọc DÒNG TỔNG KẾT của công cụ, đừng đếm bằng grep.
3. **Đo GIÁ TRỊ TÍNH RA, không đọc CSS tĩnh.** Sàn 16px của ô soạn mã viết ở CSS nhưng style nội tuyến `fontSize: 13` thắng nó; `getBoundingClientRect` nói dối khi đang có hoạt ảnh vào màn (dùng `offsetHeight`); `getComputedStyle` không đo được `outline-style: auto`; vết DevTools trả lời câu "AI" chứ không câu "BAO LÂU" (LCP bị thổi gấp ba). Cổng canh sàn phải kiểm cả chỗ khác có thể GHI ĐÈ nó.
4. **"Dựng xong mà không có đường tới".** Test chứng minh code chạy đúng, không chứng minh có ai đi qua. Kiểm bằng `check-duong-toi`, `check-tai-nguyen-chet`, `check-export-chet`, và bằng cách MỞ TRANG RA XEM. Chiều ngược cũng thật: "có chỗ mount" không có nghĩa trang dùng được (`/lesson/python?demo=list` mount được nhưng dẫn vào ngõ cụt).
5. **Chú thích là lời KHAI, giá trị mới là sự THẬT.** Một con số cũ trong tài liệu không phải chú thích lỗi thời vô hại. Con số sống ở nhiều nơi trôi lệch nhau: số ca test, số bài chờ nạp, trần lint, số mục của chính cổng. Thêm/bớt ca thì sửa MỌI bản sao trong CÙNG commit; lấy số bằng `node scripts/dem-ca-test.mjs`.
6. **Một cổng chỉ chứng minh được mình bằng ablate.** Ghi số đỏ vào mô tả commit. Cổng kiểm theo HAI chiều: mục khai mà đã lỗi thời cũng là lỗi (danh sách ngoại lệ chỉ dài ra rồi thành chỗ giấu rác). Hai danh sách khai thay nhau được thì bản sửa không được cổng nào thi hành.
7. **Regex mơ hồ là cổng hỏng theo CẢ HAI chiều.** Neo đủ chữ xung quanh, đòi khớp ĐÚNG MỘT lần, và nếu khớp nhiều chỗ thì đó là LỖI chứ không lấy chỗ đầu. Luật văn phong dò bằng chữ thì mặc định bắt homograph/chuỗi con (`khoảng` danh từ, `Tính trung bình`, `thread` trong `thread-safe`): in ra ĐÚNG chuỗi đã khớp rồi đọc nghĩa trước khi tin một con số.
8. **Chữ MỚI của một lát sửa phải đi qua chính bộ luật nó đang hạ.** Dịch `process` sang "tiến trình" ở nửa đoạn thì L11 đỏ; tiêu đề cột "Việc cần làm" thì L4 đỏ; bảng mới thì L13 tăng. Ablate một luật CHỈ-CẢNH-BÁO phải đo bằng ratchet (`--doi-chieu`), không bằng dòng tổng lỗi. Cascade của luật TL: sửa §2 của VAN-PHONG.md trước, đo lại, rồi mới ghi dòng tổng.
9. **Công cụ shell ở đây có bẫy riêng.** Heredoc của công cụ Bash XỬ LÝ dấu gạch chéo ngược dù delimiter đã nháy; backtick trong chuỗi truyền qua `bash -c` là command substitution (chữ biến mất IM LẶNG). Script có `\` hoặc backtick thì ghi ra TỆP bằng công cụ Write rồi chạy tệp. Đầu dòng khác nhau theo từng tệp (CRLF/LF) — dò bằng đếm byte cho TỪNG tệp, đừng suy từ tệp cạnh nó; đọc bằng `newline=''`. Trên Windows dùng `py`, không dùng `python`.
10. **Chạy bộ kiểm nặng TỪNG LỆNH MỘT.** Máy chạy song song nhiều dự án: nối `&&` sau lint thì `next build` thoát 134 (V8 OOM), `npx jest` song song với test frontend báo đỏ giả. Mã thoát lạ sau một chuỗi lệnh là tín hiệu về TÀI NGUYÊN trước khi là tín hiệu về mã. Đọc dòng `code:` trước khi quy cho OOM (`MODULE_NOT_FOUND` cũng trông giống crash dump). Dựng xong rồi mới đo (không đo lúc đang `build.py`).
11. **Bê từ nhánh khác thì chạy CẢ bộ unit và các cổng TRƯỚC khi push, và port QUYẾT ĐỊNH, lấy SỐ của main.** Bê một tệp là viết đè hàng trăm commit sửa của main (4d5f86d làm đỏ 6 ca); token của nhánh `test` mang màu LẠNH trong khi main đã ấm; đếm người dùng trên bản dựng TRƯỚC khi đọc diff (500 dòng CSS cho một màn mà 0/179 bài dùng).
12. **Nội dung bài đọc từ DB, không từ `out/`.** Sửa nội dung chỉ tới người học sau khi chủ dự án nạp (`update-lesson-content.ts`, KHÔNG dùng seed khi đã có người học). `check-da-nap` đọc biên nhận: chưa có biên nhận thì cảnh báo, CÓ biên nhận rồi thì một bài lệch là ĐỎ CỨNG. Lật trigger `ci.yml` sang `main` chỉ khi số chờ nạp về 0. Gom nhiều lát nội dung rồi nạp một lần.
13. **Đầu ra của `git push` và CÂU của một cổng là PHÉP ĐO, không phải tiếng ồn.** Dòng `remote:` báo repo đã dời; `check-da-nap` in sẵn câu trả lời "mọi bài đã nạp" trong khi người ta lặp "153 bài chưa nạp". Chạy cổng canh việc rồi đọc CÂU, không đọc màu. Khi `check-da-deploy` cảnh báo thì production có thể đang chạy bản cũ dù CI xanh.
14. **Nghi phép đo trước khi nghi sản phẩm — nhất là khi một phép đo cho hai giá trị KHÔNG THỂ cùng đúng.** `color` và `border-color` cùng một `var()` mà khác nhau (transition đang chạy), 43,3px so với computed 44px (hoạt ảnh), fetch + so HTML trang render ở client (luôn bằng nhau theo cấu tạo), `ℹ` multibyte, tab renderer khác chạy rAF. Kiểm `response.status` trước khi kết luận về sản phẩm; một lượt mở trang bài học trên production bằng trình duyệt là một phép đo CÓ GHI (tạo tài khoản khách).

### Mục lục (184 bẫy, theo thứ tự trong tệp lưu trữ)

- 508 khối code màn đọc chia vào nhóm nào — nay KHAI RA, và bộ bắt-tất từng làm cổng RỖNG. → L12
- PHỄU TIẾN ĐỘ: `lesson_progress` KHÔNG phải mẫu số, và `scripts/` chưa bao giờ được typecheck. → L45
- 16 NGƯỠNG MỘT CHIỀU chỉ được khai bằng VĂN XUÔI — nay có cổng canh chiều. → L86
- `check-figures.mjs` KHÔNG in số ca — nên "16 ca" trong bảng không gì sinh ra được. → L134
- LỖI THỐNG TRỊ Ở LỚP NGOÀI CÙNG: push xong, CI xanh, và KHÔNG LÊN production. → L147
- "153 bài chưa nạp DB" là một câu tôi LẶP LẠI trong khi cổng của chính mình đã trả lời ngược. → L217
- "Pyodide 314 không có wheel" — SAI với 10/21 gói, và một phép ĐO đã tự thả 3,5 MB vào repo. → L228
- CÙNG MỘT DANH SÁCH WHEEL sống ở BỐN chỗ, và chỗ thứ tư làm cổng BÁO OAN. → L264
- CÂU NÓI VÌ SAO: 1 nhánh phản hồi quan trọng nhất chưa ca nào đi qua — và nó là câu người MỚI gặp nhiều nhất. → L289
- Một dữ kiện ĐÚNG mà im lặng về giới hạn của nó thì MỜI người đọc suy sai. → L322
- BẢNG MỐC NỀN LÀ TÍN HIỆU DỪNG, và nó đã nói sai HAI LẦN mà không gì bắt. → L343
- Nền tảng phải đuổi kịp thư viện mà giáo trình được kiểm trên đó — ĐÃ nâng, giữ thế. → L369
- `course.json` có HAI biến thể code cho cùng một khối, lấy nhầm là dạy sai. → L382
- Màn đọc có SÁU loại khối, và BỐN chỗ phải đổi cùng lúc. → L389
- "Hình" của bốn bài Plotly là file HTML 4,7 MB, không phải ảnh. → L404
- Danh sách module đổi theo bản Pyodide, và đổi theo CẢ HAI chiều. → L409
- `loadPackage` KHÔNG ném khi thiếu wheel — nó lặng lẽ tải từ CDN. → L422
- Lần chạy BỊ CẮT từng trả về đầu ra RỖNG — `terminate()` giết luôn thông điệp 'result'. → L434
- `loadPackage` KHÔNG import, nên 5,62 s của matplotlib từng ăn vào hạn 15 giây. → L447
- Cổng ẩn/hiện nút "Thử ngay trong IDE" từng ghi lại kiến trúc ĐÃ BỎ, và nó ngược hẳn. → L453
- Nhãn phiên bản Python trong giao diện từng ghi cứng 3.12, và nó là nhãn MẶC ĐỊNH. → L464
- Ô kết quả của bài học hứa chạy `solution.py` trong khi đầu ô ghi `main.py`. → L474
- Mở một bài học còn gọi BA lượt API TUẦN TỰ ở phía client — 3,7 giây trước khi có chữ. → L477
- Mở một bài học từng đi BA vòng DB tuần tự — và `.env.example` hứa một bộ cache KHÔNG tồn tại. → L494
- Kho quiz chấm Ở SERVER từng RỖNG HOÀN TOÀN — 0/172 bài có câu hỏi. → L515
- Vị trí đáp án trắc nghiệm từng được XOAY THEO CÔNG THỨC, không trộn — và nó làm 46 bài không đo được gì. → L557
- Khoá 172 bài từng KHÔNG có một ca chấm nào, và bốn chỗ cùng ghi lại giả định đó. → L600
- Hạn phiên nay KHÁC NHAU theo loại tài khoản, và đó là một lựa chọn an ninh có chủ đích. → L686
- Bộ chạy Python ở MÁY CHỦ đã bị xoá (25/10) — và chỗ duy nhất không được xoá cùng. → L716
- `build-tracer-source.mjs` HỎNG từ 25/10 tới 28/10, và bộ canh lệch không thấy được. → L754
- Hai trần của tracer từng được biện minh bằng hạ tầng ĐÃ XOÁ — và một trong hai làm MẤT HẲN vết. → L764
- Lớp ghi nhật ký lần thử: cổng duy nhất của nó từng ở CLIENT, và cổng ở client không phải bằng chứng đồng ý. → L808
- Request API ĐẦU TIÊN sau lúc máy chủ nghỉ mất hơn 25 giây, và trang không nói gì. → L847
- Nút "Try it Yourself" đã dựng từ lâu và KHÔNG có đường tới người học — nay đã nối. → L859
- Dải "mã đến từ link" từng hỏi cả khi link đến TỪ trang bài học. → L890
- Học viên từng không thấy hình do CHÍNH MÌNH vẽ — nay thấy, và đây là giá của nó. → L909
- Code Python của học viên gọi được API kèm cookie phiên — đã bịt, và `worker-src` KHÔNG phải thứ bịt được. → L931
- Worker Python là MODULE worker từ khi nâng lên Pyodide 314 — đừng quay về classic. → L951
- Cảnh báo thư viện đổ CHUNG vào stdout. → L957
- Câu ôn tập nằm ở trường RIÊNG, đếm thiếu là tưởng mất 21% bài tập. → L978
- Fixture test không giống dữ liệu thật thì test vô dụng. → L982
- Chấm bài nằm ở trình duyệt. → L987
- Bài tra theo `(course_id, sort_order)`, không theo `id`. → L990
- `style-src 'unsafe-inline'` còn hai nguyên nhân, không phải một. → L993
- Pyodide KHÔNG còn tải lại mỗi lần chạy, và không lấy từ CDN. → L997
- Hai nguồn danh sách bài. → L1008
- Frontend không còn đăng nhập, nhưng backend vẫn đòi JWT. → L1013
- `prisma/seed-courses.js` nay tạo khoá `python` RỖNG, không phải 40 bài. → L1021
- Lỗi lint backend KHÔNG phải lỗi định dạng, và nguồn gần như luôn là MỘT dòng `: any`. → L1025
- Khoá Advanced có ĐÚNG 3 bài cửa tự kiểm tra, không phải 5. → L1096
- Server biết "đã hoàn thành", không biết "đã nộp". → L1102
- Test `python-runner` trượt khi chạy CẢ BỘ nhưng chạy riêng thì đạt — là ĐỒNG HỒ, không phải rò trạng thái giữa các file. → L1107
- Kho quiz chỉ đọc khoá `text`/`label` của lựa chọn — câu "dự đoán" dùng `title`. → L1118
- Muốn ôn tập phải xong 2 bài, không phải 1. → L1125
- Hạn của tài khoản khách là cửa sổ TRƯỢT, và frontend từng ghi cứng 8 giờ — ĐÃ sửa. → L1130
- `apiFetch` gặp 401 là TỰ TẠO tài khoản khách — đừng gọi nó ở trang công khai. → L1155
- Câu nói VÌ SAO một ca chấm trượt từng là hàng NHỎ NHẤT và NHẠT NHẤT của bảng. → L1186
- NĂM người thử cùng báo "không có nút back" — mà cơ chế quay lại ĐÃ CÓ. → L1215
- Phản hồi "chữ quá nhỏ" có nguyên nhân là FONT, không phải `font-size`. → L1243
- Favicon là bản MẶC ĐỊNH của Vercel, và `metadata.icons` không cứu được. → L1264
- `withInlineCode` phải dùng CHUNG một bản — ô tổng kết từng in nguyên dấu backtick. → L1271
- Trắc nghiệm sai từng KHÔNG có đường đi tiếp — ĐÃ sửa, và trạng thái thứ ba không phải một trường mới. → L1281
- Ô kết quả từng không nói nổi nó là kết quả của BẢN CODE NÀO. → L1320
- Chữ TRONG sơ đồ không phóng to được, và đó là lỗi VẬT LIỆU chứ không phải `font-size`. → L1351
- BẢNG TỪNG BƯỚC của màn đọc: vết TÍNH SẴN, và nó KHÔNG sinh được trong build.py. → L1395
- CƠ CHẾ NẠP FILE DỮ LIỆU: `step_4.dataFiles`, cấp BÀI, chỉ TÊN — và NĂM chỗ phải đi cùng lúc. → L1475
- Luật 6 của cổng INSERT từng TỪ CHỐI OAN, và lối thoát duy nhất là bịa nội dung. → L1517
- Đường nhập tài liệu đã bỏ nhánh AI, nhưng 7 biến `GEMINI_*` phải Ở LẠI. → L1534
- 32 bài đã đổi miền sang quán cà phê, và `topics` CỐ Ý không đổi theo. → L1560
- MỘT KÝ TỰ VÔ HÌNH CHẶN ĐƯỢC CẢ KHOÁ: Postgres `jsonb` không lưu được U+0000. → L1578
- CẢ HỆ THỐNG QUIZ CHẤM Ở MÁY CHỦ từng không có đường tới người học — nay có MỘT. → L1624
- MODULE 11 là module đầu tiên có bài tập THẬT SỰ ĐỌC FILE, và đó là bằng chứng thiếu. → L1649
- Thêm một module làm ĐỎ 14 ca ở 6 file, và cả 14 đều là con số ghi cứng. → L1670
- 508/508 khối code ở màn đọc đều IN SẴN đáp án ngay dưới — nay 262 khối hỏi trước. → L1686
- Tải lại trang giữa lúc làm đề ôn là MẤT ĐỀ VĨNH VIỄN — đã sửa, lần thứ CHÍN. → L1734
- 130 bài có ca chấm, 0 bài có một VÍ DỤ ĐÃ CHẠY — nay cả 130 đều có. → L1757
- BA bài có màn ĐỌC ở quán cà phê nhưng ĐỀ BÀI TẬP ở miền cũ — ĐÃ sửa, 0 bài còn lệch. → L1819
- BẢN ĐỒ TÍNH NĂNG: biến "dựng xong mà không có đường tới" từ lỗi IM LẶNG thành một dòng khai báo. → L1839
- 63 đáp án mẫu của màn LUYỆN TẬP chưa bộ kiểm nào từng chạy — nay chạy, và một cái hỏng. → L1870
- TÁM bài `free` cuối cùng còn chấm được nay đã có ca chấm — và cái giá là chúng bị KHOÁ. → L1895
- 417 KB TÀI NGUYÊN CHẾT đang được PHỤC VỤ RA INTERNET — đã xoá, và chỗ nó từng đứng nay có một cổng. → L1916
- LẦN THỨ MƯỜI HAI của lỗi thống trị, và lần này cổ chai KHÔNG ở code: 153 bài dựng xong mà chưa ai nạp. → L1968
- KHỐI CODE ĐỔI SANG BẢNG NÂU ẤM — theme lofi chill, và production từng bị lùi khỏi nó có chủ đích. → L2011
- BẢNG 74 TOKEN `--ds-*` LẤY NGUYÊN TỪ NHÁNH `test` — và câu "bê cả nhánh" là câu tôi đóng khung SAI. → L2190
- TÔI CHÉP MỘT CÂU THAY VÌ ĐỌC MỘT GIÁ TRỊ — và câu đó sai với chính file chứa nó. → L2235
- HAI CHIP CỦA TRANG CHỦ TRƯỢT AA, và nguyên nhân là một KHUÔN chứ không phải hai dòng CSS. → L2248
- TRANG KHOÁ HỌC: grep nói 128 chỗ brand, trình duyệt nói 22 — và chỉ 22 mới đáng sửa. → L2273
- BÊ GIAO DIỆN TỪ NHÁNH KHÁC LÀ BÊ CẢ NHỮNG BẢN SỬA MÀ NHÁNH ĐÓ CHƯA CÓ — và tôi push mà không chạy bậc thang. → L2306
- LIGHTPANDA: ĐÃ ĐỌC TÀI LIỆU VÀ BÁC cho việc ĐO GIAO DIỆN — nó KHÔNG có layout. → L2330
- `--ds-action` BẰNG ĐÚNG màu nút đang vẽ — "port nốt token" ở trang bài học là việc KHÔNG đổi một pixel nào. → L2358
- ĐO ĐỘ GIẬT CỦA TRANG CHỦ: ba cách đo đã nói dối, và một cách thì không. → L2372
- "GIẬT LAG LIÊN TỤC" KHÔNG TÁI HIỆN ĐƯỢC TRÊN CHÍNH MÁY ĐÓ — bảy hướng, bảy số, và hướng thứ bảy suýt thành một bản sửa SAI. → L2394
- THANG CHỮ BAN NGÀY BỊ CHIA ĐÔI: t1/t2 đã nâu, t3–t6 còn xanh lạnh — và t5 trượt AA trên giấy. → L2443
- SỐ CA TEST là con số ĐÃ TRÔI 70 ĐƠN VỊ, và nó vẫn chưa có ai canh cho tới hôm nay. → L2493
- L11 "GỌI CÙNG MỘT THỨ BẰNG HAI TÊN": 16 lỗi → 0, và BA trong số đó là CỔNG tự nói ngược chính nó. → L2597
- L4 + L5 + L6 về 0, nhưng 8/13 "lỗi" là CỔNG BÁO OAN — và một vòng trước đã ĐO ra điều đó rồi để nguyên vì tin là không sửa được. → L2648
- L12 "hedge chồng": CẢ 4 lỗi là cổng báo oan, và đây là lần thứ TƯ LIỀN một luật văn phong bắt HOMOGRAPH hoặc SUBSTRING. → L2693
- L8 ĐẾM MỖI CHỮ "thread" HAI LẦN, và dấu hiệu lộ ra đúng lúc in từng từ. → L2730
- CÙNG MỘT CẶP TERMBANK ĐẦU ĐỘC RULE THỨ BA, và lần này nó còn làm một GIÁ TRỊ trong termbank sai suốt từ đầu. → L2776
- BỌC BACKTICK 54 HẰNG PYTHON — và nó làm TB BẤT KHẢ, vì TB đòi đúng cái §4-A cấm. → L2830
- CHIP `code nội tuyến` KHÔNG CÓ NỀN — 1,003:1 so với thẻ, lần thứ TƯ của họ "trắng trên trắng". → L2873
- BỌC BACKTICK 85 TÊN KIỂU PYTHON — và hai phép đo đều ĐỔI kế hoạch tôi đã nói ra ở vòng trước. → L2917
- MỘT BÀI TẬP ĐƯỢC CHẤM BIẾN MẤT KHỎI NGUỒN THÌ CẢ BẬC THANG IM LẶNG — và cổng duy nhất thấy nó thì tự dặn "Sửa AGENTS.md". → L2963
- CÙNG MỘT CON SỐ SỐNG Ở HAI HÀNG CỦA BẢNG MỐC NỀN, và canh một hàng là đủ để cổng XANH trong khi hàng kia đã trôi. → L3018
- BỌC BACKTICK 22 CHỖ GỌI `plt`/`ax`/`fig` — và nó làm lộ ra luật THỨ HAI trong cùng file xét thuật ngữ nhóm A trên văn bản TRẦN, tức tự nói ngược §4-A. → L3046
- BỌC BACKTICK 50 CHỖ TÊN CLASS (`Figure` · `DataFrame` · `Axes` · `Series`) — và phép đo mật độ chip LẦN NÀY TĂNG, đúng như dự đoán, nhưng nó chỉ ra một khiếm khuyết ĐÃ CÓ. → L3098
- ĐẶC TẢ CỦA CHÍNH BỘ KIỂM MANG SỐ CỦA MỘT PHÉP ĐO KHÁC — và nó đã sai HAI LẦN ở hai mục khác nhau. → L3135
- BẢNG §11 CỦA ĐẶC TẢ LÀ MỘT BẢN CHÉP SỐ LỖI TỪNG LUẬT, và nó trôi gần hết — 10/17 hàng sai cùng lúc, dòng tổng lệch 2,4 LẦN. → L3182
- §8 CỦA ĐẶC TẢ GỘP NGUỒN VỚI BẢN PHÁT RA, nên nó công bố ĐÚNG CÁI BỆNH MÀ M2 ĐÃ CHỮA như thể còn nguyên. → L3233
- BỌC BACKTICK 21 CHỖ TÊN THƯ VIỆN VÀ LỚP — và phép đo lộ ra rằng SCRIPT IN NGỮ CẢNH CỦA TÔI ĐÃ OVER-REPORT suốt bốn lát. → L3280
- 9 NGOẠI LỆ "BẤT KHẢ" CỦA §4-A NGHỈ HẾT — danh sách khai đi từ 10 xuống 1, và bằng chứng mạnh nhất nằm NGAY TRONG chính các đoạn đó. → L3320
- L3 KHÔNG PHẢI TÁC PHẨM PHỤ CỦA §4-A — đo được 3, không phải 6–8 như tôi ước lượng bằng mắt. → L3357
- CI CHƯA BAO GIỜ CHẠY TRÊN `main` — trigger là `[master]` từ chính commit tạo file, và câu "đã có trong CI" tôi viết suốt mười vòng ĐÚNG VỚI FILE, SAI VỚI THỰC TẾ. → L3400
- BỐN VÙNG CUỘN ĐƯỢC MÀ KHÔNG CÓ DẤU HIỆU NÀO — người thử báo, và số đo nói nó không hiếm. → L3436
- "CON SỐ NÀY CHỈ GIẢM KHI NGƯỜI SOẠN THÊM NHÃN" — SAI với 17/19, và nó đẩy việc sang người không cần làm. → L3478
- BA HÌNH KHÁC NHAU DÙNG CHUNG MỘT ALT, và phép sinh alt thiếu theo một chiều CÓ HỆ THỐNG: nó tả đúng phần KHÔNG ĐỔI. → L3508
- TRẦN 5 GIÂY LÀ TRẦN CỦA ĐƯỜNG KHÁC — hai vòng trước tôi đi chỉnh NGƯỠNG mà không hỏi ngưỡng ấy LÀ NGƯỠNG CỦA CÁI GÌ. → L3541
- MỘT PHÉP ĐO BIẾN THIÊN 2,9× KHÔNG PHÁN XỬ ĐƯỢC MỘT ĐƯỜNG NẰM GIỮA KHOẢNG ẤY — và tôi đã chẩn đoán SAI hai lần trước khi đo đủ. → L3577
- HAI HÀNG CHẤM NỘI DUNG CỦA BẢNG MỐC NỀN LÀ SỐ CHẠY-MỚI-BIẾT MÀ KHÔNG CỔNG NÀO CANH — và chính việc gắn cổng đã lộ ra bộ chấm sinh ĐỎ GIẢ. → L3613
- 9 ĐOẠN VĂN GIẢNG RỜI `build.py` VỀ GÓI NGUỒN — 108 → 99 chuỗi ngoài tầm, và hàng rào đầu tiên của tôi KHÔNG RÀO GÌ. → L3640
- 108 CHUỖI VĂN XUÔI NGƯỜI HỌC ĐỌC NẰM NGOÀI TẦM BỘ VĂN PHONG — gồm CẢ 80 ALT TEXT, và lần này nới hàm thu chữ KHÔNG cứu được. → L3670
- Ô BẢNG LÀ ĐIỂM MÙ CỦA BỘ VĂN PHONG, và §2 kê "phải thành bảng" làm CÁCH SỬA — tức ratchet TỰ GAME ĐƯỢC, và tôi vừa game nó một cách vô tình. → L3705
- BỐN CÂU LIỆT KÊ THÀNH BẢNG (L3 36 → 32) — và việc tách bảng làm VỠ một bất biến của chính bộ văn phong, theo một chiều không ai đoán trước. → L3745
- LẦN THỨ BA CỦA LỖI BACKTICK, và AGENTS.md ĐÃ ĐOÁN TRƯỚC NÓ BẰNG CHỮ — hoá ra là 32 chuỗi trên SÁU đường, không phải một chỗ. → L3778
- EXPORT CHẾT: điểm mù tôi tự ghi hai vòng trước nay có cổng — và phép đo của tôi tố oan BỐN LẦN trước khi đứng, mỗi lần một lý do khác. → L3830
- CÁCH THỨ TƯ PHÉP ĐO HIỆU NĂNG NÓI DỐI: chính CÔNG CỤ ĐO thổi LCP lên GẤP BA, và gần hết phần thổi rơi đúng vào ô mà một vòng trước đã ghi làm VIỆC PHẢI LÀM. → L3874
- 28 NHÃN BÀI CHỒNG LÊN NHAU, và dòng sửa nó ĐÃ NẰM SẴN trong hàm từ đầu — nó chỉ bị dòng ngay trên làm cho vô nghĩa. → L3913
- "SIZE NHỎ PHÁT LÀ MẤT NÚT": 3/5 mục điều hướng nằm ngoài mép, và chúng KHÔNG mất — chúng đòi một cú vuốt mà người thử không tìm ra. → L3952
- BỘ e2e CHƯA BAO GIỜ NẰM TRONG BẬC THANG, và HAI ca của nó đã chết từ 4d5f86d — bốn ngày, không cổng nào thấy. → L4010
- ĐỢT ĐỔI 32 BÀI SANG MIỀN QUÁN CÀ PHÊ BỎ SÓT MỘT CỤM, và nó bỏ sót vì bộ kiểm xếp chúng ở bậc CẢNH BÁO — mà chiến dịch chỉ đọc bậc LỖI. → L4070
- PHẦN ĐUÔI CỦA ĐỢT ĐỔI MIỀN NẰM Ở MÀN LUYỆN TẬP, nơi L14 không đọc — và cùng lớp lỗi này nay đã xảy ra NĂM lần. → L4137
- "Ở GU ĐỔI CODE LẠI RẺ" — SAI theo chiều quan trọng: không cổng nào CHẠY code của GU, nên 36 `expected` của 12 bài chưa bao giờ được xác minh. → L4208
- CHÈN BẢNG SAU ĐOẠN, ĐỪNG THAY ĐOẠN BẰNG BẢNG — `chia_man` chẻ màn ở ĐOẠN VĂN sau code. → L4266
- TRANG 404 LÀ BẢN MẶC ĐỊNH CỦA NEXT: tiếng Anh, 0 liên kết, 0 CSS — và bookmark cũ của bản Django rơi đúng vào đó. → L4318
- `/lesson/python` MỜI GHI DANH vào một khoá không còn giáo trình — và quyết định 13/10 KHÔNG kể tên nó. → L4380
- `PrismaExceptionFilter`: 12 lỗi `any` làm hai dòng khai kiểu chỉ là CHỮ, và spec của nó có đúng MỘT ca `should be defined`. → L4451
- "0 ĐỎ" LÀ CON SỐ DỄ GIẢ NHẤT CỦA VÒNG LẶP — ba lần trong một phiên nó nghĩa là "không chạy", và lần đắt nhất suýt thành một khẳng định SAI VỀ BẢO MẬT. → L4521
- "CÓ CHỖ MOUNT" KHÔNG PHẢI "ĐANG SỐNG" — và tôi đã lấy cái thứ nhất làm lý lẽ giữ một trang không dùng được. → L4593
- §4-A 23 → 1: cụm định danh đóng lại, và một trong 23 chỗ KHÔNG phải định danh. → L4658
- `ablate.mjs` đọc được năm khuôn của bộ kiểm NỘI DUNG — và việc DÙNG nó lộ ra cách THỨ TƯ để "0 đỏ" nói dối: PHÉP GIEO VÔ HIỆU. → L4724
- DANH SÁCH MIỄN TRỪ CỦA L14 CÓ 14 MỤC VÀ 13 KHÔNG CÒN CẦN — chỉ dài ra, chưa bao giờ ngắn lại, và không luật nào canh chiều đó. → L4779
- NEO BỐN BÀI CƠ CHẾ-MÁY BẰNG MỘT CÂU VÍ VON — và bằng chứng nó làm được nằm trong chính corpus, không trong lý lẽ. → L4834
- BỐN BÀI PD ĐÃ NÓI VỀ SỔ ĐƠN VÀ DOANH THU CỦA QUÁN mà L14 không thấy — vì `đơn` cố ý không phải từ khoá. → L4884
- CT02 ĐÃ CÓ một bảng cho một danh sách rồi nhồi danh sách SONG SINH vào một câu — trong CÙNG bài, và EX04 nhồi ĐÚNG danh sách đó. → L4931
- HÀNG "pe-da VĂN PHONG" MANG BẢY CON SỐ MÀ KHÔNG CỔNG NÀO ĐỐI CHIẾU — mười lát liền tôi sửa chúng bằng tay, và một bản sao trong chính hàng ấy đã trôi. → L4992
- BÀI CÓ MẬT ĐỘ THUẬT NGỮ CAO NHẤT KHOÁ LÀ 23/29 LẦN GẶP THUỘC NHÓM B — nên sửa L13 hạ luôn L8, và chính bài đó đã tự chú giải rồi quay lại tiếng Anh. → L5081
- LÁT THỨ HAI CỦA KHUÔN "dịch nhóm B hạ luôn L8" — và nó chỉ ăn ở BA trong bốn ứng viên, phép đo nói trước bài nào. → L5154
- `eslint` THOÁT 0 KHI CHỈ CÓ CẢNH BÁO — nên con số "146 cảnh báo" của bảng mốc nền lên 1 000 thì CI vẫn XANH, và bốn tầng đều mù. → L5223
- KHÔNG CÓ BIÊN LỖI NÀO TRONG CẢ APP — và `reset()` một mình không cứu được lớp lỗi ĐÃ XẢY RA. → L5294
- HAI THANH STICKY CỦA VỎ BÀI HỌC CHƯA BAO GIỜ GHIM, và thứ phá chúng nằm ở một file khác. → L5382
- Ô SOẠN MÃ Ở 13px, VÀ ĐÓ LÀ MỘT LỖI iOS CHỨ KHÔNG PHẢI CHUYỆN CỠ CHỮ. → L5465
- LUẬT 44px CHO ĐÍCH BẤM LÀ LUẬT CỦA CHÍNH REPO, VÀ KHÔNG GÌ CANH NÓ — 21 rule `cursor: pointer`, 0 rule khai `min-height`. → L5547
- NĂM ĐÍCH BẤM DƯỚI 44px Ở HAI MODULE CÒN LẠI, và nút thấp nhất là "Xem lời giải mẫu" — CAO 24px. → L5613
- NĂM NÚT BƯỚC CỦA CODE VISUALIZER LÀ 40×36 — dưới sàn ở CẢ HAI trục, và chúng là đích bấm của chính tính năng đó. → L5675
- `.panel summary` KHÔNG PHẢI "CHƯA ĐO" — hai khối renderer của `SandboxScreen` chưa bao giờ hiện cho một người học nào, và cổng bắt đúng lỗi ấy thì KHÔNG CÓ TRONG CI. → L5789
- NÚT "▶ Chạy thử" CAO 38px — NẰM NGAY TRÊN một nút đã 44px từ hai vòng trước, cùng cột, cùng font. → L5876
- NÚT "XEM TỪNG BƯỚC" CAO 34px, và danh sách nợ 11 mục là một danh sách KHÔNG CÓ ĐƯỜNG ĐI. → L5941
- CỔNG 44px IN "0 LỖI" TRONG KHI NÓ PHỦ 31/46 SELECTOR — và 15 cái ngoài tầm gồm HỘP ĐỒNG Ý, vỏ MỌI màn bài học, và đề ôn tập chấm ở máy chủ. → L6007
- BỀ MẶT BRAND LỚN NHẤT CÒN LẠI LÀ THANH CUỘN — một gradient XANH → ĐỎ chạy gần hết mép phải, trên MỌI trang, và cổng lofi mù với nó vì nó nằm trong chính tệp ĐỊNH NGHĨA token. → L6109
- "KHÔNG DỰNG ĐƯỢC CỔNG VÌ ĐẮT" LÀ LỜI KHAI VỀ MỘT CÁCH LÀM — và tôi vừa viết đúng bài học ấy vào file này rồi mắc lại nó một vòng sau. → L6232
- NHÁNH `test` CÓ BỐN COMMIT GIAO DIỆN MỚI, và thứ đáng port NHẤT không nằm trong bất kỳ cái nào — nó là một khối CSS mà một lần REVERT đã cuốn đi. → L6298
- BỐN CONTROL ĐỨNG CÙNG MỘT HÀNG FLEX Ở HAI TỆP, và một cái khai 38px trong khi ba cái kia 42. → L6321
- SÁU RULE `:hover` KẸT SAU CÚ CHẠM — và khối guard từng CÓ, bị một lần revert cuốn đi. → L6350
- TÁCH PARSER CSS RA MODULE DÙNG CHUNG, vì chính `selCua` đã từng hỏng một lần. → L6371
- PHÉP ĐO ĐỌC GIỮA LÚC TRANSITION ĐANG CHẠY — lần thứ hai cùng họ, ở một thuộc tính mới. → L6388
- ABLATE 10 chiều → L6399
- PORT CẤU TRÚC TỪ NHÁNH `test`, KHÔNG PORT BẢNG MÀU — và lần thứ HAI liền phép đo chặn đúng chỗ đó. → L6422
- MỘT PHÉP ĐO ĐÃ XONG NHƯNG CHƯA LÀM — `:hover` không guard trên TOÀN `src/`. → L6488
- SOÁT NHÁNH `test` KHÉP LẠI: phần còn lại là 500 dòng cho một màn KHÔNG BÀI NÀO DÙNG. → L6505
- 20 RULE `:hover` CÒN LẠI VÀO GUARD, và cổng mở từ 2 tệp ra TOÀN `src/`. → L6519
- BẪY BACKTICK CẮN LẦN THỨ BA TRONG BA VÒNG, và nay nó có một luật. → L6586
- BẢNG XẾP HẠNG ĐÃ CẠN PHẦN CỦA VÒNG LẶP — soát lại 13 mục rồi mới tự chọn. → L6597
- PHÉP QUÉT ĐẦU CỦA TÔI BÁO OAN 10/11 CHỖ, và cả hai lỗi đều đã có tên trong file này. → L6612
- LUẬT PHẢI NHẮM VÀO *DỊCH CHUYỂN*, KHÔNG NHẮM MỌI `@keyframes` — và một ca cụ thể dạy điều đó. → L6624
- MỘT KHE THẬT: băng phản hồi sau khi chấm trượt 12px và không tắt được. → L6636
- ABLATE 10 chiều → L6649
- BUILD THOÁT 134 KHI CHẠY NỐI ĐUÔI SAU LINT, và đó KHÔNG phải lỗi mã. → L6665
- ĐO 320px (WCAG 1.4.10 Reflow) VÀ KHÔNG TÌM RA GÌ — một kết quả ÂM, ghi lại để không ai đo lại. → L6684
- BA CÂU LIỆT KÊ CỦA L3 THÀNH BẢNG — và chữ MỚI của tôi vi phạm chính luật đang hạ. → L6699
- `ablate.mjs` CHẠY LỆNH QUA cmd.exe TRÊN WINDOWS, không qua Git Bash — và cả hai cú pháp chuyển hướng đều hỏng. → L6732
- HAI LẦN OOM TRONG MỘT VÒNG, và cả hai ở lệnh chạy NỐI ĐUÔI. → L6742
- GIAO DIỆN THỨ HAI "ĐÀI THIÊN VĂN" — vòng B1: một TRỤC chọn riêng, token ở TỆP RIÊNG, và bản design KHÔNG phải thứ tôi tưởng. → L6751
- THEME CHIÊM TINH PHỦ TRANG CHỦ — và vì sao nó là lớp KHOÁC, không phải cảnh mới (vòng H1, 12/11/2026). → L6894
- THEME CHIÊM TINH Ở /ide, 404, TRANG LỖI — và MONACO KHÔNG ĐỌC CSS (vòng H2, 12/11/2026). → L6911

## Nạp dữ liệu vào DB — đừng mặc định dùng seed

Hai đường, chọn sai là xoá tiến độ của người đang học:

- **`scripts/seed-python-advanced-v4.ts --apply` — chỉ khi khoá CÒN TRỐNG.** Nó `deleteMany`
  cả 48 bài VÀ toàn bộ `lesson_progress` của khoá, rồi đặt mọi ghi danh về
  `completedLessons: 0, progress: 0`. Có sao lưu trước khi xoá, nhưng "sao lưu" không cứu được
  tester đang học dở. Sửa vài chữ trong 4 bài mà chạy cái này là xoá tiến độ của mọi người.
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
  # Nạp CẢ KHOÁ: dùng --all. Dựng chuỗi 172 mã bằng shell là câu lệnh chỉ chạy
  # được trên bash, mà người nạp dùng PowerShell — đã hỏng hai lần vì chuyện đó.
  npx ts-node scripts/update-lesson-content.ts --all --apply --backup=bak.json
  ```

  Luật chọn/so sánh nằm ở `src/course-admin/lesson-content-update.ts` (có test Jest).

  **Hạn transaction phải NÓI RA — mặc định 5 giây không nạp nổi cả khoá.** Lần đầu nạp 124
  bài (27/10/2026): 124 câu UPDATE trong một transaction tương tác chạy 5 140 ms trên Neon,
  Prisma huỷ ở mốc 5 000 ms. Transaction rollback nên DB không hỏng — nhưng file sao lưu ĐÃ
  ghi xong trước đó, nên nhìn vào thư mục backup thì tưởng đã nạp, và lỗi in ra chỉ là một
  đối tượng Prisma có `timeout: 5000`, không câu nào nói phải làm gì. Nay
  `$transaction(..., { timeout: 120_000, maxWait: 20_000 })`. 120 giây là 24× biên so với số
  đo thật (~5 s): hạn này canh TREO, không canh tốc độ, nên đặt sát số đo là tự tạo lỗi ngẫu
  nhiên vào ngày DB chậm hơn thường. `maxWait` là thời gian chờ LẤY kết nối từ pool, chuyện
  khác hẳn.

Sau MỌI lần nạp, vẫn phải chạy `py scripts/pe-v4/sync_curricula.py` — xem bẫy "Hai nguồn
danh sách bài" ở trên.

## Quy ước khi sửa

- Chú thích bằng tiếng Việt, giải thích **vì sao**, thường dẫn ra lỗi đang sửa. Đọc code quanh
  chỗ sắp sửa và viết cùng giọng.
- Test phải chứng minh được là nó bắt lỗi: gỡ bản sửa ra, test phải trượt. Ghi số ca trượt vào
  mô tả commit.
- Mỗi commit một việc, mô tả nói rõ triệu chứng → nguyên nhân → cách sửa.
- Thay đổi làm đổi hành vi người dùng thấy được thì nói thẳng trong mô tả commit.
