import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  Droplets,
  Building2,
  Trash2,
  Lightbulb,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ── Animated counter hook ────────────────────────────────────────────── */
function AnimatedCounter({ to, suffix = '', duration = 2000 }: { to: number; suffix?: string; duration?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(Math.round(to * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ── Live Hero Feed Data ──────────────────────────────────────────────── */
interface LiveFeedItem {
  id: string;
  title: string;
  category: string;
  timeAgo: string;
  location: string;
  status: 'OPEN' | 'IN PROGRESS' | 'RESOLVED';
}

const INITIAL_LIVE_FEED: LiveFeedItem[] = [
  {
    id: 'ISS-4091',
    title: 'High-pressure water main rupture',
    category: 'WATER',
    timeAgo: '2m ago',
    location: 'Sector 14, Ring Road',
    status: 'OPEN',
  },
  {
    id: 'ISS-4090',
    title: 'Hazardous asphalt crater near school',
    category: 'ROADS',
    timeAgo: '9m ago',
    location: '12th Cross, Indiranagar',
    status: 'IN PROGRESS',
  },
  {
    id: 'ISS-4089',
    title: 'Traffic corridor lighting blackout',
    category: 'LIGHTING',
    timeAgo: '24m ago',
    location: 'Vikas Marg Underpass',
    status: 'OPEN',
  },
];

/* ── Grid Issues Data ─────────────────────────────────────────────────── */
interface GridIssue {
  id: string;
  title: string;
  address: string;
  category: string;
  timeAgo: string;
  status: 'OPEN' | 'IN PROGRESS' | 'RESOLVED';
  upvotes: number;
}

const INITIAL_GRID_ISSUES: GridIssue[] = [
  {
    id: 'CP-8102',
    title: 'Flooded arterial intersection blocking bus line',
    address: 'Outer Ring Rd, Near Metro Pillar 142',
    category: 'WATER',
    timeAgo: '14m ago',
    status: 'OPEN',
    upvotes: 42,
  },
  {
    id: 'CP-8098',
    title: 'Exposed high-voltage feeder junction box',
    address: 'Corner of 4th Main & 9th Cross',
    category: 'ELECTRICITY',
    timeAgo: '41m ago',
    status: 'IN PROGRESS',
    upvotes: 38,
  },
  {
    id: 'CP-8095',
    title: 'Major asphalt fissure spanning cycle track',
    address: 'Connaught Circus, Outer Circle Block B',
    category: 'ROADS',
    timeAgo: '1h ago',
    status: 'OPEN',
    upvotes: 19,
  },
  {
    id: 'CP-8089',
    title: 'Commercial waste obstruction across sidewalk',
    address: 'Market Yard Gate 3, Sector 22',
    category: 'SANITATION',
    timeAgo: '2h ago',
    status: 'RESOLVED',
    upvotes: 56,
  },
  {
    id: 'CP-8084',
    title: 'Cluster of 6 dead LED streetlights along flyover',
    address: 'Barapullah Flyover Eastbound ramp',
    category: 'LIGHTING',
    timeAgo: '3h ago',
    status: 'IN PROGRESS',
    upvotes: 27,
  },
  {
    id: 'CP-8077',
    title: 'Overgrown fallen bough blocking civic park gate',
    address: 'Nehru Children Park, Gate 2',
    category: 'PARKS',
    timeAgo: '4h ago',
    status: 'RESOLVED',
    upvotes: 31,
  },
];

/* ── Map Interactive Pins Data ────────────────────────────────────────── */
interface MapPinItem {
  id: string;
  x: number;
  y: number;
  category: 'ROADS' | 'WATER' | 'SANITATION' | 'LIGHTING' | 'ELECTRICITY' | 'PARKS';
  title: string;
  location: string;
  distance: string;
  status: 'OPEN' | 'IN PROGRESS' | 'RESOLVED';
}

const MAP_PIN_ITEMS: MapPinItem[] = [
  {
    id: 'PIN-1',
    x: 28,
    y: 36,
    category: 'ROADS',
    title: 'Deep structural pothole on left transit lane',
    location: 'MG Road, Ward 12',
    distance: '0.3 km away',
    status: 'OPEN',
  },
  {
    id: 'PIN-2',
    x: 64,
    y: 28,
    category: 'WATER',
    title: 'Municipal valve overflow pooling on sidewalk',
    location: 'Brigade Rd Junction',
    distance: '0.8 km away',
    status: 'IN PROGRESS',
  },
  {
    id: 'PIN-3',
    x: 46,
    y: 62,
    category: 'LIGHTING',
    title: 'Sodium lamp flickering and dark zone',
    location: 'Residency Road',
    distance: '1.2 km away',
    status: 'OPEN',
  },
  {
    id: 'PIN-4',
    x: 78,
    y: 72,
    category: 'SANITATION',
    title: 'Overflowing segregation bin behind market',
    location: 'Commercial Street',
    distance: '1.6 km away',
    status: 'RESOLVED',
  },
  {
    id: 'PIN-5',
    x: 22,
    y: 78,
    category: 'ELECTRICITY',
    title: 'Overhead cable sagging across vehicle lane',
    location: 'Richmond Circle',
    distance: '2.1 km away',
    status: 'IN PROGRESS',
  },
  {
    id: 'PIN-6',
    x: 82,
    y: 38,
    category: 'PARKS',
    title: 'Broken swing fixture and loose chain',
    location: 'Cubbon Park South Gate',
    distance: '2.4 km away',
    status: 'RESOLVED',
  },
];

/* ── Department Data ──────────────────────────────────────────────────── */
const DEPARTMENTS = [
  {
    icon: Droplets,
    name: 'Water Supply & Sewerage Board',
    code: 'DJB · WSSB',
    activeIssues: 142,
    avgResponse: '18h',
    slaCompliance: '94%',
  },
  {
    icon: ShieldAlert,
    name: 'Public Works & Road Infrastructure',
    code: 'PWD · ROADS',
    activeIssues: 289,
    avgResponse: '36h',
    slaCompliance: '88%',
  },
  {
    icon: Lightbulb,
    name: 'Electrical & Street Illumination',
    code: 'BESCOM · LIGHT',
    activeIssues: 94,
    avgResponse: '12h',
    slaCompliance: '97%',
  },
  {
    icon: Trash2,
    name: 'Solid Waste Management & Sanitation',
    code: 'SWM · HEALTH',
    activeIssues: 204,
    avgResponse: '8h',
    slaCompliance: '96%',
  },
  {
    icon: Layers,
    name: 'Urban Forestry & Parks Division',
    code: 'HORT · GREENS',
    activeIssues: 68,
    avgResponse: '24h',
    slaCompliance: '91%',
  },
  {
    icon: Building2,
    name: 'Building Safety & Encroachment Cell',
    code: 'BBMP · ZONE-A',
    activeIssues: 53,
    avgResponse: '48h',
    slaCompliance: '85%',
  },
];

/* ── Testimonials Data ────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote:
      'I photographed a ruptured pipe at 7:15 AM on my way to work. By 11:30 AM the repair team was on site with an automated work order. No bureaucrat ever asked for a written form.',
    author: 'Aditi Deshmukh',
    ward: 'Resident · Ward 41, South Zone',
    badge: 'VERIFIED CITIZEN',
  },
  {
    quote:
      'Duplicate reports used to clog our municipal control room with 15 tickets for the same pothole. CivicPulse merges them into one geofenced issue with unified routing.',
    author: 'Rajeev Singhania',
    ward: 'Executive Engineer · Municipal Corp Zone 03',
    badge: 'PUBLIC WORKS',
  },
  {
    quote:
      'The transparency is shocking in the best way. Every neighbor who upvoted received an automated alert when the asphalt crew poured and closed the ticket.',
    author: 'Vikram Menon',
    ward: 'Neighborhood Association President · Sector 18',
    badge: 'COMMUNITY LEAD',
  },
  {
    quote:
      'CivicPulse turned our district from passive complainers into an active civic sensor network. The heatmaps clearly show where the drainage budget is needed most.',
    author: 'Sumantha Banerjee',
    ward: 'Urban Planning Researcher · Center for Civic Equity',
    badge: 'URBAN POLICY',
  },
];

export default function Landing() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>(INITIAL_LIVE_FEED);
  const [gridIssues, setGridIssues] = useState<GridIssue[]>(INITIAL_GRID_ISSUES);
  const [upvotedSet, setUpvotedSet] = useState<Record<string, boolean>>({ 'CP-8102': true });
  const [activeStep, setActiveStep] = useState(0);

  // Map state
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPinId, setSelectedPinId] = useState<string>('PIN-1');

  // Scroll listener for minimal sticky navigation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Subtle real-time simulation for live feed
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveFeed((prev) => {
        const categories = ['WATER', 'ROADS', 'LIGHTING', 'SANITATION', 'ELECTRICITY'];
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const newIssue: LiveFeedItem = {
          id: `ISS-${Math.floor(4100 + Math.random() * 900)}`,
          title:
            randomCat === 'WATER'
              ? 'Low pressure supply line failure'
              : randomCat === 'ROADS'
                ? 'Missing manhole cover on cycle track'
                : randomCat === 'LIGHTING'
                  ? 'Flickering high-mast lamp'
                  : randomCat === 'SANITATION'
                    ? 'Uncollected commercial debris'
                    : 'Faulty feeder transformer spark',
          category: randomCat,
          timeAgo: 'Just now',
          location: `Ward ${Math.floor(1 + Math.random() * 45)}, Main Road`,
          status: 'OPEN',
        };
        return [newIssue, prev[0], prev[1]];
      });
    }, 18000);
    return () => clearInterval(interval);
  }, []);

  // Step connecting animation cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Handle upvote toggle
  const toggleUpvote = (id: string) => {
    setUpvotedSet((prev) => {
      const isCurrentlyUpvoted = !!prev[id];
      const nextState = !isCurrentlyUpvoted;
      setGridIssues((issues) =>
        issues.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              upvotes: nextState ? item.upvotes + 1 : item.upvotes - 1,
            };
          }
          return item;
        })
      );
      return { ...prev, [id]: nextState };
    });
  };

  // Filtered map pins
  const filteredPins = useMemo(() => {
    if (selectedCategory === 'ALL') return MAP_PIN_ITEMS;
    return MAP_PIN_ITEMS.filter((pin) => pin.category === selectedCategory);
  }, [selectedCategory]);

  const activeSelectedPin = useMemo(() => {
    return MAP_PIN_ITEMS.find((p) => p.id === selectedPinId) || MAP_PIN_ITEMS[0];
  }, [selectedPinId]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] font-sans selection:bg-[#2563EB]/30 selection:text-[#F5F5F5]">
      {/* ══════════════════════════════════════════════════════════════════
          1. NAVIGATION BAR
          Sticky, ultra-minimal: logo left, nav links center, CTA right
          Transparent until scroll → rgba(10,10,10,0.85) + backdrop blur
      ══════════════════════════════════════════════════════════════════ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0A0A0A]/85 backdrop-blur-md border-b border-[#222222] py-3'
            : 'bg-transparent border-b border-transparent py-5'
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 flex items-center justify-between">
          {/* Logo with live green dot */}
          <Link to="/" className="flex items-center gap-3 no-underline group" aria-label="CivicPulse Home">
            <span className="font-mono text-base font-bold tracking-tight text-[#F5F5F5] group-hover:text-white transition-colors">
              CIVICPULSE<span className="text-[#2563EB]">°</span>
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#222222] bg-[#111111]/80 text-[10px] font-mono text-[#888888] tracking-widest uppercase">
              <span className="live-dot" />
              LIVE
            </span>
          </Link>

          {/* Centered navigation links */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main Navigation">
            {[
              { label: 'ISSUES', href: '#issues' },
              { label: 'MAP', href: '#map' },
              { label: 'DEPARTMENTS', href: '#departments' },
              { label: 'ABOUT', href: '#about' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[11px] font-mono tracking-[0.1em] text-[#888888] hover:text-[#F5F5F5] transition-colors duration-200 no-underline"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                to="/home"
                className="text-[11px] font-mono tracking-[0.08em] text-[#888888] hover:text-[#F5F5F5] transition-colors no-underline hidden sm:inline-block"
              >
                DASHBOARD
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-[11px] font-mono tracking-[0.08em] text-[#888888] hover:text-[#F5F5F5] transition-colors no-underline hidden sm:inline-block"
              >
                SIGN IN
              </Link>
            )}
            <Link to="/report" className="editorial-btn-cta-nav">
              REPORT ISSUE →
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          2. HERO SECTION
          Full viewport height (100vh), left-aligned, display serif, 2 CTAs,
          right live feed card, bottom infinite marquee ticker
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen pt-32 pb-16 flex flex-col justify-between overflow-hidden border-b border-[#222222]">
        {/* Subtle radial glow in background */}
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] pointer-events-none opacity-40 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.18) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 w-full flex-1 flex flex-col justify-center">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center py-12">
            {/* Left Content */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-[11px] font-mono tracking-[0.08em] uppercase text-[#888888] px-2.5 py-1 border border-[#222222] bg-[#111111] rounded-[2px]">
                  © CIVIC PLATFORM · NEW DELHI / NCR
                </span>
              </div>

              <h1 className="font-serif text-5xl sm:text-6xl lg:text-[76px] font-normal leading-[0.98] tracking-[-0.02em] text-[#F5F5F5]">
                Your Voice.
                <br />
                Your City.
              </h1>
              <div className="font-mono text-2xl sm:text-3xl lg:text-4xl text-[#2563EB] mt-3 font-medium tracking-tight">
                Your Impact.
              </div>

              <p className="mt-6 text-base sm:text-lg text-[#888888] max-w-xl font-sans leading-relaxed">
                Autonomous civic response platform converting citizen reports into verified city action with AI perception,
                duplicate suppression, and instant departmental dispatch.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/report" className="editorial-btn-primary">
                  REPORT AN ISSUE →
                </Link>
                <a href="#map" className="editorial-btn-secondary">
                  VIEW LIVE MAP
                </a>
              </div>
            </div>

            {/* Right Side: Animated Live Feed Card */}
            <div className="lg:col-span-5 flex justify-end">
              <div className="w-full max-w-md editorial-card p-6 border-2 border-[#222222] bg-[#111111] relative">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#222222] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <span className="text-xs font-mono font-medium tracking-wider text-[#F5F5F5] uppercase">
                      INCOMING DISPATCH FEED
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#555555]">AUTO-SYNC 10s</span>
                </div>

                {/* Feed Items list */}
                <div className="space-y-3.5">
                  {liveFeed.map((item, idx) => (
                    <div
                      key={item.id + idx}
                      className="p-3 bg-[#161616] border border-[#222222] rounded-[2px] transition-all duration-200 hover:border-[#333333]"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                        <span className="text-[#2563EB] font-medium tracking-wider">[{item.category}]</span>
                        <span className="text-[#555555]">{item.timeAgo}</span>
                      </div>
                      <p className="text-sm font-semibold text-[#F5F5F5] leading-snug line-clamp-1">{item.title}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#222222]/60 text-[11px]">
                        <span className="text-[#888888] font-mono text-[10px] truncate max-w-[180px]">
                          📍 {item.location}
                        </span>
                        <span
                          className={
                            item.status === 'RESOLVED'
                              ? 'status-badge-resolved'
                              : item.status === 'IN PROGRESS'
                                ? 'status-badge-progress'
                                : 'status-badge-open'
                          }
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-[#222222] flex items-center justify-between text-[11px] font-mono text-[#555555]">
                  <span>AI Perception: Online</span>
                  <Link to="/home" className="text-[#2563EB] hover:underline flex items-center gap-1">
                    Feed inspect <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Hero Marquee Ticker */}
        <div className="w-full border-t border-[#222222] bg-[#111111]/80 py-3.5 overflow-hidden">
          <div className="editorial-marquee">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center shrink-0">
                {[
                  '1,240 ISSUES REPORTED',
                  '83% RESOLVED',
                  '12 DEPARTMENTS',
                  '4 CITIES ACTIVE',
                  'AI DEDUPLICATION AT 99.4%',
                  'SUB-48H AVERAGE DISPATCH',
                  '38 WARDS REAL-TIME SYNCED',
                ].map((stat, i) => (
                  <span key={i} className="flex items-center gap-4 px-8 text-xs font-mono text-[#888888] tracking-[0.08em]">
                    <span className="text-[#2563EB]">●</span>
                    {stat}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          3. LIVE ISSUES GRID ("WHAT'S HAPPENING NOW")
          Section label "01 — LIVE ISSUES", serif heading, 3 columns desktop,
          3px left border, category pill, address, status line, upvote counter
      ══════════════════════════════════════════════════════════════════ */}
      <section id="issues" className="py-24 lg:py-28 max-w-[1200px] mx-auto px-6 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-mono tracking-[0.08em] text-[#555555] uppercase block mb-3">
              01 — LIVE ISSUES
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-[48px] font-normal leading-tight text-[#F5F5F5] tracking-[-0.02em]">
              Issues your neighbors reported today.
            </h2>
          </div>
          <Link
            to="/home"
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.08em] text-[#2563EB] hover:text-white transition-colors pb-1 border-b border-[#2563EB]/40 hover:border-white shrink-0"
          >
            VIEW ALL ISSUES →
          </Link>
        </div>

        {/* 3 Columns Desktop / 1 Column Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridIssues.map((issue) => {
            const isUpvoted = !!upvotedSet[issue.id];
            const borderLeftColor =
              issue.status === 'RESOLVED'
                ? '#22C55E'
                : issue.status === 'IN PROGRESS'
                  ? '#F59E0B'
                  : '#EF4444';

            return (
              <div
                key={issue.id}
                className="editorial-card p-6 flex flex-col justify-between relative overflow-hidden"
                style={{
                  borderLeft: `3px solid ${borderLeftColor}`,
                }}
              >
                <div>
                  {/* Category pill + time ago */}
                  <div className="flex items-center justify-between text-xs font-mono mb-3">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#111111] border border-[#222222] rounded-[2px] text-[#F5F5F5]">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: borderLeftColor }}
                      />
                      [{issue.category}]
                    </span>
                    <span className="text-[#888888] text-[11px]">{issue.timeAgo}</span>
                  </div>

                  {/* Title & Address */}
                  <h3 className="text-lg sm:text-xl font-bold text-[#F5F5F5] leading-snug mb-2 hover:text-[#2563EB] transition-colors">
                    <Link to={`/home`} className="no-underline text-inherit">
                      {issue.title}
                    </Link>
                  </h3>
                  <p className="text-xs text-[#888888] font-sans flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#555555] shrink-0" />
                    {issue.address}
                  </p>
                </div>

                {/* Bottom status bar + upvote count */}
                <div className="mt-6 pt-4 border-t border-[#222222] flex items-center justify-between">
                  <span
                    className={
                      issue.status === 'RESOLVED'
                        ? 'status-badge-resolved'
                        : issue.status === 'IN PROGRESS'
                          ? 'status-badge-progress'
                          : 'status-badge-open'
                    }
                  >
                    {issue.status}
                  </span>

                  <button
                    onClick={() => toggleUpvote(issue.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] font-mono text-xs transition-colors ${
                      isUpvoted
                        ? 'bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/50'
                        : 'bg-[#111111] text-[#888888] border border-[#222222] hover:text-[#F5F5F5] hover:border-[#333333]'
                    }`}
                    title={isUpvoted ? 'Remove upvote' : 'Upvote this issue'}
                    aria-label={`Upvote issue, current ${issue.upvotes}`}
                  >
                    <span>▲</span>
                    <span>{issue.upvotes}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          4. STATS / IMPACT SECTION
          Dark section with blue accent glow radial gradient, 4 horizontal
          counters in JetBrains Mono 64px, uppercase labels in 11px color #555
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-24 lg:py-28 border-y border-[#222222] bg-[#0E0E0E] overflow-hidden">
        {/* Full-width blue line divider leading in */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#2563EB] to-transparent opacity-60" />

        {/* Radial blue glow in background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.16) 0%, transparent 65%)',
          }}
          aria-hidden="true"
        />

        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 relative z-10">
          <div className="text-center mb-12">
            <span className="text-xs font-mono tracking-[0.08em] text-[#555555] uppercase block mb-2">
              CITY IMPACT °
            </span>
            <p className="text-sm font-sans text-[#888888]">Measurable improvements across participating municipal wards</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 text-center">
            {/* Counter 1 */}
            <div className="p-4">
              <div className="font-mono text-4xl sm:text-5xl lg:text-[64px] font-semibold text-[#F5F5F5] leading-none mb-3">
                <AnimatedCounter to={2400} suffix="+" />
              </div>
              <p className="text-[11px] font-mono tracking-[0.08em] text-[#555555] uppercase">
                Issues Reported
              </p>
            </div>

            {/* Counter 2 */}
            <div className="p-4">
              <div className="font-mono text-4xl sm:text-5xl lg:text-[64px] font-semibold text-[#F5F5F5] leading-none mb-3">
                <AnimatedCounter to={87} suffix="%" />
              </div>
              <p className="text-[11px] font-mono tracking-[0.08em] text-[#555555] uppercase">
                Resolved Rate
              </p>
            </div>

            {/* Counter 3 */}
            <div className="p-4">
              <div className="font-mono text-4xl sm:text-5xl lg:text-[64px] font-semibold text-[#F5F5F5] leading-none mb-3">
                <AnimatedCounter to={14} />
              </div>
              <p className="text-[11px] font-mono tracking-[0.08em] text-[#555555] uppercase">
                Depts. Covered
              </p>
            </div>

            {/* Counter 4 */}
            <div className="p-4">
              <div className="font-mono text-4xl sm:text-5xl lg:text-[64px] font-semibold text-[#F5F5F5] leading-none mb-3">
                <AnimatedCounter to={48} suffix="h" />
              </div>
              <p className="text-[11px] font-mono tracking-[0.08em] text-[#555555] uppercase">
                Avg. Response Time
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          5. HOW IT WORKS (PROCESS SECTION)
          Section label "02 — PROCESS", serif heading "Report. Track. Resolve.",
          3 horizontal steps with connecting line turning to solid blue
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-28 max-w-[1200px] mx-auto px-6 sm:px-8">
        <div className="mb-16">
          <span className="text-xs font-mono tracking-[0.08em] text-[#555555] uppercase block mb-3">
            02 — PROCESS
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-[48px] font-normal leading-tight text-[#F5F5F5] tracking-[-0.02em]">
            Report. Track. <span className="text-[#22C55E]">Resolve.</span>
          </h2>
          <p className="mt-3 text-[#888888] text-base max-w-xl font-sans">
            How CivicPulse eliminates bureaucratic delays with autonomous machine triage and transparent dispatch.
          </p>
        </div>

        <div className="relative">
          {/* Connecting line between steps */}
          <div className="hidden lg:block absolute top-[28px] left-[10%] right-[10%] h-[2px] border-t-2 border-dashed border-[#222222] z-0" />
          <div
            className="hidden lg:block absolute top-[28px] left-[10%] h-[2px] bg-[#2563EB] transition-all duration-700 z-0"
            style={{
              width: activeStep === 0 ? '0%' : activeStep === 1 ? '40%' : '80%',
            }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            {[
              {
                num: '01',
                title: 'Submit your issue with photo + location',
                desc: 'Capture the problem on camera. GPS metadata and AI perception extract damage category, urgency score, and exact address.',
              },
              {
                num: '02',
                title: 'AI routes it to the right department instantly',
                desc: 'Perception model merges duplicate nearby complaints within 100m and automatically dispatches a prioritized ticket to the municipal team.',
              },
              {
                num: '03',
                title: 'Track progress in real time until resolved',
                desc: 'Subscribe to push updates on status changes, work orders, field inspections, and photo verification of resolved work.',
              },
            ].map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <div
                  key={step.num}
                  onClick={() => setActiveStep(idx)}
                  className={`editorial-card p-8 cursor-pointer transition-all duration-300 ${
                    isActive ? 'border-[#2563EB] bg-[#161616]' : 'border-[#222222] bg-[#111111]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <span
                      className={`font-mono text-4xl lg:text-5xl font-bold transition-colors ${
                        isActive ? 'text-[#2563EB]' : 'text-[#333333]'
                      }`}
                    >
                      {step.num}
                    </span>
                    <span
                      className={`w-3 h-3 rounded-full border-2 transition-colors ${
                        isActive ? 'bg-[#2563EB] border-[#2563EB]' : 'bg-[#111111] border-[#333333]'
                      }`}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-[#F5F5F5] mb-3 leading-snug">{step.title}</h3>
                  <p className="text-sm text-[#888888] leading-relaxed font-sans">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          6. MAP / LOCATION PREVIEW
          Section label "03 — CITY MAP", breaks out of max-width, full height map,
          interactive pins, category filter chips, 5 nearby issues with distance
      ══════════════════════════════════════════════════════════════════ */}
      <section id="map" className="py-20 lg:py-28 border-y border-[#222222] bg-[#0E0E0E]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-mono tracking-[0.08em] text-[#555555] uppercase block mb-3">
                03 — CITY MAP
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[48px] font-normal leading-tight text-[#F5F5F5] tracking-[-0.02em]">
                Live spatial pulse of reported zones.
              </h2>
            </div>
            <Link to="/home" className="editorial-btn-secondary">
              OPEN FULL MAP →
            </Link>
          </div>

          {/* Breakout Map Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Interactive Graphic Map Canvas */}
            <div className="lg:col-span-8 editorial-card p-0 overflow-hidden relative min-h-[460px] bg-[#111111] flex flex-col">
              {/* Map header bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#222222] bg-[#161616]/90 z-20">
                <div className="flex items-center gap-2">
                  <span className="live-dot" />
                  <span className="text-xs font-mono uppercase text-[#F5F5F5] font-semibold">
                    METROPOLITAN CLUSTER GRID
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-[#888888]">
                  <span>28.6139° N</span>
                  <span>77.2090° E</span>
                  <span className="px-1.5 py-0.5 border border-[#222222] bg-[#111111] text-[#22C55E]">
                    LIVE SYNC
                  </span>
                </div>
              </div>

              {/* Map Canvas with SVG Grid, Roads & Clustered Pins */}
              <div className="relative flex-1 bg-[#0A0A0A] overflow-hidden min-h-[400px]">
                {/* SVG Blueprint lines */}
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#222222" strokeWidth="0.75" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                  {/* Stylized road corridors */}
                  <path
                    d="M-20 180 Q 200 120 420 190 T 900 150"
                    stroke="#222222"
                    strokeWidth="10"
                    fill="none"
                  />
                  <path
                    d="M280 -20 Q 320 220 260 500"
                    stroke="#222222"
                    strokeWidth="8"
                    fill="none"
                  />
                  <path
                    d="M-10 320 Q 340 280 750 360"
                    stroke="#1C1C1C"
                    strokeWidth="6"
                    fill="none"
                  />
                  <path
                    d="M580 -20 Q 540 260 620 500"
                    stroke="#1C1C1C"
                    strokeWidth="6"
                    fill="none"
                  />
                </svg>

                {/* Clustered Interactive Map Pins */}
                {filteredPins.map((pin) => {
                  const isSelected = selectedPinId === pin.id;
                  const pinColor =
                    pin.status === 'RESOLVED'
                      ? '#22C55E'
                      : pin.status === 'IN PROGRESS'
                        ? '#F59E0B'
                        : '#EF4444';

                  return (
                    <div
                      key={pin.id}
                      onClick={() => setSelectedPinId(pin.id)}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
                      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    >
                      {/* Pulse ring on selected pin */}
                      {isSelected && (
                        <div
                          className="absolute -inset-2 rounded-full animate-ping opacity-75"
                          style={{ backgroundColor: pinColor }}
                        />
                      )}
                      <div
                        className={`w-7 h-7 rounded-[2px] border-2 flex items-center justify-center font-mono text-[10px] font-bold transition-transform duration-200 group-hover:scale-110 ${
                          isSelected
                            ? 'bg-[#F5F5F5] text-[#0A0A0A] border-white ring-2 ring-[#2563EB]'
                            : 'bg-[#161616] text-white border-[#333333]'
                        }`}
                        style={{
                          borderColor: isSelected ? '#FFFFFF' : pinColor,
                        }}
                      >
                        <span style={{ color: isSelected ? '#0A0A0A' : pinColor }}>●</span>
                      </div>
                    </div>
                  );
                })}

                {/* Inspect Card for the Selected Pin */}
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-xs editorial-card p-4 border-2 border-[#333333] bg-[#161616]/95 backdrop-blur-md z-20">
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                    <span className="text-[#2563EB] font-bold">[{activeSelectedPin.category}]</span>
                    <span
                      className={
                        activeSelectedPin.status === 'RESOLVED'
                          ? 'status-badge-resolved'
                          : activeSelectedPin.status === 'IN PROGRESS'
                            ? 'status-badge-progress'
                            : 'status-badge-open'
                      }
                    >
                      {activeSelectedPin.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#F5F5F5] leading-snug">{activeSelectedPin.title}</p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#888888] mt-2 pt-2 border-t border-[#222222]">
                    <span>📍 {activeSelectedPin.location}</span>
                    <span className="text-[#2563EB]">{activeSelectedPin.distance}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Sidebar with Filter Chips and Nearby List */}
            <div className="lg:col-span-4 editorial-card p-6 flex flex-col justify-between bg-[#111111]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
                  <span className="text-xs font-mono uppercase text-[#F5F5F5] font-semibold">
                    FILTER BY CATEGORY
                  </span>
                  <span className="text-[10px] font-mono text-[#555555]">
                    {filteredPins.length} VISIBLE
                  </span>
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {['ALL', 'ROADS', 'WATER', 'LIGHTING', 'SANITATION', 'ELECTRICITY', 'PARKS'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-[2px] transition-colors border ${
                        selectedCategory === cat
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-[#161616] text-[#888888] border-[#222222] hover:text-[#F5F5F5] hover:border-[#333333]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* 5 Nearby Issues list */}
                <p className="text-[11px] font-mono uppercase text-[#555555] tracking-wider mb-3">
                  NEARBY VERIFIED ISSUES
                </p>
                <div className="space-y-2.5">
                  {filteredPins.slice(0, 5).map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => setSelectedPinId(issue.id)}
                      className={`p-3 border rounded-[2px] cursor-pointer transition-colors ${
                        selectedPinId === issue.id
                          ? 'border-[#2563EB] bg-[#161616]'
                          : 'border-[#222222] bg-[#0E0E0E] hover:border-[#333333]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="text-[#2563EB]">[{issue.category}]</span>
                        <span className="text-[#888888]">{issue.distance}</span>
                      </div>
                      <p className="text-xs font-semibold text-[#F5F5F5] truncate">{issue.title}</p>
                      <p className="text-[10px] text-[#555555] mt-1 truncate">📍 {issue.location}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom full map CTA button */}
              <div className="mt-6 pt-4 border-t border-[#222222]">
                <Link to="/home" className="editorial-btn-primary w-full text-center">
                  OPEN FULL MAP →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          7. DEPARTMENTS SECTION
          Section label "04 — DEPARTMENTS", serif heading,
          minimal cards (dept icon, name, issue count, avg response time),
          no fill style (border only), tagline below
      ══════════════════════════════════════════════════════════════════ */}
      <section id="departments" className="py-24 lg:py-28 max-w-[1200px] mx-auto px-6 sm:px-8">
        <div className="mb-14">
          <span className="text-xs font-mono tracking-[0.08em] text-[#555555] uppercase block mb-3">
            04 — DEPARTMENTS
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-[48px] font-normal leading-tight text-[#F5F5F5] tracking-[-0.02em]">
            Issues go to the right team. Every time.
          </h2>
          <p className="mt-2 text-[#888888] text-base font-sans">
            Direct API integrations and automated dispatch protocols with city authorities.
          </p>
        </div>

        {/* 3-Col Minimal Grid (Border only, no fill) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEPARTMENTS.map((dept) => (
            <div
              key={dept.name}
              className="editorial-card p-6 bg-transparent border-2 border-[#222222] hover:border-[#333333] transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="p-2 border border-[#222222] rounded-[2px] text-[#2563EB] bg-[#111111]">
                  <dept.icon className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-mono text-[#555555]">{dept.code}</span>
              </div>

              <h3 className="text-base font-bold text-[#F5F5F5] mb-4 min-h-[48px] leading-snug">
                {dept.name}
              </h3>

              <div className="pt-4 border-t border-[#222222] grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <p className="text-[#555555] text-[10px] uppercase">Active Issues</p>
                  <p className="text-[#F5F5F5] font-semibold text-sm mt-0.5">{dept.activeIssues}</p>
                </div>
                <div>
                  <p className="text-[#555555] text-[10px] uppercase">Avg Response</p>
                  <p className="text-[#22C55E] font-semibold text-sm mt-0.5">{dept.avgResponse}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tagline below */}
        <div className="mt-12 text-center py-4 border-t border-[#222222]">
          <p className="text-xs font-mono uppercase tracking-[0.08em] text-[#888888]">
            ⚡ Powered by AI-assisted routing — no manual triage.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          8. TESTIMONIALS / SOCIAL PROOF
          Infinite horizontal marquee, label above "TESTIMONIALS° · CITIZEN VOICES ·",
          quotes in italic serif, name + location in muted mono below
      ══════════════════════════════════════════════════════════════════ */}
      <section id="about" className="py-24 border-y border-[#222222] bg-[#0E0E0E] overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 mb-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono tracking-[0.08em] text-[#555555] uppercase">
              TESTIMONIALS° · CITIZEN VOICES ·
            </span>
            <span className="text-[11px] font-mono text-[#888888] hidden sm:block">
              VERIFIED RESIDENTS & CITY OFFICERS
            </span>
          </div>
        </div>

        {/* Infinite horizontal marquee */}
        <div className="editorial-marquee-slow">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex gap-6 shrink-0 pr-6">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className="w-[360px] sm:w-[440px] editorial-card p-6 bg-[#161616] border-2 border-[#222222] flex flex-col justify-between"
                >
                  <blockquote className="font-serif italic text-lg sm:text-xl text-[#F5F5F5] leading-relaxed mb-6">
                    “{t.quote}”
                  </blockquote>
                  <div className="pt-4 border-t border-[#222222] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#F5F5F5] font-sans">{t.author}</p>
                      <p className="text-xs font-mono text-[#888888] mt-0.5">{t.ward}</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 border border-[#222222] bg-[#111111] text-[#2563EB] rounded-[2px]">
                      {t.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          9. CTA / FOOTER SECTION
          Large editorial CTA block with 64px serif text,
          Footer with CIVICPULSE° wordmark, links, copyright,
          and bottom status bar "AVAILABLE · OPEN SOURCE · CITY-READY [IN]"
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 lg:py-32 max-w-[1200px] mx-auto px-6 sm:px-8 text-center relative">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-[64px] font-normal leading-[1.05] text-[#F5F5F5] tracking-[-0.02em]">
            Ready to make
            <br />
            your city better?
          </h2>
          <p className="mt-6 text-base sm:text-lg text-[#888888] font-sans leading-relaxed">
            Join thousands of citizens already making an impact. No account required to file your first report.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/report" className="editorial-btn-primary text-sm px-8 py-4">
              REPORT YOUR FIRST ISSUE →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222222] bg-[#0A0A0A] pt-16 pb-10 text-xs">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#222222]">
            {/* Left Col */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-lg font-bold text-[#F5F5F5]">
                  CIVICPULSE<span className="text-[#2563EB]">°</span>
                </span>
              </div>
              <p className="text-xs text-[#888888] max-w-sm leading-relaxed font-sans">
                Next-generation municipal response protocol connecting citizens, autonomous perception pipelines, and city
                command centers.
              </p>
            </div>

            {/* Center Col: Links */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-[#555555] mb-3">
                NAVIGATION
              </p>
              <ul className="space-y-2 font-mono text-xs text-[#888888]">
                <li>
                  <a href="#issues" className="hover:text-white transition-colors no-underline">
                    Issues
                  </a>
                </li>
                <li>
                  <a href="#map" className="hover:text-white transition-colors no-underline">
                    Map
                  </a>
                </li>
                <li>
                  <a href="#departments" className="hover:text-white transition-colors no-underline">
                    Departments
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-white transition-colors no-underline">
                    About
                  </a>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-white transition-colors no-underline">
                    Documentation / API
                  </Link>
                </li>
              </ul>
            </div>

            {/* Right Col: Legal & Info */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-[#555555] mb-3">
                LEGAL & PRIVACY
              </p>
              <ul className="space-y-2 font-mono text-xs text-[#888888]">
                <li>
                  <Link to="/terms" className="hover:text-white transition-colors no-underline">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors no-underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-white transition-colors no-underline">
                    Civic Data Standards
                  </Link>
                </li>
                <li>
                  <span className="text-[#555555]">© 2025 · Built for Citizens</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Very bottom status bar (inspired by vishu.app's bottom status bar) */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[#555555]">
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="text-[#888888]">AVAILABLE · OPEN SOURCE · CITY-READY [IN]</span>
            </div>
            <div>
              <span>SYSTEM LATENCY: 42ms · TLS 1.3 ENCRYPTED</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
