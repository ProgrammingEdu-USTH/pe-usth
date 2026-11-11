import React from 'react';
import styles from './lofi-ui.module.css';

export interface LofiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'glass' | 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const LofiButton = React.forwardRef<HTMLButtonElement, LofiButtonProps>(
  (
    {
      variant = 'glass',
      size = 'md',
      iconOnly = false,
      loading = false,
      leftIcon,
      rightIcon,
      className = '',
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const variantClass = {
      glass: styles.btnGlass,
      primary: styles.btnPrimary,
      secondary: styles.btnSecondary,
      danger: styles.btnDanger,
      ghost: styles.btnGhost,
    }[variant];

    const sizeClass = {
      sm: styles.sizeSm,
      md: styles.sizeMd,
      lg: styles.sizeLg,
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${styles.btn} ${variantClass} ${sizeClass} ${iconOnly ? styles.iconOnly : ''} ${className}`}
        {...props}
      >
        {loading ? (
          <span className={styles.spinner} aria-hidden="true" />
        ) : (
          leftIcon && <span aria-hidden="true">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
      </button>
    );
  },
);

LofiButton.displayName = 'LofiButton';
