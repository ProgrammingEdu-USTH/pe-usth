/**
 * load-questionnaire.ts — nạp một bản câu hỏi đầu vào mới vào `questionnaires`.
 * Khi có bộ câu hỏi thật: đặt file JSON (hình như scripts/placement/questions.sample.json) rồi chạy.
 *
 *   npx ts-node scripts/load-questionnaire.ts --file=<câu hỏi.json> --title="Khảo sát đầu vào"            # xem trước
 *   npx ts-node scripts/load-questionnaire.ts --file=<câu hỏi.json> --title="…" --apply --activate
 *
 * AN TOÀN:
 *  · Mặc định CHẠY THỬ: chỉ kiểm hình dạng (parseQuestions) và in sẽ làm gì.
 *  · Luôn tạo bản MỚI (version = max + 1), KHÔNG sửa bản cũ: kết quả `placement_attempts` cũ trỏ vào
 *    đúng bản câu hỏi đã chấm, sửa tại chỗ là làm kết quả cũ mơ hồ.
 *  · --activate tắt mọi bản khác và bật bản mới trong MỘT transaction (đúng một bản is_active).
 *    Server cache bản đang bật tối đa 60 s nên người đang làm dở có thể nhận 409 "tải lại trang".
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import { parseQuestions } from '../src/placement/placement.logic';

const arg = (n: string) =>
  process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const FILE = arg('file');
const TITLE = arg('title') ?? null;
const APPLY = process.argv.includes('--apply');
const ACTIVATE = process.argv.includes('--activate');

async function main() {
  if (!FILE) {
    console.error(
      'Dùng: --file=<câu hỏi.json> [--title=…] [--apply] [--activate]',
    );
    process.exitCode = 1;
    return;
  }
  let questions;
  try {
    questions = parseQuestions(JSON.parse(readFileSync(FILE, 'utf8')));
  } catch (e) {
    console.error('Không hợp lệ — không ghi gì: ' + (e as Error).message);
    process.exitCode = 1;
    return;
  }
  console.log(
    `✓ ${questions.length} câu hợp lệ (${[...new Set(questions.map((q) => q.topic))].join(', ')}).`,
  );

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const max = await prisma.questionnaire.aggregate({
      _max: { version: true },
    });
    const version = (max._max.version ?? 0) + 1;
    console.log(
      `Sẽ tạo version ${version}${ACTIVATE ? ' và BẬT (tắt các bản khác)' : ' (chưa bật)'}.`,
    );
    if (!APPLY)
      return void console.log(
        '\nCHẠY THỬ — chưa ghi gì. Thêm --apply để làm thật.',
      );
    await prisma.$transaction(async (tx) => {
      if (ACTIVATE)
        await tx.questionnaire.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      await tx.questionnaire.create({
        data: {
          version,
          title: TITLE,
          questionsJson: questions,
          isActive: ACTIVATE,
        },
      });
    });
    console.log(`✓ Đã tạo version ${version}.`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
