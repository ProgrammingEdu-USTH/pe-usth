import React from 'react';
import styles from './lofi-ui.module.css';

export interface LofiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'paper';
  highlight?: boolean;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'section' | 'article';
}

export const LofiCard = React.forwardRef<HTMLDivElement, LofiCardProps>(
  (
    {
      variant = 'glass',
      highlight = false,
      interactive = false,
      padding = 'md',
      as = 'div',
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const Component = as;

    const variantClass = variant === 'paper' ? styles.cardPaper : styles.cardGlass;
    const paddingClass = {
      none: styles.padNone,
      sm: styles.padSm,
      md: styles.padMd,
      lg: styles.padLg,
    }[padding];

    const classes = [
      styles.card,
      variantClass,
      paddingClass,
      highlight ? styles.cardHighlight : '',
      interactive ? styles.cardInteractive : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <Component ref={ref} className={classes} {...props}>
        {children}
      </Component>
    );
  },
);

LofiCard.displayName = 'LofiCard';
