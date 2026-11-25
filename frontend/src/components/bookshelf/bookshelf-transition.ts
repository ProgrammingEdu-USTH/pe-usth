/**
 * Handoff nhẹ qua `sessionStorage` để nối hiệu ứng 2 nhịp khi bấm "Về tủ sách":
 *  - Nhịp 1 (CourseBookView): ghi dấu khoá sách đang cất trước khi rời /bookshelf/[slug].
 *  - Nhịp 2 (BookshelfCabinet): đọc & xoá ngay dấu này khi /bookshelf mount để bay
 *    cuốn sách 3D vào đúng khe cũ trên kệ (trong vòng TTL, tránh lặp khi reload).
 */

export const RETURN_BOOK_KEY = 'pe_bookshelf_return_book';
export const RETURN_BOOK_TTL_MS = 4000;

export type ReturningBookSlug = 'python' | 'sql' | 'database-advanced' | 'machine-learning';

const VALID_SLUGS: ReadonlySet<string> = new Set([
  'python',
  'sql',
  'database-advanced',
  'machine-learning',
]);

function resolveStorage(explicit?: Storage | null): Storage | null {
  if (explicit !== undefined) return explicit;
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function markReturningBook(
  slug: ReturningBookSlug,
  storage?: Storage | null,
  now: number = Date.now(),
): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(RETURN_BOOK_KEY, JSON.stringify({ slug, ts: now }));
  } catch {
    /* chế độ riêng tư hoặc đầy dung lượng: bỏ qua, điều hướng vẫn chạy */
  }
}

export function consumeReturningBook(
  storage?: Storage | null,
  now: number = Date.now(),
): ReturningBookSlug | null {
  const store = resolveStorage(storage);
  if (!store) return null;

  let raw: string | null = null;
  try {
    raw = store.getItem(RETURN_BOOK_KEY);
    if (raw !== null) {
      store.removeItem(RETURN_BOOK_KEY);
    }
  } catch {
    return null;
  }

  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { slug?: unknown; ts?: unknown } | null;
    if (
      !parsed ||
      typeof parsed.slug !== 'string' ||
      !VALID_SLUGS.has(parsed.slug) ||
      typeof parsed.ts !== 'number' ||
      !Number.isFinite(parsed.ts)
    ) {
      return null;
    }
    const age = now - parsed.ts;
    if (age < 0 || age > RETURN_BOOK_TTL_MS) {
      return null;
    }
    return parsed.slug as ReturningBookSlug;
  } catch {
    return null;
  }
}
