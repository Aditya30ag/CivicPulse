import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

type Tone = 'primary' | 'teal' | 'danger' | 'warning' | 'success' | 'neutral';

const TONES: Record<Tone, { icon: string; bar: string }> = {
  primary: { icon: 'bg-primary-soft text-primary', bar: 'bg-primary' },
  teal: { icon: 'bg-teal-soft text-teal-brand', bar: 'bg-teal-brand' },
  danger: { icon: 'bg-danger-soft text-danger', bar: 'bg-danger' },
  warning: { icon: 'bg-warning-soft text-warning', bar: 'bg-warning' },
  success: { icon: 'bg-success-soft text-success', bar: 'bg-success' },
  neutral: { icon: 'bg-subtle text-muted', bar: 'bg-line-strong' },
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: Tone;
  delta?: number | null;
  deltaLabel?: string;
}

export default function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'primary',
  delta = null,
  deltaLabel,
}: StatCardProps) {
  const t = TONES[tone];
  return (
    <div className="relative bg-card border border-line rounded-2xl shadow-card p-5 overflow-hidden group hover:shadow-pop transition-shadow duration-200">
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${t.bar}`} aria-hidden="true" />
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.icon}`}>{icon}</span>
        <span className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-ink leading-none tabular-nums">{value}</span>
        {delta !== null && delta !== undefined && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
              delta >= 0 ? 'text-success' : 'text-danger'
            }`}
            title={deltaLabel}
          >
            {delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-faint mt-1.5">{hint}</p>}
    </div>
  );
}
