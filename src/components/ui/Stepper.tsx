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
    <ol className="flex items-center w-full font-mono" aria-label="Progress">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <li
                className={`flex-1 h-[2px] mx-2 sm:mx-3 transition-colors duration-300 ${
                  done ? 'bg-[#2563EB]' : 'bg-[#222222]'
                }`}
                aria-hidden="true"
              />
            )}
            <li className="flex flex-col items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onSelect?.(index)}
                disabled={!onSelect}
                aria-current={active ? 'step' : undefined}
                className={[
                  'w-8 h-8 rounded-[2px] flex items-center justify-center text-xs font-bold font-mono transition-all duration-200 border cursor-pointer',
                  done
                    ? 'bg-[#2563EB] border-[#2563EB] text-white'
                    : active
                    ? 'bg-[#161616] border-[#2563EB] text-[#2563EB] shadow-[0_0_0_4px_rgba(37,99,235,0.15)]'
                    : 'bg-[#111111] border-[#222222] text-[#555555]',
                ].join(' ')}
              >
                {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : (index + 1).toString().padStart(2, '0')}
              </button>
              <span
                className={`text-[10px] font-mono uppercase tracking-wider hidden sm:block whitespace-nowrap ${
                  active ? 'text-[#2563EB] font-bold' : done ? 'text-[#F5F5F5]' : 'text-[#555555]'
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
