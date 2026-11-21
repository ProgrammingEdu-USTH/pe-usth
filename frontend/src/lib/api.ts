/**
 * api.ts — fetch backend cho code React (KHÔNG dành cho JS legacy).
 *
 * Vì sao không dùng fetch('/api/...') tương đối: URL đó chỉ được pe-bridge.js
 * rewrite sang origin backend SAU khi bridge nạp xong, nhưng nhiều trang chỉ
 * mount <LegacyScripts> sau khi data đã fetch xong (component return null khi
 * chưa có data) → gà-và-trứng: fetch đầu tiên đập vào Next :3000 và 404.
 *
 * apiFetch trỏ thẳng NEXT_PUBLIC_API_URL + đính "Authorization: Bearer" từ
 * localStorage (cùng key pe_access với pe-bridge.js) + thử refresh token đúng
 * 1 lần khi 401 — mirror tối thiểu logic của bridge. Refresh token nằm trong
 * cookie httpOnly do backend đặt; pe_refresh trong localStorage chỉ còn là key
 * cũ, đọc một lần để chuyển phiên sang cookie rồi xoá.
 */

const LS_ACCESS = 'pe_access';
const LS_LEGACY_REFRESH = 'pe_refresh';

function origin(): string {
  const w = window as unknown as { __PE_API_ORIGIN?: string };
  return w.__PE_API_ORIGIN || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
}

function ls(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Refresh access token — dedupe bằng 1 promise đang bay (mirror pe-bridge.js).
 * ROTATE_REFRESH_TOKENS + BLACKLIST nghĩa là 2 lời gọi refresh song song với
 * cùng refresh token → lời gọi sau bị 401 (token đã vào blacklist) và đá user
 * ra ngoài oan. Nếu pe-bridge đã nạp thì delegate sang __PE_refreshAccess để
 * hai tầng (React + legacy) không refresh song song với nhau.
 */
let refreshing: Promise<string | null> | null = null;

function callRefresh(): Promise<Response> {
  const legacy = ls(LS_LEGACY_REFRESH);
  return fetch(`${origin()}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(legacy ? { refresh: legacy } : {}),
  });
}
/**
 * Hạn DỰ PHÒNG cho cookie mốc `pe_has_session`, chỉ dùng khi máy chủ không nói.
 *
 * Khớp mặc định `JWT_REFRESH_EXPIRES='8h'` trong `src/config/env.validation.ts`.
 * CỐ Ý chọn ngắn: đoán dài hơn hạn thật là trang công khai hiện "Tiếp tục ở bài
 * X" cho một phiên đã chết — bấm vào thì `apiFetch` refresh không được, rơi
 * xuống `ensureGuest()` và người học nhận một tài khoản khách MỚI, tức mất tiến
 * độ. Đoán ngắn hơn thì chỉ mất cái badge, tiến độ còn nguyên.
 */
export const HAN_DU_PHONG_GIAY = 8 * 3600;

/**
 * Rút hạn phiên (giây) từ body response của `/auth/refresh` (hoặc `/auth/guest`):
 * ưu tiên `expiresAt` (ISO string hoặc epoch ms/giây), kế đến `refreshExpiresIn`,
 * không có thì rơi về `HAN_DU_PHONG_GIAY` (8 giờ, khớp `JWT_REFRESH_EXPIRES`).
 */
export function hanPhienTuPhanHoi(body?: unknown, nowMs: number = Date.now()): number {
  if (!body || typeof body !== 'object') return HAN_DU_PHONG_GIAY;
  const record = body as Record<string, unknown>;
  const exp = record.expiresAt;
  if (typeof exp === 'string') {
    const trimmed = exp.trim();
    if (trimmed && !/^\d+$/.test(trimmed)) {
      const parsedMs = Date.parse(trimmed);
      if (Number.isFinite(parsedMs)) {
        const sec = Math.floor((parsedMs - nowMs) / 1000);
        if (sec > 0) return sec;
      }
    }
  } else if (typeof exp === 'number' && Number.isFinite(exp) && exp > 0) {
    let sec = 0;
    if (exp > 1e12) sec = Math.floor((exp - nowMs) / 1000);
    else if (exp > 1e9) sec = Math.floor(exp - nowMs / 1000);
    if (sec > 0) return sec;
  }
  const rei = record.refreshExpiresIn;
  if (typeof rei === 'number' && Number.isFinite(rei) && rei > 0) {
    return Math.floor(rei);
  }
  return HAN_DU_PHONG_GIAY;
}

/**
 * Ghi cookie mốc "đang có phiên" cho proxy.ts của Next đọc (nó không đọc được
 * localStorage, và `pe_refresh` thì httpOnly).
 *
 * `giay` lấy từ `expiresAt` hoặc `refreshExpiresIn` trong response của `/auth/refresh`
 * và `/auth/*`; không có thì dùng mặc định 8 giờ (`JWT_REFRESH_EXPIRES`). Trước đây
 * có các chỗ ghi cứng 8 giờ (`max-age=28800` trong chú thích lịch sử) dù production
 * có thể đặt `JWT_REFRESH_EXPIRES=24h`, làm từ giờ thứ 8 tới giờ thứ 24 cookie mốc
 * đã hết trong khi phiên còn sống.
 */
// Xuất ra ngoài CHỈ để test được: nó quyết hạn của cookie mốc, và chính con số
// đó từng lệch 3 lần so với máy chủ mà không có ca nào bắt.
export function danhDauPhien(giay?: unknown): void {
  const n = typeof giay === 'number' && Number.isFinite(giay) && giay > 0
    ? Math.floor(giay)
    : HAN_DU_PHONG_GIAY;
  try {
    document.cookie = `pe_has_session=1; path=/; max-age=${n}; SameSite=Lax`;
  } catch {
    /* non-browser */
  }
}

/** Xoá `pe_access`, `pe_refresh` và cookie mốc `pe_has_session` (proxy.ts chặn từ server theo cờ này). */
function xoaPhienCucBo(): void {
  try {
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_LEGACY_REFRESH);
  } catch {
    /* private mode */
  }
  try {
    document.cookie = 'pe_has_session=; path=/; max-age=0; SameSite=Lax';
  } catch {
    /* non-browser */
  }
}

/**
 * Đăng xuất: máy chủ thu hồi cả chuỗi phiên của thiết bị (POST /auth/logout đọc cookie
 * refresh httpOnly) rồi xoá phiên cục bộ. Xoá cục bộ LUÔN chạy, kể cả khi mạng lỗi —
 * người dùng bấm thoát thì không được còn cờ phiên.
 */
export async function dangXuat(): Promise<void> {
  try {
    await fetch(`${origin()}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: ls(LS_LEGACY_REFRESH) ?? undefined }),
    });
  } catch {
    /* mạng lỗi: vẫn xoá phiên cục bộ */
  } finally {
    xoaPhienCucBo();
  }
}

function refreshAccess(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { __PE_refreshAccess?: () => Promise<string | null> };
    if (typeof w.__PE_refreshAccess === 'function') return w.__PE_refreshAccess();
  }
  if (refreshing) return refreshing;
  // Khách chưa đăng nhập thì không có cookie refresh — khỏi gọi mạng.
  const maybeLoggedIn =
    ls(LS_ACCESS) || ls(LS_LEGACY_REFRESH) || document.cookie.includes('pe_has_session=1');
  if (!maybeLoggedIn) return Promise.resolve(null);
  refreshing = callRefresh()
    // Tab khác vừa rotate cùng cookie -> 401; thử lại 1 lần với cookie mới.
    .then((r) => (r.status === 401 ? new Promise((ok) => setTimeout(ok, 400)).then(callRefresh) : r))
    .then(async (rr) => {
      if (rr.status === 401 || rr.status === 403) {
        xoaPhienCucBo();
        return null;
      }
      if (!rr.ok) return null; // lỗi mạng/5xx: giữ token, thử lại sau
      const d = await rr.json().catch(() => null);
      if (!d?.access) return null;
      try {
        localStorage.setItem(LS_ACCESS, d.access);
        localStorage.removeItem(LS_LEGACY_REFRESH);
      } catch {
        /* private mode */
      }
      danhDauPhien(hanPhienTuPhanHoi(d));
      return d.access as string;
    })
    .catch(() => null);
  refreshing.then(
    () => { refreshing = null; },
    () => { refreshing = null; },
  );
  return refreshing;
}

/**
 * Tài khoản khách: frontend không còn trang đăng nhập/đăng ký, nên ai mở link
 * mà chưa có phiên thì tự nhận một tài khoản ẩn danh (POST /auth/guest) và học
 * ngay — tiến độ vẫn lưu trên server. Dedupe bằng một promise đang bay: trang
 * bài học gọi 3 API song song, không được sinh ra 3 tài khoản khách.
 */
let guesting: Promise<string | null> | null = null;

function ensureGuest(): Promise<string | null> {
  if (guesting) return guesting;
  guesting = fetch(`${origin()}/auth/guest`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
    .then(async (r) => {
      if (!r.ok) return null;
      const d = await r.json().catch(() => null);
      if (!d?.access) return null;
      try {
        localStorage.setItem(LS_ACCESS, d.access);
      } catch {
        /* private mode: vẫn dùng được access trong phiên này */
      }
      danhDauPhien(hanPhienTuPhanHoi(d));
      return d.access as string;
    })
    .catch(() => null)
    .finally(() => {
      guesting = null;
    });
  return guesting;
}

async function request(
  path: string,
  opts: RequestInit = {},
  allowGuest = true,
): Promise<Response> {
  const base = origin();
  const send = (access: string | null) => {
    const headers = new Headers(opts.headers || {});
    if (access && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${access}`);
    return fetch(base + path, { ...opts, headers });
  };

  let res = await send(ls(LS_ACCESS));
  if (res.status === 401) {
    // Thứ tự: refresh phiên cũ trước (giữ tiến độ của khách đã học hôm qua);
    // chỉ khi allowGuest bật và không còn phiên nào mới tạo tài khoản khách mới.
    const refreshed = await refreshAccess();
    const access = refreshed ?? (allowGuest ? await ensureGuest() : null);
    if (access) res = await send(access);
  }
  return res;
}

export function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  return request(path, opts, true);
}

/**
 * Fetch chỉ dùng phiên đang có — KHÔNG tự gọi `/auth/guest` khi gặp 401.
 * Dùng cho trang công khai (trang chủ, khoá học, khảo sát đầu vào, hồ sơ)
 * để khách vãng lai/bot không sinh hàng loạt tài khoản khách.
 */
export function apiFetchSessionOnly(path: string, opts: RequestInit = {}): Promise<Response> {
  return request(path, opts, false);
}

/**
 * Bóc danh sách ra khỏi "vỏ" response của backend NestJS.
 *
 * Backend trả dạng bọc: {ok: true, enrolled: [...]}, {ok: true, courses: [...]}.
 * Nhiều component trước đây kiểm tra `Array.isArray(data)` rồi mới `.find(...)`
 * — với dạng bọc thì điều kiện đó LUÔN SAI, nên kết quả luôn rỗng. Hậu quả thật
 * đã gặp: trang chi tiết khoá học không bao giờ biết người dùng đã đăng ký (nút
 * luôn hiện "Đăng ký ngay"), và trang chi tiết các khoá không phải db_design
 * tưởng khoá không tồn tại rồi chuyển hướng thẳng về dashboard.
 *
 * Hàm này chấp nhận cả hai dạng để không phá client cũ.
 */
export function asList<T = Record<string, unknown>>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const value = (data as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}

/**
 * Tìm bản ghi đăng ký của một khoá học.
 * Chấp nhận cả `id` lẫn `courseId` vì response từng dùng tên khác nhau.
 */
export function findEnrollment(
  enrolledList: Array<Record<string, unknown>>,
  courseId: string,
): Record<string, unknown> | null {
  return (
    enrolledList.find((e) => e.id === courseId || e.courseId === courseId) ?? null
  );
}
