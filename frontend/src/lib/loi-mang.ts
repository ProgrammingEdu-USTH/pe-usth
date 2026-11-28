/**
 * Lời báo lỗi cho người học. Trình duyệt tự nói bằng tiếng Anh khi không nối được ("Failed to fetch" ở
 * Chrome, "Load failed" ở Safari, "NetworkError…" ở Firefox); đo 26/11/2026 thấy nguyên văn đó hiện ra ở màn
 * bài học. Lỗi khác giữ nguyên lời vì máy chủ đã viết sẵn bằng tiếng Việt.
 *
 * Không import gì: test nạp thẳng tệp này bằng `node --test`.
 */
const LOI_MANG = /failed to fetch|load failed|networkerror|network request failed/i;

export function chuLoi(error: unknown, duPhong = 'Không kết nối được máy chủ.'): string {
  const loi = error instanceof Error ? error.message : '';
  if (LOI_MANG.test(loi)) return 'Không nối được tới máy chủ. Kiểm tra mạng rồi thử lại.';
  return loi || duPhong;
}
