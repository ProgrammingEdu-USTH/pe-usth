/**
 * loadtest-scenarios.js — hai kịch bản tải của DB10, đo p50/p95, tỉ lệ lỗi và số kết nối DB.
 *
 *   NỀN  (nen): N người, mỗi người một vòng đọc bài / xem danh sách / thỉnh thoảng hoàn thành bài,
 *               cách nhau vài giây như người thật; mặc định 20 người trong 120 giây (cao điểm).
 *   DỒN  (don): N người BẮT ĐẦU CÙNG LÚC (cả lớp): ghi danh → mở bài 1 → hoàn thành bài 1 → bài 2 → bài 3.
 *
 * Chạy trên BRANCH THỬ, với backend đang chạy ở cổng 5000 và THROTTLE_DISABLED=true (cờ này chỉ
 * có hiệu lực ngoài production). Người dùng giả là `loadtest-NNN@pe-loadtest.local` do
 * scripts/loadtest-prepare.js tạo; token ký thẳng bằng JWT_ACCESS_SECRET để khỏi bị giới hạn đăng nhập
 * (đo tải ĐĂNG NHẬP đã có ở scripts/loadtest.js).
 *
 *   PE_LOADTEST_PASSWORD=<chuỗi> node scripts/loadtest-prepare.js 100
 *   node scripts/loadtest-scenarios.js nen --users 20 --seconds 120
 *   node scripts/loadtest-scenarios.js don --users 100
 *   node scripts/loadtest-scenarios.js cleanup     # xoá người dùng giả và hàng con
 *
 * Số đo là của MÁY CHẠY LỆNH NÀY (cả client lẫn backend), nên độ trễ tới Neon là của máy này,
 * không phải của Render. Xem DB14 và AGENTS.md trước khi so với production.
 */
const path = require('path');
const http = require('http');
const REPO = path.resolve(__dirname, '..');
require(path.join(REPO, 'node_modules/dotenv')).config({ path: path.join(REPO, '.env'), quiet: true });
const jwt = require(path.join(REPO, 'node_modules/jsonwebtoken'));
const { Pool } = require(path.join(REPO, 'node_modules/@neondatabase/serverless'));

const args = process.argv.slice(2);
const mode = args[0];
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? Number(args[i + 1]) : d; };
const HOST = process.env.LT_HOST || '127.0.0.1';
const PORT = Number(process.env.LT_PORT || 5000);
const COURSE = 'python_advanced';
const agent = new http.Agent({ keepAlive: true, maxSockets: 500 });

function call(method, url, token, body) {
  return new Promise((resolve) => {
    const t0 = process.hrtime.bigint();
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      { host: HOST, port: PORT, path: url, method, agent, timeout: 60000,
        headers: { Authorization: `Bearer ${token}`, ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}) } },
      (res) => { res.resume(); res.on('end', () => resolve({ status: res.statusCode, ms: Number(process.hrtime.bigint() - t0) / 1e6 })); },
    );
    req.on('timeout', () => { req.destroy(); });
    req.on('error', () => resolve({ status: 0, ms: Number(process.hrtime.bigint() - t0) / 1e6 }));
    if (data) req.write(data);
    req.end();
  });
}

const stats = {}; // op -> { ms: [], status: {} }
function rec(op, r) {
  const s = (stats[op] ||= { ms: [], status: {} });
  s.ms.push(r.ms);
  s.status[r.status] = (s.status[r.status] || 0) + 1;
}
const pct = (xs, p) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN; };

function report(label, seconds, peak) {
  console.log(`\n=== ${label} (${seconds.toFixed(0)} s) ===`);
  let tot = 0, bad = 0, fiveXX = 0;
  for (const [op, s] of Object.entries(stats)) {
    const n = s.ms.length; tot += n;
    const err = Object.entries(s.status).filter(([c]) => !/^2/.test(c)).reduce((a, [, v]) => a + v, 0);
    const e5 = Object.entries(s.status).filter(([c]) => /^5/.test(c) || c === '0').reduce((a, [, v]) => a + v, 0);
    bad += err; fiveXX += e5;
    console.log(`${op.padEnd(14)} n=${String(n).padStart(5)}  p50 ${pct(s.ms, .5).toFixed(0).padStart(5)} ms  p95 ${pct(s.ms, .95).toFixed(0).padStart(5)} ms  max ${Math.max(...s.ms).toFixed(0).padStart(5)} ms  mã: ${JSON.stringify(s.status)}`);
  }
  console.log(`Tổng ${tot} request, ${(tot / seconds).toFixed(1)} req/s; không-2xx ${bad} (${(100 * bad / tot).toFixed(2)}%), 5xx/đứt ${fiveXX} (${(100 * fiveXX / tot).toFixed(2)}%).`);
  console.log(`Kết nối DB của role ứng dụng, đỉnh quan sát: ${peak.max} (DB_POOL_MAX của backend: ${process.env.DB_POOL_MAX || 50}).`);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  if (!process.env.DATABASE_URL.includes('ep-shy-wildflower-aou31y3d')) throw new Error('DATABASE_URL không phải branch thử — dừng.');

  if (mode === 'cleanup') {
    require(path.join(REPO, 'node_modules/ts-node')).register({ transpileOnly: true, project: path.join(REPO, 'tsconfig.json') });
    const { DELETE_ORDER, CASCADE_REFS } = require(path.join(REPO, 'src/auth/guest-cleanup.ts'));
    const ids = (await pool.query("select id from users where email like '%@pe-loadtest.local'")).rows.map((r) => r.id);
    if (!ids.length) { console.log('Không có người dùng giả.'); return pool.end(); }
    const c = await pool.connect();
    try {
      await c.query('begin');
      for (const ref of [...CASCADE_REFS, ...DELETE_ORDER]) {
        const [t, col] = ref.split('.');
        const r = await c.query(`delete from ${t} where ${col} = any($1)`, [ids]);
        if (r.rowCount) console.log(`  ${ref}: xoá ${r.rowCount}`);
      }
      const r = await c.query('delete from users where id = any($1)', [ids]);
      if (r.rowCount !== ids.length) throw new Error(`users xoá ${r.rowCount}/${ids.length}`);
      await c.query('commit');
      console.log(`Đã xoá ${ids.length} người dùng giả.`);
    } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
    return pool.end();
  }

  const users = opt('users', mode === 'don' ? 100 : 20);
  const seconds = opt('seconds', 120);
  const probe = args.includes('--probe'); // thêm 1 người chỉ đọc /api/enrolled trong lúc DỒN
  const rows = (await pool.query("select id, email, role from users where email like '%@pe-loadtest.local' order by email limit $1", [users + (probe ? 1 : 0)])).rows;
  if (rows.length < users + (probe ? 1 : 0)) throw new Error(`Mới có ${rows.length}/${users} người dùng giả — chạy loadtest-prepare.js ${users} trước.`);
  const tokens = rows.map((u) => jwt.sign({ sub: u.id, email: u.email, role: u.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '2h' }));
  const lessons = (await pool.query("select count(*)::int n from lessons where course_id=$1 and sort_order < 1000", [COURSE])).rows[0].n;

  // Đếm kết nối của role ứng dụng mỗi 500 ms: chạm trần pool nghĩa là request bắt đầu xếp hàng.
  const peak = { max: 0 };
  const sampler = setInterval(async () => {
    try { const r = await pool.query("select count(*)::int n from pg_stat_activity where usename = 'pe_app' and state <> 'idle'"); peak.max = Math.max(peak.max, r.rows[0].n); } catch {}
  }, 500);

  const t0 = Date.now();
  if (mode === 'nen') {
    const end = t0 + seconds * 1000;
    const vu = async (i) => {
      const tk = tokens[i];
      rec('enroll', await call('POST', `/api/courses/${COURSE}/enroll`, tk));
      let next = 1 + (i % 20);
      await new Promise((r) => setTimeout(r, Math.random() * 3000)); // lệch pha để không dồn
      while (Date.now() < end) {
        const x = Math.random();
        if (x < 0.55) rec('content', await call('GET', `/api/courses/${COURSE}/lessons/${next}/content`, tk));
        else if (x < 0.8) rec('enrolled', await call('GET', '/api/enrolled', tk));
        else { rec('complete', await call('POST', `/api/lessons/${next}/complete`, tk, { courseId: COURSE, quizScore: 3 })); next = (next % (lessons - 1)) + 1; }
        await new Promise((r) => setTimeout(r, 2000 + Math.random() * 6000)); // người đọc bài vài giây
      }
    };
    await Promise.all(rows.map((_, i) => vu(i)));
  } else if (mode === 'don') {
    const gate = new Promise((r) => setTimeout(r, 1000)); // mọi người đứng vạch rồi xuất phát cùng lúc
    const vu = async (i) => {
      const tk = tokens[i]; await gate;
      rec('enroll', await call('POST', `/api/courses/${COURSE}/enroll`, tk));
      for (const n of [1, 2, 3]) {
        rec('content', await call('GET', `/api/courses/${COURSE}/lessons/${n}/content`, tk));
        rec('complete', await call('POST', `/api/lessons/${n}/complete`, tk, { courseId: COURSE, quizScore: 3 }));
      }
    };
    let done = false;
    const prober = probe ? (async () => { await gate; while (!done) { rec('probe-enrolled', await call('GET', '/api/enrolled', tokens[users])); await new Promise((r) => setTimeout(r, 100)); } })() : null;
    await Promise.all(rows.slice(0, users).map((_, i) => vu(i)));
    done = true; if (prober) await prober;
  } else throw new Error('Dùng: nen | don | cleanup');

  clearInterval(sampler);
  report(`${mode === 'nen' ? 'NỀN' : 'DỒN'} — ${users} người`, (Date.now() - t0) / 1000, peak);
  await pool.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
