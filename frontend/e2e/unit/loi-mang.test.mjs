// Lỗi mạng của trình duyệt phải tới người học bằng tiếng Việt (lib/loi-mang.ts).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { chuLoi } from '../../src/lib/loi-mang.ts';

test('ba kiểu trình duyệt nói "không nối được" đều thành một câu tiếng Việt', () => {
  for (const loi of ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.']) {
    assert.match(chuLoi(new TypeError(loi)), /^Không nối được tới máy chủ/, loi);
  }
});

test('lời của máy chủ giữ nguyên, lỗi không có lời thì dùng câu dự phòng', () => {
  assert.equal(chuLoi(new Error('Bài này đang khoá.')), 'Bài này đang khoá.');
  assert.equal(chuLoi('rác'), 'Không kết nối được máy chủ.');
  assert.equal(chuLoi(new Error(''), 'Thử lại sau.'), 'Thử lại sau.');
});

test('màn bài học đưa lỗi qua chuLoi, không in thẳng error.message', () => {
  const hook = readFileSync(new URL('../../src/components/python-studio/useLessonData.ts', import.meta.url), 'utf8');
  assert.match(hook, /setLoadError\(chuLoi\(error\)\)/);
  assert.doesNotMatch(hook, /set(LoadError|Message)\([^)]*error(\s+as\s+Error)?\)?\.message/);
});
