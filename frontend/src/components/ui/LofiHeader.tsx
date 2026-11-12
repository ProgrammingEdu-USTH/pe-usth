'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './lofi-ui.module.css';

export interface LofiHeaderProps {
  lessonsDone?: number | null;
  totalLessons?: number;
  xp?: number | null;
  userName?: string | null;
  onOpenAuth?: () => void;
  className?: string;
}

export const LofiHeader: React.FC<LofiHeaderProps> = ({
  lessonsDone = null,
  totalLessons = 48,
  xp = null,
  userName = 'Khách',
  onOpenAuth,
  className = '',
}) => {
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className={`${styles.header} ${className}`}>
      <Link href="/" className={styles.headerBrand} title="Quay về Góc học">
        <span className={styles.brandLogo} aria-hidden="true">🛋️</span>
        <span>Góc học</span>
      </Link>

      <nav className={styles.headerNav} aria-label="Điều hướng chính">
        <Link
          href="/lesson/python_advanced"
          className={`${styles.navLink} ${isLinkActive('/lesson') ? styles.navLinkActive : ''}`}
        >
          Học tiếp
        </Link>
        <Link
          href="/ide"
          className={`${styles.navLink} ${isLinkActive('/ide') ? styles.navLinkActive : ''}`}
        >
          Bàn thí nghiệm
        </Link>
        <Link
          href="/practice"
          className={`${styles.navLink} ${isLinkActive('/practice') ? styles.navLinkActive : ''}`}
        >
          Ôn tập
        </Link>
      </nav>

      <div className={styles.headerActions}>
        {lessonsDone !== null && (
          <div className={`${styles.statPill} ${styles.statDone}`} title="Bài đã xong">
            <span aria-hidden="true">✓</span>
            <span>{lessonsDone}/{totalLessons}</span>
          </div>
        )}

        {xp !== null && (
          <div className={`${styles.statPill} ${styles.statXp}`} title="Tổng điểm XP">
            <span aria-hidden="true">⚡</span>
            <span>{xp} XP</span>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenAuth}
          className={`${styles.statPill}`}
          style={{ cursor: onOpenAuth ? 'pointer' : 'default' }}
          title={onOpenAuth ? 'Đăng nhập / Xem tài khoản' : 'Tài khoản'}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ffcf9a, #ff9db8)',
              color: '#3a1d2a',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {(userName || 'K').trim()[0].toUpperCase()}
          </span>
          <span>{userName || 'Khách'}</span>
        </button>
      </div>
    </header>
  );
};
