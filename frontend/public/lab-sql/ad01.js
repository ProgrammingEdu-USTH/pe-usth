/* Tập thử AD01 trong khung của Quán Mây. Vanilla JS, không framework, không vòng lặp hoạt ảnh.
 *
 * DÙNG LẠI QUÁN MÂY, KHÔNG VIẾT BẢN THỨ HAI: CSS (/quan-may/quan-may.css) và bộ vẽ isometric
 * (window.QuanMayIso từ /quan-may/iso.js). KHÔNG nạp quan-may.js: tệp đó tự dựng bản đồ và điều hướng ngay khi
 * nạp. Hàm avatar/h/rich bên dưới là bản rút gọn của hàm cùng tên ở đó (chỉ nhánh Linh).
 *
 * CÂN NHẮC MÁY YẾU (spike 26/11/2026: sql.js khởi động 37-52 ms thường, 159-229 ms khi CPU chậm 4x; ~0,34 MB gzip):
 *  - Engine KHÔNG nạp khi mở trang. Chỉ nạp ở lần chạy đầu tiên (màn "Chạy"), nên các màn đọc và đoán mở tức thì.
 *  - Cảnh là SVG ~60 phần tử vẽ một lần cho mỗi trạng thái; hoạt ảnh duy nhất là CSS transition trên bốn nét ghép.
 *    Không rAF, không canvas. `prefers-reduced-motion`: nét hiện ngay.
 *  - Mỗi lần chạy có hạn 5 giây (terminate + dựng lại worker), vì sql.js chạy đồng bộ.
 */
(function () {
  'use strict';
  const D = window.LabSqlAd01;
  const ISO = window.QuanMayIso;
  const bar = document.getElementById('bar');
  const view = document.getElementById('view');

  /* ---------- worker, nạp lười, hạn giờ ---------- */
  let worker = null;
  let seq = 0;
  const cho = new Map();
  function taoWorker() {
    worker = new Worker('/lab-sql/worker.js');
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.loai === 'san-sang') return;
      const p = cho.get(m.id);
      if (p) { cho.delete(m.id); clearTimeout(p.timer); m.ok ? p.ok(m) : p.no(new Error(m.loi)); }
    };
    worker.onerror = () => { for (const [, p] of cho) { clearTimeout(p.timer); p.no(new Error('Không nạp được bộ chạy SQL.')); } cho.clear(); };
  }
  function goi(op, sql) {
    if (!worker) taoWorker();
    const id = ++seq;
    return new Promise((ok, no) => {
      const timer = setTimeout(() => {
        cho.delete(id);
        try { worker.terminate(); } catch (_) { /* đã chết */ }
        worker = null;
        no(new Error('Câu SQL chạy quá 5 giây nên bị dừng (có vòng lặp không dừng?).'));
      }, 5000);
      cho.set(id, { ok, no, timer });
      worker.postMessage({ id, op, sql });
    });
  }

  /* ---------- trợ giúp dựng DOM ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rich = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  }
  const btn = (label, onclick, cls = '', extra = {}) => h('button', { type: 'button', class: ('btn ' + cls).trim(), onclick, ...extra }, label);

  function avatar(mood) {
    const mouth = { happy: '<path d="M25 39q7 7 14 0"/>', worry: '<path d="M26 43q6-6 12 0"/>', wow: '<ellipse cx="32" cy="42" rx="4" ry="5" fill="#5A3522"/>', think: '<path d="M27 42h10"/>' }[mood] || '';
    const brows = mood === 'worry' ? '<path d="M21 25l8-3M43 25l-8-3"/>' : mood === 'wow' ? '<path d="M21 22h8M35 22h8"/>' : '';
    const hair = '#2B1D18';
    const top = `<circle cx="32" cy="10" r="7" fill="${hair}"/><path d="M13 35C10 15 23 11 32 11s22 5 19 24c-3-10-9-12-15-17-6 7-15 9-23 17Z" fill="${hair}"/>`;
    return `<svg class="ava ava-linh" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" class="ava-bg"/><path d="M12 61c2-11 10-14 20-14s18 3 20 14a31 31 0 0 1-40 0Z" class="ava-shirt"/><circle cx="32" cy="31" r="18" fill="#F1C7A1"/>${top}<circle cx="25" cy="31" r="2.3" fill="#23170F"/><circle cx="39" cy="31" r="2.3" fill="#23170F"/><g fill="none" stroke="#5A3522" stroke-width="2.2" stroke-linecap="round">${brows}${mouth}</g></svg>`;
  }
  const bubble = (text, mood) => h('div', { class: 'bubble who-linh' },
    h('span', { class: 'face', html: avatar(mood) }),
    h('div', { class: 'say' }, h('b', { class: 'name' }, 'Linh'), h('p', { html: rich(text) })));

  function bang(b, danhDauSai) {
    if (!b || !b.cot.length) return h('p', { class: 'ghi' }, 'Câu này không trả bảng nào.');
    return h('div', { class: 'cuon', role: 'region', 'aria-label': 'Kết quả', tabindex: '0' },
      h('table', { class: 'kq' },
        h('thead', null, h('tr', null, b.cot.map((c) => h('th', null, c)))),
        h('tbody', null, b.hang.map((r) => h('tr', null, r.map((v, i) => h('td', { class: v === null ? 'null' : (danhDauSai && danhDauSai(r, i) ? 'bad' : '') }, v === null ? 'NULL' : String(v))))))));
  }

  /* ---------- cảnh isometric: đơn 101 trên quầy ---------- */
  function canh(o) {
    // o: { cap: bool (hiện bốn cặp ghép), tong: null | 'bad' | 'ok', mood }
    // Phòng nhỏ (5 x 4) và đơn vị vẽ lớn hơn Quán Mây (64): ở đây không có gì ngoài quầy, nên cảnh phải lấp đầy khung.
    const k = ISO.kit(64);
    const p = k.parts;
    // Bốn món trên quầy, từ trái sang phải. Nhãn so le HAI độ cao: nhãn rộng hơn khoảng cách giữa các món nên
    // đặt cùng độ cao là đè lên nhau (đã thấy ở bản đầu).
    const hang = [[0.75, 'Trà đào 60', 1.95], [1.75, 'Bánh 40', 3.25]];
    const tra = [[2.8, 'TT lần 1 · 60', 1.95], [3.75, 'TT lần 2 · 40', 3.25]];
    let s = k.room(5, 4) + ISO.sign(k, 0.7, 2.35) + ISO.windowAt(k.onBackWall, 3.4, 1.9);
    // Linh đứng sau đầu quầy bên phải, không bị nhãn che; cây ở góc trước bên trái cho cảnh có chiều sâu.
    s += k.pawn(4.55, 0.85, 0, 'coral', 0, { hair: true, mood: o.tong === 'bad' ? 'cross' : 'ok' });
    s += p.counter(0.5, 1.4, 4);
    hang.forEach(([x]) => { s += k.box(x, 1.55, 1.08, 0.7, 0.55, 0.3, 'yellow'); });
    tra.forEach(([x]) => { s += k.box(x, 1.55, 1.08, 0.7, 0.55, 0.14, 'blue'); });
    s += p.plant(0.5, 3.4);
    if (o.cap) {
      let i = 0;
      hang.forEach(([hx]) => tra.forEach(([tx]) => {
        s += k.line([[hx + 0.35, 1.82, 1.4], [tx + 0.35, 1.82, 1.24]], 'iso-pair').replace('<path ', `<path style="transition-delay:${(i++ * 0.15).toFixed(2)}s" `);
      }));
    }
    hang.forEach(([x, t, z]) => { s += k.pill(x + 0.35, 1.9, z, t, 'warm'); });
    tra.forEach(([x, t, z]) => { s += k.pill(x + 0.35, 1.9, z, t, 'plain'); });
    // Kết luận nổi ở khoảng trống trước quầy, không đè lên biển hiệu.
    if (o.tong) s += `<g class="${o.tong === 'bad' ? 'pulse' : ''}">${k.pill(2.6, 3.2, 1.4, o.tong === 'bad' ? 'Tiền hàng: 200 ✗' : 'Tiền hàng: 100 ✓', o.tong === 'bad' ? 'bad' : 'good')}</g>`;
    return h('div', { class: 'scene-wrap', html: ISO.wrap('-235 -200 560 520', s, 'Quầy của Linh: đơn 101 có hai dòng hàng và hai phiếu thanh toán') });
  }
  const hienCap = (el) => requestAnimationFrame(() => requestAnimationFrame(() => el.querySelectorAll('.iso-pair').forEach((x) => x.classList.add('on'))));

  /* ---------- trạng thái và các màn ---------- */
  const PH = ['Chuyện', 'Đoán', 'Chạy', 'Sửa'];
  const st = { ph: 0, doan: null, chot: false, goiY: 0, xemMau: false, cauHV: null, sao: { doan: false, dat: false, sach: false }, soCham: 0, khung: { chinh: false, an: false } };

  // Cùng khuôn ô HUD của Quán Mây: biểu tượng trong span đầu (grid), chữ trong span sau.
  const SAO_ICON = '<path d="M12 3.500l2.600 5.400 5.900.800-4.300 4.100 1 5.900-5.200-2.800-5.200 2.800 1-5.900-4.300-4.100 5.900-.800z"/>';
  const soSao = () => Object.values(st.sao).filter(Boolean).length;

  function veBar() {
    bar.replaceChildren(
      h('a', { class: 'exit', href: '/' }, '← Góc học'),
      h('a', { class: 'brand', href: '/quan-may', html: '<svg viewBox="0 0 40 32" aria-hidden="true"><path d="M9 16a7 7 0 0 1 3-13 9 9 0 0 1 16 0 7 7 0 0 1 3 13Z" class="c1"/><path d="M12 18h16l-2 10a4 4 0 0 1-4 3h-4a4 4 0 0 1-4-3Z" class="c2"/></svg><span>Quán Mây</span>' }),
      h('div', { class: 'hud' },
        h('span', { class: 'hud-i', title: 'Sao của tập này' }, h('span', { html: `<svg viewBox="0 0 24 24" aria-hidden="true">${SAO_ICON}</svg>` }), h('span', null, `${soSao()}/3`), h('span', { class: 'sr' }, 'sao')),
        h('span', { class: 'hud-i', title: 'Số lần chấm' }, h('span', null, `Chấm: ${st.soCham}`))));
  }

  function veDau(tieuDe, giaiDoan) {
    return h('div', { class: 'ep-head' },
      h('div', null, h('span', { class: 'eyebrow' }, 'Tập thử · AD01 · Cơ sở dữ liệu'), h('h1', null, tieuDe)),
      h('div', { class: 'ep-meta' },
        h('span', { class: 'chip' }, 'Đoán rồi chạy SQL'),
        h('ol', { class: 'phases' }, PH.map((p, i) => h('li', { class: i === giaiDoan ? 'on' : i < giaiDoan ? 'past' : '' }, h('button', { type: 'button', 'aria-current': i === giaiDoan ? 'step' : null, disabled: i > st.ph, onclick: () => { st.ph = i; ve(); } }, p))))));
  }

  const khung = (stage, side) => h('div', { class: 'ep-grid' }, h('div', { class: 'main-col' }, stage), h('aside', { class: 'side' }, ...side));
  const tiep = (n) => () => { st.ph = n; ve(); };

  function manChuyen() {
    const stage = h('section', { class: 'stage' }, canh({}));
    return khung(stage, [
      h('div', { class: 'talk' }, bubble('Cuối ngày em phải báo cáo cho chủ quán: mỗi đơn đã thanh toán **một hàng**, gồm **tiền hàng** và **tiền khách đã trả**. Em nối ba bảng lại rồi cộng… ra con số nhìn rất hợp lý. Không có lỗi nào cả.', 'happy')),
      h('p', { class: 'ghi' }, 'Khoảng 5 phút. SQL chạy ngay trong trình duyệt của bạn (SQLite); cú pháp JOIN, GROUP BY và WITH ở đây giống MySQL.'),
      h('div', { class: 'acts' }, btn('Bắt đầu →', tiep(1), 'primary big')),
    ]);
  }

  function manDoan() {
    const dg = D.doan;
    const stage = h('section', { class: 'stage' }, canh({ cap: st.chot, tong: st.chot ? 'bad' : null }));
    if (st.chot) hienCap(stage);
    const acts = h('div', { class: 'acts' });
    const ds = h('div', { class: 'options', role: 'radiogroup', 'aria-label': 'Các lựa chọn' });
    const chotNut = btn('Chốt đáp án', () => { st.chot = true; if (st.doan === dg.dung) st.sao.doan = true; ve(); }, 'primary', { disabled: st.doan === null });
    dg.luaChon.forEach((lc, i) => {
      const dung = st.chot && i === dg.dung, sai = st.chot && st.doan === i && i !== dg.dung;
      ds.append(h('button', { type: 'button', role: 'radio', class: 'option' + (dung ? ' good' : sai ? ' bad' : ''), 'aria-checked': st.doan === i ? 'true' : 'false', disabled: st.chot,
        onclick: () => { st.doan = i; ds.querySelectorAll('.option').forEach((o, j) => o.setAttribute('aria-checked', j === i ? 'true' : 'false')); chotNut.disabled = false; } },
      h('span', { class: 'letter', 'aria-hidden': 'true' }, 'ABCD'[i]), h('span', null, lc)));
    });
    if (st.chot) acts.append(btn('Chạy câu của Linh →', tiep(2), 'primary'));
    else acts.append(chotNut);
    const noi = st.chot
      ? (st.doan === dg.dung ? 'Đúng rồi! ' : `Chưa đúng, là **${dg.luaChon[dg.dung]}**. `) + dg.giaiThich
      : 'Đơn 101 có hai dòng hàng (**60** và **40**) và hai lần thanh toán (**60** và **40**). Em nối cả hai bảng vào đơn rồi cộng. Theo bạn, tiền hàng của đơn 101 ra bao nhiêu?';
    return khung(stage, [h('div', { class: 'talk' }, bubble(noi, st.chot ? (st.doan === dg.dung ? 'happy' : 'wow') : 'think')), h('div', { class: 'ctl' }, ds), acts]);
  }

  function manChay() {
    const ra = h('div', { class: 'ketqua', 'aria-live': 'polite' });
    const acts = h('div', { class: 'acts' });
    const chay = btn('Chạy câu của Linh', async () => {
      chay.disabled = true; chay.textContent = 'Đang chạy…';
      try {
        const r = await goi('chay', D.SAI);
        ra.replaceChildren(bang(r.bang, (hang, i) => hang[0] === 101 && i > 0),
          h('p', { class: 'ghi', html: rich('Đơn 101 ra **200** và **200** thay vì 100 và 100. Đơn 102 vẫn đúng vì nó chỉ có MỘT dòng hàng và MỘT lần thanh toán.') }));
        chay.remove();
        acts.append(btn('Tự sửa câu này →', tiep(3), 'primary'));
      } catch (e) { ra.replaceChildren(h('p', { class: 'ghi' }, e.message)); chay.disabled = false; chay.textContent = 'Chạy lại'; }
    }, 'primary');
    acts.append(chay);
    const stage = h('section', { class: 'stage' }, canh({ cap: true, tong: 'bad' }), h('div', { class: 'pane' }, h('pre', { class: 'code' }, D.SAI), ra));
    hienCap(stage);
    return khung(stage, [h('div', { class: 'talk' }, bubble('Đây là câu của em. Chạy thử xem nó in ra gì nhé.', 'worry')), acts]);
  }

  function manSua() {
    const o = h('textarea', { class: 'code', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', rows: '12', 'aria-label': 'Câu SQL của bạn' });
    o.value = st.cauHV != null ? st.cauHV : D.SAI;
    o.addEventListener('input', () => { st.cauHV = o.value; });
    const ra = h('div', { class: 'ketqua', 'aria-live': 'polite' });
    const goals = h('ul', { class: 'goals' });
    const veGoals = () => goals.replaceChildren(
      h('li', { class: 'g-h' }, `Nhiệm vụ ${[st.khung.chinh, st.khung.an].filter(Boolean).length}/2`),
      h('li', { class: st.khung.chinh ? 'ok' : '' }, h('i', { 'aria-hidden': 'true' }, st.khung.chinh ? '✓' : ''), h('span', null, 'Đúng với dữ liệu của quán')),
      h('li', { class: st.khung.an ? 'ok' : '' }, h('i', { 'aria-hidden': 'true' }, st.khung.an ? '✓' : ''), h('span', null, 'Đúng cả với dữ liệu thử thêm')));
    veGoals();
    const noi = h('div', { class: 'talk' }, bubble('Mỗi đơn đã thanh toán **một hàng**: `id, line_total, paid_total`. Giữ cả đơn chưa có dòng hàng hay chưa có thanh toán, để **NULL** (đừng đổi thành 0). Cần ra: (101, 100, 100), (102, 50, 50), (104, NULL, NULL).', 'think'));
    const goiY = h('div');
    const veGoiY = () => goiY.replaceChildren(...D.goiY.slice(0, st.goiY).map((g, i) => h('p', { class: 'hint' }, h('b', null, `Gợi ý ${i + 1}`), g.replace(/^Tầng \d: /, ''))));
    veGoiY();
    const nutY = btn('Gợi ý', () => { st.goiY++; veGoiY(); nutY.disabled = st.goiY >= D.goiY.length; }, '', { disabled: st.goiY >= D.goiY.length });
    const mau = h('div');
    const nutMau = btn('Xem lời giải mẫu', () => { st.xemMau = true; mau.replaceChildren(h('p', { class: 'ghi' }, 'Lời giải mẫu (một cách viết, không phải cách duy nhất):'), h('pre', { class: 'code' }, D.DAP_AN)); nutMau.disabled = true; });
    if (st.xemMau) { nutMau.disabled = true; mau.replaceChildren(h('p', { class: 'ghi' }, 'Lời giải mẫu (một cách viết, không phải cách duy nhất):'), h('pre', { class: 'code' }, D.DAP_AN)); }
    const tmp = async (op) => {
      ra.replaceChildren(h('p', { class: 'ghi' }, 'Đang chạy…'));
      try {
        const r = await goi(op, o.value);
        if (op === 'chay') { ra.replaceChildren(bang(r.bang)); return; }
        st.soCham++; st.khung = { chinh: r.datChinh, an: r.datAn }; veGoals(); veBar();
        if (r.dat) { st.sao.dat = true; st.sao.sach = st.goiY === 0 && !st.xemMau; veBar(); }
        ra.replaceChildren(h('p', { class: 'ghi', html: rich((r.dat ? '**Đúng.** ' : '') + r.phanHoi) }), r.bang ? bang(r.bang) : null,
          r.dat ? btn('Xong tập này →', tiep(4), 'primary') : null);
      } catch (e) { ra.replaceChildren(h('p', { class: 'ghi' }, e.message)); }
    };
    const stage = h('section', { class: 'stage' }, h('div', { class: 'scene-mini' }, canh({})), h('div', { class: 'pane' }, o, ra, mau));
    return khung(stage, [noi, goals, h('div', { class: 'ctl' }, goiY),
      h('div', { class: 'acts' }, btn('Chạy thử', () => tmp('chay')), btn('Chấm bài', () => tmp('cham'), 'primary'), nutY, nutMau)]);
  }

  function manXong() {
    const stage = h('section', { class: 'stage' }, canh({ tong: 'ok' }), h('div', { class: 'pane' },
      h('ul', { class: 'tong-ket' },
        h('li', null, h('i', null, '✓'), h('span', null, 'Thấy rằng một câu SQL không báo lỗi vẫn có thể cho số sai.')),
        h('li', null, h('i', null, '✓'), h('span', { html: rich('Biết nguyên nhân: nối hai bảng con vào cùng một bảng cha **nhân các hàng** với nhau (grain bị đổi).') })),
        h('li', null, h('i', null, '✓'), h('span', null, 'Sửa bằng cách gom mỗi nhánh về đúng grain (một hàng một đơn) TRƯỚC khi ghép.')))));
    const n = soSao();
    return khung(stage, [
      h('div', { class: 'talk' }, bubble(`Báo cáo của em giờ đúng rồi, cảm ơn bạn! Bạn được **${n}/3 sao**: đoán đúng ngay, chấm đạt, và không cần gợi ý hay lời giải mẫu.`, 'happy')),
      h('p', { class: 'ghi' }, 'Đây là tập thử nghiệm. Chưa có nhật ký học tập nào được ghi. Chấm bài bằng cách chạy câu của bạn trên dữ liệu của quán và dữ liệu thử thêm, nên cách viết nào đúng cũng đạt.'),
      h('div', { class: 'acts' }, btn('Làm lại từ đầu', () => { Object.assign(st, { ph: 0, doan: null, chot: false, goiY: 0, xemMau: false, cauHV: null, sao: { doan: false, dat: false, sach: false }, soCham: 0, khung: { chinh: false, an: false } }); ve(); })),
    ]);
  }

  const MAN = [manChuyen, manDoan, manChay, manSua, manXong];
  const TIEU = ['Hai lần thanh toán, tổng gấp đôi', 'Hai lần thanh toán, tổng gấp đôi', 'Hai lần thanh toán, tổng gấp đôi', 'Hai lần thanh toán, tổng gấp đôi', 'Báo cáo đã đúng'];

  function ve() {
    veBar();
    view.replaceChildren(veDau(TIEU[st.ph], Math.min(st.ph, 3)), MAN[st.ph]());
    window.scrollTo(0, 0);
  }
  ve();
})();
