/**
 * Giá trị NHIỀU DÒNG trong bước-từng-dòng của /ide (bảng pandas, mảng numpy 2 chiều).
 *
 * ── Lỗi đã đo (17/11/2026) ────────────────────────────────────────────────────────────
 * Tracer ghi `df = pd.DataFrame(...)` bằng `vars(df)` — ruột nội bộ của pandas — nên người học bấm
 * "Xem từng bước" ở một bài pandas thấy `DataFrame(_mgr=BlockManager(), _attrs={}, _flags=…)` thay cho
 * cái bảng mà bài đang dạy. Mảng numpy thì đúng, vì không có __dict__ nên rơi về repr. Mà pandas là
 * ruột của khoá này (PD 32 bài, VZ 30 bài, và hầu hết 411 nút "Thử ngay trong IDE" dẫn vào /ide).
 *
 * Sửa ở hai nửa, và nửa nào thiếu thì nửa kia vô nghĩa:
 *   · `scripts/tracer/pe_tracer.py` (`_pe_pandas`): DataFrame/Series thành một BẢNG CHỮ ≤ 6×6 — phép kiểm
 *     nằm ở `scripts/tracer/pe_tracer_test.py`, vì tracer là Python và phải chạy bằng Python thật;
 *   · ở đây: giá trị có xuống dòng phải được VẼ với khoảng trắng nguyên vẹn. HTML gộp khoảng trắng và
 *     xuống dòng, nên không có `white-space: pre` thì mọi cột lệch và cả bảng thành MỘT dòng chữ liền
 *     (`store amount 0 A 10 1 A 20`) — đúng cái hỏng mà phần Python vừa chữa, chuyển sang chỗ khác.
 *
 * Ablate: bỏ `white-space: pre` khỏi `.varPre` → ca 1 đỏ; TSX thôi gắn lớp → ca 2 đỏ; `formatValue` gộp
 * khoảng trắng → ca 3 đỏ.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { formatValue } from '../../src/lib/trace.ts';
import { boChuThich } from './_css-rule.mjs';

const doc = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CSS = boChuThich(doc('../../src/components/code-visualizer/CodeVisualizer.module.css'));
const TSX = doc('../../src/components/code-visualizer/CodeVisualizer.tsx')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/\/\/[^\n]*/g, ' ');

test('.varPre giữ khoảng trắng nguyên vẹn và cuộn ngang thay vì bẻ dòng', () => {
  const i = CSS.indexOf('.varPre {');
  assert.ok(i >= 0, 'không còn rule .varPre — ô giá trị nhiều dòng sẽ gộp cả bảng thành một dòng');
  const than = CSS.slice(i, CSS.indexOf('}', i));
  assert.match(than, /white-space:\s*pre\s*;/, '.varPre phải đặt white-space: pre (không phải pre-wrap: bẻ dòng giữa hàng bảng làm hai hàng dính nhau)');
  assert.match(than, /overflow-x:\s*auto\s*;/, 'bảng rộng hơn khung thì phải cuộn ngang được');
});

test('CodeVisualizer gắn .varPre đúng khi giá trị có xuống dòng', () => {
  assert.match(
    TSX,
    /text\.includes\('\\n'\)\s*\?\s*styles\.varPre\s*:\s*''/,
    'ô giá trị phải thêm lớp varPre khi `text` có ký tự xuống dòng',
  );
});

test('formatValue giữ nguyên xuống dòng và khoảng trắng của một giá trị opaque (bảng pandas, mảng numpy)', () => {
  const bang = '  store  amount\n0     A      10\n1     A      20\n2     B      40';
  assert.equal(formatValue({ t: 'opaque', cls: 'DataFrame', r: bang }), bang);
  const mang = 'array([[1, 2, 3],\n       [4, 5, 6]])';
  assert.equal(formatValue({ t: 'opaque', cls: 'ndarray', r: mang }), mang);
});
