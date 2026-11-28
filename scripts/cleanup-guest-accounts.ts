/**
 * cleanup-guest-accounts.ts — dọn tài khoản khách (`guest_<uuid>@guest.local`) không còn
 * ai vào lại được. Luật chọn/thứ tự xoá nằm ở src/auth/guest-cleanup.ts (có test Jest).
 *
 * Vì sao cần: mỗi trình duyệt mới vào /lesson/* là `POST /auth/guest` tạo một hàng
 * `users`, nên bot và người mở trang một lần làm bảng phình mãi. `DELETE ... WHERE email
 * LIKE '%@guest.local'` không dùng được: 22 khoá ngoại tới `users` là ON DELETE RESTRICT,
 * và LIKE đó trúng cả người thật đăng ký bằng email đuôi ấy.
 *
 * CHỌN khách khi đủ cả: email đúng định dạng guest(), password = '', không OAuth; không
 * còn phiên refresh sống; mốc hoạt động cuối (muộn nhất trong created_at, last_study_date,
 * lesson_progress, user_daily_xp_logs) cũ hơn N ngày; và — trừ khi có
 * --include-with-progress — chưa học bài nào, xp = 0 (giữ số liệu buổi test).
 * BỎ QUA (báo lý do) khách có bài viết/bình luận hoặc là giảng viên.
 *
 * AN TOÀN:
 *  · Mặc định CHẠY THỬ: đọc DB, in sẽ xoá bao nhiêu khách và bao nhiêu hàng mỗi bảng.
 *  · `--apply` bắt buộc kèm `--backup=<file.json>`: ghi hàng `users` + mọi hàng con của
 *    các khách sắp xoá ra file TRƯỚC khi xoá.
 *  · `--limit=<n>` (mặc định 500): số khách tối đa mỗi lần chạy, xoá trong MỘT transaction.
 *    Trong transaction lọc lại khách vẫn không có phiên sống; số `users` xoá được phải
 *    khớp, lệch là huỷ cả lần chạy.
 *
 * CHẠY (từ thư mục gốc repo, cần .env có DATABASE_URL):
 *   npx ts-node scripts/cleanup-guest-accounts.ts                                   # xem trước
 *   npx ts-node scripts/cleanup-guest-accounts.ts --older-than=60d --include-with-progress
 *   npx ts-node scripts/cleanup-guest-accounts.ts --apply --backup=guests-backup.json --limit=200
 */
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { Prisma, PrismaClient } from '../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import {
  CASCADE_REFS,
  DELETE_ORDER,
  GUEST_EMAIL_LIKE,
  parseOlderThan,
  selectStaleGuests,
  splitRef,
  type GuestCandidate,
  type SkipReason,
} from '../src/auth/guest-cleanup';

const ARGV = process.argv.slice(2);
const APPLY = ARGV.includes('--apply');
const INCLUDE_WITH_PROGRESS = ARGV.includes('--include-with-progress');
const BACKUP = ARGV.find((a) => a.startsWith('--backup='))?.slice('--backup='.length);
const LIMIT_RAW = ARGV.find((a) => a.startsWith('--limit='))?.slice('--limit='.length) ?? '500';

const REASON_TEXT: Record<SkipReason, string> = {
  'khong-phai-khach': 'email/mật khẩu/OAuth không khớp tài khoản khách',
  'con-phien': 'còn phiên refresh sống',
  'moi-hoat-dong': 'mới hoạt động trong ngưỡng',
  'co-tien-do': 'đã có tiến độ (thêm --include-with-progress để xoá)',
  'co-bai-viet': 'có bài viết/bình luận trên diễn đàn',
  'la-giang-vien': 'là giảng viên của khoá học',
};

// pg trả count(*) dạng bigint; JSON.stringify không tự chuyển được.
const jsonReplacer = (_k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);

const ident = (name: string) => Prisma.raw(`"${name}"`);

async function main() {
  if (APPLY && !BACKUP) {
    console.error('Thiếu --backup=<file.json>: phải sao lưu khách và hàng con trước khi xoá.');
    process.exitCode = 1;
    return;
  }
  const limit = Number(LIMIT_RAW);
  let olderThanDays: number;
  try {
    if (!Number.isInteger(limit) || limit < 1) throw new Error(`--limit phải là số nguyên ≥ 1 (nhận "${LIMIT_RAW}").`);
    olderThanDays = parseOlderThan(ARGV);
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    // 1) Gom bản tóm tắt mọi khách. LIKE chỉ lọc thô; selectStaleGuests lọc chặt.
    const candidates = await prisma.$queryRaw<GuestCandidate[]>`
      SELECT u.id, u.email, u.password,
        u.oauth_provider AS "oauthProvider", u.created_at AS "createdAt",
        u.last_study_date AS "lastStudyDate", u.xp,
        (SELECT count(*)::int FROM auth_sessions s WHERE s.user_id = u.id
           AND s.revoked_at IS NULL AND (s.expires_at IS NULL OR s.expires_at > now())) AS "liveSessions",
        (SELECT count(*)::int FROM lesson_progress p WHERE p.user_id = u.id) AS "progressCount",
        (SELECT max(p.completed_at) FROM lesson_progress p WHERE p.user_id = u.id) AS "lastProgressAt",
        (SELECT max(x.log_date) FROM user_daily_xp_logs x WHERE x.user_id = u.id) AS "lastXpLogDate",
        (SELECT count(*)::int FROM posts p WHERE p.user_id = u.id) AS posts,
        (SELECT count(*)::int FROM comments c WHERE c.user_id = u.id) AS comments,
        (SELECT count(*)::int FROM courses c WHERE c.instructor_id = u.id) AS "instructedCourses"
      FROM users u
      WHERE u.email LIKE ${GUEST_EMAIL_LIKE}
      ORDER BY u.id`;
    const sel = selectStaleGuests(candidates, {
      now: new Date(),
      olderThanDays,
      includeWithProgress: INCLUDE_WITH_PROGRESS,
    });
    const ids = sel.toDelete.slice(0, limit).map((c) => c.id);

    console.log(
      `Khách (email LIKE ${GUEST_EMAIL_LIKE}): ${candidates.length}. Ngưỡng: ${olderThanDays} ngày` +
        (INCLUDE_WITH_PROGRESS ? ', GỒM cả khách đã học.' : ', chỉ khách chưa học.'),
    );
    const byReason = new Map<SkipReason, number>();
    sel.skipped.forEach((s) => byReason.set(s.reason, (byReason.get(s.reason) ?? 0) + 1));
    for (const [reason, n] of byReason) console.log(`  giữ ${n}: ${REASON_TEXT[reason]}`);
    for (const s of sel.skipped.filter((x) => x.reason === 'co-bai-viet' || x.reason === 'la-giang-vien')) {
      console.log(`    · user ${s.id}: ${REASON_TEXT[s.reason]} — xử lý bằng tay`);
    }
    console.log(
      `  XOÁ ${sel.toDelete.length}` +
        (sel.toDelete.length > ids.length ? ` (lần này ${ids.length} do --limit=${limit})` : ''),
    );
    if (!ids.length) {
      console.log('Không có gì để xoá.');
      return;
    }

    // Số hàng sẽ mất ở từng bảng con (CASCADE cũng tính vì nó mất theo).
    const refs = [...DELETE_ORDER, ...CASCADE_REFS];
    for (const ref of refs) {
      const [table, column] = splitRef(ref);
      const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM ${ident(table)} WHERE ${ident(column)} = ANY (${ids}::int[])`;
      if (n) console.log(`    ${ref}: ${n} hàng`);
    }

    if (!APPLY) {
      console.log('\nCHẠY THỬ — chưa ghi gì. Thêm --apply --backup=<file.json> để làm thật.');
      return;
    }

    // 2) Sao lưu TRƯỚC khi xoá.
    const backup: Record<string, unknown[]> = {
      users: await prisma.$queryRaw<unknown[]>`SELECT * FROM users WHERE id = ANY (${ids}::int[])`,
    };
    for (const ref of refs) {
      const [table, column] = splitRef(ref);
      backup[ref] = await prisma.$queryRaw<unknown[]>`
        SELECT * FROM ${ident(table)} WHERE ${ident(column)} = ANY (${ids}::int[])`;
    }
    writeFileSync(
      BACKUP!,
      JSON.stringify({ exportedAt: new Date().toISOString(), olderThanDays, ids, rows: backup }, jsonReplacer, 1),
    );
    console.log(`✓ Đã sao lưu ${ids.length} khách và hàng con vào ${BACKUP}`);

    // 3) Xoá trong MỘT transaction.
    const deleted = await prisma.$transaction(
      async (tx) => {
        // Lọc lại: khách nào vừa có phiên mới giữa lúc đọc và lúc ghi thì tha.
        const stillOrphan = await tx.$queryRaw<{ id: number }[]>`
          SELECT u.id FROM users u WHERE u.id = ANY (${ids}::int[])
            AND NOT EXISTS (SELECT 1 FROM auth_sessions s WHERE s.user_id = u.id
              AND s.revoked_at IS NULL AND (s.expires_at IS NULL OR s.expires_at > now()))`;
        const keep = stillOrphan.map((r) => r.id);
        for (const ref of DELETE_ORDER) {
          const [table, column] = splitRef(ref);
          await tx.$executeRaw`
            DELETE FROM ${ident(table)} WHERE ${ident(column)} = ANY (${keep}::int[])`;
        }
        const n = await tx.$executeRaw`DELETE FROM users WHERE id = ANY (${keep}::int[])`;
        if (n !== keep.length) {
          throw new Error(`DELETE users trúng ${n} hàng, cần đúng ${keep.length} — huỷ toàn bộ.`);
        }
        return { n, spared: ids.length - keep.length };
      },
      { timeout: 60_000 },
    );
    console.log(
      `\n✓ Đã xoá ${deleted.n} tài khoản khách.` +
        (deleted.spared ? ` Tha ${deleted.spared} khách vừa có phiên mới (vẫn nằm trong file sao lưu).` : ''),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
