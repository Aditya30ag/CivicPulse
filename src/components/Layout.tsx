import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LayoutDashboard, PlusCircle, Trophy, User, Activity, LogOut, ChevronDown } from 'lucide-react';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useAuth } from '../contexts/AuthContext';
import Logo from './ui/Logo';
import ThemeToggle from './ui/ThemeToggle';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/home', icon: LayoutDashboard },
  { label: 'Report', path: '/report', icon: PlusCircle },
  { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  { label: 'Profile', path: '/profile', icon: User },
  { label: 'Admin', path: '/admin', icon: Activity, adminOnly: true },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const initials = (user?.displayName || user?.email || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      {/* ── Top navbar (desktop / tablet) ── */}
      <header className="sticky top-0 z-50 glass border-b border-line" style={{ borderColor: 'var(--nav-glass-border)' }}>
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 no-underline',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:text-ink hover:bg-subtle',
                    ].join(' ')
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-subtle transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'Profile'} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/30" />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-teal-brand text-white text-sm font-bold flex items-center justify-center ring-2 ring-primary/30">
                      {initials}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-faint transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] w-64 bg-card border border-line rounded-2xl shadow-pop p-2 z-50"
                  >
                    <div className="px-3 py-2.5 border-b border-line mb-1.5">
                      <p className="text-sm font-bold text-ink truncate">{user.displayName || 'Citizen'}</p>
                      <p className="text-xs text-faint truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-ink hover:bg-subtle transition-colors no-underline"
                    >
                      <User className="w-4 h-4 text-muted" /> My Profile
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-ink hover:bg-subtle transition-colors no-underline"
                      >
                        <Activity className="w-4 h-4 text-muted" /> Admin Dashboard
                      </Link>
                    )}
                    <button
                      role="menuitem"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-danger-soft transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:brightness-110 transition-all">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content with page transitions ── */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 relative">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-full"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-line pb-[env(safe-area-inset-bottom)]"
        style={{ borderColor: 'var(--nav-glass-border)' }}
        aria-label="Mobile"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isReport = item.path === '/report';
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center gap-0.5 flex-1 rounded-xl transition-colors no-underline',
                    isActive ? 'text-primary' : 'text-faint',
                  ].join(' ')
                }
              >
                {({ isActive }) =>
                  isReport ? (
                    <span className="flex flex-col items-center gap-0.5 -mt-5">
                      <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-teal-brand text-white flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(37,99,235,0.6)] active:scale-95 transition-transform">
                        <item.icon className="w-5 h-5" strokeWidth={2.5} />
                      </span>
                      <span className="text-[10px] font-semibold">{item.label}</span>
                    </span>
                  ) : (
                    <>
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-semibold">{item.label}</span>
                    </>
                  )
                }
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
