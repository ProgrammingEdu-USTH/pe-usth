/**
 * mcq.ts — sinh câu trắc nghiệm từ lý thuyết của giáo trình, lọc tự động (tầng A), lưu vào
 * `question_bank` ở trạng thái draft. Thiết kế: docs/ml-pipeline.md (ML Tuần 2).
 *
 * Vì sao chạy OFFLINE bằng script, không trong request người dùng: mỗi bài là một lượt gọi
 * Gemini vài chục giây; gọi trong request là treo request và đốt quota theo lượt truy cập.
 *
 * AN TOÀN (cùng thói quen với update-lesson-content.ts, cleanup-guest-accounts.ts):
 *  · Mặc định CHẠY THỬ: gọi Gemini, lọc, ghi kết quả + báo cáo ra
 *    scripts/gen-questions/out/mcq-<thời điểm>.json. KHÔNG kết nối DB.
 *  · `--apply` mới ghi DB, và bắt buộc `--expected-host=<host DIRECT_URL>` (giống
 *    check-course-reset.ts): .env trỏ nhầm DB thật thì dừng TRƯỚC khi kết nối.
 *  · `--apply --from=<file run>` ghi ĐÚNG các câu của một lần chạy thử đã xem, không gọi lại
 *    Gemini (câu sinh lại sẽ khác câu đã xem).
 *  · Ghi bằng createMany skipDuplicates trên content_hash UNIQUE: chạy lại không nhân đôi.
 *  · Chỉ INSERT vào question_bank, status 'draft'. Không đụng lessons hay bảng nào khác.
 *  · Một bài lỗi (Gemini lỗi/timeout/JSON hỏng) ghi vào báo cáo rồi đi tiếp.
 *
 * CHẠY (từ thư mục gốc repo, cần GEMINI_API_KEY trong .env):
 *   npx ts-node scripts/gen-questions/mcq.ts --codes=P01,N01             # thử 2 bài
 *   npx ts-node scripts/gen-questions/mcq.ts                             # cả 48 bài
 *   npx ts-node scripts/gen-questions/mcq.ts --apply --expected-host=<host> \
 *       --from=scripts/gen-questions/out/mcq-<…>.json
 * Núm chỉnh (§5, mỗi lần đổi MỘT núm): --prompt=mcq-v1 --few-shot=2 --temperature=0.4
 *   --per-lesson=3; model đổi qua GEMINI_MODEL trong .env.
 */
import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { PrismaClient } from '../../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import geminiConfig from '../../src/config/gemini.config';
import {
  loadLessonDir,
  type LessonChunk,
} from '../../src/question-gen/lesson-chunks';
import {
  DedupIndex,
  cleanMcq,
  contentHash,
  type Mcq,
  type RuleCode,
  type RuleFailure,
  runMcqFilters,
} from '../../src/question-gen/mcq-filters';
import { Pacer, retryWaitMs } from '../../src/question-gen/gemini-pacing';
import {
  buildMcqPrompt,
  conceptsOf,
  difficultyOf,
  extractQuestions,
  pickFewShot,
  type PromptParts,
} from '../../src/question-gen/mcq-prompt';

const COURSE_ID = 'python_advanced';
const LESSON_DIR = join(__dirname, '..', 'pe-v4', 'out-advanced', 'lessons');
const OUT_DIR = join(__dirname, 'out');

// ---------- tham số ----------
const ARGV = process.argv.slice(2);
const arg = (name: string) =>
  ARGV.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const num = (name: string, def: number) => {
  const v = arg(name);
  if (v === undefined) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`--${name}=${v} không phải số`);
  return n;
};

const APPLY = ARGV.includes('--apply');
const FROM = arg('from');
const EXPECTED_HOST = arg('expected-host');
const CODES = arg('codes')
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const PROMPT_VERSION = arg('prompt') ?? 'mcq-v1';
const PER_LESSON = num('per-lesson', 3);
const FEW_SHOT = num('few-shot', 2);
const TEMPERATURE = num('temperature', 0.4);
// Mặc định 1 bài một lúc: gói miễn phí chỉ cho 5 yêu cầu/phút, song song 4 bài vượt ngay
// (đo 23/11/2026: HTTP 429). Muốn nhanh hơn thì tăng --concurrency VÀ giữ --min-interval-ms.
const CONCURRENCY = Math.max(1, num('concurrency', 1));
// 13 s giữa hai lượt gọi = tối đa ~4,6 yêu cầu/phút, dưới trần 5 của gói miễn phí.
const MIN_INTERVAL_MS = num('min-interval-ms', 13_000);
// gemini.config mặc định 30 s là trần cho chatbot trả lời ngắn; sinh 3 câu kèm giải thích
// với gemini-2.5-flash (có bước "thinking") đo được lâu hơn, nên script có trần riêng.
const TIMEOUT_MS = num('timeout-ms', 120_000);
// Mỗi lần thử lại cũng ăn vào quota NGÀY (gói miễn phí: 20 yêu cầu/ngày), nên giữ thấp.
const RETRIES = num('retries', 2);

// ---------- kiểu của file kết quả ----------
interface AcceptedItem {
  lesson_code: string;
  module_code: string;
  concepts: string[];
  difficulty: string | null;
  content_hash: string;
  payload: Mcq;
}
interface RejectedItem {
  lesson_code: string;
  failures: RuleFailure[];
  raw: unknown;
}
interface RunFile {
  meta: {
    course_id: string;
    prompt_version: string;
    model: string;
    temperature: number;
    few_shot: number;
    per_lesson: number;
    started_at: string;
    finished_at: string;
  };
  report: ReturnType<typeof buildReport>;
  accepted: AcceptedItem[];
  rejected: RejectedItem[];
  errors: { lesson_code: string; message: string }[];
}

// ---------- Gemini ----------
const cfg = geminiConfig();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pacer = new Pacer(MIN_INTERVAL_MS);

/** Một lượt generateContent, theo mẫu parseWithGemini() (lesson-import.service.ts). */
async function callGemini(prompt: PromptParts): Promise<string> {
  const body = {
    systemInstruction: { parts: [{ text: prompt.system }] },
    contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
    generationConfig: {
      temperature: TEMPERATURE,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  };
  let lastErr = '';
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    await pacer.wait();
    let res: Response;
    try {
      res = await fetch(`${cfg.baseUrl}/${cfg.model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cfg.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      lastErr = `mạng/timeout: ${(err as Error).message}`;
      await sleep(15_000);
      continue;
    }
    const data = (await res.json().catch(() => null)) as {
      candidates?: {
        content?: { parts?: { text?: string }[] };
        finishReason?: string;
      }[];
      error?: { message?: string };
    } | null;
    if (!res.ok) {
      lastErr = `HTTP ${res.status}: ${data?.error?.message ?? 'không rõ'}`;
      // 429 (hết quota/phút) và 5xx (quá tải) là lỗi tạm thời: chờ đúng thời gian Google yêu cầu.
      // Lỗi khác (key sai, model không có) thì dừng ngay.
      const wait = retryWaitMs(res.status, data, attempt + 1, RETRIES);
      if (wait === null) throw new Error(lastErr);
      console.log(
        `    … ${lastErr.slice(0, 60)}… chờ ${Math.round(wait / 1000)} s rồi thử lại`,
      );
      await sleep(wait);
      continue;
    }
    const cand = data?.candidates?.[0];
    const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) {
      lastErr = `không có nội dung (finishReason ${cand?.finishReason ?? '?'})`;
      continue;
    }
    return text;
  }
  throw new Error(lastErr);
}

/** Chạy `fn` trên từng phần tử với tối đa `limit` lượt song song, giữ đúng thứ tự kết quả. */
async function mapLimit<T, R>(
  xs: T[],
  limit: number,
  fn: (x: T, i: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(xs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, xs.length) }, async () => {
      while (next < xs.length) {
        const i = next++;
        out[i] = await fn(xs[i], i);
      }
    }),
  );
  return out;
}

// ---------- báo cáo ----------
function buildReport(
  chunks: LessonChunk[],
  calls: number,
  accepted: AcceptedItem[],
  rejected: RejectedItem[],
  errors: { lesson_code: string; message: string }[],
) {
  const generated = accepted.length + rejected.length;
  const byRule: Partial<Record<RuleCode, number>> = {};
  for (const r of rejected)
    for (const f of r.failures) byRule[f.code] = (byRule[f.code] ?? 0) + 1;
  const byModule: Record<
    string,
    { lessons: number; accepted: number; rejected: number }
  > = {};
  for (const c of chunks) {
    byModule[c.module_code] ??= { lessons: 0, accepted: 0, rejected: 0 };
    byModule[c.module_code].lessons++;
  }
  const moduleOf = new Map(chunks.map((c) => [c.lesson_code, c.module_code]));
  for (const a of accepted) byModule[a.module_code].accepted++;
  for (const r of rejected)
    byModule[moduleOf.get(r.lesson_code) ?? '?'].rejected++;
  return {
    lessons: chunks.length,
    api_calls: calls,
    failed_lessons: errors.length,
    generated,
    accepted: accepted.length,
    rejected: rejected.length,
    pass_rate: generated ? +(accepted.length / generated).toFixed(3) : 0,
    accepted_per_call: calls ? +(accepted.length / calls).toFixed(2) : 0,
    rejected_by_rule: byRule,
    by_module: byModule,
  };
}

function printReport(run: RunFile) {
  const r = run.report;
  console.log(
    `\n== Báo cáo (${run.meta.prompt_version}, ${run.meta.model}, t=${run.meta.temperature}, few-shot ${run.meta.few_shot})`,
  );
  console.log(
    `Bài: ${r.lessons} · lượt gọi API: ${r.api_calls} · bài lỗi: ${r.failed_lessons}`,
  );
  console.log(
    `Sinh ra: ${r.generated} · qua lọc A: ${r.accepted} (${(r.pass_rate * 100).toFixed(1)}%) · bị loại: ${r.rejected}`,
  );
  console.log(`Năng suất: ${r.accepted_per_call} câu đạt / lượt gọi`);
  console.log(
    'Loại theo luật (một câu có thể trượt nhiều luật):',
    JSON.stringify(r.rejected_by_rule),
  );
  for (const [m, v] of Object.entries(r.by_module)) {
    console.log(
      `  ${m}: ${v.lessons} bài, đạt ${v.accepted}, loại ${v.rejected}`,
    );
  }
  for (const e of run.errors) console.log(`  ! ${e.lesson_code}: ${e.message}`);
}

// ---------- sinh ----------
async function generate(): Promise<RunFile> {
  if (!cfg.apiKey) throw new Error('Thiếu GEMINI_API_KEY trong .env');
  const started = new Date().toISOString();
  const template = readFileSync(
    join(__dirname, 'prompts', `${PROMPT_VERSION}.md`),
    'utf8',
  );
  const { chunks: all, errors: loadErrors } = loadLessonDir(
    LESSON_DIR,
    COURSE_ID,
  );
  if (loadErrors.length)
    throw new Error(`Gói bài lỗi:\n  ${loadErrors.join('\n  ')}`);
  const chunks = CODES ? all.filter((c) => CODES.includes(c.lesson_code)) : all;
  const unknown = (CODES ?? []).filter(
    (c) => !all.some((x) => x.lesson_code === c),
  );
  if (unknown.length)
    throw new Error(`Mã bài không có trong gói: ${unknown.join(', ')}`);

  console.log(
    `Sinh ${PER_LESSON} câu × ${chunks.length} bài, ${cfg.model}, ${CONCURRENCY} lượt song song…`,
  );
  const raws = await mapLimit(chunks, CONCURRENCY, async (chunk) => {
    const prompt = buildMcqPrompt(
      template,
      chunk,
      pickFewShot(all, chunk, FEW_SHOT),
      PER_LESSON,
    );
    try {
      const text = await callGemini(prompt);
      const qs = extractQuestions(text);
      console.log(`  ${chunk.lesson_code}: ${qs.length} câu`);
      return { chunk, qs };
    } catch (err) {
      console.log(`  ${chunk.lesson_code}: LỖI ${(err as Error).message}`);
      return { chunk, error: (err as Error).message };
    }
  });

  // Lọc TUẦN TỰ theo thứ tự bài (sau khi đã sinh song song) để kết quả kiểm trùng tất định.
  // Kho so trùng gồm 146 câu step_2.mcq của MỌI bài + câu đã nhận trong lượt này.
  const dedup = new DedupIndex();
  for (const c of all)
    c.existing_mcq.forEach((m, i) =>
      dedup.add(m, `${c.lesson_code}#${i} (giáo trình)`),
    );

  const accepted: AcceptedItem[] = [];
  const rejected: RejectedItem[] = [];
  const errors: { lesson_code: string; message: string }[] = [];
  for (const r of raws) {
    if ('error' in r && r.error) {
      errors.push({ lesson_code: r.chunk.lesson_code, message: r.error });
      continue;
    }
    for (const [i, raw] of (r.qs ?? []).entries()) {
      const out = runMcqFilters(raw, {
        moduleCode: r.chunk.module_code,
        concepts: r.chunk.concepts,
        dedup,
      });
      if (!out.ok || !out.mcq) {
        rejected.push({
          lesson_code: r.chunk.lesson_code,
          failures: out.failures,
          raw,
        });
        continue;
      }
      const payload = cleanMcq(out.mcq);
      const hash = contentHash(payload);
      dedup.add(payload, `${r.chunk.lesson_code} gen#${i}`, hash);
      accepted.push({
        lesson_code: r.chunk.lesson_code,
        module_code: r.chunk.module_code,
        concepts: conceptsOf(raw, r.chunk),
        difficulty: difficultyOf(raw),
        content_hash: hash,
        payload,
      });
    }
  }

  return {
    meta: {
      course_id: COURSE_ID,
      prompt_version: PROMPT_VERSION,
      model: cfg.model,
      temperature: TEMPERATURE,
      few_shot: FEW_SHOT,
      per_lesson: PER_LESSON,
      started_at: started,
      finished_at: new Date().toISOString(),
    },
    report: buildReport(chunks, chunks.length, accepted, rejected, errors),
    accepted,
    rejected,
    errors,
  };
}

// ---------- ghi DB ----------
async function applyRun(run: RunFile) {
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
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: url }),
  });
  try {
    const before = await prisma.questionBank.count({
      where: { courseId: run.meta.course_id, type: 'mcq' },
    });
    const res = await prisma.questionBank.createMany({
      data: run.accepted.map((a) => ({
        courseId: run.meta.course_id,
        lessonCode: a.lesson_code,
        moduleCode: a.module_code,
        type: 'mcq',
        payload: a.payload as object,
        meta: {
          concepts: a.concepts,
          model: run.meta.model,
          temperature: run.meta.temperature,
        },
        difficulty: a.difficulty,
        status: 'draft',
        source: 'gen',
        promptVersion: run.meta.prompt_version,
        contentHash: a.content_hash,
      })),
      skipDuplicates: true,
    });
    const after = await prisma.questionBank.groupBy({
      by: ['status'],
      where: { courseId: run.meta.course_id, type: 'mcq' },
      _count: { _all: true },
    });
    console.log(
      `\n✓ Ghi ${res.count}/${run.accepted.length} câu (${run.accepted.length - res.count} đã có, bỏ qua).`,
    );
    console.log(
      `question_bank ${run.meta.course_id}/mcq: ${before} → ${after.map((g) => `${g.status} ${g._count._all}`).join(', ') || '0'}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  if (FROM && !APPLY) throw new Error('--from chỉ dùng kèm --apply.');
  let run: RunFile;
  if (FROM) {
    run = JSON.parse(readFileSync(FROM, 'utf8')) as RunFile;
    console.log(`Dùng lại kết quả ${FROM} (không gọi Gemini).`);
  } else {
    run = await generate();
    mkdirSync(OUT_DIR, { recursive: true });
    const file = join(
      OUT_DIR,
      `mcq-${run.meta.started_at.replace(/[:.]/g, '-')}.json`,
    );
    writeFileSync(file, JSON.stringify(run, null, 1));
    console.log(`\nĐã ghi ${relative(process.cwd(), file)}`);
  }
  printReport(run);
  if (!APPLY) {
    console.log(
      '\nCHẠY THỬ: chưa ghi DB. Xem file trên rồi chạy lại với --apply --expected-host=<host> --from=<file>.',
    );
    return;
  }
  await applyRun(run);
}

main().catch((err: Error) => {
  console.error(`\nDừng: ${err.message}`);
  process.exitCode = 1;
});
