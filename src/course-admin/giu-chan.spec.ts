/**
 * Giữ chân D1/D7/D30 — chấm phần THUẦN, không cần `DATABASE_URL`.
 *
 * Năm thứ đáng canh, mỗi thứ là một cách bảng này NÓI DỐI mà không ai thấy:
 *   1. đếm tài khoản CHƯA ĐỦ TUỔI là "đã bỏ đi" (ghi danh hôm qua chưa có cơ hội quay lại ngày 7);
 *   2. đếm HÀNG thay vì NGÀY (hai bài cùng ngày thổi phồng "đúng ngày N");
 *   3. ngày tính theo UTC thay vì UTC+7 (00:30 sáng VN thuộc ngày hôm sau);
 *   4. in số cho mốc mẫu nhỏ (trả lại đúng con số vừa phải che);
 *   5. tên chỉ số nói "người dùng" thay vì "tài khoản".
 */
import {
  CHI_SO_KHAI_TRUOC_GC,
  dungGiuChan,
  GIOI_HAN_GC,
  MOC_NGAY,
  ngayVN,
  type HangGhiDanhGC,
  type HangHoanThanhGC,
} from './giu-chan';
import { kiemTenChiSo, O_TOI_THIEU } from './pheu-tien-do';

// 2026-11-17 10:00 giờ VN (03:00 UTC).
const HOM_NAY = new Date('2026-11-17T03:00:00Z');
const lui = (ngay: number, gioUtc = 3): Date => {
  const d = new Date(HOM_NAY.getTime() - ngay * 86_400_000);
  d.setUTCHours(gioUtc, 0, 0, 0);
  return d;
};

const khach = (n: number, ngayLui: number, tu = 1): HangGhiDanhGC[] =>
  Array.from({ length: n }, (_, i) => ({
    userId: tu + i,
    email: `k${tu + i}@guest.local`,
    ghiDanhLuc: lui(ngayLui),
  }));
const xong = (ids: number[], luc: Date): HangHoanThanhGC[] =>
  ids.map((userId) => ({ userId, luc }));
const o = (ra: ReturnType<typeof dungGiuChan>, moc: number) =>
  ra.o.find((x) => x.moc === moc)!;

describe('dungGiuChan', () => {
  it('chỉ đếm tài khoản ĐỦ TUỔI: ghi danh hôm qua chưa thể "bỏ đi" ở ngày thứ 7', () => {
    // 10 tài khoản ghi danh 8 ngày trước (ngày thứ 7 đã trọn qua) + 10 ghi danh hôm qua (chưa).
    const gd = [...khach(10, 8, 1), ...khach(10, 1, 11)];
    const ra = dungGiuChan(gd, [], HOM_NAY);
    expect(o(ra, 7).mauSo).toBe(10);
    expect(o(ra, 7).chuaDuTuoi).toBe(10);
    // D1: tài khoản ghi danh hôm qua có ngày 0+1 = hôm nay, CHƯA trọn ⇒ chưa đủ tuổi.
    expect(o(ra, 1).mauSo).toBe(10);
    expect(o(ra, 1).chuaDuTuoi).toBe(10);
  });

  it('phân biệt "đúng ngày N" với "từ ngày N trở đi"', () => {
    // 10 tài khoản ghi danh 40 ngày trước: 6 quay lại ĐÚNG ngày 7; 3 chỉ quay lại ngày 20; 1 không bao giờ.
    const gd = khach(10, 40);
    const hoat = [
      ...xong([1, 2, 3, 4, 5, 6], lui(33)), // ngày 0 + 7
      ...xong([7, 8, 9], lui(20)), // ngày 0 + 20
    ];
    const ra = dungGiuChan(gd, hoat, HOM_NAY);
    expect(o(ra, 7).dungNgay).toBe(6);
    expect(o(ra, 7).tuNgay).toBe(9);
    expect(o(ra, 7).phanTramDungNgay).toBe(60);
    expect(o(ra, 7).phanTramTuNgay).toBe(90);
    // ngày thứ 30: 10 tài khoản đủ tuổi (40 > 30); không ai hoạt động ngày 30, nhưng 9 có ngày ≥ 30? Không: ngày 20 < 30.
    expect(o(ra, 30).dungNgay).toBe(0);
    expect(o(ra, 30).tuNgay).toBe(0);
  });

  it('đếm NGÀY, không đếm HÀNG — hai bài cùng ngày là một ngày hoạt động', () => {
    const gd = khach(10, 40);
    const hang = [
      ...xong([1, 2, 3, 4, 5], lui(33, 1)),
      ...xong([1, 2, 3, 4, 5], lui(33, 9)),
    ]; // cùng ngày VN?
    const ra = dungGiuChan(gd, hang, HOM_NAY);
    expect(o(ra, 7).dungNgay).toBe(5); // không phải 10
  });

  it('ngày tính theo UTC+7: 17:30 UTC là 00:30 SÁNG HÔM SAU ở Việt Nam', () => {
    const a = new Date('2026-11-10T16:59:00Z'); // 23:59 giờ VN ngày 10
    const b = new Date('2026-11-10T17:01:00Z'); // 00:01 giờ VN ngày 11
    expect(ngayVN(b) - ngayVN(a)).toBe(1);
    // và ở mức bảng: ghi danh 23:59 VN ngày 10, hoàn thành 00:30 VN ngày 11 ⇒ ngày thứ 1.
    const gd: HangGhiDanhGC[] = Array.from({ length: 6 }, (_, i) => ({
      userId: i + 1,
      email: `k${i + 1}@guest.local`,
      ghiDanhLuc: a,
    }));
    const hoat = gd.map((g) => ({
      userId: g.userId,
      luc: new Date('2026-11-10T17:30:00Z'),
    }));
    const ra = dungGiuChan(gd, hoat, HOM_NAY);
    expect(o(ra, 1).dungNgay).toBe(6);
  });

  it('mẫu số nhỏ thì CHE: không in số, không in %', () => {
    const ra = dungGiuChan(
      khach(O_TOI_THIEU - 1, 40),
      xong([1, 2], lui(33)),
      HOM_NAY,
    );
    for (const m of MOC_NGAY) {
      expect(o(ra, m).che).toBe(true);
      expect(o(ra, m).dungNgay).toBeNull();
      expect(o(ra, m).phanTramTuNgay).toBeNull();
    }
    // vừa đủ ngưỡng thì in.
    const du = dungGiuChan(
      khach(O_TOI_THIEU, 40),
      xong([1, 2], lui(33)),
      HOM_NAY,
    );
    expect(o(du, 7).che).toBe(false);
    expect(o(du, 7).dungNgay).toBe(2);
  });

  it('mặc định chỉ tài khoản KHÁCH; --tat-ca-tai-khoan gồm cả tài khoản thật', () => {
    const gd = [
      ...khach(6, 40, 1),
      { userId: 100, email: 'a@b.com', ghiDanhLuc: lui(40) },
    ];
    expect(dungGiuChan(gd, [], HOM_NAY).daGhiDanh).toBe(6);
    expect(dungGiuChan(gd, [], HOM_NAY, false).daGhiDanh).toBe(7);
    expect(dungGiuChan(gd, [], HOM_NAY, false).donVi).toContain('tài khoản');
  });

  it('hàng tiến độ của tài khoản không ghi danh bị bỏ, không sinh ô ma', () => {
    const ra = dungGiuChan(khach(6, 40), xong([999], lui(33)), HOM_NAY);
    expect(o(ra, 7).dungNgay).toBe(0);
    expect(ra.daGhiDanh).toBe(6);
  });
});

describe('chỉ số khai trước và giới hạn', () => {
  it('mọi tên chỉ số nói "tài khoản" và không chứa "người dùng"/"học viên"', () => {
    for (const ten of CHI_SO_KHAI_TRUOC_GC) {
      expect(kiemTenChiSo(ten)).toBeNull();
      expect(ten.toLowerCase()).not.toMatch(/người dùng|học viên|\buser\b/);
    }
    expect(kiemTenChiSo('tỉ lệ người dùng quay lại ngày 7')).not.toBeNull();
  });

  it('bảng giới hạn in CÙNG kết quả và nói đủ năm điều dễ hiểu sai', () => {
    const ra = dungGiuChan(khach(6, 40), [], HOM_NAY);
    const toan = ra.gioiHan.join('\n');
    for (const cau of [
      'TÀI KHOẢN KHÁCH',
      'KHÔNG PHẢI MỞ BÀI',
      'TỰ ĐỘNG',
      'UTC+7',
      'GIỚI HẠN DƯỚI',
    ]) {
      expect(toan).toContain(cau);
    }
    expect(GIOI_HAN_GC.length).toBeGreaterThanOrEqual(5);
  });
});
