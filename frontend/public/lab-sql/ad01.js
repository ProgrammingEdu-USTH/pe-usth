/* Giao diện bài thử AD01. Vanilla JS, không framework, không vòng lặp hoạt ảnh.
 *
 * CÂN NHẮC MÁY YẾU (đã đo ở spike 26/11/2026: sql.js khởi động 37-52 ms thường, 159-229 ms khi CPU
 * chậm 4x; ~0,34 MB gzip):
 *  - Engine KHÔNG nạp khi mở trang. Chỉ nạp ở lần chạy đầu tiên (màn 3), nên màn đọc và màn đoán mở
 *    tức thì và người học chưa bấm chạy thì không tốn một byte wasm nào.
 *  - Hình là SVG ~30 phần tử, hoạt ảnh duy nhất là CSS transition trên stroke-dashoffset của 4 nét.
 *    Không rAF, không canvas. `prefers-reduced-motion`: nét hiện ngay, không chuyển động.
 *  - Mọi lần chạy có hạn 5 giây (terminate + dựng lại worker), vì sql.js chạy đồng bộ.
 */
(function () {
  'use strict';
  const D = window.LabSqlAd01;
  const view = document.getElementById('view');
  const buocEl = document.getElementById('buoc');
  const TONG_MAN = 5;

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
      if (p) {
        cho.delete(m.id);
        clearTimeout(p.timer);
        m.ok ? p.ok(m) : p.no(new Error(m.loi));
      }
    };
    worker.onerror = () => huyTatCa(new Error('Không nạp được bộ chạy SQL.'));
  }
  function huyTatCa(err) {
    for (const [, p] of cho) { clearTimeout(p.timer); p.no(err); }
    cho.clear();
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

  /* ---------- trợ giúp dựng DOM (textContent, không innerHTML) ---------- */
  function h(tag, props, ...con) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of con.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  }
  const svg = (tag, attrs) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    return el;
  };
  function bangKetQua(b) {
    if (!b || !b.cot.length) return h('p', { class: 'phu' }, 'Câu này không trả bảng nào.');
    return h('div', { class: 'cuon', role: 'region', 'aria-label': 'Kết quả', tabindex: '0' },
      h('table', { class: 'kq' },
        h('thead', null, h('tr', null, b.cot.map((c) => h('th', null, c)))),
        h('tbody', null, b.hang.map((r) => h('tr', null, r.map((v) => h('td', null, v === null ? 'NULL' : String(v))))))));
  }

  /* ---------- hình: bốn cặp ghép ---------- */
  function hinhGhep() {
    const trai = [['Trà đào', 60], ['Bánh', 40]];
    const phai = [['TT lần 1', 60], ['TT lần 2', 40]];
    const s = svg('svg', { viewBox: '0 0 320 170', role: 'img', class: 'hinh', 'aria-label': 'Hai dòng hàng của đơn 101 ghép với hai lần thanh toán tạo bốn cặp' });
    const y = [20, 100];
    trai.forEach((t, i) => {
      s.append(svg('rect', { x: 8, y: y[i], width: 100, height: 46, rx: 8, class: 'o-hang' }));
      const a = svg('text', { x: 58, y: y[i] + 20, 'text-anchor': 'middle', class: 'chu' }); a.textContent = t[0];
      const b = svg('text', { x: 58, y: y[i] + 38, 'text-anchor': 'middle', class: 'chu so' }); b.textContent = String(t[1]);
      s.append(a, b);
    });
    phai.forEach((t, i) => {
      s.append(svg('rect', { x: 212, y: y[i], width: 100, height: 46, rx: 8, class: 'o-tra' }));
      const a = svg('text', { x: 262, y: y[i] + 20, 'text-anchor': 'middle', class: 'chu' }); a.textContent = t[0];
      const b = svg('text', { x: 262, y: y[i] + 38, 'text-anchor': 'middle', class: 'chu so' }); b.textContent = String(t[1]);
      s.append(a, b);
    });
    const cap = [];
    [0, 1].forEach((i) => [0, 1].forEach((j) => {
      const p = svg('path', { d: `M108 ${y[i] + 23} C 160 ${y[i] + 23}, 160 ${y[j] + 23}, 212 ${y[j] + 23}`, class: 'cap', pathLength: '1' });
      p.style.transitionDelay = `${(i * 2 + j) * 0.15}s`;
      cap.push(p);
      s.append(p);
    }));
    return { s, cap };
  }

  /* ---------- các màn ---------- */
  const st = { man: 0, doan: null, daChon: false, goiY: 0, ketQua: null, xemMau: false, dat: false };

  function ve() {
    buocEl.textContent = `${st.man + 1}/${TONG_MAN}`;
    view.replaceChildren(MAN[st.man]());
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  const tiep = () => { st.man++; ve(); };

  const MAN = [
    // 0. Tình huống
    () => h('section', { class: 'the' },
      h('p', { class: 'nhan' }, 'AD01 · Lập luận truy vấn'),
      h('h1', null, D.tieuDe),
      h('p', null, 'Linh mở một quán nước nhỏ. Cuối ngày cô cần báo cáo: mỗi đơn đã thanh toán một hàng, gồm tổng tiền hàng và tổng tiền khách đã trả.'),
      h('p', null, 'Đơn 101 có hai dòng hàng (60 và 40) và hai lần thanh toán (60 và 40). Linh nối ba bảng lại, cộng, và con số hiện ra… nhìn rất hợp lý. Không có lỗi nào.'),
      h('p', { class: 'phu' }, 'Bài này mất khoảng 5 phút và chạy SQL ngay trong trình duyệt của bạn (SQLite). Cú pháp JOIN, GROUP BY và WITH ở đây giống MySQL.'),
      h('button', { class: 'nut chinh', onclick: tiep }, 'Bắt đầu')),

    // 1. Đoán trước
    () => {
      const dg = D.doan;
      const phanHoi = h('div', { 'aria-live': 'polite' });
      const chot = h('button', { class: 'nut chinh', disabled: st.daChon || st.doan === null, onclick: () => { st.daChon = true; ve(); } }, 'Chốt đáp án');
      const ds = dg.luaChon.map((lc, i) => h('label', { class: 'lc' },
        h('input', { type: 'radio', name: 'doan', value: String(i), checked: st.doan === i, disabled: st.daChon, onchange: () => { st.doan = i; chot.disabled = false; } }),
        h('span', null, lc)));
      const hien = h('div');
      if (st.daChon) {
        const dung = st.doan === dg.dung;
        hien.append(h('p', { class: dung ? 'dung' : 'sai' }, dung ? 'Đúng.' : `Chưa đúng: đáp án là ${dg.luaChon[dg.dung]}.`), h('p', null, dg.giaiThich));
        const { s, cap } = hinhGhep();
        const ghi = h('p', { class: 'phu', 'aria-live': 'polite' }, 'Bấm để thấy các cặp ghép.');
        const nut = h('button', { class: 'nut', onclick: () => {
          cap.forEach((p) => p.classList.add('hien'));
          ghi.textContent = '4 cặp. Tiền hàng qua 4 cặp: 60 + 60 + 40 + 40 = 200. Dòng "Trà đào" và "Bánh" mỗi dòng bị tính HAI lần.';
          nut.disabled = true;
        } }, 'Ghép theo order_id');
        hien.append(s, nut, ghi, h('button', { class: 'nut chinh', onclick: tiep }, 'Tiếp tục'));
      }
      return h('section', { class: 'the' },
        h('p', { class: 'nhan' }, 'Đoán trước khi chạy'), h('h2', null, dg.cauHoi),
        h('div', { class: 'lcs', role: 'radiogroup', 'aria-label': 'Các lựa chọn' }, ds), st.daChon ? null : chot, phanHoi, hien);
    },

    // 2. Chạy câu sai
    () => {
      const ra = h('div', { 'aria-live': 'polite' });
      const nut = h('button', { class: 'nut chinh', onclick: async () => {
        nut.disabled = true; nut.textContent = 'Đang chạy…';
        try {
          const r = await goi('chay', D.SAI);
          ra.replaceChildren(bangKetQua(r.bang), h('p', null, 'Đơn 101 ra 200 và 200 thay vì 100 và 100. Đơn 102 vẫn đúng vì nó chỉ có MỘT dòng hàng và MỘT lần thanh toán.'),
            h('button', { class: 'nut chinh', onclick: tiep }, 'Tự sửa câu này'));
          nut.remove();
        } catch (e) { ra.replaceChildren(h('p', { class: 'sai' }, e.message)); nut.disabled = false; nut.textContent = 'Chạy lại'; }
      } }, 'Chạy câu của Linh');
      return h('section', { class: 'the' },
        h('p', { class: 'nhan' }, 'Chạy thử'), h('h2', null, 'Câu của Linh'),
        h('pre', { class: 'ma' }, h('code', null, D.SAI)), nut, ra);
    },

    // 3. Tự sửa + chấm
    () => {
      const o = h('textarea', { id: 'sql', class: 'soan', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', rows: '12', 'aria-label': 'Câu SQL của bạn' });
      o.value = st.cauHV != null ? st.cauHV : D.SAI;
      o.addEventListener('input', () => { st.cauHV = o.value; });
      const ra = h('div', { 'aria-live': 'polite' });
      const goiY = h('div');
      const hienGoiY = () => goiY.replaceChildren(...D.goiY.slice(0, st.goiY).map((g) => h('p', { class: 'goi-y' }, g)));
      hienGoiY();
      const nutY = h('button', { class: 'nut', onclick: () => { if (st.goiY < D.goiY.length) { st.goiY++; hienGoiY(); } nutY.disabled = st.goiY >= D.goiY.length; } }, 'Gợi ý');
      nutY.disabled = st.goiY >= D.goiY.length;
      const mau = h('div');
      const chay = async (op) => {
        ra.replaceChildren(h('p', { class: 'phu' }, 'Đang chạy…'));
        try {
          const r = await goi(op, o.value);
          if (op === 'chay') ra.replaceChildren(bangKetQua(r.bang));
          else {
            st.dat = r.dat;
            ra.replaceChildren(h('p', { class: r.dat ? 'dung' : 'sai' }, r.phanHoi), r.bang ? bangKetQua(r.bang) : null,
              r.dat ? h('button', { class: 'nut chinh', onclick: tiep }, 'Xong bài này') : null);
          }
        } catch (e) { ra.replaceChildren(h('p', { class: 'sai' }, e.message)); }
      };
      const nutMau = h('button', { class: 'nut', onclick: () => { st.xemMau = true; mau.replaceChildren(h('p', { class: 'phu' }, 'Lời giải mẫu (một cách viết, không phải cách duy nhất):'), h('pre', { class: 'ma' }, h('code', null, D.DAP_AN))); nutMau.disabled = true; } }, 'Xem lời giải mẫu');
      if (st.xemMau) nutMau.click();
      return h('section', { class: 'the' },
        h('p', { class: 'nhan' }, 'Tự làm'), h('h2', null, 'Sửa để mỗi đơn một hàng, tiền đúng'),
        h('p', null, 'Hợp đồng: mỗi đơn đã thanh toán một hàng gồm ', h('code', null, 'id, line_total, paid_total'), '; giữ cả đơn chưa có dòng hàng hay chưa có thanh toán (để NULL, đừng đổi thành 0). Cần ra: (101, 100, 100), (102, 50, 50), (104, NULL, NULL).'),
        o, h('div', { class: 'nuts' }, h('button', { class: 'nut', onclick: () => chay('chay') }, 'Chạy thử'), h('button', { class: 'nut chinh', onclick: () => chay('cham') }, 'Chấm bài'), nutY, nutMau),
        ra, goiY, mau);
    },

    // 4. Xong
    () => h('section', { class: 'the' },
      h('p', { class: 'nhan' }, 'Xong'), h('h2', null, 'Bạn vừa làm gì'),
      h('ul', null,
        h('li', null, 'Thấy rằng một câu SQL không báo lỗi vẫn có thể cho số sai.'),
        h('li', null, 'Biết nguyên nhân: nối hai bảng con vào cùng một bảng cha nhân các hàng với nhau (grain bị đổi).'),
        h('li', null, 'Sửa bằng cách gom mỗi nhánh về đúng grain (một hàng một đơn) TRƯỚC khi ghép.')),
      h('p', null, 'Bài chấm bằng cách chạy câu của bạn trên dữ liệu của quán và cả dữ liệu thử thêm, nên cách viết nào đúng cũng đạt.'),
      h('p', { class: 'phu' }, 'Đây là bài thử nghiệm. Chưa có nhật ký học tập nào được ghi.'),
      h('button', { class: 'nut', onclick: () => { Object.assign(st, { man: 0, doan: null, daChon: false, goiY: 0, xemMau: false, cauHV: null, dat: false }); ve(); } }, 'Làm lại từ đầu')),
  ];

  view.setAttribute('tabindex', '-1');
  ve();
})();
