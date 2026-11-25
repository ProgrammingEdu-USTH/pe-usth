/**
 * bookshelf-progress.ts — tiến độ cho Tủ sách: số thật hoặc trống.
 *
 * Chỉ gọi API khi máy ĐÃ CÓ phiên (`hasStoredSession`): mở tủ sách không được
 * tự tạo tài khoản khách. Chưa có phiên hoặc đọc lỗi → 'unknown', không bịa số.
 */

export type CourseProgressSnapshot = {
  completedNos: number[];
  currentLessonNo: number | null;
  source: 'api' | 'unknown';
};

/** Tính toán snapshot tiến độ từ tập bài đã xong và tổng số bài. */
export function buildProgressSnapshot(
  completedNos: number[],
  totalLessons: number,
  source: CourseProgressSnapshot['source'] = 'api',
): CourseProgressSnapshot {
  const validDone = Array.from(
    new Set(completedNos.filter((n) => Number.isInteger(n) && n >= 1 && n <= totalLessons)),
  ).sort((a, b) => a - b);

  const doneSet = new Set(validDone);
  let currentLessonNo: number | null = null;
  // Chưa xong bài nào (hoặc không đọc được) thì không gắn nhãn "Đang học" cho bài nào.
  for (let n = 1; doneSet.size > 0 && n <= totalLessons; n += 1) {
    if (!doneSet.has(n)) {
      currentLessonNo = n;
      break;
    }
  }

  return { completedNos: validDone, currentLessonNo, source };
}

export function unknownProgress(totalLessons: number): CourseProgressSnapshot {
  return buildProgressSnapshot([], totalLessons, 'unknown');
}

/**
 * Đọc tiến độ một khoá từ phản hồi `GET /api/enrolled`.
 * Chưa ghi danh khoá ấy là 0 bài (số thật); phản hồi lạ là 'unknown'.
 */
export function progressFromEnrolled(
  data: unknown,
  courseId: string,
  totalLessons: number,
): CourseProgressSnapshot {
  const list = Array.isArray(data) ? data : (data as { enrolled?: unknown } | null)?.enrolled;
  if (!Array.isArray(list)) return unknownProgress(totalLessons);
  const row = (list as Array<Record<string, unknown> | null>).find(
    (e) => e?.id === courseId || e?.courseId === courseId,
  );
  if (!row) return buildProgressSnapshot([], totalLessons);
  const raw = row.completedLessonNumbers;
  if (!Array.isArray(raw)) return unknownProgress(totalLessons);
  return buildProgressSnapshot(raw.map(Number), totalLessons);
}

/** Mọi trang bài học trên kệ nhận `?lesson=` đếm từ 0. */
export function buildLessonHref(baseHref: string, lesson: { index: number }): string {
  return `${baseHref}?lesson=${lesson.index}`;
}
