/**
 * GÓC HỌC: số về MUỘN hơn trần chờ thì phải được DỰNG LẠI, không bị vứt.
 *
 * VÌ SAO FILE NÀY TỒN TẠI: StudyRoom dựng cảnh bằng
 * `Promise.race([laySo(...), chờ 3 s])`. Đo trên production 04/11/2026 (be7b382,
 * 390×844): tài khoản khách đã xong PY01 + PY02, năm lượt API đều 200, nhưng
 * `/api/enrolled` mất 3 087 ms — thua trần 87 ms. Cảnh dựng bằng người dùng
 * TRỐNG, và số thật về sau đó không ai dùng: cả phiên ô tiến độ "—", màn Khoá
 * học "Chưa có phiên học trên máy này", màn Ôn tập "Chưa đọc được tiến độ".
 * Mở lại màn con cũng không đổi. Cùng máy, vòng trước API nhanh hơn ⇒ hiện đủ.
 *
 * Đồng hồ THẬT vài chục ms, không giả: hàm chỉ dùng setTimeout + promise.
 *
 * ABLATION — gỡ từng mảnh rồi đếm:
 *   số về muộn thì bỏ (hành vi Promise.race cũ)         → 2 đỏ
 *   dựng lại mà không báo `muon`                         → 2 đỏ
 *   hàm huỷ không chặn lần dựng muộn                     → 1 đỏ
 *   StudyRoom quay lại Promise.race                      → 1 đỏ
 *   engine bỏ nhánh boQuaMoDau (đèn bật lần hai)         → 1 đỏ
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { choSoCoTran } from '../../src/lib/goc-hoc-cho-so.ts';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const doc = (p) => readFileSync(join(SRC, p), 'utf8').replace(/\r/g, '');
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
const sauMs = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));

const TRAN = 40;
const DU_PHONG = 'trống';

function ghi() {
  const lan = [];
  return { lan, dung: (v, muon) => lan.push([v, muon]) };
}

test('số về TRƯỚC trần: dựng đúng một lần bằng số thật, không dựng bản trống', async () => {
  const { lan, dung } = ghi();
  choSoCoTran(sauMs(5, 'thật'), TRAN, DU_PHONG, dung);
  await ngu(TRAN + 40);
  assert.deepEqual(lan, [['thật', false]]);
});

test('số về SAU trần (ca đo được: 3 087 ms > 3 000): dựng bản trống, rồi DỰNG LẠI bằng số thật', async () => {
  const { lan, dung } = ghi();
  choSoCoTran(sauMs(TRAN + 30, 'thật'), TRAN, DU_PHONG, dung);
  await ngu(TRAN + 80);
  assert.deepEqual(lan, [[DU_PHONG, false], ['thật', true]],
    'số về muộn bị vứt — đúng lỗi cũ: cả phiên trang chủ nói "chưa có phiên học".');
});

test('lần dựng lại mang cờ `muon` — engine dùng nó để KHÔNG bật đèn lần hai', async () => {
  const { lan, dung } = ghi();
  choSoCoTran(sauMs(TRAN + 20, 'thật'), TRAN, DU_PHONG, dung);
  await ngu(TRAN + 60);
  assert.equal(lan.at(-1)?.[1], true);
});

test('huỷ (component gỡ) thì không còn lần dựng nào, kể cả lần dựng lại', async () => {
  const a = ghi();
  const huyA = choSoCoTran(sauMs(TRAN + 30, 'thật'), TRAN, DU_PHONG, a.dung);
  huyA();
  await ngu(TRAN + 80);
  assert.deepEqual(a.lan, [], 'huỷ trước mốc trần mà vẫn dựng');

  const b = ghi();
  const huyB = choSoCoTran(sauMs(TRAN + 30, 'thật'), TRAN, DU_PHONG, b.dung);
  await ngu(TRAN + 10);
  huyB();
  await ngu(60);
  assert.deepEqual(b.lan, [[DU_PHONG, false]], 'đã gỡ mà số muộn vẫn dựng lại lên DOM đã bỏ');
});

test('promise bị từ chối: giữ bản dự phòng, không ném', async () => {
  const { lan, dung } = ghi();
  choSoCoTran(Promise.reject(new Error('mạng')), TRAN, DU_PHONG, dung);
  await ngu(TRAN + 30);
  assert.deepEqual(lan, [[DU_PHONG, false]]);
});

test('StudyRoom dùng choSoCoTran (không Promise.race), truyền `muon` xuống engine, và gỡ nó khi unmount', () => {
  const s = doc('components/goc-hoc/StudyRoom.tsx')
    .replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((d) => !d.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(s, /Promise\.race/, 'Promise.race quay lại ⇒ số về muộn lại bị vứt.');
  assert.match(s, /choSoCoTran<KetQua>\(/);
  assert.match(s, /boQuaMoDau:\s*muon/, 'lần dựng lại không báo cho engine ⇒ màn mở đầu chạy lần hai.');
  assert.match(s, /huyCho\(\);/, 'cleanup không huỷ bộ chờ ⇒ số muộn dựng lên DOM đã gỡ.');
});

test('engine: boQuaMoDau vào thẳng trạng thái cuối, không runIntro', () => {
  const e = doc('components/goc-hoc/engine.js');
  assert.match(e, /else if \(state\.boQuaMoDau\)\{ finishIntro\(\); countUp\(\); drawCal\(\); \}\s*\n\s*else runIntro\(\);/,
    'engine không còn nhánh bỏ màn mở đầu ⇒ số về muộn làm đèn bật lại lần hai.');
});

test('màn mở đầu một lần mỗi phiên; máy đã có phiên không bị nói "chưa có phiên học" khi số về chậm', () => {
  const s = readFileSync(join(SRC, 'components', 'goc-hoc', 'StudyRoom.tsx'), 'utf8');
  assert.match(s, /const daXem = daXemMoDau\(\);/);
  assert.match(s, /boQuaMoDau: muon \|\| daXem,/);
  assert.match(s, /ghiDaXemMoDau\(\);/);
  assert.match(s, /hasStoredSession\(phienTrongMay\(\)\) \? \{ \.\.\.EMPTY_USER, signedIn: true \} : EMPTY_USER/);
  assert.match(s, /\{ user: duPhong, done: \[\] \},/);
});

test('ảnh quầng sáng giữ lại tới sau màn mở đầu', () => {
  const doc = (f) => readFileSync(join(SRC, 'components', 'goc-hoc', f), 'utf8');
  const engine = doc('engine.js'), shell = doc('shell.js');
  assert.doesNotMatch(engine + shell, /<img[^>]*\ssrc="[^"]*-g\.webp/, 'ảnh quầng sáng lại tải ngay từ đầu');
  assert.match(engine, /function finishIntro\(\)\{\s*napQuang\(\);/);
});

test('engine: mọi câu "chưa có phiên học" đều chừa đường cho máy ĐÃ có phiên', () => {
  const dong = readFileSync(join(SRC, 'components', 'goc-hoc', 'engine.js'), 'utf8').split('\n')
    .filter((d) => /chưa có phiên/i.test(d) && !/^\s*(\*|\/\/|\/\*)|BIẾT|Luật:/.test(d));
  assert.ok(dong.length >= 7, `chỉ thấy ${dong.length} dòng`);
  for (const d of dong) assert.match(d, /CO_PHIEN|USER\.signedIn|^\s*\? \(CO_PHIEN/, d.trim().slice(0, 90));
});
