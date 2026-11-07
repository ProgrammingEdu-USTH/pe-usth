/**
 * `code nội tuyến` phải được bóc khỏi dấu backtick ở MỌI nơi dựng văn bản
 * giáo trình.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: ngày 27/10/2026 một người thử gửi ảnh ô "KIẾN THỨC
 * CỐT LÕI ĐÃ HỌC" ở màn tổng kết, trong đó có nguyên văn
 *
 *     `.venv\Scripts\python -m pip install numpy`
 *
 * — kể cả hai dấu backtick. Họ viết: "Có thể render markdown lại để nó ra mono
 * font, tránh bị để dấu ` nhìn hơi khó".
 *
 * NGUYÊN NHÂN đáng ghi hơn triệu chứng: hàm bóc backtick ĐÃ CÓ và màn đọc ĐÃ
 * dùng nó. Ô tổng kết lấy ĐOẠN VĂN ĐẦU của từng màn đọc làm ý chính
 * (`RecapScreen.facts`) rồi dựng thẳng `{f}`. Tức cùng MỘT câu chữ, đi hai
 * đường, ra hai kết quả — và đường hỏng là đường không ai nghĩ tới vì nó chỉ
 * mượn lại dữ liệu của đường kia.
 *
 * Đó là lý do ca test ở đây canh "hai nơi dùng CHUNG một hàm" chứ không canh
 * "Recap có gọi bóc backtick". Nơi thứ ba mượn lại cùng dữ liệu sẽ lại hỏng
 * đúng kiểu này; thứ chặn được là hàm chỉ có MỘT bản.
 *
 * ABLATION:
 *   Recap dựng {f} trần trở lại               → 1 đỏ
 *   mỗi nhánh giữ một bản withInlineCode riêng → 1 đỏ
 *   regex nuốt qua xuống dòng ([^`] thay vì [^`\n]) → 1 đỏ
 *   bỏ <span> bọc withInlineCode(f) trong <li> flex → 1 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const doc = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

const LIB = doc(join(FE, 'src', 'lib', 'inline-code.tsx'));
const RECAP = doc(join(FE, 'src', 'components', 'lesson-chrome', 'exercises', 'Recap.tsx'));
const CHROME = doc(join(FE, 'src', 'components', 'python-studio', 'screens', 'chrome.tsx'));

test('ô tổng kết bóc backtick, không dựng chuỗi trần', () => {
  assert.match(
    RECAP,
    /\{withInlineCode\(f\)\}/,
    'Ý chính ở màn tổng kết lấy từ đoạn văn của màn đọc, mà giáo trình 172 bài '
      + 'dùng backtick dày đặc. Dựng trần thì học viên đọc ra cả dấu backtick.',
  );
});

test('CẢ HAI nhánh import cùng một hàm, không mỗi nơi một bản', () => {
  // Đây mới là ca chịu lực: lỗi gốc không phải "Recap quên bóc", mà là "có hai
  // đường dựng cùng một câu chữ". Hai bản hàm thì sớm muộn chúng lệch nhau.
  for (const [ten, ma] of [['Recap.tsx', RECAP], ['screens/chrome.tsx', CHROME]]) {
    assert.match(
      ma,
      /import \{ withInlineCode \} from '@\/lib\/inline-code'/,
      `${ten} phải dùng bản dùng chung ở src/lib/inline-code.tsx.`,
    );
  }
  // Và chỉ một nơi ĐỊNH NGHĨA nó.
  for (const [ten, ma] of [['Recap.tsx', RECAP], ['screens/chrome.tsx', CHROME]]) {
    assert.ok(
      !/function withInlineCode/.test(ma),
      `${ten} định nghĩa lại withInlineCode — phải import, không chép.`,
    );
  }
  assert.match(LIB, /export function withInlineCode/);
});

test('regex chỉ nhận cặp backtick TRONG MỘT DÒNG', () => {
  // Lấy chính regex trong nguồn ra chạy, không chép tay một bản thứ hai vào
  // đây — chép tay thì ca test chứng minh bản chép, không chứng minh bản chạy.
  const m = /const INLINE_CODE = (\/.+\/g);/.exec(LIB);
  assert.ok(m, 'Không tìm thấy hằng INLINE_CODE trong nguồn.');
  const re = eval(m[1]);

  const motDong = 'gõ `pip install numpy` vào terminal';
  assert.deepEqual([...motDong.matchAll(re)].map((x) => x[1]), ['pip install numpy']);

  // Backtick LẺ ở hai dòng khác nhau không được nuốt cả đoạn giữa: giáo trình
  // có đoạn dùng backtick đơn trong văn xuôi, và nuốt nhầm thì cả một đoạn văn
  // biến thành một khối <code>.
  re.lastIndex = 0;
  const haiDong = 'dòng đầu có một ` lẻ\ndòng sau cũng có ` lẻ';
  assert.deepEqual([...haiDong.matchAll(re)], [], 'Regex đã vắt qua xuống dòng.');
});

// ---------------------------------------------------------------------------
// withInlineCode trả về NHIỀU nút — đặt thẳng vào một hộp flex là vỡ.
// ---------------------------------------------------------------------------
//
// Bản sửa 27/10 ở trên đổi `{f}` (MỘT nút chữ) thành `{withInlineCode(f)}`
// (chữ + <code> + chữ…) mà không đổi cái <li> chứa nó — một hộp `display: flex`
// (dấu ✓ + chữ). Mỗi nút thành một flex item riêng. Đo trên production
// 04/11/2026 (PY02, 390×844): ý chính vỡ thành cột, <code> rộng 19px xếp dọc
// TỪNG KÝ TỰ, một <code> lọt ra x = 500..519 trên màn 390, một <li> cao 789px.
// Đếm trên bản dựng: 167/565 ý chính có mã nội dòng, 82/179 bài dính ít nhất
// một. Phép dò dùng để tìm (chạy được ở mọi màn): phần tử flex/grid có con
// TRỰC TIẾP vừa là nút chữ vừa là <code> — chỉ màn tổng kết khớp.

test('ý chính ở màn tổng kết là MỘT flex item: withInlineCode nằm trong một <span>', () => {
  const sach = RECAP.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  const li = sach.slice(sach.indexOf('facts.map'), sach.indexOf('</li>', sach.indexOf('facts.map')));
  assert.ok(li.length > 0, 'không tìm thấy khối <li> của facts.map — đổi cấu trúc thì sửa ca này.');
  assert.match(li, /display: 'flex'/, '<li> thôi là flex thì ca này hết lý do — xem lại.');
  assert.match(
    li,
    /<span>\{withInlineCode\(f\)\}<\/span>/,
    'withInlineCode(f) là con TRỰC TIẾP của <li> flex ⇒ mỗi đoạn chữ / <code> thành một cột.',
  );
});

// ---------------------------------------------------------------------------
// LẦN THỨ BA, và lần này cổng thôi LIỆT KÊ NƠI.
// ---------------------------------------------------------------------------
//
// Ca ở trên canh ĐÚNG HAI nơi, và chú thích đầu file đã tự đoán: "nơi thứ ba
// mượn lại cùng dữ liệu sẽ lại hỏng đúng kiểu này". Nó hỏng thật. Đo trên bản
// dựng 08/11/2026 — đếm MỌI chuỗi có backtick, theo đường dẫn trường:
//
//     382  step_1.read[][].text                 ✓ paragraphs
//      58  step_2.practice[].prompt             ✓ paragraphs
//      54  step_1.read[][].trace.predict.prompt ✓ paragraphs
//      37  step_2.practice[].answer             ✓ paragraphs
//       8  step_2.mcq[].question                ✗ DỰNG TRẦN
//       8  step_4.hints[].body                  ✗ DỰNG TRẦN
//       6  step_4.task.body                     ✓ paragraphs
//       5  step_1.read[][].lanes[].note         ✓ paragraphs
//       5  step_1.read[][].rows[][]  (ô bảng)   ✗ DỰNG TRẦN
//       5  step_2.mcq[].options[].detail        ✗ DỰNG TRẦN
//       5  step_2.mcq[].options[].text          ✗ DỰNG TRẦN
//       2  step_1.read[][].lanes[].label        ✓ paragraphs
//       1  step_2.mcq[].explanation             ✗ DỰNG TRẦN
//
// Tức **32 chuỗi trên 6 đường** đang hiện ra kèm nguyên dấu backtick cho người
// học, không phải một chỗ.
//
// Nên ca này KHÔNG liệt kê nơi nữa. Nó đọc BẢN DỰNG, gom mọi đường dẫn trường
// có backtick, và đòi mỗi đường phải có một dòng khai kèm BIỂU THỨC dựng nó —
// biểu thức ấy phải có thật trong tệp renderer. Hai chiều: đường có backtick mà
// chưa khai là LỖI, và một dòng khai mà renderer không còn gọi `paragraphs`/
// `withInlineCode` cũng là LỖI.
//
// GIỚI HẠN PHẢI NÓI RA: cổng chỉ thấy đường nào ĐANG có backtick trong bản
// dựng. Một renderer dựng trần mà nội dung chưa dùng backtick thì nó im — nó
// bắt lỗi ĐÚNG LÚC lỗi thành thấy được, không sớm hơn.
const DUONG_BOC = {
  'step_1.read[][].text': ['screens/ReadScreen.tsx', '{paragraphs(block.text)}'],
  'step_1.read[][].rows[][]': ['screens/ReadScreen.tsx', '{paragraphs(cell)}'],
  'step_1.read[][].headers[]': ['screens/ReadScreen.tsx', '{paragraphs(h)}'],
  'step_1.read[][].lanes[].label': ['screens/ReadScreen.tsx', 'paragraphs(lane.label)'],
  'step_1.read[][].lanes[].note': ['screens/ReadScreen.tsx', 'paragraphs(lane.note)'],
  'step_1.read[][].trace.predict.prompt': [
    'screens/StepTrace.tsx', '{paragraphs(trace.predict.prompt)}'],
  'step_2.practice[].prompt': ['screens/PracticeScreen.tsx', 'paragraphs(item.prompt)'],
  'step_2.practice[].answer': ['screens/PracticeScreen.tsx', '{paragraphs(item.answer)}'],
  'step_2.mcq[].question': ['screens/McqScreen.tsx', 'title={paragraphs(de)}'],
  'step_2.mcq[].options[].text': [
    '../lesson-chrome/exercises/Mcq.tsx', '{withInlineCode(opt.label)}'],
  'step_2.mcq[].options[].detail': [
    '../lesson-chrome/exercises/Mcq.tsx', '{withInlineCode(opt.sub)}'],
  'step_2.mcq[].explanation': ['screens/chrome.tsx', 'paragraphs(verdict.explain)'],
  'step_4.task.body': ['screens/SandboxScreen.tsx', 'paragraphs(four?.task?.body)'],
  'step_4.hints[].body': ['screens/SandboxScreen.tsx', 'paragraphs(h.body)'],
};

/** Mọi đường dẫn trường có backtick trong bản dựng, kèm số lần. */
function duongCoBacktick() {
  const goi = JSON.parse(
    readFileSync(join(FE, '..', 'scripts', 'pe-da', 'out', 'lessons.json'), 'utf8'),
  );
  const ls = Array.isArray(goi) ? goi : goi.lessons;
  const dem = new Map();
  const di = (o, duong) => {
    if (typeof o === 'string') {
      if (o.includes('`')) dem.set(duong, (dem.get(duong) ?? 0) + 1);
      return;
    }
    if (Array.isArray(o)) return o.forEach((x) => di(x, `${duong}[]`));
    if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) di(v, duong ? `${duong}.${k}` : k);
    }
  };
  for (const b of ls) di(b.content_json ?? b, '');
  return dem;
}

test('phép quét bản dựng còn đọc được — rỗng thì hai ca dưới vô nghĩa', () => {
  const dem = duongCoBacktick();
  assert.ok(
    dem.size >= 8,
    `chỉ thấy ${dem.size} đường dẫn trường có backtick trong bản dựng — phép duyệt đã `
      + 'trượt, và khi đó ca dưới XANH vì không có gì để kiểm. Sửa `duongCoBacktick`, '
      + 'đừng nới ca.',
  );
});

test('MỌI trường có backtick đều được khai, kèm biểu thức dựng có thật', () => {
  const dem = duongCoBacktick();
  const chuaKhai = [...dem.keys()].filter((k) => !(k in DUONG_BOC));
  assert.deepEqual(
    chuaKhai.map((k) => `${k} (${dem.get(k)} chuỗi)`),
    [],
    'Đường dẫn trường có backtick mà CHƯA KHAI ở `DUONG_BOC`. Hoặc renderer của nó đã '
      + 'bóc backtick — thì thêm một dòng khai — hoặc nó đang dựng trần và người học '
      + 'đọc ra nguyên dấu `. Đây là lỗi đã xảy ra BA lần.',
  );
});

test('mỗi dòng khai phải trỏ vào một biểu thức CÓ THẬT trong renderer', () => {
  const GOC = join(FE, 'src', 'components', 'python-studio');
  for (const [duong, [tep, bieuThuc]] of Object.entries(DUONG_BOC)) {
    const ma = doc(join(GOC, tep));
    assert.ok(
      ma.includes(bieuThuc),
      `"${duong}" khai là được bóc bởi \`${bieuThuc}\` trong ${tep}, nhưng tệp đó KHÔNG `
        + 'còn chứa biểu thức ấy. Hoặc renderer đã đổi (thì sửa dòng khai), hoặc ai đó '
        + 'vừa gỡ phép bóc đi (thì trả lại). Im lặng xanh ở đây là bỏ mất phép đo.',
    );
  }
});
