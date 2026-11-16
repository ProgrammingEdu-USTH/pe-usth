/**
 * GIỮ CHÂN D1 / D7 / D30 — phần THUẦN, không đụng DB, để Jest chấm được mà không cần `DATABASE_URL`.
 *
 * Câu hỏi: người học QUAY LẠI không, và sau bao lâu? Phễu theo bài (`pheu-tien-do.ts`) trả lời "dừng ở
 * bài nào"; con số này trả lời "bỏ đi hay quay lại". Cả hai cùng nguồn — `enrollments` + `lesson_progress`,
 * hai bảng vốn phải có để sản phẩm chạy — nên CHỈ ĐỌC, không cần lớp ghi vết, không cần sự đồng ý
 * (Luật 91/2025: dữ liệu theo dõi hành vi là dữ liệu nhạy cảm; hai bảng này không phải dữ liệu theo dõi).
 *
 * ĐỊNH NGHĨA (khai trước, không chọn sau khi thấy số):
 *   · NGÀY 0 = ngày ghi danh (`enrollments.enrolled_at`, múi giờ UTC+7). Ghi danh xảy ra TỰ ĐỘNG khi mở bài.
 *   · "HOẠT ĐỘNG" = hoàn thành một bài MỚI (`lesson_progress.completed_at`). Chỉ đó là thứ có dấu thời gian.
 *   · MẪU SỐ của mốc N = tài khoản mà ngày thứ N ĐÃ TRỌN QUA (ngày 0 + N < hôm nay). Tài khoản chưa tới
 *     tuổi không bị đếm là "bỏ đi": một người ghi danh hôm qua chưa có cơ hội quay lại ngày thứ 7.
 *   · TỬ SỐ "đúng ngày N" = có hoàn thành bài mới ĐÚNG ngày 0 + N. "Từ ngày N" = có hoàn thành bài mới ở
 *     bất kỳ ngày ≥ 0 + N — rộng hơn, vì người học không nhất thiết quay lại đúng ngày thứ 7.
 *
 * Hàm thuần, cùng khuôn `pheu-tien-do.ts` (và dùng chung luật đặt tên + ngưỡng che ô của nó).
 */
import { HAU_TO_KHACH, kiemTenChiSo, O_TOI_THIEU } from './pheu-tien-do';

export type HangGhiDanhGC = { userId: number; email: string; ghiDanhLuc: Date };
export type HangHoanThanhGC = { userId: number; luc: Date };

/** Các mốc báo cáo. Đổi danh sách này là đổi câu hỏi, nên nó là một dòng diff có người đọc. */
export const MOC_NGAY = [1, 7, 30] as const;

const MS_NGAY = 86_400_000;
/** Ngày tính theo giờ Việt Nam (UTC+7): người học ở đây, "hôm sau" của họ không phải của UTC. */
const LECH_VN_MS = 7 * 3_600_000;

/** Số ngày kể từ epoch, theo UTC+7. Hai thời điểm cùng ngày VN cho cùng một số. */
export function ngayVN(d: Date): number {
  return Math.floor((d.getTime() + LECH_VN_MS) / MS_NGAY);
}

/**
 * CHỈ SỐ KHAI TRƯỚC. `dungGiuChan` chỉ tính đúng ba thứ này; tên nào cũng phải qua `kiemTenChiSo` (phải
 * nói "tài khoản", cấm "người dùng"/"học viên" — đơn vị thật là TÀI KHOẢN, một người quay lại sau 30 ngày
 * đếm thành hai).
 */
export const CHI_SO_KHAI_TRUOC_GC = [
  'số tài khoản khách đủ tuổi (đã qua trọn ngày thứ N) làm mẫu số',
  'tỉ lệ tài khoản khách hoàn thành bài mới ĐÚNG ngày thứ N sau ngày ghi danh',
  'tỉ lệ tài khoản khách còn hoàn thành bài mới từ ngày thứ N trở đi',
] as const;

export type OGiuChan = {
  moc: number;
  /** Tài khoản đủ tuổi cho mốc này. */
  mauSo: number;
  /** Tài khoản CHƯA đủ tuổi (loại khỏi mẫu số, nói ra để người đọc thấy nó không bị lờ đi). */
  chuaDuTuoi: number;
  /** Mẫu số < `O_TOI_THIEU` ⇒ che mọi con số phía dưới. */
  che: boolean;
  dungNgay: number | null;
  tuNgay: number | null;
  phanTramDungNgay: number | null;
  phanTramTuNgay: number | null;
};

export type KetQuaGiuChan = {
  donVi: string;
  daGhiDanh: number;
  o: OGiuChan[];
  gioiHan: string[];
};

export const GIOI_HAN_GC = [
  'ĐƠN VỊ LÀ TÀI KHOẢN KHÁCH, KHÔNG PHẢI NGƯỜI. Refresh token của khách sống 30 ngày; hết hạn là cấp tài ' +
    'khoản MỚI, nên người quay lại sau 30 ngày đếm thành hai tài khoản và mọi tỉ lệ "còn lại" ở đây là ' +
    'GIỚI HẠN DƯỚI. ĐỪNG gọi nó là tỉ lệ bỏ học.',
  'TỬ SỐ LÀ HOÀN THÀNH BÀI MỚI, KHÔNG PHẢI MỞ BÀI. `lesson_progress` chỉ ghi ở `completeLesson`, và ' +
    '`completed_at` là LẦN ĐẦU hoàn thành một bài. Người quay lại đọc lại bài cũ hoặc đọc dở mà chưa bấm ' +
    '"Hoàn thành" KHÔNG xuất hiện. Con số này đo việc NỘP, không đo việc ĐỌC — nó thấp hơn thực tế.',
  'MẪU SỐ LÀ "ĐÃ GHI DANH", và ghi danh xảy ra TỰ ĐỘNG khi mở bài đầu tiên: nó đếm cả người mở một bài ' +
    'rồi đóng ngay, kể cả bot. Không có cách phân biệt bằng dữ liệu đang có.',
  'NGÀY TÍNH THEO UTC+7. Một lượt hoàn thành lúc 00:30 giờ Việt Nam thuộc ngày hôm sau, dù lúc 17:30 UTC.',
  `Mẫu số dưới ${O_TOI_THIEU} tài khoản thì che mọi con số của mốc đó: một tỉ lệ tính từ vài quan sát không ` +
    'phải một tỉ lệ.',
  'KHÔNG phân biệt nhóm (ai vào từ đâu, ai có hỗ trợ): đây là con số của cả khoá, không phải của một ' +
    'can thiệp. Muốn so trước/sau một thay đổi thì phải chạy hai lần cách nhau và nhớ rằng cohort khác nhau.',
];

/**
 * Dựng bảng giữ chân. `bayGio` truyền vào (không đọc đồng hồ ở đây) để ca test cố định được ngày.
 * `chiKhach = true` (mặc định) chỉ giữ email `@guest.local`, cùng luật `dungPheu`.
 */
export function dungGiuChan(
  ghiDanh: HangGhiDanhGC[],
  hoanThanh: HangHoanThanhGC[],
  bayGio: Date,
  chiKhach = true,
): KetQuaGiuChan {
  for (const ten of CHI_SO_KHAI_TRUOC_GC) {
    const loi = kiemTenChiSo(ten);
    if (loi) throw new Error(loi);
  }
  const hom = ngayVN(bayGio);

  // Một tài khoản = một mục (khoá chính `enrollments` là (user, course) nên không trùng, nhưng cứ khử).
  const ngay0 = new Map<number, number>();
  for (const g of ghiDanh) {
    if (chiKhach && !g.email.endsWith(HAU_TO_KHACH)) continue;
    if (!ngay0.has(g.userId)) ngay0.set(g.userId, ngayVN(g.ghiDanhLuc));
  }

  // Các NGÀY có hoạt động của từng tài khoản — một tập, không phải số hàng: hai bài hoàn thành cùng ngày
  // là MỘT ngày hoạt động (đếm hàng sẽ thổi phồng "đúng ngày N").
  const ngayHoatDong = new Map<number, Set<number>>();
  for (const h of hoanThanh) {
    if (!ngay0.has(h.userId)) continue;
    let s = ngayHoatDong.get(h.userId);
    if (!s) ngayHoatDong.set(h.userId, (s = new Set()));
    s.add(ngayVN(h.luc));
  }

  const o: OGiuChan[] = MOC_NGAY.map((moc) => {
    let mauSo = 0;
    let chuaDuTuoi = 0;
    let dungNgay = 0;
    let tuNgay = 0;
    for (const [userId, d0] of ngay0) {
      if (d0 + moc >= hom) {
        chuaDuTuoi += 1;
        continue;
      }
      mauSo += 1;
      const s = ngayHoatDong.get(userId);
      if (!s) continue;
      if (s.has(d0 + moc)) dungNgay += 1;
      for (const ng of s) {
        if (ng >= d0 + moc) {
          tuNgay += 1;
          break;
        }
      }
    }
    const che = mauSo < O_TOI_THIEU;
    return {
      moc,
      mauSo,
      chuaDuTuoi,
      che,
      dungNgay: che ? null : dungNgay,
      tuNgay: che ? null : tuNgay,
      phanTramDungNgay: che ? null : (dungNgay / mauSo) * 100,
      phanTramTuNgay: che ? null : (tuNgay / mauSo) * 100,
    };
  });

  return {
    donVi: chiKhach ? 'tài khoản khách' : 'tài khoản (gồm cả tài khoản thật)',
    daGhiDanh: ngay0.size,
    o,
    gioiHan: [...GIOI_HAN_GC],
  };
}
