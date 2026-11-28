/* Quán Mây: the case engine. A case is a chain of stages that mixes several subjects.
   Nothing here is multiple choice: every stage asks the learner to build, order, search or decide. */
(() => {
'use strict';
const QM = window.QuanMay;
const { S, save, persist, $, h, btn, O, T, rich, enter, money, bubble, scene, updateHud } = QM.lib;
const HINT_COST = 1; /* a hint counts like a wrong turn */

QM.addCase = (c) => { QM.cases[c.id] = c; QM.caseOrder.push(c.id); };

const blank = () => ({ stage: -1, passed: [], data: [], miss: 0, hints: [], seed: 1 + Math.floor(Math.random() * 1e6) });
function runOfCase(c) {
  const r = QM.runs[c.id];
  const ok = r && Number.isInteger(r.stage) && r.stage >= -1 && r.stage <= c.stages.length && Array.isArray(r.passed) && Array.isArray(r.data) && Array.isArray(r.hints);
  return ok ? r : (QM.runs[c.id] = blank());
}

function view(c) {
  const run = runOfCase(c), missing = c.needs.filter((id) => !S.done[id]);
  const head = h('div', { class: 'ep-head' },
    h('div', {}, h('span', { class: 'eyebrow' }, `${T(O('Vụ việc', 'Case'))} ${c.letter} · ${T(c.tag)}`), h('h1', {}, T(c.title))),
    h('div', { class: 'ep-meta' }, h('a', { class: 'chip', href: '#home' }, T(O('Về sơ đồ quán', 'Back to the map')))));
  if (missing.length) {
    $('#view').replaceChildren(head, h('section', { class: 'stage locked-case' },
      h('h2', {}, T(O('Chưa đủ tay nghề cho vụ này', 'Not ready for this one yet'))),
      h('p', {}, T(O('Vụ việc ghép nhiều môn lại. Xong các tập sau rồi quay lại:', 'A case combines several subjects. Finish these episodes first:'))),
      h('ul', {}, missing.map((id) => h('li', {}, h('a', { href: '#' + id }, `${T(QM.lib.UI.ep)} ${QM.order.indexOf(id) + 1}: ${T(QM.eps[id].title)}`))))));
    return;
  }
  const i = run.stage, stageDef = c.stages[i];
  const track = h('ol', { class: 'case-track' }, c.stages.map((s, k) => h('li', { class: run.passed[k] ? 'ok' : k === i ? 'on' : '', 'aria-current': k === i ? 'step' : null }, h('i', {}, run.passed[k] ? '✓' : String(k + 1)), h('span', {}, T(s.short)))));
  const context = h('p', { class: 'context' }, h('b', {}, T(i < 0 ? O('Hồ sơ', 'The file') : i >= c.stages.length ? O('Kết vụ', 'Closed') : O('Việc bây giờ', 'Right now'))),
    h('span', { html: rich(T(i < 0 ? c.hook : i >= c.stages.length ? c.closing : stageDef.goal)) }));
  const stage = h('section', { class: 'stage' }), talk = h('div', { class: 'talk', 'aria-live': 'polite' }), ctl = h('div', { class: 'ctl' }), acts = h('div', { class: 'acts' }), hintBox = h('div', { class: 'hint-box' });
  $('#view').replaceChildren(head, track, context, h('div', { class: 'ep-grid case ' + c.id }, h('div', { class: 'main-col' }, stage), h('aside', { class: 'side' }, talk, ctl, acts, hintBox)));
  const api = {
    stage, ctl, run,
    say(who, text, mood) { talk.replaceChildren(enter(bubble(who, text, mood))); },
    actions(...b) { acts.replaceChildren(...b.filter(Boolean)); },
    save: persist,
    go(k) { run.stage = k; persist(); view(c); window.scrollTo(0, 0); },
  };
  if (i < 0) return brief(c, api);
  if (i >= c.stages.length) return outro(c, api);

  if (!run.data[i] || typeof run.data[i] !== 'object') run.data[i] = {};
  api.data = run.data[i];
  api.seed = run.seed + i * 97;
  const nextButton = () => btn(T(i + 1 < c.stages.length ? O('Chặng tiếp theo', 'Next stage') : O('Khép hồ sơ', 'Close the file')) + ' →', () => api.go(i + 1), 'primary');
  api.miss = (text) => { run.miss++; QM.world.slip(c.id); persist(); api.say('linh', text, 'worry'); };
  api.pass = (text) => { run.passed[i] = true; persist(); api.say('linh', text, 'wow'); api.actions(nextButton()); stage.classList.add('passed'); };
  api.passed = Boolean(run.passed[i]);
  const hints = stageDef.hints || [];
  const drawHints = () => {
    const used = Number(run.hints[i]) || 0;
    hintBox.replaceChildren(
      hints.length && used < hints.length && !run.passed[i] ? h('button', { type: 'button', class: 'linkbtn', onclick: () => { run.hints[i] = used + 1; QM.world.slip(c.id); persist(); drawHints(); } }, `${T(O('Xin một gợi ý (tốn tiền quán)', 'Ask for a hint (it costs the shop)'))} · ${used}/${hints.length}`) : '',
      h('ol', { class: 'hints' }, hints.slice(0, used).map((t) => h('li', { html: rich(T(t)) }))));
  };
  try { stageDef.mount(api); } catch (e) {
    /* a saved draft this version cannot draw: clear this stage only */
    if (!Object.keys(run.data[i]).length) throw e;
    run.data[i] = {}; persist(); return view(c);
  }
  drawHints();
  if (run.passed[i]) { api.actions(nextButton()); stage.classList.add('passed'); }
  persist();
  return null;
}

function brief(c, api) {
  const notes = c.consequences.filter((x) => S.flags[x.flag]);
  api.stage.append(h('div', { class: 'scene-wrap', html: scene(c.scene) }),
    h('ol', { class: 'case-plan' }, c.stages.map((s) => h('li', {}, h('b', {}, T(s.short)), h('span', {}, T(s.skill))))));
  api.say('linh', c.brief, 'worry');
  api.ctl.replaceChildren(
    notes.length ? h('div', { class: 'consequences' }, h('b', {}, T(O('Vì những gì bạn đã chọn trước đây', 'Because of what you chose earlier'))), h('ul', {}, notes.map((x) => h('li', {}, T(x.text))))) : '',
    h('p', { class: 'lane-h' }, T(O('Mỗi lần sai hoặc xin gợi ý đều trừ tiền quán. Khoảng 15 phút.', 'Every mistake or hint costs the shop. About 15 minutes.'))));
  api.actions(btn(T(O('Nhận vụ này', 'Take the case')) + ' →', () => api.go(0), 'primary'));
}

function outro(c, api) {
  const run = api.run;
  const cost = run.miss + run.hints.reduce((a, n) => a + (Number(n) || 0) * HINT_COST, 0);
  const stars = cost <= 1 ? 3 : cost <= 5 ? 2 : 1;
  /* the file only closes when every stage was passed */
  const open = c.stages.findIndex((stage, k) => !run.passed[k]);
  if (open >= 0) { api.go(open); return; }
  const best = Math.max(stars, (S.cases[c.id] && S.cases[c.id].stars) || 0);
  S.cases[c.id] = { done: true, stars: best, reward: { money: 500000 * best, rating: Math.round(best) / 10, guests: 15 * best } };
  save(); updateHud(true);
  api.stage.append(h('div', { class: 'debrief' },
    h('span', { class: 'eyebrow' }, T(O('Hồ sơ đã khép', 'File closed'))),
    h('h2', {}, `${QM.world.starText(stars)} ${T(c.title)}`),
    h('p', {}, T(O(`Sai ${run.miss} lần, xin ${run.hints.reduce((a, n) => a + (Number(n) || 0), 0)} gợi ý.`, `${run.miss} mistakes, ${run.hints.reduce((a, n) => a + (Number(n) || 0), 0)} hints.`))),
    h('ul', {}, c.learned.map((p) => h('li', { html: rich(T(p)) }))),
    h('div', { class: 'deltas' }, h('span', { class: 'up' }, h('small', {}, T(QM.lib.UI.money)), h('b', {}, '+' + money(500000 * best))), h('span', { class: 'up' }, h('small', {}, T(QM.lib.UI.guests)), h('b', {}, '+' + 15 * best)))));
  api.say('linh', c.closing, 'wow');
  api.ctl.replaceChildren(h('div', { class: 'scene-mini', html: scene(c.after) }));
  api.actions(btn(T(O('Về sơ đồ quán', 'Back to the shop map')) + ' →', () => { location.hash = 'home'; }, 'primary'),
    btn(T(O('Phá lại vụ này', 'Run the case again')), () => { delete QM.runs[c.id]; persist(); view(c); }, 'ghost'));
}

/* ---------- shared pieces for stages ---------- */
/* A seeded generator, so a stage draws the same data after a reload. */
const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const head = (title, right) => h('div', { class: 'stage-top' }, h('b', {}, T(title)), right ? h('span', { class: 'count' }, right) : null);
const select = (label, options, value, onchange) => { const s = h('select', { 'aria-label': label, onchange: (e) => onchange(e.target.value) }, options.map(([v, t]) => h('option', { value: v }, t))); s.value = value; return s; };
/* A list whose order the learner changes with up and down buttons. */
function sortable(ids, render, onchange) {
  const list = h('ol', { class: 'sortable' });
  const draw = (focus) => {
    list.replaceChildren(...ids.map((id, k) => h('li', { 'data-id': id }, h('span', { class: 'pos' }, String(k + 1)), h('span', { class: 'item' }, render(id)),
      h('span', { class: 'moves' }, [[-1, '↑', O('Lên', 'Up')], [1, '↓', O('Xuống', 'Down')]].map(([d, icon, name]) => h('button', { type: 'button', class: 'move', 'data-d': String(d), 'aria-label': T(name), disabled: k + d < 0 || k + d >= ids.length, onclick: () => { [ids[k], ids[k + d]] = [ids[k + d], ids[k]]; draw([id, d]); onchange(); } }, icon))))));
    if (focus) { const b = list.querySelector(`li[data-id="${focus[0]}"] .move[data-d="${focus[1]}"]:not([disabled])`); if (b) b.focus(); }
  };
  draw();
  return list;
}

QM.caseKit = { rng, head, select, sortable };
QM.world.caseView = view;
})();
