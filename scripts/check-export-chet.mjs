#!/usr/bin/env node
/**
 * EXPORT CHẾT trong `frontend/src` — điểm mù của `check-tai-nguyen-chet.mjs`.
 *
 * VÌ SAO CÓ FILE NÀY. Cổng tài nguyên chết quét `public/static/{js,css}`,
 * component `.tsx` và `.module.css`. Nó KHÔNG quét ký hiệu được `export` ra mà
 * không ai gọi — và chính AGENTS.md đã ghi điểm mù ấy sau khi `catalog.TOOLS`
 * (cùng `IDE_TOOL`, `CatalogTool`) chết suốt BỐN NGÀY từ 4d5f86d mà không cổng
 * nào thấy. Thứ tìm ra nó là một bộ TEST e2e, tình cờ.
 *
 * LUẬT, và nó hẹp CÓ CHỦ ĐÍCH: một ký hiệu là CHẾT khi nó xuất hiện ĐÚNG MỘT
 * LẦN trong toàn bộ mã của repo — tức chính dòng khai nó. Đó đúng hình dạng của
 * `catalog.TOOLS`.
 *
 * VÌ SAO KHÔNG BẮT RỘNG HƠN, và đây là phần đã đo. Một phép dò ngây thơ
 * ("không ai import") cho **75** kết quả, và phần lớn là tố oan:
 *   · 116 nếu đếm cả `type`/`interface` — gần hết là `*Props` của component,
 *     một quy ước hợp lệ. Cổng kêu oan 100 lần sẽ bị tắt;
 *   · 75 → 22 khi quét thêm `scripts/`, backend `src/`, `prisma/`
 *     (`ASSET_VERSION` lọt vào vì `check-da-deploy.mjs` đọc nó);
 *   · 22 → 21 khi quét thêm `.js`/`.mjs` NẰM TRONG `frontend/src`
 *     (`engine.js` dùng `lessonHref`);
 *   · và 21 vẫn trộn hai thứ khác hẳn nhau. Đếm số lần ký hiệu xuất hiện trong
 *     CHÍNH tệp khai nó thì ra **4 ký hiệu chết thật** (xuất hiện đúng 1 lần)
 *     và **17 "export thừa"** — dùng trong chính tệp, chỉ thừa từ khoá `export`.
 * Nhóm 17 KHÔNG được gác ở đây: nó là chuyện nới rộng bề mặt module, không phải
 * chuyện mã không ai tới được, và gộp hai thứ là một cổng kêu oan 17 lần. Cổng
 * vẫn IN con số đó ra để nó không biến mất khỏi tầm nhìn.
 *
 * GIỚI HẠN PHẢI NÓI RA: phép so là `\bTÊN\b` trên văn bản đã bỏ chú thích, nên
 * một cái tên NGẮN hoặc trùng từ thường (`num`, `el`) sẽ trông như còn sống dù
 * không ai gọi. Đó là chiều AN TOÀN — cổng kêu ÍT đi, không kêu oan — nhưng
 * đừng đọc "0 lỗi" thành "không còn export chết nào".
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FE = join(ROOT, 'frontend');

/**
 * Ký hiệu CHẾT mà cố ý GIỮ LẠI. Mỗi dòng phải nói LÝ DO, và luật hai chiều ở
 * dưới bắt một mục ở đây mà nay đã có người dùng cũng là LỖI — thiếu chiều đó
 * thì danh sách chỉ dài ra rồi thành chỗ giấu rác (bài học
 * `DAP_AN_MAU_KHONG_CHAY`).
 */
const GIU_DU_CHET = {
  'frontend/src/lib/learning-events.ts#daDongYGhiNhatKy':
    'một thành viên của MẶT TIỀN `BO_GHI` (cùng `datDongYGhiNhatKy`, `datBoiCanhBai`, '
    + '`ghiSuKien`, `ghiSuaMa` — bốn cái kia đang được dùng). Đây là đường ĐỌC trạng '
    + 'thái đồng ý; gỡ một thành viên của mặt tiền là làm nó khuyết theo kiểu người '
    + 'sau không đoán được, trong khi lớp nhật ký còn đang TẮT mặc định.',
  'frontend/src/lib/studio-lesson.ts#presentSteps':
    'dựng danh sách bước có dữ liệu cho màn `brief`/`explain` — hai màn mà bộ 179 bài '
    + 'có 0/179, nhưng pe-v4 thì có. Cùng lý do AGENTS.md giữ nguyên `scripts/pe-v4/**`: '
    + 'xoá đi là mất đường quay đầu.',
  'frontend/src/lib/studio-lesson.ts#assembleScaffold':
    'điền `{{slotN}}` cho màn `scaffold`, loại màn mà bộ 179 bài không có. Cùng lý do '
    + 'với `presentSteps`.',
};

const BO_QUA_THU_MUC = new Set([
  'node_modules', '.next', '.git', 'out', 'dist', 'coverage', 'pyodide', 'generated',
]);

function duyet(d, re, ra = []) {
  if (!existsSync(d)) return ra;
  for (const n of readdirSync(d)) {
    if (BO_QUA_THU_MUC.has(n)) continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) duyet(p, re, ra);
    else if (re.test(n)) ra.push(p);
  }
  return ra;
}

/** Bỏ chú thích — một cái tên chỉ được NHẮC trong chú thích không phải người dùng. */
const boChuThich = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const re = (p) => relative(ROOT, p).split(sep).join('/');

// ── Nơi KHAI: frontend/src, trừ `app/` ──────────────────────────────────────
// `app/` được MIỄN: ở đó `page`/`layout`/`route`/`generateStaticParams` không ai
// import là QUY ƯỚC ĐỊNH TUYẾN của Next, không phải lỗi — cùng miễn trừ mà
// `check-tai-nguyen-chet.mjs` đã đặt.
const tepKhai = duyet(join(FE, 'src'), /\.(ts|tsx)$/)
  .filter((p) => !/\.d\.ts$/.test(p))
  .filter((p) => !re(p).includes('/src/app/'));

// ── Nơi DÙNG: MỌI mã của repo. Thiếu một nhánh là tố oan, đã đo ba lần. ──────
const tepDung = [
  ...duyet(join(FE, 'src'), /\.(ts|tsx|js|mjs|cjs)$/),
  ...duyet(join(FE, 'e2e'), /\.(ts|tsx|mjs|js)$/),
  ...duyet(join(FE, 'public'), /\.(js|mjs)$/),
  ...duyet(join(ROOT, 'scripts'), /\.(mjs|js|ts|py)$/),
  ...duyet(join(ROOT, 'src'), /\.ts$/),
  ...duyet(join(ROOT, 'prisma'), /\.(js|ts)$/),
  ...duyet(join(ROOT, 'test'), /\.ts$/),
];
/*
 * CHÍNH FILE NÀY PHẢI ĐỨNG NGOÀI, và nó là lỗi của bản đầu — lần chạy đầu tiên
 * cho ra một kết quả TỰ MÂU THUẪN: nó vừa bảo `presentSteps` "khai là chết
 * nhưng giữ" vừa bảo "nay KHÔNG còn chết". Nguyên nhân: `scripts/` nằm trong
 * phạm vi tìm người dùng, mà `GIU_DU_CHET` ở ngay trên có chứa TÊN của chúng.
 * Tức khai một ký hiệu vào danh sách ngoại lệ làm nó THÔI chết, rồi chiều thứ
 * hai của luật bắn vào chính cái khai ấy. Một cổng đọc sổ của mình rồi tính đó
 * là người dùng thì nó xanh/đỏ vì lý do sai theo CẢ HAI chiều.
 */
const vanBan = new Map();
const TU_MINH = fileURLToPath(import.meta.url);
for (const f of new Set(tepDung)) {
  if (f === TU_MINH) continue;
  vanBan.set(f, boChuThich(readFileSync(f, 'utf8')));
}

const loi = [];
const chet = [];
let thuaExport = 0;

if (tepKhai.length < 50 || vanBan.size < 500) {
  loi.push(
    `chỉ thấy ${tepKhai.length} tệp khai và ${vanBan.size} tệp để tìm người dùng — `
    + 'phép duyệt thư mục đã trượt. Khi đó MỌI ký hiệu trông như chết (hoặc như còn '
    + 'sống) vì lý do sai. Sửa `duyet()`, đừng nới ca.',
  );
}

for (const f of tepKhai) {
  const t = vanBan.get(f);
  if (!t) continue;
  const ten = new Set();
  for (const m of t.matchAll(
    /export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g,
  )) ten.add(m[1]);
  for (const n of ten) {
    const rx = new RegExp(`\\b${n.replace(/\$/g, '\\$')}\\b`, 'g');
    let tong = 0;
    for (const vb of vanBan.values()) tong += (vb.match(rx) || []).length;
    if (tong <= 1) chet.push(`${re(f)}#${n}`);
    else {
      // "export thừa": không ai NGOÀI tệp dùng, nhưng trong tệp thì có.
      const ngoai = [...vanBan.entries()].some(([g, vb]) => g !== f && rx.test(vb));
      if (!ngoai) thuaExport++;
    }
  }
}

// ── Luật HAI CHIỀU ──────────────────────────────────────────────────────────
for (const k of chet) {
  if (!(k in GIU_DU_CHET)) {
    loi.push(
      `EXPORT CHẾT chưa khai: ${k} — nó xuất hiện ĐÚNG MỘT lần trong cả repo, tức `
      + 'chính dòng khai nó. Xoá đi, hoặc thêm một dòng vào `GIU_DU_CHET` kèm LÝ DO '
      + 'giữ. Đây đúng hình dạng của `catalog.TOOLS`, thứ đã chết bốn ngày mà không '
      + 'cổng nào thấy.',
    );
  }
}
for (const k of Object.keys(GIU_DU_CHET)) {
  if (!chet.includes(k)) {
    loi.push(
      `NGOẠI LỆ ĐÃ LỖI THỜI: ${k} khai là "chết nhưng giữ", mà nay nó KHÔNG còn chết `
      + '(có người dùng, hoặc ký hiệu đã đổi tên / bị xoá). Gỡ dòng ấy khỏi '
      + '`GIU_DU_CHET`.',
    );
  }
}

console.log(`Export chết: ${chet.length} mục · ${Object.keys(GIU_DU_CHET).length} khai giữ `
  + `· ${chet.filter((k) => !(k in GIU_DU_CHET)).length} chưa khai`);
console.log(`   (quét ${tepKhai.length} tệp khai · ${vanBan.size} tệp tìm người dùng)`);
console.log(`NGOÀI TẦM, cố ý: ${thuaExport} "export thừa" — dùng trong CHÍNH tệp khai nó, `
  + 'chỉ thừa từ khoá `export`. Đó là chuyện bề mặt module, không phải mã không ai tới '
  + 'được; gộp vào đây là một cổng kêu oan.');
console.log('');
if (loi.length) {
  for (const x of loi) console.log(`LỖI: ${x}`);
  console.log(`\n${loi.length} lỗi`);
  process.exitCode = 1; // KHÔNG process.exit(): nó đua với pool keep-alive và thoát 127
} else {
  console.log('0 lỗi');
}
