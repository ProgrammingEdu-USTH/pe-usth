import type { Metadata } from 'next';

import LofiWorkspace from '@/components/goc-hoc/LofiWorkspace';
import PageStyles from '@/components/PageStyles';

export const metadata: Metadata = {
  title: 'Ôn tập của tôi – Programming EDU',
  description:
    'Ôn lại những câu bạn đã làm trong khoá Python cho Data Analyst: hệ thống lấy nhiều câu hơn '
    + 'từ những bài bạn hay chọn sai, chấm ngay và giải thích đáp án.',
};

export default function PracticePage() {
  return (
    <>
      <PageStyles hrefs={[]} />
      <LofiWorkspace initialScreen="practice" />
    </>
  );
}
