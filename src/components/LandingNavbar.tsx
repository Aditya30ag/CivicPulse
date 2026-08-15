import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import Logo from './ui/Logo';
import Button from './ui/Button';
import ThemeToggle from './ui/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

export default function LandingNavbar() {
  const location = useLocation();
  const { user } = useAuth();
  const isLanding = location.pathname === '/';

  const navItems = [
    { href: isLanding ? '#map' : '/#map', label: 'Map' },
    { href: isLanding ? '#features' : '/#features', label: 'Features' },
    { href: isLanding ? '#how' : '/#how', label: 'How it works' },
    { href: isLanding ? '#community' : '/#community', label: 'Community' },
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-line" style={{ borderColor: 'var(--nav-glass-border)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Logo />
        <nav className="hidden md:flex items-center gap-1" aria-label="Landing">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3.5 py-2 rounded-xl text-sm font-semibold text-muted hover:text-ink hover:bg-subtle transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Button to="/home" variant="secondary" size="sm">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Button>
          ) : (
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-xl text-sm font-semibold text-ink hover:bg-subtle transition-colors"
            >
              Sign in
            </Link>
          )}
          <Button to="/report" size="sm">
            Report Issue
          </Button>
        </div>
      </div>
    </header>
  );
}
