/* Tập thử AD01 trong khung của Quán Mây. Vanilla JS, không framework, không vòng lặp hoạt ảnh.
 *
 * DÙNG LẠI QUÁN MÂY, KHÔNG VIẾT BẢN THỨ HAI: CSS (/quan-may/quan-may.css) và bộ vẽ isometric
 * (window.QuanMayIso từ /quan-may/iso.js). KHÔNG nạp quan-may.js: tệp đó tự dựng bản đồ và điều hướng ngay khi
 * nạp. Hàm avatar/h/rich bên dưới là bản rút gọn của hàm cùng tên ở đó (chỉ nhánh Linh).
 *
 * BỐN BƯỚC (Vụ việc · Đoán · Thử · Viết), MỖI BƯỚC LÀ MỘT VIỆC TAY LÀM (phản hồi người thử 26/11: bản trước "chỉ bấm bấm rồi trôi qua", chữ bị đọc lướt,
 * và đáp án trắc nghiệm đoán được bằng cách chọn câu dài nhất):
 *  0. Vụ việc: nhìn ba bảng THẬT, đọc luật báo cáo, tự bấm tìm mọi dòng của đơn 101. Dữ liệu và luật đến TRƯỚC câu hỏi.
 *  1. Đoán  : gõ HAI con số (số hàng sau khi nối, tổng tiền hàng) — không có phương án nào để chọn. Chốt rồi mới thấy bảng nối
 *             hiện từng hàng, bấm một hàng thì nét nối tương ứng trên quầy sáng lên.
 *  2. Thử   : ba núm vặn (gom dòng hàng trước · gom thanh toán trước · giữ đơn thiếu). Mỗi lần vặn, cảnh đổi số nét nối
 *             (4 → 2 → 1), câu SQL sinh ra đổi theo, và bảng kết quả chạy lại ngay. Hai nhiệm vụ mở khoá bước sau.
 *  3. Viết  : tự gõ lại câu sửa, chấm trên dữ liệu của quán VÀ dữ liệu thử thêm (ẩn).
 *
 * CÂN NHẮC MÁY YẾU (spike 26/11/2026: sql.js khởi động 37-52 ms thường, 159-229 ms khi CPU chậm 4x; ~0,34 MB gzip):
 *  - Engine KHÔNG nạp khi mở trang. Chỉ nạp khi vào bước "Thử" (hoặc lần chạy đầu), nên màn Đoán mở tức thì.
 *  - Cảnh là SVG ~60 phần tử, vẽ lại khi vặn núm; hoạt ảnh duy nhất là CSS transition trên các nét nối. Không rAF, không canvas.
 *    `prefers-reduced-motion`: nét hiện ngay, hàng bảng hiện ngay.
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
  function goi(op, sql, mai) {
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
      worker.postMessage({ id, op, sql, mai: !!mai });
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
  // Dữ liệu thật của đơn 101 (khớp ad01-data.js): hai dòng hàng, hai lần thanh toán.
  const HANG = [['Trà đào', 60], ['Bánh', 40]];
  const TRA = [['lần 1', 60], ['lần 2', 40]];
  const tongH = HANG.reduce((a, x) => a + x[1], 0);
  const tongT = TRA.reduce((a, x) => a + x[1], 0);

  function canh(o) {
    // o: { cap: bool (hiện các nét nối), preL, preP: bên đó đã gom về MỘT hàng, tong: null | 'bad' | 'ok' }
    // Phòng nhỏ (5 x 4) và đơn vị vẽ lớn hơn Quán Mây (64): ở đây không có gì ngoài quầy, nên cảnh phải lấp đầy khung.
    const k = ISO.kit(64);
    const p = k.parts;
    // Nhãn so le HAI độ cao: nhãn rộng hơn khoảng cách giữa các món nên đặt cùng độ cao là đè lên nhau (đã thấy ở bản đầu).
    // Một bên đã gom thì chỉ còn MỘT hộp ở giữa: số nét nối tụt 4 → 2 → 1, đó là điều núm vặn phải cho thấy.
    const hang = o.preL ? [[1.25, 'Tổng hàng ' + tongH, 2.6]] : [[0.75, 'Trà đào 60', 1.95], [1.75, 'Bánh 40', 3.25]];
    const tra = o.preP ? [[3.3, 'Tổng TT ' + tongT, 2.6]] : [[2.8, 'TT lần 1 · 60', 1.95], [3.75, 'TT lần 2 · 40', 3.25]];
    let s = k.room(5, 4) + ISO.sign(k, 0.7, 2.35) + ISO.windowAt(k.onBackWall, 3.4, 1.9);
    s += k.pawn(4.55, 0.85, 0, 'coral', 0, { hair: true, mood: o.tong === 'bad' ? 'cross' : 'ok' });
    s += p.counter(0.5, 1.4, 4);
    hang.forEach(([x]) => { s += k.box(x, 1.55, 1.08, 0.7, 0.55, 0.3, 'yellow'); });
    tra.forEach(([x]) => { s += k.box(x, 1.55, 1.08, 0.7, 0.55, 0.14, 'blue'); });
    s += p.plant(0.5, 3.4);
    if (o.cap) {
      let i = 0;
      hang.forEach(([hx]) => tra.forEach(([tx]) => {
        const n = i++;
        s += k.line([[hx + 0.35, 1.82, 1.4], [tx + 0.35, 1.82, 1.24]], 'iso-pair').replace('<path ', `<path data-i="${n}" style="transition-delay:${(n * 0.15).toFixed(2)}s" `);
      }));
    }
    hang.forEach(([x, t, z]) => { s += k.pill(x + 0.35, 1.9, z, t, 'warm'); });
    tra.forEach(([x, t, z]) => { s += k.pill(x + 0.35, 1.9, z, t, 'plain'); });
    // Kết luận nổi ở khoảng trống trước quầy, không đè lên biển hiệu.
    if (o.tong) s += `<g class="${o.tong === 'bad' ? 'pulse' : ''}">${k.pill(2.6, 3.2, 1.4, o.tong === 'bad' ? 'Tiền hàng: sai ✗' : 'Tiền hàng: 100 ✓', o.tong === 'bad' ? 'bad' : 'good')}</g>`;
    return h('div', { class: 'scene-wrap', html: ISO.wrap('-235 -200 560 520', s, 'Quầy của Linh: đơn 101 có hai dòng hàng và hai phiếu thanh toán') });
  }
  // "Tòa nhà truy vấn": mỗi phép nối thêm MỘT tầng, và tấm sàn phình theo số hàng. Cùng ý với bản mô phỏng Call Stack 2.5D
  // (mỗi lời gọi hàm là một tầng), nhưng tầng ở đây là các phép nối. Thấy tầng 3 phình gấp đôi tầng 1 là thấy grain bị nhân.
  function toaNha(tang, o) {
    const k = ISO.kit(50);
    const nhan = ['Đơn đã thanh toán', o.preL ? '+ tổng dòng hàng' : '+ dòng hàng', o.preP ? '+ tổng thanh toán' : '+ thanh toán'];
    const mat = ['cream', 'yellow', 'blue'];
    let s = '';
    tang.forEach((n, i) => {
      const w = 0.7 + 0.32 * n, x = 2 - w / 2, z = i * 1.3;
      s += k.box(x, 0.7, z, w, 1.6, 0.5, mat[i]);
    });
    tang.forEach((n, i) => { s += k.pill(2, 2.45, i * 1.3 + 0.35, `${nhan[i]} · ${n} hàng`, n > tang[0] ? 'bad' : 'plain'); });
    return h('div', { class: 'scene-wrap toa', html: ISO.wrap('-215 -170 440 400', s, `Tòa nhà truy vấn: ${tang.map((n, i) => nhan[i] + ' ' + n + ' hàng').join(', ')}`) });
  }
  const hienCap = (el) => requestAnimationFrame(() => requestAnimationFrame(() => el.querySelectorAll('.iso-pair').forEach((x) => x.classList.add('on'))));

  /* ---------- trạng thái và các màn ---------- */
  // Bốn bước. "Vụ việc" ra đời sau phản hồi 26/11: người học không hề thấy dữ liệu, không biết báo cáo phải ra sao, và gặp
  // JOIN/NULL/grain khi chưa ai giải thích. Dữ liệu và luật báo cáo phải đến TRƯỚC câu hỏi đầu tiên.
  const PH = ['Vụ việc', 'Đoán', 'Thử', 'Viết'];
  const moi = () => ({
    ph: 0, max: 0, tim: new Set(), thong: '',
    soHang: '', tong: '', chot: false,
    knob: { preL: false, preP: false, left: true }, nv: { a: false, b: false }, daThu: false, truoc: null,
    goiY: 0, xemMau: false, cauHV: null,
    sao: { doan: false, dat: false, sach: false }, soCham: 0, khung: { chinh: false, an: false },
  });
  let st = moi();

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
        h('span', { class: 'chip' }, 'Vụ việc · đoán · thử · viết SQL'),
        h('ol', { class: 'phases' }, PH.map((p, i) => h('li', { class: i === giaiDoan ? 'on' : i < giaiDoan ? 'past' : '' }, h('button', { type: 'button', 'aria-current': i === giaiDoan ? 'step' : null, disabled: i > st.max, onclick: () => { st.ph = i; ve(); } }, p))))));
  }

  const khung = (stage, side) => h('div', { class: 'ep-grid' }, h('div', { class: 'main-col' }, stage), h('aside', { class: 'side' }, ...side));
  const tiep = (n) => () => { st.ph = n; st.max = Math.max(st.max, n); ve(); };
  const ghi = (t) => h('p', { class: 'ghi', html: rich(t) });
  const nhoBam = (tr, f) => { tr.addEventListener('click', f); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }); };

  /* ---------- sổ của quán: ba bảng THẬT, để người học luôn thấy mình đang nói về dữ liệu nào ---------- */
  // o.hl: mã đơn cần tô sáng. o.chon: cho bấm vào từng dòng (bài "tìm đơn 101").
  const thuocDon = (ten, r) => (ten === 'purchases' ? r[0] : r[1]);
  function soQuan(o) {
    o = o || {};
    const wrap = h('div', { class: 'so-quan' });
    Object.entries(D.HIEN_THI).forEach(([ten, b]) => {
      wrap.append(h('div', { class: 'so' },
        h('div', { class: 'so-ten' }, h('b', null, b.ten), h('small', null, ten)),
        h('div', { class: 'cuon' }, h('table', { class: 'kq nho' },
          h('thead', null, h('tr', null, b.cot.map((c) => h('th', null, c)))),
          h('tbody', null, b.hang.filter((r) => !o.chi || thuocDon(ten, r) === o.chi).map((r) => h('tr', { class: (o.hl === thuocDon(ten, r) ? 'hl' : '') + (o.chon ? ' bam' : ''), tabindex: o.chon ? '0' : null, 'data-don': String(thuocDon(ten, r)), 'data-ten': ten, role: o.chon ? 'button' : null },
            r.map((v) => h('td', { class: v === null ? 'null' : '' }, String(v))))))))));
    });
    return wrap;
  }
  const hopDong = (mo) => h('details', { class: 'goi', open: mo },
    h('summary', null, 'Luật của chủ quán cho báo cáo'),
    h('ol', { class: 'luat' }, [
      'Mỗi đơn **đã thanh toán** đúng **một hàng**: `id`, `line_total` (cộng tiền hàng), `paid_total` (cộng tiền khách đã trả).',
      'Đơn đã thanh toán mà chưa có dòng hàng hay chưa có thanh toán vẫn **phải có mặt**; ô thiếu để **NULL** (trống), không đổi thành 0.',
      'Cột `amount` ở bảng đơn chỉ là số ghi đầu đơn: **không dùng thay** cho tổng cộng từ chi tiết.',
    ].map((t) => h('li', { html: rich(t) }))));
  const tuNgu = (mo) => h('details', { class: 'goi', open: mo },
    h('summary', null, 'Từ cần biết (NULL, JOIN, grain…)'),
    h('dl', { class: 'tu' }, [
      ['NULL', 'chưa có số liệu. Khác 0: số 0 là đã biết đúng 0 đồng.'],
      ['Nối (JOIN)', 'ghép các bảng theo mã đơn để mỗi hàng mới mang thông tin của cả hai bên.'],
      ['LEFT JOIN', 'giữ mọi đơn bên trái, kể cả đơn không có dòng nào khớp bên phải (ô thiếu thành NULL).'],
      ['Gom (GROUP BY)', 'gộp nhiều hàng thành MỘT hàng cho mỗi đơn, rồi SUM cộng cột tiền.'],
      ['Grain', 'một hàng của bảng đại diện cho cái gì. Báo cáo này cần: một hàng = một đơn.'],
    ].map(([t, g]) => h('div', null, h('dt', null, t), h('dd', null, g)))));

  /* ---------- 0. Vụ việc: nhìn dữ liệu, biết luật, tự tìm đơn 101 ---------- */
  function manVuViec() {
    const CAN = Object.entries(D.HIEN_THI).reduce((a, [ten, b]) => a + b.hang.filter((r) => thuocDon(ten, r) === 101).length, 0);
    const tin = h('p', { class: 'vv-tin', 'aria-live': 'polite' });
    const veTin = () => {
      const xong = st.tim.size >= CAN;
      tin.className = 'vv-tin' + (xong ? ' xong' : '');
      tin.innerHTML = xong
        ? rich('Đủ rồi: **một đơn** nhưng có **2 dòng hàng** và **2 lần thanh toán** (khách trả hai lần). Nhớ điều này.')
        : rich(`Bấm vào mọi dòng của **đơn 101** ở cả ba sổ: **${st.tim.size}/${CAN}**.` + (st.thong ? ' ' + st.thong : ''));
    };
    const so = soQuan({ chon: true });
    so.querySelectorAll('tr[data-don]').forEach((tr) => {
      const key = tr.dataset.ten + ':' + tr.rowIndex;
      if (st.tim.has(key)) tr.classList.add('chon');
      nhoBam(tr, () => {
        if (tr.dataset.don !== '101') {
          st.thong = `Dòng đó thuộc đơn ${tr.dataset.don}.`;
          tr.classList.add('lac'); setTimeout(() => tr.classList.remove('lac'), 450);
        } else {
          st.thong = '';
          if (st.tim.has(key)) st.tim.delete(key); else st.tim.add(key);
          tr.classList.toggle('chon', st.tim.has(key));
        }
        veTin();
      });
    });
    veTin();
    // Việc cần làm lên ĐẦU, bảng ngay sau; cảnh quầy chỉ là phần trang trí nên xuống cuối và ẩn trên điện thoại.
    const stage = h('section', { class: 'stage' }, tin, so, h('div', { class: 'chi-rong scene-mini wide' }, canh({})));
    return khung(stage, [
      h('div', { class: 'talk' }, bubble('Chào bạn! Quán em ghi sổ thế này: **đơn**, **dòng hàng**, **thanh toán**. Cuối ngày em phải làm **một báo cáo** để chủ quán **chốt tiền và quyết định nhập hàng**. Bạn xem sổ giúp em nhé.', 'happy')),
      h('div', { class: 'ctl' }, hopDong(true), tuNgu(false)),
      h('div', { class: 'acts' }, btn('Sang bước đoán →', tiep(1), 'primary')),
    ]);
  }

  /* ---------- 1. Đoán: gõ hai con số ---------- */
  function manDoan() {
    const stage = h('section', { class: 'stage' });
    const nhapHang = h('input', { type: 'number', inputmode: 'numeric', min: '0', max: '99', id: 'so-hang', value: st.soHang, disabled: st.chot });
    const nhapTong = h('input', { type: 'number', inputmode: 'numeric', min: '0', max: '9999', id: 'so-tong', value: st.tong, disabled: st.chot });
    const dungH = Number(st.soHang) === D.doan.soHang, dungT = Number(st.tong) === D.doan.tong;
    const o = (id, nhan, input, kq) => h('label', { class: 'hoi' + (st.chot ? (kq ? ' dung' : ' sai') : ''), for: id }, h('span', null, nhan), input, st.chot ? h('small', null, kq ? '✓ Đúng' : '✗ Chưa đúng') : null);
    const chotNut = btn('Chốt hai con số', () => { st.chot = true; if (dungH && dungT) st.sao.doan = true; ve(); }, 'primary', { disabled: st.soHang === '' || st.tong === '' });
    const capNhat = () => { st.soHang = nhapHang.value; st.tong = nhapTong.value; chotNut.disabled = st.soHang === '' || st.tong === ''; };
    nhapHang.addEventListener('input', capNhat); nhapTong.addEventListener('input', capNhat);
    stage.append(
      h('p', { class: 'ghi', html: rich('Chỉ hiện các dòng của **đơn 101** (ba sổ, mỗi sổ một vài dòng).') }),
      soQuan({ hl: 101, chi: 101 }),
      h('div', { class: 'hoi-nhom' },
        o('so-hang', 'Báo cáo của em nối cả ba sổ lại. Sau khi nối, đơn 101 có bao nhiêu hàng?', nhapHang, dungH),
        o('so-tong', 'Cộng cột tiền hàng (line_total) của các hàng đó ra bao nhiêu?', nhapTong, dungT)));

    if (st.chot) {
      // Bảng nối hiện từng hàng; bấm hàng nào thì nét nối tương ứng trên quầy đổi màu.
      const rows = [];
      HANG.forEach(([tenH, gH], hi) => TRA.forEach(([tenT, gT], ti) => rows.push([hi * TRA.length + ti, tenH, gH, tenT, gT])));
      const tbl = h('table', { class: 'kq led' },
        h('thead', null, h('tr', null, ['dòng hàng', 'thanh toán', 'tiền hàng', 'tiền TT'].map((c) => h('th', null, c)))),
        h('tbody', null,
          rows.map(([i, tenH, gH, tenT, gT]) => h('tr', { class: 'in', tabindex: '0', 'data-i': String(i), style: `animation-delay:${(i * 0.18).toFixed(2)}s`, 'aria-label': `Cặp ${i + 1}: ${tenH} ${gH} với thanh toán ${tenT} ${gT}` },
            h('td', null, tenH), h('td', null, tenT), h('td', null, String(gH)), h('td', null, String(gT)))),
          h('tr', { class: 'in tong', style: `animation-delay:${(rows.length * 0.18).toFixed(2)}s` }, h('td', { colspan: '2' }, 'Cộng'), h('td', null, String(HANG.reduce((a, x) => a + x[1] * TRA.length, 0))), h('td', null, String(TRA.reduce((a, x) => a + x[1] * HANG.length, 0))))));
      const bat = (tr) => { const on = tr.classList.toggle('hot'); stage.querySelectorAll(`.iso-pair[data-i="${tr.dataset.i}"]`).forEach((l) => l.classList.toggle('hot', on)); };
      tbl.querySelectorAll('tr[data-i]').forEach((tr) => nhoBam(tr, () => bat(tr)));
      stage.append(h('div', { class: 'cuon' }, tbl), ghi('Bấm một hàng để thấy cặp nào trên quầy tạo ra nó.'), canh({ cap: true, tong: 'bad' }));
      hienCap(stage);
    }

    const noi = st.chot
      ? (dungH && dungT ? 'Đúng cả hai! ' : 'Chưa khớp. ') + D.doan.giaiThich
      : 'Nhìn các dòng của đơn 101 rồi **đoán trước**: gõ số, không có phương án nào để chọn. Đoán sai cũng không sao, chỗ sai mới là chỗ học được.';
    const acts = h('div', { class: 'acts' }, st.chot ? btn('Thử tự tay →', tiep(2), 'primary') : chotNut);
    return khung(stage, [h('div', { class: 'talk' }, bubble(noi, st.chot ? (dungH && dungT ? 'happy' : 'wow') : 'think')), acts]);
  }

  /* ---------- 2. Thử: ba núm vặn, kết quả chạy lại ngay ---------- */
  function manThu() {
    const k = st.knob;
    const ra = h('div', { class: 'ketqua', 'aria-live': 'polite' });
    const vua = h('p', { class: 'vua', 'aria-live': 'polite' });
    const bao = h('div', { class: 'bao' });
    const khungToa = h('div', { class: 'scene-mini wide' });
    let vuaVan = null; // núm vừa vặn: để câu "điều vừa đổi" nói đúng núm nào
    const code = h('pre', { class: 'code' });
    const goals = h('ul', { class: 'goals' });
    const acts = h('div', { class: 'acts' });
    const veGoals = () => {
      goals.replaceChildren(
        h('li', { class: 'g-h' }, `Nhiệm vụ ${[st.nv.a, st.nv.b].filter(Boolean).length}/2`),
        h('li', { class: st.nv.a ? 'ok' : '' }, h('i', { 'aria-hidden': 'true' }, st.nv.a ? '✓' : ''), h('span', null, 'Đơn 101 ra đúng 100 và 100')),
        h('li', { class: st.nv.b ? 'ok' : '' }, h('i', { 'aria-hidden': 'true' }, st.nv.b ? '✓' : ''), h('span', null, 'Cả bảng khớp: đủ 3 đơn, đơn 104 để NULL')));
      acts.replaceChildren(...(st.nv.a && st.nv.b ? [btn('Tự viết lại câu này →', tiep(3), 'primary')] : []));
    };
    veGoals();
    let lan = 0;
    async function chay() {
      const my = ++lan;
      const q = D.xayCau(k);
      code.textContent = q.sql;
      ra.replaceChildren(ghi('Đang chạy…'));
      try {
        const [r, ...dem] = await Promise.all([goi('chay', q.sql), ...q.tang.map((t) => goi('chay', t))]);
        if (my !== lan) return; // đã vặn tiếp: bỏ kết quả cũ
        const tang = dem.map((d) => (d.bang && d.bang.hang[0] ? d.bang.hang[0][0] : 0));
        khungToa.replaceChildren(toaNha(tang, k));
        const hang = r.bang ? r.bang.hang : [];
        const d101 = hang.find((x) => x[0] === 101);
        const a = !!d101 && d101[1] === 100 && d101[2] === 100;
        const b = hang.length === Object.keys(D.CAN_RA).length && hang.every((x) => D.CAN_RA[x[0]] && D.CAN_RA[x[0]][0] === x[1] && D.CAN_RA[x[0]][1] === x[2]);
        st.daThu = true;
        if ((a && !st.nv.a) || (b && !st.nv.b)) { st.nv.a = st.nv.a || a; st.nv.b = st.nv.b || b; veGoals(); }
        // Sổ báo cáo của chủ quán: cùng một bảng kết quả, nhưng đọc bằng con mắt của người SẼ DÙNG nó để quyết định.
        const cong = (i) => hang.reduce((acc, x) => acc + (x[i] == null ? 0 : x[i]), 0);
        const X = cong(1), Y = cong(2), T = D.KET_THAT;
        const khop = X === T && Y === T;
        bao.className = 'bao ' + (khop ? 'ok' : 'sai');
        bao.replaceChildren(
          h('div', { class: 'bao-o' }, h('small', null, 'Két thật'), h('b', null, T + 'k')),
          h('div', { class: 'bao-o' }, h('small', null, 'Báo cáo: tiền hàng'), h('b', null, X + 'k')),
          h('div', { class: 'bao-o' }, h('small', null, 'Báo cáo: khách trả'), h('b', null, Y + 'k')),
          h('p', { class: 'bao-kl', html: rich(khop ? 'Báo cáo **khớp két**. Chủ quán yên tâm chốt sổ.'
            : X > T ? `Báo cáo ghi **${X}k** nhưng két chỉ có **${T}k**: chủ quán tưởng quán lời hơn thật ${X - T}k và định đặt thêm hàng.`
              : `Báo cáo ghi **${X}k** tiền hàng và **${Y}k** khách trả, lệch với két **${T}k**: chủ quán sẽ nghi có người ăn bớt.`) }));
        // "Điều vừa đổi": nối lời Linh với số thật, như khung "What changed" của bản mô phỏng Call Stack.
        const cur = { tang, d: d101 ? [d101[1], d101[2]] : null };
        const chuoi = (t) => t.join(' · ');
        vua.className = 'vua' + (vuaVan ? ' co' : '');
        vua.innerHTML = vuaVan && st.truoc
          ? rich(`Vừa **${vuaVan.bat ? 'bật' : 'tắt'}** «${vuaVan.ten}». Số hàng qua ba tầng: từ ${chuoi(st.truoc.tang)} thành **${chuoi(tang)}**. Đơn 101: ${st.truoc.d ? `(${st.truoc.d[0]}, ${st.truoc.d[1]})` : 'biến mất'} → **${cur.d ? `(${cur.d[0]}, ${cur.d[1]})` : 'biến mất'}**.`)
          : rich(`Chưa vặn gì: đây là câu của em. Số hàng qua ba tầng: **${chuoi(tang)}**. Mỗi tầng chỉ nên giữ MỘT hàng cho mỗi đơn.`);
        st.truoc = cur;
        ra.replaceChildren(bang(r.bang, (hh, i) => i > 0 && D.CAN_RA[hh[0]] && D.CAN_RA[hh[0]][i - 1] !== hh[i]),
          ghi('Cần ra: `(101, 100, 100)` · `(102, 50, 50)` · `(104, NULL, NULL)`. Ô đỏ là ô sai.'));
      } catch (e) { if (my === lan) ra.replaceChildren(ghi(D.viLoi(e.message))); }
    }
    const gat = (key, ten, phu) => {
      const b = h('button', { type: 'button', role: 'switch', class: 'gat', 'aria-checked': String(k[key]), onclick: () => { k[key] = !k[key]; vuaVan = { ten, bat: k[key] }; b.setAttribute('aria-checked', String(k[key])); b.querySelector('.tg').textContent = k[key] ? 'Bật' : 'Tắt'; chay(); } },
        h('span', null, h('b', null, ten), h('small', null, phu)), h('span', { class: 'tg' }, k[key] ? 'Bật' : 'Tắt'));
      return b;
    };
    chay();
    // Núm và nhiệm vụ nằm TRONG khung chính, trên cảnh: trên điện thoại cột bên rơi xuống dưới cả cảnh lẫn câu SQL,
    // tức người học phải cuộn qua mọi thứ mới thấy cái họ cần vặn.
    const nut = h('div', { class: 'gats' },
      gat('preL', 'Gom dòng hàng trước khi nối', 'mỗi đơn còn MỘT hàng tiền hàng'),
      gat('preP', 'Gom thanh toán trước khi nối', 'mỗi đơn còn MỘT hàng tiền trả'),
      gat('left', 'Giữ đơn thiếu dòng hoặc thanh toán', 'LEFT JOIN thay cho JOIN'));
    st.truoc = null; // vào bước Thử là bắt đầu so sánh lại từ đầu
    const stage = h('section', { class: 'stage' }, nut, goals, bao, vua, khungToa, h('div', { class: 'pane' }, code, ra), hopDong(false), tuNgu(false));
    return khung(stage, [
      h('div', { class: 'talk' }, bubble('Chủ quán sẽ đọc báo cáo này, nên nó phải **khớp két**. Em có ba núm vặn: **vặn thử** rồi nhìn sổ báo cáo, tòa nhà truy vấn và bảng kết quả.', 'think')),
      acts]);
  }

  /* ---------- 3. Viết: tự gõ lại, chấm trên dữ liệu thường và dữ liệu ẩn ---------- */
  function manViet() {
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
    const noi = h('div', { class: 'talk' }, bubble('Giờ bạn **tự gõ** câu đúng, bắt đầu từ câu sai của em. Tên bảng và tên cột có ở **Sổ của quán**; luật báo cáo ở ngay dưới nó.', 'think'));
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
        ra.replaceChildren(h('p', { class: 'ghi', html: rich((r.dat ? '**Đúng.** ' : '') + D.viPhanHoi(r.phanHoi)) }), r.bang ? bang(r.bang) : null,
          r.dat ? btn('Xong tập này →', tiep(4), 'primary') : null);
      } catch (e) { ra.replaceChildren(h('p', { class: 'ghi' }, D.viLoi(e.message))); }
    };
    const stage = h('section', { class: 'stage' },
      // Tên bảng và cột lúc nào cũng thấy (đang gõ SQL thì cần đúng cái này); dữ liệu thì gập, để ô gõ không bị đẩy khỏi màn hình.
      h('p', { class: 'luoc-do', html: Object.entries(D.HIEN_THI).map(([ten, b]) => `<code>${ten}</code>(${b.cot.join(', ')})`).join(' · ') }),
      h('details', { class: 'goi' }, h('summary', null, 'Sổ của quán (dữ liệu)'), soQuan()),
      hopDong(false), o, h('div', { class: 'pane' }, ra, mau));
    return khung(stage, [noi, goals, h('div', { class: 'ctl' }, goiY),
      h('div', { class: 'acts' }, btn('Chạy thử', () => tmp('chay')), btn('Chấm bài', () => tmp('cham'), 'primary'), nutY, nutMau)]);
  }

  function manXong() {
    // "Ngày mai": chạy chính câu của người học trên bộ dữ liệu ẩn rồi MỞ nó ra. Đó là lý do câu phải đúng chứ không chỉ "ra số đẹp hôm nay".
    const mai = h('div', { class: 'mai' });
    if (st.cauHV) {
      mai.append(h('p', { class: 'ghi' }, 'Đang chạy câu của bạn trên số liệu ngày mai…'));
      Promise.all([goi('chay', st.cauHV, true), goi('chay', D.DAP_AN, true)]).then(([a, b]) => {
        const kh = JSON.stringify(a.bang && a.bang.hang) === JSON.stringify(b.bang && b.bang.hang);
        mai.replaceChildren(
          h('p', { class: 'ghi', html: rich('**Ngày mai quán có thêm đơn mới**: đơn 201 có hai món **cùng giá 40**, đơn 202 đã thanh toán nhưng chưa có thanh toán nào ghi. Câu của bạn ra:') }),
          bang(a.bang),
          h('p', { class: 'ghi', html: rich(kh ? 'Khớp từng hàng với báo cáo đúng. Câu cộng tiền bằng `SUM(DISTINCT)` sẽ gộp hai món 40 thành một và sai đúng chỗ này, nên bài chấm luôn thử ngày mai.' : 'Có hàng khác với báo cáo đúng.') }));
      }).catch(() => mai.replaceChildren());
    }
    const stage = h('section', { class: 'stage' }, canh({ tong: 'ok' }), h('div', { class: 'pane' },
      h('ul', { class: 'tong-ket' },
        h('li', null, h('i', null, '✓'), h('span', null, 'Thấy rằng một câu SQL không báo lỗi vẫn có thể cho số sai.')),
        h('li', null, h('i', null, '✓'), h('span', { html: rich('Biết nguyên nhân: nối hai bảng con vào cùng một bảng cha **nhân các hàng** với nhau (grain bị đổi).') })),
        h('li', null, h('i', null, '✓'), h('span', null, 'Sửa bằng cách gom mỗi nhánh về đúng grain (một hàng một đơn) TRƯỚC khi ghép.')))));
    const n = soSao();
    // Chỉ nói điều ĐÃ xảy ra: bản trước luôn khen "đoán đúng ngay" kể cả khi người học đoán sai.
    const duoc = [st.sao.doan && 'đoán đúng ngay', st.sao.dat && 'chấm đạt', st.sao.sach && 'không cần gợi ý hay lời giải mẫu'].filter(Boolean);
    const thieu = [!st.sao.doan && 'đoán đúng trước khi chạy', !st.sao.sach && 'làm không cần gợi ý hay lời giải mẫu'].filter(Boolean);
    return khung(stage, [
      h('div', { class: 'talk' }, bubble(`Chủ quán đọc xong và nói **số khớp két**, bỏ luôn đơn nhập thêm hàng. Cảm ơn bạn! Bạn được **${n}/3 sao**${duoc.length ? ': ' + duoc.join(', ') : ''}.${thieu.length ? ' Muốn đủ sao, lần sau thử ' + thieu.join(' và ') + '.' : ''}`, 'happy')),
      mai,
      h('p', { class: 'ghi' }, 'Đây là tập thử nghiệm. Chưa có nhật ký học tập nào được ghi. Chấm bài bằng cách chạy câu của bạn trên dữ liệu của quán và dữ liệu thử thêm, nên cách viết nào đúng cũng đạt.'),
      h('div', { class: 'acts' }, btn('Làm lại từ đầu', () => { st = moi(); ve(); })),
    ]);
  }

  const MAN = [manVuViec, manDoan, manThu, manViet, manXong];
  const TIEU = ['Báo cáo cuối ngày của quán', 'Báo cáo cuối ngày của quán', 'Báo cáo cuối ngày của quán', 'Báo cáo cuối ngày của quán', 'Báo cáo đã khớp két'];

  function ve() {
    veBar();
    view.replaceChildren(veDau(TIEU[st.ph], st.ph), MAN[st.ph]());
    window.scrollTo(0, 0);
  }
  ve();
})();
