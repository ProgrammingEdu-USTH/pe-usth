'use client';

// Trang lỗi của riêng dự án — biên lỗi ĐẦU TIÊN của app.
//
// TRƯỚC BẢN NÀY không có biên nào: `find src -name "error.tsx" -o -name
// "global-error.tsx" -o -name "ErrorBoundary*"` ra RỖNG, và
// `grep -rln "componentDidCatch\|ErrorBoundary" src/` cũng RỖNG. Nên một lỗi
// render bất kỳ cho trang mặc định của Next ("Application error: a client-side
// exception has occurred") — tiếng Anh, 0 liên kết, 0 CSS, đúng hình dạng trang
// 404 đã sửa trước đó.
//
// BỀ MẶT NÀY CÓ NGƯỜI ĐI VÀO, và bằng chứng nằm trong AGENTS.md chứ không phải
// trong một phỏng đoán: `screenVerdict` từng dùng `Number.isInteger(picked)` để
// chặn index xấu, mà `keyIndex('')` trả **−1** và `Number.isInteger(-1)` là
// TRUE — nên nó gọi `optionDetail(q.options[-1])` và ném TypeError. Nguyên văn
// mục bẫy: "nháp cũ trong localStorage giữ khoá của bản bài có nhiều lựa chọn
// hơn — học viên đó mở bài là crash, MÃI MÃI."
//
// VÀ ĐÓ LÀ LÝ DO `reset()` MỘT MÌNH KHÔNG ĐỦ. Next cấp `reset()`, nhưng nó
// render lại CHÍNH cái cây vừa ném; với một bản nháp đã nhiễm trong
// `localStorage` thì nó crash lại ngay, đúng chữ "mãi mãi" ở trên. Phép khôi
// phục thật sự cho lớp lỗi ĐÃ XẢY RA là XOÁ BẢN NHÁP của bài đó — nên nút thứ
// hai ở đây không phải tiện thể, nó là nửa có bằng chứng của trang này.
//
// NÚT ĐÓ PHẢI DO HỌC VIÊN BẤM, không được tự chạy: bản nháp giữ code họ đang
// viết, và xoá hộ là lấy đi thứ server không có bản sao nào (`lesson_progress`
// ở server chỉ biết "đã hoàn thành", không biết nháp). Nên câu chữ nói thẳng
// cái mất, và nút chỉ hiện khi THẬT CÓ một nháp khớp.
//
// KHÔNG gọi API ở đây, cùng lý do như trang 404: bot và người cùng rơi vào
// đây, mà `apiFetch` gặp 401 thì TỰ TẠO một tài khoản khách. Một trang lỗi ghi
// dữ liệu là trang lỗi làm tình hình xấu thêm.
//
// Vì sao phải tự nạp CSS: layout gốc CỐ Ý không import CSS global nào, nên
// không nạp gì là 0 stylesheet. `edu-theme.css` một mình đặt `body` background
// + `font-family` + `color`.
import Link from 'next/link';
import { useEffect, useState } from 'react';

import PageStyles from '@/components/PageStyles';
import { hauToNhap, soBaiTuTruyVan, TIEN_TO_NHAP } from '@/lib/nhap-bai';

import styles from './error.module.css';

// Đường về phải là route CÓ THẬT — một trang lỗi trỏ sang một 404 thì tệ hơn
// không có đường về, vì nó trông như có. Ca test đối chiếu với cây `src/app`.
const DUONG_VE = ['/courses/python_advanced', '/'] as const;

/**
 * Các khoá nháp của ĐÚNG bài mà URL đang nói tới.
 *
 * Trang lỗi không biết `owner` (id học viên nằm trong phản hồi API, mà trang
 * này cố ý không gọi API), nên nó khớp theo HẬU TỐ `:<khoá>:<bài>`. Phép tính
 * `?lesson=` → `sort_order` dùng CHUNG hàm với trang bài học; chép lại nó ở
 * đây là dựng một bản thứ hai sẽ trôi, và khi trôi thì nút này xoá sai bài.
 *
 * Mọi lần đọc `localStorage` đều bọc try/catch: ở chế độ riêng tư nó NÉM chứ
 * không trả null, và một trang lỗi tự ném là thứ không còn đường nào cứu.
 */
function nhapCuaBaiNay(): string[] {
  try {
    const duong = globalThis.location?.pathname ?? '';
    const m = /\/lesson\/([^/?#]+)/.exec(duong);
    if (!m) return [];
    const q = new URLSearchParams(globalThis.location?.search ?? '');
    const hau = hauToNhap(m[1], soBaiTuTruyVan(q.get('lesson') ?? undefined));
    const ra: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${TIEN_TO_NHAP}:`) && k.endsWith(hau)) ra.push(k);
    }
    return ra;
  } catch {
    return [];
  }
}

export default function TrangLoi({ reset }: { error: Error; reset: () => void }) {
  // Lượt render đầu không có `localStorage` (và trang lỗi vẫn phải dựng được),
  // nên nút xoá nháp chỉ xuất hiện SAU khi mount và chỉ khi thật có nháp khớp.
  //
  // `setState` PHẢI HOÃN khỏi thân effect: React 19 cấm gọi đồng bộ
  // (`react-hooks/set-state-in-effect`), và AGENTS.md đã ghi bẫy này HAI LẦN —
  // một lần ở lớp giải thích cold start ("chỗ dọn cờ phải nằm trong CLEANUP"),
  // một lần ở effect cuộn của trang khoá học. Bản đầu của file này viết
  // `useEffect(() => setNhap(...), [])` và `npm run lint` đỏ ngay: 1 ERROR.
  // Đọc KHÔNG được làm trong `useState(() => …)`: server không có
  // `localStorage` nên HTML trả về không có nút, và dựng nút ngay lượt đầu ở
  // client là một hydration mismatch.
  const [nhap, setNhap] = useState<string[]>([]);
  useEffect(() => {
    const id = setTimeout(() => setNhap(nhapCuaBaiNay()), 0);
    return () => clearTimeout(id);
  }, []);

  const xoaNhapRoiTaiLai = () => {
    try {
      for (const k of nhap) localStorage.removeItem(k);
    } catch {
      // Mất nháp không được phép làm hỏng đường thoát: vẫn tải lại.
    }
    globalThis.location?.reload();
  };

  return (
    <>
      <PageStyles hrefs={['/static/css/edu-theme.css']} />
      <main className={styles.wrap}>
        <h1 className={styles.tieuDe}>Trang này vừa gặp lỗi</h1>
        <p className={styles.than}>
          Một phần giao diện không dựng được. Tiến độ đã hoàn thành của bạn nằm
          trên máy chủ nên vẫn còn nguyên — thử lại, hoặc chọn một đường dưới
          đây.
        </p>
        <nav className={styles.hangNut}>
          <button className={styles.nutChinh} type="button" onClick={reset}>
            Thử lại
          </button>
          <Link className={styles.nutPhu} href={DUONG_VE[0]}>
            Về khoá đang học
          </Link>
          <Link className={styles.nutPhu} href={DUONG_VE[1]}>
            Về trang chủ
          </Link>
        </nav>

        {nhap.length > 0 && (
          <div className={styles.nhap}>
            <p className={styles.thanNho}>
              Nếu bấm Thử lại mà vẫn lỗi: bản nháp đã lưu của bài này có thể là
              nguyên nhân. Xoá nó thường mở lại được bài, nhưng{' '}
              <strong>code bạn đang viết trong bài này sẽ mất</strong>.
            </p>
            <button
              className={styles.nutPhu}
              type="button"
              onClick={xoaNhapRoiTaiLai}
            >
              Xoá nháp của bài này rồi tải lại
            </button>
          </div>
        )}
      </main>
    </>
  );
}
