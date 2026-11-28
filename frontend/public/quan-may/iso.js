/* Quán Mây: a small isometric drawing kit and the shop drawn with it.
   Everything is inline SVG, so it stays sharp at any size and on any screen.
   Coordinates are floor units: x runs down-right, y down-left, z up. */
(() => {
'use strict';
const C = Math.cos(Math.PI / 6);
/* top, left and right faces of one material */
const PAL = {
  wood: ['#efcf9f', '#d9a96f', '#bd8751'], cream: ['#fffaf0', '#f2e5cd', '#dfccaa'], floor: ['#f3e6cd', '#dcc49c', '#c5a97c'],
  wall: ['#fbf3e2', '#ecdcbd', '#dbc7a1'], teal: ['#a6ddcd', '#57b39c', '#33907b'], coral: ['#ffcaa8', '#f4915c', '#d86c33'],
  blue: ['#d6e7f9', '#abcaee', '#86abd9'], violet: ['#eadff9', '#ccb9ed', '#ab95d7'], yellow: ['#ffecb5', '#f8d06e', '#dcab42'],
  green: ['#dcefc3', '#b1d788', '#88b55f'], steel: ['#eef2f3', '#c0cbd0', '#95a4ab'], dark: ['#776e66', '#524a43', '#37302b'],
  red: ['#ffd0c9', '#f28e81', '#d15f52'], card: ['#e8c796', '#cfa36a', '#b38750'],
};
const SKIN = '#f6d2b0';

function kit(u) {
  const P = (x, y, z = 0) => [(x - y) * C * u, (x + y) * 0.5 * u - z * u];
  const pts = (list) => list.map((p) => P(...p).map((v) => v.toFixed(1)).join(' '));
  const poly = (list, fill, cls = 'iso-ink') => `<path d="M${pts(list).join('L')}Z" fill="${fill}" class="${cls}"/>`;
  const line = (list, cls = 'iso-line') => `<path d="M${pts(list).join('L')}" class="${cls}"/>`;
  function box(x, y, z, w, d, ht, mat) {
    const m = PAL[mat] || PAL.cream, t = z + ht;
    return poly([[x, y + d, t], [x + w, y + d, t], [x + w, y + d, z], [x, y + d, z]], m[1])
      + poly([[x + w, y, t], [x + w, y + d, t], [x + w, y + d, z], [x + w, y, z]], m[2])
      + poly([[x, y, t], [x + w, y, t], [x + w, y + d, t], [x, y + d, t]], m[0])
      + line([[x + 0.06, y + d - 0.06, t], [x + w - 0.06, y + d - 0.06, t], [x + w - 0.06, y + 0.06, t]], 'iso-shine');
  }
  function cyl(x, y, z, r, ht, mat) {
    const m = PAL[mat] || PAL.cream, [cx, cy] = P(x, y, z), rx = r * u * 1.22, ry = r * u * 0.71, h = ht * u;
    return `<path d="M${cx - rx} ${cy - h}v${h}a${rx} ${ry} 0 0 0 ${2 * rx} 0v${-h}Z" fill="${m[1]}" class="iso-ink"/>`
      + `<ellipse cx="${cx}" cy="${cy - h}" rx="${rx}" ry="${ry}" fill="${m[0]}" class="iso-ink"/>`;
  }
  const shadow = (x, y, r) => { const [cx, cy] = P(x, y, 0); return `<ellipse cx="${cx}" cy="${cy}" rx="${r * u * 1.3}" ry="${r * u * 0.7}" class="iso-shadow"/>`; };
  function pawn(x, y, z = 0, mat = 'blue', delay = 0, opts = {}) {
    const [cx, cy] = P(x, y, z), k = u / 46, m = PAL[mat] || PAL.blue;
    const hair = opts.hair ? `<path d="M-9 -40c-1-9 5-12 9-12s11 2 9 12c-5-5-13-5-18 0Z" fill="#3a2a22" class="iso-ink"/>` : '';
    const mood = opts.mood === 'cross' ? '<path d="M-4 -33q4-4 8 0" class="iso-face"/>' : '<path d="M-4 -34q4 4 8 0" class="iso-face"/>';
    return `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${k})"><ellipse rx="15" ry="7" class="iso-shadow"/><g class="bob" style="animation-delay:${delay}s">`
      + `<path d="M-11 -2v-17a11 11 0 0 1 22 0v17a11 5 0 0 1-22 0Z" fill="${m[1]}" class="iso-ink"/><path d="M-7 -18a7 8 0 0 1 7-7" class="iso-shine"/>`
      + `<circle cy="-37" r="10" fill="${SKIN}" class="iso-ink"/>${hair}<circle cx="-3.5" cy="-38" r="1.3" class="iso-eye"/><circle cx="3.5" cy="-38" r="1.3" class="iso-eye"/>${mood}</g></g>`;
  }
  /* a floating tag with a hard shadow; w follows the text */
  function pill(x, y, z, text, tone = 'plain', extra = '') {
    const [cx, cy] = P(x, y, z), w = Math.max(30, String(text).length * 7.6 + 22);
    return `<g class="iso-pill tone-${tone}" transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})">${extra}<rect x="${-w / 2 + 2}" y="-10" width="${w}" height="25" rx="12.5" class="iso-drop"/>`
      + `<rect x="${-w / 2}" y="-13" width="${w}" height="25" rx="12.5" class="iso-chip"/><text y="4" text-anchor="middle">${String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></g>`;
  }
  /* draw on a wall plane: local (a, b) runs along the wall and down */
  const onBackWall = (x, z, inner) => { const [px, py] = P(x, 0, z); return `<g transform="matrix(${C} 0.5 0 1 ${px.toFixed(1)} ${py.toFixed(1)})">${inner}</g>`; };
  const onSideWall = (y, z, inner) => { const [px, py] = P(0, y, z); return `<g transform="matrix(${C} -0.5 0 1 ${px.toFixed(1)} ${py.toFixed(1)})">${inner}</g>`; };

  function room(w, d, wallH = 2.7) {
    let s = '<g class="iso-grid">';
    for (let i = -4; i <= w + 4; i++) s += line([[i, -1, -0.35], [i, d + 4, -0.35]]);
    for (let j = -1; j <= d + 4; j++) s += line([[-4, j, -0.35], [w + 4, j, -0.35]]);
    s += '</g>' + box(0, 0, -0.35, w, d, 0.35, 'floor');
    for (let i = 1; i < w; i++) s += line([[i, 0.05, 0], [i, d - 0.05, 0]], 'iso-seam');
    for (let j = 1; j < d; j++) s += line([[0.05, j, 0], [w - 0.05, j, 0]], 'iso-seam');
    s += box(-0.25, -0.25, 0, 0.25, d + 0.25, wallH, 'wall') + box(0, -0.25, 0, w, 0.25, wallH, 'wall');
    return s;
  }

  const parts = {
    counter: (x, y, len = 4) => box(x, y, 0, len, 0.85, 0.95, 'wood') + box(x - 0.08, y - 0.08, 0.95, len + 0.16, 1.01, 0.13, 'cream')
      + Array.from({ length: Math.floor(len) }, (_, i) => line([[x + i + 0.5, y + 0.85, 0.15], [x + i + 0.5, y + 0.85, 0.8]], 'iso-seam')).join(''),
    cup: (x, y, z, mat = 'cream') => cyl(x, y, z, 0.1, 0.22, mat),
    espresso(x, y, z) {
      const [sx, sy] = P(x + 0.45, y + 0.4, z + 0.75);
      return box(x, y, z, 0.9, 0.6, 0.55, 'steel') + box(x + 0.08, y + 0.08, z + 0.55, 0.74, 0.44, 0.1, 'dark') + this.cup(x + 0.25, y + 0.72, z) + this.cup(x + 0.65, y + 0.72, z, 'coral')
        + `<path d="M${sx} ${sy}c-8-8 8-14 0-24M${sx + 12} ${sy + 4}c-8-8 8-14 0-24" class="iso-steam"/>`;
    },
    register: (x, y, z) => box(x, y, z, 0.75, 0.55, 0.2, 'dark') + box(x + 0.08, y + 0.06, z + 0.2, 0.6, 0.12, 0.45, 'blue') + box(x + 0.15, y + 0.3, z + 0.2, 0.45, 0.18, 0.06, 'cream'),
    table(x, y) { return shadow(x, y, 0.75) + cyl(x, y, 0, 0.12, 0.65, 'dark') + cyl(x, y, 0.65, 0.62, 0.12, 'wood') + this.cup(x - 0.18, y + 0.05, 0.77) + this.cup(x + 0.22, y - 0.18, 0.77, 'coral'); },
    stool: (x, y, mat = 'teal') => shadow(x, y, 0.3) + cyl(x, y, 0, 0.08, 0.38, 'dark') + cyl(x, y, 0.38, 0.27, 0.12, mat),
    plant(x, y) {
      const [cx, cy] = P(x, y, 0.55), k = u / 46;
      return shadow(x, y, 0.35) + cyl(x, y, 0, 0.27, 0.55, 'coral') + `<g transform="translate(${cx} ${cy}) scale(${k})"><g class="sway"><path d="M0 0C-26-6-30-30-20-42C-6-34 2-18 0 0ZM0 0C24-10 30-32 24-44C8-38-2-20 0 0ZM0 0C-6-22 2-40 8-52C18-36 12-16 0 0Z" fill="${PAL.green[1]}" class="iso-ink"/></g></g>`;
    },
    boxes: (x, y) => shadow(x + 0.7, y + 0.6, 0.9) + box(x, y, 0, 0.95, 0.8, 0.65, 'card') + box(x + 0.9, y + 0.35, 0, 0.75, 0.75, 0.5, 'card') + box(x + 0.2, y + 0.1, 0.65, 0.6, 0.55, 0.45, 'card') + line([[x + 0.47, y + 0.8, 0.65], [x + 0.47, y + 0.8, 0.2]], 'iso-seam'),
    easel(x, y, text, mat = 'coral') {
      return shadow(x + 0.5, y, 0.5) + line([[x + 0.12, y, 0], [x + 0.35, y, 1.5]], 'iso-leg') + line([[x + 0.95, y, 0], [x + 0.72, y, 1.5]], 'iso-leg')
        + box(x, y - 0.04, 0.55, 1.1, 0.12, 0.95, mat) + (text ? pill(x + 0.55, y + 0.1, 1.05, text, 'plain') : '');
    },
    kiosk: (x, y) => shadow(x + 0.25, y + 0.2, 0.4) + box(x + 0.18, y + 0.1, 0, 0.18, 0.18, 0.95, 'steel') + box(x, y, 0.95, 0.55, 0.14, 0.8, 'dark') + box(x + 0.06, y + 0.14, 1.02, 0.43, 0.03, 0.66, 'blue'),
    router(x, y, z, on = true) {
      const [cx, cy] = P(x + 0.25, y + 0.3, z + 0.75);
      return box(x, y, z, 0.35, 0.8, 0.22, 'dark') + line([[x + 0.18, y + 0.1, z + 0.22], [x + 0.18, y + 0.1, z + 0.72]], 'iso-leg') + line([[x + 0.18, y + 0.7, z + 0.22], [x + 0.18, y + 0.7, z + 0.72]], 'iso-leg')
        + `<g class="iso-wifi${on ? '' : ' off'}" transform="translate(${cx} ${cy - 10})"><path d="M-22-6q22-22 44 0M-14 3q14-13 28 0M-6 11q6-5 12 0"/></g>`;
    },
    shelf(x, y) {
      let s = shadow(x + 0.4, y + 0.9, 0.9) + box(x, y, 0, 0.55, 1.7, 1.85, 'wood');
      const mats = ['coral', 'teal', 'yellow', 'violet', 'blue', 'green'];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) s += box(x + 0.5, y + 0.12 + i * 0.39, 0.18 + r * 0.56, 0.12, 0.28, 0.38, mats[(i + r * 2) % mats.length]);
      return s;
    },
    rack(x, y) {
      let s = shadow(x + 0.45, y + 0.4, 0.7) + box(x, y, 0, 0.8, 0.75, 1.55, 'dark');
      for (let r = 0; r < 4; r++) { s += line([[x + 0.8, y + 0.1, 0.28 + r * 0.33], [x + 0.8, y + 0.65, 0.28 + r * 0.33]], 'iso-seam'); const [a, b] = P(x + 0.8, y + 0.58, 0.4 + r * 0.33); s += `<circle cx="${a}" cy="${b}" r="2.8" class="iso-led" style="animation-delay:${r * 0.37}s"/>`; }
      return s;
    },
    camera(x, y, z) { const [a, b] = P(x + 0.42, y + 0.2, z + 0.18); return box(x, y, z, 0.42, 0.4, 0.32, 'steel') + `<circle cx="${a}" cy="${b}" r="${u / 9}" fill="${PAL.dark[2]}" class="iso-ink"/><circle cx="${a}" cy="${b}" r="${u / 24}" class="iso-led"/>`; },
    desk: (x, y) => shadow(x + 0.9, y + 0.5, 1) + box(x + 0.1, y + 0.1, 0, 0.14, 0.14, 0.75, 'dark') + box(x + 1.65, y + 0.1, 0, 0.14, 0.14, 0.75, 'dark') + box(x + 1.65, y + 0.75, 0, 0.14, 0.14, 0.75, 'dark') + box(x, y, 0.75, 1.9, 1, 0.12, 'wood')
      + box(x + 0.6, y + 0.35, 0.87, 0.65, 0.45, 0.05, 'steel') + box(x + 0.6, y + 0.3, 0.92, 0.65, 0.05, 0.42, 'blue'),
    pad: (x, y) => shadow(x + 0.35, y + 0.35, 0.5) + cyl(x + 0.35, y + 0.35, 0, 0.1, 0.8, 'steel') + box(x, y + 0.05, 0.8, 0.75, 0.6, 0.1, 'dark') + box(x + 0.08, y + 0.12, 0.9, 0.59, 0.46, 0.03, 'violet'),
    shield(x, y, z) { const [a, b] = P(x, y, z); return `<g transform="translate(${a} ${b})"><g class="bob"><path d="M0-30l26 9v18c0 18-12 27-26 32-14-5-26-14-26-32v-18Z" fill="${PAL.teal[1]}" class="iso-ink"/><path d="M-11 0l8 9 16-18" class="iso-check"/></g></g>`; },
  };
  return { u, P, box, cyl, poly, line, shadow, pawn, pill, onBackWall, onSideWall, room, parts };
}

const wrap = (viewBox, inner, label, cls = '') => `<svg class="scene iso ${cls}" viewBox="${viewBox}" role="img" aria-label="${label.replace(/"/g, '&quot;')}">${inner}</svg>`;
const sign = (k, x, z) => k.onBackWall(x, z, '<rect width="176" height="46" rx="12" class="iso-sign"/><text x="88" y="31" text-anchor="middle" class="iso-signt">QUÁN MÂY</text>');
const windowAt = (draw, at, z, w = 86) => draw(at, z, `<rect width="${w}" height="62" rx="6" class="iso-glass"/><path d="M${w / 2} 0v62M0 31h${w}" class="iso-frame"/>`);

/* The shop as one episode sees it. o: {tidy, queue, baristas, banner, money, phone, wifi, badge, shield, night, office, offer} */
function shop(o = {}, label = 'Quán Mây') {
  const k = kit(52);
  if (o.office) return office(k, o, label);
  const p = k.parts;
  let s = k.room(8, 6) + sign(k, 1.2, 2.35) + windowAt(k.onBackWall, 5.6, 1.9) + windowAt(k.onSideWall, 4.9, 1.8, 70);
  if (o.wifi) s += p.router(0, 1.2, 1.35, o.wifi !== 'off');
  const baristas = o.baristas || 1;
  for (let i = 0; i < baristas; i++) s += k.pawn(baristas === 1 ? 2.9 : 2 + i * 1.5, 0.85, 0, 'coral', i * 0.4, { hair: true });
  s += p.counter(1.2, 1.4, 4) + p.espresso(1.45, 1.5, 1.08) + p.register(4.15, 1.55, 1.08) + p.cup(3.1, 2.0, 1.08, 'teal');
  s += p.kiosk(6.4, 1.0);
  s += o.banner ? p.easel(6.2, 2.9, '−20%') : '';
  if (o.tidy) s += p.stool(4.9, 4.2) + p.table(5.8, 4.0) + p.stool(6.7, 4.3, 'yellow') + p.table(2.0, 4.8) + p.stool(1.1, 4.6, 'yellow') + p.plant(0.55, 3.2) + p.plant(7.4, 0.6);
  else s += p.boxes(4.6, 3.4) + p.boxes(1.4, 4.2) + p.boxes(6.1, 4.4) + p.plant(0.55, 3.2);
  const queue = Math.min(o.queue || 0, 7), mats = ['blue', 'violet', 'green', 'yellow'];
  for (let i = 0; i < queue; i++) s += k.pawn(2.2 + i * 0.66, 2.95 + (i % 2) * 0.3, 0, mats[i % 4], i * 0.23, { mood: queue >= 4 && i > 1 ? 'cross' : '' });
  if (queue >= 4) s += `<g class="pulse">${k.pill(5.9, 5.3, 1.5, '!', 'bad')}</g>`;
  if (o.shield) s += p.shield(7.0, 3.6, 1.2);
  if (o.money) s += `<g class="pulse">${k.pill(4.5, 1.8, 2.25, '−120k', 'bad')}</g>`;
  if (o.phone) s += `<g class="pulse">${k.pill(6.7, 1.1, 2.15, `✉ ${o.phone}`, 'warm')}</g>`;
  if (o.wifi === 'off') s += `<g class="pulse">${k.pill(0.4, 1.7, 2.6, '✕ offline', 'bad')}</g>`;
  if (o.badge) s += `<g class="pulse">${k.pill(2.0, 2.0, 2.2, o.badge, 'bad')}</g>`;
  if (o.night) s += '<rect x="-420" y="-260" width="840" height="620" class="iso-night"/><circle cx="300" cy="-110" r="22" class="iso-moon"/>';
  return wrap('-340 -178 760 570', s, label);
}

function office(k, o, label) {
  const p = k.parts;
  let s = k.room(6, 5) + windowAt(k.onBackWall, 1.4, 2.2, 150) + p.plant(0.6, 4.0) + p.shelf(0.05, 0.4);
  s += k.pawn(2.0, 1.9, 0, 'blue', 0.2, { hair: true }) + p.desk(2.0, 2.2) + p.cup(2.3, 2.5, 0.87) + k.pawn(3.4, 3.7, 0, 'coral', 0.6, { hair: true }) + p.stool(3.4, 3.7, 'steel');
  if (o.offer) s += `<g class="pulse">${k.pill(4.4, 1.2, 2.3, 'OFFER ✓', 'good')}</g>`;
  return wrap('-290 -170 580 500', s, label);
}

window.QuanMayIso = { kit, shop, wrap, sign, windowAt, PAL };
})();
