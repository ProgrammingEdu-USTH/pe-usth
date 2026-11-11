import React from 'react';
import styles from './lofi-ui.module.css';

export interface LofiProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  valueText?: string;
  variant?: 'gradient' | 'amber' | 'ok';
  thick?: boolean;
  showPercentage?: boolean;
  className?: string;
}

export const LofiProgressBar: React.FC<LofiProgressBarProps> = ({
  value,
  max = 100,
  label,
  valueText,
  variant = 'gradient',
  thick = false,
  showPercentage = false,
  className = '',
}) => {
  const safeMax = Math.max(1, max);
  const percentage = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));

  const fillVariantClass = {
    gradient: styles.fillGradient,
    amber: styles.fillAmber,
    ok: styles.fillOk,
  }[variant];

  return (
    <div className={`${styles.progressWrap} ${className}`}>
      {(label || valueText || showPercentage) && (
        <div className={styles.progressLabelRow}>
          {label && <span>{label}</span>}
          <span>{valueText || (showPercentage ? `${percentage}%` : '')}</span>
        </div>
      )}
      <div
        className={`${styles.progressTrack} ${thick ? styles.progressTrackThick : ''}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
      >
        <div
          className={`${styles.progressFill} ${fillVariantClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
