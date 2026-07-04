import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, PlusCircle, Trophy, User, Activity } from 'lucide-react';
import { useOffline } from '../contexts/OfflineContext';
import OfflineBanner from './OfflineBanner';

export default function Layout() {
  const location = useLocation();
  const { isOnline } = useOffline();

  const navItems = [
    { label: 'Home', path: '/', icon: <Home className="w-5 h-5 md:w-4 md:h-4" /> },
    { label: 'Report', path: '/report', icon: <PlusCircle className="w-5 h-5 md:w-4 md:h-4" /> },
    { label: 'Leaderboard', path: '/leaderboard', icon: <Trophy className="w-5 h-5 md:w-4 md:h-4" /> },
    { label: 'Profile', path: '/profile', icon: <User className="w-5 h-5 md:w-4 md:h-4" /> },
    { label: 'Admin', path: '/admin', icon: <Activity className="w-5 h-5 md:w-4 md:h-4" /> },
  ];

  return (
    <div className="h-[100dvh] bg-page flex flex-col font-sans overflow-hidden">
      {/* Desktop Top Nav */}
      <nav className="hidden md:flex items-center justify-between px-8 py-4 bg-card text-main sticky top-0 z-50 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight text-dark">Civic Pulse</span>
          <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
            isOnline ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-success' : 'bg-warning animate-pulse'}`}></span>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex gap-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 transition-colors border-b-2 py-1 ${
                location.pathname === item.path 
                  ? 'text-dark border-mint font-medium' 
                  : 'text-muted border-transparent hover:text-dark hover:border-border-subtle'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-[72px] md:pb-0 relative flex flex-col">
        <OfflineBanner />
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-card border-t border-border-subtle flex justify-around items-center py-2 z-50 px-2 pb-safe">
         {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 w-16 pt-1 pb-2 transition-colors ${
                  isActive ? 'text-mint' : 'text-muted hover:text-dark'
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
