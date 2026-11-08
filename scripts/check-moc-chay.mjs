#!/usr/bin/env node
/**
 * MỐC PHẢI CHẠY MỚI BIẾT — bảng mốc nền có nói đúng không.
 *
 * `check-moc-nen.mjs` đối chiếu được 18 con số vì chúng đọc ra từ cây tệp và
 * `out/lessons.json`. Nó cố ý KHÔNG chạy bộ test nào (nó phải nhanh), nên nó tự
 * khai 5 con số là "NGOÀI TẦM". File này phủ những con số đó.
 *
 * Vì sao cần: AGENTS.md từng ghi **204** ca test frontend trong khi cây mã chỉ có
 * **134** — 70 ca tưởng có mà không có. Nó sống sót vì phép đếm tay dùng
 * `grep -E "^. pass"`, mà dòng tổng kết của `node --test` mở đầu bằng `ℹ`
 * (multibyte) nên `^.` không khớp và vòng lặp trả RỖNG cho MỌI file, im lặng.
 *
 * MỘT THAM SỐ MỖI JOB, không phải một lệnh chạy hết. Ba lệnh này nằm ở BA job CI
 * khác nhau và đang chạy SONG SONG; gộp chúng vào một chỗ là tự serialize lại.
 * Gọi không tham số thì chạy hết — dùng khi đo tay.
 *
 *   node scripts/check-moc-chay.mjs            # cả ba
 *   node scripts/check-moc-chay.mjs frontend   # job frontend
 *   node scripts/check-moc-chay.mjs backend    # job backend
 *   node scripts/check-moc-chay.mjs tracer     # job tracer
 *
 * CỐ Ý KHÔNG PHỦ hai con số lint (backend 92 lỗi · frontend 146 cảnh báo), và lý
 * do không phải tiết kiệm: con số lint phải ĐI XUỐNG. Ghim bằng phép so BẰNG thì
 * mỗi đợt dọn `any` là một lần cổng đỏ, tức dạy người ta THÔI DỌN — đúng cái
 * `check-nguong` đã tránh bằng dòng `GHI SỔ`. Chiều của chúng đã có sổ canh
 * (`ci-lint-backend`, trần 115, chỉ được hạ).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MD = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
/** Số trong bảng viết kiểu Việt (dấu cách ngăn nhóm nghìn, có chỗ là U+00A0). */
const so = (s) => Number(s.replace(/[\s ]/g, ''));

/**
 * Mỗi mục: lấy số ĐANG KHAI từ bảng, chạy lệnh, lấy số THẬT, so.
 * Regex viết THẲNG — `\s` trong một template literal là escape của CHỮ `s`, và
 * lỗi đó đã làm hai cổng khác trong repo này ĐỎ OAN.
 */
const KIEM = {
  frontend: {
    nhan: 'ca test frontend',
    lenh: 'npm run test:unit',
    cwd: 'frontend',
    bang: () => {
      const m = MD.match(/test:unit[^|\n]*?\*\*([\d  ]+) ca\*\*/);
      return m ? { ca: so(m[1]) } : null;
    },
    // BẢN SAO THỨ HAI của cùng con số, ở hàng "Mốc phải CHẠY mới biết". Nó là
    // thứ đã TRÔI: hàng kia ghi 574 còn hàng này ghi 573 suốt hai vòng, và cổng
    // vẫn xanh vì nó chỉ đọc hàng đầu.
    bang2: () => {
      const m = MD.match(/check-moc-chay[^|\n]*?frontend ([\d  ]+)/);
      return m ? { ca: so(m[1]) } : null;
    },
    doc: (ra) => {
      const dat = [...ra.matchAll(/\bpass (\d+)[ \t\r]*$/gm)].at(-1);
      const hong = [...ra.matchAll(/\bfail (\d+)[ \t\r]*$/gm)].at(-1);
      return dat && hong ? { ca: Number(dat[1]), truot: Number(hong[1]) } : null;
    },
  },
  backend: {
    nhan: 'ca test backend',
    // `--runInBand`: chạy song song với bộ frontend thì 15/15 bộ báo trượt với 0
    // ca chạy — tranh CPU, không phải lỗi thật (bẫy đã ghi trong AGENTS.md).
    lenh: 'npx jest --ci --runInBand',
    cwd: '.',
    bang: () => {
      const m = MD.match(/\*\*(\d+) bộ, ([\d  ]+) ca\*\*/);
      return m ? { bo: Number(m[1]), ca: so(m[2]) } : null;
    },
    bang2: () => {
      const m = MD.match(/check-moc-chay[^|\n]*?backend (\d+) bộ\/([\d  ]+)/);
      return m ? { bo: Number(m[1]), ca: so(m[2]) } : null;
    },
    doc: (ra) => {
      const b = ra.match(/Test Suites:\s+(\d+) passed, (\d+) total/);
      const c = ra.match(/Tests:\s+(\d+) passed, (\d+) total/);
      return b && c
        ? { bo: Number(b[2]), ca: Number(c[2]), truot: Number(c[2]) - Number(c[1]) }
        : null;
    },
  },
  // e2e là mục được thêm MUỘN NHẤT, và lý do nó muộn là chính phát hiện của
  // 08/11/2026: bộ e2e CHƯA BAO GIỜ nằm trong bậc thang chạy tay, số ca của nó
  // chưa bao giờ có trong bảng mốc nền, và vì CI cũng không chạy (trigger
  // `[master]`) nên HAI ca của nó chết từ 4d5f86d mà không cổng nào thấy. Một bộ
  // test không có ai đếm thì nó mục đúng như một tính năng không có ai bấm.
  e2e: {
    nhan: 'ca e2e Playwright',
    // `test:e2e` đã lọc sẵn `python-advanced mobile-responsive`; `webServer`
    // trong config tự `npm run build`, nên lệnh này tốn ~2,5 phút.
    lenh: 'npm run test:e2e',
    cwd: 'frontend',
    bang: () => {
      const m = MD.match(/test:e2e[^|\n]*?\*\*([\d  ]+) ca\*\*/);
      return m ? { ca: so(m[1]) } : null;
    },
    bang2: () => {
      const m = MD.match(/check-moc-chay[^|\n]*?e2e ([\d  ]+)/);
      return m ? { ca: so(m[1]) } : null;
    },
    // Playwright in `11 passed (2.4m)`, và khi đỏ thì thêm một dòng `1 failed`
    // ĐỨNG TRƯỚC. Phải cộng cả hai mới ra tổng số ca: đọc riêng `passed` thì một
    // ca TRƯỢT lại làm con số tụt xuống và cổng kêu "bảng ghi sai" thay vì kêu
    // "bộ test đỏ" — tố oan đúng chỗ CI cần câu trả lời. Và khi TẤT CẢ đỏ thì
    // không có dòng `passed` nào, nên cả hai cùng thiếu mới là "không đọc được".
    doc: (ra) => {
      const dat = ra.match(/^\s*(\d+) passed/m);
      const hong = ra.match(/^\s*(\d+) failed/m);
      if (!dat && !hong) return null;
      const d = dat ? Number(dat[1]) : 0;
      const h = hong ? Number(hong[1]) : 0;
      return { ca: d + h, truot: h };
    },
  },
  // HAI BỘ CHẤM NỘI DUNG của pe-da. Chúng in ra những con số mà `check-moc-nen`
  // KHÔNG tính được từ `out/` — "420 đoạn code CHẠY ĐƯỢC", "773 biến thể sai bị
  // đánh trượt", "2 372 ca trượt mà 0 ca im lặng" đều là kết quả của một lần
  // CHẠY THẬT trong Pyodide. Cả hai hàng hôm nay ĐÚNG, nên đây không phải sửa
  // một lỗi đang sống — nó là gắn răng cho một tín hiệu dừng, đúng thế của con
  // số 204 vs 134 (bảng ghi 204 ca test trong khi cây mã có 134, sống sót vì
  // không ai canh).
  pyodide: {
    nhan: 'đoạn code pe-da chạy thật trong Pyodide',
    lenh: 'node scripts/pe-da/check-pyodide.mjs',
    cwd: '.',
    // ĐÃ SỬA Ở GỐC 08/11/2026 — câu cũ ở đây SAI và phải nói ra. Nó ghi "2 lần
    // ĐỎ GIẢ trên 6 lần chạy… trần 5 giây MỖI ĐOẠN, máy bận thì một đoạn chậm bị
    // đánh trượt". Đo kỹ hơn thì nguyên nhân khác: ĐÚNG MỘT bài (VZ25) có thời
    // gian biến thiên **2 304–6 699 ms, spread 2,9×**, nằm vắt qua đường 5 000.
    // `check-pyodide.mjs` nay thôi phán xử đường ấy (nó chỉ IN RA) và chỉ làm đỏ
    // khi một đoạn chạy LỒNG — quá 2× trần, tức ngoài khoảng biến thiên đã đo.
    // Nên mục này KHÔNG còn sinh đỏ giả, và `luuY` ở dưới chỉ còn là lời dặn.
    luuY: 'bộ này đo thời gian bằng đồng hồ treo tường của MÁY DỰNG, và một bài đã '
      + 'đo được biến thiên 2,9× — nên nó chỉ làm đỏ khi một đoạn chạy LỒNG (quá 2× '
      + 'trần). Nếu đỏ, đó KHÔNG phải máy bận: đọc đúng tên bài rồi xem code của nó.',
    bang: () => {
      const m = MD.match(/check-pyodide\.mjs`[^|\n]*?([\d  ]+) bài, ([\d  ]+) đoạn code/);
      return m ? { bai: so(m[1]), doan: so(m[2]) } : null;
    },
    bang2: () => {
      const m = MD.match(/check-moc-chay[^|\n]*?pyodide ([\d  ]+)\/([\d  ]+)/);
      return m ? { bai: so(m[1]), doan: so(m[2]) } : null;
    },
    // Dòng tổng kết: "154 bài · 420 đoạn code · 154 đạt · 0 hỏng · 73.2s".
    // `truot` lấy từ số HỎNG, nên một bài hỏng làm cổng đỏ vì "bộ test đỏ" chứ
    // không vì "bảng ghi sai" — cùng lý lẽ đã viết cho mục e2e.
    doc: (ra) => {
      const m = ra.match(/^(\d+) bài · (\d+) đoạn code · (\d+) đạt · (\d+) hỏng/m);
      return m
        ? { bai: Number(m[1]), doan: Number(m[2]), truot: Number(m[4]) }
        : null;
    },
  },
  practice: {
    nhan: 'ca chấm bài tập pe-da',
    lenh: 'node scripts/pe-da/check-practice.mjs',
    cwd: '.',
    bang: () => {
      const m = MD.match(
        /check-practice\.mjs`[^|\n]*?([\d  ]+) bài, \*\*([\d  ]+) ca đạt\*\*, ([\d  ]+) biến thể/);
      return m ? { bai: so(m[1]), ca: so(m[2]), bienThe: so(m[3]) } : null;
    },
    bang2: () => {
      const m = MD.match(/check-moc-chay[^|\n]*?practice ([\d  ]+)\/([\d  ]+)\/([\d  ]+)/);
      return m ? { bai: so(m[1]), ca: so(m[2]), bienThe: so(m[3]) } : null;
    },
    // "143 bài tự làm · 480 ca chấm · 480 đạt · 27.7 s" + "pha 2 — lời giải SAI:
    // 773 biến thể · 773 bị đánh trượt đúng". `truot` = số ca chấm KHÔNG đạt
    // CỘNG số biến thể sai KHÔNG bị bắt: cả hai đều là "bộ chấm hỏng", và gộp
    // chúng vào một trường giữ đúng hợp đồng `truot` của các mục khác.
    doc: (ra) => {
      const a = ra.match(/^(\d+) bài tự làm · (\d+) ca chấm · (\d+) đạt/m);
      const b = ra.match(/pha 2 — lời giải SAI: (\d+) biến thể · (\d+) bị đánh trượt đúng/);
      if (!a || !b) return null;
      return {
        bai: Number(a[1]), ca: Number(a[2]), bienThe: Number(b[1]),
        truot: (Number(a[2]) - Number(a[3])) + (Number(b[1]) - Number(b[2])),
      };
    },
  },
  tracer: {
    nhan: 'phép kiểm của bộ ghi vết',
    lenh: `${process.platform === 'win32' ? 'py' : 'python'}`
      + ' -I scripts/tracer/pe_tracer_test.py',
    cwd: '.',
    bang: () => {
      const m = MD.match(/\*\*(\d+) phép kiểm\*\*/);
      return m ? { ca: Number(m[1]) } : null;
    },
    bang2: () => {
      const m = MD.match(/check-moc-chay[^|\n]*?tracer (\d+)/);
      return m ? { ca: Number(m[1]) } : null;
    },
    doc: (ra) => {
      const m = ra.match(/Chạy (\d+) phép kiểm, trượt (\d+)/);
      return m ? { ca: Number(m[1]), truot: Number(m[2]) } : null;
    },
  },
  // BỘ VĂN PHONG. Hàng này của bảng mốc nền mang BẢY con số, và trước 08/11/2026
  // KHÔNG cổng nào đối chiếu một con số nào trong đó: `check-moc-nen` cố ý không
  // chạy bộ kiểm nào (nó phải nhanh) nên nó tự khai chúng là NGOÀI TẦM, còn
  // ratchet `--doi-chieu` canh §11 của VAN-PHONG.md chứ không canh AGENTS.md. Hệ
  // quả đo được: mười lát văn phong liền, bảy con số ấy được sửa BẰNG TAY — và
  // một bản sao TRONG CHÍNH hàng đó đã trôi thật (nó ghi 82 lỗi khi số thật là
  // 77). Đúng lớp của con số 204 vs 134.
  //
  // BA con số L3/L1/L8 không chỉ là số: hàng khai chúng là ba luật DỒN nhiều lỗi
  // nhất, tức một lời khai về THỨ TỰ. Nên mục này kiểm thêm rằng ba luật ấy VẪN
  // là ba luật nhiều lỗi nhất — ngày L2 vượt L3 thì con số có thể vẫn khớp trong
  // khi câu "dồn ở" đã sai, và một phép so BẰNG sẽ im lặng ở đúng chỗ đó.
  vanphong: {
    nhan: 'bộ văn phong pe-da',
    lenh: `${process.platform === 'win32' ? 'py' : 'python'}`
      + ' -I scripts/pe-da/check_vanphong.py --doi-chieu',
    cwd: '.',
    luuY: 'TL là một luật của chính bộ này, nên một con số TRÔI trong VAN-PHONG.md '
      + 'làm `lỗi` phình lên và mục này sẽ kêu CẢ "bảng ghi sai" — đó là cascade đã '
      + 'khai ở AGENTS.md. Sửa cái GỐC (§1/§2/§8/§11/§12 của VAN-PHONG.md) rồi đo '
      + 'lại, đừng ghi ngay con số mà cổng vừa in.',
    bang: () => {
      const m = MD.match(
        /check_vanphong\.py` → ([\d  ]+) bài, \*\*([\d  ]+) lỗi · ([\d  ]+) cảnh báo\*\*, dồn ở L3 ([\d  ]+)[^|\n]*?· L1 ([\d  ]+)[^|\n]*?· L8 ([\d  ]+)/);
      const r = MD.match(/\*\*([\d  ]+) luật, 0 lỗi\*\*/);
      return m && r
        ? {
          bai: so(m[1]), loi: so(m[2]), canhBao: so(m[3]),
          L3: so(m[4]), L1: so(m[5]), L8: so(m[6]), luat: so(r[1]),
        }
        : null;
    },
    bang2: () => {
      const m = MD.match(/check-moc-chay[^|\n]*?vanphong ([\d  ]+)\/([\d  ]+)/);
      return m ? { loi: so(m[1]), canhBao: so(m[2]) } : null;
    },
    // Ba tầng của CÙNG một lần chạy: bảng TỪNG LUẬT, dòng tổng của bộ kiểm, và
    // dòng của ratchet. `truot` lấy từ ratchet, nên một luật xấu đi làm cổng đỏ vì
    // "bộ test đỏ" chứ không vì "bảng ghi sai" — cùng lý lẽ đã viết cho mục e2e.
    doc: (ra) => {
      const t = ra.match(/^(\d+) bài · (\d+) thuật ngữ · (\d+) lỗi · (\d+) cảnh báo/m);
      const r = ra.match(/^Đối chiếu sổ: (\d+) luật · (\d+) bài · (\d+) lỗi/m);
      // `^L1 ` KHÔNG khớp `L10`/`L11`: sau `L1` ở đó là chữ số, không phải khoảng
      // trắng. Và phép đếm ≥ 15 luật là phép TỰ KIỂM — bảng từng luật trượt thì
      // `L3`/`L1`/`L8` đều `undefined` và mọi phép so dưới sẽ đạt RỖNG, đúng cách
      // một cổng tự khai khống độ phủ.
      const luat = {};
      for (const d of ra.split('\n')) {
        const m = d.match(/^(L\d+|TB|TL|§4-A) +(\d+) +(\d+) /);
        if (m) luat[m[1]] = Number(m[2]);
      }
      if (!t || !r || Object.keys(luat).length < 15) return null;
      return {
        bai: Number(t[1]), loi: Number(t[3]), canhBao: Number(t[4]),
        L3: luat.L3, L1: luat.L1, L8: luat.L8,
        luat: Number(r[1]), truot: Number(r[3]),
        _topBa: Object.entries(luat).sort((a, b) => b[1] - a[1]).slice(0, 3)
          .map(([k]) => k).sort(),
      };
    },
    // Lời khai về THỨ TỰ, không về con số. Ba luật mà hàng mốc nền kể tên phải là
    // ba luật nhiều lỗi nhất; L1 và L8 đang BẰNG nhau (21) nên phép so là theo
    // TẬP, không theo vị trí. Câu trong thông điệp SUY RA từ chính mảng — ghi
    // cứng "dồn ở L3 · L1 · L8" cạnh `['L1','L3','L8']` là nuôi một bản sao thứ
    // hai, đúng khiếm khuyết mà cổng này ra đời để bắt.
    themLuat: (that) => {
      const mong = ['L1', 'L3', 'L8'];
      if (mong.join() === that._topBa.join()) return null;
      return `hàng mốc nền khai ba luật dồn nhiều lỗi nhất là ${mong.join(' · ')} `
        + `nhưng đo được ${that._topBa.join(' · ')}. Sửa CÂU của hàng đó, đừng chỉ `
        + 'sửa con số: một phép so BẰNG sẽ im lặng khi tên luật đã sai.';
    },
  },
};

const xin = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const ten = xin.length ? xin : Object.keys(KIEM);
const loi = [];
for (const k of ten) {
  const c = KIEM[k];
  if (!c) {
    loi.push(`không biết mục "${k}" — chọn một trong: ${Object.keys(KIEM).join(', ')}`);
    continue;
  }
  const khai = c.bang();
  if (!khai) {
    loi.push(
      `AGENTS.md KHÔNG CÒN DÒNG nào khớp mốc "${c.nhan}". Đổi chữ của hàng đó thì `
      + 'phải sửa cổng này — im lặng xanh ở đây là đúng cách con số 204 sống sót.',
    );
    continue;
  }
  // MỘT chuỗi lệnh, không phải (lệnh + mảng args) kèm `shell`: dạng thứ hai làm
  // Node ném DeprecationWarning DEP0190. Và `shell` là bắt buộc trên Windows —
  // `npm`/`py` ở đó là `.cmd`/`.bat`, spawn trực tiếp thì ENOENT và status ra `null`.
  const r = spawnSync(c.lenh, {
    cwd: join(ROOT, c.cwd),
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  const ra = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
  const that = c.doc(ra);
  if (!that) {
    // IN LẠI ĐUÔI ĐẦU RA. `spawnSync` BẮT hết stdout/stderr, nên khi không parse
    // được thì người đọc log chỉ thấy đúng câu "không đọc được số" — và trên CI
    // đó là mù hoàn toàn. Đo được 07/11/2026, lần CI đầu tiên thật sự chạy trên
    // repo này: job `backend` đỏ với mã thoát 1 và log KHÔNG có một dòng nào của
    // jest, nên không ai biết bộ test hỏng ở đâu. Một cổng nuốt bằng chứng của
    // chính thứ nó vừa tố là một cổng sẽ bị gỡ.
    const duoi = ra.split('\n').filter((d) => d.trim()).slice(-30);
    loi.push(
      `không đọc được số từ \`${c.lenh}\` — mã thoát ${r.status}`
      + `${r.error ? ` · spawn hỏng: ${r.error.message}` : ''}. Mã thoát \`null\` nghĩa `
      + 'là không chạy được LỆNH, không phải bộ test hỏng.'
      + (duoi.length ? `\n── 30 dòng cuối của \`${c.lenh}\` ──\n${duoi.join('\n')}` : ''),
    );
    continue;
  }
  // BẢN SAO THỨ HAI, nếu mục này có. Cùng con số sống ở HAI hàng của bảng mốc
  // nền, và canh một hàng là đủ để cổng xanh trong khi hàng kia đã trôi — đo
  // được 07/11/2026: "Frontend unit test" ghi 574, "Mốc phải CHẠY mới biết" ghi
  // 573, hai vòng liền, 0 lỗi. KHÔNG CÒN DÒNG cũng là LỖI, vì im lặng ở đây
  // đúng là cách con số 204 sống sót.
  const khai2 = c.bang2 ? c.bang2() : null;
  if (c.bang2 && !khai2) {
    loi.push(
      `AGENTS.md KHÔNG CÒN DÒNG nào khớp BẢN SAO THỨ HAI của mốc "${c.nhan}" `
      + '(hàng "Mốc phải CHẠY mới biết"). Đổi chữ hàng đó thì phải sửa cổng này.',
    );
  }

  const phan = Object.keys(khai).map((f) => `${f} ${khai[f]}/${that[f]}`).join(' · ');
  console.log(`${c.nhan}: bảng/chạy ra → ${phan}`
    + (that.truot ? ` · ${that.truot} TRƯỢT` : ' · 0 trượt'));
  if (that.truot) {
    loi.push(`${c.nhan}: ${that.truot} ca TRƯỢT — con số chỉ đúng khi bộ test xanh.`
      + (c.luuY ? `\n   LƯU Ý: ${c.luuY}` : ''));
  }
  if (c.themLuat) {
    const x = c.themLuat(that);
    if (x) loi.push(`${c.nhan}: ${x}`);
  }
  for (const f of Object.keys(khai)) {
    // Con số CHẠY RA là thẩm quyền; mỗi bản sao so RIÊNG với nó, nên thông điệp
    // chỉ đúng vào bản sai thay vì nói chung "bảng ghi sai".
    for (const [nhanBang, ghi] of [
      ['bảng', khai[f]],
      // `f in khai2`: bản sao được phép chở một TẬP CON các con số — hàng "Mốc
      // phải CHẠY mới biết" chở 2 trong 7 con số của mục văn phong. Nó KHÔNG nới
      // phép kiểm: chính regex của `bang2` đã đòi đúng hình dạng, nên mất một con
      // số ở đó là "KHÔNG CÒN DÒNG", không phải im lặng.
      ...(khai2 && f in khai2
        ? [['bản sao ở hàng "Mốc phải CHẠY mới biết"', khai2[f]]] : []),
    ]) {
      if (ghi !== that[f]) {
        const d = that[f] - ghi;
        loi.push(
          `${c.nhan}: ${nhanBang} ghi ${f} = ${ghi}, chạy ra ${that[f]} `
          + `(lệch ${d > 0 ? '+' : ''}${d}). Thêm/bớt thì chạy lệnh, lấy số THẬT, sửa `
          + 'MỌI bản sao trong bảng TRONG CÙNG commit.',
        );
      }
    }
  }
}

// SỐ MỤC CỦA CHÍNH CỔNG NÀY cũng là một con số trong bảng, và cho tới
// 08/11/2026 không gì canh nó — hàng ghi "6 mục" suốt trong khi thêm/bớt một mục
// chỉ sửa file này. `check-moc-nen` đã tự canh `mucDoiChieu` của nó từ trước; đây
// là nửa còn thiếu. Nó chạy ở MỌI lần gọi, kể cả khi chỉ gọi một mục, vì con số
// ấy không phụ thuộc tham số.
{
  const m = MD.match(/check-moc-chay\.mjs` → \*\*(\d+) mục\*\*/);
  const that = Object.keys(KIEM).length;
  if (!m) {
    loi.push(
      'AGENTS.md KHÔNG CÒN DÒNG nào khai SỐ MỤC của cổng này ("N mục"). Đổi chữ '
      + 'hàng đó thì phải sửa cổng này.',
    );
  } else if (Number(m[1]) !== that) {
    loi.push(
      `số mục của chính cổng này: bảng ghi ${m[1]}, đếm ra ${that}. Thêm/bớt một `
      + 'mục thì sửa hàng "Mốc phải CHẠY mới biết" TRONG CÙNG commit.',
    );
  }
}

console.log('\nNGOÀI TẦM cổng này, cố ý (xem chú thích đầu file):');
console.log('   – Backend lint 92 lỗi · Frontend lint 146 cảnh báo. Hai con số đó phải ĐI '
  + 'XUỐNG, nên phép so BẰNG sẽ đỏ ở mỗi đợt dọn — chiều của chúng đã có sổ ngưỡng canh.');
console.log('');
if (loi.length) {
  for (const x of loi) console.log(`LỖI: ${x}`);
  console.log(`\n${loi.length} lỗi`);
  process.exitCode = 1; // KHÔNG process.exit(): nó đua với pool keep-alive và thoát 127
} else {
  console.log('0 lỗi');
}
