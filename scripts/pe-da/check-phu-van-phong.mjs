#!/usr/bin/env node
/**
 * ĐỘ PHỦ CỦA BỘ KIỂM VĂN PHONG — chữ nào người học đọc mà không luật nào thấy.
 *
 * VÌ SAO CÓ FILE NÀY. `check_vanphong.py` đọc `source/course.json`, và đó là
 * một quyết định ĐÚNG đã ghi trong chính nó: *"Bắt lỗi ở `out/` là bắt lỗi ở
 * một bản chép — người sửa phải sửa ở source."* Nhưng một phần văn xuôi người
 * học đọc **do `build.py` SINH RA**, nên nó không có trong tệp ấy và không hàm
 * thu chữ nào với tới được. Không chỗ nào khai điều đó, nên nó trông như đã
 * được kiểm.
 *
 * Đây là lần thứ BA của cùng một lớp lỗi trong ba vòng: `raw_doan` đọc bản TRẦN
 * thay vì RAW · `doan_cua` + vòng duyệt màn bỏ khối `table` · và nay là chữ
 * không nằm trong tệp mà bộ kiểm đọc. Hai lần trước sửa được bằng cách nới hàm
 * thu chữ; lần này KHÔNG, vì chữ ở một tệp khác.
 *
 * NÊN FILE NÀY KHÔNG BỊT KHE — nó làm khe THẤY ĐƯỢC và CÓ HÀNG RÀO. Mỗi đường
 * dẫn trường mang văn xuôi phải được khai là `NGUON` (có trong source ⇒ bộ kiểm
 * thấy) hoặc `NGOAI_TAM` kèm LÝ DO. Luật hai chiều: đường ngoài tầm mà chưa
 * khai là LỖI, và một mục khai NGOAI_TAM mà nay đã vào source cũng là LỖI.
 *
 * NỢ ẨN — số đã đo 08/11/2026 bằng cách nhét 183 chuỗi ngoài tầm vào một bản
 * SAO của source rồi chạy bộ kiểm:
 *   L3 32 → 41 · L13 cb 217 → 229 · §4-A cb 23 → 30 · L1 21·86 → 24·94 ·
 *   L14 0 → 3 lỗi.
 * Tức tín hiệu dừng của vòng lặp đang báo THIẾU khoảng 20%. Con số ấy phải nằm
 * ở đâu đó người đọc thấy, và đây là chỗ đó.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, 'source', 'course.json');
const BUILD = join(HERE, 'out', 'lessons.json');

/**
 * Trạng thái của từng đường dẫn trường mang văn xuôi.
 * `null` = chữ đến từ source, bộ kiểm thấy. Chuỗi = LÝ DO nó ngoài tầm.
 */
const NGOAI_TAM = {
  'figure.alt':
    'alt text do `build.py` sinh (80 hình). Đây là chữ ĐỌC CHO người dùng trình đọc '
    + 'màn hình, nên nó là văn xuôi thật — nhưng nó không nằm trong gói nguồn, và các '
    + 'luật đo câu/đoạn (L1/L2/L3) vốn viết cho văn giảng chứ không cho mô tả ảnh.',
  'diagram.title':
    'sơ đồ sống trong `SO_DO_DOC` của `build.py`, KHÔNG trong gói nguồn — AGENTS.md ghi '
    + 'rõ quyết định ấy ("gói nguồn là của người soạn giáo trình và còn được giao lại "'
    + '+ "nhiều lần nữa"), và dặn chuyển sang gói nguồn khi bộ này lớn hơn chục bài. '
    + 'Hôm nay 3 sơ đồ.',
  'diagram.lanes[].label': 'cùng `SO_DO_DOC` — xem `diagram.title`.',
  'diagram.lanes[].note': 'cùng `SO_DO_DOC` — xem `diagram.title`.',
};

/** Trần số chuỗi ngoài tầm — CHỈ ĐƯỢC HẠ. Nới nó là giấu nợ. */
const TRAN_NGOAI_TAM = 99;

const src = readFileSync(SOURCE, 'utf8');
const build = JSON.parse(readFileSync(BUILD, 'utf8'));
const bai = Array.isArray(build) ? build : build.lessons;

/** Chuỗi có mặt trong source không? So cả bản thô lẫn bản đã thoát JSON. */
const trongNguon = (s) => src.includes(s) || src.includes(JSON.stringify(s).slice(1, -1));

const dem = new Map(); // đường dẫn → { co, khong, vd }
function xet(duong, s) {
  if (typeof s !== 'string' || s.trim().length < 2) return;
  const o = dem.get(duong) ?? { co: 0, khong: 0, vd: null };
  if (trongNguon(s)) o.co++;
  else { o.khong++; o.vd ??= s.slice(0, 56); }
  dem.set(duong, o);
}

const khoiCua = (man) => (Array.isArray(man) ? man : man?.blocks ?? []);
for (const b of bai) {
  const cj = b.content_json ?? b;
  for (const man of cj?.step_1?.read ?? []) {
    for (const k of khoiCua(man)) {
      if (!k || typeof k !== 'object') continue;
      const t = k.type;
      for (const f of ['text', 'title', 'caption', 'alt']) xet(`${t}.${f}`, k[f]);
      for (const ln of k.lanes ?? []) {
        for (const f of ['label', 'note']) xet(`${t}.lanes[].${f}`, ln?.[f]);
      }
      for (const h of k.headers ?? []) xet(`${t}.headers[]`, h);
      for (const hang of k.rows ?? []) for (const x of hang) xet(`${t}.rows[][]`, x);
    }
  }
}

const loi = [];
if (dem.size < 4) {
  loi.push(
    `chỉ thấy ${dem.size} đường dẫn trường trong bản dựng — phép duyệt đã trượt, và khi `
    + 'đó MỌI đường trông như đã được kiểm. Sửa phép duyệt, đừng nới ca.',
  );
}

let tongNgoai = 0;
for (const [duong, o] of [...dem].sort((a, b) => b[1].khong - a[1].khong)) {
  tongNgoai += o.khong;
  if (o.khong > 0 && !(duong in NGOAI_TAM)) {
    loi.push(
      `NGOÀI TẦM mà CHƯA KHAI: ${duong} — ${o.khong} chuỗi không có trong `
      + `source/course.json, nên KHÔNG luật văn phong nào thấy chúng. Ví dụ: ${JSON.stringify(o.vd)}. `
      + 'Hoặc đưa chữ ấy vào gói nguồn, hoặc thêm một dòng vào `NGOAI_TAM` kèm LÝ DO.',
    );
  }
}
for (const duong of Object.keys(NGOAI_TAM)) {
  const o = dem.get(duong);
  if (!o) {
    loi.push(`NGOẠI LỆ ĐÃ LỖI THỜI: ${duong} khai NGOÀI TẦM nhưng bản dựng không còn `
      + 'đường dẫn trường ấy. Gỡ dòng đó đi.');
  } else if (o.khong === 0) {
    loi.push(`NGOẠI LỆ ĐÃ LỖI THỜI: ${duong} khai NGOÀI TẦM nhưng nay CẢ ${o.co} chuỗi `
      + 'đều có trong source — bộ kiểm đã thấy chúng. Gỡ dòng đó đi.');
  }
}
if (tongNgoai > TRAN_NGOAI_TAM) {
  loi.push(
    `SỐ CHUỖI NGOÀI TẦM TĂNG: ${tongNgoai} > trần ${TRAN_NGOAI_TAM}. Trần này CHỈ ĐƯỢC `
    + 'HẠ — mỗi chuỗi thêm vào đây là một câu người học đọc mà không luật nào đo. Đưa '
    + 'chữ mới vào gói nguồn thay vì sinh ra ở `build.py`.',
  );
}

console.log('Độ phủ bộ kiểm văn phong (chữ của màn đọc):');
for (const [duong, o] of [...dem].sort((a, b) => b[1].khong - a[1].khong || b[1].co - a[1].co)) {
  const trangThai = o.khong === 0 ? 'bộ kiểm THẤY' : `${o.khong} NGOÀI TẦM`;
  console.log(`   ${String(o.co + o.khong).padStart(5)}  ${duong.padEnd(26)} ${trangThai}`);
}
console.log(`\nTổng NGOÀI TẦM: ${tongNgoai} chuỗi · trần ${TRAN_NGOAI_TAM} (chỉ được HẠ) `
  + `· ${Object.keys(NGOAI_TAM).length} mục đã khai`);
console.log('NỢ ẨN đã đo 08/11/2026 (nhét chúng vào bản SAO rồi chạy bộ kiểm): '
  + 'L3 32 → 41 · L13 cb 217 → 229 · §4-A cb 23 → 30 · L14 0 → 3 lỗi.');
console.log('');
if (loi.length) {
  for (const x of loi) console.log(`LỖI: ${x}`);
  console.log(`\n${loi.length} lỗi`);
  process.exitCode = 1; // KHÔNG process.exit(): nó đua với pool keep-alive và thoát 127
} else {
  console.log('0 lỗi');
}
