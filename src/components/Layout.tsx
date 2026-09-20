import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LayoutDashboard, PlusCircle, Trophy, User, Activity, LogOut, ChevronDown } from 'lucide-react';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useAuth } from '../contexts/AuthContext';
import Logo from './ui/Logo';
import ThemeToggle from './ui/ThemeToggle';

const NAV_ITEMS = [
  { label: 'DASHBOARD', path: '/home', icon: LayoutDashboard },
  { label: 'REPORT', path: '/report', icon: PlusCircle },
  { label: 'LEADERBOARD', path: '/leaderboard', icon: Trophy },
  { label: 'PROFILE', path: '/profile', icon: User },
  { label: 'ADMIN', path: '/admin', icon: Activity, adminOnly: true },
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
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-[#0A0A0A] text-[#F5F5F5] font-sans">
      {/* ── Top navbar (desktop / tablet) ── */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#222222]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden lg:flex items-center gap-2" aria-label="Primary">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-2 px-3 py-1.5 rounded-[2px] font-mono text-[11px] tracking-[0.1em] uppercase transition-all duration-150 no-underline',
                      isActive
                        ? 'bg-[#2563EB]/15 text-[#2563EB] border border-[#2563EB]/40 font-semibold'
                        : 'text-[#888888] hover:text-[#F5F5F5] hover:bg-[#161616] border border-transparent',
                    ].join(' ')
                  }
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-[2px] border border-[#222222] bg-[#161616] hover:border-[#333333] transition-colors cursor-pointer"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'Profile'} className="w-7 h-7 rounded-[2px] object-cover ring-1 ring-[#2563EB]/40" />
                  ) : (
                    <span className="w-7 h-7 rounded-[2px] bg-[#2563EB] text-white font-mono text-xs font-bold flex items-center justify-center">
                      {initials}
                    </span>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-[#888888] transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] w-64 bg-[#161616] border-2 border-[#222222] rounded-[4px] p-2 z-50 shadow-2xl"
                  >
                    <div className="px-3 py-2 border-b border-[#222222] mb-1.5 font-mono">
                      <p className="text-xs font-bold text-[#F5F5F5] truncate">{user.displayName || 'Citizen'}</p>
                      <p className="text-[10px] text-[#888888] truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-[2px] font-mono text-xs text-[#F5F5F5] hover:bg-[#222222] transition-colors no-underline"
                    >
                      <User className="w-3.5 h-3.5 text-[#888888]" /> MY PROFILE
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-[2px] font-mono text-xs text-[#F5F5F5] hover:bg-[#222222] transition-colors no-underline"
                      >
                        <Activity className="w-3.5 h-3.5 text-[#888888]" /> ADMIN DASHBOARD
                      </Link>
                    )}
                    <button
                      role="menuitem"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[2px] font-mono text-xs text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> SIGN OUT
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="editorial-btn-primary text-xs py-2 px-4">
                SIGN IN
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content with page transitions ── */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 relative bg-[#0A0A0A]">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-full"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-md border-t border-[#222222] pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile"
      >
        <div className="flex items-center justify-around h-14 px-2">
          {navItems.map((item) => {
            const isReport = item.path === '/report';
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center gap-0.5 flex-1 rounded-[2px] transition-colors no-underline font-mono text-[9px]',
                    isActive ? 'text-[#2563EB]' : 'text-[#888888]',
                  ].join(' ')
                }
              >
                {({ isActive }) =>
                  isReport ? (
                    <span className="flex flex-col items-center gap-0.5 -mt-4">
                      <span className="w-10 h-10 rounded-[2px] bg-[#2563EB] text-white flex items-center justify-center active:scale-95 transition-transform border border-[#2563EB]">
                        <item.icon className="w-4 h-4" strokeWidth={2.5} />
                      </span>
                      <span className="text-[9px] font-bold text-[#2563EB]">{item.label}</span>
                    </span>
                  ) : (
                    <>
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
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
