import React from 'react';
import { Check } from 'lucide-react';

export interface Step {
  id: string;
  label: string;
}

interface StepperProps {
  steps: Step[];
  current: number;
  onSelect?: (index: number) => void;
}

export default function Stepper({ steps, current, onSelect }: StepperProps) {
  return (
    <ol className="flex items-center w-full" aria-label="Progress">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <li className={`flex-1 h-0.5 mx-2 sm:mx-3 rounded-full transition-colors duration-300 ${done ? 'bg-primary' : 'bg-line'}`} aria-hidden="true" />
            )}
            <li className="flex flex-col items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onSelect?.(index)}
                disabled={!onSelect}
                aria-current={active ? 'step' : undefined}
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 border-2',
                  done
                    ? 'bg-primary border-primary text-white'
                    : active
                    ? 'bg-card border-primary text-primary shadow-[0_0_0_5px_rgba(37,99,235,0.12)]'
                    : 'bg-card border-line-strong text-faint',
                ].join(' ')}
              >
                {done ? <Check className="w-4 h-4" strokeWidth={3} /> : index + 1}
              </button>
              <span
                className={`text-[0.6875rem] font-semibold uppercase tracking-wide hidden sm:block whitespace-nowrap ${
                  active ? 'text-primary' : done ? 'text-ink' : 'text-faint'
                }`}
              >
                {step.label}
              </span>
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
}
