'use client';

import DanhThucMayChu from '@/components/DanhThucMayChu';
import ThemePicker from '@/components/ThemePicker';
import { feedbackFormHref } from '@/lib/feedback-link';

import styles from './bookshelf-extras.module.css';

/** Ba việc trang khoá học cũ từng làm: đánh thức máy chủ, góp ý, chọn giao diện. */
export default function BookshelfExtras() {
  const feedback = feedbackFormHref();
  return (
    <footer className={styles.bar}>
      <DanhThucMayChu />
      <span className={styles.note}>Mọi bài mở sẵn. Tiến độ lưu theo trình duyệt này.</span>
      {feedback && (
        <a className={styles.link} href={feedback} target="_blank" rel="noreferrer">
          Góp ý cho nhóm làm khoá ↗
        </a>
      )}
      <ThemePicker />
    </footer>
  );
}
