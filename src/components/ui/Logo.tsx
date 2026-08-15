import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function Logo({ to = '/', dark = false, size = 'md' }: { to?: string; dark?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-lg' : 'text-xl';
  const iconSize = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';

  return (
    <Link to={to} className="flex items-center gap-2.5 group no-underline" aria-label="CivicPulse home">
      <span
        className={`${iconSize} rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-teal-brand shadow-[0_6px_16px_-6px_rgba(37,99,235,0.6)] transition-transform duration-200 group-hover:scale-105`}
      >
        <Activity className="w-[55%] h-[55%] text-white" strokeWidth={2.75} />
      </span>
      <span className={`${textSize} font-extrabold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
        Civic<span className="text-gradient">Pulse</span>
      </span>
    </Link>
  );
}
