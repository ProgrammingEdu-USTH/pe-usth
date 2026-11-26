/**
 * Quyết định KHI NÀO coi là "không nạp được trình soạn thảo" ở trang /ide.
 *
 * VÌ SAO PHẢI CÓ FILE NÀY: đo ngày 14/10/2026, /ide nạp Monaco bằng
 * `@monaco-editor/react`, và cả hai lớp nạp đều KHÔNG có đường thoát khi hỏng:
 *  - `next/dynamic` chỉ có prop `loading`, không có `error`;
 *  - `@monaco-editor/react` bắt lỗi của `loader.init()` rồi `console.error`,
 *    không đẩy gì ra giao diện.
 * Hệ quả: chặn nguồn tải Monaco là khung soạn thảo đứng mãi ở chữ "Loading…" —
 * không báo lỗi, không hết giờ, không nút thử lại. Trang /ide là thứ DUY NHẤT
 * còn demo được trong buổi thử nghiệm USTH 14/10/2026 (DB Neon đang hỏng đăng
 * nhập nên phần bài học không vào được), nên "đứng im vĩnh viễn" là hỏng hóc
 * phải chặn bằng test, không phải bằng mắt.
 *
 * Vì sao là file riêng không import gì theo alias '@/…': bộ test chạy bằng
 * `node --test` thuần (xem script `test:unit`) và runner đó không phân giải
 * alias, cũng không bóc được JSX. Tiền lệ: src/lib/feedback-link.ts,
 * src/components/python-studio/prewarm-gate.ts.
 */

/**
 * Trần chờ trước khi coi là hỏng: 25 giây.
 *
 * Vì sao 25 s:
 *  1. Monaco TỰ HOST (public/monaco/v0.57.0/vs), lượt tải đầu cho editor python ~1 MB trên dây. Mạng tốt
 *     thì dưới 2 giây.
 *  2. Mạng điện thoại chậm (1,6 Mbps, 150 ms, CPU chậm 4 lần) thì editor lên sau 10,2–10,4 s (đo
 *     26/11/2026, 3 lượt, đã hoãn nạp Python). Trần cũ 12 s chỉ cách đó 1,6 s: mạng chậm thêm một chút là
 *     người dùng bị kết luận oan và mất luôn editor cho tới khi tải lại trang.
 *  3. Hỏng kiểu BIẾT NGAY (404 vì chép thiếu file, domain bị chặn) không chờ tới đây: `loader.js` bắn
 *     `onerror` trong vài trăm ms và cờ `rejected` bên dưới cắt ngay.
 *  4. Nên trần này chỉ còn đỡ kiểu hỏng IM LẶNG: proxy/captive portal nhận kết nối rồi không trả gì.
 *     25 s vẫn ngắn hơn lúc trình duyệt tự bỏ cuộc.
 *
 * Đổi số này thì sửa cả chú thích: nó là một đánh đổi có số đo, không phải hằng số bịa.
 */
export const EDITOR_LOAD_TIMEOUT_MS = 25_000;

/** Những gì trang biết được về lần nạp trình soạn thảo đang diễn ra. */
export type EditorLoadSignals = {
  /** Monaco đã gọi `onMount`: editor thật đã dựng xong trong DOM. */
  mounted: boolean;
  /**
   * `loader.init()` đã từ chối (thường là `script.onerror` của loader.js).
   * Đây là bằng chứng CHẮC CHẮN hỏng nên không cần chờ hết trần.
   */
  rejected: boolean;
  /** Đã chờ bao lâu kể từ lúc bắt đầu lần thử này (ms). */
  elapsedMs: number;
  /** Trần chờ riêng (chỉ dùng cho test); bỏ trống = EDITOR_LOAD_TIMEOUT_MS. */
  timeoutMs?: number;
};

/**
 * `ready`  — dùng Monaco như thường.
 * `loading` — còn chờ, giữ khung "Đang tải trình soạn thảo…".
 * `failed` — hiện thông báo + nút thử lại + rơi về <textarea> để còn gõ được.
 */
export type EditorLoadPhase = 'ready' | 'loading' | 'failed';

export function editorLoadPhase(signals: EditorLoadSignals): EditorLoadPhase {
  // `mounted` THẮNG mọi tín hiệu khác, kể cả `rejected`. Vì sao: trang gọi
  // `loader.init()` một lần nữa để biết lỗi sớm, và lời gọi đó có thể từ chối
  // vì lý do vô hại (ví dụ bị huỷ khi React 19 StrictMode dựng lại effect).
  // Editor đã nằm trong DOM rồi thì che nó bằng <textarea> là tự làm hỏng.
  if (signals.mounted) return 'ready';
  if (signals.rejected) return 'failed';

  const timeoutMs =
    // Trần phải là số dương hữu hạn. Giá trị rác (0, âm, NaN) mà để nguyên thì
    // phép so sánh dưới đây đúng NGAY LẬP TỨC — nghĩa là người dùng thấy
    // <textarea> dù Monaco đang chạy tốt. Hỏng kiểu đó khó nhìn ra nên chặn ở
    // đây, không phải ở chỗ gọi.
    Number.isFinite(signals.timeoutMs) && (signals.timeoutMs as number) > 0
      ? (signals.timeoutMs as number)
      : EDITOR_LOAD_TIMEOUT_MS;

  // Thời gian đã chờ tính bằng `Date.now()`, tức đồng hồ TƯỜNG: máy đổi múi
  // giờ / đồng bộ NTP giữa lúc chờ là ra số âm hoặc NaN. Khi không tin được
  // thì nghiêng về "còn chờ" chứ không kết luận hỏng — kết luận oan là giật
  // mất editor đang hoạt động khỏi tay người dùng.
  if (!Number.isFinite(signals.elapsedMs) || signals.elapsedMs < 0) return 'loading';

  return signals.elapsedMs >= timeoutMs ? 'failed' : 'loading';
}
