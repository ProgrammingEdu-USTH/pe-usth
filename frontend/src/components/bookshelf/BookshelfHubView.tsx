'use client';

import React from 'react';
import { LofiRoomBackdrop, LofiRoomTopBar } from '@/components/ui';
import { BookshelfCabinet } from './BookshelfCabinet';
import { findBookshelfCourse } from './bookshelf-catalog';
import { getInitialBookshelfProgress } from './bookshelf-progress';
import styles from './bookshelf.module.css';

/**
 * Route độc lập /bookshelf — dùng chung nền Góc học mờ mờ (`LofiRoomBackdrop`),
 * thanh điều hướng đầu trang (`LofiRoomTopBar`), và chiếc Tủ sách căn giữa
 * (`BookshelfCabinet`), không còn nút "Về căn phòng" và không còn cột phải.
 */
export function BookshelfHubView() {
  const python = findBookshelfCourse('python');
  const totalLessons = python?.lessonCount ?? 179;
  const pySnap = getInitialBookshelfProgress('python', totalLessons);

  return (
    <div className={styles.hubStandaloneWrap}>
      <LofiRoomBackdrop />
      <LofiRoomTopBar
        activeTab="courses"
        lessonsDone={pySnap.completedNos.length}
        totalLessons={totalLessons}
        xp={null}
      />
      <main className={styles.hubStandaloneMain}>
        <BookshelfCabinet />
      </main>
    </div>
  );
}
