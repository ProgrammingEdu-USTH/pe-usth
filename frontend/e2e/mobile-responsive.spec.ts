// Spec mobile responsive (memory-plan/08) — viewport 375×812.
//
// TIÊU CHÍ (DoD): không tràn ngang + nội dung chính hiển thị ở mọi trang.
//
// Chỉ còn các trang KHÔNG cần đăng nhập: trang chủ (lưới khóa học) và trang chi
// tiết từng khóa. Bản trước đo thêm login/register/dashboard/questionaire — các
// trang đó đã gỡ khỏi frontend nên spec đi theo, và nhờ không còn gọi
// `helpers.login()` nên chạy được trong CI mà không cần backend.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { test, expect, Page } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

type Offender = { sel: string; left: number; right: number };
type Audit = { vw: number; scrollW: number; offenders: Offender[] };

/** Đo tràn ngang: scrollWidth + phần tử visible vượt mép phải/trái viewport
 *  (bỏ qua phần tử nằm trong container tự cuộn ngang hoặc bị ancestor clip). */
async function auditMobile(page: Page): Promise<Audit> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const offenders: { sel: string; left: number; right: number }[] = [];
    const isClippedOrScrollable = (el: Element): boolean => {
      let node = el.parentElement;
      while (node && node !== document.body) {
        const cs = getComputedStyle(node);
        if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) return true;
        node = node.parentElement;
      }
      return false;
    };
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      if (r.right <= vw + 2 && r.left >= -2) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
      if (isClippedOrScrollable(el)) return;
      offenders.push({
        sel:
          el.tagName.toLowerCase() +
          (el.id ? '#' + el.id : '') +
          (typeof el.className === 'string' && el.className.trim()
            ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
            : ''),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
    });
    return { vw, scrollW: document.documentElement.scrollWidth, offenders: offenders.slice(0, 10) };
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const a = await auditMobile(page);
  expect
    .soft(a.scrollW, `${label}: scrollWidth ${a.scrollW} > viewport ${a.vw}`)
    .toBeLessThanOrEqual(a.vw + 1);
  expect
    .soft(a.offenders, `${label}: phần tử tràn viewport → ${JSON.stringify(a.offenders)}`)
    .toHaveLength(0);
}

// ── Trang chủ + chi tiết khóa học ───────────────────────────────────────────
// Một đại diện cho mỗi nhánh render: khóa React thuần (python_advanced) và khóa
// dùng JS legacy (db_design — route tĩnh riêng nên vẫn mở được bằng đường dẫn).
// Bản trước đo thêm /courses/java (giáo trình dài nhất, 110 bài): java đã rời
// danh mục tĩnh 13/10/2026 nên route động trả 404, đo một trang 404 là đo vô ích.
for (const path of ['/', '/courses/python_advanced', '/courses/db_design']) {
  test(`không tràn ngang: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500); // chờ font/script legacy dựng xong nội dung
    await expectNoHorizontalOverflow(page, path);
  });
}

test('trang chủ chỉ còn ô Python và ô công cụ Python IDE', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Loại khối <nav aria-label="Điều hướng chính"> (chỉ-cho-máy-đọc, SSR) khỏi phép đếm: nó cũng trỏ
  // `/courses/python_advanced` nhưng KHÔNG phải một ô người dùng thấy; ca ngay dưới canh riêng nó. Chỉ loại ĐÚNG khối
  // đó — liên kết thứ hai ở bất kỳ chỗ nào khác của cảnh vẫn làm ca này đỏ.
  const tiles = page.locator('a[href^="/courses/"]:not(nav[aria-label="Điều hướng chính"] a)');
  // 13/10/2026: 6 khoá còn lại (cpp, java, htmlcss, db_design*) đã gỡ khỏi danh
  // mục tĩnh cho buổi dùng thử — xem src/lib/catalog.ts. Còn đúng một ô khoá.
  await expect(tiles).toHaveCount(1);
  const hrefs = await tiles.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(hrefs).toEqual(['/courses/python_advanced']);

  // 08/11/2026: ô "Python IDE" của trang chủ CŨ đã mất cùng `CatalogTile` khi
  // trang chủ đổi sang cảnh "Góc học" (4d5f86d). Đo trên production: trang chủ
  // có ĐÚNG MỘT liên kết nội bộ, `/courses/python_advanced`.
  //
  // Ca này vì vậy KHÔNG còn đòi `/ide` ở đây — nhưng nó cũng KHÔNG bỏ phép kiểm
  // đi. Nó chuyển assert sang ĐÚNG CHỖ `/ide` tới được bây giờ: trang khoá học,
  // nơi `SiteHeader` dựng lối vào. Bỏ hẳn assert là làm ca mất răng; đổi chỗ thì
  // nó vẫn đỏ vào ngày `/ide` thật sự mồ côi.
  await expect(page.locator('a[href="/ide"]')).toHaveCount(0);

  await tiles.click();
  await expect(page).toHaveURL(/\/courses\/python_advanced$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Python');

  // `/ide` phải còn một lối vào THẤY ĐƯỢC. 411 nút "Thử ngay trong IDE" ở màn
  // đọc là lối kia và `check-duong-toi.mjs` canh chúng; đây là lối cho người
  // CHƯA mở bài nào.
  await expect(page.locator('a[href="/ide"]').first()).toBeVisible();
});

// 23/11/2026: cảnh Góc học là DOM do engine.js dựng ở CLIENT, nên HTML thô máy chủ trả cho `/` từng có 0 liên kết,
// 0 tiêu đề, 0 chữ (đo trên bản build) — trình thu thập và trình đọc màn hình chỉ thấy <title>. Ca này đọc HTML THÔ
// (không chạy JS, không hydrate) và đòi khối <nav> có đủ: tên khoá, tên MỌI học phần (lấy từ curricula.json chứ không
// gõ tay), và đúng MỘT liên kết tới một trang mở được — cùng "một cửa" mà ca trên canh cho phần người dùng thấy.
test('trang chủ: HTML thô của máy chủ có điều hướng và chữ, không cần chạy JS', async ({ request }) => {
  const res = await request.get('/');
  expect(res.status()).toBe(200);
  const html = await res.text();
  const nav = html.match(/<nav aria-label="Điều hướng chính"[\s\S]*?<\/nav>/)?.[0];
  expect(nav, 'HTML thô của / không còn khối <nav aria-label="Điều hướng chính">').toBeTruthy();

  const hrefs = [...nav!.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  expect(hrefs).toEqual(['/courses/python_advanced']); // một cửa: không /ide, không /lesson/…
  expect((await request.get(hrefs[0])).status(), 'liên kết trong nav dẫn tới trang không mở được').toBe(200);

  const curricula = JSON.parse(
    readFileSync(join(__dirname, '..', 'src', 'lib', 'curricula.json'), 'utf8'),
  ) as { CURRICULA: { python_advanced: { modules: { title: string }[] } } };
  const modules = curricula.CURRICULA.python_advanced.modules;
  expect(modules.length).toBeGreaterThan(0);
  for (const m of modules) expect(nav, `thiếu học phần "${m.title}" trong nav SSR`).toContain(m.title);
});
