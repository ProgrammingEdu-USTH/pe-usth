/**
 * Đồng bộ courses.lessons với số bài người học mở được. Vì lessonCount cũng là
 * giới hạn trên của /lessons/:n/complete, script DỪNG nếu dãy sort_order bị hở;
 * tự dồn số sẽ đổi khoá của lesson_progress và làm mất đường dẫn bài cũ.
 *
 * Mặc định chỉ xem trước. --apply bắt buộc có --backup=<file.json>; mọi UPDATE
 * nằm trong một transaction và kiểm tra giá trị cũ để phát hiện người khác sửa
 * giữa lúc lập kế hoạch và ghi. KHÔNG đụng lessons, lesson_progress, enrollments.
 *
 *   npx ts-node scripts/fix-course-lessons.ts
 *   npx ts-node scripts/fix-course-lessons.ts --apply --backup=course-lessons-bak.json
 */
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma';
import {
  ACTIVE_LESSON_SORT_ORDER,
  planCourseLessonCount,
} from '../src/course-admin/course-lesson-count';

const ARGV = process.argv.slice(2);
const APPLY = ARGV.includes('--apply');
const BACKUP = ARGV.find((arg) => arg.startsWith('--backup='))?.slice('--backup='.length);

async function main() {
  if (APPLY && !BACKUP) {
    console.error('Thiếu --backup=<file.json>: phải sao lưu courses.lessons cũ trước khi ghi.');
    process.exitCode = 1;
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.error('Thiếu DATABASE_URL — không thể đọc DB để lập kế hoạch.');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        lessonCount: true,
        lessons: {
          where: { sortOrder: ACTIVE_LESSON_SORT_ORDER },
          select: { sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });
    const plan = planCourseLessonCount(
      courses.map((course) => ({
        id: course.id,
        lessonCount: course.lessonCount,
        activeSortOrders: course.lessons.map((lesson) => lesson.sortOrder),
      })),
    );

    if (plan.gaps.length) {
      console.error('Dãy sort_order bị hở — không ghi gì vì lessonCount không thể thay số thứ tự cuối:');
      for (const gap of plan.gaps) {
        console.error(`  ${gap.courseId}: thiếu ${gap.missing.join(', ')}`);
      }
      process.exitCode = 1;
      return;
    }
    if (!plan.updates.length) {
      console.log('Không có gì để sửa: courses.lessons đã khớp số bài hoạt động.');
      return;
    }

    console.log('Khoá | khai | bài hoạt động | sẽ đổi');
    for (const item of plan.updates) {
      console.log(`${item.id} | ${item.before} | ${item.after} | ${item.after}`);
    }
    console.log('\nLưu ý: enrollments.progress có thể lệch sau khi đổi mẫu số; chạy check-db-invariants.ts rồi tính lại theo recomputeProgress.');
    if (!APPLY) {
      console.log('CHẠY THỬ — chưa ghi gì. Thêm --apply --backup=<file.json> để làm thật.');
      return;
    }

    writeFileSync(
      BACKUP!,
      JSON.stringify({ exportedAt: new Date().toISOString(), courses: plan.updates.map(({ id, before }) => ({ id, lessonCount: before })) }, null, 1),
    );
    console.log(`✓ Đã sao lưu ${plan.updates.length} hàng courses vào ${BACKUP}`);
    await prisma.$transaction(async (tx) => {
      for (const item of plan.updates) {
        const result = await tx.course.updateMany({
          where: { id: item.id, lessonCount: item.before },
          data: { lessonCount: item.after },
        });
        if (result.count !== 1) {
          throw new Error(`${item.id}: UPDATE trúng ${result.count} hàng, cần đúng 1 — huỷ toàn bộ.`);
        }
      }
    });
    console.log(`✓ Đã đồng bộ ${plan.updates.length} khoá. Chạy lại script và check-db-invariants.ts để kiểm.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
