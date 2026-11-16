// BẢNG LỖI PYTHON → CÂU TIẾNG VIỆT (lib/loi-python.ts), nối vào ô kết quả của bài tập chấm.
//
// Ba tính chất, mỗi cái vì một cách hỏng CỤ THỂ:
//  1. BẢNG CHỈ GỒM LỖI ĐÃ ĐO — tên trong bảng phải xuất hiện trong bản dựng 179 bài. Một lời
//     dịch cho lỗi chưa ai gặp là loại phản hồi chung chung d ≈ 0,05 (Van der Kleij 2015).
//  2. LỖI LẠ THÌ KHÔNG BỊA: trả null, traceback nguyên văn ở lại.
//  3. CÂU PHẢI NÓI ĐƯỢC "nhìn vào đâu" và đủ ngắn để đọc một hơi; số dòng lấy từ khung CUỐI của
//     traceback do `_format_exc` của studio-harness.py dựng.
//
// Ablate (ghi trong mô tả commit): bỏ một tên khỏi bảng · bịa một tên không có trong khoá học ·
// trả câu cho lỗi lạ · lấy số dòng ĐẦU thay vì CUỐI · gỡ chỗ nối ở SandboxScreen.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { BANG_LOI, giaiThichLoi } from '../../src/lib/loi-python.ts';

const ROOT = new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const BAN_DUNG = readFileSync(join(ROOT, 'scripts/pe-da/out/lessons.json'), 'utf8');

test('MỌI lỗi trong bảng đều xuất hiện trong bản dựng khoá học (bảng chỉ có lỗi đã đo)', () => {
  assert.ok(BAN_DUNG.length > 1_000_000, 'đọc bản dựng trượt — mọi so sánh dưới sẽ đạt rỗng');
  const khongGap = Object.keys(BANG_LOI).filter((ten) => !BAN_DUNG.includes(ten));
  assert.deepEqual(khongGap, [], `lỗi trong bảng mà khoá học không nhắc tới lần nào: ${khongGap.join(', ')} — gỡ khỏi bảng hoặc đo lại`);
  assert.ok(Object.keys(BANG_LOI).length >= 10, 'bảng quá ngắn — đã đo 11 lỗi');
});

test('mỗi lỗi: một câu tiếng Việt, ngắn, kết thúc bằng dấu chấm', () => {
  for (const [ten, cau] of Object.entries(BANG_LOI)) {
    assert.ok(cau.length >= 40 && cau.length <= 170, `${ten}: câu dài ${cau.length} ký tự — ngoài khoảng đọc một hơi (40–170)`);
    assert.match(cau, /[à-ỹ]/i, `${ten}: câu không có dấu tiếng Việt — bản dịch chung chung`);
    assert.ok(cau.endsWith('.'), `${ten}: câu phải kết thúc bằng dấu chấm`);
    assert.ok(!/\n/.test(cau), `${ten}: câu phải nằm trên một dòng`);
  }
});

test('đọc traceback thật: tên lỗi, câu, và số dòng của khung CUỐI', () => {
  const tb = 'Traceback (most recent call last):\n  File "main.py", line 2, in <module>\n    total = pricee * cups\n  File "main.py", line 7, in tinh\n    return cups\nNameError: name \'pricee\' is not defined\n';
  const g = giaiThichLoi(tb);
  assert.equal(g?.ten, 'NameError');
  assert.equal(g?.dong, 7, 'phải lấy khung CUỐI của traceback, không phải khung đầu');
  assert.equal(g?.cau, BANG_LOI.NameError);
  // Lỗi cú pháp không có dòng "Traceback" nhưng có `line N`.
  const sx = giaiThichLoi('  File "main.py", line 3\n    if x == 1\n             ^\nSyntaxError: expected \':\'\n');
  assert.equal(sx?.ten, 'SyntaxError');
  assert.equal(sx?.dong, 3);
  // Chỉ có dòng cuối (không khung nào): vẫn trả câu, không dòng.
  const ch = giaiThichLoi('ZeroDivisionError: division by zero');
  assert.equal(ch?.ten, 'ZeroDivisionError');
  assert.equal(ch?.dong, null);
});

test('lỗi LẠ hoặc không phải lỗi thì KHÔNG bịa câu (null)', () => {
  assert.equal(giaiThichLoi('MergeError: Data columns not unique\n'), null, 'MergeError có trong khoá học nhưng CHƯA có trong bảng — phải để traceback nguyên văn');
  assert.equal(giaiThichLoi('RuntimeError: x\n'), null);
  assert.equal(giaiThichLoi('Chương trình chạy xong.'), null);
  assert.equal(giaiThichLoi(''), null);
  assert.equal(giaiThichLoi(undefined), null);
  // `hasOwnProperty` ở loi-python.ts là phòng xa: mẫu tên lỗi đòi chữ HOA đầu và đuôi Error/Exception
  // nên không khoá nào của Object.prototype khớp được — ablate bỏ nó cho 0 đỏ, và ca này KHÔNG nói
  // nó canh chuyện đó, chỉ nói "không có tên lớp lỗi thì null".
  assert.equal(giaiThichLoi('constructor: Error'), null, 'không có tên lớp lỗi đầy đủ thì phải là null');
});

test('tiền tố module bị bỏ, và thông điệp có tên lỗi khác bên trong không đánh lừa', () => {
  assert.equal(giaiThichLoi('builtins.KeyError: \'a\'')?.ten, 'KeyError');
  // Dòng cuối quyết định: thông điệp của lỗi nhắc tới "ValueError" không đổi tên lỗi.
  const g = giaiThichLoi('TypeError: ValueError is not callable\n');
  assert.equal(g?.ten, 'TypeError');
});

test('ô kết quả của màn sandbox thật sự dùng bảng — câu nằm NGAY SAU traceback, không tô nhạt', () => {
  const tsx = readFileSync(join(ROOT, 'frontend/src/components/python-studio/screens/SandboxScreen.tsx'), 'utf8').replace(/\r/g, '');
  assert.match(tsx, /import \{ giaiThichLoi \} from '@\/lib\/loi-python'/, 'SandboxScreen không import bảng lỗi — lib là code chết');
  const i = tsx.indexOf("lines.push({ text: result.error, tone: 'err' })");
  assert.ok(i > 0, 'không tìm thấy dòng đẩy traceback vào console');
  const sau = tsx.slice(i, i + 700);
  const j = sau.indexOf('giaiThichLoi(result.error)');
  assert.ok(j > 0, 'câu giải thích không đi liền sau traceback');
  assert.match(sau.slice(j), /lines\.push\(\{ text: `→ \$\{g\.ten\}/, 'dòng giải thích phải bắt đầu bằng "→ Tên"');
  assert.ok(!/tone: 'muted'/.test(sau.slice(j, j + 200)), 'câu giải thích không được tô muted: nhạt hơn thông báo lỗi là sai thứ bậc (feedback-rank)');
});
