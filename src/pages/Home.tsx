import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { Search, Plus, MapPin, AlertCircle, CheckCircle2, Clock, Bell, Activity, Users, Flame, Compass } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CityMap from '../components/CityMap';
import ComplaintCard from '../components/ComplaintCard';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { CATEGORIES, categoryById, statusLabel } from '../lib/status';
import { formatRelativeTime, getDate, greeting } from '../lib/format';

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
  const [reports, setReports] = useState<any[]>([]);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
        () => setCenter([37.7749, -122.4194])
      );
    } else {
      setCenter([37.7749, -122.4194]);
    }
  }, []);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const reportsRef = collection(db, 'reports');
    const unsubscribe = onSnapshot(
      reportsRef,
      (snap) => {
        const data = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        data.sort((a: any, b: any) => getDate(b.createdAt).getTime() - getDate(a.createdAt).getTime());
        setReports(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading reports:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    const active = reports.filter((r) => r.status === 'reported').length;
    const inProgress = reports.filter((r) => r.status === 'in_progress' || r.status === 'community_verified').length;
    const resolved = reports.filter((r) => r.status === 'resolved').length;
    return { active, inProgress, resolved };
  }, [reports]);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${r.title ?? ''} ${r.category ?? ''} ${r.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, categoryFilter, statusFilter, search]);

  const nearby = useMemo(() => {
    const list = [...reports];
    if (center) {
      list.sort((a, b) => {
        const da = a.geoPoint ? DISTANCE_KM(center[0], center[1], a.geoPoint.lat, a.geoPoint.lng) : Infinity;
        const db_ = b.geoPoint ? DISTANCE_KM(center[0], center[1], b.geoPoint.lat, b.geoPoint.lng) : Infinity;
        return da - db_;
      });
    }
    return list.slice(0, 5);
  }, [reports, center]);

  const activity = useMemo(() => {
    return reports.slice(0, 6).map((r) => {
      const resolved = r.status === 'resolved';
      const sev = r.severityScore ?? 5;
      const cat = categoryById(r.category);
      return {
        id: r.id,
        icon: resolved ? CheckCircle2 : sev >= 7 ? Flame : MapPin,
        tone: resolved
          ? 'bg-success-soft text-success'
          : sev >= 7
          ? 'bg-danger-soft text-danger'
          : 'bg-primary-soft text-primary',
        title: resolved ? 'Issue resolved' : sev >= 7 ? 'Critical issue reported' : 'New issue reported',
        text: `${r.title || cat.label}`,
        time: formatRelativeTime(r.createdAt),
      };
    });
  }, [reports]);

  const firstName = (user?.displayName || 'there').split(' ')[0];

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
      {/* ── Welcome header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-faint">{greeting()},</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mt-0.5">
            Welcome back, <span className="text-gradient">{firstName}</span> 👋
          </h1>
          <p className="text-sm text-muted mt-1">
            Here's what's happening in your city right now — {stats.active + stats.inProgress} open issues,{' '}
            {stats.resolved} resolved.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues…"
              className="h-11 w-64 rounded-xl border border-line-strong bg-card pl-10 pr-4 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              aria-label="Search issues"
            />
          </div>
          <Button to="/report">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Report an Issue
          </Button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<AlertCircle className="w-4 h-4" />} label="Active complaints" value={stats.active} tone="danger" hint="Reported & waiting" />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Pending requests" value={stats.inProgress} tone="warning" hint="In progress or verified" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Resolved" value={stats.resolved} tone="success" hint="Fixed & closed" />
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Nearby problems"
          value={
            center
              ? reports.filter((r) => r.geoPoint && DISTANCE_KM(center[0], center[1], r.geoPoint.lat, r.geoPoint.lng) <= 3).length
              : reports.length
          }
          tone="primary"
          hint="Within 3 km of you"
        />
      </div>

      {/* ── Map + activity feed ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Map card */}
          <div className="bg-card border border-line rounded-2xl shadow-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink leading-none">Live City Map</h2>
                  <p className="text-xs text-faint mt-0.5">{filtered.length} issues shown</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-9 rounded-lg border border-line-strong bg-card px-2.5 text-xs font-semibold text-ink focus:outline-none focus:border-primary cursor-pointer"
                  aria-label="Filter by category"
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-lg border border-line-strong bg-card px-2.5 text-xs font-semibold text-ink focus:outline-none focus:border-primary cursor-pointer"
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  <option value="reported">Critical</option>
                  <option value="in_progress">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="h-[380px] sm:h-[440px] p-3">
              <CityMap reports={filtered} center={center} showUserMarker fitBounds={filtered.length > 0} />
            </div>
          </div>

          {/* Nearby civic problems */}
          <div className="bg-card border border-line rounded-2xl shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-teal-soft text-teal-brand flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </span>
                <h2 className="text-sm font-bold text-ink">Nearby Civic Problems</h2>
              </div>
              <Badge tone="neutral">Sorted {center ? 'by distance' : 'by recency'}</Badge>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} height={56} />
                ))}
              </div>
            ) : nearby.length === 0 ? (
              <EmptyState
                icon={<MapPin className="w-6 h-6" />}
                title="No issues nearby"
                description="Your neighbourhood looks great right now. Found something? Be the first to report it."
                action={
                  <Button to="/report" size="sm">
                    <Plus className="w-3.5 h-3.5" /> Report an issue
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {nearby.map((r) => {
                  const sev = r.severityScore ?? 5;
                  const dotColor =
                    r.status === 'resolved'
                      ? 'var(--success)'
                      : sev >= 7
                      ? 'var(--danger)'
                      : sev >= 4
                      ? 'var(--warning)'
                      : 'var(--primary)';
                  const dist = center && r.geoPoint ? DISTANCE_KM(center[0], center[1], r.geoPoint.lat, r.geoPoint.lng) * 1000 : null;
                  return (
                    <li key={r.id}>
                      <Link to={`/issue/${r.id}`} className="flex items-center gap-3 py-3 group no-underline">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dotColor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate group-hover:text-primary transition-colors">
                            {r.title || categoryById(r.category).label}
                          </p>
                          <p className="text-xs text-faint truncate">
                            {categoryById(r.category).label} · {formatRelativeTime(r.createdAt)}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-faint shrink-0 tabular-nums">
                          {dist !== null ? (dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`) : ''}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Right column: notifications + activity ── */}
        <div className="flex flex-col gap-4">
          {/* Notifications */}
          <div className="bg-card border border-line rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-warning-soft text-warning flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-ink">Notifications</h2>
              <span className="ml-auto w-5 h-5 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                {Math.min(9, stats.active)}
              </span>
            </div>
            <ul className="space-y-3">
              {[
                { tone: 'bg-danger-soft text-danger', text: `${stats.active} issues need attention in your area`, time: 'Now' },
                { tone: 'bg-success-soft text-success', text: `${stats.resolved} issues resolved this month`, time: 'Today' },
                { tone: 'bg-primary-soft text-primary', text: 'Ward 07 forecast: waterlogging may rise +40%', time: 'Yesterday' },
              ].map((n, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-subtle transition-colors">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${n.tone}`}>
                    <Bell className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] font-medium text-ink leading-snug">{n.text}</p>
                    <p className="text-[0.6875rem] text-faint mt-0.5">{n.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Community activity feed */}
          <div className="bg-card border border-line rounded-2xl shadow-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-ink">Community Activity</h2>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} height={48} />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <EmptyState icon={<Activity className="w-6 h-6" />} title="No activity yet" description="Be the first to report an issue and kick things off." />
            ) : (
              <ul className="space-y-1">
                {activity.map((a) => (
                  <li key={a.id}>
                    <Link to={`/issue/${a.id}`} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-subtle transition-colors no-underline group">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${a.tone}`}>
                        <a.icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.8125rem] font-semibold text-ink leading-snug">{a.title}</p>
                        <p className="text-xs text-muted truncate mt-0.5">{a.text}</p>
                      </div>
                      <span className="text-[0.6875rem] text-faint shrink-0">{a.time}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent complaints ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold tracking-tight text-ink">Recent Complaints</h2>
          <div className="flex items-center gap-2">
            {['all', 'reported', 'in_progress', 'resolved'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  statusFilter === s ? 'bg-primary text-white' : 'bg-subtle text-muted hover:text-ink'
                }`}
              >
                {s === 'all' ? 'All' : statusLabel(s)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={280} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-line rounded-2xl shadow-card">
            <EmptyState
              icon={<Search className="w-6 h-6" />}
              title="No complaints match your filters"
              description="Try adjusting the category, status, or search term."
            />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filtered.slice(0, 8).map((r) => (
              <ComplaintCard key={r.id} report={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
