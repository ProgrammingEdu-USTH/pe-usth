#!/usr/bin/env node
// Gieo một khiếm khuyết, chạy một bộ test, đếm số ca ĐỎ — rồi phục hồi.
//
// VÌ SAO CẦN MỘT CÔNG CỤ CHO VIỆC NÀY. "N đỏ" là bằng chứng trung tâm của mọi
// vòng trong repo này, và nó là con số DỄ GIẢ NHẤT: một `0` có thể nghĩa là
// "cổng không có răng" HOẶC "bộ test không chạy được", và hai chuyện đó dẫn tới
// hai kết luận trái ngược. Đo được trong một phiên ngày 08/11/2026, BA lần một
// `0` nghĩa là "không chạy":
//   · `grep -E "^. fail"` trả RỖNG vì dòng tổng kết của `node --test` mở đầu
//     bằng `ℹ` (multibyte), nên `^.` không khớp;
//   · một phép đếm chuỗi ra 84 thay vì 9 vì thiếu phép so bản ĐÃ THOÁT JSON;
//   · và lần đắt nhất: phép gieo cắt khối `store:` của `GoogleStrategy` bằng
//     `s.index('),', i)` — trúng dấu `),` sai — sinh TypeScript không biên dịch
//     được. Jest in `Test Suites: 1 failed · Tests: 0 total`; phép đếm bằng
//     `sed` không khớp gì nên trả RỖNG, đọc thành "0 đỏ", và suy ra "gỡ chống
//     login CSRF mà spec vẫn xanh" — một khẳng định SAI về bảo mật. Gieo lại
//     cho đúng thì nó là **2 đỏ / 8 ca**.
// AGENTS.md đã ghi luật "một con số ablate RỖNG không phải số 0" từ trước, mà
// không có gì thi hành nó; mỗi vòng lại viết lại cùng một regex mong manh.
//
// BA BẤT BIẾN công cụ này giữ, và cả ba đều đến từ một lần đã vấp:
//   1. phép gieo phải khớp ĐÚNG MỘT LẦN — 0 hoặc >1 là DỪNG, không phải "0 đỏ";
//   2. bộ test phải CHẠY ĐƯỢC — không đọc được dòng tổng kết, hoặc tổng số ca
//      bằng 0, là DỪNG kèm 30 dòng cuối của lệnh, không phải "0 đỏ";
//   3. tệp phải được phục hồi kể cả khi lệnh ném — `finally`, và nó in ra một
//      dòng xác nhận để người đọc không phải tin.
//
// VÀ NÓ NHẬN SEED TỪ TỆP, không chỉ từ chuỗi dòng lệnh. Đó là bản sửa cho một
// bẫy riêng đã ghi: heredoc của công cụ Bash ở đây XỬ LÝ dấu gạch chéo ngược dù
// delimiter đã nháy, nên `"a\nb"` trong thân heredoc tới Python/Node thành `a` +
// newline THẬT + `b`. Ba phép thay chuỗi đã trượt vì đúng chuyện đó. Seed đi qua
// tệp thì không có lớp thoát nào để đếm sai.
//
// Dùng:
//   node scripts/ablate.mjs --tep <đường dẫn> --ve-head --lenh "<lệnh>"
//   node scripts/ablate.mjs --tep <t> --cu "<chuỗi>" --moi "<chuỗi>" --lenh "<l>"
//   node scripts/ablate.mjs --tep <t> --cu-tep <a> --moi-tep <b> --lenh "<l>"
//   node scripts/ablate.mjs --tu-so <sổ.json>        (chạy cả một bảng ablate)
//
// Mã thoát: 0 khi ĐỌC ĐƯỢC một con số (kể cả 0 đỏ — "cổng rỗng" là một kết quả
// hợp lệ và phải báo được), 1 khi KHÔNG đọc được. Phân biệt ấy là cả lý do công
// cụ này tồn tại.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const TRAN_DONG_IN = 30;

function thamSo(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const ten = a.slice(2);
    if (ten === 've-head' || ten === 'im') o[ten] = true;
    else {
      o[ten] = argv[i + 1];
      i += 1;
    }
  }
  return o;
}

/**
 * Số ca ĐỎ, hoặc `null` khi không chứng minh được bộ test đã chạy.
 *
 * `null` KHÁC 0, và đó là toàn bộ điểm của hàm này. Mỗi khuôn dưới đây phải đọc
 * được CẢ số trượt LẪN tổng số ca: một dòng tổng kết nói "0 failed" mà tổng là 0
 * thì bộ test không chạy ca nào, nên nó không nói gì về răng của cổng.
 */
export function docSoDo(ra) {
  // jest: "Tests:       2 failed, 6 passed, 8 total"
  const j = /^Tests:.*?(\d+) total\s*$/m.exec(ra);
  if (j) {
    const tong = Number(j[1]);
    if (tong === 0) return null;
    const truot = /^Tests:.*?(\d+) failed/m.exec(ra);
    return { do: truot ? Number(truot[1]) : 0, tong, bo: 'jest' };
  }
  // node --test: hai dòng riêng, "ℹ tests 592" và "ℹ fail 0". KHÔNG neo vào đầu
  // dòng bằng `^.` — ký tự `ℹ` là multibyte và đó đúng là bẫy đã trả về RỖNG.
  const nt = /[\s\S]*?tests[ \t]+(\d+)/.exec(ra);
  const nf = /[\s\S]*?\bfail[ \t]+(\d+)/.exec(ra);
  if (nt && nf) {
    const tong = Number(nt[1]);
    if (tong === 0) return null;
    return { do: Number(nf[1]), tong, bo: 'node --test' };
  }
  return null;
}

function dongCuoi(s, n = TRAN_DONG_IN) {
  return s.split(/\r?\n/).filter(Boolean).slice(-n).join('\n');
}

function noiDungSeed(o, goc) {
  if (o['ve-head']) {
    // `git show HEAD:<đường dẫn>` giải đường dẫn theo GỐC REPO, không theo thư
    // mục hiện tại. Gọi từ `frontend/` với một đường dẫn tương đối đã ném
    // `fatal: path 'frontend/…' exists, but not '…'` — đúng, nhưng nó bắt người
    // dùng phải tự biết luật ấy. `--show-prefix` cho tiền tố của cwd trong repo
    // nên lời gọi nào cũng dùng được đường dẫn tương đối như mọi cờ khác.
    const tienTo = execFileSync('git', ['rev-parse', '--show-prefix'], {
      encoding: 'utf8',
    }).trim();
    // `git show` đòi dấu `/`; `join()` trên Windows sinh `\` và 14/14 lời gọi
    // từng ném `fatal:` — bẫy đã ghi ở `check-da-deploy.mjs`.
    const duong = `${tienTo}${o.tep}`.replace(/\\/g, '/');
    return execFileSync('git', ['show', `HEAD:${duong}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }
  const cu = o['cu-tep'] ? readFileSync(o['cu-tep'], 'utf8') : o.cu;
  const moi = o['moi-tep'] ? readFileSync(o['moi-tep'], 'utf8') : (o.moi ?? '');
  if (cu === undefined) {
    throw new Error('thiếu --cu / --cu-tep / --ve-head');
  }
  const n = goc.split(cu).length - 1;
  if (n !== 1) {
    throw new Error(
      `GIEO TRƯỢT: chuỗi cần thay khớp ${n} chỗ, phải đúng 1. `
      + 'Khớp 0 chỗ KHÔNG phải "0 đỏ" — nó nghĩa là phép gieo không vào được '
      + `tệp. Chuỗi: ${JSON.stringify(cu.slice(0, 80))}`,
    );
  }
  return goc.split(cu).join(moi);
}

export function chayMot(o) {
  if (!o.tep) throw new Error('thiếu --tep');
  if (!o.lenh) throw new Error('thiếu --lenh');

  // `newline` giữ nguyên: tệp trong repo này có cả CRLF (`check_vanphong.py`)
  // lẫn LF thuần (`studio-lesson.test.mjs`), và một phép thay nhiều dòng dùng
  // sai đầu dòng khớp 0 chỗ — đã xảy ra.
  const goc = readFileSync(o.tep, 'utf8');
  let khoiPhuc = false;
  try {
    writeFileSync(o.tep, noiDungSeed(o, goc));
    // MỘT chuỗi lệnh kèm `shell: true`: `spawnSync('npm', [...], {shell:true})`
    // làm Node ném DeprecationWarning DEP0190, còn `npm.cmd` không kèm shell
    // thì ENOENT trên Git Bash và `status` ra `null` — cả hai đã đo.
    const r = spawnSync(o.lenh, { shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    writeFileSync(o.tep, goc);
    khoiPhuc = true;

    const ra = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
    const so = docSoDo(ra);
    if (!so) {
      const vi = r.error ? `\n   lỗi spawn: ${r.error.message}` : '';
      throw new Error(
        'KHÔNG ĐỌC ĐƯỢC SỐ CA — đây KHÔNG phải "0 đỏ".\n'
        + `   mã thoát: ${r.status} (mã thoát null nghĩa là không chạy được LỆNH, `
        + 'không phải bộ test hỏng)' + vi
        + `\n   ${TRAN_DONG_IN} dòng cuối của lệnh:\n${dongCuoi(ra)}`,
      );
    }
    return so;
  } finally {
    if (!khoiPhuc) {
      writeFileSync(o.tep, goc);
      // In ra chứ không để người đọc phải tin: một công cụ gieo khiếm khuyết mà
      // im lặng về việc đã dọn hay chưa thì không ai dám chạy lần thứ hai.
      console.log(`   (đã phục hồi ${o.tep} sau khi lệnh ném)`);
    }
  }
}

function main() {
  const o = thamSo(process.argv.slice(2));

  if (o['tu-so']) {
    const so = JSON.parse(readFileSync(o['tu-so'], 'utf8'));
    let loi = 0;
    for (const m of so.chieu) {
      try {
        const k = chayMot({ ...m, lenh: m.lenh ?? so.lenh });
        const mong = m.mongDoi;
        const dat = mong === undefined || k.do === mong;
        if (!dat) loi += 1;
        console.log(
          `${dat ? '✓' : '✗'} ${m.ten}: ${k.do} đỏ / ${k.tong} ca`
          + (mong === undefined ? '' : ` (mong đợi ${mong})`),
        );
      } catch (e) {
        loi += 1;
        console.log(`✗ ${m.ten}: ${e.message}`);
      }
    }
    console.log(`\n${so.chieu.length} chiều · ${loi} chiều không như khai`);
    process.exitCode = loi ? 1 : 0;
    return;
  }

  try {
    const k = chayMot(o);
    console.log(`${k.do} đỏ / ${k.tong} ca (${k.bo})`);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}

// Chỉ chạy khi được gọi trực tiếp — bộ test import `docSoDo`/`chayMot`.
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/ablate.mjs')) {
  main();
}
