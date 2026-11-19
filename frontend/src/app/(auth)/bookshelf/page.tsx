import type { Metadata } from 'next';
import { BookshelfHubView } from '@/components/bookshelf/BookshelfHubView';

export const metadata: Metadata = {
  title: 'Tủ sách khoá học — Programming EDU',
  description: 'Chọn khoá học Python, SQL hoặc Machine Learning trên kệ sách Lofi.',
};

export default function BookshelfPage() {
  return <BookshelfHubView />;
}
