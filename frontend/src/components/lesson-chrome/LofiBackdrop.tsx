// Nền của màn bài học: căn phòng ban đêm đứng yên phía sau, vài thứ trong đó
// khẽ chuyển động (sao nhấp nháy, trăng thở, dây đèn, đèn bàn, chậu cây, vật nhỏ
// bay lên). Toàn bộ là `aria-hidden` và `pointer-events: none` — nó chỉ là không khí.
//
// Style ở `lofi-theme.css` (lớp `.lf-*`); tài nguyên ở `public/lesson-lofi/`
// (bảng asset: `ASSETS.md` cùng thư mục).
//
// TOẠ ĐỘ XÁC ĐỊNH, không `Math.random()`: component này được dựng ở máy chủ rồi
// hydrate ở trình duyệt, mà giá trị ngẫu nhiên khác nhau giữa hai lần dựng là
// đúng loại gây cảnh báo hydration mismatch.

/** Bộ sinh giả ngẫu nhiên nhỏ, cùng hạt giống ⇒ cùng bầu trời mỗi lần. */
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const rand = lcg(20261111);
// Sao nằm ở nửa trên màn (nơi có trời); 22 sao — màn hẹp ẩn bớt từ ngôi thứ 15.
const STARS = Array.from({ length: 22 }, () => ({
  x: `${(rand() * 98 + 1).toFixed(1)}%`,
  y: `${(rand() * 52 + 2).toFixed(1)}%`,
  s: `${(rand() * 2.4 + 1.6).toFixed(1)}px`,
  d: `${(rand() * 4).toFixed(2)}s`,
}));
// 9 vật nhỏ, mỗi vật một ô sprite (0 sao … 7 chấm sáng). Thời gian âm để lúc mở
// trang đã có vài vật đang bay giữa chừng thay vì cả bầy xuất phát cùng lúc.
const MOTES = Array.from({ length: 9 }, (_, i) => ({
  x: `${(8 + rand() * 84).toFixed(1)}%`,
  c: [0, 1, 4, 7, 1, 2, 5, 0, 6][i],
  t: `${(22 + rand() * 16).toFixed(1)}s`,
  d: `-${(rand() * 30).toFixed(1)}s`,
  dx: `${(rand() * 120 - 60).toFixed(0)}px`,
  r: `${(rand() * 160 - 80).toFixed(0)}deg`,
}));

export default function LofiBackdrop() {
  return (
    <div className="lf-backdrop" aria-hidden="true">
      <div className="lf-photo" />
      <div className="lf-wash" />
      <div className="lf-moon" />
      {STARS.map((s, i) => (
        <span
          key={i}
          className="lf-star"
          style={{ '--x': s.x, '--y': s.y, '--s': s.s, '--d': s.d } as React.CSSProperties}
        />
      ))}
      <div className="lf-lights" />
      <div className="lf-lamp" />
      <div className="lf-plant" />
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="lf-mote"
          style={
            { '--x': m.x, '--c': m.c, '--t': m.t, '--d': m.d, '--dx': m.dx, '--r': m.r } as React.CSSProperties
          }
        />
      ))}
      <div className="lf-vignette" />
    </div>
  );
}
