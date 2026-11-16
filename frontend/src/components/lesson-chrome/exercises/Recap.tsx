// Dịch từ màn Stitch "3. RECAP — Tổng kết bài học & Nhận XP". Cũng là màn
// toàn thẻ, đứng độc lập như Checkpoint.
import { useState } from 'react';

import { withInlineCode } from '@/lib/inline-code';

import styles from './exercises.module.css';

export interface RecapStat {
  icon: string;
  value: string;
  label: string;
}

export interface RecapProps {
  xpLabel: string;
  title: string;
  description: string;
  stats: RecapStat[];
  facts: string[];
  onFinish: () => void;
  /**
   * Thêm một ô nữa vào màn tổng kết, dựng TRƯỚC nút "Hoàn thành ✓".
   *
   * Vị trí là một yêu cầu, không phải thẩm mỹ: hôm nay người dùng duy nhất của
   * nó là ô đề ôn tập (`ReviewQuiz`), và đặt nó SAU nút kết thúc thì muốn tới
   * được phải cuộn qua đúng cái nút đưa mình ra khỏi bài. Một đường đi phải
   * đoán mới thấy thì trên thực tế nó không tồn tại — repo này đã vấp đúng hình
   * dạng lỗi đó tám lần (thanh tiến độ bấm được mà không ai biết, tracer không
   * bài nào tới, nút "Try it Yourself" không màn nào mount).
   */
  extra?: React.ReactNode;
  /**
   * CỔNG HỒI TƯỞNG: khi có, ô "KIẾN THỨC CỐT LÕI ĐÃ HỌC" chỉ mở sau khi người
   * học tự viết ra thứ mình nhớ được. Tuỳ chọn, vì `Recap` dùng chung cho mọi
   * loại bài — chỉ khoá bài đọc truyền nó.
   */
  hoiTruoc?: { daViet: boolean; onNop: (chu: string) => void };
  /**
   * Số màn đã đi qua — theme "Đài thiên văn" vẽ một ngôi sao cho mỗi màn, nối thành chòm
   * sao. Ở lofi dải này `display: none` (không chiếm chỗ, không vào cây truy cập).
   * Chỉ là TRANG TRÍ nên luôn `aria-hidden`: con số thật đã nằm ở ô "Phần đã đọc".
   */
  soSao?: number;
}

/**
 * Ô HỒI TƯỞNG — hiện thay cho "KIẾN THỨC CỐT LÕI ĐÃ HỌC" cho tới khi người học
 * viết ra thứ họ nhớ được.
 *
 * BẰNG CHỨNG. Roediger & Karpicke 2006: nhóm HỒI TƯỞNG nhớ 61% sau một tuần,
 * nhóm ĐỌC LẠI 40% — và nhóm đọc lại TỰ TIN hơn. Màn tổng kết hôm nay là 100%
 * đọc lại (`facts` lấy đoạn văn đầu của từng màn đọc), tức nó đang bán đúng cái
 * cảm giác nắm được mà không kèm việc nắm được. Karpicke & Blunt 2011 (Science)
 * còn đo được hồi tưởng thắng cả việc vẽ sơ đồ khái niệm.
 *
 * BA chi tiết là YÊU CẦU, không phải thẩm mỹ — và cả ba đã được quyết ở ba cổng
 * trước (bảng từng bước · dự đoán output · xem đáp án luyện tập), nên chỗ này
 * chỉ việc theo:
 *
 *  1. CỔNG, không phải ô tuỳ chọn. Hundhausen 2002: Gurka lặp lại thí nghiệm
 *     nhưng BỎ điều kiện bắt buộc thì lợi thế BIẾN MẤT. Một ô người ta bỏ qua
 *     được thì cùng loại với "Thử lại" trần (Van der Kleij 2015, d = 0,05).
 *  2. KHÔNG CHẤM chữ họ viết, và nói thẳng điều đó. Không có đáp án máy đọc
 *     được cho "bạn nhớ được gì", nên một lời chấm ở đây chỉ có thể là giả.
 *  3. `textarea` chứ không `input`: câu trả lời là một-hai CÂU, và một ô một
 *     dòng ngầm bảo người ta viết ngắn hơn thứ việc này cần.
 */
function OHoiTuong({ onNop }: { onNop: (chu: string) => void }) {
  const [chu, setChu] = useState('');
  return (
    <form
      className={styles.recapLeft}
      onSubmit={(e) => {
        e.preventDefault();
        if (chu.trim()) onNop(chu.trim());
      }}
    >
      <div className={styles.recapEyebrow}>
        <span aria-hidden="true">🧠</span> TRƯỚC KHI XEM TÓM TẮT
      </div>
      <p className={styles.recapLead}>
        Không nhìn lại bài: viết 1–2 câu bạn nhớ được. Nhớ lại được bao nhiêu
        không quan trọng — chính việc cố nhớ mới làm kiến thức ở lại. Phần tóm
        tắt hiện ra ngay sau đó, và không ai chấm câu bạn viết.
      </p>
      <textarea
        value={chu}
        onChange={(e) => setChu(e.target.value)}
        rows={3}
        aria-label="Viết lại thứ bạn nhớ được từ bài này"
        placeholder="Bài này dạy…"
        className={styles.recapInput}
      />
      <button
        type="submit"
        disabled={!chu.trim()}
        className={styles.recapGo}
      >
        Xem tóm tắt
      </button>
    </form>
  );
}

export default function Recap({
  xpLabel,
  title,
  description,
  stats,
  facts,
  onFinish,
  extra,
  hoiTruoc,
  soSao,
}: RecapProps) {
  return (
    <div className={styles.recapRoot}>
      <span
        className={styles.recapXp}
      >
        <span aria-hidden="true">💎</span> {xpLabel} <span aria-hidden="true">✨</span>
      </span>
      <h2 className={styles.recapTitle}>{title}</h2>
      <p className={styles.recapDesc}>{description}</p>
      <div className={styles.recapStats} style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
        {stats.map((s, i) => (
          <div key={i} className={styles.recapStat}>
            <div className={styles.recapStatIcon} aria-hidden="true">{s.icon}</div>
            <div className={styles.recapStatValue}>{s.value}</div>
            <div className={styles.recapStatLabel}>{s.label}</div>
          </div>
        ))}
      </div>
      {soSao && soSao > 1 ? (
        <div className={styles.recapChom} aria-hidden="true">
          <i className={styles.recapChomNoi} />
          {Array.from({ length: Math.min(soSao, 24) }, (_, k) => (
            <i
              key={k}
              className={styles.recapSao}
              style={{ ['--tv-i' as string]: k } as React.CSSProperties}
            />
          ))}
        </div>
      ) : null}
      {hoiTruoc && !hoiTruoc.daViet ? (
        <OHoiTuong onNop={hoiTruoc.onNop} />
      ) : (
      <div className={styles.recapLeft}>
        <div className={styles.recapEyebrow}>
          <span aria-hidden="true">📖</span> KIẾN THỨC CỐT LÕI ĐÃ HỌC
        </div>
        {/* Danh sách thật: trình đọc màn hình báo được "3 mục" thay vì đọc liền
            một mạch ba đoạn văn không rõ ranh giới. */}
        <ul className={styles.recapFactList}>
          {facts.map((f, i) => (
            <li key={i} className={styles.recapFact}>
              <span aria-hidden="true" className={styles.recapTick}>✓</span>
              {/* withInlineCode, KHÔNG phải {f} trần: các ý chính ở đây lấy
                  từ đoạn văn của màn đọc, mà giáo trình 172 bài dùng backtick
                  dày đặc. Dựng trần thì học viên đọc ra cả dấu backtick —
                  ảnh người thử gửi ngày 27/10 chụp đúng dòng
                  `.venv\Scripts\python -m pip install numpy`. */}
              {/* BỌC trong MỘT <span>: <li> là flex (dấu ✓ + chữ), mà
                  withInlineCode trả về NHIỀU nút — mỗi đoạn chữ và mỗi <code>
                  thành một flex item riêng. Đo trên production (PY02, 390px):
                  ý chính vỡ thành cột, <code> rộng 19px xếp dọc từng ký tự,
                  một <li> cao 789px; 82/179 bài có ít nhất một ý như vậy.
                  Bọc lại thì đo được: <li> 460/203/789 → 180/180/270px, mép
                  phải <code> 519 → 358px. (`minWidth: 0` đã thử: không đổi số
                  nào — <code> nội tuyến tự xuống dòng nhờ overflow-wrap.) */}
              <span>{withInlineCode(f)}</span>
            </li>
          ))}
        </ul>
      </div>
      )}

      {extra}
      <button
        type="button"
        onClick={onFinish}
        className={styles.recapFinish}
      >
        Hoàn thành <span aria-hidden="true">✓</span>
      </button>
    </div>
  );
}
