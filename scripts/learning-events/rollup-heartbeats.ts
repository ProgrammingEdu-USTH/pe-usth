/**
 * rollup-heartbeats.ts — gộp Heartbeat cũ thành số phút và dọn `learning_events` quá hạn.
 *
 * Vì sao: `X-Lesson.Heartbeat` gửi mỗi 30 giây nên là loại đông nhất (52% hàng, đo 15/11) mà
 * chỉ mang MỘT thông tin — "còn đang mở bài". Giữ nó dạng "số phút mỗi ngày mỗi bài"
 * (bảng `learning_time_daily`) là đủ cho câu hỏi thời-gian-trên-tác-vụ, và là cách duy nhất
 * làm bảng không phình theo số người học. Các câu phân tích trong truy-van.sql KHÔNG dùng
 * Heartbeat, nên gộp nó không làm mất kết quả nào đang có.
 *
 * LÀM GÌ (một transaction):
 *  1. Heartbeat cũ hơn `--heartbeat-days` (mặc định 7) → cộng vào `learning_time_daily` rồi xoá
 *     hàng thô, bằng MỘT câu `WITH moved AS (DELETE … RETURNING …) INSERT …` nên không thể xoá
 *     mà không gộp. Sau đó kiểm: số heartbeat đã cộng phải BẰNG số đã xoá, lệch là huỷ cả lần.
 *  2. Mọi loại KHÁC cũ hơn `--keep-days` (mặc định 90 = HAN_LUU_NGAY) → xoá. Hàng thô của
 *     Run.Test/Submit/Abandon… giữ 90 ngày vì truy-van.sql đọc payload của chúng; tóm tắt theo
 *     ngày sẽ làm mất "ca nào trượt, exception gì, ở màn nào".
 *  3. Dòng `learning_time_daily` cũ hơn `--keep-days` → xoá (không giữ lâu hơn điều đã hứa).
 *
 * KHÔNG đòi --backup (khác các script xoá khác): hàng bị xoá ở bước 1 đã nằm trong bảng tóm
 * tắt, còn file sao lưu hàng thô chính là bản giữ dữ liệu quá hạn ngoài DB. Nếu cần sao lưu ở
 * bước 2, dùng pg_dump -t learning_events trước khi --apply.
 *
 * Mốc cắt tính theo NGÀY UTC (src/learning-events/event-retention.ts) để mỗi (user, ngày)
 * được gộp trọn một lần. Chạy lại ngay sau đó là no-op.
 *
 * CHẠY (từ thư mục gốc repo, cần .env có DATABASE_URL):
 *   npx ts-node scripts/learning-events/rollup-heartbeats.ts                      # xem trước
 *   npx ts-node scripts/learning-events/rollup-heartbeats.ts --apply
 *   npx ts-node scripts/learning-events/rollup-heartbeats.ts --heartbeat-days=3 --keep-days=60 --apply
 * Sau --apply nên chạy `VACUUM (ANALYZE) learning_events;` (DELETE để lại dead tuple).
 */
import 'dotenv/config';
import { Prisma, PrismaClient } from '../../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import {
  DEFAULT_HEARTBEAT_DAYS,
  DEFAULT_KEEP_DAYS,
  HEARTBEAT_KIND,
  dayAlignedCutoff,
  parseDaysFlag,
} from '../../src/learning-events/event-retention';

const ARGV = process.argv.slice(2);
const APPLY = ARGV.includes('--apply');

async function main() {
  let heartbeatDays: number;
  let keepDays: number;
  try {
    heartbeatDays = parseDaysFlag(ARGV, '--heartbeat-days', DEFAULT_HEARTBEAT_DAYS);
    keepDays = parseDaysFlag(ARGV, '--keep-days', DEFAULT_KEEP_DAYS);
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
    return;
  }
  const now = new Date();
  const hbCut = dayAlignedCutoff(now, heartbeatDays);
  const keepCut = dayAlignedCutoff(now, keepDays);
  const keepCutDate = Prisma.sql`(${keepCut}::timestamptz AT TIME ZONE 'UTC')::date`;
  console.log(
    `Heartbeat cũ hơn ${heartbeatDays} ngày (trước ${hbCut.toISOString()}) → gộp thành phút.\n` +
      `Loại khác và tóm tắt cũ hơn ${keepDays} ngày (trước ${keepCut.toISOString()}) → xoá.`,
  );

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const [hb] = await prisma.$queryRaw<{ hang: number; nguoi: number; dong: number; phut: number }[]>(Prisma.sql`
      SELECT count(*)::int AS hang, count(DISTINCT user_id)::int AS nguoi,
             count(DISTINCT (user_id, (created_at AT TIME ZONE 'UTC')::date, COALESCE(course_id, ''), COALESCE(lesson_no, 0)))::int AS dong,
             count(DISTINCT (user_id, COALESCE(course_id, ''), COALESCE(lesson_no, 0), date_trunc('minute', created_at)))::int AS phut
        FROM learning_events WHERE kind = ${HEARTBEAT_KIND} AND created_at < ${hbCut}`);
    const khac = await prisma.$queryRaw<{ kind: string; n: number }[]>(Prisma.sql`
      SELECT kind, count(*)::int AS n FROM learning_events
       WHERE kind <> ${HEARTBEAT_KIND} AND created_at < ${keepCut} GROUP BY kind ORDER BY n DESC`);
    const [tt] = await prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
      SELECT count(*)::int AS n FROM learning_time_daily WHERE day < ${keepCutDate}`);

    console.log(
      `\nGộp Heartbeat: ${hb.hang} hàng của ${hb.nguoi} người → ${hb.dong} dòng tóm tắt, ${hb.phut} phút học.`,
    );
    console.log(
      khac.length
        ? `Xoá loại khác quá hạn: ${khac.map((k) => `${k.kind} ${k.n}`).join(', ')}.`
        : 'Xoá loại khác quá hạn: không có.',
    );
    console.log(`Xoá dòng tóm tắt quá hạn: ${tt.n}.`);

    if (!APPLY) {
      console.log('\nCHẠY THỬ — chưa ghi gì. Thêm --apply để làm thật.');
      return;
    }

    const kq = await prisma.$transaction(
      async (tx) => {
        const [{ b }] = await tx.$queryRaw<{ b: number }[]>(Prisma.sql`
          SELECT count(*)::int AS b FROM learning_events WHERE kind = ${HEARTBEAT_KIND} AND created_at < ${hbCut}`);
        const [{ s0 }] = await tx.$queryRaw<{ s0: number }[]>(
          Prisma.sql`SELECT COALESCE(sum(heartbeats), 0)::int AS s0 FROM learning_time_daily`,
        );

        // MỘT câu: xoá hàng thô và cộng dồn vào tóm tắt cùng lúc. Cộng dồn (ON CONFLICT) chứ
        // không ghi đè: một heartbeat tới muộn của ngày đã gộp phải cộng thêm, không xoá phần cũ.
        await tx.$executeRaw(Prisma.sql`
          WITH moved AS (
            DELETE FROM learning_events WHERE kind = ${HEARTBEAT_KIND} AND created_at < ${hbCut}
            RETURNING user_id, course_id, lesson_no, created_at
          ), agg AS (
            SELECT user_id, (created_at AT TIME ZONE 'UTC')::date AS day,
                   COALESCE(course_id, '') AS course_id, COALESCE(lesson_no, 0) AS lesson_no,
                   count(DISTINCT date_trunc('minute', created_at))::int AS active_minutes,
                   count(*)::int AS heartbeats
              FROM moved GROUP BY 1, 2, 3, 4
          )
          INSERT INTO learning_time_daily (user_id, day, course_id, lesson_no, active_minutes, heartbeats)
          SELECT user_id, day, course_id, lesson_no, active_minutes, heartbeats FROM agg
          ON CONFLICT (user_id, day, course_id, lesson_no) DO UPDATE
            SET active_minutes = learning_time_daily.active_minutes + EXCLUDED.active_minutes,
                heartbeats = learning_time_daily.heartbeats + EXCLUDED.heartbeats`);

        const [{ s1 }] = await tx.$queryRaw<{ s1: number }[]>(
          Prisma.sql`SELECT COALESCE(sum(heartbeats), 0)::int AS s1 FROM learning_time_daily`,
        );
        const [{ con }] = await tx.$queryRaw<{ con: number }[]>(Prisma.sql`
          SELECT count(*)::int AS con FROM learning_events WHERE kind = ${HEARTBEAT_KIND} AND created_at < ${hbCut}`);
        if (s1 - s0 !== b || con !== 0) {
          throw new Error(
            `Kiểm trượt, huỷ cả lần: cần gộp ${b} heartbeat, tóm tắt tăng ${s1 - s0}, còn lại ${con} hàng thô.`,
          );
        }

        const xoaKhac = await tx.$executeRaw(Prisma.sql`
          DELETE FROM learning_events WHERE kind <> ${HEARTBEAT_KIND} AND created_at < ${keepCut}`);
        const xoaTt = await tx.$executeRaw(
          Prisma.sql`DELETE FROM learning_time_daily WHERE day < ${keepCutDate}`,
        );
        return { b, xoaKhac, xoaTt };
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    console.log(
      `\nXONG: gộp ${kq.b} heartbeat (kiểm khớp), xoá ${kq.xoaKhac} hàng loại khác, ${kq.xoaTt} dòng tóm tắt quá hạn.\n` +
        'Nên chạy: VACUUM (ANALYZE) learning_events;',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
