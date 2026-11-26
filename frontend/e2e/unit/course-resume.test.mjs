/**
 * ĐÓNG BÀI RỒI QUAY LẠI DANH SÁCH: phải trở về đúng chỗ vừa học.
 *
 * Người thử ngày 27/10: bấm × để thoát bài thì bị thả xuống đầu khoá và phải tự tìm lại. Đường về nay là quyển
 * sách trên Tủ sách (trang khoá `/courses/*` cũ đã xoá ngày 26/11). Chỗ hỏng im lặng là lệch một đơn vị:
 * `lessonNo` đếm từ 1, `?lesson=` của sách đếm từ 0.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(HERE, '..', '..');
const doc = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');
const SHELL = doc(join(FE, 'src', 'components', 'python-studio', 'StudioLesson.tsx'));

test('màn bài học trừ 1 khi trả chỉ số về quyển sách', () => {
  assert.match(
    SHELL,
    /\/bookshelf\/\$\{book\}\?lesson=\$\{lessonNo - 1\}/,
    '`lessonNo` là sort_order đếm từ 1, `?lesson=` là chỉ số phẳng đếm từ 0. Thiếu `- 1` thì lệch một bài.',
  );
});

test('logo ở SiteHeader: chữ nhìn thấy khớp phần đầu của aria-label (Label in Name)', () => {
  const tsx = doc(join(FE, 'src', 'components', 'SiteHeader.tsx')).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  const m = /<a className=\{styles\.brand\}[^>]*aria-label="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(tsx);
  assert.ok(m, 'không tìm thấy liên kết logo');
  // JSX bỏ MỌI khoảng trắng có xuống dòng giữa các phần tử — chỉ `{' '}` mới thành dấu cách thật.
  // (Bản đầu của phép tính này gộp `\s+` thành một dấu cách nên nó TỰ THÊM khoảng trắng mà JSX
  // không thêm — ablate bỏ `{' '}` cho 0 đỏ.)
  const hienRa = m[2]
    .replace(/\{' '\}/g, '\u0001')
    .replace(/\s*\n\s*/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\u0001/g, ' ')
    .trim();
  assert.equal(hienRa, 'Programming EDU', 'chữ nhìn thấy của logo phải có khoảng trắng giữa hai từ — nếu không axe đọc "ProgrammingEDU"');
  assert.ok(m[1].startsWith(hienRa), `aria-label "${m[1]}" phải BẮT ĐẦU bằng chữ nhìn thấy "${hienRa}"`);
});
