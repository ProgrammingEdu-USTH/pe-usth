// ĐÍCH BẤM CỦA VỎ BÀI HỌC PHẢI ĐƯỢC BẢO ĐẢM BẰNG KHAI BÁO, không bằng may mắn.
//
// Repo tự đặt luật này (`not-found.module.css`, `error.module.css`): "44px:
// đích bấm tối thiểu. Repo đã phải sửa một đích 13×6px một lần." Và trước
// 08/11/2026 KHÔNG gì canh nó — đo được **21 rule có `cursor: pointer`** trong
// ba module của màn bài học và **0 rule nào khai `min-height`**. Cái nào đạt 44
// là nhờ `height`/`padding`, tức phụ thuộc NỘI DUNG.
//
// Số đo trên production (390×844, cả 15 màn của một bài, vùng chạm bằng
// `elementFromPoint`):
//   `.closeBtn`  39×39  — `width/height: 40px`, KHÔNG có override mobile nào
//   `.backBtn`   41×43  — `@media ≤560px` nâng CAO lên 44, nhưng không
//                         `min-width`, nên RỘNG 41,6px do chữ "Quay lại" ngắn
// Tức có người ĐÃ nghĩ tới điện thoại (cùng media query ấy cho `.primaryBtn`
// một `min-width: 132px`), nhưng quy ước được áp một nửa.
//
// CỔNG CANH THEO ĐỘ PHỦ, KHÔNG THEO DANH SÁCH: mọi rule `cursor: pointer`
// trong `LessonChrome.module.css` phải đạt sàn, hoặc có tên trong `NGOAI_TAM`
// kèm lý do. Một danh sách các nút đã biết sẽ KHÔNG phủ nút mới thêm;
// `cursor: pointer` thì phủ, vì không ai làm một đích bấm mà quên nó.
//
// PHẠM VI: chỉ vỏ bài học. Đó là vỏ mà MỌI màn của 179 bài đều hiện, nên nó là
// chỗ đáng canh nhất. 16 rule còn lại ở `studio-chrome.module.css` và
// `exercises.module.css` cần triage từng cái (nhiều cái là chip/toggle nhỏ có
// chủ đích) và là một lát riêng — nói ra ở đây để "0 lỗi" không bị đọc thành
// "mọi đích bấm của màn bài học đã đạt".
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Ba module dựng nên màn bài học. Cổng phủ cả ba, không chỉ vỏ. */
const TEP = [
  'src/components/lesson-chrome/LessonChrome.module.css',
  'src/components/python-studio/studio-chrome.module.css',
  'src/components/lesson-chrome/exercises/exercises.module.css',
];
const CSS = readFileSync(join(GOC, TEP[0]), 'utf8');

const SAN = 44;

/**
 * Rule `cursor: pointer` CHƯA ĐO trên thiết bị — nợ, không phải "đã đạt".
 *
 * VÌ SAO KHAI thay vì nói chúng đạt: cả 16 rule của hai module kia đều KHÔNG
 * khai `min-*`/`height`, nên kích thước đến từ `padding` + nội dung và không
 * đọc được từ CSS. Năm cái đã đo trên production (390×844, màn ĐÃ LẮNG,
 * `offsetHeight`) hoá ra dưới sàn: `.chip` 24 · `.tracePredictGo` 36 ·
 * `.runBtn` 37 · `.practiceReveal` 37 · `.onGianCachNut` 43 — tức tỉ lệ vi phạm
 * trong nhóm ĐÃ ĐO là 5/7. Khai 11 cái còn lại là "đạt" khi chưa mở màn chứa
 * chúng ra xem là một lời khẳng định không có số đo, và nó tệ hơn không khai.
 *
 * Phần lớn chúng nằm trên bề mặt tôi chưa đi qua được trong một lượt: toast,
 * bảng giải thưởng, panel gập, chú thích hình, hoặc màn của pe-v4.
 *
 * DANH SÁCH NÀY CHỈ ĐƯỢC NGẮN ĐI — mỗi lần ai đo một mục thì nó rời khỏi đây,
 * hoặc vì đã đạt (khai `min-height`) hoặc vì phải sửa. Cùng luật một chiều của
 * `DA_SANG_LOFI`.
 */
const CHUA_DO = [
  '.toast button', '.resetLink', '.answerKeyHead', '.panel summary',
  '.awards button', '.theoryFigure figcaption a', '.traceOpen',
  '.onGianCachTiep', '.practiceRun', '.toggleBtn', '.optionCard',
];

/** Đích bấm CỐ Ý dưới sàn, kèm lý do. Hai chiều: một mục đã đạt sàn là LỖI. */
const NGOAI_TAM = {
  'button.segment':
    'Đoạn thanh tiến độ: 15 đoạn cho 15 màn, mà 15 đích 44px cần 660px trong khi '
    + 'khổ 390 chỉ có 358px khả dụng — nên sàn này BẤT KHẢ ở đây, không phải chưa '
    + 'làm. Bản sửa đã có là `::after { inset: -9px 0 }` nới vùng chạm theo chiều '
    + 'DỌC: đo trên production ra 11×24 (rect chỉ 11×6). Trục ngang vẫn 11px và đó '
    + 'là việc THIẾT KẾ (một bộ chọn màn riêng cho điện thoại), không phải một dòng '
    + 'CSS. Và có đường đi tương đương: nút "Quay lại" lùi từng màn.',
};

const boChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ');

/**
 * Mọi rule trong file, kèm điều kiện `@media` nếu có.
 *
 * Phải cắt `@media` TRƯỚC khi duyệt rule: một `height: 44px` nằm trong
 * `@media (max-width: 560px)` là giá trị của KHỔ ĐIỆN THOẠI, còn `height: 40px`
 * ngoài đó là giá trị desktop. Gộp chúng lại là đọc sai cả hai.
 */
function moiRule(van = CSS) {
  const ma = boChuThich(van);
  const ra = [];
  for (const mm of ma.matchAll(/@media([^{]*)\{([\s\S]*?)\n\}/g)) {
    for (const m of mm[2].matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      ra.push({ sel: m[1].split(/[\n;]/).pop().trim(), than: m[2], media: mm[1].trim() });
    }
  }
  const ngoai = ma.replace(/@media[^{]*\{[\s\S]*?\n\}/g, ' ');
  for (const m of ngoai.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    ra.push({ sel: m[1].split(/[\n;]/).pop().trim(), than: m[2], media: null });
  }
  return ra;
}

const px = (than, prop) => {
  const m = new RegExp(`(?:^|[;{\\s])${prop}\\s*:\\s*([\\d.]+)px`).exec(than);
  return m ? parseFloat(m[1]) : null;
};
const phanTram = (than, prop) => new RegExp(`${prop}\\s*:\\s*100%`).test(than);

/** Giá trị CÓ HIỆU LỰC ở khổ điện thoại: override trong `max-width` nếu có. */
function hieuLuc(rules, sel, prop) {
  let v = null;
  for (const r of rules) {
    if (!r.sel.split(',').some((s) => s.trim() === sel)) continue;
    const co = px(r.than, prop) ?? (phanTram(r.than, prop) ? Infinity : null);
    if (co === null) continue;
    if (r.media === null) { if (v === null) v = co; } else if (/max-width/.test(r.media)) v = co;
  }
  return v;
}

test('đích bấm: phép đọc tìm được file và các rule (tự kiểm)', () => {
  // Đọc hoặc duyệt trượt thì mọi luật dưới đạt RỖNG mà không chứng minh gì —
  // đúng cách một cổng tự khai khống độ phủ.
  assert.ok(CSS.length > 3000, `LessonChrome.module.css chỉ ${CSS.length} byte`);
  const rules = moiRule();
  assert.ok(rules.length >= 40, `phép duyệt rule trượt, chỉ thấy ${rules.length}`);
  const bam = rules.filter((r) => /cursor\s*:\s*pointer/.test(r.than));
  assert.ok(bam.length >= 4, `chỉ thấy ${bam.length} rule \`cursor: pointer\` — trượt?`);
});

test('đích bấm: mọi rule `cursor: pointer` đạt sàn 44px hoặc được KHAI', () => {
  const rules = moiRule();
  const loi = [];
  const dat = [];
  for (const r of rules) {
    if (!/cursor\s*:\s*pointer/.test(r.than)) continue;
    const sel = r.sel;
    const cao = hieuLuc(rules, sel, 'min-height') ?? hieuLuc(rules, sel, 'height');
    const rong = hieuLuc(rules, sel, 'min-width') ?? hieuLuc(rules, sel, 'width');
    const duSan = cao !== null && cao >= SAN && rong !== null && rong >= SAN;
    if (NGOAI_TAM[sel]) { if (duSan) dat.push({ sel, cao, rong }); continue; }
    if (!duSan) {
      loi.push(`\`${sel}\`: cao ${cao ?? 'KHÔNG KHAI'}, rộng ${rong ?? 'KHÔNG KHAI'}`);
    }
  }
  assert.deepEqual(
    loi, [],
    `đích bấm dưới sàn ${SAN}px, hoặc KHÔNG được khai báo bảo đảm. Bề rộng do nội `
    + 'dung quyết thì `height` không bảo đảm được nó — thêm `min-width`. Nếu sàn '
    + 'thật sự bất khả ở đó thì thêm một mục vào NGOAI_TAM kèm lý do ĐO ĐƯỢC.\n   '
    + loi.join('\n   '),
  );
  // Chiều thứ hai của danh sách khai: một ngoại lệ nay đã đạt sàn là lỗi thời.
  assert.deepEqual(
    dat, [],
    'NGOẠI LỆ ĐÃ LỖI THỜI: mục dưới nay đã đạt sàn, gỡ nó khỏi NGOAI_TAM — một '
    + 'danh sách chỉ dài ra sẽ thành chỗ giấu rác.\n   '
    + dat.map((d) => `\`${d.sel}\`: ${d.rong}×${d.cao}`).join('\n   '),
  );
});

test('đích bấm: ngoại lệ phải NÓI RA lý do, và lý do phải mang số đo', () => {
  // Một danh sách ngoại lệ không kèm lý do là danh sách không ai dám dọn. Và lý
  // do phải có SỐ, nếu không nó chỉ là một lời khẳng định.
  const ten = Object.keys(NGOAI_TAM);
  assert.ok(ten.length >= 1, 'danh sách ngoại lệ rỗng — nếu đúng thì gỡ ca này');
  for (const t of ten) {
    const vi = NGOAI_TAM[t];
    assert.ok(vi.length > 120, `lý do cho \`${t}\` quá ngắn để kiểm được`);
    assert.match(vi, /\d/, `lý do cho \`${t}\` không có số đo nào`);
    // Và mục khai phải trỏ vào một selector CÓ THẬT trong file.
    assert.ok(
      moiRule().some((r) => r.sel.split(',').some((s) => s.trim() === t)),
      `NGOAI_TAM khai \`${t}\` nhưng file không còn rule nào có selector đó`,
    );
  }
});

test('đích bấm: `.closeBtn` không quay về 40px', () => {
  // Nút này bị bỏ sót ở MỌI khổ trong khi cùng file đã nâng `.backBtn` lên 44 —
  // tức nó là chỗ dễ bị "dọn cho gọn" nhất. Ghim riêng con số.
  const rules = moiRule();
  const c = hieuLuc(rules, '.closeBtn', 'height');
  const r = hieuLuc(rules, '.closeBtn', 'width');
  assert.ok(c >= SAN && r >= SAN, `.closeBtn nay ${r}×${c}, dưới sàn ${SAN}px`);
});

test('đích bấm: CẢ BA module — mọi rule `cursor: pointer` đạt sàn hoặc được KHAI', () => {
  // Mở rộng của ca trên sang `studio-chrome.module.css` và
  // `exercises.module.css`. Vẫn canh theo ĐỘ PHỦ: một nút MỚI thêm vào bất cứ
  // file nào trong ba file phải đạt sàn hoặc có tên trong một danh sách khai.
  //
  // HAI danh sách khai, và chúng nói hai điều KHÁC NHAU:
  //   NGOAI_TAM — đã đo, sàn BẤT KHẢ ở đó, kèm lý do mang số.
  //   CHUA_DO   — chưa đo trên thiết bị, nên không ai được nói nó đạt.
  // Gộp hai cái lại là mất phân biệt "đã quyết" với "chưa biết".
  const loi = [];
  const datMaKhai = [];
  const thay = new Set();
  for (const tep of TEP) {
    const van = readFileSync(join(GOC, tep), 'utf8');
    const rules = moiRule(van);
    for (const r of rules) {
      if (!/cursor\s*:\s*pointer/.test(r.than)) continue;
      const sel = r.sel;
      thay.add(sel);
      const cao = hieuLuc(rules, sel, 'min-height') ?? hieuLuc(rules, sel, 'height');
      const rong = hieuLuc(rules, sel, 'min-width') ?? hieuLuc(rules, sel, 'width');
      // Bề rộng: năm nút vừa sửa đều ĐÃ ≥ 44 theo nội dung, và `min-height` một
      // mình là bản sửa đúng cho chúng. Nên ở hai module này luật đòi TRỤC DỌC
      // bằng khai báo, còn trục ngang thì chấp nhận số đo đã có — ghi ra đây vì
      // đó là một phép nới so với ca trên, và nó có lý do: ép `min-width` lên
      // một chip trong hàng ngang là đổi bố cục mà tôi chưa đo.
      const doiCaHaiTruc = tep === TEP[0];
      const duSan = cao !== null && cao >= SAN
        && (!doiCaHaiTruc || (rong !== null && rong >= SAN));
      const khai = NGOAI_TAM[sel] ? 'NGOAI_TAM' : (CHUA_DO.includes(sel) ? 'CHUA_DO' : null);
      if (khai) { if (duSan) datMaKhai.push(`${sel} (${khai})`); continue; }
      if (!duSan) {
        loi.push(`${tep.split('/').pop()} \`${sel}\`: cao ${cao ?? 'KHÔNG KHAI'}`
          + (doiCaHaiTruc ? `, rộng ${rong ?? 'KHÔNG KHAI'}` : ''));
      }
    }
  }
  assert.deepEqual(
    loi, [],
    `đích bấm dưới sàn ${SAN}px, hoặc KHÔNG được khai báo bảo đảm. Kích thước đến `
    + 'từ `padding` + nội dung thì không gì bảo đảm nó — thêm `min-height: 44px`. '
    + 'Nếu chưa đo được trên thiết bị thì thêm vào CHUA_DO (nợ), KHÔNG nói nó '
    + 'đạt.\n   ' + loi.join('\n   '),
  );
  assert.deepEqual(
    datMaKhai, [],
    'KHAI ĐÃ LỖI THỜI: mục dưới nay đã đạt sàn bằng khai báo, gỡ nó khỏi danh '
    + 'sách — CHUA_DO chỉ được NGẮN ĐI.\n   ' + datMaKhai.join('\n   '),
  );
  // Tự kiểm: phép quét trượt thì mọi luật trên đạt RỖNG.
  assert.ok(thay.size >= 15, `chỉ thấy ${thay.size} selector \`cursor: pointer\` trên cả ba file`);
  // Và mọi mục trong CHUA_DO phải trỏ vào một selector CÓ THẬT.
  for (const s of CHUA_DO) {
    assert.ok(thay.has(s), `CHUA_DO khai \`${s}\` nhưng không file nào còn rule đó`);
  }
});

test('đích bấm: năm nút đã đo không quay về dưới sàn', () => {
  // Ghim riêng con số của năm nút ĐÃ ĐO trên thiết bị, kèm giá trị cũ — để một
  // bản "dọn cho gọn" gỡ `min-height` ra thì có chỗ nói rõ nó từng là bao nhiêu.
  const CU = {
    '.chip': 24, '.runBtn': 37,
    '.tracePredictGo': 36, '.practiceReveal': 37, '.onGianCachNut': 43,
  };
  for (const [sel, cu] of Object.entries(CU)) {
    const tep = ['.chip', '.runBtn'].includes(sel) ? TEP[2] : TEP[1];
    const rules = moiRule(readFileSync(join(GOC, tep), 'utf8'));
    const cao = hieuLuc(rules, sel, 'min-height') ?? hieuLuc(rules, sel, 'height');
    assert.ok(
      cao !== null && cao >= SAN,
      `\`${sel}\` nay khai cao ${cao ?? 'KHÔNG GÌ'} — đo trên production nó cao `
      + `${cu}px khi chưa có sàn. Đừng gỡ \`min-height: 44px\`.`,
    );
  }
});
