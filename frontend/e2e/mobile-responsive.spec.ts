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
// Đại diện khóa dùng JS legacy (/courses/db_design) đã đi cùng trang của nó ngày
// 25/11/2026 — đường đó nay chuyển hướng về Tủ sách. Bản trước đo thêm /courses/java (giáo trình dài nhất, 110 bài): java đã rời
// danh mục tĩnh 13/10/2026 nên route động trả 404, đo một trang 404 là đo vô ích.
for (const path of ['/', '/courses/python_advanced', '/bookshelf']) {
  test(`không tràn ngang: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500); // chờ font/script legacy dựng xong nội dung
    await expectNoHorizontalOverflow(page, path);
  });
}

test('trang chủ dẫn vào Tủ sách, đường khoá học cũ chuyển về đó', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const link = page.locator('#courseLink');
  await expect(link).toHaveAttribute('href', '/bookshelf/python');
  // Không còn liên kết nào tới trang khoá học cũ.
  await expect(page.locator('a[href^="/courses/"]')).toHaveCount(0);

  await page.goto('/courses/python_advanced?lesson=19', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/bookshelf\/python\?lesson=19$/);
  // `?lesson=` mở đúng mục lục của chặng chứa bài đó (bài 20 thuộc chặng 2).
  await expect(page.getByRole('link', { name: /Bài 20 · Lấy một phần tử/ })).toBeVisible();

  // `/ide` phải còn một lối vào THẤY ĐƯỢC cho người chưa mở bài nào.
  await page.goto('/bookshelf', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('a[href="/ide"]').first()).toBeVisible();
});

// 28/11/2026: đo ở 390px — 93/127 hoạt ảnh đang chạy nằm ngoài màn mà vẫn bị tính style mỗi khung. Engine tạm dừng
// cái ngoài màn (IntersectionObserver); ca này đòi ĐÚNG hai chiều: ngoài màn không cái nào chạy, trong màn vẫn chạy.
test('điện thoại: hoạt ảnh Góc học ngoài màn tạm dừng, trong màn vẫn chạy', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          let trongChay = 0;
          let ngoaiChay = 0;
          for (const el of document.querySelectorAll('.bulb i, .glowi, .star')) {
            const r = el.getBoundingClientRect();
            const trong = r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight && r.width * r.height > 0;
            if (!el.getAnimations().some((a) => a.playState === 'running')) continue;
            if (trong) trongChay++;
            else ngoaiChay++;
          }
          return { coTrong: trongChay > 0, ngoaiChay };
        }),
      { timeout: 30_000 },
    )
    .toEqual({ coTrong: true, ngoaiChay: 0 });
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
  expect(hrefs).toEqual(['/bookshelf/python']); // một cửa: không /ide, không /lesson/…
  expect((await request.get(hrefs[0])).status(), 'liên kết trong nav dẫn tới trang không mở được').toBe(200);

  const curricula = JSON.parse(
    readFileSync(join(__dirname, '..', 'src', 'lib', 'curricula.json'), 'utf8'),
  ) as { CURRICULA: { python_advanced: { modules: { title: string }[] } } };
  const modules = curricula.CURRICULA.python_advanced.modules;
  expect(modules.length).toBeGreaterThan(0);
  for (const m of modules) expect(nav, `thiếu học phần "${m.title}" trong nav SSR`).toContain(m.title);
});
