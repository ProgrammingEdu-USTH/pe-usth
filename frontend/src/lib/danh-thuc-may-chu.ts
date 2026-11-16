/**
 * ĐÁNH THỨC MÁY CHỦ — một lượt `GET /health` mỗi phiên, bắn từ trang chủ và trang khoá học.
 *
 * VÌ SAO. Request API ĐẦU TIÊN sau lúc máy chủ nghỉ mất hơn 25 giây (Render + Neon thức dậy;
 * đo trên production 25/10: lượt đầu > 25 s, các lượt sau 300 ms; 33,2 s ở lần đo 16/11).
 * Mọi người học đi vào một bài đều phải qua `apiFetch` của trang bài học, nên người đầu tiên
 * trong ngày ngồi nhìn "Đang tải bài học…" cả nửa phút — và mọi tester đánh giá giao diện
 * cũng đi qua khoảng chờ ấy, nên nó làm lệch cả kết quả so sánh. Trang chủ và trang khoá học
 * là hai trang ngay TRƯỚC bài học (cả hai công khai, không gọi API khi chưa có phiên), nên
 * đó là chỗ để máy chủ thức dậy trong lúc người ta đọc danh sách bài.
 *
 * KHÔNG QUA `apiFetch`, và đó là toàn bộ yêu cầu. `apiFetch` gặp 401 thì TỰ TẠO tài khoản
 * khách (`ensureGuest`), nên gọi nó ở trang công khai là mỗi lượt quét của bot sinh một hàng
 * `@guest.local` và ăn hạn mức `THROTTLE_GUEST_LIMIT` theo IP. `/health` là route công khai,
 * không cần phiên, không tạo gì: một `fetch` trần, `no-cors` (ta không đọc kết quả, chỉ cần
 * máy chủ nhận được), `credentials: 'omit'` (không gửi cookie phiên), không header nào.
 *
 * MỘT LẦN MỖI PHIÊN: cờ trong `sessionStorage`. Cờ đặt TRƯỚC khi gọi — một lượt hỏng thì
 * không được thử lại theo từng lần mount. Nếu `sessionStorage` bị chặn (cửa sổ riêng tư,
 * nhóm lưu trữ tắt) thì dùng cờ trong bộ nhớ: tệ nhất là một lượt mỗi lần tải lại trang.
 *
 * GIỚI HẠN PHẢI NÓI RA: hàm này chỉ BẮN lượt đánh thức; nó không đo (và không chứng minh)
 * rằng nó RÚT NGẮN thời gian chờ. Số đo đó cần ≥ 20 phút nghỉ của máy chủ rồi ba lượt xen
 * kẽ có/không ping trên môi trường dev — chưa có môi trường ấy trong vòng lặp, nên thời gian
 * giảm được CHƯA ĐO và không có ngưỡng giây nào ở đây.
 *
 * File KHÔNG import gì: test nạp thẳng `.ts` bằng `node --test --experimental-strip-types`.
 */

const KHOA_PHIEN = 'pe-da-danh-thuc-may-chu';

export interface PhuThuoc {
  /** Mặc định `globalThis.fetch`. */
  fetch?: typeof fetch;
  /** Mặc định `globalThis.sessionStorage` (có thể ném khi bị chặn). */
  luuTru?: Pick<Storage, 'getItem' | 'setItem'>;
  /** Origin của API, KHÔNG kèm `/health`. */
  origin: string;
}

/**
 * Dựng một bộ đánh thức có trạng thái RIÊNG (cờ trong bộ nhớ). Tách khỏi singleton để ca test
 * tạo bộ mới mỗi ca, không dính trạng thái của ca trước.
 */
export function taoBoDanhThuc(dep: PhuThuoc): () => boolean {
  let daBan = false;
  return () => {
    if (daBan) return false;
    const goi = dep.fetch ?? (typeof fetch === 'function' ? fetch : undefined);
    if (!goi) return false;
    let luu: PhuThuoc['luuTru'];
    try {
      luu = dep.luuTru ?? globalThis.sessionStorage;
    } catch {
      luu = undefined;
    }
    try {
      if (luu?.getItem(KHOA_PHIEN)) {
        daBan = true;
        return false;
      }
      luu?.setItem(KHOA_PHIEN, '1');
    } catch {
      // sessionStorage bị chặn: cờ trong bộ nhớ bên dưới là đủ cho phiên TRANG này.
    }
    daBan = true;
    try {
      const rao = goi(`${dep.origin.replace(/\/+$/, '')}/health`, {
        mode: 'no-cors',
        cache: 'no-store',
        credentials: 'omit',
        keepalive: true,
      });
      // Ta không đọc kết quả; một lượt hỏng (mạng, CORS, máy chủ chưa dậy) phải im lặng.
      void Promise.resolve(rao).catch(() => {});
    } catch {
      // fetch ném đồng bộ (URL hỏng): cũng im lặng.
    }
    return true;
  };
}
