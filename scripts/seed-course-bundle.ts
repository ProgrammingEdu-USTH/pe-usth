/**
 * seed-course-bundle.ts — nạp MỘT khoá mới (SQL, ML…) từ gói bài cùng định dạng pe-v4.
 * Khung của DB13: khi có tài liệu thật chỉ thay file gói rồi chạy lại.
 *
 * CHỈ DÙNG CHO KHOÁ CHƯA CÓ NGƯỜI HỌC. Khoá đã có `lesson_progress` thì script TỪ CHỐI (khác
 * seed-python-advanced-v4 là xoá cả tiến độ): dùng update-lesson-content.ts cho trường hợp đó.
 *
 * Gói: { course_id, course: {title, subtitle, description, language}, lessons: [Row...] } với Row
 * giống scripts/pe-v4/out-advanced/lessons.json (xem src/course-admin/course-bundle.ts).
 *
 *   npx ts-node scripts/seed-course-bundle.ts --course=sql_advanced --bundle=<file.json>            # xem trước
 *   npx ts-node scripts/seed-course-bundle.ts --course=sql_advanced --bundle=<file.json> --apply --backup=bak.json
 *   thêm --publish để đặt is_published = true
 *
 * Giảng viên/cấp độ/XP của khoá mới sao chép từ `python_advanced` ("cấp độ y hệt Python").
 * Sau khi nạp: py scripts/pe-v4/sync_curricula.py không áp dụng (chỉ cho Python) — trang khoá học
 * của khoá mới phải được thêm vào frontend/src/lib/catalog.ts riêng.
 */
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import { checkBundle, type CourseBundle } from '../src/course-admin/course-bundle';

const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const COURSE_ID = arg('course');
const BUNDLE = arg('bundle');
const BACKUP = arg('backup');
const APPLY = process.argv.includes('--apply');
const PUBLISH = process.argv.includes('--publish');

async function main() {
  if (!COURSE_ID || !BUNDLE) {
    console.error('Dùng: --course=<id> --bundle=<file.json> [--apply --backup=<file>] [--publish]');
    process.exitCode = 1;
    return;
  }
  if (COURSE_ID === 'python_advanced') {
    console.error('python_advanced có script riêng (seed-python-advanced-v4.ts / update-lesson-content.ts).');
    process.exitCode = 1;
    return;
  }
  const bundle = JSON.parse(readFileSync(BUNDLE, 'utf8')) as CourseBundle;
  const rows = bundle.lessons ?? [];
  const errors = checkBundle(bundle, COURSE_ID);
  if (!bundle.course?.title) errors.push('Gói thiếu course.title.');
  if (errors.length) {
    console.error(`${errors.length} lỗi — không ghi gì:`);
    errors.forEach((e) => console.error('  ' + e));
    process.exitCode = 1;
    return;
  }
  console.log(`✓ ${rows.length} bài hợp lệ -> khoá "${COURSE_ID}".`);

  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
  try {
    const course = await prisma.course.findUnique({ where: { id: COURSE_ID } });
    const oldLessons = await prisma.lesson.findMany({ where: { courseId: COURSE_ID } });
    const progressCount = await prisma.lessonProgress.count({
      where: { OR: [{ courseId: COURSE_ID }, { lesson: { courseId: COURSE_ID } }] },
    });
    if (progressCount > 0) {
      console.error(`Khoá đã có ${progressCount} dòng tiến độ — TỪ CHỐI (sẽ xoá tiến độ). Dùng update-lesson-content.ts.`);
      process.exitCode = 1;
      return;
    }
    const template = await prisma.course.findUnique({ where: { id: 'python_advanced' } });
    if (!course && !template) {
      console.error('Không có khoá python_advanced để sao chép giảng viên/cấp độ — dừng.');
      process.exitCode = 1;
      return;
    }
    console.log(course ? `Khoá đã có, ${oldLessons.length} bài cũ sẽ bị thay.` : 'Khoá CHƯA có: sẽ tạo mới.');
    console.log(`NẠP ${rows.length} bài; courses.lessons = ${rows.length}` + (PUBLISH ? '; is_published = true.' : '.'));
    if (!APPLY) return void console.log('\nCHẠY THỬ — chưa ghi gì.');
    if (!BACKUP) {
      console.error('Thiếu --backup=<file.json>.');
      process.exitCode = 1;
      return;
    }
    writeFileSync(BACKUP, JSON.stringify({ exportedAt: new Date().toISOString(), course, lessons: oldLessons }, null, 1));

    const info = bundle.course!;
    const meta = { ...((course?.contentMeta ?? template?.contentMeta ?? {}) as Record<string, unknown>), subtitle: info.subtitle, description: info.description, image: info.image };
    await prisma.$transaction(
      async (tx) => {
        await tx.lesson.deleteMany({ where: { courseId: COURSE_ID } });
        if (!course) {
          await tx.course.create({
            data: {
              id: COURSE_ID!, title: info.title, level: template!.level, rating: 0, lessonCount: rows.length,
              instructorId: template!.instructorId, xp_reward: template!.xp_reward, isPublished: PUBLISH,
              contentMeta: meta, language: info.language ?? template!.language, accentColor: template!.accentColor,
            },
          });
        } else {
          await tx.course.update({
            where: { id: COURSE_ID },
            data: { title: info.title, lessonCount: rows.length, contentMeta: meta, ...(PUBLISH ? { isPublished: true } : {}) },
          });
        }
        await tx.lesson.createMany({
          data: rows.map((r) => ({
            courseId: COURSE_ID!, lessonCode: r.lesson_code, module: r.module, title: r.title, subtitle: r.subtitle,
            sortOrder: r.sort_order, estimatedMinutes: r.estimated_minutes ?? null, xpReward: r.xp_reward,
            contentJson: r.content_json as object,
          })),
        });
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
    console.log(`✓ Đã nạp ${rows.length} bài vào ${COURSE_ID}.`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
