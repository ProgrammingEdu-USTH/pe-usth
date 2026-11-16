/**
 * ĐÓNG BÀI RỒI QUAY LẠI DANH SÁCH: phải mở đúng module chứa bài vừa học.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: một người thử ngày 27/10 viết nguyên văn
 *
 *   "1 Vấn đề khó chịu là khi t chọn 1 khóa trong mục 2,3 thì khi mà t click
 *    vào dấu x để tắt hoặc về trang thì nó lại mở full list mục 1 và t lại
 *    phải tìm lại bài nếu t học mục 2,3"
 *
 * Tức nút × — đường ra DUY NHẤT của màn bài học — luôn thả người học xuống đầu
 * một khoá 172 bài chia 10 module. Nó cộng dồn với chuyện thiếu nút quay lại
 * (xem lesson-back.test.mjs): lỡ bấm Tiếp theo thì cách duy nhất để xem lại là
 * đóng bài, mà đóng bài thì mất luôn chỗ đang đứng.
 *
 * BỐN tính chất, và tính chất thứ nhất là tính chất hỏng IM LẶNG:
 *
 *  1. LỆCH MỘT ĐƠN VỊ giữa hai cách đánh số. `lessonNo` ở màn bài học là
 *     `sort_order`, đếm từ 1. Link ở trang khoá học là chỉ số PHẲNG, đếm từ 0.
 *     Quên trừ 1 thì nó vẫn mở đúng module ở hầu hết các bài, nên trông như
 *     chạy được — chỉ sai ở bài ĐẦU của mỗi module, tức đúng chỗ không ai thử.
 *     Ca ở đây kiểm RANH GIỚI của cả 10 module thật.
 *  2. KHÔNG ghim cứng module 0 làm module mở sẵn.
 *  3. CUỘN nằm ở effect RIÊNG. Bản đầu nhét `requestAnimationFrame` vào cùng
 *     effect mở module và đo được `scrollY` = 0: lúc rAF chạy thì module chứa
 *     bài còn chưa mở, nên `scrollIntoView` nhắm vào phần tử chưa có chỗ trên
 *     trang. Mở module 20 bài mà không cuộn thì bài vẫn ngoài màn hình.
 *  4. KHÔNG `useSearchParams()`. Trang khoá học là SSG và AGENTS.md ghi rõ nó
 *     KHÔNG được gọi API nào; `useSearchParams` buộc trang rời khỏi dạng tĩnh.
 *     Và setState phải HOÃN khỏi thân effect — React 19 chặn (đã làm lint đỏ
 *     một lần trong chính lần sửa này).
 *
 * ABLATION:
 *   leave() bỏ `- 1` (dùng thẳng lessonNo)     → 1 đỏ
 *   open quay về `mi === 0`                     → 1 đỏ
 *   gộp cuộn vào chung effect mở module         → 1 đỏ
 *   setState gọi thẳng trong thân effect        → 1 đỏ
 *   moduleChuaBai kẹp về 0 thay vì trả -1       → 1 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { moduleChuaBai } from '../../src/lib/curriculum-nav.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const doc = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

/**
 * Bỏ chú thích trước khi so. CẦN, không phải cho gọn: bản đầu của ca
 * "không dùng useSearchParams" đỏ ngay, vì CourseDetail.tsx có một dòng chú
 * thích GIẢI THÍCH vì sao không dùng nó — tức ca test đỏ vì nguồn nói đúng
 * điều ca test muốn. AGENTS.md đã ghi đúng họ bẫy này hai lần (`noreferrer`,
 * và dấu × của ConsentBanner).
 */
const boChuThich = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((d) => !d.trimStart().startsWith('//'))
    .join('\n');

const DETAIL = doc(join(FE, 'src', 'app', '(standalone)', 'courses', '[courseId]', 'CourseDetail.tsx'));
const SHELL = doc(join(FE, 'src', 'components', 'python-studio', 'StudioLesson.tsx'));
const CURRICULA = JSON.parse(doc(join(FE, 'src', 'lib', 'curricula.json'))).CURRICULA;

const MODULES = CURRICULA.python_advanced?.modules ?? [];

// ---------------------------------------------------------------------------
// 1. RANH GIỚI — chỗ lệch-một-đơn-vị lộ ra
// ---------------------------------------------------------------------------

test('có đủ dữ liệu thật để kiểm — 10 module, 172 bài', () => {
  // Nếu giáo trình đổi thì hai con số này đổi theo; ca này chỉ để một bản
  // curricula.json RỖNG không làm mấy ca dưới đạt vì không có gì để kiểm.
  assert.ok(MODULES.length >= 2, `Chỉ thấy ${MODULES.length} module.`);
  const tong = MODULES.reduce((a, m) => a + m.lessons.length, 0);
  assert.ok(tong > 100, `Chỉ thấy ${tong} bài.`);
});

test('bài ĐẦU và bài CUỐI của mọi module đều map về đúng module đó', () => {
  // Offset tính ĐỘC LẬP ở đây (cộng dồn trực tiếp từ dữ liệu), không gọi lại
  // moduleChuaBai — nếu không thì ca test so hàm với chính nó.
  let dau = 0;
  for (let mi = 0; mi < MODULES.length; mi += 1) {
    const n = MODULES[mi].lessons.length;
    const cuoi = dau + n - 1;
    assert.equal(moduleChuaBai(MODULES, dau), mi, `bài đầu của module ${mi} (chỉ số ${dau})`);
    assert.equal(moduleChuaBai(MODULES, cuoi), mi, `bài cuối của module ${mi} (chỉ số ${cuoi})`);
    dau += n;
  }
});

test('chỉ số ngoài khoá trả -1, KHÔNG kẹp về 0', () => {
  const tong = MODULES.reduce((a, m) => a + m.lessons.length, 0);
  // `?lesson=` đến từ URL, ai cũng gõ được. Kẹp về 0 thì một số rác lại mở
  // module 1 và cuộn lung tung, trong khi điều đúng là không làm gì cả.
  assert.equal(moduleChuaBai(MODULES, tong), -1);
  assert.equal(moduleChuaBai(MODULES, -1), -1);
  assert.equal(moduleChuaBai(MODULES, 1.5), -1);
  assert.equal(moduleChuaBai(MODULES, Number.NaN), -1);
});

test('màn bài học trừ 1 khi trả chỉ số về trang khoá học', () => {
  assert.match(
    SHELL,
    /\/courses\/\$\{courseId\}\?lesson=\$\{lessonNo - 1\}/,
    '`lessonNo` là sort_order đếm từ 1, link ở trang khoá học là chỉ số phẳng '
      + 'đếm từ 0. Thiếu `- 1` thì chỉ sai ở bài đầu mỗi module.',
  );
});

// ---------------------------------------------------------------------------
// 2–4. TRANG KHOÁ HỌC
// ---------------------------------------------------------------------------

test('module mở sẵn KHÔNG còn ghim cứng là module 0', () => {
  assert.match(DETAIL, /openModules\[mi\] \?\? mi === moduleMacDinh/);
});

test('cuộn nằm ở effect RIÊNG, phụ thuộc moduleMacDinh', () => {
  // Bản đầu nhét rAF vào cùng effect mở module và đo được scrollY = 0.
  const effects = [...DETAIL.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[([^\]]*)\]\);/g)];
  const cuon = effects.filter((m) => m[1].includes('scrollIntoView'));
  assert.equal(cuon.length, 1, 'Phải có đúng MỘT effect lo việc cuộn.');
  assert.match(cuon[0][2], /moduleMacDinh/, 'Effect cuộn phải chạy lại sau khi module mở.');
  assert.ok(
    !cuon[0][1].includes('setModuleMacDinh'),
    'Effect cuộn mà cũng mở module thì lại rơi về đúng thứ tự sai cũ.',
  );
});

test('không dùng useSearchParams — trang khoá học phải ở dạng tĩnh', () => {
  assert.ok(
    !/useSearchParams/.test(boChuThich(DETAIL)),
    'useSearchParams buộc trang rời khỏi SSG. Trang khoá học là trang CÔNG '
      + 'KHAI và AGENTS.md ghi rõ nó không được gọi API nào.',
  );
  assert.match(DETAIL, /window\.location\.search/);
});

test('setState HOÃN khỏi thân effect — React 19 chặn gọi thẳng', () => {
  const effects = [...DETAIL.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[([^\]]*)\]\);/g)];
  for (const [, than] of effects) {
    for (const m of than.matchAll(/^\s*(setModuleMacDinh|setBaiCanCuon)\(/gm)) {
      // Gọi ở đầu dòng trong thân effect, không nằm trong callback nào: đúng
      // thứ `react-hooks/set-state-in-effect` cấm. Trong setTimeout thì dòng
      // thụt sâu hơn và có `setTimeout` đứng trước nó trong cùng thân.
      const truoc = than.slice(0, m.index);
      assert.ok(
        truoc.includes('setTimeout'),
        `${m[1]} gọi thẳng trong thân effect — React 19 báo "cascading renders".`,
      );
    }
  }
});

/**
 * Effect cuộn tìm hàng bằng `getElementById(\`cd-lesson-${…}\`)` — nên hàng bài
 * PHẢI mang đúng id ấy. Thiếu thì `getElementById` trả null, effect `return`
 * lặng lẽ, và module vẫn mở đúng nên mọi ca trên đều XANH trong khi người học
 * phải tự cuộn tìm bài trong một module 20 bài.
 *
 * Không phải lo xa: bản CourseDetail bê từ nhánh `test` (4d5f86d) mất đúng cái
 * id này. Ablation trước khi có ca: gỡ `id=` khỏi hàng → 0 đỏ.
 */
test('hàng bài mang đúng id mà effect cuộn tìm', () => {
  const tim = DETAIL.match(/getElementById\(`([a-z-]+)\$\{/);
  assert.ok(tim, 'Không thấy getElementById(`…${…}`) — effect cuộn đổi cách tìm thì sửa ca này.');
  const tienTo = tim[1];
  assert.ok(
    boChuThich(DETAIL).includes('id={`' + tienTo + '${index}`}'),
    `Không hàng bài nào mang id={\`${tienTo}\${index}\`} — effect cuộn sẽ tìm ra null và không cuộn.`,
  );
});

// ── Kiểm toán 16/11/2026: người học không thấy tiến độ theo TỪNG chặng và không chữ nào nói điều kiện giữ tiến độ ──
test('tiêu đề mỗi chặng ghi "x/N bài đã xong", tính từ doneSet (chữ, không chỉ dấu ✓)', () => {
  const code = boChuThich(DETAIL);
  assert.ok(code.includes('doneSet.has(flatIdx + k + 1)'), 'x phải đếm từ doneSet theo chỉ số phẳng của chặng');
  assert.ok(code.includes('bài đã xong'), 'tiêu đề chặng phải nói bằng chữ');
  assert.ok(code.includes('xong > 0'), 'chưa có tiến độ thì giữ chữ cũ "N bài", không mời nhìn 0/N');
});

test('có MỘT dòng nói điều kiện giữ tiến độ (trình duyệt này, nghỉ >30 ngày hoặc đổi máy)', () => {
  assert.ok(DETAIL.includes('data-giu-tien-do'), 'trang khoá thiếu dòng giữ tiến độ');
  assert.ok(DETAIL.includes('nghỉ hơn 30 ngày hoặc đổi máy'), 'dòng giữ tiến độ phải nói đủ hai điều kiện');
  // Trang công khai KHÔNG được gọi API chỉ để in dòng này: nó là chữ tĩnh.
  const dong = DETAIL.slice(DETAIL.indexOf('data-giu-tien-do') - 80, DETAIL.indexOf('data-giu-tien-do') + 200);
  assert.ok(!/apiFetch|fetch\(/.test(dong), 'dòng giữ tiến độ phải là chữ tĩnh');
});

// ── Chỉ số khoá (teardown Brilliant 16/11): "N câu luyện tập · N bài tập có ca chấm" ──
test('chỉ số khoá trong curricula.json KHỚP bản dựng (không phải số viết tay)', () => {
  const lessons = JSON.parse(doc(join(FE, '..', 'scripts', 'pe-da', 'out', 'lessons.json'))).lessons;
  const practice = lessons.reduce((s, b) => s + (b.content_json?.step_2?.practice ?? []).length, 0);
  const graded = lessons.filter((b) => (b.content_json?.step_4?.tests ?? []).length > 0).length;
  const stats = CURRICULA.python_advanced?.stats;
  assert.ok(stats, 'curricula.json thiếu python_advanced.stats — chạy `py scripts/pe-da/sync_curricula.py`.');
  assert.equal(stats.practice, practice, 'số câu luyện tập lệch bản dựng — chạy lại sync_curricula.py');
  assert.equal(stats.graded, graded, 'số bài tập có ca chấm lệch bản dựng — chạy lại sync_curricula.py');
  // Chống "khớp vì cả hai cùng rỗng": phép đếm phải thật sự đếm được thứ gì.
  assert.ok(practice > 300 && graded > 50, `phép đếm ra quá ít (${practice}/${graded}) — có thể đọc sai khoá của bản dựng`);
});

test('trang khoá IN hai chỉ số từ stats, không ghi cứng, và bỏ cả dòng khi khoá không có stats', () => {
  const code = boChuThich(DETAIL);
  assert.ok(code.includes('curriculum.stats'), 'CourseDetail phải đọc curriculum.stats');
  assert.ok(code.includes('{stats && ('), 'khoá không có stats thì phải bỏ cả dòng, không in "undefined câu"');
  assert.ok(code.includes('{stats.practice} câu luyện tập'), 'dòng phải in stats.practice kèm đơn vị');
  assert.ok(code.includes('{stats.graded} bài tập có ca chấm'), 'dòng phải in stats.graded kèm đơn vị');
  const s = CURRICULA.python_advanced.stats;
  assert.ok(
    !new RegExp(`\b(${s.practice}|${s.graded})\b`).test(code.replace(/\d+px|\d+\.\d+|#[0-9a-fA-F]+/g, '')),
    'CourseDetail đang ghi cứng đúng con số của bản dựng — số tay thì sẽ trôi',
  );
});

// ---------------------------------------------------------------------------
// THANH TIẾN ĐỘ KHOÁ (A1) — "còn bao xa" nhìn một cái, không thêm lời gọi API
// ---------------------------------------------------------------------------

test('thanh tiến độ khoá: chỉ khi biết tiến độ, đủ aria của progressbar, số lấy từ plan', () => {
  const tsx = doc(join(FE, 'src', 'app', '(standalone)', 'courses', '[courseId]', 'CourseDetail.tsx'));
  const i = tsx.indexOf('data-tien-do-khoa');
  assert.ok(i > 0, 'CourseDetail không còn thanh tiến độ khoá');
  const the = tsx.slice(tsx.lastIndexOf('{plan.completedCount > 0 && (', i), tsx.indexOf('</div>', i));
  assert.ok(the.startsWith('{plan.completedCount > 0 && ('), 'thanh phải nằm sau điều kiện completedCount > 0 — khách vãng lai không thấy thanh rỗng "0%"');
  for (const dau of ['role="progressbar"', 'aria-valuemin={0}', 'aria-valuemax={total}', 'aria-valuenow={plan.completedCount}', 'aria-valuetext=', 'aria-label=']) {
    assert.ok(the.includes(dau), `thanh tiến độ thiếu ${dau}`);
  }
  assert.match(the, /Math\.min\(100,\s*Math\.round\(\(plan\.completedCount \/ total\) \* 100\)\)/, 'bề rộng phải kẹp ≤ 100% và tính từ plan.completedCount / total');
});

test('thanh tiến độ khoá: CSS dùng token lofi (line + ochre), không brand xanh, không hoạt ảnh', () => {
  const css = doc(join(FE, 'src', 'components', 'CourseShell.module.css')).replace(/\/\*[\s\S]*?\*\//g, '');
  const nen = /\.tienDoKhoa\s*\{([^}]*)\}/.exec(css);
  const day = /\.tienDoKhoa\s*>\s*span\s*\{([^}]*)\}/.exec(css);
  assert.ok(nen && day, 'thiếu rule .tienDoKhoa');
  assert.match(nen[1], /background:\s*var\(--ds-line\)/);
  assert.match(day[1], /background:\s*var\(--ds-ochre\)/);
  assert.ok(!/--edu-accent|gradient|animation|transition/.test(nen[1] + day[1]), 'thanh không dùng brand xanh/gradient và không chuyển động');
});
