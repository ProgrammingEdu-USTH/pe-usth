/**
 * lofi-lesson-loader.ts — Bộ nạp bài học & tự động ghi danh khi gặp HTTP 403.
 *
 * Dùng chung cho cả trang sách mở Python (`LofiWorkspace.tsx`) lẫn trang học
 * SQL (`LessonDbDesign.tsx`), không import alias `@/` để `node --test` nạp trực tiếp.
 */

export type SimpleFetcher = (path: string, init?: RequestInit) => Promise<Response>;

export type LessonLoadErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'server';

export type LessonContentLoadResult<T = unknown> =
  | {
      ok: true;
      lesson: T;
      completed: boolean;
      autoEnrolled: boolean;
    }
  | {
      ok: false;
      kind: LessonLoadErrorKind;
      status: number | null;
      message: string;
    };

export type CompleteLessonResult = {
  ok: boolean;
  status: number | null;
  autoEnrolled: boolean;
  data: {
    xpGained?: number;
    alreadyCompleted?: boolean;
    message?: string;
  } | null;
};

/**
 * Dedupe lời gọi ghi danh theo `courseId` để khi người học chuyển bài nhanh
 * hoặc nhiều màn cùng gọi, không bắn trùng nhiều `POST /enroll`.
 */
const enrollInFlight = new Map<string, Promise<boolean>>();

export async function ensureCourseEnrolled(
  courseId: string,
  fetcher: SimpleFetcher,
): Promise<boolean> {
  const safeId = courseId.trim();
  if (!safeId) return false;

  const existing = enrollInFlight.get(safeId);
  if (existing) return existing;

  const pending = (async () => {
    try {
      const res = await fetcher(`/api/courses/${encodeURIComponent(safeId)}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      enrollInFlight.delete(safeId);
    }
  })();

  enrollInFlight.set(safeId, pending);
  return pending;
}

export async function loadLessonContentWithAutoEnroll<T = unknown>(
  courseId: string,
  lessonNo: number,
  fetcher: SimpleFetcher,
): Promise<LessonContentLoadResult<T>> {
  const contentPath = `/api/courses/${encodeURIComponent(courseId)}/lessons/${lessonNo}/content`;

  try {
    let res = await fetcher(contentPath);
    let autoEnrolled = false;

    if (res.status === 403) {
      const enrolled = await ensureCourseEnrolled(courseId, fetcher);
      if (enrolled) {
        autoEnrolled = true;
        res = await fetcher(contentPath);
      }
    }

    if (res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        lesson?: { contentJson?: T };
        completed?: boolean;
      } | null;

      if (payload?.lesson?.contentJson) {
        return {
          ok: true,
          lesson: payload.lesson.contentJson,
          completed: Boolean(payload.completed),
          autoEnrolled,
        };
      }

      return {
        ok: false,
        kind: 'not_found',
        status: 200,
        message: 'Bài học này chưa có nội dung trên máy chủ.',
      };
    }

    if (res.status === 401) {
      return {
        ok: false,
        kind: 'unauthorized',
        status: 401,
        message: 'Phiên học đã hết hạn hoặc chưa hợp lệ. Vui lòng tải lại trang và thử lại.',
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        kind: 'forbidden',
        status: 403,
        message: 'Tài khoản chưa được ghi danh vào khoá học này (HTTP 403). Vui lòng bấm Thử lại.',
      };
    }

    if (res.status === 404) {
      return {
        ok: false,
        kind: 'not_found',
        status: 404,
        message: 'Không tìm thấy nội dung bài học trên máy chủ (HTTP 404). Hãy kiểm tra dữ liệu seed bài học.',
      };
    }

    return {
      ok: false,
      kind: 'server',
      status: res.status,
      message: `Máy chủ bài học đang bận hoặc gặp sự cố (HTTP ${res.status}). Vui lòng thử lại.`,
    };
  } catch {
    return {
      ok: false,
      kind: 'network',
      status: null,
      message: 'Không thể kết nối máy chủ bài học (cổng 5000). Vui lòng khởi động backend và bấm Thử lại.',
    };
  }
}

export async function completeLessonWithAutoEnroll(
  courseId: string,
  lessonNo: number,
  payload: {
    lessonTitle: string;
    xpEarned: number;
    quizScore?: number;
  },
  fetcher: SimpleFetcher,
): Promise<CompleteLessonResult> {
  const path = `/api/lessons/${lessonNo}/complete`;
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseId,
      lessonTitle: payload.lessonTitle,
      xpEarned: payload.xpEarned,
      quizScore: payload.quizScore ?? 100,
    }),
  };

  try {
    let res = await fetcher(path, init);
    let autoEnrolled = false;

    if (res.status === 403) {
      const enrolled = await ensureCourseEnrolled(courseId, fetcher);
      if (enrolled) {
        autoEnrolled = true;
        res = await fetcher(path, init);
      }
    }

    const data = (await res.json().catch(() => null)) as CompleteLessonResult['data'];
    return {
      ok: res.ok,
      status: res.status,
      autoEnrolled,
      data,
    };
  } catch {
    return {
      ok: false,
      status: null,
      autoEnrolled: false,
      data: null,
    };
  }
}
