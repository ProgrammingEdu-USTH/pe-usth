'use client';

import React from 'react';
import styles from './lofi-ui.module.css';

export interface LofiInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  errorText?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
  containerClassName?: string;
}

export function LofiInput({
  label,
  errorText,
  helperText,
  leftIcon,
  rightAction,
  containerClassName = '',
  className = '',
  id,
  ...props
}: LofiInputProps) {
  const generatedId = React.useId();
  const inputId = id || (label ? `lofi-input-${generatedId}` : undefined);

  return (
    <div className={`${styles.inputGroup} ${containerClassName}`.trim()}>
      {label && (
        <label htmlFor={inputId} className={styles.inputLabel}>
          <span>{label}</span>
        </label>
      )}

      <div className={styles.inputWrapper}>
        {leftIcon && <span className={styles.inputIconLeft}>{leftIcon}</span>}

        <input
          id={inputId}
          className={[
            styles.inputField,
            errorText ? styles.inputFieldWithError : '',
            leftIcon ? styles.inputFieldHasLeftIcon : '',
            rightAction ? styles.inputFieldHasRightAction : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />

        {rightAction && <div className={styles.inputActionRight}>{rightAction}</div>}
      </div>

      {errorText && <span className={styles.inputErrorText}>{errorText}</span>}
      {!errorText && helperText && <span className={styles.inputHelperText}>{helperText}</span>}
    </div>
  );
}

export default LofiInput;
