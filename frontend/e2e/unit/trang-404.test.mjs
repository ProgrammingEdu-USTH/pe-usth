// Trang 404 phải là trang CỦA DỰ ÁN, không phải bản mặc định của Next.
//
// Đo trên production trước khi dựng (Chrome, 08/11/2026,
// `programmingedu.io.vn/practice`): chữ "404 / This page could not be found."
// tiếng Anh · 0 liên kết · nền rgb(255,255,255) · font "Times New Roman" ·
// 0 tệp CSS. Cây mã khi đó không có `not-found.tsx` lẫn `error.tsx`.
//
// Bộ này đọc CÂY MÃ, không dựng React. Nó chứng minh bốn tính chất mà phép đo
// ở trên gọi tên, cộng hai luật mà repo này đã trả giá để học:
//   1. tệp tồn tại;
//   2. chữ là TIẾNG VIỆT (và không còn câu tiếng Anh mặc định);
//   3. có ít nhất một ĐƯỜNG VỀ, và mỗi đường về trỏ tới route CÓ THẬT —
//      một trang 404 trỏ sang một 404 khác tệ hơn không có đường về;
//   4. tự nạp `edu-theme.css` (layout gốc không import CSS global nào, nên
//      thiếu bước này là 0 stylesheet — đúng cái đã đo);
//   5. KHÔNG gọi `apiFetch` — trang công khai, và `apiFetch` gặp 401 thì tự
//      tạo một tài khoản khách, nên mỗi lượt bot quét 404 sẽ sinh một hàng
//      `@guest.local`;
//   6. CSS không dùng token brand xanh–đỏ (nhóm đã chốt theme lofi chill).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const TRANG = join(GOC, 'src/app/not-found.tsx');
const CSS = join(GOC, 'src/app/not-found.module.css');
const APP = join(GOC, 'src/app');

const nguon = readFileSync(TRANG, 'utf8');
const css = readFileSync(CSS, 'utf8');

/** Bỏ chú thích để không chấm trên một dòng `//` hay một khối `/* *\/`. */
function boChuThich(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

/**
 * Mọi đường dẫn route mà `src/app` thật sự sinh ra, dạng `/a/b`.
 *
 * Đọc CÂY TỆP chứ không đọc một danh sách gõ tay: một danh sách gõ tay là thứ
 * sẽ trôi, và nó trôi đúng theo chiều làm ca test này vô hiệu (đường về biến
 * thành 404 mà ca vẫn xanh). Nhóm route `(standalone)` không xuất hiện trong
 * URL nên bị bỏ khỏi đường dẫn.
 */
function moiRoute(dir = APP, duong = '') {
  const ra = [];
  for (const ten of readdirSync(dir)) {
    const p = join(dir, ten);
    if (statSync(p).isDirectory()) {
      const tiep = /^\(.*\)$/.test(ten) ? duong : `${duong}/${ten}`;
      ra.push(...moiRoute(p, tiep));
    } else if (ten === 'page.tsx') {
      ra.push(duong === '' ? '/' : duong);
    }
  }
  return ra;
}

test('404: tệp của dự án tồn tại và là server component', () => {
  assert.match(nguon, /export default function NotFound/);
  // 'use client' ở đây là thừa và nó kéo cả bundle client vào một trang chỉ có
  // chữ với hai liên kết.
  assert.ok(!/['"]use client['"]/.test(nguon), 'trang 404 không cần client component');
});

test('404: chữ là tiếng Việt, không còn câu mặc định của Next', () => {
  const than = boChuThich(nguon);
  assert.ok(
    !/This page could not be found/i.test(than),
    'còn câu tiếng Anh mặc định — đó là chính thứ bản sửa này thay',
  );
  // Dấu tiếng Việt trong phần JSX, không phải trong chú thích. Gộp khoảng
  // trắng trước khi so: JSX ngắt câu giữa dòng rồi thụt lề, nên một regex trên
  // văn bản thô sẽ ĐỎ OAN — nó đã đỏ oan đúng câu dưới ở lần chạy đầu.
  const gon = than.replace(/\s+/g, ' ');
  assert.match(gon, /Không có trang này/);
  assert.match(gon, /Tiến độ học của bạn vẫn còn nguyên/);
});

test('404: có đường về, và mỗi đường về là route CÓ THẬT', () => {
  const than = boChuThich(nguon);
  const hrefs = [...than.matchAll(/DUONG_VE = \[([^\]]+)\]/g)]
    .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
  assert.ok(hrefs.length >= 1, 'trang 404 phải có ít nhất một đường về');

  const routes = new Set(moiRoute());
  // Phép tự kiểm: nếu phép quét cây route trượt thì tập này RỖNG và ca dưới
  // sẽ đạt rỗng mà không chứng minh gì — đúng bẫy đã ghi ở
  // `insert-gate-sync.test.mjs`.
  assert.ok(routes.size >= 8, `phép quét route trượt, chỉ thấy ${routes.size}`);
  assert.ok(routes.has('/'), 'phép quét route không thấy trang chủ');

  for (const h of hrefs) {
    const co = routes.has(h)
      // route động: `/courses/python_advanced` do `[courseId]` sinh ra.
      || [...routes].some((r) => {
        const a = r.split('/');
        const b = h.split('/');
        return a.length === b.length
          && a.every((seg, i) => seg === b[i] || /^\[.*\]$/.test(seg));
      });
    assert.ok(co, `đường về ${h} KHÔNG khớp route nào trong src/app — một trang `
      + '404 trỏ sang một 404 khác tệ hơn không có đường về');
  }

  // Và chúng phải được DỰNG RA, không chỉ khai trong một hằng.
  for (let i = 0; i < hrefs.length; i += 1) {
    assert.match(than, new RegExp(`href=\\{DUONG_VE\\[${i}\\]\\}`),
      `DUONG_VE[${i}] khai mà không có <Link> nào dùng`);
  }
});

test('404: tự nạp edu-theme.css — layout gốc không import CSS global nào', () => {
  const than = boChuThich(nguon);
  assert.match(than, /PageStyles/);
  assert.match(than, /\/static\/css\/edu-theme\.css/);
  // Phép kiểm chéo: layout gốc vẫn KHÔNG được import CSS global. Ngày nó import
  // thì luật trên hết lý do tồn tại, và ca này phải được đọc lại chứ không im
  // lặng xanh.
  const layout = readFileSync(join(APP, 'layout.tsx'), 'utf8');
  assert.ok(
    !/^import .*\.css['"];?$/m.test(layout),
    'layout gốc nay CÓ import CSS global — đọc lại ca này',
  );
});

test('404: KHÔNG gọi API (apiFetch gặp 401 là tự tạo tài khoản khách)', () => {
  const than = boChuThich(nguon);
  assert.ok(!/apiFetch|ensureGuest|fetch\(/.test(than),
    'trang 404 là trang công khai — mỗi lượt bot quét sẽ sinh một tài khoản khách');
});

test('404: CSS không dùng token brand xanh–đỏ', () => {
  const than = boChuThich(css);
  for (const t of ['--edu-accent', '--edu-accent-2', '--edu-brand', '--edu-sheen']) {
    assert.ok(!than.includes(t), `CSS trang 404 còn dùng token brand ${t}`);
  }
  // Đường kẻ của nút phụ phải là token ĐÃ ĐƯỢC CANH cả hai chiều ngày/đêm.
  // `--edu-card-border` là `rgba(255,255,255,.85)` — trắng trên thẻ trắng, lỗi
  // đã gặp bốn lần.
  assert.ok(!than.includes('--edu-card-border'),
    'dùng --edu-card-line, không phải --edu-card-border (trắng trên trắng)');
  assert.match(than, /--edu-card-line/);
  // Đích bấm: repo này đã phải sửa một đích 13×6px một lần.
  assert.match(than, /min-height:\s*44px/);
});
