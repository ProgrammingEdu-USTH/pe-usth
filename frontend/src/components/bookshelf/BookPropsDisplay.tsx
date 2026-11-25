import React from 'react';
import type { BookshelfSlug } from './bookshelf-catalog';
import styles from './bookshelf.module.css';

/** Biểu tượng vector SVG dùng chung cho 3 khoá trên gáy sách, thẻ và bìa sách. */
export function CourseEmblemIcon({
  slug,
  size = 24,
}: {
  slug: BookshelfSlug;
  size?: number;
}) {
  if (slug === 'python') {
    return (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="6" y="7" width="15" height="12" rx="5" fill="var(--bs-primary)" />
        <circle cx="11" cy="11.5" r="1.5" fill="var(--bs-ink)" />
        <rect x="15" y="17" width="15" height="12" rx="5" fill="var(--bs-accent)" />
        <circle cx="25" cy="24.5" r="1.5" fill="var(--bs-cover-deep)" />
      </svg>
    );
  }

  if (slug === 'sql') {
    return (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <ellipse cx="18" cy="10" rx="10" ry="3.8" fill="var(--bs-accent)" />
        <path
          d="M8 10v6c0 2.1 4.5 3.8 10 3.8s10-1.7 10-3.8v-6"
          fill="var(--bs-primary)"
          stroke="var(--bs-ink)"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
        <path
          d="M8 16v6c0 2.1 4.5 3.8 10 3.8s10-1.7 10-3.8v-6"
          fill="var(--bs-primary)"
          stroke="var(--bs-ink)"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
        <path
          d="M8 22v5c0 2.1 4.5 3.8 10 3.8s10-1.7 10-3.8v-5"
          fill="var(--bs-cover)"
          stroke="var(--bs-ink)"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <g stroke="var(--bs-accent)" strokeWidth="1.4" strokeOpacity="0.75">
        <line x1="9" y1="12" x2="18" y2="9" />
        <line x1="9" y1="12" x2="18" y2="18" />
        <line x1="9" y1="24" x2="18" y2="18" />
        <line x1="9" y1="24" x2="18" y2="27" />
        <line x1="18" y1="9" x2="27" y2="14" />
        <line x1="18" y1="18" x2="27" y2="14" />
        <line x1="18" y1="18" x2="27" y2="22" />
        <line x1="18" y1="27" x2="27" y2="22" />
      </g>
      <circle cx="9" cy="12" r="2.6" fill="var(--bs-ink)" />
      <circle cx="9" cy="24" r="2.6" fill="var(--bs-ink)" />
      <circle cx="18" cy="9" r="2.6" fill="var(--bs-accent)" />
      <circle cx="18" cy="18" r="2.8" fill="var(--bs-accent)" />
      <circle cx="18" cy="27" r="2.6" fill="var(--bs-accent)" />
      <circle cx="27" cy="14" r="2.6" fill="var(--bs-code-pink)" />
      <circle cx="27" cy="22" r="2.6" fill="var(--bs-code-pink)" />
    </svg>
  );
}

function ShelfPedestal({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.propShelfWrap}>
      <div className={styles.propSvgHolder}>{children}</div>
      <div className={styles.miniPlank} aria-hidden="true" />
      <div className={styles.propShelfCaption}>{caption}</div>
    </div>
  );
}

/**
 * Hiển thị 4 đồ vật đặc trưng đặt hai bên bìa sách (dựng bằng SVG + HTML/CSS thuần).
 */
export function BookPropsDisplay({
  slug,
  side,
}: {
  slug: BookshelfSlug;
  side: 'left' | 'right';
}) {
  if (slug === 'python') {
    if (side === 'left') {
      return (
        <div className={styles.propsColumn}>
          <div className={styles.propCard}>
            <div className={styles.propTermHeader}>
              <span className={styles.termDots} aria-hidden="true">
                <span className={styles.termDot1} />
                <span className={styles.termDot2} />
                <span className={styles.termDot3} />
              </span>
              <span>python3 — REPL</span>
            </div>
            <pre className={styles.propCode}>
              <span className={styles.codeAccent}>{'>>> '}</span>
              {'print("Xin chào")\n'}
              <span className={styles.codeOutput}>{'Xin chào\n'}</span>
              <span className={styles.codeAccent}>{'>>> '}</span>
              {'[x**2 for x in range(4)]\n'}
              <span className={styles.codeOutput}>{'[0, 1, 4, 9]'}</span>
            </pre>
          </div>

          <ShelfPedestal caption="Vịt cao su (debug)">
            <svg width="108" height="86" viewBox="0 0 108 86" fill="none" aria-hidden="true">
              <ellipse cx="48" cy="61" rx="30" ry="20" fill="var(--bs-accent)" />
              <circle cx="67" cy="31" r="16" fill="var(--bs-accent)" />
              <path d="M81 29l15 4-15 5v-9z" fill="var(--bs-code-pink)" />
              <circle cx="72" cy="28" r="2.6" fill="var(--bs-cover-deep)" />
              <path
                d="M32 58c8-7 22-7 30 0-4 8-18 11-30 0z"
                fill="var(--bs-paper)"
                fillOpacity="0.32"
              />
            </svg>
          </ShelfPedestal>
        </div>
      );
    }

    return (
      <div className={styles.propsColumn}>
        <div className={styles.propCard}>
          <p className={styles.libChipsTitle}>Thư viện đặc trưng</p>
          <div className={styles.libChipsGrid}>
            {['numpy', 'pandas', 'matplotlib', 'requests', 'flask', 'pytest'].map((lib) => (
              <span key={lib} className={styles.libChip}>
                {lib}
              </span>
            ))}
          </div>
          <pre className={styles.propCode}>
            <span className={styles.codeOutput}>pip install numpy pandas</span>
          </pre>
        </div>

        <ShelfPedestal caption="Rắn bông Python">
          <svg width="176" height="68" viewBox="0 0 176 68" fill="none" aria-hidden="true">
            <circle cx="24" cy="50" r="10" fill="var(--bs-code-green)" fillOpacity="0.72" />
            <circle cx="42" cy="43" r="11" fill="var(--bs-code-green)" fillOpacity="0.82" />
            <circle cx="60" cy="49" r="10.5" fill="var(--bs-code-green)" fillOpacity="0.75" />
            <circle cx="79" cy="42" r="11.5" fill="var(--bs-code-green)" fillOpacity="0.88" />
            <circle cx="99" cy="47" r="10.5" fill="var(--bs-code-green)" fillOpacity="0.78" />
            <circle cx="118" cy="38" r="11.5" fill="var(--bs-code-green)" fillOpacity="0.92" />
            <circle cx="137" cy="27" r="13.5" fill="var(--bs-code-green)" />
            <circle cx="143" cy="24" r="2.2" fill="var(--bs-cover-deep)" />
            <path d="M150 30h12l4-3m-4 3l4 3" stroke="var(--bs-code-pink)" strokeWidth="2" />
          </svg>
        </ShelfPedestal>
      </div>
    );
  }

  if (slug === 'sql') {
    if (side === 'left') {
      return (
        <div className={styles.propsColumn}>
          <div className={styles.propCard}>
            <p className={styles.libChipsTitle}>Bảng users</p>
            <table className={styles.sqlTable}>
              <thead>
                <tr>
                  <th>id</th>
                  <th>name</th>
                  <th>city</th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.sqlRowMatch}>
                  <td>1</td>
                  <td>An</td>
                  <td>Hà Nội</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>Bình</td>
                  <td>Huế</td>
                </tr>
                <tr className={styles.sqlRowMatch}>
                  <td>3</td>
                  <td>Chi</td>
                  <td>Hà Nội</td>
                </tr>
                <tr>
                  <td>4</td>
                  <td>Dũng</td>
                  <td>Đà Nẵng</td>
                </tr>
              </tbody>
            </table>
            <div className={styles.sqlTableFoot}>
              2 dòng khớp WHERE city = &apos;Hà Nội&apos;
            </div>
          </div>

          <ShelfPedestal caption="Tháp cơ sở dữ liệu">
            <svg width="110" height="84" viewBox="0 0 110 84" fill="none" aria-hidden="true">
              <ellipse cx="55" cy="20" rx="36" ry="8" fill="var(--bs-accent)" />
              <path d="M19 20v16c0 4.4 16.1 8 36 8s36-3.6 36-8V20" fill="var(--bs-primary)" />
              <path
                d="M19 36v17c0 4.4 16.1 8 36 8s36-3.6 36-8V36"
                fill="var(--bs-cover)"
                stroke="var(--bs-ink)"
                strokeOpacity="0.25"
              />
              <path
                d="M19 53v18c0 4.4 16.1 8 36 8s36-3.6 36-8V53"
                fill="var(--bs-cover-deep)"
                stroke="var(--bs-ink)"
                strokeOpacity="0.25"
              />
              <circle cx="80" cy="30" r="2.2" fill="var(--bs-code-green)" />
              <circle cx="80" cy="48" r="2.2" fill="var(--bs-code-green)" />
              <circle cx="80" cy="66" r="2.2" fill="var(--bs-code-green)" />
            </svg>
          </ShelfPedestal>
        </div>
      );
    }

    return (
      <div className={styles.propsColumn}>
        <div className={styles.sqlStickyNote}>
          <pre className={styles.sqlStickyPre}>
            {'SELECT name\nFROM users\nWHERE city = \'Hà Nội\'\nORDER BY id;'}
          </pre>
          <div className={styles.sqlStickyCap}>Truy vấn mẫu · Bài 3</div>
        </div>

        <ShelfPedestal caption="Chìa khoá chính (PK)">
          <svg width="142" height="72" viewBox="0 0 142 72" fill="none" aria-hidden="true">
            <circle
              cx="34"
              cy="40"
              r="18"
              stroke="var(--bs-accent)"
              strokeWidth="7"
              fill="var(--bs-cover-deep)"
            />
            <rect x="49" y="36" width="76" height="8" rx="4" fill="var(--bs-accent)" />
            <rect x="96" y="44" width="7" height="12" rx="2" fill="var(--bs-accent)" />
            <rect x="112" y="44" width="7" height="15" rx="2" fill="var(--bs-accent)" />
            <rect x="20" y="48" width="28" height="14" rx="4" fill="var(--bs-accent)" />
            <text
              x="34"
              y="58"
              textAnchor="middle"
              fontSize="9"
              fontWeight="800"
              fill="var(--bs-cta-ink)"
            >
              PK
            </text>
          </svg>
        </ShelfPedestal>
      </div>
    );
  }

  // Machine Learning
  if (side === 'left') {
    return (
      <div className={styles.propsColumn}>
        <div className={styles.propCard}>
          <p className={styles.libChipsTitle}>Hồi quy tuyến tính</p>
          <svg width="100%" height="96" viewBox="0 0 210 96" fill="none" aria-hidden="true">
            <line x1="16" y1="12" x2="16" y2="80" stroke="var(--bs-ink-muted)" strokeWidth="1.5" />
            <line x1="16" y1="80" x2="196" y2="80" stroke="var(--bs-ink-muted)" strokeWidth="1.5" />
            <line x1="22" y1="72" x2="190" y2="20" stroke="var(--bs-accent)" strokeWidth="2.4" />
            {[
              [34, 65],
              [52, 68],
              [66, 52],
              [84, 56],
              [102, 43],
              [120, 48],
              [138, 34],
              [154, 38],
              [172, 23],
            ].map(([cx, cy], idx) => (
              <circle key={idx} cx={cx} cy={cy} r="3.4" fill="var(--bs-code-blue)" />
            ))}
            <text
              x="190"
              y="92"
              textAnchor="end"
              fontSize="10"
              fill="var(--bs-ink-soft)"
              fontFamily="monospace"
            >
              y = 0.38x + 1.2
            </text>
          </svg>
        </div>

        <ShelfPedestal caption="Robot học máy">
          <svg width="100" height="86" viewBox="0 0 100 86" fill="none" aria-hidden="true">
            <line x1="50" y1="8" x2="50" y2="20" stroke="var(--bs-ink-soft)" strokeWidth="3" />
            <circle cx="50" cy="7" r="4" fill="var(--bs-accent)" />
            <rect x="26" y="18" width="48" height="28" rx="8" fill="var(--bs-primary)" />
            <rect x="33" y="25" width="34" height="14" rx="4" fill="var(--bs-cover-deep)" />
            <circle cx="42" cy="32" r="3" fill="var(--bs-accent)" />
            <circle cx="58" cy="32" r="3" fill="var(--bs-accent)" />
            <rect x="22" y="48" width="56" height="34" rx="8" fill="var(--bs-cover)" />
            <rect x="34" y="56" width="32" height="16" rx="4" fill="var(--bs-cover-deep)" />
            <rect x="39" y="62" width="4" height="7" fill="var(--bs-accent)" />
            <rect x="46" y="59" width="4" height="10" fill="var(--bs-accent)" />
            <rect x="53" y="61" width="4" height="8" fill="var(--bs-accent)" />
          </svg>
        </ShelfPedestal>
      </div>
    );
  }

  return (
    <div className={styles.propsColumn}>
      <div className={styles.propCard}>
        <p className={styles.libChipsTitle}>Mạng nơ-ron 3 · 4 · 2</p>
        <svg width="100%" height="96" viewBox="0 0 210 96" fill="none" aria-hidden="true">
          <g stroke="var(--bs-primary)" strokeWidth="1.2" strokeOpacity="0.65">
            {[20, 44, 68].map((y1) =>
              [14, 34, 54, 74].map((y2) => (
                <line key={`a-${y1}-${y2}`} x1="36" y1={y1} x2="105" y2={y2} />
              )),
            )}
            {[14, 34, 54, 74].map((y2) =>
              [30, 58].map((y3) => (
                <line key={`b-${y2}-${y3}`} x1="105" y1={y2} x2="174" y2={y3} />
              )),
            )}
          </g>
          {[20, 44, 68].map((y) => (
            <circle key={`i-${y}`} cx="36" cy={y} r="6" fill="var(--bs-code-blue)" />
          ))}
          {[14, 34, 54, 74].map((y) => (
            <circle key={`h-${y}`} cx="105" cy={y} r="6" fill="var(--bs-primary)" />
          ))}
          {[30, 58].map((y) => (
            <circle key={`o-${y}`} cx="174" cy={y} r="6.5" fill="var(--bs-accent)" />
          ))}
          <text x="36" y="90" textAnchor="middle" fontSize="9.5" fill="var(--bs-ink-soft)">
            Đầu vào
          </text>
          <text x="105" y="90" textAnchor="middle" fontSize="9.5" fill="var(--bs-ink-soft)">
            Ẩn
          </text>
          <text x="174" y="90" textAnchor="middle" fontSize="9.5" fill="var(--bs-ink-soft)">
            Đầu ra
          </text>
        </svg>
      </div>

      <ShelfPedestal caption="Hộp dữ liệu">
        <svg width="164" height="72" viewBox="0 0 164 72" fill="none" aria-hidden="true">
          <rect x="18" y="50" width="128" height="16" rx="4" fill="var(--bs-paper)" />
          <rect x="24" y="34" width="118" height="15" rx="4" fill="var(--bs-paper-card)" />
          <rect x="20" y="18" width="126" height="15" rx="4" fill="var(--bs-paper)" />
          <text x="32" y="29" fontSize="9.5" fontWeight="700" fill="var(--bs-paper-ink)" fontFamily="monospace">
            model.pkl
          </text>
          <text x="32" y="45" fontSize="9.5" fontWeight="700" fill="var(--bs-paper-ink)" fontFamily="monospace">
            test.csv
          </text>
          <text x="32" y="61" fontSize="9.5" fontWeight="700" fill="var(--bs-paper-ink)" fontFamily="monospace">
            train.csv
          </text>
        </svg>
      </ShelfPedestal>
    </div>
  );
}
