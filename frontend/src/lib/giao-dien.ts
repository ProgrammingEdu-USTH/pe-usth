// GIAO DIỆN — "Đài thiên văn" là giao diện DUY NHẤT của nhánh `chiem-tinh`.
//
// Chủ dự án (12/11/2026): "nhánh chiêm tinh thì bỏ theme lofi chill đi rồi thay
// hoàn toàn bằng theme chiêm tinh". Trước đó có một TRỤC chọn (`lofi` / `thien-van`)
// với script trước-paint, whitelist và nút chọn; nay chỉ còn một giao diện, nên:
//   · `<html data-theme="thien-van">` là thuộc tính TĨNH ở `layout.tsx` (không còn
//     đọc localStorage, không còn nháy lofi trước khi script chạy, không còn chuỗi
//     lạ nào có thể thành thuộc tính);
//   · mọi selector trong `theme-thien-van.css` / `scene-thien-van.css` mở bằng
//     `html[data-theme="thien-van"]` — KHÔNG còn `:has([data-tv-surface])`: theme áp
//     cho MỌI trang, kể cả trang di sản. Trang nào chưa thiết kế sẽ thấy token mới
//     với bố cục cũ; đó là nợ đã khai, không phải một lựa chọn;
//   · còn lại một trục: sáng/tối (`body.dark` / `body.light`, khoá `theme`).
//
// Bảng token lofi (`:root` của `edu-theme.css`, `studio-tokens.css`) VẪN ở đó làm
// nền cho các token mà theme không ghi đè. Gộp chúng vào một bảng và xoá tệp theme
// là vòng dọn sau (nợ khai ở AGENTS.md), vì `ds-contrast.test.mjs` canh bảng lofi
// bằng neo chuỗi và phải viết lại cùng lúc.
//
// KHÔNG import gì: test nạp thẳng file `.ts` này bằng `node --test`, nơi alias
// `@/` không tồn tại.

/** Mọi giao diện hợp lệ. Phần tử đầu là mặc định. */
export const GIAO_DIEN = ['thien-van'] as const;
export type GiaoDien = (typeof GIAO_DIEN)[number];

export const GIAO_DIEN_MAC_DINH: GiaoDien = 'thien-van';

/** Khoá localStorage của chế độ sáng/tối (cũ, nhiều chỗ đọc). */
export const KHOA_CHE_DO = 'theme';

/** Thuộc tính trên <html>. */
export const THUOC_TINH = 'data-theme';

/**
 * Script chạy ĐẦU <body>, trước khi vẽ: đặt `dark`/`light` theo localStorage.
 * Giao diện KHÔNG đi qua đây nữa — nó là thuộc tính tĩnh của <html>.
 *
 * Phải nằm trong <body> vì cần `document.body` (xem chú thích ở layout.tsx).
 */
export const SCRIPT_TRUOC_PAINT =
  '(function(){try{' +
  `var d=localStorage.getItem(${JSON.stringify(KHOA_CHE_DO)})==='dark';` +
  "document.body.classList.toggle('dark',d);" +
  "document.body.classList.toggle('light',!d);" +
  '}catch(e){}})();';

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
    /* không nhớ được cũng không sao: lần tải sau về sáng */
  }
}

/**
 * Đăng ký theo dõi thay đổi sáng/tối (cho `useSyncExternalStore`). Dùng
 * MutationObserver thay vì tự phát sự kiện: `SiteHeader` đổi sáng/tối bằng cách
 * chạm thẳng vào `body.classList`, nên chỉ quan sát DOM mới thấy mọi nguồn.
 */
export function dangKyGiaoDien(goi: () => void): () => void {
  if (typeof MutationObserver === 'undefined') return () => {};
  const ob = new MutationObserver(goi);
  ob.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  return () => ob.disconnect();
}
