// `scripts/ablate.mjs` — bộ gieo khiếm khuyết dùng chung — phải TỪ CHỐI in một
// con số khi nó không chứng minh được bộ test đã chạy.
//
// Bộ này ablate chính CÔNG CỤ ABLATE, và đó không phải trò chơi chữ: "N đỏ" là
// bằng chứng trung tâm của mọi vòng trong repo, nên một công cụ phát ra con số
// đó mà tự nó im lặng sai thì mọi bằng chứng dựa trên nó cũng sai. Đo được
// trong một phiên ngày 08/11/2026: BA lần một `0` nghĩa là "không chạy", và lần
// đắt nhất suýt thành một khẳng định SAI về bảo mật ("gỡ chống login CSRF mà
// spec vẫn xanh" — gieo lại cho đúng thì nó là 2 đỏ / 8 ca).
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const GOC = new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const { docSoDo, chayMot } = await import(
  new URL('../../../scripts/ablate.mjs', import.meta.url).href
);

/** Một thư mục tạm riêng cho mỗi ca — ca gieo có GHI vào tệp. */
function thuMucTam() {
  return mkdtempSync(join(tmpdir(), 'ablate-'));
}

test('docSoDo: đọc được jest', () => {
  const k = docSoDo('Tests:       2 failed, 6 passed, 8 total\n');
  assert.deepEqual({ do: k.do, tong: k.tong }, { do: 2, tong: 8 });
  const xanh = docSoDo('Tests:       22 passed, 22 total\n');
  assert.deepEqual({ do: xanh.do, tong: xanh.tong }, { do: 0, tong: 22 });
});

test('docSoDo: đọc được node --test (hai dòng riêng cho tổng và số trượt)', () => {
  // GHI CHO ĐÚNG: bẫy `ℹ` multibyte đã trả về RỖNG là bẫy của GREP/SED — chúng
  // làm việc trên BYTE, nên `^.` ăn một byte của một ký tự ba byte. Chuỗi
  // JavaScript là UTF-16 và `ℹ` chỉ là MỘT code unit, nên `^.` trong JS khớp
  // bình thường. Ablate xác nhận: trả regex về bản neo `^.` → **0 đỏ**, tức ca
  // này KHÔNG canh được chiều ấy, và nói nó canh được là nói quá.
  // Thứ ca này thật sự canh: `node --test` in tổng số ca và số trượt ở HAI DÒNG
  // RIÊNG, nên một phép đọc chỉ tìm một dòng tổng kết (như của jest) sẽ trượt
  // hết. Luật "tổng = 0 thì trả null" vì vậy phải đọc được cả hai.
  const ra = 'ℹ tests 602\nℹ suites 0\nℹ pass 601\nℹ fail 1\n';
  const k = docSoDo(ra);
  assert.deepEqual({ do: k.do, tong: k.tong }, { do: 1, tong: 602 });
});

test('docSoDo: "Tests: 0 total" trả null, KHÔNG trả 0', () => {
  // Chính hình dạng đã sinh ra khẳng định sai về bảo mật: jest in
  // `Test Suites: 1 failed · Tests: 0 total` khi suite không biên dịch được.
  assert.equal(docSoDo('Test Suites: 1 failed, 1 total\nTests:       0 total\n'), null);
  assert.equal(docSoDo('ℹ tests 0\nℹ fail 0\n'), null);
});

test('docSoDo: đọc được năm khuôn của bộ kiểm NỘI DUNG', () => {
  // Thêm 08/11/2026 vì khuôn này ĐÃ CÓ người cần: vòng trước tôi muốn ablate
  // một lát văn phong bằng công cụ này và nó TỪ CHỐI (đúng giới hạn đã khai ở
  // #141), buộc đếm tay. Đây KHÔNG phải dựng trước cho một lỗi chưa xảy ra.
  const ca = [
    ['check_vanphong.py', '179 bài · 112 thuật ngữ · 77 lỗi · 401 cảnh báo', 179, 77],
    ['check.py', '179 bài · 0 lỗi · 0 cảnh báo (strict: cảnh báo tính là lỗi)', 179, 0],
    ['check-pyodide.mjs', '154 bài · 420 đoạn code · 154 đạt · 2 hỏng · 37.6s', 420, 2],
    // check-practice KHÔNG in số trượt, nó in số ĐẠT — số đỏ là HIỆU. Đọc
    // "477 đạt" rồi kết luận 0 đỏ là bỏ qua đúng ba ca không đạt.
    ['check-practice.mjs', '143 bài tự làm · 480 ca chấm · 477 đạt · 14.7 s', 480, 3],
    ['ratchet văn phong', 'Đối chiếu sổ: 18 luật · 179 bài · 3 lỗi', 179, 3],
  ];
  for (const [bo, ra, tong, so] of ca) {
    const k = docSoDo(ra);
    assert.ok(k, `không đọc được khuôn ${bo}`);
    assert.deepEqual({ bo: k.bo, tong: k.tong, do: k.do }, { bo, tong, do: so });
  }
});

test('docSoDo: `Đối chiếu sổ` THẮNG dòng tổng mặc định khi có cả hai', () => {
  // `--doi-chieu` in CẢ HAI dòng, và con số đáng đọc là của ratchet (số luật
  // hồi quy), không phải tổng lỗi văn phong đang tồn. Lấy sai dòng ở đây thì
  // mọi phép ablate một lát văn phong đọc ra 77 thay vì 0.
  const ra = '179 bài · 112 thuật ngữ · 77 lỗi · 401 cảnh báo\n\n'
    + 'Đối chiếu sổ: 18 luật · 179 bài · 0 lỗi\n';
  const k = docSoDo(ra);
  assert.equal(k.bo, 'ratchet văn phong');
  assert.equal(k.do, 0);
});

test('docSoDo: số kiểu Việt (dấu cách ngăn nhóm nghìn) không thành NaN', () => {
  // Các bộ kiểm in "2 715" chứ không "2715", và có chỗ dấu cách là U+00A0.
  // `Number('2 715')` ra NaN, nên thiếu phép bóc khoảng trắng là đọc ra NaN rồi
  // mọi phép so sau đó im lặng sai. Bẫy đã ghi ở `check-moc-nen.mjs`.
  const k = docSoDo(`1 234 bài · 50 thuật ngữ · 2 715 lỗi · 9 cảnh báo`);
  assert.deepEqual({ tong: k.tong, do: k.do }, { tong: 1234, do: 2715 });
});

test('docSoDo: khuôn `N lỗi` trần trả tong=null, KHÔNG trả một con số bịa', () => {
  // Cổng `.mjs` thường chỉ in "0 lỗi" — không có tổng nào để chứng minh nó đã
  // chạy hết. `tong: null` nói ra điều đó thay vì giả vờ có bằng chứng, và
  // `chayMot()` lấy bằng chứng từ MÃ THOÁT (ca dưới).
  // HAI hình dạng cùng tồn tại trong repo, và cả hai phải đọc được. Bản đầu
  // của ca này chỉ thử hình dạng thứ hai rồi ĐỎ — vì khuôn khi ấy đòi dòng
  // phải là `N lỗi` TRẦN. Đầu vào test sai, không phải cổng sai.
  for (const [ra, so] of [
    ['0 lỗi\n', 0],                                                  // phần lớn cổng
    ['17 tính năng · 14 có đường tới · 3 còn tối · 0 lỗi\n', 0],      // cổng in kèm thống kê
    ['Tài nguyên chết: 2 mục · 2 khai giữ · 0 chưa khai (0 KB)\n\n1 lỗi\n', 1],
  ]) {
    const k = docSoDo(ra);
    assert.ok(k, `không đọc được ${JSON.stringify(ra)}`);
    assert.equal(k.bo, 'cổng .mjs');
    assert.equal(k.tong, null);
    assert.equal(k.do, so);
  }
  // Và nó KHÔNG được khớp một dòng liệt kê lỗi từng mục.
  assert.equal(docSoDo('LỖI: L8: lỗi TĂNG 21 → 22. Văn phong xấu đi.\n'), null);
});

test('docSoDo: HAI dòng cùng khớp một khuôn là MƠ HỒ → null', () => {
  // Không lấy dòng đầu tiên: cùng luật `check-nguong.mjs` đã phải đặt sau khi
  // một regex lỏng báo oan một ngưỡng đang đúng. Hai dòng tổng kết cùng kiểu
  // nghĩa là ta không biết dòng nào là tổng kết.
  const ra = '179 bài · 0 lỗi · 0 cảnh báo\n180 bài · 5 lỗi · 1 cảnh báo\n';
  assert.equal(docSoDo(ra), null);
});

test('chayMot: GIEO VÔ HIỆU (seed giống nguyên bản) là DỪNG, không phải "0 đỏ"', () => {
  // Cách THỨ TƯ để "0 đỏ" nói dối, và nó chỉ lộ ra khi DÙNG công cụ thật:
  // `--ve-head` trên một tệp không khác HEAD là một phép thay không thay gì.
  // Đã xảy ra ngay vòng sau khi thêm khuôn nội dung — ablate một lát văn phong
  // ĐÃ COMMIT in ra "0 đỏ / 179 ca": chứng minh bộ kiểm đã CHẠY, nhưng không
  // chứng minh seed đổi được gì. Nhánh `--cu` đã có luật "khớp đúng một lần"
  // canh; `--ve-head` thì không có gì canh.
  const d = thuMucTam();
  const tep = join(d, 'a.txt');
  writeFileSync(tep, 'alpha\n');
  try {
    assert.throws(
      // Thay `alpha` bằng `alpha` — khớp đúng một lần, nhưng không đổi gì.
      () => chayMot({ tep, cu: 'alpha', moi: 'alpha', lenh: 'echo Tests: 1 total' }),
      (e) => {
        assert.match(e.message, /GIEO VÔ HIỆU/);
        assert.match(e.message, /KHÔNG phải "0 đỏ"/);
        return true;
      },
    );
    assert.equal(readFileSync(tep, 'utf8'), 'alpha\n');
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('chayMot: khuôn không-có-tổng + lệnh TỰ NÓI NGƯỢC → DỪNG', () => {
  // Một cổng in "0 lỗi" mà thoát khác 0 là tự nói ngược, và con số của nó không
  // dùng được. Đây là bằng chứng-chạy thay cho con số tổng mà khuôn ấy không in.
  const d = thuMucTam();
  const tep = join(d, 'a.txt');
  writeFileSync(tep, 'alpha\n');
  try {
    assert.throws(
      () => chayMot({ tep, cu: 'alpha', moi: 'beta', lenh: 'echo 0 lỗi && exit 1' }),
      (e) => {
        assert.match(e.message, /TỰ NÓI NGƯỢC/);
        assert.match(e.message, /KHÔNG phải "0 đỏ"/);
        return true;
      },
    );
    // Chiều NGƯỢC: nhất quán thì đọc được bình thường.
    const k = chayMot({ tep, cu: 'alpha', moi: 'beta', lenh: 'echo 0 lỗi' });
    assert.deepEqual({ tong: k.tong, do: k.do }, { tong: null, do: 0 });
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('docSoDo: đầu ra không có dòng tổng kết trả null', () => {
  assert.equal(docSoDo(''), null);
  assert.equal(docSoDo('error TS1005: expected\n'), null);
  assert.equal(docSoDo('bất kỳ chữ gì không phải dòng tổng kết'), null);
});

test('chayMot: seed khớp 0 chỗ là DỪNG, không phải "0 đỏ"', () => {
  const d = thuMucTam();
  const tep = join(d, 'a.txt');
  writeFileSync(tep, 'alpha\n');
  try {
    assert.throws(
      () => chayMot({ tep, cu: 'KHONG-CO', moi: 'x', lenh: 'echo Tests: 1 total' }),
      /GIEO TRƯỢT.*khớp 0 chỗ/s,
    );
    // Và tệp phải còn nguyên.
    assert.equal(readFileSync(tep, 'utf8'), 'alpha\n');
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('chayMot: seed khớp NHIỀU chỗ cũng là DỪNG', () => {
  const d = thuMucTam();
  const tep = join(d, 'a.txt');
  writeFileSync(tep, 'x\nx\n');
  try {
    assert.throws(
      () => chayMot({ tep, cu: 'x', moi: 'y', lenh: 'echo Tests: 1 total' }),
      /GIEO TRƯỢT.*khớp 2 chỗ/s,
    );
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('chayMot: lệnh không in dòng tổng kết → DỪNG kèm đầu ra, không phải 0 đỏ', () => {
  const d = thuMucTam();
  const tep = join(d, 'a.txt');
  writeFileSync(tep, 'alpha\n');
  try {
    assert.throws(
      () => chayMot({ tep, cu: 'alpha', moi: 'beta', lenh: 'echo error TS1005: Identifier expected' }),
      (e) => {
        assert.match(e.message, /KHÔNG ĐỌC ĐƯỢC SỐ CA/);
        assert.match(e.message, /KHÔNG phải "0 đỏ"/);
        // Phải IN RA đầu ra của lệnh: một cổng nuốt bằng chứng của chính thứ nó
        // vừa tố là một cổng sẽ bị gỡ (bài học của `check-moc-chay`).
        assert.match(e.message, /TS1005/);
        return true;
      },
    );
    assert.equal(readFileSync(tep, 'utf8'), 'alpha\n', 'tệp phải được phục hồi');
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('chayMot: đọc được số thật, và PHỤC HỒI tệp', () => {
  const d = thuMucTam();
  const tep = join(d, 'a.txt');
  writeFileSync(tep, 'alpha\n');
  try {
    const k = chayMot({
      tep,
      cu: 'alpha',
      moi: 'beta',
      lenh: 'echo Tests:       3 failed, 5 passed, 8 total',
    });
    assert.deepEqual({ do: k.do, tong: k.tong }, { do: 3, tong: 8 });
    assert.equal(readFileSync(tep, 'utf8'), 'alpha\n');
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('chayMot: LỆNH NÉM giữa lúc tệp còn seed → vẫn phục hồi', () => {
  // Ca riêng cho nhánh `finally`, và nó cần một ca riêng vì ablate đã chứng
  // minh thế: gỡ hẳn phép phục hồi trong `finally` cho **0 đỏ** khi chỉ có ca
  // "lệnh không in dòng tổng kết" — ở nhánh đó tệp đã được ghi lại TRƯỚC khi
  // ném, nên `finally` không bao giờ chạy tới. Thứ chỉ `finally` cứu được là
  // khi chính `spawnSync` ném, tức tệp đang mang khiếm khuyết gieo vào. Một
  // công cụ gieo khiếm khuyết mà để lại khiếm khuyết trong cây mã là thứ tệ
  // nhất nó có thể làm.
  const d = thuMucTam();
  const tep = join(d, 'a.txt');
  writeFileSync(tep, 'alpha\n');
  try {
    assert.throws(
      // Byte null trong chuỗi lệnh làm `spawnSync` ném ERR_INVALID_ARG_VALUE.
      () => chayMot({ tep, cu: 'alpha', moi: 'beta', lenh: `echo ${String.fromCharCode(0)}` }),
      /ERR_INVALID_ARG_VALUE|null bytes/i,
    );
    assert.equal(
      readFileSync(tep, 'utf8'),
      'alpha\n',
      'tệp phải được phục hồi kể cả khi chính lệnh ném',
    );
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('chayMot: seed đi qua TỆP, nên dấu gạch chéo ngược không bị đếm sai', () => {
  // Bẫy riêng đã ghi: heredoc của công cụ Bash ở đây XỬ LÝ dấu gạch chéo ngược
  // dù delimiter đã nháy, nên `"a\\nb"` tới Python/Node thành `a` + newline
  // THẬT + `b`. Ba phép thay chuỗi đã trượt vì đúng chuyện đó. Seed đi qua tệp
  // thì không còn lớp thoát nào để đếm sai.
  const d = thuMucTam();
  const tep = join(d, 'a.ts');
  const cuTep = join(d, 'cu.txt');
  const moiTep = join(d, 'moi.txt');
  const than = `const s = 'a${String.fromCharCode(92)}nb';\n`;
  writeFileSync(tep, than);
  writeFileSync(cuTep, `'a${String.fromCharCode(92)}nb'`);
  writeFileSync(moiTep, "'khac'");
  try {
    const k = chayMot({
      tep,
      'cu-tep': cuTep,
      'moi-tep': moiTep,
      lenh: 'echo Tests:       1 failed, 1 total',
    });
    assert.equal(k.do, 1);
    assert.equal(readFileSync(tep, 'utf8'), than);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test('công cụ còn khai đủ ba bất biến trong chú thích của nó', () => {
  // Giá trị của công cụ này nằm ở LÝ DO nó từ chối in một con số. Một bản dọn
  // "cho gọn" mà bỏ ba câu ấy đi sẽ để lại một hàm trông như thừa.
  const nguon = readFileSync(join(GOC, 'scripts/ablate.mjs'), 'utf8');
  for (const cau of ['khớp ĐÚNG MỘT LẦN', 'phải CHẠY ĐƯỢC', 'phải được phục hồi']) {
    assert.ok(nguon.includes(cau), `chú thích thiếu bất biến: ${cau}`);
  }
  // Và phân biệt mã thoát phải còn nói ra: 0 khi ĐỌC ĐƯỢC số (kể cả 0 đỏ),
  // 1 khi không đọc được. Gộp hai thứ đó là mất cả lý do tồn tại.
  assert.match(nguon, /kể cả 0 đỏ/);
});
