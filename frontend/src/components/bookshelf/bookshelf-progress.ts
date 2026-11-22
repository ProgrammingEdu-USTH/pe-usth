/**
 * bookshelf-progress.ts — Bộ đọc tiến độ cho Tủ sách 3 khoá.
 *
 * CHƯA nối Backend ở vòng hiện tại (`USE_BOOKSHELF_MOCK = true`): toàn bộ tiến
 * độ được lấy từ mock sạch phía client để demo giao diện độc lập, không gọi API
 * hay tạo tài khoản khách. Khi cần nối tiến độ thật từ `GET /api/enrolled`, chỉ
 * cần chuyển cờ `USE_BOOKSHELF_MOCK = false` và nối `loadCompletedLessons`.
 */

export const USE_BOOKSHELF_MOCK = true;

export type CourseProgressSnapshot = {
  completedNos: number[];
  currentLessonNo: number | null;
  source: 'mock' | 'api';
};

const MOCK_COMPLETED_BY_COURSE: Record<string, number[]> = {
  python: [1, 2, 3, 4, 5, 6],
  sql: [],
  'machine-learning': [],
};

/** Tính toán snapshot tiến độ từ tập bài đã xong và tổng số bài. */
export function buildProgressSnapshot(
  completedNos: number[],
  totalLessons: number,
  source: 'mock' | 'api' = 'mock',
): CourseProgressSnapshot {
  const validDone = Array.from(
    new Set(completedNos.filter((n) => Number.isInteger(n) && n >= 1 && n <= totalLessons)),
  ).sort((a, b) => a - b);

  const doneSet = new Set(validDone);
  let currentLessonNo: number | null = totalLessons > 0 ? 1 : null;
  if (doneSet.size > 0) {
    currentLessonNo = null;
    for (let n = 1; n <= totalLessons; n += 1) {
      if (!doneSet.has(n)) {
        currentLessonNo = n;
        break;
      }
    }
  }

  return {
    completedNos: validDone,
    currentLessonNo,
    source,
  };
}

/** Đọc tiến độ đồng bộ từ mock cho SSR / lần render đầu. */
export function getInitialBookshelfProgress(
  slug: string,
  totalLessons: number,
): CourseProgressSnapshot {
  const list = MOCK_COMPLETED_BY_COURSE[slug] ?? [];
  return buildProgressSnapshot(list, totalLessons, 'mock');
}

/**
 * Adapter bất đồng bộ sẵn sàng nối Backend sau này (`GET /api/enrolled`).
 * Hiện tại giữ mock theo `USE_BOOKSHELF_MOCK = true`.
 */
export function buildLessonHref(
  baseHref: string | null,
  lesson: { index: number; no: number },
): string | null {
  if (!baseHref) return null;
  return `${baseHref}?lesson=${lesson.index}`;
}

export async function loadBookshelfProgress(
  slug: string,
  totalLessons: number,
): Promise<CourseProgressSnapshot> {
  if (USE_BOOKSHELF_MOCK) {
    return getInitialBookshelfProgress(slug, totalLessons);
  }
  // Điểm nối API sau này (sử dụng loadCompletedLessons + apiFetchSessionOnly).
  return getInitialBookshelfProgress(slug, totalLessons);
}
