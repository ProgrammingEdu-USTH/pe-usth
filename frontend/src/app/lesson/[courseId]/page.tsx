import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import LessonDbDesign from '@/components/LessonDbDesign';
import PageStyles from '@/components/PageStyles';

const DB_COURSES = ['db_design', 'db_design_tc', 'db_design_nc'];

export const metadata: Metadata = {
  title: 'Thiết kế cơ sở dữ liệu – Programming EDU',
  description: 'Bài học thiết kế cơ sở dữ liệu và SQL tương tác trong trình duyệt.',
};

export default async function LessonDispatchPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  if (!DB_COURSES.includes(courseId)) notFound();

  return (
    <>
      <PageStyles hrefs={['/static/css/lesson_db_design.css', '/static/css/edu-theme.css', '/static/css/edu-db.css']} />
      <LessonDbDesign courseId={courseId} />
    </>
  );
}
