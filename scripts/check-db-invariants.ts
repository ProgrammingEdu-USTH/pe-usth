/**
 * check-db-invariants.ts — kiểm các điều DB PHẢI đúng sau mỗi lần sửa schema/dữ liệu.
 * CHỈ ĐỌC: không câu nào ghi. Thoát mã 1 nếu có mục trượt, nên chạy được trong CI/sau deploy.
 *
 * Vì sao có: `lesson_progress.course_id` lặp thông tin của `lessons.course_id` mà DB không bắt
 * được lệch, và `courses.lessons` là số do tay khai (từng 172 trong khi có 179 bài, làm
 * POST /lessons/:n/complete trả 400 cho bài 173–179). Cả hai chỉ lộ khi có người học.
 *
 * CHẠY: npx ts-node scripts/check-db-invariants.ts   (đọc DATABASE_URL trong .env)
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import { activeLessonSql } from '../src/course-admin/course-lesson-count';

type Check = { name: string; sql: string; hint: string };

// Mỗi câu SQL trả về CÁC HÀNG VI PHẠM; rỗng là đạt.
const CHECKS: Check[] = [
  {
    name: 'courses.lessons bằng số bài thật',
    sql: `SELECT c.id, c.lessons AS khai, count(l.id) FILTER (WHERE ${activeLessonSql('l')})::int AS thuc FROM courses c LEFT JOIN lessons l ON l.course_id = c.id GROUP BY c.id, c.lessons HAVING c.lessons <> count(l.id) FILTER (WHERE ${activeLessonSql('l')})`,
    hint: 'Chạy scripts/fix-course-lessons.ts (mặc định chạy thử; --apply cần --backup).',
  },
  {
    name: 'sort_order bài hoạt động liên tiếp từ 1 đến courses.lessons',
    sql: `SELECT c.id, c.lessons AS khai, count(l.id) FILTER (WHERE ${activeLessonSql('l')})::int AS thuc, max(l.sort_order) FILTER (WHERE ${activeLessonSql('l')})::int AS max_sort_order FROM courses c LEFT JOIN lessons l ON l.course_id = c.id GROUP BY c.id, c.lessons HAVING count(l.id) FILTER (WHERE ${activeLessonSql('l')}) <> COALESCE(max(l.sort_order) FILTER (WHERE ${activeLessonSql('l')}), 0)`,
    hint: 'Không tự dồn sort_order: tìm số thiếu rồi xử lý tay để không làm lệch lesson_progress.',
  },
  {
    name: 'không có hai bài trùng (course_id, sort_order)',
    sql: `SELECT course_id, sort_order, count(*)::int AS n FROM lessons GROUP BY 1, 2 HAVING count(*) > 1`,
    hint: 'Gộp tay, chuyển lesson_progress sang lesson_id giữ lại.',
  },
  {
    name: 'lesson_progress.course_id khớp lessons.course_id',
    sql: `SELECT p.user_id, p.lesson_id, p.course_id, l.course_id AS course_cua_bai FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id WHERE p.course_id <> l.course_id`,
    hint: 'Cột lặp bị lệch: tiến độ theo (user, khoá) sẽ sai.',
  },
  {
    name: 'enrollments.progress và completed_lessons khớp công thức recomputeProgress',
    sql: `SELECT e.user_id, e.course_id, e.completed_lessons, e.progress, COALESCE(c.n, 0)::int AS dung_completed
            FROM enrollments e JOIN courses co ON co.id = e.course_id
            LEFT JOIN (SELECT p.user_id, p.course_id, count(*) AS n FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id
                        JOIN courses c2 ON c2.id = p.course_id
                       WHERE p.status = 'completed' AND l.sort_order BETWEEN 1 AND c2.lessons GROUP BY 1, 2) c
              ON c.user_id = e.user_id AND c.course_id = e.course_id
           WHERE e.completed_lessons <> COALESCE(c.n, 0)
              OR e.progress <> CASE WHEN co.lessons > 0 THEN LEAST(100, ROUND(COALESCE(c.n, 0) * 100.0 / co.lessons))::int ELSE 0 END`,
    hint: 'Chạy lại câu tính tiến độ trong transaction (xem recomputeProgress).',
  },
  {
    name: 'progress nằm trong 0..100',
    sql: `SELECT user_id, course_id, progress FROM enrollments WHERE progress < 0 OR progress > 100`,
    hint: 'recomputeProgress đã chặn trần 100; hàng này do ghi tay.',
  },
  {
    name: 'mọi khoá ngoại có chỉ mục dẫn đầu',
    sql: `SELECT c.conrelid::regclass::text AS bang, a.attname::text AS cot FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
           WHERE c.contype = 'f' AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1])`,
    hint: 'Thêm @@index cho cột này (xem quy ước migration trong AGENTS.md).',
  },
  {
    name: 'không có chỉ mục hỏng (invalid)',
    sql: `SELECT indexrelid::regclass::text AS chi_muc FROM pg_index WHERE NOT indisvalid`,
    hint: 'DROP INDEX rồi tạo lại.',
  },
];

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });
  let failed = 0;
  try {
    for (const c of CHECKS) {
      const rows = await prisma.$queryRawUnsafe<unknown[]>(c.sql);
      if (rows.length === 0) {
        console.log(`ĐẠT   | ${c.name}`);
      } else {
        failed++;
        console.log(`TRƯỢT | ${c.name} — ${rows.length} hàng vi phạm. ${c.hint}`);
        console.log(JSON.stringify(rows.slice(0, 5), (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
      }
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(failed ? `\n${failed} mục TRƯỢT` : '\nTất cả đạt');
  process.exitCode = failed ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
