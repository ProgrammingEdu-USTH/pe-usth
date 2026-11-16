// Bảng LỖI PYTHON → MỘT CÂU TIẾNG VIỆT, hiện dưới traceback ở ô kết quả của bài tập chấm.
//
// VÌ SAO CÓ BẢNG NÀY. Người mới học gặp `NameError: name 'cups' is not defined` và đọc nó như
// một bản án, không như một chỉ dẫn. Van der Kleij 2015 (40 nghiên cứu / 70 cỡ hiệu ứng): phản
// hồi CÓ GIẢI THÍCH d = 0,49, chỉ nói đúng/sai 0,05 — mà traceback nguyên văn thuộc loại thứ hai
// với người chưa đọc được tiếng Anh kỹ thuật. Lấy ý từ "friendly errors" của CodeCombat (Aether),
// KHÔNG chép giọng của họ.
//
// BẢNG CHỈ GỒM LỖI ĐÃ ĐO — không phải 40 lỗi "có thể gặp". Đếm trong bản dựng 179 bài (code, kết
// quả mong đợi và lời giảng): ValueError 52 · TypeError 17 · KeyError 15 · IndentationError 13 ·
// TabError 12 · IndexError 10 · NameError 7 · FileNotFoundError 7 · SyntaxError 5 · AttributeError
// 2 · ZeroDivisionError 2. Một lời dịch chung chung cho lỗi chưa đo là loại phản hồi d ≈ 0,05, nên
// lỗi lạ thì trả `null` và để traceback nguyên văn — KHÔNG bịa một câu cho vừa khuôn.
//
// Hàm THUẦN, không import gì (test nạp thẳng tệp .ts bằng `node --test`).

export type LoiGiaiThich = {
  /** Tên lớp lỗi, như Python in ra. */
  ten: string;
  /** Số dòng trong mã của người học (dòng khung cuối cùng của traceback), nếu đọc được. */
  dong: number | null;
  /** MỘT câu: lỗi này nghĩa là gì và nên nhìn vào đâu. */
  cau: string;
};

export const BANG_LOI: Record<string, string> = {
  NameError:
    'Python chưa biết tên này: bạn chưa gán nó, gõ sai chính tả (chữ hoa chữ thường có phân biệt), hoặc dùng nó trước dòng gán.',
  TypeError:
    'Phép tính hoặc hàm nhận sai KIỂU dữ liệu — ví dụ cộng chuỗi với số, hoặc gọi hàm với sai số lượng đối số.',
  ValueError:
    'Giá trị có kiểu đúng nhưng nội dung không hợp lệ — ví dụ int("abc"), hoặc bỏ một giá trị không có trong danh sách.',
  KeyError:
    'Từ điển (hoặc bảng) không có khoá này: kiểm tra chính tả của khoá và xem khoá đã được thêm vào chưa.',
  IndexError:
    'Vị trí nằm ngoài danh sách: chỉ số bắt đầu từ 0, nên vị trí cuối cùng là len(...) - 1.',
  IndentationError:
    'Thụt lề sai: các dòng trong cùng một khối phải thụt đều nhau (thường 4 dấu cách), và dòng ngay sau dấu hai chấm phải thụt vào.',
  TabError:
    'Dấu tab và dấu cách bị trộn khi thụt lề: chỉ dùng một loại, nên dùng 4 dấu cách.',
  SyntaxError:
    'Câu lệnh viết sai cú pháp — thường là thiếu dấu ngoặc, dấu nháy hoặc dấu hai chấm. Xem dòng được báo và dòng ngay trước nó.',
  ZeroDivisionError: 'Có một phép chia cho 0: kiểm tra mẫu số trước khi chia.',
  AttributeError:
    'Đối tượng này không có thuộc tính hoặc phương thức đó: kiểm tra chính tả và xem nó đang là kiểu gì.',
  FileNotFoundError:
    'Không tìm thấy tệp: kiểm tra tên tệp (kể cả đuôi) và thư mục mà chương trình đang chạy.',
};

/**
 * Đọc chuỗi lỗi mà bộ chấm trả về (`RunResult.error`) và trả lời giải thích, hoặc `null` khi lỗi
 * không có trong bảng. Dòng cuối có dạng `Tên: thông điệp`; tiền tố module (`builtins.`) được bỏ.
 */
export function giaiThichLoi(error: string | undefined | null): LoiGiaiThich | null {
  if (!error) return null;
  const lines = error.split(/\r?\n/);
  let ten: string | null = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = /^(?:[\w.]+\.)?([A-Z]\w*(?:Error|Exception))\b/.exec(lines[i].trim());
    if (m) {
      ten = m[1];
      break;
    }
  }
  if (!ten || !Object.prototype.hasOwnProperty.call(BANG_LOI, ten)) return null;
  // CHỈ lấy `line N` của KHUNG (`File "main.py", line N`), không lấy `line N` bất kỳ: thông điệp của
  // IndentationError tự nó nói "…on line 1" ở dòng cuối, và bản đầu của hàm này đọc nhầm số đó
  // (dòng 1 thay vì 2) — chỉ lộ ra khi pha 5 của check-practice chạy traceback THẬT.
  const dongs = [...error.matchAll(/File "[^"]*", line (\d+)/g)];
  const dong = dongs.length ? Number(dongs[dongs.length - 1][1]) : null;
  return { ten, dong, cau: BANG_LOI[ten] };
}
