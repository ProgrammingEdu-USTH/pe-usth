// MỌI Ô GÕ PHẢI ≥ 16px TRÊN ĐIỆN THOẠI — và đây là một luật về LỖI, không về
// cỡ chữ.
//
// Safari trên iOS TỰ PHÓNG viewport khi một form control có `font-size < 16px`
// nhận focus, và nó KHÔNG tự phóng lại ra. Đo trên production 08/11/2026
// (Chrome, 390×844, màn ô soạn mã của `/lesson/python_advanced`), đủ CẢ HAI
// điều kiện: `textarea.codeBody` ở **13px**, và viewport là
// `width=device-width, initial-scale=1.0` — không `maximum-scale`, không
// `user-scalable=no`. Hệ quả: học viên gõ code trong một trang đã phóng, phải
// kéo ngang, và hai thanh vỏ bài học vừa ghim ở vòng trước lại ra ngoài màn.
//
// KHÔNG chữa bằng `maximum-scale=1`/`user-scalable=no` — đó là vi phạm WCAG
// 1.4.4. Nên 16px là cách duy nhất, và vì vậy nó là một SÀN chứ không phải một
// lựa chọn thẩm mỹ.
//
// DANH SÁCH KHAI, HAI CHIỀU: mỗi ô `<textarea>` của dự án phải có tên ở đây
// kèm tệp CSS; một mục trỏ vào lớp không còn tồn tại là LỖI (ngoại lệ lỗi
// thời), và một lớp có mặt mà thiếu sàn cũng là LỖI. Danh sách là cần thiết vì
// CSS một mình KHÔNG biết `.codeBody` được gắn lên `<textarea>` hay `<div>` —
// nó được gắn lên CẢ HAI (6 chỗ `<div>`, 1 chỗ `<pre>`, 1 chỗ `<textarea>`),
// nên sàn phải viết là `textarea.codeBody` chứ không `.codeBody`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Ô gõ nào, ở tệp nào, chọn bằng selector nào. */
const O_GO = [
  {
    lop: 'codeBody',
    sel: 'textarea.codeBody',
    css: 'src/components/lesson-chrome/exercises/exercises.module.css',
    tsx: 'src/components/lesson-chrome/exercises/SandboxEditor.tsx',
    vi: 'ô bài tập được chấm — 143 bài có, đã xác nhận 13px trên production',
  },
  {
    lop: 'practiceInput',
    sel: '.practiceInput',
    css: 'src/components/python-studio/studio-chrome.module.css',
    tsx: 'src/components/python-studio/screens/PracticeScreen.tsx',
    vi: 'ô chạy thử ở màn luyện tập',
  },
  {
    lop: 'fallbackInput',
    sel: '.fallbackInput',
    css: 'src/app/ide/ide.module.css',
    tsx: 'src/app/ide/IdeClient.tsx',
    vi: 'ô dự phòng của /ide khi trình soạn thật không nạp được',
  },
  {
    lop: 'tracePredictInput',
    sel: '.tracePredictInput',
    css: 'src/components/python-studio/studio-chrome.module.css',
    tsx: 'src/components/python-studio/screens/ReadScreen.tsx',
    // Ô này ĐÃ 16px từ trước — nên nó không cần một sàn riêng ở media query,
    // và ca dưới chấp nhận cả hai cách đạt: sàn ở mobile HOẶC ≥ 16px sẵn.
    vi: 'ô gõ dự đoán ở màn đọc — đã 16px từ trước, giữ nó trong danh sách để '
      + 'ngày ai hạ nó xuống thì có chỗ bắt',
  },
];

/** Hai ô còn lại dưới 16px, CỐ Ý không sửa — xem lý do ở ghi chú của ca cuối. */
const NGOAI_TAM = ['explanationInput', 'codeInput'];

const boChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
const doc = (p) => readFileSync(join(GOC, p), 'utf8');

/** Cỡ chữ mà một selector nhận, trong `@media` khổ điện thoại nếu có. */
function coChu(van, sel) {
  const ma = boChuThich(van);
  const ra = { thuong: null, mobile: null };
  // Cắt theo khối `@media`: một rule nằm trong `@media (max-width: …)` là sàn
  // điện thoại, ngoài thì là giá trị thường.
  for (const m of ma.matchAll(/@media([^{]*)\{([\s\S]*?)\n\}/g)) {
    const dk = m[1];
    if (!/max-width/.test(dk)) continue;
    const fs = timFontSize(m[2], sel);
    if (fs !== null) ra.mobile = fs;
  }
  const ngoai = ma.replace(/@media[^{]*\{[\s\S]*?\n\}/g, ' ');
  ra.thuong = timFontSize(ngoai, sel);
  return ra;
}

function timFontSize(van, sel) {
  for (const m of van.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const s = m[1].split(/[\n;]/).pop().trim();
    if (!s.split(',').some((x) => x.trim() === sel)) continue;
    const fs = /font-size\s*:\s*([\d.]+)px/.exec(m[2]);
    if (fs) return parseFloat(fs[1]);
  }
  return null;
}

test('ô gõ: phép đọc tìm được mọi tệp đã khai (tự kiểm)', () => {
  // Đọc trượt thì mọi luật dưới đạt RỖNG mà không chứng minh gì.
  assert.ok(O_GO.length >= 4, `danh sách chỉ có ${O_GO.length} mục`);
  for (const o of O_GO) {
    assert.ok(doc(o.css).length > 500, `${o.css} quá ngắn — đọc trượt?`);
    assert.ok(doc(o.tsx).length > 500, `${o.tsx} quá ngắn — đọc trượt?`);
  }
});

test('ô gõ: mỗi lớp đã khai THẬT SỰ được gắn lên một <textarea>', () => {
  // Chiều thứ nhất của danh sách hai chiều. Nếu một lớp không còn trên
  // `<textarea>` nào thì sàn của nó là ngoại lệ lỗi thời — và quan trọng hơn:
  // CSS một mình không biết điều này, nên không có ca nào khác bắt được.
  for (const o of O_GO) {
    const tsx = doc(o.tsx);
    const i = tsx.indexOf(o.lop);
    assert.ok(i > 0, `${o.tsx} không còn nhắc \`${o.lop}\` — mục này đã lỗi thời`);
    // Lùi tìm thẻ mở gần nhất trước chỗ gắn class.
    const truoc = tsx.slice(Math.max(0, i - 600), i);
    const the = [...truoc.matchAll(/<(textarea|input|select|pre|div|span)\b/g)].pop();
    assert.ok(the, `không tìm được thẻ mở cho \`${o.lop}\` trong ${o.tsx}`);
    // FORM CONTROL, không riêng `<textarea>`: iOS phóng khi focus `input` và
    // `select` nữa — bản đầu của ca này đòi đúng `textarea` và báo oan
    // `.tracePredictInput`, vốn là một `<input>` và vốn ĐÃ 16px. Thứ phải chặn
    // là một lớp đã khai mà nay nằm trên `<div>`/`<pre>`/`<span>`: ở đó sàn
    // 16px vô nghĩa (iOS không phóng vì một div), nên mục khai thành ngoại lệ
    // lỗi thời mà không gì khác bắt được.
    assert.ok(
      ['textarea', 'input', 'select'].includes(the[1]),
      `\`${o.lop}\` nay gắn lên <${the[1]}> chứ không một form control — sàn 16px chỉ `
      + 'có nghĩa khi iOS phóng được, tức chỉ cho input/textarea/select. Sửa danh sách.',
    );
  }
});

test('ô gõ: mỗi ô có SÀN ≥ 16px ở khổ điện thoại', () => {
  // Chiều thứ hai. Đạt bằng MỘT trong hai cách: sàn riêng trong `@media
  // max-width`, hoặc giá trị thường đã ≥ 16px (như `.tracePredictInput`).
  for (const o of O_GO) {
    const c = coChu(doc(o.css), o.sel);
    const dat = (c.mobile !== null && c.mobile >= 16)
      || (c.mobile === null && c.thuong !== null && c.thuong >= 16);
    assert.ok(
      dat,
      `\`${o.sel}\` (${o.vi}): thường ${c.thuong}px, mobile ${c.mobile}px. iOS Safari `
      + 'TỰ PHÓNG viewport khi focus một control dưới 16px và không phóng lại ra. '
      + 'Thêm `@media (max-width: 1023.98px) { ' + o.sel + ' { font-size: 16px } }`, '
      + 'KHÔNG chữa bằng `maximum-scale=1` (vi phạm WCAG 1.4.4).',
    );
  }
});

test('ô gõ: viewport KHÔNG được chặn phóng — đó là lý do sàn 16px tồn tại', () => {
  // Nếu một ngày ai thêm `maximum-scale=1`/`user-scalable=no` thì phép phóng
  // của iOS hết xảy ra, nhưng người học cũng hết phóng được chữ (WCAG 1.4.4).
  // Cấm nó ở đây cùng chỗ với sàn, để hai thứ không bị gỡ cho nhau.
  const layout = doc('src/app/layout.tsx');
  assert.ok(
    !/maximum-scale|user-scalable/.test(layout),
    'layout gốc khai `maximum-scale`/`user-scalable` — nó chặn phóng của iOS NHƯNG '
    + 'cũng chặn người học phóng chữ (WCAG 1.4.4). Dùng sàn 16px thay vì chặn.',
  );
});

test('ô gõ: hai ô dưới 16px còn lại được KHAI, kèm lý do', () => {
  // `.explanationInput` (13px !important) và `.codeInput` (11px !important) ở
  // `studio.module.css` — chúng thuộc `PythonStudio`, component đã được khai là
  // CHẾT-MÀ-GIỮ ở vòng trước (`/lesson/python?demo=list` nay 404). Sửa CSS của
  // một component không ai tới là việc không có người dùng; nhưng để nó im lặng
  // thì ngày hồi sinh nó sẽ sai y nguyên. Nên nó là một DÒNG trong lời khai
  // `GIU_DU_CHET`, cạnh ba việc phải sửa đã liệt kê ở đó.
  const cong = doc('../scripts/check-tai-nguyen-chet.mjs');
  const i = cong.indexOf("'component/PythonStudio.tsx'");
  assert.ok(i > 0, 'không còn lời khai cho PythonStudio trong GIU_DU_CHET');
  const khai = cong.slice(i, cong.indexOf('\n  }', i) + 4);
  assert.match(khai, /16px/, 'lời khai chưa nói ra việc "ô gõ dưới 16px" phải sửa khi hồi sinh');
  for (const lop of NGOAI_TAM) {
    assert.ok(khai.includes(lop), `lời khai thiếu \`${lop}\``);
  }
  // Và chúng phải CÒN dưới 16px — ngày ai sửa chúng thì dòng khai này lỗi thời.
  const css = doc('src/components/python-studio/studio.module.css');
  for (const lop of NGOAI_TAM) {
    const c = coChu(css, `.${lop}`);
    const px = c.mobile ?? c.thuong;
    assert.ok(
      px !== null && px < 16,
      `\`.${lop}\` nay là ${px}px — đã đạt sàn, nên gỡ nó khỏi lời khai GIU_DU_CHET.`,
    );
  }
});
