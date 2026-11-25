/**
 * Unit test CANH HIỆU NĂNG & ACCESSIBILITY cho các trang giao diện Lofi:
 *  1. `layout.tsx` không còn preconnect/preload Google Fonts dư thừa (Baloo 2 / Montserrat).
 *  2. `LofiWorkspace.tsx` + CSS thay ~87 ảnh nền bị che (~1,9 MB) bằng 1 lớp `.roomBackdrop`
 *     (`room-blur.webp` 13 KB), ảnh bài học có `loading="lazy"` và `decoding="async"`.
 *  3. `LofiWorkspace.tsx` giữ nguyên `prewarm-gate.ts` cho bài học Python, không tạo Worker
 *     Pyodide trùng cho `/practice` & `/ide` và không prewarm 13 MB khi mới mở bài SQL.
 *  4. `LofiPhoneMockup.tsx` khai báo rõ `width={573}` & `height={1100}` chống CLS.
 *  5. Mọi trang (`LofiWorkspace`, `OnboardingSurveyView`, `profile/page.tsx`, `DoorAuthView`,
 *     `LofiConceptCardView`) đều có landmark `<main>`, heading `<h1>` -> `<h2>` -> `<h3>`
 *     không nhảy cấp, và `profile/page.tsx` sạch inline `style={{`.
 *  6. Các CSS module có animation dịch chuyển đều có `@media (prefers-reduced-motion: reduce)`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const FE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(FE, ...p), 'utf8');

test('layout.tsx sạch thẻ preconnect/preload Google Fonts cũ dư thừa (Unused preload)', () => {
  const layoutSrc = read('src', 'app', 'layout.tsx');
  assert.equal(/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(layoutSrc), false);
  assert.equal(/Baloo|Montserrat/.test(layoutSrc), false);
  assert.equal(/rel="preload"/.test(layoutSrc), false);
});

test('LofiWorkspace thay nền ~87 ảnh bị che bằng roomBackdrop (room-blur.webp) và lazy-load ảnh bài học', () => {
  const wsSrc = read('src', 'components', 'goc-hoc', 'LofiWorkspace.tsx');
  const wsCss = read('src', 'components', 'goc-hoc', 'lofi-workspace.module.css');

  assert.equal(wsSrc.includes('scene-data'), false, 'không import scene-data vốn chỉ phục vụ nền bị che');
  assert.equal(wsSrc.includes('/goc-hoc/room.webp'), false);
  assert.equal(wsSrc.includes('/goc-hoc/items/'), false);
  assert.equal(wsSrc.includes('/goc-hoc/swag.png'), false);
  assert.equal(wsSrc.includes('/goc-hoc/front.webp'), false);
  assert.equal(wsSrc.includes('onPointerMove'), false);

  assert.match(wsSrc, /className=\{styles\.roomBackdrop\}/);
  assert.match(wsCss, /\.roomBackdrop\s*\{[\s\S]*\/goc-hoc\/room-blur\.webp/);
  assert.equal(/\.glowsLayer|\.cloudDrift|\.bulbTwinkle/.test(wsCss), false);

  const imgTags = [...wsSrc.matchAll(/<img[\s\S]*?\/>/g)].map((m) => m[0]);
  assert.ok(imgTags.length >= 2, 'vẫn giữ các thẻ img biểu đồ minh hoạ bài học');
  for (const tag of imgTags) {
    assert.match(tag, /loading="lazy"/, `thẻ img thiếu loading="lazy": ${tag}`);
    assert.match(tag, /decoding="async"/, `thẻ img thiếu decoding="async": ${tag}`);
  }
});

test('LofiWorkspace giữ prewarm-gate.ts cho Python, tắt Worker trùng ở /practice & /ide và nạp lười SQL', () => {
  const wsSrc = read('src', 'components', 'goc-hoc', 'LofiWorkspace.tsx');

  assert.match(wsSrc, /import \{ shouldPrewarm \} from '@\/components\/python-studio\/prewarm-gate';/);
  assert.match(
    wsSrc,
    /activeScreen === 'lesson' && !isSql && shouldPrewarm\(lessonContent\)/,
  );
  assert.match(wsSrc, /pyRunnerRef\.current\?\.dispose\(\)/);
  assert.match(wsSrc, /buildSqlitePreviewScript/);
});

test('LofiPhoneMockup khai báo đủ width/height và decoding cho phone-frame.webp', () => {
  const src = read('src', 'components', 'ui', 'LofiPhoneMockup.tsx');
  assert.match(src, /\/goc-hoc\/items\/page\/phone-frame\.webp/);
  assert.match(src, /width=\{573\}/);
  assert.match(src, /height=\{1100\}/);
  assert.match(src, /decoding="async"/);
});

test('Landmark <main>, thứ bậc heading h1->h2->h3 sạch và profile/page.tsx không còn inline style', () => {
  const views = [
    ['src', 'components', 'goc-hoc', 'LofiWorkspace.tsx'],
    ['src', 'components', 'onboarding', 'OnboardingSurveyView.tsx'],
    ['src', 'app', 'profile', 'page.tsx'],
    ['src', 'components', 'auth', 'DoorAuthView.tsx'],
    ['src', 'components', 'bookshelf', 'LofiConceptCardView.tsx'],
  ];
  for (const p of views) {
    const src = read(...p);
    const label = p.join('/');
    assert.match(src, /<main\b/, `${label} phải có landmark <main>`);
    assert.match(src, /<h1\b/, `${label} phải có tiêu đề <h1>`);
  }

  const practiceSrc = read('src', 'components', 'practice', 'DailyPracticeView.tsx');
  assert.equal(/<h3\b/.test(practiceSrc), false, 'DailyPracticeView dùng <h2> trực tiếp dưới <h1> của LofiWorkspace');

  const phoneProfileSrc = read('src', 'components', 'profile', 'LofiPhoneProfile.tsx');
  assert.match(phoneProfileSrc, /<h2 className=\{styles\.userName\}/);
  assert.match(phoneProfileSrc, /<h3 className=\{styles\.courseName\}/);
  assert.match(phoneProfileSrc, /<h3 className=\{styles\.modalTitle\}/);
  assert.equal(/<h4\b/.test(phoneProfileSrc), false, 'LofiPhoneProfile không nhảy cấp sang <h4>');

  const profilePageSrc = read('src', 'app', 'profile', 'page.tsx');
  assert.equal(/style=\{\{/.test(profilePageSrc), false, 'profile/page.tsx không dùng inline style={{}}');
});

test('Các CSS module Lofi đều hỗ trợ @media (prefers-reduced-motion: reduce)', () => {
  const cssFiles = [
    ['src', 'components', 'goc-hoc', 'lofi-workspace.module.css'],
    ['src', 'components', 'ui', 'lofi-ui.module.css'],
    ['src', 'components', 'profile', 'phone-profile.module.css'],
  ];
  for (const p of cssFiles) {
    const css = read(...p);
    assert.match(
      css,
      /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
      `${p.join('/')} phải tắt chuyển động khi người học bật prefers-reduced-motion`,
    );
  }
});
