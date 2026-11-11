'use client';

// CHỌN GIAO DIỆN — "Lofi chill" / "Đài thiên văn", và sáng/tối.
//
// Đặt ở lề phải thanh trên của màn bài học (từ 861px; dưới đó thanh đã hết chỗ
// — đo: ở 390px mỗi đoạn thanh tiến độ chỉ 11,1px nên thêm một nút 44px sẽ ép
// nó xuống 9,3px — xem LessonChrome.module.css `.themeSlot`).
//
// Trong bài học trước giờ KHÔNG có chỗ đổi sáng/tối (nút chỉ ở `SiteHeader`, mà
// header đó không dựng trên trang bài học), nên bảng này gồm cả hai nhóm: người
// đang học dở một bài không phải thoát ra trang khoá để đổi màu nền.
//
// Hai nhóm là radio THẬT (`<input type="radio">` ẩn bằng CSS, vẫn focus được):
// phím mũi tên và đọc màn hình đúng sẵn, không phải tự viết lại bằng `role`.
//
// Trạng thái đọc từ DOM bằng `useSyncExternalStore` (MutationObserver trong
// `giao-dien.ts`), không giữ bản sao trong React: `SiteHeader` đổi sáng/tối bằng
// cách chạm thẳng vào `body.classList`, nên bản sao sẽ lệch ngay lần đầu.
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';

import {
  GIAO_DIEN,
  GIAO_DIEN_MAC_DINH,
  NHAN_GIAO_DIEN,
  dangKyGiaoDien,
  datCheDoToi,
  datGiaoDien,
  docCheDoToi,
  docGiaoDien,
} from '@/lib/giao-dien';

import styles from './ThemePicker.module.css';

/** Ảnh chụp trạng thái: chuỗi nguyên thuỷ nên React so được bằng ===. */
function chup(): string {
  return `${docGiaoDien()}|${docCheDoToi() ? 'toi' : 'sang'}`;
}
const CHUP_MAY_CHU = `${GIAO_DIEN_MAC_DINH}|sang`;

export default function ThemePicker() {
  const [mo, setMo] = useState(false);
  const goc = useRef<HTMLDivElement>(null);
  const nut = useRef<HTMLButtonElement>(null);
  const idBang = useId();
  const idNhom = useId();
  const [giaoDien, cheDo] = useSyncExternalStore(dangKyGiaoDien, chup, () => CHUP_MAY_CHU).split('|');

  // Đóng khi bấm ra ngoài hoặc nhấn Escape (trả focus về nút, để người dùng
  // bàn phím không bị thả vào đầu trang).
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: PointerEvent) => {
      if (goc.current && !goc.current.contains(e.target as Node)) setMo(false);
    };
    const phim = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMo(false);
        nut.current?.focus();
      }
    };
    document.addEventListener('pointerdown', ngoai);
    document.addEventListener('keydown', phim);
    return () => {
      document.removeEventListener('pointerdown', ngoai);
      document.removeEventListener('keydown', phim);
    };
  }, [mo]);

  return (
    <div className={styles.root} ref={goc}>
      <button
        ref={nut}
        type="button"
        className={styles.trigger}
        aria-label="Giao diện và chế độ sáng tối"
        aria-haspopup="dialog"
        aria-expanded={mo}
        aria-controls={mo ? idBang : undefined}
        onClick={() => setMo((v) => !v)}
      >
        {/* ba ngôi sao nối nhau — dấu hiệu của giao diện thứ hai */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 17l5-9 4 6 5-8" />
          <circle cx="5" cy="17" r="1.6" fill="currentColor" />
          <circle cx="10" cy="8" r="1.6" fill="currentColor" />
          <circle cx="14" cy="14" r="1.6" fill="currentColor" />
          <circle cx="19" cy="6" r="1.6" fill="currentColor" />
        </svg>
      </button>

      {mo && (
        <div id={idBang} role="dialog" aria-label="Giao diện" className={styles.panel}>
          <fieldset className={styles.group}>
            <legend className={styles.legend}>Giao diện</legend>
            {GIAO_DIEN.map((g) => (
              <label key={g} className={styles.opt}>
                <input
                  type="radio"
                  name={`${idNhom}-giao-dien`}
                  className={styles.radio}
                  checked={giaoDien === g}
                  onChange={() => datGiaoDien(g)}
                />
                <span className={styles.optText}>{NHAN_GIAO_DIEN[g]}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className={styles.group}>
            <legend className={styles.legend}>Chế độ</legend>
            {([false, true] as const).map((toi) => (
              <label key={String(toi)} className={styles.opt}>
                <input
                  type="radio"
                  name={`${idNhom}-che-do`}
                  className={styles.radio}
                  checked={(cheDo === 'toi') === toi}
                  onChange={() => datCheDoToi(toi)}
                />
                <span className={styles.optText}>{toi ? 'Tối' : 'Sáng'}</span>
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );
}
