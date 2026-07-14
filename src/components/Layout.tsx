import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, PlusCircle, Trophy, User, Activity } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/home', icon: <Home className="w-5 h-5 lg:w-4 lg:h-4" /> },
    { label: 'Report', path: '/report', icon: <PlusCircle className="w-5 h-5 lg:w-4 lg:h-4" /> },
    { label: 'Leaderboard', path: '/leaderboard', icon: <Trophy className="w-5 h-5 lg:w-4 lg:h-4" /> },
    { label: 'Profile', path: '/profile', icon: <User className="w-5 h-5 lg:w-4 lg:h-4" /> },
    { label: 'Admin', path: '/admin', icon: <Activity className="w-5 h-5 lg:w-4 lg:h-4" /> },
  ];

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ background: 'var(--paper)' }}>
      {/* Desktop Top Nav — Blueprint grid dark bar */}
      <nav
        className="hidden lg:flex items-center justify-between px-8 py-0 sticky top-0 z-50 bp-grid"
        style={{ borderBottom: '1px solid var(--grid)', minHeight: '56px' }}
      >
        {/* Wordmark */}
        <Link to="/" className="flex items-center gap-2.5 py-3 no-underline">
          <img src="/logo.svg" alt="Civic Pulse" className="h-8 w-auto opacity-90" />
          <span
            className="text-xl tracking-wider uppercase"
            style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 900,
              color: 'white',
              letterSpacing: '0.06em',
            }}
          >
            Civic<span style={{ color: 'var(--hazard)' }}>Pulse</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex items-center gap-2 px-4 py-1.5 text-sm font-semibold cursor-pointer transition-all duration-150 no-underline"
                style={{
                  borderRadius: '3px',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  background: isActive ? 'var(--hazard)' : 'transparent',
                  color: isActive ? 'var(--ink)' : 'rgba(238,241,236,0.7)',
                  margin: '8px 0',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = 'white';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = 'rgba(238,241,236,0.7)';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-[72px] lg:pb-0 relative flex flex-col">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 flex justify-around items-center py-2 px-1 z-50"
        style={{
          background: 'var(--ink)',
          borderTop: '1px solid var(--grid)',
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isReport = item.path === '/report';

          if (isReport) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-end gap-1 w-16 h-14 transition-transform duration-200 active:scale-95 no-underline"
              >
                <span
                  className="flex items-center justify-center w-9 h-9 -mt-4"
                  style={{
                    background: 'var(--hazard)',
                    color: 'var(--ink)',
                    borderRadius: '3px',
                    boxShadow: '3px 3px 0 rgba(0,0,0,0.3)',
                  }}
                >
                  {item.icon}
                </span>
                <span
                  className="text-[10px] font-semibold"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: isActive ? 'var(--hazard)' : 'rgba(238,241,236,0.5)',
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-end gap-1 w-16 h-14 transition-all duration-150 no-underline"
              style={{
                color: isActive ? 'var(--hazard)' : 'rgba(238,241,236,0.5)',
                background: isActive ? 'rgba(242,183,5,0.08)' : 'transparent',
                borderRadius: '3px',
              }}
            >
              {item.icon}
              <span
                className="text-[10px] font-medium"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}