/**
 * Unit test cho trang bài học LofiWorkspace (179 bài `pe-da`), Auto-Enroll 403
 * (cho cả Python lẫn SQL) và tương thích ngược `pe-v4`.
 *
 * Chạy: cd frontend && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test e2e/unit/lofi-lesson.test.mjs
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildBookSpreads,
  isBookPageNonEmpty,
} from '../../src/lib/lofi-book-spreads.ts';
import {
  completeLessonWithAutoEnroll,
  ensureCourseEnrolled,
  loadLessonContentWithAutoEnroll,
} from '../../src/lib/lofi-lesson-loader.ts';
import { READ_BLOCK_TYPES, tachDeVaCode } from '../../src/lib/studio-lesson.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const PE_DA_PATH = join(FE, '..', 'scripts', 'pe-da', 'out', 'lessons.json');

const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/[ \t]+\/\/.*$/gm, '');

const jsonRes = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

test('loadLessonContentWithAutoEnroll: gặp 403 -> tự gọi POST /enroll -> retry GET /content thành công', async () => {
  const calls = [];
  let enrolled = false;

  const mockFetcher = async (path, init) => {
    calls.push(`${init?.method ?? 'GET'} ${path}`);
    if (path === '/api/courses/python_advanced/enroll' && init?.method === 'POST') {
      enrolled = true;
      return jsonRes(200, { ok: true, progress: 0 });
    }
    if (path === '/api/courses/python_advanced/lessons/1/content') {
      if (!enrolled) {
        return jsonRes(403, { message: 'Bạn chưa đăng ký khóa học này' });
      }
      return jsonRes(200, {
        ok: true,
        lesson: { contentJson: { title: 'PY01', step_1: { read: [[{ type: 'paragraph', text: 'Xin chào' }]] } } },
        completed: true,
      });
    }
    return jsonRes(404, {});
  };

  const res = await loadLessonContentWithAutoEnroll('python_advanced', 1, mockFetcher);
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.autoEnrolled, true);
    assert.equal(res.completed, true);
    assert.equal(res.lesson.title, 'PY01');
  }
  assert.deepEqual(calls, [
    'GET /api/courses/python_advanced/lessons/1/content',
    'POST /api/courses/python_advanced/enroll',
    'GET /api/courses/python_advanced/lessons/1/content',
  ]);
});

test('loadLessonContentWithAutoEnroll: phân loại rõ lỗi 401/403/404/500 và lỗi mạng không vòng lặp', async () => {
  const callCounts = { c404: 0, c401: 0, c500: 0, c403loop: 0 };

  const res404 = await loadLessonContentWithAutoEnroll('python_advanced', 999, async (path) => {
    callCounts.c404 += 1;
    assert.equal(path.includes('/enroll'), false, '404 không được gọi enroll');
    return jsonRes(404, { message: 'Không tìm thấy bài học' });
  });
  assert.equal(res404.ok, false);
  if (!res404.ok) {
    assert.equal(res404.kind, 'not_found');
    assert.equal(res404.status, 404);
  }
  assert.equal(callCounts.c404, 1);

  const res401 = await loadLessonContentWithAutoEnroll('python_advanced', 1, async () => {
    callCounts.c401 += 1;
    return jsonRes(401, {});
  });
  assert.equal(res401.ok, false);
  if (!res401.ok) assert.equal(res401.kind, 'unauthorized');
  assert.equal(callCounts.c401, 1);

  const res500 = await loadLessonContentWithAutoEnroll('python_advanced', 1, async () => {
    callCounts.c500 += 1;
    return jsonRes(500, {});
  });
  assert.equal(res500.ok, false);
  if (!res500.ok) assert.equal(res500.kind, 'server');
  assert.equal(callCounts.c500, 1);

  const resNet = await loadLessonContentWithAutoEnroll('python_advanced', 1, async () => {
    throw new TypeError('Failed to fetch');
  });
  assert.equal(resNet.ok, false);
  if (!resNet.ok) {
    assert.equal(resNet.kind, 'network');
    assert.equal(resNet.status, null);
    assert.match(resNet.message, /cổng 5000/i);
  }

  // Nếu cả enroll cũng bị 403 (ví dụ khoá chưa publish) thì không lặp vô hạn
  const res403Fail = await loadLessonContentWithAutoEnroll('draft_course', 1, async () => {
    callCounts.c403loop += 1;
    return jsonRes(403, { message: 'Khoá học này chưa được phát hành' });
  });
  assert.equal(res403Fail.ok, false);
  if (!res403Fail.ok) assert.equal(res403Fail.kind, 'forbidden');
  assert.equal(callCounts.c403loop, 2); // 1 GET + 1 POST enroll
});

test('ensureCourseEnrolled dedupe các lời gọi đồng thời cùng courseId', async () => {
  let hits = 0;
  const fetcher = async () => {
    hits += 1;
    await new Promise((r) => setTimeout(r, 15));
    return jsonRes(200, { ok: true });
  };

  const [a, b, c] = await Promise.all([
    ensureCourseEnrolled('db_design', fetcher),
    ensureCourseEnrolled('db_design', fetcher),
    ensureCourseEnrolled('db_design', fetcher),
  ]);
  assert.equal(a, true);
  assert.equal(b, true);
  assert.equal(c, true);
  assert.equal(hits, 1);
});

test('completeLessonWithAutoEnroll: gặp 403 -> tự enroll -> retry POST /complete thành công', async () => {
  let enrolled = false;
  const calls = [];
  const fetcher = async (path, init) => {
    calls.push(`${init?.method ?? 'GET'} ${path}`);
    if (path === '/api/courses/python_advanced/enroll') {
      enrolled = true;
      return jsonRes(200, { ok: true });
    }
    if (path === '/api/lessons/5/complete') {
      if (!enrolled) return jsonRes(403, { message: 'Bạn cần đăng ký khoá học' });
      return jsonRes(200, { ok: true, xpGained: 20 });
    }
    return jsonRes(404, {});
  };

  const res = await completeLessonWithAutoEnroll(
    'python_advanced',
    5,
    { lessonTitle: 'PY05', xpEarned: 20, quizScore: 100 },
    fetcher,
  );
  assert.equal(res.ok, true);
  assert.equal(res.autoEnrolled, true);
  assert.equal(res.data?.xpGained, 20);
  assert.deepEqual(calls, [
    'POST /api/lessons/5/complete',
    'POST /api/courses/python_advanced/enroll',
    'POST /api/lessons/5/complete',
  ]);
});

const hasPeDa = existsSync(PE_DA_PATH);

test(
  'buildBookSpreads: 179/179 bài pe-da đều sinh 4–6 cặp trang, 0 trang rỗng, đủ 6 loại ReadBlock + 23 bài procedure',
  { skip: hasPeDa ? false : 'Thiếu scripts/pe-da/out/lessons.json' },
  () => {
    const lessons = JSON.parse(readFileSync(PE_DA_PATH, 'utf8')).lessons;
    assert.equal(lessons.length, 179);

    const seenBlockTypes = new Set();
    let totalReadBlocksInInput = 0;
    let totalReadBlocksRendered = 0;
    let totalMcqInInput = 0;
    let expectedMcqWithCode = 0;
    let totalMcqRendered = 0;
    let mcqWithCodeRendered = 0;
    let totalPracticeRendered = 0;
    let procedureLessonsRendered = 0;

    for (const row of lessons) {
      const lesson = row.content_json;
      const inputBlocks = (lesson.step_1?.read ?? []).reduce((s, sl) => s + sl.length, 0);
      totalReadBlocksInInput += inputBlocks;
      for (const q of lesson.step_2?.mcq ?? []) {
        totalMcqInInput += 1;
        if (tachDeVaCode(q.question).code) expectedMcqWithCode += 1;
      }

      const spreads = buildBookSpreads(lesson, tachDeVaCode);
      assert.ok(
        spreads.length >= 4 && spreads.length <= 6,
        `${row.lesson_code}: số cặp trang phải nằm trong 4..6 (hiện là ${spreads.length})`,
      );

      let lessonPracticeCount = 0;
      let lessonHasProcedure = false;

      for (const sp of spreads) {
        assert.equal(isBookPageNonEmpty(sp.left), true, `${row.lesson_code} ${sp.id} trang trái rỗng`);
        assert.equal(isBookPageNonEmpty(sp.right), true, `${row.lesson_code} ${sp.id} trang phải rỗng`);

        for (const page of [sp.left, sp.right]) {
          if (page.kind === 'read-slice') {
            totalReadBlocksRendered += page.blocks.length;
            for (const b of page.blocks) {
              seenBlockTypes.add(b.block.type);
            }
          } else if (page.kind === 'mcq-page') {
            totalMcqRendered += page.items.length;
            for (const m of page.items) {
              if (m.code) mcqWithCodeRendered += 1;
            }
          } else if (page.kind === 'practice-page') {
            lessonPracticeCount += page.items.length;
          } else if (page.kind === 'challenge-spec' && page.extraPractice) {
            lessonPracticeCount += page.extraPractice.length;
          } else if (page.kind === 'challenge-action' && page.step4.procedure?.length) {
            lessonHasProcedure = true;
          }
        }
      }

      totalPracticeRendered += lessonPracticeCount;
      assert.equal(
        lessonPracticeCount,
        lesson.step_2?.practice?.length ?? 0,
        `${row.lesson_code}: thiếu câu tự luyện khi chia trang`,
      );

      if (lesson.step_4?.procedure?.length) {
        assert.equal(lessonHasProcedure, true, `${row.lesson_code}: mất step_4.procedure`);
        procedureLessonsRendered += 1;
      }
    }

    assert.equal(totalReadBlocksRendered, totalReadBlocksInInput);
    for (const t of READ_BLOCK_TYPES) {
      assert.equal(seenBlockTypes.has(t), true, `Thiếu loại ReadBlock: ${t}`);
    }
    assert.equal(totalMcqRendered, totalMcqInInput);
    assert.ok(expectedMcqWithCode > 100);
    assert.equal(mcqWithCodeRendered, expectedMcqWithCode);
    assert.ok(totalPracticeRendered > 600);
    assert.equal(procedureLessonsRendered, 23);
  },
);

test('buildBookSpreads: tương thích ngược bài pe-v4 không có step_1.read (3 cặp trang legacy)', () => {
  const legacy = {
    schema: 'studio-lesson/v1',
    title: 'B01 · Legacy',
    step_1: {
      theory: [{ title: 'Khái niệm 1', body: 'Nội dung' }],
    },
    step_2: { mcq: [] },
    step_4: { task: { title: 'Bài tập', body: 'Viết hàm' } },
  };
  const spreads = buildBookSpreads(legacy, tachDeVaCode);
  assert.equal(spreads.length, 3);
  assert.equal(spreads[0].left.kind, 'legacy');
  assert.equal(spreads[2].right.kind, 'legacy');
});

test('LofiWorkspace.tsx nối đúng loader, spreads, auto-enroll và không còn cứng /48', () => {
  const lofiSrc = stripComments(
    readFileSync(join(FE, 'src', 'components', 'goc-hoc', 'LofiWorkspace.tsx'), 'utf8'),
  );
  assert.match(lofiSrc, /loadLessonContentWithAutoEnroll/);
  assert.match(lofiSrc, /completeLessonWithAutoEnroll/);
  assert.match(lofiSrc, /buildBookSpreads/);
  assert.equal(/\/48\b/.test(lofiSrc), false, 'LofiWorkspace.tsx không được hard-code /48');

});
