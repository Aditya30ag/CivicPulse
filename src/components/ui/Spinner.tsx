import React from 'react';

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export default function Spinner({ size = 24, className = '', label = 'Loading…' }: SpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`} role="status" aria-label={label}>
      <div
        className="rounded-full border-[3px] animate-spin"
        style={{
          width: size,
          height: size,
          borderColor: 'var(--line)',
          borderTopColor: 'var(--primary)',
        }}
      />
    </div>
  );
}
