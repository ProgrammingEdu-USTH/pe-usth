import type { MetadataRoute } from 'next';

import { BOOKSHELF_COURSES } from '@/components/bookshelf/bookshelf-catalog';

const SITE = 'https://www.programmingedu.io.vn';

/** Chỉ các trang công khai có nội dung riêng. Quán Mây còn khai noindex nên không có ở đây. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', '/bookshelf', ...BOOKSHELF_COURSES.map((c) => `/bookshelf/${c.slug}`), '/ide'];
  return paths.map((path) => ({ url: SITE + path }));
}
