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
/**
 * Con số trong dòng tổng kết, sau khi BỎ MỌI KHOẢNG TRẮNG.
 *
 * Các bộ kiểm của repo in số kiểu Việt — dấu cách ngăn nhóm nghìn ("2 715"), và
 * có chỗ là U+00A0. `Number('2 715')` ra `NaN`, nên không bóc khoảng trắng là
 * đọc ra `NaN` rồi mọi phép so sau đó im lặng sai. Bẫy đã ghi ở
 * `check-moc-nen.mjs`.
 */
function so(s) {
  return Number(String(s).replace(/\s/g, ''));
}

/**
 * Các khuôn dòng tổng kết, THEO THỨ TỰ ƯU TIÊN.
 *
 * `tong` là bằng chứng "bộ kiểm ĐÃ CHẠY": tổng bằng 0 nghĩa là không có ca nào,
 * nên con số trượt không nói gì về răng của cổng. Khuôn nào KHÔNG in tổng thì
 * khai `tong: null` và `chayMot()` phải lấy bằng chứng khác (xem ở đó).
 *
 * `re` phải khớp ĐÚNG MỘT DÒNG. Nhiều dòng khớp là MƠ HỒ, và mơ hồ thì DỪNG —
 * không lấy dòng đầu tiên. Cùng luật `check-nguong.mjs` đã phải đặt sau khi một
 * regex lỏng báo oan một ngưỡng đang đúng.
 */
const KHUON = [
  // jest: "Tests:       2 failed, 6 passed, 8 total"
  {
    bo: 'jest',
    re: /^Tests:[^\n]*?(\d+) total[ \t]*$/gm,
    doc: (m, ra) => {
      const t = /^Tests:[^\n]*?(\d+) failed/m.exec(ra);
      return { tong: so(m[1]), do: t ? so(t[1]) : 0 };
    },
  },
  // `node --test`: tổng và số trượt ở HAI DÒNG RIÊNG ("ℹ tests 614" / "ℹ fail 0").
  {
    bo: 'node --test',
    re: /^[^\n]*?\btests[ \t]+(\d+)[ \t]*$/gm,
    doc: (m, ra) => {
      const f = /^[^\n]*?\bfail[ \t]+(\d+)[ \t]*$/m.exec(ra);
      return f ? { tong: so(m[1]), do: so(f[1]) } : null;
    },
  },
  // ── Bộ kiểm NỘI DUNG, thêm 08/11/2026 ────────────────────────────────
  // Lý do thêm: vòng trước tôi muốn ablate một lát văn phong bằng công cụ này
  // và nó TỪ CHỐI (đúng giới hạn đã khai), buộc đếm tay — tức khuôn này ĐÃ CÓ
  // người cần, không phải dựng trước cho một lỗi chưa xảy ra.
  //
  // `Đối chiếu sổ` phải ĐỨNG TRƯỚC khuôn `check_vanphong` bên dưới: chạy
  // `--doi-chieu` in CẢ HAI dòng, và con số đáng đọc là của ratchet.
  {
    bo: 'ratchet văn phong',
    re: /^Đối chiếu sổ: [\d\s]+ luật · ([\d\s]+) bài · ([\d\s]+) lỗi[ \t]*$/gm,
    doc: (m) => ({ tong: so(m[1]), do: so(m[2]) }),
  },
  {
    bo: 'check_vanphong.py',
    re: /^([\d\s]+) bài · [\d\s]+ thuật ngữ · ([\d\s]+) lỗi · [\d\s]+ cảnh báo[ \t]*$/gm,
    doc: (m) => ({ tong: so(m[1]), do: so(m[2]) }),
  },
  {
    bo: 'check.py',
    re: /^([\d\s]+) bài · ([\d\s]+) lỗi · [\d\s]+ cảnh báo/gm,
    doc: (m) => ({ tong: so(m[1]), do: so(m[2]) }),
  },
  {
    bo: 'check-pyodide.mjs',
    re: /^([\d\s]+) bài · ([\d\s]+) đoạn code · [\d\s]+ đạt · ([\d\s]+) hỏng/gm,
    doc: (m) => ({ tong: so(m[2]), do: so(m[3]) }),
  },
  {
    // Khuôn này KHÔNG in số trượt — nó in số ĐẠT. Số đỏ là hiệu, và phải tính
    // như thế: đọc "480 đạt" rồi kết luận 0 đỏ là bỏ qua đúng trường hợp có ca
    // không đạt.
    bo: 'check-practice.mjs',
    re: /^[\d\s]+ bài tự làm · ([\d\s]+) ca chấm · ([\d\s]+) đạt/gm,
    doc: (m) => ({ tong: so(m[1]), do: so(m[1]) - so(m[2]) }),
  },
  {
    // Cổng `.mjs` thường: dòng cuối chỉ có "N lỗi", KHÔNG có tổng. `tong: null`
    // nói ra điều đó, và `chayMot()` lấy bằng chứng chạy từ MÃ THOÁT thay vì
    // từ một con số tổng không tồn tại.
    // Hai hình dạng cùng tồn tại trong repo: `0 lỗi` trần (phần lớn cổng) và
    // `17 tính năng · 14 có đường tới · 3 còn tối · 0 lỗi` (cổng in kèm thống
    // kê). Tiền tố tuỳ chọn phải kết thúc bằng `·` để nó KHÔNG khớp những dòng
    // liệt kê lỗi từng mục — chúng mở đầu bằng `LỖI:` và không kết thúc bằng
    // "lỗi". Khuôn này nằm CUỐI danh sách, nên `Đối chiếu sổ: … N lỗi` (cũng
    // kết thúc bằng "lỗi") đã được khuôn ratchet nhận trước.
    bo: 'cổng .mjs',
    re: /^(?:[^\n]*·[^\n·]*)?([\d\s]+) lỗi[ \t]*$/gm,
    doc: (m) => ({ tong: null, do: so(m[1]) }),
  },
];

/**
 * Số ca ĐỎ, hoặc `null` khi không chứng minh được bộ test đã chạy.
 *
 * `null` KHÁC 0, và đó là toàn bộ điểm của hàm này.
 */
export function docSoDo(ra) {
  for (const k of KHUON) {
    k.re.lastIndex = 0;
    const khop = [...ra.matchAll(k.re)];
    if (khop.length === 0) continue;
    if (khop.length > 1) {
      // Mơ hồ: hai dòng cùng khớp một khuôn thì không biết dòng nào là tổng kết.
      return null;
    }
    const r = k.doc(khop[0], ra);
    if (!r) continue;
    if (r.tong === 0) return null;
    return { ...r, bo: k.bo };
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
    const seed = noiDungSeed(o, goc);
    // GIEO VÔ HIỆU là một cách thứ tư để "0 đỏ" nói dối, và nó chỉ lộ ra khi
    // DÙNG công cụ thật: `--ve-head` trên một tệp KHÔNG đổi so với HEAD là một
    // phép thay không thay gì. Đã xảy ra ngay vòng sau khi thêm khuôn nội dung
    // — tôi ablate một lát văn phong ĐÃ COMMIT, và công cụ in "0 đỏ / 179 ca":
    // nó chứng minh bộ kiểm đã CHẠY, nhưng không chứng minh seed đổi được gì.
    // Nhánh `--cu`/`--cu-tep` đã được bảo vệ bởi luật "khớp đúng một lần";
    // `--ve-head` thì không có gì canh, nên phép so này là chỗ canh nó.
    if (seed === goc) {
      throw new Error(
        'GIEO VÔ HIỆU: nội dung sau khi gieo GIỐNG Y nguyên bản, nên không có '
        + 'khiếm khuyết nào được gieo. Đây KHÔNG phải "0 đỏ".'
        + (o['ve-head']
          ? ` Tệp ${o.tep} không khác HEAD — thay đổi cần ablate đã được commit `
            + 'rồi, nên hãy gieo bằng `--cu-tep`/`--moi-tep`, hoặc so với một '
            + 'commit trước đó.'
          : ''),
      );
    }
    writeFileSync(o.tep, seed);
    // MỘT chuỗi lệnh kèm `shell: true`: `spawnSync('npm', [...], {shell:true})`
    // làm Node ném DeprecationWarning DEP0190, còn `npm.cmd` không kèm shell
    // thì ENOENT trên Git Bash và `status` ra `null` — cả hai đã đo.
    const r = spawnSync(o.lenh, { shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    writeFileSync(o.tep, goc);
    khoiPhuc = true;

    const ra = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
    const kq = docSoDo(ra);
    if (!kq) {
      const vi = r.error ? `\n   lỗi spawn: ${r.error.message}` : '';
      throw new Error(
        'KHÔNG ĐỌC ĐƯỢC SỐ CA — đây KHÔNG phải "0 đỏ".\n'
        + `   mã thoát: ${r.status} (mã thoát null nghĩa là không chạy được LỆNH, `
        + 'không phải bộ test hỏng)' + vi
        + `\n   ${TRAN_DONG_IN} dòng cuối của lệnh:\n${dongCuoi(ra)}`,
      );
    }
    // BẰNG CHỨNG CUỐI LÀ MÃ THOÁT, và nó áp cho MỌI khuôn — không chỉ khuôn
    // không in tổng. Một bộ kiểm in "0 lỗi" mà thoát khác 0, hoặc in "3 lỗi" mà
    // thoát 0, là tự nói ngược; con số của nó không dùng được.
    //
    // VÌ SAO NỚI RA CẢ KHUÔN CÓ TỔNG — cách THỨ NĂM để "0 đỏ" nói dối, đo được
    // 08/11/2026 khi ablate chính `check-moc-chay`: một cổng KHÔNG đọc được số
    // thì nó in lại 30 DÒNG CUỐI của lệnh con để người đọc log không bị mù. Thế
    // là đầu ra của nó CHỨA đầu ra của cổng trong, và thứ tự ưu tiên của
    // `docSoDo` khớp dòng tổng của cổng TRONG (`Đối chiếu sổ: … 179 bài · 0
    // lỗi`) thay vì lời phán của cổng NGOÀI. Ablate in "0 đỏ / 179 ca" trong khi
    // cổng ngoài ĐỎ và thoát 1. Khuôn ấy CÓ tổng, nên phép kiểm cũ bỏ qua nó.
    //
    // Đo trước khi siết, vì một phép kiểm báo oan sẽ bị tắt: `check_vanphong.py`
    // không cờ in "75 lỗi" và thoát **1**; `--doi-chieu` in "0 lỗi" và thoát
    // **0**; `check.py --strict` 0 lỗi thoát 0; `check-duong-toi.mjs` 0 lỗi
    // thoát 0. Bất biến "thoát 0 ⟺ 0 đỏ" đứng cho cả tám khuôn.
    if (r.status !== null) {
      const xanh = kq.do === 0;
      if (xanh !== (r.status === 0)) {
        throw new Error(
          `LỆNH TỰ NÓI NGƯỢC: đọc ra "${kq.do} đỏ" nhưng mã thoát ${r.status}. `
          + `Đây KHÔNG phải "${kq.do} đỏ".\n`
          + '   Hai nguyên nhân đã gặp: (a) bộ kiểm in một con số rồi thoát ngược '
          + 'lại nó; (b) lệnh in LẠI đầu ra của một lệnh con, nên con số đọc được '
          + 'là của cổng TRONG chứ không phải lời phán của cổng NGOÀI — thêm một '
          + 'khuôn cho cổng ngoài, đừng nới phép kiểm này.\n'
          + `   ${TRAN_DONG_IN} dòng cuối của lệnh:\n${dongCuoi(ra)}`,
        );
      }
    }
    return kq;
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
          `${dat ? '✓' : '✗'} ${m.ten}: ${k.do} đỏ`
          + (k.tong === null ? ' (khuôn không in tổng)' : ` / ${k.tong} ca`)
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
    // Khuôn không in tổng thì NÓI RA, đừng in `null ca` — một con số trông
    // như số mà không phải số là đúng thứ công cụ này ra đời để chặn.
    console.log(
      `${k.do} đỏ`
      + (k.tong === null ? ' (khuôn không in tổng)' : ` / ${k.tong} ca`)
      + ` (${k.bo})`,
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}

// Chỉ chạy khi được gọi trực tiếp — bộ test import `docSoDo`/`chayMot`.
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/ablate.mjs')) {
  main();
}
