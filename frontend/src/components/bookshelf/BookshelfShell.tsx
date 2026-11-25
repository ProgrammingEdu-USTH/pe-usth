'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LofiButton, LofiRoomBackdrop } from '@/components/ui';
import type { BookshelfSlug } from './bookshelf-catalog';
import styles from './bookshelf.module.css';

export interface BookshelfShellProps {
  backHref?: string;
  onBack?: () => void;
  backLabel: string;
  title: string;
  hintText: string;
  courseTheme?: BookshelfSlug;
  children: React.ReactNode;
}

/**
 * Khung dùng cho màn Bìa sách và Sách mở (/bookshelf/[courseSlug]):
 * dùng chung nền Góc học mờ mờ (`LofiRoomBackdrop`), giữ nút lùi gọn nhẹ
 * (không hiện TopBar) để tập trung vào cuốn sách và bắt phím Escape (T4).
 */
export function BookshelfShell({
  backHref,
  onBack,
  backLabel,
  title,
  hintText,
  courseTheme,
  children,
}: BookshelfShellProps) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.key !== 'Escape') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      if (onBack) {
        onBack();
      } else if (backHref) {
        router.push(backHref);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onBack, backHref, router]);

  return (
    <div className={styles.pageWrap} data-course={courseTheme}>
      <LofiRoomBackdrop />

      <div className={styles.shellForeground}>
        <header className={styles.topBar}>
          <div className={styles.topLeft}>
            {onBack ? (
              <LofiButton
                type="button"
                variant="glass"
                size="sm"
                leftIcon={<span aria-hidden="true">←</span>}
                onClick={onBack}
              >
                {backLabel}
              </LofiButton>
            ) : (
              <Link href={backHref || '/'} style={{ textDecoration: 'none' }}>
                <LofiButton
                  type="button"
                  variant="glass"
                  size="sm"
                  leftIcon={<span aria-hidden="true">←</span>}
                >
                  {backLabel}
                </LofiButton>
              </Link>
            )}
          </div>

          <h1 className={styles.topTitle}>{title}</h1>
          <div className={styles.topHint}>{hintText}</div>
        </header>

        <main className={styles.mainArea}>{children}</main>
      </div>
    </div>
  );
}
