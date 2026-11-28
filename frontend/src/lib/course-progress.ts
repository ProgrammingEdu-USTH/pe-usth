/**
 * course-progress.ts — phiên học trong máy và danh sách bài đã xong.
 *
 * Không import gì theo alias '@/…': bộ test chạy bằng `node --test` thuần và runner đó không phân giải alias.
 *
 * `apiFetch` gặp 401 sẽ thử refresh rồi RƠI XUỐNG `ensureGuest()` (api.ts), tức mọi khách vãng lai và mọi con
 * bot đều tạo một tài khoản khách. Nên trang công khai chỉ gọi API khi `hasStoredSession` nói máy đã có phiên.
 */

/** Khoá localStorage chứa access token — cùng khoá với api.ts và pe-bridge.js. */
export const LS_ACCESS = 'pe_access';
/** Khoá refresh token kiểu cũ; api.ts vẫn đọc nó một lần để chuyển phiên sang cookie. */
export const LS_LEGACY_REFRESH = 'pe_refresh';

/**
 * Trong máy này đã có phiên học chưa?
 *
 * Hàm thuần, nhận nguyên liệu từ ngoài để test được: `access` là
 * localStorage['pe_access'], `legacyRefresh` là localStorage['pe_refresh'],
 * `cookie` là document.cookie.
 *
 * VÌ SAO LẤY `pe_access` LÀM CỜ CHÍNH, KHÔNG LẤY COOKIE `pe_has_session`:
 * cookie đó được đặt với `max-age=28800` (8 giờ, xem api.ts) trong khi cookie
 * refresh của khách sống lâu hơn nhiều. Nếu dựa vào cookie cờ thì người quay
 * lại SAU 2 NGÀY bị coi là chưa có phiên và lại thấy "Bắt đầu học" — đúng cái
 * lỗ "không biết mình học tới đâu" mà tính năng này sinh ra để lấp. Còn
 * `pe_access` trong localStorage KHÔNG CÓ HẠN: nó chỉ bị xoá khi
 * `/auth/refresh` trả 401/403 (api.ts), tức khi phiên thật sự đã chết. Chọn
 * cách này thay vì nâng max-age của cookie để không phải sửa cả ba chỗ đang
 * ghi cờ (api.ts hai chỗ, pe-bridge.js một chỗ) — token hết hạn cũng không sao
 * vì đường chỉ-refresh tự đổi token mới.
 *
 * Vẫn chấp nhận cookie và `pe_refresh` làm cờ phụ: ở chế độ riêng tư
 * `localStorage.setItem` ném lỗi và api.ts bỏ qua, nên `pe_access` không bao
 * giờ được ghi dù người đó đang có phiên thật. Ba điều kiện OR này cố ý khớp
 * đúng `maybeLoggedIn` của api.ts: nếu ở đây nói "có phiên" thì refresh bên
 * trong api.ts cũng sẽ thật sự thử, và ngược lại.
 */
export function hasStoredSession(input: {
  access?: string | null;
  legacyRefresh?: string | null;
  cookie?: string | null;
}): boolean {
  const nonEmpty = (v: unknown) => typeof v === 'string' && v.trim() !== '';
  if (nonEmpty(input.access) || nonEmpty(input.legacyRefresh)) return true;
  return typeof input.cookie === 'string' && input.cookie.includes('pe_has_session=1');
}

/**
 * Lọc danh sách bài đã xong về tập số bài (1-based, khớp `lessons.sort_order`).
 *
 * Phải lọc chứ không dùng thẳng mảng từ API: `/enrolled` trả
 * `completedLessonNumbers` lấy từ DB dùng chung với bản Django cũ, nên có thể
 * lẫn số ngoài khoảng (bài đã gỡ khỏi giáo trình nhưng tiến độ còn), số trùng,
 * hoặc null. Số rác lọt vào sẽ làm bộ đếm "đã xong n/48" vượt 48.
 */
export function completedLessonSet(raw: unknown, total: number): Set<number> {
  const out = new Set<number>();
  if (!Array.isArray(raw) || !Number.isInteger(total) || total <= 0) return out;
  for (const item of raw) {
    const n = typeof item === 'number' ? item : Number(item);
    if (Number.isInteger(n) && n >= 1 && n <= total) out.add(n);
  }
  return out;
}
