import React from 'react';
import styles from './lofi-ui.module.css';

export interface LofiFeedbackBannerProps {
  variant?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const LofiFeedbackBanner: React.FC<LofiFeedbackBannerProps> = ({
  variant = 'info',
  title,
  message,
  icon,
  action,
  className = '',
}) => {
  const variantClass = {
    success: styles.bannerSuccess,
    warning: styles.bannerWarning,
    error: styles.bannerError,
    info: styles.bannerInfo,
  }[variant];

  const defaultIcon = {
    success: '✓',
    warning: '⚠️',
    error: '✗',
    info: 'ℹ️',
  }[variant];

  return (
    <div className={`${styles.banner} ${variantClass} ${className}`} role="status">
      <div className={styles.bannerIcon} aria-hidden="true">
        {icon || defaultIcon}
      </div>
      <div className={styles.bannerContent}>
        {title && <div className={styles.bannerTitle}>{title}</div>}
        <div>{message}</div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
