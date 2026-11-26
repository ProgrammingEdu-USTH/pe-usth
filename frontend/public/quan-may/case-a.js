/* Case A: Friday night, the drawer is short again. Investigation, SQL, time reasoning, binary search, permissions. */
(() => {
'use strict';
const QM = window.QuanMay;
const { S, h, btn, O, T, rich, money } = QM.lib;
const { rng, head, select, sortable } = QM.caseKit;

/* ---- stage 1: which three things on the scene actually bear on the loss? ---- */
const clues = (lost) => [
  { id: 'shift', real: true, name: O('Lịch ca', 'Shift sheet'), text: O('Tối thứ Sáu từ 18:00 có NV03 và NV05. Sau 20:00 chỉ NV03 có quyền thu ngân.', 'Friday from 18:00: NV03 and NV05. After 20:00 only NV03 may work the till.') },
  lost
    ? { id: 'tape', real: false, name: O('Cuộn hoá đơn', 'Receipt roll'), text: O('Phần in tối đó đã mất cùng lần xoá dữ liệu trước. Chỉ còn dòng tổng cuối ngày.', 'That evening’s print-out went with the earlier data deletion. Only the day total is left.') }
    : { id: 'tape', real: true, name: O('Cuộn hoá đơn', 'Receipt roll'), text: O('Sau 20:00 nhiều tờ in món 30.000₫ nhưng ô thực thu ghi 15.000₫, không in mã giảm nào.', 'After 20:00 many slips show a 30,000₫ drink with 15,000₫ collected and no discount code.') },
  { id: 'camera', real: true, name: O('Camera quầy', 'Counter camera'), text: O('20:00–22:00: khách đưa đủ giá niêm yết, người thu ngân bấm màn hình hai lần rồi mới mở két.', '20:00–22:00: guests hand over the listed price; the cashier taps twice before opening the drawer.') },
  { id: 'backup', real: lost, name: O('Bản sao lưu 23:00', '23:00 backup'), text: lost ? O('Bản sao lưu còn nguyên bảng đơn tối đó, gồm cả cột thực thu trước khi bị xoá.', 'The backup still holds that evening’s order table, including the collected column.') : O('Sao lưu chạy đúng 23:00 như mọi ngày, trạng thái “thành công”.', 'The backup ran at 23:00 as usual, status “success”.') },
  { id: 'ice', real: false, name: O('Giấy nhớ trên quầy', 'Note on the counter'), text: O('“Mua thêm đá, tủ đá hỏng từ trưa. Ai ca tối nhớ ghé tạp hoá.”', '“Buy more ice, the freezer died at noon. Evening shift, please pick some up.”') },
  { id: 'power', real: false, name: O('Hoá đơn tiền điện', 'Electricity bill'), text: O('Tiền điện tháng này tăng 12% so với tháng trước.', 'This month’s electricity is up 12% on last month.') },
  { id: 'review', real: false, name: O('Tin nhắn khách', 'Guest message'), text: O('“Tối thứ Sáu quán đông, mình chờ hơi lâu nhưng trà ngon.”', '“Busy Friday, a bit of a wait, but the tea was great.”') },
];

/* ---- stage 2: sixty orders, and one pattern hiding among honest discounts ---- */
const STAFF = ['NV01', 'NV02', 'NV03', 'NV04', 'NV05'];
function orders() {
  const r = rng(20261126), rows = [];
  const add = (ca, nv, kind) => {
    const gia = kind === 'manual' ? 30000 : [20000, 25000, 30000, 35000][Math.floor(r() * 4)];
    const daTra = kind === 'manual' ? gia - 15000 : kind === 'hssv' ? gia * 0.9 : gia;
    rows.push({ ca, nhan_vien: nv, gia, da_tra: daTra, ma_giam: kind === 'hssv' ? 'HSSV' : null });
  };
  for (let i = 0; i < 16; i++) add('toi', 'NV03', 'manual');
  /* damaged cups: honest manual discounts that a threshold has to leave out */
  add('toi', 'NV05', 'manual'); add('toi', 'NV05', 'manual'); add('chieu', 'NV01', 'manual');
  for (let i = 0; i < 12; i++) add(['sang', 'chieu', 'toi'][i % 3], STAFF[i % 5], 'hssv');
  for (let i = 0; i < 29; i++) add(['sang', 'chieu', 'toi'][i % 3], STAFF[(i * 3 + 1) % 5], 'full');
  return rows.map((row) => ({ row, k: r() })).sort((a, b) => a.k - b.k).map((x, i) => ({ id: 201 + i, ...x.row }));
}
const CONDITIONS = {
  '': null,
  'da_tra < gia': (x) => x.da_tra < x.gia,
  'da_tra = 0': (x) => x.da_tra === 0,
  'ma_giam IS NULL': (x) => x.ma_giam === null,
  'ma_giam IS NOT NULL': (x) => x.ma_giam !== null,
  "ca = 'toi'": (x) => x.ca === 'toi',
  "ca = 'sang'": (x) => x.ca === 'sang',
  'gia >= 30000': (x) => x.gia >= 30000,
};
const GROUPS = ['nhan_vien', 'ca', 'ma_giam'];
const HAVING = { '': null, 'COUNT(*) > 1': (g) => g.count > 1, 'COUNT(*) > 5': (g) => g.count > 5, 'COUNT(*) > 20': (g) => g.count > 20, 'SUM(gia - da_tra) > 20000': (g) => g.lost > 20000, 'SUM(gia - da_tra) > 300000': (g) => g.lost > 300000 };
function query(q) {
  const map = new Map();
  orders().filter((row) => q.where.every((w) => !CONDITIONS[w] || CONDITIONS[w](row))).forEach((row) => {
    const key = row[q.group] === null ? 'NULL' : row[q.group];
    const g = map.get(key) || { key, count: 0, lost: 0 };
    g.count++; g.lost += row.gia - row.da_tra; map.set(key, g);
  });
  return [...map.values()].filter((g) => !HAVING[q.having] || HAVING[q.having](g)).sort((a, b) => b.lost - a.lost);
}
const solved = (rows) => rows.length === 1 && rows[0].key === 'NV03' && rows[0].count === 16 && rows[0].lost === 240000;

/* ---- stage 3: put the night in order from relative times ---- */
const EVENTS = {
  open: { at: 1080, text: O('Két mở đầu ca tối lúc **18:00**.', 'The evening drawer opens at **18:00**.') },
  login: { at: 1085, text: O('NV03 đăng nhập **5 phút** sau khi két mở.', 'NV03 logs in **5 minutes** after the drawer opens.') },
  leave: { at: 1209, text: O('Quản lý rời quán **3 phút trước** lần giảm tay đầu tiên.', 'The manager leaves **3 minutes before** the first manual discount.') },
  first: { at: 1212, text: O('Lần giảm tay đầu tiên: **2 giờ 7 phút** sau khi NV03 đăng nhập.', 'First manual discount: **2 h 7 min** after NV03 logs in.') },
  camera: { at: 1230, text: O('Camera ghi cảnh bấm hai lần lúc **20:30**.', 'The camera shows the double tap at **20:30**.') },
  last: { at: 1332, text: O('Lần giảm tay cuối: **28 phút trước** khi đóng két.', 'Last manual discount: **28 minutes before** the drawer closes.') },
  close: { at: 1360, text: O('Đóng két lúc **22:40**.', 'The drawer closes at **22:40**.') },
};
const ordered = (ids) => ids.every((id, i) => !i || EVENTS[ids[i - 1]].at < EVENTS[id].at);

/* ---- stage 4: which of 64 till updates switched the manager check off? ---- */
const VERSIONS = 64, PROBES = 6;
const badVersion = (seed) => 2 + (Math.floor(rng(seed)() * (VERSIONS - 2)));

/* ---- stage 5: who may do what ---- */
const ACTIONS = [['view', O('Xem đơn', 'View orders')], ['code', O('Giảm theo mã', 'Apply a code')], ['manual', O('Giảm tay', 'Manual discount')], ['edit', O('Sửa mã giảm', 'Edit codes')], ['log', O('Xem nhật ký', 'Read the log')], ['erase', O('Xoá đơn', 'Delete orders')]];
const ROLES = [['cashier', O('Thu ngân', 'Cashier')], ['barista', O('Pha chế', 'Barista')], ['manager', O('Quản lý', 'Manager')], ['owner', O('Linh (chủ quán)', 'Linh (owner)')]];
const GRANTS = { cashier: ['view', 'code'], barista: ['view'], manager: ['view', 'code', 'manual', 'edit', 'log'], owner: ['view', 'log'] };
const wrongCells = (grid) => ROLES.flatMap(([r]) => ACTIONS.map(([a]) => `${r}:${a}`)).filter((cell) => { const [r, a] = cell.split(':'); return Boolean(grid[cell]) !== GRANTS[r].includes(a); });

QM.addCase({
  id: 'case-a', letter: 'A', needs: ['ep3', 'ep7'],
  title: O('Đêm thứ Sáu hụt két', 'The Friday night shortfall'), tag: O('Cơ sở dữ liệu · Giải thuật · An toàn', 'Databases · Algorithms · Security'),
  scene: { tidy: true, night: true, money: true }, after: { tidy: true, shield: true, queue: 3 },
  hook: O('Két tối thứ Sáu hụt **240.000₫**. Mã thử nghiệm đã tắt từ lâu, nên lần này là chuyện khác.', 'Friday’s drawer is **240,000₫** short. The test code was switched off long ago, so this is something else.'),
  brief: O('Lại hụt két: **240.000₫** trong một tối. Đừng đoán, tìm bằng chứng, rồi bịt cái lỗ đó giúp mình.', 'Short again: **240,000₫** in one evening. Do not guess. Find the evidence, then close the hole.'),
  closing: O('Có bằng chứng, biết nó bắt đầu từ bản cập nhật nào, và quyền đã được siết. Mình nói chuyện với bạn thu ngân bằng sự thật.', 'We have evidence, we know which update started it, and the permissions are tight. I can talk to the cashier with facts.'),
  consequences: [{ flag: 'evidenceLost', text: O('Bạn từng xoá đơn làm bằng chứng: cuộn hoá đơn không còn dùng được.', 'You once deleted evidence orders: the receipt roll is no use now.') }],
  learned: [
    O('Bằng chứng khác với **chi tiết nghe có lý**: chỉ giữ thứ liên quan tới khoản mất.', 'Evidence differs from **plausible detail**: keep only what bears on the loss.'),
    O('`WHERE` lọc hàng, `GROUP BY` gom, `HAVING` lọc **nhóm** để tách thói quen xấu khỏi ngoại lệ hợp lệ.', '`WHERE` filters rows, `GROUP BY` bundles, `HAVING` filters **groups**, separating a habit from honest exceptions.'),
    O('Tìm bản gây lỗi bằng **chia đôi**: 64 bản chỉ cần 6 lần thử.', 'Find the breaking change by **bisection**: 64 versions take 6 probes.'),
    O('**Quyền tối thiểu**: mỗi vai chỉ được đúng việc của mình, không ai xoá được dấu vết.', '**Least privilege**: each role gets only its job, and nobody can erase the trail.'),
  ],
  rules: { clues, orders, query, solved, EVENTS, ordered, badVersion, VERSIONS, PROBES, GRANTS, wrongCells, CONDITIONS, HAVING },
  stages: [
    {
      short: O('Hiện trường', 'The scene'), skill: O('Đọc và chọn bằng chứng', 'Read and select evidence'),
      goal: O('Mở từng món, rồi ghim **đúng ba** manh mối liên quan tới khoản tiền mất.', 'Open each item, then pin **exactly three** clues that bear on the missing money.'),
      hints: [O('Manh mối thật nói về **ai** đứng két, **tiền thu** lệch giá, hoặc **thao tác** trước khi mở két.', 'A real clue says **who** held the till, that **money collected** differs from price, or **what was done** before opening it.')],
      mount(api) {
        const list = clues(Boolean(S.flags.evidenceLost)), d = api.data;
        d.seen = d.seen || []; d.pins = d.pins || [];
        const grid = h('div', { class: 'clue-grid' }), pinned = h('p', { class: 'big-n', 'aria-live': 'polite' });
        const draw = () => {
          grid.replaceChildren(...list.map((c) => {
            const seen = d.seen.includes(c.id), on = d.pins.includes(c.id);
            return h('article', { class: 'clue' + (seen ? ' seen' : '') + (on ? ' on' : ''), 'data-id': c.id },
              h('b', {}, T(c.name)),
              seen ? h('p', {}, T(c.text)) : h('button', { type: 'button', class: 'btn', onclick: () => { d.seen.push(c.id); api.save(); draw(); } }, T(O('Mở xem', 'Look'))),
              seen ? h('button', { type: 'button', class: 'pin', 'aria-pressed': String(on), disabled: api.passed, onclick: () => { d.pins = on ? d.pins.filter((x) => x !== c.id) : [...d.pins, c.id]; api.save(); draw(); } }, on ? '📌 ' + T(O('Đã ghim', 'Pinned')) : T(O('Ghim', 'Pin'))) : null);
          }));
          pinned.textContent = `${d.pins.length}/3 📌`;
          if (!api.passed) api.actions(btn(T(O('Trình ba manh mối', 'Present the three')), () => {
            const right = d.pins.filter((id) => list.find((c) => c.id === id).real).length;
            if (d.pins.length === 3 && right === 3) api.pass(O('Ba thứ khớp nhau: ai đứng két, tiền thu lệch, và thao tác lạ. Giờ hỏi dữ liệu.', 'The three fit: who held the till, money that does not match, and an odd action. Now ask the data.'));
            else api.miss(O(d.pins.length !== 3 ? `Mình cần **đúng ba**, bạn đang ghim ${d.pins.length}.` : `Mới **${right}/3** manh mối có liên quan. Đọc lại xem cái nào giải thích được tiền mất.`, d.pins.length !== 3 ? `I need **exactly three**; you pinned ${d.pins.length}.` : `Only **${right}/3** bear on it. Which ones explain missing money?`));
          }, 'primary'));
        };
        api.stage.append(head(O('Bảy thứ nhặt được tối đó', 'Seven things from that night')), pinned, grid);
        api.say('ban', O('Phải đọc hết mới biết cái nào đáng ghim. Chi tiết hay chưa chắc là bằng chứng.', 'Read them all before pinning. An interesting detail is not necessarily evidence.'), 'think');
        draw();
      },
    },
    {
      short: O('Truy vấn', 'The query'), skill: O('SQL: WHERE, GROUP BY, HAVING', 'SQL: WHERE, GROUP BY, HAVING'),
      goal: O('Dựng truy vấn cho ra **đúng một dòng**: người có thói quen giảm tay, số lần và tổng tiền khớp khoản hụt.', 'Build a query returning **exactly one row**: the person with the manual-discount habit, count and total matching the loss.'),
      hints: [
        O('Giảm **tay** nghĩa là thu ít hơn giá mà **không có mã** nào.', 'A **manual** discount means collecting less than the price with **no code**.'),
        O('Vài lần giảm tay là hợp lệ (ly bị hỏng). `HAVING` lọc theo **số lần** của từng người.', 'A few manual discounts are honest (spilled cups). `HAVING` filters by each person’s **count**.'),
      ],
      mount(api) {
        const d = api.data;
        d.q = d.q || { where: ['', '', ''], group: 'nhan_vien', having: '' };
        const sql = h('pre', { class: 'code sql' }), out = h('div', { class: 'table' }), count = h('span', { class: 'count' });
        const text = () => { const w = d.q.where.filter(Boolean); return `SELECT ${d.q.group}, COUNT(*), SUM(gia - da_tra)\nFROM don_hang${w.length ? '\nWHERE ' + w.join('\n  AND ') : ''}\nGROUP BY ${d.q.group}${d.q.having ? '\nHAVING ' + d.q.having : ''};`; };
        const row = (cells, cls) => h('tr', { class: cls }, cells.map((c, i) => h(i === -1 ? 'th' : 'td', {}, c)));
        const run = () => {
          const rows = query(d.q);
          count.textContent = `${rows.length} ${T(O('dòng', 'rows'))}`;
          out.replaceChildren(h('table', { class: 'tries2' }, h('thead', {}, h('tr', {}, h('th', {}, d.q.group), h('th', {}, 'COUNT(*)'), h('th', {}, 'SUM(gia - da_tra)'))),
            h('tbody', {}, rows.length ? rows.map((g) => row([g.key, String(g.count), money(g.lost)])) : row([T(O('Không có dòng nào', 'No rows')), '', '']))));
          return rows;
        };
        const preview = () => { sql.textContent = text(); sql.classList.add('dirty'); api.save(); };
        const pick = (label, options, value, set) => h('label', { class: 'qrow' }, h('span', { class: 'kw' }, label), select(label, options, value, (v) => { set(v); preview(); }));
        api.stage.append(head(O('Bảng don_hang: 60 đơn, cột ca · nhan_vien · gia · da_tra · ma_giam', 'Table don_hang: 60 orders, columns ca · nhan_vien · gia · da_tra · ma_giam')), count, sql, out);
        api.ctl.replaceChildren(
          ...[0, 1, 2].map((i) => pick(i ? 'AND' : 'WHERE', Object.keys(CONDITIONS).map((k) => [k, k || '—']), d.q.where[i], (v) => { d.q.where[i] = v; })),
          pick('GROUP BY', GROUPS.map((g) => [g, g]), d.q.group, (v) => { d.q.group = v; }),
          pick('HAVING', Object.keys(HAVING).map((k) => [k, k || '—']), d.q.having, (v) => { d.q.having = v; }));
        sql.textContent = text(); run();
        api.say('linh', O('Trong 60 đơn có giảm giá đàng hoàng lẫn lộn. Mình cần câu truy vấn **chỉ còn đúng thủ phạm**.', 'Honest discounts are mixed into these 60 orders. I need a query that leaves **only the culprit**.'), 'think');
        if (!api.passed) api.actions(btn('▶ ' + T(O('Chạy truy vấn', 'Run query')), () => {
          sql.classList.remove('dirty');
          const rows = run();
          if (solved(rows)) api.pass(O('**NV03**, 16 lần, đúng **240.000₫**. Khớp từng đồng.', '**NV03**, 16 times, exactly **240,000₫**. It matches to the đồng.'));
          else if (!rows.length) api.miss(O('Không còn dòng nào: điều kiện chặt quá, hoặc hai điều kiện loại nhau.', 'No rows left: the conditions are too strict, or two of them exclude each other.'));
          else if (rows.length > 1) api.miss(O(`Còn **${rows.length} dòng**. Người vô can vẫn lọt vào kết quả.`, `Still **${rows.length} rows**. Innocent people remain in the result.`));
          else api.miss(O(`Một dòng, nhưng tổng **${money(rows[0].lost)}** không khớp 240.000₫: bạn đang đếm lẫn thứ khác, hoặc bỏ sót.`, `One row, but **${money(rows[0].lost)}** is not 240,000₫: something else is mixed in, or missing.`));
        }, 'primary'));
      },
    },
    {
      short: O('Dòng thời gian', 'Timeline'), skill: O('Suy luận mốc giờ', 'Reason about times'),
      goal: O('Xếp bảy sự kiện từ **sớm nhất đến muộn nhất**. Giờ của vài việc phải tự tính.', 'Order the seven events from **earliest to latest**. Some times you have to work out.'),
      hints: [O('Tính ra giờ tuyệt đối trước: két mở 18:00, đăng nhập 18:05, giảm tay đầu = đăng nhập + 2:07.', 'Work out clock times first: drawer 18:00, login 18:05, first discount = login + 2:07.')],
      mount(api) {
        const d = api.data;
        d.ids = Array.isArray(d.ids) && d.ids.length === 7 && d.ids.every((id) => EVENTS[id]) ? d.ids : ['camera', 'close', 'login', 'last', 'open', 'first', 'leave'];
        const list = sortable(d.ids, (id) => h('span', { html: rich(T(EVENTS[id].text)) }), () => api.save());
        api.stage.append(head(O('Dựng lại buổi tối', 'Rebuild the evening')), list);
        api.say('ban', O('Có dòng ghi giờ, có dòng chỉ ghi “trước” hay “sau” bao lâu. Mình tính ra rồi xếp.', 'Some lines give a time, others only how long before or after. Work them out, then order.'), 'think');
        if (!api.passed) api.actions(btn(T(O('Kiểm tra thứ tự', 'Check the order')), () => {
          if (ordered(d.ids)) api.pass(O('Quản lý vừa đi **3 phút** là giảm tay bắt đầu. Không phải ngẫu nhiên. Vậy sao máy cho phép?', 'Manual discounts start **3 minutes** after the manager leaves. No coincidence. Why does the till allow it?'));
          else { const right = d.ids.filter((id, i) => i && EVENTS[d.ids[i - 1]].at < EVENTS[id].at).length; api.miss(O(`Mới **${right}/6** cặp liền nhau đúng thứ tự.`, `Only **${right}/6** neighbouring pairs are in order.`)); }
        }, 'primary'));
      },
    },
    {
      short: O('Bản cập nhật', 'The update'), skill: O('Tìm kiếm nhị phân', 'Binary search'),
      goal: O(`Máy tính tiền có **${VERSIONS} bản cập nhật**. Tìm **bản đầu tiên** bỏ yêu cầu quản lý duyệt giảm tay, chỉ được thử **${PROBES} lần**.`, `The till has **${VERSIONS} updates**. Find the **first one** that dropped the manager check, with only **${PROBES} probes**.`),
      hints: [O('Thử bản **ở giữa** khoảng còn nghi. Còn kiểm tra → lỗi đến sau; mất kiểm tra → lỗi ở đó hoặc trước đó.', 'Probe the **middle** of the suspect range. Check present: the break is later. Check gone: there or earlier.')],
      mount(api) {
        const d = api.data;
        if (!d.bad) { d.bad = badVersion(api.seed); d.probes = []; d.pick = ''; }
        const grid = h('div', { class: 'bisect' }), left = h('p', { class: 'big-n', 'aria-live': 'polite' });
        const draw = () => {
          const lo = Math.max(1, ...d.probes.filter((v) => v < d.bad).map((v) => v + 1)), hi = Math.min(VERSIONS, ...d.probes.filter((v) => v >= d.bad));
          left.textContent = `${PROBES - d.probes.length} ${T(O('lần thử còn lại', 'probes left'))}`;
          grid.replaceChildren(...Array.from({ length: VERSIONS }, (_, i) => {
            const v = i + 1, tried = d.probes.includes(v);
            return h('button', { type: 'button', class: 'ver' + (tried ? (v < d.bad ? ' good' : ' bad') : '') + (v < lo || v > hi ? ' out' : ''), 'data-v': String(v), disabled: api.passed || tried || d.probes.length >= PROBES, 'aria-label': `v${v}`, onclick: () => { d.probes.push(v); api.save(); api.say('ban', v < d.bad ? O(`Bản ${v}: **vẫn đòi** quản lý duyệt.`, `v${v}: still **asks** for the manager.`) : O(`Bản ${v}: **không còn** đòi duyệt.`, `v${v}: **no longer** asks.`), 'think'); draw(); } }, String(v));
          }));
          if (!api.passed) {
            const answer = h('input', { type: 'number', min: '1', max: String(VERSIONS), value: d.pick, 'aria-label': T(O('Bản gây lỗi', 'Breaking version')), oninput: (e) => { d.pick = e.target.value; api.save(); } });
            api.ctl.replaceChildren(h('label', { class: 'ipf' }, h('span', {}, T(O('Bản đầu tiên bị lỗi là bản số', 'The first broken version is number'))), answer));
            api.actions(btn(T(O('Kết luận', 'Conclude')), () => {
              if (Number(d.pick) === d.bad) api.pass(O(`Bản **${d.bad}**: ai đó “dọn code” và xoá luôn dòng kiểm tra quyền.`, `Version **${d.bad}**: someone “tidied up” and removed the permission check.`));
              else { api.miss(O(`Không phải bản ${d.pick || '?'}. Quán hoàn tác để dò lại: lỗi nằm ở **một bản khác** lần này.`, `Not v${d.pick || '?'}. The till is rolled back for another search: the break sits at a **new place**.`)); d.bad = badVersion(api.seed + api.run.miss * 7919); d.probes = []; d.pick = ''; api.save(); draw(); }
            }, 'primary'));
          }
        };
        api.stage.append(head(O('Lịch sử cập nhật máy tính tiền', 'Till update history')), left, grid);
        api.say('linh', O('Thử từng bản thì hết đêm. Mỗi lần thử mất mười phút, mình chỉ cho sáu lần.', 'Trying them one by one takes all night. Each probe takes ten minutes; you get six.'), 'worry');
        draw();
      },
    },
    {
      short: O('Siết quyền', 'Permissions'), skill: O('Quyền tối thiểu', 'Least privilege'),
      goal: O('Cấp quyền sao cho **ai làm được đúng việc của mình, không hơn**.', 'Grant permissions so **each person can do their job and nothing more**.'),
      hints: [
        O('Không vai nào cần **xoá đơn**: sửa sai bằng đơn điều chỉnh, giữ nguyên dấu vết.', 'No role needs to **delete orders**: corrections are new entries, so the trail stays.'),
        O('Linh chỉ giám sát: **xem đơn** và **xem nhật ký**. Quản lý mới được giảm tay và sửa mã.', 'Linh only oversees: **view** and **read the log**. Only the manager discounts by hand and edits codes.'),
      ],
      mount(api) {
        const d = api.data;
        d.grid = d.grid || Object.fromEntries(ROLES.flatMap(([r]) => ACTIONS.map(([a]) => [`${r}:${a}`, true])));
        const table = h('table', { class: 'tries2 perm' });
        const draw = () => table.replaceChildren(h('thead', {}, h('tr', {}, h('th', {}), ROLES.map(([, n]) => h('th', {}, T(n))))),
          h('tbody', {}, ACTIONS.map(([a, name]) => h('tr', {}, h('th', {}, T(name)), ROLES.map(([r, role]) => { const cell = `${r}:${a}`; return h('td', {}, h('button', { type: 'button', class: 'toggle', role: 'switch', 'data-cell': cell, 'aria-checked': String(Boolean(d.grid[cell])), 'aria-label': `${T(role)}: ${T(name)}`, disabled: api.passed, onclick: () => { d.grid[cell] = !d.grid[cell]; api.save(); draw(); } }, d.grid[cell] ? '✓' : '—')); })))));
        api.stage.append(head(O('Ma trận quyền: hiện ai cũng làm được mọi thứ', 'Permission matrix: right now everyone can do everything')), h('div', { class: 'table' }, table),
          h('ul', { class: 'rules-list' }, [
            O('Thu ngân bán hàng và áp mã khuyến mãi.', 'Cashiers sell and apply promo codes.'), O('Pha chế chỉ cần biết phải pha gì.', 'Baristas only need to know what to make.'),
            O('Quản lý xử lý ngoại lệ, quản mã giảm và đối chiếu nhật ký.', 'The manager handles exceptions, manages codes and checks the log.'), O('Linh giám sát quán, không đứng quầy.', 'Linh oversees the shop and does not work the counter.'),
            O('Nhật ký và đơn hàng phải còn đó để đối chiếu.', 'Orders and the log must remain for checking.')].map((x) => h('li', {}, T(x)))));
        draw();
        api.say('linh', O('Siết lại đi. Nhưng siết quá tay thì sáng mai quán không bán được.', 'Tighten it up. But too tight and we cannot sell tomorrow.'), 'think');
        if (!api.passed) api.actions(btn(T(O('Áp dụng phân quyền', 'Apply the permissions')), () => {
          const wrong = wrongCells(d.grid);
          if (!wrong.length) api.pass(O('Đúng vai, đủ việc. Từ giờ muốn giảm tay phải có quản lý.', 'Right roles, enough rights. A manual discount now needs the manager.'));
          else api.miss(O(`Còn **${wrong.length} ô** chưa đúng. Đọc lại việc của từng người.`, `**${wrong.length} cells** are still wrong. Reread what each person does.`));
        }, 'primary'));
      },
    },
  ],
});
})();
