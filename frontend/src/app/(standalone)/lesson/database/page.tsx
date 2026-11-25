import type { Metadata } from 'next';

import StaticLessonPage from '@/components/python-studio/StaticLessonPage';

export const metadata: Metadata = {
  title: 'Bài học Database – Programming EDU',
  description:
    'Database: 85 bài từ toán nền, mô hình quan hệ và SQL tới thiết kế, giao dịch và hệ phân tán. Đọc, tự trả lời rồi đối chiếu đáp án.',
};

export default function DatabaseLessonPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  return <StaticLessonPage courseId="database" searchParams={searchParams} />;
}
