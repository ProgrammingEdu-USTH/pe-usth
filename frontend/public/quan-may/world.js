/* Quán Mây: the shop map (any order, with consequences), the guess before an episode,
   the matching task that closes it, stars, and the shop ledger. */
(() => {
'use strict';
const QM = window.QuanMay;
const { S, save, persist, $, h, btn, O, T, rich, enter, updateHud, mechIcon, MECH, RULES, FEEDBACK, calm } = QM.lib;

/* Recommended order of the story. Nothing is locked: these only drive suggestions, and the cases. */
const NEEDS = { ep1: [], ep2: ['ep1'], ep3: ['ep1'], ep4: ['ep2'], ep5: ['ep1'], ep6: ['ep5'], ep7: ['ep3'], ep8: ['ep3', 'ep5'], ep9: ['ep6'], ep10: ['ep2', 'ep3', 'ep8'] };

const G = (vi, en, options, answer, whyVi, whyEn) => ({ q: O(vi, en), options: options.map((o) => O(o[0], o[1])), answer, why: O(whyVi, whyEn) });
const PREDICT = {
  ep1: G('Đoán trước: ba món phải dàn đều, hai món ngoài cùng chạm hai góc. `justify-content` nhận giá trị nào?', 'Guess first: three items spread out, the outer two touching the corners. Which `justify-content` value?',
    [['space-between', 'space-between'], ['space-around', 'space-around'], ['flex-start + gap', 'flex-start + gap']], 0,
    '`space-between` chỉ chia khoảng trống **giữa** các món; `space-around` còn chừa nửa khoảng ở hai đầu.', '`space-between` shares space only **between** items; `space-around` also leaves half a share at both ends.'),
  ep2: G('Đoán trước: năm đơn đến cùng lúc, một người pha. Thứ tự nào làm thời gian chờ trung bình nhỏ nhất?', 'Guess first: five orders at once, one barista. Which order gives the smallest average wait?',
    [['Đơn nhanh nhất pha trước', 'Quickest drink first'], ['Cứ đơn đến trước pha trước', 'Strictly first come, first'], ['Đơn lâu nhất pha trước', 'Longest drink first']], 0,
    'Ly ngắn đứng trước bắt ít người phải đợi ít phút nhất. Đó là **SJF**.', 'A short job in front makes the others wait the least. That is **shortest job first**.'),
  ep3: G('Đoán trước: máy ghi đủ đơn mà két vẫn hụt. Nguyên nhân nào hợp lý nhất?', 'Guess first: every order is recorded, yet the drawer is short. What is the likeliest cause?',
    [['Có đơn được giảm về 0₫', 'Orders discounted to 0₫'], ['Máy cộng sai tổng ngày', 'The till adds up wrongly'], ['Có đơn bị nhập hai lần', 'Orders entered twice over']], 0,
    'Nhập hai lần làm **thừa** đơn chứ không hụt riêng tiền. Dấu vết nằm ở những đơn thu 0₫.', 'Double entry adds orders; it does not drain cash. The trail is in the orders that collected 0₫.'),
  ep4: G('Đoán trước: một người pha 12 ly/giờ. Khách tăng từ 6 lên 11 mỗi giờ thì thời gian chờ tăng cỡ nào?', 'Guess first: one barista, 12 cups an hour. Guests rise from 6 to 11. How much longer is the wait?',
    [['Gấp khoảng hai lần', 'About twice as long'], ['Gấp khoảng năm lần', 'About five times as long'], ['Gấp hơn mười lần', 'Over ten times']], 2,
    'Từ 5 phút lên **55 phút**: càng sát công suất, đường chờ càng dựng đứng.', 'From 5 minutes to **55**: close to full capacity the curve shoots up.'),
  ep5: G('Đoán trước: hai tuần, 20 điểm công. Điều gì làm lần ra mắt hỏng nặng nhất?', 'Guess first: two weeks, 20 points. What would ruin the launch most?',
    [['Thiếu một khâu của luồng đặt món', 'One missing step in ordering'], ['Thiếu chế độ tối cho trang đặt món', 'No dark mode on the order page'], ['Thiếu logo động ở trang đầu', 'No spinning logo up front']], 0,
    'Đứt một khâu thì khách **không đặt được gì**, mọi thứ còn lại vô dụng.', 'Break one step and guests **cannot order at all**; the rest is wasted.'),
  ep6: G('Đoán trước: dây đã cắm đúng mà tablet vẫn không ra mạng. Nghi ngờ nào hợp lý nhất?', 'Guess first: the cables are right, the tablet is still offline. What do you suspect?',
    [['Địa chỉ IP khác mạng con', 'IP in the wrong subnet'], ['Dây mạng dài quá một mét', 'Cable longer than a metre'], ['Màn hình để độ sáng quá thấp', 'Screen brightness set too low']], 0,
    'Khác mạng con thì gói tin **không tới được router**, dù dây tốt.', 'In another subnet the packets **never reach the router**, however good the cable.'),
  ep7: G('Đoán trước: 100.000 đơn xếp theo mã. Cứ chia đôi thì tối đa phải xem bao nhiêu đơn?', 'Guess first: 100,000 sorted orders. Halving each time, how many must you look at, at most?',
    [['17 đơn', '17 orders'], ['170 đơn', '170 orders'], ['1.700 đơn', '1,700 orders']], 0,
    'Mỗi lần bỏ một nửa: 2¹⁷ lớn hơn 100.000 nên **17** lần là đủ.', 'Each look drops half: 2¹⁷ exceeds 100,000, so **17** looks are enough.'),
  ep8: G('Đoán trước: ô ghi chú ghép thẳng vào câu SQL. Ký tự nào mở cửa cho kẻ gian?', 'Guess first: the notes box is pasted into SQL. Which character opens the door?',
    [['Dấu nháy đơn \'', 'A single quote \''], ['Dấu chấm câu .', 'A full stop mark .'], ['Dấu cách thừa', 'A spare space']], 0,
    'Dấu `\'` **đóng chuỗi sớm**, chữ phía sau thành lệnh.', 'The `\'` **ends the text early** and what follows becomes code.'),
  ep9: G('Đoán trước: hạ ngưỡng báo động xuống thật thấp thì sao?', 'Guess first: you lower the alarm threshold a lot. What happens?',
    [['Bắt thêm, và réo nhầm thêm', 'More caught, more false'], ['Bắt thêm, mà réo nhầm lại bớt', 'More caught, fewer false ones'], ['Bắt bớt đi, réo nhầm cũng bớt', 'Fewer caught, fewer false ones']], 0,
    'Hai con số **đi cùng chiều**; chọn ngưỡng là chọn đánh đổi.', 'The two numbers **move together**; choosing a threshold is choosing a trade.'),
  ep10: G('Đoán trước: người phỏng vấn tin câu trả lời nào nhất?', 'Guess first: which kind of answer convinces an interviewer?',
    [['Có việc cụ thể và số đo được', 'A concrete job, measured'], ['Kể được thật nhiều công nghệ', 'A long list of technologies'], ['Nói chắc chắn mình làm được hết', 'Saying you can surely do it all']], 0,
    'Việc cụ thể, con số đã đo, và **giới hạn** của nó: kiểm chứng được nên đáng tin.', 'A concrete job, a measured number and its **limits**: it can be checked, so it is believed.'),
};

const R = (...pairs) => pairs.map(([tv, te, mv, me]) => ({ term: O(tv, te), meaning: O(mv, me) }));
const RECALL = {
  ep1: R(['justify-content', 'justify-content', 'Chia chỗ dọc theo trục chính', 'Places items along the main axis'], ['align-items', 'align-items', 'Canh các món theo trục vuông góc', 'Aligns items across that axis'], ['flex-direction: column', 'flex-direction: column', 'Đổi trục chính sang chiều dọc', 'Turns the main axis vertical']),
  ep2: R(['Chuyển ngữ cảnh', 'Context switch', 'Thời gian mất khi đổi sang việc khác', 'Time lost changing to another job'], ['Hiệu ứng đoàn xe', 'Convoy effect', 'Việc dài đứng đầu bắt cả hàng đợi', 'A long job in front stalls the queue'], ['Round robin', 'Round robin', 'Mỗi việc chạy một lượt ngắn rồi nhường', 'Each job runs a short turn, then yields']),
  ep3: R(['WHERE', 'WHERE', 'Giữ lại những hàng thoả điều kiện', 'Keeps the rows that match'], ['GROUP BY', 'GROUP BY', 'Gom hàng để đếm và cộng theo nhóm', 'Bundles rows to count and sum'], ['UPDATE thiếu WHERE', 'UPDATE without WHERE', 'Sửa luôn mọi hàng trong bảng', 'Changes every row in the table']),
  ep4: R(['λ (lambda)', 'λ (lambda)', 'Số khách đến trong một giờ', 'Guests arriving per hour'], ['μ (mu)', 'μ (mu)', 'Số ly một người pha xong mỗi giờ', 'Cups one barista finishes per hour'], ['λ gần bằng μ', 'λ close to μ', 'Hàng chờ phình ra rất nhanh', 'The queue blows up quickly']),
  ep5: R(['Phải có', 'Must', 'Thiếu nó thì sản phẩm không dùng được', 'Without it the product fails'], ['Luồng chính', 'Main flow', 'Chuỗi bước khách đi từ đầu tới cuối', 'The steps a guest walks end to end'], ['Đổi phạm vi', 'Scope change', 'Thêm việc thì bỏ ra việc cùng cỡ', 'Add one thing, take one out']),
  ep6: R(['Mặt nạ mạng', 'Subnet mask', 'Quyết định máy nào cùng mạng con', 'Decides who shares a subnet'], ['Cổng mặc định', 'Default gateway', 'Nơi gửi gói tin khi đi ra ngoài', 'Where packets go to leave'], ['Địa chỉ quảng bá', 'Broadcast address', 'Gửi tới mọi máy trong mạng con', 'Reaches every host in the subnet']),
  ep7: R(['Tìm tuần tự', 'Linear search', 'Xem lần lượt từng phần tử', 'Looks at items one by one'], ['Tìm nhị phân', 'Binary search', 'Mỗi bước bỏ đi một nửa còn lại', 'Drops half of what is left'], ['Chỉ mục', 'Index', 'Cấu trúc giữ thứ tự để tìm nhanh', 'Keeps order so lookups are fast']),
  ep8: R(['SQL injection', 'SQL injection', 'Dữ liệu người dùng bị đọc thành lệnh', 'User data read as a command'], ['Truy vấn tham số', 'Parameterised query', 'Câu lệnh và dữ liệu gửi tách nhau', 'Statement and data travel apart'], ['Kiểm thử có phép', 'Authorised testing', 'Chỉ thử khi chủ hệ thống đồng ý', 'Only with the owner’s consent']),
  ep9: R(['Báo nhầm', 'False positive', 'Chuông reo cho người vô can', 'The alarm rings for the innocent'], ['Bỏ sót', 'False negative', 'Kẻ gian đi qua mà chuông im', 'An intruder passes in silence'], ['Ngưỡng', 'Threshold', 'Mức phải vượt thì chuông mới reo', 'The level that sets the alarm off']),
  ep10: R(['Situation', 'Situation', 'Bối cảnh của câu chuyện bạn kể', 'The setting of your story'], ['Action', 'Action', 'Chính bạn đã làm những gì', 'What you yourself did'], ['Result', 'Result', 'Điều thay đổi, tốt nhất có số đo', 'What changed, ideally measured']),
};

const shuffle = (n) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/* A permutation remembered on the run, so a reload keeps the same layout. */
function order(run, key, n) {
  const kept = run[key];
  if (!Array.isArray(kept) || kept.length !== n || new Set(kept).size !== n || kept.some((i) => !(i >= 0 && i < n))) run[key] = shuffle(n);
  return run[key];
}
function slip(id) { S.slips[id] = (Number(S.slips[id]) || 0) + 1; save(); updateHud(true); }
const mistakes = (id) => Number(S.slips[id]) || 0;
function rate(id, run) { const n = mistakes(id) + (Number(run.recallMiss) || 0); S.stars[id] = n === 0 ? 3 : n <= 2 ? 2 : 1; }
const starText = (n) => '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
function starsEl(id) {
  if (!S.stars[id]) return null; /* finished before stars existed: nothing to claim */
  const n = Math.max(1, Math.min(3, Number(S.stars[id]) || 1));
  return h('p', { class: 'stars', 'aria-label': T(O(`${n} trên 3 sao`, `${n} of 3 stars`)) }, h('b', { 'aria-hidden': 'true' }, starText(n)),
    h('span', {}, n === 3 ? T(O('Không sai lần nào', 'No wrong turns')) : T(O('Chơi lại chỉ đổi cảnh, sổ quán vẫn nhớ lần sai', 'Replaying resets the scene; the ledger still remembers the mistakes'))));
}

/* ---------- the guess before the work ---------- */
function predict(ep, ui) {
  const g = PREDICT[ep.id], run = ui.run;
  ui.say('linh', g.q, 'think');
  const list = h('div', { class: 'options guess-list', role: 'radiogroup', 'aria-label': T(O('Câu đoán', 'Your guess')) });
  const actions = () => ui.actions(
    run.bet == null ? null : btn(T(O('Chốt câu đoán, vào việc', 'Lock it in and start')) + ' →', () => ui.go('play'), 'primary'),
    btn(T(O('Nghe lại chuyện', 'Hear the story again')), () => ui.go('intro'), 'ghost'));
  order(run, 'guessOrder', g.options.length).forEach((i, n) => {
    const b = h('button', { type: 'button', class: 'option', role: 'radio', 'aria-checked': String(run.bet === i), 'data-i': String(i), onclick: () => {
      run.bet = i; persist();
      list.querySelectorAll('.option').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      actions();
    } }, h('span', { class: 'letter', 'aria-hidden': 'true' }, 'ABC'[n]), h('span', { html: rich(T(g.options[i])) }));
    list.append(b);
  });
  ui.ctl.replaceChildren(h('p', { class: 'lane-h' }, T(O('Đoán trước. Đáp án lộ ra ở cuối tập.', 'Guess first. The answer comes at the end.'))), list);
  actions();
}
function verdict(ep, run) {
  const g = PREDICT[ep.id];
  if (run.bet == null || !g.options[run.bet]) return h('p', { class: 'guess' }, h('span', { html: rich(T(g.why)) }));
  const right = run.bet === g.answer;
  return h('p', { class: 'guess ' + (right ? 'ok' : 'no') },
    h('b', {}, T(right ? O('Bạn đoán đúng', 'Your guess was right') : O('Câu đoán chưa đúng', 'Your guess was off'))),
    h('span', {}, `${T(O('Bạn chọn', 'You picked'))}: ${T(g.options[run.bet]).replace(/`/g, '')}. `), h('span', { html: rich(T(g.why)) }));
}

/* ---------- matching the ideas back closes an episode ---------- */
function recall(ep, ui, onPass) {
  const pairs = RECALL[ep.id], run = ui.run;
  if (!Array.isArray(run.matched)) run.matched = [];
  let picked = null;
  const left = h('div', { class: 'match-col' }), right = h('div', { class: 'match-col' });
  const tally = h('span', { class: 'count', 'aria-live': 'polite' });
  ui.stage.replaceChildren(
    h('div', { class: 'stage-top' }, h('b', {}, T(O('Ghép lại ba ý bạn vừa dùng', 'Match back the three ideas you used'))), tally),
    h('p', { class: 'lane-h' }, T(O('Chọn một khái niệm bên trái, rồi chọn nghĩa của nó.', 'Pick an idea on the left, then its meaning.'))),
    h('div', { class: 'match' }, left, right));
  ui.ctl.replaceChildren(h('div', { class: 'scene-mini', html: QM.lib.scene(ep.after()) }));
  function draw() {
    tally.textContent = `${run.matched.length}/${pairs.length}`;
    const card = (i, side) => {
      const done = run.matched.includes(i);
      return h('button', { type: 'button', class: 'match-card' + (done ? ' done' : '') + (picked === i && side === 'term' ? ' on' : ''), disabled: done, 'data-side': side, 'data-i': String(i), 'aria-pressed': String(picked === i && side === 'term'), onclick: (e) => tap(i, side, e.currentTarget) },
        h(side === 'term' ? 'code' : 'span', {}, T(pairs[i][side === 'term' ? 'term' : 'meaning'])));
    };
    left.replaceChildren(...order(run, 'termOrder', pairs.length).map((i) => card(i, 'term')));
    right.replaceChildren(...order(run, 'meaningOrder', pairs.length).map((i) => card(i, 'meaning')));
    if (run.matched.length === pairs.length) {
      ui.say('linh', O('Khớp cả ba. Giờ thì mình tin là bạn không chỉ bấm cho qua.', 'All three match. Now I believe you did not just click through.'), 'wow');
      ui.actions(btn(T(O('Hoàn thành tập', 'Finish the episode')) + ' ✓', onPass, 'primary'));
    } else ui.actions(btn(T(O('Xem lại phần làm', 'Look at the work again')), () => ui.go('play'), 'ghost'));
  }
  function tap(i, side, el) {
    if (side === 'term') { picked = i; draw(); return; }
    if (picked == null) { ui.say('ban', O('Chọn một khái niệm bên trái trước đã.', 'Pick an idea on the left first.'), 'think'); return; }
    if (picked === i) { run.matched.push(i); picked = null; persist(); draw(); return; }
    run.recallMiss = (run.recallMiss || 0) + 1; persist();
    if (!calm) el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(0)' }], { duration: 260 });
    ui.say('linh', O(`Nghĩa này không phải của \`${pairs[picked].term.vi}\`. Nhớ lại lúc bạn làm xem.`, `That meaning does not belong to \`${pairs[picked].term.en}\`. Think back to what you did.`), 'think');
  }
  ui.say('linh', O('Khoan đã. Trước khi ghi vào sổ, ghép giúp mình mấy khái niệm này.', 'Hold on. Before this goes in the ledger, match these ideas for me.'), 'think');
  draw();
}

/* ---------- what to do next ---------- */
const ready = (id) => NEEDS[id].every((x) => S.done[x]);
const caseOpen = (c) => c.needs.every((x) => S.done[x]);
function suggest(after) {
  const openCase = QM.caseOrder.map((id) => QM.cases[id]).find((c) => c.needs.includes(after) && caseOpen(c) && !(S.cases[c.id] && S.cases[c.id].done));
  if (openCase) return { hash: openCase.id, label: `⚠ ${T(O('Vụ việc mới', 'New case'))}: ${T(openCase.title)}` };
  const next = QM.order.filter((id) => !S.done[id] && ready(id)).sort((a, b) => NEEDS[b].includes(after) - NEEDS[a].includes(after))[0];
  return next ? { hash: next, label: `${T(O('Gợi ý', 'Suggested'))}: ${T(QM.eps[next].title)}` } : null;
}

const LEDGER = {
  twoBaristas: O('Quán đã có người pha thứ hai. Vụ B bắt đầu với hai người.', 'A second barista is on the team. Case B starts with two.'),
  overloaded: O('Từng để một người pha gánh tối khuyến mãi. Vụ B: khách kém kiên nhẫn hơn.', 'One barista was left to carry a promotion night. Case B: guests are less patient.'),
  studentsUpset: O('Từng lỡ tắt mọi mã giảm giá. Sinh viên chưa quên.', 'Every discount code was switched off once. Students remember.'),
  evidenceLost: O('Từng xoá đơn làm bằng chứng. Vụ A: mất một manh mối.', 'Evidence orders were deleted once. Case A: one clue is gone.'),
  sharedWifi: O('Từng cho khách chung wifi quầy. Vụ C: có máy lạ trong mạng.', 'Guests once shared the counter wifi. Case C: a stranger is on the network.'),
  rushedApp: O('App từng được nhét thêm việc cho kịp.', 'The app was once stuffed with late additions.'),
  unreported: O('Một sự cố từng bị giấu. Vụ C: nhật ký thiếu ghi chép.', 'An incident was hidden once. Case C: the log lacks notes.'),
  attackedBack: O('Từng định tấn công ngược. Nhà mạng đã nhắc nhở.', 'Striking back was tried once. The provider sent a warning.'),
};

/* ---------- the shop map ---------- */
const SPOTS = [
  ['ep1', 8.0, 5.4, 1.9, O('Bố trí quán', 'Floor plan')], ['ep2', 3.6, 1.4, 2.45, O('Quầy pha', 'The counter')], ['ep3', 7.3, 1.3, 2.15, O('Két tiền', 'The till')],
  ['ep4', 9.9, 2.2, 2.05, O('Khuyến mãi', 'Promotion')], ['ep5', 10.3, 4.4, 2.15, O('Đặt món', 'Ordering app')], ['ep6', 0.3, 3.0, 2.75, O('Mạng quán', 'Network')],
  ['ep7', 0.6, 5.9, 2.45, O('Kho đơn', 'Order archive')], ['ep8', 3.4, 4.9, 1.9, O('Ô ghi chú', 'Notes box')], ['ep9', 0.9, 8.0, 2.35, O('Báo động', 'Alarm')], ['ep10', 6.4, 7.7, 1.95, O('Phỏng vấn', 'Interview')],
];
const CASE_SPOTS = { 'case-a': [7.3, 1.3, 3.05], 'case-b': [3.6, 1.4, 3.35], 'case-c': [0.3, 3.0, 3.65] };

function mapSvg() {
  const k = window.QuanMayIso.kit(50), p = k.parts, done = (id) => Boolean(S.done[id]);
  let s = k.room(11, 9) + window.QuanMayIso.sign(k, 1.7, 2.4) + window.QuanMayIso.windowAt(k.onBackWall, 8.2, 1.9) + window.QuanMayIso.windowAt(k.onSideWall, 4.9, 1.9, 70);
  /* furniture, drawn back to front; the shop visibly improves as stories are finished */
  s += p.router(0, 2.6, 1.35, done('ep6')) + p.shelf(0.05, 5.0);
  s += k.pawn(3.4, 0.85, 0, 'coral', 0, { hair: true }) + (S.flags.twoBaristas ? k.pawn(4.7, 0.85, 0, 'teal', 0.5) : '');
  s += p.counter(2.0, 1.4, 4) + p.espresso(2.25, 1.5, 1.08) + p.register(4.95, 1.55, 1.08);
  s += p.counter(6.8, 0.9, 1) + p.register(6.95, 1.0, 1.08);
  s += p.easel(9.3, 2.1, done('ep4') ? '−20%' : '', 'coral') + p.kiosk(10.0, 4.1);
  s += done('ep1') ? p.stool(6.9, 4.4) + p.table(7.8, 4.8) + p.table(8.9, 6.4) + p.stool(9.8, 6.5, 'yellow') + p.plant(10.4, 0.7) : p.boxes(7.0, 4.4) + p.boxes(8.3, 6.0);
  s += p.pad(3.0, 4.6) + p.desk(5.3, 7.0) + p.stool(6.3, 8.4, 'steel') + p.rack(0.35, 7.6) + p.camera(0.0, 8.2, 2.0) + p.plant(10.4, 8.3);
  const queue = done('ep2') ? 2 : 5;
  for (let i = 0; i < queue; i++) s += k.pawn(2.6 + i * 0.75, 3.0 + (i % 2) * 0.35, 0, ['blue', 'violet', 'green', 'yellow'][i % 4], i * 0.2, { mood: done('ep2') ? '' : 'cross' });
  if (done('ep8') || done('ep9')) s += p.shield(2.2, 8.6, 1.0);
  /* the places that can be opened */
  const spot = (href, cls, x, y, z, label, num, title) => {
    const [cx, cy] = k.P(x, y, z);
    return `<a href="#${href}" class="spot ${cls}" aria-label="${title.replace(/"/g, '&quot;')}"><title>${title.replace(/</g, '&lt;')}</title><g class="lab-full">${k.pill(x, y, z, label, cls.includes('done') ? 'good' : cls.includes('case') ? 'bad' : cls.includes('open') ? 'warm' : 'plain')}</g>`
      + `<g class="lab-num" transform="translate(${cx} ${cy})"><circle r="25" class="num-drop" cx="2" cy="3"/><circle r="25" class="num"/><text y="9" text-anchor="middle">${num}</text></g></a>`;
  };
  SPOTS.forEach(([id, x, y, z, name]) => {
    const n = QM.order.indexOf(id) + 1, state = done(id) ? 'done' : ready(id) ? 'open' : 'later';
    s += spot(id, state, x, y, z, `${done(id) ? '✓' : n} ${T(name)}`, done(id) ? '✓' : n, `${T(QM.lib.UI.ep)} ${n}: ${T(QM.eps[id].title)}`);
  });
  QM.caseOrder.forEach((id) => {
    const c = QM.cases[id];
    if (!caseOpen(c) || (S.cases[id] && S.cases[id].done)) return;
    const [x, y, z] = CASE_SPOTS[id];
    s += `<g class="pulse">${spot(id, 'case', x, y, z, `⚠ ${T(O('Vụ', 'Case'))} ${c.letter}`, c.letter, T(c.title))}</g>`;
  });
  return window.QuanMayIso.wrap('-440 -190 960 720', s, T(O('Sơ đồ Quán Mây: chọn một góc quán để mở việc', 'Map of the shop: pick a corner to open a job')), 'map-svg').replace('role="img"', 'role="group"');
}

function hub() {
  const done = QM.order.filter((id) => S.done[id]).length, won = QM.caseOrder.filter((id) => S.cases[id] && S.cases[id].done).length;
  const stars = Object.values(S.stars).reduce((a, n) => a + (Number(n) || 0), 0);
  const nexts = QM.order.filter((id) => !S.done[id] && ready(id)).slice(0, 3);
  const flags = Object.keys(LEDGER).filter((k) => S.flags[k]);
  const first = !done && !won;
  const epLink = (id) => h('a', { class: 'job', href: '#' + id }, h('span', { class: 'job-n' }, String(QM.order.indexOf(id) + 1)), h('span', {}, h('b', {}, T(QM.eps[id].title)), h('small', {}, `${T(QM.eps[id].subjectName)} · ${T(MECH[QM.eps[id].mech].name)}`)));
  const caseCard = (id) => {
    const c = QM.cases[id], open = caseOpen(c), state = S.cases[id] || {};
    const need = c.needs.map((x) => h('span', { class: 'need' + (S.done[x] ? ' ok' : '') }, (S.done[x] ? '✓ ' : '') + `${T(QM.lib.UI.ep)} ${QM.order.indexOf(x) + 1}`));
    return h(open ? 'a' : 'div', { class: 'case-card' + (open ? '' : ' locked') + (state.done ? ' done' : ''), href: open ? '#' + id : null },
      h('span', { class: 'job-n' }, state.done ? '✓' : c.letter),
      h('span', {}, h('b', {}, T(c.title)), h('small', {}, state.done ? `${starText(state.stars || 1)} · ${T(O('đã phá', 'solved'))}` : open ? T(c.tag) : T(O('Cần xong trước:', 'Finish first:'))), open ? null : h('span', { class: 'needs' }, need)));
  };
  $('#view').replaceChildren(
    h('div', { class: 'hub-head' },
      h('div', {}, h('span', { class: 'eyebrow' }, T(O('10 tập · 3 vụ việc · chơi theo thứ tự nào cũng được', '10 episodes · 3 cases · play them in any order'))), h('h1', {}, T(O('Bạn là “đứa học ICT” mà cả quán trông cậy', 'You are the ICT friend the whole shop relies on')))),
      h('div', { class: 'tally' }, h('span', {}, h('b', {}, `${done}/10`), T(O('tập', 'episodes'))), h('span', {}, h('b', {}, `${won}/${QM.caseOrder.length}`), T(O('vụ việc', 'cases'))), h('span', {}, h('b', {}, `★ ${stars}`), T(O('sao', 'stars'))))),
    h('div', { class: 'hub' },
      h('section', { class: 'hub-map' }, h('div', { html: mapSvg() }),
        h('p', { class: 'legend map-legend' }, h('span', { class: 'key-dot open' }, T(O('Đang chờ bạn', 'Waiting for you'))), h('span', { class: 'key-dot later' }, T(O('Nên làm sau', 'Better later'))), h('span', { class: 'key-dot done' }, T(O('Đã xong', 'Done'))), h('span', { class: 'key-dot case' }, T(O('Vụ việc khó', 'Hard case'))))),
      h('aside', { class: 'hub-side' },
        h('section', { class: 'panel' }, h('h2', {}, T(first ? O('Bắt đầu ở đây', 'Start here') : O('Việc đang chờ', 'Waiting jobs'))),
          first ? h('p', {}, T(O('Linh mở một quán nước nhỏ gần USTH. Mỗi góc quán là một môn học: bạn tự tay giải quyết, và hậu quả đi theo quán.', 'Linh opens a small drink shop near USTH. Every corner is a subject: you solve it with your own hands, and the consequences stay with the shop.'))) : null,
          nexts.length ? nexts.map(epLink) : h('p', {}, T(O('Hết việc thường. Còn lại là các vụ việc và bản đồ môn.', 'No ordinary jobs left. What remains are the cases and the subject map.')))),
        h('section', { class: 'panel' }, h('h2', {}, T(O('Vụ việc: nhiều môn một lúc', 'Cases: several subjects at once'))), QM.caseOrder.map(caseCard)),
        h('section', { class: 'panel ledger-panel' }, h('h2', {}, T(O('Sổ quán', 'Shop ledger'))),
          flags.length ? h('ul', {}, flags.map((k) => h('li', {}, T(LEDGER[k])))) : h('p', {}, T(O('Chưa có chuyện gì để lại hậu quả. Quyết định của bạn sẽ được ghi ở đây.', 'Nothing has left a mark yet. Your decisions are written here.'))),
          done || won ? btn(T(O('Chơi lại từ đầu', 'Start over')), () => QM.lib.startOver(), 'ghost') : null))),
    h('section', { class: 'season-row' }, h('h2', {}, T(O('Tất cả các tập', 'All episodes'))),
      h('ol', { class: 'cards' }, QM.order.map((id, i) => { const e = QM.eps[id]; return enter(h('li', {}, h('a', { href: '#' + id, class: S.done[id] ? 'done' : '' },
        h('span', { class: 'card-n' }, S.done[id] ? '✓' : String(i + 1)), h('b', {}, T(e.title)), h('span', { class: 'sub' }, T(e.subjectName) + (S.stars[id] ? ` · ${starText(S.stars[id])}` : '')),
        h('span', { class: 'mechline', html: mechIcon(e.mech) + QM.lib.esc(T(MECH[e.mech].name)) }))), i * 25); }))),
    h('details', { class: 'why' }, h('summary', {}, T(O('Vì sao thiết kế như vậy', 'Why it is designed this way'))),
      h('div', { class: 'rules' }, RULES.map((r) => h('article', {}, h('h3', {}, T(r[0])), h('p', {}, T(r[1])), h('a', { href: r[3], target: '_blank', rel: 'noopener' }, r[2] + ' ↗'))))),
    h('p', { class: 'feedback-line' }, h('a', { href: FEEDBACK, target: '_blank', rel: 'noopener' }, T(O('Góp ý cho bản thử nghiệm này ↗', 'Send feedback on this trial ↗')))));
}

QM.world = { order, slip, rate, mistakes, starText, starsEl, predict, verdict, recall, suggest, hub, NEEDS, PREDICT, RECALL, LEDGER };
})();
