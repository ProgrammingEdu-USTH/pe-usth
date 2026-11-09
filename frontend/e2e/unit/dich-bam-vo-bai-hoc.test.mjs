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
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/**
 * Năm module dựng nên các bề mặt người học bấm vào.
 *
 * Ba tệp đầu là màn BÀI HỌC. Hai tệp cuối là `/ide` và code visualizer —
 * thêm 08/11/2026, và chúng KHÔNG phải phạm vi mở cho đủ: `/ide` có 411
 * nút "Thử ngay trong IDE" trỏ tới (xem `check-duong-toi.mjs`), còn
 * visualizer là chỗ DUY NHẤT của sản phẩm có bước-từng-dòng.
 */
const TEP = [
  'src/components/lesson-chrome/LessonChrome.module.css',
  'src/components/python-studio/studio-chrome.module.css',
  'src/components/lesson-chrome/exercises/exercises.module.css',
  'src/app/ide/ide.module.css',
  'src/components/code-visualizer/CodeVisualizer.module.css',
  // Thêm 09/11/2026. Phép đo mở vòng ấy: đếm `cursor: pointer` trên TOÀN
  // `frontend/src` ra **44 rule** trong khi cổng chỉ phủ **30** — tức 32%
  // đích bấm của sản phẩm nằm ngoài, và trong số đó có HỘP ĐỒNG Ý (bề mặt
  // PHÁP LÝ), vỏ MỌI màn bài học (`.hintToggle` của ShellB), và đề ôn tập
  // chấm ở máy chủ. "0 lỗi" của cổng vì vậy đang được đọc rộng hơn thứ nó
  // chứng minh.
  //
  // HAI ĐƠN VỊ, đừng lẫn: phép đo mở vòng đếm KHAI BÁO `cursor: pointer`
  // (44), còn cổng đếm SELECTOR (46) — hai rule dùng chung một thân nên
  // chúng mang 2 selector mỗi cái. Selector mới là đơn vị đúng, vì sàn áp
  // cho từng selector. Con số của cổng sau vòng này: **41/46 phủ, 5 khai**.
  'src/components/python-studio/review-quiz.module.css',
  'src/components/lesson-chrome/ShellB.module.css',
  'src/components/python-studio/consent-banner.module.css',
  'src/components/CourseShell.module.css',
  'src/app/error.module.css',
  // Thêm vì PHÉP TỰ KIỂM ngay dưới bắt được: phép đếm mở vòng CÓ kể nó
  // (SiteHeader 1 rule) mà danh sách này thì tôi gõ thiếu. `.theme` đã 48×48
  // kèm `flex: none` từ trước nên nó tự đạt — tức tệp này vào `TEP` không
  // phải một bản sửa, nó là bịt một lỗ trong lời khai độ phủ.
  'src/components/SiteHeader.module.css',
];

/**
 * Tệp CÓ `cursor: pointer` mà cổng CỐ Ý không phủ, kèm lý do.
 *
 * Hai chiều, như mọi danh sách khai khác: một tệp có đích bấm mà không được
 * phủ lẫn không được khai là LỖI; và một tệp khai ở đây mà nay KHÔNG còn
 * `cursor: pointer` nào cũng là LỖI (ngoại lệ lỗi thời).
 */
const TEP_NGOAI_TAM = {
  'src/components/goc-hoc/scene.css':
    'Cảnh Góc học ở trang chủ. Ràng buộc đứng của vòng lặp nói thẳng KHÔNG đầu '
    + 'tư vào Góc học / minigame / leaderboard (nghiên cứu kết luận bằng chứng '
    + 'hướng âm hoặc không có), nên đo và sửa đích bấm ở đó là mở lại một phạm vi '
    + 'đã đóng. 3 rule: `button` trần, `.snote` (đã có height 51px), `#hotHit .o`.',
  'src/components/python-studio/studio.module.css':
    'PythonStudio — component đã khai CHẾT-MÀ-GIỮ ở `check-tai-nguyen-chet.mjs` '
    + 'từ vòng #142 (0 đường tới: `/lesson/python` trả 404 ở MỌI tham số). Sửa CSS '
    + 'của một component không ai tới là việc không có người dùng; lời khai ở cổng '
    + 'tài nguyên chết đã mang sẵn việc thứ (4) là nâng hai ô gõ lên 16px, nên '
    + 'ngày hồi sinh thì cả hai việc nằm cùng một chỗ. 2 rule: `.studio button`, '
    + '`.choice`.',
};
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
const CHUA_DO = {
  // 08/11/2026: danh sách đổi từ TÊN TRẦN sang có ĐƯỜNG ĐI. Bản đầu chỉ là 11
  // chuỗi, nên vòng sau phải đi tìm lại từ đầu "nút này ở màn nào". Mỗi mục nay
  // mang tệp dựng nó và VÌ SAO một lượt đi qua bài học không gặp nó — đó là
  // thứ biến một danh sách nợ thành một việc làm được.
  '.toast button':
    'LessonOverlays.tsx — overlay thoáng qua (hiện rồi tự tắt), nên một lượt đi '
    + 'qua màn không chắc gặp. Cần ép nó hiện mới đo được.',
  '.awards button':
    'LessonOverlays.tsx — bảng giải thưởng, cùng lý do như toast: nó là overlay '
    + 'nên chỉ hiện sau một mốc (đạt huy hiệu) chứ không nằm trên đường đi thẳng '
    + 'của màn, và một lượt đi qua bài học không kích được nó.',
  '.resetLink':
    'AdminAnswerKey.tsx — bề mặt QUẢN TRỊ, không nằm trên đường nào của người '
    + 'học. Sàn 44px vẫn nên áp (chuột hay ngón tay thì cũng là đích bấm) nhưng '
    + 'nó không cùng mức ưu tiên với màn bài học.',
  '.answerKeyHead':
    'AdminAnswerKey.tsx — cùng bề mặt quản trị ấy, là tiêu đề bấm được của bảng '
    + 'đáp án. Nó khai `width: 100%` nên trục ngang đạt sẵn; chỉ trục dọc chưa đo.',


  // Hai mục dưới do NỘI DUNG quyết bề cao (hàng full-width, chữ xuống dòng
  // được), nên một sàn gieo mù vừa có thể là no-op vừa che mất một vấn đề
  // thiết kế thật. Phép chia của vòng #162: nút pill cỡ cố định thì ÁP SÀN,
  // hàng do nội dung quyết thì KHAI NỢ kèm đường đo.
  '.phuongAn':
    'ReviewQuiz.tsx — phương án của đề ôn tập, hàng full-width `padding: 10px 12px` font 14px nên bề cao do số dòng của câu quyết. Đo được khi người học xong ≥ 2 bài: `MIN_POOL` đòi 5 câu và mỗi bài phát 3 câu.',
  '.moduleHead':
    'CourseDetail.tsx qua CourseShell.module.css — hàng tiêu đề học phần bấm được ở trang khoá học, `padding: 13px 4px` và chữ là một heading nên bề cao gần chắc đã ≥ 44 do nội dung. Đo được bằng cách mở `/courses/python_advanced` ở 390×844; chưa làm vì vòng này đã có một bản sửa đo được.',
  '.theoryFigure figcaption a':
    'ReadScreen.tsx — link nguồn trong chú thích hình, chỉ có ở bài mà hình mang '
    + 'link. Là thẻ `a` INLINE nên `min-height` không áp được: bản sửa ở đó phải '
    + 'là `display: inline-block` + padding, một quyết định khác hẳn.',


};

/**
 * Rule `cursor: pointer` KHÔNG CÓ ĐƯỜNG TỚI NGƯỜI HỌC — hạng khác với CHUA_DO.
 *
 * Gộp chúng vào "chưa đo" là sai, vì chúng sẽ KHÔNG BAO GIỜ đo được trên đường
 * sản phẩm hiện tại: không phải thiếu một lượt đi, mà là thiếu một màn.
 */
const KHONG_CO_DUONG_TOI = {
  // ĐÍNH CHÍNH 09/11/2026 — mục này đi qua HAI lần khai sai trước khi đúng:
  //  · #158 khai nó là CHƯA ĐO và ghi lý do "panel từng bước của /ide";
  //  · #159 sửa tệp thành `SandboxScreen.tsx` (đúng) nhưng GIỮ hạng CHƯA ĐO và
  //    viết "nằm trên đường người học, 143 bài có ca chấm" — cũng sai, vì
  //    `.panel` KHÔNG đọc `tests`.
  // Thứ sửa được cả hai là một phép ĐẾM trên bản dựng, không phải đọc thêm một
  // lần nữa chỗ dùng trong TSX.
  '.panel summary':
    'SandboxScreen.tsx:127 và :148 — hai `<details>` đọc `four?.contracts` và '
    + '`four?.files`. Đếm MỌI khoá `step_4` của hai gói: pe-da phát `contracts` '
    + '0/179 và `files` 0/179, còn pe-v4 (đã ẩn) phát 44/48 và 11/48. Nên hai '
    + 'panel ấy chưa bao giờ hiện cho một người học nào — cùng hạng `.toggleBtn`, '
    + 'không phải "chưa đo". ĐỪNG lẫn với `contract` SỐ ÍT (52/179 bài pe-da): '
    + 'đó là hợp đồng ca chấm, và tra nhầm nó là kết luận panel hiện ở 52 bài. '
    + 'Bề mặt tối này nay có một mục trong `scripts/ban-do-tinh-nang.mjs`, nên '
    + '`check-duong-toi.mjs` sẽ đỏ vào ngày build phát một trong hai khoá.',
  '.toggleBtn':
    'TrueFalse.tsx, và người dùng duy nhất của nó là `TrueFalseGame.tsx` — một '
    + 'màn mini-game của pe-v4. Đo trên bản dựng: khoá 179 bài chỉ phát ra '
    + '`step_2.mcq` (179) và `step_2.practice` (179), KHÔNG khoá game nào — tức '
    + '0/179 bài có màn ấy. Cùng hạng với nút "Thử ngay trong IDE" ở màn '
    + 'brief/explain mà `check-duong-toi.mjs` đã khai là còn tối. Vẫn giữ mã, vì '
    + 'ngày pe-v4 bật lại thì nó sống.',
};

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
/**
 * MỌI selector của một rule, không chỉ dòng cuối.
 *
 * Bản đầu lấy `.split(/[\n;]/).pop()` — tức DÒNG CUỐI — nên một rule viết
 * `.restoredAction,\n.restoredClose {` chỉ còn `.restoredClose`, và
 * `.restoredAction` RƠI KHỎI phép quét hoàn toàn. Một đích bấm không bao
 * giờ được kiểm trong khi cổng vẫn in 0 lỗi: đúng hình dạng "cổng rỗng"
 * mà file này đã bắt ba lần ở chỗ khác.
 *
 * Cắt sau dấu `;` CUỐI để bỏ các at-rule không có khối (`@import …;`) lọt
 * vào phần văn bản giữa hai dấu ngoặc.
 */
function selCua(tho) {
  return tho.slice(tho.lastIndexOf(';') + 1)
    .split(',').map((s) => s.trim()).filter(Boolean);
}

function moiRule(van = CSS) {
  const ma = boChuThich(van);
  const ra = [];
  for (const mm of ma.matchAll(/@media([^{]*)\{([\s\S]*?)\n\}/g)) {
    for (const m of mm[2].matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      ra.push({ sels: selCua(m[1]), than: m[2], media: mm[1].trim() });
    }
  }
  const ngoai = ma.replace(/@media[^{]*\{[\s\S]*?\n\}/g, ' ');
  for (const m of ngoai.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    ra.push({ sels: selCua(m[1]), than: m[2], media: null });
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
    if (!r.sels.includes(sel)) continue;
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
  // Và phép bóc selector phải giữ MỌI tên, không chỉ dòng cuối (xem `selCua`).
  assert.deepEqual(
    selCua('\n.a,\n.b c {'.replace(' {', '')), ['.a', '.b c'],
    'selCua đánh rơi selector — rule nhiều tên sẽ lọt khỏi phép quét',
  );
});

test('đích bấm: VỎ BÀI HỌC — nghiêm hơn, chỉ NGOAI_TAM miễn được', () => {
  // Ca này KHÔNG dư so với ca năm-tệp ở dưới, và khác ở đúng một chỗ: ở đây
  // lối thoát DUY NHẤT là `NGOAI_TAM` (đã đo, sàn bất khả, kèm số). Không ai
  // dời được một đích bấm của vỏ bài học sang `CHUA_DO` — vỏ ấy hiện ở MỌI
  // màn của 179 bài, nên "chưa đo" không phải một lời khai đứng được ở đây.
  const rules = moiRule();
  const loi = [];
  const dat = [];
  for (const r of rules) {
    if (!/cursor\s*:\s*pointer/.test(r.than)) continue;
    for (const sel of r.sels) {
      const cao = hieuLuc(rules, sel, 'min-height') ?? hieuLuc(rules, sel, 'height');
      const rong = hieuLuc(rules, sel, 'min-width') ?? hieuLuc(rules, sel, 'width');
      const duSan = cao !== null && cao >= SAN && rong !== null && rong >= SAN;
      if (NGOAI_TAM[sel]) { if (duSan) dat.push({ sel, cao, rong }); continue; }
      if (!duSan) {
        loi.push(`\`${sel}\`: cao ${cao ?? 'KHÔNG KHAI'}, rộng ${rong ?? 'KHÔNG KHAI'}`);
      }
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
      moiRule().some((r) => r.sels.includes(t)),
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

test('đích bấm: MỌI tệp trong `TEP` — mọi rule `cursor: pointer` đạt sàn hoặc được KHAI', () => {
  // Mở rộng của ca trên sang `studio-chrome.module.css` và
  // `exercises.module.css`. Vẫn canh theo ĐỘ PHỦ: một nút MỚI thêm vào bất cứ
  // file nào trong ba file phải đạt sàn hoặc có tên trong một danh sách khai.
  //
  // HAI danh sách khai, và chúng nói hai điều KHÁC NHAU:
  //   NGOAI_TAM — đã đo, sàn BẤT KHẢ ở đó, kèm lý do mang số.
  //   CHUA_DO   — chưa đo trên thiết bị, nên không ai được nói nó đạt.
  // Gộp hai cái lại là mất phân biệt "đã quyết" với "chưa biết".
  //
  // KHOẢNG TRỐNG ĐÃ ĐO, phải nói ra để "0 lỗi" không bị đọc quá: phép ĐỘ PHỦ
  // khoá vào `cursor: pointer`, nên một CONTROL GỐC không khai nó
  // thì nửa độ phủ mù hẳn. Một ca thật: `.scrub` (thanh trượt chọn
  // bước của visualizer, một `input[type=range]`) cao 16px mà không
  // rule nào của nó có `cursor: pointer` — range có con trỏ riêng của
  // trình duyệt. Ablate xác nhận: hạ nó về 16 chỉ ra ĐÚNG 1 đỏ, và con đỏ ấy
  // đến từ ca ghim CU theo TÊN, không từ ca này. Tức một range input THÊM MỚI
  // ngày mai sẽ không ai canh. Khoá thêm vào `accent-color` thì phủ
  // được, nhưng đó là một luật thứ hai chưa có bằng chứng ai cần — chưa làm.
  const loi = [];
  const datMaKhai = [];
  const thay = new Set();
  for (const tep of TEP) {
    const van = readFileSync(join(GOC, tep), 'utf8');
    const rules = moiRule(van);
    for (const r of rules) {
      if (!/cursor\s*:\s*pointer/.test(r.than)) continue;
      for (const sel of r.sels) {
      thay.add(sel);
      const cao = hieuLuc(rules, sel, 'min-height') ?? hieuLuc(rules, sel, 'height');
      const rong = hieuLuc(rules, sel, 'min-width') ?? hieuLuc(rules, sel, 'width');
      // Bề rộng: năm nút vừa sửa đều ĐÃ ≥ 44 theo nội dung, và `min-height` một
      // mình là bản sửa đúng cho chúng. Nên ở hai module này luật đòi TRỤC DỌC
      // bằng khai báo, còn trục ngang thì chấp nhận số đo đã có — ghi ra đây vì
      // đó là một phép nới so với ca trên, và nó có lý do: ép `min-width` lên
      // một chip trong hàng ngang là đổi bố cục mà tôi chưa đo.
      // TRỤC NGANG, hai luật khác nhau và cả hai đều cần:
      //  · vỏ bài học (TEP[0]) đòi bề rộng phải ĐƯỢC KHAI — nhãn nút ở đó do
      //    `cta.ts` sinh nên nội dung đổi theo màn;
      //  · MỌI tệp: nếu rule khai `width` TƯỜNG MINH thì tác giả đã ấn định bề
      //    rộng, nên nó không do nội dung quyết và phải đạt sàn. Đây là luật
      //    SUY RA ĐƯỢC, không phải một danh sách — và nó là thứ duy nhất bắt
      //    `.ctrl` (khai `width: 40px`) và `.restoredClose` (26px), hai nút mà
      //    luật "chỉ đòi trục dọc" của các module studio sẽ cho qua.
      const rongAnDinh = hieuLuc(rules, sel, 'width');
      const doiCaHaiTruc = tep === TEP[0];
      const duSan = cao !== null && cao >= SAN
        && (!doiCaHaiTruc || (rong !== null && rong >= SAN))
        && (rongAnDinh === null || rongAnDinh >= SAN);
      const khai = NGOAI_TAM[sel] ? 'NGOAI_TAM'
        : CHUA_DO[sel] ? 'CHUA_DO'
          : KHONG_CO_DUONG_TOI[sel] ? 'KHONG_CO_DUONG_TOI' : null;
      if (khai) { if (duSan) datMaKhai.push(`${sel} (${khai})`); continue; }
      if (!duSan) {
        loi.push(`${tep.split('/').pop()} \`${sel}\`: cao ${cao ?? 'KHÔNG KHAI'}`
          + (doiCaHaiTruc ? `, rộng ${rong ?? 'KHÔNG KHAI'}` : '')
          + (rongAnDinh !== null && rongAnDinh < SAN ? `, KHAI \`width: ${rongAnDinh}px\`` : ''));
      }
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
  assert.ok(thay.size >= 24, `chỉ thấy ${thay.size} selector \`cursor: pointer\` trên cả năm file`);
  // Và mọi mục của CẢ BA danh sách phải trỏ vào một selector CÓ THẬT, cộng một
  // LÝ DO đủ dài để kiểm được — một danh sách nợ không kèm đường đi thì vòng
  // sau phải đi tìm lại từ đầu, và đó đúng là chuyện đã xảy ra với bản đầu của
  // `CHUA_DO` (11 chuỗi tên trần).
  for (const [ten, ds] of [['CHUA_DO', CHUA_DO], ['KHONG_CO_DUONG_TOI', KHONG_CO_DUONG_TOI]]) {
    for (const [s, vi] of Object.entries(ds)) {
      assert.ok(thay.has(s), `${ten} khai \`${s}\` nhưng không file nào còn rule đó`);
      assert.ok(vi.length > 80, `${ten}['${s}'] thiếu lý do đủ để kiểm`);
      assert.match(vi, /\.tsx|\.mjs/, `${ten}['${s}'] không nói ra tệp nào dựng nó`);
    }
  }
  // `KHONG_CO_DUONG_TOI` phải mang một số đo BẰNG KHÔNG — không chỉ một lời
  // khẳng định, và không chỉ một tỉ lệ bất kỳ.
  //
  // VÌ SAO `0/<n>` chứ không `<n>/<m>`: hai danh sách khai nhận cùng một bộ phép
  // kiểm, nên dời một mục từ `CHUA_DO` sang đây KHÔNG làm đỏ gì — ablate vòng
  // 09/11 đo được đúng chuyện đó. Luật cũ nhận cả "143/179", tức một mục CÓ
  // đường tới vẫn đậu được vào danh sách KHÔNG-CÓ-ĐƯỜNG-TỚI. "Không có đường"
  // nghĩa là phép đếm ra KHÔNG, nên đó là thứ phân biệt được hai hạng.
  //
  // KHE CÒN LẠI, khai ra vì nó KHÔNG đóng được ở đây: chiều NGƯỢC — một mục
  // thật sự không có đường mà bị parked trong `CHUA_DO` — thì cổng này mù, vì
  // chỉ `scripts/ban-do-tinh-nang.mjs` biết một bề mặt có đường tới hay không.
  // Đòi mọi mục ở đây phải có một mục tương ứng trong bản đồ thì sẽ kêu oan:
  // `.toggleBtn` không có mục nào trong bản đồ (màn game của pe-v4 chưa ai khai).
  for (const [s, vi] of Object.entries(KHONG_CO_DUONG_TOI)) {
    assert.match(
      vi, /\b0\/\d+/,
      `KHONG_CO_DUONG_TOI['${s}'] phải mang số đo dạng 0/<n> — một tỉ lệ khác 0 `
      + 'nghĩa là nó CÓ đường tới, tức nó thuộc một hạng khác.',
    );
  }
});

test('đích bấm: ĐỘ PHỦ trên toàn `src/` — mọi tệp có đích bấm phải được phủ hoặc KHAI', () => {
  // VÌ SAO CA NÀY TỒN TẠI: trước 09/11/2026 cổng phủ 5 tệp và in "0 lỗi", mà
  // phép đếm trên toàn `src/` cho **46 selector** `cursor: pointer` — tức 15
  // (33%) nằm ngoài, gồm hộp đồng ý, vỏ mọi màn bài học, và đề ôn tập. Không
  // gì nói ra điều đó, nên "0 lỗi" đọc được thành "mọi đích bấm đã đạt".
  //
  // Ca này không đòi phủ HẾT — nó đòi mỗi tệp có đích bấm phải NẰM trong `TEP`
  // hoặc có một dòng khai lý do. Đó là cùng hợp đồng mà `check-duong-toi.mjs`
  // dùng cho bề mặt tối: "chưa phủ" được phép tồn tại, nhưng phải NÓI RA.
  const tep = [];
  const walk = (d) => {
    for (const e of readdirSync(join(GOC, d), { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".css")) tep.push(p);
    }
  };
  walk("src");
  // Tự kiểm phép duyệt: trượt thì mọi luật dưới đạt RỖNG.
  // Sàn 10 chỉ để bắt "duyệt ra 0–1 tệp". Đo 09/11/2026 được 17 tệp (16
  // module + `scene.css`), và con số 16 đã có `check-moc-nen` canh riêng —
  // ghim nó ở đây là nuôi bản sao thứ hai, và nó sẽ đỏ oan vào ngày một đợt
  // dọn tài nguyên chết xoá một module.
  assert.ok(tep.length >= 10, `phép duyệt CSS trượt, chỉ thấy ${tep.length} tệp`);

  // HAI DANH SÁCH KHÔNG ĐƯỢC CHỒNG NHAU. Lỗ này lộ ra khi ablate chính ca này:
  // khai một tệp ĐANG được phủ vào `TEP_NGOAI_TAM` cho **0 đỏ**, vì nhánh
  // `if (TEP.includes(p))` thắng trước. Vô hại hôm nay, có hại ngày mai — ngày ai
  // gỡ tệp ấy khỏi `TEP`, lời khai nằm sẵn ở đó HẤP THỤ nó và cổng im lặng thay
  // vì đỏ. Đúng lỗ mà vòng #160 đã bắt giữa `CHUA_DO` và `KHONG_CO_DUONG_TOI`:
  // hai hạng khai thay nhau được thì bản sửa không được cổng nào thi hành.
  const chongNhau = TEP.filter((p) => TEP_NGOAI_TAM[p]);
  assert.deepEqual(
    chongNhau, [],
    "TỆP NẰM TRONG CẢ HAI DANH SÁCH. `TEP` nghĩa là \"cổng VERIFY từng rule của "
    + "tệp này\", `TEP_NGOAI_TAM` nghĩa là \"cổng KHÔNG xét tệp này\" — chọn một. "
    + "Phủ thì mạnh hơn khai, nên gỡ dòng khai đi.\n   " + chongNhau.join("\n   "),
  );

  let tongRule = 0;
  let phuRule = 0;
  const chuaKhai = [];
  const khaiMaHetBam = [];
  for (const p of tep) {
    const rules = moiRule(readFileSync(join(GOC, p), "utf8"));
    const n = rules.filter((r) => /cursor\s*:\s*pointer/.test(r.than))
      .reduce((s, r) => s + r.sels.length, 0);
    if (!n) {
      if (TEP_NGOAI_TAM[p]) khaiMaHetBam.push(p);
      continue;
    }
    tongRule += n;
    if (TEP.includes(p)) phuRule += n;
    else if (!TEP_NGOAI_TAM[p]) chuaKhai.push(`${p} (${n} rule)`);
  }

  assert.deepEqual(
    chuaKhai, [],
    "TỆP CÓ ĐÍCH BẤM MÀ KHÔNG PHỦ LẪN KHÔNG KHAI. Thêm nó vào `TEP` (rồi mỗi "
    + "rule phải đạt sàn hoặc vào một danh sách khai), hoặc thêm một dòng lý do "
    + "vào `TEP_NGOAI_TAM`. Im lặng ở đây là thứ làm \"0 lỗi\" đọc được thành "
    + "\"mọi đích bấm đã đạt\".\n   " + chuaKhai.join("\n   "),
  );
  assert.deepEqual(
    khaiMaHetBam, [],
    "NGOẠI LỆ ĐÃ LỖI THỜI: tệp dưới nay không còn `cursor: pointer` nào, gỡ nó "
    + "khỏi `TEP_NGOAI_TAM`.\n   " + khaiMaHetBam.join("\n   "),
  );
  // SÀN MỘT CHIỀU, chỉ được NÂNG. Đo 09/11/2026: **41/46 selector** được phủ,
  // 5 còn lại ở hai tệp đã khai (Góc học 3 · PythonStudio chết-mà-giữ 2). Ghim
  // đúng con số thật thì thêm một nút mới là đỏ oan, nên sàn đặt thấp hơn một
  // nhịp — cùng luật mà `ds-contrast` dùng cho sàn tương phản.
  assert.ok(
    phuRule >= 38,
    `cổng chỉ còn phủ ${phuRule}/${tongRule} rule — sàn độ phủ CHỈ ĐƯỢC NÂNG`,
  );
});

test('đích bấm: năm nút đã đo không quay về dưới sàn', () => {
  // Ghim riêng con số của năm nút ĐÃ ĐO trên thiết bị, kèm giá trị cũ — để một
  // bản "dọn cho gọn" gỡ `min-height` ra thì có chỗ nói rõ nó từng là bao nhiêu.
  // [cao đo được, chỉ số trong TEP]
  const CU = {
    '.chip': [24, 2], '.runBtn': [37, 2], '.optionCard': [53, 2],
    '.traceOpen': [34, 1], '.tracePredictGo': [36, 1],
    '.practiceReveal': [37, 1], '.onGianCachNut': [43, 1],
    // Đo 09/11/2026 trên NP06 — nút NGAY TRÊN `.practiceReveal` trong cùng cột.
    // #157 sửa cái dưới và bỏ sót cái này vì SY05 không có câu luyện tập nào
    // chạy được, nên cổng `{chayDuoc && …}` không dựng nút để mà đo.
    '.practiceRun': [38, 1],
    // Đo 09/11/2026 sau khi trả lời câu ôn giãn cách trên NP06. Tôi DỰ ĐOÁN 38
    // (cùng công thức CSS với `.practiceRun`) và đo ra 36 — một công thức giống
    // nhau cho một con số GẦN nhau, không cho CÙNG con số.
    '.onGianCachTiep': [36, 1],
    // `/ide`, đo 08/11/2026 ở 390×844. `.stop` KHÔNG đo trực tiếp (nó chỉ
    // hiện lúc đang chạy) — nó khai CÙNG `height: 42px` với `.run`, nên con
    // số suy ra từ khai báo chứ không từ màn hình, và nói ra ở đây.
    '.select': [42, 3], '.run': [42, 3], '.stop': [42, 3],
    '.restoredAction': [31, 3], '.restoredClose': [26, 3],
    // Code visualizer. `.ctrl` là năm nút bước, dưới sàn ở CẢ HAI trục.
    '.ctrl': [36, 4], '.start': [38, 4], '.scrub': [16, 4],
    '.detail summary': [16, 4],
  };
  for (const [sel, [cu, i]] of Object.entries(CU)) {
    const tep = TEP[i];
    const rules = moiRule(readFileSync(join(GOC, tep), 'utf8'));
    const cao = hieuLuc(rules, sel, 'min-height') ?? hieuLuc(rules, sel, 'height');
    assert.ok(
      cao !== null && cao >= SAN,
      `\`${sel}\` nay khai cao ${cao ?? 'KHÔNG GÌ'} — đo trên production nó cao `
      + `${cu}px khi chưa có sàn. Đừng gỡ \`min-height: 44px\`.`,
    );
  }
});
