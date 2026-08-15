import React from 'react';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary';

const TONES: Record<Tone, string> = {
  neutral: 'bg-subtle text-muted',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  primary: 'bg-primary-soft text-primary',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
  dotColor?: string;
}

export default function Badge({ tone = 'neutral', dot = false, dotColor, className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${TONES[tone]} ${className}`}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor ?? 'currentColor' }} />}
      {children}
    </span>
  );
}
