import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:brightness-110 shadow-[0_6px_16px_-6px_rgba(37,99,235,0.55)] hover:shadow-[0_10px_22px_-8px_rgba(37,99,235,0.6)]',
  secondary:
    'bg-card text-ink border border-line-strong hover:border-primary hover:text-primary hover:shadow-[0_6px_16px_-10px_rgba(37,99,235,0.4)]',
  ghost: 'text-ink hover:bg-subtle hover:text-primary',
  danger: 'bg-danger text-white hover:brightness-110 shadow-[0_6px_16px_-6px_rgba(239,68,68,0.55)]',
  'danger-outline': 'border border-danger/40 text-danger hover:bg-danger-soft',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-[0.8125rem] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-[0.9375rem] gap-2',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  to?: string;
  loading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const classes = [
    'inline-flex items-center justify-center rounded-xl font-semibold cursor-pointer transition-all duration-150 active:scale-[0.98] select-none whitespace-nowrap',
    'disabled:opacity-55 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(' ');

  const content = (
    <>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-disabled={disabled}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
