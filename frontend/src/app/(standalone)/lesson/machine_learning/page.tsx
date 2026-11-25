import type { Metadata } from 'next';

import StaticLessonPage from '@/components/python-studio/StaticLessonPage';

export const metadata: Metadata = {
  title: 'Bài học Machine Learning – Programming EDU',
  description:
    'Machine Learning: 28 bài từ biểu diễn dữ liệu, hồi quy tới mạng nơ-ron và cây quyết định, chạy NumPy ngay trong trình duyệt.',
};

export default function MachineLearningLessonPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  return <StaticLessonPage courseId="machine_learning" searchParams={searchParams} />;
}
