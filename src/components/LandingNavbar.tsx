import { Link, useLocation } from 'react-router-dom';

export default function LandingNavbar() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const navItems = [
    { href: isLanding ? '#map' : '/#map', label: 'Map' },
    { href: isLanding ? '#trace' : '/#trace', label: 'Agent Trace' },
    { href: isLanding ? '#admin' : '/#admin', label: 'Admin' },
    { href: isLanding ? '#board' : '/#board', label: 'Leaderboard' },
    { href: '/about', label: 'About' },
  ];

  return (
    <nav className="bp-grid" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'clamp(16px,3vw,20px) clamp(20px,5vw,64px)',
      color: 'var(--paper)', position: 'relative', zIndex: 5,
      borderBottom: '1px solid var(--grid)',
    }}>
      {/* Brand */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <div style={{ width: 28, height: 28, flexShrink: 0 }}>
          <svg viewBox="0 0 30 30" fill="none" width="28" height="28">
            <circle cx="15" cy="15" r="13" stroke="var(--hazard)" strokeWidth="2"/>
            <circle cx="15" cy="15" r="3.2" fill="var(--hazard)"/>
            <path d="M15 2 L15 8 M15 22 L15 28 M2 15 L8 15 M22 15 L28 15" stroke="var(--hazard)" strokeWidth="1.6"/>
          </svg>
        </div>
        <span style={{
          fontFamily: "'Big Shoulders Display', sans-serif",
          fontWeight: 900, fontSize: '1.35rem',
          textTransform: 'uppercase', letterSpacing: '0.04em', color: 'white',
        }}>
          Civic<span style={{ color: 'var(--hazard)' }}>Pulse</span>
        </span>
      </Link>

      {/* Links */}
      <ul style={{
        display: 'flex', gap: 'clamp(14px,3vw,32px)', listStyle: 'none',
        margin: 0, padding: 0, fontSize: '0.875rem',
      }} className="landing-nav-links">
        {navItems.map(({ href, label }) => (
          <li key={href}>
            <a
              href={href}
              style={{ color: 'rgba(238,241,236,0.75)', textDecoration: 'none', transition: 'color .15s', fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(238,241,236,0.75)')}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link to="/report" className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>
        Report Issue
      </Link>
    </nav>
  );
}
