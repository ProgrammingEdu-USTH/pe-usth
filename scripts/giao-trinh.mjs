#!/usr/bin/env node
// Bản chép NỘI DUNG giáo trình ở repo này có đúng với repo nội dung Giao_Trinh_PE không?
//
//   node scripts/giao-trinh.mjs                  KIỂM: so với SHA đã ghim, thoát 1 nếu có tệp lệch
//   node scripts/giao-trinh.mjs lay --sha <SHA>  LẤY: ghi nội dung ở SHA đó vào cây này và ghim SHA
//   node scripts/giao-trinh.mjs lay --sha main   như trên, với đầu nhánh main trên GitHub
//
// VÌ SAO CÓ CỔNG NÀY. Từ 23/11/2026 nội dung giáo trình (scripts/pe-da/source/*, sổ thuật ngữ,
// tài liệu, hình, dữ liệu, cổng văn phong, bộ sinh dữ liệu) được SOẠN ở repo Giao_Trinh_PE; repo này
// chỉ dựng, kiểm và nạp. Bộ dựng và test của nền tảng đọc nội dung từ cây của repo NÀY, nên nó phải
// có bản chép. Bản chép mà không ai canh thì lệch im lặng: ai đó sửa thẳng course.json ở đây thì
// repo nội dung và thứ đang nạp cho người học nói hai điều khác nhau, và không bên nào biết.
// Cổng này làm cho "sửa ở sai chỗ" thành một lỗi ĐỎ, không phải một thói quen.
//
// GHIM, không theo đầu nhánh: nếu so với main thì mỗi lần ai đó merge một sửa nội dung ở repo kia,
// CI ở đây đỏ dù không ai làm gì sai. Với ghim, nội dung chỉ vào đây qua MỘT commit của repo này
// (`lay` ghi bản chép và SHA cùng lúc).
//
// Ánh xạ tệp nằm ở Giao_Trinh_PE/PE_Python_DA/tools/anh-xa.json và được đọc TẠI SHA ĐÃ GHIM, nên
// không có bản khai thứ hai ở đây để lệch với bên kia.
//
// Nguồn lấy nội dung (theo thứ tự): thư mục trong biến PE_GIAO_TRINH, thư mục ../Giao_Trinh_PE cạnh
// repo này, rồi GitHub (git fetch --depth 1 vào một kho trong thư mục tạm; repo công khai nên không
// cần khoá). Hai cái đầu chỉ được dùng khi CHỨA SHA đó. PE_GIAO_TRINH_URL đổi địa chỉ GitHub (dùng để thử).
//
// Thoát 0 = khớp; 1 = có tệp lệch; 2 = không đo được (không lấy được SHA, ánh xạ hỏng, hết mạng).
// Đừng gộp 1 với 2: "lệch" là lỗi nội dung, "không đo được" là lỗi chỗ đứng.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = path.join(GOC, 'scripts', 'pe-da', 'giao-trinh.json');
const SHA_RE = /^[0-9a-f]{40}$/;

function thoat(ma, ...dong) {
  console.error(...dong);
  process.exit(ma);
}

const docLock = () => JSON.parse(fs.readFileSync(LOCK, 'utf8'));
const urlRepo = (repo) => process.env.PE_GIAO_TRINH_URL || `https://github.com/${repo}.git`;

function git(gitDir, args) {
  return execFileSync('git', ['--git-dir', gitDir, ...args], {
    maxBuffer: 512 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function gitDirCuaClone(p) {
  if (!p) return null;
  const goc = path.resolve(p);
  if (fs.existsSync(path.join(goc, '.git'))) return path.join(goc, '.git');
  return fs.existsSync(path.join(goc, 'HEAD')) ? goc : null; // kho trần
}

function coCommit(gitDir, sha) {
  try {
    git(gitDir, ['cat-file', '-e', `${sha}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function giaiSha(repo, ref) {
  if (SHA_RE.test(ref)) return ref;
  if (ref !== 'main') thoat(2, `--sha phải là SHA đầy đủ 40 ký tự hoặc "main", nhận: ${ref}`);
  try {
    const kq = execFileSync('git', ['ls-remote', urlRepo(repo), 'refs/heads/main'], { encoding: 'utf8' });
    const sha = kq.split(/\s+/)[0];
    if (!SHA_RE.test(sha)) throw new Error('không có đầu nhánh main');
    return sha;
  } catch (e) {
    return thoat(2, `Không hỏi được đầu nhánh main của ${repo}: ${e.message.split('\n')[0]}`);
  }
}

function timNguon(repo, sha) {
  const ung = [process.env.PE_GIAO_TRINH, path.join(GOC, '..', 'Giao_Trinh_PE')];
  for (const p of ung) {
    const d = gitDirCuaClone(p);
    if (d && coCommit(d, sha)) return { gitDir: d, noi: path.resolve(p) };
  }
  const cache = path.join(os.tmpdir(), 'pe-giao-trinh.git');
  if (!fs.existsSync(cache)) execFileSync('git', ['init', '--bare', '-q', cache]);
  if (!coCommit(cache, sha)) {
    try {
      git(cache, ['fetch', '--depth', '1', '-q', urlRepo(repo), sha]);
    } catch (e) {
      thoat(2, `Không lấy được ${sha.slice(0, 8)} từ ${urlRepo(repo)}: ${String(e.stderr || e.message).trim().split('\n')[0]}`);
    }
    if (!coCommit(cache, sha)) thoat(2, `Lấy xong mà vẫn không thấy commit ${sha.slice(0, 8)}.`);
  }
  return { gitDir: cache, noi: urlRepo(repo) };
}

// CRLF -> LF qua latin1 để không đụng byte nào khác. Windows có thể đổi kiểu xuống dòng khi checkout.
function chuan(buf, ten, vanBan) {
  if (!vanBan.has(path.extname(ten).toLowerCase())) return buf;
  return Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
}

function duyetDia(thuMuc, boQua) {
  const kq = [];
  const di = (d, tuongDoi) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (boQua.has(e.name)) continue;
      const rel = tuongDoi ? `${tuongDoi}/${e.name}` : e.name;
      if (e.isDirectory()) di(path.join(d, e.name), rel);
      else kq.push(rel);
    }
  };
  di(thuMuc, '');
  return kq;
}

// Mọi cặp { ten, tepGoi (đường dẫn trong repo nội dung hoặc null), tepNen (đường dẫn thật ở đây) }.
function cacCap({ gitDir, sha, goi }) {
  let xa;
  try {
    xa = JSON.parse(git(gitDir, ['show', `${sha}:${goi}/tools/anh-xa.json`]).toString('utf8'));
  } catch {
    thoat(2, `Commit ${sha.slice(0, 8)} không có ${goi}/tools/anh-xa.json — ghim nhầm SHA, hoặc gói chưa có ánh xạ.`);
  }
  const co = new Set(
    git(gitDir, ['ls-tree', '-r', '--name-only', sha, '--', goi]).toString('utf8').split('\n').filter(Boolean),
  );
  const vanBan = new Set(xa.vanBan);
  const boQua = new Set(xa.boQua);
  const cap = [];
  for (const [a, b] of xa.tep) {
    const g = `${goi}/${a}`;
    cap.push({ ten: a, tepGoi: co.has(g) ? g : null, tepNen: path.join(GOC, b) });
  }
  for (const [ta, tb] of xa.thuMuc) {
    const ten = new Set();
    const tien = `${goi}/${ta}/`;
    for (const p of co) {
      if (!p.startsWith(tien)) continue;
      const rel = p.slice(tien.length);
      if (!rel.split('/').some((x) => boQua.has(x))) ten.add(rel);
    }
    for (const rel of duyetDia(path.join(GOC, tb), boQua)) ten.add(rel);
    for (const rel of [...ten].sort()) {
      const g = `${tien}${rel}`;
      cap.push({ ten: `${ta}/${rel}`, tepGoi: co.has(g) ? g : null, tepNen: path.join(GOC, tb, rel) });
    }
  }
  return { cap, vanBan };
}

function so({ gitDir, sha, goi }) {
  const { cap, vanBan } = cacCap({ gitDir, sha, goi });
  let khop = 0;
  const lech = [];
  for (const c of cap) {
    const g = c.tepGoi ? git(gitDir, ['show', `${sha}:${c.tepGoi}`]) : null;
    const n = fs.existsSync(c.tepNen) ? fs.readFileSync(c.tepNen) : null;
    if (g && n && chuan(g, c.ten, vanBan).equals(chuan(n, c.ten, vanBan))) khop++;
    else lech.push({ ...c, loai: !g ? 'THỪA ở nền tảng (repo nội dung không có)' : !n ? 'THIẾU ở nền tảng' : 'KHÁC' });
  }
  return { khop, lech, cap, vanBan };
}

function layThamSo(args, ten) {
  const i = args.indexOf(ten);
  return i >= 0 ? args[i + 1] : undefined;
}

function main() {
  const args = process.argv.slice(2);
  const lenh = args[0] && !args[0].startsWith('--') ? args[0] : 'kiem';
  if (args.includes('--giup') || args.includes('-h') || !['kiem', 'lay'].includes(lenh)) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 36).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exit(lenh === 'kiem' || lenh === 'lay' ? 0 : 2);
  }
  const lock = docLock();
  const goi = lock.goi;

  if (lenh === 'lay') {
    const ref = layThamSo(args, '--sha');
    if (!ref) thoat(2, 'Thiếu --sha <SHA đầy đủ | main>.');
    const sha = giaiSha(lock.repo, ref);
    const nguon = timNguon(lock.repo, sha);
    const { cap, vanBan } = so({ ...nguon, sha, goi });
    let ghi = 0;
    for (const c of cap) {
      if (!c.tepGoi) continue; // không xoá tệp thừa; `kiem` sẽ báo
      const g = chuan(git(nguon.gitDir, ['show', `${sha}:${c.tepGoi}`]), c.ten, vanBan);
      const n = fs.existsSync(c.tepNen) ? fs.readFileSync(c.tepNen) : null;
      if (n && chuan(n, c.ten, vanBan).equals(g)) continue;
      fs.mkdirSync(path.dirname(c.tepNen), { recursive: true });
      fs.writeFileSync(c.tepNen, g);
      ghi++;
    }
    fs.writeFileSync(LOCK, `${JSON.stringify({ ...lock, sha }, null, 2)}\n`);
    console.log(`Đã ghi ${ghi} tệp từ ${sha.slice(0, 8)} (${nguon.noi}) và ghim ${sha.slice(0, 8)} vào scripts/pe-da/giao-trinh.json.`);
    // Rồi đo lại: chép xong mà vẫn lệch (tệp thừa chẳng hạn) thì phải nói ngay, không đợi CI.
    const sau = so({ ...nguon, sha, goi });
    for (const l of sau.lech) console.log(`  ${l.loai}: ${l.ten}`);
    console.log(`Sau khi lấy: ${sau.khop} tệp khớp, ${sau.lech.length} lệch.`);
    process.exit(sau.lech.length ? 1 : 0);
  }

  if (!SHA_RE.test(lock.sha || '')) thoat(2, 'scripts/pe-da/giao-trinh.json không có SHA hợp lệ — chạy `lay --sha <SHA>` trước.');
  const nguon = timNguon(lock.repo, lock.sha);
  const kq = so({ ...nguon, sha: lock.sha, goi });
  for (const l of kq.lech) console.log(`  ${l.loai}: ${l.ten}`);
  console.log(`Giao_Trinh_PE @ ${lock.sha.slice(0, 8)} (đọc từ ${nguon.noi}): ${kq.khop} tệp khớp, ${kq.lech.length} lệch.`);
  if (kq.lech.length) {
    console.log('Nội dung giáo trình soạn ở Giao_Trinh_PE, không sửa thẳng ở đây. Sửa bên đó, merge, rồi: node scripts/giao-trinh.mjs lay --sha <SHA>.');
    process.exit(1);
  }
}

main();
