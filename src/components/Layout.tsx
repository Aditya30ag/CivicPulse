import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, PlusCircle, Trophy, User, Activity, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Layout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { label: 'Home', path: '/', icon: <Home className="w-5 h-5 lg:w-4 lg:h-4" /> },
    { label: 'Report', path: '/report', icon: <PlusCircle className="w-5 h-5 lg:w-4 lg:h-4" /> },
    { label: 'Leaderboard', path: '/leaderboard', icon: <Trophy className="w-5 h-5 lg:w-4 lg:h-4" /> },
    { label: 'Profile', path: '/profile', icon: <User className="w-5 h-5 lg:w-4 lg:h-4" /> },
    { label: 'Admin', path: '/admin', icon: <Activity className="w-5 h-5 lg:w-4 lg:h-4" /> },
  ];

  return (
    <div className="h-[100dvh] bg-page flex flex-col font-sans overflow-hidden">
      {/* Mobile Theme Toggle */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
        className="lg:hidden fixed top-4 right-4 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border-subtle shadow-md text-dark"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Desktop Top Nav */}
      <nav className="hidden lg:flex items-center justify-between px-8 py-3.5 text-main sticky top-0 z-50 backdrop-blur-xl backdrop-saturate-150 bg-[var(--nav-glass-bg)] border-b border-[var(--nav-glass-border)] shadow-[0_1px_24px_rgba(24,30,21,0.08),inset_0_1px_0_var(--nav-glass-highlight)]">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Civic Pulse" className="h-9 w-auto" />
          <span className="text-xl font-bold tracking-tight">
            <span className="text-dark">Civic</span>{' '}
            <span className="text-mint">Pulse</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isReport = item.path === '/report';
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-5 py-1.5 rounded-full font-bold text-sm cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'bg-dark text-white shadow-sm'
                    : 'text-muted hover:text-dark hover:bg-gray-100 hover:shadow-sm'
                }`}
              >
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
                )}
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="ml-2 flex items-center justify-center w-9 h-9 rounded-full text-muted hover:text-mint transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-[72px] lg:pb-0 relative flex flex-col">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-3 left-3 right-3 bg-card/95 backdrop-blur-sm border border-border-subtle rounded-2xl shadow-lg shadow-black/5 flex justify-around items-end py-2 px-2 z-50 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isReport = item.path === '/report';

          if (isReport) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-end gap-1 w-16 h-16 transition-transform duration-200 active:scale-95"
              >
                <span className="flex items-center justify-center w-8 h-8 -mt-6 rounded-full bg-gradient-to-br from-mint to-[#0e9f7d] shadow-lg shadow-mint/30 ring-4 ring-card text-white">
                  {item.icon}
                </span>
                <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-mint' : 'text-muted'}`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-end gap-1 w-16 h-16 rounded-xl transition-all duration-200 ${
                isActive ? 'text-mint bg-mint/10 scale-105' : 'text-muted hover:text-dark'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}