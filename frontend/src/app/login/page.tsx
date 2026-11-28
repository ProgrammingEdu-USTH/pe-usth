import type { Metadata } from 'next';

import AuthView from '@/components/auth/AuthView';
import PageStyles from '@/components/PageStyles';

// Trang CÔNG KHAI và KHÔNG gọi API khi mở (xem AuthView): bot quét web rơi vào đây, mà `apiFetch` gặp 401 là tự tạo khách.
export const metadata: Metadata = {
  title: 'Đăng nhập — Programming EDU',
  description: 'Đăng nhập để vào lại bàn học và tiếp tục tiến độ Python cho Data Analyst.',
};

export default function LoginPage() {
  return (
    <>
      <PageStyles hrefs={['/static/css/edu-theme.css']} />
      <AuthView mode="login" />
    </>
  );
}
