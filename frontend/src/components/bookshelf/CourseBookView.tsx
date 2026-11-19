'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookshelfShell } from './BookshelfShell';
import { BookCoverStage } from './BookCoverStage';
import { BookSpreadStage } from './BookSpreadStage';
import { BookLessonsSpread } from './BookLessonsSpread';
import { findBookshelfCourse, type BookshelfSlug } from './bookshelf-catalog';
import {
  getInitialBookshelfProgress,
  loadBookshelfProgress,
  type CourseProgressSnapshot,
} from './bookshelf-progress';
import { markReturningBook } from './bookshelf-transition';

type BookStep = 'cover' | 'syllabus' | 'lessons';

export interface CourseBookViewProps {
  courseSlug: BookshelfSlug;
}

/**
 * Điều phối trải nghiệm mở sách 3 bước của từng khoá:
 * cover (Bìa sách + 4 đồ vật) → syllabus (Giới thiệu + Danh sách chặng) → lessons (Mục lục bài).
 */
export function CourseBookView({ courseSlug }: CourseBookViewProps) {
  const router = useRouter();
  const course = findBookshelfCourse(courseSlug);
  const totalLessons = course?.lessonCount ?? 0;

  const [step, setStep] = useState<BookStep>('cover');
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [isReturningToShelf, setIsReturningToShelf] = useState(false);
  const [progress, setProgress] = useState<CourseProgressSnapshot>(() =>
    getInitialBookshelfProgress(courseSlug, totalLessons),
  );
  const returnTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    router.prefetch('/bookshelf');
    return () => {
      if (returnTimerRef.current !== null) {
        window.clearTimeout(returnTimerRef.current);
      }
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [router]);

  // Đọc tham số ?step= và ?stage= sau khi hydrate để giữ SSG sạch hydration mismatch.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reqStep = params.get('step');
    const reqStage = Number(params.get('stage'));

    const t = setTimeout(() => {
      if (reqStep === 'syllabus' || reqStep === 'lessons' || reqStep === 'cover') {
        setStep(reqStep);
      }
      if (
        course &&
        Number.isInteger(reqStage) &&
        reqStage >= 1 &&
        reqStage <= course.stages.length
      ) {
        setActiveStageIdx(reqStage - 1);
      }
    }, 0);

    return () => clearTimeout(t);
  }, [course]);

  // Nạp tiến độ (mock hiện tại, sẵn sàng nối BE sau qua bookshelf-progress.ts).
  useEffect(() => {
    let cancelled = false;
    loadBookshelfProgress(courseSlug, totalLessons).then((snap) => {
      if (!cancelled) setProgress(snap);
    });
    return () => {
      cancelled = true;
    };
  }, [courseSlug, totalLessons]);

  if (!course) return null;

  const handleReturnToShelf = () => {
    if (isReturningToShelf) return;
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      router.push('/bookshelf');
      return;
    }

    markReturningBook(course.slug);
    router.prefetch('/bookshelf');
    setIsReturningToShelf(true);

    returnTimerRef.current = window.setTimeout(() => {
      router.push('/bookshelf');
    }, 220);

    fallbackTimerRef.current = window.setTimeout(() => {
      setIsReturningToShelf(false);
    }, 2000);
  };

  const featuredStageIndex = (() => {
    if (progress.currentLessonNo === null) return 0;
    const found = course.stages.findIndex((st) =>
      st.lessons.some((l) => l.no === progress.currentLessonNo),
    );
    return found >= 0 ? found : 0;
  })();

  const activeStage = course.stages[activeStageIdx] ?? course.stages[0];

  const shellMeta = (() => {
    if (step === 'cover') {
      return {
        backHref: undefined,
        onBack: handleReturnToShelf,
        backLabel: 'Về tủ sách',
        title: `Tủ sách · ${course.title}`,
        hintText: 'Chạm vào bìa để mở sách',
      };
    }
    if (step === 'syllabus') {
      return {
        backHref: undefined,
        onBack: () => setStep('cover'),
        backLabel: 'Về bìa sách',
        title: `Chương trình học · ${course.title}`,
        hintText: 'Chọn chặng để xem mục lục bài',
      };
    }
    return {
      backHref: undefined,
      onBack: () => setStep('syllabus'),
      backLabel: 'Về chương trình',
      title: `${course.title} · Mục lục bài học`,
      hintText: 'Nhấn vào một bài để bắt đầu học',
    };
  })();

  return (
    <BookshelfShell
      courseTheme={course.slug}
      backHref={shellMeta.backHref}
      onBack={shellMeta.onBack}
      backLabel={shellMeta.backLabel}
      title={shellMeta.title}
      hintText={shellMeta.hintText}
    >
      {step === 'cover' && (
        <BookCoverStage
          course={course}
          doneCount={progress.completedNos.length}
          isExiting={isReturningToShelf}
          onOpenBook={() => {
            if (!isReturningToShelf) setStep('syllabus');
          }}
        />
      )}

      {step === 'syllabus' && (
        <BookSpreadStage
          course={course}
          completedNos={progress.completedNos}
          currentLessonNo={progress.currentLessonNo}
          onSelectStage={(idx) => {
            setActiveStageIdx(idx);
            setStep('lessons');
          }}
          onStartFeaturedStage={() => {
            setActiveStageIdx(featuredStageIndex);
            setStep('lessons');
          }}
        />
      )}

      {step === 'lessons' && activeStage && (
        <BookLessonsSpread
          course={course}
          stage={activeStage}
          stageIndex={activeStageIdx}
          completedNos={progress.completedNos}
          currentLessonNo={progress.currentLessonNo}
          onChangeStage={(nextIdx) => {
            if (nextIdx >= 0 && nextIdx < course.stages.length) {
              setActiveStageIdx(nextIdx);
            }
          }}
          onBackToSyllabus={() => setStep('syllabus')}
        />
      )}
    </BookshelfShell>
  );
}
