import type { Metadata } from 'next';
import PageStyles from '@/components/PageStyles';

export const metadata: Metadata = {
  title: 'Đăng nhập / Đăng ký — Programming EDU',
  description: 'Trang đăng nhập và đăng ký tài khoản học lập trình Python.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100%;
          min-height: 100%;
          background: #14121b;
        }
      `}</style>
      <PageStyles hrefs={['/static/css/studio-tokens.css']} />
      {children}
    </>
  );
}
