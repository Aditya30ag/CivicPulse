import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padded?: boolean;
}

export default function Card({ hover = false, padded = true, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'bg-card border border-line rounded-2xl shadow-card',
        padded ? 'p-5 sm:p-6' : '',
        hover ? 'transition-all duration-200 hover:shadow-pop hover:-translate-y-0.5' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
