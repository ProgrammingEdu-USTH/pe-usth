// Đăng nhập / đăng ký / đăng xuất trên trình duyệt THẬT, API giả bằng page.route — không cần backend hay DB.
//
// Canh những thứ mà unit test (lõi `auth-session.ts`) không thấy được:
//  · trang CÔNG KHAI mở ra KHÔNG gọi một lời nào tới API (bot quét web rơi vào đây; `apiFetch` gặp 401 là tự tạo khách);
//  · luồng thật: điền form → đúng request → lưu phiên → về trang chủ;
//  · khách bấm Đăng ký thì request đi `/api/auth/upgrade` KÈM Bearer của khách (giữ tiến độ), không phải `/auth/register`;
//  · người đã đăng nhập vào `/login` thấy nút Đăng xuất chứ không thấy form, và bấm thì phiên ở máy bị xoá.
import { expect, test, type Page, type Route } from '@playwright/test';

const API = process.env.E2E_API_URL || 'http://localhost:5000';
const ORIGIN = 'http://localhost:3000';

const token = (email: string) =>
  ['h', Buffer.from(JSON.stringify({ sub: 7, email })).toString('base64url'), 's'].join('.');
const KHACH = token('guest_0a1b2c3d-0000-4000-8000-000000000000@guest.local');
const THAT = token('nguoi@dung.vn');

type Goi = { method: string; path: string; auth: string | null; body: unknown };

/** Giả API; `traLoi` quyết định phản hồi riêng cho /auth/*, còn lại trả 200 rỗng để trang chủ dựng được. */
async function giaApi(page: Page, traLoi: (path: string, method: string) => { status: number; body: unknown }) {
  const goi: Goi[] = [];
  const cors = { 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Credentials': 'true' };
  await page.route(`${API}/**`, async (route: Route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Headers': 'authorization,content-type',
          'Access-Control-Allow-Methods': 'GET,POST',
        },
      });
    }
    goi.push({
      method: req.method(),
      path,
      auth: await req.headerValue('authorization'),
      body: req.method() === 'POST' ? req.postDataJSON() : null,
    });
    // Gateway thật không phục vụ /auth/upgrade ở gốc (chỉ /api/auth/upgrade): giả đúng như vậy, không thì spec xanh trong khi production 404.
    const r = path === '/auth/upgrade'
      ? { status: 404, body: {} }
      : /^[/](api[/])?auth[/]/.test(path)
        ? traLoi(path, req.method())
        : { status: 200, body: { ok: true } };
    return route.fulfill({ status: r.status, contentType: 'application/json', headers: cors, body: JSON.stringify(r.body) });
  });
  return goi;
}

// `main` chứ không `page`: Next tự thêm một `role="alert"` (bộ thông báo chuyển trang) nên getByRole('alert') trên cả trang trúng hai phần tử.
const luuTru = (page: Page) => page.evaluate(() => localStorage.getItem('pe_access'));
const coPhien = (page: Page, access: string) => page.addInitScript((a) => localStorage.setItem('pe_access', a), access);

test('mở /login và /register KHÔNG gọi API; ô nhập đủ nhãn và đủ cỡ cho điện thoại', async ({ page }) => {
  const goi = await giaApi(page, () => ({ status: 500, body: {} }));
  for (const path of ['/login', '/register']) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const o of await page.locator('input').all()) {
      const px = await o.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      const cao = await o.evaluate((el) => el.getBoundingClientRect().height);
      expect(px, `ô nhập ${path} dưới 16px: iOS tự phóng trang khi focus`).toBeGreaterThanOrEqual(16);
      expect(cao, `ô nhập ${path} thấp hơn 44px`).toBeGreaterThanOrEqual(44);
    }
  }
  await expect(page.getByLabel('Email hoặc số điện thoại')).toBeVisible();
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toBeVisible();
  for (const path of ['/login', '/register']) {
    await page.goto(path, { waitUntil: 'networkidle' });
    for (const a of await page.locator('main a').all()) {
      const cao = await a.evaluate((el) => el.getBoundingClientRect().height);
      expect(cao, `liên kết "${(await a.innerText()).trim()}" ở ${path} thấp hơn 44px`).toBeGreaterThanOrEqual(44);
    }
  }
  expect(goi, 'trang công khai mở ra mà đã gọi API').toEqual([]);
});

test('đăng nhập SAI: hiện câu của backend và KHÔNG lưu phiên', async ({ page }) => {
  await giaApi(page, () => ({ status: 401, body: { error: { message: 'Email/số điện thoại hoặc mật khẩu không đúng' } } }));
  await page.goto('/login');
  await page.getByLabel('Email hoặc số điện thoại').fill('nguoi@dung.vn');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('matkhau-sai');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('không đúng');
  await expect(page).toHaveURL(/\/login$/);
  expect(await luuTru(page)).toBeNull();
});

test('đăng nhập ĐÚNG: gửi một định danh ở field email, lưu phiên, về trang chủ', async ({ page }) => {
  const goi = await giaApi(page, () => ({ status: 200, body: { ok: true, access: THAT, refreshExpiresIn: 3600 } }));
  await page.goto('/login');
  await page.getByLabel('Email hoặc số điện thoại').fill('0912345678');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('matkhau123');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/`);
  const login = goi.find((g) => g.path === '/auth/login');
  expect(login?.method).toBe('POST');
  expect(login?.body).toEqual({ email: '0912345678', password: 'matkhau123' });
  expect(await luuTru(page)).toBe(THAT);
});

test('KHÁCH đăng ký: ghi chú "giữ tiến độ", request đi /api/auth/upgrade kèm Bearer của khách, phiên được thay', async ({ page }) => {
  await coPhien(page, KHACH);
  const goi = await giaApi(page, () => ({ status: 200, body: { ok: true, upgraded: true, access: THAT, refreshExpiresIn: 3600 } }));
  await page.goto('/register');
  await expect(page.getByRole('note')).toContainText('GIỮ nguyên tiến độ');
  await page.getByLabel('Tên của bạn').fill('Lan');
  await page.getByLabel('Email hoặc số điện thoại').fill('lan@dung.vn');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('matkhau123');
  await page.getByLabel('Nhập lại mật khẩu').fill('matkhau123');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/`);
  const up = goi.find((g) => g.path === '/api/auth/upgrade');
  expect(up, 'khách đăng ký mà không đi /api/auth/upgrade — tiến độ sẽ ở lại tài khoản khách').toBeTruthy();
  expect(up?.auth).toBe(`Bearer ${KHACH}`);
  expect(up?.body).toEqual({ name: 'Lan', password: 'matkhau123', email: 'lan@dung.vn' });
  expect(goi.some((g) => g.path === '/auth/register')).toBe(false);
  expect(await luuTru(page)).toBe(THAT);
});

test('đăng ký trùng email (409): hiện câu backend, KHÔNG thay phiên khách', async ({ page }) => {
  await coPhien(page, KHACH);
  await giaApi(page, () => ({ status: 409, body: { error: { message: 'Email đã được sử dụng. Hãy đăng nhập bằng tài khoản đó.' } } }));
  await page.goto('/register');
  await page.getByLabel('Tên của bạn').fill('Lan');
  await page.getByLabel('Email hoặc số điện thoại').fill('co-san@dung.vn');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('matkhau123');
  await page.getByLabel('Nhập lại mật khẩu').fill('matkhau123');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('đã được sử dụng');
  expect(await luuTru(page)).toBe(KHACH);
});

test('người ĐÃ đăng nhập vào /login: thấy Đăng xuất (không có form); bấm thì thu hồi phiên và xoá access', async ({ page }) => {
  await coPhien(page, THAT);
  const goi = await giaApi(page, () => ({ status: 200, body: { ok: true } }));
  await page.goto('/login');
  await expect(page.getByText('nguoi@dung.vn')).toBeVisible();
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/`);
  expect(goi.some((g) => g.path === '/auth/logout' && g.method === 'POST')).toBe(true);
  expect(await luuTru(page)).toBeNull();
});
