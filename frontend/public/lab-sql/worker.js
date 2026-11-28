/* Worker chạy SQL. MỘT việc: nạp sql.js một lần, nhận lệnh, trả kết quả. Không đụng DOM.
 *
 * Vì sao worker: sql.js chạy ĐỒNG BỘ — một vòng lặp vô hạn (WITH RECURSIVE thiếu điều kiện dừng) làm
 * đứng cả trang nếu chạy ở luồng chính. Ở worker, luồng chính đặt hạn giờ rồi terminate() và dựng lại.
 * Cùng cách mà bộ chạy Python của nền tảng cắt lần chạy treo.
 */
/* global importScripts, initSqlJs, LabSql, LabSqlAd01 */
importScripts('vendor/sql-wasm.js', 'grade.js', 'ad01-data.js');

let SQL = null;
const sanSang = initSqlJs({ locateFile: (f) => 'vendor/' + f }).then((s) => {
  SQL = s;
  self.postMessage({ loai: 'san-sang' });
});

self.onmessage = async (e) => {
  const { id, op, sql, mai } = e.data;
  await sanSang;
  try {
    if (op === 'chay') {
      // Chạy thử: một CSDL mới từ dữ liệu của quán, trả bảng của câu cuối. `mai` = chạy trên dữ liệu của NGÀY MAI
      // (bộ dữ liệu thử thêm), để người học thấy câu của mình sống sót qua một ngày khác. Bảng đó chỉ đến khi họ đã đạt.
      const db = new SQL.Database();
      try {
        db.exec(mai ? LabSqlAd01.de.duLieu[1].sql : LabSqlAd01.QUAN);
        const kq = LabSql.chay(db, sql);
        self.postMessage({ id, ok: true, bang: { cot: kq.columns, hang: kq.values } });
      } finally {
        db.close();
      }
    } else if (op === 'cham') {
      const kq = LabSql.chamBai(SQL, LabSqlAd01.de, sql);
      // Chỉ gửi phần hiển thị được: bảng của bộ dữ liệu ĐẦU (của quán) và có/không đạt bộ ẩn. Không gửi bảng bộ ẩn.
      const chinh = kq.theoBo.find((x) => !x.an);
      const an = kq.theoBo.find((x) => x.an);
      self.postMessage({
        id,
        ok: true,
        dat: kq.dat,
        phanHoi: kq.phanHoi,
        datChinh: chinh ? chinh.dat : false,
        datAn: an ? an.dat : false,
        bang: chinh && chinh.nhan ? { cot: chinh.nhan.columns, hang: chinh.nhan.values } : null,
      });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, loi: String(err && err.message ? err.message : err) });
  }
};
