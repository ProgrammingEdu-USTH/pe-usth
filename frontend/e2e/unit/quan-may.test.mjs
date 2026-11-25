import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ARRIVAL_ORDER,
  averageWait,
  CULPRIT,
  groupByCode,
  ORDERS,
  schedule,
  SHORTFALL,
  SOLUTIONS,
  WAIT_GOAL,
  where,
  ZERO_ROWS,
  evaluate,
} from '../../src/lib/quan-may/episodes.ts';
import {
  currentRun,
  freshProgress,
  parseSave,
  reduce,
  SOLUTION_AFTER,
  STEPS,
  unlocked,
} from '../../src/lib/quan-may/progress.ts';

const play = (id, actions, from = freshProgress()) => actions.reduce((p, a) => reduce(id, p, a), from);
const next = { type: 'next' };

const toStep3 = [
  { type: 'predict', value: '?' },
  next,
  { type: 'watch', to: 5, total: 5 },
  next,
];

test('quán mây: con số trên màn hình tính ra đúng', () => {
  assert.equal(averageWait(schedule(ARRIVAL_ORDER)), 9.8);
  assert.ok(averageWait(schedule(SOLUTIONS['xep-don'])) <= WAIT_GOAL);
  const all = (rest) => (rest.length < 2 ? [rest] : rest.flatMap((x) => all(rest.filter((y) => y !== x)).map((t) => [x, ...t])));
  assert.equal(all(ORDERS.map((o) => o.id)).filter((o) => evaluate('xep-don', o)).length, 3);
  assert.equal(ZERO_ROWS.length, 6);
  const culprit = groupByCode(ZERO_ROWS).find((g) => g.code === CULPRIT);
  assert.deepEqual([culprit.count, culprit.total], [5, SHORTFALL]);
  assert.equal(where('ma_giam', '=', 'TEST100').length, 5);
  assert.equal(evaluate('ket-hut-tien', ['gia', '=', '0']), false);
  assert.equal(evaluate('ket-hut-tien', SOLUTIONS['ket-hut-tien']), true);
});

test('quán mây: không thể hoàn thành mà không chơi', () => {
  let p = freshProgress();
  for (let i = 0; i < 20; i += 1) p = reduce('ket-hut-tien', p, next);
  assert.equal(p.current, 1);
  assert.equal(p.best, 'none');
  // Hành động của bước sau bị bỏ qua khi đang đứng ở bước trước.
  p = play('ket-hut-tien', [{ type: 'decide', value: 'one' }, { type: 'group' }, { type: 'run' }]);
  assert.deepEqual(p.passed, []);
  // Dữ liệu lưu tự khai đang ở bước 6 bị đưa về bước đã mở.
  const saved = parseSave(JSON.stringify({ v: 2, episodes: { 'xep-don': { current: 6, passed: [5] } } }));
  assert.equal(saved.episodes['xep-don'].current, 1);
});

test('quán mây: đổi đầu vào thì kết quả cũ không còn và bước sau khoá lại', () => {
  let p = play('xep-don', [...toStep3, { type: 'work', work: SOLUTIONS['xep-don'] }, { type: 'run' }]);
  assert.equal(currentRun(p).ok, true);
  assert.equal(unlocked(p), 4);
  p = reduce('xep-don', p, { type: 'work', work: ARRIVAL_ORDER });
  assert.equal(currentRun(p), null);
  assert.equal(unlocked(p), 3);
  assert.equal(reduce('xep-don', p, next).current, 3);
  // Một lastRun đạt nhưng thuộc cấu hình khác cũng không được hiện.
  assert.equal(currentRun({ ...p, lastRun: { key: 'cấu hình khác', ok: true } }), null);
});

test('quán mây: tải lại giữ nguyên tiến độ, dữ liệu hỏng không làm sập', () => {
  const p = play('xep-don', [...toStep3, { type: 'work', work: SOLUTIONS['xep-don'] }, { type: 'run' }, next]);
  const again = parseSave(JSON.stringify({ v: 2, episodes: { 'xep-don': p } }));
  assert.deepEqual(again.episodes['xep-don'], p);
  for (const bad of [null, '', 'rác', '{"done":null}', 'null', '[]', '{"v":2,"episodes":null}', '{"v":2,"episodes":{"xep-don":5}}']) {
    const save = parseSave(bad);
    assert.equal(save.v, 2);
    for (const ep of Object.values(save.episodes)) assert.equal(ep.current, 1);
  }
});

test('quán mây: đi trọn hai tập, trả lời một lần, xem lời giải được ghi riêng', () => {
  let p = play('xep-don', [...toStep3, { type: 'work', work: SOLUTIONS['xep-don'] }, { type: 'run' }, next, next]);
  assert.equal(p.current, 5);
  p = play('xep-don', [{ type: 'decide', value: 'swap' }, { type: 'decide', value: 'last' }], p);
  assert.equal(p.decision, 'swap');
  p = reduce('xep-don', p, next);
  assert.equal(p.current, STEPS);
  assert.equal(p.best, 'done');
  assert.equal(reduce('xep-don', p, { type: 'replay' }).best, 'done');

  const wrong = [{ type: 'work', work: ['gia', '=', '0'] }, { type: 'run' }];
  let q = play('ket-hut-tien', [...toStep3.slice(0, 2), { type: 'watch', to: 1, total: 1 }, next]);
  assert.equal(reduce('ket-hut-tien', q, { type: 'solution' }).solutionShown, false);
  for (let i = 0; i < SOLUTION_AFTER; i += 1) q = play('ket-hut-tien', wrong, q);
  q = play('ket-hut-tien', [{ type: 'solution' }, { type: 'run' }, next], q);
  assert.equal(q.current, 4);
  assert.equal(play('ket-hut-tien', [{ type: 'suspect', code: CULPRIT }], q).passed.includes(4), false);
  q = play('ket-hut-tien', [{ type: 'group' }, { type: 'suspect', code: 'SINHNHAT' }, next], q);
  assert.equal(q.current, 4);
  q = play('ket-hut-tien', [{ type: 'suspect', code: CULPRIT }, next, { type: 'decide', value: 'all' }, next], q);
  assert.equal(q.best, 'seen');
});
