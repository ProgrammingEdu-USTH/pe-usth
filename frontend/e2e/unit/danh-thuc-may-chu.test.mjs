/**
 * ĐÁNH THỨC MÁY CHỦ: một lượt `GET /health` mỗi phiên, KHÔNG qua `apiFetch`.
 *
 * Lý lẽ đầy đủ ở `lib/danh-thuc-may-chu.ts`. Bộ này canh bốn thứ, mỗi thứ là một cách để việc
 * "làm cho đỡ chờ" thành việc có hại:
 *   1. đúng MỘT lượt mỗi phiên (không thì mỗi lần mount là một request);
 *   2. lượt gọi KHÔNG mang cookie, header, Authorization (nó chạy ở trang công khai);
 *   3. một lượt hỏng không được ném (ta không đọc kết quả);
 *   4. hai trang CÓ MOUNT nó, và component/hàm không dính `apiFetch` (đường tới người học, và
 *      `apiFetch` gặp 401 là tự tạo tài khoản khách — mỗi lượt quét của bot sinh một hàng).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { taoBoDanhThuc } from '../../src/lib/danh-thuc-may-chu.ts';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const doc = (...p) => readFileSync(join(GOC, ...p), 'utf8');
/** Bỏ chú thích TRƯỚC khi so — một câu văn xuôi nhắc `apiFetch` đã làm cổng đỏ oan nhiều lần. */
const boChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

function luuTruGia(truocDo = {}) {
  const kho = { ...truocDo };
  return { getItem: (k) => kho[k] ?? null, setItem: (k, v) => { kho[k] = String(v); }, kho };
}
function fetchGia() {
  const goi = [];
  const f = (url, init) => { goi.push({ url, init }); return Promise.resolve({}); };
  return { f, goi };
}

test('đánh thức: gọi đúng MỘT lần mỗi phiên, dù bộ đánh thức được dựng lại (mount hai lần)', () => {
  const luuTru = luuTruGia();
  const { f, goi } = fetchGia();
  // Dựng hai bộ riêng cùng một sessionStorage: StrictMode mount hai lần, hai trang liền nhau.
  assert.equal(taoBoDanhThuc({ fetch: f, luuTru, origin: 'https://api.x' })(), true);
  assert.equal(taoBoDanhThuc({ fetch: f, luuTru, origin: 'https://api.x' })(), false);
  const mot = taoBoDanhThuc({ fetch: f, luuTru, origin: 'https://api.x' });
  assert.equal(mot(), false);
  assert.equal(goi.length, 1, `đã gọi ${goi.length} lần`);
});

test('đánh thức: URL là <origin>/health, không cookie, không header, không đọc phản hồi', () => {
  const { f, goi } = fetchGia();
  taoBoDanhThuc({ fetch: f, luuTru: luuTruGia(), origin: 'https://api.x///' })();
  assert.equal(goi[0].url, 'https://api.x/health');
  assert.equal(goi[0].init.mode, 'no-cors');
  assert.equal(goi[0].init.credentials, 'omit', 'không được gửi cookie phiên');
  assert.equal(goi[0].init.keepalive, true);
  assert.equal(goi[0].init.cache, 'no-store');
  assert.equal(goi[0].init.headers, undefined, 'không header nào — nhất là Authorization');
  assert.equal(goi[0].init.method, undefined, 'GET mặc định');
});

test('đánh thức: lượt hỏng (reject hoặc ném đồng bộ) và sessionStorage bị chặn đều im lặng', async () => {
  const ruiRo = [];
  const onRej = (e) => ruiRo.push(e);
  process.on('unhandledRejection', onRej);
  try {
    taoBoDanhThuc({ fetch: () => Promise.reject(new Error('mạng')), luuTru: luuTruGia(), origin: 'https://api.x' })();
    assert.doesNotThrow(() => taoBoDanhThuc({
      fetch: () => { throw new TypeError('URL hỏng'); }, luuTru: luuTruGia(), origin: 'https://api.x',
    })());
    const hong = { getItem: () => { throw new Error('chặn'); }, setItem: () => { throw new Error('chặn'); } };
    const { f, goi } = fetchGia();
    const bo = taoBoDanhThuc({ fetch: f, luuTru: hong, origin: 'https://api.x' });
    assert.equal(bo(), true, 'storage chặn thì vẫn bắn được lần đầu');
    assert.equal(bo(), false, 'và cờ trong bộ nhớ chặn lần hai của CÙNG bộ');
    assert.equal(goi.length, 1);
    await new Promise((r) => setTimeout(r, 20));
    assert.deepEqual(ruiRo, [], 'một lượt hỏng không được thành unhandledRejection');
  } finally {
    process.off('unhandledRejection', onRej);
  }
});

test('đánh thức: không có fetch thì không làm gì', () => {
  const sao = globalThis.fetch;
  try {
    delete globalThis.fetch;
    assert.equal(taoBoDanhThuc({ luuTru: luuTruGia(), origin: 'https://api.x' })(), false);
  } finally {
    globalThis.fetch = sao;
  }
});

test('đánh thức: có MOUNT ở trang chủ và trang khoá học; KHÔNG ở trang bài học', () => {
  // Một hàm dựng xong mà không trang nào mount thì không đánh thức ai (lỗi thống trị của repo).
  const trangChu = boChuThich(doc('src', 'app', 'page.tsx'));
  const trangKhoa = boChuThich(doc('src', 'app', '(standalone)', 'courses', '[courseId]', 'CourseDetail.tsx'));
  assert.match(trangChu, /import DanhThucMayChu from '@\/components\/DanhThucMayChu'/);
  assert.match(trangChu, /<DanhThucMayChu\s*\/>/, 'trang chủ phải dựng <DanhThucMayChu />');
  assert.match(trangKhoa, /import DanhThucMayChu from '@\/components\/DanhThucMayChu'/);
  assert.match(trangKhoa, /<DanhThucMayChu\s*\/>/, 'trang khoá học phải dựng <DanhThucMayChu />');
  // Trang bài học tự gọi API qua apiFetch (máy chủ thức bằng chính lượt đó): đánh thức ở đó là thừa.
  const trangBai = boChuThich(doc('src', 'app', '(standalone)', 'lesson', 'python_advanced', 'page.tsx'));
  assert.doesNotMatch(trangBai, /DanhThucMayChu/);
});

test('đánh thức: component và hàm KHÔNG dính apiFetch (nó tự tạo tài khoản khách khi gặp 401)', () => {
  const cmp = boChuThich(doc('src', 'components', 'DanhThucMayChu.tsx'));
  const lib = boChuThich(doc('src', 'lib', 'danh-thuc-may-chu.ts'));
  assert.doesNotMatch(cmp, /apiFetch|ensureGuest/);
  assert.doesNotMatch(lib, /apiFetch|ensureGuest/);
  // Component chỉ được lấy ORIGIN từ api.ts, không lấy hàm gọi.
  assert.match(cmp, /import \{ apiOrigin \} from '@\/lib\/api'/);
  // Hàm thuần không import gì: test nạp thẳng `.ts` bằng strip-types.
  assert.doesNotMatch(lib, /^\s*import\s/m, 'lib/danh-thuc-may-chu.ts không được import gì');
  // Bắn trong effect (sau mount), không ở tầng module: tầng module cũng chạy khi prerender.
  assert.match(cmp, /useEffect\(\(\) => \{[\s\S]*taoBoDanhThuc\(/);
});

/*
 * ABLATE (ghi số khi chạy): bỏ cờ `daBan` → ca 1 đỏ · gõ `credentials: 'include'` → ca 2 đỏ ·
 * gỡ `.catch` → ca 3 đỏ (unhandledRejection) · gỡ <DanhThucMayChu /> khỏi một trong hai trang →
 * ca 5 đỏ · đổi component sang apiFetch → ca 6 đỏ.
 */
