// Logic thuần của lượt NẠP BÀI HỌC. Tách khỏi useLessonData.ts vì logic nằm
// trong hook là logic không có test — cùng lý lẽ với src/lib/ide-runner.ts.

/**
 * Lỗi này có phải "chưa ghi danh khoá học" (HTTP 403) hay không?
 *
 * VÌ SAO CẦN: ba lượt gọi lúc mở bài — `/api/user`, `/api/enrolled`,
 * `/content` — nay chạy SONG SONG (đo trên production: tuần tự mất 3,7 giây,
 * song song còn ~1,3 giây). Nhưng với người MỚI thì `/content` trả 403 vì họ
 * chưa ghi danh, và 403 ở đó KHÔNG phải lỗi: nhánh ghi danh ngay sau đó lo, rồi
 * mới gọi lại content. Phải phân biệt được 403-đó-là-bình-thường với mọi lỗi
 * khác, nếu không thì một 500 thật cũng bị nuốt và người học nhìn màn hình trống
 * mà không ai biết vì sao.
 *
 * Nhận diện bằng HAI dấu hiệu vì mỗi dấu hiệu một mình đều mong manh: helper
 * `json()` dựng Error từ *thông điệp* của backend, nên khi backend có message
 * thì chuỗi "403" KHÔNG xuất hiện; còn khi không có message thì nó mới ghép
 * `(403)`. Thiếu một trong hai là lúc nào đó nuốt sai hoặc ném sai.
 */
export function la403ChuaGhiDanh(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // `\b403\b` chứ không `includes('403')`: một bài có sortOrder 403, hay một
  // thông điệp chứa "4030", không được tính là 403.
  if (/\b403\b/.test(error.message)) return true;
  // Câu của ForbiddenException trong lessons.service.ts. So không phân biệt dấu
  // hoa/thường, và chỉ lấy phần cốt lõi để sửa câu chữ không làm vỡ phép nhận.
  return /chưa đăng ký khóa học/i.test(error.message);
}

/**
 * Lỗi này có phải do không chạm được tới máy chủ API (chạy frontend độc lập
 * không bật backend, hoặc mất mạng) hay không?
 *
 * Phân biệt với lỗi HTTP thật từ máy chủ (`Không thể kết nối (500).`, 401, 404):
 * trình duyệt ném `TypeError` với thông điệp `Failed to fetch` (Chromium),
 * `NetworkError when attempting to fetch resource.` (Firefox) hoặc `Load failed`
 * (WebKit) khi kết nối TCP bị từ chối.
 */
export function laLoiMang(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /Failed to fetch|NetworkError|Load failed|fetch failed|ECONNREFUSED/i.test(
    error.message,
  );
}

import type { StudioLesson } from './studio-lesson';

/**
 * Nội dung bài dựng sẵn 5 màn đọc lofi (Lý thuyết sách mở → Ví dụ → Dự đoán kết
 * quả → Trắc nghiệm → Tóm tắt) khi chạy giao diện độc lập chưa bật backend.
 */
export function baiHocDuPhong(lessonNo = 1): {
  title: string;
  xpReward: number;
  content: StudioLesson;
} {
  const ma = `PY${String(Math.max(1, lessonNo)).padStart(2, '0')}`;
  const title =
    lessonNo === 1
      ? 'PY01 · Chạy một phép tính và đọc kết quả'
      : `${ma} · Bài học Python nền tảng (Bản xem trước)`;

  return {
    title,
    xpReward: 15,
    content: {
      schema: 'studio-lesson/v2',
      title,
      subtitle: 'Cơ bản · M1 · 15 phút',
      step_1: {
        heading: 'Lý thuyết & Ví dụ minh hoạ',
        read: [
          [
            {
              type: 'paragraph',
              text: 'Hôm nay quán cà phê lofi của bạn mở cửa ngày đầu. Buổi sáng bán 12 cốc, buổi chiều bán 9 cốc. Trong Python, bạn viết thẳng phép tính vào hàm `print(...)` để máy tính hộ và in kết quả ra màn hình — không cần khai báo kiểu dữ liệu rườm rà.',
            },
            {
              type: 'paragraph',
              text: 'Khi một con số xuất hiện lặp lại ở nhiều dòng, hãy đặt tên biến bằng dấu `=` (ví dụ `morning = 12`). Biến giống như nhãn dán trên lọ nguyên liệu: đổi số ở một dòng đầu thì toàn bộ công thức phía dưới tự tính lại.',
            },
            {
              type: 'diagram',
              title: 'So sánh tính trực tiếp và đặt tên biến',
              lanes: [
                {
                  label: 'Gõ trực tiếp trong `print`',
                  steps: ['print(12 + 9)', 'print(21)', '21'],
                  note: 'Nhanh cho một phép tính lẻ, nhưng khó đọc lại khi có nhiều ca bán.',
                },
                {
                  label: 'Đặt tên biến bằng dấu `=`',
                  steps: ['morning = 12; afternoon = 9', 'morning + afternoon', '21'],
                  note: 'Đọc tên biết ngay ý nghĩa; ngày mai chỉ cần sửa giá trị biến.',
                },
              ],
            },
            {
              type: 'table',
              headers: ['Toán tử', 'Ý nghĩa trong Python', 'Ví dụ tại quán', 'Kết quả'],
              rows: [
                ['`+` / `-`', 'Cộng / trừ hai giá trị số', '`12 + 9`', '`21`'],
                ['`*`', 'Nhân đơn giá với số lượng', '`21 * 15`', '`315`'],
                ['`/`', 'Chia lấy số thực (luôn có phần thập phân)', '`21 / 2`', '`10.5`'],
                ['`//`', 'Chia lấy phần nguyên (số khay đầy)', '`21 // 4`', '`5`'],
              ],
            },
          ],
          [
            {
              type: 'paragraph',
              text: 'Xem ví dụ chốt sổ cuối ngày dưới đây. Ba biến `morning`, `afternoon` và `price` lần lượt lưu số cốc buổi sáng, buổi chiều và đơn giá (nghìn đồng). Python thực thi từ trên xuống dưới và in báo cáo doanh thu:',
            },
            {
              type: 'code',
              code: 'morning = 12\nafternoon = 9\ncups = morning + afternoon\nrevenue = cups * 15\nprint("Buổi sáng:", morning)\nprint("Tổng số cốc:", cups)\nprint("Doanh thu:", revenue)',
              expected: 'Buổi sáng: 12\nTổng số cốc: 21\nDoanh thu: 315',
              tryIt: true,
              trace: {
                predict: {
                  kind: 'final',
                  prompt: 'Sau khi chạy hết 4 dòng gán, biến `revenue` mang giá trị bao nhiêu?',
                  answer: '315',
                  var: 'revenue',
                },
                rows: [
                  { line: 1, set: [['morning', '12']] },
                  { line: 2, set: [['afternoon', '9']] },
                  { line: 3, set: [['cups', '21']] },
                  { line: 4, set: [['revenue', '315']] },
                  { line: 5, out: 'Buổi sáng: 12' },
                  { line: 6, out: 'Tổng số cốc: 21' },
                  { line: 7, out: 'Doanh thu: 315' },
                ],
              },
            },
          ],
        ],
        predict: {
          question:
            'Dự đoán kết quả: Quán tặng thêm 2 cốc cho mỗi đơn combo. Đoạn mã dưới đây sẽ in ra con số nào?',
          code: 'cups = 14\ncombo = 3\ntotal = cups + combo * 2\nprint(total)',
          options: [
            {
              id: 'A',
              title: '20',
              detail:
                'Chính xác! Python nhân `combo * 2` trước (`3 * 2 = 6`), rồi mới cộng `14 + 6 = 20`.',
              correct: true,
            },
            {
              id: 'B',
              title: '34',
              detail:
                '34 là kết quả của `(14 + 3) * 2`. Khi không có ngoặc tròn, phép `*` có độ ưu tiên cao hơn phép `+`.',
            },
            {
              id: 'C',
              title: 'cups + combo * 2',
              detail:
                'Biểu thức không nằm trong dấu nháy kép nên Python tính ra số chứ không in nguyên văn tên biến.',
            },
          ],
        },
      },
      step_2: {
        mcq: [
          {
            question:
              'Buổi sáng quán bán được 10 cốc, buổi chiều bán được 7 cốc, mỗi cốc lãi 15 nghìn đồng. Lệnh `print` cuối cùng in ra giá trị nào?\n\nsang = 10\nchieu = 7\nprint((sang + chieu) * 15)',
            options: [
              {
                text: '255',
                detail:
                  'Đúng! Ngoặc tròn buộc Python tính `10 + 7 = 17` trước, sau đó nhân `17 * 15 = 255`.',
                correct: true,
              },
              {
                text: '115',
                detail:
                  '115 là `10 + 7 * 15` khi quên đặt dấu ngoặc tròn quanh `sang + chieu`.',
              },
              {
                text: '107',
                detail:
                  'Hai biến `sang` và `chieu` là số nguyên (`int`), nên dấu `+` thực hiện phép cộng chứ không ghép chữ.',
              },
            ],
            explanation:
              'Ngoặc tròn `(sang + chieu)` được tính trước thành `17`, rồi nhân với `15` cho kết quả `255`.',
          },
        ],
      },
    },
  };
}

