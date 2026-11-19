'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LofiButton, LofiFeedbackBanner } from '@/components/ui';
import type { BookshelfCourse, BookshelfLessonItem, BookshelfStage } from './bookshelf-catalog';
import styles from './bookshelf.module.css';

export interface BookLessonsSpreadProps {
  course: BookshelfCourse;
  stage: BookshelfStage;
  stageIndex: number;
  completedNos: number[];
  currentLessonNo: number | null;
  onChangeStage: (nextIndex: number) => void;
  onBackToSyllabus: () => void;
}

function buildLessonHref(baseHref: string | null, lesson: BookshelfLessonItem): string | null {
  if (!baseHref) return null;
  if (baseHref.includes('python_advanced')) {
    return `${baseHref}?lesson=${lesson.index}`;
  }
  return baseHref;
}

/**
 * Bước 3 của mỗi khoá: Sách mở mục lục bài học theo từng chặng
 * (tái sử dụng bố cục 2 trang từ mẫu Mục lục · Phần 1 / Phần 2 của Figma).
 */
export function BookLessonsSpread({
  course,
  stage,
  stageIndex,
  completedNos,
  currentLessonNo,
  onChangeStage,
  onBackToSyllabus,
}: BookLessonsSpreadProps) {
  const [selectedMockLesson, setSelectedMockLesson] = useState<BookshelfLessonItem | null>(null);
  const doneSet = new Set(completedNos);

  const mid = Math.ceil(stage.lessons.length / 2);
  const leftLessons = stage.lessons.slice(0, mid);
  const rightLessons = stage.lessons.slice(mid);

  const featuredLesson =
    stage.lessons.find((l) => l.no === currentLessonNo) ??
    stage.lessons.find((l) => !doneSet.has(l.no)) ??
    stage.lessons[0];

  const renderLessonRow = (lesson: BookshelfLessonItem) => {
    const isDone = doneSet.has(lesson.no);
    const isCur = currentLessonNo === lesson.no && !isDone;
    const href = buildLessonHref(course.lessonBaseHref, lesson);

    const rowClass = `${styles.lessonRow} ${isCur ? styles.lessonRowCur : ''}`;
    const circleClass = `${styles.lessonCircle} ${
      isDone ? styles.lessonCircleDone : isCur ? styles.lessonCircleCur : ''
    }`;
    const stateClass = `${styles.lessonStateText} ${
      isDone ? styles.lessonStateDone : isCur ? styles.lessonStateCur : ''
    }`;

    const content = (
      <>
        <span className={styles.lessonRowLeft}>
          <span className={circleClass}>{isDone ? '✓' : lesson.no}</span>
          <span>
            <span className={styles.lessonTitle} style={{ display: 'block' }}>
              Bài {lesson.no} · {lesson.title}
            </span>
            <span className={styles.lessonMeta} style={{ display: 'block' }}>
              {lesson.code} · {lesson.minutes} phút
            </span>
          </span>
        </span>
        <span className={stateClass}>
          {isDone ? 'Đã xong' : isCur ? 'Đang học' : 'Sẵn sàng'}
        </span>
      </>
    );

    if (href) {
      return (
        <Link key={lesson.index} href={href} className={rowClass}>
          {content}
        </Link>
      );
    }

    return (
      <button
        key={lesson.index}
        type="button"
        className={rowClass}
        onClick={() => setSelectedMockLesson(lesson)}
      >
        {content}
      </button>
    );
  };

  const featuredHref = featuredLesson ? buildLessonHref(course.lessonBaseHref, featuredLesson) : null;

  return (
    <div className={styles.spreadWrapper}>
      <div className={styles.lessonStageControls}>
        <LofiButton
          type="button"
          variant="glass"
          size="sm"
          leftIcon={<span aria-hidden="true">←</span>}
          onClick={onBackToSyllabus}
        >
          Về danh sách chặng
        </LofiButton>

        <div className={styles.lessonStageNav}>
          <LofiButton
            type="button"
            variant="glass"
            size="sm"
            disabled={stageIndex <= 0}
            onClick={() => onChangeStage(stageIndex - 1)}
          >
            ← Chặng trước
          </LofiButton>
          <span className={styles.topHint} style={{ textAlign: 'center' }}>
            Chặng {stage.stageNumber}/{course.stages.length} · {stage.subtitle}
          </span>
          <LofiButton
            type="button"
            variant="glass"
            size="sm"
            disabled={stageIndex >= course.stages.length - 1}
            onClick={() => onChangeStage(stageIndex + 1)}
          >
            Chặng sau →
          </LofiButton>
        </div>
      </div>

      {selectedMockLesson && course.isMock && (
        <div style={{ width: '100%' }}>
          <LofiFeedbackBanner
            variant="info"
            title={`Bài ${selectedMockLesson.no}: ${selectedMockLesson.title}`}
            message="Nội dung bài học Machine Learning đang được cập nhật — bạn có thể xem trước khung chương trình tại đây."
            action={
              <LofiButton
                type="button"
                variant="glass"
                size="sm"
                onClick={() => setSelectedMockLesson(null)}
              >
                Đóng
              </LofiButton>
            }
          />
        </div>
      )}

      <div className={styles.bookSpread}>
        <section className={styles.pageHalf} aria-label="Mục lục phần 1">
          <div className={styles.pageEyebrow}>
            {stage.shortTitle} · Phần 1 ({leftLessons.length} bài)
          </div>
          <h2 className={styles.rightHeading}>Mục lục · Phần 1</h2>

          <div className={styles.lessonListScroll}>{leftLessons.map(renderLessonRow)}</div>

          <span className={styles.pageNumberLeft}>2</span>
        </section>

        <section className={styles.pageHalf} aria-label="Mục lục phần 2">
          <div className={styles.pageEyebrow}>
            {stage.shortTitle} · Phần 2 ({rightLessons.length} bài)
          </div>
          <h2 className={styles.rightHeading}>Mục lục · Phần 2</h2>

          <div className={styles.lessonListScroll}>
            {rightLessons.length > 0 ? (
              rightLessons.map(renderLessonRow)
            ) : (
              <p className={styles.ctaMinuteHint}>Tất cả bài của chặng này nằm ở trang bên trái.</p>
            )}
          </div>

          <span className={styles.pageNumberRight}>3</span>
        </section>
      </div>

      {featuredLesson && (
        <div className={styles.bottomActionBar}>
          {featuredHref ? (
            <Link href={featuredHref} className={styles.bottomActionLink}>
              <LofiButton
                type="button"
                size="md"
                className={styles.ctaThemedBtn}
                rightIcon={<span aria-hidden="true">→</span>}
              >
                Học Bài {featuredLesson.no} · {featuredLesson.title}
              </LofiButton>
            </Link>
          ) : (
            <LofiButton
              type="button"
              size="md"
              className={styles.ctaThemedBtn}
              rightIcon={<span aria-hidden="true">→</span>}
              onClick={() => setSelectedMockLesson(featuredLesson)}
            >
              Xem thử Bài {featuredLesson.no} · {featuredLesson.title}
            </LofiButton>
          )}
        </div>
      )}
    </div>
  );
}
