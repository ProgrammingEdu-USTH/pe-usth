'use client';

import React from 'react';
import { LofiButton, LofiProgressBar } from '@/components/ui';
import { BookPropsDisplay, CourseEmblemIcon } from './BookPropsDisplay';
import type { BookshelfCourse } from './bookshelf-catalog';
import styles from './bookshelf.module.css';

export interface BookCoverStageProps {
  course: BookshelfCourse;
  doneCount: number;
  isExiting?: boolean;
  onOpenBook: () => void;
}

/**
 * Bước 1 của mỗi khoá: Bìa sách cứng ở trung tâm kèm 4 đồ vật đặc trưng hai bên.
 */
export function BookCoverStage({
  course,
  doneCount,
  isExiting = false,
  onOpenBook,
}: BookCoverStageProps) {
  const statusLabel =
    doneCount > 0 ? `Đã học ${doneCount}/${course.lessonCount} bài` : 'Sẵn sàng bắt đầu';

  return (
    <div
      className={`${styles.coverStage} ${
        isExiting ? styles.coverStageExiting : styles.coverStageAnimated
      }`}
    >
      <BookPropsDisplay slug={course.slug} side="left" />

      <div className={styles.coverCenterCol}>
        <button
          type="button"
          className={styles.hardCoverBtn}
          disabled={isExiting}
          onClick={onOpenBook}
          aria-label={`Mở bìa sách khoá học ${course.title}`}
        >
          <span className={styles.coverInnerFrame} aria-hidden="true" />
          <span className={styles.coverBindingTabs} aria-hidden="true">
            <span className={styles.coverBindingTab} />
            <span className={styles.coverBindingTab} />
            <span className={styles.coverBindingTab} />
            <span className={styles.coverBindingTab} />
          </span>
          <span className={styles.coverRibbon} aria-hidden="true" />

          <span className={styles.coverEmblem}>
            <CourseEmblemIcon slug={course.slug} size={40} />
          </span>

          <span className={styles.coverEyebrow}>KHOÁ HỌC</span>
          <h2 className={styles.coverTitle}>{course.title}</h2>
          <span className={styles.coverRule} aria-hidden="true" />
          <p className={styles.coverTagline}>{course.tagline}</p>

          <div className={styles.coverStatsLine}>
            {course.stageCount} chặng · {course.lessonCount} bài học · {course.durationLabel}
          </div>

          <div className={styles.coverProgWrap}>
            <LofiProgressBar
              value={doneCount}
              max={Math.max(1, course.lessonCount)}
              variant="amber"
            />
          </div>

          <span className={styles.coverStatsLine} style={{ marginTop: 8, marginBottom: 0 }}>
            {statusLabel}
          </span>

          {course.statusNote && <span className={styles.coverMockChip}>{course.statusNote}</span>}
        </button>

        <div className={styles.coverCtaWrap}>
          <LofiButton
            type="button"
            size="md"
            disabled={isExiting}
            className={styles.ctaThemedBtn}
            rightIcon={<span aria-hidden="true">→</span>}
            onClick={onOpenBook}
          >
            Mở sách
          </LofiButton>
        </div>
      </div>

      <BookPropsDisplay slug={course.slug} side="right" />
    </div>
  );
}
