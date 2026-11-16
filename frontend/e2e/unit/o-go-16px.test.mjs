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
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

// ---------------------------------------------------------------------------
// STYLE NỘI TUYẾN THẮNG CSS — sàn 16px chỉ có nghĩa khi thẻ KHÔNG tự ghi fontSize
// ---------------------------------------------------------------------------
//
// Đo 16/11/2026 (bản dựng, 390×844, bài PD14, màn bài tập chấm): `textarea.codeBody`
// tính ra **13px** dù `exercises.module.css` có `textarea.codeBody { font-size: 16px }`
// trong @media điện thoại — vì `SandboxEditor.tsx` ghi `fontSize: 13` trong `style={{…}}`
// của chính thẻ, và style nội tuyến thắng mọi quy tắc CSS không `!important`. Sàn 16px
// của #155 đã vô hiệu từ đó, và cả bốn ca ở trên vẫn XANH vì chúng chỉ đọc CSS tĩnh.

/** Thân thẻ mở chứa `className={styles.<lop>}` — quét có đếm ngoặc nhọn để `=>` trong onChange không cắt sớm. */
function theMoCua(tsx, lop) {
  // Mô-đun CSS được import dưới nhiều tên (`styles`, `c`…) — khớp `<tên>.<lớp>`.
  // MỌI lần xuất hiện, không chỉ lần đầu: `tracePredictInput` nằm ở HAI thẻ của
  // ReadScreen.tsx, và chỉ quét lần đầu thì thẻ thứ hai ghi fontSize cũng lọt.
  const ra = [];
  for (const kh of tsx.matchAll(new RegExp(String.raw`\b[A-Za-z_$][\w$]*\.${lop}\b`, 'g'))) {
    const i = kh.index;
    const dau = tsx.lastIndexOf('<', i);
    let sau = i, sau_ngoac = 0;
    for (; sau < tsx.length; sau++) {
      const c = tsx[sau];
      if (c === '{') sau_ngoac++;
      else if (c === '}') sau_ngoac--;
      else if (c === '>' && sau_ngoac === 0 && tsx[sau - 1] !== '=') break;
    }
    ra.push(tsx.slice(dau, sau + 1));
  }
  return ra;
}

// ---------------------------------------------------------------------------
// ĐỘ PHỦ: MỌI ô gõ trong `src` phải được khai — danh sách tay thì gõ thiếu im lặng
// ---------------------------------------------------------------------------
//
// `O_GO` ở trên là danh sách viết tay và nó đã bỏ sót HAI ô có người dùng thật: ô
// hồi tưởng ở màn tổng kết của MỌI bài (`Recap.tsx`, `fontSize: 14` nội tuyến) và
// `<select>` "Ví dụ test…" của `/ide` (14px). Cả hai làm iOS phóng trang khi focus.
// Nên cổng đếm LẠI từ cây mã: mỗi tệp `.tsx` có `<textarea>`/`<select>`/`<input>` gõ
// được phải nằm trong DA_PHU (đã canh) hoặc NGOAI_TAM (kèm lý do), và SỐ ô mỗi tệp
// phải khớp — thêm một ô vào tệp đã khai cũng đỏ, để người thêm phải nhìn tới sàn 16px.

const KIEU_KHONG_GO = new Set(['radio', 'checkbox', 'range', 'file', 'hidden', 'submit', 'button', 'reset', 'image', 'color']);

function lietTsx(d, ra = []) {
  for (const m of readdirSync(join(GOC, d))) {
    const rel = `${d}/${m}`;
    if (statSync(join(GOC, rel)).isDirectory()) lietTsx(rel, ra);
    else if (rel.endsWith('.tsx')) ra.push(rel);
  }
  return ra;
}

/** Mọi ô gõ được trong một tệp TSX (đã bỏ chú thích): { loai, kieu, the }. */
function cacDieuKhien(tsx) {
  const ra = [];
  for (const kh of tsx.matchAll(/<(textarea|select|input)\b/g)) {
    let i = kh.index + kh[0].length, ngoac = 0;
    for (; i < tsx.length; i++) {
      const c = tsx[i];
      if (c === '{') ngoac++;
      else if (c === '}') ngoac--;
      else if (c === '>' && ngoac === 0 && tsx[i - 1] !== '=') break;
    }
    const the = tsx.slice(kh.index, i + 1);
    const ty = /\btype=(?:"([\w-]+)"|\{?'([\w-]+)'\}?)/.exec(the);
    const kieu = ty ? (ty[1] ?? ty[2]) : null;
    if (kh[1] === 'input' && kieu && KIEU_KHONG_GO.has(kieu)) continue;
    ra.push({ loai: kh[1], kieu, the });
  }
  return ra;
}

const boCtDong = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/** Tệp -> số ô gõ, và sàn 16px được canh ở đâu. */
const DA_PHU = {
  'src/app/ide/IdeClient.tsx': 2, // `.select` + `.fallbackInput`, cả hai ở ide.module.css
  'src/components/lesson-chrome/exercises/Recap.tsx': 1, // fontSize NỘI TUYẾN 16 (ca bên dưới đọc con số)
  'src/components/lesson-chrome/exercises/SandboxEditor.tsx': 1,
  'src/components/python-studio/screens/PracticeScreen.tsx': 1,
  'src/components/python-studio/screens/ReadScreen.tsx': 2,
  'src/components/python-studio/screens/StepTrace.tsx': 1, // dùng chung `.tracePredictInput`
};

/** Ô gõ KHÔNG có đường tới khoá đang xuất bản — mỗi mục kèm VÌ SAO. */
const NGOAI_TAM_GO = {
  'src/components/Chatbot.tsx': [1, 'chỉ được dựng ở `lesson/java` và `lesson/htmlcss` — hai trang minigame di sản ngoài phạm vi (quyết định 13/10), khoá python_advanced không có chatbot.'],
  'src/components/LessonDbDesign.tsx': [1, '`<select>` ngôn ngữ của trang `db_design*` di sản — khoá 179 bài không mount nó, và hướng DB mới (b) sẽ dựng lại màn bằng sqlite3 chứ không dùng tệp này.'],
  'src/components/lesson-chrome/exercises/SelfExplain.tsx': [1, 'màn `selfExplain` do mini-game của pe-v4 dựng — 0/179 bài pe-da có màn đó; đã có `fontSize` nội tuyến 13 nên ngày bật lại phải sửa cùng lúc.'],
  'src/components/lesson-chrome/exercises/TraceTable.tsx': [1, 'màn `traceTable` của mini-game pe-v4 — 0/179 bài pe-da; ô nhập 48px chỉ dùng trong bảng vết viết tay (`step_3.trace`, 0/179).'],
  'src/components/python-studio/PythonStudio.tsx': [2, 'component CHẾT-MÀ-GIỮ (xem `GIU_DU_CHET` ở check-tai-nguyen-chet và `NGOAI_TAM` của o-go-16px): hai ô `.explanationInput`/`.codeInput` dưới 16px đã khai ở việc (4).'],
};

test('ô gõ: MỌI tệp TSX có ô gõ được đều đã khai (DA_PHU hoặc NGOAI_TAM_GO), đúng số ô', () => {
  const thay = {};
  for (const p of lietTsx('src')) {
    const ds = cacDieuKhien(boCtDong(readFileSync(join(GOC, p), 'utf8')));
    if (ds.length) thay[p] = ds.length;
  }
  // Tự kiểm: phép quét trượt thì mọi so sánh dưới đạt RỖNG.
  assert.ok(Object.keys(thay).length >= 8, `phép quét chỉ thấy ${Object.keys(thay).length} tệp có ô gõ — đọc trượt?`);
  const khai = { ...DA_PHU, ...Object.fromEntries(Object.entries(NGOAI_TAM_GO).map(([k, v]) => [k, v[0]])) };
  for (const [p, n] of Object.entries(thay)) {
    assert.ok(p in khai, `${p} có ${n} ô gõ mà chưa khai — iOS phóng trang khi focus ô < 16px. `
      + 'Thêm vào DA_PHU (kèm sàn 16px) hoặc NGOAI_TAM_GO (kèm lý do không có đường tới).');
    assert.equal(n, khai[p], `${p} nay có ${n} ô gõ, đã khai ${khai[p]} — ô mới phải được xem sàn 16px.`);
  }
  for (const p of Object.keys(khai)) {
    assert.ok(p in thay, `${p} đã khai nhưng không còn ô gõ nào — mục khai đã lỗi thời, gỡ đi.`);
  }
  for (const [p, [, vi]] of Object.entries(NGOAI_TAM_GO)) {
    assert.ok(vi.length >= 60, `${p}: lý do quá ngắn — danh sách ngoại lệ không kèm lý do là danh sách không ai dám dọn.`);
  }
  // Hai danh sách không được chồng nhau (tệp vừa canh vừa miễn là tệp bị hấp thụ).
  for (const p of Object.keys(DA_PHU)) assert.ok(!(p in NGOAI_TAM_GO), `${p} nằm trong CẢ HAI danh sách`);
});

test('ô gõ đã canh: fontSize NỘI TUYẾN (nếu có) phải ≥ 16 — Recap.tsx ghi 16 chứ không 14', () => {
  for (const p of Object.keys(DA_PHU)) {
    for (const d of cacDieuKhien(boCtDong(readFileSync(join(GOC, p), 'utf8')))) {
      const m = /\bfontSize\s*:\s*([\d.]+)/.exec(d.the);
      if (m) assert.ok(parseFloat(m[1]) >= 16, `${p}: <${d.loai}> ghi fontSize ${m[1]} nội tuyến — dưới 16 thì iOS phóng trang.`);
    }
  }
  // Recap là ca CÓ fontSize nội tuyến thật; nếu nó thôi ghi (chuyển sang CSS) thì ca này vẫn đạt, nhưng
  // ô phải còn đó — kiểm bằng ca đếm ở trên.
});

test('/ide: `.select` có sàn 16px ở khổ điện thoại (select cũng làm iOS phóng trang)', () => {
  const c = coChu(doc('src/app/ide/ide.module.css'), '.select');
  assert.ok(c.mobile !== null && c.mobile >= 16, `.select ở /ide: mobile ${c.mobile}px, thường ${c.thuong}px — thiếu sàn 16px trong @media`);
});

test('ô gõ: thẻ KHÔNG ghi fontSize nội tuyến (nó thắng sàn 16px trong CSS)', () => {
  for (const o of O_GO) {
    const tsx = doc(o.tsx).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
    const cac = theMoCua(tsx, o.lop);
    assert.ok(cac.length >= 1 && cac.every((x) => x.length > 20), `không bóc được thẻ mở của \`${o.lop}\` trong ${o.tsx}`);
    for (const the of cac) {
      assert.ok(
        !/\bfontSize\b/.test(the),
        `\`${o.lop}\` ghi fontSize NỘI TUYẾN trong ${o.tsx} — style nội tuyến thắng quy tắc CSS không `
        + '`!important`, nên sàn 16px ở @media vô hiệu và iOS vẫn phóng trang khi focus ô này.',
      );
    }
  }
});
