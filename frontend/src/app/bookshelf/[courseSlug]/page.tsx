import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BOOKSHELF_COURSES, findBookshelfCourse } from '@/components/bookshelf/bookshelf-catalog';
import { CourseBookView } from '@/components/bookshelf/CourseBookView';
import LofiDarkPageShell from '@/components/ui/LofiDarkPageShell';

export const dynamicParams = false;

export function generateStaticParams() {
  return BOOKSHELF_COURSES.map((course) => ({ courseSlug: course.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}): Promise<Metadata> {
  const course = findBookshelfCourse((await params).courseSlug);
  if (!course) return {};
  return {
    title: `${course.title} · Tủ sách — Programming EDU`,
    description: course.tagline,
  };
}

export default async function BookshelfCoursePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const course = findBookshelfCourse(courseSlug);
  if (!course) notFound();

  return (
    <LofiDarkPageShell>
      <CourseBookView courseSlug={course.slug} />
    </LofiDarkPageShell>
  );
}
