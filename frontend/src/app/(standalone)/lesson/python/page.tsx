import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import PageStyles from '@/components/PageStyles';
import PythonStudio from '@/components/python-studio/PythonStudio';
import { PYTHON_DEMO_PARAM } from '@/lib/python-studio';

// Trang này nay CHỈ còn một đường sống: `?demo=list`.
//
// Đo trên production 08/11/2026 (Chrome, tới trạng thái cuối sau 33,2 s cold
// start): `/lesson/python` không có `demo` hiện "Bài học Python — Đăng ký khóa
// học miễn phí để mở bài học và lưu tiến độ" kèm nút "Đăng ký khóa Python & bắt
// đầu", và 0 liên kết. Tức nó MỜI GHI DANH vào một khoá mà:
//   · `catalog.ts` không có (`/courses/python` đã là 404 từ 13/10/2026);
//   · `curricula.json` KHÔNG CÓ KHOÁ `python` — bốn khoá rời danh mục cùng đợt
//     (`cpp`, `java`, `htmlcss`, `db_design`) đều còn 4 học phần trong đó, còn
//     `python` thì không có mục nào. Nên kể cả khi hàng khoá còn trong DB, giao
//     diện không có giáo trình để vẽ và không có trang khoá để quay về.
// Bấm nút đó là GHI một hàng `enrollments` rồi đi vào một ngõ cụt.
//
// VÌ SAO KHÔNG XOÁ CẢ ROUTE: `?demo=list` là lối DUY NHẤT tới `PythonStudio`
// (bài "List & Mutability" dựng tay) — grep ra đúng một chỗ mount. Xoá route là
// biến một component đang sống thành code không ai tới được, đúng lỗi thống trị
// mà repo này có bốn cổng để bắt.
//
// VÌ SAO `notFound()` chứ không `redirect('/courses/python')`: route động
// `/lesson/[courseId]` đã chuyển hướng mã lạ về `/courses/<id>`, và `python`
// không có trong danh mục nên đích đó CŨNG là 404 — thêm một chặng chuyển hướng
// chỉ làm người học chờ thêm một vòng để tới đúng trang ấy.
export const metadata: Metadata = {
  title: 'Python Studio – Programming EDU',
  // Câu cũ ở đây hứa "Giáo trình Python 40 bài" — giáo trình đó KHÔNG CÒN
  // (khoá 40 bài pe-v3 đã rời cả danh mục lẫn `curricula.json`). Một thẻ
  // description nói về một khoá không tồn tại là tài liệu nói sai ra tới công
  // cụ tìm kiếm, nên nó nói về đường duy nhất còn sống.
  description:
    'Bài demo List & Mutability của Python Studio: chạy thử mã Python ngay '
    + 'trong trình duyệt. Bài này không ghi tiến độ.',
};

const STUDIO_CSS = [
  '/static/css/edu-theme.css',
  '/static/css/studio-tokens.css',
];

// Studio dựng tay "List & Mutability" không còn thuộc giáo trình nào: chỉ mở
// được bằng ?demo=list, và nó không ghi tiến độ. Tham số `lesson` cũ (chỉ số
// đếm từ 0 mà trang khoá v3 truyền vào) không còn ai gửi — khoá đó đã rời danh
// mục — nên nó cũng đi cùng nhánh 404.
export default async function LessonPythonPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const { demo } = await searchParams;
  if (demo !== PYTHON_DEMO_PARAM) notFound();

  return (
    <>
      <PageStyles hrefs={STUDIO_CSS} />
      <PythonStudio />
    </>
  );
}
