import type { Metadata } from 'next';
import Link from 'next/link';
import LofiPhoneProfile from '@/components/profile/LofiPhoneProfile';
import styles from '@/components/profile/phone-profile.module.css';
import { LofiButton } from '@/components/ui/LofiButton';
import LofiDarkPageShell from '@/components/ui/LofiDarkPageShell';

export const metadata: Metadata = {
  title: 'Hồ sơ người học — Programming EDU',
  description: 'Xem thông tin tiến độ học tập và bảng xếp hạng trên điện thoại Lofi.',
};

export default function ProfilePage() {
  return (
    <LofiDarkPageShell>
      <main className={styles.profilePageWrap}>
        <h1 className={styles.srOnly}>Hồ sơ người học</h1>
        {/* Nút quay lại trang chủ bàn học */}
        <header className={styles.backBtnWrap}>
          <Link href="/" className={styles.backLink}>
            <LofiButton
              variant="glass"
              size="sm"
              className={styles.backBtn}
              leftIcon={<span aria-hidden="true">←</span>}
            >
              Quay lại Bàn học
            </LofiButton>
          </Link>
        </header>

        {/* Chiếc điện thoại Lofi hiển thị Hồ sơ người học */}
        <LofiPhoneProfile />
      </main>
    </LofiDarkPageShell>
  );
}
