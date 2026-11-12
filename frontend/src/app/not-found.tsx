// Trang 404 của riêng dự án.
//
// TRƯỚC BẢN NÀY đây là trang mặc định của Next, và đo trên production
// (`programmingedu.io.vn/practice`, Chrome 08/11/2026) nó ra:
//   chữ "404 / This page could not be found." — TIẾNG ANH trên một khoá tiếng Việt
//   0 liên kết   — không có đường về, học viên phải bấm Back của trình duyệt
//   nền rgb(255,255,255), font "Times New Roman", 0 tệp CSS
//
// Bề mặt này CÓ người đi vào, không phải lo xa:
//   · `(standalone)/courses/[courseId]/page.tsx` gọi `notFound()` cho mã khoá
//     lạ, nên 404 nằm trong đường đi THEO THIẾT KẾ;
//   · AGENTS.md ghi một 404 THẬT đã xảy ra: "Ôn tập" ở thanh trên và nút trong
//     cảnh Góc học cùng dẫn tới `/practice`;
//   · đo được 6 đường trả 404, trong đó `/login`, `/dashboard`, `/forum` là URL
//     của bản Django cũ — người thử còn bookmark là rơi vào đây.
//
// VÌ SAO PHẢI TỰ NẠP CSS: layout gốc CỐ Ý không import CSS global nào ("mỗi
// page/layout con tự import ĐÚNG tổ hợp CSS của template gốc"), nên không nạp
// gì là 0 stylesheet — đúng cái đã đo được ở trên. `edu-theme.css` một mình
// đặt `body` background + `font-family` + `color`, nên một file là đủ.
//
// KHÔNG gọi API ở đây. Đây là trang CÔNG KHAI và nó là nơi bot quét web rơi
// vào nhiều nhất; `apiFetch` gặp 401 thì TỰ TẠO một tài khoản khách, nên một
// lời gọi ở trang 404 là mở đường cho mỗi lượt quét sinh một hàng
// `@guest.local`. Luật này đã có trong AGENTS.md; ca test canh nó ở đây.
import Link from 'next/link';

import PageStyles from '@/components/PageStyles';

import styles from './not-found.module.css';

// Đường về phải là route CÓ THẬT. Cả hai đều có trong `src/app`:
// `/` là `src/app/page.tsx`, `/courses/python_advanced` do
// `generateStaticParams()` của route khoá sinh ra từ `COURSES`. Ca test đối
// chiếu chúng với cây route — một trang 404 trỏ sang một 404 khác thì tệ hơn
// không có đường về, vì nó trông như có.
const DUONG_VE = ['/courses/python_advanced', '/'] as const;

export default function NotFound() {
  return (
    <>
      <PageStyles hrefs={['/static/css/edu-theme.css']} />
      <main className={styles.wrap}>
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
      </main>
    </>
  );
}
