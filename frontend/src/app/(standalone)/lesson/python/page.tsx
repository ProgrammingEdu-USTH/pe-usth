import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// `/lesson/python` KHÔNG CÒN ĐƯỜNG NÀO SỐNG — kể cả `?demo=list`.
//
// Vòng trước (#139) đã cho nhánh không-demo trả 404 vì nó mời ghi danh vào một
// khoá không có giáo trình, nhưng GIỮ nhánh `?demo=list` với lý lẽ: "đó là lối
// DUY NHẤT tới `PythonStudio`, xoá route là biến một component đang sống thành
// code không ai tới được". Lý lẽ ấy giữ route vì component CÓ CHỖ MOUNT, không
// vì trang CHẠY ĐƯỢC. Đo thì nó không chạy.
//
// ĐO TRÊN PRODUCTION (Chrome, 08/11/2026, phiên khách đã có nên lượt đo không
// tạo thêm hàng nào) — `/lesson/python?demo=list` tới trạng thái cuối sau
// **39,3 giây** cold start rồi hiện:
//   · "Đăng ký khóa học miễn phí để lưu tiến độ" + nút "Đăng ký khóa Python &
//     bắt đầu" — ĐÚNG lời mời ghi danh vào ngõ cụt mà #139 vừa gỡ, chỉ nằm sâu
//     hơn một lớp;
//   · nút "Tiếp tục bước tiếp theo" ở trạng thái `disabled`, nên demo không đi
//     qua được bước 1;
//   · một liên kết thoát tới `/courses/python` — đã đo là 404.
//
// BA KHIẾM KHUYẾT NỐI NHAU, đọc từ cây mã:
//   1. `PythonStudio.load()` gọi `/api/user` + `/api/enrolled` ngay khi mount,
//      KHÔNG có cổng `hasStoredSession` — mà `apiFetch` gặp 401 thì
//      `ensureGuest()`, nên mỗi lượt bot quét URL này sinh một hàng
//      `@guest.local`;
//   2. cả demo bị chặn sau `!enrolled && !isAdmin` với khoá `python` — khoá
//      không có mục nào trong `curricula.json`, nên không ai ghi danh vào đó
//      một cách có nghĩa;
//   3. liên kết thoát trỏ vào một 404.
// Và trang tự khai "Bài demo… không ghi tiến độ", nên hai lượt API cùng cổng
// ghi-danh đều không mua gì cho nó.
//
// VÌ SAO GIỮ TỆP chứ không xoá thư mục: xoá thì `/lesson/python` rơi xuống
// route động `[courseId]`, mà route đó chuyển hướng Ở PHÍA CLIENT
// (`window.location.replace`) — thêm một lần nháy trang rồi mới tới 404. Một
// `notFound()` ở máy chủ cho đúng kết quả mà không có chặng đó, và nó là chỗ
// mang được số đo ở trên.
//
// `PythonStudio` (1 600 dòng) nay KHÔNG có đường nào tới, và đã khai vào
// `GIU_DU_CHET` của `scripts/check-tai-nguyen-chet.mjs` kèm lý do. Quyết định
// "xoá hẳn hay hồi sinh demo" là của chủ dự án — hồi sinh cần đúng ba việc ở
// trên, không chỉ bật lại route.
export const metadata: Metadata = {
  title: 'Programming EDU',
};

export default function LessonPythonPage() {
  notFound();
}
