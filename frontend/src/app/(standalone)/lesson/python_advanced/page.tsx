import type { Metadata } from 'next';

import LofiWorkspace from '@/components/goc-hoc/LofiWorkspace';
import PageStyles from '@/components/PageStyles';
import { findCourse } from '@/lib/catalog';
import { lessonSeoDescription } from '@/lib/seo-copy';

export const metadata: Metadata = {
  title: 'Bài học Advanced Python – Programming EDU',
  description: lessonSeoDescription(findCourse('python_advanced')?.lessons ?? 0),
};

export default async function LessonPythonAdvancedPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { lesson } = await searchParams;
  const index = Number(lesson);
  const lessonIdx =
    lesson === undefined || !Number.isInteger(index) || index < 0 ? 0 : index;
  return (
    <>
      <PageStyles hrefs={[]} />
      <LofiWorkspace initialScreen="lesson" initialLessonIdx={lessonIdx} />
    </>
  );
}
