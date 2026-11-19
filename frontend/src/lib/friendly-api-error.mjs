/**
 * friendly-api-error.mjs — Chuẩn hoá thông báo lỗi HTTP (400/401/403/429/5xx)
 * từ backend NestJS thành tiếng Việt thân thiện.
 *
 * Để `.mjs` để cả TypeScript (Next.js) và `node --test` nạp trực tiếp không
 * cần bật `allowImportingTsExtensions` trong tsconfig.json.
 */

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Tách chuỗi lỗi thân thiện từ response NestJS (kể cả 400 ValidationPipe / 403 / 429).
 * @param {number} status
 * @param {unknown} body
 * @param {string} [fallback]
 * @returns {string}
 */
export function friendlyApiError(
  status,
  body,
  fallback = 'Không thể xử lý yêu cầu lúc này. Vui lòng thử lại.',
) {
  if (status === 0) {
    return 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  }
  let serverMsg = null;
  if (body && typeof body === 'object') {
    const rec = body;
    const nested =
      rec.error && typeof rec.error === 'object'
        ? rec.error.message
        : undefined;
    const candidate =
      nested ??
      rec.message ??
      (typeof rec.error === 'string' ? rec.error : undefined);
    if (Array.isArray(candidate)) {
      const first = candidate.find((m) => isNonEmptyString(m));
      if (isNonEmptyString(first)) serverMsg = first.trim();
    } else if (isNonEmptyString(candidate)) {
      serverMsg = candidate.trim();
    }
  }
  if (status === 401) {
    return 'Phiên đăng nhập đã hết hạn hoặc chưa hợp lệ. Vui lòng đăng nhập lại.';
  }
  if (status === 403) {
    return serverMsg || 'Tài khoản chưa đủ quyền hoặc chưa ghi danh khoá học này.';
  }
  if (status === 429) {
    return 'Bạn thao tác quá nhanh. Vui lòng đợi ít phút rồi thử lại.';
  }
  if (status === 400) {
    return serverMsg
      ? `Dữ liệu chưa hợp lệ: ${serverMsg}`
      : 'Dữ liệu gửi lên chưa hợp lệ (400).';
  }
  if (status >= 500) {
    return 'Máy chủ đang bận, vui lòng thử lại sau ít phút.';
  }
  return serverMsg || fallback;
}
