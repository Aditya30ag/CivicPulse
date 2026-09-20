import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  Bell,
  Activity,
  Compass,
  Radio,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CityMap from '../components/CityMap';
import ComplaintCard from '../components/ComplaintCard';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import { CATEGORIES, categoryById } from '../lib/status';
import { formatRelativeTime } from '../lib/format';
import { DUMMY_REPORTS, MockReport } from '../lib/dummyData';

const DISTANCE_KM = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function Home() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>(DUMMY_REPORTS);
  // Default to central Delhi coordinates where dummy reports are clustered
  const [center, setCenter] = useState<[number, number]>([28.6139, 77.209]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Attempt user geolocation, fallback gracefully to Delhi center
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
        () => setCenter([28.6139, 77.209])
      );
    }
  }, []);

  // Listen to Firestore reports; fallback/merge with rich DUMMY_REPORTS
  useEffect(() => {
    if (!db) {
      setReports(DUMMY_REPORTS);
      return;
    }
    const reportsRef = collection(db, 'reports');
    const unsubscribe = onSnapshot(
      reportsRef,
      (snap) => {
        if (snap.empty || snap.docs.length === 0) {
          setReports(DUMMY_REPORTS);
        } else {
          const firestoreData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Merge with dummy reports so the platform always feels active and well-seeded
          const merged = [...firestoreData, ...DUMMY_REPORTS.filter((dm) => !firestoreData.some((fd) => fd.id === dm.id))];
          setReports(merged);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Firestore live listener warning, using mock reports:', err);
        setReports(DUMMY_REPORTS);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const active = reports.filter((r) => r.status === 'reported').length;
    const inProgress = reports.filter((r) => r.status === 'in_progress' || r.status === 'community_verified').length;
    const resolved = reports.filter((r) => r.status === 'resolved').length;
    const nearbyCount = reports.filter(
      (r) => r.geoPoint && DISTANCE_KM(center[0], center[1], r.geoPoint.lat, r.geoPoint.lng) <= 5
    ).length;
    return { active, inProgress, resolved, nearbyCount: nearbyCount || reports.length };
  }, [reports, center]);

  // Filtering
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'reported' && r.status !== 'reported') return false;
        if (statusFilter === 'in_progress' && r.status !== 'in_progress' && r.status !== 'community_verified') return false;
        if (statusFilter === 'resolved' && r.status !== 'resolved') return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${r.title ?? ''} ${r.category ?? ''} ${r.description ?? ''} ${r.address ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, categoryFilter, statusFilter, search]);

  // Nearby issues sorted by distance
  const nearby = useMemo(() => {
    const list = [...reports];
    list.sort((a, b) => {
      const da = a.geoPoint ? DISTANCE_KM(center[0], center[1], a.geoPoint.lat, a.geoPoint.lng) : Infinity;
      const db_ = b.geoPoint ? DISTANCE_KM(center[0], center[1], b.geoPoint.lat, b.geoPoint.lng) : Infinity;
      return da - db_;
    });
    return list.slice(0, 5);
  }, [reports, center]);

  // Community Activity
  const activityList = useMemo(() => {
    return [
      {
        id: 'act-1',
        title: 'Emergency work order issued',
        desc: 'Water & Sewerage crew dispatched to Connaught Place',
        time: '6m ago',
        tag: 'DISPATCH',
        tagColor: '#2563EB',
      },
      {
        id: 'act-2',
        title: '3 community verifications logged',
        desc: 'Crater on Barakhamba Rd confirmed by verified residents',
        time: '18m ago',
        tag: 'VERIFIED',
        tagColor: '#F59E0B',
      },
      {
        id: 'act-3',
        title: 'AI deduplication executed',
        desc: '2 duplicate reports merged into single ticket [CP-102]',
        time: '32m ago',
        tag: 'AI MESH',
        tagColor: '#22C55E',
      },
      {
        id: 'act-4',
        title: 'Issue marked resolved & verified',
        desc: 'Gole Market waste obstruction cleared by sanitation crew',
        time: '1h ago',
        tag: 'RESOLVED',
        tagColor: '#22C55E',
      },
      {
        id: 'act-5',
        title: 'Street illumination ticket assigned',
        desc: 'Electricity Board scheduled night repairs for Lodhi Road',
        time: '2h ago',
        tag: 'ASSIGNED',
        tagColor: '#2563EB',
      },
    ];
  }, []);

  const firstName = (user?.displayName || 'Citizen').split(' ')[0];

  return (
    <div className="min-h-full bg-[#0A0A0A] text-[#F5F5F5] font-sans pb-16">
      
      {/* ── Top Operational Banner ── */}
      <div className="border-b border-[#222222] bg-[#111111]/90 backdrop-blur-md sticky top-0 z-30 py-4">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono tracking-[0.08em] uppercase text-[#888888] px-2 py-0.5 border border-[#222222] bg-[#0A0A0A] rounded-[2px]">
                © CIVIC OPERATIONS HUB · METROPOLITAN DISPATCH
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#22C55E]">
                <span className="live-dot" /> LIVE
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal tracking-[-0.02em] text-[#F5F5F5] leading-tight">
              City Operations & Real-Time Pulse.
            </h1>
            <p className="text-xs font-mono text-[#888888] mt-0.5">
              Welcome, <span className="text-[#F5F5F5] font-semibold">{firstName}</span>. Active dispatch monitoring for Metropolitan Ward 07.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search issues, wards..."
                className="h-10 w-full rounded-[2px] border border-[#222222] bg-[#161616] pl-9 pr-8 text-xs font-mono text-[#F5F5F5] placeholder:text-[#555555] focus:outline-none focus:border-[#2563EB] transition-colors"
                aria-label="Search issues"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#555555] border border-[#222222] px-1 py-0.5 rounded-[1px] hidden sm:block">
                ⌘K
              </span>
            </div>

            <Link to="/report" className="editorial-btn-primary text-xs py-2 px-4 shrink-0">
              <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={2.5} />
              REPORT ISSUE
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col gap-8">
        {/* ── 4 Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<AlertCircle className="w-4 h-4" />}
            label="Critical Complaints"
            value={stats.active}
            tone="danger"
            hint="Reported & awaiting triage"
            delta={-12}
            deltaLabel="12% reduction in unassigned backlog"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Pending In-Progress"
            value={stats.inProgress}
            tone="warning"
            hint="Field crews assigned"
            delta={8}
            deltaLabel="Active dispatch velocity"
          />
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Resolved This Cycle"
            value={stats.resolved}
            tone="success"
            hint="Verified by community audit"
            delta={24}
            deltaLabel="Improvement in resolution SLA"
          />
          <StatCard
            icon={<Compass className="w-4 h-4" />}
            label="Nearby In Ward"
            value={stats.nearbyCount}
            tone="primary"
            hint="Within 5 km radius"
          />
        </div>

        {/* ── Map + Live Activity Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols: Map Chrome & Nearby Problems */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Map Container */}
            <div className="editorial-card p-0 overflow-hidden bg-[#111111]">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#222222] bg-[#161616]">
                <div className="flex items-center gap-2.5">
                  <span className="live-dot" />
                  <div>
                    <h2 className="text-xs font-mono font-bold text-[#F5F5F5] uppercase tracking-wider">
                      Live Incident Map
                    </h2>
                    <p className="text-[10px] font-mono text-[#888888] mt-0.5">
                      {filtered.length} active geolocations rendered
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-8 rounded-[2px] border border-[#222222] bg-[#111111] px-2 text-[11px] font-mono text-[#F5F5F5] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                    aria-label="Filter by category"
                  >
                    <option value="all">ALL CATEGORIES</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label.toUpperCase()}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 rounded-[2px] border border-[#222222] bg-[#111111] px-2 text-[11px] font-mono text-[#F5F5F5] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                    aria-label="Filter by status"
                  >
                    <option value="all">ALL STATUSES</option>
                    <option value="reported">CRITICAL / OPEN</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="resolved">RESOLVED</option>
                  </select>
                </div>
              </div>

              {/* Leaflet Map Box */}
              <div className="h-[400px] sm:h-[460px] relative bg-[#0A0A0A]">
                <CityMap reports={filtered} center={center} showUserMarker fitBounds={filtered.length > 0} />
              </div>

              {/* Map Footer Bar */}
              <div className="px-5 py-2.5 bg-[#161616] border-t border-[#222222] flex items-center justify-between text-[11px] font-mono text-[#888888]">
                <span>Coordinates: {center[0].toFixed(4)}° N, {center[1].toFixed(4)}° E</span>
                <span className="text-[#22C55E] flex items-center gap-1">
                  <span>●</span> 12 MUNICIPAL CREWS DEPLOYED
                </span>
              </div>
            </div>

            {/* Nearby Civic Problems list */}
            <div className="editorial-card p-5 bg-[#111111]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#222222]">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-[2px] bg-[#2563EB]/10 border border-[#2563EB]/30 text-[#2563EB] flex items-center justify-center">
                    <Compass className="w-3.5 h-3.5" />
                  </span>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F5F5]">
                    Nearby Verified Incidents
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-[#888888] uppercase">
                  SORTED BY PROXIMITY
                </span>
              </div>

              <div className="divide-y divide-[#222222]">
                {nearby.map((r) => {
                  const sev = r.severityScore ?? 5;
                  const dotColor =
                    r.status === 'resolved'
                      ? '#22C55E'
                      : sev >= 7
                        ? '#EF4444'
                        : '#F59E0B';
                  const dist = center && r.geoPoint ? DISTANCE_KM(center[0], center[1], r.geoPoint.lat, r.geoPoint.lng) * 1000 : null;

                  return (
                    <div key={r.id} className="py-3 group transition-colors hover:bg-[#161616]/60 px-2 rounded-[2px]">
                      <Link to={`/issue/${r.id}`} className="flex items-center gap-3 no-underline">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#F5F5F5] truncate group-hover:text-[#2563EB] transition-colors">
                            {r.title || categoryById(r.category).label}
                          </p>
                          <p className="text-[11px] font-mono text-[#888888] truncate mt-0.5">
                            [{categoryById(r.category).short}] · {r.address || 'Central Corridor'} · {formatRelativeTime(r.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-mono text-xs text-[#2563EB] tabular-nums">
                            {dist !== null ? (dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`) : ''}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#555555] group-hover:text-[#F5F5F5] transition-colors" />
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Urgent Alerts & Real-Time Community Stream */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Urgent Dispatch Alerts */}
            <div className="editorial-card p-5 bg-[#111111]">
              <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-[2px] bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5" />
                  </span>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F5F5]">
                    Critical Alerts
                  </h2>
                </div>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">
                  {stats.active} ACTIVE
                </span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    tone: 'border-l-2 border-[#EF4444]',
                    badge: 'WATER BOARD',
                    text: 'Potable water main rupture at Connaught Place: valve shutdown initiated.',
                    time: '14m ago',
                  },
                  {
                    tone: 'border-l-2 border-[#F59E0B]',
                    badge: 'ROADS PWD',
                    text: 'Cold asphalt mixer en route to Barakhamba sinkhole.',
                    time: '42m ago',
                  },
                  {
                    tone: 'border-l-2 border-[#22C55E]',
                    badge: 'SANITATION',
                    text: 'Commercial waste removal complete at Gole Market Square.',
                    time: '2h ago',
                  },
                ].map((item, idx) => (
                  <div key={idx} className={`p-3 bg-[#161616] border border-[#222222] ${item.tone} rounded-[2px]`}>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#888888] mb-1">
                      <span className="text-[#F5F5F5] font-semibold">[{item.badge}]</span>
                      <span>{item.time}</span>
                    </div>
                    <p className="text-xs text-[#888888] leading-snug font-sans">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Real-time Activity Stream */}
            <div className="editorial-card p-5 bg-[#111111]">
              <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-[2px] bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5" />
                  </span>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F5F5]">
                    Dispatch Log
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-[#555555]">LIVE FEED</span>
              </div>

              <div className="space-y-3">
                {activityList.map((act) => (
                  <div key={act.id} className="p-3 bg-[#161616] border border-[#222222] rounded-[2px] hover:border-[#333333] transition-colors">
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span
                        className="px-1.5 py-0.5 rounded-[2px] font-bold"
                        style={{
                          color: act.tagColor,
                          backgroundColor: `${act.tagColor}15`,
                          border: `1px solid ${act.tagColor}40`,
                        }}
                      >
                        {act.tag}
                      </span>
                      <span className="text-[#555555]">{act.time}</span>
                    </div>
                    <p className="text-xs font-semibold text-[#F5F5F5] mt-1">{act.title}</p>
                    <p className="text-[11px] text-[#888888] font-sans mt-0.5">{act.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent Complaints Grid ── */}
        <div className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-3 border-b border-[#222222]">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#555555] tracking-wider block">
                INCIDENT DATABASE
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#F5F5F5] font-normal tracking-tight">
                Recent Citizen Complaints
              </h2>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#111111] border border-[#222222] rounded-[2px]">
              {[
                { id: 'all', label: 'ALL' },
                { id: 'reported', label: 'CRITICAL' },
                { id: 'in_progress', label: 'IN PROGRESS' },
                { id: 'resolved', label: 'RESOLVED' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1 text-[11px] font-mono rounded-[2px] transition-colors cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#888888] hover:text-[#F5F5F5] hover:bg-[#161616]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="editorial-card p-12 bg-[#111111] text-center">
              <EmptyState
                icon={<Search className="w-8 h-8 text-[#555555]" />}
                title="No reports match your filters"
                description="Try clearing your search term or selecting a different category."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((report) => (
                <ComplaintCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
