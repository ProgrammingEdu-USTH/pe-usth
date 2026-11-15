// Rê vào một mục menu chỉ được hiện MỘT nhãn, không phải 28 cái chồng lên nhau.
//
// VÌ SAO CÓ CỔNG NÀY. Người thử `will` 07/11/2026 gửi ảnh các nhãn bài đè lên
// nhau. Đo trên `programmingedu.io.vn`: rê vào mục **"Khoá học"** ⇒ **28 nhãn**
// cùng hiện và **116 cặp chồng nhau** (ở khổ khác đếm được 118 — con số phụ
// thuộc khổ màn, nên cổng này KHÔNG ghim nó).
//
// Nguyên nhân: 28 cuốn sách trên kệ đều mang `route:'book'`, `lightRoute` gọi
// `setOn` cho tất cả, mà `setOn` bật luôn nhãn. Dòng `main` ngay dưới trong
// `lightRoute` ĐÃ nói ra ý định "một nhãn thôi" từ đầu — nó chỉ bị `setOn` làm
// cho vô nghĩa.
//
// CỔNG NÀY CHẠY THẬT HAI HÀM ẤY, không đọc regex. Nó bóc `setOn` và
// `lightRoute` ra khỏi `engine.js` rồi `new Function` chúng với phụ thuộc giả —
// cùng khuôn `forum-xss.test.mjs` lôi `escHtml` ra khỏi `dashboard.js`, và cùng
// bài học của `da-nap-hash-sync.spec.ts`: một spec TỰ CHÉP hàm vào trong nó thì
// ablate vẫn xanh, vì nó không đụng tới file cổng lần nào.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const GOC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const JS = readFileSync(join(GOC, 'src', 'components', 'goc-hoc', 'engine.js'), 'utf8');

/** Mã nguồn của `function <ten>(…){…}`, cắt bằng phép đếm ngoặc. */
function hamTen(src, ten) {
  const re = new RegExp('function\\s+' + ten + '\\s*\\(');
  const i = src.search(re);
  if (i < 0) return null;
  const mo = src.indexOf('{', i);
  let sau = 1;
  for (let j = mo + 1; j < src.length; j++) {
    if (src[j] === '{') sau++;
    else if (src[j] === '}' && --sau === 0) return src.slice(i, j + 1);
  }
  return null;
}

/** Phần tử giả: chỉ cần `classList.toggle`. */
function el() {
  const o = { on: false };
  o.classList = {
    toggle: (ten, ep) => { if (ten === 'on') o.on = ep === undefined ? !o.on : !!ep; },
    contains: (ten) => ten === 'on' && o.on,
  };
  return o;
}

/**
 * Dựng cảnh giả giống cảnh thật: 1 laptop (`route:'learn'`), 1 bảng ghim, và
 * `soSach` cuốn sách cùng mang `route:'book'` — chính hình dạng gây ra lỗi.
 */
function dungCanh(soSach = 28) {
  const GROUPS = [
    { g: 'learn', route: 'learn', keys: ['laptop'], tag: el() },
    { g: 'roadmap', route: 'roadmap', keys: ['corkboard'], tag: el() },
  ];
  for (let i = 0; i < soSach; i++) {
    GROUPS.push({ g: 'book' + i, route: 'book', keys: ['book' + i], tag: el() });
  }
  const kho = {};
  const lay = new Proxy({}, { get: (_, k) => (kho[k] ||= el()) });
  const src = hamTen(JS, 'setOn');
  const srcLR = hamTen(JS, 'lightRoute');
  assert.ok(src, 'không bóc được `setOn` khỏi engine.js — đổi tên hàm thì sửa ca này, '
    + 'im lặng xanh ở đây là bỏ mất phép đo.');
  assert.ok(srcLR, 'không bóc được `lightRoute` khỏi engine.js — đổi tên hàm thì sửa ca này.');
  const f = new Function('deps', `
    const EL = deps.EL, GEL = deps.GEL, host = deps.host, GROUPS = deps.GROUPS,
          KEY_CUR = deps.KEY_CUR, steamG = deps.steamG;
    const route = deps.route, busy = deps.busy;
    ${src}
    ${srcLR}
    return { setOn, lightRoute };
  `);
  const api = f({
    EL: lay, GEL: lay, GROUPS, KEY_CUR: 'book2', route: null, busy: false,
    host: { querySelectorAll: () => [] },
    steamG: { classList: { add() {}, remove() {} } },
  });
  return { ...api, GROUPS, dem: () => GROUPS.filter((G) => G.tag.on).length };
}

test('phép bóc hàm còn đọc được — rỗng thì mọi ca dưới đây vô nghĩa', () => {
  assert.ok(hamTen(JS, 'setOn'), 'không bóc được `setOn`');
  assert.ok(hamTen(JS, 'lightRoute'), 'không bóc được `lightRoute`');
  assert.match(hamTen(JS, 'setOn'), /classList\.toggle/,
    '`setOn` bóc ra không chứa `classList.toggle` — phép đếm ngoặc đã cắt nhầm.');
});

test('rê vào "Khoá học" sáng CẢ 28 cuốn mà chỉ hiện MỘT nhãn', () => {
  const c = dungCanh(28);
  c.lightRoute('courses', true);
  assert.equal(c.dem(), 1,
    `rê vào "Khoá học" hiện ${c.dem()} nhãn. Đo trên production trước khi sửa: 28 nhãn, `
    + '116 cặp chồng nhau — đúng ảnh người thử `will` gửi. `lightRoute` phải gọi '
    + '`setOn(G,on,false)` để dòng `main` ngay dưới nó có hiệu lực thật.');
});

test('vẫn sáng ĐỒ VẬT của cả 28 cuốn — đó mới là thứ mục menu nói ra', () => {
  const c = dungCanh(28);
  let batDauBat = 0;
  for (const G of c.GROUPS) if (G.route === 'book') batDauBat++;
  assert.equal(batDauBat, 28, 'cảnh giả dựng sai, không còn 28 cuốn');
  // `setOn` bật class 'on' cho EL/GEL theo `keys`; ở đây chỉ cần chắc nó KHÔNG
  // bị tắt theo nhãn — nên kiểm bằng chính hành vi: tắt nhãn mà vẫn gọi setOn.
  const g = c.GROUPS.find((G) => G.route === 'book');
  c.setOn(g, true, false);
  assert.equal(g.tag.on, false, '`nhan=false` mà nhãn vẫn bật');
  c.setOn(g, true, true);
  assert.equal(g.tag.on, true, '`nhan=true` mà nhãn không bật — cờ chặn sai chiều');
});

test('cờ `nhan` chỉ chặn chiều BẬT, không bao giờ chặn chiều TẮT', () => {
  const c = dungCanh(3);
  const g = c.GROUPS.find((G) => G.route === 'book');
  c.setOn(g, true, true);
  assert.equal(g.tag.on, true);
  c.setOn(g, false, false);
  assert.equal(g.tag.on, false,
    '`setOn(G,false,false)` không tắt được nhãn. Khi đó một nhãn do nhánh khác bật lên '
    + 'sẽ không có ai tắt, và nó kẹt lại trên cảnh.');
});

test('rời chuột khỏi mục menu thì KHÔNG còn nhãn nào', () => {
  const c = dungCanh(28);
  c.lightRoute('courses', true);
  c.lightRoute('courses', false);
  assert.equal(c.dem(), 0,
    `rời chuột rồi mà còn ${c.dem()} nhãn — nhãn chính kẹt lại trên cảnh.`);
});

test('mỗi mục menu khác vẫn đúng MỘT nhãn, không phải 0', () => {
  for (const r of ['learn', 'roadmap']) {
    const c = dungCanh(28);
    c.lightRoute(r, true);
    assert.equal(c.dem(), 1, `mục "${r}" hiện ${c.dem()} nhãn, đòi đúng 1. `
      + 'Sửa cho "Khoá học" mà làm các mục kia mất nhãn là đổi một lỗi lấy một lỗi.');
  }
});
