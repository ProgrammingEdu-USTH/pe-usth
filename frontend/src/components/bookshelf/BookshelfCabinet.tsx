'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LofiProgressBar } from '@/components/ui';
import { CourseEmblemIcon } from './BookPropsDisplay';
import {
  BOOKSHELF_COURSES,
  COMING_SOON_BOOKS,
  type BookshelfCourse,
  type BookshelfSlug,
} from './bookshelf-catalog';
import { getInitialBookshelfProgress } from './bookshelf-progress';
import { consumeReturningBook } from './bookshelf-transition';
import styles from './bookshelf.module.css';

export interface BookshelfCabinetProps {
  inStudyRoom?: boolean;
}

type BookMotionState = {
  mode: 'pull' | 'return';
  course: BookshelfCourse;
  doneCount: number;
  dx: number;
  dy: number;
};

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
  isPulled,
  isSettled,
  onHoverChange,
  onSelect,
}: {
  course: BookshelfCourse;
  isHovered: boolean;
  isPulled: boolean;
  isSettled: boolean;
  onHoverChange: (slug: BookshelfSlug | null) => void;
  onSelect: (course: BookshelfCourse, e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={`/bookshelf/${course.slug}`}
      className={`${styles.spineBtn} ${isHovered ? styles.spineBtnActive : ''} ${
        isPulled ? styles.spineBtnPulled : ''
      } ${isSettled ? styles.spineBtnSettled : ''}`}
      data-course={course.slug}
      aria-label={`Mở sách khoá học ${course.title} (${course.lessonCount} bài, ${course.durationLabel})`}
      onClick={(e) => onSelect(course, e)}
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
 * vào từng gáy sách hiện thẻ xem nhanh thông tin ngay trên tầng kệ; bấm sách
 * rút sách 3D ra khỏi kệ rồi chuyển mượt sang trang bìa khoá học, và khi bấm
 * "Về tủ sách" từ bìa sẽ bay ngược sách 3D cắm lại đúng khe cũ trên kệ.
 */
export function BookshelfCabinet({ inStudyRoom = false }: BookshelfCabinetProps) {
  const router = useRouter();
  const cabinetRef = useRef<HTMLDivElement>(null);
  const [hoveredSlug, setHoveredSlug] = useState<BookshelfSlug | null>(null);
  const [bookMotion, setBookMotion] = useState<BookMotionState | null>(null);
  const [settledSlug, setSettledSlug] = useState<BookshelfSlug | null>(null);
  const navTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const returnFinishTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    BOOKSHELF_COURSES.forEach((course) => {
      router.prefetch(`/bookshelf/${course.slug}`);
    });

    const rafId = window.requestAnimationFrame(() => {
      const returningSlug = consumeReturningBook();
      if (!returningSlug) return;

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return;

      const course = BOOKSHELF_COURSES.find((c) => c.slug === returningSlug);
      if (!course) return;

      const spineEl = cabinetRef.current?.querySelector<HTMLElement>(
        `[data-course="${returningSlug}"]`,
      );
      if (!spineEl) return;

      const rect = spineEl.getBoundingClientRect();
      const dx = Math.round(rect.left + rect.width / 2 - window.innerWidth / 2);
      const dy = Math.round(rect.top + rect.height / 2 - window.innerHeight / 2);
      const snap = getInitialBookshelfProgress(course.slug, course.lessonCount);

      setBookMotion({
        mode: 'return',
        course,
        doneCount: snap.completedNos.length,
        dx,
        dy,
      });

      returnFinishTimerRef.current = window.setTimeout(() => {
        setBookMotion(null);
        setSettledSlug(course.slug);
        settleTimerRef.current = window.setTimeout(() => {
          setSettledSlug(null);
        }, 280);
      }, 580);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
      }
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
      }
      if (returnFinishTimerRef.current !== null) {
        window.clearTimeout(returnFinishTimerRef.current);
      }
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }
    };
  }, [router]);

  const handleSelectCourse = (
    course: BookshelfCourse,
    e: React.MouseEvent<HTMLAnchorElement>,
  ) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    if (bookMotion) {
      e.preventDefault();
      return;
    }
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      return;
    }

    e.preventDefault();
    router.prefetch(`/bookshelf/${course.slug}`);

    const rect = e.currentTarget.getBoundingClientRect();
    const dx = Math.round(rect.left + rect.width / 2 - window.innerWidth / 2);
    const dy = Math.round(rect.top + rect.height / 2 - window.innerHeight / 2);
    const snap = getInitialBookshelfProgress(course.slug, course.lessonCount);

    setHoveredSlug(null);
    setSettledSlug(null);
    setBookMotion({
      mode: 'pull',
      course,
      doneCount: snap.completedNos.length,
      dx,
      dy,
    });

    navTimerRef.current = window.setTimeout(() => {
      router.push(`/bookshelf/${course.slug}`);
    }, 580);

    fallbackTimerRef.current = window.setTimeout(() => {
      setBookMotion(null);
    }, 2500);
  };

  const activeCourses = BOOKSHELF_COURSES.filter((c) => c.shelfTier === 'active');
  const newCourses = BOOKSHELF_COURSES.filter((c) => c.shelfTier === 'new');
  const hoveredCourse = hoveredSlug
    ? BOOKSHELF_COURSES.find((c) => c.slug === hoveredSlug) ?? null
    : null;

  return (
    <div
      ref={cabinetRef}
      className={`${styles.cabinetCenterWrap} ${
        inStudyRoom ? styles.cabinetInRoom : ''
      } ${bookMotion?.mode === 'pull' ? styles.cabinetPulling : ''} ${
        bookMotion?.mode === 'return' ? styles.cabinetReturning : ''
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
                  isPulled={bookMotion?.course.slug === course.slug}
                  isSettled={settledSlug === course.slug}
                  onHoverChange={setHoveredSlug}
                  onSelect={handleSelectCourse}
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
                  isPulled={bookMotion?.course.slug === course.slug}
                  isSettled={settledSlug === course.slug}
                  onHoverChange={setHoveredSlug}
                  onSelect={handleSelectCourse}
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

      {bookMotion &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`${styles.pullOverlay} ${
              bookMotion.mode === 'return' ? styles.pullOverlayReturn : ''
            }`}
            data-course={bookMotion.course.slug}
            aria-hidden="true"
          >
            <div
              className={`${styles.pullBook3d} ${
                bookMotion.mode === 'return' ? styles.pullBook3dReturn : ''
              }`}
              style={
                {
                  '--pull-dx': `${bookMotion.dx}px`,
                  '--pull-dy': `${bookMotion.dy}px`,
                } as React.CSSProperties
              }
            >
              <div className={styles.pullBackFace} />
              <div className={styles.pullPagesEdge} />
              <div className={styles.pullSpineFace}>
                <span className={styles.spineEmblem}>
                  <CourseEmblemIcon slug={bookMotion.course.slug} size={22} />
                </span>
                <span className={styles.spineLabel}>{bookMotion.course.shortSpineLabel}</span>
              </div>
              <div className={styles.pullCoverFace}>
                <span className={styles.coverInnerFrame} />
                <span className={styles.coverBindingTabs}>
                  <span className={styles.coverBindingTab} />
                  <span className={styles.coverBindingTab} />
                  <span className={styles.coverBindingTab} />
                  <span className={styles.coverBindingTab} />
                </span>
                <span className={styles.coverRibbon} />
                <span className={styles.coverEmblem}>
                  <CourseEmblemIcon slug={bookMotion.course.slug} size={40} />
                </span>
                <span className={styles.coverEyebrow}>KHOÁ HỌC</span>
                <strong className={styles.coverTitle}>{bookMotion.course.title}</strong>
                <span className={styles.coverRule} />
                <p className={styles.coverTagline}>{bookMotion.course.tagline}</p>
                <div className={styles.coverStatsLine}>
                  {bookMotion.course.stageCount} chặng · {bookMotion.course.lessonCount} bài học ·{' '}
                  {bookMotion.course.durationLabel}
                </div>
                <div className={styles.coverProgWrap}>
                  <LofiProgressBar
                    value={bookMotion.doneCount}
                    max={Math.max(1, bookMotion.course.lessonCount)}
                    variant="amber"
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
