import type { Metadata } from 'next';

import StaticLessonPage from '@/components/python-studio/StaticLessonPage';

export const metadata: Metadata = {
  title: 'Bài học Database Advanced – Programming EDU',
  description:
    'Database Advanced: 96 bài đi sâu vào lập luận truy vấn, storage, bộ tối ưu, giao dịch, hệ phân tán và PostgreSQL.',
};

export default function DatabaseAdvancedLessonPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  return <StaticLessonPage courseId="database_advanced" searchParams={searchParams} />;
}
