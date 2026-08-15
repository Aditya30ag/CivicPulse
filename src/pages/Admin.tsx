import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, doc, getDocs, onSnapshot, query, orderBy, limit, startAfter, updateDoc, setDoc, where, arrayUnion } from 'firebase/firestore';
import {
  Loader2,
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  Map as MapIcon,
  Activity,
  Lightbulb,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Eye,
  MessageSquarePlus,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  GitMerge,
  Eye as EyeIcon,
  TrendingUp,
  Flame,
  ShieldCheck,
  Inbox,
} from 'lucide-react';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { predictWardTrend } from '../lib/gemini';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import CityMap from '../components/CityMap';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { categoryById, departmentForCategory, DEPARTMENT_OPTIONS, severityColor, severityLabel, STATUS_META } from '../lib/status';
import { formatDateTime, formatRelativeTime, getDate } from '../lib/format';
import { useTheme } from '../lib/theme';
import { useToast } from '../contexts/ToastContext';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const sevIcon = (sev: number) =>
  L.divIcon({
    html: `<div style="
      background-color: ${severityColor(sev)};
      width: 24px; height: 24px; border-radius: 50%;
      border: 2.5px solid #fff;
      box-shadow: 0 3px 10px rgba(2,6,23,0.35);
    "></div>`,
    className: 'custom-leaflet-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

function HeatmapLayer({ data, visible }: { data: any[]; visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!visible) return;
    const points = data
      .filter((d) => d.geoPoint?.lat && d.geoPoint?.lng)
      .map((d) => [d.geoPoint.lat, d.geoPoint.lng, d.severityScore ? d.severityScore : 0.5]);
    // @ts-ignore
    const heatLayer = L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 14 }).addTo(map);
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, data, visible]);
  return null;
}

function AutoFitBounds({ data }: { data: any[] }) {
  const map = useMap();
  useEffect(() => {
    const points = data.filter((d) => d.geoPoint?.lat && d.geoPoint?.lng).map((d) => [d.geoPoint.lat, d.geoPoint.lng] as [number, number]);
    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView([37.7749, -122.4194], 13);
    }
  }, [map, data]);
  return null;
}

const TABS = [
  { id: 'queue', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'reports', label: 'Management', icon: ClipboardList },
  { id: 'map', label: 'Live Map', icon: MapIcon },
  { id: 'activity', label: 'Agent Activity', icon: Activity },
  { id: 'insights', label: 'Predictive Insights', icon: Lightbulb },
];

function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const meta = STATUS_META[value] ?? STATUS_META.reported;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-full px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide cursor-pointer border ${meta.bg} ${meta.text} focus:outline-none`}
      style={{ borderColor: 'transparent' }}
    >
      <option value="reported">Reported</option>
      <option value="community_verified">Verified</option>
      <option value="in_progress">In Progress</option>
      <option value="resolved">Resolved</option>
    </select>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const { subpage } = useParams<{ subpage: string }>();
  const { theme } = useTheme();
  const { success } = useToast();

  const activeTab = (subpage || 'queue') as string;

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Management table state
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [lastDoc, setLastDoc] = useState<any | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatus, setTableStatus] = useState('all');

  // Update modal
  const [updateTarget, setUpdateTarget] = useState<any | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);

  const PAGE_SIZE = 10;

  useEffect(() => {
    setIsAdmin(true);
  }, []);

  const loadReportsList = async (loadMore = false) => {
    if (!db) return;
    try {
      setLoadingReports(true);
      let reportsQuery;
      if (loadMore && lastDoc) {
        reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
      } else {
        reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
      }
      const snapshot = await getDocs(reportsQuery);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
      if (loadMore) {
        setReportsList((prev) => [...prev, ...data]);
      } else {
        setReportsList(data);
      }
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports' && reportsList.length === 0) {
      loadReportsList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* Ward forecasting sweep (existing behaviour) */
  useEffect(() => {
    if (!isAdmin || !db) return;
    const fetchWards = async () => {
      const wardsRef = collection(db, 'wards');
      const snap = await getDocs(wardsRef);
      let currentWards = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

      if (currentWards.length === 0) {
        const sampleWards = [
          { name: 'Downtown District', lastSweepAt: null, forecast: null },
          { name: 'North Hills', lastSweepAt: null, forecast: null },
          { name: 'Westside Valley', lastSweepAt: null, forecast: null },
          { name: 'Southside Port', lastSweepAt: null, forecast: null },
        ];
        for (const w of sampleWards) {
          const nr = doc(wardsRef);
          await setDoc(nr, w);
          currentWards.push({ id: nr.id, ...w });
        }
      }
      setWards(currentWards);

      for (const ward of currentWards) {
        const now = Date.now();
        let shouldSweep = false;
        if (!ward.lastSweepAt) {
          shouldSweep = true;
        } else {
          const lastSweep = new Date(ward.lastSweepAt).getTime();
          if (now - lastSweep > 60 * 60 * 1000) shouldSweep = true;
        }

        if (shouldSweep) {
          let repQuery;
          if (ward.lastSweepAt) {
            repQuery = query(collection(db, 'reports'), where('createdAt', '>', new Date(ward.lastSweepAt)), orderBy('createdAt', 'desc'), limit(20));
          } else {
            repQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(20));
          }
          const repSnap = await getDocs(repQuery);
          const recentReports = repSnap.docs.map((d) => {
            const data = d.data() as { category: string; severityScore?: number };
            return { category: data.category, severityScore: data.severityScore || 5 };
          });

          if (recentReports.length > 0) {
            try {
              const forecast = await predictWardTrend(recentReports);
              const isoNow = new Date().toISOString();
              await updateDoc(doc(db, 'wards', ward.id), { lastSweepAt: isoNow, forecast });
              setWards((prev) => prev.map((p) => (p.id === ward.id ? { ...p, lastSweepAt: isoNow, forecast } : p)));
            } catch (e) {
              console.error('Failed to predict trend for', ward.name, e);
            }
          } else {
            const isoNow = new Date().toISOString();
            await updateDoc(doc(db, 'wards', ward.id), { lastSweepAt: isoNow });
            setWards((prev) => prev.map((p) => (p.id === ward.id ? { ...p, lastSweepAt: isoNow } : p)));
          }
        }
      }
    };
    fetchWards();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !db) return;
    const reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(reportsQuery, (snap) => {
      setReports(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'resolved') {
        updateData.resolvedAt = new Date().toISOString();
      }
      await updateDoc(doc(db, 'reports', reportId), updateData);
      setReportsList((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r)));
      success('Status updated', `Issue moved to ${newStatus.replace('_', ' ')}.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignDepartment = async (reportId: string, department: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { department });
      setReportsList((prev) => prev.map((r) => (r.id === reportId ? { ...r, department } : r)));
      success('Department assigned', department);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddUpdate = async () => {
    if (!updateTarget || !updateText.trim()) return;
    try {
      setSavingUpdate(true);
      const update = {
        text: updateText.trim(),
        by: user?.displayName || 'Admin',
        at: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'reports', updateTarget.id), {
        updates: arrayUnion(update),
        agentTrace: arrayUnion({
          agent: 'Routing',
          reasoning: `Update posted: ${update.text}`,
          timestamp: update.at,
        }),
      });
      setReportsList((prev) =>
        prev.map((r) => (r.id === updateTarget.id ? { ...r, updates: [...(r.updates || []), update] } : r))
      );
      success('Update added', 'Citizens can now see your update on the issue page.');
      setUpdateTarget(null);
      setUpdateText('');
    } catch (e) {
      console.error(e);
    } finally {
      setSavingUpdate(false);
    }
  };

  if (isAdmin === null) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Derived data ── */
  const unresolved = reports.filter((r) => r.status !== 'resolved').sort((a, b) => (b.severityScore || 0) - (a.severityScore || 0));
  const totalReports = reports.length;
  const resolvedReports = reports.filter((r) => r.status === 'resolved');
  const pendingReports = reports.filter((r) => r.status === 'in_progress' || r.status === 'community_verified');
  const highSeverityCount = unresolved.filter((r) => r.severityScore >= 7).length;

  let avgResolutionTime = '—';
  if (resolvedReports.length > 0) {
    let totalTime = 0;
    let count = 0;
    for (const r of resolvedReports) {
      if (r.createdAt && r.resolvedAt) {
        const createT = getDate(r.createdAt).getTime();
        const resT = getDate(r.resolvedAt).getTime();
        if (resT > createT) {
          totalTime += resT - createT;
          count++;
        }
      }
    }
    avgResolutionTime = count > 0 ? (totalTime / count / (1000 * 60 * 60 * 24)).toFixed(1) + 'd' : '2.4d';
  }

  const riskScore = Math.min(100, Math.round((highSeverityCount / Math.max(1, unresolved.length)) * 100 * 1.5 + 20));
  const dynamicRiskData = [
    { name: 'Risk', value: riskScore || 1, fill: riskScore > 60 ? 'var(--danger)' : 'var(--success)' },
    { name: 'Safe', value: 100 - (riskScore || 0), fill: 'var(--line)' },
  ];

  /* Trend chart data (reports over time) */
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartDataMap = new Map<string, { new: number; resolved: number; timestamp: number }>();
  reports.forEach((r) => {
    if (!r.createdAt) return;
    const d = getDate(r.createdAt);
    if (isNaN(d.getTime())) return;
    const mKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    if (!chartDataMap.has(mKey)) chartDataMap.set(mKey, { new: 0, resolved: 0, timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() });
    const item = chartDataMap.get(mKey)!;
    item.new += 1;
    if (r.status === 'resolved') item.resolved += 1;
  });
  let trendData = Array.from(chartDataMap.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp)
    .slice(-6)
    .map(([, c]) => ({ name: months[new Date(c.timestamp).getMonth()], new: c.new, resolved: c.resolved }));
  if (trendData.length === 0) {
    trendData = [{ name: months[new Date().getMonth()], new: 0, resolved: 0 }];
  }

  /* Response time by month (resolved reports) */
  const respMap = new Map<string, { total: number; count: number }>();
  resolvedReports.forEach((r) => {
    if (!r.createdAt || !r.resolvedAt) return;
    const createT = getDate(r.createdAt).getTime();
    const resT = getDate(r.resolvedAt).getTime();
    if (resT <= createT) return;
    const d = getDate(r.resolvedAt);
    const mKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    if (!respMap.has(mKey)) respMap.set(mKey, { total: 0, count: 0 });
    const item = respMap.get(mKey)!;
    item.total += (resT - createT) / (1000 * 60 * 60 * 24);
    item.count += 1;
  });
  let responseData = Array.from(respMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([mKey, v]) => ({ name: months[new Date(mKey + '-01').getMonth()], days: Math.round((v.total / v.count) * 10) / 10 }));
  if (responseData.length === 0) {
    responseData = [{ name: months[new Date().getMonth()], days: 0 }];
  }

  /* Category distribution */
  const categoryCounts = reports.reduce((acc, curr) => {
    const cat = curr.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const catColors = ['var(--primary)', 'var(--teal-brand)', 'var(--warning)', 'var(--danger)', 'var(--success)'];
  const categoryData = Object.entries(categoryCounts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5)
    .map(([name, count], idx) => ({ name, value: count as number, color: catColors[idx] }));
  const totalCat = categoryData.reduce((s, c) => s + c.value, 0) || 1;

  /* Department performance */
  const deptMap = new Map<string, { total: number; resolved: number }>();
  reports.forEach((r) => {
    const dept = r.department || departmentForCategory(r.category);
    if (!deptMap.has(dept)) deptMap.set(dept, { total: 0, resolved: 0 });
    const item = deptMap.get(dept)!;
    item.total += 1;
    if (r.status === 'resolved') item.resolved += 1;
  });
  const deptData = Array.from(deptMap.entries())
    .map(([name, v]) => ({ name, total: v.total, resolved: v.resolved, rate: Math.round((v.resolved / Math.max(1, v.total)) * 100) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const topItems = unresolved.slice(0, 5).map((r: any) => ({
    id: r.id,
    sev: r.severityScore || 5,
    title: r.title || `${categoryById(r.category).label} issue`,
    status: r.status || 'reported',
    time: formatRelativeTime(r.createdAt),
  }));

  const allTraces = reports
    .flatMap((r) =>
      (r.agentTrace || []).map((trace: any) => ({ ...trace, reportId: r.id, category: r.category, title: r.title }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30);

  const filteredTable = reportsList.filter((r) => {
    if (tableStatus !== 'all' && r.status !== tableStatus) return false;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      if (!`${r.title ?? ''} ${r.category ?? ''} ${r.description ?? ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const tileUrl = theme === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <div className="flex flex-col lg:flex-row min-h-full bg-page">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-line bg-card sticky top-16 h-[calc(100dvh-4rem)]">
        <div className="p-4 flex flex-col gap-1 flex-1">
          <p className="px-3 pt-2 pb-3 text-[0.6875rem] font-bold uppercase tracking-widest text-faint">Command Center</p>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                to={`/admin/${tab.id}`}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 no-underline ${
                  active ? 'bg-primary text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,0.7)]' : 'text-muted hover:text-ink hover:bg-subtle'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-line">
          <div className="rounded-xl bg-subtle border border-line p-3.5 flex flex-col gap-1.5 text-[0.6875rem] font-semibold text-muted">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              System nominal
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {totalReports} issues tracked
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main panel ── */}
      <div className="flex-1 min-w-0 overflow-x-hidden">
        {/* Mobile tab chips */}
        <div className="lg:hidden sticky top-16 z-30 bg-page/90 backdrop-blur border-b border-line px-4 py-2.5 overflow-x-auto flex gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                to={`/admin/${tab.id}`}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors no-underline ${
                  active ? 'bg-primary text-white' : 'bg-card text-muted border border-line'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* ══════════ OVERVIEW ══════════ */}
          {activeTab === 'queue' && (
            <div className="animate-fade-in space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-ink">City Overview</h1>
                  <p className="text-sm text-muted mt-0.5">Real-time snapshot of civic issues across the city.</p>
                </div>
                <Badge tone="success" dot>
                  Live
                </Badge>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard icon={<Inbox className="w-4 h-4" />} label="Total complaints" value={totalReports} tone="primary" hint="All time" />
                <StatCard icon={<CheckCircle className="w-4 h-4" />} label="Resolved" value={resolvedReports.length} tone="success" hint="Closed issues" />
                <StatCard icon={<Clock className="w-4 h-4" />} label="Pending" value={pendingReports.length + unresolved.filter((r) => r.status === 'reported').length} tone="warning" hint="Open requests" />
                <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Avg resolution" value={avgResolutionTime} tone="teal" hint="Per resolved issue" />
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Trend chart */}
                <div className="lg:col-span-2 bg-card border border-line rounded-2xl shadow-card p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-ink">Issue trends</h3>
                    <div className="flex items-center gap-4 text-xs font-semibold text-muted">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary" /> New
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-success" /> Resolved
                      </span>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradNew" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradRes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} width={30} />
                        <Tooltip
                          contentStyle={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--bg-card)', fontFamily: "'Inter', sans-serif", fontSize: 12 }}
                        />
                        <Area type="monotone" dataKey="new" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gradNew)" dot={false} />
                        <Area type="monotone" dataKey="resolved" stroke="var(--success)" strokeWidth={2.5} fill="url(#gradRes)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Risk gauge */}
                <div className="bg-card border border-line rounded-2xl shadow-card p-6 flex flex-col">
                  <h3 className="text-sm font-bold text-ink mb-2">City risk score</h3>
                  <div className="relative w-full h-44 flex flex-col items-center">
                    <ResponsiveContainer width={240} height={150}>
                      <PieChart>
                        <Pie data={dynamicRiskData} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={80} outerRadius={105} stroke="none" cornerRadius={6} paddingAngle={2} dataKey="value">
                          {dynamicRiskData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-[70px] flex flex-col items-center">
                      <span className="text-4xl font-extrabold text-ink tabular-nums leading-none">{riskScore}</span>
                      <span className="text-xs font-bold uppercase tracking-widest mt-1.5" style={{ color: riskScore > 60 ? 'var(--danger)' : 'var(--success)' }}>
                        {riskScore > 60 ? 'Elevated' : 'Normal'}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 rounded-xl bg-subtle border border-line p-3.5 text-xs text-muted leading-relaxed">
                    <strong className="text-ink">AI insight:</strong> waterlogging complaints are predicted to rise <strong className="text-ink">40%</strong> in Ward 07 over the next 14 days.
                  </p>
                </div>
              </div>

              {/* Priority queue */}
              <div className="bg-card border border-line rounded-2xl shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-line">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Flame className="w-4 h-4 text-danger" /> Priority queue
                  </h3>
                  <Link to="/admin/reports" className="text-xs font-bold text-primary hover:underline">
                    Manage all →
                  </Link>
                </div>
                <ul className="divide-y divide-line">
                  {topItems.map((item) => (
                    <li key={item.id}>
                      <Link to={`/issue/${item.id}`} className="flex items-center gap-3 px-6 py-3.5 hover:bg-subtle transition-colors no-underline group">
                        <span
                          className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide shrink-0"
                          style={{ background: severityColor(item.sev), color: '#fff' }}
                        >
                          {item.sev}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate group-hover:text-primary transition-colors">{item.title}</p>
                          <p className="text-xs text-faint">{severityLabel(item.sev)} · {item.time}</p>
                        </div>
                        <StatusSelect value={item.status} onChange={(v) => handleUpdateStatus(item.id, v)} />
                      </Link>
                    </li>
                  ))}
                  {topItems.length === 0 && (
                    <li className="px-6 py-10">
                      <EmptyState icon={<CheckCircle className="w-6 h-6" />} title="All clear" description="No unresolved issues in the queue right now." />
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* ══════════ ANALYTICS ══════════ */}
          {activeTab === 'analytics' && (
            <div className="animate-fade-in space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-ink">Analytics</h1>
                <p className="text-sm text-muted mt-0.5">Issue trends, department performance, and response times.</p>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Category distribution */}
                <div className="bg-card border border-line rounded-2xl shadow-card p-6">
                  <h3 className="text-sm font-bold text-ink mb-5">Distribution by category</h3>
                  <div className="space-y-4">
                    {categoryData.map((cat) => (
                      <div key={cat.name} className="flex items-center gap-3">
                        <span className="w-28 text-xs font-semibold text-ink truncate shrink-0">{cat.name}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-subtle overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(cat.value / totalCat) * 100}%`, background: cat.color }} />
                        </div>
                        <span className="w-10 text-right text-xs font-bold text-muted tabular-nums">{Math.round((cat.value / totalCat) * 100)}%</span>
                      </div>
                    ))}
                    {categoryData.length === 0 && <p className="text-sm text-muted text-center py-6">No reports yet.</p>}
                  </div>
                </div>

                {/* Response time */}
                <div className="bg-card border border-line rounded-2xl shadow-card p-6">
                  <h3 className="text-sm font-bold text-ink mb-5">Avg response time (days)</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={responseData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} width={30} />
                        <Tooltip
                          contentStyle={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--bg-card)', fontFamily: "'Inter', sans-serif", fontSize: 12 }}
                        />
                        <Line type="monotone" dataKey="days" stroke="var(--teal-brand)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--teal-brand)', strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Department performance */}
                <div className="lg:col-span-2 bg-card border border-line rounded-2xl shadow-card p-6">
                  <h3 className="text-sm font-bold text-ink mb-5">Department performance</h3>
                  {deptData.length === 0 ? (
                    <EmptyState
                      icon={<Building2 className="w-6 h-6" />}
                      title="No department data yet"
                      description="Assign departments to complaints in the Management tab to see performance here."
                      action={<Link to="/admin/reports" className="text-xs font-bold text-primary hover:underline">Go to Management →</Link>}
                    />
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {deptData.map((d) => (
                        <div key={d.name} className="rounded-2xl border border-line bg-page p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-ink truncate">{d.name}</p>
                            <span className={`text-[0.6875rem] font-extrabold tabular-nums ${d.rate >= 70 ? 'text-success' : d.rate >= 40 ? 'text-warning' : 'text-danger'}`}>
                              {d.rate}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-subtle overflow-hidden mb-2.5">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${d.rate}%`, background: d.rate >= 70 ? 'var(--success)' : d.rate >= 40 ? 'var(--warning)' : 'var(--danger)' }}
                            />
                          </div>
                          <p className="text-[0.6875rem] text-faint">
                            {d.resolved} of {d.total} resolved
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ MANAGEMENT ══════════ */}
          {activeTab === 'reports' && (
            <div className="animate-fade-in space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-ink">Complaint Management</h1>
                  <p className="text-sm text-muted mt-0.5">Change status, assign departments, and post updates.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
                    <input
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Search…"
                      className="h-10 w-52 rounded-xl border border-line-strong bg-card pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <select
                    value={tableStatus}
                    onChange={(e) => setTableStatus(e.target.value)}
                    className="h-10 rounded-xl border border-line-strong bg-card px-3 text-sm font-semibold text-ink focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all">All statuses</option>
                    <option value="reported">Reported</option>
                    <option value="community_verified">Verified</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {loadingReports && reportsList.length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} height={84} />
                  ))}
                </div>
              ) : filteredTable.length === 0 ? (
                <div className="bg-card border border-line rounded-2xl shadow-card">
                  <EmptyState
                    icon={<ClipboardList className="w-6 h-6" />}
                    title={reportsList.length === 0 ? 'No reports found' : 'No reports match your filters'}
                    description={reportsList.length === 0 ? 'Citizen reports will appear here as they are submitted.' : 'Try adjusting the search or status filter.'}
                  />
                </div>
              ) : (
                <div className="bg-card border border-line rounded-2xl shadow-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[880px]">
                      <thead>
                        <tr className="border-b border-line bg-subtle/60">
                          {['Issue', 'Severity', 'Status', 'Department', 'Reported', 'Actions'].map((h) => (
                            <th key={h} className="px-5 py-3.5 text-[0.6875rem] font-bold uppercase tracking-widest text-faint">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredTable.map((report) => {
                          const sev = report.severityScore ?? 5;
                          const dept = report.department || departmentForCategory(report.category);
                          return (
                            <tr key={report.id} className="hover:bg-subtle/50 transition-colors">
                              <td className="px-5 py-4">
                                <Link to={`/issue/${report.id}`} className="flex items-center gap-3 group no-underline">
                                  <span className="w-11 h-11 rounded-xl bg-subtle overflow-hidden shrink-0 flex items-center justify-center">
                                    {report.mediaURL ? (
                                      <img src={report.mediaURL} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                      <span className="w-full h-full flex items-center justify-center text-faint">
                                        <MapPin className="w-4 h-4" />
                                      </span>
                                    )}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-ink truncate group-hover:text-primary transition-colors">
                                      {report.title || categoryById(report.category).label}
                                    </p>
                                    <p className="text-xs text-faint truncate">{categoryById(report.category).label}</p>
                                  </div>
                                </Link>
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide"
                                  style={{ background: severityColor(sev), color: '#fff' }}
                                >
                                  {sev}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <StatusSelect value={report.status} onChange={(v) => handleUpdateStatus(report.id, v)} />
                              </td>
                              <td className="px-5 py-4">
                                <select
                                  value={dept}
                                  onChange={(e) => handleAssignDepartment(report.id, e.target.value)}
                                  className="max-w-[190px] rounded-lg border border-line-strong bg-card px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-primary cursor-pointer"
                                >
                                  {DEPARTMENT_OPTIONS.map((d) => (
                                    <option key={d} value={d}>
                                      {d}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-5 py-4 text-xs text-muted whitespace-nowrap">{formatRelativeTime(report.createdAt)}</td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setUpdateTarget(report);
                                      setUpdateText('');
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary transition-colors"
                                    title="Add update"
                                  >
                                    <MessageSquarePlus className="w-3.5 h-3.5" /> Update
                                  </button>
                                  <Link
                                    to={`/issue/${report.id}`}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-bold text-ink hover:border-primary hover:text-primary transition-colors no-underline"
                                    title="View details"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {hasMore && filteredTable.length > 0 && (
                    <div className="flex justify-center py-5 border-t border-line">
                      <Button variant="secondary" size="sm" onClick={() => loadReportsList(true)} loading={loadingReports}>
                        Load more
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════ LIVE MAP ══════════ */}
          {activeTab === 'map' && (
            <div className="animate-fade-in h-[calc(100dvh-16rem)] lg:h-[calc(100dvh-12rem)] min-h-[420px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-ink">Live Incident Map</h1>
                  <p className="text-sm text-muted mt-0.5">Unresolved issues across the city, coloured by status.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setShowHeatmap(!showHeatmap)}>
                  {showHeatmap ? 'Show markers' : 'Heatmap view'}
                </Button>
              </div>

              {showHeatmap ? (
                <div className="rounded-2xl overflow-hidden border border-line h-full">
                  <MapContainer center={[37.7749, -122.4194]} zoom={13} className="w-full h-full z-0">
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>' url={tileUrl} />
                    <AutoFitBounds data={unresolved} />
                    <HeatmapLayer data={unresolved} visible />
                  </MapContainer>
                </div>
              ) : (
                <div className="h-full">
                  <CityMap reports={unresolved} fitBounds className="!rounded-2xl" />
                </div>
              )}
            </div>
          )}

          {/* ══════════ AGENT ACTIVITY ══════════ */}
          {activeTab === 'activity' && (
            <div className="animate-fade-in max-w-3xl">
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold tracking-tight text-ink">AI Agent Activity</h1>
                <p className="text-sm text-muted mt-0.5">Every decision the agents make — logged and traceable.</p>
              </div>

              <div className="relative pl-2 space-y-4">
                <div className="absolute left-[31px] top-4 bottom-4 w-px bg-line" aria-hidden="true" />
                {allTraces.length === 0 ? (
                  <div className="bg-card border border-line rounded-2xl shadow-card">
                    <EmptyState icon={<Activity className="w-6 h-6" />} title="No agent activity yet" description="AI agent actions will appear here as reports are processed." />
                  </div>
                ) : (
                  allTraces.map((trace, index) => {
                    const agent = (trace.agent || '').toLowerCase();
                    const Icon =
                      agent === 'perception' ? EyeIcon
                      : agent === 'deduplication' ? Search
                      : agent === 'severity' ? AlertTriangle
                      : agent === 'verification' ? CheckCircle
                      : agent === 'routing' ? Building2
                      : agent === 'orchestrator' ? GitMerge
                      : Activity;
                    const tone = agent === 'orchestrator' ? 'bg-primary-soft text-primary' : 'bg-subtle text-muted';
                    return (
                      <motion.div
                        key={`${trace.reportId}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.04, 0.6), duration: 0.3 }}
                        className="relative z-10 flex gap-4"
                      >
                        <span className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-card shadow-card shrink-0 ${tone}`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        <div className="flex-1 bg-card border border-line rounded-2xl shadow-card p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wide text-primary">{trace.agent} Agent</span>
                              <Badge tone="neutral">Global</Badge>
                            </div>
                            <span className="text-xs text-faint font-mono">{formatRelativeTime(trace.timestamp)}</span>
                          </div>
                          <p className="text-sm text-muted leading-relaxed">{trace.reasoning}</p>
                          <div className="mt-3 flex items-center justify-between rounded-xl bg-subtle border border-line px-3.5 py-2.5">
                            <span className="text-xs text-muted font-semibold truncate max-w-[60%]">{trace.title || trace.category}</span>
                            <Link to={`/issue/${trace.reportId}`} target="_blank" className="text-xs font-bold text-primary hover:underline shrink-0">
                              View report →
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ══════════ PREDICTIVE INSIGHTS ══════════ */}
          {activeTab === 'insights' && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold tracking-tight text-ink">Predictive Insights</h1>
                <p className="text-sm text-muted mt-0.5">Autonomous 14-day forecasts generated per ward by the AI forecasting agent.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {wards.map((ward, idx) => (
                  <motion.div
                    key={ward.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.07 }}
                    className="bg-card border border-line rounded-2xl shadow-card p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-ink">{ward.name}</h3>
                        <span className="text-[0.6875rem] font-semibold uppercase tracking-widest text-faint">
                          WRD-{ward.id.substring(0, 6).toUpperCase()}
                        </span>
                      </div>
                      <Badge tone="neutral">{ward.lastSweepAt ? formatRelativeTime(ward.lastSweepAt) : 'Pending sweep'}</Badge>
                    </div>

                    {ward.forecast ? (
                      <div className="rounded-xl bg-gradient-to-br from-subtle to-page border border-line p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              ward.forecast.trend === 'increasing'
                                ? 'bg-danger-soft text-danger'
                                : ward.forecast.trend === 'decreasing'
                                ? 'bg-success-soft text-success'
                                : 'bg-subtle text-muted'
                            }`}
                          >
                            {ward.forecast.trend === 'increasing' ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : ward.forecast.trend === 'decreasing' ? (
                              <ArrowDownRight className="w-5 h-5" />
                            ) : (
                              <Minus className="w-5 h-5" />
                            )}
                          </span>
                          <div>
                            <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-faint">Predicted focus area</p>
                            <p className="text-sm font-bold text-ink flex items-center gap-2">
                              {ward.forecast.category}
                              <Badge
                                tone={ward.forecast.confidence === 'high' ? 'success' : ward.forecast.confidence === 'medium' ? 'warning' : 'danger'}
                              >
                                {ward.forecast.confidence} conf.
                              </Badge>
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted italic leading-relaxed">“{ward.forecast.reasoning}”</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2.5 py-10 text-sm italic text-muted">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing recent reports…
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add update modal ── */}
      <Modal open={!!updateTarget} onClose={() => setUpdateTarget(null)} title="Post an update" subtitle={updateTarget ? updateTarget.title || updateTarget.category : ''}>
        <textarea
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
          rows={4}
          maxLength={300}
          placeholder="e.g. Crew dispatched to site — estimated fix by Friday…"
          className="w-full rounded-xl border border-line-strong bg-card px-4 py-3 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none"
        />
        <p className="text-right text-xs text-faint mt-1">{updateText.length}/300</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={() => setUpdateTarget(null)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleAddUpdate} loading={savingUpdate} disabled={!updateText.trim()}>
            <MessageSquarePlus className="w-4 h-4" /> Post update
          </Button>
        </div>
      </Modal>
    </div>
  );
}
