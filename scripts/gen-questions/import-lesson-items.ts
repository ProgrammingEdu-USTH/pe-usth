/**
 * import-lesson-items.ts — đổ câu có sẵn của giáo trình vào `question_bank` cho đề ôn hằng ngày:
 * trắc nghiệm `step_2.mcq` và bài code `step_4` của gói pe-da (giáo trình đang chạy trên DB).
 *
 * Vì sao cần: đề ôn hằng ngày lấy câu từ `question_bank`, mà bảng này rỗng tới khi Gemini sinh
 * được câu (quota gói miễn phí 20 lượt/ngày). Câu của giáo trình là câu đã có người soạn và duyệt,
 * nên vào thẳng `status = 'approved'`, `source = 'lesson'`. Câu Gemini sinh sau này vào cùng bảng.
 *
 * Luồng (ba bước, bước sau đọc file của bước trước):
 *   1. npx ts-node scripts/gen-questions/import-lesson-items.ts
 *        CHẠY THỬ: đổi bài → scripts/gen-questions/out/lesson-items.json, in báo cáo. Không DB.
 *   2. node scripts/gen-questions/check-lesson-items.mjs
 *        chạy lời giải và code khởi tạo của MỌI bài code bằng Pyodide của trình duyệt
 *        → out/lesson-items.verified.json. Bài code chưa qua bước này KHÔNG được nhập.
 *   3. npx ts-node scripts/gen-questions/import-lesson-items.ts --apply --expected-host=<host DIRECT_URL>
 *        ghi trắc nghiệm + bài code đã qua kiểm. createMany skipDuplicates trên content_hash
 *        UNIQUE: chạy lại không nhân đôi. Chỉ INSERT vào question_bank, không đụng bảng khác.
 *
 * Tham số: --from=<lessons.json> (mặc định gói pe-da), --codes=PY01,PY02 (chỉ vài bài).
 */
import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../../src/generated/prisma';
import {
  lessonItems,
  type LessonItem,
  type SkippedItem,
} from '../../src/question-gen/lesson-items';

const ARGV = process.argv.slice(2);
const arg = (name: string) =>
  ARGV.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const APPLY = ARGV.includes('--apply');
const EXPECTED_HOST = arg('expected-host');
const FROM = arg('from') ?? 'scripts/pe-da/out/lessons.json';
const CODES = arg('codes')
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const OUT_DIR = join(__dirname, 'out');
const ITEMS_FILE = join(OUT_DIR, 'lesson-items.json');
const VERIFIED_FILE = join(OUT_DIR, 'lesson-items.verified.json');

export interface ItemsFile {
  meta: { course_id: string; from: string; built_at: string };
  items: LessonItem[];
  skipped: SkippedItem[];
}

interface VerifiedFile {
  pyodide: string;
  checked_at: string;
  passed: string[];
  failed: { content_hash: string; lesson_code: string; reason: string }[];
}

function build(): ItemsFile {
  const raw = JSON.parse(readFileSync(FROM, 'utf8')) as {
    course_id?: unknown;
    lessons?: unknown;
  };
  if (typeof raw.course_id !== 'string' || !Array.isArray(raw.lessons)) {
    throw new Error(`${FROM} không phải gói bài { course_id, lessons[] }.`);
  }
  const items: LessonItem[] = [];
  const skipped: SkippedItem[] = [];
  const seen = new Set<string>();
  for (const lesson of raw.lessons as unknown[]) {
    const code = String((lesson as { lesson_code?: unknown }).lesson_code);
    if (CODES && !CODES.includes(code)) continue;
    const r = lessonItems(lesson);
    for (const it of r.items) {
      // Hai câu giống hệt nhau ở hai bài (câu ôn nhắc lại) chỉ vào bảng một lần; câu sau ghi lý do.
      if (seen.has(it.content_hash)) {
        skipped.push({
          lesson_code: it.lesson_code,
          type: it.type,
          reason: 'trùng nội dung với một câu của bài trước',
        });
        continue;
      }
      seen.add(it.content_hash);
      items.push(it);
    }
    skipped.push(...r.skipped);
  }
  return {
    meta: {
      course_id: raw.course_id,
      from: FROM,
      built_at: new Date().toISOString(),
    },
    items,
    skipped,
  };
}

function report(file: ItemsFile, verified: VerifiedFile | null) {
  const count = (t: string) => file.items.filter((i) => i.type === t).length;
  const lessons = new Set(file.items.map((i) => i.lesson_code)).size;
  console.log(
    `${file.meta.course_id}: ${count('mcq')} trắc nghiệm, ${count('code')} bài code từ ${lessons} bài.`,
  );
  const reasons = new Map<string, number>();
  for (const s of file.skipped) {
    const key = `${s.type}: ${s.reason.replace(/^(A\d): .*/, '$1')}`;
    reasons.set(key, (reasons.get(key) ?? 0) + 1);
  }
  if (reasons.size) {
    console.log(`Bỏ ${file.skipped.length} câu:`);
    for (const [k, n] of [...reasons].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(3)} × ${k}`);
    }
  }
  if (verified) {
    console.log(
      `Kiểm bằng Pyodide ${verified.pyodide} (${verified.checked_at}): ${verified.passed.length} đạt, ${verified.failed.length} trượt.`,
    );
    for (const f of verified.failed) {
      console.log(`  ✗ ${f.lesson_code}: ${f.reason}`);
    }
  }
}

function readVerified(): VerifiedFile | null {
  return existsSync(VERIFIED_FILE)
    ? (JSON.parse(readFileSync(VERIFIED_FILE, 'utf8')) as VerifiedFile)
    : null;
}

async function apply(file: ItemsFile, verified: VerifiedFile | null) {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url || !EXPECTED_HOST) {
    throw new Error(
      '--apply cần DIRECT_URL và --expected-host=<host đã xác nhận là branch thử>.',
    );
  }
  const host = new URL(url).hostname;
  if (host !== EXPECTED_HOST) {
    throw new Error(
      `Sai DB: .env trỏ tới ${host}, --expected-host là ${EXPECTED_HOST}. Dừng, chưa kết nối.`,
    );
  }
  const codeItems = file.items.filter((i) => i.type === 'code');
  const checked = new Set([
    ...(verified?.passed ?? []),
    ...(verified?.failed.map((f) => f.content_hash) ?? []),
  ]);
  // Bài code sửa sau lần kiểm có băm mới, nên "chưa kiểm" bắt được cả trường hợp file kiểm cũ.
  const unchecked = codeItems.filter((i) => !checked.has(i.content_hash));
  if (unchecked.length > 0) {
    throw new Error(
      `${unchecked.length} bài code chưa qua Pyodide (vd ${unchecked[0].lesson_code}). Chạy node scripts/gen-questions/check-lesson-items.mjs trước.`,
    );
  }
  const passed = new Set(verified?.passed ?? []);
  const rows = file.items.filter(
    (i) => i.type === 'mcq' || passed.has(i.content_hash),
  );

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: url }),
  });
  try {
    const res = await prisma.questionBank.createMany({
      data: rows.map((i) => ({
        courseId: file.meta.course_id,
        lessonCode: i.lesson_code,
        moduleCode: i.module_code,
        type: i.type,
        payload: i.payload as object,
        meta: {
          sort_order: i.sort_order,
          ...(i.type === 'code'
            ? { verified_by: `pyodide ${verified?.pyodide}` }
            : {}),
        },
        status: 'approved',
        source: 'lesson',
        contentHash: i.content_hash,
      })),
      skipDuplicates: true,
    });
    const after = await prisma.questionBank.groupBy({
      by: ['type', 'status', 'source'],
      where: { courseId: file.meta.course_id },
      _count: { _all: true },
    });
    console.log(
      `\n✓ Ghi ${res.count}/${rows.length} câu (${rows.length - res.count} đã có, bỏ qua).`,
    );
    for (const g of after) {
      console.log(
        `  question_bank ${g.type}/${g.status}/${g.source}: ${g._count._all}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const file = build();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(ITEMS_FILE, JSON.stringify(file, null, 1));
  console.log(`Đã ghi ${relative(process.cwd(), ITEMS_FILE)}`);
  const verified = readVerified();
  report(file, verified);
  if (!APPLY) {
    console.log(
      '\nCHẠY THỬ: chưa ghi DB. Kiểm bài code: node scripts/gen-questions/check-lesson-items.mjs, rồi chạy lại với --apply --expected-host=<host>.',
    );
    return;
  }
  await apply(file, verified);
}

main().catch((err: Error) => {
  console.error(`\nDừng: ${err.message}`);
  process.exitCode = 1;
});
