import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildLessonHref,
  progressFromEnrolled,
  unknownProgress,
} from '../../src/components/bookshelf/bookshelf-progress.ts';

test('tủ sách: không đọc được thì trống, không bịa số', () => {
  for (const data of [null, undefined, {}, 'x', [{ id: 'python_advanced' }]]) {
    const snap = progressFromEnrolled(data, 'python_advanced', 179);
    assert.deepEqual(snap.completedNos, []);
    assert.equal(snap.source, 'unknown');
  }
  assert.deepEqual(unknownProgress(179).completedNos, []);
  assert.equal(unknownProgress(179).currentLessonNo, null);
  assert.equal(progressFromEnrolled([], 'python_advanced', 179).currentLessonNo, null);
});

test('tủ sách: đọc đúng khoá, lọc số rác, gợi ý bài trống đầu tiên', () => {
  const data = {
    enrolled: [
      { id: 'db_design', completedLessonNumbers: [9] },
      { courseId: 'python_advanced', completedLessonNumbers: [2, 1, 1, 0, 999, null, 4] },
    ],
  };
  const snap = progressFromEnrolled(data, 'python_advanced', 179);
  assert.deepEqual(snap.completedNos, [1, 2, 4]);
  assert.equal(snap.currentLessonNo, 3);
  assert.equal(snap.source, 'api');
  assert.deepEqual(progressFromEnrolled([], 'python_advanced', 179).completedNos, []);
});

test('tủ sách: link mở đúng bài theo cách đếm của trang bài học', () => {
  const first = { index: 0, no: 1 };
  assert.equal(buildLessonHref('/lesson/python_advanced', first), '/lesson/python_advanced?lesson=0');
  assert.equal(buildLessonHref('/lesson/database', first), '/lesson/database?lesson=0');
});

test('tủ sách: chỉ gọi API khi máy đã có phiên', () => {
  const hook = readFileSync(
    new URL('../../src/components/bookshelf/useBookshelfProgress.ts', import.meta.url),
    'utf8',
  );
  assert.ok(hook.indexOf('hasStoredSession(session)') < hook.indexOf("apiFetch('/api/enrolled')"));
});

test('máy tính: worker chạy mã học viên mang CSP không gọi được API', () => {
  const config = readFileSync(new URL('../../next.config.ts', import.meta.url), 'utf8');
  assert.match(config, /source: "\/goc-hoc\/may-tinh\/py-worker\.js",\s*headers: \[\{ key: "Content-Security-Policy", value: workerCsp \}\]/);
});
