'use client';

import React from 'react';
import { LofiButton, LofiProgressBar } from '@/components/ui';
import { CourseEmblemIcon } from './BookPropsDisplay';
import type { BookshelfCourse } from './bookshelf-catalog';
import styles from './bookshelf.module.css';

export interface BookSpreadStageProps {
  course: BookshelfCourse;
  completedNos: number[];
  currentLessonNo: number | null;
  onSelectStage: (stageIdx: number) => void;
  onStartFeaturedStage: () => void;
}

/**
 * Bước 2 của mỗi khoá: Sách mở 2 trang (Trang trái giới thiệu + 3 ô thống kê,
 * Trang phải danh sách các chặng cuộn được, không vẽ ổ khoá).
 */
export function BookSpreadStage({
  course,
  completedNos,
  currentLessonNo,
  onSelectStage,
  onStartFeaturedStage,
}: BookSpreadStageProps) {
  const doneSet = new Set(completedNos);
  const hasStarted = completedNos.length > 0;

  return (
    <div className={styles.spreadWrapper}>
      <div className={styles.bookSpread}>
        {/* Trang trái: Giới thiệu + bạn sẽ học được + 3 ô thống kê */}
        <section className={styles.pageHalf} aria-label="Giới thiệu khoá học">
          <div className={styles.pageEyebrow}>Giới thiệu khoá học</div>

          <div className={styles.spreadHeadRow}>
            <span className={styles.spreadCourseIcon}>
              <CourseEmblemIcon slug={course.slug} size={28} />
            </span>
            <div>
              <h2 className={styles.spreadTitle}>{course.title}</h2>
              <div className={styles.spreadSubMeta}>
                Khoá học · {course.stageCount} chặng
                {course.statusNote ? ` · ${course.statusNote}` : ''}
              </div>
            </div>
          </div>

          <div className={styles.paperDivider} />
          <p className={styles.spreadTagline}>{course.tagline}</p>

          <div className={styles.outcomesHeading}>Bạn sẽ học được</div>
          <ul className={styles.outcomesList}>
            {course.outcomes.map((item) => (
              <li key={item} className={styles.outcomeItem}>
                <span className={styles.outcomeTick} aria-hidden="true">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className={styles.statTiles}>
            <div className={styles.statTile}>
              <span className={styles.statTileNum}>{course.lessonCount}</span>
              <span className={styles.statTileLbl}>bài học</span>
            </div>
            <div className={styles.statTile}>
              <span className={styles.statTileNum}>{course.stageCount}</span>
              <span className={styles.statTileLbl}>chặng</span>
            </div>
            <div className={styles.statTile}>
              <span className={styles.statTileNum}>{course.durationLabel}</span>
              <span className={styles.statTileLbl}>thời lượng</span>
            </div>
          </div>

          <div className={styles.spreadCtaRow}>
            <LofiButton
              type="button"
              size="md"
              className={styles.paperPrimaryBtn}
              rightIcon={<span aria-hidden="true">→</span>}
              onClick={onStartFeaturedStage}
            >
              {hasStarted ? 'Tiếp tục học' : 'Bắt đầu học'}
            </LofiButton>
            <span className={styles.ctaMinuteHint}>Chọn từng chặng ở trang bên phải</span>
          </div>

          <span className={styles.pageNumberLeft}>2</span>
        </section>

        {/* Trang phải: Danh sách chặng */}
        <section className={styles.pageHalf} aria-label="Danh sách chặng học">
          <div className={styles.pageEyebrow}>Chương trình học</div>
          <h2 className={styles.rightHeading}>Danh sách chặng</h2>

          <div className={styles.stagesScroll}>
            {course.stages.map((stage, idx) => {
              const doneInStage = stage.lessons.filter((l) => doneSet.has(l.no)).length;
              const isAllDone =
                stage.lessons.length > 0 && doneInStage === stage.lessons.length;
              const containsCurrent =
                currentLessonNo !== null && stage.lessons.some((l) => l.no === currentLessonNo);
              const isInProgress = !isAllDone && (doneInStage > 0 || (hasStarted && containsCurrent));

              let statusLabel = 'Sẵn sàng';
              let pillClass = styles.stageStatusPill;
              if (isAllDone) {
                statusLabel = 'Đã xong';
                pillClass = `${styles.stageStatusPill} ${styles.stageStatusDone}`;
              } else if (isInProgress) {
                statusLabel = `Đang học · ${doneInStage}/${stage.lessons.length}`;
                pillClass = `${styles.stageStatusPill} ${styles.stageStatusActive}`;
              }

              return (
                <button
                  key={stage.stageNumber}
                  type="button"
                  className={`${styles.stageCardBtn} ${isInProgress ? styles.stageCardActive : ''}`}
                  onClick={() => onSelectStage(idx)}
                >
                  <div className={styles.stageCardHead}>
                    <div className={styles.stageTitleGroup}>
                      <span
                        className={`${styles.stageNumCircle} ${
                          !isInProgress && !isAllDone ? styles.stageNumMuted : ''
                        }`}
                      >
                        {stage.stageNumber}
                      </span>
                      <div>
                        <h3 className={styles.stageCardName}>{stage.title}</h3>
                        <p className={styles.stageCardMeta}>
                          {stage.lessons.length} bài · {stage.estimatedHoursLabel}
                        </p>
                      </div>
                    </div>
                    <span className={pillClass}>{statusLabel}</span>
                  </div>

                  <p className={styles.stageCardSummary}>{stage.summaryLine}</p>

                  <LofiProgressBar
                    value={doneInStage}
                    max={Math.max(1, stage.lessons.length)}
                    variant={isAllDone ? 'ok' : 'gradient'}
                  />
                </button>
              );
            })}
          </div>

          <span className={styles.pageNumberRight}>3</span>
        </section>
      </div>
    </div>
  );
}
