import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, LogOut, Shield, BarChart3, User, PlusCircle, Layers } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) => `
    flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
    ${isActive(path) 
      ? 'bg-blue-50 text-blue-600 font-semibold' 
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
  `;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Navbar Container */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            
            {/* Logo Brand */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-200 group-hover:scale-105 transition-transform">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                CivicPulse
              </span>
            </Link>

            {/* Navigation & User Menu */}
            {user && (
              <>
                {/* Desktop Nav Items */}
                <nav className="hidden md:flex items-center gap-1.5">
                  <Link to="/" className={navLinkClass('/')}>
                    <Layers className="h-4 w-4" />
                    Issues
                  </Link>
                  <Link to="/report" className={navLinkClass('/report')}>
                    <PlusCircle className="h-4 w-4" />
                    Report Issue
                  </Link>
                  <Link to="/leaderboard" className={navLinkClass('/leaderboard')}>
                    <BarChart3 className="h-4 w-4" />
                    Leaderboard
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" className={navLinkClass('/admin')}>
                      <Shield className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  )}
                </nav>

                {/* Profile / Actions */}
                <div className="flex items-center gap-2.5">
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                      {user.email?.[0].toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[120px] truncate">
                      {user.displayName || 'Account'}
                    </span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition duration-150"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Responsive Wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {children}
      </main>

      {/* Bottom Sticky Mobile Navigation */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-3 py-2 flex justify-around items-center shadow-lg">
          <Link to="/" className={`flex flex-col items-center p-1.5 rounded-lg ${isActive('/') ? 'text-blue-600' : 'text-gray-500'}`}>
            <Layers className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5">Issues</span>
          </Link>
          <Link to="/report" className={`flex flex-col items-center p-1.5 rounded-lg ${isActive('/report') ? 'text-blue-600' : 'text-gray-500'}`}>
            <PlusCircle className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5">Report</span>
          </Link>
          <Link to="/leaderboard" className={`flex flex-col items-center p-1.5 rounded-lg ${isActive('/leaderboard') ? 'text-blue-600' : 'text-gray-500'}`}>
            <BarChart3 className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5">Rank</span>
          </Link>
          {user.role === 'admin' && (
            <Link to="/admin" className={`flex flex-col items-center p-1.5 rounded-lg ${isActive('/admin') ? 'text-blue-600' : 'text-gray-500'}`}>
              <Shield className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-0.5">Admin</span>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}