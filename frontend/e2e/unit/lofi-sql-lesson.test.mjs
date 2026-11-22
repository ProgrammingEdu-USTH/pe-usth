/**
 * Unit test cho luồng Lofi SQL (66 bài trên 3 khoá db_design, db_design_tc, db_design_nc)
 * và 22 Concept Card dùng chung LofiWorkspace + SQLite preview.
 *
 * Chạy: cd frontend && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test e2e/unit/lofi-sql-lesson.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { isBookPageNonEmpty } from '../../src/lib/lofi-book-spreads.ts';
import {
  buildSqlBookSpreads,
  stripSqlHtml,
} from '../../src/lib/lofi-sql-adapter.ts';
import {
  buildSqlitePreviewScript,
  gradeSqlAnswer,
  gradeStep3Tokens,
  parseSqlitePreviewOutput,
} from '../../src/lib/lofi-sql-grader.ts';
import { READ_BLOCK_TYPES } from '../../src/lib/studio-lesson.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');

const COURSES = [
  ['db_design', 20],
  ['db_design_tc', 21],
  ['db_design_nc', 25],
];

const HTML_TAG_RX = /<\/?(?:strong|em|b|i|code|p|div|span|br|ul|ol|li|a|h[1-6]|pre|table|tr|td|th)\b[^>]*>/i;

function loadJson(...parts) {
  return JSON.parse(readFileSync(join(FE, ...parts), 'utf8'));
}

function collectStrings(node, out = []) {
  if (typeof node === 'string') {
    out.push(node);
  } else if (Array.isArray(node)) {
    for (const item of node) collectStrings(item, out);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      // Bỏ qua code/SQL gốc có thể chứa chữ thường hoặc template không hiển thị dưới dạng HTML
      if (k === 'starter' || k === 'expectedSql' || k === 'equivSql' || k === 'template') continue;
      collectStrings(v, out);
    }
  }
  return out;
}

const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/[ \t]+\/\/.*$/gm, '');

test('66/66 bài SQL qua 3 khoá đều sinh đúng 4 spread đầy đặn, không rỗng và không lọt thẻ HTML', () => {
  const cardsData = loadJson('public', 'static', 'sql', 'concept_cards.json');
  const cardMap = new Map((cardsData.cards ?? []).map((c) => [c.id, c]));

  let totalLessons = 0;
  for (const [courseId, expectedCount] of COURSES) {
    const data = loadJson('public', 'static', 'sql', `${courseId}.json`);
    const lessons = data.lessons ?? [];
    assert.equal(lessons.length, expectedCount, `${courseId} phải có đủ ${expectedCount} bài`);

    for (const lesson of lessons) {
      totalLessons += 1;
      const spreads = buildSqlBookSpreads(lesson, courseId, cardMap);
      assert.equal(spreads.length, 4, `${courseId}/${lesson.id} phải có đủ 4 spread`);

      for (const spread of spreads) {
        assert.equal(
          isBookPageNonEmpty(spread.left),
          true,
          `${courseId}/${lesson.id} ${spread.id} trang trái không được rỗng`,
        );
        assert.equal(
          isBookPageNonEmpty(spread.right),
          true,
          `${courseId}/${lesson.id} ${spread.id} trang phải không được rỗng`,
        );

        for (const page of [spread.left, spread.right]) {
          if (page.kind === 'read-slice') {
            for (const b of page.blocks) {
              assert.equal(
                READ_BLOCK_TYPES.includes(b.block.type),
                true,
                `${courseId}/${lesson.id} ${spread.id} block type không hợp lệ: ${b.block.type}`,
              );
              if (b.block.type === 'paragraph') {
                assert.ok(
                  b.block.text.trim().length > 0,
                  `${courseId}/${lesson.id} ${spread.id} paragraph rỗng`,
                );
              }
            }
          }
        }

        for (const str of collectStrings(spread)) {
          assert.equal(
            HTML_TAG_RX.test(str),
            false,
            `${courseId}/${lesson.id} ${spread.id} bị rò thẻ HTML: ${str.slice(0, 120)}`,
          );
        }
      }
    }
  }
  assert.equal(totalLessons, 66);
});

test('stripSqlHtml giữ nguyên toán tử SQL (< 100) nhưng làm sạch thẻ HTML và entity', () => {
  assert.equal(stripSqlHtml('Lọc <code>price &lt; 100</code> và <strong>tên</strong>'), 'Lọc `price < 100` và tên');
  assert.equal(stripSqlHtml('SELECT * FROM orders WHERE price < 100'), 'SELECT * FROM orders WHERE price < 100');
});

test('gradeSqlAnswer chấm đúng mọi expected_sql/equiv_sql của full_ide & bug_fix, và báo lỗi tiếng Việt khi thiếu mệnh đề', () => {
  let checkedCount = 0;

  for (const [courseId] of COURSES) {
    const data = loadJson('public', 'static', 'sql', `${courseId}.json`);
    for (const lesson of data.lessons ?? []) {
      const s4 = lesson.step_4;
      if (!s4?.expected_sql) continue;
      const ctype = s4.challenge_type || lesson.challenge_type || 'full_ide';
      if (ctype !== 'full_ide' && ctype !== 'bug_fix') continue;

      checkedCount += 1;
      const ok = gradeSqlAnswer(s4.expected_sql, s4.expected_sql, s4.equiv_sql);
      assert.equal(ok.correct, true, `${courseId}/${lesson.id} expected_sql phải pass: ${ok.error ?? ''}`);

      const alts = Array.isArray(s4.equiv_sql) ? s4.equiv_sql : s4.equiv_sql ? [s4.equiv_sql] : [];
      for (const alt of alts) {
        if (!alt) continue;
        const altRes = gradeSqlAnswer(alt, s4.expected_sql, s4.equiv_sql);
        assert.equal(altRes.correct, true, `${courseId}/${lesson.id} equiv_sql phải pass: ${alt}`);
      }
    }
  }

  assert.ok(checkedCount > 0, 'Phải kiểm tra được ít nhất 1 bài full_ide / bug_fix');

  // Kiểm tra báo lỗi tiếng Việt theo từng mệnh đề bị thiếu
  const sampleExpected = 'SELECT name, price FROM games WHERE price > 100 ORDER BY price DESC;';
  const noSelect = gradeSqlAnswer('FROM games WHERE price > 100;', sampleExpected);
  assert.equal(noSelect.correct, false);
  assert.match(noSelect.error || '', /Thiếu mệnh đề SELECT/);

  const noFrom = gradeSqlAnswer('SELECT name, price WHERE price > 100;', sampleExpected);
  assert.equal(noFrom.correct, false);
  assert.match(noFrom.error || '', /Thiếu mệnh đề FROM/);

  const noWhere = gradeSqlAnswer('SELECT name, price FROM games ORDER BY price DESC;', sampleExpected);
  assert.equal(noWhere.correct, false);
  assert.match(noWhere.error || '', /Thiếu mệnh đề WHERE/);

  const noOrder = gradeSqlAnswer('SELECT name, price FROM games WHERE price > 100;', sampleExpected);
  assert.equal(noOrder.correct, false);
  assert.match(noOrder.error || '', /Thiếu mệnh đề ORDER BY/);
});

test('gradeStep3Tokens chấm khớp toàn bộ câu step_3 và từ chối bài để trống', () => {
  let step3Count = 0;
  for (const [courseId] of COURSES) {
    const data = loadJson('public', 'static', 'sql', `${courseId}.json`);
    for (const lesson of data.lessons ?? []) {
      const expected = lesson.step_3?.expected_sql;
      if (!expected) continue;
      step3Count += 1;
      const ok = gradeStep3Tokens(expected, expected);
      assert.equal(ok.correct, true, `${courseId}/${lesson.id} step_3 phải pass với expected_sql`);
    }
  }
  assert.equal(step3Count, 66, 'Đủ 66/66 bài SQL đều có step_3 expected_sql');

  const empty = gradeStep3Tokens('', 'SELECT * FROM games;');
  assert.equal(empty.correct, false);
  assert.match(empty.message, /chưa ghép/i);
});

test('buildSqlitePreviewScript và parseSqlitePreviewOutput sinh script sqlite3 và đọc kết quả chuẩn', () => {
  const script = buildSqlitePreviewScript(
    {
      table_name: 'game_catalog',
      columns: [
        { name: 'id', type: 'INTEGER' },
        { name: 'name', type: 'TEXT' },
      ],
      data: [[101, 'Elden Ring']],
    },
    [],
    'SELECT id, name FROM game_catalog;',
  );
  assert.match(script, /import json, re, sqlite3/);
  assert.match(script, /CREATE TABLE/);
  assert.match(script, /__SQL_JSON__:/);

  const parsed = parseSqlitePreviewOutput(
    'log line\n__SQL_JSON__:{"ok":true,"columns":["id","name"],"rows":[[101,"Elden Ring"]],"rowCount":1}\n',
  );
  assert.deepEqual(parsed, {
    ok: true,
    columns: ['id', 'name'],
    rows: [[101, 'Elden Ring']],
    rowCount: 1,
  });

  const parsedErr = parseSqlitePreviewOutput('__SQL_JSON__:{"ok":false,"columns":[],"rows":[],"rowCount":0,"error":"no such column: foo"}');
  assert.equal(parsedErr?.ok, false);
  assert.equal(parsedErr?.error, 'no such column: foo');

  assert.equal(parseSqlitePreviewOutput('plain output without marker'), null);
});

test('22 Concept Card đều trỏ back_href về /bookshelf/sql và có dữ liệu sạch', () => {
  const data = loadJson('public', 'static', 'sql', 'concept_cards.json');
  const cards = data.cards ?? [];
  assert.equal(cards.length, 22);

  for (const card of cards) {
    assert.equal(card.back_href, '/bookshelf/sql', `${card.id} phải có back_href=/bookshelf/sql`);
    assert.ok(card.title && card.title.trim().length > 0);
    if (card.cta?.href) {
      assert.match(
        card.cta.href,
        /^(?:\/lesson\/db_design(?:_tc|_nc)?\?lesson=\d+|\/card\/[a-z0-9_]+|\/bookshelf\/sql)$/i,
        `${card.id} CTA href không hợp lệ: ${card.cta.href}`,
      );
    }
  }
});

test('sql-catalog.json đủ 66 bài và LofiWorkspace.tsx kết nối đủ module SQL Lofi', () => {
  const catalog = loadJson('src', 'lib', 'sql-catalog.json');
  assert.equal(catalog.db_design?.length, 20);
  assert.equal(catalog.db_design_tc?.length, 21);
  assert.equal(catalog.db_design_nc?.length, 25);

  const lofiSrc = stripComments(
    readFileSync(join(FE, 'src', 'components', 'goc-hoc', 'LofiWorkspace.tsx'), 'utf8'),
  );
  for (const sym of [
    'buildSqlBookSpreads',
    'loadSqlCourseData',
    'loadSqlConceptCards',
    'gradeSqlAnswer',
    'gradeStep3Tokens',
    'buildSqlitePreviewScript',
    'parseSqlitePreviewOutput',
    'isSqlCourse',
  ]) {
    assert.match(lofiSrc, new RegExp(`\\b${sym}\\b`), `LofiWorkspace.tsx phải sử dụng ${sym}`);
  }
});
