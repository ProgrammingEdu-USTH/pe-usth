import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import LofiWorkspace from '@/components/goc-hoc/LofiWorkspace';
import PageStyles from '@/components/PageStyles';
import { soBaiTuTruyVan } from '@/lib/nhap-bai';

const DB_COURSES = ['db_design', 'db_design_tc', 'db_design_nc'];

export const metadata: Metadata = {
  title: 'Thiết kế cơ sở dữ liệu – Programming EDU',
  description: 'Bài học thiết kế cơ sở dữ liệu và SQL tương tác trong trình duyệt.',
};

export default async function LessonDispatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { courseId } = await params;
  if (!DB_COURSES.includes(courseId)) notFound();

  const { lesson } = await searchParams;
  const lessonIdx = Math.max(0, soBaiTuTruyVan(lesson) - 1);

  return (
    <>
      <PageStyles hrefs={[]} />
      <LofiWorkspace courseId={courseId} initialScreen="lesson" initialLessonIdx={lessonIdx} />
    </>
  );
}
