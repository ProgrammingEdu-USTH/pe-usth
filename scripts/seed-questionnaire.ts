/**
 * seed-questionnaire.ts — dựng bộ câu hỏi đầu vào theo module và nạp vào bảng `questionnaires`.
 * Định dạng và quy tắc chấm: docs/questionnaire-spec.md. API đọc nó: src/questionnaire/.
 *
 * Hai nguồn câu hỏi, cùng một lệnh:
 *  · Mặc định: tự dựng từ `step_2.mcq` của gói bài đang nạp vào DB (scripts/pe-da/out/lessons.json,
 *    11 module, cùng giáo trình với curricula.json của FE). Lọc theo luật A2–A5 và bỏ câu dựa vào
 *    ngữ cảnh bài — chi tiết ở src/questionnaire/build-questionnaire.ts.
 *  · `--file=data/questionnaire/<tên>.json`: bộ câu do người soạn (Nam), đúng định dạng spec §2.
 *
 *   npx ts-node scripts/seed-questionnaire.ts                                  # chạy thử: dựng + ghi file, KHÔNG chạm DB
 *   npx ts-node scripts/seed-questionnaire.ts --file=data/questionnaire/x.json # chạy thử bộ câu soạn tay
 *   npx ts-node scripts/seed-questionnaire.ts --apply --activate --expected-host=<host DIRECT_URL>
 *
 * AN TOÀN:
 *  · Mặc định CHẠY THỬ: kiểm định dạng, in từng module được bao nhiêu câu, ghi file `--out`.
 *  · `--apply` bắt buộc `--expected-host` khớp host của DIRECT_URL (hoặc DATABASE_URL): không ghi
 *    nhầm DB thật khi .env đang trỏ chỗ khác.
 *  · Luôn tạo bản MỚI (version = max + 1), không sửa bản cũ: `placement_attempts` cũ trỏ vào đúng
 *    bản câu hỏi đã chấm.
 *  · `--activate` tắt mọi bản khác và bật bản mới trong MỘT transaction — giữ luật "đúng một bản
 *    is_active" của scripts/load-questionnaire.ts, vì /api/placement đọc bản bật bất kể khoá học.
 *    Server cache bản đang bật tối đa 60 s.
 */
import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma';
import {
  buildQuestionnaireFromLessons,
  type LessonLike,
} from '../src/questionnaire/build-questionnaire';
import {
  parseQuestionnaireDoc,
  type QuestionnaireDoc,
} from '../src/questionnaire/questionnaire.logic';

const arg = (n: string) =>
  process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const has = (n: string) => process.argv.includes(`--${n}`);

const FROM = arg('from') ?? 'scripts/pe-da/out/lessons.json';
const FILE = arg('file');
const OUT =
  arg('out') ?? 'scripts/placement/questionnaire-python_advanced.json';
// M9–M11 của khoá là ôn tập và thực hành tổng hợp, không có kiến thức mới: không hỏi.
// Đạt hết M1–M8 thì người học bắt đầu ở M9 (luật "module kế tiếp" của spec §3).
const MODULES = (arg('modules') ?? 'M1,M2,M3,M4,M5,M6,M7,M8')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);
const PER_MODULE = Number(arg('per-module') ?? 3);
// Với 3 câu/module, điểm làm thật chỉ có 0; 0,33; 0,67; 1. Ngưỡng 0,66 nghĩa là đúng ≥ 2/3.
// (Ngưỡng 0,67 của spec tính cho 2 câu/module; giữ 0,67 ở đây sẽ đòi đúng CẢ BA, vì 2/3 = 0,6667.)
const THRESHOLD = Number(arg('threshold') ?? 0.66);
const TITLE = arg('title') ?? 'Bài kiểm tra đầu vào theo module';
const APPLY = has('apply');
const ACTIVATE = has('activate');
const EXPECTED_HOST = arg('expected-host');

function loadDoc(): QuestionnaireDoc {
  if (FILE) {
    const doc = parseQuestionnaireDoc(JSON.parse(readFileSync(FILE, 'utf8')));
    console.log(`Bộ câu soạn tay: ${FILE}`);
    return doc;
  }
  const pack = JSON.parse(readFileSync(FROM, 'utf8')) as {
    course_id: string;
    lessons: LessonLike[];
  };
  const { doc, report } = buildQuestionnaireFromLessons(pack.lessons, {
    courseId: pack.course_id,
    moduleCodes: MODULES,
    perModule: PER_MODULE,
    params: {
      mastery_threshold: THRESHOLD,
      // Chỉ để FE hiện "khoảng N phút"; ước 25 giây một câu.
      max_duration_min: Math.ceil((MODULES.length * PER_MODULE * 25) / 60),
    },
    title: TITLE,
  });
  console.log(
    `Dựng từ ${FROM} (${pack.lessons.length} bài, khoá ${pack.course_id}):`,
  );
  for (const r of report) {
    console.log(
      `  ${r.module_code.padEnd(4)} ${String(r.lessons).padStart(3)} bài, ` +
        `${String(r.candidates).padStart(3)} câu đạt lọc → lấy ${r.picked.join(', ') || '—'}` +
        (r.short ? `  ⚠ THIẾU ${r.short} câu` : ''),
    );
  }
  return doc;
}

async function apply(doc: QuestionnaireDoc) {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url || !EXPECTED_HOST)
    throw new Error(
      '--apply cần DIRECT_URL (hoặc DATABASE_URL) và --expected-host=<host đã xác nhận là branch thử>.',
    );
  const host = new URL(url).hostname;
  if (host !== EXPECTED_HOST)
    throw new Error(
      `Sai DB: .env trỏ tới ${host}, --expected-host là ${EXPECTED_HOST}. Dừng, chưa kết nối.`,
    );
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: url }),
  });
  try {
    const version = await prisma.$transaction(async (tx) => {
      const max = await tx.questionnaire.aggregate({ _max: { version: true } });
      const v = (max._max.version ?? 0) + 1;
      if (ACTIVATE)
        await tx.questionnaire.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      await tx.questionnaire.create({
        data: {
          version: v,
          title: doc.title ?? null,
          questionsJson: { ...doc, version: v },
          isActive: ACTIVATE,
        },
      });
      return v;
    });
    console.log(
      `✓ Đã tạo version ${version}${ACTIVATE ? ' và BẬT (đã tắt các bản khác)' : ' (chưa bật)'}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  let doc: QuestionnaireDoc;
  try {
    doc = loadDoc();
  } catch (e) {
    console.error('Không hợp lệ — không ghi gì: ' + (e as Error).message);
    process.exitCode = 1;
    return;
  }
  const perModule = new Map<string, number>();
  for (const it of doc.items)
    perModule.set(it.module_code, (perModule.get(it.module_code) ?? 0) + 1);
  console.log(
    `✓ ${doc.items.length} câu, ${perModule.size} module, ngưỡng đạt ${doc.params.mastery_threshold}.`,
  );

  if (!FILE) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
    console.log(
      `Đã ghi ${OUT} (chứa đáp án: chỉ để duyệt và nạp, không gửi FE).`,
    );
  }

  if (!APPLY) {
    console.log(
      '\nCHẠY THỬ — chưa ghi DB. Nạp thật: --apply --activate --expected-host=<host>.',
    );
    return;
  }
  await apply(doc);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
