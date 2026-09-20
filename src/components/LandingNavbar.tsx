import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowUpRight } from 'lucide-react';
import Logo from './ui/Logo';
import ThemeToggle from './ui/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

export default function LandingNavbar() {
  const location = useLocation();
  const { user } = useAuth();
  const isLanding = location.pathname === '/';

  const navItems = [
    { href: isLanding ? '#map' : '/#map', label: 'MAP' },
    { href: isLanding ? '#features' : '/#features', label: 'FEATURES' },
    { href: isLanding ? '#how' : '/#how', label: 'WORKFLOW' },
    { href: isLanding ? '#community' : '/#community', label: 'COMMUNITY' },
    { href: '/faq', label: 'FAQ' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-md border-b-2 border-[#222222]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Logo />
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#161616] border border-[#262626] rounded-[2px] font-mono text-[0.625rem] text-white/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot" />
            <span>CIVIC·NET ONLINE</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1" aria-label="Landing">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 font-mono text-[0.6875rem] font-medium tracking-[0.1em] text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors rounded-[2px]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <Link
              to="/home"
              className="inline-flex items-center gap-2 px-3.5 py-2 font-mono text-[0.6875rem] uppercase tracking-wider font-semibold text-white bg-[#161616] hover:bg-[#222222] border border-[#333333] rounded-[2px] transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
              <span>DASHBOARD</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center justify-center h-8 px-3.5 font-mono text-[0.6875rem] tracking-wider uppercase font-semibold text-white/80 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-[#333333] rounded-[2px] transition-all"
            >
              SIGN IN
            </Link>
          )}
          <Link
            to="/report"
            className="inline-flex items-center gap-1.5 h-8 px-4 font-mono text-[0.6875rem] tracking-wider uppercase font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-[2px] shadow-sm transition-all"
          >
            REPORT <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </header>
  );
}

