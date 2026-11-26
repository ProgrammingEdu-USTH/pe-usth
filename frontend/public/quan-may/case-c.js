/* Case C: strangers on the shop network. Subnetting by hand, ordered firewall rules,
   reading a log, and writing a detection rule that still works on a week it never saw. */
(() => {
'use strict';
const QM = window.QuanMay;
const { S, h, btn, O, T } = QM.lib;
const { head, sortable } = QM.caseKit;

/* ---------- stage 1: four subnets inside one /24 ---------- */
const SEGMENTS = [['guest', O('Wifi khách', 'Guest wifi'), 50], ['camera', O('Camera', 'Cameras'), 12], ['staff', O('Nhân viên', 'Staff'), 6], ['till', O('Máy quầy', 'Till'), 2]];
function subnet(base, prefix) {
  const b = Number(base), p = Number(prefix);
  if (base === '' || prefix === '' || !Number.isInteger(b) || !Number.isInteger(p) || p < 24 || p > 30 || b < 0 || b > 255) return null;
  const size = 2 ** (32 - p);
  return { base: b, prefix: p, size, hosts: size - 2, aligned: b % size === 0, end: b + size - 1 };
}
function checkPlan(plan) {
  const nets = SEGMENTS.map(([id, , need]) => ({ id, need, net: subnet(plan[id] ? plan[id].base : '', plan[id] ? plan[id].prefix : '') }));
  return nets.map((x) => {
    let problem = null;
    if (!x.net) problem = 'empty';
    else if (!x.net.aligned) problem = 'align';
    else if (x.net.end > 255) problem = 'outside';
    else if (x.net.hosts < x.need) problem = 'small';
    else if (nets.some((y) => y !== x && y.net && x.net.base <= y.net.end && y.net.base <= x.net.end)) problem = 'overlap';
    return { ...x, problem };
  });
}
const PROBLEMS = {
  empty: O('Chưa điền, hoặc prefix không nằm trong 24–30', 'Missing, or the prefix is outside 24–30'), align: O('Địa chỉ đầu không rơi đúng biên của khối', 'The first address is not on a block boundary'),
  outside: O('Tràn khỏi 192.168.10.0/24', 'Spills out of 192.168.10.0/24'), small: O('Không đủ chỗ cho số máy', 'Not enough room for the hosts'), overlap: O('Đè lên mạng con khác', 'Overlaps another subnet'),
};

/* ---------- stage 2: first matching rule wins ---------- */
const RULES = {
  web: { src: 'guest', dst: '*', port: 443, text: 'guest → any : 443' },
  guestTill: { src: 'guest', dst: 'till', port: '*', text: 'guest → till : any' },
  staff: { src: 'staff', dst: 'till', port: 443, text: 'staff → till : 443' },
  camera: { src: 'camera', dst: 'internet', port: '*', text: 'camera → internet : any' },
  pay: { src: 'till', dst: 'bank', port: 443, text: 'till → bank : 443' },
  all: { src: '*', dst: '*', port: '*', text: 'any → any : any' },
};
const P = (src, dst, port, allow, why) => ({ src, dst, port, allow, why });
const PACKETS = [
  P('guest', 'internet', 443, true, O('khách lướt web', 'a guest browsing')), P('guest', 'till', 443, false, O('khách chạm máy quầy', 'a guest reaching the till')), P('guest', 'till', 22, false, O('khách dò cổng quản trị', 'a guest probing the admin port')),
  P('guest', 'internet', 25, false, O('gửi thư rác qua wifi quán', 'spam through the shop wifi')), P('staff', 'till', 443, true, O('nhân viên mở phần bán hàng', 'staff opening the sales app')), P('staff', 'till', 23, false, O('telnet vào máy quầy', 'telnet into the till')),
  P('camera', 'internet', 443, false, O('camera tự gửi hình ra ngoài', 'a camera sending video out')), P('till', 'bank', 443, true, O('thanh toán', 'a payment')), P('unknown', 'till', 443, false, O('máy lạ', 'an unknown machine')),
];
const match = (r, p) => (r.src === '*' || r.src === p.src) && (r.dst === '*' || r.dst === p.dst) && (r.port === '*' || r.port === p.port);
/* order: rule ids; allow: id -> boolean; anything unmatched is dropped */
function firewall(order, allow, p) { const id = order.find((r) => match(RULES[r], p)); return id ? { rule: id, allowed: Boolean(allow[id]) } : { rule: null, allowed: false }; }
const firewallOk = (order, allow) => PACKETS.every((p) => firewall(order, allow, p).allowed === p.allow);

/* ---------- stage 3: which lines of the log are an attack? ---------- */
const L = (t, src, text, bad) => ({ t, src, text, bad });
function logLines(shared, hidden) {
  const lines = [
    L('01:02', '10.0.0.7', 'LOGIN FAIL admin', true), L('01:02', '10.0.0.7', 'LOGIN FAIL admin', true), L('01:03', '10.0.0.7', 'LOGIN FAIL admin', true), L('01:03', '10.0.0.7', 'LOGIN OK admin', true),
    L('01:20', '192.168.10.66', 'LOGIN FAIL linh', false), L('01:20', '192.168.10.66', 'LOGIN OK linh', false),
    L('02:00', '192.168.10.2', hidden ? 'COPY don_hang → disk' : 'COPY don_hang → disk (backup job)', false),
    L('02:14', '45.9.1.12', 'LOGIN FAIL an', true), L('02:31', '45.9.1.12', 'LOGIN FAIL binh', true), L('02:48', '45.9.1.12', 'LOGIN FAIL chi', true), L('03:05', '45.9.1.12', 'LOGIN FAIL dung', true),
    L('07:45', '192.168.10.66', 'LOGIN OK linh', false), L('09:10', '192.168.10.71', 'ORDER note="cho bạn K\'Brim"', false),
    L('09:32', '192.168.10.90', 'ORDER note="x\', 0) --"', true), L('11:58', '192.168.10.71', 'ORDER note="ít đá"', false),
    L('14:20', '192.168.10.2', 'GET /report 200', false), L('23:50', '10.0.0.7', 'GET /admin/export 200', true), L('23:55', '192.168.10.66', 'LOGOUT linh', false),
  ];
  if (shared) lines.splice(13, 0, L('09:20', '192.168.10.99', 'CONNECT till:22', true), L('09:20', '192.168.10.99', 'CONNECT till:23', true), L('09:21', '192.168.10.99', 'CONNECT till:3389', true));
  return lines;
}
function grade(lines, marked) {
  const hit = marked.filter((i) => lines[i] && lines[i].bad).length, bad = lines.filter((l) => l.bad).length;
  const precision = marked.length ? hit / marked.length : 0, recall = bad ? hit / bad : 0;
  return { precision, recall, ok: precision >= 0.9 && recall >= 0.9 };
}

/* ---------- stage 4: a rule that survives a new week ---------- */
const FIELDS = { fails: O('số lần đăng nhập sai', 'failed logins'), users: O('số tài khoản bị thử', 'usernames tried'), night: O('hoạt động ban đêm (0/1)', 'active at night (0/1)'), after: O('vào được sau khi sai (0/1)', 'got in after failing (0/1)') };
/* one row per source address and night */
const row = (bad, fails, users, night, after) => ({ bad, fails, users, night, after });
const TRAIN = [
  row(1, 40, 1, 1, 0), row(1, 33, 2, 1, 0), row(1, 55, 1, 0, 1), row(1, 31, 3, 1, 0), row(1, 7, 7, 1, 0), row(1, 18, 1, 1, 1), row(1, 9, 8, 0, 0), row(1, 36, 2, 1, 0),
  row(0, 2, 1, 1, 1), row(0, 1, 1, 0, 1), row(0, 4, 1, 0, 1), row(0, 3, 2, 1, 0), row(0, 6, 1, 0, 1), row(0, 0, 1, 1, 0), row(0, 8, 1, 0, 1), row(0, 5, 2, 0, 1), row(0, 2, 1, 1, 0), row(0, 1, 2, 0, 0),
];
/* next week the attackers are slower and quieter */
const TEST = [
  row(1, 14, 1, 1, 0), row(1, 22, 2, 1, 1), row(1, 6, 6, 1, 0), row(1, 12, 1, 0, 0), row(1, 8, 5, 0, 0), row(1, 5, 4, 1, 0), row(1, 19, 1, 1, 0), row(1, 41, 1, 1, 0), row(1, 16, 3, 0, 1), row(1, 7, 7, 1, 0),
  row(0, 2, 1, 0, 1), row(0, 9, 1, 0, 1), row(0, 3, 2, 1, 1), row(0, 1, 1, 1, 0), row(0, 7, 1, 0, 1), row(0, 4, 3, 0, 1), row(0, 0, 1, 1, 0), row(0, 5, 1, 1, 0), row(0, 11, 2, 0, 1), row(0, 2, 2, 0, 0), row(0, 6, 1, 1, 1),
];
const ruleHits = (rule, x) => { const a = x[rule.a.field] >= rule.a.value, b = rule.join ? x[rule.b.field] >= rule.b.value : false; return rule.join === 'AND' ? a && b : rule.join === 'OR' ? a || b : a; };
function measure(rule, set) { const hit = set.map((x) => ruleHits(rule, x)); return { caught: set.filter((x, i) => x.bad && hit[i]).length, total: set.filter((x) => x.bad).length, fp: set.filter((x, i) => !x.bad && hit[i]).length, hit }; }
const ruleOk = (rule) => { const r = measure(rule, TEST); return r.caught >= 9 && r.fp <= 2; };

QM.addCase({
  id: 'case-c', letter: 'C', needs: ['ep6', 'ep8', 'ep9'],
  title: O('Kẻ lạ trong mạng quán', 'A stranger on the shop network'), tag: O('Mạng máy tính · An toàn Web · Phát hiện xâm nhập', 'Networks · Web security · Intrusion detection'),
  scene: { tidy: true, night: true, wifi: 'on', badge: '?' }, after: { tidy: true, night: true, wifi: 'on', shield: true },
  hook: O('Ba đêm liền hệ thống bị gõ cửa. Dựng lại mạng quán cho kín, rồi tìm xem ai đã vào.', 'Three nights of knocking at the system. Rebuild the network so it is tight, then find who got in.'),
  brief: O('Có người đang mò trong mạng của quán. Chia lại mạng, chặn cửa, đọc nhật ký, rồi đặt chuông cho tuần tới.', 'Someone is poking around our network. Split it, close the doors, read the log, then arm next week’s alarm.'),
  closing: O('Mạng chia ngăn, cửa có luật, biết ai đã làm gì, và chuông vẫn kêu đúng với kiểu tấn công chưa từng gặp.', 'The network is segmented, the doors have rules, we know who did what, and the alarm holds against attacks it never saw.'),
  consequences: [
    { flag: 'sharedWifi', text: O('Khách từng dùng chung wifi quầy: nhật ký có thêm một máy lạ ngay trong mạng.', 'Guests once shared the counter wifi: the log has an extra stranger inside the network.') },
    { flag: 'unreported', text: O('Sự cố trước không được ghi lại: nhật ký thiếu chú thích tác vụ.', 'The last incident was never written up: the log lacks job notes.') },
  ],
  learned: [
    O('Chia mạng con theo **số máy**: khối lớn trước, địa chỉ đầu phải đúng biên.', 'Size subnets by **host count**: largest first, each starting on a block boundary.'),
    O('Tường lửa lấy **luật khớp đầu tiên**; luật chặn hẹp phải đứng trước luật cho phép rộng.', 'A firewall takes the **first match**; a narrow deny must precede a broad allow.'),
    O('Đọc nhật ký theo **chuỗi hành vi** của một nguồn, không theo từng dòng lẻ.', 'Read a log as **one source’s sequence** of actions, not line by line.'),
    O('Luật khớp khít dữ liệu cũ thường **học vẹt**; phải thử trên dữ liệu mới.', 'A rule that hugs old data is often **overfitted**; test it on new data.'),
  ],
  rules: { SEGMENTS, subnet, checkPlan, RULES, PACKETS, firewall, firewallOk, logLines, grade, TRAIN, TEST, measure, ruleOk },
  stages: [
    {
      short: O('Chia mạng', 'Subnets'), skill: O('Địa chỉ và prefix', 'Addresses and prefixes'),
      goal: O('Chia `192.168.10.0/24` thành bốn mạng con **đủ chỗ, đúng biên, không đè nhau**.', 'Split `192.168.10.0/24` into four subnets that are **big enough, aligned and not overlapping**.'),
      hints: [
        O('Prefix `/p` cho 2^(32−p) địa chỉ, trừ 2 địa chỉ mạng và quảng bá. 50 máy cần khối 64, tức `/26`.', 'A `/p` gives 2^(32−p) addresses, minus network and broadcast. 50 hosts need a block of 64: `/26`.'),
        O('Xếp khối lớn trước từ 0. Khối cỡ n chỉ được bắt đầu ở bội số của n.', 'Place the largest block first at 0. A block of size n may only start at a multiple of n.'),
      ],
      mount(api) {
        const d = api.data;
        d.plan = d.plan && typeof d.plan === 'object' ? d.plan : {};
        SEGMENTS.forEach(([id]) => { d.plan[id] = d.plan[id] || { base: '', prefix: '' }; });
        const bar = h('div', { class: 'ipbar', role: 'img' }), table = h('table', { class: 'tries2 nets' }), cells = {};
        const draw = (verdict) => {
          const nets = checkPlan(d.plan);
          bar.replaceChildren(...nets.filter((x) => x.net && x.net.end <= 255).map((x) => h('i', { class: 'seg-' + x.id, style: `left:${(x.net.base / 256) * 100}%;width:${(x.net.size / 256) * 100}%`, title: x.id }, x.net.size >= 32 ? h('small', {}, x.id) : null)));
          nets.forEach((x) => { cells[x.id].range.textContent = x.net ? `.${x.net.base} – .${Math.min(x.net.end, 999)} · ${x.net.hosts} ${T(O('máy', 'hosts'))}` : '—'; cells[x.id].state.textContent = verdict ? (x.problem ? '✕ ' + T(PROBLEMS[x.problem]) : '✓') : ''; cells[x.id].state.className = x.problem ? 'bad' : 'good'; });
          bar.setAttribute('aria-label', nets.map((x) => (x.net ? `${x.id} .${x.net.base}/${x.net.prefix}` : x.id)).join(', '));
        };
        const field = (id, key, label, max) => h('input', { type: 'number', min: '0', max: String(max), value: d.plan[id][key], 'data-net': `${id}-${key}`, 'aria-label': `${label} ${id}`, disabled: api.passed, oninput: (e) => { d.plan[id][key] = e.target.value; api.save(); draw(false); } });
        table.append(h('thead', {}, h('tr', {}, [O('Mạng', 'Segment'), O('Cần', 'Needs'), O('Bắt đầu 192.168.10.', 'Starts 192.168.10.'), O('Prefix /', 'Prefix /'), O('Dải', 'Range'), O('Kiểm', 'Check')].map((x) => h('th', {}, T(x))))),
          h('tbody', {}, SEGMENTS.map(([id, name, need]) => { cells[id] = { range: h('td', {}), state: h('td', {}) }; return h('tr', {}, h('td', {}, T(name)), h('td', {}, String(need)), h('td', {}, field(id, 'base', 'base', 255)), h('td', {}, field(id, 'prefix', 'prefix', 30)), cells[id].range, cells[id].state); })));
        api.stage.append(head(O('256 địa chỉ, bốn ngăn', '256 addresses, four compartments')), bar, h('div', { class: 'table' }, table));
        api.say('ban', O('Gõ địa chỉ đầu và prefix cho từng ngăn. Thanh phía trên cho thấy mỗi ngăn chiếm đâu.', 'Type the first address and prefix for each. The bar shows where each one sits.'), 'think');
        draw(api.passed);
        if (!api.passed) api.actions(btn(T(O('Cấu hình mạng', 'Apply the network')), () => {
          const bad = checkPlan(d.plan).filter((x) => x.problem);
          draw(true);
          if (!bad.length) api.pass(O('Khách, camera, nhân viên, máy quầy: mỗi nhóm một ngăn. Giờ đặt luật qua lại.', 'Guests, cameras, staff and till each have a compartment. Now set the rules between them.'));
          else api.miss(O(`**${bad.length} mạng** chưa ổn. Cột “Kiểm” nói vì sao.`, `**${bad.length} segments** are wrong. The check column says why.`));
        }, 'primary'));
      },
    },
    {
      short: O('Tường lửa', 'Firewall'), skill: O('Thứ tự luật', 'Rule order'),
      goal: O('Chọn **cho/chặn** và **thứ tự** sáu luật để cả chín gói được xử đúng. Gói không khớp luật nào bị bỏ.', 'Set **allow/deny** and the **order** of six rules so all nine packets are handled right. Unmatched packets are dropped.'),
      hints: [O('Luật khớp **đầu tiên** quyết định. Luật “khách → mọi nơi : 443” cũng khớp gói khách vào máy quầy.', 'The **first** match decides. “guest → any : 443” also matches a guest heading for the till.')],
      mount(api) {
        const d = api.data;
        d.order = Array.isArray(d.order) && d.order.length === 6 && d.order.every((id) => RULES[id]) ? d.order : ['all', 'web', 'staff', 'camera', 'guestTill', 'pay'];
        d.allow = d.allow || { all: true, web: true, staff: true, camera: true, guestTill: true, pay: true };
        const rows = h('tbody'), holder = h('div', {});
        const drawRules = () => holder.replaceChildren(sortable(d.order, (id) => h('span', { class: 'rule' }, h('code', {}, RULES[id].text), h('button', { type: 'button', class: 'toggle wide', role: 'switch', 'data-rule': id, 'aria-checked': String(Boolean(d.allow[id])), disabled: api.passed, onclick: () => { d.allow[id] = !d.allow[id]; api.save(); drawRules(); clear(); } }, d.allow[id] ? T(O('CHO', 'ALLOW')) : T(O('CHẶN', 'DENY')))), () => { api.save(); clear(); }));
        const clear = (show) => rows.replaceChildren(...PACKETS.map((p) => { const r = show ? firewall(d.order, d.allow, p) : null, ok = r && r.allowed === p.allow; return h('tr', {}, h('td', {}, h('code', {}, `${p.src} → ${p.dst} : ${p.port}`)), h('td', {}, T(p.why)), h('td', {}, T(p.allow ? O('phải qua', 'must pass') : O('phải chặn', 'must drop'))), h('td', { class: r ? (ok ? 'good' : 'bad') : '' }, r ? `${ok ? '✓' : '✕'} ${r.allowed ? T(O('qua', 'passed')) : T(O('chặn', 'dropped'))}` : '…')); }));
        api.stage.append(head(O('Luật từ trên xuống', 'Rules, top down')), holder, h('div', { class: 'table' }, h('table', { class: 'tries2 tests' }, rows)));
        api.say('linh', O('Hiện giờ cái gì cũng lọt. Đừng chặn luôn cả khách trả tiền nha.', 'Right now everything gets through. Do not block paying guests while you are at it.'), 'worry');
        drawRules(); clear(api.passed);
        if (!api.passed) api.actions(btn('▶ ' + T(O('Bắn chín gói thử', 'Send the nine packets')), () => {
          clear(true);
          const wrong = PACKETS.filter((p) => firewall(d.order, d.allow, p).allowed !== p.allow).length;
          if (!wrong) api.pass(O('Chín trên chín. Cửa đã đúng luật. Giờ xem đêm qua ai đã qua cửa.', 'Nine out of nine. The doors obey. Now let us see who came through last night.'));
          else api.miss(O(`**${wrong} gói** bị xử sai. Nhìn xem luật nào bắt chúng trước.`, `**${wrong} packets** are mishandled. See which rule catches them first.`));
        }, 'primary'));
      },
    },
    {
      short: O('Nhật ký', 'The log'), skill: O('Độ chính xác và độ phủ', 'Precision and recall'),
      goal: O('Đánh dấu các dòng **thuộc một cuộc tấn công**. Cần đúng ít nhất **90%** số dòng bạn đánh, và bắt được ít nhất **90%** số dòng thật.', 'Mark the lines that **belong to an attack**. At least **90%** of your marks must be right, catching at least **90%** of real ones.'),
      hints: [
        O('Theo từng địa chỉ: nguồn nào thử **nhiều tài khoản**, hoặc sai liên tiếp rồi **vào được** và lấy dữ liệu?', 'Follow each address: which one tries **many usernames**, or fails repeatedly, **gets in** and takes data?'),
        O('Một lần gõ sai rồi vào được từ máy quen là người thật. Dấu nháy trong tên khách cũng vậy.', 'One typo followed by success from a familiar machine is a real person. So is a quote in a guest’s name.'),
      ],
      mount(api) {
        const d = api.data, lines = logLines(Boolean(S.flags.sharedWifi), Boolean(S.flags.unreported));
        d.marked = Array.isArray(d.marked) ? d.marked.filter((i) => i < lines.length) : [];
        const list = h('ol', { class: 'log' }), score = h('p', { class: 'big-n', 'aria-live': 'polite' });
        const draw = () => list.replaceChildren(...lines.map((l, i) => h('li', {}, h('button', { type: 'button', class: 'logline', 'data-i': String(i), 'aria-pressed': String(d.marked.includes(i)), disabled: api.passed, onclick: () => { d.marked = d.marked.includes(i) ? d.marked.filter((x) => x !== i) : [...d.marked, i]; api.save(); score.textContent = ''; draw(); } }, h('time', {}, l.t), h('b', {}, l.src), h('span', {}, l.text)))));
        api.stage.append(head(O('Nhật ký đêm qua và sáng nay', 'Last night’s and this morning’s log'), `${lines.length}`), score, list);
        api.say('ban', O('Đánh dấu nhiều quá thì oan người ngay, ít quá thì lọt kẻ gian. Cả hai con số đều tính.', 'Mark too much and you accuse the innocent; too little and attackers slip by. Both numbers count.'), 'think');
        draw();
        if (!api.passed) api.actions(btn(T(O('Nộp danh sách', 'Submit the list')), () => {
          const g = grade(lines, d.marked), pct = (x) => Math.round(x * 100) + '%';
          score.textContent = `${T(O('Đánh đúng', 'Precision'))} ${pct(g.precision)} · ${T(O('Bắt được', 'Recall'))} ${pct(g.recall)}`;
          score.className = 'big-n ' + (g.ok ? 'good' : 'bad');
          if (g.ok) api.pass(O('Rõ ba mũi: dò admin rồi tải dữ liệu, thử tên rải rác trong đêm, và chèn lệnh vào ghi chú.', 'Three moves are clear: guessing admin then exporting data, trying names through the night, and injecting through a note.'));
          else api.miss(g.precision < 0.9 ? O('Bạn đang buộc tội oan. Xem lại từng nguồn.', 'You are accusing innocent lines. Check each source again.') : O('Còn dòng tấn công lọt lưới. Theo hết hành trình của từng địa chỉ.', 'Attack lines are slipping through. Follow each address to the end.'));
        }, 'primary'));
      },
    },
    {
      short: O('Chuông mới', 'New alarm'), skill: O('Khái quát hoá', 'Generalisation'),
      goal: O('Viết luật từ dữ liệu **tuần này** sao cho trên **tuần sau (chưa thấy)** bắt ít nhất **9/10**, báo nhầm không quá **2**.', 'Write a rule from **this week** that on **next week (unseen)** catches at least **9 of 10** with no more than **2** false alarms.'),
      hints: [
        O('Ngưỡng khớp khít tuần này sẽ bỏ sót kẻ đi chậm hơn. Chừa khoảng rộng giữa người thường và kẻ gian.', 'A threshold hugging this week misses slower attackers. Leave a margin between ordinary users and intruders.'),
        O('Hai dấu hiệu nối bằng **OR**: sai nhiều lần, hoặc thử nhiều tài khoản.', 'Two signals joined by **OR**: many failures, or many usernames.'),
      ],
      mount(api) {
        const d = api.data;
        d.rule = d.rule || { a: { field: 'fails', value: 30 }, join: '', b: { field: 'users', value: 5 } };
        const now = h('div', { class: 'stats' }), later = h('div', { class: 'stats' }), table = h('table', { class: 'tries2' }), code = h('pre', { class: 'code' });
        const stats = (box, r) => box.replaceChildren(h('div', { class: 'stat' }, h('small', {}, T(O('Bắt được', 'Caught'))), h('b', {}, `${r.caught}/${r.total}`)), h('div', { class: 'stat' }, h('small', {}, T(O('Báo nhầm', 'False alarms'))), h('b', {}, String(r.fp))));
        const draw = (tested) => {
          const R = d.rule, part = (x) => `${x.field} >= ${x.value}`;
          code.textContent = `alert if ${part(R.a)}${R.join ? `\n   ${R.join.toLowerCase()} ${part(R.b)}` : ''}`;
          const train = measure(R, TRAIN);
          stats(now, train);
          if (tested) stats(later, measure(R, TEST)); else later.replaceChildren(h('p', { class: 'hint9' }, T(O('Tuần sau chưa tới. Chỉ biết khi bạn áp luật.', 'Next week has not happened. You learn only when you deploy.'))));
          table.replaceChildren(h('thead', {}, h('tr', {}, ['fails', 'users', 'night', 'after', '', ''].map((f, i) => h('th', {}, f || (i === 4 ? T(O('thật sự', 'truth')) : T(O('chuông', 'alarm'))))))),
            h('tbody', {}, TRAIN.map((x, i) => h('tr', {}, [x.fails, x.users, x.night, x.after].map((v) => h('td', {}, String(v))), h('td', {}, T(x.bad ? O('kẻ gian', 'intruder') : O('người quen', 'regular'))), h('td', { class: train.hit[i] === Boolean(x.bad) ? 'good' : 'bad' }, train.hit[i] ? '🔔' : '—')))));
        };
        const condition = (key, label) => { const c = d.rule[key]; return h('div', { class: 'qrow' }, h('span', { class: 'kw' }, label),
          QM.caseKit.select(label, Object.keys(FIELDS).map((f) => [f, f]), c.field, (v) => { c.field = v; api.save(); draw(false); }), h('span', {}, '>='),
          h('input', { type: 'number', min: '0', max: '60', value: String(c.value), 'data-cond': key, 'aria-label': `${label} >=`, disabled: api.passed, oninput: (e) => { c.value = Number(e.target.value); api.save(); draw(false); } })); };
        api.ctl.replaceChildren(condition('a', 'IF'),
          h('div', { class: 'qrow' }, h('span', { class: 'kw' }, 'JOIN'), QM.caseKit.select('JOIN', [['', '—'], ['AND', 'AND'], ['OR', 'OR']], d.rule.join, (v) => { d.rule.join = v; api.save(); draw(false); })),
          condition('b', '…'), h('ul', { class: 'legend-list' }, Object.entries(FIELDS).map(([k, v]) => h('li', {}, h('code', {}, k), ' ', T(v)))));
        api.stage.append(head(O('Luật chuông cho tuần tới', 'The alarm rule for next week')), code, h('p', { class: 'lane-h' }, T(O('Trên tuần này', 'On this week'))), now, h('p', { class: 'lane-h' }, T(O('Trên tuần sau', 'On next week'))), later, h('div', { class: 'table' }, table));
        api.say('linh', O('Tuần này bắt đủ chưa chắc tuần sau cũng vậy. Kẻ gian sẽ đi khẽ hơn.', 'Catching everyone this week proves little. They will tread more softly next week.'), 'think');
        draw(api.passed);
        if (!api.passed) api.actions(btn(T(O('Áp luật cho tuần sau', 'Deploy for next week')), () => {
          draw(true);
          const r = measure(d.rule, TEST);
          if (ruleOk(d.rule)) api.pass(O(`Tuần mới: bắt **${r.caught}/10**, nhầm **${r.fp}**. Luật hiểu hành vi chứ không học thuộc con số.`, `New week: **${r.caught}/10** caught, **${r.fp}** false. The rule grasped behaviour instead of memorising numbers.`));
          else api.miss(r.caught < 9 ? O(`Tuần mới chỉ bắt **${r.caught}/10**. Luật đang bám quá sát dữ liệu cũ.`, `Only **${r.caught}/10** next week. The rule clings to the old data.`) : O(`Bắt được nhưng réo nhầm **${r.fp} lần**.`, `It catches them but rings **${r.fp} times** for nothing.`));
        }, 'primary'));
      },
    },
  ],
});
})();
