// GIAO DIỆN (theme) — trục chọn "lofi chill" / "Đài thiên văn", độc lập với sáng/tối.
//
// VÌ SAO CÓ MỘT FILE RIÊNG, KHÔNG IMPORT GÌ.
// Ba nơi phải đồng ý về cùng một danh sách id: script đặt giao diện TRƯỚC khi
// vẽ (`layout.tsx`), nút chọn (`ThemePicker`), và selector trong
// `public/static/css/theme-thien-van.css`. Ba bản chép là ba thứ trôi lệch nhau
// mà không exception nào ném — gõ sai một chữ trong CSS thì theme im lặng không
// bao giờ bật. File này là NGUỒN DUY NHẤT; `giao-dien.test.mjs` đọc cả ba nơi và
// bắt chúng khớp, và chạy script trong `node:vm` để chứng minh whitelist có răng.
//
// KHÔNG import gì: test nạp thẳng file `.ts` này bằng `node --test`, nơi alias
// `@/` không tồn tại.
//
// MÔ HÌNH: `data-theme="<id>"` trên <html>. VẮNG thuộc tính = lofi (mặc định),
// nên người dùng cũ và mọi trang di sản không đổi một pixel. Sáng/tối vẫn là
// `body.dark` / `body.light` như trước, cho nên có BỐN tổ hợp.

/** Mọi giao diện hợp lệ. Phần tử đầu là mặc định. */
export const GIAO_DIEN = ['lofi', 'thien-van'] as const;
export type GiaoDien = (typeof GIAO_DIEN)[number];

export const GIAO_DIEN_MAC_DINH: GiaoDien = 'lofi';

/** Khoá localStorage của giao diện. Khoá sáng/tối vẫn là `theme` (cũ, nhiều chỗ đọc). */
export const KHOA_GIAO_DIEN = 'pe-giao-dien';
export const KHOA_CHE_DO = 'theme';

/** Thuộc tính trên <html>. */
export const THUOC_TINH = 'data-theme';

export const NHAN_GIAO_DIEN: Record<GiaoDien, string> = {
  lofi: 'Lofi chill',
  'thien-van': 'Đài thiên văn',
};

/** Giá trị từ localStorage/DOM là CHUỖI BẤT KỲ — chỉ id trong danh sách mới được tin. */
export function laGiaoDien(v: unknown): v is GiaoDien {
  return typeof v === 'string' && (GIAO_DIEN as readonly string[]).includes(v);
}

/**
 * Script chạy ĐẦU <body>, trước khi vẽ: đặt `dark`/`light` (hành vi cũ, giữ
 * nguyên) và `data-theme` nếu localStorage giữ một giao diện KHÁC mặc định mà
 * nằm trong WHITELIST. Chuỗi lạ — kể cả do ai đó gõ tay vào localStorage —
 * không bao giờ thành thuộc tính. Giao diện mặc định không được ghi ra: vắng
 * thuộc tính là lofi.
 *
 * Phải nằm trong <body> vì cần `document.body` (xem chú thích ở layout.tsx).
 */
export const SCRIPT_TRUOC_PAINT =
  '(function(){try{' +
  `var d=localStorage.getItem(${JSON.stringify(KHOA_CHE_DO)})==='dark';` +
  "document.body.classList.toggle('dark',d);" +
  "document.body.classList.toggle('light',!d);" +
  `var t=localStorage.getItem(${JSON.stringify(KHOA_GIAO_DIEN)});` +
  `var w=${JSON.stringify(GIAO_DIEN.filter((g) => g !== GIAO_DIEN_MAC_DINH))};` +
  `if(w.indexOf(t)>-1)document.documentElement.setAttribute(${JSON.stringify(THUOC_TINH)},t);` +
  '}catch(e){}})();';

/** Giao diện đang áp lên <html>. Ngoài trình duyệt (SSR) trả về mặc định. */
export function docGiaoDien(): GiaoDien {
  if (typeof document === 'undefined') return GIAO_DIEN_MAC_DINH;
  const v = document.documentElement.getAttribute(THUOC_TINH);
  return laGiaoDien(v) ? v : GIAO_DIEN_MAC_DINH;
}

/** Đổi giao diện: áp lên <html> NGAY và nhớ lại. localStorage có thể ném (chế độ riêng tư). */
export function datGiaoDien(g: GiaoDien): void {
  if (typeof document === 'undefined') return;
  if (g === GIAO_DIEN_MAC_DINH) document.documentElement.removeAttribute(THUOC_TINH);
  else document.documentElement.setAttribute(THUOC_TINH, g);
  try {
    if (g === GIAO_DIEN_MAC_DINH) localStorage.removeItem(KHOA_GIAO_DIEN);
    else localStorage.setItem(KHOA_GIAO_DIEN, g);
  } catch {
    /* không nhớ được cũng không sao: lần tải sau về mặc định */
  }
}

/** Sáng/tối hiện tại. */
export function docCheDoToi(): boolean {
  return typeof document !== 'undefined' && document.body.classList.contains('dark');
}

/** Đổi sáng/tối — đúng hai lớp + khoá mà `SiteHeader` và script trước-paint dùng. */
export function datCheDoToi(toi: boolean): void {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('dark', toi);
  document.body.classList.toggle('light', !toi);
  try {
    localStorage.setItem(KHOA_CHE_DO, toi ? 'dark' : 'light');
  } catch {
    /* như trên */
  }
}

/**
 * Đăng ký theo dõi thay đổi giao diện / sáng-tối (cho `useSyncExternalStore`).
 * Dùng MutationObserver thay vì tự phát sự kiện: `SiteHeader` đổi sáng/tối bằng
 * cách chạm thẳng vào `body.classList`, nên chỉ quan sát DOM mới thấy mọi nguồn.
 */
export function dangKyGiaoDien(goi: () => void): () => void {
  if (typeof MutationObserver === 'undefined') return () => {};
  const ob = new MutationObserver(goi);
  ob.observe(document.documentElement, { attributes: true, attributeFilter: [THUOC_TINH] });
  ob.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  return () => ob.disconnect();
}
