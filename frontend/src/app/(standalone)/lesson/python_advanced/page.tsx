import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import StudioLesson from '@/components/python-studio/StudioLesson';
import { findCourse } from '@/lib/catalog';
import { soBaiTuTruyVan } from '@/lib/nhap-bai';

// Cùng lý do với /lesson/python: Lighthouse SEO trừ điểm vì thiếu meta
// description, mà tên bài chỉ có sau khi client tải content_json.
export const metadata: Metadata = {
  // Tên khoá lấy đúng tên đang hiển thị ở danh mục (src/lib/catalog.ts). Khoá
  // nay là giáo trình ĐỌC (pe-da), không còn 48 bài mini-game của
  // pe-v4 — mô tả cũ ghi "ghép cặp, đúng/sai, dò lỗi và trận Boss" là những
  // thứ bộ mới không có một cái nào.
  title: 'Bài học Python cho Data Analyst – Programming EDU',
  description:
    `Python cho Data Analyst: ${findCourse('python_advanced')?.lessons ?? 179} bài từ phép cộng đầu tiên tới NumPy, pandas `
    + 'và trực quan hoá — đọc lời giảng, xem code kèm kết quả rồi chạy lại ngay '
    + 'trong trình duyệt.',
};

const STUDIO_CSS = [
  '/static/css/edu-theme.css',
  '/static/css/studio-tokens.css',
  '/static/css/goc-hoc-lesson.css',
];

// Khoá "Python cho Data Analyst" (mã nội bộ python_advanced): giáo trình ĐỌC pe-da, nội dung
// là studio-lesson/v2 sinh bởi scripts/pe-da/build.py. Link từ trang khoá học
// truyền chỉ số bài 0-based; bảng lessons đánh số từ 1 (sort_order).
export default async function LessonPythonAdvancedPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { lesson } = await searchParams;
  // Phép ánh xạ 0-based → `sort_order` nay ở `lib/nhap-bai.ts`: trang lỗi cần
  // ĐÚNG phép tính này để xoá đúng bản nháp, và hai bản chép của nó sẽ trôi.
  const sortOrder = soBaiTuTruyVan(lesson);
  return (
    <>
      <PageStyles hrefs={STUDIO_CSS} />
      <StudioLesson
        courseId="python_advanced"
        courseName={findCourse('python_advanced')?.title ?? 'Python cho Data Analyst'}
        lessonNo={sortOrder}
      />
    </>
  );
}
