import { Link } from 'react-router-dom';

export default function Logo({
  to = '/',
  size = 'md',
}: {
  to?: string;
  dark?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const textSize = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <Link to={to} className="flex items-center gap-2 group no-underline select-none" aria-label="CivicPulse home">
      <span className={`font-mono font-bold tracking-tight text-[#F5F5F5] group-hover:text-white transition-colors ${textSize}`}>
        CIVICPULSE<span className="text-[#2563EB]">°</span>
      </span>
      <span className="live-dot ml-0.5" />
    </Link>
  );
}
