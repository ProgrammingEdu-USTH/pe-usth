// Trang 404 của riêng dự án — giao diện Lofi tối đồng bộ với Góc học & Tủ sách.
import Link from 'next/link';

import PageStyles from '@/components/PageStyles';

import styles from './not-found.module.css';

const DUONG_VE = ['/bookshelf/python', '/'] as const;

export default function NotFound() {
  return (
    <>
      <PageStyles hrefs={['/static/css/bookshelf-tokens.css']} />
      <main className={styles.wrap}>
        <section className={styles.card}>
          <p className={styles.ma}>404</p>
          <h1 className={styles.tieuDe}>Không có trang này</h1>
          <p className={styles.than}>
            Đường dẫn bạn vừa mở không còn, hoặc chưa bao giờ có. Tiến độ học của
            bạn vẫn còn nguyên — chọn một đường dưới đây để học tiếp.
          </p>
          <nav className={styles.hangNut}>
            <Link className={styles.nutChinh} href={DUONG_VE[0]}>
              Về khoá đang học
            </Link>
            <Link className={styles.nutPhu} href={DUONG_VE[1]}>
              Về trang chủ
            </Link>
          </nav>
        </section>
      </main>
    </>
  );
}
