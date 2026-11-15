'use client';

import React from 'react';
import styles from './lofi-ui.module.css';

export interface LofiPhoneMockupProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  showGlow?: boolean;
  showDecorations?: boolean;
  className?: string;
  screenClassName?: string;
}

export function LofiPhoneMockup({
  children,
  header,
  showGlow = true,
  showDecorations = true,
  className = '',
  screenClassName = '',
}: LofiPhoneMockupProps) {
  return (
    <div className={`${styles.phoneContainer} ${className}`.trim()}>
      {/* Vùng phát sáng môi trường (ambient breathing glow) */}
      {showGlow && <div className={styles.phoneGlow} aria-hidden="true" />}

      {/* Các hạt bụi sáng / đốm sao lơ lửng xung quanh điện thoại */}
      {showDecorations && (
        <div aria-hidden="true">
          <span className={`${styles.decorParticle} ${styles.particle1}`}>✦</span>
          <span className={`${styles.decorParticle} ${styles.particle2}`}>✧</span>
          <span className={`${styles.decorParticle} ${styles.particle3}`}>★</span>
          <span className={`${styles.decorParticle} ${styles.particle4}`}>✦</span>
        </div>
      )}

      {/* Thân máy điện thoại chuẩn tỷ lệ góc học */}
      <div className={styles.phoneBody}>
        {/* Khung máy vẽ tay gốc phủ lên trên */}
        <img
          className={styles.phoneFrameImg}
          src="/goc-hoc/items/page/phone-frame.webp"
          alt=""
          aria-hidden="true"
        />

        {/* Màn hình điện thoại lọt lòng khung viền */}
        <div className={`${styles.phoneScreen} ${screenClassName}`.trim()}>
          {header && <div className={styles.phoneHeader}>{header}</div>}
          <div className={styles.phoneContent}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export default LofiPhoneMockup;
