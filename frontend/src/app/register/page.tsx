import type { Metadata } from 'next';

import AuthView from '@/components/auth/AuthView';
import PageStyles from '@/components/PageStyles';

export const metadata: Metadata = {
  title: 'Tạo tài khoản — Programming EDU',
  description: 'Tạo tài khoản để lưu tiến độ học và XP; tiến độ đang học với tài khoản khách được giữ nguyên.',
};

export default function RegisterPage() {
  return (
    <>
      <PageStyles hrefs={['/static/css/edu-theme.css']} />
      <AuthView mode="register" />
    </>
  );
}
