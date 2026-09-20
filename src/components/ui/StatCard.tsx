import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

type Tone = 'primary' | 'teal' | 'danger' | 'warning' | 'success' | 'neutral';

const TONES: Record<Tone, { icon: string; bar: string; text: string }> = {
  primary: { icon: 'bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/30', bar: '#2563EB', text: 'text-[#2563EB]' },
  teal: { icon: 'bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/30', bar: '#0D9488', text: 'text-[#0D9488]' },
  danger: { icon: 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30', bar: '#EF4444', text: 'text-[#EF4444]' },
  warning: { icon: 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30', bar: '#F59E0B', text: 'text-[#F59E0B]' },
  success: { icon: 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30', bar: '#22C55E', text: 'text-[#22C55E]' },
  neutral: { icon: 'bg-[#111111] text-[#888888] border border-[#222222]', bar: '#333333', text: 'text-[#888888]' },
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
    <div
      className="editorial-card relative p-5 overflow-hidden flex flex-col justify-between"
      style={{
        borderLeft: `3px solid ${t.bar}`,
      }}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-mono font-medium uppercase tracking-[0.08em] text-[#888888]">
            {label}
          </span>
          <span className={`w-8 h-8 rounded-[2px] flex items-center justify-center ${t.icon}`}>
            {icon}
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-3xl sm:text-4xl font-semibold text-[#F5F5F5] leading-none tabular-nums tracking-tight">
            {value}
          </span>
          {delta !== null && delta !== undefined && (
            <span
              className={`inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums ${
                delta >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
              }`}
              title={deltaLabel}
            >
              {delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {Math.abs(delta)}%
            </span>
          )}
        </div>
      </div>

      {hint && (
        <p className="text-[11px] font-mono text-[#555555] mt-3 pt-2.5 border-t border-[#222222]">
          {hint}
        </p>
      )}
    </div>
  );
}
