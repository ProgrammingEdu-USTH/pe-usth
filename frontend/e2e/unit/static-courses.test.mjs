// Ba khoá đóng gói thành tệp tĩnh: bản dựng phải khớp danh mục, đọc được bằng
// màn bài học, và không đường nào của chúng được chạm tới backend.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { richTokens, withoutRichMarks } from '../../src/lib/rich-tokens.ts';
import {
  doneKey,
  isStaticCourse,
  lessonBundleUrl,
  LOCAL_LEARNER,
  markDone,
  readDone,
  STATIC_COURSES,
} from '../../src/lib/static-courses.ts';
import { buildScreens, keyIdeas, READ_BLOCK_TYPES } from '../../src/lib/studio-lesson.ts';

const root = new URL('../../', import.meta.url);
const text = (path) => readFileSync(new URL(path, root), 'utf8');
const catalog = JSON.parse(text('src/lib/doc-courses.json'));
const bundle = (course, no) => JSON.parse(text(`public${lessonBundleUrl(course, no)}`));
const everyLesson = Object.keys(STATIC_COURSES).flatMap((course) =>
  catalog[course].modules.flatMap((m) => m.lessons.map((row) => ({ course, row }))),
);

test('danh mục và tệp bài khớp nhau, đánh số liền từ 1', () => {
  assert.deepEqual(Object.keys(catalog).sort(), Object.keys(STATIC_COURSES).sort());
  for (const course of Object.keys(STATIC_COURSES)) {
    const numbers = catalog[course].modules.flatMap((m) => m.lessons.map((l) => l.no));
    assert.equal(numbers.length, catalog[course].lessons, course);
    assert.deepEqual(
      numbers,
      numbers.map((_, i) => i + 1),
      `${course}: kệ sách dựng link bằng no - 1 nên số phải liền`,
    );
    const files = readdirSync(new URL(`public/static/courses/${course}/lessons/`, root));
    assert.equal(files.length, numbers.length, `${course}: thừa hoặc thiếu tệp bài`);
  }
});

test('mọi bài dựng được màn, chỉ dùng loại khối renderer biết', () => {
  for (const { course, row } of everyLesson) {
    const data = bundle(course, row.no);
    assert.equal(data.code, row.code);
    assert.equal(data.title, row.title);
    assert.ok(buildScreens(data.contentJson).length >= 3, `${course} ${row.code} quá ít màn`);
    for (const slice of data.contentJson.step_1?.read ?? []) {
      assert.ok(slice.length, `${course} ${row.code}: màn đọc rỗng`);
      assert.ok(!slice.at(-1).heading, `${course} ${row.code}: tiêu đề đứng cuối trang`);
      for (const block of slice)
        assert.ok(READ_BLOCK_TYPES.includes(block.type), `${course} ${row.code}: ${block.type}`);
    }
  }
});

test('hình và liên kết nội bộ trong bài đều trỏ tới thứ có thật', () => {
  let checked = 0;
  for (const { course, row } of everyLesson) {
    const raw = text(`public${lessonBundleUrl(course, row.no)}`);
    for (const [, href] of raw.matchAll(/\]\((\/[^)\s"]+)\)|"src":"(\/[^"]+)"/g).map((m) => [m[0], m[1] ?? m[2]])) {
      const lesson = /^\/lesson\/(\w+)\?lesson=(\d+)$/.exec(href);
      if (lesson) {
        assert.ok(Number(lesson[2]) < catalog[lesson[1]].lessons, `${row.code}: ${href}`);
      } else {
        assert.ok(existsSync(new URL(`public${href}`, root)), `${row.code}: ${href}`);
      }
      checked += 1;
    }
  }
  assert.ok(checked > 50, `chỉ kiểm được ${checked} liên kết`);
});

test('ý chính của bài đọc tĩnh không phải là các tiêu đề trang', () => {
  const ideas = keyIdeas(bundle('database', 12).contentJson.step_1.read);
  assert.ok(ideas.length > 0);
  assert.ok(!ideas.some((idea) => /\(tiếp\)$/.test(idea)));
  assert.deepEqual(keyIdeas([[{ type: 'paragraph', text: 'đầu' }, { type: 'paragraph', text: 'sau' }]]), ['đầu']);
});

test('Markdown nội tuyến: đậm, mã, liên kết; địa chỉ lạ chỉ còn chữ', () => {
  assert.deepEqual(richTokens('a **b `c`** [d](/x)'), [
    { type: 'text', text: 'a ' },
    { type: 'bold', children: [{ type: 'text', text: 'b ' }, { type: 'code', text: 'c' }] },
    { type: 'text', text: ' ' },
    { type: 'link', href: '/x', children: [{ type: 'text', text: 'd' }] },
  ]);
  for (const href of ['javascript:alert(1)', '//evil.example/x', 'data:text/html,x', 'JaVaScRiPt:x'])
    assert.ok(!richTokens(`[bấm](${href})`).some((t) => t.type === 'link'), href);
  assert.deepEqual(richTokens('`x**2` và `[a](b)`').map((t) => t.type), ['code', 'text', 'code']);
  assert.equal(withoutRichMarks('**Chặng:** [d](https://x.example) `e`'), 'Chặng: d `e`');
});

test('tiến độ trên máy: chịu được dữ liệu hỏng và trình duyệt cấm ghi', () => {
  const memory = new Map();
  const store = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => void memory.set(k, v) };
  assert.deepEqual(readDone('database', store), []);
  memory.set(doneKey('database'), '{hỏng');
  assert.deepEqual(readDone('database', store), []);
  memory.set(doneKey('database'), '[3,"4",-1,0,1.5,3,2]');
  assert.deepEqual(readDone('database', store), [2, 3]);
  assert.equal(markDone('database', 1, store), true);
  assert.deepEqual(readDone('database', store), [1, 2, 3]);
  assert.deepEqual(readDone('database_advanced', store), []);
  const readOnly = { getItem: () => null, setItem: () => { throw new Error('đầy'); } };
  assert.equal(markDone('database', 1, readOnly), false);
  assert.equal(markDone('database', 1, null), false);
  assert.ok(LOCAL_LEARNER, 'chủ nháp bằng 0 thì useLessonDraft không lưu');
  assert.equal(isStaticCourse('python_advanced'), false);
  assert.equal(isStaticCourse('constructor'), false);
});

test('nhánh tĩnh rời đi TRƯỚC mọi lượt gọi API và trước khi mở cổng ghi sự kiện', () => {
  const hook = text('src/components/python-studio/useLessonData.ts');
  const load = hook.slice(hook.indexOf('const load = useCallback'));
  const branch = load.indexOf('if (isStaticCourse(courseId))');
  assert.ok(branch > 0);
  for (const call of ["json('/api/user')", 'napTrangThaiDongY()', 'datBoiCanhBai({'])
    assert.ok(load.indexOf(call) > branch, `${call} đứng trước nhánh tĩnh`);
  assert.match(load.slice(branch, load.indexOf("json('/api/user')")), /return;\s*}/);
  const complete = hook.slice(hook.indexOf('const complete = useCallback'));
  assert.ok(complete.indexOf('markDone(courseId, lessonNo)') < complete.indexOf('/complete`'));
  assert.match(text('src/components/python-studio/screens/RecapScreen.tsx'), /local \? undefined : quiz/);
});

test('trang tương tác ML chạy trong sandbox không có cùng nguồn', () => {
  const config = text('next.config.ts');
  const at = config.indexOf('/static/courses/machine_learning/interactive/:file*.html');
  assert.ok(at > config.indexOf('source: "/(.*)"'), 'mục riêng phải đứng sau mục chung');
  const policy = config.slice(at, config.indexOf('/pyodide/:path*', at));
  assert.match(policy, /sandbox allow-scripts/);
  assert.ok(!/allow-same-origin/.test(policy));
});
