/**
 * Canh đợt dọn sạch giao diện cũ và gom toàn bộ route về `src/app/` + dời Diễn đàn sang `src/components/forum/`.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO = join(FE, '..');
const at = (...p) => join(FE, ...p);

const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/[ \t]+\/\/.*$/gm, '');

/* ── 1 · Route chết, nhóm route cũ & component mồ côi phải xoá hẳn ─────────── */

const REMOVED = [
  [['src', 'app', '(auth)'], 'nhóm route cũ đã bỏ — gom thẳng về src/app/'],
  [['src', 'app', '(standalone)'], 'nhóm route cũ đã bỏ — gom thẳng về src/app/'],
  [['src', 'app', 'dashboard'], 'trang bảng điều khiển Figma cũ đã thay bằng /'],
  [['src', 'app', 'DashboardMap.tsx'], 'bản đồ của /dashboard cũ'],
  [['src', 'app', 'home.module.css'], 'CSS của /dashboard cũ'],
  [['src', 'app', 'ide', 'IdeClient.tsx'], 'giao diện IDE trắng-kem cũ trước Lofi'],
  [['src', 'app', 'ide', 'ide.module.css'], 'CSS của IdeClient cũ'],
  [['src', 'app', 'ide', 'examples.ts'], 'ví dụ mẫu của IdeClient cũ'],
  [['src', 'components', 'goc-hoc', 'forum-lofi.js'], 'đã dời sang src/components/forum/forum-lofi.js'],
  [['src', 'components', 'CourseDbDesign.tsx'], 'trang khoá SQL trắng-xanh cũ'],
  [['src', 'components', 'CourseShell.module.css'], 'CSS của CourseDetail / CourseDbDesign cũ'],
  [['src', 'components', 'SiteHeader.tsx'], 'thanh đầu trang trắng cũ'],
  [['src', 'components', 'Chatbot.tsx'], 'chỉ /lesson/java và /lesson/htmlcss cũ dùng'],
  [['src', 'components', 'minigame'], 'demo minigame cũ'],
  [['src', 'components', 'python-studio', 'PythonStudio.tsx'], 'studio v2 cũ'],
  [['src', 'components', 'python-studio', 'StudioLesson.tsx'], 'trình dựng bài v2 cũ'],
  [['src', 'components', 'python-studio', 'screens'], 'các màn hình Python Studio v2 cũ'],
  [['src', 'components', 'python-studio', 'intro'], 'intro Python Studio v2 cũ'],
  [['src', 'components', 'lesson-chrome'], 'khung bài học v2 cũ'],
  [['src', 'components', 'code-visualizer'], 'trình trực quan hoá của IdeClient cũ'],
  [['src', 'lib', 'python-studio.ts'], 'đề bài/lời giải cứng của demo cũ'],
  [['src', 'components', 'LessonDbDesign.tsx'], 'giao diện SQL trắng-kem cũ đã chuyển sang LofiWorkspace'],
  [['src', 'components', 'LegacyScripts.tsx'], 'bộ nạp script legacy chỉ còn LessonDbDesign & concept_card dùng'],
  [['src', 'components', 'auth', 'PhoneAuthView.tsx'], 'màn hình đăng nhập điện thoại cũ không còn nơi gọi'],
  [['src', 'lib', 'runner-error.ts'], 'helper lỗi runner của khung VS Code cũ đã thay bằng may-tinh/'],
];

test('route cũ, nhóm (auth)/(standalone) và component mồ côi đã xoá hẳn khỏi src/**', () => {
  const back = [];
  for (const [p, why] of REMOVED) {
    if (existsSync(at(...p))) back.push(`${p.join('/')} — ${why}`);
  }
  assert.deepEqual(back, [], `những thứ đã dọn mà lại có mặt:\n${back.join('\n')}`);
});

/* ── 2 · File legacy trong public/static & file preview gốc đã xoá hẳn ──────── */

const REMOVED_STATIC = [
  ['public', 'static', 'js', 'main.js'],
  ['public', 'static', 'js', 'chatbot.js'],
  ['public', 'static', 'css', 'chatbot.css'],
  ['public', 'static', 'js', 'dashboard.js'],
  ['public', 'static', 'css', 'dashboard.css'],
  ['public', 'static', 'js', 'course_detail.js'],
  ['public', 'static', 'css', 'course_detail.css'],
  ['public', 'static', 'js', 'course_db_design.js'],
  ['public', 'static', 'css', 'course_db_design.css'],
  ['public', 'static', 'css', 'edu-course-detail.css'],
  ['public', 'static', 'js', 'ide.worker.js'],
  ['public', 'static', 'js', 'roadmap.js'],
  ['public', 'static', 'js', 'python-studio.worker.js'],
  ['public', 'static', 'js', 'pages', 'lesson-topbar.hydrate.js'],
  ['public', 'static', 'js', 'pages', 'lesson_java.inline.js'],
  ['public', 'static', 'js', 'pages', 'lesson_htmlcss.inline.js'],
  ['public', 'static', 'js', 'pages', 'interface.inline.js'],
  ['public', 'static', 'js', 'pages', 'login.inline.js'],
  ['public', 'static', 'js', 'pages', 'register.inline.js'],
  ['public', 'static', 'css', 'lesson.css'],
  ['public', 'static', 'css', 'edu-lesson.css'],
  ['public', 'static', 'css', 'pages', 'lesson_java.inline.css'],
  ['public', 'static', 'css', 'pages', 'lesson_htmlcss.inline.css'],
  ['public', 'static', 'css', 'pages', 'interface.inline.css'],
  ['public', 'static', 'js', 'lesson_db_design.js'],
  ['public', 'static', 'js', 'lesson_content.js'],
  ['public', 'static', 'js', 'lesson_content_tc.js'],
  ['public', 'static', 'js', 'lesson_content_nc.js'],
  ['public', 'static', 'js', 'table_explorer.js'],
  ['public', 'static', 'js', 'drag_game.js'],
  ['public', 'static', 'js', 'decomp_game.js'],
  ['public', 'static', 'js', 'pages', 'concept_card.inline.js'],
  ['public', 'static', 'css', 'lesson_db_design.css'],
  ['public', 'static', 'css', 'edu-db.css'],
  ['public', 'static', 'css', 'edu-card.css'],
  ['public', 'static', 'css', 'edu-theme.css'],
  ['public', 'static', 'css', 'pages', 'concept_card.inline.css'],
  ['public', 'static', 'python-studio'],
];

const REMOVED_ROOT = [
  'lofi-forum-preview.html',
  'lofi-lesson-preview.html',
  'forum-lofi-pack',
  'lofi-lesson-pack',
];

test('file JS/CSS legacy không còn trang nào nạp & gói xem trước ở gốc đã xoá hẳn', () => {
  const backStatic = REMOVED_STATIC.filter((p) => existsSync(at(...p))).map((p) => p.join('/'));
  const backRoot = REMOVED_ROOT.filter((p) => existsSync(join(REPO, p)));
  assert.deepEqual([...backStatic, ...backRoot], [], `tài nguyên rác còn sót: ${[...backStatic, ...backRoot].join(', ')}`);
});

/* ── 3 · Không chỗ nào trong src/** còn trỏ tới thứ đã xoá ────────────────── */

function sources(dir = at('src')) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { out.push(...sources(full)); continue; }
    if (/\.(ts|tsx|js|css|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

const SOURCES = sources().map((f) => [relative(FE, f).split(sep).join('/'), readFileSync(f, 'utf8')]);

test('src/** không còn nạp hay dẫn tới route/asset đã xoá', () => {
  const GONE = [
    '/static/js/main.js',
    '/static/js/chatbot.js',
    '/static/css/chatbot.css',
    '/static/js/course_db_design.js',
    '/static/css/course_db_design.css',
    '/static/js/python-studio.worker.js',
    '/static/js/pages/lesson-topbar.hydrate.js',
    '/static/js/pages/lesson_java',
    '/static/js/pages/lesson_htmlcss',
    '/static/js/pages/interface',
    '/static/css/lesson.css',
    '/static/css/edu-lesson.css',
    '/static/css/pages/lesson_java',
    '/static/css/pages/lesson_htmlcss',
    '/static/css/pages/interface',
    '/static/python-studio/',
    '@/components/Chatbot',
    '@/components/CourseDbDesign',
    '@/components/SiteHeader',
    '@/lib/python-studio',
    'python-studio/PythonStudio',
    'python-studio/StudioLesson',
    'goc-hoc/forum-lofi',
  ];
  const offenders = [];
  for (const [path, raw] of SOURCES) {
    const code = stripComments(raw);
    for (const needle of GONE) {
      if (code.includes(needle)) offenders.push(`${path}: còn ${needle}`);
    }
  }
  assert.deepEqual(offenders, [], `trỏ tới thứ đã xoá:\n${offenders.join('\n')}`);
});

test('/lesson/[courseId] không còn chuyển hướng sang /interface hay /courses/', () => {
  const code = stripComments(
    readFileSync(at('src', 'app', 'lesson', '[courseId]', 'page.tsx'), 'utf8'),
  );
  assert.ok(!code.includes('/interface'), 'vẫn còn đẩy sang /interface đã xoá');
  assert.ok(!/\bcpp\b/.test(code), 'vẫn còn nhánh cho khoá cpp');
  assert.ok(!code.includes('/courses/'), 'vẫn còn đẩy sang /courses/ đã xoá');
});

/* ── 4 · Chữ nghĩa: không còn chuỗi ngày trên giao diện Lofi mới ─────────── */

const ALLOW = [
  ['src/lib/learning-events.ts', 'streak', 'repeatStreak là trường telemetry đếm chuỗi lỗi lặp, không phải chuỗi ngày học trên UI'],
  ['src/app/layout.tsx', 'streak', '.streak-overlay là CSS nội tuyến ẩn sớm các lớp overlay cũ nếu còn sót class'],
];

const BANNED = [
  [/giữ\s+chuỗi/iu, 'huy hiệu "Học ngay để giữ chuỗi"'],
  [/ngày\s+liên\s+tiếp/iu, 'huy hiệu "0 Ngày liên tiếp!"'],
  [/🔥\s*ngày/iu, 'pill 🔥 + số ngày'],
  [/streak/iu, 'tên biến/id/lớp CSS còn sót của chuỗi ngày'],
];

test('mã chạy trong src/** không còn mảnh nào của chuỗi ngày (streak) ngoài ngoại lệ đã ghi', () => {
  const offenders = [];
  for (const [path, raw] of SOURCES) {
    const code = stripComments(raw);
    for (const [rx, what] of BANNED) {
      const hit = code.match(rx);
      if (!hit) continue;
      if (ALLOW.some(([p, s]) => p === path && hit[0].toLowerCase().includes(s.toLowerCase()))) continue;
      offenders.push(`${path}: "${hit[0]}" — ${what}`);
    }
  }
  assert.deepEqual(
    offenders, [],
    'chuỗi ngày đã gỡ khỏi sản phẩm (commit 330a469); những chỗ này dựng lại nó:\n'
    + offenders.join('\n'),
  );
});

/* ── 5 · Phanh: đủ 12 route sống, Diễn đàn & lõi Pyodide vẫn còn nguyên ──── */

const ALIVE = [
  [['src', 'app', 'page.tsx'], 'Trang chủ Góc học /'],
  [['src', 'app', 'bookshelf', 'page.tsx'], 'Tủ sách khoá học /bookshelf'],
  [['src', 'app', 'bookshelf', '[courseSlug]', 'page.tsx'], 'Chi tiết sách khoá học /bookshelf/[courseSlug]'],
  [['src', 'app', 'lesson', 'python_advanced', 'page.tsx'], 'Bài học Python /lesson/python_advanced'],
  [['src', 'app', 'lesson', '[courseId]', 'page.tsx'], 'Bài học SQL /lesson/[courseId]'],
  [['src', 'app', 'card', '[cardId]', 'page.tsx'], 'Concept Card SQL /card/[cardId]'],
  [['src', 'app', 'practice', 'page.tsx'], 'Ôn tập /practice'],
  [['src', 'app', 'ide', 'page.tsx'], 'Bàn thí nghiệm /ide'],
  [['src', 'app', 'login', 'page.tsx'], 'Đăng nhập /login'],
  [['src', 'app', 'register', 'page.tsx'], 'Đăng ký /register'],
  [['src', 'app', 'onboarding', 'page.tsx'], 'Khảo sát /onboarding'],
  [['src', 'app', 'profile', 'page.tsx'], 'Hồ sơ /profile'],
  [['src', 'components', 'forum', 'forum-lofi.js'], 'Diễn đàn Lofi (tính năng BE7)'],
  [['src', 'components', 'ui', 'LofiDarkPageShell.tsx'], 'Vỏ nền tối Lofi dùng chung'],
  [['src', 'components', 'python-studio', 'runner', 'pyodide-runner.ts'], 'Lõi chạy Pyodide'],
  [['src', 'components', 'python-studio', 'runner', 'types.ts'], 'Kiểu dữ liệu Pyodide runner'],
  [['src', 'components', 'python-studio', 'useCodeRunner.ts'], 'Hook chạy code Python'],
  [['src', 'components', 'python-studio', 'useLessonProgress.ts'], 'Hook tiến độ chạy code'],
  [['src', 'components', 'python-studio', 'prewarm-gate.ts'], 'Cổng làm ấm Pyodide'],
  [['src', 'components', 'bookshelf', 'LofiConceptCardView.tsx'], 'Concept Card SQL phong cách Lofi'],
  [['src', 'lib', 'lofi-sql-adapter.ts'], 'Bộ chuyển đổi 66 bài SQL sang BookSpread Lofi'],
  [['src', 'lib', 'lofi-sql-grader.ts'], 'Bộ chấm câu lệnh SQL & sinh script SQLite preview'],
  [['src', 'lib', 'lofi-sql-loader.ts'], 'Bộ nạp JSON bài học SQL & Concept Card'],
  [['src', 'lib', 'sql-catalog.json'], 'Danh mục 66 bài học SQL'],
  [['public', 'static', 'sql', 'db_design.json'], 'Giáo trình SQL Cơ bản (20 bài)'],
  [['public', 'static', 'sql', 'db_design_tc.json'], 'Giáo trình SQL Trung cấp (21 bài)'],
  [['public', 'static', 'sql', 'db_design_nc.json'], 'Giáo trình SQL Nâng cao (25 bài)'],
  [['public', 'static', 'sql', 'concept_cards.json'], 'Dữ liệu 22 Concept Card SQL'],
];

test('toàn bộ 12 route sống, Diễn đàn và lõi Pyodide vẫn còn đầy đủ', () => {
  const missing = ALIVE.filter(([p]) => !existsSync(at(...p)))
    .map(([p, why]) => `${p.join('/')} (${why})`);
  assert.deepEqual(missing, [], `file sống bị xoá nhầm: ${missing.join(', ')}`);
});
