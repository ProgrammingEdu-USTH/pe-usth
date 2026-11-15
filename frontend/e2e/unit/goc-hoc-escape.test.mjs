// Esc trong ô GÕ không được đá người học khỏi màn / bỏ qua intro.
//
// VÌ SAO CÓ CỔNG NÀY. Cảnh Góc học có hai ô gõ: `#hintIn` (panel "Hỏi gợi ý…") và
// `#tenIn` (ô tên). Bộ nghe `keydown` ở `window` từng bắt MỌI Esc: đang gõ dở một
// câu hỏi mà bấm Esc là `back()` (rời màn con) hoặc `finishIntro()` (bỏ qua intro) —
// mất chữ đang nhập. Phát hiện khi soát nhánh `test` (33834e6), nơi đồng đội đã vá
// bằng cách kiểm `tagName` của `e.target`.
//
// CỔNG NÀY CHẠY THẬT HÀM `onEscape`, không đọc regex: bóc nó khỏi `engine.js` bằng
// phép đếm ngoặc rồi `new Function` với phụ thuộc giả — cùng khuôn
// `goc-hoc-nhan-mot.test.mjs`. (Bản bóc hàm chép lại ở đây thay vì import: tệp kia
// gói nó trong hàm dựng cảnh giả riêng. Hai bản trôi khỏi nhau thì ca "bóc được
// hàm" bên dưới đỏ trước.)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const HERE = dirname(fileURLToPath(import.meta.url));
const JS = readFileSync(join(HERE, '..', '..', 'src', 'components', 'goc-hoc', 'engine.js'), 'utf8');

/** Bóc `function <ten>(...) { ... }` bằng phép đếm ngoặc nhọn. */
function hamTen(src, ten) {
  const i = src.search(new RegExp(`function\\s+${ten}\\s*\\(`));
  if (i < 0) return null;
  const mo = src.indexOf('{', i);
  let sau = 1;
  for (let j = mo + 1; j < src.length; j++) {
    if (src[j] === '{') sau++;
    else if (src[j] === '}' && --sau === 0) return src.slice(i, j + 1);
  }
  return null;
}

/** Dựng `onEscape` với cảnh giả; trả về hàm + nhật ký các lời gọi. */
function dung({ intro = false, route = null, peeking = false } = {}) {
  const src = hamTen(JS, 'onEscape');
  assert.ok(src, 'không bóc được `onEscape` khỏi engine.js — đổi tên hàm thì sửa ca này; '
    + 'im lặng xanh ở đây là bỏ mất phép đo.');
  const log = [];
  const calPop = { hidden: false };
  const f = new Function('deps', `
    const app = deps.app, finishIntro = deps.finishIntro, countUp = deps.countUp,
          drawCal = deps.drawCal, back = deps.back, unpeek = deps.unpeek,
          hidePop = deps.hidePop, $ = deps.$;
    const route = deps.route, peeking = deps.peeking;
    ${src}
    return onEscape;
  `);
  const onEscape = f({
    app: { classList: { contains: (c) => c === 'intro' && intro } },
    finishIntro: () => log.push('finishIntro'),
    countUp: () => log.push('countUp'),
    drawCal: () => log.push('drawCal'),
    back: () => log.push('back'),
    unpeek: () => log.push('unpeek'),
    hidePop: (force) => log.push(`hidePop(${force})`),
    $: () => calPop,
    route, peeking,
  });
  return { onEscape, log, calPop };
}

const phim = (target, extra = {}) => ({ key: 'Escape', defaultPrevented: false, target, ...extra });
const gõ = (tagName) => ({ tagName, isContentEditable: false });

test('phép bóc hàm còn đọc được — rỗng thì mọi ca dưới đây vô nghĩa', () => {
  const src = hamTen(JS, 'onEscape');
  assert.ok(src, 'không bóc được `onEscape`');
  assert.match(src, /Escape/, '`onEscape` bóc ra không chứa "Escape" — phép đếm ngoặc đã cắt nhầm');
  assert.match(JS, /on\(window,\s*'keydown',\s*onEscape\)/,
    'engine.js không đăng ký `onEscape` cho keydown ở window — hàm dựng rồi mà không ai gọi');
});

test('Esc trong INPUT / TEXTAREA / SELECT / contentEditable KHÔNG làm gì', () => {
  for (const [ten, tg] of [
    ['input', gõ('INPUT')],
    ['textarea', gõ('TEXTAREA')],
    ['select', gõ('SELECT')],
    ['contentEditable', { tagName: 'DIV', isContentEditable: true }],
  ]) {
    // đủ ba nhánh bên dưới: nếu chỉ thử một nhánh thì guard hỏng ở nhánh kia vẫn xanh
    for (const canh of [{ intro: true }, { route: 'learn' }, { peeking: true }, {}]) {
      const { onEscape, log } = dung(canh);
      onEscape(phim(tg));
      assert.deepEqual(log, [], `Esc trong <${ten}> vẫn chạy ${JSON.stringify(log)} ở cảnh ${JSON.stringify(canh)} — `
        + 'người học đang gõ dở bị đá khỏi màn');
    }
  }
});

test('Esc ngoài ô gõ vẫn thoát đúng như cũ — intro, màn con, xem sách, rồi đóng popup', () => {
  const body = gõ('BODY');
  let c = dung({ intro: true });
  c.onEscape(phim(body));
  assert.deepEqual(c.log, ['finishIntro', 'countUp', 'drawCal'], 'Esc ở intro phải bỏ qua intro');

  c = dung({ route: 'learn' });
  c.onEscape(phim(body));
  assert.deepEqual(c.log, ['back'], 'Esc ở màn con phải quay lại');

  c = dung({ peeking: true });
  c.onEscape(phim(body));
  assert.deepEqual(c.log, ['unpeek'], 'Esc khi đang xem sách phải đóng sách');

  c = dung();
  c.onEscape(phim(body));
  assert.deepEqual(c.log, ['hidePop(true)'], 'Esc ở cảnh chính phải đóng popup');
  assert.equal(c.calPop.hidden, true, 'Esc ở cảnh chính phải ẩn lịch');
});

test('phím khác Esc, hoặc sự kiện đã bị chặn, thì bỏ qua', () => {
  let c = dung({ route: 'learn' });
  c.onEscape({ key: 'Enter', defaultPrevented: false, target: gõ('BODY') });
  assert.deepEqual(c.log, [], 'Enter không được kích nhánh Esc');

  c = dung({ route: 'learn' });
  c.onEscape(phim(gõ('BODY'), { defaultPrevented: true }));
  assert.deepEqual(c.log, [], 'Esc đã bị bộ nghe khác chặn (vd. đóng một hộp thoại) thì không được chạy lần hai');
});

test('target thiếu hẳn (không có tagName) không làm hàm ném', () => {
  const c = dung({ route: 'learn' });
  assert.doesNotThrow(() => c.onEscape({ key: 'Escape', defaultPrevented: false, target: null }));
  assert.deepEqual(c.log, ['back']);
});
