/**
 * restore-lesson-content.ts — khôi phục `content_json` của các bài từ file sao lưu mà
 * `update-lesson-content.ts --apply --backup=<file>` đã ghi (DB8).
 *
 * Vì sao: --backup chỉ có ích nếu có đường đọc ngược nó. Không dùng seed (xoá tiến độ)
 * và không viết UPDATE tay (gõ nhầm WHERE là sửa nhầm bài). Script này chỉ chạy đúng một
 * loại câu lệnh, y hệt update-lesson-content.ts:
 *     UPDATE lessons SET content_json = <từ file> WHERE course_id = … AND sort_order = …
 *                                                      AND lesson_code = …
 *
 * AN TOÀN: mặc định CHẠY THỬ (in sha256 hiện tại → sau khôi phục, không ghi); `--apply`
 * ghi trong MỘT transaction, mỗi câu phải trúng đúng 1 hàng (bài đã bị xoá/đổi mã giữa
 * chừng thì huỷ cả lần); KHÔNG đụng lesson_progress, enrollments, courses.
 *
 * Định dạng file (đúng thứ update-lesson-content.ts ghi):
 *   { courseId, lessons: [{ sortOrder, lessonCode, contentJson }] }
 *
 * CHẠY (từ thư mục gốc repo, cần .env có DATABASE_URL):
 *   npx ts-node scripts/restore-lesson-content.ts --from=content-backup.json          # xem trước
 *   npx ts-node scripts/restore-lesson-content.ts --from=content-backup.json --apply
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { Prisma, PrismaClient } from '../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import { fingerprint } from '../src/course-admin/lesson-content-update';

const ARGV = process.argv.slice(2);
const APPLY = ARGV.includes('--apply');
const FROM = ARGV.find((a) => a.startsWith('--from='))?.slice('--from='.length);

interface BackupLesson {
  sortOrder: number;
  lessonCode: string;
  contentJson: Prisma.InputJsonValue;
}

/** Ném lỗi nếu file không đúng hình dạng — đừng ghi gì khi chưa chắc file là gì. */
function readBackup(file: string): { courseId: string; lessons: BackupLesson[] } {
  const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  const lessons = raw.lessons;
  if (typeof raw.courseId !== 'string' || !Array.isArray(lessons) || lessons.length === 0) {
    throw new Error('File không có courseId hoặc lessons[] — không phải file của update-lesson-content.ts.');
  }
  for (const l of lessons as Record<string, unknown>[]) {
    if (
      !Number.isInteger(l.sortOrder) ||
      typeof l.lessonCode !== 'string' ||
      l.contentJson === null ||
      typeof l.contentJson !== 'object'
    ) {
      throw new Error(`Bài không hợp lệ trong file: ${JSON.stringify(l).slice(0, 120)}`);
    }
  }
  return { courseId: raw.courseId, lessons: lessons as BackupLesson[] };
}

async function main() {
  if (!FROM) {
    console.error('Thiếu --from=<file.json> (file --backup của update-lesson-content.ts).');
    process.exitCode = 1;
    return;
  }
  const { courseId, lessons } = readBackup(FROM);
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const now = await prisma.lesson.findMany({
      where: { courseId, sortOrder: { in: lessons.map((l) => l.sortOrder) } },
      select: { sortOrder: true, lessonCode: true, contentJson: true },
    });
    const byOrder = new Map(now.map((r) => [r.sortOrder, r]));
    const errors: string[] = [];
    for (const l of lessons) {
      const row = byOrder.get(l.sortOrder);
      if (!row) errors.push(`sort_order ${l.sortOrder}: không có trong DB`);
      else if (row.lessonCode !== l.lessonCode) {
        errors.push(`sort_order ${l.sortOrder}: mã trong DB ${row.lessonCode} ≠ mã trong file ${l.lessonCode}`);
      }
    }
    if (errors.length) {
      console.error(`${errors.length} lỗi — không ghi gì:`);
      errors.forEach((e) => console.error('  ' + e));
      process.exitCode = 1;
      return;
    }
    for (const l of lessons) {
      const a = fingerprint(byOrder.get(l.sortOrder)!.contentJson);
      const b = fingerprint(l.contentJson);
      console.log(
        `  ${l.lessonCode} (sort_order ${l.sortOrder}): ` +
          (a.sha256 === b.sha256 ? `đã giống file (${b.sha256.slice(0, 12)})` : `KHÔI PHỤC ${a.sha256.slice(0, 12)} → ${b.sha256.slice(0, 12)}`),
      );
    }
    if (!APPLY) {
      console.log('\nCHẠY THỬ — chưa ghi gì. Thêm --apply để làm thật.');
      return;
    }
    await prisma.$transaction(
      async (tx) => {
        for (const l of lessons) {
          const res = await tx.lesson.updateMany({
            where: { courseId, sortOrder: l.sortOrder, lessonCode: l.lessonCode },
            data: { contentJson: l.contentJson },
          });
          if (res.count !== 1) {
            throw new Error(`${l.lessonCode}: UPDATE trúng ${res.count} hàng (cần 1) — huỷ cả lần.`);
          }
        }
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
    console.log(`\n✓ Đã khôi phục ${lessons.length} bài. Chạy scripts/check-db-invariants.ts để kiểm.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
