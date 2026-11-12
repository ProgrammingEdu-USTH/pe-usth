/**
 * Unit test cho Ôn tập hằng ngày: kiểm tra hợp đồng dữ liệu giả practice-daily.json
 * và các quy tắc bảo mật đáp án (visibleCorrectIndex, visibleExplanation).
 *
 * Chạy bằng: node --test e2e/unit/practice-daily.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  visibleCorrectIndex,
  visibleExplanation,
} from '../../src/lib/daily-practice.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');

const mockRaw = readFileSync(
  join(FE, 'src', 'lib', 'mock', 'practice-daily.json'),
  'utf8',
);
const mockData = JSON.parse(mockRaw);

test('practice-daily.json: cấu trúc phiên ôn tập hằng ngày đầy đủ và hợp lệ', () => {
  assert.ok(mockData.session_id, 'Phải có session_id');
  assert.ok(mockData.course_id, 'Phải có course_id');
  assert.ok(Array.isArray(mockData.items), 'items phải là một mảng');
  assert.ok(mockData.items.length >= 2, 'Phiên ôn tập phải có ít nhất 2 câu hỏi');

  const types = new Set(mockData.items.map((i) => i.type));
  assert.ok(
    types.has('quiz'),
    'Phiên ôn tập hằng ngày phải có câu trắc nghiệm',
  );
  assert.ok(
    types.has('code'),
    'Phiên ôn tập hằng ngày phải có bài tập viết code',
  );
});

test('practice-daily.json: mọi câu trắc nghiệm đều có đủ phương án và đáp án hợp lệ', () => {
  const quizzes = mockData.items.filter((i) => i.type === 'quiz');
  assert.ok(quizzes.length > 0, 'Phải có ít nhất 1 câu trắc nghiệm');

  for (const q of quizzes) {
    assert.ok(q.id, 'Câu trắc nghiệm phải có id');
    assert.ok(typeof q.question === 'string' && q.question.trim().length > 0, 'Câu hỏi trắc nghiệm không được rỗng');
    assert.ok(Array.isArray(q.options) && q.options.length >= 2, 'Phải có ít nhất 2 phương án lựa chọn');
    assert.ok(
      typeof q.correctIndex === 'number'
        && q.correctIndex >= 0
        && q.correctIndex < q.options.length,
      `correctIndex (${q.correctIndex}) phải nằm trong khoảng lựa chọn [0, ${q.options.length - 1}]`,
    );
    assert.ok(
      typeof q.explanation === 'string' && q.explanation.trim().length > 0,
      'Phải có lời giải thích đáp án',
    );
  }
});

test('practice-daily.json: mọi bài tập code đều có starterCode và test cases hợp lệ', () => {
  const codeItems = mockData.items.filter((i) => i.type === 'code');
  assert.ok(codeItems.length > 0, 'Phải có ít nhất 1 bài tập code');

  for (const c of codeItems) {
    assert.ok(c.id, 'Bài code phải có id');
    assert.ok(typeof c.title === 'string' && c.title.trim().length > 0, 'Bài code phải có tiêu đề');
    assert.ok(typeof c.description === 'string' && c.description.trim().length > 0, 'Bài code phải có mô tả');
    assert.ok(typeof c.starterCode === 'string' && c.starterCode.trim().length > 0, 'Phải có starterCode');
    assert.ok(Array.isArray(c.tests) && c.tests.length >= 1, 'Bài code phải có ít nhất 1 ca kiểm thử');
    for (const t of c.tests) {
      assert.ok(t.call, 'Mỗi ca kiểm thử phải có hàm gọi (call)');
      assert.ok(t.expected !== undefined, 'Mỗi ca kiểm thử phải có giá trị kỳ vọng (expected)');
    }
  }
});

test('bảo mật đáp án: visibleCorrectIndex và visibleExplanation không làm lộ đáp án khi chưa kết thúc', () => {
  const quiz = mockData.items.find((i) => i.type === 'quiz');
  assert.ok(quiz);

  // Khi chưa giải xong (ví dụ đang ở lượt nghĩ lại) -> Phải trả về null
  assert.equal(visibleCorrectIndex(quiz, false), null);
  assert.equal(visibleExplanation(quiz, false), null);

  // Khi đã giải xong -> Trả về đáp án đúng và lời giải
  assert.equal(visibleCorrectIndex(quiz, true), quiz.correctIndex);
  assert.equal(visibleExplanation(quiz, true), quiz.explanation);
});
