/**
 * Unit test cho Tủ sách 3 khoá (/bookshelf, /bookshelf/[courseSlug] và màn Khoá học trong Góc học).
 *
 * Bảo đảm:
 *  1. Đủ 2 route mới, LofiRoomChrome (backdrop + topbar), BookshelfCabinet và bộ component dùng chung.
 *  2. BookshelfHubView dùng LofiRoomBackdrop + LofiRoomTopBar + BookshelfCabinet, không còn
 *     nút "Về căn phòng" và không còn cột phải.
 *  3. Python và SQL đọc từ curricula.json thật (11 chặng · 179 bài và 3 chặng · 20 bài);
 *     Machine Learning dùng mock an toàn (`isMock: true`, `lessonBaseHref: null`, không link 404).
 *  4. Tuân thủ quy chuẩn dự án: không ổ khoá 🔒, không mã màu hex trong *.module.css,
 *     không ẩn thanh cuộn (scrollbar-width: none / ::-webkit-scrollbar { display: none }).
 *  5. Góc học (engine.js + StudyRoom.tsx) mở Tủ sách liền mạch qua #bookshelfMount + createPortal
 *     và giữ nguyên lightRoute('courses', ...).
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  USE_BOOKSHELF_MOCK,
  buildProgressSnapshot,
  getInitialBookshelfProgress,
} from '../../src/components/bookshelf/bookshelf-progress.ts';
import {
  markReturningBook,
  consumeReturningBook,
} from '../../src/components/bookshelf/bookshelf-transition.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');
const stripComments = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/[ \t]+\/\/.*$/gm, '');

test('bookshelf routes, LofiRoomChrome và BookshelfCabinet tồn tại đầy đủ', () => {
  const required = [
    ['public', 'static', 'css', 'bookshelf-tokens.css'],
    ['src', 'app', '(auth)', 'bookshelf', 'page.tsx'],
    ['src', 'app', '(auth)', 'bookshelf', '[courseSlug]', 'page.tsx'],
    ['src', 'components', 'ui', 'LofiRoomChrome.tsx'],
    ['src', 'components', 'ui', 'lofi-room-chrome.module.css'],
    ['src', 'components', 'bookshelf', 'bookshelf-catalog.ts'],
    ['src', 'components', 'bookshelf', 'bookshelf-progress.ts'],
    ['src', 'components', 'bookshelf', 'bookshelf-transition.ts'],
    ['src', 'components', 'bookshelf', 'BookshelfCabinet.tsx'],
    ['src', 'components', 'bookshelf', 'BookshelfShell.tsx'],
    ['src', 'components', 'bookshelf', 'BookshelfHubView.tsx'],
    ['src', 'components', 'bookshelf', 'BookCoverStage.tsx'],
    ['src', 'components', 'bookshelf', 'BookPropsDisplay.tsx'],
    ['src', 'components', 'bookshelf', 'BookSpreadStage.tsx'],
    ['src', 'components', 'bookshelf', 'BookLessonsSpread.tsx'],
    ['src', 'components', 'bookshelf', 'CourseBookView.tsx'],
    ['src', 'components', 'bookshelf', 'bookshelf.module.css'],
  ];
  for (const p of required) {
    assert.ok(existsSync(join(FE, ...p)), `Thiếu file bắt buộc: ${p.join('/')}`);
  }
});

test('BookshelfHubView đồng bộ TopBar + nền mờ, bỏ "Về căn phòng" và cột phải', () => {
  const hubSrc = stripComments(read('src', 'components', 'bookshelf', 'BookshelfHubView.tsx'));
  assert.match(hubSrc, /LofiRoomBackdrop/);
  assert.match(hubSrc, /LofiRoomTopBar/);
  assert.match(hubSrc, /BookshelfCabinet/);
  assert.equal(hubSrc.includes('Về căn phòng'), false, 'Không còn nút "Về căn phòng"');
  assert.equal(hubSrc.includes('hubSidebar'), false, 'Không còn cột phụ bên phải');
  assert.equal(hubSrc.includes('Mỗi cuốn sách có'), false, 'Không còn hộp "Mỗi cuốn sách có"');

  const shellSrc = stripComments(read('src', 'components', 'bookshelf', 'BookshelfShell.tsx'));
  assert.match(shellSrc, /LofiRoomBackdrop/);
  assert.equal(shellSrc.includes('LofiRoomTopBar'), false, 'Trang bìa/sách mở giữ gọn không TopBar');
});

test('dữ liệu giáo trình thật khớp Python (11 chặng · 179 bài) và SQL (3 chặng · 20 bài)', () => {
  const curricula = JSON.parse(read('src', 'lib', 'curricula.json')).CURRICULA;
  const pyMods = curricula.python_advanced.modules;
  const sqlMods = curricula.db_design.modules;

  assert.equal(pyMods.length, 11);
  assert.equal(pyMods.reduce((s, m) => s + m.lessons.length, 0), 179);
  assert.equal(sqlMods.length, 3);
  assert.equal(sqlMods.reduce((s, m) => s + m.lessons.length, 0), 20);

  const catSrc = read('src', 'components', 'bookshelf', 'bookshelf-catalog.ts');
  assert.match(catSrc, /RAW_CURRICULA\.python_advanced/);
  assert.match(catSrc, /RAW_CURRICULA\.db_design/);
  assert.match(catSrc, /lessonBaseHref:\s*'\/lesson\/python_advanced'/);
  assert.match(catSrc, /lessonBaseHref:\s*'\/lesson\/db_design'/);
  assert.match(catSrc, /isMock:\s*true/);
  assert.match(catSrc, /lessonBaseHref:\s*null/);
  assert.ok(!catSrc.includes('/lesson/machine_learning'), 'Không được đặt href 404 tới /lesson/machine_learning');
});

test('bookshelf-progress.ts giữ cờ USE_BOOKSHELF_MOCK = true và tính tiến độ chuẩn', () => {
  assert.equal(USE_BOOKSHELF_MOCK, true);

  const pyInit = getInitialBookshelfProgress('python', 179);
  assert.deepEqual(pyInit.completedNos, [1, 2, 3, 4, 5, 6]);
  assert.equal(pyInit.currentLessonNo, 7);
  assert.equal(pyInit.source, 'mock');

  const sqlInit = getInitialBookshelfProgress('sql', 20);
  assert.deepEqual(sqlInit.completedNos, []);
  assert.equal(sqlInit.currentLessonNo, 1);

  const custom = buildProgressSnapshot([1, 2, 999, 2, 0], 5, 'api');
  assert.deepEqual(custom.completedNos, [1, 2]);
  assert.equal(custom.currentLessonNo, 3);
  assert.equal(custom.source, 'api');
});

test('bookshelf.module.css, lofi-room-chrome.module.css và các TSX không vi phạm token/scrollbar/ổ khoá', () => {
  for (const cssPath of [
    ['src', 'components', 'bookshelf', 'bookshelf.module.css'],
    ['src', 'components', 'ui', 'lofi-room-chrome.module.css'],
  ]) {
    const css = read(...cssPath);
    assert.equal(/#[0-9a-fA-F]{3,8}/.test(css), false, `${cssPath.join('/')} không được chứa mã hex cứng`);
    assert.equal(/scrollbar-width\s*:\s*none/.test(css), false, `${cssPath.join('/')} không được ẩn scrollbar bằng scrollbar-width: none`);
    assert.equal(/::-webkit-scrollbar\s*\{[^}]*display\s*:\s*none/.test(css), false, `${cssPath.join('/')} không được ẩn scrollbar bằng webkit display: none`);
  }

  const uiFiles = [
    ['src', 'components', 'bookshelf', 'BookshelfCabinet.tsx'],
    ['src', 'components', 'bookshelf', 'BookshelfHubView.tsx'],
    ['src', 'components', 'bookshelf', 'BookCoverStage.tsx'],
    ['src', 'components', 'bookshelf', 'BookSpreadStage.tsx'],
    ['src', 'components', 'bookshelf', 'BookLessonsSpread.tsx'],
    ['src', 'components', 'bookshelf', 'CourseBookView.tsx'],
  ];
  for (const p of uiFiles) {
    const src = read(...p);
    assert.equal(src.includes('🔒'), false, `${p.join('/')} không được vẽ biểu tượng ổ khoá`);
  }
});

test('Góc học mở Tủ sách liền mạch qua #bookshelfMount + createPortal mà vẫn giữ lightRoute', () => {
  const engine = read('src', 'components', 'goc-hoc', 'engine.js');
  assert.match(engine, /bookshelfMount/);
  assert.match(engine, /if \(G\.route==='book'\) return go\('courses', \{\}\)/);
  assert.match(engine, /function lightRoute\(r, on\)/);
  assert.match(engine, /onCoursesMount/);

  const studyRoom = read('src', 'components', 'goc-hoc', 'StudyRoom.tsx');
  assert.match(studyRoom, /createPortal/);
  assert.match(studyRoom, /BookshelfCabinet/);
});

test('bấm sách trên kệ có hiệu ứng rút 3D ra xem bìa và đồng bộ đồ vật 2 bên', () => {
  const cabSrc = read('src', 'components', 'bookshelf', 'BookshelfCabinet.tsx');
  assert.match(cabSrc, /createPortal/);
  assert.match(cabSrc, /prefers-reduced-motion:\s*reduce/);
  assert.match(cabSrc, /pullOverlay/);
  assert.match(cabSrc, /pullBook3d/);
  assert.match(cabSrc, /<Link[\s\S]*?href=\{`\/bookshelf\/\$\{course\.slug\}`\}/);

  const cssSrc = read('src', 'components', 'bookshelf', 'bookshelf.module.css');
  assert.match(cssSrc, /@keyframes\s+pullBookOut/);
  assert.match(cssSrc, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);

  const coverSrc = read('src', 'components', 'bookshelf', 'BookCoverStage.tsx');
  assert.match(coverSrc, /coverStageAnimated/);
  assert.match(coverSrc, /coverCtaWrap/);
});

test('bấm "Về tủ sách" hoặc Esc có hiệu ứng cất sách 3D ngược vào đúng khe kệ cũ', () => {
  const mem = new Map();
  const mockStorage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, v),
    removeItem: (k) => mem.delete(k),
  };

  for (const slug of ['python', 'sql', 'machine-learning']) {
    markReturningBook(slug, mockStorage, 1000);
    assert.equal(consumeReturningBook(mockStorage, 1500), slug);
    assert.equal(consumeReturningBook(mockStorage, 1600), null, 'chỉ consume đúng 1 lần');
  }

  markReturningBook('sql', mockStorage, 1000);
  assert.equal(consumeReturningBook(mockStorage, 6000), null, 'quá TTL phải trả null');

  mockStorage.setItem('pe_bookshelf_return_book', JSON.stringify({ slug: 'invalid', ts: 1000 }));
  assert.equal(consumeReturningBook(mockStorage, 1200), null, 'slug lạ phải trả null');

  const viewSrc = read('src', 'components', 'bookshelf', 'CourseBookView.tsx');
  assert.match(viewSrc, /markReturningBook/);
  assert.match(viewSrc, /router\.push\('\/bookshelf'\)/);
  assert.match(viewSrc, /isExiting=\{isReturningToShelf\}/);
  assert.match(viewSrc, /prefers-reduced-motion:\s*reduce/);

  const cabSrc = read('src', 'components', 'bookshelf', 'BookshelfCabinet.tsx');
  assert.match(cabSrc, /consumeReturningBook/);
  assert.match(cabSrc, /pullBook3dReturn/);
  assert.match(cabSrc, /spineBtnSettled/);

  const cssSrc = read('src', 'components', 'bookshelf', 'bookshelf.module.css');
  assert.match(cssSrc, /@keyframes\s+putBookBack/);
  assert.match(cssSrc, /@keyframes\s+spineSettle/);
  assert.match(cssSrc, /\.coverStageExiting/);
});
