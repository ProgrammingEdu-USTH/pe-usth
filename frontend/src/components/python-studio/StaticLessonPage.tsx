// Khung chung của /lesson/database, /lesson/database_advanced và
// /lesson/machine_learning: cùng màn bài học và cùng CSS với khoá Python.
import PageStyles from '@/components/PageStyles';
import { soBaiTuTruyVan } from '@/lib/nhap-bai';
import { STATIC_COURSES, type StaticCourseId } from '@/lib/static-courses';

import StudioLesson from './StudioLesson';

const STUDIO_CSS = [
  '/static/css/edu-theme.css',
  '/static/css/studio-tokens.css',
  '/static/css/goc-hoc-lesson.css',
];

export default async function StaticLessonPage({
  courseId,
  searchParams,
}: {
  courseId: StaticCourseId;
  /** `?lesson=` đếm từ 0, như trang bài học Python. */
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { lesson } = await searchParams;
  const lessonNo = soBaiTuTruyVan(lesson);
  return (
    <>
      <PageStyles hrefs={STUDIO_CSS} />
      {/* `key`: sang bài khác là một màn mới, không giữ trạng thái bài trước. */}
      <StudioLesson
        key={lessonNo}
        courseId={courseId}
        courseName={STATIC_COURSES[courseId].title}
        lessonNo={lessonNo}
      />
    </>
  );
}
