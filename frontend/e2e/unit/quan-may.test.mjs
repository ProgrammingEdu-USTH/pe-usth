// Quán Mây là một trang tĩnh (public/quan-may). Bộ này chạy script của trang với
// một DOM giả để hỏi đúng LUẬT của nó: nhiệm vụ nào cũng thắng được, và lời
// giải sai thì không thắng.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const text = (path) => readFileSync(new URL(path, root), 'utf8');
const JS = text('public/quan-may/quan-may.js');
const CSS = text('public/quan-may/quan-may.css');

/** Một phần tử nhận mọi lệnh và không làm gì: đủ để trang đầu dựng xong. */
function stub() {
  const own = { children: [], style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} } };
  const self = new Proxy(function () {}, {
    get: (_, key) =>
      key in own ? own[key]
      : key === 'querySelectorAll' ? () => []
      : key === Symbol.toPrimitive ? () => ''
      : self,
    set: (_, key, value) => ((own[key] = value), true),
    apply: () => self,
  });
  return self;
}

function load(storage = {}) {
  const memory = new Map(Object.entries(storage));
  const window = { addEventListener() {}, scrollTo() {} };
  const context = {
    window,
    document: { querySelector: stub, createElement: stub, createTextNode: stub, documentElement: stub(), addEventListener() {} },
    location: { hash: '' },
    localStorage: { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => void memory.set(k, v) },
    matchMedia: () => ({ matches: true }),
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  };
  window.matchMedia = context.matchMedia;
  vm.runInNewContext(JS, context);
  return window.QuanMay;
}

const QM = load();
const rules = (id) => QM.eps[id].rules;
const permutations = (xs) => (xs.length < 2 ? [xs] : xs.flatMap((x) => permutations(xs.filter((y) => y !== x)).map((rest) => [x, ...rest])));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

test('đủ mười tập, mỗi tập có chuyện, quyết định và đúc kết', () => {
  assert.deepEqual([...QM.order], Array.from({ length: 10 }, (_, i) => `ep${i + 1}`));
  for (const id of QM.order) {
    const ep = QM.eps[id];
    assert.ok(ep.intro.length >= 2, id);
    for (const part of [ep.play, ep.choice, ep.scene, ep.after]) assert.equal(typeof part, 'function', id);
    assert.ok(ep.debrief.term && ep.debrief.thanks.vi && ep.debrief.thanks.en && ep.debrief.points.length >= 3, id);
  }
});

test('tập 2: cả hai ca giờ cao điểm thắng được, thứ tự đến thì không', () => {
  const r = rules('ep2');
  const average = (order) => mean(Object.values(r.simulate(order, 'fcfs').wait));
  assert.ok(average([...r.L1]) > r.AVG_GOAL);
  assert.ok(permutations([...r.L1]).some((order) => average(order) <= r.AVG_GOAL));
  const meets = (policy, q) => {
    const sim = r.simulate(r.L2, policy, q, r.SWITCH);
    return r.L2.filter((o) => !o.party).every((o) => sim.turn[o.id] <= r.SMALL_LIMIT + 1e-9) && sim.finish.P <= r.PARTY_LIMIT + 1e-9;
  };
  assert.equal(meets('fcfs', 1), false);
  assert.ok([1, 2, 3, 4, 5, 6, 7, 8].some((q) => meets('rr', q)));
});

test('tập 3: sáu đơn 0₫, và năm đơn TEST100 đúng bằng số tiền hụt', () => {
  const r = rules('ep3');
  const zero = r.ROWS.filter((row) => r.test(row, { col: 'da_tra', op: '=', val: 0 }));
  assert.equal(zero.length, 6);
  const guilty = zero.filter((row) => row.ma_giam === 'TEST100');
  assert.equal(guilty.length, 5);
  // Con số trong lời thoại: két hụt 120.000₫.
  assert.equal(guilty.reduce((sum, row) => sum + row.gia, 0), 120000);
  assert.equal(r.ROWS.filter((row) => r.test(row, { col: 'ma_giam', op: '<>', val: 'TEST100' })).some((row) => row.ma_giam === null), false, 'NULL không khớp phép so sánh nào');
});

test('tập 5 và 6: có kế hoạch giao đủ việc chính, và có một cách nối dây đúng', () => {
  const se = rules('ep5');
  const done = se.build({ must: ['menu', 'order', 'counter'], should: ['qr', 'verify'], later: [] });
  assert.ok(se.EVENTS.every((e) => done.built.has(e.need)) && done.left >= 0);
  assert.ok(se.FEATURES.reduce((sum, f) => sum + f.pts, 0) > se.CAP, 'phải chọn, không làm hết được');
  const net = rules('ep6');
  for (const device of net.DEVICES) assert.ok(net.pathTo([...net.RIGHT], device, 'net').includes('router'));
  assert.equal(net.pathTo([], 'pc', 'net'), null);
});

test('tập 7: chia đôi thắng trong giới hạn, nhích từng đơn thì không', () => {
  const r = rules('ep7');
  const right = r.run100k({ mid: '(lo + hi) // 2', less: 'lo = mid + 1', more: 'hi = mid - 1' });
  assert.ok(right.found && right.steps <= r.GOAL);
  const slow = r.run100k({ mid: 'lo', less: 'lo = mid + 1', more: 'hi = mid - 1' });
  assert.ok(slow.steps > r.GOAL);
});

test('tập 8: chỉ truy vấn tham số qua cả bốn ca', () => {
  const r = rules('ep8');
  const winners = r.FIXES.filter((fix) => r.CASES.every((c) => r.passes(c, fix.run(c.input)))).map((fix) => fix.id);
  assert.deepEqual([...winners], ['param']);
  assert.equal(r.pasted("ít đá', 0) --").price, 0);
});

test('tập 9: một ngưỡng không bắt hết, hai ngưỡng thì được', () => {
  const r = rules('ep9');
  const one = [];
  const two = [];
  for (let a = 3; a <= 40; a += 1) {
    one.push(r.judge(a, null));
    for (let b = 2; b <= 10; b += 1) two.push(r.judge(a, b));
  }
  assert.ok(one.some((x) => x.caught >= 7 && x.fp <= r.FP_MAX));
  assert.equal(one.some((x) => x.caught === r.ATTACKS && x.fp <= r.FP_MAX), false);
  assert.ok(two.some((x) => x.caught === r.ATTACKS && x.fp <= r.FP_MAX));
});

test('dữ liệu đã lưu bị hỏng không làm trang chết', () => {
  for (const bad of ['rác', 'null', '[]', '{"done":null,"fx":5,"lang":"constructor"}']) {
    assert.equal(load({ 'quanmay.v1': bad, 'quanmay.runs.v1': bad }).order.length, 10);
  }
  const restored = load({ 'quanmay.runs.v1': JSON.stringify({ ep2: { phase: 'play', beat: 0, level: 1 }, ep3: { phase: 'hack' }, lạ: { phase: 'play' } }) });
  assert.deepEqual(Object.keys(restored.runs), ['ep2']);
});

test('trang không gọi mạng, không dẫn ra bản nháp ngoài site, và có đường tới nó', () => {
  assert.doesNotMatch(JS, /\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|\beval\(|new Function|document\.cookie/);
  assert.doesNotMatch(JS, /claude\.ai\/artifact\/(?!f3d755bb)[A-Za-z0-9]{8,}/);
  const config = text('next.config.ts');
  assert.match(config, /source: "\/quan-may", destination: "\/quan-may\/index\.html"/);
  for (const [old, ep] of [['xep-don', 'ep2'], ['ket-hut-tien', 'ep3']])
    assert.ok(config.includes(`source: "/quan-may/${old}", destination: "/quan-may#${ep}"`));
  for (const [, href] of JS.matchAll(/\['(\/bookshelf\/[a-z-]+)'/g))
    assert.ok(text('src/lib/static-courses.ts').includes(`'${href.split('/')[2]}'`) || href === '/bookshelf/python', href);
});

test('màn cảm ứng: ô gõ 16px, đích bấm 44px, hover chỉ cho con trỏ thật', () => {
  const coarse = CSS.slice(CSS.indexOf('@media (pointer: coarse)'));
  assert.match(coarse, /select, input\[type="text"\] \{ font-size: 16px !important; min-height: 44px; \}/);
  assert.match(coarse, /\.btn, \.option[^{]*\{ min-height: 44px; \}/);
  const bare = CSS.replace(/@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\n\}/, '');
  assert.doesNotMatch(bare, /:hover/);
});
