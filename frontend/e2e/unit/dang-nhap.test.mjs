/**
 * ĐĂNG NHẬP / ĐĂNG KÝ — lõi không-React (`src/lib/auth-session.ts`).
 *
 * VÌ SAO FILE NÀY TỒN TẠI: trang đăng nhập của nhánh `test` là bản xem trước (không nơi nào gọi `/auth/login`; chữ
 * "đang ở chế độ xem trước UI"), nên chưa từng có ca nào canh phần QUAN TRỌNG của một trang đăng ký trên nền tảng
 * "khách học ngay": khách bấm Đăng ký thì phải đi `/api/auth/upgrade` (giữ tiến độ), không phải `/auth/register` (tạo user mới,
 * tiến độ ở lại tài khoản khách). Các ca dưới đọc CHÍNH mã nguồn, không chép luật.
 *
 * ABLATION (28/11/2026, 18 ca) — gỡ từng mảnh rồi đọc dòng `fail` THẬT:
 *   laKhach luôn false (khách đi register, mất tiến độ)              → 2 đỏ
 *   upgrade bằng fetch trần (không đính Bearer của khách)            → 1 đỏ
 *   bỏ luuPhienMoi (báo thành công mà không lưu phiên)               → 3 đỏ
 *   bỏ credentials: 'include' (cookie refresh bị bỏ)                 → 2 đỏ
 *   PHONE_REGEX frontend lệch backend                                → 2 đỏ
 *   đăng xuất không gọi server                                        → 1 đỏ
 *   dangXuat không còn xoá phiên ở máy / xoaPhien quên xoá access     → 2 đỏ / 2 đỏ
 *   loaiTaiKhoan coi mọi token là tài khoản thật                      → 3 đỏ
 *   upgrade gọi `/auth/upgrade` Ở GỐC (gateway chỉ phục vụ /api/...)   → 2 đỏ
 *   apiFetch tạo khách cả khi refresh lỗi tạm (gỡ `coPhienLuu`)       → 1 đỏ
 *   apiFetch đảo điều kiện (chỉ tạo khách khi CÒN phiên)             → 2 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');

// Giả trình duyệt TRƯỚC khi nạp thư viện (api.ts chỉ chạm window/localStorage/document khi được gọi).
const kho = new Map();
globalThis.window = { __PE_API_ORIGIN: 'http://api.test' };
globalThis.localStorage = {
  getItem: (k) => (kho.has(k) ? kho.get(k) : null),
  setItem: (k, v) => void kho.set(k, String(v)),
  removeItem: (k) => void kho.delete(k),
};
globalThis.document = { cookie: '' };

const {
  PHONE_REGEX, MAT_KHAU_TOI_THIEU, laKhach, loaiTaiKhoan, emailTuToken, nhanTaiKhoan, loiTuPhanHoi, kiemTraDangKy, soanDangKy,
  dangNhap, dangKy, dangXuat,
} = await import('../../src/lib/auth-session.ts');
const { apiFetch } = await import('../../src/lib/api.ts');

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (email) => `${b64({ alg: 'HS256' })}.${b64({ sub: 7, email })}.chu-ky`;
const KHACH = token('guest_0a1b2c3d-0000-4000-8000-000000000000@guest.local');
const THAT = token('nguoi@dung.vn');

/** Thay fetch bằng bản ghi lại; `tra` quyết định response. */
function gia(tra) {
  const goi = [];
  globalThis.fetch = async (url, opts = {}) => {
    goi.push({ url: String(url), opts, auth: new Headers(opts.headers || {}).get('Authorization') });
    return tra(String(url));
  };
  return goi;
}
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const F = { ten: 'Lan', dinhDanh: 'lan@x.vn', matKhau: 'matkhau123', nhapLai: 'matkhau123' };

test.beforeEach(() => { kho.clear(); globalThis.document.cookie = ''; });

test('luật mật khẩu + số điện thoại bằng ĐÚNG bản của backend (đọc register.dto.ts)', () => {
  const dto = readFileSync(join(ROOT, 'src', 'auth', 'dto', 'register.dto.ts'), 'utf8');
  const re = dto.match(/PHONE_REGEX = (\/.*\/);/)?.[1];
  assert.ok(re, 'không tìm thấy PHONE_REGEX ở backend');
  assert.equal(PHONE_REGEX.toString(), re, 'PHONE_REGEX frontend lệch backend');
  assert.match(dto, new RegExp(`@MinLength\\(${MAT_KHAU_TOI_THIEU},`), 'MAT_KHAU_TOI_THIEU lệch @MinLength của backend');
});

test('laKhach: chỉ true với email @guest.local; rác, null, token thật đều false', () => {
  assert.equal(laKhach(KHACH), true);
  assert.equal(laKhach(THAT), false);
  assert.equal(laKhach(null), false);
  assert.equal(laKhach(''), false);
  assert.equal(laKhach('khong-phai-jwt'), false);
  assert.equal(laKhach('a.%%%.c'), false);
});

test('loiTuPhanHoi: câu của backend thắng, rồi tới câu theo mã', () => {
  assert.equal(loiTuPhanHoi(409, { error: { message: 'Email đã được sử dụng.' } }), 'Email đã được sử dụng.');
  assert.equal(loiTuPhanHoi(400, { error: { message: ['Mật khẩu ngắn', 'Email sai'] } }), 'Mật khẩu ngắn · Email sai');
  assert.match(loiTuPhanHoi(401, null), /không đúng/);
  assert.match(loiTuPhanHoi(429, {}), /quá nhiều lần/);
  assert.match(loiTuPhanHoi(503, null), /bận/);
  assert.ok(loiTuPhanHoi(418, null).length > 0);
});

test('kiemTraDangKy: từng nhánh lỗi, và form đúng thì null', () => {
  assert.equal(kiemTraDangKy(F), null);
  assert.equal(kiemTraDangKy({ ...F, dinhDanh: '0912345678' }), null);
  assert.equal(kiemTraDangKy({ ...F, dinhDanh: '+84912345678' }), null);
  assert.match(kiemTraDangKy({ ...F, ten: '  ' }), /tên/i);
  assert.match(kiemTraDangKy({ ...F, dinhDanh: '' }), /email hoặc số điện thoại/i);
  assert.match(kiemTraDangKy({ ...F, dinhDanh: '12345' }), /10 số/);
  assert.match(kiemTraDangKy({ ...F, matKhau: 'ngan', nhapLai: 'ngan' }), /ít nhất 8/);
  assert.match(kiemTraDangKy({ ...F, nhapLai: 'khac' }), /chưa giống/);
});

test('soanDangKy: có @ là email, không thì phone; tên được cắt khoảng trắng', () => {
  assert.deepEqual(soanDangKy({ ...F, ten: ' Lan ' }), { name: 'Lan', password: 'matkhau123', email: 'lan@x.vn' });
  assert.deepEqual(soanDangKy({ ...F, dinhDanh: '0912345678' }), { name: 'Lan', password: 'matkhau123', phone: '0912345678' });
});

test('dangNhap: gửi MỘT định danh ở field email + credentials include; thành công thì LƯU phiên và đặt cookie mốc', async () => {
  const goi = gia(() => json(200, { ok: true, access: 'tok-moi', refreshExpiresIn: 3600 }));
  const kq = await dangNhap('  nguoi@dung.vn ', 'matkhau123');
  assert.deepEqual(kq, { ok: true, nangCap: false });
  assert.equal(goi.length, 1);
  assert.equal(goi[0].url, 'http://api.test/auth/login');
  assert.equal(goi[0].opts.credentials, 'include');
  assert.deepEqual(JSON.parse(goi[0].opts.body), { email: 'nguoi@dung.vn', password: 'matkhau123' });
  assert.equal(kho.get('pe_access'), 'tok-moi');
  assert.match(globalThis.document.cookie, /pe_has_session=1;.*max-age=3600/);
});

test('dangNhap: sai mật khẩu (401) KHÔNG lưu gì và trả câu của backend; thiếu ô thì không gọi mạng', async () => {
  const goi = gia(() => json(401, { error: { message: 'Email/số điện thoại hoặc mật khẩu không đúng' } }));
  const kq = await dangNhap('a@b.vn', 'sai');
  assert.equal(kq.ok, false);
  assert.match(kq.loi, /không đúng/);
  assert.equal(kho.size, 0);
  assert.equal(globalThis.document.cookie, '');
  goi.length = 0;
  assert.equal((await dangNhap('', 'x')).ok, false);
  assert.equal(goi.length, 0, 'thiếu ô mà vẫn gọi mạng');
});

test('dangNhap: 200 nhưng KHÔNG có access thì không được báo thành công', async () => {
  gia(() => json(200, { ok: true }));
  const kq = await dangNhap('a@b.vn', 'x1234567');
  assert.equal(kq.ok, false);
  assert.equal(kho.size, 0);
});

test('dangKy: KHÁCH đi /api/auth/upgrade và đính Bearer của khách (giữ tiến độ)', async () => {
  const goi = gia(() => json(200, { ok: true, upgraded: true, access: 'tok-that', refreshExpiresIn: 100 }));
  // Đúng như trên trình duyệt: access của khách nằm trong localStorage (apiFetch đọc từ đó, và tự refresh khi hết hạn).
  kho.set('pe_access', KHACH);
  const kq = await dangKy(F, KHACH);
  assert.deepEqual(kq, { ok: true, nangCap: true });
  assert.equal(goi[0].url, 'http://api.test/api/auth/upgrade');
  assert.equal(goi[0].auth, `Bearer ${KHACH}`);
  assert.equal(goi[0].opts.credentials, 'include');
  assert.equal(kho.get('pe_access'), 'tok-that', 'access của khách phải bị thay bằng access của tài khoản thật');
});

test('đường dẫn: mọi /auth/* frontend gọi Ở GỐC phải nằm trong PREFIX_EXCLUDED của gateway; upgrade phải đi dưới /api', () => {
  // Gateway (src/api-gateway/api-gateway.setup.ts) đặt prefix `/api` cho MỌI route, trừ danh sách path kế thừa từ bản Django.
  // `/auth/upgrade` là route MỚI nên không có trong danh sách ⇒ chỉ sống ở `/api/auth/upgrade`; gọi ở gốc là 404 trên production.
  // (Đã xảy ra 28/11/2026: unit và e2e đều xanh vì chúng giả API, không đi qua gateway thật.)
  const gw = readFileSync(join(ROOT, 'src', 'api-gateway', 'api-gateway.setup.ts'), 'utf8');
  const khoi = gw.match(/const PREFIX_EXCLUDED = \[([\s\S]*?)\n\];/);
  assert.ok(khoi, 'không đọc được PREFIX_EXCLUDED');
  const ngoaiLe = new Set([...khoi[1].matchAll(/path: '([^']+)'/g)].map((m) => m[1]));
  assert.ok(ngoaiLe.has('auth/login') && ngoaiLe.has('health'), 'đọc PREFIX_EXCLUDED ra rỗng hoặc sai');
  const nguon = ['api.ts', 'auth-session.ts'].map((f) => readFileSync(join(HERE, '..', '..', 'src', 'lib', f), 'utf8')).join('\n');
  const goiGoc = [...nguon.matchAll(/\$\{(?:api)?[oO]rigin\(\)\}\/(auth\/[a-z/]+)/g)].map((m) => m[1]);
  assert.ok(goiGoc.length >= 5, `chỉ thấy ${goiGoc.length} lời gọi /auth/* ở gốc (đáng ra ≥ 5): regex lệch khỏi mã`);
  for (const p of goiGoc) {
    assert.ok(ngoaiLe.has(p), `frontend gọi /${p} Ở GỐC nhưng gateway chỉ phục vụ nó dưới /api (thiếu trong PREFIX_EXCLUDED) ⇒ 404`);
  }
  const apiFetchTran = [...nguon.matchAll(/apiFetch\('\/(auth\/[a-z/]+)'/g)].map((m) => m[1]);
  assert.deepEqual(apiFetchTran.filter((p) => !ngoaiLe.has(p)), [], 'apiFetch gọi /auth/* ở gốc mà gateway không phục vụ');
  assert.match(nguon, /apiFetch\('\/api\/auth\/upgrade'/, 'dangKy của khách không gọi /api/auth/upgrade');
});

/** Access hết hạn: lời gọi nghiệp vụ trả 401 cho tới khi có access mới; `refresh` = mã của /auth/refresh (0 = mất mạng). */
function hetHan(refresh) {
  kho.clear();
  kho.set('pe_access', THAT);
  document.cookie = 'pe_has_session=1';
  return gia((url) => {
    if (url.endsWith('/auth/refresh')) {
      if (refresh === 0) throw new TypeError('mat mang');
      return json(refresh, {});
    }
    if (url.endsWith('/auth/guest')) return json(200, { access: 'tok-khach-moi', refreshExpiresIn: 100 });
    return kho.get('pe_access') === 'tok-khach-moi' ? json(200, { ok: true }) : json(401, {});
  });
}

test('apiFetch: refresh lỗi TẠM (503, 429, mất mạng) KHÔNG tạo khách mới, phiên đang học còn nguyên', async () => {
  for (const ma of [503, 429, 0]) {
    const goi = hetHan(ma);
    const res = await apiFetch('/api/stats');
    assert.equal(res.status, 401, `refresh ${ma}`);
    assert.ok(!goi.some((g) => g.url.endsWith('/auth/guest')), `refresh ${ma} mà đã tạo khách: ghi đè phiên đang học`);
    assert.equal(kho.get('pe_access'), THAT, `refresh ${ma}: access đang lưu bị thay`);
  }
});

test('apiFetch: refresh bị TỪ CHỐI (401) thì phiên đã chết, mới tạo khách mới và gọi lại', async () => {
  const goi = hetHan(401);
  const res = await apiFetch('/api/stats');
  assert.equal(res.status, 200);
  assert.ok(goi.some((g) => g.url.endsWith('/auth/guest')));
  assert.equal(kho.get('pe_access'), 'tok-khach-moi');
  kho.clear();
  document.cookie = '';
});

test('dangKy: người CHƯA có phiên (hoặc đã là tài khoản thật) đi /auth/register, không đính Bearer', async () => {
  for (const access of [null, THAT]) {
    const goi = gia(() => json(200, { ok: true, access: 'tok-moi', refreshExpiresIn: 100 }));
    const kq = await dangKy(F, access);
    assert.deepEqual(kq, { ok: true, nangCap: false });
    assert.equal(goi[0].url, 'http://api.test/auth/register');
    assert.equal(goi[0].auth, null);
  }
});

test('dangKy: form sai thì KHÔNG gọi mạng; 409 trùng email trả câu của backend và không lưu phiên', async () => {
  const goi = gia(() => json(409, { error: { message: 'Email đã được sử dụng. Hãy đăng nhập bằng tài khoản đó.' } }));
  assert.equal((await dangKy({ ...F, nhapLai: 'khac' }, null)).ok, false);
  assert.equal(goi.length, 0, 'form sai mà vẫn gọi mạng');
  kho.set('pe_access', KHACH);
  const kq = await dangKy(F, KHACH);
  assert.equal(kq.ok, false);
  assert.match(kq.loi, /đã được sử dụng/);
  assert.equal(kho.get('pe_access'), KHACH, 'trùng email mà access của khách bị thay — khách sẽ mất phiên cũ');
});

test('lỗi mạng: trả câu hướng dẫn chờ máy chủ thức dậy, không ném', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  for (const kq of [await dangNhap('a@b.vn', 'x1234567'), await dangKy(F, null)]) {
    assert.equal(kq.ok, false);
    assert.match(kq.loi, /30 giây/);
  }
});

test('loaiTaiKhoan / emailTuToken / nhanTaiKhoan: ba loại, rác không ném, số điện thoại không lộ email giả', () => {
  assert.equal(loaiTaiKhoan(null), 'khong');
  assert.equal(loaiTaiKhoan('rac'), 'khong');
  assert.equal(loaiTaiKhoan(KHACH), 'khach');
  assert.equal(loaiTaiKhoan(THAT), 'that');
  assert.equal(emailTuToken(THAT), 'nguoi@dung.vn');
  assert.equal(emailTuToken('a.%%%.c'), null);
  assert.equal(nhanTaiKhoan('0912345678@phone.local'), '0912345678');
  assert.equal(nhanTaiKhoan('nguoi@dung.vn'), 'nguoi@dung.vn');
});

test('dangXuat: POST /auth/logout kèm cookie, rồi xoá phiên ở máy (access + cookie mốc)', async () => {
  const goi = gia(() => json(200, { ok: true }));
  kho.set('pe_access', THAT);
  kho.set('pe_refresh', 'cu');
  globalThis.document.cookie = 'pe_has_session=1; path=/';
  await dangXuat();
  assert.equal(goi.length, 1);
  assert.equal(goi[0].url, 'http://api.test/auth/logout');
  assert.equal(goi[0].opts.credentials, 'include');
  assert.equal(kho.has('pe_access'), false, 'đăng xuất mà access vẫn còn');
  assert.equal(kho.has('pe_refresh'), false);
  assert.match(globalThis.document.cookie, /pe_has_session=;.*max-age=0/);
});

test('dangXuat: MẤT MẠNG vẫn xoá phiên ở máy (người bấm Đăng xuất không được còn bị coi là đã đăng nhập)', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  kho.set('pe_access', THAT);
  await dangXuat();
  assert.equal(kho.has('pe_access'), false);
});
