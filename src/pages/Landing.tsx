import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import LandingNavbar from '../components/LandingNavbar';

/* ── Ticker data (duplicated for seamless loop) ─────────────────────── */
const TICKER_ENTRIES = [
  { cls: '',     text: '14:02:11', agent: 'PERCEPTION_AGENT',  rest: 'category=pothole severity=7 conf=0.94' },
  { cls: '',     text: '14:02:13', agent: 'DEDUP_AGENT',       rest: 'radius=100m nearby_reports=2 match=false' },
  { cls: 'ok',   text: '14:02:14', agent: 'ORCHESTRATOR',      rest: 'report created → id CP-10234, ward 07' },
  { cls: 'crit', text: '14:04:02', agent: 'PERCEPTION_AGENT',  rest: 'category=water_leak severity=9 conf=0.88' },
  { cls: '',     text: '14:04:05', agent: 'DEDUP_AGENT',       rest: 'match=true similarity=0.91 → escalating existing report' },
  { cls: '',     text: '14:04:06', agent: 'SEVERITY_AGENT',    rest: 'escalated CP-10198 4 → 9' },
  { cls: '',     text: '14:07:40', agent: 'PERCEPTION_AGENT',  rest: 'category=garbage severity=4 conf=0.97' },
  { cls: 'ok',   text: '14:07:41', agent: 'ORCHESTRATOR',      rest: 'report created → id CP-10235, ward 03' },
];

/* ── Static demo reports for landing preview ─────────────────────────── */
const DEMO_REPORTS = [
  {
    sev: 9, tier: 'high',
    title: 'Water main leak, MG Road', id: 'CP-10198',
    desc: 'Escalated after a second photo showed the flooded stretch spreading toward the crossing.',
    chips: [{ label: 'Open', cls: 'open' }, { label: 'Water Leak' }, { label: 'Ward 07' }],
  },
  {
    sev: 6, tier: 'mid',
    title: 'Deep pothole near bus stop', id: 'CP-10234',
    desc: 'Wide enough to cross both lanes; two-wheelers swerving into oncoming traffic.',
    chips: [{ label: 'Open', cls: 'open' }, { label: 'Pothole' }, { label: 'Ward 07' }],
  },
  {
    sev: 3, tier: 'low',
    title: 'Overflowing bin, Sector 12 market', id: 'CP-10235',
    desc: 'Confirmed by two nearby residents this morning.',
    chips: [{ label: 'Verified ×2', cls: 'verified' }, { label: 'Garbage' }, { label: 'Ward 03' }],
  },
];

const TRACE_ROWS = [
  { agent: 'PERCEPTION', text: <>Read the second uploaded photo as <b style={{ color: '#fff', fontWeight: 500 }}>water_leak</b>, raised confidence to <b style={{ color: '#fff', fontWeight: 500 }}>0.88</b> — visible flow had roughly doubled in width against the first report.</> },
  { agent: 'DEDUPLICATION', text: <>Queried a <b style={{ color: '#fff', fontWeight: 500 }}>100m geohash radius</b> around the pin, found one open report 40m away, scored semantic similarity at <b style={{ color: '#fff', fontWeight: 500 }}>0.91</b> — treated as the same leak.</> },
  { agent: 'SEVERITY', text: <>Escalated the existing report from <b style={{ color: '#fff', fontWeight: 500 }}>4 → 9</b> and flagged it for immediate dispatch rather than the standard queue.</> },
  { agent: 'ORCHESTRATOR', text: <>Merged both photos under <b style={{ color: '#fff', fontWeight: 500 }}>CP-10198</b>, notified Ward 07 admin, left the original reporter's credit intact.</> },
];

const WARD_CARDS = [
  {
    name: 'Ward 07 — Lakeview', code: 'WD-07', risk: 'HIGH RISK', riskCls: 'high',
    sparkPoints: '0,34 30,30 60,28 90,20 120,16 150,8 200,4',
    sparkColor: 'var(--signal)',
    trend: <>Waterlogging complaints <b>+40%</b> expected</>,
  },
  {
    name: 'Ward 03 — Old Market', code: 'WD-03', risk: 'MODERATE', riskCls: 'mid',
    sparkPoints: '0,18 30,22 60,16 90,24 120,20 150,26 200,22',
    sparkColor: 'var(--hazard)',
    trend: <>Garbage accumulation roughly <b>flat</b></>,
  },
  {
    name: 'Ward 12 — Riverside', code: 'WD-12', risk: 'MODERATE', riskCls: 'mid',
    sparkPoints: '0,10 30,14 60,20 90,18 120,26 150,30 200,34',
    sparkColor: 'var(--verified)',
    trend: <>Pothole reports trending <b>down 18%</b></>,
  },
];

const LEADERS = [
  { rank: '01', name: 'Ananya R.', sub: '42 reports · 18 verifications', pts: '2,140 pts', isFirst: true },
  { rank: '02', name: 'Rohit K.',  sub: '31 reports · 25 verifications', pts: '1,865 pts', isFirst: false },
  { rank: '03', name: 'Priya S.', sub: '28 reports · 14 verifications', pts: '1,502 pts', isFirst: false },
];

/* ── Severity helpers ────────────────────────────────────────────────── */
const sevColor = (tier: string) =>
  tier === 'high' ? 'var(--signal)' : tier === 'mid' ? 'var(--hazard)' : 'var(--verified)';

export default function Landing() {
  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ═══════════════════════════════════════════════════════════════
          HERO — Blueprint grid dark surface
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bp-grid" style={{ position: 'relative' }}>

        <LandingNavbar />

        {/* HERO BODY — two-column */}
        <div style={{
          padding: 'clamp(44px,7vw,90px) clamp(20px,5vw,64px) clamp(60px,9vw,110px)',
          color: 'var(--paper)', position: 'relative', zIndex: 2,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 'clamp(28px,4vw,56px)',
          alignItems: 'center',
        }} className="hero-grid">
          <style>{`
            @media (max-width: 800px) {
              .hero-grid { grid-template-columns: 1fr !important; }
              .hero-terminal-col { display: none; }
            }
          `}</style>
          {/* ── LEFT: text copy ── */}
          <div>
            {/* Coordinate readout */}
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--hazard)',
              display: 'flex', gap: '18px', flexWrap: 'wrap', marginBottom: '22px',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{
                  display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--hazard)',
                  animation: 'ring-pulse 1.6s infinite',
                }} />
                LIVE FEED — WARD 07
              </span>
              <span style={{ opacity: 0.85 }}>28.6139° N, 77.2090° E</span>
              <span style={{ opacity: 0.85 }}>GEOHASH ttnfv2s</span>
            </div>

            <h1 style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 900, textTransform: 'uppercase',
              fontSize: 'clamp(2.6rem,6vw,5rem)',
              lineHeight: 0.92, margin: '0 0 26px', maxWidth: '14ch',
              color: 'white',
            }}>
              Every crack,<br />
              <span style={{ color: 'var(--hazard)' }}>traced</span> back<br />
              to a fix.
            </h1>

            <p style={{
              maxWidth: '44ch', fontSize: '1rem', lineHeight: 1.65,
              color: 'rgba(238,241,236,0.72)', marginBottom: '34px',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}>
              Snap a photo. A perception agent reads the damage, a deduplication agent checks the block, and an orchestrator routes it to the ward that owns it — every decision logged and visible.
            </p>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link to="/report" className="btn-primary" style={{ fontSize: '0.95rem', padding: '13px 26px' }}>
                Report an issue →
              </Link>
              <Link to="/home" className="btn-secondary" style={{
                fontSize: '0.95rem', padding: '13px 26px',
                color: 'var(--paper)', borderColor: 'var(--grid)',
              }}>
                View the live map
              </Link>
            </div>
          </div>

          {/* ── RIGHT: Civic Intelligence Terminal ── */}
          <div className="hero-terminal-col">
            <HeroTerminal />
          </div>
        </div>

        {/* AGENT LOG TICKER */}
        <div style={{
          background: '#0F1D2C',
          borderTop: '1px solid var(--grid)',
          borderBottom: '1px solid var(--grid)',
          overflow: 'hidden', position: 'relative', zIndex: 2,
        }}>
          {/* "AGENT LOG" label */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '0 16px',
            background: '#0F1D2C',
            borderRight: '1px solid var(--grid)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.68rem', letterSpacing: '0.12em', color: 'var(--hazard)',
            zIndex: 2,
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--hazard)',
              animation: 'ring-pulse 1.6s infinite',
              display: 'inline-block',
            }} />
            AGENT LOG
          </div>

          {/* Scrolling track — duplicated for seamless loop */}
          <div style={{
            display: 'flex', whiteSpace: 'nowrap',
            animation: 'ticker-scroll 34s linear infinite',
            paddingLeft: '170px',
          }}>
            {[...TICKER_ENTRIES, ...TICKER_ENTRIES].map((e, i) => {
              const agentColor = e.cls === 'ok' ? 'var(--verified)' : e.cls === 'crit' ? 'var(--signal)' : 'var(--hazard)';
              return (
                <span
                  key={i}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.75rem',
                    color: 'rgba(238,241,236,0.65)',
                    padding: '11px 28px 11px 0',
                    borderRight: '1px solid var(--grid)',
                    marginRight: '28px',
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  {e.text}&nbsp;
                  <b style={{ color: agentColor, fontWeight: 500 }}>{e.agent}</b>
                  &nbsp;{e.rest}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MAP + FEED SECTION
      ═══════════════════════════════════════════════════════════════ */}
      <section id="map" style={{
        padding: 'clamp(50px,7vw,90px) clamp(20px,5vw,64px)',
      }}>
        <LandingEyebrow>Citizen view</LandingEyebrow>
        <h2 style={{ ...displayStyle, fontSize: 'clamp(1.8rem,3.6vw,2.6rem)', margin: '0 0 10px' }}>
          The map is the source of truth.
        </h2>
        <p style={{ maxWidth: '56ch', color: 'rgba(22,40,61,0.65)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '36px' }}>
          Pins are colored by severity, not by who reported them first. Overlapping reports within 100m are merged automatically, so the map stays a clean picture of what's actually broken.
        </p>

        {/* Split grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
          gap: '28px',
          alignItems: 'start',
        }}>
          {/* Mock map */}
          <div style={{
            background: 'var(--ink)', borderRadius: '4px',
            aspectRatio: '4 / 3.4', position: 'relative', overflow: 'hidden',
            border: '1px solid var(--grid)',
          }}>
            <svg viewBox="0 0 400 340" style={{ width: '100%', height: '100%', display: 'block' }}>
              {/* Grid lines */}
              {[60,140,220].map(y => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#2E4A66" strokeWidth="1"/>)}
              {[90,230,320].map(x => <line key={x} x1={x} y1="0" x2={x} y2="340" stroke="#2E4A66" strokeWidth="1"/>)}
              {/* Roads */}
              <path d="M0 190 Q 140 120 260 170 T 400 150" stroke="#3B5772" strokeWidth="6" fill="none" opacity="0.6"/>
              <path d="M60 0 Q 100 150 80 340" stroke="#3B5772" strokeWidth="6" fill="none" opacity="0.6"/>
              {/* Critical pins with pulse ring */}
              <circle cx="150" cy="130" r="16" fill="none" stroke="#D6483D" strokeWidth="1.5" opacity="0.45"/>
              <circle cx="150" cy="130" r="9" fill="#D6483D"/>
              <circle cx="190" cy="270" r="16" fill="none" stroke="#D6483D" strokeWidth="1.5" opacity="0.45"/>
              <circle cx="190" cy="270" r="9" fill="#D6483D"/>
              {/* Moderate pins */}
              <circle cx="240" cy="200" r="7" fill="#F2B705"/>
              <circle cx="90" cy="230" r="7" fill="#F2B705"/>
              <circle cx="60" cy="80" r="7" fill="#F2B705"/>
              {/* Resolved pins */}
              <circle cx="300" cy="90" r="6" fill="#4C8F68"/>
              <circle cx="330" cy="250" r="6" fill="#4C8F68"/>
            </svg>
            {/* Legend */}
            <div style={{
              position: 'absolute', bottom: 14, left: 14,
              background: 'rgba(15,29,44,0.88)',
              border: '1px solid var(--grid)',
              padding: '9px 14px', borderRadius: '3px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.7rem', color: 'rgba(238,241,236,0.7)',
              display: 'flex', gap: '14px',
            }}>
              {[['#D6483D','Critical'],['#F2B705','Moderate'],['#4C8F68','Resolved']].map(([c,l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'inline-block' }} />
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* Report cards feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {DEMO_REPORTS.map((r) => (
              <div key={r.id} className="asset-tag" style={{ boxShadow: '0 1px 3px rgba(22,40,61,0.06)' }}>
                {/* Severity stub */}
                <div className="asset-tag__stub">
                  <span className="asset-tag__score" style={{ color: sevColor(r.tier) }}>{r.sev}</span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.07em',
                    color: 'rgba(22,40,61,0.45)', marginTop: 2,
                  }}>Severity</span>
                </div>

                {/* Body */}
                <div className="asset-tag__body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)' }}>{r.title}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'rgba(22,40,61,0.45)' }}>{r.id}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(22,40,61,0.65)', margin: '4px 0 10px', lineHeight: 1.5 }}>{r.desc}</p>
                  <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                    {r.chips.map((c) => (
                      <span
                        key={c.label}
                        className={`status-chip${c.cls === 'open' ? ' status-chip--open' : c.cls === 'verified' ? ' status-chip--verified' : ''}`}
                        style={!c.cls ? {
                          background: 'var(--paper)', color: 'rgba(22,40,61,0.65)',
                          border: '1px solid var(--paper-dim)', borderRadius: '20px',
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem',
                          padding: '3px 9px',
                        } : {}}
                      >
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Agent trace panel ────────────────────────────────────── */}
        <div id="trace" style={{
          background: 'var(--ink)', borderRadius: '4px',
          padding: 'clamp(22px,4vw,32px)',
          color: 'var(--paper)', marginTop: '44px',
          border: '1px solid var(--grid)',
        }}>
          <div style={{ ...monoStyle, fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hazard)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ color: 'var(--hazard)', fontSize: '0.55rem' }}>◆</span>
            Traceability · CP-10198
          </div>
          {TRACE_ROWS.map((row) => (
            <div
              key={row.agent}
              style={{
                display: 'grid', gridTemplateColumns: '130px 1fr',
                gap: '16px', padding: '12px 0',
                borderBottom: '1px solid var(--grid)',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--hazard)', fontSize: '0.7rem', letterSpacing: '0.04em', paddingTop: '2px' }}>
                {row.agent}
              </div>
              <div style={{ color: 'rgba(238,241,236,0.72)', lineHeight: 1.55 }}>
                {row.text}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          ADMIN / FORECAST — Blueprint grid dark
      ═══════════════════════════════════════════════════════════════ */}
      <section
        id="admin"
        className="bp-grid"
        style={{
          padding: 'clamp(50px,7vw,90px) clamp(20px,5vw,64px)',
          color: 'var(--paper)',
        }}
      >
        <LandingEyebrow dark>Admin view</LandingEyebrow>
        <h2 style={{ ...displayStyle, fontSize: 'clamp(1.8rem,3.6vw,2.6rem)', margin: '0 0 10px', color: 'white' }}>
          See the next 14 days, not just today.
        </h2>
        <p style={{ maxWidth: '56ch', fontSize: '1rem', lineHeight: 1.6, color: 'rgba(238,241,236,0.68)', marginBottom: '36px' }}>
          Forecasts are read off recent reporting patterns per ward — a way to route crews before the complaints pile up, not after.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: '18px' }}>
          {WARD_CARDS.map((w) => (
            <div
              key={w.code}
              style={{
                background: '#fff', border: '1px solid var(--paper-dim)',
                borderRadius: '3px', padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>{w.name}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: 'rgba(22,40,61,0.45)' }}>{w.code}</div>
                </div>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.62rem', fontWeight: 500,
                  padding: '3px 8px', borderRadius: '2px',
                  ...(w.riskCls === 'high'
                    ? { background: '#FBE4E1', color: 'var(--signal)' }
                    : { background: '#FCEFC7', color: '#8A6400' }),
                }}>
                  {w.risk}
                </span>
              </div>

              {/* SVG sparkline */}
              <svg viewBox="0 0 200 44" style={{ width: '100%', height: 44 }} preserveAspectRatio="none">
                <polyline points={w.sparkPoints} fill="none" stroke={w.sparkColor} strokeWidth="2.5" strokeLinejoin="round"/>
              </svg>

              <div style={{ fontSize: '0.82rem', color: 'rgba(22,40,61,0.65)', marginTop: '8px' }}>
                {w.trend}
              </div>
            </div>
          ))}
        </div>

        {/* Link to admin dashboard */}
        <div style={{ marginTop: '32px' }}>
          <Link to="/admin" className="btn-primary" style={{ fontSize: '0.875rem', padding: '11px 22px' }}>
            Open Admin Dashboard →
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          LEADERBOARD
      ═══════════════════════════════════════════════════════════════ */}
      <section id="board" style={{ padding: 'clamp(50px,7vw,90px) clamp(20px,5vw,64px)' }}>
        <LandingEyebrow>Community</LandingEyebrow>
        <h2 style={{ ...displayStyle, fontSize: 'clamp(1.8rem,3.6vw,2.6rem)', margin: '0 0 10px' }}>
          Leaderboard
        </h2>
        <p style={{ maxWidth: '56ch', fontSize: '1rem', lineHeight: 1.6, color: 'rgba(22,40,61,0.65)', marginBottom: '36px' }}>
          Points for accurate reports and for verifying issues nearby — the map gets better because people trust each other's eyes.
        </p>

        <div style={{ maxWidth: '600px' }}>
          {LEADERS.map((l) => (
            <div
              key={l.rank}
              style={{
                display: 'grid', gridTemplateColumns: '44px 1fr auto',
                alignItems: 'center', gap: '14px',
                padding: '13px 0',
                borderBottom: '1px solid var(--paper-dim)',
              }}
            >
              <div style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 700, fontSize: '1.3rem',
                color: l.isFirst ? 'var(--hazard)' : 'rgba(22,40,61,0.4)',
              }}>
                {l.rank}
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.92rem', color: 'var(--ink)' }}>{l.name}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: 'rgba(22,40,61,0.45)' }}>{l.sub}</div>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', color: 'var(--ink)', textAlign: 'right' }}>
                {l.pts}
              </div>
            </div>
          ))}
          {/* View full leaderboard */}
          <div style={{ marginTop: '24px' }}>
            <Link to="/leaderboard" className="btn-secondary" style={{ fontSize: '0.875rem' }}>
              View full leaderboard →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bp-grid text-white">
        <footer style={{
          padding: 'clamp(40px,6vw,60px) clamp(20px,5vw,64px) clamp(20px,4vw,30px)',
          color: 'rgba(238,241,236,0.65)',
          fontSize: '0.8rem',
          position: 'relative', zIndex: 2,
          borderTop: '1px solid var(--grid)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '40px',
            marginBottom: '40px'
          }}>
            {/* Column 1: Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <svg viewBox="0 0 30 30" fill="none" width="20" height="20">
                  <circle cx="15" cy="15" r="13" stroke="var(--hazard)" strokeWidth="2"/>
                  <circle cx="15" cy="15" r="3.2" fill="var(--hazard)"/>
                  <path d="M15 2 L15 8 M15 22 L15 28 M2 15 L8 15 M22 15 L28 15" stroke="var(--hazard)" strokeWidth="1.6"/>
                </svg>
                <span style={{
                  fontFamily: "'Big Shoulders Display', sans-serif",
                  fontWeight: 900, fontSize: '1.2rem',
                  textTransform: 'uppercase', letterSpacing: '0.04em', color: 'white',
                }}>
                  Civic<span style={{ color: 'var(--hazard)' }}>Pulse</span>
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', lineHeight: '1.5', color: 'rgba(238,241,236,0.5)', maxWidth: '250px' }}>
                A multi-agent orchestrated infrastructure monitoring and hazard dispatch routing platform.
              </p>
            </div>

            {/* Column 2: Platform Links */}
            <div>
              <h4 style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--hazard)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px'
              }}>Platform</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>
                  <Link to="/home" style={{ color: 'rgba(238,241,236,0.7)', textDecoration: 'none', fontSize: '0.75rem' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(238,241,236,0.7)')}>
                    Live Incidents Map
                  </Link>
                </li>
                <li>
                  <Link to="/report" style={{ color: 'rgba(238,241,236,0.7)', textDecoration: 'none', fontSize: '0.75rem' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(238,241,236,0.7)')}>
                    Report a Hazard
                  </Link>
                </li>
                <li>
                  <Link to="/leaderboard" style={{ color: 'rgba(238,241,236,0.7)', textDecoration: 'none', fontSize: '0.75rem' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(238,241,236,0.7)')}>
                    Leaderboard & Ranks
                  </Link>
                </li>
                <li>
                  <Link to="/admin" style={{ color: 'rgba(238,241,236,0.7)', textDecoration: 'none', fontSize: '0.75rem' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(238,241,236,0.7)')}>
                    Ward Administrator
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Resources & Info */}
            <div>
              <h4 style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--hazard)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px'
              }}>Resources</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>
                  <Link to="/faq" style={{ color: 'rgba(238,241,236,0.7)', textDecoration: 'none', fontSize: '0.75rem' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(238,241,236,0.7)')}>
                    Help & Support FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/guidelines" style={{ color: 'rgba(238,241,236,0.7)', textDecoration: 'none', fontSize: '0.75rem' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(238,241,236,0.7)')}>
                    Community Guidelines
                  </Link>
                </li>
                <li>
                  <Link to="/terms" style={{ color: 'rgba(238,241,236,0.7)', textDecoration: 'none', fontSize: '0.75rem' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(238,241,236,0.7)')}>
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" style={{ color: 'rgba(238,241,236,0.7)', textDecoration: 'none', fontSize: '0.75rem' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(238,241,236,0.7)')}>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/api-access" style={{ color: 'rgba(238,241,236,0.7)', textDecoration: 'none', fontSize: '0.75rem' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(238,241,236,0.7)')}>
                    Developer API Access
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: System Status */}
            <div>
              <h4 style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--hazard)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px'
              }}>Network Health</h4>
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--grid)',
                borderRadius: '3px',
                padding: '12px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.7rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'rgba(238,241,236,0.5)' }}>STATUS:</span>
                  <span style={{ color: 'var(--verified)', fontWeight: 'bold' }}>NOMINAL</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'rgba(238,241,236,0.5)' }}>NODES:</span>
                  <span style={{ color: 'white' }}>18 ACTIVE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(238,241,236,0.5)' }}>VERSION:</span>
                  <span style={{ color: 'white' }}>v2.4.1</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderTop: '1px solid var(--grid)', paddingTop: '20px',
            fontSize: '0.7rem', color: 'rgba(238,241,236,0.4)', flexWrap: 'wrap', gap: '10px'
          }}>
            <div>© Civic Pulse Network — Decentralized Ward Administration</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              GEOHASH INDEXING ACTIVE
            </div>
          </div>
        </footer>
      </div>

      {/* Responsive nav hide style */}
      <style>{`
        @media (max-width: 720px) {
          .landing-nav-links { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Small helpers ────────────────────────────────────────────────────── */
const displayStyle: React.CSSProperties = {
  fontFamily: "'Big Shoulders Display', sans-serif",
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.01em',
  color: 'var(--ink)',
  lineHeight: 1.05,
};

const monoStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
};

function LandingEyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase',
      color: dark ? 'rgba(242,183,5,0.9)' : 'rgba(22,40,61,0.45)',
      display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px',
    }}>
      <span style={{ color: 'var(--hazard)', fontSize: '0.55rem' }}>◆</span>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HERO TERMINAL — live-looking field ops panel for hero RHS
══════════════════════════════════════════════════════════════ */
const MINI_REPORTS = [
  { sev: 9, color: 'var(--signal)', label: 'Water main leak, MG Road',       id: 'CP-10198' },
  { sev: 6, color: 'var(--hazard)', label: 'Deep pothole near bus stop',      id: 'CP-10234' },
  { sev: 4, color: 'var(--hazard)', label: 'Loose manhole cover, 14th Ave',   id: 'CP-10241' },
];

function HeroTerminal() {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* ── Registration / survey corner marks ─────────────────── */}
      {(['topLeft','topRight','bottomLeft','bottomRight'] as const).map(pos => (
        <CornerMark key={pos} position={pos} />
      ))}

      {/* ── Main terminal frame ──────────────────────────────────── */}
      <div style={{
        background: '#0B1929',
        border: '1px solid var(--grid)',
        borderRadius: '4px',
        overflow: 'hidden',
        margin: '10px',   /* leaves room for corner marks */
        position: 'relative',
      }}>

        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 12px',
          background: '#0F1D2C',
          borderBottom: '1px solid var(--grid)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)',
              display: 'inline-block',
              animation: 'ring-pulse 1.4s ease-out infinite',
            }} />
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--hazard)',
              textTransform: 'uppercase',
            }}>LIVE · WARD 07 DISPATCH</span>
          </div>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.56rem', color: 'rgba(238,241,236,0.35)',
            letterSpacing: '0.06em',
          }}>SYS: NOMINAL</span>
        </div>

        {/* City-grid map */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 340 220" style={{ width: '100%', display: 'block' }}>
            {/* Block grid */}
            <rect width="340" height="220" fill="#0B1929"/>
            {/* Fine blueprint grid */}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 28} x2="340" y2={i * 28} stroke="#1A2E44" strokeWidth="0.5"/>
            ))}
            {Array.from({ length: 13 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 28} y1="0" x2={i * 28} y2="220" stroke="#1A2E44" strokeWidth="0.5"/>
            ))}

            {/* City blocks — main streets */}
            <line x1="0" y1="70" x2="340" y2="70" stroke="#2E4A66" strokeWidth="2"/>
            <line x1="0" y1="148" x2="340" y2="148" stroke="#2E4A66" strokeWidth="2"/>
            <line x1="84" y1="0" x2="84" y2="220" stroke="#2E4A66" strokeWidth="2"/>
            <line x1="196" y1="0" x2="196" y2="220" stroke="#2E4A66" strokeWidth="2"/>
            <line x1="280" y1="0" x2="280" y2="220" stroke="#2E4A66" strokeWidth="2"/>

            {/* Filled city block silhouettes */}
            {[
              [6,6,70,56], [90,6,98,56], [200,6,72,56],
              [6,78,70,62], [90,78,98,62], [200,78,72,62],
              [6,156,70,58], [90,156,98,58], [200,156,72,58],
              [286,6,48,56], [286,78,48,62], [286,156,48,58],
            ].map(([x,y,w,h], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} fill="#152234" rx="1"/>
            ))}

            {/* ── Severity pins ── */}
            {/* Critical sev 9 — with animated pulse ring */}
            <circle cx="148" cy="108" r="22" fill="none" stroke="#D6483D" strokeWidth="1" opacity="0.3">
              <animate attributeName="r" values="12;22;12" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="148" cy="108" r="8" fill="#D6483D"/>
            <circle cx="148" cy="108" r="3" fill="white" opacity="0.8"/>

            {/* Critical sev 9 — second */}
            <circle cx="64" cy="168" r="20" fill="none" stroke="#D6483D" strokeWidth="1" opacity="0.3">
              <animate attributeName="r" values="10;20;10" dur="2.4s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="64" cy="168" r="7" fill="#D6483D"/>
            <circle cx="64" cy="168" r="2.5" fill="white" opacity="0.8"/>

            {/* Moderate sev 6 */}
            <circle cx="236" cy="52" r="6" fill="#F2B705"/>
            <circle cx="236" cy="52" r="2.5" fill="white" opacity="0.8"/>

            {/* Moderate sev 5 */}
            <circle cx="310" cy="160" r="5.5" fill="#F2B705"/>
            <circle cx="310" cy="160" r="2" fill="white" opacity="0.8"/>

            {/* Resolved */}
            <circle cx="130" cy="40" r="5" fill="#4C8F68"/>
            <circle cx="130" cy="40" r="2" fill="white" opacity="0.8"/>

            {/* Resolved */}
            <circle cx="320" cy="60" r="5" fill="#4C8F68"/>
            <circle cx="320" cy="60" r="2" fill="white" opacity="0.8"/>

            {/* "You are here" marker */}
            <circle cx="196" cy="148" r="9" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5"/>
            <circle cx="196" cy="148" r="3" fill="white" opacity="0.7"/>
            <text x="204" y="144" fill="white" opacity="0.5" fontSize="8"
              fontFamily="IBM Plex Mono, monospace">YOU</text>

            {/* Scan-line sweep */}
            <rect x="0" y="0" width="340" height="4" fill="rgba(242,183,5,0.07)">
              <animateTransform attributeName="transform" type="translate"
                values="0,0;0,220;0,0" dur="4s" repeatCount="indefinite"/>
            </rect>

            {/* Geohash grid labels */}
            <text x="4" y="20" fill="#2E4A66" fontSize="7" fontFamily="IBM Plex Mono, monospace" opacity="0.8">ttnfv2r</text>
            <text x="90" y="20" fill="#2E4A66" fontSize="7" fontFamily="IBM Plex Mono, monospace" opacity="0.8">ttnfv2s</text>
            <text x="200" y="20" fill="#2E4A66" fontSize="7" fontFamily="IBM Plex Mono, monospace" opacity="0.8">ttnfv2u</text>
          </svg>

          {/* Map legend strip */}
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(11,25,41,0.9)',
            border: '1px solid var(--grid)',
            padding: '5px 10px',
            borderRadius: '2px',
            display: 'flex', gap: '10px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6rem', color: 'rgba(238,241,236,0.55)',
          }}>
            {[['#D6483D','CRIT'],['#F2B705','MOD'],['#4C8F68','OK']].map(([c,l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block' }} />
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* ── Live stat strip ─────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          borderTop: '1px solid var(--grid)',
          borderBottom: '1px solid var(--grid)',
        }}>
          {[
            { label: 'ACTIVE',   value: 24, color: 'var(--paper)' },
            { label: 'CRITICAL', value: 7,  color: 'var(--signal)' },
            { label: 'RESOLVED', value: 18, color: 'var(--verified)' },
          ].map(({ label, value, color }, i) => (
            <div
              key={label}
              style={{
                padding: '7px 10px',
                textAlign: 'center',
                borderRight: i < 2 ? '1px solid var(--grid)' : 'none',
              }}
            >
              <div style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 900, fontSize: '1.25rem', lineHeight: 1,
                color,
              }}>{value}</div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.5rem', letterSpacing: '0.07em',
                textTransform: 'uppercase', color: 'rgba(238,241,236,0.35)',
                marginTop: '2px',
              }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Incoming report mini-feed ────────────────────────── */}
        <div style={{ padding: '6px 0 2px' }}>
          {MINI_REPORTS.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '4px 12px',
                borderBottom: i < MINI_REPORTS.length - 1 ? '1px solid rgba(46,74,102,0.4)' : 'none',
                opacity: i === 0 ? 1 : 1 - i * 0.18,
              }}
            >
              {/* Severity stub */}
              <span style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 900, fontSize: '0.875rem', lineHeight: 1,
                color: r.color, minWidth: '20px', textAlign: 'center',
              }}>{r.sev}</span>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.55rem', color: 'rgba(46,74,102,0.9)',
              }}>│</span>
              <span style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: '0.7rem', color: 'rgba(238,241,236,0.65)',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{r.label}</span>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.55rem', color: 'rgba(238,241,236,0.28)',
                whiteSpace: 'nowrap',
              }}>{r.id}</span>
            </div>
          ))}
        </div>

        {/* Footer: geohash + ward code */}
        <div style={{
          padding: '5px 12px',
          borderTop: '1px solid var(--grid)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#0F1D2C',
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.55rem', color: 'rgba(238,241,236,0.3)', letterSpacing: '0.07em',
          }}>28.6139° N  77.2090° E</span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.55rem', color: 'var(--verified)', letterSpacing: '0.07em',
          }}>● FEED ACTIVE</span>
        </div>
      </div>
    </div>
  );
}

/* ── Survey corner registration marks ──────────────────────────────── */
function CornerMark({ position }: { position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' }) {
  const isRight  = position.includes('Right');
  const isBottom = position.includes('bottom');
  const size = 18;
  return (
    <div style={{
      position: 'absolute',
      top:    isBottom ? undefined : 0,
      bottom: isBottom ? 0 : undefined,
      left:   isRight  ? undefined : 0,
      right:  isRight  ? 0 : undefined,
      width: size, height: size,
      zIndex: 10,
    }}>
      <svg viewBox="0 0 18 18" fill="none" width={size} height={size}>
        {/* Horizontal arm */}
        <line
          x1={isRight ? 18 : 0} y1={isBottom ? 9 : 9}
          x2={isRight ? 10 : 8} y2={isBottom ? 9 : 9}
          stroke="var(--hazard)" strokeWidth="1.5"
        />
        {/* Vertical arm */}
        <line
          x1={isRight ? 9 : 9} y1={isBottom ? 18 : 0}
          x2={isRight ? 9 : 9} y2={isBottom ? 10 : 8}
          stroke="var(--hazard)" strokeWidth="1.5"
        />
        {/* Dot */}
        <circle cx="9" cy="9" r="1.5" fill="var(--hazard)" opacity="0.7"/>
      </svg>
    </div>
  );
}
