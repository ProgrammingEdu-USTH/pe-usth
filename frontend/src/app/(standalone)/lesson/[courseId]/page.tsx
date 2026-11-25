'use client';

// Route động /lesson/[courseId] — phần còn lại của lesson_view() trong main.py:
//   cpp  → /interface
//   khác → /courses/<id>
// Các khoá có trang bài học riêng (python, python_advanced, java, htmlcss, ba khoá
// tĩnh) dùng route tĩnh, Next ưu tiên chúng trước route này. Ba đường dẫn bài SQL
// cũ (/lesson/db_design*) được chuyển hướng ở next.config.ts.
import { use, useEffect } from 'react';

const LESSON_URLS: Record<string, string> = { cpp: '/interface' };

export default function LessonDispatchPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);

  useEffect(() => {
    window.location.replace(LESSON_URLS[courseId] || `/courses/${courseId}`);
  }, [courseId]);

  return null;
}
