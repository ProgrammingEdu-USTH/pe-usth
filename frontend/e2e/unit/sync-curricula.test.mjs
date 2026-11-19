/**
 * Unit test cho script tham số hoá `scripts/sync_curricula.py` (cùng 2 wrapper pe-da và pe-v4).
 *
 * Bảo đảm:
 *  1. Chế độ `--check` khớp 100% giữa gói Python thật (179 bài `scripts/pe-da/out`)
 *     với `curricula.json` và `catalog.ts`.
 *  2. Chạy `scripts/pe-v4/sync_curricula.py` (48 bài `play.games`) vào bản sao tạm:
 *     `LESSON_META` khớp từng khoá màn với `buildScreens()`, `catalog.ts` tự tính `48` và `'~29 giờ'`.
 *  3. Chạy trên gói mẫu nhỏ (`scripts/fixtures/sample-course`, không có file `curriculum*.json` riêng)
 *     vào bản sao tạm: tự dựng 2 chặng / 3 bài, `LESSON_META` khớp `buildScreens()` trên đủ mọi loại màn,
 *     tự thêm mục mới vào `catalog.ts` đúng chuẩn thụt lề 4 khoảng trắng, không xoá `python_advanced`
 *     hay `db_design`, và chạy lại cho kết quả bất biến (`--check` exit 0).
 *  4. Truyền thẳng file `lessons.json` với `--course` và `--title` vẫn hoạt động.
 *  5. Chặn gói bài thiếu `estimated_minutes` hoặc nhảy cóc `sort_order` với mã thoát khác 0.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildScreens } from '../../src/lib/studio-lesson.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const ROOT = join(FE, '..');

const PYTHON = spawnSync('python3', ['--version'], { encoding: 'utf8' }).status === 0 ? 'python3' : 'python';
const MAIN_SCRIPT = join(ROOT, 'scripts', 'sync_curricula.py');
const V4_SCRIPT = join(ROOT, 'scripts', 'pe-v4', 'sync_curricula.py');
const DA_SCRIPT = join(ROOT, 'scripts', 'pe-da', 'sync_curricula.py');
const REAL_CURRICULA = join(FE, 'src', 'lib', 'curricula.json');
const REAL_CATALOG = join(FE, 'src', 'lib', 'catalog.ts');
const SAMPLE_DIR = join(ROOT, 'scripts', 'fixtures', 'sample-course');
const V4_BUNDLE = join(ROOT, 'scripts', 'pe-v4', 'out-advanced', 'lessons.json');

function runPy(script, args) {
  return spawnSync(PYTHON, [script, ...args], { cwd: ROOT, encoding: 'utf8' });
}

function withTempTargets(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'sync-curricula-'));
  try {
    const target = join(dir, 'curricula.json');
    const catalog = join(dir, 'catalog.ts');
    copyFileSync(REAL_CURRICULA, target);
    copyFileSync(REAL_CATALOG, catalog);
    return fn({ dir, target, catalog });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('gói Python thật (179 bài pe-da) khớp --check trên curricula.json và catalog.ts', () => {
  const res1 = runPy(MAIN_SCRIPT, ['--bundle', 'scripts/pe-da/out', '--course', 'python_advanced', '--check']);
  assert.equal(res1.status, 0, res1.stderr || res1.stdout);

  const res2 = runPy(DA_SCRIPT, ['--check']);
  assert.equal(res2.status, 0, res2.stderr || res2.stdout);
});

test('scripts/pe-v4/sync_curricula.py chạy trên 48 bài play.games: khớp buildScreens và tự tính 48 bài / ~29 giờ', () => {
  withTempTargets(({ target, catalog }) => {
    const res = runPy(V4_SCRIPT, ['--target', target, '--catalog', catalog]);
    assert.equal(res.status, 0, res.stderr || res.stdout);

    const curricula = JSON.parse(readFileSync(target, 'utf8'));
    const bundle = JSON.parse(readFileSync(V4_BUNDLE, 'utf8')).lessons.sort((a, b) => a.sort_order - b.sort_order);
    const meta = curricula.LESSON_META.python_advanced;
    assert.equal(meta.length, 48);
    assert.equal(curricula.CURRICULA.python_advanced.modules.length, 8);
    assert.ok(curricula.CURRICULA.db_design, 'không được làm mất db_design');

    bundle.forEach((row, i) => {
      const want = buildScreens(row.content_json).map((s) => [s.key, s.kind === 'game' ? s.gameType : s.kind]);
      assert.deepEqual(meta[i].screens, want, `Lệch ở ${row.lesson_code}`);
    });

    const catSrc = readFileSync(catalog, 'utf8');
    assert.match(catSrc, /lessons:\s*lessonCount\('python_advanced',\s*48\)/);
    assert.match(catSrc, /duration:\s*'~29 giờ'/);
    assert.match(catSrc, /subtitle:\s*'48 bài: từ phép cộng đầu tiên tới phân tích dữ liệu'/);
  });
});

test('gói mẫu nhỏ (SQL): tự gom chặng, đồng bộ mọi loại màn, giữ khoá khác và bất biến', () => {
  withTempTargets(({ target, catalog }) => {
    const res = runPy(MAIN_SCRIPT, [
      '--bundle',
      SAMPLE_DIR,
      '--course',
      'sample_sql',
      '--target',
      target,
      '--catalog',
      catalog,
    ]);
    assert.equal(res.status, 0, res.stderr || res.stdout);

    const curricula = JSON.parse(readFileSync(target, 'utf8'));
    assert.equal(curricula.CURRICULA.python_advanced.modules.length, 11, 'phải giữ nguyên python_advanced');
    assert.equal(curricula.CURRICULA.db_design.modules.length, 3, 'phải giữ nguyên db_design');

    const sqlCur = curricula.CURRICULA.sample_sql;
    assert.ok(sqlCur, 'phải thêm CURRICULA.sample_sql');
    assert.equal(sqlCur.modules.length, 2);
    assert.equal(sqlCur.modules[0].title, 'M1 · Truy vấn cơ bản');
    assert.equal(sqlCur.modules[1].title, 'M2 · Tổng hợp dữ liệu');
    assert.equal(sqlCur.modules.reduce((n, m) => n + m.lessons.length, 0), 3);
    assert.deepEqual(sqlCur.stats, { practice: 1, graded: 1 });
    assert.equal(curricula.LESSON_URLS.sample_sql, '/lesson/sample_sql');

    const sampleLessons = JSON.parse(readFileSync(join(SAMPLE_DIR, 'lessons.json'), 'utf8')).lessons;
    const sqlMeta = curricula.LESSON_META.sample_sql;
    assert.equal(sqlMeta.length, 3);
    sampleLessons.forEach((row, i) => {
      const want = buildScreens(row.content_json).map((s) => [s.key, s.kind === 'game' ? s.gameType : s.kind]);
      assert.deepEqual(sqlMeta[i].screens, want, `Lệch ở ${row.lesson_code}`);
    });
    // Xác minh ca đặc biệt: câu MCQ số 1 có <2 lựa chọn bị bỏ qua, câu số 2 giữ nguyên key s2-mcq-2.
    assert.deepEqual(
      sqlMeta[0].screens.filter(([, kind]) => kind === 'mcq').map(([key]) => key),
      ['s2-mcq-0', 's2-mcq-2'],
    );

    const catSrc = readFileSync(catalog, 'utf8');
    const ids = [...catSrc.matchAll(/^\s{4}id: '([^']+)',/gm)].map((m) => m[1]);
    assert.deepEqual(ids, ['python_advanced', 'sample_sql']);

    const sqlEntry = catSrc.slice(catSrc.indexOf("id: 'sample_sql'"));
    assert.match(sqlEntry, /title:\s*'SQL thực hành \(mẫu\)'/);
    assert.match(sqlEntry, /lessons:\s*lessonCount\('sample_sql',\s*3\)/);
    assert.match(sqlEntry, /duration:\s*'~1 giờ'/);

    // Chạy --check phải thoát 0; chạy ghi lần 2 không đổi byte nào.
    const checkRes = runPy(MAIN_SCRIPT, [
      '--bundle',
      SAMPLE_DIR,
      '--course',
      'sample_sql',
      '--target',
      target,
      '--catalog',
      catalog,
      '--check',
    ]);
    assert.equal(checkRes.status, 0, checkRes.stderr || checkRes.stdout);

    const beforeBytes = [readFileSync(target, 'utf8'), readFileSync(catalog, 'utf8')];
    const secondRun = runPy(MAIN_SCRIPT, [
      '--bundle',
      SAMPLE_DIR,
      '--course',
      'sample_sql',
      '--target',
      target,
      '--catalog',
      catalog,
    ]);
    assert.equal(secondRun.status, 0, secondRun.stderr || secondRun.stdout);
    assert.deepEqual([readFileSync(target, 'utf8'), readFileSync(catalog, 'utf8')], beforeBytes);
  });
});

test('nhận đường dẫn thẳng tới file lessons.json với --course và --title mới', () => {
  withTempTargets(({ target, catalog }) => {
    const res = runPy(MAIN_SCRIPT, [
      '--bundle',
      join(SAMPLE_DIR, 'lessons.json'),
      '--course',
      'custom_ml',
      '--title',
      'Machine Learning cơ bản',
      '--target',
      target,
      '--catalog',
      catalog,
    ]);
    assert.equal(res.status, 0, res.stderr || res.stdout);

    const curricula = JSON.parse(readFileSync(target, 'utf8'));
    assert.equal(curricula.LESSON_URLS.custom_ml, '/lesson/custom_ml');
    assert.equal(curricula.LESSON_META.custom_ml.length, 3);

    const catSrc = readFileSync(catalog, 'utf8');
    const mlEntry = catSrc.slice(catSrc.indexOf("id: 'custom_ml'"));
    assert.match(mlEntry, /title:\s*'Machine Learning cơ bản'/);
    assert.match(mlEntry, /lessons:\s*lessonCount\('custom_ml',\s*3\)/);
    assert.match(mlEntry, /duration:\s*'~1 giờ'/);
  });
});

test('từ chối gói thiếu estimated_minutes hoặc nhảy cóc sort_order', () => {
  withTempTargets(({ dir, target, catalog }) => {
    const srcLessons = JSON.parse(readFileSync(join(SAMPLE_DIR, 'lessons.json'), 'utf8'));

    const missingMinPath = join(dir, 'bad-minutes.json');
    const badMin = structuredClone(srcLessons);
    delete badMin.lessons[0].estimated_minutes;
    writeFileSync(missingMinPath, JSON.stringify(badMin), 'utf8');
    const r1 = runPy(MAIN_SCRIPT, ['--bundle', missingMinPath, '--course', 'bad_ml', '--target', target, '--catalog', catalog]);
    assert.notEqual(r1.status, 0, 'thiếu estimated_minutes phải thất bại');

    const badOrderPath = join(dir, 'bad-order.json');
    const badOrder = structuredClone(srcLessons);
    badOrder.lessons[1].sort_order = 5;
    writeFileSync(badOrderPath, JSON.stringify(badOrder), 'utf8');
    const r2 = runPy(MAIN_SCRIPT, ['--bundle', badOrderPath, '--course', 'bad_ml', '--target', target, '--catalog', catalog]);
    assert.notEqual(r2.status, 0, 'nhảy cóc sort_order phải thất bại');
  });
});
