// Hạn của cookie mốc `pe_has_session` — nửa FRONTEND của hợp đồng
// `expiresAt` / `refreshExpiresIn` (backend mặc định JWT_REFRESH_EXPIRES='8h').
//
// VÌ SAO CÓ FILE NÀY: cookie mốc từng ghi cứng `max-age=28800` (8 giờ) ở BỐN
// chỗ, trong khi production đặt `JWT_REFRESH_EXPIRES=24h` — đọc nguyên văn
// response header của production ngày 25/10/2026:
//   set-cookie: pe_refresh=…; Max-Age=86400; Path=/auth; HttpOnly; Secure; SameSite=Lax
// Lệch 3 lần. Từ giờ thứ 8 tới giờ thứ 24, phiên còn sống nhưng cookie mốc đã
// hết, nên trang công khai hiện "chưa đăng nhập" và badge "Tiếp tục ở bài X"
// biến mất dù tiến độ còn nguyên.
//
// Hướng lệch có hậu quả KHÁC NHAU, nên hằng dự phòng cố ý chọn NGẮN:
//  · đoán ngắn hơn hạn thật → mất cái badge, tiến độ còn;
//  · đoán DÀI hơn → trang công khai mời vào một phiên đã chết, `apiFetch`
//    refresh không được rồi rơi xuống `ensureGuest()` và cấp tài khoản khách
//    MỚI — người học thấy như mất sạch tiến độ.
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');

/** Thay `document` bằng bản ghi lại mọi chuỗi cookie được gán. */
function dungDocumentGia(initialCookie = '') {
  const daGhi = [];
  globalThis.document = {
    set cookie(v) { daGhi.push(String(v)); },
    get cookie() { return initialCookie; },
  };
  return daGhi;
}

const { apiFetch, danhDauPhien, HAN_DU_PHONG_GIAY, hanPhienTuPhanHoi } = await (async () => {
  dungDocumentGia();
  return import('../../src/lib/api.ts');
})();

function maxAge(dong) {
  const m = /max-age=(-?\d+)/.exec(dong);
  return m ? Number(m[1]) : null;
}

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
  };
}

function runBridgeRefreshTest(refreshBody) {
  const bridgeSrc = readFileSync(join(FE, 'public/static/js/pe-bridge.js'), 'utf8');
  const cookies = [];
  const storage = makeStorage({ pe_access: 'old-access' });
  const fakeFetch = async (url) => {
    if (String(url).endsWith('/auth/refresh')) {
      return {
        ok: true,
        status: 200,
        json: async () => refreshBody,
        clone() { return this; },
      };
    }
    throw new Error(`unexpected fetch url: ${url}`);
  };
  const win = {
    __PE_API_ORIGIN: 'http://localhost:5000',
    fetch: fakeFetch,
  };
  const sandbox = {
    window: win,
    localStorage: storage,
    document: {
      readyState: 'complete',
      addEventListener() {},
      set cookie(v) { cookies.push(String(v)); },
      get cookie() { return cookies.join('; '); },
    },
    Headers,
    Event,
    Date,
    Promise,
    setTimeout,
    clearTimeout,
  };
  sandbox.window.window = win;
  vm.runInNewContext(bridgeSrc, sandbox, { filename: 'pe-bridge.js' });
  return win.__PE_refreshAccess().then((access) => ({ access, cookies, storage }));
}

function stripCommentsOnly(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const q = ch;
      out += ch;
      i += 1;
      while (i < n) {
        const c = src[i];
        out += c;
        i += 1;
        if (c === '\\' && i < n) {
          out += src[i];
          i += 1;
          continue;
        }
        if (c === q) break;
      }
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      if (nl === -1) break;
      out += '\n';
      i = nl + 1;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end === -1) break;
      out += ' ';
      i = end + 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

test('dùng ĐÚNG con số máy chủ nói, không phải 28800 — ca bắt lỗi', () => {
  const ghi = dungDocumentGia();
  danhDauPhien(86_400);
  assert.equal(ghi.length, 1);
  assert.equal(maxAge(ghi[0]), 86_400);
  assert.match(ghi[0], /^pe_has_session=1;/);
  assert.match(ghi[0], /path=\/;/);
  assert.match(ghi[0], /SameSite=Lax/);
});

test('máy chủ không nói thì về hạn dự phòng', () => {
  for (const xau of [undefined, null, '86400', NaN, Infinity, 0, -5, {}]) {
    const ghi = dungDocumentGia();
    danhDauPhien(xau);
    assert.equal(maxAge(ghi[0]), HAN_DU_PHONG_GIAY, `với ${String(xau)}`);
  }
});

test('hạn dự phòng phải NGẮN, không được dài hơn mặc định 8h của máy chủ', () => {
  // Nếu ai đó nâng nó lên "cho khớp production 24h" thì đổi luôn hướng lệch
  // sang hướng làm mất tiến độ. Ca này canh đúng chỗ đó.
  assert.equal(HAN_DU_PHONG_GIAY, 8 * 3600);
});

test('số lẻ bị làm tròn xuống, cookie không nhận số thực', () => {
  const ghi = dungDocumentGia();
  danhDauPhien(86_400.9);
  assert.equal(maxAge(ghi[0]), 86_400);
});

test('document ném thì không làm sập cả lần refresh', () => {
  // Chrome ném SecurityError khi người dùng chặn "site data".
  globalThis.document = {
    set cookie(_v) { throw new Error('SecurityError'); },
    get cookie() { return ''; },
  };
  assert.doesNotThrow(() => danhDauPhien(86_400));
});

test('hanPhienTuPhanHoi: ưu tiên expiresAt (ISO/epoch), thiếu thì về mặc định 8 giờ', () => {
  const nowMs = Date.UTC(2026, 10, 19, 15, 0, 0);
  assert.equal(
    hanPhienTuPhanHoi({ expiresAt: new Date(nowMs + 24 * 3600 * 1000).toISOString() }, nowMs),
    86_400,
  );
  assert.equal(
    hanPhienTuPhanHoi({ expiresAt: nowMs + 12 * 3600 * 1000 }, nowMs),
    43_200,
  );
  assert.equal(
    hanPhienTuPhanHoi({ expiresAt: Math.floor(nowMs / 1000) + 6 * 3600 }, nowMs),
    21_600,
  );

  // Không có expiresAt: giữ mặc định 8 giờ (trừ khi có refreshExpiresIn)
  assert.equal(hanPhienTuPhanHoi(undefined, nowMs), HAN_DU_PHONG_GIAY);
  assert.equal(hanPhienTuPhanHoi({}, nowMs), HAN_DU_PHONG_GIAY);
  assert.equal(hanPhienTuPhanHoi({ access: 'tok' }, nowMs), HAN_DU_PHONG_GIAY);
  assert.equal(hanPhienTuPhanHoi({ access: 'tok', refreshExpiresIn: 36_000 }, nowMs), 36_000);

  // expiresAt hết hạn hoặc sai định dạng -> fallback
  assert.equal(
    hanPhienTuPhanHoi({ expiresAt: new Date(nowMs - 5_000).toISOString() }, nowMs),
    HAN_DU_PHONG_GIAY,
  );
  assert.equal(
    hanPhienTuPhanHoi({ expiresAt: '86400', refreshExpiresIn: 72_000 }, nowMs),
    72_000,
  );
});

test('apiFetch + /auth/refresh: dùng expiresAt khi có và mặc định 8 giờ khi không có', async () => {
  const saved = {
    fetch: globalThis.fetch,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    document: globalThis.document,
  };
  try {
    // Ca 1: /auth/refresh trả về expiresAt (+24h)
    {
      const ghi = dungDocumentGia();
      const storage = makeStorage({ pe_access: 'stale-token' });
      globalThis.localStorage = storage;
      globalThis.window = {};
      let calls = 0;
      globalThis.fetch = async (url) => {
        calls += 1;
        if (String(url).endsWith('/api/enrolled')) {
          if (calls === 1) return { status: 401, ok: false, json: async () => ({}) };
          return { status: 200, ok: true, json: async () => ({ ok: true }) };
        }
        if (String(url).endsWith('/auth/refresh')) {
          return {
            status: 200,
            ok: true,
            json: async () => ({
              access: 'fresh-with-exp',
              expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            }),
          };
        }
        throw new Error(`unexpected url: ${url}`);
      };

      const res = await apiFetch('/api/enrolled');
      assert.equal(res.status, 200);
      assert.equal(storage.getItem('pe_access'), 'fresh-with-exp');
      assert.equal(ghi.length, 1);
      const sec = maxAge(ghi[0]);
      assert.ok(sec >= 86_395 && sec <= 86_400, `cần max-age ~86400 nhưng nhận ${sec}`);
    }

    // Ca 2: /auth/refresh KHÔNG có expiresAt -> dùng mặc định 8 giờ (HAN_DU_PHONG_GIAY)
    {
      const ghi = dungDocumentGia();
      const storage = makeStorage({ pe_access: 'stale-token-2' });
      globalThis.localStorage = storage;
      globalThis.window = {};
      let calls = 0;
      globalThis.fetch = async (url) => {
        calls += 1;
        if (String(url).endsWith('/api/enrolled')) {
          if (calls === 1) return { status: 401, ok: false, json: async () => ({}) };
          return { status: 200, ok: true, json: async () => ({ ok: true }) };
        }
        if (String(url).endsWith('/auth/refresh')) {
          return {
            status: 200,
            ok: true,
            json: async () => ({ access: 'fresh-no-exp' }),
          };
        }
        throw new Error(`unexpected url: ${url}`);
      };

      const res = await apiFetch('/api/enrolled');
      assert.equal(res.status, 200);
      assert.equal(storage.getItem('pe_access'), 'fresh-no-exp');
      assert.equal(ghi.length, 1);
      assert.equal(maxAge(ghi[0]), HAN_DU_PHONG_GIAY);
    }
  } finally {
    globalThis.fetch = saved.fetch;
    globalThis.window = saved.window;
    globalThis.localStorage = saved.localStorage;
    globalThis.document = saved.document;
  }
});

test('pe-bridge.js + /auth/refresh: dùng expiresAt khi có và mặc định 8 giờ khi không có', async () => {
  const withExp = await runBridgeRefreshTest({
    access: 'bridge-access-1',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  });
  assert.equal(withExp.access, 'bridge-access-1');
  assert.equal(withExp.cookies.length, 1);
  const sec = maxAge(withExp.cookies[0]);
  assert.ok(sec >= 86_395 && sec <= 86_400, `pe-bridge phải lấy hạn từ expiresAt (~86400), nhận ${sec}`);

  const withoutExp = await runBridgeRefreshTest({
    access: 'bridge-access-2',
  });
  assert.equal(withoutExp.access, 'bridge-access-2');
  assert.equal(withoutExp.cookies.length, 1);
  assert.equal(maxAge(withoutExp.cookies[0]), 8 * 3600);
});

test('login.inline.js: bỏ ghi cứng max-age=28800, đọc expiresAt và mặc định 8 giờ khi thiếu', () => {
  const loginSrc = readFileSync(join(FE, 'public/static/js/pages/login.inline.js'), 'utf8');
  const cookies = [];
  const replacedUrls = [];
  const fakeEl = () => ({
    className: '',
    style: { cssText: '', display: '' },
    textContent: '',
    disabled: false,
    value: '',
    innerHTML: '',
    classList: { add() {}, remove() {} },
    appendChild() {},
    addEventListener() {},
    getBoundingClientRect: () => ({ width: 100, height: 40, left: 0, top: 0 }),
  });
  const win = {
    location: {
      search: '?next=/dashboard',
      replace(u) { replacedUrls.push(u); },
    },
  };
  const sandbox = {
    window: win,
    localStorage: makeStorage({ pe_access: 'existing-access-tok' }),
    document: {
      set cookie(v) { cookies.push(String(v)); },
      get cookie() { return ''; },
      getElementById: fakeEl,
      createElement: fakeEl,
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener() {},
      head: { appendChild() {} },
    },
    URLSearchParams,
    Date,
    Math,
    fetch: async () => { throw new Error('not called'); },
    setTimeout,
  };
  sandbox.window.window = win;
  vm.runInNewContext(loginSrc, sandbox, { filename: 'login.inline.js' });

  // Luồng khôi phục phiên cũ: mặc định 8 giờ qua hằng số, vẫn redirect đúng ?next=
  assert.deepEqual(replacedUrls, ['/dashboard']);
  assert.equal(cookies.length, 1);
  assert.equal(maxAge(cookies[0]), 8 * 3600);

  // Khi body /auth/* có expiresAt (24h) -> đặt cookie theo expiresAt
  sandbox.writeSessionMarker('new-tok', {
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  });
  assert.equal(cookies.length, 2);
  const sec = maxAge(cookies[1]);
  assert.ok(sec >= 86_395 && sec <= 86_400, `cần max-age ~86400 nhưng nhận ${sec}`);
});

test('không còn max-age=28800 trong bất kỳ file mã chạy nào ở frontend/src hoặc frontend/public', () => {
  const offenders = [];
  const exts = /\.(ts|tsx|js|jsx|mjs)$/;
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!exts.test(entry)) continue;
      const stripped = stripCommentsOnly(readFileSync(full, 'utf8'));
      if (/max-age\s*=\s*28800\b/.test(stripped)) {
        offenders.push(full.slice(FE.length + 1));
      }
    }
  }
  walk(join(FE, 'src'));
  walk(join(FE, 'public', 'static', 'js'));
  assert.deepEqual(offenders, [], `Còn ghi cứng max-age=28800 ở: ${offenders.join(', ')}`);
});
