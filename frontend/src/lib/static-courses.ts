// Khoá học đóng gói thành tệp tĩnh dưới /static/courses (xem scripts/pe-doc).
//
// Chúng dùng CHUNG màn bài học với khoá Python nhưng KHÔNG đụng tới backend:
// không ghi danh, không tạo tài khoản khách, không ghi nhật ký. Tiến độ nằm
// trên máy người học. `useLessonData` là chỗ duy nhất rẽ nhánh theo file này.

export const STATIC_COURSES = {
  database: { title: 'Database', slug: 'sql' },
  database_advanced: { title: 'Database Advanced', slug: 'database-advanced' },
  machine_learning: { title: 'Machine Learning', slug: 'machine-learning' },
} as const;

export type StaticCourseId = keyof typeof STATIC_COURSES;

export function isStaticCourse(courseId: string): courseId is StaticCourseId {
  return Object.hasOwn(STATIC_COURSES, courseId);
}

/** Nội dung một bài, `lessonNo` đếm từ 1 như `sort_order` của khoá Python. */
export function lessonBundleUrl(courseId: StaticCourseId, lessonNo: number): string {
  return `/static/courses/${courseId}/lessons/${lessonNo}.json`;
}

/**
 * Chủ của bản nháp khi không có tài khoản. Phải KHÁC 0: `useLessonDraft` coi
 * giá trị falsy là "chưa nạp xong" và sẽ không lưu gì.
 */
export const LOCAL_LEARNER = -1;

export function doneKey(courseId: StaticCourseId): string {
  return `pe-doc-done:${courseId}`;
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function thisBrowser(): Store | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Số bài đã đánh dấu hoàn thành, tăng dần. Dữ liệu hỏng thì coi như chưa có. */
export function readDone(courseId: StaticCourseId, store: Store | null = thisBrowser()): number[] {
  try {
    const raw: unknown = JSON.parse(store?.getItem(doneKey(courseId)) ?? '[]');
    if (!Array.isArray(raw)) return [];
    const numbers = raw.filter((n): n is number => Number.isInteger(n) && (n as number) > 0);
    return [...new Set(numbers)].sort((a, b) => a - b);
  } catch {
    return [];
  }
}

/** Trả về `false` khi trình duyệt không cho ghi, để giao diện đừng báo đã lưu. */
export function markDone(
  courseId: StaticCourseId,
  lessonNo: number,
  store: Store | null = thisBrowser(),
): boolean {
  if (!store) return false;
  try {
    const next = [...new Set([...readDone(courseId, store), lessonNo])].sort((a, b) => a - b);
    store.setItem(doneKey(courseId), JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
