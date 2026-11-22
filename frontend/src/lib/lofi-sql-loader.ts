/**
 * lofi-sql-loader.ts — Nạp dữ liệu JSON bài học SQL & Concept Card theo nhu cầu (có cache RAM).
 *
 * Không dùng alias `@/` để `node --test` kiểm định được trực tiếp.
 */

import type { RawSqlLesson, SqlConceptCard, SqlCourseId } from './lofi-sql-adapter';

export const SQL_COURSE_META: Record<
  SqlCourseId,
  { title: string; badge: string; backHref: string }
> = {
  db_design: {
    title: 'Thiết kế CSDL — Cơ bản',
    badge: 'SQL · 20 bài',
    backHref: '/bookshelf/sql',
  },
  db_design_tc: {
    title: 'Thiết kế CSDL — Trung cấp',
    badge: 'SQL · 21 bài',
    backHref: '/bookshelf/sql',
  },
  db_design_nc: {
    title: 'Thiết kế CSDL — Nâng cao',
    badge: 'SQL · 25 bài',
    backHref: '/bookshelf/sql',
  },
};

const courseCache = new Map<SqlCourseId, RawSqlLesson[]>();
let cardsCache: SqlConceptCard[] | null = null;

export async function loadSqlCourseData(courseId: SqlCourseId): Promise<RawSqlLesson[]> {
  const cached = courseCache.get(courseId);
  if (cached) return cached;

  const res = await fetch(`/static/sql/${encodeURIComponent(courseId)}.json`);
  if (!res.ok) {
    throw new Error(`Không tải được giáo trình ${courseId} (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { lessons?: RawSqlLesson[] };
  const lessons = Array.isArray(data?.lessons) ? data.lessons : [];
  courseCache.set(courseId, lessons);
  return lessons;
}

export async function loadSqlConceptCards(): Promise<SqlConceptCard[]> {
  if (cardsCache) return cardsCache;
  const res = await fetch('/static/sql/concept_cards.json');
  if (!res.ok) {
    throw new Error(`Không tải được Concept Card (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { cards?: SqlConceptCard[] };
  cardsCache = Array.isArray(data?.cards) ? data.cards : [];
  return cardsCache;
}
