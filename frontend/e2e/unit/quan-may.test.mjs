// Quán Mây là một trang tĩnh (public/quan-may). Bộ này chạy mọi script của trang với
// một DOM giả để hỏi đúng LUẬT của nó: nhiệm vụ và vụ việc nào cũng thắng được, cách
// làm theo phản xạ thì thua, và không đáp án nào tự lộ vì dài hơn.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const text = (path) => readFileSync(new URL(path, root), 'utf8');
const HTML = text('public/quan-may/index.html');
const FILES = [...HTML.matchAll(/<script src="\/quan-may\/([\w-]+\.js)"><\/script>/g)].map((m) => m[1]);
const SOURCES = FILES.map((f) => [f, text(`public/quan-may/${f}`)]);
const JS = SOURCES.map(([, s]) => s).join('\n');
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
  const ready = [];
  const window = { addEventListener() {}, scrollTo() {} };
  const context = {
    window,
    document: { querySelector: stub, createElement: stub, createTextNode: stub, documentElement: stub(), addEventListener: (name, fn) => name === 'DOMContentLoaded' && ready.push(fn) },
    location: { hash: '' },
    localStorage: { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => void memory.set(k, v) },
    matchMedia: () => ({ matches: true }),
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  };
  window.matchMedia = context.matchMedia;
  vm.createContext(context);
  for (const [filename, source] of SOURCES) vm.runInContext(source, context, { filename });
  ready.forEach((fn) => fn());
  return window.QuanMay;
}

const QM = load();
const rules = (id) => QM.eps[id].rules;
const caseRules = (id) => QM.cases[id].rules;
const permutations = (xs) => (xs.length < 2 ? [xs] : xs.flatMap((x) => permutations(xs.filter((y) => y !== x)).map((rest) => [x, ...rest])));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** Dữ liệu tạo trong sandbox mang prototype của sandbox: chép ra để so sánh. */
const plain = (x) => JSON.parse(JSON.stringify(x));

test('đủ mười tập và ba vụ việc, mỗi thứ có đủ phần', () => {
  assert.deepEqual([...QM.order], Array.from({ length: 10 }, (_, i) => `ep${i + 1}`));
  assert.deepEqual([...QM.caseOrder], ['case-a', 'case-b', 'case-c']);
  for (const id of QM.order) {
    const ep = QM.eps[id];
    assert.ok(ep.intro.length >= 2, id);
    for (const part of [ep.play, ep.choice, ep.scene, ep.after]) assert.equal(typeof part, 'function', id);
    assert.ok(ep.debrief.term && ep.debrief.thanks.vi && ep.debrief.thanks.en && ep.debrief.points.length >= 3, id);
    assert.ok(QM.world.PREDICT[id] && QM.world.RECALL[id].length === 3, `${id} thiếu câu đoán hoặc bài ghép`);
    assert.ok(id in QM.world.NEEDS, id);
  }
  for (const id of QM.caseOrder) {
    const c = QM.cases[id];
    assert.ok(c.stages.length >= 4, id);
    assert.ok(c.needs.length >= 2 && c.needs.every((n) => QM.eps[n]), id);
    for (const s of c.stages) assert.ok(s.goal.vi && s.goal.en && s.hints.length && typeof s.mount === 'function', id);
    for (const note of c.consequences) assert.ok(QM.world.LEDGER[note.flag], note.flag);
  }
});

test('mọi dấu hậu quả mà lựa chọn ghi ra đều có dòng trong sổ quán', () => {
  const flags = new Set([...JS.matchAll(/flag: '(\w+)'/g)].map((m) => m[1]));
  assert.ok(flags.size >= 6);
  for (const flag of flags) assert.ok(QM.world.LEDGER[flag]?.vi && QM.world.LEDGER[flag]?.en, flag);
});

// Màn đoán và bài ghép dùng chung `run` với trò chơi của tập. Đặt trùng tên một trường là
// đè dữ liệu của nhau: tập 4 từng hỏng vì cả hai cùng ghi `run.guess`.
test('màn đoán và bài ghép không ghi đè trạng thái chơi của tập nào', () => {
  const fields = (source) => new Set([...source.matchAll(/\brun\.(\w+)/g)].map((m) => m[1]));
  const shared = fields(SOURCES.find(([f]) => f === 'world.js')[1]);
  const episodes = fields(SOURCES.find(([f]) => f === 'quan-may.js')[1]);
  assert.ok(shared.size >= 3);
  assert.deepEqual([...shared].filter((key) => episodes.has(key)), []);
});

// Người thử ngày 26/11/2026: "đáp án cứ câu nào dài nhất thì chọn".
test('đáp án đúng không bao giờ dài hơn mọi đáp án còn lại', () => {
  const visible = (value) => String(value ?? '').replace(/[`*]/g, '').length;
  const check = (name, options, right) => {
    for (const lang of ['vi', 'en']) {
      const sizes = options.map((o) => visible(o.code ?? o[lang] ?? o.label?.[lang] ?? o.text?.[lang] ?? o.name?.[lang]));
      assert.ok(sizes[right] <= Math.max(...sizes.filter((_, i) => i !== right)), `${name} (${lang}): ${sizes.join('/')}, đúng là ${right}`);
    }
  };
  const ui = { stage: stub(), ctl: stub(), run: {}, say() {}, actions() {}, goals() {} };
  let checked = 0;
  for (const id of QM.order) {
    const { options } = QM.eps[id].choice(ui);
    const right = options.findIndex((o) => o.good !== false && !o.tone);
    check(`${id} quyết định`, options, right);
    check(`${id} câu đoán`, QM.world.PREDICT[id].options, QM.world.PREDICT[id].answer);
    checked += 2;
  }
  rules('ep10').questions().forEach((q, i) => {
    check(`ep10 câu ${i + 1}`, q.answers, q.answers.findIndex((a) => a.star === 'STAR' || a.m[2] === 2 || a.m.every((v) => v >= 1)));
    checked += 1;
  });
  assert.equal(checked, 24);
  assert.match(JS, /QM\.world\.order\(ui\.run, 'choiceOrder'/, 'đáp án phải được xáo');
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

test('tập 8 và 9: chỉ truy vấn tham số qua cả bốn ca; một ngưỡng không đủ, hai ngưỡng thì được', () => {
  const sec = rules('ep8');
  const winners = sec.FIXES.filter((fix) => sec.CASES.every((c) => sec.passes(c, fix.run(c.input)))).map((fix) => fix.id);
  assert.deepEqual([...winners], ['param']);
  assert.equal(sec.pasted("ít đá', 0) --").price, 0);
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

test('tập 10: toàn câu mạnh thì đậu, chỉ một câu mạnh bị hụt thì rớt', () => {
  const r = rules('ep10');
  const q = r.questions();
  const total = (answer) => answer.m.reduce((a, b) => a + b, 0);
  const best = q.map((x) => Math.max(...x.answers.map(total)));
  const second = q.map((x) => x.answers.map(total).sort((a, b) => b - a)[1]);
  assert.ok(best.reduce((a, b) => a + b, 0) >= r.PASS);
  assert.ok(best.reduce((a, b) => a + b, 0) - best[0] - best[1] + second[0] + second[1] < r.PASS, 'hai câu yếu mà vẫn đậu');
});

test('vụ A: manh mối, truy vấn, dòng thời gian, chia đôi và phân quyền', () => {
  const r = caseRules('case-a');
  for (const lost of [false, true]) {
    const list = r.clues(lost);
    assert.equal(list.filter((c) => c.real).length, 3, `lost=${lost}`);
  }
  assert.equal(r.orders().length, 60);
  assert.ok(r.solved(r.query({ where: ['ma_giam IS NULL', 'da_tra < gia', ''], group: 'nhan_vien', having: 'COUNT(*) > 5' })));
  assert.equal(r.solved(r.query({ where: ['ma_giam IS NULL', 'da_tra < gia', ''], group: 'nhan_vien', having: '' })), false, 'thiếu HAVING mà vẫn đạt');
  assert.equal(r.solved(r.query({ where: ['da_tra < gia', '', ''], group: 'nhan_vien', having: 'COUNT(*) > 5' })), false, 'đếm lẫn giảm giá hợp lệ');
  assert.ok(r.ordered(['open', 'login', 'leave', 'first', 'camera', 'last', 'close']));
  assert.equal(r.ordered(['open', 'login', 'first', 'leave', 'camera', 'last', 'close']), false);
  assert.ok(2 ** r.PROBES >= r.VERSIONS - 1, 'sáu lần thử phải đủ');
  for (let seed = 1; seed < 400; seed += 1) {
    const bad = r.badVersion(seed);
    assert.ok(bad >= 2 && bad < r.VERSIONS);
  }
  const right = {};
  for (const [role, actions] of Object.entries(plain(r.GRANTS))) for (const a of actions) right[`${role}:${a}`] = true;
  assert.equal(r.wrongCells(right).length, 0);
  assert.ok(r.wrongCells({ ...right, 'manager:erase': true }).length === 1);
});

// Một lời giải cho mỗi ca đứng quầy, tìm bằng vét cạn lúc cân dữ liệu.
const SHIFT_WINS = {
  '1:false': '. B . C . . A . . . . . F . E . . . G . . . . I . H . . J . . .',
  '1:true': '. B . C . . A . . . . . F . E . . . G . . . . I . H . . J . . .',
  '2:false': 'A B . C . . . . D . . F . H . I . G . K . . . L . N . . J M . . . . .',
  '2:true': 'A B . . D . . C . F . . . H . I . . G K . . . L . N . . J . M . . . .',
};

test('vụ B, đứng quầy: có đường thắng, còn ba chiến thuật theo phản xạ đều thua', () => {
  const r = caseRules('case-b');
  const strategies = {
    'đến trước': () => (a, b) => a.arrive - b.arrive,
    'ngắn trước': () => (a, b) => a.need - b.need,
    'gấp trước': () => (a, b) => a.arrive + a.patience - b.arrive - b.patience,
  };
  for (const baristas of [1, 2]) {
    for (const impatient of [false, true]) {
      const key = `${baristas}:${impatient}`;
      const won = r.score(r.replay(SHIFT_WINS[key].split(' '), baristas, impatient));
      assert.ok(won.ok, `${key} lời giải mẫu: ${JSON.stringify(plain(won))}`);
      for (const [name, pick] of Object.entries(strategies)) {
        const s = r.replay([], baristas, impatient);
        for (let i = 0; i < 100 && !r.score(s).over; i += 1) {
          while (s.baristas.includes(null)) {
            const waiting = s.orders.filter((x) => x.state === 'waiting').sort(pick());
            if (!waiting.length) break;
            r.start(s, waiting[0].id);
          }
          r.tick(s);
        }
        assert.equal(r.score(s).ok, false, `${key}: "${name}" không được thắng`);
      }
    }
  }
});

test('vụ B: mặt bằng, công suất và bản phát hành', () => {
  const r = caseRules('case-b');
  const _ = '';
  const good = ['quay', 'quay', 'quay', 'quay', 'quay', 'hang', _, 'ban', 'ban', 'ban', 'hang', _, 'ban', 'ban', 'ban', 'cua', 'thung', _, _, _];
  assert.ok(r.planOk(good));
  assert.equal(r.planOk(good.map((v, i) => (i === 7 ? '' : v))), false, 'vùng không chữ nhật mà vẫn duyệt');
  assert.equal(r.planOk(good.map((v, i) => (i === 6 ? 'ban' : v))), false);
  const winners = [];
  for (let baristas = 1; baristas <= 4; baristas += 1)
    for (let machines = 1; machines <= 3; machines += 1)
      for (let prep = 0; prep <= 60; prep += 10) if (r.capacityOk({ baristas, machines, prep })) winners.push(`${baristas}/${machines}/${prep}`);
  assert.ok(winners.length >= 1 && winners.length <= 4, winners.join(' '));
  assert.ok(r.release(['dup', 'board', 'soldout', 'pay']).ok);
  assert.equal(r.release(['pay', 'dup', 'board', 'soldout']).ok, false, 'làm trước thứ nó cần');
  assert.equal(r.release(['board', 'dup', 'pay', 'sound']).ok, false, 'thiếu giá trị');
});

test('vụ C: chia mạng, tường lửa, nhật ký và luật khái quát', () => {
  const r = caseRules('case-c');
  const plan = { guest: { base: '0', prefix: '26' }, camera: { base: '64', prefix: '28' }, staff: { base: '80', prefix: '29' }, till: { base: '88', prefix: '30' } };
  assert.deepEqual(plain(r.checkPlan(plan)).map((x) => x.problem), [null, null, null, null]);
  assert.equal(r.checkPlan({ ...plan, camera: { base: '32', prefix: '28' } })[1].problem, 'overlap');
  assert.equal(r.checkPlan({ ...plan, guest: { base: '0', prefix: '27' } })[0].problem, 'small');
  assert.equal(r.checkPlan({ ...plan, staff: { base: '84', prefix: '29' } })[2].problem, 'align');
  const allow = { all: false, web: true, staff: true, camera: false, guestTill: false, pay: true };
  assert.ok(r.firewallOk(['guestTill', 'web', 'staff', 'camera', 'pay', 'all'], allow));
  assert.equal(r.firewallOk(['web', 'guestTill', 'staff', 'camera', 'pay', 'all'], allow), false, 'luật rộng đứng trước vẫn đạt');
  for (const shared of [false, true]) {
    const lines = r.logLines(shared, false);
    const bad = lines.map((l, i) => (l.bad ? i : -1)).filter((i) => i >= 0);
    assert.ok(r.grade(lines, bad).ok);
    assert.equal(r.grade(lines, lines.map((_, i) => i)).ok, false, 'đánh dấu tất cả mà vẫn đạt');
    assert.equal(r.grade(lines, bad.slice(0, Math.floor(bad.length / 2))).ok, false);
  }
  const rule = (a, join, b) => ({ a: { field: a[0], value: a[1] }, join, b: { field: b[0], value: b[1] } });
  assert.ok(r.ruleOk(rule(['fails', 10], 'OR', ['users', 4])));
  const overfit = rule(['fails', 18], 'OR', ['users', 7]);
  assert.equal(r.measure(overfit, r.TRAIN).caught, r.measure(overfit, r.TRAIN).total, 'khớp hết tuần cũ');
  assert.equal(r.ruleOk(overfit), false, 'học vẹt mà vẫn qua tuần mới');
  for (const field of ['fails', 'users', 'night', 'after'])
    for (let value = 0; value <= 60; value += 1) assert.equal(r.ruleOk(rule([field, value], '', ['users', 0])), false, `một điều kiện là đủ: ${field} ${value}`);
});

test('sơ đồ quán dựng được ở mọi trạng thái, mỗi tập một cửa vào', () => {
  const full = JSON.stringify({ done: Object.fromEntries(QM.order.map((id) => [id, true])), flags: Object.fromEntries(Object.keys(QM.world.LEDGER).map((k) => [k, true])), stars: { ep1: 3 }, cases: { 'case-a': { done: true, stars: 2 } } });
  for (const storage of [{}, { 'quanmay.v1': full }]) {
    const page = load(storage);
    assert.doesNotThrow(() => page.world.hub());
  }
  const world = SOURCES.find(([f]) => f === 'world.js')[1];
  for (const id of QM.order) assert.match(world, new RegExp(`\\['${id}', [\\d.]+, [\\d.]+`), `${id} không có chỗ trên sơ đồ`);
});

test('dữ liệu đã lưu bị hỏng không làm trang chết', () => {
  for (const bad of ['rác', 'null', '[]', '{"done":null,"fx":5,"lang":"constructor","flags":3,"cases":"x","slips":null}']) {
    assert.equal(load({ 'quanmay.v1': bad, 'quanmay.runs.v1': bad }).order.length, 10);
  }
  const restored = load({ 'quanmay.runs.v1': JSON.stringify({ ep2: { phase: 'play', beat: 0, level: 1 }, ep3: { phase: 'hack' }, lạ: { phase: 'play' }, 'case-a': { stage: 2 } }) });
  assert.deepEqual(Object.keys(restored.runs).sort(), ['case-a', 'ep2']);
});

test('trang không gọi mạng, không dẫn ra bản nháp ngoài site, và có đường tới nó', () => {
  assert.ok(FILES.length >= 7);
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
  const coarse = [...CSS.matchAll(/@media \(pointer: coarse\) \{[\s\S]*?\n\}/g)].map((m) => m[0]).join('\n');
  assert.match(coarse, /select, input\[type="text"\] \{ font-size: 16px !important; min-height: 44px; \}/);
  assert.match(coarse, /\.btn, \.option[^{]*\{ min-height: 44px; \}/);
  assert.match(coarse, /\.logline, \.task, \.match-card, input\[type="number"\] \{ min-height: 44px; \}/);
  assert.match(CSS, /input\[type="number"\] \{[^}]*font: 600 16px/);
  const bare = CSS.replace(/@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\n\}/g, '');
  assert.doesNotMatch(bare, /:hover/);
});
