/* Chấm bài SQL ở trình duyệt — CHỈ logic, không đụng DOM, nên node --test nạp được.
 *
 * VÌ SAO CHẤM BẰNG CHẠY, KHÔNG BẰNG SO CHUỖI. Một bài SQL đúng có nhiều cách viết (CTE, truy vấn
 * con, JOIN rồi GROUP BY…). So chuỗi hoặc đòi từ khoá là chấm CÁCH VIẾT chứ không chấm KẾT QUẢ.
 * Ở đây ta chạy câu của người học trên dữ liệu mới và so TẬP HỢP HÀNG (bag, có số lần) với kết quả
 * của đáp án mẫu chạy trên CÙNG dữ liệu.
 *
 * VÌ SAO CẦN DỮ LIỆU THỬ THÊM. Một cách sửa sai có thể tình cờ đúng trên dữ liệu mẫu. Ví dụ
 * `SUM(DISTINCT amount)` ra đúng 100 ở đơn 101 chỉ vì hai dòng hàng khác giá (60 và 40); đơn có hai
 * món cùng giá 40 thì nó ra 40 thay vì 80. Mỗi đề nên mang một bộ dữ liệu thử thêm có đúng loại ca
 * đó. Phản hồi phân biệt "sai ở dữ liệu của quán" với "đúng ở dữ liệu của quán nhưng sai ở dữ liệu
 * thử thêm" để người học biết cách sửa của mình chỉ đúng tình cờ.
 *
 * KHÔNG so tên cột: người học đặt bí danh khác vẫn đúng. So SỐ cột và giá trị theo vị trí.
 * Số thực làm tròn 6 chữ số để 0.1+0.2 không làm đỏ oan. Thứ tự hàng KHÔNG được so (đề không đòi
 * ORDER BY); nếu một đề đòi thứ tự thì đề đó phải khai `soThuTu: true`.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LabSql = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Chạy một chuỗi SQL (có thể nhiều câu); trả bảng của câu CUỐI có kết quả. */
  function chay(db, sql) {
    const kq = db.exec(sql);
    return kq.length ? kq[kq.length - 1] : { columns: [], values: [] };
  }

  function chuanGiaTri(v) {
    if (typeof v === 'number' && !Number.isInteger(v)) return Math.round(v * 1e6) / 1e6;
    return v;
  }

  function hang(values, soThuTu) {
    const ds = values.map((r) => JSON.stringify(r.map(chuanGiaTri)));
    return soThuTu ? ds : ds.slice().sort();
  }

  /** So hai bảng kết quả: trả null nếu khớp, hoặc { loai, ... } nói vì sao lệch. */
  function soSanh(mong, nhan, soThuTu) {
    if (mong.columns.length !== nhan.columns.length) {
      return { loai: 'so-cot', mongDoi: mong.columns.length, nhanDuoc: nhan.columns.length };
    }
    const a = hang(mong.values, soThuTu);
    const b = hang(nhan.values, soThuTu);
    if (a.length !== b.length) return { loai: 'so-hang', mongDoi: a.length, nhanDuoc: b.length };
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return { loai: 'gia-tri', mongDoi: a[i], nhanDuoc: b[i] };
    }
    return null;
  }

  /**
   * Chấm một câu của người học theo một đề.
   * de = { dapAn: 'SQL', soThuTu?: bool, duLieu: [{ ten, an?: bool, sql }] }
   * Mỗi bộ dữ liệu dựng một CSDL MỚI cho đáp án mẫu và một CSDL MỚI cho người học, nên câu DROP/DELETE
   * của người học không ảnh hưởng gì và không ảnh hưởng đáp án.
   * Trả { dat, theoBo: [{ ten, an, dat, loi? , lech? }], phanHoi }
   */
  function chamBai(SQL, de, sqlHocVien) {
    const theoBo = [];
    for (const bo of de.duLieu) {
      const dbMau = new SQL.Database();
      const dbHV = new SQL.Database();
      try {
        dbMau.exec(bo.sql);
        dbHV.exec(bo.sql);
        const mong = chay(dbMau, de.dapAn);
        let nhan;
        try {
          nhan = chay(dbHV, sqlHocVien);
        } catch (e) {
          theoBo.push({ ten: bo.ten, an: !!bo.an, dat: false, loi: String(e && e.message ? e.message : e) });
          continue;
        }
        const lech = soSanh(mong, nhan, !!de.soThuTu);
        theoBo.push({ ten: bo.ten, an: !!bo.an, dat: !lech, lech: lech || undefined, nhan, mong });
      } finally {
        dbMau.close();
        dbHV.close();
      }
    }
    return { dat: theoBo.every((x) => x.dat), theoBo, phanHoi: phanHoi(theoBo) };
  }

  /** Một câu nói VÌ SAO trượt — câu đầu tiên người học đọc phải chỉ đúng chỗ. */
  function phanHoi(theoBo) {
    if (theoBo.every((x) => x.dat)) {
      return 'Đúng ở cả dữ liệu của quán lẫn dữ liệu thử thêm. Cách viết của bạn giữ được đúng ý của đề, không chỉ trùng số.';
    }
    const loi = theoBo.find((x) => x.loi);
    if (loi) return 'SQL báo lỗi: ' + loi.loi + '. Sửa lỗi cú pháp rồi chấm lại.';
    const chinh = theoBo.find((x) => !x.an);
    const an = theoBo.find((x) => x.an);
    if (chinh && !chinh.dat) {
      const l = chinh.lech;
      if (l.loai === 'so-cot') return `Kết quả có ${l.nhanDuoc} cột, đề cần ${l.mongDoi} cột (không cần đúng tên cột).`;
      if (l.loai === 'so-hang') return `Kết quả có ${l.nhanDuoc} hàng, đề cần ${l.mongDoi} hàng. Hàng nào bị mất hoặc bị nhân thêm?`;
      return 'Số hàng đúng nhưng có giá trị sai. So từng hàng với kết quả đề bài yêu cầu.';
    }
    if (an && !an.dat) {
      return 'Đúng ở dữ liệu của quán, nhưng SAI ở dữ liệu thử thêm. Cách sửa của bạn có thể chỉ đúng tình cờ với số liệu mẫu: thử nghĩ tới đơn có hai món cùng giá, hoặc đơn chưa có thanh toán.';
    }
    return 'Chưa đúng.';
  }

  return { chay, soSanh, chamBai, phanHoi, hang };
});
