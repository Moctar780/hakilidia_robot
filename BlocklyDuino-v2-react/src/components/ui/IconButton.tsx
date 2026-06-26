import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './IconButton.css';

type Variant = 'default' | 'round' | 'danger' | 'help';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  active?: boolean;
  variant?: Variant;
};

export function IconButton({ icon, active = false, variant = 'default', className = '', ...rest }: Props) {
  const classes = [
    'icon-button',
    active && 'icon-button--active',
    variant !== 'default' && `icon-button--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} {...rest}>
      {icon}
    </button>
  );
}
