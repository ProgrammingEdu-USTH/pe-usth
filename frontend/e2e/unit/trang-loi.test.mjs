// Trang lỗi: biên lỗi đầu tiên của app, và nó phải làm được thứ `reset()` không
// làm được.
//
// Trước bản này KHÔNG có biên nào (`error.tsx`/`global-error.tsx`/ErrorBoundary
// đều không tồn tại), nên một lỗi render cho trang mặc định của Next — tiếng
// Anh, 0 liên kết, 0 CSS. Bề mặt này có bằng chứng đã xảy ra: AGENTS.md ghi vụ
// `screenVerdict` gọi `optionDetail(q.options[-1])` và ném TypeError, với một
// bản nháp cũ trong localStorage làm học viên "mở bài là crash, MÃI MÃI".
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const NGUON = readFileSync(join(GOC, 'src/app/error.tsx'), 'utf8');
const CSS_THO = readFileSync(join(GOC, 'src/app/error.module.css'), 'utf8');
// PHẢI bỏ chú thích của CSS nữa: chú thích đầu file KỂ TÊN các token brand để
// nói vì sao không dùng chúng, nên ca dưới ĐỎ OAN trên chính lời giải thích của
// bản sửa. Đúng bẫy đã mắc một lần khi viết ca cho trang 404.
const CSS = CSS_THO.replace(/\/\*[\s\S]*?\*\//g, ' ');

/** Bỏ chú thích — mọi luật dưới chấm CODE, và chú thích ở đây nhắc mọi thứ. */
function boChuThich(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}
const MA = boChuThich(NGUON);

/** Gộp khoảng trắng: JSX ngắt câu giữa dòng rồi thụt lề, nên so trên văn bản
 *  THÔ là ĐỎ OAN — lỗi đã mắc một lần khi viết ca cho trang 404. */
const CHU = NGUON.replace(/\s+/g, ' ');

test('trang lỗi: phép đọc tìm được file và nội dung (tự kiểm)', () => {
  // Phép đọc trượt thì mọi luật dưới đạt RỖNG mà không chứng minh gì.
  assert.ok(NGUON.length > 1000, `error.tsx chỉ ${NGUON.length} byte — đọc trượt?`);
  assert.ok(CSS_THO.length > 400, `error.module.css chỉ ${CSS_THO.length} byte`);
  assert.match(MA, /export default function/, 'không thấy component');
});

test('trang lỗi: là client component và nhận `reset` của Next', () => {
  // `error.tsx` BẮT BUỘC là client component; thiếu `'use client'` thì Next
  // không nhận nó làm biên lỗi và trang mặc định quay lại mà không ai thấy.
  assert.match(NGUON.trimStart(), /^'use client';/);
  assert.match(MA, /reset\s*\}\s*:/, 'không nhận prop `reset`');
  assert.match(MA, /onClick=\{reset\}/, 'nút Thử lại không gọi `reset`');
});

test('trang lỗi: KHÔNG gọi API — bot và người cùng rơi vào đây', () => {
  // `apiFetch` gặp 401 thì TỰ TẠO một tài khoản khách. Một trang lỗi ghi dữ
  // liệu là trang lỗi làm tình hình xấu thêm.
  for (const xau of ['apiFetch', 'ensureGuest', 'fetch(']) {
    assert.ok(!MA.includes(xau), `trang lỗi không được gọi \`${xau}\``);
  }
});

test('trang lỗi: tự nạp CSS, vì layout gốc không import CSS global nào', () => {
  assert.match(MA, /<PageStyles\b/);
  assert.match(MA, /static\/css\/edu-theme\.css/);
});

test('trang lỗi: mọi đường về là route CÓ THẬT', () => {
  // Một trang lỗi trỏ sang một 404 thì tệ hơn không có đường về, vì nó trông
  // như có. Tập route đọc từ CÂY TỆP; phép `assert` dưới là TỰ KIỂM — quét
  // trượt thì tập rỗng và luật này đạt rỗng mà không chứng minh gì.
  const APP = join(GOC, 'src/app');
  const route = new Set(['/']);
  const di = (d, tien) => {
    for (const t of readdirSync(d)) {
      const p = join(d, t);
      if (!statSync(p).isDirectory()) continue;
      // Route group `(x)` không xuất hiện trong URL; `[x]` là route động.
      const seg = /^\(.*\)$/.test(t) ? tien : `${tien}/${t}`;
      if (readdirSync(p).some((f) => /^page\.(tsx|ts|jsx|js)$/.test(f))) route.add(seg || '/');
      di(p, seg);
    }
  };
  di(APP, '');
  assert.ok(route.size >= 8, `phép quét route trượt, chỉ thấy ${route.size}`);
  assert.ok(route.has('/'), 'không thấy route gốc');

  const duong = [...MA.matchAll(/'(\/[^']*)'/g)].map((m) => m[1])
    .filter((d) => !d.startsWith('/static/'));
  assert.ok(duong.length >= 2, `chỉ thấy ${duong.length} đường về trong mã`);
  // `/courses/python_advanced` do `generateStaticParams()` của
  // `courses/[courseId]` sinh ra từ `COURSES`, nên nó KHÔNG có trong cây tệp —
  // bản đầu của ca này so bằng `has()` thuần và BÁO OAN đúng đường về chính.
  //
  // NHƯNG cho một route động khớp MỌI segment thì cổng rỗng ở đúng chỗ nó phải
  // canh: ablate đổi đường về thành `/courses/python` cho **0 đỏ**, trong khi
  // đường đó đã được đo là **404** (khoá `python` không còn trong `COURSES`).
  // Nên `[courseId]` phải khớp đúng DANH SÁCH id mà `generateStaticParams()`
  // sinh ra, đọc từ chính `catalog.ts`.
  const CATALOG = readFileSync(join(GOC, 'src/lib/catalog.ts'), 'utf8');
  const maKhoa = [...CATALOG.matchAll(/^\s{4}id: '([^']+)',/gm)].map((m) => m[1])
    .filter((id) => !id.startsWith('db_design'));
  assert.ok(maKhoa.length >= 1, 'không bóc được mã khoá nào từ catalog.ts');
  const THAM_SO = { '[courseId]': maKhoa };
  const khop = (d) => [...route].some((r) => {
    const a = r.split('/');
    const b = d.split('/');
    return a.length === b.length
      && a.every((s, i) => (THAM_SO[s] ? THAM_SO[s].includes(b[i]) : s === b[i]));
  });
  for (const d of duong) {
    assert.ok(
      khop(d),
      `trang lỗi trỏ tới "${d}" nhưng src/app không có route đó — một trang lỗi `
      + 'dẫn sang 404 thì trông như có đường về mà không có.',
    );
  }
});

test('trang lỗi: xoá nháp dùng CHUNG khuôn khoá với bài học, không chép lại', () => {
  // Ba bản chép của một khuôn khoá là ba thứ trôi được, và khi chúng trôi thì
  // nút này xoá SAI bài (hoặc không xoá gì) mà không exception nào ném —
  // `getItem` chỉ trả null. Trước bản này khuôn ấy được dựng HAI LẦN trong
  // chính `useLessonDraft.ts`.
  assert.match(MA, /from '@\/lib\/nhap-bai'/, 'không import từ lib dùng chung');
  for (const ten of ['hauToNhap', 'soBaiTuTruyVan', 'TIEN_TO_NHAP']) {
    assert.ok(MA.includes(ten), `không dùng \`${ten}\` của lib dùng chung`);
  }
  // Và KHÔNG được ghi cứng tiền tố ở đây — KHÔNG kèm dấu nháy trong phép so.
  // Bản đầu của hai ca này tìm `'pe-studio-lesson` (nháy ĐƠN), nên ablate chép
  // lại khuôn khoá bằng TEMPLATE LITERAL cho **0 đỏ** — mà template literal
  // chính là cách người ta sẽ viết nó, vì khoá có nội suy. Cổng chỉ bắt dạng
  // ÍT KHẢ NĂNG nhất là cổng rỗng ở đúng chỗ nó phải canh.
  assert.ok(
    !MA.includes('pe-studio-lesson'),
    'ghi cứng tiền tố khoá nháp — import `TIEN_TO_NHAP` thay vì chép',
  );
  // Hook bài học cũng phải dùng chung nó, nếu không hai bên lại trôi.
  const hook = boChuThich(
    readFileSync(join(GOC, 'src/components/python-studio/useLessonDraft.ts'), 'utf8'),
  );
  assert.match(hook, /from '@\/lib\/nhap-bai'/);
  assert.ok(
    !hook.includes('pe-studio-lesson'),
    'useLessonDraft còn ghi cứng tiền tố — đó là bản chép thứ hai',
  );
});

test('trang lỗi: mọi lần chạm localStorage nằm trong try/catch', () => {
  // Ở chế độ riêng tư `localStorage` NÉM chứ không trả null (luật đã ghi cho
  // StudyRoom). Một trang lỗi tự ném là thứ không còn đường nào cứu.
  const than = MA.split('localStorage');
  assert.ok(than.length - 1 >= 2, 'không thấy lần chạm localStorage nào');
  // TÍCH LUỸ, không đếm trong từng đoạn: `split` cho các đoạn RỜI NHAU, nên một
  // đoạn có 0 `try` không nói gì về việc nó có nằm trong try hay không. Bản đầu
  // của ca này đếm theo từng đoạn và BÁO OAN lần chạm thứ hai
  // (`localStorage.key(i)` nằm giữa hai lần chạm, trong cùng một khối try).
  let mo = 0;
  let dong = 0;
  for (const [i, truoc] of than.slice(0, -1).entries()) {
    mo += (truoc.match(/\btry\b/g) ?? []).length;
    dong += (truoc.match(/\bcatch\b/g) ?? []).length;
    assert.ok(mo > dong, `lần chạm localStorage thứ ${i + 1} nằm NGOÀI try/catch`);
  }
});

test('trang lỗi: nút xoá nháp chỉ hiện khi THẬT có nháp, và nói ra cái mất', () => {
  // Bản nháp giữ code học viên đang viết và server KHÔNG có bản sao nào
  // (`lesson_progress` chỉ biết "đã hoàn thành"). Nên nút phải do họ bấm, và
  // câu chữ phải nói thẳng cái mất — xoá hộ là lấy đi thứ không lấy lại được.
  assert.match(MA, /nhap\.length > 0 &&/, 'nút xoá nháp không có cổng "thật có nháp"');
  assert.match(CHU, /sẽ mất/, 'không nói ra rằng code đang viết sẽ mất');
  assert.ok(
    !/useEffect\([^)]*removeItem/s.test(MA),
    'không được tự xoá nháp trong effect — phải do học viên bấm',
  );
});

test('trang lỗi: setState HOÃN khỏi thân effect (React 19 cấm gọi đồng bộ)', () => {
  // AGENTS.md ghi bẫy này HAI LẦN trước đây, và bản đầu của `error.tsx` vẫn vấp:
  // `useEffect(() => setNhap(...), [])` làm `npm run lint` ra 1 ERROR
  // (`react-hooks/set-state-in-effect`). Ca này để lần sau không dựng lại nó.
  //
  // Và phép đọc KHÔNG được chuyển vào `useState(() => …)`: server không có
  // `localStorage` nên HTML trả về không có nút, dựng nút ngay lượt đầu ở client
  // là hydration mismatch. Nên luật là "hoãn", không phải "đọc sớm hơn".
  assert.ok(
    !/useEffect\(\(\)\s*=>\s*set[A-Z]/.test(MA),
    'gọi setState ĐỒNG BỘ trong thân effect — React 19 cấm; hoãn bằng setTimeout/cleanup',
  );
  assert.match(MA, /useState<string\[\]>\(\[\]\)/, 'state nháp phải khởi tạo RỖNG');
  assert.match(MA, /clearTimeout/, 'hoãn bằng timer thì phải dọn trong cleanup');
});

test('trang lỗi: đích bấm ≥ 44px và hàng nút xuống hàng ở khổ nhỏ', () => {
  const m = /min-height:\s*(\d+)px/.exec(CSS);
  assert.ok(m, 'không khai min-height cho nút');
  assert.ok(Number(m[1]) >= 44, `đích bấm ${m[1]}px < 44px`);
  assert.match(CSS, /flex-wrap:\s*wrap/, 'hàng nút không xuống hàng');
  assert.match(CSS, /padding:\s*48px 16px/, 'thiếu gutter 16px của khổ điện thoại');
});

test('trang lỗi: không dùng token brand (theme lofi đã chốt)', () => {
  for (const t of ['--edu-accent', '--edu-brand']) {
    assert.ok(!CSS.includes(t), `còn dùng token brand \`${t}\``);
  }
  // `--edu-card-border` là rgba(255,255,255,.85) — trắng trên thẻ trắng, lỗi
  // đã gặp bốn lần trong repo này.
  assert.ok(!CSS.includes('--edu-card-border'), 'dùng --edu-card-border thay vì --edu-card-line');
});

test('nhap-bai: ánh xạ `?lesson=` → sort_order, mọi đầu vào rác về bài 1', async () => {
  // Phép tính này từng nằm inline trong trang bài học và KHÔNG có ca nào.
  // AGENTS.md ghi một vụ lệch MỘT đơn vị ở đúng chỗ này, và nó hỏng im lặng:
  // "vẫn mở đúng module ở hầu hết các bài, chỉ sai ở bài ĐẦU của mỗi module".
  const { soBaiTuTruyVan, hauToNhap, khoaNhap, TIEN_TO_NHAP } = await import(
    new URL('../../src/lib/nhap-bai.ts', import.meta.url).href
  );
  assert.equal(soBaiTuTruyVan('0'), 1, 'chỉ số 0-based đầu tiên là bài 1');
  assert.equal(soBaiTuTruyVan('11'), 12);
  assert.equal(soBaiTuTruyVan(undefined), 1);
  for (const rac of ['', 'abc', '-1', '1.5', '1e3', ' ']) {
    const r = soBaiTuTruyVan(rac);
    assert.ok(Number.isInteger(r) && r >= 1, `"${rac}" cho ${r}`);
  }
  assert.equal(hauToNhap('python_advanced', 12), ':python_advanced:12');
  assert.equal(khoaNhap(7, 'python_advanced', 12), `${TIEN_TO_NHAP}:7:python_advanced:12`);
  // Hậu tố phải là phần ĐUÔI của khoá đầy đủ — trang lỗi khớp bằng `endsWith`.
  assert.ok(khoaNhap(7, 'c', 3).endsWith(hauToNhap('c', 3)));
});
