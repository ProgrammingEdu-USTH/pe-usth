/* Case B: Monday lunch breaks the shop. A shift run minute by minute, a CSS grid floor plan,
   capacity planning on a simulation, and a release plan with dependencies. */
(() => {
'use strict';
const QM = window.QuanMay;
const { S, h, btn, O, T, rich, money, avatar } = QM.lib;
const { rng, head, sortable } = QM.caseKit;

/* ---------- stage 1: run the counter ---------- */
const NAMES = { tea: O('Trà đào', 'Peach tea'), salt: O('Cà phê muối', 'Salt coffee'), lemon: O('Nước chanh', 'Lemonade'), smoothie: O('Sinh tố', 'Smoothie'), milk: O('Trà sữa', 'Milk tea'), tray: O('Khay 6 ly', 'Tray of six') };
const o = (id, kind, arrive, need, patience) => ({ id, kind, arrive, need, patience });
/* Tuned so that "first come", "shortest first" and "most urgent first" all fail, while a planned order can still win. */
const SHIFT = {
  1: { goal: { lost: 1, wait: 3.5 }, orders: [o('A', 'smoothie', 0, 5, 12), o('B', 'lemon', 1, 1, 4), o('C', 'tea', 1, 2, 5), o('D', 'tray', 1, 7, 16), o('E', 'milk', 6, 3, 6), o('F', 'lemon', 8, 1, 3), o('G', 'salt', 9, 4, 13), o('H', 'tea', 15, 2, 5), o('I', 'lemon', 16, 1, 3), o('J', 'milk', 17, 3, 9)] },
  2: { goal: { lost: 1, wait: 2 }, orders: [o('A', 'smoothie', 0, 5, 10), o('B', 'lemon', 0, 1, 3), o('C', 'tray', 0, 7, 17), o('D', 'tea', 2, 2, 4), o('E', 'salt', 2, 4, 9), o('F', 'milk', 3, 3, 5), o('G', 'tray', 6, 7, 13), o('H', 'lemon', 7, 1, 3), o('I', 'tea', 8, 2, 4), o('J', 'smoothie', 9, 5, 10), o('K', 'milk', 11, 3, 4), o('L', 'lemon', 13, 1, 3), o('M', 'salt', 14, 4, 9), o('N', 'tea', 15, 2, 5)] },
};
function newShift(baristas, impatient) {
  const spec = SHIFT[baristas];
  return { t: 0, goal: spec.goal, baristas: Array(baristas).fill(null), orders: spec.orders.map((x) => ({ ...x, patience: x.patience - (impatient && x.patience > 3 ? 1 : 0), state: 'due', start: null, left: x.need })) };
}
const arrive = (s) => s.orders.forEach((x) => { if (x.state === 'due' && x.arrive <= s.t) x.state = 'waiting'; });
/* give a waiting order to the first free barista */
function start(s, id) {
  const free = s.baristas.indexOf(null), x = s.orders.find((y) => y.id === id);
  if (free < 0 || !x || x.state !== 'waiting') return false;
  s.baristas[free] = id; x.state = 'making'; x.start = s.t; return true;
}
/* one minute passes: cups advance, finished ones leave the counter, people who waited too long walk out */
function tick(s) {
  s.t++;
  s.baristas.forEach((id, i) => { if (!id) return; const x = s.orders.find((y) => y.id === id); if (--x.left <= 0) { x.state = 'done'; s.baristas[i] = null; } });
  s.orders.forEach((x) => { if (x.state === 'waiting' && s.t - x.arrive >= x.patience) x.state = 'lost'; });
  arrive(s);
}
function score(s) {
  const done = s.orders.filter((x) => x.start !== null), lost = s.orders.filter((x) => x.state === 'lost').length;
  const wait = done.length ? done.reduce((a, x) => a + x.start - x.arrive, 0) / done.length : 0;
  const over = s.orders.every((x) => x.state === 'done' || x.state === 'lost');
  return { lost, wait, over, ok: over && lost <= s.goal.lost && wait <= s.goal.wait + 1e-9 };
}
/* replay a list of moves ({start:id} or {tick:true}); the draft stores only the moves */
function replay(moves, baristas, impatient) {
  const s = newShift(baristas, impatient);
  arrive(s);
  for (const m of moves) { if (m === '.') tick(s); else start(s, m); }
  return s;
}

/* ---------- stage 2: floor plan with grid-template-areas ---------- */
const COLS = 5, ROWS = 4;
const AREAS = [['quay', O('Quầy', 'Counter'), 'coral'], ['hang', O('Lối xếp hàng', 'Queue lane'), 'blue'], ['ban', O('Khu bàn', 'Tables'), 'green'], ['cua', O('Cửa', 'Door'), 'yellow'], ['thung', O('Thùng rác', 'Bin'), 'steel']];
const cellsOf = (g, a) => g.map((v, i) => (v === a ? [i % COLS, Math.floor(i / COLS)] : null)).filter(Boolean);
const isRect = (c) => !c.length || (Math.max(...c.map((p) => p[0])) - Math.min(...c.map((p) => p[0])) + 1) * (Math.max(...c.map((p) => p[1])) - Math.min(...c.map((p) => p[1])) + 1) === c.length;
const touches = (a, b) => a.some(([x, y]) => b.some(([u, v]) => Math.abs(x - u) + Math.abs(y - v) === 1));
const PLAN_RULES = [
  [O('CSS chỉ nhận vùng **hình chữ nhật**', 'CSS only accepts **rectangular** areas'), (g) => AREAS.every(([a]) => isRect(cellsOf(g, a)))],
  [O('Quầy chiếm **trọn hàng trên cùng**', 'The counter fills the **whole top row**'), (g) => g.every((v, i) => (v === 'quay') === (i < COLS))],
  [O('Cửa là **một ô** ở góc dưới bên trái', 'The door is **one cell**, bottom left'), (g) => { const c = cellsOf(g, 'cua'); return c.length === 1 && c[0][0] === 0 && c[0][1] === ROWS - 1; }],
  [O('Lối xếp hàng rộng **một ô**, liền từ quầy xuống tới cửa', 'The queue lane is **one cell wide**, from counter to door'), (g) => { const c = cellsOf(g, 'hang'); return c.length === ROWS - 2 && c.every(([x]) => x === 0) && isRect(c) && c.some(([, y]) => y === 1) && c.some(([, y]) => y === ROWS - 2); }],
  [O('Khu bàn ít nhất **6 ô**, **không kề** lối xếp hàng', 'Tables: at least **6 cells**, **not next to** the lane'), (g) => { const c = cellsOf(g, 'ban'); return c.length >= 6 && !touches(c, cellsOf(g, 'hang')); }],
  [O('**Một** thùng rác, không kề quầy và không kề bàn', '**One** bin, next to neither counter nor tables'), (g) => { const c = cellsOf(g, 'thung'); return c.length === 1 && !touches(c, cellsOf(g, 'quay')) && !touches(c, cellsOf(g, 'ban')); }],
];
const template = (g) => Array.from({ length: ROWS }, (_, y) => `"${g.slice(y * COLS, y * COLS + COLS).map((v) => v || '.').join(' ')}"`);
const planOk = (g) => PLAN_RULES.every(([, rule]) => rule(g));

/* ---------- stage 3: capacity on two hundred simulated lunches ---------- */
const BUDGET = 1000000, LUNCHES = 200, TARGET_P95 = 9;
const cost = (c) => c.baristas * 200000 + c.machines * 150000 + c.prep * 4000;
function simulate(c) {
  const servers = Math.min(c.baristas, c.machines * 2), mean = 5 * (1 - c.prep / 100 * 0.6), waits = [];
  for (let d = 0; d < LUNCHES; d++) {
    const r = rng(1000 + d), exp = (m) => -Math.log(1 - r()) * m, free = Array(servers).fill(0);
    for (let t = exp(60 / 26); t < 120; t += exp(60 / 26)) {
      let k = 0; for (let i = 1; i < servers; i++) if (free[i] < free[k]) k = i;
      const begin = Math.max(t, free[k]); waits.push(begin - t); free[k] = begin + exp(mean);
    }
  }
  waits.sort((a, b) => a - b);
  return { mean: waits.reduce((a, x) => a + x, 0) / waits.length, p95: waits[Math.floor(waits.length * 0.95)], waits, cost: cost(c) };
}
const capacityOk = (c) => { const r = simulate(c); return r.cost <= BUDGET && r.p95 <= TARGET_P95; };

/* ---------- stage 4: what ships before next Monday ---------- */
const DAYS = 5, VALUE = 29;
const TASKS = {
  dup: { days: 1, value: 8, needs: [], name: O('Chặn đơn gửi trùng khi bấm hai lần', 'Stop duplicate orders on double tap') },
  board: { days: 2, value: 9, needs: [], name: O('Đơn mới hiện ngay trên màn quầy', 'New orders appear on the counter screen') },
  sound: { days: 1, value: 3, needs: ['board'], name: O('Chuông báo khi có đơn mới', 'Sound for a new order') },
  soldout: { days: 1, value: 5, needs: ['board'], name: O('Bấm “hết món” từ màn quầy', 'Mark “sold out” from the counter screen') },
  stats: { days: 2, value: 4, needs: [], name: O('Trang thống kê buổi trưa', 'A lunch statistics page') },
  pay: { days: 1, value: 7, needs: ['dup'], name: O('Gộp hai lần thanh toán bị lặp', 'Merge doubled payments') },
};
function release(ids) {
  const days = ids.reduce((a, id) => a + TASKS[id].days, 0), value = ids.reduce((a, id) => a + TASKS[id].value, 0);
  const early = ids.filter((id, i) => TASKS[id].needs.some((n) => !ids.slice(0, i).includes(n)));
  return { days, value, early, ok: days <= DAYS && !early.length && value >= VALUE };
}

QM.addCase({
  id: 'case-b', letter: 'B', needs: ['ep1', 'ep2', 'ep4'],
  title: O('Trưa thứ Hai vỡ trận', 'Monday lunch falls apart'), tag: O('Hệ điều hành · Web · Xác suất · Công nghệ phần mềm', 'Operating systems · Web · Probability · Software engineering'),
  scene: { tidy: true, queue: 7, phone: '37' }, after: { tidy: true, queue: 2, baristas: 2 },
  hook: O('Trưa thứ Hai khách đứng tràn ra cửa. Bạn đứng quầy trước, rồi sửa tận gốc.', 'On Monday the queue spills out of the door. Work the counter first, then fix the causes.'),
  brief: O('Trưa nay mà còn như tuần trước là mất khách thật. Vào quầy phụ mình, rồi tính lại từ đầu.', 'Another lunch like last week and we lose people. Come to the counter, then let us rethink it all.'),
  closing: O('Quầy chạy được, lối đi thông, đủ người đúng lúc, và bản sửa đã lên kịp. Thứ Hai tới mình ngủ ngon.', 'The counter flows, the aisle is clear, the staffing fits and the fixes shipped. I will sleep before next Monday.'),
  consequences: [
    { flag: 'twoBaristas', text: O('Bạn đã khuyên thuê người: ca này có **hai** người pha, nhưng khách cũng đông hơn.', 'You advised hiring: this shift has **two** baristas, and more guests.') },
    { flag: 'overloaded', text: O('Khách còn nhớ tối chờ lâu: họ **bỏ về sớm hơn** một phút.', 'Guests remember the long evening: they **leave a minute sooner**.') },
  ],
  learned: [
    O('Lập lịch ngoài đời có **hạn chờ**: việc ngắn trước chưa đủ, phải cứu đơn sắp mất.', 'Real scheduling has **deadlines**: shortest first is not enough, rescue the order about to leave.'),
    O('`grid-template-areas` vẽ bố cục bằng chữ, và mỗi vùng phải là **hình chữ nhật**.', '`grid-template-areas` draws a layout in text, and every area must be a **rectangle**.'),
    O('Thiết kế theo **phân vị 95**, không theo trung bình.', 'Size for the **95th percentile**, not the average.'),
    O('Kế hoạch phát hành phải theo **phụ thuộc** và giá trị trên mỗi ngày công.', 'A release plan follows **dependencies** and value per day.'),
  ],
  rules: { SHIFT, newShift, replay, tick, start, score, arrive, PLAN_RULES, planOk, template, isRect, simulate, capacityOk, cost, BUDGET, TARGET_P95, TASKS, release, DAYS, VALUE },
  stages: [
    {
      short: O('Đứng quầy', 'The counter'), skill: O('Lập lịch có hạn chờ', 'Scheduling with deadlines'),
      goal: O('Pha hết ca: **mất nhiều nhất 1 khách** và giữ thời gian chờ trung bình trong mục tiêu.', 'Finish the shift: lose **at most 1 guest** and keep the average wait within target.'),
      hints: [
        O('Thanh xanh dưới mỗi đơn là **kiên nhẫn**. Đơn ngắn mà sắp hết kiên nhẫn thì cứu trước.', 'The bar under each order is **patience**. Rescue a short order that is about to run out.'),
        O('Đừng khoá người pha vào khay 6 ly đúng lúc ly chanh sắp tới. Đôi khi **đợi một phút** lại lợi.', 'Do not lock a barista into a tray just before a lemonade arrives. Sometimes **waiting a minute** wins.'),
      ],
      mount(api) {
        const d = api.data, count = S.flags.twoBaristas ? 2 : 1;
        if (!Array.isArray(d.moves) || d.baristas !== count) { d.moves = []; d.baristas = count; }
        const clock = h('span', { class: 'count' }), hands = h('div', { class: 'hands' }), lane = h('div', { class: 'pool' }), tally = h('p', { class: 'result', 'aria-live': 'polite' }), soon = h('p', { class: 'lane-h' });
        const draw = () => {
          const s = replay(d.moves, count, Boolean(S.flags.overloaded)), r = score(s);
          clock.textContent = `${T(O('phút', 'minute'))} ${s.t}`;
          hands.replaceChildren(...s.baristas.map((id) => { const x = id && s.orders.find((y) => y.id === id); return h('div', { class: 'barista' }, h('span', { html: avatar('linh', x ? 'happy' : 'think') }), h('p', { class: 'now' }, x ? `${x.id} · ${T(NAMES[x.kind])} · ${T(O('còn', 'left'))} ${x.left}′` : T(O('Rảnh tay', 'Free')))); }));
          const waiting = s.orders.filter((x) => x.state === 'waiting'), free = s.baristas.includes(null);
          lane.replaceChildren(...waiting.map((x) => { const spare = x.patience - (s.t - x.arrive); return h('button', { type: 'button', class: 'order t-' + 'ABCDE'[x.need % 5] + (spare <= 2 ? ' late' : ''), 'data-id': x.id, disabled: !free || api.passed, onclick: () => { d.moves.push(x.id); api.save(); draw(); } },
            h('span', { class: 'tag' }, x.id), h('span', { class: 'oname' }, T(NAMES[x.kind])), h('span', { class: 'omin' }, `${x.need}′ ${T(O('pha', 'to make'))}`), h('span', { class: 'ostate' }, `${T(O('đi sau', 'leaves in'))} ${spare}′`), h('i', { class: 'patience' }, h('i', { style: `width:${Math.max(0, (spare / x.patience) * 100)}%` }))); }));
          if (!waiting.length) lane.replaceChildren(h('p', { class: 'empty' }, T(O('Chưa ai đang đợi.', 'Nobody is waiting.'))));
          const next = s.orders.find((x) => x.state === 'due');
          soon.textContent = next ? `${T(O('Sắp tới', 'Next in'))}: ${next.arrive - s.t}′ ${T(NAMES[next.kind])}` : T(O('Hết khách mới.', 'No more arrivals.'));
          tally.replaceChildren(h('span', { class: 'score ' + (r.lost > s.goal.lost || r.wait > s.goal.wait ? 'bad' : 'good') }, h('span', {}, T(O('Bỏ về', 'Walked out'))), h('b', {}, `${r.lost}/${s.goal.lost}`), h('span', {}, T(O('Chờ TB', 'Avg wait'))), h('b', {}, `${r.wait.toFixed(1)}′`), h('small', {}, `≤ ${s.goal.wait}′`)));
          if (api.passed) return;
          if (r.over) {
            if (r.ok) api.pass(O('Hết ca mà quầy vẫn thở được. Giờ tính vì sao trưa nào cũng nghẹt ở cửa.', 'The shift is done and the counter can breathe. Now, why does the door jam every lunch?'));
            else { api.actions(btn('↻ ' + T(O('Làm lại ca này', 'Run the shift again')), () => { d.moves = []; api.save(); api.go(api.run.stage); }, 'primary')); if (!d.counted) { d.counted = true; api.miss(O(`Hết ca: **${r.lost}** khách bỏ về, chờ trung bình **${r.wait.toFixed(1)}′**. Chưa đạt.`, `Shift over: **${r.lost}** walked out, average **${r.wait.toFixed(1)}′**. Not enough.`)); } }
            return;
          }
          d.counted = false;
          api.actions(btn(T(O('Qua một phút', 'One minute passes')) + ' ▶', () => { d.moves.push('.'); api.save(); draw(); }, 'primary'), d.moves.length ? btn(T(O('Làm lại từ phút 0', 'Restart at minute 0')), () => { d.moves = []; api.save(); draw(); }, 'ghost') : null);
        };
        api.stage.append(head(O('Ca trưa: bạn quyết ai được pha', 'Lunch shift: you decide who is served'), clock), hands, h('p', { class: 'lane-h' }, T(O('Đang đợi: bấm đơn để giao cho người rảnh', 'Waiting: tap an order to give it to a free barista'))), lane, soon, tally);
        api.say('linh', O('Mỗi người chỉ chờ được một lúc rồi đi. Bạn chọn pha ly nào, rồi cho đồng hồ chạy.', 'Each guest waits only so long. Pick what to make, then let the clock run.'), 'worry');
        draw();
      },
    },
    {
      short: O('Mặt bằng', 'Floor plan'), skill: O('CSS Grid', 'CSS Grid'),
      goal: O('Tô mặt bằng 5×4 thoả **cả sáu yêu cầu**. Mã `grid-template-areas` sinh ra theo tay bạn.', 'Paint the 5×4 floor to meet **all six requirements**. `grid-template-areas` is written as you paint.'),
      hints: [O('Hàng 1 là quầy. Cột 1: hai ô lối đi rồi tới cửa. Chừa **cột 2 trống** để bàn không kề lối đi.', 'Row 1 is the counter. Column 1: two lane cells, then the door. Leave **column 2 empty** between tables and lane.')],
      mount(api) {
        const d = api.data;
        d.g = Array.isArray(d.g) && d.g.length === COLS * ROWS ? d.g : Array(COLS * ROWS).fill('');
        let brush = 'quay';
        const board = h('div', { class: 'paint' }), live = h('div', { class: 'preview' }), code = h('pre', { class: 'code' }), checks = h('ul', { class: 'checks' }), palette = h('div', { class: 'brushes', role: 'radiogroup', 'aria-label': T(O('Bút tô', 'Brush')) });
        const draw = () => {
          palette.replaceChildren(...[...AREAS, ['', O('Tẩy', 'Eraser'), 'cream']].map(([a, name, mat]) => h('button', { type: 'button', class: `brush m-${mat}`, role: 'radio', 'data-a': a, 'aria-checked': String(brush === a), onclick: () => { brush = a; draw(); } }, T(name))));
          board.replaceChildren(...d.g.map((v, i) => h('button', { type: 'button', class: `cell m-${(AREAS.find((x) => x[0] === v) || [0, 0, 'none'])[2]}`, 'data-i': String(i), 'aria-label': `${Math.floor(i / COLS) + 1},${(i % COLS) + 1} ${v || '.'}`, disabled: api.passed, onclick: () => { d.g[i] = brush; api.save(); draw(); } }, v || '·')));
          const rows = template(d.g);
          code.textContent = `.quan {\n  display: grid;\n  grid-template-areas:\n    ${rows.join('\n    ')};\n}`;
          /* a real browser grid: a non-rectangular area makes the whole declaration invalid */
          live.removeAttribute('style');
          live.style.gridTemplateAreas = rows.join(' ');
          const valid = live.style.gridTemplateAreas !== '';
          live.replaceChildren(...(valid ? AREAS.filter(([a]) => d.g.includes(a)).map(([a, name, mat]) => h('div', { class: `m-${mat}`, style: `grid-area:${a}` }, T(name))) : [h('p', { class: 'empty' }, T(O('Trình duyệt bỏ cả khai báo vì có vùng không phải hình chữ nhật.', 'The browser drops the declaration: an area is not a rectangle.')))]));
          live.classList.toggle('invalid', !valid);
          checks.replaceChildren(...PLAN_RULES.map(([text, rule]) => h('li', { class: rule(d.g) ? 'ok' : '' }, h('span', { html: rich(T(text)) }))));
        };
        api.stage.append(head(O('Tô mặt bằng', 'Paint the floor')), palette, board, h('p', { class: 'lane-h' }, T(O('Trình duyệt dựng ra:', 'What the browser draws:'))), live);
        api.ctl.replaceChildren(code, checks);
        api.say('ban', O('Chọn bút, bấm vào ô. Mình viết bố cục bằng **chữ**, trình duyệt vẽ đúng như vậy.', 'Pick a brush, tap cells. The layout is written in **text** and the browser draws exactly that.'), 'happy');
        draw();
        if (!api.passed) api.actions(btn(T(O('Duyệt mặt bằng', 'Approve the plan')), () => {
          if (planOk(d.g)) api.pass(O('Hàng khách không còn đâm vào bàn. Giờ tính bao nhiêu người và máy là đủ.', 'The queue no longer runs into the tables. Now: how many people and machines are enough?'));
          else api.miss(O(`Còn **${PLAN_RULES.filter(([, rule]) => !rule(d.g)).length} yêu cầu** chưa đạt.`, `**${PLAN_RULES.filter(([, rule]) => !rule(d.g)).length} requirements** are not met.`));
        }, 'primary'));
      },
    },
    {
      short: O('Công suất', 'Capacity'), skill: O('Mô phỏng và phân vị', 'Simulation and percentiles'),
      goal: O(`Chọn người, máy và phần chuẩn bị trước sao cho **95% khách chờ ≤ ${TARGET_P95} phút**, trong ngân sách **1.000.000₫**.`, `Choose staff, machines and prep so that **95% wait ≤ ${TARGET_P95} minutes**, within **1,000,000₫**.`),
      hints: [O('Một máy chỉ nuôi được **hai** người pha. Chuẩn bị trước rút ngắn mỗi ly nhưng tốn nguyên liệu.', 'One machine feeds **two** baristas. Prepping shortens each cup but wastes some stock.')],
      mount(api) {
        const d = api.data;
        d.c = d.c || { baristas: 2, machines: 1, prep: 0 }; d.log = d.log || [];
        const chart = h('div', { class: 'histo', role: 'img' }), numbers = h('div', { class: 'stats' }), price = h('p', { class: 'big-n', 'aria-live': 'polite' }), log = h('table', { class: 'tries2' });
        const slider = (label, key, min, max, step, suffix) => { const out = h('output', {}, d.c[key] + suffix); const input = h('input', { type: 'range', 'data-k': key, min: String(min), max: String(max), step: String(step), value: String(d.c[key]), disabled: api.passed, oninput: (e) => { d.c[key] = Number(e.target.value); out.textContent = d.c[key] + suffix; price.textContent = money(cost(d.c)); price.className = 'big-n ' + (cost(d.c) > BUDGET ? 'bad' : ''); api.save(); } }); return h('label', { class: 'slider stacked' }, h('span', {}, T(label)), input, out); };
        const drawLog = () => log.replaceChildren(...(d.log.length ? [h('thead', {}, h('tr', {}, [O('Người', 'Staff'), O('Máy', 'Machines'), O('Chuẩn bị', 'Prep'), O('TB', 'Mean'), O('95%', '95%'), O('Tiền', 'Cost')].map((x) => h('th', {}, T(x))))), h('tbody', {}, d.log.map((x) => h('tr', {}, [x.baristas, x.machines, x.prep + '%', x.mean.toFixed(1) + '′'].map((v) => h('td', {}, String(v))), h('td', { class: x.p95 <= TARGET_P95 ? 'good' : 'bad' }, x.p95.toFixed(1) + '′'), h('td', { class: x.cost <= BUDGET ? 'good' : 'bad' }, money(x.cost)))))] : []));
        const run = () => {
          const r = simulate(d.c), bins = Array(16).fill(0);
          r.waits.forEach((w) => bins[Math.min(15, Math.floor(w / 2))]++);
          const top = Math.max(...bins);
          chart.replaceChildren(...bins.map((n, i) => h('i', { class: i * 2 >= TARGET_P95 ? 'over' : '', style: `height:${(n / top) * 100}%`, title: `${i * 2}–${i * 2 + 2}′: ${n}` }, h('small', {}, i % 2 ? '' : `${i * 2}′`))));
          chart.setAttribute('aria-label', `p95 ${r.p95.toFixed(1)}`);
          numbers.replaceChildren(...[[O('Chờ trung bình', 'Average wait'), r.mean.toFixed(1) + '′', ''], [O('95% khách chờ tối đa', '95% wait at most'), r.p95.toFixed(1) + '′', r.p95 <= TARGET_P95 ? 'good' : 'bad'], [O('Chi phí', 'Cost'), money(r.cost), r.cost <= BUDGET ? 'good' : 'bad']].map(([l, v, c]) => h('div', { class: 'stat ' + c }, h('small', {}, T(l)), h('b', {}, v))));
          d.log = [...d.log.filter((x) => !(x.baristas === d.c.baristas && x.machines === d.c.machines && x.prep === d.c.prep)), { ...d.c, mean: r.mean, p95: r.p95, cost: r.cost }].slice(-5);
          drawLog(); api.save();
        };
        price.textContent = money(cost(d.c));
        api.stage.append(head(O('200 buổi trưa mô phỏng, 26 khách mỗi giờ', '200 simulated lunches, 26 guests an hour')), chart, numbers, h('div', { class: 'table' }, log));
        api.ctl.replaceChildren(slider(O('Người pha', 'Baristas'), 'baristas', 1, 4, 1, ''), slider(O('Máy pha', 'Machines'), 'machines', 1, 3, 1, ''), slider(O('Chuẩn bị trước', 'Prepared ahead'), 'prep', 0, 60, 10, '%'), price);
        drawLog();
        api.say('linh', O('Trung bình đẹp mà vẫn có người chờ hai chục phút. Mình muốn **gần như ai** cũng được phục vụ kịp.', 'A nice average still leaves someone waiting twenty minutes. I want **almost everyone** served in time.'), 'think');
        if (!api.passed) api.actions(btn('▶ ' + T(O('Mô phỏng', 'Simulate')), run, ''), btn(T(O('Chốt phương án', 'Commit to it')), () => {
          run();
          if (capacityOk(d.c)) api.pass(O('Đủ người, đủ máy, không phí tiền. Còn cái app đặt món đang làm quầy rối.', 'Enough people and machines, no waste. That leaves the ordering app confusing the counter.'));
          else api.miss(cost(d.c) > BUDGET ? O('Vượt ngân sách. Tiền nào đang mua ít thời gian chờ nhất?', 'Over budget. Which spend buys the least waiting time?') : O('Vẫn quá **5%** khách chờ lâu hơn mục tiêu.', 'More than **5%** still wait beyond the target.'));
        }, 'primary'));
        else run();
      },
    },
    {
      short: O('Bản sửa', 'Release'), skill: O('Phụ thuộc và ưu tiên', 'Dependencies and priority'),
      goal: O(`Chọn và **xếp thứ tự** việc cho **${DAYS} ngày công**: đạt ít nhất **${VALUE} điểm giá trị**, việc cần trước phải làm trước.`, `Pick and **order** work for **${DAYS} days**: at least **${VALUE} value points**, prerequisites first.`),
      hints: [O('So **giá trị trên mỗi ngày**, nhưng nhớ vài việc chỉ làm được sau việc khác.', 'Compare **value per day**, remembering that some work can only follow other work.')],
      mount(api) {
        const d = api.data;
        d.plan = Array.isArray(d.plan) ? d.plan.filter((id) => TASKS[id]) : [];
        const backlog = h('div', { class: 'backlog' }), planBox = h('div', {}), meter = h('p', { class: 'big-n', 'aria-live': 'polite' });
        const draw = () => {
          const r = release(d.plan);
          backlog.replaceChildren(...Object.entries(TASKS).map(([id, t]) => h('button', { type: 'button', class: 'task', 'data-id': id, 'aria-pressed': String(d.plan.includes(id)), disabled: api.passed, onclick: () => { d.plan = d.plan.includes(id) ? d.plan.filter((x) => x !== id) : [...d.plan, id]; api.save(); draw(); } },
            h('b', {}, T(t.name)), h('small', {}, `${t.days} ${T(O('ngày', 'day(s)'))} · ${t.value} ${T(O('điểm', 'pts'))}${t.needs.length ? ' · ' + T(O('sau: ', 'after: ')) + t.needs.map((n) => T(TASKS[n].name)).join(', ') : ''}`))));
          planBox.replaceChildren(d.plan.length ? sortable(d.plan, (id) => h('span', {}, T(TASKS[id].name), r.early.includes(id) ? h('em', {}, ' ⚠ ' + T(O('làm quá sớm', 'too early'))) : null), () => { api.save(); draw(); }) : h('p', { class: 'empty' }, T(O('Chưa chọn việc nào.', 'Nothing picked yet.'))));
          meter.textContent = `${r.days}/${DAYS} ${T(O('ngày', 'days'))} · ${r.value}/${VALUE} ${T(O('điểm', 'pts'))}`;
          meter.className = 'big-n ' + (r.ok ? 'good' : r.days > DAYS ? 'bad' : '');
        };
        api.stage.append(head(O('Danh sách việc cần sửa', 'The fix list')), backlog, h('p', { class: 'lane-h' }, T(O('Thứ tự sẽ làm', 'Order of work'))), planBox, meter);
        api.say('linh', O('Một tuần, một người làm. Cái gì lên trước thì thứ Hai tới đỡ khổ nhất?', 'One week, one developer. What goes first to make next Monday bearable?'), 'think');
        draw();
        if (!api.passed) api.actions(btn(T(O('Chốt kế hoạch', 'Lock the plan')), () => {
          const r = release(d.plan);
          if (r.ok) api.pass(O('Đúng thứ tự, vừa năm ngày, giá trị cao nhất. Duyệt!', 'Right order, five days, the most value. Approved!'));
          else api.miss(r.days > DAYS ? O('Quá năm ngày công rồi.', 'That is more than five days.') : r.early.length ? O('Có việc đang đứng **trước** thứ nó cần.', 'Something sits **before** what it depends on.') : O(`Mới **${r.value} điểm**. Có tổ hợp đáng hơn trong cùng năm ngày.`, `Only **${r.value} points**. A better mix fits the same five days.`));
        }, 'primary'));
      },
    },
  ],
});
})();
