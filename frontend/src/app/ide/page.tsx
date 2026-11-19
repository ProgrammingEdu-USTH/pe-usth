import type { Metadata } from 'next';

import LofiWorkspace from '@/components/goc-hoc/LofiWorkspace';
import PageStyles from '@/components/PageStyles';

export const metadata: Metadata = {
  title: 'Bàn thí nghiệm – Programming EDU',
  description:
    'Viết và chạy thử mã Python ngay trên trang; mã chạy trong môi trường cách ly trên máy chủ.',
};

export default function IdePage() {
  return (
    <>
      <PageStyles hrefs={[]} />
      <LofiWorkspace initialScreen="ide" />
    </>
  );
}
