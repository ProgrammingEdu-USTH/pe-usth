/**
 * BÀI TẬP CHẤM TRÊN ĐIỆN THOẠI: KẾT QUẢ VỪA VỀ PHẢI NẰM TRONG MÀN, không nằm sau thanh dưới.
 *
 * Đo 16/11/2026 trên bản dựng, 390×844, hai bài chấm (#24 và #44): ô soạn mã ở y 494–679 (bài #24),
 * nút "Chạy thử" ở 699; bấm Chạy xong, ô "KẾT QUẢ CHẠY" hiện ở y = 780–918 (bài #44: 820–958) và
 * `scrollY` VẪN 0. Thanh dưới dính (nút "Nộp") che từ y ≈ 755, nên ô kết quả nằm TRỌN dưới nó:
 * ảnh chụp sau khi chạy GIỐNG HỆT trước khi bấm. Cùng lỗi đã sửa cho /ide ngày 04/11
 * (`ide-output-scroll.test.mjs`) — bề mặt thứ hai, đông người dùng hơn (143 bài chấm).
 *
 * Bộ này canh: phép tính (hàm thuần, số đo thật làm fixture) và ba lời hứa của cách làm — cuộn khi
 * KẾT QUẢ VỀ chứ không lúc bấm (nút Dừng phải còn trong tầm tay), đáy "thấy được" là mép trên của
 * thanh dưới chứ không phải `innerHeight`, và tôn trọng `prefers-reduced-motion`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { doCuonKetQua } from '../../src/lib/ide-output-scroll.ts';

const GOC = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const doc = (...p) => readFileSync(join(GOC, ...p), 'utf8');
const boChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

test('cuộn: số đo thật 390×844 — ô ở 780–918, thanh dưới từ 755 ⇒ phải kéo để lộ 120px đầu ô', () => {
  // caoThay = mép trên của thanh dưới ≈ 755 (đo: top thanh = 844 − 89).
  const delta = doCuonKetQua(780, 918, 755);
  assert.ok(delta > 0, 'ô nằm sau thanh dưới mà không kéo');
  // Sau khi kéo `delta`, 120px đầu của ô phải nằm trên mép thanh dưới.
  assert.ok(780 - delta + 120 <= 755 + 1e-9, `kéo ${delta}px vẫn chưa lộ đủ 120px đầu ô`);
  // Và kéo ÍT NHẤT có thể: không lộ thừa (ô soạn mã phía trên phải còn lọt màn).
  assert.equal(780 - delta + 120, 755);
});

test('cuộn: ô đã lọt trong màn thì KHÔNG kéo (không giật người đã tự cuộn)', () => {
  assert.equal(doCuonKetQua(300, 500, 755), 0);
  assert.equal(doCuonKetQua(600, 900, 755), 0, '155px đầu ô đã thấy, đủ ngưỡng 120');
});

test('cuộn: ô thấp hơn ngưỡng thì thấy trọn là đủ; ô cao hơn màn vẫn chỉ lộ phần đầu', () => {
  // ô cao 60px, nằm ngay dưới mép: chỉ cần kéo đủ 60px, không đòi 120.
  const nho = doCuonKetQua(760, 820, 755);
  assert.equal(760 - nho + 60, 755);
  // ô cao 2000px bắt đầu dưới mép: kéo để lộ 120px đầu, không cố lộ cả ô.
  const cao = doCuonKetQua(800, 2800, 755);
  assert.equal(800 - cao + 120, 755);
});

test('cuộn: không kéo ngược (ô nằm TRÊN màn → 0, không số âm)', () => {
  assert.equal(doCuonKetQua(-400, -100, 755), 0);
  assert.ok(doCuonKetQua(-30, 40, 755) >= 0);
});

test('SandboxEditor: cuộn khi `running` đi true→false, đo đáy bằng thanh dưới, tôn trọng giảm chuyển động', () => {
  const ma = boChuThich(doc('src', 'components', 'lesson-chrome', 'exercises', 'SandboxEditor.tsx'));
  assert.match(ma, /import \{ doCuonKetQua \} from '@\/lib\/ide-output-scroll'/);
  // Kích hoạt theo CHUYỂN TIẾP, không theo giá trị: cuộn khi `running` còn true là đẩy nút Dừng ra khỏi màn.
  assert.match(ma, /dangChayRef\.current && !running/, 'phải cuộn khi chạy VỪA XONG, không khi đang chạy');
  assert.match(ma, /dangChayRef\.current = running/);
  // Đáy "thấy được" là mép trên thanh dưới, không phải innerHeight trần.
  assert.match(ma, /querySelector\('\[data-thanh-duoi\]'\)/);
  assert.match(ma, /getBoundingClientRect\(\)\.top : window\.innerHeight/);
  assert.match(ma, /prefers-reduced-motion: reduce/);
  assert.match(ma, /behavior: giamChuyenDong \? 'auto' : 'smooth'/);
  // Ref gắn vào vùng kết quả (Console + hình + bảng ca), không vào ô soạn mã.
  assert.match(ma, /<div ref=\{ketQuaRef\} className=\{stale \? styles\.staleResult : undefined\}>/);
  // KHÔNG cuộn ngay trong lúc bấm Chạy.
  assert.doesNotMatch(ma, /onClick=\{[^}]*scrollBy/, 'cuộn ở lúc bấm Chạy');
});

test('LessonChrome: thanh dưới mang data-thanh-duoi (SandboxEditor đo nó)', () => {
  const ma = boChuThich(doc('src', 'components', 'lesson-chrome', 'LessonChrome.tsx'));
  assert.match(ma, /<footer className=\{styles\.bottomBar\} data-thanh-duoi=""/);
});

/*
 * ABLATE (ghi số khi chạy): gỡ `dangChayRef.current && !running` → ca 5 đỏ · đổi đáy thành
 * window.innerHeight trần → ca 5 đỏ · bỏ nhánh reduced-motion → ca 5 đỏ · gỡ data-thanh-duoi → ca 6
 * đỏ · `doCuonKetQua` trả `top - caoThay` (kéo cả ô) → ca 1 đỏ.
 */
