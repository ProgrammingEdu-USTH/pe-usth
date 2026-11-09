// BẢN ĐỒ TÍNH NĂNG — mỗi tính năng người học thấy được, kèm ĐƯỜNG TỚI nó.
//
// VÌ SAO FILE NÀY TỒN TẠI. Hình dạng lỗi thống trị của repo này là *dựng xong
// mà không có đường tới người dùng*, và nó đã xảy ra **MƯỜI lần**: bộ ghi vết
// không bài nào tới được · nút "Thử ngay trong IDE" không màn nào mount · 11
// route quiz chấm ở máy chủ mà frontend gọi 0 lần · renderer `task.io` dựng sẵn
// mà 0/130 bài phát dữ liệu · trắc nghiệm sai không có đường đi tiếp · … Mỗi
// lần, bộ kiểm vẫn XANH: test chứng minh code chạy đúng, không chứng minh có ai
// đi qua nó.
//
// `LOOP.md` đã đặt ra đúng câu hỏi — *"Mỗi việc phải trả lời: ai bấm vào nó, ở
// màn nào"* — nhưng câu hỏi nằm trong một file văn xuôi thì không ai bị chặn
// khi bỏ qua nó. File này là chỗ GIỮ CÂU TRẢ LỜI, và `check-duong-toi.mjs` là
// thứ bắt nó phải đúng.
//
// LUẬT: một tính năng có `toiThieu: 0` BẮT BUỘC phải khai `chuaCoDuongToi` kèm
// lý do. Tức "chưa ai đi qua" vẫn được phép tồn tại — nhưng phải NÓI RA, không
// được im lặng. Đó là toàn bộ giá trị của bộ này: biến một lỗi im lặng thành
// một dòng khai báo mà người sau đọc được.
//
// `dem(ctx)` phải ĐẾM TRÊN DỮ LIỆU THẬT (bản dựng 179 bài), không phải trên một
// hằng gõ tay — một con số gõ tay là thứ sẽ trôi, đúng bệnh mà AGENTS.md ghi ở
// mục mốc nền.

/**
 * @typedef {object} TinhNang
 * @property {string} id
 * @property {string} ten          Tên người đọc hiểu được.
 * @property {string} thucHien     File:kýHiệu — nơi LUẬT của tính năng sống.
 * @property {string} mount        File nơi người học GẶP nó. '' nếu chưa có.
 * @property {string} manHinh      Màn nào người học đang ở khi thấy nó.
 * @property {string} [duLieu]     Khoá dữ liệu nối phần thực hiện với mount,
 *   dùng khi hai nửa viết bằng HAI ngôn ngữ (build Python → renderer TSX) nên
 *   không bao giờ nhắc tên hàm của nhau.
 * @property {(ctx: object) => number} dem  Đếm chỗ người học thật sự tới được.
 * @property {number} toiThieu     Sàn. 0 thì phải khai `chuaCoDuongToi`.
 * @property {string} [chuaCoDuongToi] Lý do hôm nay chưa ai đi qua.
 */

/** Khối code của mọi màn đọc, phẳng ra. */
const khoiDoc = (ctx) =>
  ctx.bai.flatMap((l) => (l.content_json.step_1?.read ?? []).flat());

/** @type {TinhNang[]} */
export const BAN_DO = [
  {
    id: 'cong-du-doan-output',
    ten: 'Cổng dự đoán output — gõ dự đoán trước khi hiện ô "Kết quả:"',
    thucHien: 'frontend/src/lib/studio-lesson.ts:doanDuocOutput',
    mount: 'frontend/src/components/python-studio/screens/ReadScreen.tsx',
    manHinh: 'read',
    dem: (ctx) => khoiDoc(ctx).filter((b) => ctx.doanDuocOutput(b)).length,
    toiThieu: 100,
  },
  {
    id: 'bang-tung-buoc',
    ten: 'Bảng từng bước — vết tính sẵn, mở sau khi dự đoán',
    thucHien: 'scripts/pe-da/build.py:vet_cua_bai',
    mount: 'frontend/src/components/python-studio/screens/StepTrace.tsx',
    manHinh: 'read',
    duLieu: 'trace',
    dem: (ctx) => khoiDoc(ctx).filter((b) => b.trace).length,
    toiThieu: 30,
  },
  {
    id: 'o-vi-du-io',
    ten: 'Ô ví dụ đầu vào/đầu ra của bài tập',
    thucHien: 'scripts/pe-da/build.py:vi_du_io',
    mount: 'frontend/src/components/python-studio/screens/SandboxScreen.tsx',
    manHinh: 'sandbox',
    duLieu: 'task?.io',
    dem: (ctx) => ctx.bai.filter((l) => l.content_json.step_4?.task?.io).length,
    toiThieu: 100,
  },
  {
    id: 'nut-thu-trong-ide',
    ten: 'Nút "Thử ngay trong IDE" dưới ô Kết quả của màn đọc',
    thucHien: 'frontend/src/lib/studio-lesson.ts:maDeThu',
    mount: 'frontend/src/components/python-studio/screens/ReadScreen.tsx',
    manHinh: 'read',
    dem: (ctx) => khoiDoc(ctx).filter((b) => b.tryIt).length,
    toiThieu: 300,
  },
  {
    id: 'bai-tap-cham',
    ten: 'Bài tập chấm bằng ca chấm thật',
    thucHien: 'frontend/public/static/js/studio-harness.py:_studio_main',
    mount: 'frontend/src/components/python-studio/screens/SandboxScreen.tsx',
    manHinh: 'sandbox',
    duLieu: 'tests',
    dem: (ctx) => ctx.bai.filter((l) => l.content_json.step_4?.tests?.length).length,
    toiThieu: 120,
  },
  {
    id: 'trac-nghiem-cham',
    ten: 'Trắc nghiệm được chấm (tính vào XP)',
    thucHien: 'frontend/src/lib/studio-lesson.ts:screenVerdict',
    mount: 'frontend/src/components/python-studio/screens/McqScreen.tsx',
    manHinh: 'mcq',
    dem: (ctx) =>
      ctx.bai.reduce((n, l) => n + (l.content_json.step_2?.mcq?.length ?? 0), 0),
    toiThieu: 400,
  },
  {
    id: 'cong-luyen-tap',
    ten: 'Cổng luyện tập — phải viết thử mới xem được đáp án',
    thucHien: 'frontend/src/components/python-studio/screens/PracticeScreen.tsx',
    mount: 'frontend/src/components/python-studio/screens/PracticeScreen.tsx',
    manHinh: 'practice',
    dem: (ctx) =>
      ctx.bai.reduce((n, l) => n + (l.content_json.step_2?.practice?.length ?? 0), 0),
    toiThieu: 500,
  },
  {
    id: 'file-du-lieu',
    ten: 'Nạp file dữ liệu thật vào Pyodide trước khi chạy',
    thucHien: 'scripts/pe-da/build.py:KHOI_DU_LIEU',
    mount: 'frontend/public/static/js/studio-lesson.worker.js',
    manHinh: 'sandbox',
    duLieu: 'dataFiles',
    dem: (ctx) => ctx.bai.filter((l) => l.content_json.step_4?.dataFiles).length,
    toiThieu: 5,
  },
  {
    id: 'so-do-dom',
    ten: 'Sơ đồ dựng bằng DOM (chữ phóng to được, không phải PNG)',
    thucHien: 'scripts/pe-da/build.py:SO_DO_DOC',
    mount: 'frontend/src/components/python-studio/screens/ReadScreen.tsx',
    manHinh: 'read',
    duLieu: 'diagram',
    dem: (ctx) =>
      ctx.bai.flatMap((l) => (l.content_json.step_1?.read ?? []).flat())
        .filter((b) => b.type === 'diagram').length,
    toiThieu: 1,
  },
  {
    id: 'ba-phan',
    ten: 'Chia bài thành lý thuyết / thực hành / bài tập',
    thucHien: 'frontend/src/lib/studio-lesson.ts:phanCuaMan',
    mount: 'frontend/src/components/python-studio/screens/chrome.tsx',
    manHinh: 'mọi màn',
    dem: (ctx) => ctx.bai.length,
    toiThieu: 150,
  },

  {
    id: 'dap-an-mau-luyen-tap',
    ten: 'Màn luyện tập CHẠY ĐƯỢC: ô Chạy thử + so đầu ra với đáp án mẫu',
    thucHien: 'scripts/pe-da/check-pyodide.mjs:DAP_AN_MAU_KHONG_CHAY',
    mount: 'frontend/src/components/python-studio/screens/PracticeScreen.tsx',
    manHinh: 'practice',
    duLieu: 'answerCode',
    dem: (ctx) =>
      ctx.bai.reduce(
        (n, l) =>
          n + (l.content_json.step_2?.practice ?? []).filter((p) => p.answerCode).length,
        0,
      ),
    toiThieu: 50,
  },

  {
    id: 'alt-hinh',
    ten: 'Alt text THẬT cho hình (trình đọc màn hình đọc được nội dung biểu đồ)',
    thucHien: 'scripts/pe-da/build.py:alt_cua_hinh',
    mount: 'frontend/src/components/python-studio/screens/ReadScreen.tsx',
    manHinh: 'read',
    duLieu: 'alt',
    // Đếm hình có alt THẬT, không đếm hình mang chuỗi khuôn — 80/80 từng mang
    // khuôn, tức con số đó không nói lên gì.
    dem: (ctx) =>
      ctx.bai.reduce(
        (n, l) =>
          n +
          (l.content_json.step_1?.read ?? [])
            .flat()
            .filter(
              (b) =>
                b.type === 'figure' &&
                !String(b.alt ?? '').startsWith('Biểu đồ do đoạn code'),
            ).length,
        0,
      ),
    toiThieu: 50,
  },
  {
    id: 'cong-du-doan-hinh',
    ten: 'Cổng dự đoán hình — che biểu đồ tới khi người học nói trước nó trông thế nào',
    thucHien: 'frontend/src/lib/studio-lesson.ts:doanDuocHinh',
    mount: 'frontend/src/components/python-studio/screens/ReadScreen.tsx',
    manHinh: 'read',
    dem: (ctx) =>
      ctx.bai.reduce(
        (n, l) =>
          n +
          (l.content_json.step_1?.read ?? []).filter((man) =>
            man.some((b) => b.type === 'figure'),
          ).length,
        0,
      ),
    toiThieu: 50,
  },
  {
    id: 'on-gian-cach',
    ten: 'Ôn giãn cách — hỏi lại 1 câu ĐÃ SAI ở đầu một bài sau',
    thucHien: 'frontend/src/lib/spaced-review.ts:layCauOn',
    mount: 'frontend/src/components/python-studio/StudioLesson.tsx',
    manHinh: 'màn đầu',
    duLieu: 'cauOn',
    // Nguồn câu hỏi là kho trắc nghiệm của chính khoá — mỗi câu người học trả
    // lời sai là một ứng viên, nên "số chỗ tới được" là số câu trắc nghiệm.
    dem: (ctx) =>
      ctx.bai.reduce((n, l) => n + (l.content_json.step_2?.mcq?.length ?? 0), 0),
    toiThieu: 400,
  },

  // ---- ĐÃ DỰNG MÀ CHƯA CÓ ĐƯỜNG TỚI — khai ra, không để im lặng -----------
  {
    id: 'nut-thu-ide-man-brief',
    ten: 'Nút "Thử ngay trong IDE" ở màn brief/explain',
    thucHien: 'frontend/src/lib/ide-brief-code.ts:chayDuocTrongIde',
    mount: 'frontend/src/components/python-studio/screens/ExplainScreen.tsx',
    manHinh: 'brief · explain',
    dem: (ctx) =>
      ctx.bai.filter(
        (l) => l.content_json.step_1?.brief || l.content_json.step_1?.explain,
      ).length,
    toiThieu: 0,
    chuaCoDuongToi:
      'Khoá 179 bài không có màn `brief` hay `explain` nào (0/179) — hai màn đó ' +
      'là của pe-v4 đã ẩn. Cổng và 12 ca test vẫn xanh vì chúng chạy trên dữ ' +
      'liệu pe-v4. Sẽ sống lại nguyên vẹn vào ngày pe-v4 bật lại.',
  },
  {
    id: 'quiz-route-chua-dung',
    ten: '8/11 route của quizzes.controller.ts',
    thucHien: 'src/quizzes/quizzes.controller.ts',
    mount: '',
    manHinh: '—',
    dem: () => 0,
    toiThieu: 0,
    chuaCoDuongToi:
      'Chỉ 3 route có đường tới (phát đề, nộp, trạng thái) qua ô đề ôn ở màn ' +
      'tổng kết. 8 route còn lại chưa có giao diện nào gọi. Hệ quả đã biết: mỗi ' +
      'lần nộp tạo một `review_quiz_results`, nên nó SẼ chặn đề ôn hằng ngày ' +
      'trong ngày đó nếu sau này có giao diện cho route ấy.',
  },
  {
    // TÌM RA 09/11/2026 từ việc đo đích bấm, không từ một lượt soát bản đồ:
    // `.panel summary` được khai là "CHƯA ĐO" ở vòng trước, và phép đo nói nó
    // KHÔNG CÓ ĐƯỜNG TỚI. Hai khoá cách nhau MỘT CHỮ CÁI, hai gói khác nhau:
    //   `contract`  (số ít)  — 52/179 bài pe-da: hợp đồng CA CHẤM (mode,
    //                          inputVariable, resultVariable, returnType);
    //   `contracts` (số nhiều) — 0/179 pe-da, 44/48 pe-v4: mô tả HÀM cho người
    //                          đọc, tức thứ renderer này dựng;
    //   `files`     — 0/179 pe-da, 11/48 pe-v4. KHÁC `dataFiles` (9 bài): gói
    //                 pe-da cố ý chỉ nhúng TÊN file, không nhúng nội dung.
    // Tra `contract` rồi đọc ra 52 là kết luận "panel hiện ở 52 bài" — sai.
    id: 'panel-mo-ta-ham-va-file',
    ten: 'Hai panel gập của màn bài tập: Mô tả hàm · File trong thư mục bài',
    thucHien:
      'frontend/src/components/python-studio/screens/SandboxScreen.tsx:contracts',
    mount: 'frontend/src/components/python-studio/screens/SandboxScreen.tsx',
    manHinh: 'sandbox',
    // Đếm trên bản dựng THẬT, không trả hằng 0: ngày build phát `contracts`
    // hoặc `files` thì con số lên và chiều hai của luật đỏ ngay.
    dem: (ctx) =>
      ctx.bai.filter(
        (l) => l.content_json.step_4?.contracts || l.content_json.step_4?.files,
      ).length,
    toiThieu: 0,
    chuaCoDuongToi:
      'Cả hai panel đọc `four?.contracts` và `four?.files` — hai khoá mà khoá ' +
      '179 bài KHÔNG phát ra lần nào (0/179), chúng là đường của pe-v4 (44 và ' +
      '11 trong 48 bài). Đừng lẫn với `contract` SỐ ÍT, có ở 52/179 bài pe-da: ' +
      'đó là hợp đồng ca chấm, một thứ khác hẳn. Giữ mã vì nó sống lại nguyên ' +
      'vẹn vào ngày pe-v4 bật lại, cùng lý do AGENTS.md giữ `scripts/pe-v4/**`.',
  },
  {
    id: 'o-stdin',
    ten: 'Ô nhập dữ liệu (stdin) cho chương trình của người học',
    thucHien: 'frontend/src/components/python-studio/runner/types.ts:stdin',
    mount: '',
    manHinh: '—',
    dem: (ctx) =>
      khoiDoc(ctx).filter((b) => b.type === 'code' && /\binput\s*\(/.test(b.code)).length,
    toiThieu: 0,
    chuaCoDuongToi:
      'Hợp đồng worker đã có trường `stdin` và một chú thích hẹn làm UI, nhưng ' +
      '0/508 khối code của khoá dùng `input(`. Không có người dùng nào — đừng ' +
      'dựng UI cho nó trước khi có bài cần.',
  },
];
