/**
 * course-reset-profile.ts — Logic kiểm định & gọi API cho:
 *  - Học lại khoá (POST /api/courses/:id/reset, kèm mock reset-response.json + cờ chuyển)
 *  - Đổi tên hiển thị (PUT /api/user với UpdateProfileDto { name })
 *
 * File thuần (không import alias '@/...') để `node --test` nạp trực tiếp.
 */

import mockResetResponse from './mock/reset-response.json' with { type: 'json' };
import { friendlyApiError } from './friendly-api-error.mjs';

export type FetcherLike = (path: string, opts?: RequestInit) => Promise<Response>;

export const USE_COURSE_RESET_MOCK =
  process.env.NEXT_PUBLIC_COURSE_RESET_MOCK !== 'false';

export type CourseResetResponse = {
  ok: true;
  completedLessons: 0;
  progress: 0;
  reset_at: string;
};

export function validateResetResponse(raw: unknown): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return ['Phản hồi học lại khoá phải là object JSON.'];
  }
  const r = raw as Record<string, unknown>;
  if (r.ok !== true) errors.push('`ok` phải bằng true.');
  if (r.completedLessons !== 0) errors.push('`completedLessons` phải bằng 0.');
  if (r.progress !== 0) errors.push('`progress` phải bằng 0.');
  if (typeof r.reset_at !== 'string' || !Number.isFinite(Date.parse(r.reset_at))) {
    errors.push('`reset_at` phải là chuỗi thời gian ISO hợp lệ.');
  }
  return errors;
}

export function getMockResetResponse(): CourseResetResponse {
  const errs = validateResetResponse(mockResetResponse);
  if (errs.length > 0) {
    throw new Error(`Dữ liệu giả reset-response.json không hợp lệ: ${errs.join('; ')}`);
  }
  return mockResetResponse as CourseResetResponse;
}

export async function submitCourseReset(
  courseId: string,
  opts: { useMock?: boolean; fetcher?: FetcherLike } = {},
): Promise<
  | { ok: true; data: CourseResetResponse; source: 'mock' | 'api' }
  | { ok: false; status: number; message: string }
> {
  const useMock = opts.useMock ?? USE_COURSE_RESET_MOCK;
  if (useMock) {
    const base = getMockResetResponse();
    return {
      ok: true,
      data: { ...base, reset_at: new Date().toISOString() },
      source: 'mock',
    };
  }
  if (!opts.fetcher) {
    return { ok: false, status: 0, message: 'Thiếu hàm fetcher để gọi API học lại khoá.' };
  }
  try {
    const res = await opts.fetcher(`/api/courses/${encodeURIComponent(courseId)}/reset`, {
      method: 'POST',
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 403) {
        return {
          ok: false,
          status: 403,
          message: 'Bạn chưa ghi danh khoá học này nên chưa thể đặt lại tiến độ.',
        };
      }
      if (res.status === 429) {
        return {
          ok: false,
          status: 429,
          message: 'Bạn đã đặt lại khoá học quá số lần cho phép trong giờ. Vui lòng thử lại sau.',
        };
      }
      return {
        ok: false,
        status: res.status,
        message: friendlyApiError(res.status, body, 'Không thể đặt lại tiến độ khoá học.'),
      };
    }
    const errs = validateResetResponse(body);
    if (errs.length > 0) {
      return {
        ok: false,
        status: res.status,
        message: `Phản hồi đặt lại khoá không đúng định dạng: ${errs.join('; ')}`,
      };
    }
    return { ok: true, data: body as CourseResetResponse, source: 'api' };
  } catch {
    return { ok: false, status: 0, message: friendlyApiError(0, null) };
  }
}

export function validateDisplayName(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return { ok: false, error: 'Vui lòng nhập tên hiển thị.' };
  if (cleaned.length < 2) return { ok: false, error: 'Tên hiển thị cần ít nhất 2 ký tự.' };
  if (cleaned.length > 40) return { ok: false, error: 'Tên hiển thị tối đa 40 ký tự.' };
  return { ok: true, value: cleaned };
}

export async function submitDisplayName(
  rawName: string,
  opts: { signedIn?: boolean; fetcher?: FetcherLike } = {},
): Promise<
  | { ok: true; name: string; source: 'api' | 'local' }
  | { ok: false; status: number; message: string }
> {
  const check = validateDisplayName(rawName);
  if (!check.ok) {
    return { ok: false, status: 400, message: check.error };
  }
  if (!opts.signedIn) {
    return { ok: true, name: check.value, source: 'local' };
  }
  if (!opts.fetcher) {
    return { ok: false, status: 0, message: 'Thiếu hàm fetcher để cập nhật tên hiển thị.' };
  }
  try {
    const res = await opts.fetcher('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: check.value }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: friendlyApiError(res.status, body, 'Không lưu được tên hiển thị.'),
      };
    }
    const returnedName =
      body &&
      typeof body === 'object' &&
      (body as { user?: { name?: unknown } }).user &&
      typeof (body as { user: { name?: unknown } }).user.name === 'string' &&
      (body as { user: { name: string } }).user.name.trim()
        ? (body as { user: { name: string } }).user.name.trim()
        : check.value;
    return { ok: true, name: returnedName, source: 'api' };
  } catch {
    return { ok: false, status: 0, message: friendlyApiError(0, null) };
  }
}
