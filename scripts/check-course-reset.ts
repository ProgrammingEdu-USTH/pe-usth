/** BE8: kiểm bằng PostgreSQL thật trong schema ngẫu nhiên, tự xoá sau khi chạy.
 * Không đọc/ghi dữ liệu ứng dụng trong public. Chỉ cho phép host được xác nhận.
 * npx ts-node -r tsconfig-paths/register scripts/check-course-reset.ts --expected-host=<host-branch-thử> --base-schema=<schema-trước-BE8>
 * --base-schema tuỳ chọn; mặc định dùng schema hiện tại (kiểm migration chạy lại).
 */
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaService } from '../src/prisma/prisma.service';
import { CoursesService } from '../src/courses/courses.service';
import { LessonsService } from '../src/lessons/lessons.service';
import { StreakService } from '../src/common/streak/streak.service';
import { AchievementsService } from '../src/achievements/achievements.service';

async function main() {
  const arg = (name: string) =>
    process.argv
      .find((a) => a.startsWith(`--${name}=`))
      ?.split('=')
      .slice(1)
      .join('=');
  const connectionString = process.env.DIRECT_URL;
  assert(
    connectionString && arg('expected-host'),
    'Cần DIRECT_URL và --expected-host đã xác nhận là branch thử.',
  );
  assert.equal(
    new URL(connectionString).hostname,
    arg('expected-host'),
    'Sai branch, dừng trước khi kết nối.',
  );
  const schema = `be8_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString });
  const options = `-c search_path=${schema}`;
  const pool = new Pool({ connectionString, options });
  const db = new PrismaClient({
    adapter: new PrismaNeon({ connectionString, options }, { schema }),
  });
  let created = false;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    const ddl = execFileSync(
      process.execPath,
      [
        'node_modules/prisma/build/index.js',
        'migrate',
        'diff',
        '--from-empty',
        '--to-schema',
        arg('base-schema') ?? 'prisma/schema.prisma',
        '--script',
      ],
      { encoding: 'utf8' },
    ).replace('CREATE SCHEMA IF NOT EXISTS "public";', '');
    await pool.query(ddl);
    const migration = readFileSync(
      'prisma/migrations/20261119000000_course_reset/migration.sql',
      'utf8',
    );
    await pool.query(migration);
    await pool.query(migration);
    console.log('PASS: migration áp mới/chạy lại trong schema riêng');
    const isolatedUrl = new URL(connectionString);
    isolatedUrl.searchParams.set('schema', schema);
    const diff = execFileSync(
      process.execPath,
      [
        'node_modules/prisma/build/index.js',
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        'prisma/schema.prisma',
        '--script',
      ],
      {
        encoding: 'utf8',
        env: { ...process.env, DIRECT_URL: isolatedUrl.toString() },
      },
    );
    assert(
      diff.includes('This is an empty migration'),
      'Schema sau migration khác schema Prisma.',
    );
    console.log('PASS: migrate diff rỗng sau migration');

    const prisma = db as unknown as PrismaService;
    const courses = new CoursesService(prisma);
    const lessons = new LessonsService(
      prisma,
      new StreakService(),
      {
        checkAndAwardAchievements: async () => [],
      } as unknown as AchievementsService,
      courses,
    );
    const user = await db.user.create({
      data: { email: 'be8@test.invalid', role: 'user', password: '' },
    });
    const other = await db.user.create({
      data: { email: 'other@test.invalid', role: 'user', password: '' },
    });
    await db.course.create({
      data: {
        id: 'python',
        instructorId: user.id,
        rating: 0,
        lessonCount: 2,
        xp_reward: 0,
        isPublished: true,
      },
    });
    const lesson = await db.lesson.create({
      data: { courseId: 'python', sortOrder: 1, xpReward: 50 },
    });
    const fresh = await db.lesson.create({
      data: { courseId: 'python', sortOrder: 2, xpReward: 50 },
    });
    await courses.enroll(user.id, 'python');
    await assert.rejects(courses.reset(other.id, 'python'));
    const complete = () =>
      lessons.completeLesson(user.id, 1, { courseId: 'python' });
    assert.equal((await complete()).xpGained, 50);
    for (let i = 0; i < 2; i++) {
      const result = await courses.reset(user.id, 'python');
      assert.equal(result.progress, 0);
      assert.equal(
        await db.lessonProgress.count({ where: { userId: user.id } }),
        0,
      );
      assert.equal((await complete()).xpGained, 0);
    }
    const rewarded = await db.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    assert.equal(rewarded.xp, 50);
    assert.equal(rewarded.gems, 50);
    assert.equal(
      await db.lessonProgressArchive.count({
        where: { userId: user.id, lessonId: lesson.id },
      }),
      2,
    );
    console.log(
      'PASS: reset hai lần giữ lịch sử, không thưởng lại, chưa ghi danh bị từ chối',
    );
    await db.lessonProgress.create({
      data: {
        userId: user.id,
        courseId: 'python',
        lessonId: fresh.id,
        status: 'in_progress',
        quizScore: 0,
        xpEarned: 0,
      },
    });
    await courses.reset(user.id, 'python');
    assert.equal(
      (await lessons.completeLesson(user.id, 2, { courseId: 'python' }))
        .xpGained,
      50,
    );
    console.log('PASS: bài học dở chưa thưởng vẫn được thưởng lần đầu');
    const before = await db.lessonProgress.count();
    // Trigger chỉ ở schema thử: làm UPDATE cuối lỗi để kiểm rollback archive + delete thật.
    await pool.query(`CREATE FUNCTION fail_reset() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'BE8 rollback'; END $$;
      CREATE TRIGGER fail_reset BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION fail_reset();`);
    const archives = await db.lessonProgressArchive.count();
    await assert.rejects(courses.reset(user.id, 'python'));
    assert.equal(await db.lessonProgress.count(), before);
    assert.equal(await db.lessonProgressArchive.count(), archives);
    await pool.query('DROP TRIGGER fail_reset ON enrollments');
    console.log('PASS: lỗi bước cuối rollback cả archive lẫn xoá tiến độ');
    await Promise.all([
      courses.reset(user.id, 'python'),
      complete(),
      courses.reset(user.id, 'python'),
      complete(),
    ]);
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(after.xp, 100);
    assert.equal(after.gems, 100);
    console.log('PASS: reset/complete đồng thời không cộng thưởng lại');
    await courses.enroll(other.id, 'python');
    const completeOther = () =>
      lessons.completeLesson(other.id, 1, { courseId: 'python' });
    await Promise.all([
      completeOther(),
      courses.reset(other.id, 'python'),
      completeOther(),
    ]);
    await completeOther();
    const otherAfter = await db.user.findUniqueOrThrow({
      where: { id: other.id },
    });
    assert.equal(otherAfter.xp, 50);
    assert.equal(otherAfter.gems, 50);
    console.log(
      'PASS: lần thưởng đầu chạy đồng thời reset vẫn chỉ thưởng một lần',
    );

    const enrolled = await courses.getEnrolled(user.id);
    assert(JSON.stringify(enrolled).includes('reset_at'));
    console.log('PASS: API ghi danh trả reset_at, không lộ BigInt archive');
  } finally {
    await db.$disconnect();
    await pool.end();
    if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
}
main().catch(() => {
  console.error('BE8 integration FAILED (không in chuỗi kết nối).');
  process.exitCode = 1;
});
