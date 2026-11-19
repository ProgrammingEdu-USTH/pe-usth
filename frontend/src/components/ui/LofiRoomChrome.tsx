'use client';

import React from 'react';
import Link from 'next/link';
import styles from './lofi-room-chrome.module.css';

export type LofiRoomTab =
  | 'learn'
  | 'ide'
  | 'roadmap'
  | 'courses'
  | 'practice'
  | 'achievements'
  | 'phone';

export interface LofiRoomTopBarProps {
  activeTab: LofiRoomTab;
  lessonsDone?: number | null;
  totalLessons?: number;
  xp?: number | null;
}

/**
 * Nền Góc học mờ mờ tái sử dụng đồng bộ cho các trang Lofi
 * (ảnh room-blur.webp + radial scrim giống #scrim trong scene.css).
 */
export function LofiRoomBackdrop() {
  return (
    <div className={styles.backdropRoot} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.backdropImg} src="/goc-hoc/room-blur.webp" alt="" />
      <div className={styles.backdropScrim} />
    </div>
  );
}

const ROOM_TABS: Array<{ id: LofiRoomTab; label: string; href: string }> = [
  { id: 'learn', label: 'Học tiếp', href: '/lesson/python_advanced' },
  { id: 'ide', label: 'Bàn thí nghiệm', href: '/ide' },
  { id: 'roadmap', label: 'Lộ trình', href: '/#roadmap' },
  { id: 'courses', label: 'Khoá học', href: '/bookshelf' },
  { id: 'practice', label: 'Ôn tập', href: '/practice' },
  { id: 'achievements', label: 'Thành tựu', href: '/#achievements' },
  { id: 'phone', label: 'Điện thoại', href: '/#phone' },
];

/**
 * Thanh điều hướng trên cùng khớp thanh #topbar của Góc học (scene.css).
 */
export function LofiRoomTopBar({
  activeTab,
  lessonsDone = null,
  totalLessons = 179,
  xp = null,
}: LofiRoomTopBarProps) {
  return (
    <header className={styles.topBar}>
      <Link href="/" className={styles.topBack}>
        <svg className={styles.topIcon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span>Góc học</span>
      </Link>

      <nav className={styles.topTabs} aria-label="Các khu trong phòng">
        {ROOM_TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`${styles.topTab} ${isActive ? styles.topTabActive : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.topRightPills}>
        <div className={`${styles.topPill} ${styles.topPillDone}`} title="Bài đã xong">
          <svg className={styles.topIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
          <span>
            {lessonsDone === null ? '—' : `${lessonsDone}/${totalLessons}`}
          </span>
        </div>
        <div className={`${styles.topPill} ${styles.topPillXp}`} title="Tổng XP">
          <svg className={styles.topIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
          </svg>
          <span>{xp === null ? '—' : xp.toLocaleString('vi-VN')}</span>
        </div>
      </div>
    </header>
  );
}
