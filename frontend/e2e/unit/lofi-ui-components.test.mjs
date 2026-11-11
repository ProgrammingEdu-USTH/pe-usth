import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiDir = path.resolve(__dirname, '../../src/components/ui');

test('Lofi UI Components: Export đầy đủ các thành phần dùng chung', () => {
  const indexFile = path.join(uiDir, 'index.ts');
  assert.ok(fs.existsSync(indexFile), 'index.ts phải tồn tại trong src/components/ui');

  const content = fs.readFileSync(indexFile, 'utf8');
  assert.ok(content.includes('LofiButton'), 'Export LofiButton');
  assert.ok(content.includes('LofiCard'), 'Export LofiCard');
  assert.ok(content.includes('LofiProgressBar'), 'Export LofiProgressBar');
  assert.ok(content.includes('LofiFeedbackBanner'), 'Export LofiFeedbackBanner');
  assert.ok(content.includes('LofiHeader'), 'Export LofiHeader');
});

test('Lofi UI Components: CSS Module khai báo đầy đủ các class giao diện', () => {
  const cssFile = path.join(uiDir, 'lofi-ui.module.css');
  assert.ok(fs.existsSync(cssFile), 'lofi-ui.module.css phải tồn tại');

  const css = fs.readFileSync(cssFile, 'utf8');
  // Nút
  assert.ok(css.includes('.btnGlass'), 'Có kiểu nút kính mờ btnGlass');
  assert.ok(css.includes('.btnPrimary'), 'Có kiểu nút chính btnPrimary');
  assert.ok(css.includes('.btnSecondary'), 'Có kiểu nút phụ btnSecondary');
  // Thẻ
  assert.ok(css.includes('.cardGlass'), 'Có kiểu thẻ kính mờ cardGlass');
  assert.ok(css.includes('.cardPaper'), 'Có kiểu thẻ giấy cardPaper');
  // Tiến độ
  assert.ok(css.includes('.progressTrack'), 'Có rãnh tiến độ progressTrack');
  assert.ok(css.includes('.progressFill'), 'Có thanh điền progressFill');
  // Phản hồi
  assert.ok(css.includes('.bannerSuccess'), 'Có banner phản hồi thành công');
  assert.ok(css.includes('.bannerWarning'), 'Có banner phản hồi cảnh báo');
  // Header
  assert.ok(css.includes('.headerNav'), 'Có thanh điều hướng headerNav');
});
