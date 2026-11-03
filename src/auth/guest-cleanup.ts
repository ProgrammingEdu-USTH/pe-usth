/**
 * Phần THUẦN (không DB) của `scripts/cleanup-guest-accounts.ts`: chọn tài khoản khách
 * nào được xoá, và xoá các bảng con theo thứ tự nào.
 *
 * Vì sao cần: mỗi trình duyệt mới vào /lesson/* là `POST /auth/guest` tạo một hàng
 * `users` (AuthService.guest), nên bot và người mở trang một lần làm bảng phình mãi.
 * Chú thích cũ gợi ý `DELETE ... WHERE email LIKE '%@guest.local'` — câu đó KHÔNG chạy
 * được (22 khoá ngoại tới `users` là ON DELETE RESTRICT) và lọc quá rộng (ai đăng ký
 * bằng email đuôi đó cũng dính). Luật ở đây để Jest kiểm được mà không cần DB.
 *
 * "Không hoạt động" đo bằng gì: khách có password = '' nên chỉ vào lại được bằng refresh
 * token, và RefreshTokenService.pruneExpired() xoá phiên hết hạn quá 24h. Khách không
 * còn phiên sống thì KHÔNG AI vào lại được tài khoản đó nữa — nó đã mồ côi. Thêm ngưỡng
 * N ngày từ mốc hoạt động cuối để chừa biên cho access token còn hạn và lệch đồng hồ.
 */

/** Đúng định dạng AuthService.guest() sinh: `guest_${randomUUID()}@guest.local`. */
export const GUEST_EMAIL_RE =
  /^guest_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@guest\.local$/;

/** Bộ lọc thô cho SQL (dùng index email); GUEST_EMAIL_RE lọc lại cho chặt. */
export const GUEST_EMAIL_LIKE = 'guest\\_%@guest.local';

export const DEFAULT_OLDER_THAN_DAYS = 30;

export const isGuestEmail = (email: string): boolean =>
  GUEST_EMAIL_RE.test(email);

/** Một khoá ngoại trỏ vào `users`, viết `bảng.cột`. */
export type UserRef = `${string}.${string}`;

/**
 * Thứ tự xoá bảng con. Không chỉ "con trước users" mà còn con trước cha GIỮA các bảng
 * con: roadmap_progress → roadmaps → surveys (roadmaps.generated_from_survey_id).
 * Spec đọc migration và đỏ nếu thứ tự này ngược một khoá ngoại nào.
 * Hàng của NGƯỜI KHÁC mà trỏ vào hàng của khách (vd. roadmap_progress của user khác trỏ
 * roadmap của khách) thì DELETE ném lỗi khoá ngoại và cả transaction huỷ — hỏng an toàn.
 */
export const DELETE_ORDER: readonly UserRef[] = [
  'auth_sessions.user_id',
  'email_verifications.user_id',
  'user_oauth_accounts.user_id',
  'enrollments.user_id',
  'lesson_progress.user_id',
  'course_ratings.user_id',
  'missions.user_id',
  'roadmap_progress.user_id',
  'roadmaps.user_id',
  'surveys.user_id',
  'user_daily_xp_logs.user_id',
  'user_badges.user_id',
  'notification_settings.user_id',
  'notifications.user_id',
  'post_likes.user_id',
  'comment_likes.user_id',
  'user_achievements.user_id',
  'user_follows.follower_id',
  'user_follows.followee_id',
];

/** ON DELETE CASCADE — Postgres tự xoá theo hàng `users`, chỉ cần đưa vào sao lưu. */
export const CASCADE_REFS: readonly UserRef[] = [
  'quizzes.user_id',
  'review_quiz_results.user_id',
];

/**
 * Có hàng ở đây thì BỎ QUA khách, không xoá: xoá bài viết/bình luận kéo theo bình
 * luận, lượt thích của người khác; xoá khoá học kéo theo cả bài học.
 */
export const GUARDED_REFS: readonly UserRef[] = [
  'posts.user_id',
  'comments.user_id',
  'courses.instructor_id',
];

/**
 * Khoá ngoại tới `users` chưa nằm trong danh sách nào ở trên. Spec gọi hàm này với mọi
 * khoá ngoại đọc từ prisma/migrations: thêm bảng trỏ vào `users` mà quên khai ở đây thì
 * DELETE users trong script sẽ vỡ giữa chừng vì RESTRICT.
 */
export function unknownUserRefs(refs: readonly string[]): string[] {
  const known = new Set<string>([
    ...DELETE_ORDER,
    ...CASCADE_REFS,
    ...GUARDED_REFS,
  ]);
  return [...new Set(refs)].filter((r) => !known.has(r)).sort();
}

/** `--older-than=30d` → 30. Thiếu cờ thì lấy mặc định; sai định dạng thì ném lỗi. */
export function parseOlderThan(argv: readonly string[]): number {
  const raw = argv
    .find((a) => a.startsWith('--older-than='))
    ?.slice('--older-than='.length);
  if (raw === undefined) return DEFAULT_OLDER_THAN_DAYS;
  const m = /^(\d+)d$/.exec(raw);
  // Dưới 1 ngày thì vào thẳng vùng khách vừa rời trang — thường là gõ nhầm.
  if (!m || Number(m[1]) < 1) {
    throw new Error(
      `--older-than phải dạng <số ngày>d, tối thiểu 1d (nhận "${raw}").`,
    );
  }
  return Number(m[1]);
}

/** Bản tóm tắt một khách, đúng các cột câu SQL gom trong script trả về. */
export interface GuestCandidate {
  id: number;
  email: string;
  password: string;
  oauthProvider: string | null;
  createdAt: Date;
  lastStudyDate: Date | null;
  xp: number;
  /** Phiên chưa thu hồi và chưa hết hạn (expires_at NULL cũng tính là còn sống). */
  liveSessions: number;
  progressCount: number;
  lastProgressAt: Date | null;
  lastXpLogDate: Date | null;
  posts: number;
  comments: number;
  instructedCourses: number;
}

export type SkipReason =
  | 'khong-phai-khach'
  | 'con-phien'
  | 'moi-hoat-dong'
  | 'co-tien-do'
  | 'co-bai-viet'
  | 'la-giang-vien';

export interface SelectOptions {
  now: Date;
  olderThanDays: number;
  /** Mặc định false: giữ số liệu buổi test của khách đã học. */
  includeWithProgress: boolean;
}

export interface Selection {
  toDelete: GuestCandidate[];
  skipped: { id: number; reason: SkipReason }[];
}

/** Mốc hoạt động cuối = mốc MUỘN NHẤT trong mọi dấu vết, không phải created_at. */
export function lastActivity(c: GuestCandidate): Date {
  const times = [
    c.createdAt,
    c.lastStudyDate,
    c.lastProgressAt,
    c.lastXpLogDate,
  ]
    .filter((d): d is Date => d !== null)
    .map((d) => d.getTime());
  return new Date(Math.max(...times));
}

function skipReason(
  c: GuestCandidate,
  cutoff: number,
  opts: SelectOptions,
): SkipReason | null {
  // Kiểm cả password và oauth: email khớp mà có mật khẩu/OAuth là người thật dùng
  // trùng định dạng, xoá là mất tài khoản đăng nhập được.
  if (!isGuestEmail(c.email) || c.password !== '' || c.oauthProvider)
    return 'khong-phai-khach';
  if (c.liveSessions > 0) return 'con-phien';
  if (lastActivity(c).getTime() >= cutoff) return 'moi-hoat-dong';
  if (!opts.includeWithProgress && (c.progressCount > 0 || c.xp > 0)) {
    return 'co-tien-do';
  }
  if (c.posts > 0 || c.comments > 0) return 'co-bai-viet';
  if (c.instructedCourses > 0) return 'la-giang-vien';
  return null;
}

export function selectStaleGuests(
  candidates: readonly GuestCandidate[],
  opts: SelectOptions,
): Selection {
  const cutoff = opts.now.getTime() - opts.olderThanDays * 86_400_000;
  const out: Selection = { toDelete: [], skipped: [] };
  for (const c of candidates) {
    const reason = skipReason(c, cutoff, opts);
    if (reason) out.skipped.push({ id: c.id, reason });
    else out.toDelete.push(c);
  }
  return out;
}

/** `"posts.user_id"` → `["posts", "user_id"]`. */
export const splitRef = (ref: string): [string, string] => {
  const [table, column] = ref.split('.');
  return [table, column];
};
