/**
 * Ba mục điều hướng của thanh trên — tách khỏi `SiteHeader.tsx` để
 * `node --test` kiểm được (cùng khuôn `home-copy.ts`: file này KHÔNG import
 * gì, vì `node --test` không phân giải alias `@/…`).
 *
 * ===========================================================================
 * VÌ SAO CÓ FILE NÀY: HAI MÀN ĐÃ DỰNG XONG MÀ KHÔNG AI VÀO ĐƯỢC
 * ===========================================================================
 * `/practice` và `/practice/challenge` — màn "Thử thách ôn", dựng trong phiên
 * 15/10 với hơn 30 ca test — là TRANG MỒ CÔI. Grep cả `frontend/src` lẫn
 * `frontend/public`: mọi liên kết trỏ tới `/practice` đều xuất phát từ CHÍNH
 * `/practice`. Thanh trên chỉ có tên sản phẩm và nút sáng/tối; trang chủ,
 * trang khoá, trang bài đều không dẫn sang.
 *
 * Một tính năng không có đường vào thì bằng không, bất kể nó được kiểm kỹ tới
 * đâu — và chuyện này sống sót được vì mọi ca test đều kiểm NỘI DUNG màn chứ
 * không ai kiểm có đường nào tới màn.
 *
 * 04/11/2026 — CHIỀU NGƯỢC LẠI của cùng bệnh: một lối vào mà KHÔNG có màn.
 * `/practice` đã bị gỡ (xem chú thích trong `navItems`) nên mục "Ôn tập" thành
 * liên kết tới 404. `e2e/unit/lien-ket-noi-bo.test.mjs` canh chiều này cho MỌI
 * liên kết nội bộ trong `src/`, không riêng thanh trên.
 */

/** Một mục trên thanh điều hướng. */
export type NavItem = {
  href: string;
  label: string;
  /** Khớp chính xác hoặc là tiền tố của đường dẫn hiện tại. */
  match: string;
};

/**
 * `ideEnabled` false ⇒ bỏ "Bàn thí nghiệm", tức khi `NEXT_PUBLIC_IDE_ENABLED=off`.
 * Cờ ấy từng phải ẩn CÙNG thẻ công cụ của trang chủ cũ (`catalog.TOOLS`) — hai
 * chỗ lệch nhau thì thanh trên dẫn tới một trang mà trang chủ bảo là không có.
 * Thẻ đó đã xoá cùng `CatalogTile` ở 4d5f86d, nên nay chỉ còn MỘT chỗ đọc cờ.
 */
export function navItems(ideEnabled: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: '/', label: 'Khoá học', match: '/' },
    { href: '/practice', label: 'Ôn tập', match: '/practice' },
  ];
  if (ideEnabled) {
    items.push({ href: '/ide', label: 'Bàn thí nghiệm', match: '/ide' });
  }
  return items;
}

/** Mục nào đang mở. `/` chỉ khớp khi đường dẫn đúng bằng `/`. */
export function isCurrent(item: NavItem, pathname: string): boolean {
  if (item.match === '/') return pathname === '/';
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}
