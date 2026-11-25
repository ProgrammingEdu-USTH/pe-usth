/* Quán Mây. Taken from the team prototype (claude.ai artifact f3d755bb, version 1795568344-61d5); edit here from now on.
   Everything runs in the page: no network request, no account. Progress stays in this browser. */
(() => {
'use strict';
/* The site's day/night choice, when the visitor has made one; otherwise the system's. */
try { const theme = localStorage.getItem('theme'); if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme; } catch { /* private window */ }
/* Quán Mây — story-mode prototype. Core: helpers, i18n, state, shared pieces. */
const QM = { eps: {}, order: [], runs: {} };
const O = (vi, en) => ({ vi, en });
const T = (o) => (o == null ? '' : typeof o === 'string' ? o : o[S.lang] ?? o.vi);

/* ---------- saved state ---------- */
const KEY = 'quanmay.v1';
const S = { lang: 'vi', done: {}, fx: {} };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* private window */ }
if (S.lang !== 'en') S.lang = 'vi';
if (!S.done || typeof S.done !== 'object') S.done = {};
if (!S.fx || typeof S.fx !== 'object') S.fx = {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* ignore */ } };
const BASE_HUD = { money: 5000000, rating: 4.0, guests: 0 };
function hudNow() {
  const v = { ...BASE_HUD };
  Object.values(S.fx).forEach((f) => { v.money += f.money || 0; v.rating += f.rating || 0; v.guests += f.guests || 0; });
  v.rating = Math.max(1, Math.min(5, v.rating));
  v.guests = Math.max(0, v.guests);
  return v;
}

/* ---------- DOM helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rich = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (v == null || v === false) return;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  });
  kids.flat(3).forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); });
  return el;
}
const btn = (label, onclick, cls = '') => h('button', { type: 'button', class: 'btn ' + cls, onclick, html: rich(label) });

/* ---------- timers are cleared on every screen change ---------- */
const calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let cleanups = [];
const onLeave = (fn) => cleanups.push(fn);
const runCleanups = () => { cleanups.forEach((f) => f()); cleanups = []; };
function later(ms, fn) { const t = setTimeout(fn, calm ? Math.min(ms, 40) : ms); onLeave(() => clearTimeout(t)); return t; }
function loop(fn) {
  let id = 0, prev = null, live = true;
  const tick = (now) => { if (!live) return; const dt = prev == null ? 16 : Math.min(64, now - prev); prev = now; if (fn(dt) === false) { live = false; return; } id = requestAnimationFrame(tick); };
  id = requestAnimationFrame(tick);
  const stop = () => { live = false; cancelAnimationFrame(id); };
  onLeave(stop);
  return stop;
}

/* ---------- motion: FLIP (things glide from where they were to where they are) ---------- */
function flip(els, mutate, opts = {}) {
  const list = [...els];
  const before = list.map((e) => e.getBoundingClientRect());
  mutate();
  if (calm) return;
  list.forEach((e, i) => {
    const a = before[i], b = e.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const dx = a.left - b.left, dy = a.top - b.top, sx = a.width / b.width, sy = a.height / b.height;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
    e.animate([
      { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transformOrigin: 'top left', transform: 'none' },
    ], { duration: opts.duration || 560, delay: (opts.stagger || 0) * i, easing: 'cubic-bezier(.25,1.25,.4,1)', fill: 'backwards' });
  });
}
function enter(el, delay = 0, from = 'translateY(10px)') {
  if (!calm) el.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], { duration: 360, delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  return el;
}

/* ---------- formatting ---------- */
const locale = () => (S.lang === 'vi' ? 'vi-VN' : 'en-US');
const money = (n) => n.toLocaleString(locale()) + '₫';
const num = (n, d = 1) => n.toLocaleString(locale(), { maximumFractionDigits: d });

/* ---------- interface strings ---------- */
const UI = {
  brand: O('Quán Mây', 'Cloud Café'),
  episodes: O('Các tập', 'Episodes'),
  ep: O('Tập', 'Episode'),
  phStory: O('Chuyện', 'Story'), phPlay: O('Làm', 'Do'), phChoice: O('Quyết định', 'Decide'), phDebrief: O('Đúc kết', 'Debrief'),
  next: O('Tiếp', 'Next'), start: O('Vào việc', 'Get to work'), skip: O('Bỏ qua chuyện', 'Skip story'),
  you: O('Bạn', 'You'), linh: O('Linh', 'Linh'), hr: O('Người phỏng vấn', 'Interviewer'),
  mission: O('Nhiệm vụ', 'Mission'),
  askMore: O('Linh hỏi thêm', 'Linh has a question'),
  retry: O('Chọn cách khác', 'Try another answer'),
  wrap: O('Xem mình vừa học gì', 'See what you just learned'),
  nextEp: O('Tập tiếp theo', 'Next episode'),
  toMap: O('Xem bản đồ 56 môn', 'See the map of 56 subjects'),
  home: O('Trang đầu', 'Home'), map: O('Bản đồ môn', 'Subject map'),
  money: O('Tiền quán', 'Shop money'), rating: O('Đánh giá', 'Rating'), guests: O('Khách mỗi ngày', 'Guests per day'),
  lesson: O('Học tiếp trên web: khoá', 'Keep learning on the site:'),
  before: O('Chuyện vừa rồi', 'So far'), now: O('Việc bây giờ', 'Right now'), decide: O('Đến lượt quyết', 'Your call'), after: O('Vừa xong', 'Just done'), exit: O('← Góc học', '← Study room'),
};

/* ---------- characters ---------- */
function avatar(who, mood = 'happy') {
  const hair = who === 'linh' ? '#2B1D18' : who === 'hr' ? '#5C534C' : '#1F2D36';
  const specs = who === 'hr' ? '<g fill="none" stroke="#23170F" stroke-width="1.6"><circle cx="25" cy="31" r="5.500"/><circle cx="39" cy="31" r="5.500"/><path d="M30.500 31h3"/></g>' : '';
  const mouth = { happy: '<path d="M25 39q7 7 14 0"/>', worry: '<path d="M26 43q6-6 12 0"/>', wow: '<ellipse cx="32" cy="42" rx="4" ry="5" fill="#5A3522"/>', think: '<path d="M27 42h10"/>' }[mood] || '';
  const brows = mood === 'worry' ? '<path d="M21 25l8-3M43 25l-8-3"/>' : mood === 'wow' ? '<path d="M21 22h8M35 22h8"/>' : '';
  const top = who === 'linh'
    ? `<circle cx="32" cy="10" r="7" fill="${hair}"/><path d="M13 35C10 15 23 11 32 11s22 5 19 24c-3-10-9-12-15-17-6 7-15 9-23 17Z" fill="${hair}"/>`
    : `<path d="M14 29c-2-16 11-20 20-19 12 1 19 9 16 20-5-9-13-7-20-13-4 6-9 9-16 12Z" fill="${hair}"/>`;
  return `<svg class="ava ava-${who}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" class="ava-bg"/><path d="M12 61c2-11 10-14 20-14s18 3 20 14a31 31 0 0 1-40 0Z" class="ava-shirt"/><circle cx="32" cy="31" r="18" fill="#F1C7A1"/>${top}<circle cx="25" cy="31" r="2.3" fill="#23170F"/><circle cx="39" cy="31" r="2.3" fill="#23170F"/><g fill="none" stroke="#5A3522" stroke-width="2.2" stroke-linecap="round">${brows}${mouth}</g>${specs}</svg>`;
}
function bubble(who, text, mood) {
  return h('div', { class: 'bubble who-' + who },
    h('span', { class: 'face', html: avatar(who, mood) }),
    h('div', { class: 'say' }, h('b', { class: 'name' }, T(UI[who === 'linh' || who === 'hr' ? who : 'you'])), h('p', { html: rich(T(text)) })));
}

/* ---------- mechanics used across the curriculum ---------- */
const MECH = {
  arrange: { name: O('Xếp cho khớp mẫu', 'Match the picture'), icon: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2" stroke-dasharray="3 2"/><rect x="3" y="13" width="18" height="8" rx="2"/>' },
  schedule: { name: O('Điều phối và chạy thử', 'Schedule and run'), icon: '<path d="M3 6h9M3 12h14M3 18h6"/><circle cx="18" cy="6" r="3"/>' },
  detective: { name: O('Điều tra dấu vết', 'Investigate'), icon: '<circle cx="10" cy="10" r="6.5"/><path d="M15 15l6 6M7.5 10h5"/>' },
  predict: { name: O('Vẽ dự đoán rồi lật bài', 'Draw, then reveal'), icon: '<path d="M3 3v18h18"/><path d="M6 16c5 0 8-3 13-11"/><path d="M6 17l12-4" stroke-dasharray="2 3"/>' },
  wire: { name: O('Nối và lắp ráp', 'Wire it up'), icon: '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="12" r="2.5"/><circle cx="6" cy="19" r="2.5"/><path d="M7.4 7l9.200 4M16.8 13.400 8.200 18"/>' },
  machine: { name: O('Làm cái máy từng bước', 'Be the machine'), icon: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>' },
  tune: { name: O('Vặn núm có ngân sách', 'Tune within budget'), icon: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>' },
  defend: { name: O('Công và thủ', 'Attack and defend'), icon: '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6l8-3Z"/><path d="M9 12l2 2 4-4"/>' },
  judge: { name: O('Phân loại và phán quyết', 'Sort and judge'), icon: '<path d="M12 4v17M6 21h12M4 7h16"/><path d="M4 7l-2 6h6L6 7M20 7l-2 6h6l-4-6" transform="translate(-0.5 0)"/>' },
  talk: { name: O('Hội thoại rẽ nhánh', 'Branching talk'), icon: '<path d="M4 5h12v9H9l-5 4V5Z"/><path d="M18 9h2v9l-3-2h-6"/>' },
};
const mechIcon = (k) => `<svg class="mi" viewBox="0 0 24 24" aria-hidden="true">${MECH[k].icon}</svg>`;
/* Subjects that already have a course on this site. */
const COURSES = {
  db: ['/bookshelf/sql', 'Database'], advdb: ['/bookshelf/database-advanced', 'Database Advanced'], python: ['/bookshelf/python', 'Python'],
  ml1: ['/bookshelf/machine-learning', 'Machine Learning'], ml2: ['/bookshelf/machine-learning', 'Machine Learning'],
};
const FEEDBACK = 'https://docs.google.com/forms/d/e/1FAIpQLSf_wcVJLeKO9DnNE8UipvRZlhCvJLpmuKihnpX49DVsSv6KJA/viewform';

/* Where each episode stands (screen, level, what was built) survives a reload. */
const RUNS_KEY = 'quanmay.runs.v1';
const persist = () => { try { localStorage.setItem(RUNS_KEY, JSON.stringify(QM.runs)); } catch { /* private window */ } };
function restoreRuns() {
  try {
    const saved = JSON.parse(localStorage.getItem(RUNS_KEY) || '{}');
    QM.order.forEach((id) => { const r = saved && saved[id]; if (r && typeof r === 'object' && PHASES.includes(r.phase)) QM.runs[id] = r; });
  } catch { /* damaged or unavailable: start from the story */ }
}

/* One line that always answers "where am I in the story, and what am I doing". */
function contextOf(ep, phase, goals) {
  const i = QM.order.indexOf(ep.id), prev = QM.eps[QM.order[i - 1]], next = QM.eps[QM.order[i + 1]];
  if (phase === 'intro') return [UI.before, prev ? prev.debrief.thanks : O('Linh mở một quán nước nhỏ gần trường. Bạn là bạn học ICT mà Linh nhờ mỗi khi quán gặp chuyện.', 'Linh is opening a small drink shop near campus. You are the ICT friend Linh calls when something breaks.')];
  if (phase === 'play') {
    const open = (goals || []).find((g) => !g.ok);
    return [UI.now, open ? open.label : goals && goals.length ? O('Xong nhiệm vụ. Bấm nút bên dưới lời thoại để đi tiếp.', 'Mission complete. Use the button under the dialogue to go on.') : ep.title];
  }
  if (phase === 'choice') return [UI.decide, O('Chọn một cách. Bạn thấy ngay chuyện gì xảy ra, và hậu quả đi theo quán sang tập sau.', 'Pick an answer. You see what happens at once, and the shop carries it into the next episode.')];
  return [UI.after, next ? O(`Tiếp theo: **${next.title.vi}**.`, `Next: **${next.title.en}**.`) : O('Hết các tập chơi được. Bản đồ môn cho thấy câu chuyện còn đi đâu.', 'That was the last playable episode. The subject map shows where the story goes next.')];
}

/* The world picture (it changes as the story moves on) and the episode shell. */

function person(x, y, tone, delay = 0, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><g class="bob" style="animation-delay:${delay}s"><circle cx="0" cy="-34" r="10" fill="#F1C7A1"/><path d="M-11-35c0-9 6-13 11-13s11 4 11 13c-5-5-16-5-22 0Z" fill="#2B1D18"/><path d="M-13 0c0-16 5-23 13-23s13 7 13 23Z" class="${tone}"/></g></g>`;
}

/* o: {tidy, queue, baristas, banner, money, sign} */
function scene(o = {}) {
  if (o.office) return officeScene(o);
  const q = o.queue || 0;
  let s = '<svg class="scene" viewBox="0 0 640 360" role="img" aria-label="' + esc(T(O('Quán Mây', 'Cloud Café'))) + '">';
  s += '<rect width="640" height="360" class="sc-sky"/><rect y="300" width="640" height="60" class="sc-ground"/>';
  s += '<g class="sc-cloud drift"><ellipse cx="80" cy="52" rx="34" ry="16"/><ellipse cx="104" cy="42" rx="24" ry="18"/></g><g class="sc-cloud drift slow"><ellipse cx="566" cy="38" rx="30" ry="13"/><ellipse cx="548" cy="30" rx="18" ry="14"/></g>';
  s += '<rect x="150" y="70" width="360" height="232" rx="10" class="sc-wall"/>';
  s += '<rect x="196" y="38" width="268" height="54" rx="14" class="sc-sign"/><text x="330" y="74" text-anchor="middle" class="sc-signt">QUÁN MÂY</text>';
  s += '<rect x="176" y="150" width="212" height="110" rx="8" class="sc-window"/>';
  const b = o.baristas || 1;
  for (let i = 0; i < b; i++) s += person(b === 1 ? 282 : 240 + i * 84, 242, 'sc-apron', i * 0.4, 1.35);
  s += '<rect x="168" y="238" width="228" height="16" rx="5" class="sc-counter"/><rect x="196" y="218" width="24" height="20" rx="4" class="sc-counter"/><rect x="350" y="214" width="20" height="24" rx="4" class="sc-counter"/>';
  for (let i = 0; i < 9; i++) s += `<path d="M${160 + i * 38} 116h38v22a19 15 0 0 1-38 0Z" class="${i % 2 ? 'sc-aw2' : 'sc-aw1'}"/>`;
  s += '<rect x="420" y="166" width="64" height="136" rx="8" class="sc-door"/><circle cx="472" cy="238" r="4" class="sc-sign"/>';
  if (o.tidy) {
    [556, 604].forEach((x, i) => { s += `<g><path d="M${x} 300v-30" class="sc-leg"/><ellipse cx="${x}" cy="268" rx="22" ry="7" class="sc-table"/><path d="M${x - 24} 300v-16h10M${x + 24} 300v-16h-10" class="sc-leg"/></g>`; if (i === 0) s += `<circle cx="${x}" cy="258" r="6" class="sc-cup"/>`; });
    s += '<g><path d="M118 300h26l-4-24h-18Z" class="sc-counter"/><path d="M131 276c-16-4-18-22-14-28 12 2 16 14 14 28ZM131 276c14-6 20-20 17-28-12 2-19 14-17 28Z" class="sc-leaf"/></g>';
  } else {
    s += '<g class="sc-boxes"><rect x="532" y="262" width="52" height="38" rx="4"/><rect x="590" y="272" width="36" height="28" rx="4" transform="rotate(8 608 286)"/><rect x="546" y="232" width="34" height="30" rx="4" transform="rotate(-9 563 247)"/><rect x="96" y="274" width="44" height="26" rx="4"/></g>';
  }
  for (let i = 0; i < Math.min(q, 6); i++) s += person(146 - i * 25, 318 + (i % 2) * 10, i % 2 ? 'sc-c2' : 'sc-c1', i * 0.23);
  if (q >= 4) s += '<g class="pulse"><circle cx="60" cy="242" r="17" class="sc-alert"/><text x="60" y="249" text-anchor="middle" class="sc-alertt">!</text></g>';
  if (o.money) s += '<g class="pulse"><rect x="232" y="266" width="100" height="40" rx="8" class="sc-alert"/><text x="282" y="292" text-anchor="middle" class="sc-alertt">−120k</text></g>';
  if (o.banner) s += '<g class="swing"><rect x="526" y="120" width="84" height="62" rx="8" class="sc-aw1"/><text x="568" y="160" text-anchor="middle" class="sc-alertt">−20%</text></g><path d="M510 100h60v20" class="sc-leg"/>';
  return s + sceneExtras(o) + '</svg>';
}

/* ---------- episode shell ---------- */
const PHASES = ['intro', 'play', 'choice', 'debrief'];
const PHKEY = { intro: 'phStory', play: 'phPlay', choice: 'phChoice', debrief: 'phDebrief' };
const runOf = (ep) => QM.runs[ep.id] || (QM.runs[ep.id] = { phase: 'intro', beat: 0 });

function renderEpisode(ep) {
  runCleanups();
  const run = runOf(ep);
  const n = QM.order.indexOf(ep.id) + 1;
  const view = $('#view');
  const stage = h('section', { class: 'stage' });
  const talk = h('div', { class: 'talk', 'aria-live': 'polite' });
  const ctl = h('div', { class: 'ctl' });
  const goalsEl = h('ul', { class: 'goals', hidden: true });
  const acts = h('div', { class: 'acts' });
  const context = h('p', { class: 'context' });
  const tell = (goals) => { const [tag, text] = contextOf(ep, run.phase, goals); context.replaceChildren(h('b', {}, T(tag)), h('span', { html: rich(T(text)) })); };
  const prev = new Set();
  const ui = {
    stage, ctl, run, ep,
    say(who, text, mood) { talk.replaceChildren(enter(bubble(who, text, mood))); },
    goals(list) {
      tell(list);
      persist();
      goalsEl.hidden = !list.length;
      goalsEl.replaceChildren(h('li', { class: 'g-h' }, T(UI.mission) + ' ' + list.filter((g) => g.ok).length + '/' + list.length),
        ...list.map((g, i) => {
          const li = h('li', { class: g.ok ? 'ok' : '' }, h('i', { 'aria-hidden': 'true' }, g.ok ? '✓' : ''), h('span', { html: rich(T(g.label)) }));
          if (g.ok && !prev.has(i)) { prev.add(i); enter(li.firstChild, 0, 'scale(2.2)'); }
          if (!g.ok) prev.delete(i);
          return li;
        }));
    },
    actions(...b) { acts.replaceChildren(...b.filter(Boolean)); },
    go(phase) { run.phase = phase; if (phase === 'intro') run.beat = 0; renderEpisode(ep); },
    finish() { ui.actions(btn(T(UI.askMore) + ' →', () => ui.go('choice'), 'primary')); },
  };

  const stepper = h('ol', { class: 'phases' }, PHASES.map((p, i) => h('li', { class: p === run.phase ? 'on' : PHASES.indexOf(run.phase) > i ? 'past' : '' },
    h('button', { type: 'button', onclick: () => ui.go(p), 'aria-current': p === run.phase ? 'step' : null }, T(UI[PHKEY[p]])))));
  view.replaceChildren(
    h('div', { class: 'ep-head' },
      h('div', {}, h('span', { class: 'eyebrow' }, `${T(UI.ep)} ${n} · ${T(ep.subjectName)}`), h('h1', {}, T(ep.title))),
      h('div', { class: 'ep-meta' }, h('span', { class: 'chip', html: mechIcon(ep.mech) + esc(T(MECH[ep.mech].name)) }), stepper)),
    context,
    h('div', { class: 'ep-grid ' + ep.id + ' ph-' + run.phase }, h('div', { class: 'main-col' }, stage, goalsEl), h('aside', { class: 'side' }, talk, ctl, acts)));

  tell();
  try {
    if (run.phase === 'intro') playIntro(ep, ui);
    else if (run.phase === 'play') ep.play(ui);
    else if (run.phase === 'choice') playChoice(ep, ui);
    else playDebrief(ep, ui);
  } catch (e) {
    /* A saved state this version cannot draw: drop it and tell the story from the start. */
    if (run.phase === 'intro' && run.beat === 0) throw e;
    delete QM.runs[ep.id];
    persist();
    renderEpisode(ep);
    return;
  }
  persist();
}

function playIntro(ep, ui) {
  ui.stage.innerHTML = `<div class="scene-wrap">${scene(ep.scene())}</div>`;
  const show = () => {
    const b = ep.intro[ui.run.beat], last = ui.run.beat >= ep.intro.length - 1;
    ui.say(b.who, b.text, b.mood);
    ui.ctl.replaceChildren(h('div', { class: 'beatdots', 'aria-hidden': 'true' }, ep.intro.map((_, i) => h('i', { class: i <= ui.run.beat ? 'on' : '' }))));
    ui.actions(
      btn((last ? T(UI.start) : T(UI.next)) + ' →', () => { if (last) ui.go('play'); else { ui.run.beat++; show(); } }, 'primary'),
      last ? null : btn(T(UI.skip), () => ui.go('play'), 'ghost'));
  };
  show();
}

function playChoice(ep, ui) {
  const c = ep.choice(ui);
  ui.say('linh', c.q, 'think');
  const list = h('div', { class: 'options' });
  c.options.forEach((o, i) => {
    const b = h('button', { type: 'button', class: 'option', 'aria-pressed': 'false' },
      h('span', { class: 'letter', 'aria-hidden': 'true' }, 'ABC'[i]),
      h('span', {}, o.label ? h('span', { html: rich(T(o.label)) }) : null, o.code ? h('code', { class: 'block' }, o.code) : null));
    b.addEventListener('click', () => {
      [...list.children].forEach((x) => { x.classList.remove('good', 'bad', 'meh'); x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
      const good = o.good !== false;
      b.classList.add(o.tone || (good ? 'good' : 'bad'));
      o.run();
      ui.say(o.who || 'linh', o.reply, o.mood || (good ? 'happy' : 'worry'));
      if (good) { S.fx[ep.id] = o.fx || {}; S.done[ep.id] = true; save(); updateHud(true); ui.actions(btn(T(UI.wrap) + ' →', () => ui.go('debrief'), 'primary')); }
      else ui.actions(btn(T(UI.retry), () => { b.classList.remove('bad'); b.setAttribute('aria-pressed', 'false'); c.reset(); ui.say('linh', c.q, 'think'); ui.actions(); }, 'ghost'));
    });
    list.append(b);
  });
  ui.ctl.replaceChildren(list);
  c.reset();
}

function playDebrief(ep, ui) {
  const d = ep.debrief, fx = S.fx[ep.id];
  const idx = QM.order.indexOf(ep.id), nextId = QM.order[idx + 1];
  const delta = [];
  if (fx) {
    if (fx.guests) delta.push([T(UI.guests), (fx.guests > 0 ? '+' : '−') + Math.abs(fx.guests), fx.guests > 0]);
    if (fx.rating) delta.push([T(UI.rating), (fx.rating > 0 ? '+' : '−') + num(Math.abs(fx.rating)) + ' ★', fx.rating > 0]);
    if (fx.money) delta.push([T(UI.money), (fx.money > 0 ? '+' : '−') + money(Math.abs(fx.money)), fx.money > 0]);
  }
  const card = h('div', { class: 'debrief' },
    h('span', { class: 'eyebrow' }, T(O('Bạn vừa dùng', 'What you just used'))),
    h('h2', {}, T(d.term)),
    h('ul', {}, d.points.map((p, i) => enter(h('li', { html: rich(T(p)) }), 120 + i * 140))),
    d.code ? h('pre', { class: 'code' }, T(d.code)) : null,
    delta.length ? h('div', { class: 'deltas' }, delta.map((x, i) => enter(h('span', { class: x[2] ? 'up' : 'down' }, h('small', {}, x[0]), h('b', {}, x[1])), 500 + i * 120, 'scale(.7)'))) : null);
  ui.stage.replaceChildren(card);
  ui.say('linh', d.thanks, 'happy');
  ui.ctl.replaceChildren(
    h('div', { class: 'scene-mini', html: scene(ep.after()) }),
    COURSES[ep.subject] ? h('a', { class: 'lesson', href: COURSES[ep.subject][0] }, `${T(UI.lesson)} ${COURSES[ep.subject][1]} →`) : '');
  ui.actions(
    nextId ? btn(T(UI.nextEp) + ' →', () => { QM.runs[nextId] = { phase: 'intro', beat: 0 }; location.hash = nextId; }, 'primary') : btn(T(UI.toMap) + ' →', () => { location.hash = 'map'; }, 'primary'),
    btn(T(O('Chơi lại tập này', 'Replay this episode')), () => { delete QM.runs[ep.id]; renderEpisode(ep); }, 'ghost'));
}

/* Season list and the extra pieces of the world used from season 2 on. */
QM.seasons = [
  { title: O('Mùa 1 · Mở quán', 'Season 1 · Opening the shop'), ids: ['ep1', 'ep2', 'ep3', 'ep4'] },
  { title: O('Mùa 2 · Quán lên mạng', 'Season 2 · The shop goes online'), ids: ['ep5', 'ep6', 'ep7', 'ep8', 'ep9'] },
  { title: O('Hồi kết · Đi thực tập', 'Finale · The internship'), ids: ['ep10'] },
];

function sceneExtras(o) {
  let s = '';
  if (o.night) s += '<rect width="640" height="360" class="sc-night"/><circle cx="570" cy="58" r="20" class="sc-moon"/>';
  if (o.phone) s += `<g class="swing"><rect x="40" y="96" width="64" height="114" rx="13" class="sc-phone"/><rect x="48" y="110" width="48" height="82" rx="4" class="sc-screen"/><path d="M58 130h28M58 144h20M58 158h28" class="sc-leg"/><circle cx="100" cy="100" r="15" class="sc-alert"/><text x="100" y="107" text-anchor="middle" class="sc-alertt">${o.phone}</text></g>`;
  if (o.wifi) {
    s += `<g class="sc-wifi ${o.wifi === 'off' ? 'off' : ''}"><path d="M532 112q30-28 60 0M544 126q18-17 36 0M556 140q6-6 12 0"/></g>`;
    if (o.wifi === 'off') s += '<g class="pulse"><circle cx="562" cy="170" r="16" class="sc-alert"/><text x="562" y="178" text-anchor="middle" class="sc-alertt">✕</text></g>';
  }
  if (o.badge) s += `<g class="pulse"><rect x="22" y="222" width="116" height="40" rx="10" class="sc-alert"/><text x="80" y="249" text-anchor="middle" class="sc-alertt">${o.badge}</text></g>`;
  if (o.shield) s += '<g><path d="M566 150l34 12v24c0 23-16 35-34 41-18-6-34-18-34-41v-24Z" class="sc-shield"/><path d="M551 186l11 11 20-23" class="sc-check"/></g>';
  return s;
}

function officeScene(o) {
  let s = '<svg class="scene" viewBox="0 0 640 360" role="img" aria-label="' + esc(T(O('Phòng phỏng vấn', 'Interview room'))) + '">';
  s += '<rect width="640" height="360" class="sc-office"/><rect y="268" width="640" height="92" class="sc-floor"/>';
  s += '<rect x="226" y="44" width="188" height="118" rx="10" class="sc-sky"/><path d="M240 162v-52h34v52M286 162v-80h42v80M340 162v-38h30v38M378 162v-66h24v66" class="sc-city"/><path d="M320 44v118M226 103h188" class="sc-frame"/>';
  s += person(212, 262, 'sc-hr', 0, 2) + person(432, 262, 'sc-apron', 0.6, 1.9);
  s += '<rect x="150" y="236" width="340" height="22" rx="8" class="sc-counter"/><path d="M176 258v58M464 258v58" class="sc-leg"/><rect x="282" y="214" width="54" height="22" rx="3" class="sc-phone"/><circle cx="376" cy="226" r="10" class="sc-cup"/>';
  s += '<path d="M76 268h40l-6-34H82Z" class="sc-counter"/><path d="M96 234c-26-6-30-34-22-44 20 4 26 24 22 44ZM96 234c22-9 32-32 26-45-19 4-30 24-26 45Z" class="sc-leaf"/>';
  if (o.offer) s += '<g class="swing"><rect x="470" y="60" width="140" height="62" rx="12" class="sc-shield"/><text x="540" y="100" text-anchor="middle" class="sc-alertt">OFFER ✓</text></g>';
  return s + '</svg>';
}

/* Episode 1 · Web: furnish the shop with real CSS flexbox until it matches the sketch. */
(function () {
  const F = {
    counter: { w: 108, h: 58, vi: 'Quầy', en: 'Counter', art: '<rect x="2" y="8" width="104" height="46" rx="8" fill="#B9784A"/><rect x="2" y="8" width="104" height="14" rx="7" fill="#D29A68"/><circle cx="28" cy="34" r="8" fill="#FDF6EA"/><circle cx="54" cy="34" r="8" fill="#FDF6EA"/><circle cx="28" cy="34" r="4" fill="#7A4A2B"/><circle cx="54" cy="34" r="4" fill="#C9863F"/>' },
    machine: { w: 72, h: 58, vi: 'Máy pha', en: 'Machine', art: '<rect x="4" y="4" width="64" height="50" rx="9" fill="#33474F"/><rect x="12" y="11" width="48" height="13" rx="4" fill="#9FD8CB"/><circle cx="26" cy="39" r="8" fill="#182428"/><circle cx="48" cy="39" r="8" fill="#182428"/><circle cx="26" cy="39" r="3" fill="#E8662A"/>' },
    fridge: { w: 60, h: 74, vi: 'Tủ lạnh', en: 'Fridge', art: '<rect x="4" y="3" width="52" height="68" rx="8" fill="#DCEAF0" stroke="#7E9CA8" stroke-width="2"/><path d="M4 30h52" stroke="#7E9CA8" stroke-width="2"/><path d="M45 10v12M45 38v18" stroke="#4A6874" stroke-width="4" stroke-linecap="round"/>' },
    table: { w: 84, h: 84, vi: 'Bàn', en: 'Table', art: '<g fill="#5E8C80"><rect x="30" y="2" width="24" height="16" rx="6"/><rect x="30" y="66" width="24" height="16" rx="6"/><rect x="2" y="30" width="16" height="24" rx="6"/><rect x="66" y="30" width="16" height="24" rx="6"/></g><circle cx="42" cy="42" r="26" fill="#C98C57"/><circle cx="42" cy="42" r="19" fill="#DDAA76"/><circle cx="50" cy="36" r="6" fill="#FDF6EA"/>' },
    plant: { w: 60, h: 60, vi: 'Cây', en: 'Plant', art: '<circle cx="30" cy="30" r="27" fill="#3E7F52"/><circle cx="20" cy="22" r="12" fill="#58A06A"/><circle cx="40" cy="38" r="13" fill="#4C9461"/><circle cx="38" cy="19" r="9" fill="#6BB87C"/><circle cx="30" cy="30" r="8" fill="#9A5B3C"/>' },
    stool: { w: 54, h: 54, vi: 'Ghế', en: 'Stool', art: '<circle cx="27" cy="27" r="24" fill="#E8B45B"/><circle cx="27" cy="27" r="16" fill="#F4CF86"/><circle cx="27" cy="27" r="4" fill="#B27F2F"/>' },
  };
  const VALUES = {
    'flex-direction': ['row', 'column'],
    'flex-wrap': ['nowrap', 'wrap'],
    gap: ['0px', '24px', '48px'],
    'justify-content': ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'],
    'align-items': ['flex-start', 'center', 'flex-end'],
  };
  const LEVELS = [
    { name: O('Quầy sát tường sau', 'The back-wall counter'), items: ['counter', 'machine', 'fridge'], props: ['justify-content'], target: { 'justify-content': 'space-between' },
      say: O('Quầy, máy pha, tủ lạnh **dàn đều** sát tường trên, hai món ngoài cùng chạm hai góc.', 'Counter, machine and fridge **spread along** the top wall, the outer two touching the corners.') },
    { name: O('Bàn giữa quán', 'Tables in the middle'), items: ['table', 'table', 'table'], props: ['justify-content', 'align-items'], target: { 'justify-content': 'center', 'align-items': 'center' },
      say: O('Ba cái bàn tụm lại **chính giữa** quán cho ấm cúng.', 'The three tables huddle **right in the middle** of the room.') },
    { name: O('Góc cửa kính', 'The window corner'), items: ['plant', 'stool', 'plant'], props: ['flex-direction', 'justify-content', 'align-items'], target: { 'flex-direction': 'column', 'justify-content': 'space-around', 'align-items': 'flex-end' },
      say: O('Cây, ghế, cây xếp **thành hàng dọc** sát tường phải, cách đều nhau.', 'Plant, stool, plant stacked **in a column** against the right wall, evenly spaced.') },
    { name: O('Ghế đẩu khai trương', 'Opening-day stools'), items: Array(8).fill('stool'), props: ['flex-wrap', 'gap', 'justify-content'], narrow: true, fixed: { 'align-content': 'center', 'align-items': 'center' }, target: { 'flex-wrap': 'wrap', gap: '24px', 'justify-content': 'center' },
      say: O('Tám ghế mà vách ngăn này ngắn quá. Cho ghế **xuống hàng**, chừa lối nhỏ, nằm giữa.', 'Eight stools and a short partition. Let them **wrap**, leave a small aisle, keep them centred.') },
  ];
  const BASE = { 'flex-direction': 'row', 'flex-wrap': 'nowrap', gap: '0px', 'justify-content': 'flex-start', 'align-items': 'flex-start' };

  const furn = (k) => h('div', { class: 'furn', style: `--w:${F[k].w};--h:${F[k].h}`, title: T(F[k]) , html: `<svg viewBox="0 0 ${F[k].w} ${F[k].h}" aria-hidden="true">${F[k].art}</svg>` });
  const apply = (el, css) => Object.entries(css).forEach(([k, v]) => el.style.setProperty(k, v));

  function play(ui) {
    const run = ui.run;
    run.level = run.level || 0;
    run.css = run.css || {};
    const i = run.level, lv = LEVELS[i];
    const cur = (run.css[i] = run.css[i] || { ...BASE, ...(lv.fixed || {}) });
    const full = { ...BASE, ...(lv.fixed || {}), ...lv.target };
    const real = h('div', { class: 'flexbox real' }, lv.items.map(furn));
    const ghost = h('div', { class: 'flexbox ghost', 'aria-hidden': 'true' }, lv.items.map(furn));
    const axH = h('div', { class: 'ax ax-h' }), axV = h('div', { class: 'ax ax-v' });
    const room = h('div', { class: 'room' + (lv.narrow ? ' narrow' : ''), role: 'img', 'aria-label': T(lv.name) }, axH, axV, ghost, real);
    ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(lv.name)), h('span', { class: 'count' }, `${i + 1}/${LEVELS.length}`)), room);
    apply(ghost, full); apply(real, cur);

    let tries = 0, solved = false;
    const code = h('div', { class: 'css' });
    const sampleBox = h('div', { class: 'sample-in' });
    const sample = h('figure', { class: 'sample' }, h('div', { class: 'sample-frame' }, sampleBox), h('figcaption', {}, T(O('Mẫu Linh gửi', 'Linh’s sketch'))));
    const ghostBtn = h('button', { type: 'button', class: 'linkbtn', 'aria-pressed': 'true', onclick: () => { const on = room.classList.toggle('noghost'); ghostBtn.setAttribute('aria-pressed', String(!on)); ghostBtn.textContent = on ? T(O('Hiện bóng mẫu', 'Show outlines')) : T(O('Ẩn bóng mẫu (khó hơn)', 'Hide outlines (harder)')); } }, T(O('Ẩn bóng mẫu (khó hơn)', 'Hide outlines (harder)')));
    ui.ctl.replaceChildren(sample, code, ghostBtn);

    function drawSample() {
      const w = ghost.offsetWidth, ht = ghost.offsetHeight, box = sampleBox.parentElement.clientWidth;
      if (!w || !box) return;
      const clone = ghost.cloneNode(true);
      clone.className = 'flexbox solid';
      clone.style.inset = '0';
      clone.style.width = w + 'px'; clone.style.height = ht + 'px';
      sampleBox.replaceChildren(clone);
      const k = Math.min(box / w, 124 / ht);
      sampleBox.style.transform = `scale(${k})`;
      sampleBox.style.width = w + 'px';
      sampleBox.parentElement.style.height = ht * k + 'px';
      sampleBox.style.marginLeft = Math.max(0, (box - w * k) / 2) + 'px';
    }
    function axes() {
      const col = cur['flex-direction'] === 'column';
      const main = 'justify-content', cross = 'align-items';
      const tag = (name, isMain) => `<span class="${isMain ? 'main' : ''}">${name}${isMain ? ' · ' + esc(T(O('trục chính', 'main axis'))) : ''}</span>`;
      axH.innerHTML = tag(col ? cross : main, !col);
      axV.innerHTML = tag(col ? main : cross, col);
      axH.classList.toggle('main', !col); axV.classList.toggle('main', col);
    }
    function drawCode() {
      code.replaceChildren(h('div', { class: 'line' }, '.quan {'), h('div', { class: 'line in' }, 'display: flex;'),
        ...Object.entries(lv.fixed || {}).map(([k, v]) => h('div', { class: 'line in dim' }, `${k}: ${v};`)),
        ...lv.props.map((p) => h('div', { class: 'prop' }, h('span', { class: 'pname', id: 'p-' + p }, p + ':'),
          h('div', { class: 'vals', role: 'radiogroup', 'aria-labelledby': 'p-' + p }, VALUES[p].map((v) => h('button', { type: 'button', role: 'radio', class: 'val', 'aria-checked': String(cur[p] === v), 'data-p': p, 'data-v': v, onclick: () => set(p, v) }, v))))),
        h('div', { class: 'line' }, '}'));
    }
    function matches() {
      return [...real.children].every((el, j) => { const g = ghost.children[j]; return ['offsetLeft', 'offsetTop', 'offsetWidth', 'offsetHeight'].every((k) => Math.abs(el[k] - g[k]) <= 2); });
    }
    function goals() { ui.goals(LEVELS.map((l, j) => ({ ok: j < i || (j === i && solved), label: l.name }))); }
    function set(p, v) {
      if (cur[p] === v) return;
      cur[p] = v; tries++;
      code.querySelectorAll(`.val[data-p="${p}"]`).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === v)));
      flip(real.children, () => apply(real, cur), { stagger: 35 });
      axes();
      check(true);
    }
    function check(fromUser) {
      const was = solved;
      solved = matches();
      room.classList.toggle('matched', solved);
      goals();
      if (solved && !was) {
        if (!calm) [...real.children].forEach((el, j) => el.firstChild.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }], { duration: 420, delay: 480 + j * 60 }));
        ui.say('linh', i === LEVELS.length - 1 ? O('Đẹp quá! Giống y bản vẽ. Mai mở cửa được rồi.', 'Beautiful! Exactly like my sketch. We can open tomorrow.') : O('Đúng y mẫu luôn! Sang góc tiếp theo nha.', 'That matches the sketch! Next corner.'), i === LEVELS.length - 1 ? 'wow' : 'happy');
        if (i < LEVELS.length - 1) ui.actions(btn(T(O('Góc tiếp theo', 'Next corner')) + ' →', () => { run.level++; play(ui); }, 'primary'));
        else ui.finish();
      } else if (!solved) {
        ui.actions();
        if (was) ui.say('linh', lv.say, 'think');
        else if (fromUser && tries === 5) ui.say('ban', O('Nhìn nhãn **cam**: đó là trục chính. `justify-content` luôn chạy theo trục đó.', 'Look at the **orange** label: that is the main axis. `justify-content` always runs along it.'), 'think');
      }
    }
    ui.say('linh', lv.say, 'think');
    drawCode(); axes(); drawSample(); check(false);
    const onResize = () => { drawSample(); check(false); };
    window.addEventListener('resize', onResize);
    onLeave(() => window.removeEventListener('resize', onResize));
  }

  QM.order.push('ep1');
  QM.eps.ep1 = {
    id: 'ep1', subject: 'web', mech: 'arrange',
    title: O('Dọn quán trước giờ khai trương', 'Furnish the shop before opening'),
    subjectName: O('Phát triển ứng dụng Web', 'Web Application Development'),
    scene: () => ({ tidy: false }), after: () => ({ tidy: true, queue: 3 }),
    intro: [
      { who: 'linh', mood: 'worry', text: O('Mình thuê được cái mặt bằng gần trường rồi. Mai khai trương mà đồ đạc còn chất đống!', 'I got the little space near campus. We open tomorrow and everything is still in boxes!') },
      { who: 'ban', mood: 'think', text: O('Gửi mình bản vẽ. Mình dựng sơ đồ quán trên web rồi xếp đồ bằng CSS.', 'Send me your sketch. I will lay the room out on a web page and place things with CSS.') },
      { who: 'linh', mood: 'happy', text: O('Có 4 góc. Xếp đúng từng góc như mẫu nhé, khách chụp ảnh là phải xinh.', 'Four corners. Match each one to my sketch, people will be taking photos.') },
    ],
    play,
    choice(ui) {
      const items = h('div', { class: 'phone-flex' }, furn('table'), furn('table'), furn('table'));
      const badge = h('p', { class: 'phone-badge', 'aria-live': 'polite' });
      ui.stage.replaceChildren(h('div', { class: 'phone-wrap' }, h('div', { class: 'phone' }, items), badge));
      const judge = () => {
        // layout boxes, not painted ones: a gliding item must not count as overflow
        const over = [...items.children].some((e) => e.offsetLeft < -1 || e.offsetLeft + e.offsetWidth > items.clientWidth + 1 || e.offsetTop + e.offsetHeight > items.clientHeight + 1);
        badge.textContent = over ? T(O('Tràn màn hình: khách phải kéo ngang', 'Overflows: guests must scroll sideways')) : T(O('Vừa khít màn hình ✓', 'Fits the screen ✓'));
        badge.className = 'phone-badge ' + (over ? 'bad' : 'good');
      };
      const set = (css) => () => { flip(items.children, () => { items.removeAttribute('style'); apply(items, css); }, { stagger: 70 }); judge(); };
      return {
        q: O('Khách xem sơ đồ quán trên điện thoại thì 3 cái bàn tràn ra ngoài. Sửa dòng nào?', 'On phones the three tables spill off the screen. Which line fixes it?'),
        reset: () => { items.removeAttribute('style'); judge(); },
        options: [
          { code: 'justify-content: space-between;', good: false, run: set({ 'justify-content': 'space-between' }), reply: O('Vẫn tràn. Chia khoảng trống không giúp được khi chẳng còn khoảng trống nào.', 'Still overflowing. Sharing out free space does nothing when there is none.') },
          { code: 'flex-direction: column;', good: true, fx: { guests: 40, rating: 0.2 }, run: set({ 'flex-direction': 'column' }), reply: O('Ba bàn xếp dọc, vừa khít! Khai trương thôi.', 'The tables stack and fit. Open the doors!'), mood: 'wow' },
          { code: 'gap: 48px;', good: false, run: set({ gap: '48px' }), reply: O('Tệ hơn rồi, thêm khoảng cách là đẩy bàn ra xa hơn.', 'Worse. A bigger gap pushes the tables even further out.') },
        ],
      };
    },
    debrief: {
      term: 'CSS Flexbox',
      thanks: O('Khai trương đông ngoài sức tưởng tượng. Mà khoan… đông quá!', 'Opening day was packed. Wait… too packed!'),
      points: [
        O('`justify-content` xếp theo **trục chính**, `align-items` theo **trục phụ**.', '`justify-content` works along the **main axis**, `align-items` across it.'),
        O('`flex-direction: column` xoay hai trục, nên cùng một lệnh cho ra hướng khác.', '`flex-direction: column` swaps the axes, so the same line moves things another way.'),
        O('Web thật dùng media query để đổi `row` thành `column` trên điện thoại.', 'Real sites use a media query to turn a `row` into a `column` on phones.'),
      ],
      code: '@media (max-width: 600px) {\n  .quan { flex-direction: column; }\n}',
    },
  };
})();

/* Episode 2 · Operating Systems: one barista is one CPU. Order the work and watch it run. */
(function () {
  const L1 = [
    { id: 'A', name: O('Cà phê muối ×4', 'Salt coffee ×4'), burst: 8, arrive: 0 },
    { id: 'B', name: O('Trà đào', 'Peach tea'), burst: 2, arrive: 0 },
    { id: 'C', name: O('Sinh tố ×2', 'Smoothie ×2'), burst: 5, arrive: 0 },
    { id: 'D', name: O('Nước chanh', 'Lemonade'), burst: 1, arrive: 0 },
    { id: 'E', name: O('Trà sữa', 'Milk tea'), burst: 3, arrive: 0 },
  ];
  const L2 = [
    { id: 'P', name: O('Đơn tiệc ×12', 'Party order ×12'), burst: 12, arrive: 0, party: true },
    { id: 'B', name: O('Trà đào', 'Peach tea'), burst: 2, arrive: 1 },
    { id: 'D', name: O('Nước chanh', 'Lemonade'), burst: 1, arrive: 2 },
    { id: 'E', name: O('Trà sữa', 'Milk tea'), burst: 3, arrive: 3 },
  ];
  const AVG_GOAL = 4.5, SMALL_LIMIT = 9, PARTY_LIMIT = 20, SWITCH = 0.5;

  /* A tiny scheduler: 'fcfs' (queue order), 'sjf' (shortest job, no interruption), 'rr' (turns of length q). */
  function simulate(orders, policy, q = 3, sw = 0) {
    const pending = [...orders].sort((a, b) => a.arrive - b.arrive);
    const rem = {}, start = {}, finish = {}, slices = [], queue = [];
    orders.forEach((o) => { rem[o.id] = o.burst; });
    let t = 0, next = 0, last = null;
    const admit = () => { while (next < pending.length && pending[next].arrive <= t + 1e-9) queue.push(pending[next++]); };
    admit();
    while (queue.length || next < pending.length) {
      if (!queue.length) { t = pending[next].arrive; admit(); continue; }
      if (policy === 'sjf') queue.sort((a, b) => rem[a.id] - rem[b.id] || a.arrive - b.arrive);
      const job = queue.shift();
      if (last && last !== job.id && sw) { slices.push({ id: null, from: t, to: t + sw }); t += sw; admit(); }
      const run = policy === 'rr' ? Math.min(q, rem[job.id]) : rem[job.id];
      if (start[job.id] == null) start[job.id] = t;
      slices.push({ id: job.id, from: t, to: t + run });
      t += run; rem[job.id] -= run; admit();
      if (rem[job.id] > 1e-9) queue.push(job); else finish[job.id] = t;
      last = job.id;
    }
    const turn = {}, wait = {};
    orders.forEach((o) => { turn[o.id] = finish[o.id] - o.arrive; wait[o.id] = start[o.id] - o.arrive; });
    return { slices, start, finish, turn, wait, end: t };
  }
  QM.simulate = simulate;
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const min = (v) => num(v) + '′';

  function gantt(orders, horizon) {
    const track = h('div', { class: 'g-track' });
    const cursor = h('i', { class: 'g-cursor' });
    const ticks = h('div', { class: 'g-ticks', 'aria-hidden': 'true' });
    for (let m = 0; m <= horizon; m += 4) ticks.append(h('span', { style: `left:${(m / horizon) * 100}%` }, m + '′'));
    const el = h('div', { class: 'gantt' }, h('div', { class: 'g-wrap' }, track, cursor), ticks);
    let bars = [];
    return {
      el,
      load(sim) {
        bars = sim.slices.map((s) => { const o = orders.find((x) => x.id === s.id); const b = h('b', { class: s.id ? 'slice t-' + s.id : 'slice switch', style: `left:${(s.from / horizon) * 100}%;width:0%`, title: o ? T(o.name) : T(O('Đổi ly', 'Switching')) }, o ? s.id : ''); return { s, b }; });
        track.replaceChildren(...bars.map((x) => x.b));
      },
      at(t) { bars.forEach(({ s, b }) => { b.style.width = (Math.max(0, Math.min(s.to, t) - s.from) / horizon) * 100 + '%'; }); cursor.style.left = (Math.min(t, horizon) / horizon) * 100 + '%'; },
    };
  }

  function play(ui) {
    const run = ui.run;
    run.level = run.level || 0;
    if (run.level === 0) level1(ui); else level2(ui);
  }

  function board(ui, orders, title, horizon) {
    const cards = {};
    orders.forEach((o) => {
      cards[o.id] = h('button', { type: 'button', class: 'order t-' + o.id },
        h('span', { class: 'tag' }, o.id), h('span', { class: 'oname' }, T(o.name)),
        h('span', { class: 'omin' }, o.burst + '′' + (o.arrive ? ' · ' + T(O('đến phút ', 'arrives at ')) + o.arrive : '')),
        h('span', { class: 'ostate' }), h('i', { class: 'patience' }, h('i')));
    });
    const cup = h('i', { class: 'fill' }), now = h('p', { class: 'now' });
    const machine = h('div', { class: 'barista' }, h('span', { html: avatar('linh', 'happy') }), h('div', { class: 'cup' }, cup), now);
    const g = gantt(orders, horizon);
    const result = h('div', { class: 'result', 'aria-live': 'polite' });
    ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(title)), h('span', { class: 'count' }, `${ui.run.level + 1}/2`)));
    let stop = null;
    function paint(sim, t, limit) {
      g.at(t);
      const slice = sim.slices.find((s) => s.from <= t && t < s.to);
      orders.forEach((o) => {
        const c = cards[o.id], done = sim.finish[o.id] <= t + 1e-9, making = slice && slice.id === o.id, here = t + 1e-9 >= o.arrive;
        const since = Math.max(0, Math.min(t, sim.finish[o.id]) - o.arrive);
        const waited = Math.max(0, Math.min(t, sim.start[o.id]) - o.arrive);
        c.dataset.state = !here ? 'away' : done ? 'done' : making ? 'making' : 'wait';
        c.querySelector('.ostate').textContent = !here ? T(O('chưa đến', 'not here yet')) : done ? (limit ? T(O('xong sau ', 'done after ')) + min(sim.turn[o.id]) : '✓ ' + T(O('đã chờ ', 'waited ')) + min(sim.wait[o.id])) : making ? T(O('đang pha', 'being made')) : T(O('chờ ', 'waiting ')) + min(limit ? since : waited);
        const frac = Math.min(1, (limit ? since : waited) / (limit ? (o.party ? PARTY_LIMIT : limit) : 10));
        c.querySelector('.patience > i').style.width = frac * 100 + '%';
        c.classList.toggle('late', limit ? since > (o.party ? PARTY_LIMIT : limit) + 1e-9 : waited > 7);
      });
      const o = slice && slice.id && orders.find((x) => x.id === slice.id);
      if (o) { const worked = sim.slices.filter((s) => s.id === o.id).reduce((a, s) => a + Math.max(0, Math.min(s.to, t) - s.from), 0); cup.style.height = (worked / o.burst) * 100 + '%'; cup.className = 'fill t-' + o.id; now.textContent = T(O('Đang pha: ', 'Making: ')) + T(o.name); }
      else if (slice) { cup.style.height = '0%'; now.textContent = T(O('Đang đổi ly (0,5′)', 'Switching cups (0.5′)')); }
      else { cup.style.height = '0%'; now.textContent = t >= sim.end ? T(O('Xong hết đơn', 'All orders done')) : T(O('Rảnh tay', 'Idle')); }
    }
    function animate(sim, limit, after) {
      if (stop) stop();
      g.load(sim);
      let t = 0;
      if (calm) { paint(sim, sim.end, limit); after(); return; }
      stop = loop((dt) => { t += (dt / 1000) * Math.max(3.5, sim.end / 5.5); paint(sim, Math.min(t, sim.end), limit); if (t >= sim.end) { after(); return false; } return true; });
    }
    return { cards, machine, g, result, animate, reset() { if (stop) stop(); g.load({ slices: [] }); g.at(0); cup.style.height = '0%'; now.textContent = T(O('Chờ bạn xếp hàng', 'Waiting for your plan')); orders.forEach((o) => { const c = cards[o.id]; c.dataset.state = 'idle'; c.classList.remove('late'); c.querySelector('.ostate').textContent = ''; c.querySelector('.patience > i').style.width = '0%'; }); result.replaceChildren(); } };
  }

  function level1(ui) {
    const run = ui.run;
    run.queue = run.queue || [];
    run.tries1 = run.tries1 || [];
    const b = board(ui, L1, O('Giờ cao điểm: 5 đơn cùng lúc', 'Rush hour: 5 orders at once'), 20);
    const pool = h('div', { class: 'pool' }), slots = h('div', { class: 'slots' });
    ui.stage.append(
      h('p', { class: 'lane-h' }, T(O('Khách đang chờ: bấm đơn để đưa vào hàng pha', 'Waiting customers: tap an order to queue it'))), pool,
      h('p', { class: 'lane-h' }, T(O('Hàng pha, làm từ trái sang phải', 'Brew queue, made left to right'))), slots,
      b.machine, b.g.el, b.result);
    const history = h('ol', { class: 'tries' });
    ui.ctl.replaceChildren(
      h('div', { class: 'row' }, btn(T(O('Xếp theo thứ tự đến', 'Use arrival order')), () => { run.queue = L1.map((o) => o.id); place(); }), btn(T(O('Làm trống', 'Clear')), () => { run.queue = []; place(); }, 'ghost')),
      history);
    let solved = run.solved1 || false;
    const brew = btn('▶ ' + T(O('Pha theo hàng này', 'Brew this queue')), () => {
      brew.disabled = true;
      const sim = simulate(run.queue.map((id) => L1.find((o) => o.id === id)), 'fcfs');
      b.animate(sim, 0, () => {
        const avg = mean(L1.map((o) => sim.wait[o.id])), ok = avg <= AVG_GOAL + 1e-9;
        brew.disabled = false;
        b.result.replaceChildren(enter(h('p', { class: 'score ' + (ok ? 'good' : 'bad') }, h('span', {}, T(O('Chờ trung bình', 'Average wait'))), h('b', {}, min(avg)), h('small', {}, T(O('mục tiêu ≤ 4,5′', 'target ≤ 4.5′')))), 0, 'scale(.8)'));
        run.tries1.push({ order: run.queue.join(' → '), avg });
        drawHistory();
        if (ok) { solved = run.solved1 = true; ui.say('linh', O(`Chờ trung bình còn **${min(avg)}**! Ly nhanh làm trước nên ít người phải đứng đợi.`, `Average wait down to **${min(avg)}**! Quick cups first means fewer people stand waiting.`), 'wow'); ui.actions(btn(T(O('Ca khó hơn', 'A harder shift')) + ' →', () => { run.level = 1; play(ui); }, 'primary')); }
        else ui.say('linh', run.tries1.length >= 2 ? O(`Vẫn **${min(avg)}**. Mỗi ly đứng trước bắt **tất cả** người phía sau chờ theo. Ly nào nên đứng trước?`, `Still **${min(avg)}**. Every cup in front makes **everyone** behind it wait. Which cup should go first?`) : O(`Trung bình mỗi người chờ **${min(avg)}**, ai cũng cau mày. Đổi thứ tự thử xem.`, `People wait **${min(avg)}** on average and they are frowning. Try another order.`), 'worry');
        goals();
      });
    }, 'primary');
    const goals = () => ui.goals([{ ok: solved, label: O('Chờ trung bình ≤ 4,5 phút', 'Average wait ≤ 4.5 minutes') }, { ok: false, label: O('Đơn tiệc không chặn khách lẻ', 'The party order must not block others') }]);
    function drawHistory() {
      history.replaceChildren(...run.tries1.slice(-4).map((x) => h('li', { class: x.avg <= AVG_GOAL ? 'good' : '' }, h('span', { class: 'mono' }, x.order), h('b', {}, min(x.avg)))));
    }
    function place() {
      b.reset();
      flip(L1.map((o) => b.cards[o.id]), () => {
        pool.replaceChildren(...L1.filter((o) => !run.queue.includes(o.id)).map((o) => b.cards[o.id]));
        slots.replaceChildren(...L1.map((_, k) => h('div', { class: 'slot', 'data-n': k + 1 }, run.queue[k] ? b.cards[run.queue[k]] : null)));
      }, { duration: 420 });
      brew.disabled = run.queue.length < L1.length;
      ui.actions(brew, solved ? btn(T(O('Ca khó hơn', 'A harder shift')) + ' →', () => { run.level = 1; play(ui); }) : null);
    }
    L1.forEach((o) => b.cards[o.id].addEventListener('click', () => { const k = run.queue.indexOf(o.id); if (k >= 0) run.queue.splice(k, 1); else run.queue.push(o.id); place(); }));
    ui.say('linh', O('Pha xong ly này mới tới ly sau. Xếp sao cho **trung bình mỗi khách chờ không quá 4,5 phút**.', 'One cup at a time. Arrange them so the **average customer waits at most 4.5 minutes**.'), 'worry');
    place(); drawHistory(); goals();
  }

  function level2(ui) {
    const run = ui.run;
    run.policy = run.policy || 'fcfs'; run.q = run.q || 1; run.tries2 = run.tries2 || [];
    const b = board(ui, L2, O('Đơn tiệc đến trước', 'The party order lands first'), 24);
    const lane = h('div', { class: 'pool fixed' }, L2.map((o) => b.cards[o.id]));
    L2.forEach((o) => { b.cards[o.id].tabIndex = -1; });
    ui.stage.append(h('p', { class: 'lane-h' }, T(O('Đổi ly giữa hai đơn mất 0,5 phút', 'Switching between orders costs 0.5 minutes'))), lane, b.machine, b.g.el, b.result);
    const POL = [['fcfs', O('Đến trước làm trước', 'First come, first served')], ['sjf', O('Đơn ngắn trước', 'Shortest order first')], ['rr', O('Chia lượt', 'Take turns')]];
    const seg = h('div', { class: 'seg col', role: 'radiogroup', 'aria-label': T(O('Cách pha', 'Policy')) }, POL.map(([k, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(run.policy === k), 'data-k': k, onclick: () => { run.policy = k; sync(); } }, T(l))));
    const qOut = h('output', {}), qIn = h('input', { type: 'range', id: 'quantum', min: '1', max: '8', step: '1', value: String(run.q) });
    qIn.addEventListener('input', () => { run.q = +qIn.value; sync(); });
    const qRow = h('label', { class: 'slider', for: 'quantum' }, h('span', {}, T(O('Mỗi lượt dài', 'Turn length'))), qIn, qOut);
    const table = h('table', { class: 'tries2' });
    ui.ctl.replaceChildren(seg, qRow, table);
    let solved = false;
    const goals = (small, party) => ui.goals([{ ok: true, label: O('Chờ trung bình ≤ 4,5 phút', 'Average wait ≤ 4.5 minutes') }, { ok: !!small, label: O('Mỗi đơn lẻ xong trong 9 phút kể từ lúc đến', 'Each small order done within 9 min of arriving') }, { ok: !!party, label: O('Đơn tiệc xong trước phút 20', 'Party order done by minute 20') }]);
    const label = (p, q) => T(POL.find((x) => x[0] === p)[1]) + (p === 'rr' ? ' ' + q + '′' : '');
    const brew = btn('▶ ' + T(O('Chạy ca này', 'Run the shift')), () => {
      brew.disabled = true;
      const p = run.policy, q = run.q;
      const sim = simulate(L2, p, q, SWITCH);
      b.animate(sim, SMALL_LIMIT, () => {
        brew.disabled = false;
        const worst = Math.max(...L2.filter((o) => !o.party).map((o) => sim.turn[o.id])), party = sim.finish.P;
        const a = worst <= SMALL_LIMIT + 1e-9, c = party <= PARTY_LIMIT + 1e-9;
        run.tries2 = run.tries2.filter((x) => x.label !== label(p, q)).concat({ label: label(p, q), worst, party, a, c }).slice(-5);
        drawTable(); goals(a, c);
        if (a && c) { solved = true; brew.classList.remove('primary'); ui.say('linh', O('Cả hai đều đạt! Khách lẻ không phải đứng sau đơn tiệc, mà đơn tiệc vẫn kịp giờ.', 'Both met! Small orders no longer queue behind the party, and the party is still on time.'), 'wow'); ui.actions(btn(T(UI.askMore) + ' →', () => ui.go('choice'), 'primary'), brew); }
        else {
          const why = !a && p !== 'rr' ? O('Đã bắt đầu đơn 12 phút là không dừng được, ai đến sau cũng phải đợi. Có cách nào **dừng giữa chừng** không?', 'Once the 12-minute order starts it never stops, so everyone behind it waits. Is there a way to **pause it**?')
            : !a && !c ? O('Lượt quá ngắn: đổi ly liên tục nên **ai cũng trễ**.', 'Turns too short: constant switching makes **everyone late**.')
              : !a ? O(`Có khách lẻ đợi tới **${min(worst)}**. Lượt dài hay ngắn hơn thì họ được phục vụ sớm?`, `One small order took **${min(worst)}**. Would longer or shorter turns serve it sooner?`)
                : O(`Đơn tiệc tới phút **${num(party)}** mới xong vì đổi ly quá nhiều.`, `The party order only finished at minute **${num(party)}**: too much switching.`);
          ui.say('linh', why, 'worry'); ui.actions(brew);
        }
      });
    }, 'primary');
    function drawTable() {
      if (!run.tries2.length) { table.replaceChildren(); return; }
      table.replaceChildren(h('thead', {}, h('tr', {}, h('th', {}, T(O('Cách pha', 'Policy'))), h('th', {}, T(O('Đơn lẻ lâu nhất', 'Slowest small'))), h('th', {}, T(O('Tiệc xong', 'Party done'))))),
        h('tbody', {}, run.tries2.map((x) => h('tr', {}, h('td', {}, x.label), h('td', { class: x.a ? 'good' : 'bad' }, (x.a ? '✓ ' : '✕ ') + min(x.worst)), h('td', { class: x.c ? 'good' : 'bad' }, (x.c ? '✓ ' : '✕ ') + min(x.party))))));
    }
    function sync() {
      seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.k === run.policy)));
      qRow.classList.toggle('off', run.policy !== 'rr'); qIn.disabled = run.policy !== 'rr';
      qOut.textContent = run.q + '′';
      b.reset(); ui.actions(solved ? btn(T(UI.askMore) + ' →', () => ui.go('choice'), 'primary') : null, brew);
    }
    ui.say('linh', O('Lần này đơn tiệc 12 phút tới đầu tiên, rồi khách lẻ lần lượt vào. Chọn cách pha để **cả hai bên đều kịp**.', 'This time a 12-minute party order arrives first, then small orders trickle in. Pick a policy that keeps **both sides on time**.'), 'worry');
    sync(); drawTable(); goals(false, false);
  }

  QM.order.push('ep2');
  QM.eps.ep2 = {
    rules: { simulate, L1, L2, AVG_GOAL, SMALL_LIMIT, PARTY_LIMIT, SWITCH },
    id: 'ep2', subject: 'os', mech: 'schedule',
    title: O('Giờ cao điểm, một người pha', 'Rush hour, one barista'),
    subjectName: O('Hệ điều hành', 'Operating Systems'),
    scene: () => ({ tidy: true, queue: 6 }), after: () => ({ tidy: true, queue: 2 }),
    intro: [
      { who: 'linh', mood: 'worry', text: O('11 rưỡi, năm đơn dồn vào một lúc mà chỉ có mỗi mình mình pha!', 'It is 11:30, five orders at once, and I am the only one brewing!') },
      { who: 'ban', mood: 'think', text: O('Một người pha giống một bộ xử lý: mỗi lúc chỉ làm được một việc. **Thứ tự** quyết định ai chờ bao lâu.', 'One barista is like one processor: one job at a time. The **order** decides who waits how long.') },
      { who: 'linh', mood: 'happy', text: O('Vậy xếp hàng pha giúp mình đi. Đừng để khách bỏ về.', 'Then plan my queue. Do not let people walk out.') },
    ],
    play,
    choice(ui) {
      const orders = [{ id: 'P', name: O('Đơn 20 ly', '20-cup order'), burst: 25, arrive: 0, party: true }, ...[1, 5, 9, 13, 17, 21].map((a, k) => ({ id: 'k' + k, name: O('Khách lẻ', 'Walk-in'), burst: 2, arrive: a }))];
      const rows = h('div', { class: 'compare' });
      ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Thử trước trên giấy: đơn 20 ly và 6 khách lẻ', 'Dry run: a 20-cup order plus 6 walk-ins')))), rows);
      const stats = (policy, q) => { const sim = simulate(orders, policy, q, SWITCH); return { sim, avg: mean(orders.filter((o) => !o.party).map((o) => sim.turn[o.id])), big: sim.finish.P }; };
      const draw = (key, title, st) => {
        const H = 64, row = h('div', { class: 'cmp', 'data-key': key }, h('p', {}, h('b', {}, title), h('span', {}, T(O('khách lẻ chờ TB ', 'walk-ins avg ')) + min(st.avg) + ' · ' + T(O('đơn lớn xong phút ', 'big order done at ')) + num(st.big))),
          h('div', { class: 'g-track' }, st.sim.slices.map((s) => h('b', { class: 'slice ' + (s.id === null ? 'switch' : s.id === 'P' ? 't-P' : 't-B'), style: `left:${(s.from / H) * 100}%;width:${((s.to - s.from) / H) * 100}%` }))));
        const old = rows.querySelector(`[data-key="${key}"]`);
        if (old) old.replaceWith(row); else rows.append(row);
        enter(row, 0, 'translateX(-24px)');
      };
      const A = stats('fcfs', 1), B = stats('rr', 3), C = stats('rr', 0.5);
      const lost = Math.round((100 * C.sim.slices.filter((s) => s.id === null).reduce((a, s) => a + s.to - s.from, 0)) / C.sim.end);
      return {
        q: O('Chiều nay văn phòng bên cạnh đặt 20 ly, pha mất 25 phút, khách lẻ vẫn ghé đều. Mình pha kiểu gì?', 'The office next door ordered 20 cups (25 minutes of work) and walk-ins keep coming. How should I brew?'),
        reset: () => {},
        options: [
          { label: O('Làm một mạch cho xong đơn 20 ly', 'Finish the 20-cup order in one go'), good: false, run: () => draw('A', 'A', A), reply: O(`Khách lẻ đợi trung bình **${min(A.avg)}** cho một ly 2 phút. Họ bỏ đi mất.`, `Walk-ins wait **${min(A.avg)}** on average for a 2-minute drink. They leave.`) },
          { label: O('Chia lượt: 3 phút cho đơn lớn rồi quay sang khách lẻ', 'Take turns: 3 minutes on the big one, then a walk-in'), good: true, fx: { rating: 0.3, guests: 15, money: 600000 }, run: () => draw('B', 'B', B), reply: O(`Khách lẻ chỉ đợi **${min(B.avg)}**, đơn lớn xong phút **${num(B.big)}**. Cả hai đều chịu được.`, `Walk-ins wait **${min(B.avg)}**, the big order is done at minute **${num(B.big)}**. Both can live with that.`), mood: 'wow' },
          { label: O('Chia thật nhỏ, 30 giây đổi một lần cho công bằng', 'Switch every 30 seconds to be extra fair'), good: false, run: () => draw('C', 'C', C), reply: O(`Đổi ly ngốn **${lost}%** thời gian. Đơn lớn tới phút **${num(C.big)}** mới xong.`, `Switching eats **${lost}%** of the shift. The big order is only done at minute **${num(C.big)}**.`) },
        ],
      };
    },
    debrief: {
      term: O('Lập lịch CPU', 'CPU scheduling'),
      thanks: O('Hết cảnh khách đứng cau mày. Tối nay mình đếm két đây.', 'No more frowning queue. Time to count tonight’s cash.'),
      points: [
        O('Đơn hàng là **tiến trình**, người pha là **CPU**, đổi ly là **chuyển ngữ cảnh**.', 'An order is a **process**, the barista is the **CPU**, switching cups is a **context switch**.'),
        O('Việc ngắn trước (**SJF**) giảm thời gian chờ trung bình. Việc dài đứng đầu gây **hiệu ứng đoàn xe**.', 'Shortest job first (**SJF**) cuts average waiting. A long job at the front causes the **convoy effect**.'),
        O('**Round Robin** phản hồi nhanh, nhưng lượt quá ngắn thì phí công chuyển đổi.', '**Round robin** responds quickly, but turns that are too short waste time switching.'),
      ],
      code: 'while queue:\n    job = queue.popleft()\n    job.run(quantum)\n    if job.remaining > 0:\n        queue.append(job)',
    },
  };
})();

/* Episode 3 · Databases: the till is short. Question the orders table until it tells you why. */
(function () {
  const D = { td: O('Trà đào', 'Peach tea'), cm: O('Cà phê muối', 'Salt coffee'), ts: O('Trà sữa', 'Milk tea'), st: O('Sinh tố', 'Smoothie') };
  const R = (id, gio, mon, gia, ma, tra) => ({ id, gio, mon, gia, ma_giam: ma, da_tra: tra });
  const ROWS = [
    R(101, '08:10', 'td', 20000, null, 20000), R(102, '08:42', 'cm', 25000, 'HSSV', 22500), R(103, '09:15', 'ts', 30000, null, 30000), R(104, '10:05', 'st', 35000, 'SINHNHAT', 0),
    R(105, '11:30', 'td', 20000, 'HSSV', 18000), R(106, '11:34', 'cm', 25000, null, 25000), R(107, '12:20', 'ts', 30000, null, 30000), R(108, '14:05', 'td', 20000, 'TEST100', 0),
    R(109, '14:09', 'cm', 25000, 'TEST100', 0), R(110, '14:12', 'st', 35000, null, 35000), R(111, '14:18', 'ts', 30000, 'TEST100', 0), R(112, '14:27', 'td', 20000, 'TEST100', 0),
    R(113, '14:40', 'cm', 25000, 'TEST100', 0), R(114, '15:30', 'td', 20000, null, 20000), R(115, '17:10', 'st', 35000, 'HSSV', 31500), R(116, '18:02', 'ts', 30000, null, 30000),
  ];
  const COLS = ['id', 'gio', 'mon', 'gia', 'ma_giam', 'da_tra'];
  const FIELDS = { da_tra: { ops: ['=', '>', '<'], vals: [0, 20000, 30000] }, gia: { ops: ['=', '>', '<'], vals: [20000, 25000, 30000] }, ma_giam: { ops: ['=', '<>'], vals: ['TEST100', 'HSSV', 'SINHNHAT'] }, gio: { ops: ['>', '<'], vals: ['12:00', '14:00', '15:00'] } };
  const lit = (v) => (typeof v === 'number' ? String(v) : `'${v}'`);
  const test = (row, w) => {
    if (!w.col) return true;
    const a = row[w.col], b = w.val;
    if (a === null) return false; /* NULL never matches a comparison, just like real SQL */
    return w.op === '=' ? a === b : w.op === '<>' ? a !== b : w.op === '>' ? a > b : a < b;
  };
  const cell = (r, c) => (c === 'mon' ? T(D[r.mon]) : c === 'gia' || c === 'da_tra' ? r[c].toLocaleString(locale()) : r[c] === null ? 'NULL' : String(r[c]));

  function play(ui) {
    const run = ui.run;
    const q = (run.query = run.query || { col: '', op: '=', val: null, group: '' });
    const got = (run.got = run.got || {});
    const head = h('div', { class: 'tr th', role: 'row' }), body = h('div', { class: 'tbody', role: 'rowgroup' });
    const count = h('span', { class: 'count', 'aria-live': 'polite' });
    const sql = h('pre', { class: 'code sql' });
    ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Bảng don_hang: đơn trong một ngày', 'Table don_hang: one day of orders'))), count), sql, h('div', { class: 'table', role: 'table' }, head, body));

    const sel = (id, label, opts, value, onchange) => {
      const s = h('select', { id, 'aria-label': label, onchange: (e) => onchange(e.target.value) }, opts.map(([v, t]) => h('option', { value: v }, t)));
      s.value = value; return s;
    };
    const whereRow = h('div', { class: 'qrow' }), groupRow = h('div', { class: 'qrow' });
    ui.ctl.replaceChildren(whereRow, groupRow);
    function drawControls() {
      const f = FIELDS[q.col];
      whereRow.replaceChildren(h('span', { class: 'kw' }, 'WHERE'),
        sel('w-col', 'WHERE', [['', T(O('(không lọc)', '(no filter)'))], ...Object.keys(FIELDS).map((k) => [k, k])], q.col, (v) => { q.col = v; if (v) { q.op = FIELDS[v].ops[0]; q.val = FIELDS[v].vals[0]; } drawControls(); preview(); }),
        f ? sel('w-op', T(O('phép so sánh', 'operator')), f.ops.map((o) => [o, o]), q.op, (v) => { q.op = v; preview(); }) : null,
        f ? sel('w-val', T(O('giá trị', 'value')), f.vals.map((v, i) => [String(i), lit(v)]), String(Math.max(0, f.vals.indexOf(q.val))), (v) => { q.val = f.vals[+v]; preview(); }) : null);
      groupRow.replaceChildren(h('span', { class: 'kw' }, 'GROUP BY'), sel('g-col', 'GROUP BY', [['', T(O('(không gom)', '(no grouping)'))], ['ma_giam', 'ma_giam'], ['mon', 'mon']], q.group, (v) => { q.group = v; preview(); }));
    }
    const text = () => `SELECT ${q.group ? q.group + ', COUNT(*), SUM(gia)' : '*'}\nFROM don_hang${q.col ? `\nWHERE ${q.col} ${q.op} ${lit(q.val)}` : ''}${q.group ? `\nGROUP BY ${q.group}` : ''};`;
    function preview() { sql.textContent = text(); sql.classList.add('dirty'); }
    const goals = () => ui.goals([
      { ok: got.zero, label: O('Lọc ra đúng các đơn khách trả **0₫**', 'Filter exactly the orders that paid **0₫**') },
      { ok: got.group, label: O('Gom theo mã giảm giá để thấy chỗ bất thường', 'Group by discount code to spot what is odd') },
      { ok: got.culprit, label: O('Chỉ ra thủ phạm làm hụt **120.000₫**', 'Point at what drained **120,000₫**') },
    ]);

    function rowEl(r) { return h('div', { class: 'tr', role: 'row', 'data-id': r.id }, COLS.map((c) => h('span', { role: 'cell', class: 'c-' + c + (r[c] === null ? ' null' : '') + (c === 'da_tra' && r[c] === 0 ? ' zero' : '') }, cell(r, c)))); }
    function showRows(rows, animate) {
      head.className = 'tr th'; head.replaceChildren(...COLS.map((c) => h('span', { role: 'columnheader', class: 'c-' + c }, c)));
      const old = [...body.querySelectorAll('.tr[data-id]')];
      const keep = new Set(rows.map((r) => String(r.id)));
      const swap = () => {
        const survivors = old.filter((e) => keep.has(e.dataset.id));
        const next = rows.map((r) => survivors.find((e) => e.dataset.id === String(r.id)) || rowEl(r));
        flip(survivors, () => body.replaceChildren(...next), { stagger: 18, duration: 420 });
        next.filter((e) => !survivors.includes(e)).forEach((e, i) => enter(e, i * 18, 'translateX(-14px)'));
        if (!rows.length) body.replaceChildren(h('p', { class: 'empty' }, T(O('Không có dòng nào khớp.', 'No rows match.'))));
      };
      const leaving = old.filter((e) => !keep.has(e.dataset.id));
      if (animate && leaving.length && !calm) { leaving.forEach((e, i) => e.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(40px)' }], { duration: 260, delay: i * 16, fill: 'forwards' })); later(260 + leaving.length * 16, swap); } else swap();
    }
    function showGroups(rows) {
      const map = new Map();
      rows.forEach((r) => { const k = r[q.group]; if (!map.has(k)) map.set(k, []); map.get(k).push(r); });
      const groups = [...map.entries()].sort((a, b) => b[1].length - a[1].length);
      head.className = 'tr th grp'; head.replaceChildren(h('span', {}, q.group), h('span', {}, 'COUNT(*)'), h('span', {}, 'SUM(gia)'), h('span', {}));
      body.replaceChildren(...groups.map(([k, list], i) => {
        const name = k === null ? 'NULL' : q.group === 'mon' ? T(D[k]) : k;
        const accuse = q.group === 'ma_giam' && k !== null ? h('button', { type: 'button', class: 'accuse', onclick: (e) => pick(k, e.target.closest('.tr')) }, T(O('Thủ phạm?', 'Culprit?'))) : h('span', {});
        return enter(h('div', { class: 'tr grp', role: 'row' }, h('span', { class: k === null ? 'null' : '' }, name),
          h('span', { class: 'stack' }, h('b', {}, String(list.length)), list.map((_, j) => enter(h('i'), i * 90 + j * 55, 'translateY(-16px)'))),
          h('span', {}, list.reduce((a, r) => a + r.gia, 0).toLocaleString(locale())), accuse), i * 90);
      }));
    }
    function pick(code, rowNode) {
      if (code === 'TEST100') {
        got.culprit = true; rowNode.classList.add('guilty');
        ui.say('linh', O('**TEST100**! Đó là mã dùng thử lúc cài máy tính tiền, giảm 100%. Chưa ai tắt nó cả.', '**TEST100**! That was a 100%-off code for trying out the till. Nobody ever switched it off.'), 'wow');
        goals(); ui.finish();
      } else {
        rowNode.classList.add('cleared');
        ui.say('linh', code === 'SINHNHAT' ? O('Mã sinh nhật là chính tay mình duyệt cho một bạn khách mà. Xem **tổng tiền** từng mã đi.', 'I approved that birthday code myself. Compare the **totals** per code.') : O('Mã sinh viên chỉ giảm 10%, khách vẫn trả tiền. Mã nào khiến khách trả **0₫**?', 'The student code is only 10% off, people still paid. Which code made guests pay **0₫**?'), 'think');
      }
    }
    function exec(animate) {
      sql.textContent = text(); sql.classList.remove('dirty');
      const rows = ROWS.filter((r) => test(r, q));
      count.textContent = rows.length + ' ' + T(O('dòng', 'rows'));
      const zeroIds = ROWS.filter((r) => r.da_tra === 0).map((r) => r.id).join();
      const isZero = rows.map((r) => r.id).join() === zeroIds;
      if (q.group) { showGroups(rows); if (q.group === 'ma_giam' && rows.some((r) => r.ma_giam === 'TEST100')) got.group = true; } else showRows(rows, animate);
      if (isZero) got.zero = true;
      goals();
      if (!animate) return;
      if (got.culprit) return;
      if (q.group === 'ma_giam' && got.group) ui.say('linh', O('Giờ thì gọn rồi. Bấm **“Thủ phạm?”** ở mã bạn nghi ngờ.', 'Much clearer. Tap **“Culprit?”** next to the code you suspect.'), 'think');
      else if (isZero) ui.say('ban', O('6 đơn trả 0₫. Giờ **gom theo `ma_giam`** để biết chúng dùng mã gì.', 'Six orders paid 0₫. Now **group by `ma_giam`** to see which codes they used.'), 'happy');
      else if (!got.zero) ui.say('linh', O(`Ra ${rows.length} dòng. Mình cần đúng những đơn **không thu được đồng nào**, cột \`da_tra\` ấy.`, `${rows.length} rows. I need exactly the orders that **brought in nothing**, see the \`da_tra\` column.`), 'think');
    }
    ui.say('linh', O('Doanh thu trên đơn không khớp tiền trong két: hụt **120.000₫**. Hỏi cái bảng này giúp mình.', 'The orders do not match the cash drawer: **120,000₫** short. Interrogate this table for me.'), 'worry');
    drawControls(); exec(false);
    ui.actions(btn('▶ ' + T(O('Chạy truy vấn', 'Run query')), () => { exec(true); if (got.culprit) ui.finish(); }, 'primary'));
    if (got.culprit) ui.finish();
  }

  QM.order.push('ep3');
  QM.eps.ep3 = {
    rules: { ROWS, test },
    id: 'ep3', subject: 'db', mech: 'detective',
    title: O('Két tiền bị hụt', 'The till is short'),
    subjectName: O('Cơ sở dữ liệu cơ bản', 'Basic Databases'),
    scene: () => ({ tidy: true, money: true }), after: () => ({ tidy: true, queue: 3 }),
    intro: [
      { who: 'linh', mood: 'worry', text: O('Đếm két xong hụt 120.000₫. Mà đơn nào máy cũng ghi đầy đủ!', 'The drawer is 120,000₫ short, yet the till recorded every order!') },
      { who: 'ban', mood: 'think', text: O('Máy lưu đơn vào cơ sở dữ liệu. Mình không dò từng dòng, mình **đặt câu hỏi** cho nó.', 'The till stores orders in a database. We will not scan line by line, we will **ask it questions**.') },
      { who: 'linh', mood: 'think', text: O('Hỏi nó đi. Mình muốn biết tiền rơi ở đâu.', 'Ask away. I want to know where the money went.') },
    ],
    play,
    choice(ui) {
      const CODES = ['HSSV', 'SINHNHAT', 'TEST100'];
      const list = h('div', { class: 'coupons' }), log = h('div', { class: 'ledger' });
      ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Bảng khuyen_mai và bằng chứng', 'Table khuyen_mai and the evidence')))), list, log);
      const draw = (off, lost) => {
        list.replaceChildren(...CODES.map((c, i) => { const isOff = off.includes(c); return enter(h('div', { class: 'coupon' + (isOff ? ' off' : '') }, h('code', {}, c), h('span', { class: 'switch', 'aria-hidden': 'true' }, h('i')), h('b', {}, isOff ? 'dang_bat = 0' : 'dang_bat = 1')), i * 90); }));
        const ev = ROWS.filter((r) => r.da_tra === 0);
        log.replaceChildren(h('p', {}, T(lost ? O('Bằng chứng trong don_hang: đã bị xoá', 'Evidence in don_hang: deleted') : O('Bằng chứng trong don_hang: 6 đơn 0₫', 'Evidence in don_hang: six 0₫ orders'))), h('div', { class: 'ev' + (lost ? ' lost' : '') }, ev.map((r, i) => enter(h('span', {}, '#' + r.id), i * 50))));
      };
      return {
        q: O('Bắt được rồi! Giờ chặn nó bằng lệnh nào? Cẩn thận, chạy là đổi dữ liệu thật.', 'Caught it! Which statement stops it? Careful, this changes real data.'),
        reset: () => draw([], false),
        options: [
          { code: 'UPDATE khuyen_mai\nSET dang_bat = 0;', good: false, run: () => draw(CODES, false), reply: O('Tắt **mọi** mã! Sinh viên mất ưu đãi, quán bị réo tên. Thiếu `WHERE` là sửa cả bảng.', 'That switched off **every** code! Students lose their discount. Without `WHERE` the whole table changes.') },
          { code: "UPDATE khuyen_mai\nSET dang_bat = 0\nWHERE ma = 'TEST100';", good: true, fx: { money: 840000, rating: 0.1 }, run: () => draw(['TEST100'], false), reply: O('Chỉ đúng **TEST100** bị tắt, mã sinh viên vẫn chạy, bằng chứng còn nguyên.', 'Only **TEST100** goes off, the student code still works and the evidence is intact.'), mood: 'wow' },
          { code: 'DELETE FROM don_hang\nWHERE da_tra = 0;', good: false, run: () => draw([], true), reply: O('Mất sạch bằng chứng (cả đơn sinh nhật hợp lệ), mà mã **vẫn đang bật**.', 'The evidence is gone (including the real birthday order), and the code is **still on**.') },
        ],
      };
    },
    debrief: {
      term: 'SQL: SELECT, WHERE, GROUP BY, UPDATE',
      thanks: O('Két khớp rồi. Quán đang ngon trớn, mình tính chạy khuyến mãi!', 'The till balances. Business is good, I want to run a promotion!'),
      points: [
        O('`WHERE` lọc **hàng**. `GROUP BY` gom hàng lại để `COUNT` và `SUM` tính theo nhóm.', '`WHERE` filters **rows**. `GROUP BY` bundles rows so `COUNT` and `SUM` work per group.'),
        O('`UPDATE` hay `DELETE` thiếu `WHERE` sẽ đụng tới **cả bảng**.', 'An `UPDATE` or `DELETE` without `WHERE` hits the **whole table**.'),
        O('Mã thử nghiệm quên tắt là lỗi thật hay gặp, liên quan cả Công nghệ phần mềm và An toàn thông tin.', 'A forgotten test code is a common real-world bug, tied to software engineering and security.'),
      ],
      code: "SELECT ma_giam, COUNT(*), SUM(gia)\nFROM don_hang\nWHERE da_tra = 0\nGROUP BY ma_giam;",
    },
  };
})();

/* Episode 4 · Probability: draw how waiting grows, then reveal the queueing curve. */
(function () {
  const MU = 12;                       // one barista serves 12 guests an hour (5 minutes each)
  const LO = 6, HI = 11, STEP = 0.25, N = Math.round((HI - LO) / STEP) + 1, YMAX = 60;
  const wait1 = (l) => (l / (MU * (MU - l))) * 60;            // M/M/1 queue wait, minutes
  const wait2 = (l) => { const a = l / MU, r = a / 2, p0 = 1 / (1 + a + (a * a) / (2 * (1 - r))); const lq = (p0 * a * a * r) / (2 * (1 - r) ** 2); return (lq / l) * 60; };
  const W = 640, H = 330, L = 46, R = 96, TOP = 16, B = 40;
  const X = (l) => L + ((l - LO) / (HI - LO)) * (W - L - R);
  const Y = (m) => TOP + (1 - Math.min(m, YMAX) / YMAX) * (H - TOP - B);
  const xs = Array.from({ length: N }, (_, i) => LO + i * STEP);
  const path = (f) => xs.map((l, i) => (i ? 'L' : 'M') + X(l).toFixed(1) + ' ' + Y(f(l, i)).toFixed(1)).join('');
  const min = (v) => num(v) + '′';

  function play(ui) {
    const run = ui.run;
    const guess = (run.guess = run.guess || Array(N).fill(null));
    guess[0] = wait1(LO);
    let cursor = 0, last = null;
    const wrap = h('div', { class: 'chart' });
    let g = '';
    [0, 15, 30, 45, 60].forEach((m) => { g += `<line x1="${L}" x2="${W - R}" y1="${Y(m)}" y2="${Y(m)}" class="grid"/><text x="${L - 8}" y="${Y(m) + 4}" text-anchor="end" class="tick">${m}′</text>`; });
    for (let l = LO; l <= HI; l++) g += `<text x="${X(l)}" y="${H - B + 18}" text-anchor="middle" class="tick">${l}</text>`;
    wrap.innerHTML = `<div class="legend"></div><svg viewBox="0 0 ${W} ${H}" tabindex="0" role="application" aria-label="${esc(T(O('Biểu đồ vẽ dự đoán. Phím trái phải để di chuyển, lên xuống để chỉnh số phút.', 'Drawing chart. Left and right move, up and down set the minutes.')))}">${g}
      <text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle" class="axis">${esc(T(O('khách tới mỗi giờ', 'guests arriving per hour')))}</text>
      <text x="${L}" y="11" class="axis">${esc(T(O('phút chờ trung bình', 'average minutes waiting')))}</text>
      <rect x="${X(LO)}" y="${TOP}" width="${X(HI) - X(LO)}" height="${H - TOP - B}" class="hintzone"/>
      <g class="series"></g><circle cx="${X(LO)}" cy="${Y(wait1(LO))}" r="6" class="anchor"/><text x="${X(LO) + 10}" y="${Y(wait1(LO)) - 24}" class="note">${esc(T(O('hôm nay: 5′', 'today: 5′')))}</text>
      <g class="cross" hidden><line y1="${TOP}" y2="${H - B}" class="xline"/></g></svg><p class="readout" aria-live="polite"></p>`;
    const svg = $('svg', wrap), series = $('.series', wrap), legend = $('.legend', wrap), readout = $('.readout', wrap), cross = $('.cross', wrap), zone = $('.hintzone', wrap);
    const sim = queueSim(ui);
    ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Khách đông hơn thì chờ lâu hơn bao nhiêu?', 'More guests: how much longer is the wait?')))), wrap, sim.el);
    const table = h('div', { class: 'tableview' });
    ui.ctl.replaceChildren(table);

    const drawn = () => guess.filter((v) => v != null).length;
    const ready = () => guess[N - 1] != null && drawn() >= 5;
    const filled = () => { const out = guess.slice(); for (let i = 1; i < N; i++) if (out[i] == null) { let j = i; while (j < N && out[j] == null) j++; const a = out[i - 1], b = j < N ? out[j] : a; for (let k = i; k < j; k++) out[k] = a + ((b - a) * (k - i + 1)) / (j - i + 1); i = j; } return out; };

    function paint(animateKey) {
      const f = run.revealed ? filled() : guess;
      let s = '';
      const pts = f.map((v, i) => (v == null ? null : [X(xs[i]), Y(v)]));
      let d = '', pen = false;
      pts.forEach((p) => { if (!p) { pen = false; return; } d += (pen ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); pen = true; });
      s += `<path d="${d}" class="ln guess"/>`;
      if (drawn() > 1 && f[N - 1] != null) s += `<text x="${W - R + 8}" y="${Y(f[N - 1]) + 4}" class="end">${esc(T(O('bạn', 'you')))} ${min(f[N - 1])}</text>`;
      if (!run.revealed) s += `<circle cx="${X(xs[cursor])}" cy="${Y(guess[cursor] == null ? 0 : guess[cursor])}" r="5" class="pen"/>`;
      if (run.revealed) {
        s += `<path d="${path(wait1)}" class="ln one" pathLength="1"/><text x="${W - R + 8}" y="${Y(wait1(HI)) - (Math.abs(Y(wait1(HI)) - Y(f[N - 1])) < 16 ? 12 : -4)}" class="end">${min(wait1(HI))}</text>`;
        const gap = Math.abs(wait1(HI) - f[N - 1]);
        if (gap > 6) s += `<line x1="${X(HI)}" x2="${X(HI)}" y1="${Y(wait1(HI)) + 8}" y2="${Y(f[N - 1]) + (f[N - 1] < wait1(HI) ? -8 : 8)}" class="gap"/>`;
      }
      if (run.two) s += `<path d="${path(wait2)}" class="ln two" pathLength="1"/><text x="${W - R + 8}" y="${Y(wait2(HI)) - 6}" class="end">${min(wait2(HI))}</text>`;
      series.innerHTML = s;
      if (animateKey && !calm) { const p = $('.ln.' + animateKey, series); if (p) p.animate([{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: 1500, easing: 'cubic-bezier(.45,0,.25,1)' }); }
      zone.style.display = run.revealed || drawn() > 1 ? 'none' : '';
      legend.replaceChildren(...[['guess', O('Bạn đoán', 'Your guess'), true], ['one', O('1 người pha', '1 barista'), run.revealed], ['two', O('2 người pha', '2 baristas'), run.two]].filter((x) => x[2]).map((x) => h('span', { class: 'key ' + x[0] }, h('i'), T(x[1]))));
      drawTable();
    }
    function drawTable() {
      if (!run.revealed) { table.replaceChildren(); return; }
      const f = filled();
      table.replaceChildren(h('table', { class: 'tries2' }, h('caption', {}, T(O('Số liệu (phút chờ)', 'Numbers (minutes waiting)'))),
        h('thead', {}, h('tr', {}, h('th', {}, T(O('khách/giờ', 'guests/h'))), h('th', {}, T(O('bạn đoán', 'your guess'))), h('th', {}, '1'), run.two ? h('th', {}, '2') : null)),
        h('tbody', {}, [6, 8, 9, 10, 11].map((l) => h('tr', {}, h('td', {}, String(l)), h('td', {}, min(f[Math.round((l - LO) / STEP)])), h('td', {}, min(wait1(l))), run.two ? h('td', {}, min(wait2(l))) : null)))));
    }
    const goals = () => ui.goals([
      { ok: ready() || run.revealed, label: O('Kéo chuột vẽ dự đoán tới mốc **11 khách**', 'Drag to draw your guess out to **11 guests**') },
      { ok: run.revealed, label: O('Lật bài xem đường thật', 'Reveal the real curve') },
      { ok: run.two, label: O('Thử thêm người pha thứ hai', 'Try adding a second barista') },
    ]);
    function actions() {
      goals();
      if (!run.revealed) {
        const reveal = btn(T(O('Lật bài', 'Reveal')) + ' ▶', () => {
          run.revealed = true; paint('one'); cursor = N - 1;
          later(1500, () => { const you = filled()[N - 1], real = wait1(HI); ui.say('linh', Math.abs(you - real) < 8 ? O(`Đoán sát thật! **${min(real)}** ở mốc 11 khách. Đường cong dựng đứng ở cuối.`, `Very close! **${min(real)}** at 11 guests. The curve shoots up at the end.`) : O(`Bạn đoán **${min(you)}**, thực tế **${min(real)}**. Khách chỉ tăng gần gấp đôi mà chờ lâu gấp **11 lần**!`, `You guessed **${min(you)}**, reality is **${min(real)}**. Guests not even doubled, the wait grew **11 times**!`), 'wow'); sim.set(11, 1); actions(); });
          actions();
        }, 'primary');
        reveal.disabled = !ready();
        ui.actions(reveal, drawn() > 1 ? btn(T(O('Vẽ lại', 'Redraw')), () => { guess.fill(null); guess[0] = wait1(LO); cursor = 0; paint(); actions(); }, 'ghost') : null);
      } else if (!run.two) ui.actions(btn('+ ' + T(O('Thêm một người pha', 'Add a second barista')), () => { run.two = true; paint('two'); sim.set(11, 2); ui.say('ban', O(`Hai người pha: ở 11 khách chỉ còn chờ **${min(wait2(11))}**. Cái nghẽn nằm ở chỗ một người gần như **không có lúc rảnh**.`, `Two baristas: at 11 guests the wait is only **${min(wait2(11))}**. The trouble was one person having almost **no slack**.`), 'happy'); actions(); }, 'primary'));
      else ui.finish();
    }
    function setAt(l, m) {
      const i = Math.max(1, Math.min(N - 1, Math.round((l - LO) / STEP)));
      m = Math.max(0, Math.min(YMAX, m));
      if (last && Math.abs(last.i - i) > 1) { const dir = Math.sign(i - last.i); for (let k = last.i + dir; k !== i; k += dir) guess[k] = last.m + ((m - last.m) * (k - last.i)) / (i - last.i); }
      guess[i] = m; cursor = i; last = { i, m };
      readout.textContent = `${num(xs[i], 2)} ${T(O('khách/giờ', 'guests/h'))} → ${T(O('bạn đoán', 'your guess'))} ${min(m)}`;
    }
    const local = (e) => { const r = svg.getBoundingClientRect(), k = W / r.width; const px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k; return { l: LO + ((px - L) / (W - L - R)) * (HI - LO), m: (1 - (py - TOP) / (H - TOP - B)) * YMAX }; };
    let down = false;
    svg.addEventListener('pointerdown', (e) => { if (run.revealed) return; down = true; last = null; try { svg.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } const p = local(e); setAt(p.l, p.m); paint(); actions(); e.preventDefault(); });
    svg.addEventListener('pointermove', (e) => {
      const p = local(e);
      if (!run.revealed) { if (!down) return; setAt(p.l, p.m); paint(); return; }
      const l = Math.max(LO, Math.min(HI, Math.round(p.l / STEP) * STEP));
      cross.removeAttribute('hidden'); const ln = $('line', cross); ln.setAttribute('x1', X(l)); ln.setAttribute('x2', X(l));
      readout.textContent = `${num(l, 2)} ${T(O('khách/giờ', 'guests/h'))} · ${T(O('bạn', 'you'))} ${min(filled()[Math.round((l - LO) / STEP)])} · 1 ${T(O('người', 'barista'))} ${min(wait1(l))}${run.two ? ` · 2 ${T(O('người', 'baristas'))} ${min(wait2(l))}` : ''}`;
    });
    const up = () => { if (down) { down = false; actions(); } };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('pointerleave', () => cross.setAttribute('hidden', ''));
    svg.addEventListener('keydown', (e) => {
      if (run.revealed) return;
      const k = e.key; if (!k.startsWith('Arrow')) return; e.preventDefault(); last = null;
      let i = cursor, m = guess[cursor] == null ? wait1(LO) : guess[cursor];
      if (k === 'ArrowRight') { i = Math.min(N - 1, cursor + 1); m = guess[i] == null ? m : guess[i]; } else if (k === 'ArrowLeft') { i = Math.max(1, cursor - 1); m = guess[i] == null ? m : guess[i]; } else { i = Math.max(1, cursor); m += k === 'ArrowUp' ? 2.5 : -2.5; }
      setAt(xs[i], m); paint(); actions();
    });
    ui.say('linh', run.revealed ? O('Đường thật đây. Giờ thử thêm người xem sao.', 'There is the real curve. Now see what a second pair of hands does.') : O('Giờ **6 khách/giờ**, mỗi ly 5 phút, khách chờ cỡ **5 phút**. Chạy khuyến mãi lên **11 khách/giờ** thì chờ bao lâu? **Kéo trên biểu đồ** để vẽ dự đoán.', 'Today: **6 guests an hour**, 5 minutes a drink, about **5 minutes** of waiting. A promotion brings **11 an hour**. How long then? **Drag on the chart** to draw your guess.'), 'think');
    paint(); actions();
  }

  /* A small random queue that runs under the chart. */
  function queueSim(ui) {
    const dots = h('div', { class: 'q-dots' }), servers = h('div', { class: 'q-servers' });
    const out = h('p', { class: 'q-out' });
    const el = h('div', { class: 'queue-sim' }, servers, dots, out);
    let lambda = ui.run.revealed ? 11 : 6, n = ui.run.two ? 2 : 1, waiting = [], busy = [], clock = 0, nextAt = 0, id = 0;
    const exp = (rate) => -Math.log(1 - Math.random()) / rate;
    const reset = () => { waiting = []; busy = Array(n).fill(null); clock = 0; nextAt = exp(lambda / 60); dots.replaceChildren(); servers.replaceChildren(...busy.map(() => h('span', { class: 'srv' }, h('span', { html: avatar('linh', 'happy') }), h('i')))); };
    const text = () => { out.textContent = `${T(O('Mô phỏng ngẫu nhiên', 'Random simulation'))}: ${lambda} ${T(O('khách/giờ', 'guests/h'))}, ${n} ${T(O('người pha', n > 1 ? 'baristas' : 'barista'))} · ${T(O('đang chờ', 'waiting'))} ${waiting.length}`; };
    reset(); text();
    const step = (m) => {
      clock += m;
      while (clock >= nextAt) { const dot = h('i', { class: 'guest g' + (id++ % 4) }); waiting.push({ at: nextAt, dot }); dots.append(dot); enter(dot, 0, 'translateX(60px)'); nextAt += exp(lambda / 60); }
      busy.forEach((b, i) => {
        if (b && clock >= b.until) busy[i] = null;
        if (!busy[i] && waiting.length) { const c = waiting.shift(); c.dot.remove(); busy[i] = { until: clock + exp(1 / (60 / MU)), from: clock }; }
        const bar = servers.children[i].lastChild; bar.style.width = busy[i] ? Math.min(100, ((clock - busy[i].from) / (busy[i].until - busy[i].from)) * 100) + '%' : '0%';
      });
    };
    if (!calm) loop((dt) => { step((dt / 1000) * 8); text(); return true; });
    return { el, set(l, k) { lambda = l; n = k; reset(); if (calm) step(120); text(); } };
  }

  QM.order.push('ep4');
  QM.eps.ep4 = {
    id: 'ep4', subject: 'prob', mech: 'predict',
    title: O('Khuyến mãi tối nay', 'Tonight’s promotion'),
    subjectName: O('Xác suất và Thống kê', 'Probability and Statistics'),
    scene: () => ({ tidy: true, banner: true }), after: () => ({ tidy: true, banner: true, queue: S.fx.ep4 && S.fx.ep4.two ? 2 : 4, baristas: S.fx.ep4 && S.fx.ep4.two ? 2 : 1 }),
    intro: [
      { who: 'linh', mood: 'happy', text: O('Tối nay mình giảm 20%! Chắc khách từ 6 lên 11 người mỗi giờ.', 'Twenty percent off tonight! Guests should go from 6 to about 11 an hour.') },
      { who: 'ban', mood: 'think', text: O('Một người pha được 12 ly mỗi giờ, vậy là vẫn đủ… hay không?', 'One barista makes 12 drinks an hour, so that is still enough… or is it?') },
      { who: 'linh', mood: 'think', text: O('Đoán thử đi rồi mình quyết có thuê thêm người không.', 'Make a guess, then we decide whether to hire.') },
    ],
    play,
    choice(ui) {
      const box = h('div', { class: 'scene-wrap' });
      const sim = queueSim(ui);
      ui.stage.replaceChildren(box, sim.el);
      const show = (baristas, queue, lambda) => () => { box.innerHTML = scene({ tidy: true, banner: lambda > 6, queue, baristas }); sim.set(lambda, baristas); };
      return {
        q: O('Tối nay dự kiến 11 khách mỗi giờ, trong 5 tiếng. Bạn khuyên mình thế nào?', 'We expect 11 guests an hour for 5 hours tonight. What is your advice?'),
        reset: () => { box.innerHTML = scene({ tidy: true, banner: true, queue: 1 }); sim.set(11, 1); },
        options: [
          { label: O('Thuê thêm một bạn pha chế tối nay (150.000₫)', 'Hire a second barista tonight (150,000₫)'), good: true, who: 'linh', mood: 'wow', fx: { money: 750000, rating: 0.3, guests: 50, two: true }, run: show(2, 2, 11), reply: O(`Chờ khoảng **${min(wait2(11))}**. Tốn 150.000₫ mà giữ được khách, quá đáng!`, `About **${min(wait2(11))}** of waiting. 150,000₫ to keep everyone happy is a bargain!`) },
          { label: O('Một người vẫn đủ vì 11 nhỏ hơn 12', 'One is enough because 11 is less than 12'), good: true, tone: 'bad', mood: 'worry', fx: { money: 150000, rating: -0.7, guests: -15 }, run: show(1, 6, 11), reply: O(`Về lâu dài chờ trung bình **${min(wait1(11))}**. Khách bỏ về, đánh giá tụt. Bạn có thể chọn lại để so.`, `In the long run the average wait is **${min(wait1(11))}**. People leave and the rating drops. Pick again to compare.`) },
          { label: O('Huỷ khuyến mãi cho chắc ăn', 'Cancel the promotion to be safe'), good: true, tone: 'meh', mood: 'think', fx: {}, run: show(1, 1, 6), reply: O('Quán vẫn êm, chờ 5 phút, nhưng cũng chẳng lớn thêm.', 'Calm shop, 5 minutes of waiting, and no growth either.') },
        ],
      };
    },
    debrief: {
      term: O('Hàng đợi M/M/1', 'The M/M/1 queue'),
      thanks: O('Quán chạy ngon rồi. Mùa sau mình muốn nhận đơn **qua mạng**!', 'The shop is running well. Next season I want to take orders **online**!'),
      points: [
        O('Thời gian chờ **không tăng đều**: càng gần công suất tối đa, nó càng dựng đứng.', 'Waiting does **not grow evenly**: the closer to full capacity, the steeper it gets.'),
        O('Khách đến **ngẫu nhiên**, nên trung bình đủ sức vẫn có lúc dồn hàng.', 'Guests arrive **at random**, so queues form even when the average looks fine.'),
        O('Máy chủ, mạng, tổng đài đều chừa **dư công suất** vì đúng đường cong này.', 'Servers, networks and call centres keep **spare capacity** because of this very curve.'),
      ],
      code: 'Wq = λ / (μ · (μ − λ))\nλ = 11, μ = 12  →  Wq = 0.92 h ≈ 55′',
    },
  };
})();

/* Episode 5 · Software Engineering ("sort and judge"): rank a wish list, launch, see what breaks. */
(function () {
  const CAP = 20;
  const FEATURES = [
    { id: 'menu', pts: 5, name: O('Xem menu trên điện thoại', 'Menu on the phone') },
    { id: 'logo', pts: 4, name: O('Logo 3D xoay ở trang đầu', 'Spinning 3D logo') },
    { id: 'order', pts: 6, name: O('Chọn món và gửi đơn', 'Pick drinks and send the order') },
    { id: 'points', pts: 5, name: O('Tích điểm thành viên', 'Loyalty points') },
    { id: 'counter', pts: 4, name: O('Màn hình quầy nhận đơn', 'Order screen at the counter') },
    { id: 'qr', pts: 3, name: O('Trả tiền bằng mã QR', 'Pay by QR code') },
    { id: 'dark', pts: 2, name: O('Chế độ tối', 'Dark mode') },
    { id: 'verify', pts: 2, name: O('Xác nhận số điện thoại để chặn đơn ảo', 'Phone check against fake orders') },
  ];
  const BINS = [['must', O('Phải có', 'Must')], ['should', O('Nên có', 'Should')], ['later', O('Để sau', 'Later')]];
  const EVENTS = [
    { need: 'menu', ok: O('Khách mở trang, thấy menu', 'A guest opens the page and sees the menu'), bad: O('Khách mở trang mà không thấy menu', 'The page opens with no menu') },
    { need: 'order', ok: O('Khách chọn món và gửi đơn', 'The guest sends an order'), bad: O('Xem được nhưng không đặt được', 'Guests can look but cannot order') },
    { need: 'counter', ok: O('Quầy nhận đơn và pha ngay', 'The counter sees it at once'), bad: O('Đơn gửi đi mà quầy không hề biết', 'The counter never sees the order') },
    { need: 'qr', ok: O('Trả bằng QR, khỏi thối tiền', 'Paid by QR, no change needed'), bad: O('Không có tiền lẻ, khách bỏ đơn', 'No small cash, the order is dropped') },
    { need: 'verify', ok: O('Số lạ đặt 40 ly bị chặn lại', 'A fake 40-cup order is blocked'), bad: O('Số lạ đặt 40 ly rồi biến mất', 'A stranger orders 40 cups and vanishes') },
  ];
  const feat = (id) => FEATURES.find((f) => f.id === id);
  const sum = (ids) => ids.reduce((a, id) => a + feat(id).pts, 0);

  /* "Must" is built first, then "Should", each in the order they were chosen, while time lasts. */
  function build(plan) {
    let left = CAP;
    const built = new Set(), missed = new Set();
    [...plan.must, ...plan.should].forEach((id) => { if (feat(id).pts <= left) { left -= feat(id).pts; built.add(id); } else missed.add(id); });
    return { built, missed, left };
  }

  function play(ui) {
    const run = ui.run;
    const plan = (run.plan = run.plan || { must: [], should: [], later: [] });
    let result = null;
    const binOf = (id) => BINS.map((b) => b[0]).find((k) => plan[k].includes(id));
    const cards = {};
    FEATURES.forEach((f) => {
      cards[f.id] = h('div', { class: 'fcard', 'data-id': f.id },
        h('div', { class: 'ftop' }, h('span', {}, T(f.name)), h('b', { class: 'pts' }, f.pts + T(O(' điểm', ' pt')))),
        h('div', { class: 'fbtns', role: 'radiogroup', 'aria-label': T(f.name) }, BINS.map(([k, l]) => h('button', { type: 'button', role: 'radio', 'data-k': k, 'aria-checked': 'false', onclick: () => move(f.id, k) }, T(l)))),
        h('span', { class: 'stamp' }));
    });
    const meterBar = h('div', { class: 'cap-bar' }), meterText = h('span', { class: 'count' });
    const pool = h('div', { class: 'pool5' });
    const cols = {};
    const board = h('div', { class: 'bins' }, BINS.map(([k, l]) => { cols[k] = h('div', { class: 'bin-b' }); return h('div', { class: 'bin bin-' + k }, h('h3', {}, T(l)), cols[k]); }));
    const events = h('ol', { class: 'events', 'aria-live': 'polite' });
    ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Danh sách mong muốn của Linh: 2 tuần, 20 điểm công', 'Linh’s wish list: 2 weeks, 20 effort points'))), meterText), meterBar, pool, board);
    ui.ctl.replaceChildren(events); /* launch-day results sit beside the board */

    const goals = () => ui.goals([
      { ok: sum(plan.must) <= CAP && FEATURES.every((f) => binOf(f.id)), label: O('Việc **Phải có** nằm trong 20 điểm', 'The **Must** list fits in 20 points') },
      { ok: !!result && ['menu', 'order', 'counter'].every((x) => result.built.has(x)), label: O('Khách đặt món được từ đầu đến cuối', 'A guest can order from start to finish') },
      { ok: !!result && ['qr', 'verify'].every((x) => result.built.has(x)), label: O('Nhận tiền gọn và chặn được đơn ảo', 'Easy payment and no fake orders') },
    ]);
    function meter() {
      const m = sum(plan.must), s = sum(plan.should);
      meterBar.replaceChildren(h('i', { class: 'm', style: `width:${Math.min(100, (m / CAP) * 100)}%` }), h('i', { class: 's', style: `width:${Math.max(0, Math.min(100 - (m / CAP) * 100, (s / CAP) * 100))}%` }));
      meterBar.classList.toggle('over', m + s > CAP);
      meterText.textContent = `${m} + ${s} = ${m + s}/${CAP}`;
    }
    function layout() {
      pool.replaceChildren(...FEATURES.filter((f) => !binOf(f.id)).map((f) => cards[f.id]));
      pool.hidden = !pool.children.length;
      BINS.forEach(([k]) => cols[k].replaceChildren(...plan[k].map((id) => cards[id])));
      FEATURES.forEach((f) => cards[f.id].querySelectorAll('.fbtns button').forEach((b) => b.setAttribute('aria-checked', String(binOf(f.id) === b.dataset.k))));
    }
    function clearStamps() { result = null; events.replaceChildren(); FEATURES.forEach((f) => { cards[f.id].classList.remove('built', 'missed'); cards[f.id].querySelector('.stamp').textContent = ''; }); }
    const ship = btn('▶ ' + T(O('Ra mắt thứ Hai', 'Launch on Monday')), () => launch(), 'primary');
    function actions() { ship.disabled = !FEATURES.every((f) => binOf(f.id)); ship.classList.add('primary'); ui.actions(ship); }
    function move(id, k) {
      if (binOf(id) === k) return;
      clearStamps();
      flip(FEATURES.map((f) => cards[f.id]), () => { BINS.forEach(([b]) => { plan[b] = plan[b].filter((x) => x !== id); }); plan[k].push(id); layout(); }, { duration: 420 });
      meter(); goals(); actions();
    }
    function launch() {
      clearStamps();
      ship.disabled = true;
      const r = build(plan);
      const order = [...plan.must, ...plan.should];
      order.forEach((id, i) => later(i * 260, () => { const ok = r.built.has(id); cards[id].classList.add(ok ? 'built' : 'missed'); cards[id].querySelector('.stamp').textContent = ok ? '✓ ' + T(O('xong', 'done')) : '✕ ' + T(O('không kịp', 'not in time')); enter(cards[id].querySelector('.stamp'), 0, 'scale(2)'); }));
      const t0 = order.length * 260 + 200;
      EVENTS.forEach((e, i) => later(t0 + i * 420, () => { const ok = r.built.has(e.need); events.append(enter(h('li', { class: ok ? 'good' : 'bad' }, h('i', {}, ok ? '✓' : '✕'), T(ok ? e.ok : e.bad)), 0, 'translateX(-20px)')); }));
      later(t0 + EVENTS.length * 420 + 150, () => {
        result = r; ship.disabled = false; goals();
        const core = ['menu', 'order', 'counter'].filter((x) => !r.built.has(x));
        const extra = ['qr', 'verify'].filter((x) => !r.built.has(x));
        if (!core.length && !extra.length) { ui.say('linh', O('Ra mắt trơn tru! Khách đặt được, trả được, đơn ảo bị chặn. Logo xoay để đợt sau cũng được.', 'A smooth launch! Guests order and pay, fake orders bounce. The spinning logo can wait.'), 'wow'); ui.finish(); ui.actions(btn(T(UI.askMore) + ' →', () => ui.go('choice'), 'primary'), ship); ship.classList.remove('primary'); }
        else if (sum(plan.must) > CAP) ui.say('linh', O(`Riêng việc **Phải có** đã tới **${sum(plan.must)} điểm**, mà mình chỉ có 20. Cái nào thiếu nó thì quán vẫn bán được?`, `The **Must** list alone is **${sum(plan.must)} points** and we have 20. Which items can the shop sell without?`), 'worry');
        else if (core.length) ui.say('linh', O(`Đường đặt món bị đứt: thiếu **${core.map((x) => T(feat(x).name)).join(', ')}**.`, `The ordering path is broken: **${core.map((x) => T(feat(x).name)).join(', ')}** is missing.`), 'worry');
        else ui.say('linh', O(`Đặt được rồi, nhưng còn thiếu **${extra.map((x) => T(feat(x).name)).join(', ')}**. Nhường chỗ cho nó bằng cách bỏ bớt gì?`, `Ordering works, but **${extra.map((x) => T(feat(x).name)).join(', ')}** is missing. What would you drop to make room?`), 'think');
        if (core.length || extra.length || sum(plan.must) > CAP) actions();
      });
    }
    ui.say('linh', O('Mình muốn đủ thứ! Mà chỉ kịp **20 điểm công**. Xếp từng món vào **Phải có**, **Nên có** hoặc **Để sau**.', 'I want everything! We only have **20 effort points**. Put each item into **Must**, **Should** or **Later**.'), 'happy');
    layout(); meter(); goals(); actions();
  }

  QM.order.push('ep5');
  QM.eps.ep5 = {
    rules: { build, FEATURES, EVENTS, CAP },
    id: 'ep5', subject: 'se', mech: 'judge',
    title: O('Làm gì trước khi mở đặt món online', 'What to build first'),
    subjectName: O('Công nghệ phần mềm', 'Software Engineering'),
    scene: () => ({ tidy: true, phone: '8' }), after: () => ({ tidy: true, phone: '1', queue: 3 }),
    intro: [
      { who: 'linh', mood: 'happy', text: O('Quán đông rồi, mình muốn khách **đặt món trên điện thoại** từ thứ Hai này!', 'The shop is busy. I want guests **ordering on their phones** from Monday!') },
      { who: 'ban', mood: 'think', text: O('Được, nhưng một mình mình, hai tuần. Không làm hết được đâu, phải chọn.', 'Fine, but it is just me and two weeks. We cannot build it all, we have to choose.') },
      { who: 'linh', mood: 'think', text: O('Mình ghi ra 8 thứ. Bạn giúp mình sắp thứ tự.', 'I wrote down eight things. Help me rank them.') },
    ],
    play,
    choice(ui) {
      const base = ['menu', 'order', 'counter', 'qr', 'verify'];
      const bar = h('div', { class: 'cap-bar big' }), label = h('p', { class: 'cap-label', 'aria-live': 'polite' }), list = h('div', { class: 'scope' });
      ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Đợt làm này: sức chứa 20 điểm', 'This sprint holds 20 points')))), list, bar, label);
      const draw = (ids, note, over) => {
        const p = sum(ids);
        list.replaceChildren(...ids.map((id, i) => enter(h('span', { class: 'sc-item' + (id === 'points' ? ' new' : '') }, T(feat(id).name), h('b', {}, String(feat(id).pts))), i * 70, 'scale(.8)')));
        bar.replaceChildren(h('i', { class: 'm', style: `width:${Math.min(100, (p / CAP) * 100)}%` }));
        bar.classList.toggle('over', over || p > CAP);
        label.textContent = `${p}/${CAP} · ${T(note)}`;
      };
      return {
        q: O('Giữa đợt mình nghĩ ra: **thêm tích điểm** trước thứ Hai được không?', 'Mid-sprint idea: can we **add loyalty points** before Monday?'),
        reset: () => draw(base, O('kế hoạch đã chốt', 'the agreed plan'), false),
        options: [
          { label: O('“Ừ, mình thức đêm làm thêm cho kịp”', '“Sure, I will work nights to fit it in”'), good: false, run: () => draw([...base, 'points'], O('vượt sức: làm vội, dễ sinh lỗi', 'over capacity: rushed work breeds bugs'), true), reply: O('Tới thứ Hai app lỗi tùm lum vì làm vội. Sức chứa không tự to ra được.', 'On Monday the app is full of bugs from rushing. Capacity does not stretch.') },
          { label: O('“Được, nếu đổi ra việc cùng cỡ. Bạn chọn bỏ gì?”', '“Yes, if something the same size comes out. What goes?”'), good: true, fx: { guests: 30, money: 900000 }, run: () => draw(base, O('Linh cân lại: tích điểm để đợt sau', 'Linh weighs it: points move to the next sprint'), false), reply: O('Đổi thì phải bỏ QR với chặn đơn ảo… Thôi, **tích điểm để đợt sau** nhé.', 'That would cost QR pay and the fake-order check… Fine, **points go in the next sprint**.'), mood: 'happy' },
          { label: O('“Không. Chốt rồi thì miễn đổi”', '“No. The plan is frozen, full stop”'), good: false, run: () => draw(base, O('giữ nguyên, Linh mất hứng góp ý', 'unchanged, and Linh stops sharing ideas'), false), reply: O('Ừ thì giữ… nhưng lần sau mình chẳng buồn nói nữa. Kế hoạch vẫn nên **đổi được**, có đánh đổi rõ ràng.', 'Fine… but next time I will not bother telling you. A plan should still **be able to change**, with a clear trade.') },
        ],
      };
    },
    debrief: {
      term: O('Sắp ưu tiên yêu cầu (MoSCoW)', 'Prioritising requirements (MoSCoW)'),
      thanks: O('App chạy rồi! Mà… cái tablet ở quầy cứ báo không có mạng.', 'The app is live! Except… the counter tablet says it has no network.'),
      points: [
        O('Sức làm có hạn nên chọn theo **giá trị cho người dùng**, đừng theo món nghe hay nhất.', 'Capacity is limited, so choose by **value to users**, not by what sounds coolest.'),
        O('Một **luồng chính chạy trọn** quan trọng hơn nhiều tính năng làm dở.', 'One **complete main flow** beats many half-built features.'),
        O('Thêm việc giữa chừng thì phải **đổi ra** việc khác.', 'Adding work mid-way means **trading** something out.'),
      ],
      code: O('Phải có : menu, đặt món, màn hình quầy (15)\nNên có  : QR, chặn đơn ảo (5)\nĐể sau  : tích điểm, logo 3D, chế độ tối', 'Must  : menu, ordering, counter screen (15)\nShould: QR pay, fake-order check (5)\nLater : points, 3D logo, dark mode'),
    },
  };
})();

/* Episode 6 · Computer Networks ("wire it up"): plug the cables, fix the addresses, send packets. */
(function () {
  const NODES = {
    net: { x: 96, y: 62, ports: 1, name: O('Internet', 'Internet'), art: '<path d="M-30 12a15 15 0 0 1 4-29 20 20 0 0 1 36-4 17 17 0 0 1 20 33Z"/>' },
    router: { x: 322, y: 62, ports: 2, name: O('Router', 'Router'), art: '<rect x="-30" y="-8" width="60" height="22" rx="6"/><path d="M-18 -8l-8-18M18 -8l8-18"/><path d="M-16 3h2M-4 3h2M8 3h2"/>' },
    sw: { x: 322, y: 178, ports: 4, name: O('Switch', 'Switch'), art: '<rect x="-38" y="-14" width="76" height="28" rx="6"/><path d="M-26 -4v8M-12 -4v8M2 -4v8M16 -4v8M28 -4v8"/>' },
    pc: { x: 110, y: 288, ports: 1, name: O('Máy tính tiền', 'Till'), art: '<rect x="-24" y="-22" width="48" height="32" rx="5"/><path d="M-12 20h24M0 10v10"/>' },
    tab: { x: 322, y: 288, ports: 1, name: O('Tablet quầy', 'Counter tablet'), art: '<rect x="-17" y="-24" width="34" height="46" rx="6"/><path d="M-5 15h10"/>' },
    prn: { x: 530, y: 288, ports: 1, name: O('Máy in bếp', 'Kitchen printer'), art: '<rect x="-24" y="-8" width="48" height="26" rx="5"/><path d="M-14 -8v-14h28v14M-12 12h24"/>' },
  };
  const DEVICES = ['pc', 'tab', 'prn'];
  const key = (a, b) => [a, b].sort().join('-');
  const RIGHT = [key('net', 'router'), key('router', 'sw'), key('sw', 'pc'), key('sw', 'tab'), key('sw', 'prn')];

  function pathTo(cables, from, to) {
    const prev = { [from]: null }, q = [from];
    while (q.length) { const n = q.shift(); cables.forEach((c) => { const [a, b] = c.split('-'); const m = a === n ? b : b === n ? a : null; if (m && !(m in prev)) { prev[m] = n; q.push(m); } }); }
    if (!(to in prev)) return null;
    const out = []; for (let n = to; n; n = prev[n]) out.unshift(n); return out;
  }

  /* The drawing, shared by both levels and the final question. */
  function diagram(opts = {}) {
    const wrap = h('div', { class: 'netw' });
    wrap.innerHTML = `<svg viewBox="0 0 640 370" role="group" aria-label="${esc(T(O('Sơ đồ mạng của quán', 'The shop network')))}"><g class="halos"></g><g class="cables"></g><g class="nodes">${Object.entries(NODES).map(([id, n]) => `<g class="node n-${id}" data-id="${id}" transform="translate(${n.x} ${n.y})" ${opts.onNode ? 'tabindex="0" role="button"' : ''} aria-label="${esc(T(n.name))}"><circle r="40" class="hit"/><g class="art">${n.art}</g><text y="46" class="nname">${esc(T(n.name))}</text><text y="63" class="nip"></text></g>`).join('')}</g><g class="extra"></g><g class="packets"></g></svg>`;
    const svg = $('svg', wrap);
    if (opts.onNode) svg.querySelectorAll('.node').forEach((g) => { g.addEventListener('click', () => opts.onNode(g.dataset.id)); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onNode(g.dataset.id); } }); });
    const api = {
      el: wrap, svg,
      cables(list, fresh) {
        $('.cables', svg).innerHTML = list.map((c) => { const [a, b] = c.split('-'); return `<g class="cable" data-c="${c}"><line x1="${NODES[a].x}" y1="${NODES[a].y}" x2="${NODES[b].x}" y2="${NODES[b].y}" pathLength="1"/></g>`; }).join('');
        if (fresh && !calm) { const l = svg.querySelector(`.cable[data-c="${fresh}"] line`); if (l) l.animate([{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: 420, easing: 'ease-out' }); }
      },
      ip(id, text, bad) { const t = svg.querySelector(`.n-${id} .nip`); t.textContent = text; t.classList.toggle('bad', !!bad); },
      mark(id, cls) { const g = svg.querySelector('.n-' + id); ['sel', 'good', 'bad'].forEach((c) => g.classList.toggle(c, c === cls)); },
      /* send one dot along a list of nodes; ok=false leaves a cross where it stopped */
      send(path, ok, delay, done) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('r', '9'); dot.setAttribute('class', 'packet ' + (ok ? 'good' : 'bad'));
        const layer = $('.packets', svg);
        later(delay, () => {
          layer.append(dot);
          const pts = path.map((n) => NODES[n]);
          const seg = 330;
          const finish = () => { if (!ok) { const p = pts[pts.length - 1]; layer.insertAdjacentHTML('beforeend', `<text x="${p.x + 34}" y="${p.y - 20}" class="cross">✕</text>`); } dot.remove(); done(); };
          if (calm || pts.length < 2) { dot.setAttribute('transform', `translate(${pts[0].x} ${pts[0].y})`); later(200, finish); return; }
          let t = 0;
          loop((dt) => { t += dt / seg; const i = Math.min(pts.length - 2, Math.floor(t)), f = Math.min(1, t - i); dot.setAttribute('transform', `translate(${pts[i].x + (pts[i + 1].x - pts[i].x) * f} ${pts[i].y + (pts[i + 1].y - pts[i].y) * f})`); if (t >= pts.length - 1) { finish(); return false; } return true; });
        });
      },
      clearPackets() { $('.packets', svg).innerHTML = ''; Object.keys(NODES).forEach((id) => api.mark(id, '')); },
    };
    return api;
  }

  const goalsFor = (ui) => {
    const run = ui.run;
    ui.goals([
      { ok: !!run.wired, label: O('Cả ba máy ra Internet **qua router**', 'All three devices reach the Internet **through the router**') },
      { ok: !!run.tabOk, label: O('Tablet quầy vào được app đặt món', 'The counter tablet reaches the ordering app') },
      { ok: !!run.noDup, label: O('Không máy nào **trùng địa chỉ**', 'No two devices **share an address**') },
    ]);
  };

  function level1(ui) {
    const run = ui.run;
    run.cables = run.cables || [];
    let sel = null;
    const d = diagram({ onNode: tap });
    ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Cắm dây: bấm một thiết bị, rồi bấm thiết bị kia', 'Cabling: tap one device, then another'))), h('span', { class: 'count' }, '1/2')), d.el);
    const ports = h('ul', { class: 'ports' });
    ui.ctl.replaceChildren(ports);
    const used = (id) => run.cables.filter((c) => c.split('-').includes(id)).length;
    const test = btn('▶ ' + T(O('Gửi gói thử từ ba máy', 'Send test packets')), () => runTest(), 'primary');
    function refresh(fresh) {
      d.cables(run.cables, fresh);
      ports.replaceChildren(...Object.entries(NODES).map(([id, n]) => h('li', { class: used(id) === n.ports ? 'full' : '' }, h('span', {}, T(n.name)), h('b', {}, `${used(id)}/${n.ports}`))));
      ui.actions(test, run.cables.length ? btn(T(O('Rút hết dây', 'Unplug all')), () => { run.cables = []; run.wired = false; d.clearPackets(); refresh(); goalsFor(ui); }, 'ghost') : null);
    }
    function tap(id) {
      d.clearPackets();
      if (!sel) { sel = id; d.mark(id, 'sel'); return; }
      if (sel === id) { sel = null; return; }
      const c = key(sel, id), a = sel; sel = null;
      if (run.cables.includes(c)) { run.cables = run.cables.filter((x) => x !== c); run.wired = false; refresh(); }
      else {
        const full = [a, id].find((n) => used(n) >= NODES[n].ports);
        if (full) { ui.say('ban', O(`**${T(NODES[full].name)}** hết cổng rồi. Bấm lại hai đầu của một sợi dây để rút nó ra.`, `**${T(NODES[full].name)}** has no free port. Tap both ends of a cable to unplug it.`), 'think'); d.mark(full, 'bad'); return; }
        run.cables.push(c); run.wired = false; refresh(c);
      }
      goalsFor(ui);
    }
    function runTest() {
      d.clearPackets(); test.disabled = true;
      let left = DEVICES.length, fails = [];
      DEVICES.forEach((dev, i) => {
        const p = pathTo(run.cables, dev, 'net');
        const via = p && p.includes('router');
        let route = p;
        if (!p) { route = [dev]; const first = run.cables.map((c) => c.split('-')).find((c) => c.includes(dev)); if (first) route = [dev, first[0] === dev ? first[1] : first[0]]; }
        if (!via) fails.push({ dev, direct: !!p });
        d.send(route, !!via, i * 420, () => {
          d.mark(dev, via ? 'good' : 'bad');
          if (--left) return;
          test.disabled = false;
          run.wired = !fails.length;
          goalsFor(ui);
          if (run.wired) { ui.say('linh', O('Đèn xanh cả ba! Nhưng tablet vẫn chưa mở được app…', 'Three green lights! But the tablet still cannot open the app…'), 'happy'); ui.actions(btn(T(O('Xem địa chỉ mạng', 'Check the addresses')) + ' →', () => { run.level = 1; play(ui); }, 'primary')); }
          else if (fails.some((f) => f.direct)) ui.say('ban', O('Có máy ra thẳng Internet mà **không qua router**, tức là phơi mình cho người lạ. Router phải đứng giữa.', 'A device reaches the Internet **without the router**, fully exposed to strangers. The router belongs in between.'), 'worry');
          else ui.say('linh', O(`Gói tin từ **${fails.map((f) => T(NODES[f.dev].name)).join(', ')}** không tới được Internet. Nhìn xem đường dây đứt ở đâu.`, `Packets from **${fails.map((f) => T(NODES[f.dev].name)).join(', ')}** never arrive. Find where the path breaks.`), 'worry');
        });
      });
    }
    ui.say('linh', O('Thợ rút hết dây mất rồi. Nối lại giúp mình: **mọi máy phải ra Internet qua router**.', 'Someone pulled every cable. Reconnect them so **every device reaches the Internet through the router**.'), 'worry');
    refresh(); goalsFor(ui);
  }

  function level2(ui) {
    const run = ui.run;
    const cfg = (run.cfg = run.cfg || { tabIp: '192.168.2.20', tabGw: '192.168.1.1', prnIp: '192.168.1.10' });
    const d = diagram();
    ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Đặt địa chỉ: mặt nạ mạng 255.255.255.0', 'Addresses: subnet mask 255.255.255.0'))), h('span', { class: 'count' }, '2/2')), d.el);
    const field = (id, label, k, opts) => {
      const s = h('select', { id, onchange: (e) => { cfg[k] = e.target.value; run.tabOk = run.noDup = false; d.clearPackets(); labels(); goalsFor(ui); ui.actions(test); } }, opts.map((v) => h('option', { value: v }, v)));
      s.value = cfg[k];
      return h('label', { class: 'ipf', for: id }, h('span', {}, T(label)), s);
    };
    ui.ctl.replaceChildren(
      field('tab-ip', O('Địa chỉ IP của tablet', 'Tablet IP address'), 'tabIp', ['192.168.2.20', '192.168.1.1', '192.168.1.10', '192.168.1.20', '192.168.1.255']),
      field('tab-gw', O('Cổng mặc định của tablet', 'Tablet default gateway'), 'tabGw', ['192.168.1.1', '192.168.2.1', '192.168.1.254']),
      field('prn-ip', O('Địa chỉ IP của máy in', 'Printer IP address'), 'prnIp', ['192.168.1.10', '192.168.1.30', '10.0.0.30']));
    const table = () => ({ router: '192.168.1.1', pc: '192.168.1.10', tab: cfg.tabIp, prn: cfg.prnIp });
    const clash = (id) => Object.entries(table()).some(([k, v]) => k !== id && v === table()[id]);
    function labels() { Object.entries(table()).forEach(([id, ip]) => d.ip(id, ip, clash(id))); }
    function why(id) {
      const ip = table()[id], gw = id === 'tab' ? cfg.tabGw : '192.168.1.1';
      if (ip.endsWith('.255')) return O(`\`${ip}\` là địa chỉ **quảng bá** của cả mạng, không gán cho máy nào được.`, `\`${ip}\` is the **broadcast** address; no device may use it.`);
      if (clash(id)) return O(`**Trùng địa chỉ** \`${ip}\`: gói tin không biết giao cho ai.`, `**Duplicate address** \`${ip}\`: packets do not know who to go to.`);
      if (!ip.startsWith('192.168.1.')) return O(`${T(NODES[id].name)} ở \`${ip}\`, router ở \`192.168.1.1\`: **khác mạng con**, gói tin không tới được router.`, `${T(NODES[id].name)} is at \`${ip}\`, the router at \`192.168.1.1\`: **different subnets**, so packets never reach the router.`);
      if (gw !== '192.168.1.1') return O(`Cổng mặc định \`${gw}\` **không phải router**, gói ra ngoài đi vào ngõ cụt.`, `The gateway \`${gw}\` is **not the router**, so outbound packets hit a dead end.`);
      return null;
    }
    const test = btn('▶ ' + T(O('Gửi gói thử từ ba máy', 'Send test packets')), () => {
      d.clearPackets(); test.disabled = true; labels();
      let left = 3; const errs = {};
      DEVICES.forEach((dev, i) => {
        const e = why(dev); if (e) errs[dev] = e;
        d.send(e ? [dev, 'sw'] : [dev, 'sw', 'router', 'net'], !e, i * 420, () => {
          d.mark(dev, e ? 'bad' : 'good');
          if (--left) return;
          test.disabled = false;
          run.tabOk = !errs.tab; run.noDup = !Object.keys(table()).some(clash);
          goalsFor(ui);
          const first = errs.tab || errs.prn || errs.pc;
          if (!first) { ui.say('linh', O('Tablet nổ đơn rồi, máy in cũng chạy. Mạng thông!', 'Orders pop up on the tablet and the printer is printing. We are connected!'), 'wow'); ui.finish(); }
          else { ui.say('ban', first, 'think'); ui.actions(test); }
        });
      });
    }, 'primary');
    ui.say('linh', O('Dây đúng hết rồi mà tablet vẫn “không có mạng”. Xem lại **địa chỉ** của từng máy giúp mình.', 'The cables are right and the tablet still says “no network”. Check each **address**.'), 'think');
    d.cables(RIGHT); labels(); goalsFor(ui); ui.actions(test);
  }

  function play(ui) { ui.run.level = ui.run.level || 0; if (ui.run.level === 0) level1(ui); else level2(ui); }

  QM.order.push('ep6');
  QM.eps.ep6 = {
    rules: { pathTo, RIGHT, DEVICES },
    id: 'ep6', subject: 'networks', mech: 'wire',
    title: O('Tablet ở quầy mất mạng', 'The counter tablet is offline'),
    subjectName: O('Mạng máy tính', 'Computer Networks'),
    scene: () => ({ tidy: true, wifi: 'off' }), after: () => ({ tidy: true, wifi: 'on', queue: 3 }),
    intro: [
      { who: 'linh', mood: 'worry', text: O('Khách đặt món rầm rầm mà tablet ở quầy cứ báo **không có mạng**!', 'Orders are pouring in and the counter tablet says **no network**!') },
      { who: 'ban', mood: 'think', text: O('Đơn là những gói tin. Mình dò xem đường đi của chúng đứt ở đâu.', 'Orders travel as packets. Let us find where their path breaks.') },
      { who: 'linh', mood: 'happy', text: O('Dây nhợ đây hết, bạn cứ cắm.', 'Here are all the cables. Plug away.') },
    ],
    play,
    choice(ui) {
      const d = diagram();
      const note = h('p', { class: 'phone-badge', 'aria-live': 'polite' });
      ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Thêm điện thoại của khách vào sơ đồ', 'Add a guest’s phone to the picture')))), d.el, note);
      const phone = (x, y) => `<g transform="translate(${x} ${y})" class="node guestn"><rect x="-14" y="-22" width="28" height="42" rx="6" class="art"/><text y="40" class="nname">${esc(T(O('Máy khách', 'Guest phone')))}</text></g>`;
      const draw = (mode) => {
        d.cables(RIGHT);
        let x = '';
        if (mode === 'same') x = `<path d="M530 178L${NODES.sw.x} ${NODES.sw.y}" class="air"/><path d="M530 190Q380 250 ${NODES.pc.x + 30} ${NODES.pc.y - 20}" class="spy"/>` + phone(530, 178);
        if (mode === 'guest') x = `<rect x="468" y="30" width="156" height="150" rx="16" class="zone"/><text x="546" y="52" class="nname">${esc(T(O('Mạng khách riêng', 'Guest network')))}</text><path d="M546 112L${NODES.router.x} ${NODES.router.y}" class="air"/>` + phone(546, 108);
        if (mode === 'none') x = phone(546, 108) + '<text x="580" y="96" class="cross">✕</text>';
        $('.extra', d.svg).innerHTML = x;
        d.mark('pc', mode === 'same' ? 'bad' : mode ? 'good' : '');
        note.hidden = !mode;
        note.className = 'phone-badge ' + (mode === 'guest' ? 'good' : 'bad');
        note.textContent = mode === 'same' ? T(O('Máy khách nhìn thấy máy tính tiền', 'The guest phone can see the till')) : mode === 'guest' ? T(O('Khách vào Internet, không chạm được máy quầy', 'Guests get Internet but cannot touch the till')) : mode === 'none' ? T(O('An toàn, nhưng khách bực', 'Safe, but guests are annoyed')) : '';
      };
      return {
        q: O('Khách xin **mật khẩu wifi** hoài. Mình cho kiểu nào?', 'Guests keep asking for the **wifi password**. What do we give them?'),
        reset: () => draw(''),
        options: [
          { label: O('Đưa luôn mật khẩu wifi của quầy', 'Share the counter’s own wifi password'), good: false, run: () => draw('same'), reply: O('Người lạ chung mạng với máy tính tiền, nguy quá.', 'Strangers on the same network as the till. Far too risky.') },
          { label: O('Mở một mạng khách tách riêng', 'Open a separate guest network'), good: true, fx: { rating: 0.2, guests: 10 }, run: () => draw('guest'), reply: O('Khách vui, máy quầy vẫn kín. Chuẩn!', 'Happy guests, protected till. Perfect!'), mood: 'wow' },
          { label: O('Không cho khách dùng wifi', 'No wifi for guests'), good: false, run: () => draw('none'), reply: O('An toàn thật, mà khách ngồi lướt web ở quán bên cạnh mất.', 'Safe indeed, and guests move to the café next door.') },
        ],
      };
    },
    debrief: {
      term: O('Mạng LAN, địa chỉ IP, cổng mặc định', 'LAN, IP addresses and the default gateway'),
      thanks: O('Đơn chạy vèo vèo. Cả năm nay hệ thống dồn lại cả núi đơn hàng!', 'Orders fly through. A year of them is piling up in the system!'),
      points: [
        O('Máy **cùng mạng con** nói chuyện trực tiếp; đi ra ngoài phải qua **cổng mặc định**.', 'Devices on the **same subnet** talk directly; going outside needs the **default gateway**.'),
        O('Mỗi máy cần một địa chỉ **không trùng**; địa chỉ cuối dải là quảng bá.', 'Each device needs a **unique** address; the last one in the range is for broadcast.'),
        O('Tách **mạng khách** để người lạ không chạm tới máy quầy.', 'A separate **guest network** keeps strangers away from the till.'),
      ],
      code: 'IP      192.168.1.20\nMask    255.255.255.0\nGateway 192.168.1.1',
    },
  };
})();

/* Episode 7 · Algorithms ("be the machine"): search by hand, then write the rule the machine follows. */
(function () {
  const N1 = 31, LIMIT = 5, BIG = 100000, AT = 73421, GOAL = 17;
  const CODES = Array.from({ length: N1 }, (_, i) => 104 + i * 23 + ((i * 7) % 11));
  const TARGETS = [22, 5, 27, 10];
  const BLANKS = {
    mid: ['lo', 'hi', '(lo + hi) // 2'],
    less: ['lo = lo + 1', 'lo = mid + 1', 'hi = mid - 1'],
    more: ['hi = hi - 1', 'lo = mid + 1', 'hi = mid - 1'],
  };

  /* Runs the learner's search on 0..BIG-1 (the value at position i is i). */
  function run100k(pick) {
    let lo = 0, hi = BIG - 1, steps = 0;
    const trail = [];
    const step = (rule, mid) => { if (rule === 'lo = mid + 1') lo = mid + 1; else if (rule === 'hi = mid - 1') hi = mid - 1; else if (rule === 'lo = lo + 1') lo += 1; else hi -= 1; };
    while (lo <= hi) {
      const mid = pick.mid === 'lo' ? lo : pick.mid === 'hi' ? hi : Math.floor((lo + hi) / 2);
      steps++;
      if (trail.length < 18) trail.push({ lo, hi, mid });
      if (mid === AT) return { found: true, steps, trail };
      step(mid < AT ? pick.less : pick.more, mid);
    }
    return { found: false, steps, trail };
  }

  function level1(ui) {
    const run = ui.run;
    run.round = run.round || 0;
    const target = TARGETS[run.round % TARGETS.length];
    let steps = 0, lo = 0, hi = N1 - 1, over = false;
    const count = h('span', { class: 'count', 'aria-live': 'polite' });
    const deck = h('div', { class: 'deck' }, CODES.map((c, i) => h('button', { type: 'button', class: 'card7', 'data-i': i, 'aria-label': T(O('Lá thứ ', 'Card ')) + (i + 1), onclick: (e) => flipCard(i, e.currentTarget) }, h('small', {}, String(i + 1)), h('b', {}, '?'))));
    const trail = h('ol', { class: 'peeks' });
    ui.stage.replaceChildren(
      h('div', { class: 'stage-top' }, h('b', {}, T(O(`Tìm đơn #${CODES[target]} trong 31 đơn`, `Find order #${CODES[target]} among 31`))), count),
      h('p', { class: 'lane-h' }, T(O('Đơn xếp theo mã tăng dần, từ trái sang phải, từ trên xuống. Mỗi lá lật tốn một bước.', 'Orders are sorted by code, left to right, top to bottom. Each flip costs one step.'))), deck, trail);
    ui.ctl.replaceChildren();
    const goals = () => ui.goals([{ ok: !!run.hand, label: O(`Tự tìm được trong tối đa **${LIMIT} lần lật**`, `Find it by hand in at most **${LIMIT} flips**`) }, { ok: !!run.code, label: O(`Dạy máy tìm trong 100.000 đơn tối đa **${GOAL} bước**`, `Teach the machine to search 100,000 orders in **${GOAL} steps** at most`) }]);
    const counter = () => { count.textContent = `${steps} ${T(O('lần lật', 'flips'))}`; };
    function flipCard(i, el) {
      if (over || el.classList.contains('open')) return;
      steps++; counter();
      el.classList.add('open');
      el.querySelector('b').textContent = '#' + CODES[i];
      if (!calm) el.animate([{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(0)' }], { duration: 320, easing: 'ease-out' });
      if (i === target) {
        over = true; el.classList.add('hit');
        const ok = steps <= LIMIT;
        if (ok) { run.hand = true; ui.say('linh', O(`Ra rồi, chỉ **${steps} lần**! Giờ làm sao cho máy cũng nghĩ như vậy?`, `Found it in just **${steps}**! Now how do we make the machine think like that?`), 'wow'); ui.actions(btn(T(O('Dạy máy tìm', 'Teach the machine')) + ' →', () => { run.level = 1; play(ui); }, 'primary'), btn(T(O('Tìm đơn khác', 'Another order')), () => { run.round++; level1(ui); }, 'ghost')); }
        else { ui.say('ban', O(`Mất **${steps} lần**. Chọn lá nào để dù mã đó lớn hay nhỏ hơn, mình cũng **bỏ được nhiều lá nhất**?`, `That took **${steps}**. Which card throws away **the most cards** whichever way the answer goes?`), 'think'); ui.actions(btn(T(O('Thử đơn khác', 'Try another order')) + ' ↻', () => { run.round++; level1(ui); }, 'primary')); }
        goals(); return;
      }
      const higher = CODES[target] > CODES[i];
      if (higher) lo = Math.max(lo, i + 1); else hi = Math.min(hi, i - 1);
      [...deck.children].forEach((c, k) => { if ((k < lo || k > hi) && !c.classList.contains('out')) { c.classList.add('out'); c.disabled = k !== i; if (!calm) c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(5px)' }, { transform: 'translateY(0)' }], { duration: 300, delay: Math.abs(k - i) * 18 }); } });
      trail.append(enter(h('li', {}, h('b', {}, '#' + CODES[i]), higher ? ' → ' + T(O('cần mã lớn hơn', 'need a higher code')) : ' ← ' + T(O('cần mã nhỏ hơn', 'need a lower code')), h('span', {}, `${hi - lo + 1} ${T(O('lá còn lại', 'cards left'))}`))));
    }
    ui.say('linh', O(`Khách hỏi đơn **#${CODES[target]}** đâu rồi. Lật bài tìm giúp mình, **${LIMIT} lần** là phải ra.`, `A guest asks about order **#${CODES[target]}**. Flip cards to find it, in **${LIMIT} flips** at most.`), 'worry');
    counter(); goals(); ui.actions();
  }

  function level2(ui) {
    const run = ui.run;
    const pick = (run.pick = run.pick || { mid: 'lo', less: 'lo = mid + 1', more: 'hi = mid - 1' });
    const sel = (k, label) => { const s = h('select', { id: 'b-' + k, 'aria-label': label, onchange: (e) => { pick[k] = e.target.value; reset(); } }, BLANKS[k].map((v) => h('option', { value: v }, v))); s.value = pick[k]; return s; };
    const L = (...kids) => h('div', { class: 'cl' }, ...kids);
    const code = h('div', { class: 'css code7' },
      L('lo, hi = 0, n - 1'), L('while lo <= hi:'),
      L('    mid = ', sel('mid', 'mid')),
      L('    if orders[mid] == target: return mid'),
      L('    elif orders[mid] < target: ', sel('less', T(O('khi nhỏ hơn', 'when smaller')))),
      L('    else: ', sel('more', T(O('khi lớn hơn', 'when larger')))));
    const funnel = h('div', { class: 'funnel' });
    const big = h('p', { class: 'big-n', 'aria-live': 'polite' });
    ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Máy tìm đơn ở vị trí 73.421 trong 100.000', 'The machine looks for position 73,421 of 100,000'))), h('span', { class: 'count' }, '2/2')), code, big, funnel);
    ui.ctl.replaceChildren();
    const goals = () => ui.goals([{ ok: !!run.hand, label: O(`Tự tìm được trong tối đa **${LIMIT} lần lật**`, `Find it by hand in at most **${LIMIT} flips**`) }, { ok: !!run.code, label: O(`Dạy máy tìm trong 100.000 đơn tối đa **${GOAL} bước**`, `Teach the machine to search 100,000 orders in **${GOAL} steps** at most`) }]);
    let stop = null;
    const go = btn('▶ ' + T(O('Cho máy chạy', 'Run it')), () => exec(), 'primary');
    function reset() { if (stop) stop(); funnel.replaceChildren(); big.textContent = ''; big.className = 'big-n'; go.disabled = false; go.classList.add('primary'); run.code = false; goals(); ui.actions(go); }
    function exec() {
      reset(); go.disabled = true;
      const r = run100k(pick);
      r.trail.forEach((t, i) => later(i * 190, () => {
        const left = (t.lo / BIG) * 100, width = Math.max(0.5, ((t.hi - t.lo + 1) / BIG) * 100);
        funnel.append(enter(h('div', { class: 'fr' }, h('small', {}, String(i + 1)), h('div', { class: 'ft' }, h('i', { style: `left:${left}%;width:${width}%` }), h('em', { style: `left:${(t.mid / BIG) * 100}%` }), h('u', { style: `left:${(AT / BIG) * 100}%` })), h('span', {}, (t.hi - t.lo + 1).toLocaleString(locale()))), 0, 'translateY(-8px)'));
      }));
      later(r.trail.length * 190 + 150, () => {
        const finish = () => {
          const ok = r.found && r.steps <= GOAL;
          go.disabled = false; run.code = ok; goals();
          big.textContent = r.found ? `${r.steps.toLocaleString(locale())} ${T(O('bước', 'steps'))}` : T(O('Không tìm thấy', 'Not found'));
          big.className = 'big-n ' + (ok ? 'good' : 'bad');
          if (ok) { ui.say('linh', O(`**${r.steps} bước** cho 100.000 đơn! Lật tay 31 lá hay máy dò trăm nghìn đơn, cùng một cách nghĩ.`, `**${r.steps} steps** for 100,000 orders! Thirty-one cards or a hundred thousand, the same idea.`), 'wow'); ui.actions(btn(T(UI.askMore) + ' →', () => ui.go('choice'), 'primary'), go); go.classList.remove('primary'); }
          else { ui.say('ban', r.found ? O(`Tìm ra, nhưng tới **${r.steps.toLocaleString(locale())} bước**: nó nhích từng đơn một. Nên nhìn vào chỗ nào đầu tiên?`, `It found it, after **${r.steps.toLocaleString(locale())} steps**: it creeps one order at a time. Where should it look first?`) : O('Máy **vứt nhầm** nửa có chứa đơn. Khi giá trị ở giữa nhỏ hơn thứ cần tìm, đơn nằm phía nào?', 'The machine **threw away the half** holding the order. If the middle value is smaller than the target, which side is it on?'), 'think'); ui.actions(go); }
        };
        if (!r.found || r.steps <= 18 || calm) { finish(); return; }
        let t = 0;
        stop = loop((dt) => { t += dt / 1400; const v = Math.round(r.trail.length + (r.steps - r.trail.length) * Math.min(1, t * t)); big.textContent = `${v.toLocaleString(locale())} ${T(O('bước…', 'steps…'))}`; if (t >= 1) { finish(); return false; } return true; });
      });
    }
    ui.say('linh', O('Điền ba chỗ trống rồi cho máy chạy. Máy làm **đúng y** những gì bạn viết, kể cả khi bạn viết sai.', 'Fill the three blanks and run it. The machine does **exactly** what you write, mistakes included.'), 'think');
    goals(); ui.actions(go);
  }

  function play(ui) { ui.run.level = ui.run.level || 0; if (ui.run.level === 0) level1(ui); else level2(ui); }

  QM.order.push('ep7');
  QM.eps.ep7 = {
    rules: { run100k, BLANKS, GOAL, LIMIT, N1 },
    id: 'ep7', subject: 'algo', mech: 'machine',
    title: O('Tìm một đơn giữa trăm nghìn đơn', 'One order in a hundred thousand'),
    subjectName: O('Giải thuật và Cấu trúc dữ liệu', 'Algorithms and Data Structures'),
    scene: () => ({ tidy: true, phone: '99', queue: 5 }), after: () => ({ tidy: true, phone: '1', queue: 2 }),
    intro: [
      { who: 'linh', mood: 'worry', text: O('Sau một năm có tới **100.000 đơn**. Khách hỏi đơn của họ, máy lục mãi chưa ra.', 'A year in, we have **100,000 orders**. A guest asks for theirs and the till searches forever.') },
      { who: 'ban', mood: 'think', text: O('Nó đang xem từng đơn một. Mình thử **làm cái máy** trước, rồi dạy lại nó.', 'It checks them one by one. Let me **be the machine** first, then teach it.') },
    ],
    play,
    choice(ui) {
      const box = h('div', { class: 'demo7' }), note = h('p', { class: 'phone-badge', 'aria-live': 'polite' });
      ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Đơn mới chen vào lộn xộn', 'New orders arrive out of order')))), box, note);
      const MIX = [7, 41, 23, 88, 3, 50, 95, 64, 12, 77, 30]; /* a binary search for 12 misses it here */
      const cells = new Map();
      const cell = (v) => { if (!cells.has(v)) cells.set(v, h('span', { class: 'c7' }, String(v))); return cells.get(v); };
      const show = (arr) => { arr.forEach((v) => { cell(v).className = 'c7'; }); flip([...box.children], () => box.replaceChildren(...arr.map(cell)), { stagger: 25 }); };
      const say = (cls, text) => { note.hidden = !text; note.className = 'phone-badge ' + cls; note.textContent = T(text || ''); };
      return {
        q: O('Đơn mới vào liên tục, **không theo thứ tự mã**. Giữ cho việc tìm vẫn nhanh bằng cách nào?', 'New orders keep arriving **out of code order**. How do we keep searching fast?'),
        reset: () => { show(MIX); say('', ''); },
        options: [
          { label: O('Cứ chia đôi trên danh sách lộn xộn', 'Binary-search the jumbled list anyway'), good: false, run: () => { show(MIX); [50, 23, 7, 41].forEach((v, i) => later(500 + i * 520, () => cell(v).classList.add('probe'))); later(2700, () => { cell(12).classList.add('lost'); say('bad', O('Tìm 12: máy báo không có, dù nó nằm ngay đó', 'Searching 12: “not found”, yet there it is')); }); say('bad', O('Đang tìm đơn 12…', 'Searching for order 12…')); }, reply: O('Chia đôi chỉ đúng khi danh sách **đã sắp xếp**.', 'Halving only works when the list is **sorted**.') },
          { label: O('Giữ danh sách luôn sắp xếp: đơn mới chèn đúng chỗ', 'Keep it sorted: slot each new order into place'), good: true, fx: { rating: 0.2, money: 300000 }, run: () => { const base = [...MIX].sort((a, b) => a - b); show([...base, 44]); later(700, () => { show([...base, 44].sort((a, b) => a - b)); cell(44).classList.add('probe'); }); say('good', O('Đơn 44 trượt vào đúng chỗ, tìm vẫn chỉ vài bước', 'Order 44 slides into place and search stays quick')); }, reply: O('Đúng rồi. **Chỉ mục** trong cơ sở dữ liệu làm hộ việc này.', 'Yes. A database **index** does exactly this for us.'), mood: 'wow' },
          { label: O('Mỗi lần tìm thì sắp lại toàn bộ', 'Re-sort everything before every search'), good: false, run: () => { show(MIX); later(500, () => show([...MIX].sort((a, b) => a - b))); say('bad', O('100.000 đơn: khoảng 1,7 triệu phép so sánh cho mỗi lần tìm', '100,000 orders: about 1.7 million comparisons per search')); }, reply: O('Sắp lại tốn gấp trăm nghìn lần chính việc tìm.', 'Re-sorting costs about a hundred thousand times the search itself.') },
        ],
      };
    },
    debrief: {
      term: O('Tìm kiếm nhị phân', 'Binary search'),
      thanks: O('Nhanh thật. Ủa mà sao có người uống ly **0₫** nữa rồi?', 'So fast. Wait, why did someone get a **0₫** drink again?'),
      points: [
        O('Mỗi bước **bỏ đi một nửa**: 100.000 đơn cần tối đa **17 bước**.', 'Each step **drops half**: 100,000 orders need at most **17 steps**.'),
        O('Điều kiện bắt buộc: dữ liệu **đã sắp xếp**.', 'The catch: the data must be **sorted**.'),
        O('**Chỉ mục** của cơ sở dữ liệu dựa trên đúng ý này.', 'A database **index** rests on this very idea.'),
      ],
      code: 'lo, hi = 0, n - 1\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if orders[mid] == target: return mid\n    elif orders[mid] < target: lo = mid + 1\n    else: hi = mid - 1',
    },
  };
})();

/* Episode 8 · Web Security ("attack and defend"): test the shop's own order form, then patch it.
   Everything is simulated in the page: no database and no real statement is ever run. */
(function () {
  const PRICE = 30000;
  /* What a naive server would do when it pastes the note straight into its statement. */
  function pasted(note) {
    if (!note.includes("'")) return { ok: true, note, price: PRICE };
    const m = note.match(/^([^']*)'\s*,\s*(\d{1,7})\s*\)\s*;?\s*(--|\/\*)/);
    return m ? { ok: true, note: m[1], price: Number(m[2]) } : { ok: false, error: true };
  }
  const FIXES = [
    { id: 'block', why: O('Chặn nhầm **khách thật**: người có dấu nháy trong tên không đặt được. Cấm ký tự không phải lời giải.', 'A **real guest** is blocked: anyone with a quote in their name cannot order. Banning characters is not the answer.'), name: O('Từ chối ghi chú có dấu nháy `\'`', 'Reject notes containing a quote `\'`'), run: (n) => (n.includes("'") ? { ok: false, rejected: true } : pasted(n)) },
    { id: 'hide', why: O('Giấu lỗi chỉ làm đơn **mất không dấu vết**, còn kẻ gian **vẫn đổi được giá**.', 'Hiding errors only makes orders **vanish silently**, and the cheater **still changes the price**.'), name: O('Ẩn thông báo lỗi của máy chủ', 'Hide the server’s error messages'), run: (n) => pasted(n) },
    { id: 'strip', why: O('Xoá `--` vẫn **sót mẹo** `/*`, mà khách có dấu nháy vẫn gặp lỗi. Lọc từng mẹo thì luôn còn mẹo khác.', 'Stripping `--` **misses the** `/*` **trick**, and guests with quotes still hit errors. Filtering one trick leaves the next.'), name: O('Xoá hai dấu gạch `--` trước khi ghép', 'Strip `--` before pasting'), run: (n) => pasted(n.replace(/--/g, '')) },
    { id: 'param', name: O('Dùng truy vấn tham số: gửi dữ liệu tách khỏi câu lệnh', 'Parameterised query: send data apart from the statement'), run: (n) => ({ ok: true, note: n, price: PRICE }) },
  ];
  const CASES = [
    { input: 'ít đá', legit: true, what: O('đơn bình thường', 'a normal order') },
    { input: "cho bạn K'Brim", legit: true, what: O('tên có dấu nháy', 'a name with a quote') },
    { input: "ít đá', 0) --", legit: false, what: O('chèn lệnh kiểu 1', 'injection, variant 1') },
    { input: "x', 1000) /*", legit: false, what: O('chèn lệnh kiểu 2', 'injection, variant 2') },
  ];
  const passes = (c, r) => (c.legit ? r.ok && r.price === PRICE && r.note === c.input : !(r.ok && r.price < PRICE));

  function statement(note) {
    const q = note.indexOf("'");
    const safe = q < 0 ? note : note.slice(0, q);
    const rest = q < 0 ? '' : note.slice(q);
    const cut = rest.search(/--|\/\*/);
    const cmd = cut < 0 ? rest : rest.slice(0, cut), com = cut < 0 ? '' : rest.slice(cut);
    return `INSERT INTO don_hang (mon, ghi_chu, gia)\nVALUES ('Trà sữa', '<span class="data">${esc(safe)}</span><span class="cmd">${esc(cmd)}</span><span class="com">${esc(com)}${com ? "', 30000);" : ''}</span>${com ? '' : "', 30000);"}`;
  }

  const goalsFor = (ui) => ui.goals([
    { ok: !!ui.run.hacked, label: O('Chứng minh lỗ hổng: đặt được ly **dưới 30.000₫**', 'Prove the flaw: get a drink for **under 30,000₫**') },
    { ok: !!ui.run.patched, label: O('Bản vá qua **cả 4 ca** kiểm thử', 'Your patch passes **all 4** test cases') },
  ]);

  function attack(ui) {
    const run = ui.run;
    run.hints = run.hints || 0;
    const input = h('input', { type: 'text', id: 'note', maxlength: '60', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', value: run.note || '' });
    const sql = h('pre', { class: 'code sql8', 'aria-label': T(O('Câu lệnh máy chủ ghép', 'Statement built by the server')) });
    const result = h('div', { class: 'receipt', 'aria-live': 'polite' });
    const chips = h('div', { class: 'row' }, ['ít đá', "cho bạn K'Brim"].map((v) => h('button', { type: 'button', class: 'chip', onclick: () => { input.value = v; typed(); } }, v)));
    ui.stage.replaceChildren(
      h('div', { class: 'stage-top' }, h('b', {}, T(O('Thử chính trang đặt món của quán (được chủ quán cho phép)', 'Test the shop’s own order page (with the owner’s permission)'))), h('span', { class: 'count' }, '1/2')),
      h('form', { class: 'orderform', onsubmit: (e) => { e.preventDefault(); send(); } }, h('label', { for: 'note' }, T(O('Trà sữa 30.000₫ · Ghi chú cho quầy', 'Milk tea 30,000₫ · Note to the counter'))), h('div', { class: 'row' }, input, h('button', { type: 'submit', class: 'btn primary' }, T(O('Gửi đơn', 'Send order')))), chips),
      h('p', { class: 'lane-h' }, T(O('Máy chủ ghép ghi chú thẳng vào câu lệnh:', 'The server pastes the note straight into its statement:'))), sql, result);
    const hintBox = h('ol', { class: 'hints' });
    const HINTS = [
      O('Gửi thử ghi chú có **dấu nháy đơn** xem máy chủ phản ứng sao.', 'Send a note containing a **single quote** and watch the server.'),
      O('Dấu `\'` **đóng chuỗi sớm**. Chữ phía sau thành lệnh. Câu lệnh đang chờ một con số giá và dấu `)`.', 'The `\'` **closes the text early**. What follows becomes code. The statement is waiting for a price and a `)`.'),
      O('Thử: `ít đá\', 0) --`  (hai gạch biến phần còn lại thành chú thích).', 'Try: `ít đá\', 0) --`  (two dashes turn the rest into a comment).'),
    ];
    const hintBtn = h('button', { type: 'button', class: 'linkbtn', onclick: () => { run.hints++; drawHints(); } });
    ui.ctl.replaceChildren(hintBtn, hintBox);
    function drawHints() {
      hintBox.replaceChildren(...HINTS.slice(0, run.hints).map((t) => h('li', { html: rich(T(t)) })));
      hintBtn.hidden = run.hints >= HINTS.length;
      hintBtn.textContent = T(O('Cho mình một gợi ý', 'Give me a hint')) + ` (${run.hints}/${HINTS.length})`;
    }
    function typed() { run.note = input.value; sql.innerHTML = statement(input.value); result.replaceChildren(); }
    function send() {
      typed();
      const r = pasted(input.value);
      const hacked = r.ok && r.price < PRICE;
      result.replaceChildren(enter(h('div', { class: 'rc ' + (hacked ? 'hack' : r.ok ? 'ok' : 'err') },
        r.ok ? [h('b', {}, T(O('Đơn đã lưu', 'Order saved'))), h('span', {}, `ghi_chu = “${r.note}”`), h('strong', {}, money(r.price))] : [h('b', {}, 'SQL error'), h('span', {}, T(O('syntax error: câu lệnh bị gãy ở chỗ ghi chú của bạn', 'syntax error: the statement breaks inside your note')))]), 0, 'scale(.85)'));
      if (hacked) { run.hacked = true; goalsFor(ui); ui.say('linh', O(`Ly trà sữa **${money(r.price)}**! Không cần mã nào, chỉ cần một cái ghi chú. Vá ngay đi!`, `A milk tea for **${money(r.price)}**! No code needed, just a note. Patch it now!`), 'wow'); ui.actions(btn(T(O('Vá lỗ hổng', 'Patch the flaw')) + ' →', () => { run.level = 1; play(ui); }, 'primary')); }
      else if (!r.ok) ui.say('ban', O('Máy chủ **gãy** vì một dấu nháy: chữ mình gõ đang bị đọc như **lệnh**.', 'One quote **broke** the server: what I type is being read as **code**.'), 'think');
      else ui.say('ban', input.value ? O('Đơn lưu bình thường. Ký tự nào trong ghi chú có thể làm câu lệnh hiểu sai?', 'Saved as usual. Which character could make the statement misread the note?') : O('Gõ gì đó vào ghi chú rồi gửi thử.', 'Type something into the note and send it.'), 'think');
    }
    input.addEventListener('input', typed);
    ui.say('linh', O('Có người uống ly **0₫** mà không dùng mã nào, chỉ thấy một **ghi chú lạ**. Bạn thử xem họ làm sao.', 'Someone got a **0₫** drink with no code at all, just a **strange note**. Find out how.'), 'worry');
    drawHints(); typed(); goalsFor(ui);
    ui.actions(run.hacked ? btn(T(O('Vá lỗ hổng', 'Patch the flaw')) + ' →', () => { run.level = 1; play(ui); }, 'primary') : null);
  }

  function defend(ui) {
    const run = ui.run;
    const rows = h('tbody');
    const code = h('pre', { class: 'code' });
    ui.stage.replaceChildren(
      h('div', { class: 'stage-top' }, h('b', {}, T(O('Chọn bản vá rồi chạy lại 4 ca kiểm thử', 'Pick a patch, then rerun the 4 test cases'))), h('span', { class: 'count' }, '2/2')), code,
      h('div', { class: 'table' }, h('table', { class: 'tries2 tests' }, h('thead', {}, h('tr', {}, h('th', {}, T(O('Ghi chú gửi lên', 'Note sent'))), h('th', {}, T(O('Loại', 'Kind'))), h('th', {}, T(O('Kết quả', 'Result'))))), rows)));
    const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': T(O('Bản vá', 'Patch')) }, FIXES.map((f) => h('button', { type: 'button', role: 'radio', 'data-k': f.id, 'aria-checked': 'false', html: rich(T(f.name)), onclick: () => { run.fix = f.id; sync(); } })));
    ui.ctl.replaceChildren(seg);
    const go = btn('▶ ' + T(O('Chạy kiểm thử', 'Run the tests')), () => test(), 'primary');
    function draw(results) {
      rows.replaceChildren(...CASES.map((c, i) => {
        const r = results && results[i];
        let cell = '…', cls = '';
        if (r) { const ok = passes(c, r); cls = ok ? 'good' : 'bad'; cell = (ok ? '✓ ' : '✕ ') + (r.rejected ? T(O('bị từ chối', 'rejected')) : r.error ? T(run.fix === 'hide' ? O('đơn mất, không báo gì', 'lost without a word') : O('máy chủ lỗi', 'server error')) : T(O('lưu, giá ', 'saved at ')) + money(r.price)); }
        return h('tr', { class: 'k' + i }, h('td', {}, h('code', {}, c.input)), h('td', {}, T(c.what)), h('td', { class: cls }, cell));
      }));
    }
    function sync() {
      seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.k === run.fix)));
      code.textContent = run.fix === 'param'
        ? 'db.execute(\n  "INSERT INTO don_hang VALUES (?, ?, ?)",\n  (mon, ghi_chu, gia))'
        : (run.fix === 'block' ? 'if "\'" in ghi_chu: reject()\n' : run.fix === 'strip' ? 'ghi_chu = ghi_chu.replace("--", "")\n' : run.fix === 'hide' ? 'show_errors = False\n' : '') + 'db.execute("INSERT INTO don_hang VALUES (\'" + mon +\n  "\', \'" + ghi_chu + "\', " + gia + ")")';
      draw(null); go.disabled = !run.fix; ui.actions(go);
    }
    function test() {
      go.disabled = true;
      const fix = FIXES.find((f) => f.id === run.fix);
      const res = CASES.map((c) => fix.run(c.input));
      const shown = [];
      res.forEach((r, i) => later(150 + i * 420, () => { shown[i] = r; draw(shown); const tr = rows.querySelector('.k' + i); if (tr) enter(tr, 0, 'translateX(-16px)'); }));
      later(150 + res.length * 420 + 200, () => {
        go.disabled = false;
        const bad = CASES.findIndex((c, i) => !passes(c, res[i]));
        run.patched = bad < 0; goalsFor(ui);
        if (bad < 0) { ui.say('linh', O('Cả bốn ca đều qua: khách tên K’Brim đặt được, còn ghi chú gian chỉ là **chữ**.', 'All four pass: K’Brim can order, and the sneaky notes are just **text**.'), 'wow'); ui.actions(btn(T(UI.askMore) + ' →', () => ui.go('choice'), 'primary'), go); go.classList.remove('primary'); return; }
        ui.say('ban', fix.why, 'think');
        ui.actions(go);
      });
    }
    ui.say('linh', O('Bốn bản vá được đề xuất. Cái nào chặn được kẻ gian mà **không làm khó khách thật**?', 'Four patches were suggested. Which stops the cheater **without hurting real guests**?'), 'think');
    sync(); goalsFor(ui);
  }

  function play(ui) { ui.run.level = ui.run.level || 0; if (ui.run.level === 0) attack(ui); else defend(ui); }

  QM.order.push('ep8');
  QM.eps.ep8 = {
    rules: { pasted, FIXES, CASES, passes },
    id: 'ep8', subject: 'websec', mech: 'defend',
    title: O('Ly miễn phí qua ô ghi chú', 'A free drink through the notes box'),
    subjectName: O('An toàn ứng dụng Web', 'Web Security'),
    scene: () => ({ tidy: true, badge: '0₫ ?' }), after: () => ({ tidy: true, shield: true, queue: 3 }),
    intro: [
      { who: 'linh', mood: 'worry', text: O('Lại có người uống **0₫**! Lần này không có mã TEST100 nào hết.', 'Another **0₫** drink! And this time no TEST100 code.') },
      { who: 'ban', mood: 'think', text: O('Lần ở tập 3 mình hỏi bảng bằng SQL. Có người khác cũng đang “nói SQL” với nó.', 'In episode 3 we asked the table in SQL. Someone else is speaking SQL to it too.') },
      { who: 'linh', mood: 'think', text: O('Hệ thống của quán, mình cho phép. Bạn cứ thử phá rồi vá lại.', 'It is our system and you have my permission. Break it, then fix it.') },
    ],
    play,
    choice(ui) {
      const log = h('ol', { class: 'events' });
      ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Nhật ký: 12 ly đã bị lấy theo cách này', 'The log: 12 drinks were taken this way')))), log);
      const show = (items) => () => log.replaceChildren(...items.map((x, i) => enter(h('li', { class: x[0] }, h('i', {}, x[0] === 'good' ? '✓' : '✕'), T(x[1])), i * 260, 'translateX(-20px)')));
      return {
        q: O('Lỗi đã vá. Còn **12 ly** bị lấy trước đó thì mình làm gì?', 'The flaw is patched. What about the **12 drinks** already taken?'),
        reset: () => log.replaceChildren(),
        options: [
          { label: O('Soát nhật ký, ghi lại sự cố, báo cho chủ quán', 'Check the logs, write up the incident, tell the owner'), good: true, fx: { money: 360000, rating: 0.2 }, run: show([['good', O('Biết chính xác thiệt hại', 'The damage is known exactly')], ['good', O('Có hồ sơ để xử lý đúng cách', 'There is a record to act on properly')], ['good', O('Cả quán biết để cảnh giác', 'Everyone knows what to watch for')]]), reply: O('Vậy mới rõ ràng. Lần sau gặp là biết làm ngay.', 'That is clear. Next time we will know what to do.'), mood: 'happy' },
          { label: O('Lặng lẽ sửa xong rồi thôi', 'Fix it quietly and move on'), good: false, run: show([['bad', O('Không ai biết mất bao nhiêu', 'Nobody knows what was lost')], ['bad', O('Lỗi tương tự ở trang khác không được kiểm tra', 'The same flaw elsewhere goes unchecked')]]), reply: O('Giấu đi thì mình không biết còn chỗ nào hở.', 'Hiding it means we never learn what else is open.') },
          { label: O('Đăng số điện thoại người đó lên mạng', 'Post the person’s phone number online'), good: false, run: show([['bad', O('Công khai dữ liệu cá nhân của khách', 'A guest’s personal data goes public')], ['bad', O('Quán có thể bị xử lý theo pháp luật', 'The shop can get into legal trouble')]]), reply: O('Không được! Dữ liệu cá nhân không phải thứ để bêu riếu.', 'No! Personal data is not something to shame people with.') },
        ],
      };
    },
    debrief: {
      term: O('SQL injection và truy vấn tham số', 'SQL injection and parameterised queries'),
      thanks: O('Vá xong. Nhưng nửa đêm lại có người cứ thử đăng nhập trang quản lý…', 'Patched. But at night someone keeps trying to log in to the admin page…'),
      points: [
        O('Ghép dữ liệu người dùng vào câu lệnh thì **dữ liệu biến thành lệnh**.', 'Paste user input into a statement and **data turns into code**.'),
        O('**Truy vấn tham số** giữ dữ liệu luôn là dữ liệu; lọc ký tự thì vừa sót vừa chặn nhầm.', '**Parameterised queries** keep data as data; filtering characters both misses attacks and blocks real users.'),
        O('Chỉ thử xâm nhập khi **chủ hệ thống cho phép**.', 'Only test a system when its **owner permits** it.'),
      ],
      code: '# sai: ghép chuỗi\nsql = "... VALUES (\'" + note + "\', 30000)"\n\n# đúng: tham số\ndb.execute("... VALUES (?, ?)", (note, 30000))',
    },
  };
})();

/* Episode 9 · Intrusion detection ("tune within budget"): set alarm thresholds on last week's log. */
(function () {
  /* one row = one source address in one night: failed logins, different usernames tried, truth */
  const P = (f, u, bad) => ({ f, u, bad });
  const DATA = [
    P(1, 1), P(2, 1), P(55, 3, 1), P(3, 1), P(2, 2), P(22, 1, 1), P(4, 1), P(7, 7, 1), P(3, 2), P(30, 2, 1), P(5, 1), P(11, 1),
    P(41, 1, 1), P(6, 2), P(9, 9, 1), P(4, 2), P(18, 1, 1), P(8, 1), P(26, 6, 1), P(1, 2), P(6, 8, 1), P(14, 1), P(16, 2, 1),
  ];
  // 13 staff (people mistyping) and 10 break-in attempts; three of the latter are slow "password spraying".
  const ATTACKS = DATA.filter((d) => d.bad).length, FP_MAX = 1;
  const W = 640, H = 330, L = 46, R = 18, T0 = 16, B = 42, XMAX = 60, YMAX = 10;
  const X = (f) => L + (f / XMAX) * (W - L - R);
  const Y = (u) => T0 + (1 - u / YMAX) * (H - T0 - B);
  const judge = (t1, t2) => {
    const hit = DATA.map((d) => d.f >= t1 || (t2 != null && d.u >= t2));
    return { hit, caught: DATA.filter((d, i) => d.bad && hit[i]).length, fp: DATA.filter((d, i) => !d.bad && hit[i]).length };
  };

  function play(ui) {
    const run = ui.run;
    run.level = run.level || 0;
    run.t1 = run.t1 || 30; run.t2 = run.t2 || 10;
    const two = run.level === 1;
    const need = two ? ATTACKS : 7;
    const wrap = h('div', { class: 'chart alarm' });
    let g = '';
    [0, 10, 20, 30, 40, 50, 60].forEach((v) => { g += `<line x1="${X(v)}" x2="${X(v)}" y1="${T0}" y2="${H - B}" class="grid"/><text x="${X(v)}" y="${H - B + 18}" text-anchor="middle" class="tick">${v}</text>`; });
    [0, 2, 4, 6, 8, 10].forEach((v) => { g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" class="tick">${v}</text>`; });
    const mark = (d, i) => `<g class="pt ${d.bad ? 'att' : 'staff'}" data-i="${i}" transform="translate(${X(d.f)} ${Y(d.u)})"><circle class="ring" r="13"/>${d.bad ? '<path class="dot" d="M0-8 8 0 0 8-8 0Z"/>' : '<circle class="dot" r="6"/>'}<title>${esc(T(d.bad ? O('dò mật khẩu', 'break-in') : O('người của quán', 'staff')))}: ${d.f} / ${d.u}</title></g>`;
    wrap.innerHTML = `<div class="legend"><span class="key staff"><i></i>${esc(T(O('Người của quán gõ sai', 'Staff mistyping')))}</span><span class="key att"><i></i>${esc(T(O('Kẻ dò mật khẩu', 'Break-in attempt')))}</span><span class="key ringk"><i></i>${esc(T(O('Chuông reo', 'Alarm')))}</span></div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T(O('Biểu đồ số lần đăng nhập sai và số tài khoản bị thử', 'Chart of failed logins against usernames tried')))}">${g}<text x="${(L + W - R) / 2}" y="${H - 5}" text-anchor="middle" class="axis">${esc(T(O('số lần đăng nhập sai', 'failed logins')))}</text><text x="${L}" y="11" class="axis">${esc(T(O('số tài khoản khác nhau bị thử', 'different usernames tried')))}</text><rect class="zone1"/><rect class="zone2" ${two ? '' : 'hidden'}/><line class="th th1" y1="${T0}" y2="${H - B}"/><line class="th th2" x1="${L}" x2="${W - R}" ${two ? '' : 'hidden'}/>${DATA.map(mark).join('')}</svg>`;
    const tiles = h('div', { class: 'stats', 'aria-live': 'polite' });
    ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Nhật ký tuần trước, đã điều tra xong ai là ai', 'Last week’s log, already investigated'))), h('span', { class: 'count' }, `${run.level + 1}/2`)), wrap, tiles);
    const slider = (id, label, k, lo, hi) => {
      const out = h('output', {}, '≥ ' + run[k]);
      const input = h('input', { type: 'range', id, min: String(lo), max: String(hi), step: '1', value: String(run[k]) });
      input.addEventListener('input', () => { run[k] = +input.value; out.textContent = '≥ ' + run[k]; token++; go.disabled = false; go.classList.add('primary'); draw(false); ui.actions(go); });
      return h('label', { class: 'slider stacked', for: id }, h('span', {}, T(label)), input, out);
    };
    ui.ctl.replaceChildren(
      slider('t1', O('Reo khi số lần sai', 'Alarm when failed logins'), 't1', 3, 40),
      two ? slider('t2', O('HOẶC số tài khoản bị thử', 'OR usernames tried'), 't2', 2, 10) : '');
    const pts = [...wrap.querySelectorAll('.pt')];
    const rect = (sel, x, y, w, ht) => { const r = $(sel, wrap); [['x', x], ['y', y], ['width', Math.max(0, w)], ['height', Math.max(0, ht)]].forEach(([k, v]) => r.setAttribute(k, v)); };
    let token = 0; /* moving a slider cancels the night in progress */
    const goals = () => ui.goals([
      { ok: !!run.one, label: O(`Một ngưỡng: bắt **≥ 7/10**, báo nhầm ≤ ${FP_MAX}`, `One threshold: catch **7+ of 10**, at most ${FP_MAX} false alarm`) },
      { ok: !!run.both, label: O(`Hai ngưỡng: bắt **đủ 10/10**, báo nhầm ≤ ${FP_MAX}`, `Two thresholds: catch **all 10**, at most ${FP_MAX} false alarm`) },
    ]);
    const stat = (label, value, cls) => h('div', { class: 'stat ' + cls }, h('small', {}, T(label)), h('b', {}, value));
    function paintStats(caught, fp, done) {
      tiles.replaceChildren(
        stat(O('Bắt được', 'Caught'), `${caught}/${ATTACKS}`, done ? (caught >= need ? 'good' : 'bad') : ''),
        stat(O('Bỏ sót', 'Missed'), done ? String(ATTACKS - caught) : '…', ''),
        stat(O(`Báo nhầm (chịu được ${FP_MAX})`, `False alarms (limit ${FP_MAX})`), String(fp), done ? (fp <= FP_MAX ? 'good' : 'bad') : ''));
    }
    /* preview = where the lines are; rings appear only once a night is run */
    function draw(live) {
      const x = X(run.t1 - 0.5), y = Y(run.t2 - 0.5);
      const l1 = $('.th1', wrap); l1.setAttribute('x1', x); l1.setAttribute('x2', x);
      rect('.zone1', x, T0, W - R - x, H - B - T0);
      if (two) { const l2 = $('.th2', wrap); l2.setAttribute('y1', y); l2.setAttribute('y2', y); rect('.zone2', L, T0, x - L, y - T0); }
      if (!live) { pts.forEach((p) => p.classList.remove('on')); tiles.replaceChildren(h('p', { class: 'hint9' }, T(O('Vùng cam là nơi chuông sẽ reo. Chạy thử một đêm để đếm.', 'The shaded area is where the alarm rings. Run a night to count.')))); }
    }
    const go = btn('▶ ' + T(O('Chạy thử một đêm', 'Run a night')), () => night(), 'primary');
    function night() {
      go.disabled = true; draw(false);
      const mine = ++token;
      const r = judge(run.t1, two ? run.t2 : null);
      let caught = 0, fp = 0;
      paintStats(0, 0, false);
      DATA.forEach((d, i) => later(i * 110, () => {
        if (mine !== token) return;
        if (!r.hit[i]) { if (!calm) pts[i].animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 300 }); return; }
        pts[i].classList.add('on'); if (d.bad) caught++; else fp++;
        paintStats(caught, fp, false);
      }));
      later(DATA.length * 110 + 250, () => {
        if (mine !== token) return;
        go.disabled = false; paintStats(r.caught, r.fp, true);
        const ok = r.caught >= need && r.fp <= FP_MAX;
        if (ok) { if (two) run.both = true; else run.one = true; }
        goals();
        if (ok && !two) { ui.say('linh', O(`Bắt được **${r.caught}/10** mà gần như không réo nhầm. Còn mấy chấm nằm **trên cao bên trái** thì sao?`, `**${r.caught} of 10** with almost no false alarms. What about the diamonds **up on the left**?`), 'happy'); ui.actions(btn(T(O('Thêm ngưỡng thứ hai', 'Add a second threshold')) + ' →', () => { run.level = 1; play(ui); }, 'primary'), go); go.classList.remove('primary'); }
        else if (ok) { ui.say('linh', O('Đủ **10/10**! Kẻ dò chậm sai ít lần nhưng thử rất nhiều tài khoản, phải nhìn thêm chiều đó mới thấy.', 'All **10 of 10**! Slow attackers fail only a few times but try many usernames: you only see them in that second dimension.'), 'wow'); ui.actions(btn(T(UI.askMore) + ' →', () => ui.go('choice'), 'primary'), go); go.classList.remove('primary'); }
        else if (r.fp > FP_MAX) { ui.say('linh', O(`Chuông réo nhầm **${r.fp} lần**, cả đêm mình không ngủ được. Nâng ngưỡng lên?`, `**${r.fp} false alarms**, I would never sleep. Raise a threshold?`), 'worry'); ui.actions(go); }
        else { ui.say('ban', two ? O(`Còn sót **${ATTACKS - r.caught}**. Chấm sót nằm phía nào của hai đường?`, `**${ATTACKS - r.caught}** slipped through. On which side of the two lines do they sit?`) : O(`Mới bắt **${r.caught}/10**. Hạ ngưỡng xuống thì bắt thêm, nhưng coi chừng réo nhầm.`, `Only **${r.caught} of 10**. A lower threshold catches more, but watch the false alarms.`), 'think'); ui.actions(go); }
      });
    }
    ui.say('linh', two ? O('Ba kẻ **dò chậm** lọt lưới. Giờ chuông được reo theo **một trong hai** điều kiện.', 'Three **slow attackers** slipped by. The alarm may now ring on **either** condition.') : O(`Đặt ngưỡng sao cho bắt được **ít nhất 7/10** cuộc dò mà chỉ réo nhầm **tối đa ${FP_MAX} lần**.`, `Set a threshold that catches **at least 7 of 10** attempts with **at most ${FP_MAX}** false alarm.`), 'think');
    draw(false); goals(); ui.actions(go);
  }

  QM.order.push('ep9');
  QM.eps.ep9 = {
    rules: { judge, DATA, ATTACKS, FP_MAX },
    id: 'ep9', subject: 'ids', mech: 'tune',
    title: O('Chuông báo động lúc nửa đêm', 'The midnight alarm'),
    subjectName: O('Phát hiện và Ngăn chặn xâm nhập', 'Intrusion Detection and Prevention'),
    scene: () => ({ tidy: true, night: true, badge: '03:00' }), after: () => ({ tidy: true, night: true, shield: true }),
    intro: [
      { who: 'linh', mood: 'worry', text: O('Nửa đêm cứ có người **thử mật khẩu** trang quản lý của quán!', 'All night someone keeps **guessing the password** of our admin page!') },
      { who: 'ban', mood: 'think', text: O('Mình đặt chuông. Nhạy quá thì réo hoài, lì quá thì lọt người.', 'I will set an alarm. Too sensitive and it never stops, too dull and intruders slip by.') },
      { who: 'linh', mood: 'think', text: O('Mỗi đêm mình chỉ chịu được **một lần réo nhầm** thôi đó.', 'I can only take **one false alarm** a night.') },
    ],
    play,
    choice(ui) {
      const line = h('ol', { class: 'events' });
      ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('03:14 · một địa chỉ vừa thử 9 tài khoản', '03:14 · one address just tried 9 usernames')))), line);
      const show = (items) => () => line.replaceChildren(...items.map((x, i) => enter(h('li', { class: x[0] }, h('i', {}, x[0] === 'good' ? '✓' : '✕'), T(x[1])), i * 300, 'translateX(-20px)')));
      return {
        q: O('Chuông vừa reo thật. Bạn muốn hệ thống **tự làm gì** ngay lúc đó?', 'The alarm just rang. What should the system **do on its own**?'),
        reset: () => line.replaceChildren(),
        options: [
          { label: O('Khoá tạm địa chỉ đó 15 phút và nhắn cho bạn', 'Block that address for 15 minutes and message you'), good: true, fx: { rating: 0.1, money: 200000 }, run: show([['good', O('03:14 địa chỉ bị khoá tạm', '03:14 the address is blocked for a while')], ['good', O('03:15 tin nhắn đến máy bạn', '03:15 a message reaches your phone')], ['good', O('07:00 xem lại, mở khoá nếu là nhầm', '07:00 review, unblock if it was a mistake')]]), reply: O('Vừa đủ mạnh, nhầm thì vẫn gỡ lại được.', 'Strong enough, and reversible if it was wrong.'), mood: 'wow' },
          { label: O('Tắt luôn trang quản lý tới sáng', 'Switch the admin page off until morning'), good: false, run: show([['bad', O('03:14 trang quản lý ngừng chạy', '03:14 the admin page goes down')], ['bad', O('06:30 ca sáng không mở được két', '06:30 the morning shift cannot open the till')]]), reply: O('Kẻ gian chưa làm gì mà quán đã tự khoá mình.', 'The attacker did nothing yet and we locked ourselves out.') },
          { label: O('Tự động tấn công ngược lại máy đó', 'Automatically attack that machine back'), good: false, run: show([['bad', O('Địa chỉ đó có thể là máy của người vô can', 'That address may belong to a bystander')], ['bad', O('Tấn công máy người khác là phạm pháp', 'Attacking other people’s machines is illegal')]]), reply: O('Không bao giờ. Mình phòng thủ, không đi đột nhập ai.', 'Never. We defend, we do not break into anyone.') },
        ],
      };
    },
    debrief: {
      term: O('Ngưỡng phát hiện, báo nhầm và bỏ sót', 'Detection thresholds, false alarms and misses'),
      thanks: O('Từ đó đêm yên tĩnh. Mà này, hè này bạn định đi thực tập phải không?', 'Quiet nights ever since. By the way, are you not applying for an internship this summer?'),
      points: [
        O('Hạ ngưỡng thì **bắt thêm** nhưng cũng **réo nhầm thêm**.', 'Lower the threshold and you **catch more** but also **false-alarm more**.'),
        O('Một dấu hiệu có khi không đủ: thêm **góc nhìn thứ hai** để thấy kẻ dò chậm.', 'One signal may not be enough: a **second feature** reveals the slow attacker.'),
        O('Phản ứng tự động nên **vừa phải** và **gỡ lại được**.', 'Automatic responses should be **proportionate** and **reversible**.'),
      ],
      code: 'if failed_logins >= 12 or usernames_tried >= 3:\n    block(address, minutes=15)\n    notify(admin)',
    },
  };
})();

/* Finale · Internship ("branching talk"): tell the shop's story to an interviewer. */
(function () {
  const METERS = [['clear', O('Rõ ràng', 'Clarity')], ['proof', O('Bằng chứng', 'Evidence')], ['honest', O('Trung thực', 'Honesty')]];
  const STAR = [['S', O('Tình huống', 'Situation')], ['T', O('Việc cần làm', 'Task')], ['A', O('Hành động', 'Action')], ['R', O('Kết quả', 'Result')]];
  const PASS = 9;
  /* the learner's own best waiting time from episode 2, when this visit has one */
  const bestWait = () => { const t = (QM.runs.ep2 && QM.runs.ep2.tries1) || []; const ok = t.map((x) => x.avg).filter((x) => x <= 4.5); return ok.length ? Math.min(...ok) : 4.2; };
  /* each answer: text, meter changes, STAR parts it covers, interviewer reaction, mood */
  const A = (vi, en, m, star, rvi, ren, mood) => ({ text: O(vi, en), m, star, reply: O(rvi, ren), mood });
  const questions = () => {
    const w = bestWait();
    const vi = w.toLocaleString('vi-VN', { maximumFractionDigits: 1 }), en = w.toLocaleString('en-US', { maximumFractionDigits: 1 });
    return [
      { q: O('Kể mình nghe về một việc bạn làm mà bạn tự hào.', 'Tell me about something you built that you are proud of.'), answers: [
        A('Em làm nhiều thứ lắm: web, mạng, bảo mật, cơ sở dữ liệu ạ.', 'Lots of things: web, networks, security, databases.', [0, 0, 1], '', 'Nghe rộng, nhưng mình chưa hình dung được bạn đã làm gì cụ thể.', 'Broad, but I cannot picture anything you actually did.', 'think'),
        A(`Quán của bạn em nghẽn giờ trưa. Em cần giảm thời gian chờ, nên đổi thứ tự pha, ly ngắn trước. Chờ trung bình giảm từ 9,8 còn ${vi} phút.`, `A friend’s shop jammed at lunch. I had to cut waiting, so I reordered the queue, short drinks first. Average wait fell from 9.8 to ${en} minutes.`, [1, 1, 1], 'STAR', 'Rõ ràng: chuyện gì, bạn làm gì, kết quả ra sao. Kể tiếp đi.', 'Clear: what happened, what you did, what came out. Go on.', 'wow'),
        A('Em tự dựng toàn bộ hệ thống một mình, việc gì em cũng làm được ạ.', 'I built the whole system alone. I can do anything.', [0, 0, 0], 'A', 'Việc gì cũng được à? Mình sẽ phải hỏi kỹ đấy.', 'Anything at all? I will have to dig into that.', 'worry'),
      ] },
      { q: O('Kể về một lỗi nghiêm trọng bạn từng gặp.', 'Describe a serious bug you ran into.'), answers: [
        A('Em chưa gặp lỗi nào đáng kể ạ.', 'I have not really had any.', [0, 0, 0], '', 'Làm hệ thống thật thì ai cũng gặp lỗi.', 'Anyone who ships a real system meets bugs.', 'think'),
        A('Ô ghi chú bị ghép thẳng vào câu SQL nên đặt được ly 0₫. Em chuyển sang truy vấn tham số rồi chạy lại 4 ca kiểm thử.', 'The notes box was pasted into SQL, so a drink could cost 0₫. I switched to a parameterised query and reran 4 test cases.', [1, 1, 1], 'STAR', 'Tốt: có nguyên nhân, cách sửa và cách bạn kiểm chứng.', 'Good: cause, fix and how you verified it.', 'happy'),
        A('Lỗi đó do người viết trước cẩu thả thôi ạ.', 'That was just the previous developer being careless.', [0, 0, 0], 'S', 'Mình muốn nghe bạn làm gì, hơn là lỗi của ai.', 'I care more about what you did than whose fault it was.', 'worry'),
      ] },
      { q: O('Chuông báo động của bạn bắt được mọi cuộc tấn công chứ?', 'So your alarm catches every attack?'), answers: [
        A('Chắc chắn 100% ạ.', 'Absolutely, 100%.', [0, 0, 0], '', 'Không hệ thống phát hiện nào dám nói vậy.', 'No detection system can promise that.', 'worry'),
        A('Trên nhật ký tuần đó thì bắt đủ 10/10, báo nhầm tối đa 1 lần. Kiểu tấn công mới thì em chưa kiểm chứng.', 'On that week’s log it caught 10 of 10 with at most 1 false alarm. I have not tested it against new kinds of attack.', [1, 1, 2], 'R', 'Đúng kiểu mình cần: nói được giới hạn của chính mình.', 'Exactly what I need: you know where your evidence ends.', 'wow'),
        A('Em không nhớ rõ lắm ạ.', 'I do not really remember.', [0, 0, 1], '', 'Thật thà đấy, nhưng việc mình làm thì nên nhớ số.', 'Honest, but you should know your own numbers.', 'think'),
      ] },
      { q: O('Đi thực tập, bạn muốn học điều gì?', 'What do you want to learn here?'), answers: [
        A('Gì cũng được ạ.', 'Anything is fine.', [0, 0, 1], '', 'Mình khó giao việc khi bạn chưa biết muốn gì.', 'It is hard to give you work if you do not know what you want.', 'think'),
        A('Em muốn học triển khai và giám sát hệ thống thật, vì ở quán em mới làm bản nhỏ, chưa gặp tải lớn.', 'Deploying and monitoring real systems: the shop was small and never saw heavy load.', [1, 1, 1], 'T', 'Bạn biết mình đang thiếu gì. Đội mình có đúng việc đó.', 'You know your gap. We have exactly that kind of work.', 'happy'),
        A('Em muốn lương cao và được về sớm ạ.', 'A good salary and early evenings.', [0, 0, 1], '', 'Thẳng thắn quá… nhưng mình đang hỏi chuyện học.', 'Very frank… but I asked about learning.', 'worry'),
      ] },
    ];
  };

  function play(ui) {
    const run = ui.run;
    const Q = questions();
    run.picks = run.picks || [];
    const score = () => METERS.map((_, k) => run.picks.reduce((a, p, i) => a + (p == null ? 0 : Q[i].answers[p].m[k]), 0));
    const MAX = [4, 4, 5];
    const total = () => score().reduce((a, b) => a + b, 0);
    const i = run.picks.length;
    const done = i >= Q.length;
    const scn = h('div', { class: 'scene-mini wide' });
    const meters = h('div', { class: 'meters' }), stars = h('div', { class: 'star' }), said = h('div', { class: 'said' });
    ui.stage.replaceChildren(h('div', { class: 'stage-top' }, h('b', {}, T(O('Phỏng vấn thực tập', 'The internship interview'))), h('span', { class: 'count' }, `${Math.min(i + 1, Q.length)}/${Q.length}`)), scn, meters, stars, said);
    ui.ctl.replaceChildren();
    const goals = () => ui.goals([
      { ok: run.picks.length === Q.length, label: O('Trả lời đủ 4 câu', 'Answer all 4 questions') },
      { ok: run.picks.some((p, k) => p != null && Q[k].answers[p].star === 'STAR'), label: O('Có câu trả lời đủ **S-T-A-R**', 'Give one complete **STAR** answer') },
      { ok: run.picks.length === Q.length && total() >= PASS, label: O(`Đạt từ **${PASS} điểm** để được nhận`, `Score **${PASS}+** to get the offer`) },
    ]);
    function board(lit) {
      scn.innerHTML = scene({ office: true, offer: run.picks.length === Q.length && total() >= PASS });
      const s = score();
      meters.replaceChildren(...METERS.map(([, name], k) => h('div', { class: 'meter' }, h('span', {}, T(name)), h('div', { class: 'mbar' }, h('i', { style: `width:${(s[k] / MAX[k]) * 100}%` })), h('b', {}, String(s[k])))));
      stars.replaceChildren(...STAR.map(([c, name]) => h('span', { class: lit && lit.includes(c) ? 'on' : '' }, h('b', {}, c), T(name))));
      if (lit) [...stars.children].forEach((el, k) => { if (el.classList.contains('on')) enter(el, k * 160, 'scale(.6)'); });
    }
    if (done) {
      const ok = total() >= PASS;
      board(run.picks.map((p, k) => Q[k].answers[p].star).join('').split('')); /* every STAR part the whole interview covered */
      ui.say('hr', ok ? O('Cảm ơn bạn. Bạn kể bằng việc thật và số thật. **Hẹn gặp bạn đầu tháng sáu.**', 'Thank you. You spoke with real work and real numbers. **See you in early June.**') : O('Cảm ơn bạn. Lần sau hãy kể **một việc cụ thể**: bạn làm gì, kết quả ra sao, và điều gì bạn chưa biết.', 'Thank you. Next time tell me **one concrete story**: what you did, what came out, and what you do not know yet.'), ok ? 'happy' : 'think');
      goals();
      ui.actions(ok ? btn(T(O('Câu cuối cùng', 'One last question')) + ' →', () => ui.go('choice'), 'primary') : null, btn(T(O('Phỏng vấn lại', 'Interview again')) + ' ↻', () => { run.picks = []; play(ui); }, ok ? 'ghost' : 'primary'));
      return;
    }
    const q = Q[i];
    board(null); goals(); ui.actions();
    ui.say('hr', q.q, 'happy');
    const list = h('div', { class: 'options' });
    /* a fixed shuffle so the strong answer is not always in the same place */
    const order = [[0, 1, 2], [2, 0, 1], [1, 2, 0], [0, 2, 1]][i];
    order.forEach((k, n) => {
      const a = q.answers[k];
      const b = h('button', { type: 'button', class: 'option', onclick: () => {
        if (run.picks.length > i) return;
        run.picks.push(k);
        [...list.children].forEach((x) => { x.disabled = x !== b; });
        b.classList.add(a.star === 'STAR' || a.m[2] === 2 || a.m.every((v) => v >= 1) ? 'good' : 'meh');
        board(a.star.split(''));
        said.replaceChildren(enter(bubble('ban', a.text, 'happy')));
        ui.say('hr', a.reply, a.mood); goals();
        ui.actions(btn(T(i === Q.length - 1 ? O('Nghe kết quả', 'Hear the result') : O('Câu tiếp theo', 'Next question')) + ' →', () => play(ui), 'primary'));
      } }, h('span', { class: 'letter', 'aria-hidden': 'true' }, 'ABC'[n]), h('span', { html: rich(T(a.text)) }));
      list.append(b);
    });
    ui.ctl.replaceChildren(list);
  }

  QM.order.push('ep10');
  QM.eps.ep10 = {
    id: 'ep10', subject: 'internship', mech: 'talk',
    title: O('Kể lại chuyện quán khi đi phỏng vấn', 'Tell the shop’s story at your interview'),
    subjectName: O('Thực tập', 'Internship'),
    scene: () => ({ office: true }), after: () => ({ office: true, offer: true }),
    intro: [
      { who: 'linh', mood: 'wow', text: O('Mai bạn phỏng vấn thực tập hả? Kể chuyện cái quán này đi!', 'Your internship interview is tomorrow? Tell them about the shop!') },
      { who: 'ban', mood: 'think', text: O('Mình làm nhiều việc thật đấy. Khó là kể sao cho người ta **tin** và **hiểu**.', 'I did real work here. The hard part is telling it so they **believe** and **understand** it.') },
      { who: 'hr', mood: 'happy', text: O('Chào bạn, mời ngồi. Mình bắt đầu nhé.', 'Hello, take a seat. Shall we start?') },
    ],
    play,
    choice(ui) {
      const box = h('div', { class: 'scene-wrap' });
      ui.stage.replaceChildren(box);
      const show = (offer) => () => { box.innerHTML = scene({ office: true, offer }); };
      return {
        q: O('Trước khi về: **bạn có muốn hỏi gì về công ty không?** (Linh nhắc nhỏ trong tin nhắn: hỏi cho hay vào.)', 'Before you go: **any questions for us?** (Linh texts: “ask a good one!”)'),
        reset: () => show(true)(),
        options: [
          { label: O('“Dạ không ạ.”', '“No, thank you.”'), good: false, run: show(true), reply: O('Không sao, nhưng đây là lúc bạn được tìm hiểu chúng tôi.', 'That is fine, though this was your chance to learn about us.'), who: 'hr' },
          { label: O('“Thực tập sinh ở đội thường làm gì trong tháng đầu, và ai hướng dẫn ạ?”', '“What do interns usually work on in the first month, and who mentors them?”'), good: true, who: 'hr', run: show(true), reply: O('Câu hỏi hay. Bạn sẽ ghép cặp với một người trong đội giám sát hệ thống.', 'Great question. You will be paired with someone on the monitoring team.'), mood: 'wow' },
          { label: O('“Ngày nào cũng được về sớm không ạ?”', '“Can I leave early every day?”'), good: false, run: show(true), reply: O('Ừm… mình ghi lại câu này.', 'Hmm… I will note that one down.'), who: 'hr' },
        ],
      };
    },
    debrief: {
      term: O('Kể chuyện kỹ thuật theo STAR', 'Telling a technical story with STAR'),
      thanks: O('Đậu rồi! Từ cái kho đồ tới quán có chuông báo trộm, bạn đi cùng mình cả chặng.', 'You got it! From a pile of boxes to a shop with an alarm, you were there all the way.'),
      points: [
        O('**Tình huống → Việc cần làm → Hành động → Kết quả**: kể một chuyện cụ thể.', '**Situation → Task → Action → Result**: tell one concrete story.'),
        O('**Con số đã đo** thuyết phục hơn tính từ.', '**A measured number** persuades more than an adjective.'),
        O('Nói được **giới hạn** của việc mình làm là dấu hiệu đáng tin.', 'Naming the **limits** of your work is a sign you can be trusted.'),
      ],
      code: O('S: quán nghẽn giờ trưa\nT: giảm thời gian chờ\nA: đổi thứ tự pha, ly ngắn trước\nR: 9,8 → 4,2 phút (đo trên 5 đơn)', 'S: lunch-hour jam\nT: cut the waiting time\nA: reordered the queue, short first\nR: 9.8 → 4.2 minutes (measured on 5 orders)'),
    },
  };
})();

/* The whole curriculum as one continuing story: every subject gets an episode idea and a mechanic. */
const E = (id, mech, vi, en, hookVi, hookEn, play) => ({ id, mech, name: O(vi, en), hook: O(hookVi, hookEn), play });
const SEASONS = [
  { title: O('Mùa 1 · Mở quán', 'Season 1 · Opening the shop'), arc: O('Một mặt bằng, một người pha, một két tiền.', 'One room, one barista, one cash drawer.'), list: [
    E('web', 'arrange', 'Phát triển ứng dụng Web', 'Web Application Development', 'Xếp quán cho đúng bản vẽ bằng CSS.', 'Lay out the shop to match the sketch, in CSS.', 'ep1'),
    E('os', 'schedule', 'Hệ điều hành', 'Operating Systems', 'Năm đơn dồn một lúc: pha ly nào trước?', 'Five orders at once: which cup first?', 'ep2'),
    E('db', 'detective', 'Cơ sở dữ liệu cơ bản', 'Basic Databases', 'Két hụt tiền: hỏi bảng đơn hàng cho ra lẽ.', 'Cash is missing: question the orders table.', 'ep3'),
    E('prob', 'predict', 'Xác suất và Thống kê', 'Probability and Statistics', 'Khách tăng gần gấp đôi thì chờ lâu gấp mấy?', 'Guests almost double: how much longer is the wait?', 'ep4'),
    E('oop', 'wire', 'Lập trình hướng đối tượng', 'Object-Oriented Programming', 'Ví thành viên bị âm tiền: gói số dư vào trong lớp.', 'A member wallet goes negative: lock the balance inside a class.'),
    E('python', 'machine', 'Lập trình nâng cao với Python', 'Advanced Programming with Python', 'Viết script gom doanh thu thay vì cộng tay mỗi tối.', 'Script the nightly totals instead of adding by hand.'),
    E('ipl', 'judge', 'Luật sở hữu trí tuệ', 'Law on IP Rights', 'Ảnh và thư viện trên mạng: quán được dùng cái nào?', 'Photos and libraries online: which may the shop use?'),
  ] },
  { title: O('Mùa 2 · Quán lên mạng', 'Season 2 · The shop goes online'), arc: O('Nhận đơn qua mạng, và người lạ bắt đầu gõ cửa.', 'Orders arrive over the network, and strangers start knocking.'), list: [
    E('se', 'judge', 'Công nghệ phần mềm', 'Software Engineering', 'Chủ quán đổi ý liên tục: yêu cầu nào làm trước?', 'The owner keeps changing her mind: which requirement first?', 'ep5'),
    E('networks', 'wire', 'Mạng máy tính', 'Computer Networks', 'Máy tính tiền mất mạng: nối lại router và đặt địa chỉ IP.', 'The till is offline: rewire the router and assign IP addresses.', 'ep6'),
    E('algo', 'machine', 'Giải thuật và Cấu trúc dữ liệu', 'Algorithms and Data Structures', 'Tìm một đơn trong 100.000 đơn trước khi khách bỏ đi.', 'Find one order among 100,000 before the guest leaves.', 'ep7'),
    E('websec', 'defend', 'An toàn ứng dụng Web', 'Web Security', 'Ai đó gõ lệnh SQL vào ô ghi chú để uống miễn phí.', 'Someone types SQL into the notes box for free drinks.', 'ep8'),
    E('ids', 'tune', 'Phát hiện và Ngăn chặn xâm nhập', 'Intrusion Detection and Prevention', 'Đặt ngưỡng báo động: bắt được kẻ lạ mà không réo cả đêm.', 'Set the alarm threshold: catch intruders without ringing all night.', 'ep9'),
    E('netprog', 'machine', 'Lập trình mạng', 'Network Programming', 'Đóng vai socket: đưa đơn từ điện thoại xuống bếp.', 'Play the socket: carry an order from phone to kitchen.'),
    E('netsim', 'tune', 'Mô phỏng mạng', 'Network Simulation', 'Giả lập 200 khách vào wifi trước khi mở thật.', 'Simulate 200 guests on wifi before going live.'),
    E('wireless', 'arrange', 'Truyền thông di động không dây', 'Mobile Wireless Communication', 'Đặt cục phát ở đâu để góc cuối quán vẫn có sóng?', 'Where does the access point go so the back corner has signal?'),
    E('mobile', 'arrange', 'Phát triển ứng dụng di động', 'Mobile Application Development', 'App đặt món: xếp màn hình vừa mọi cỡ điện thoại.', 'Ordering app: fit the screen to every phone size.'),
    E('sysadmin', 'detective', 'Quản trị hệ thống máy tính', 'Computer System Administration', 'Máy chủ đầy ổ lúc nửa đêm: lần theo log.', 'Disk full at midnight: follow the logs.'),
    E('infosec', 'judge', 'An toàn thông tin', 'Information Security', 'Quán chỉ đủ tiền khoá ba cửa: rủi ro nào trước?', 'Budget for three locks: which risks come first?'),
    E('crypto', 'defend', 'Nhập môn Mật mã học', 'Introduction to Cryptography', 'Gửi mã két qua tin nhắn mà kẻ nghe lén không đọc được.', 'Send the safe code so an eavesdropper cannot read it.'),
    E('pentest', 'defend', 'Kiểm thử xâm nhập', 'Penetration Testing', 'Được chủ quán cho phép: thử đột nhập hệ thống của chính quán.', 'With the owner’s permission: break into the shop’s own system.'),
    E('nsm', 'detective', 'Giám sát an ninh mạng', 'Network Security Monitoring', 'Lưu lượng lạ lúc 3 giờ sáng đi đâu?', 'Where is the 3 a.m. traffic going?'),
    E('forensics', 'detective', 'Điều tra số', 'Digital Forensics', 'Laptop ở quầy bị xoá file: dựng lại dòng thời gian.', 'Files wiped on the counter laptop: rebuild the timeline.'),
    E('malware', 'detective', 'Phân tích mã độc', 'Malware Analysis', 'File “hoá đơn” lạ làm gì khi mở trong máy cách ly?', 'What does the odd “invoice” do inside a sandbox?'),
    E('ethics', 'judge', 'Luật an ninh mạng và Đạo đức CNTT', 'Cyber Law and ICT Ethics', 'Dùng dữ liệu khách để quảng cáo: ranh giới ở đâu?', 'Advertising with guest data: where is the line?'),
  ] },
  { title: O('Mùa 3 · Quán biết nghĩ', 'Season 3 · The shop starts thinking'), arc: O('Dữ liệu dồn lại, máy bắt đầu đoán, và toán nằm bên dưới.', 'Data piles up, machines start guessing, with maths underneath.'), list: [
    E('ds', 'detective', 'Cơ sở Khoa học dữ liệu', 'Fundamentals of Data Science', 'Vì sao thứ Ba vắng khách? Lần theo dữ liệu.', 'Why are Tuesdays empty? Follow the data.'),
    E('appstat', 'predict', 'Thống kê ứng dụng', 'Applied Statistics', 'Món mới bán chạy thật hay chỉ may? Thiết kế A/B test.', 'Real hit or luck? Design the A/B test.'),
    E('timeseries', 'predict', 'Phân tích chuỗi thời gian', 'Time Series Data Analysis', 'Vẽ dự báo lượng đá cần cho tuần sau.', 'Draw next week’s demand for ice.'),
    E('ml1', 'judge', 'Học máy và Khai phá dữ liệu I', 'Machine Learning and Data Mining I', 'Gắn nhãn khách quen rồi để máy đoán ai quay lại.', 'Label regulars, then let the model guess who returns.'),
    E('ml2', 'tune', 'Học máy và Khai phá dữ liệu II', 'Machine Learning and Data Mining II', 'Mô hình học vẹt đoán bậy: chỉnh cho nó khái quát.', 'The model memorised: make it generalise.'),
    E('optim', 'tune', 'Tối ưu hoá 2', 'Optimization 2', 'Công thức ngon nhất với chi phí thấp nhất.', 'The tastiest recipe at the lowest cost.'),
    E('ai', 'machine', 'Trí tuệ nhân tạo', 'Artificial Intelligence', 'Làm robot giao ly: tìm đường né bàn ghế.', 'Be the delivery robot: find a path around the chairs.'),
    E('nlp', 'judge', 'Xử lý ngôn ngữ tự nhiên', 'Natural Language Processing', 'Đánh giá này khen, chê hay đang mỉa?', 'Is this review praise, complaint or sarcasm?'),
    E('search', 'tune', 'Hệ thống tìm kiếm', 'Search Systems', 'Khách gõ “tra sua” không dấu vẫn phải ra món.', 'A search without accents must still find milk tea.'),
    E('vision', 'tune', 'Thị giác máy tính', 'Computer Vision', 'Camera đếm ly trên quầy: chỉnh ngưỡng nhận diện.', 'A camera counts cups: tune the detector.'),
    E('imaging', 'tune', 'Xử lý ảnh', 'Image Processing', 'Ảnh menu tối và nhoè: chọn bộ lọc để cứu.', 'Dark, blurry menu photo: pick filters to rescue it.'),
    E('graphics', 'arrange', 'Đồ hoạ máy tính', 'Computer Graphics', 'Xoay và đặt logo 3D cho khớp biển hiệu mẫu.', 'Rotate and place the 3D logo to match the sign.'),
    E('signals', 'predict', 'Tín hiệu và Hệ thống', 'Signal and Systems', 'Tiếng máy xay lọt vào micro gọi món trông ra sao?', 'Draw what the grinder does to the ordering mic.'),
    E('dsp', 'tune', 'Xử lý tín hiệu số', 'Digital Signal Processing', 'Vặn bộ lọc để nghe rõ khách, bỏ tiếng máy xay.', 'Tune a filter: keep the voice, lose the grinder.'),
    E('analysis', 'predict', 'Giải tích và Cấu trúc đại số', 'Analysis & Algebraic Structures', 'Vẽ đường lợi nhuận theo giá, rồi tìm đỉnh bằng đạo hàm.', 'Draw profit against price, then find the peak with a derivative.'),
    E('numeric', 'tune', 'Phương pháp số', 'Numerical Methods', 'Tìm giá hoà vốn bằng cách chia đôi khoảng.', 'Find the break-even price by bisection.'),
    E('graph', 'wire', 'Lý thuyết đồ thị', 'Graph Theory', 'Vạch đường giao hàng ngắn nhất quanh trường.', 'Trace the shortest delivery route around campus.'),
    E('theory', 'machine', 'Lý thuyết tính toán', 'Computational Theory', 'Đóng vai máy bán nước: trạng thái nào mới được nhả ly?', 'Be the vending machine: which states may release a cup?'),
    E('arch', 'wire', 'Kiến trúc máy tính', 'Computer Architecture', 'Ghép cổng logic thành bộ cộng tiền.', 'Wire logic gates into a money adder.'),
  ] },
  { title: O('Mùa 4 · Chuỗi quán', 'Season 4 · A chain of shops'), arc: O('Chi nhánh thứ hai, một đội ngũ, và những quyết định khó.', 'A second branch, a team, and harder decisions.'), list: [
    E('distsys', 'tune', 'Hệ thống phân tán', 'Distributed Systems', 'Hai chi nhánh mất liên lạc: có được bán ly cuối cùng?', 'Branches lose contact: may both sell the last cup?'),
    E('advdb', 'tune', 'Cơ sở dữ liệu nâng cao', 'Advanced Databases', 'Mười triệu dòng đơn hàng: đặt chỉ mục nào?', 'Ten million order rows: which index?'),
    E('oosad', 'wire', 'Phân tích và Thiết kế hướng đối tượng', 'Object-Oriented Analysis and Design', 'Vẽ sơ đồ lớp dùng chung cho ba chi nhánh.', 'Draw one class diagram for three branches.'),
    E('testing', 'defend', 'Kiểm thử và Đảm bảo chất lượng', 'Software Testing and QA', 'Viết ca kiểm thử bắt lỗi giảm giá trước khi khách bắt.', 'Write tests that catch the discount bug before guests do.'),
    E('pm', 'schedule', 'Quản lý dự án', 'Project Management', 'Khai trương chi nhánh trong 30 ngày: tìm đường găng.', 'Open a branch in 30 days: find the critical path.'),
    E('manufacturing', 'schedule', 'Sản xuất 1', 'Manufacturing 1', 'In 3D khay đựng ly: xếp thứ tự in cho kịp.', '3D-print cup trays: order the jobs to finish in time.'),
    E('mechatronics', 'wire', 'Nhập môn Cơ điện tử', 'Introduction to Mechatronics', 'Lắp cảm biến cho máy rót tự động.', 'Wire sensors into the auto-pourer.'),
    E('gis', 'arrange', 'Nhập môn GIS', 'Introduction to GIS', 'Chồng các lớp bản đồ để chọn chỗ mở chi nhánh.', 'Stack map layers to choose the branch location.'),
    E('finmath', 'predict', 'Toán tài chính', 'Financial Mathematics', 'Vẽ xem khoản vay mở chi nhánh phình ra thế nào.', 'Draw how the branch loan grows.'),
    E('writing', 'arrange', 'Viết khoa học', 'Scientific Writing', 'Sắp báo cáo “vì sao két hụt” cho người đọc hiểu ngay.', 'Arrange the “why the till was short” report so it reads at once.'),
    E('french', 'talk', 'Tiếng Pháp', 'French', 'Một khách người Pháp gọi món: bạn đáp sao?', 'A French guest orders: how do you answer?'),
    E('groupproj', 'talk', 'Dự án nhóm', 'Group Project', 'Cả nhóm cãi nhau sát hạn nộp: bạn nói gì?', 'The team argues before the deadline: what do you say?'),
    E('internship', 'talk', 'Thực tập', 'Internship', 'Phỏng vấn thực tập: kể chuyện quán thế nào cho thuyết phục?', 'Internship interview: tell the shop story convincingly.', 'ep10'),
  ] },
];

function renderMap() {
  runCleanups();
  const all = SEASONS.flatMap((s) => s.list);
  let filter = QM.mapFilter || '';
  const body = h('div', { class: 'seasons' });
  const chips = h('div', { class: 'mechs', role: 'group', 'aria-label': T(O('Lọc theo kiểu chơi', 'Filter by mechanic')) });
  function draw() {
    chips.replaceChildren(...[['', O('Tất cả', 'All'), all.length], ...Object.entries(MECH).map(([k, m]) => [k, m.name, all.filter((x) => x.mech === k).length])].map(([k, name, count]) =>
      h('button', { type: 'button', class: 'chip', 'aria-pressed': String(filter === k), onclick: () => { filter = QM.mapFilter = k; draw(); }, html: (k ? mechIcon(k) : '') + esc(T(name)) + ` <small>${count}</small>` })));
    body.replaceChildren(...SEASONS.map((s) => {
      const list = s.list.filter((x) => !filter || x.mech === filter);
      if (!list.length) return null;
      return h('section', { class: 'season' }, h('div', { class: 'season-h' }, h('h2', {}, T(s.title)), h('p', {}, T(s.arc))),
        h('div', { class: 'tiles' }, list.map((x) => {
          const course = COURSES[x.id], href = x.play ? '#' + x.play : course ? course[0] : null;
          const state = x.play ? O('chơi được ngay', 'playable now') : course ? O('ý tưởng · đã có khoá học →', 'idea · course available →') : O('ý tưởng', 'idea');
          return h(href ? 'a' : 'div', { class: 'tile' + (x.play ? ' play' : ''), href },
            h('span', { class: 'tile-ic', html: mechIcon(x.mech) }),
            h('span', { class: 'tile-b' }, h('b', {}, T(x.name)), h('span', {}, T(x.hook)), h('small', {}, T(MECH[x.mech].name) + ' · ' + T(state))));
        })));
    }).filter(Boolean));
  }
  $('#view').replaceChildren(
    h('div', { class: 'page-h' }, h('h1', {}, T(O('56 môn, một câu chuyện', '56 subjects, one story'))), h('p', {}, T(O('Mỗi môn được gán một tình huống nối tiếp trong quán và một kiểu chơi hợp với cách nghĩ của môn đó. Mười tập đã chơi được, còn lại là đề xuất để cả nhóm góp ý.', 'Each subject gets a situation that continues the shop’s story and a mechanic that fits how that subject thinks. Ten episodes are playable; the rest are proposals for the team to review.')))),
    chips, body);
  draw();
}

/* Top bar, home page and hash routing. */
const ICON = {
  money: '<path d="M3 7h18v11H3z"/><circle cx="12" cy="12.500" r="2.800"/><path d="M6 10v5M18 10v5"/>',
  rating: '<path d="M12 3.500l2.600 5.400 5.900.800-4.300 4.100 1 5.900-5.200-2.800-5.200 2.800 1-5.900-4.300-4.100 5.900-.800z"/>',
  guests: '<circle cx="9" cy="8" r="3.500"/><path d="M3 20c0-4 2.700-6 6-6s6 2 6 6"/><circle cx="17" cy="9" r="2.500"/><path d="M17 14c2.500 0 4 1.700 4 5"/>',
};
const hudShown = {};
const hudTimer = {};
function hudText(k, v) { return k === 'money' ? money(Math.round(v)) : k === 'rating' ? num(v) : String(Math.round(v)); }
function updateHud(animate) {
  const v = hudNow();
  Object.keys(ICON).forEach((k) => {
    const el = $('#hud-' + k); if (!el) return;
    const from = hudShown[k] ?? v[k], to = v[k];
    hudShown[k] = to;
    clearInterval(hudTimer[k]);
    el.textContent = hudText(k, to);
    if (!animate || calm || from === to) return;
    const chip = el.closest('.hud-i');
    chip.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 600 });
    chip.dataset.dir = to > from ? 'up' : 'down';
    let t = 0;
    hudTimer[k] = setInterval(() => { t += 1 / 24; const x = from + (to - from) * Math.min(1, t); el.textContent = hudText(k, x); if (t >= 1) { clearInterval(hudTimer[k]); delete chip.dataset.dir; } }, 36);
  });
}

function renderChrome(key) {
  document.documentElement.lang = S.lang;
  $('#bar').replaceChildren(
    h('a', { class: 'exit', href: '/' }, T(UI.exit)),
    h('a', { class: 'brand', href: '#home', html: '<svg viewBox="0 0 40 32" aria-hidden="true"><path d="M9 16a7 7 0 0 1 3-13 9 9 0 0 1 16 0 7 7 0 0 1 3 13Z" class="c1"/><path d="M12 18h16l-2 10a4 4 0 0 1-4 3h-4a4 4 0 0 1-4-3Z" class="c2"/></svg><span>' + esc(T(UI.brand)) + '</span>' }),
    h('nav', { class: 'eps', 'aria-label': T(UI.episodes) }, QM.seasons.map((s, k) => [k ? h('span', { class: 'gap', 'aria-hidden': 'true' }) : null, s.ids.map((id) => h('a', { href: '#' + id, class: (S.done[id] ? 'done ' : '') + (key === id ? 'on' : ''), title: T(QM.eps[id].title), 'aria-current': key === id ? 'page' : null }, S.done[id] ? '✓' : String(QM.order.indexOf(id) + 1)))])),
    h('div', { class: 'hud' }, Object.keys(ICON).map((k) => h('span', { class: 'hud-i', title: T(UI[k]) }, h('span', { html: `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>` }), h('span', { class: 'sr' }, T(UI[k]) + ': '), h('b', { id: 'hud-' + k })))),
    h('div', { class: 'bar-r' }, h('a', { class: 'maplink' + (key === 'map' ? ' on' : ''), href: '#map' }, T(UI.map)),
      h('button', { type: 'button', class: 'lang', 'aria-label': S.lang === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt', onclick: () => { S.lang = S.lang === 'vi' ? 'en' : 'vi'; save(); route(); } }, h('b', { class: S.lang === 'vi' ? 'on' : '' }, 'VI'), h('b', { class: S.lang === 'en' ? 'on' : '' }, 'EN'))));
  updateHud(false);
}

const RULES = [
  [O('Thao tác chính là kiến thức', 'The action is the knowledge'), O('Đổi CSS thì đồ đạc dịch chuyển, xếp đơn là lập lịch. Trong thí nghiệm với trò chơi toán, cách lồng này giúp trẻ học tốt hơn.', 'Changing CSS moves the furniture; queueing orders is scheduling. In a maths-game study, this kind of integration helped children learn more.'), 'Habgood & Ainsworth 2011', 'https://shura.shu.ac.uk/3556'],
  [O('Đoán trước, lật sau', 'Predict, then reveal'), O('Người tự vẽ dự đoán rồi so với số liệu nhớ và hiểu tốt hơn nhóm chỉ xem.', 'People who drew their prediction first recalled and understood the data better.'), 'Kim, Reinecke & Hullman 2017', 'https://idl.uw.edu/papers/explaining-the-gap'],
  [O('Chuyện ngắn, không trang trí thừa', 'Short story, no decoration'), O('Chi tiết hấp dẫn nhưng lạc đề làm giảm kết quả học. Trong lúc bạn giải bài, hình chỉ chuyển động để cho thấy điều vừa thay đổi.', 'Interesting but irrelevant details lower learning. While you work on a task, things move only to show what changed.'), 'Meta-analysis, 58 studies', 'https://www.sciencedaily.com/releases/2020/03/200319103223.htm'],
  [O('Cốt truyện cần được kiểm chứng', 'The story still has to be tested'), O('Bằng chứng còn trái chiều: nhiều nghiên cứu thấy cốt truyện tăng hứng thú hơn là tăng điểm, một nghiên cứu dạy lập trình lại thấy bớt lỗi.', 'Evidence is mixed: many studies find stories raise engagement more than scores, one programming study found fewer errors.'), 'Jemmali et al. 2018', 'https://par.nsf.gov/biblio/10104445-educational-game-design-empirical-study-effects-narrative'],
];

function renderHome() {
  runCleanups();
  const done = QM.order.filter((id) => S.done[id]).length;
  const nextId = QM.order.find((id) => !S.done[id]);
  const last = [...QM.order].reverse().find((id) => S.done[id]);
  const state = last ? QM.eps[last].after() : { tidy: false };
  $('#view').replaceChildren(
    h('div', { class: 'hero' },
      h('div', { class: 'hero-t' }, h('span', { class: 'eyebrow' }, T(O('10 tập · 10 kiểu chơi · 1 câu chuyện', '10 episodes · 10 mechanics · 1 story'))),
        h('h1', {}, T(O('Bạn là “đứa học ICT” mà cả quán trông cậy', 'You are the ICT friend the whole shop relies on'))),
        h('p', {}, T(O('Linh mở một quán nước nhỏ gần USTH. Mỗi lần quán gặp chuyện là một môn học: bạn tự tay giải quyết, và hậu quả đi theo bạn sang tập sau.', 'Linh opens a small drink shop near USTH. Every problem the shop hits is a subject: you solve it with your own hands, and the consequences follow you into the next episode.'))),
        h('div', { class: 'row' },
          btn((done ? (nextId ? T(O('Chơi tiếp', 'Continue')) : T(UI.toMap)) : T(O('Bắt đầu tập 1', 'Start episode 1'))) + ' →', () => { location.hash = nextId || 'map'; }, 'primary big'),
          done ? btn(T(O('Chơi lại từ đầu', 'Start over')), () => { S.done = {}; S.fx = {}; QM.runs = {}; Object.keys(hudShown).forEach((k) => delete hudShown[k]); save(); persist(); route(); }, 'ghost') : null)),
      h('div', { class: 'hero-s', html: scene(state) })),
    ...QM.seasons.map((season) => h('section', { class: 'season-row' }, h('h2', {}, T(season.title)),
      h('ol', { class: 'cards' }, season.ids.map((id) => { const e = QM.eps[id], i = QM.order.indexOf(id); return enter(h('li', {}, h('a', { href: '#' + id, class: S.done[id] ? 'done' : '' },
        h('span', { class: 'card-n' }, S.done[id] ? '✓' : String(i + 1)), h('b', {}, T(e.title)), h('span', { class: 'sub' }, T(e.subjectName)),
        h('span', { class: 'mechline', html: mechIcon(e.mech) + esc(T(MECH[e.mech].name)) }))), i * 40); })))),
    h('section', { class: 'why' }, h('h2', {}, T(O('Vì sao thiết kế như vậy', 'Why it is designed this way'))),
      h('div', { class: 'rules' }, RULES.map((r) => h('article', {}, h('h3', {}, T(r[0])), h('p', {}, T(r[1])), h('a', { href: r[3], target: '_blank', rel: 'noopener' }, r[2] + ' ↗'))))),
    h('p', { class: 'feedback-line' }, h('a', { href: FEEDBACK, target: '_blank', rel: 'noopener' }, T(O('Góp ý cho bản thử nghiệm này ↗', 'Send feedback on this trial ↗')))));
}

function route() {
  const key = location.hash.slice(1);
  if (QM.eps[key]) { renderChrome(key); renderEpisode(QM.eps[key]); }
  else if (key === 'map') { renderChrome(key); renderMap(); }
  else { renderChrome('home'); renderHome(); }
}
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
window.addEventListener('pagehide', persist);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); });
restoreRuns();
route();
window.QuanMay = QM;

})();
