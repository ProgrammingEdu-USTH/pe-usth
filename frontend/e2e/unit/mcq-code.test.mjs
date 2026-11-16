/**
 * Đoạn code của câu trắc nghiệm — 219/537 câu đang phát đã MẤT nó.
 *
 * Lỗi thật, đo trên bản dựng 27/10 và đã sửa 28/10. 471/1032 câu của gói nguồn
 * mang một trường `code` RIÊNG, và đề bài của chúng không tự đứng được.
 * `cau_trac_nghiem()` bỏ trường đó, nên:
 *
 *   · **219/537 câu** đang phát mất đoạn code quyết định đáp án;
 *   · **90 câu ở 45 bài** thì đề bài CÒN TRỎ TỚI nó, nên không trả lời được —
 *     nguyên văn PY01, bài ĐẦU TIÊN của khoá: "Buổi sáng bán 10 cốc, chiều bán
 *     7 cốc. Kết quả ở lệnh print cuối có giá trị nào?" và không có lệnh print
 *     nào trên màn hình;
 *   · **VZ20 có HAI câu trùng nhau từng ký tự** trong cùng một bài, vì thứ duy
 *     nhất phân biệt hai biến thể là `code`.
 *
 * Không ngoại lệ nào được ném, không log nào đỏ, và cả 30 ca test backend đều
 * xanh — chúng kiểm "snapshot khớp bản dựng", không kiểm "câu hỏi trả lời được".
 *
 * Vì sao code được GẤP vào `question` chứ không là một trường mới: hình dạng
 * này đi qua `normalizeQuestion` ở backend để vào kho quiz chấm Ở SERVER, mà
 * hàm đó chỉ đọc `question`/`options`/`explanation`. Một trường `code` riêng sẽ
 * bị BỎ ÂM THẦM ở đúng con đường chấm duy nhất client không giả mạo được — tức
 * tái tạo chính cái bẫy vừa sửa, ở chỗ tệ hơn.
 *
 * Nên có HAI nửa phải khớp từng ký tự, và đó là thứ bộ test này canh:
 * `NOI_DE_CODE` trong scripts/pe-da/build.py nối, `tachDeVaCode()` tách.
 *
 * Bằng chứng bắt được lỗi thật (gỡ bản sửa ra, test phải trượt) — đã ĐẾM:
 *   · build không gấp code vào đề (quay lại bản 27/10) → `check.py` **214 lỗi**;
 *   · gấp bằng MỘT dòng mới thay vì dòng trống        → `check.py` **214 lỗi**;
 *   · phía frontend, các ablation ở cuối file này.
 *
 * Và một luật đã BỊ XOÁ vì nó không chứng minh được gì: một regex "đề trỏ tới
 * code thì phải có code" báo oan ngay PY01 (code nội tuyến trong đề), rồi sau
 * khi thêm phép loại trừ thì bắt được **0 ca ngay cả khi gỡ cả hai luật trên**.
 * Xem chú thích trong `kiem_trac_nghiem()`.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tachDeVaCode } from '../../src/lib/studio-lesson.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const DUNG = join(FE, '..', 'scripts', 'pe-da', 'out', 'lessons.json');

// ---------------------------------------------------------------------------
// tachDeVaCode — hàm thuần
// ---------------------------------------------------------------------------

test('tachDeVaCode: đề một dòng → không có code, trả nguyên đề', () => {
  const r = tachDeVaCode('Giá trị nào đúng?');
  assert.equal(r.de, 'Giá trị nào đúng?');
  assert.equal(r.code, undefined);
});

test('tachDeVaCode: tách ở dòng trống, code bị cắt khoảng trắng hai đầu', () => {
  const r = tachDeVaCode('Đoạn code dưới in gì?\n\nx = 1\nprint(x)\n');
  assert.equal(r.de, 'Đoạn code dưới in gì?');
  assert.equal(r.code, 'x = 1\nprint(x)');
});

test('tachDeVaCode: chỉ tách ở dòng trống ĐẦU — code nhiều khối vẫn nguyên', () => {
  // Code của nguồn có thể tự chứa dòng trống; tách ở lần cuối hay tách hết thì
  // một nửa code rơi vào tiêu đề.
  const r = tachDeVaCode('In gì?\n\na = 1\n\nb = 2\nprint(a + b)');
  assert.equal(r.de, 'In gì?');
  assert.equal(r.code, 'a = 1\n\nb = 2\nprint(a + b)');
});

test('tachDeVaCode: dòng trống mà sau đó RỖNG → không bịa ra khối code', () => {
  const r = tachDeVaCode('Giá trị nào đúng?\n\n   \n');
  assert.equal(r.code, undefined);
  assert.equal(r.de, 'Giá trị nào đúng?');
});

test('tachDeVaCode: đề nhiều dòng nhưng KHÔNG có dòng trống → vẫn là đề', () => {
  // `\n` đơn không phải mốc nối. Nếu lấy `\n` làm mốc thì một đề xuống dòng
  // bình thường bị cắt làm hai và nửa sau hiện thành khối code.
  const r = tachDeVaCode('Dòng một\nDòng hai');
  assert.equal(r.de, 'Dòng một\nDòng hai');
  assert.equal(r.code, undefined);
});

// ---------------------------------------------------------------------------
// Đối chiếu BẢN DỰNG THẬT — fixture tự bịa không chứng minh được build phát đúng
// ---------------------------------------------------------------------------

const coDung = existsSync(DUNG);
const bai = coDung ? JSON.parse(readFileSync(DUNG, 'utf8')).lessons : [];
const boQua = { skip: coDung ? false : 'chưa dựng — chạy `py scripts/pe-da/build.py`' };

const cauCua = (b) => (b.content_json?.step_2?.mcq ?? []);

test('bản dựng: 161/537 câu mang đoạn code (219 trừ 42 bỏ tự động, trừ 16 khai tay), và mọi đoạn tách lại được', boQua, () => {
  let tong = 0;
  let coCode = 0;
  for (const b of bai) {
    for (const q of cauCua(b)) {
      tong += 1;
      const { de, code } = tachDeVaCode(q.question);
      if (!code) continue;
      coCode += 1;
      assert.ok(de.trim(), `${b.lesson_code}: tách ra đề RỖNG`);
      assert.ok(!code.startsWith('\n'), `${b.lesson_code}: code còn dòng trống đầu`);
    }
  }
  assert.equal(tong, 537);
  // 219 câu của nguồn mang `code`; 42 câu trong số đó bị BỎ code vì đoạn ấy không liên quan tới đề
  // (xem `code_khong_lien_quan` ở scripts/pe-da/build.py), và thêm 16 câu bị bỏ theo danh sách
  // khai tay `scripts/pe-da/mcq-bo-code.json` (#283, 17/11/2026: code mâu thuẫn hoặc đổi đề).
  // Đổi con số này thì phải biết VÌ SAO.
  assert.equal(coCode, 161);
});

test('bản dựng: mọi câu khai trong mcq-bo-code.json đã MẤT đoạn code, và đề vẫn nguyên vẹn', boQua, () => {
  // Hàng rào của phần khai tay: `check.py` so bản dựng với nguồn, còn ca này đứng ở phía người học —
  // câu khai bỏ code mà bản dựng vẫn gắn code là đúng lỗi nó ra đời để chữa (code mâu thuẫn đáp án,
  // vd. PD05: đề cho mask [True, False, True], code tạo mask [False, True, True]).
  const khai = JSON.parse(readFileSync(new URL('../../../scripts/pe-da/mcq-bo-code.json', import.meta.url), 'utf8')).cau;
  const nguon = JSON.parse(readFileSync(new URL('../../../scripts/pe-da/source/practice.json', import.meta.url), 'utf8'));
  const dePhatRa = new Map();
  for (const b of bai) for (const q of cauCua(b)) dePhatRa.set(b.lesson_code + '|' + q.question.trim(), q);
  const ids = Object.keys(khai);
  assert.ok(ids.length >= 10, 'danh sách khai tay phải còn ít nhất 10 mục — rỗng thì ca này không chứng minh gì');
  for (const id of ids) {
    const l = nguon.lessons.find((x) => id.startsWith(x.id + '-'));
    assert.ok(l, `${id}: không tìm được bài trong gói nguồn`);
    const q0 = l.mcq[0];
    const goc = [q0, ...(q0.variants ?? [])].find((q) => q.id === id);
    assert.ok(goc && goc.code, `${id}: nguồn không có câu hoặc không có code`);
    const q = dePhatRa.get(l.id + '|' + goc.prompt.trim());
    assert.ok(q, `${id}: bản dựng không có câu nào có ĐÚNG đề của nguồn (code vẫn còn gắn, hoặc câu không được phát)`);
    assert.equal(tachDeVaCode(q.question).code, undefined, `${id}: bản dựng vẫn mang code`);
  }
});

test('bản dựng: câu còn mang code không phải loại "code trang trí" (không định danh nào chung với đề)', boQua, () => {
  // Bản chép JS của phép loại trong build.py/check.py — chỉ để ca này đọc BẢN DỰNG và đòi phép loại
  // ĐÃ chạy. Câu bị giữ code vì việc bỏ làm đề TRÙNG câu khác của bài thì được miễn.
  const dinhDanh = (s) => new Set((s.match(/[A-Za-z_][A-Za-z_0-9]{2,}/g) ?? []).map((x) => x.toLowerCase()));
  const chiVaoCode = /code|đoạn|lệnh|biến|ở trên|bên trên|dưới đây|in ra|print|đầu ra|output|dòng (?:cuối|đầu|thứ|số|\d)/;
  const sai = [];
  for (const b of bai) {
    const qs = cauCua(b);
    const des = qs.map((q) => tachDeVaCode(q.question).de.trim());
    qs.forEach((q, i) => {
      const { de, code } = tachDeVaCode(q.question);
      if (!code) return;
      const a = dinhDanh(de);
      const chung = [...a].some((x) => dinhDanh(code).has(x));
      const trangTri = a.size >= 2 && !chung && !chiVaoCode.test(de.toLowerCase());
      if (trangTri && des.filter((d) => d === de.trim()).length === 1) sai.push(`${b.lesson_code} câu ${i}`);
    });
  }
  assert.deepEqual(sai, [], `còn câu mang code trang trí: ${sai.slice(0, 6).join(', ')}`);
});

test('bản dựng: KHÔNG bài nào có hai câu trùng nguyên văn', boQua, () => {
  // VZ20 từng có đúng chuyện này: hai biến thể dùng chung câu dẫn và thứ phân
  // biệt chúng (`code`) bị bỏ, nên người học thấy hai màn hỏi y hệt nhau.
  const trung = [];
  for (const b of bai) {
    const seen = new Set();
    for (const q of cauCua(b)) {
      if (seen.has(q.question)) trung.push(`${b.lesson_code}: ${q.question.slice(0, 50)}`);
      seen.add(q.question);
    }
  }
  assert.deepEqual(trung, []);
});

test('bản dựng: đề bài tách ra không bao giờ RỖNG', boQua, () => {
  // Nếu `prompt` của nguồn rỗng mà `code` có thì `question` bắt đầu bằng mốc
  // nối, và màn trắc nghiệm hiện một tiêu đề trống trên một khối code.
  const xau = [];
  for (const b of bai) {
    for (const q of cauCua(b)) {
      if (!tachDeVaCode(q.question).de.trim()) xau.push(b.lesson_code);
    }
  }
  assert.deepEqual(xau, []);
});

// ---------------------------------------------------------------------------
// DÂY NỐI — thứ đã hỏng là không ai dựng khối code ra, nên phải canh chỗ gọi
// ---------------------------------------------------------------------------

test('McqScreen thực sự dựng khối code: gọi tachDeVaCode và dùng CodeBlock', () => {
  const src = readFileSync(
    join(FE, 'src', 'components', 'python-studio', 'screens', 'McqScreen.tsx'),
    'utf8',
  );
  assert.ok(src.includes('tachDeVaCode('), 'không tách thì cả chuỗi gộp vào tiêu đề');
  assert.ok(src.includes('CodeBlock'), 'code phải dựng bằng CodeBlock, không phải văn xuôi');
  // Tiêu đề phải là ĐỀ đã tách, không phải `q.question` nguyên bản.
  assert.ok(!/title=\{q\.question\}/.test(src), 'vẫn truyền nguyên question làm tiêu đề');
});

test('McqScreen: khối code của đề KHÔNG nằm trong .readCode — nếu không nó dính liền phương án A', () => {
  // `.readCode > div { margin-bottom: 0 }` là luật của màn ĐỌC (gap của `.read`
  // lo khoảng cách). Mượn nó ở màn trắc nghiệm xoá luôn 16px của `.codeCard`:
  // đo trong Chrome, đáy khối code và đỉnh phương án A cùng ở y = 396.
  const src = readFileSync(
    join(FE, 'src', 'components', 'python-studio', 'screens', 'McqScreen.tsx'),
    'utf8',
  );
  const khongChuThich = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/className=\{c\.readCode\}/.test(khongChuThich), 'McqScreen lại bọc khối code bằng c.readCode');
  const css = readFileSync(join(FE, 'src', 'components', 'python-studio', 'studio-chrome.module.css'), 'utf8');
  assert.match(css, /\.readCode > div \{\s*margin-bottom: 0;/, 'luật .readCode đổi rồi: xem lại vì sao McqScreen từng né nó');
  const ex = readFileSync(join(FE, 'src', 'components', 'lesson-chrome', 'exercises', 'exercises.module.css'), 'utf8');
  assert.match(ex, /\.codeCard \{[^}]*margin-bottom: 16px;/, '.codeCard thôi mang 16px: khối code và phương án A lại dính nhau');
});
