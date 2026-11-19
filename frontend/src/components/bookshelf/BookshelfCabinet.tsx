'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LofiProgressBar } from '@/components/ui';
import { CourseEmblemIcon } from './BookPropsDisplay';
import {
  BOOKSHELF_COURSES,
  COMING_SOON_BOOKS,
  type BookshelfCourse,
  type BookshelfSlug,
} from './bookshelf-catalog';
import { getInitialBookshelfProgress } from './bookshelf-progress';
import styles from './bookshelf.module.css';

export interface BookshelfCabinetProps {
  inStudyRoom?: boolean;
}

function HoverPreviewCard({ course }: { course: BookshelfCourse }) {
  const snap = getInitialBookshelfProgress(course.slug, course.lessonCount);
  const doneCount = snap.completedNos.length;
  const progressText =
    doneCount > 0
      ? `Đã học ${doneCount}/${course.lessonCount} bài`
      : course.statusNote || 'Sẵn sàng bắt đầu';

  return (
    <div className={styles.hoverPreviewCard} data-course={course.slug} role="status">
      <div className={styles.hoverPreviewHead}>
        <span className={styles.hoverPreviewIcon}>
          <CourseEmblemIcon slug={course.slug} size={22} />
        </span>
        <div>
          <div className={styles.hoverPreviewTitleRow}>
            <strong className={styles.hoverPreviewTitle}>{course.title}</strong>
            {course.statusNote && (
              <span className={styles.statusChip}>{course.statusNote}</span>
            )}
          </div>
          <div className={styles.colorNoteRow}>
            <span className={styles.dotPrimary} aria-hidden="true" />
            <span className={styles.dotAccent} aria-hidden="true" />
            <span>{course.colorNote}</span>
          </div>
        </div>
      </div>

      <div className={styles.hoverPreviewStats}>
        <span>
          {course.stageCount} chặng · {course.lessonCount} bài · {course.durationLabel}
        </span>
        <span>{progressText}</span>
      </div>

      <LofiProgressBar
        value={doneCount}
        max={Math.max(1, course.lessonCount)}
        variant={doneCount > 0 ? 'amber' : 'gradient'}
      />

      <div className={styles.hoverPreviewFoot}>Nhấn để mở bìa sách →</div>
    </div>
  );
}

function SpineItem({
  course,
  isHovered,
  onHoverChange,
}: {
  course: BookshelfCourse;
  isHovered: boolean;
  onHoverChange: (slug: BookshelfSlug | null) => void;
}) {
  return (
    <Link
      href={`/bookshelf/${course.slug}`}
      className={`${styles.spineBtn} ${isHovered ? styles.spineBtnActive : ''}`}
      data-course={course.slug}
      aria-label={`Mở sách khoá học ${course.title} (${course.lessonCount} bài, ${course.durationLabel})`}
      onMouseEnter={() => onHoverChange(course.slug)}
      onMouseLeave={() => onHoverChange(null)}
      onFocus={() => onHoverChange(course.slug)}
      onBlur={() => onHoverChange(null)}
    >
      {course.badgeText && <span className={styles.spineBadge}>{course.badgeText}</span>}
      <span className={styles.spineEmblem}>
        <CourseEmblemIcon slug={course.slug} size={22} />
      </span>
      <span className={styles.spineLabel}>{course.shortSpineLabel}</span>
    </Link>
  );
}

/**
 * Chiếc Tủ sách gỗ 3 tầng dùng chung cho cả màn Khoá học trong Góc học (/#courses)
 * và route độc lập (/bookshelf). Không có cột phụ bên phải; rê chuột / focus
 * vào từng gáy sách hiện thẻ xem nhanh thông tin ngay trên tầng kệ.
 */
export function BookshelfCabinet({ inStudyRoom = false }: BookshelfCabinetProps) {
  const [hoveredSlug, setHoveredSlug] = useState<BookshelfSlug | null>(null);

  const activeCourses = BOOKSHELF_COURSES.filter((c) => c.shelfTier === 'active');
  const newCourses = BOOKSHELF_COURSES.filter((c) => c.shelfTier === 'new');
  const hoveredCourse = hoveredSlug
    ? BOOKSHELF_COURSES.find((c) => c.slug === hoveredSlug) ?? null
    : null;

  return (
    <div
      className={`${styles.cabinetCenterWrap} ${
        inStudyRoom ? styles.cabinetInRoom : ''
      }`}
    >
      <div className={styles.cabinetHead}>
        <h1 className={styles.cabinetTitle}>Khoá học</h1>
        <p className={styles.cabinetSub}>
          Chọn một cuốn sách trên kệ để xem bìa, chương trình học và từng bài.
        </p>
      </div>

      <section className={styles.shelfCabinet} aria-label="Tủ sách khoá học">
        {/* Tầng 1: Đang học */}
        <div className={styles.shelfTier}>
          <div className={styles.shelfRowGrid}>
            <div className={styles.spinesGroup}>
              {activeCourses.map((course) => (
                <SpineItem
                  key={course.slug}
                  course={course}
                  isHovered={hoveredSlug === course.slug}
                  onHoverChange={setHoveredSlug}
                />
              ))}
            </div>
            <div className={styles.tierPreviewSlot}>
              {hoveredCourse?.shelfTier === 'active' ? (
                <HoverPreviewCard course={hoveredCourse} />
              ) : (
                <p className={styles.tierHint}>Rê chuột hoặc chạm vào cuốn sách đang học</p>
              )}
            </div>
          </div>
          <div className={styles.shelfPlankLabel}>Đang học</div>
        </div>

        {/* Tầng 2: Khoá học mới */}
        <div className={styles.shelfTier}>
          <div className={styles.shelfRowGrid}>
            <div className={styles.spinesGroup}>
              {newCourses.map((course) => (
                <SpineItem
                  key={course.slug}
                  course={course}
                  isHovered={hoveredSlug === course.slug}
                  onHoverChange={setHoveredSlug}
                />
              ))}
            </div>
            <div className={styles.tierPreviewSlot}>
              {hoveredCourse?.shelfTier === 'new' ? (
                <HoverPreviewCard course={hoveredCourse} />
              ) : (
                <p className={styles.tierHint}>Chọn SQL hoặc Machine Learning để xem thử</p>
              )}
            </div>
          </div>
          <div className={styles.shelfPlankLabel}>Khoá học mới</div>
        </div>

        {/* Tầng 3: Sắp ra mắt (trung tính, không ổ khoá) */}
        <div className={styles.shelfTier}>
          <div className={styles.shelfRow}>
            {COMING_SOON_BOOKS.map((book) => (
              <div key={book.spineLabel} className={styles.spineSoon} aria-disabled="true">
                <span className={styles.soonTag}>Sắp mở</span>
                <span className={styles.spineLabel}>{book.spineLabel}</span>
              </div>
            ))}
            <p className={styles.tierNote}>Các khoá học mới đang được biên soạn</p>
          </div>
          <div className={styles.shelfPlankLabel}>Sắp ra mắt</div>
        </div>
      </section>
    </div>
  );
}
