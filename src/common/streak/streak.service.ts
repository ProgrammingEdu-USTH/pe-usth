import { Injectable } from '@nestjs/common';

const MS_PER_DAY = 86_400_000;

/**
 * Múi giờ NGHIỆP VỤ dùng để xác định "hôm nay" của người học.
 *
 * Phải chốt cứng, KHÔNG được lấy theo múi giờ của máy chủ: khi deploy lên cloud
 * (gần như luôn chạy UTC) trong khi người học ở GMT+7, ranh giới ngày lệch 7
 * tiếng và gây SAI CHUỖI NGÀY HỌC theo cả hai hướng:
 *  - Học lúc 05:00 rồi 20:00 cùng một ngày Việt Nam -> máy chủ UTC thấy là hai
 *    ngày khác nhau -> chuỗi cộng oan 2 lần trong một ngày.
 *  - Học 08:00 hôm nay rồi 06:00 sáng hôm sau -> máy chủ UTC thấy cùng một ngày
 *    -> học hai ngày liên tiếp mà chuỗi không tăng, người dùng mất chuỗi oan.
 */
const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE ?? 'Asia/Ho_Chi_Minh';

// Tạo formatter MỘT LẦN: khởi tạo Intl.DateTimeFormat khá đắt, mà hàm này chạy
// trên đường hoàn thành mỗi bài học.
// 'en-CA' cho ra đúng định dạng YYYY-MM-DD, dễ tách.
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Chuyển timestamp thành giá trị ngày để LƯU vào cột @db.Date, tính theo NGÀY
 * Ở MÚI GIỜ NGHIỆP VỤ (không phụ thuộc múi giờ máy chủ).
 *
 * Vẫn dùng Date.UTC ở bước cuối vì Prisma ghi/đọc cột `date` ở mốc UTC midnight.
 */
export function toStudyDate(d: Date = new Date()): Date {
  const [y, m, day] = dayFormatter.format(d).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

/** Số thứ tự ngày, tính từ các thành phần UTC (giá trị @db.Date luôn ở UTC midnight). */
function dayIndex(d: Date): number {
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / MS_PER_DAY,
  );
}

/**
 * NGÀY ÂN HẠN: nghỉ đúng bấy nhiêu ngày vẫn KHÔNG mất chuỗi (và ngày học kế tiếp vẫn +1).
 *
 * Trước đây nghỉ MỘT ngày là về 1. Với khoá không đăng nhập, không bắt buộc, người học một mình,
 * đó là trừng phạt người nghỉ ngày — kiểm toán 16/11/2026 gọi tên là "ngõ cụt cảm xúc" và chủ dự
 * án chốt SỬA bằng ngày ân hạn (không gỡ chuỗi). 1 ngày: đủ cho một ngày bận, chưa đủ để chuỗi
 * thành con số vô nghĩa.
 *
 * GIỚI HẠN đã biết: ân hạn tính THEO TỪNG KHOẢNG NGHỈ, không theo số lần — người học cách ngày
 * giữ chuỗi mãi. Giới hạn số lần (vd. 1 lần/tuần) cần thêm cột lưu, và chưa có bằng chứng cần.
 */
export const NGAY_AN_HAN = 1;

/**
 * Task 109 — logic streak dùng CHUNG cho completeLesson và completeMission.
 * Sheet 3 cảnh báo: viết lặp ở 2 chỗ sẽ lệch nhau và phá bảng xếp hạng streak.
 */
@Injectable()
export class StreakService {
  computeNewStreak(
    lastStudyDate: Date | null | undefined,
    currentStreak: number,
    today: Date = new Date(),
  ): number {
    // Chưa học bao giờ -> bắt đầu chuỗi.
    if (!lastStudyDate) return 1;

    const gap = dayIndex(toStudyDate(today)) - dayIndex(lastStudyDate);

    // Đã học hôm nay rồi -> GIỮ NGUYÊN, không cộng lần 2 trong cùng ngày.
    if (gap <= 0) return currentStreak > 0 ? currentStreak : 1;

    // Học liên tục từ hôm qua, hoặc nghỉ trong hạn ân hạn -> +1.
    if (gap <= 1 + NGAY_AN_HAN) return currentStreak + 1;

    // Nghỉ quá hạn ân hạn -> reset về 1.
    return 1;
  }

  /** true nếu ngày học gần nhất nằm trong hôm nay, hôm qua hoặc hạn ân hạn (streak còn hiệu lực). */
  isStreakActive(
    lastStudyDate: Date | null | undefined,
    today: Date = new Date(),
  ): boolean {
    if (!lastStudyDate) return false;
    return (
      dayIndex(toStudyDate(today)) - dayIndex(lastStudyDate) <= 1 + NGAY_AN_HAN
    );
  }
}
