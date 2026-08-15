import React from 'react';

const baseField =
  'w-full rounded-xl border border-line-strong bg-card px-4 py-2.5 text-sm text-ink placeholder:text-faint transition-all duration-150 ' +
  'focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10';

interface FieldWrapProps {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

function FieldWrap({ label, hint, error, children, htmlFor }: FieldWrapProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-[0.8125rem] font-semibold text-ink">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, hint, error, icon, id, className = '', ...props }: InputProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={id}>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none flex">
            {icon}
          </span>
        )}
        <input id={id} className={`${baseField} ${icon ? 'pl-10' : ''} ${className}`} {...props} />
      </div>
    </FieldWrap>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, id, className = '', ...props }: TextareaProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={id}>
      <textarea id={id} className={`${baseField} resize-y min-h-[110px] ${className}`} {...props} />
    </FieldWrap>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Select({ label, hint, error, id, className = '', children, ...props }: SelectProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} htmlFor={id}>
      <select
        id={id}
        className={`${baseField} appearance-none bg-no-repeat pr-10 cursor-pointer ${className}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
          backgroundPosition: 'right 0.85rem center',
          backgroundSize: '1rem',
        }}
        {...props}
      >
        {children}
      </select>
    </FieldWrap>
  );
}
