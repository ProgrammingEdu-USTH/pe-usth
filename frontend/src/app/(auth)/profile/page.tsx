import type { Metadata } from 'next';
import Link from 'next/link';
import LofiPhoneProfile from '@/components/profile/LofiPhoneProfile';
import { LofiButton } from '@/components/ui/LofiButton';

export const metadata: Metadata = {
  title: 'Hồ sơ người học — Programming EDU',
  description: 'Xem thông tin tiến độ học tập và bảng xếp hạng trên điện thoại Lofi.',
};

export default function ProfilePage() {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 16px',
        boxSizing: 'border-box',
        backgroundImage: 'linear-gradient(rgba(248, 240, 252, 0.35), rgba(225, 215, 240, 0.5)), url(/goc-hoc/room-blur.webp)',
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        overflow: 'hidden',
      }}
    >
      {/* Nút quay lại trang chủ bàn học */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 10,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <LofiButton
            variant="glass"
            size="sm"
            leftIcon={<span aria-hidden="true">←</span>}
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#1c2540',
              borderColor: 'rgba(214, 226, 244, 0.8)',
              boxShadow: '0 4px 14px rgba(30, 50, 90, 0.1)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            Quay lại Bàn học
          </LofiButton>
        </Link>
      </div>

      {/* Chiếc điện thoại Lofi hiển thị Hồ sơ người học */}
      <LofiPhoneProfile />
    </div>
  );
}
