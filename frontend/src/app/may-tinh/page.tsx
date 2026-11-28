import type { Metadata } from 'next';

import ComputerFrame from './ComputerFrame';

export const metadata: Metadata = {
  title: 'Máy tính Góc học – Programming EDU',
  description: 'Sổ tra hàm, bàn chạy thử Python và trò chơi nhỏ trên laptop trong Góc học.',
};

export default function ComputerPage() {
  return <ComputerFrame />;
}
