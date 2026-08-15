import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  Bot,
  GitMerge,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Users,
  Building2,
  Zap,
  Star,
  ChevronRight,
  Activity,
  Bell,
  CheckCircle2,
  Cpu,
  LineChart,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';
import Logo from '../components/ui/Logo';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

/* ── Animated counter ─────────────────────────────────────────────────── */
function Counter({ to, suffix = '', duration = 1800 }: { to: number; suffix?: string; duration?: number }) {
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
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ── Animated city map (hero art) ─────────────────────────────────────── */
const DEMO_PINS = [
  { x: 132, y: 96, tone: 'danger', label: 'Water main leak', sev: 9 },
  { x: 252, y: 150, tone: 'warning', label: 'Pothole, MG Road', sev: 6 },
  { x: 92, y: 208, tone: 'success', label: 'Bin cleared', sev: 0 },
  { x: 310, y: 84, tone: 'warning', label: 'Streetlight out', sev: 5 },
  { x: 300, y: 226, tone: 'success', label: 'Cable restored', sev: 0 },
];

const PIN_COLORS: Record<string, string> = {
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
};

function CityMapArt() {
  return (
    <div className="relative">
      {/* Glow behind the map */}
      <div className="absolute -inset-8 bg-gradient-to-tr from-primary/20 via-transparent to-teal-brand/20 blur-3xl rounded-full" aria-hidden="true" />

      <div className="relative rounded-3xl border border-line bg-card shadow-pop overflow-hidden">
        {/* Map header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-card/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <span className="text-xs font-semibold text-ink">Live — Ward 07</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-faint">
            <span>28.61° N</span>
            <span>77.20° E</span>
          </div>
        </div>

        {/* Map body */}
        <svg viewBox="0 0 400 280" className="w-full h-auto block" role="img" aria-label="Animated map of reported civic issues">
          <defs>
            <linearGradient id="mapbg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--bg-subtle)" />
              <stop offset="100%" stopColor="var(--bg-page)" />
            </linearGradient>
          </defs>
          <rect width="400" height="280" fill="url(#mapbg)" />

          {/* Block grid */}
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 32} x2="400" y2={i * 32} stroke="var(--line)" strokeWidth="1" opacity="0.5" />
          ))}
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 32} y1="0" x2={i * 32} y2="280" stroke="var(--line)" strokeWidth="1" opacity="0.5" />
          ))}

          {/* Roads */}
          <path d="M0 120 Q 120 90 240 130 T 400 108" stroke="var(--line-strong)" strokeWidth="8" fill="none" opacity="0.55" />
          <path d="M96 0 Q 128 140 96 280" stroke="var(--line-strong)" strokeWidth="8" fill="none" opacity="0.55" />
          <path d="M0 214 Q 200 190 400 232" stroke="var(--line-strong)" strokeWidth="6" fill="none" opacity="0.4" />
          <path d="M268 0 Q 240 140 268 280" stroke="var(--line-strong)" strokeWidth="6" fill="none" opacity="0.4" />

          {/* Park areas */}
          <rect x="24" y="24" width="56" height="48" rx="8" fill="var(--success)" opacity="0.12" />
          <rect x="320" y="192" width="56" height="60" rx="8" fill="var(--teal-brand)" opacity="0.12" />

          {/* Pins */}
          {DEMO_PINS.map((pin, i) => {
            const color = PIN_COLORS[pin.tone];
            const pulse = pin.tone === 'danger';
            return (
              <g key={i}>
                {pulse && (
                  <circle cx={pin.x} cy={pin.y} r="14" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5">
                    <animate attributeName="r" values="10;22;10" dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={pin.x} cy={pin.y} r="7.5" fill={color} stroke="#fff" strokeWidth="2" />
                <circle cx={pin.x} cy={pin.y} r="2.5" fill="#fff" opacity="0.85" />
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 glass rounded-full px-3.5 py-1.5 flex items-center gap-3 text-[10px] font-semibold text-ink">
          {[
            ['#ef4444', 'Critical'],
            ['#f59e0b', 'Pending'],
            ['#10b981', 'Resolved'],
          ].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>

        {/* Floating live-feed card */}
        <div className="absolute top-16 -right-3 sm:right-4 glass rounded-2xl shadow-pop p-3.5 w-52 animate-float hidden sm:block">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-danger-soft text-danger flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-ink leading-none">Water main leak</p>
              <p className="text-[10px] text-faint mt-0.5">MG Road · 2 min ago</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-danger uppercase tracking-wide">Severity 9</span>
            <span className="text-[10px] text-primary font-semibold">AI routed →</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section helpers ──────────────────────────────────────────────────── */
function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''} mb-12`}>
      <Badge tone="primary" className="mb-4">
        {eyebrow}
      </Badge>
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink leading-tight">{title}</h2>
      {description && <p className="mt-4 text-base text-muted leading-relaxed">{description}</p>}
    </div>
  );
}

const FEATURES = [
  {
    icon: Camera,
    title: 'AI-powered reporting',
    desc: 'Snap a photo and our perception model classifies the issue, scores its severity, and drafts the report for you in seconds.',
    tone: 'text-primary bg-primary-soft',
  },
  {
    icon: GitMerge,
    title: 'Smart duplicate detection',
    desc: 'Overlapping reports within 100m are merged automatically, so the map stays clean and crews are never double-dispatched.',
    tone: 'text-teal-brand bg-teal-soft',
  },
  {
    icon: Cpu,
    title: 'Transparent AI trace',
    desc: 'Every decision — perception, deduplication, severity, routing — is logged and visible to citizens and admins alike.',
    tone: 'text-warning bg-warning-soft',
  },
  {
    icon: MapPin,
    title: 'Real-time city map',
    desc: 'Pins colored by status: critical in red, pending in orange, resolved in green. Filter by category and severity.',
    tone: 'text-danger bg-danger-soft',
  },
  {
    icon: LineChart,
    title: 'Predictive insights',
    desc: 'Admins see 14-day ward forecasts and heatmaps, so crews are routed before complaints pile up, not after.',
    tone: 'text-info bg-info-soft',
  },
  {
    icon: Users,
    title: 'Community verification',
    desc: 'Neighbours confirm issues to build trust scores and keep every report grounded in the community’s lived reality.',
    tone: 'text-success bg-success-soft',
  },
];

const STEPS = [
  {
    icon: Camera,
    step: '01',
    title: 'Report in seconds',
    desc: 'Choose a category, snap a photo, drop a pin on the map. AI suggests the details for you.',
  },
  {
    icon: Bot,
    step: '02',
    title: 'AI routes & dedupes',
    desc: 'Agents analyse the image, check for duplicates nearby, and route the issue to the right department.',
  },
  {
    icon: Activity,
    step: '03',
    title: 'Track to resolution',
    desc: 'Follow the progress timeline, get notified on updates, and see it resolved on the live map.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'I reported a pothole at 7am and it was patched by Friday. I could watch every step — verification, department assignment, work order — on the timeline.',
    name: 'Ananya Rao',
    role: 'Resident, Lakeview Ward',
    initials: 'AR',
  },
  {
    quote:
      'The heatmap and ward forecasts changed how we plan. We now route crews by predicted risk instead of reacting to the loudest complaint.',
    name: 'Rohit Khanna',
    role: 'Municipal Officer, Ward 07',
    initials: 'RK',
  },
  {
    quote:
      'Duplicates just disappeared. Same stretch of road was reported 5 times a month before; now it merges into one ticket with one fix.',
    name: 'Priya Srinivasan',
    role: 'Operations Lead, City Ops',
    initials: 'PS',
  },
];

const FOOTER_COLS = [
  {
    title: 'Platform',
    links: [
      { label: 'Live City Map', to: '/home' },
      { label: 'Report an Issue', to: '/report' },
      { label: 'Leaderboard', to: '/leaderboard' },
      { label: 'Admin Dashboard', to: '/admin' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help & FAQ', to: '/faq' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Privacy Policy', to: '/privacy' },
    ],
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-page text-ink font-sans">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 glass border-b border-line" style={{ borderColor: 'var(--nav-glass-border)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Logo />
          <nav className="hidden md:flex items-center gap-1" aria-label="Landing">
            {[
              { label: 'Features', href: '#features' },
              { label: 'How it works', href: '#how' },
              { label: 'Live Map', href: '#map' },
              { label: 'Community', href: '#community' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-muted hover:text-ink hover:bg-subtle transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
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
              Report an Issue
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-14 lg:gap-10 items-center">
          <div className="relative z-10">
            <Badge tone="success" className="mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              Smart city civic platform
            </Badge>
            <h1 className="text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-[4.2rem] font-extrabold tracking-tight text-ink">
              Your Voice.
              <br />
              Your City.
              <br />
              <span className="text-gradient">Your Impact.</span>
            </h1>
            <p className="mt-6 text-lg text-muted leading-relaxed max-w-xl">
              Snap a photo of any civic issue — roads, garbage, water, power, safety. Our AI agents classify it, check for
              duplicates, and route it straight to the department that owns it. Transparent, trackable, resolved.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button to="/report" size="lg">
                Report an Issue
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button to="/home" variant="secondary" size="lg">
                <MapPin className="w-4 h-4 text-primary" />
                Explore City
              </Button>
            </div>

            {/* Trust stats */}
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                { v: 12480, s: '+', label: 'Issues resolved' },
                { v: 38, s: '', label: 'City wards' },
                { v: 96, s: '%', label: 'Response rate' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl sm:text-3xl font-extrabold text-ink">
                    <Counter to={s.v} suffix={s.s} />
                  </p>
                  <p className="text-xs text-faint font-medium mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <CityMapArt />
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-page to-transparent pointer-events-none" />
      </section>

      {/* ── Marquee ticker ── */}
      <div className="border-y border-line bg-card/60 overflow-hidden py-3">
        <div className="flex whitespace-nowrap ticker-scroll gap-0" style={{ width: 'max-content' }}>
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center">
              {[
                'Perception agent classified 3 new reports',
                'Duplicate merged within 100m radius',
                'Severity escalated · water leak 4 → 9',
                'Report routed to Water & Sewerage Board',
                'Ward 07 forecast updated · +40% waterlogging',
                '3 neighbours verified the pothole report',
              ].map((text, i) => (
                <span key={i} className="flex items-center gap-2 px-8 text-xs font-semibold text-muted">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  {text}
                  <span className="ml-8 w-1 h-1 rounded-full bg-line-strong" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section id="how" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How it works"
            title={
              <>
                From complaint to fix, <span className="text-gradient">in three steps</span>
              </>
            }
            description="CivicPulse puts an autonomous AI pipeline between citizens and city administration — every step logged and visible."
          />

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div
                key={step.step}
                className="relative bg-card border border-line rounded-3xl shadow-card p-7 hover:shadow-pop hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-teal-brand text-white flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(37,99,235,0.6)]">
                    <step.icon className="w-5 h-5" />
                  </span>
                  <span className="text-5xl font-extrabold text-subtle -mt-2 select-none">{step.step}</span>
                </div>
                <h3 className="text-lg font-bold text-ink mb-2">{step.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-5 w-5 h-5 text-faint -translate-y-1/2 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 lg:py-28 bg-card/50 border-y border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Key features"
            title={
              <>
                Built like a <span className="text-gradient">smart city</span> deserves
              </>
            }
            description="A civic operating system — not just a complaint box. Everything from perception to predictive dispatch."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-card border border-line rounded-3xl shadow-card p-7 hover:shadow-pop hover:-translate-y-1 transition-all duration-200"
              >
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${f.tone} mb-5 group-hover:scale-110 transition-transform duration-200`}>
                  <f.icon className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-ink mb-2">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live map section ── */}
      <section id="map" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Live city map"
              title={
                <>
                  The map is the <span className="text-gradient">source of truth</span>
                </>
              }
              description="Pins are coloured by status — red for critical, orange for pending, green for resolved. Overlapping reports within 100m merge automatically, so the map always shows what's actually broken."
            />
            <div className="flex flex-col gap-3">
              {[
                { icon: ShieldCheck, text: 'Filter by category, severity, and ward' },
                { icon: Building2, text: 'Heatmap view shows problem clusters at a glance' },
                { icon: Bell, text: 'Follow issues and get notified when status changes' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-sm font-medium text-ink">
                  <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4" />
                  </span>
                  {item.text}
                </div>
              ))}
              <div className="mt-4">
                <Button to="/home" variant="secondary">
                  Explore the live map
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-card shadow-pop overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
              <p className="text-sm font-bold text-ink">Ward overview</p>
              <Badge tone="success" dot>
                Live
              </Badge>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {[
                { icon: Zap, label: 'Open issues', value: '24', tone: 'text-danger bg-danger-soft' },
                { icon: TrendingUp, label: 'Avg resolution', value: '2.4 days', tone: 'text-primary bg-primary-soft' },
                { icon: Users, label: 'Active citizens', value: '1,842', tone: 'text-teal-brand bg-teal-soft' },
                { icon: Building2, label: 'Departments', value: '6', tone: 'text-warning bg-warning-soft' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-line bg-page p-4">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.tone} mb-3`}>
                    <s.icon className="w-4 h-4" />
                  </span>
                  <p className="text-xl font-extrabold text-ink tabular-nums">{s.value}</p>
                  <p className="text-xs text-faint font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Community / Testimonials ── */}
      <section id="community" className="py-20 lg:py-28 bg-card/50 border-y border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Community impact"
            title={
              <>
                Loved by citizens <span className="text-gradient">and city teams</span>
              </>
            }
            description="Trust, transparency, and faster fixes — here's what communities say when the loop closes."
          />

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="bg-card border border-line rounded-3xl shadow-card p-7 flex flex-col hover:shadow-pop transition-shadow duration-200">
                <div className="flex gap-1 mb-4 text-warning">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <blockquote className="text-sm text-ink leading-relaxed flex-1">“{t.quote}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 pt-5 border-t border-line">
                  <span className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-teal-brand text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {t.initials}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{t.name}</p>
                    <p className="text-xs text-faint">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-night text-white px-8 py-14 sm:px-14 text-center">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background:
                  'radial-gradient(50% 80% at 20% 0%, rgba(59,130,246,0.5) 0%, transparent 60%), radial-gradient(50% 80% at 85% 100%, rgba(45,212,191,0.4) 0%, transparent 60%)',
              }}
              aria-hidden="true"
            />
            <div className="relative z-10">
              <Badge tone="primary" className="mb-5 bg-white/10 text-white">
                <Activity className="w-3.5 h-3.5" />
                Join the movement
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                See something broken?
                <br />
                Make your voice count.
              </h2>
              <p className="mt-4 text-white/70 max-w-xl mx-auto text-base sm:text-lg">
                Join thousands of citizens building a cleaner, safer, smarter city — one report at a time.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Button to="/report" size="lg" className="!bg-white !text-night hover:!brightness-95">
                  Report an Issue
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button to="/login" variant="ghost" size="lg" className="!text-white hover:!bg-white/10">
                  Sign in free
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-night text-white/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            <div className="lg:col-span-2">
              <Logo dark />
              <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-xs">
                A smart civic engagement platform connecting citizens and city administration — transparent, AI-assisted, and
                built for every neighbourhood.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <Badge tone="success" dot>
                  All systems operational
                </Badge>
              </div>
            </div>

            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-bold text-white mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="text-sm text-white/50 hover:text-white transition-colors no-underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h4 className="text-sm font-bold text-white mb-4">Get in touch</h4>
              <p className="text-sm text-white/50 leading-relaxed">
                Have feedback or partnership ideas?
                <br />
                We'd love to hear from you.
              </p>
              <Link
                to="/faq"
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-primary hover:underline"
              >
                Visit our FAQ
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <p>© {new Date().getFullYear()} CivicPulse. Built for better cities.</p>
            <p className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live · 38 wards connected
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
