import type { Metadata } from 'next';

import PageStyles from '@/components/PageStyles';
import { Home } from '@/components/quan-may/QuanMay';

export const metadata: Metadata = {
  title: 'Quán Mây (thử nghiệm) – Programming EDU',
  description: 'Học tin học qua chuyện ở một quán cà phê: đoán trước, tự làm, rồi xem vì sao.',
  // Bản thử nghiệm: chưa muốn lên kết quả tìm kiếm.
  robots: { index: false, follow: false },
};

export default function QuanMayPage() {
  return (
    <>
      <PageStyles hrefs={['/static/css/quan-may-tokens.css']} />
      <Home />
    </>
  );
}
