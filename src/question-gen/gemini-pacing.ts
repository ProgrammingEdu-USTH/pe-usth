/**
 * Nhịp gọi và thời gian chờ thử lại cho script sinh đề gọi Gemini.
 *
 * Vì sao cần: gói miễn phí giới hạn 5 yêu cầu/phút cho model. Chạy 4 bài song song vượt
 * ngay (HTTP 429), và script cũ chỉ chờ 4–8 giây trong khi Google ghi rõ "retry in 16s",
 * nên thử lại vẫn bị 429. Phần này đọc đúng thời gian Google yêu cầu và giãn các lượt gọi.
 * Là hàm thuần (trừ Pacer) để Jest kiểm được.
 */

/**
 * Lỗi 429 là quota theo NGÀY ("requests per day", "PerDay") chứ không phải theo phút.
 * Chờ vài chục giây không giải quyết được, nên không thử lại.
 */
export function isDailyQuota(errorBody: unknown): boolean {
  return /per ?day/i.test(JSON.stringify(errorBody ?? ''));
}

/**
 * Tìm số giây Google yêu cầu chờ, trong văn bản lỗi ("Please retry in 16.41s") hoặc trong
 * `error.details[].retryDelay` ("16s"). Không thấy thì trả null.
 */
export function parseRetryDelayMs(errorBody: unknown): number | null {
  const text = JSON.stringify(errorBody ?? '');
  // "retry in 16.4s" hoặc "retry in 19h5m25.79s": cộng đủ giờ/phút/giây.
  const inText = /retry in ((?:\d+h)?(?:\d+m)?(?:[\d.]+s)?)/i.exec(text);
  if (inText && inText[1]) {
    const h = /(\d+)h/.exec(inText[1]);
    const m = /(\d+)m/.exec(inText[1]);
    const s = /([\d.]+)s/.exec(inText[1]);
    const secs =
      (h ? Number(h[1]) * 3600 : 0) +
      (m ? Number(m[1]) * 60 : 0) +
      (s ? Number(s[1]) : 0);
    if (secs > 0) return Math.ceil(secs * 1000);
  }
  const inDetails = /"retryDelay":\s*"([\d.]+)s"/.exec(text);
  if (inDetails) return Math.ceil(Number(inDetails[1]) * 1000);
  return null;
}

/**
 * Thời gian chờ trước lần thử lại thứ `attempt` (bắt đầu từ 1), hoặc null nếu không nên thử.
 * - 429 (vượt quota/phút): chờ đúng thời gian Google yêu cầu cộng 1 giây đệm; không biết thì 20 s.
 *   Google yêu cầu chờ lâu hơn MAX_HINTED_WAIT_MS thì đó là quota NGÀY, không phải quota phút:
 *   dừng ngay. Đo 24/11/2026: gói miễn phí gemini-3.8-flash cho 20 yêu cầu/ngày và trả
 *   "retry in 19h5m25s" — chờ theo đó là treo script 19 tiếng.
 * - 503 (model quá tải, tạm thời): 15 s, 30 s, 45 s… tối đa 90 s.
 * - Lỗi khác (4xx khác, key sai, model không có): không thử lại.
 * `maxAttempts` là số lần thử lại tối đa, không tính lượt đầu.
 */
export const MAX_HINTED_WAIT_MS = 120_000;

export function retryWaitMs(
  status: number,
  errorBody: unknown,
  attempt: number,
  maxAttempts: number,
): number | null {
  if (attempt > maxAttempts) return null;
  if (status === 429) {
    if (isDailyQuota(errorBody)) return null;
    const hinted = parseRetryDelayMs(errorBody);
    if (hinted !== null && hinted > MAX_HINTED_WAIT_MS) return null;
    return (hinted ?? 19_000) + 1000;
  }
  if (status >= 500) return Math.min(15_000 * attempt, 90_000);
  return null;
}

/**
 * Giữ khoảng cách tối thiểu giữa hai lượt gọi, dùng chung cho mọi bài. Các lượt gọi được
 * xếp hàng, không song song, nên 5 yêu cầu/phút không bị vượt dù bài nào thử lại.
 */
export class Pacer {
  // null = chưa có lượt nào: lượt đầu không được chờ (khởi tạo 0 sẽ bắt chờ cả khoảng).
  private last: number | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly minIntervalMs: number,
    private readonly now: () => number = Date.now,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
  ) {}

  /** Chờ tới lượt của mình rồi trả quyền; mỗi lần gọi `wait()` là một chỗ trong hàng. */
  wait(): Promise<void> {
    const turn = this.queue.then(async () => {
      if (this.last !== null) {
        const gap = this.last + this.minIntervalMs - this.now();
        if (gap > 0) await this.sleep(gap);
      }
      this.last = this.now();
    });
    this.queue = turn.catch(() => undefined);
    return turn;
  }
}
