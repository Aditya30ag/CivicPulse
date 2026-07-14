import React, { useEffect, useState } from 'react';
import { useNavigate, Link, NavLink, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, onSnapshot, query, orderBy, limit, updateDoc, setDoc, where } from 'firebase/firestore';
import { Loader2, LayoutList, Map as MapIcon, Activity, MapPin, AlertTriangle, User, Eye, Search, CheckCircle, ArrowRight, Lightbulb, ArrowUpRight, ArrowDownRight, Minus, GitMerge, Clock, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import { predictWardTrend } from '../lib/gemini';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/* ── Severity-based marker icons ──────────────────────────────────────── */
const iconHTML = (color: string) => `
  <div style="
    background-color: ${color};
    width: 24px; height: 24px;
    display: block;
    left: -12px; top: -12px;
    position: relative;
    border-radius: 50%;
    border: 2.5px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>
`;

const createMarkerIcon = (color: string) => L.divIcon({
  html: iconHTML(color),
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const sevIcon = (sev: number) => {
  if (sev >= 7) return createMarkerIcon('var(--signal)');
  if (sev >= 4) return createMarkerIcon('var(--hazard)');
  return createMarkerIcon('var(--verified)');
};

const icons = {
  reported: createMarkerIcon('var(--signal)'),
  in_progress: createMarkerIcon('var(--hazard)'),
  resolved: createMarkerIcon('var(--verified)'),
  community_verified: createMarkerIcon('var(--verified)'),
};

function HeatmapLayer({ data, visible }: { data: any[], visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!visible) return;
    const points = data
      .filter(d => d.geoPoint && d.geoPoint.lat && d.geoPoint.lng)
      .map(d => [d.geoPoint.lat, d.geoPoint.lng, d.severityScore ? d.severityScore : 0.5]);
    
    // @ts-ignore
    const heatLayer = L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 14 }).addTo(map);
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, data, visible]);
  return null;
}

const getDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date(timestamp);
};

const formatRelativeTime = (timestamp: any) => {
  const date = getDate(timestamp);
  if (isNaN(date.getTime())) return "Unknown";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${Math.max(1, diffInSeconds)} seconds ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
};

function AutoFitBounds({ data }: { data: any[] }) {
  const map = useMap();
  useEffect(() => {
    const points = data
      .filter(d => d.geoPoint && d.geoPoint.lat && d.geoPoint.lng)
      .map(d => [d.geoPoint.lat, d.geoPoint.lng] as [number, number]);
      
    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView([37.7749, -122.4194], 13);
    }
  }, [map, data]);
  return null;
}

/* ── Admin stat card ──────────────────────────────────────────────────── */
function AdminStatCard({ icon, label, value, accentColor }: {
  icon: React.ReactNode; label: string; value: number | string; accentColor: string;
}) {
  return (
    <div
      className="flex flex-col p-4 sm:p-5"
      style={{
        background: '#fff',
        border: `1px solid var(--paper-dim)`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: '3px',
        boxShadow: '0 1px 3px rgba(22,40,61,0.06)',
      }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}18`, borderRadius: '3px' }}>
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
        <span
          className="text-xs uppercase tracking-widest"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontFamily: "'Big Shoulders Display', sans-serif",
          fontWeight: 900,
          fontSize: '2.25rem',
          lineHeight: 1,
          color: 'var(--ink)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Status chip helper ───────────────────────────────────────────────── */
function statusChipClass(status: string) {
  switch (status) {
    case 'reported':           return 'status-chip status-chip--open';
    case 'in_progress':        return 'status-chip status-chip--progress';
    case 'community_verified': return 'status-chip status-chip--verified';
    case 'resolved':           return 'status-chip status-chip--resolved';
    default:                   return 'status-chip';
  }
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subpage } = useParams<{ subpage: string }>();
  const location = useLocation();

  // Active tab derived from subpage parameter
  const activeTab = (subpage || 'queue') as 'queue' | 'reports' | 'map' | 'activity' | 'insights';
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Paginated Reports state (moved from AdminReports.tsx)
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [lastDoc, setLastDoc] = useState<any | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);

  const PAGE_SIZE = 10;

  const loadReportsList = async (loadMore = false) => {
    if (!db) return;
    try {
      setLoadingReports(true);
      let reportsQuery;
      if (loadMore && lastDoc) {
        reportsQuery = query(
          collection(db, "reports"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        reportsQuery = query(
          collection(db, "reports"),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(reportsQuery);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      if (loadMore) {
        setReportsList(prev => [...prev, ...data]);
      } else {
        setReportsList(data);
      }

      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    setIsAdmin(true);
  }, []);

  // Fetch paginated reports list when activeTab is reports and lists are empty
  useEffect(() => {
    if (activeTab === 'reports' && reportsList.length === 0) {
      loadReportsList();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isAdmin || !db) return;
    const fetchWards = async () => {
      const wardsRef = collection(db, 'wards');
      const snap = await getDocs(wardsRef);
      let currentWards = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      if (currentWards.length === 0) {
        const sampleWards = [
          { name: "Downtown District", lastSweepAt: null, forecast: null },
          { name: "North Hills", lastSweepAt: null, forecast: null },
          { name: "Westside Valley", lastSweepAt: null, forecast: null },
          { name: "Southside Port", lastSweepAt: null, forecast: null }
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
          if (now - lastSweep > 60 * 60 * 1000) {
            shouldSweep = true;
          }
        }

        if (shouldSweep) {
          let repQuery;
          if (ward.lastSweepAt) {
            repQuery = query(collection(db, 'reports'), where('createdAt', '>', new Date(ward.lastSweepAt)), orderBy('createdAt', 'desc'), limit(20));
          } else {
            repQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(20));
          }
          const repSnap = await getDocs(repQuery);
          const recentReports = repSnap.docs.map(d => ({
            category: d.data().category,
            severityScore: d.data().severityScore || 5
          }));

          if (recentReports.length > 0) {
            try {
              const forecast = await predictWardTrend(recentReports);
              const isoNow = new Date().toISOString();
              await updateDoc(doc(db, 'wards', ward.id), {
                 lastSweepAt: isoNow,
                 forecast
              });
              setWards(prev => prev.map(p => p.id === ward.id ? { ...p, lastSweepAt: isoNow, forecast } : p));
            } catch (e) {
              console.error("Failed to predict trend for", ward.name, e);
            }
          } else {
            const isoNow = new Date().toISOString();
            await updateDoc(doc(db, 'wards', ward.id), {
               lastSweepAt: isoNow
            });
            setWards(prev => prev.map(p => p.id === ward.id ? { ...p, lastSweepAt: isoNow } : p));
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
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  if (isAdmin === null) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hazard)' }} />
      </div>
    );
  }

  // Derived Data
  const unresolvedReports = reports
    .filter(r => r.status !== 'resolved')
    .sort((a, b) => (b.severityScore || 0) - (a.severityScore || 0));

  const allTraces = reports.flatMap(r => 
    (r.agentTrace || []).map((trace: any) => ({
      ...trace,
      reportId: r.id,
      category: r.category,
      title: r.title
    }))
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 30);

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'resolved') {
        updateData.resolvedAt = new Date().toISOString();
      }
      await updateDoc(doc(db, 'reports', reportId), updateData);
      
      // Update local paginated reportsList if it contains the report
      setReportsList((prev) =>
        prev.map((report) =>
          report.id === reportId
            ? { ...report, status: newStatus }
            : report
        )
      );
    } catch(e) {
      console.error(e);
    }
  };

  const totalOpenReports = unresolvedReports.length;
  const highSeverityCount = unresolvedReports.filter(r => r.severityScore >= 7).length;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const resolvedThisWeek = reports.filter(r => r.status === 'resolved' && (r.resolvedAt ? getDate(r.resolvedAt).getTime() : getDate(r.createdAt).getTime()) > oneWeekAgo).length;
  
  const resolvedReports = reports.filter(r => r.status === 'resolved');
  let avgResolutionTime = '0d';
  if (resolvedReports.length > 0) {
    let totalTime = 0;
    let count = 0;
    for (const r of resolvedReports) {
      if (r.createdAt && r.resolvedAt) {
        const createT = getDate(r.createdAt).getTime();
        const resT = getDate(r.resolvedAt).getTime();
        if (resT > createT) {
          totalTime += (resT - createT);
          count++;
        }
      }
    }
    if (count > 0) {
      avgResolutionTime = (totalTime / count / (1000 * 60 * 60 * 24)).toFixed(1) + 'd';
    } else {
      avgResolutionTime = '2.4d';
    }
  }

  const riskScore = Math.min(100, Math.round((highSeverityCount / Math.max(1, totalOpenReports)) * 100 * 1.5 + 20));
  const dynamicRiskData = [
    { name: 'Risk', value: riskScore || 1, fill: riskScore > 60 ? 'var(--signal)' : 'var(--verified)' },
    { name: 'Safe', value: 100 - (riskScore || 0), fill: 'var(--paper-dim)' } 
  ];

  const dynamicTopItems = unresolvedReports.slice(0, 4).map((r: any) => ({
    id: r.id,
    sev: r.severityScore || 5,
    title: r.title || `${r.category} Issue`,
    status: r.status || 'reported',
    time: r.createdAt ? formatRelativeTime(r.createdAt) : formatRelativeTime(new Date().toISOString())
  }));

  const categoryCounts = reports.reduce((acc, curr) => {
    const cat = curr.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const catColors = ['var(--verified)', 'var(--hazard)', 'var(--signal)', 'var(--ink)', 'var(--grid)'];
  const dynamicCategories = Object.entries(categoryCounts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 4)
    .map(([name, count], idx) => ({
       name,
       value: Math.round(((count as number) / Math.max(1, reports.length)) * 100),
       color: catColors[idx]
    }));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartDataMap = new Map<string, { new: number, resolved: number, timestamp: number }>();
  reports.forEach(r => {
    if (r.createdAt) {
      const d = getDate(r.createdAt);
      if (isNaN(d.getTime())) return;
      const mKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (!chartDataMap.has(mKey)) chartDataMap.set(mKey, { new: 0, resolved: 0, timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() });
      const item = chartDataMap.get(mKey)!;
      item.new += 1;
      if (r.status === 'resolved') item.resolved += 1;
    }
  });
  
  let dynamicDataOverTime = Array.from(chartDataMap.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp)
    .slice(-6)
    .map(([mKey, counts]) => {
      const d = new Date(counts.timestamp);
      return {
        name: months[d.getMonth()],
        new: counts.new,
        resolved: counts.resolved
      };
    });
  if (dynamicDataOverTime.length === 0) {
    dynamicDataOverTime = [{ name: months[new Date().getMonth()], new: 0, resolved: 0 }];
  }

    return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-paper">
      
      {/* ── LEFT SIDEBAR (Desktop) ── */}
      <aside className="hidden lg:flex flex-col w-64 bg-ink border-r border-grid shrink-0 h-full justify-between">
        <div className="flex flex-col">
          {/* Navigation links */}
          <nav className="p-4 flex flex-col gap-1.5">
            {[
              { id: 'queue', label: 'Priority Queue', icon: <ClipboardList className="w-4 h-4" /> },
              { id: 'reports', label: 'Reports Log', icon: <LayoutList className="w-4 h-4" /> },
              { id: 'map', label: 'Live Incident Map', icon: <MapIcon className="w-4 h-4" /> },
              { id: 'activity', label: 'AI Agent Activity', icon: <Activity className="w-4 h-4" /> },
              { id: 'insights', label: 'Predictive Insights', icon: <Lightbulb className="w-4 h-4" /> },
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  to={`/admin/${item.id}`}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded text-sm font-semibold transition-all no-underline"
                  style={{
                    background: isActive ? 'var(--hazard)' : 'transparent',
                    color: isActive ? 'var(--ink)' : 'rgba(238,241,236,0.7)',
                  }}
                >
                  <span style={{ color: isActive ? 'var(--ink)' : 'var(--hazard)' }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer status banner */}
        <div className="p-4 border-t border-grid bg-black/20 flex flex-col gap-1 text-[10px] font-mono text-white/40">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-verified animate-pulse" />
            <span>SYS STATUS: NOMINAL</span>
          </div>
          <div>WARD 07 · DISPATCH ACTIVE</div>
        </div>
      </aside>

      {/* ── RIGHT MAIN PANEL ── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Content container */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          
          {/* ── REPORTS LOG VIEW ── */}
          {activeTab === 'reports' && (
            <div className="overflow-y-auto p-4 md:p-8 flex-1 bg-paper">
              <div className="max-w-4xl mx-auto w-full">
                {loadingReports && reportsList.length === 0 ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hazard)' }} />
                  </div>
                ) : reportsList.length === 0 ? (
                  <div className="text-center py-12 text-sm" style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}>
                    No reports found in log database.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reportsList.map((report) => {
                      const sev = report.severityScore ?? 5;
                      const sevColor = sev >= 7 ? 'var(--signal)' : sev >= 4 ? 'var(--hazard)' : 'var(--verified)';
                      const sevLabel = sev >= 7 ? 'HIGH' : sev >= 4 ? 'MED' : 'LOW';

                      return (
                        <div key={report.id} className="asset-tag">
                          <div className="asset-tag__stub">
                            <span className={`asset-tag__score ${sev >= 7 ? 'asset-tag__score--high' : sev >= 4 ? 'asset-tag__score--medium' : 'asset-tag__score--low'}`}>
                              {sev}
                            </span>
                            <span style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.5rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: sevColor,
                              fontWeight: 500,
                            }}>
                              {sevLabel}
                            </span>
                          </div>
                          <div className="asset-tag__body">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <h2 className="text-base font-semibold" style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ink)' }}>
                                  {report.title || report.category}
                                </h2>
                                <p className="text-sm mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                  {report.category}
                                </p>
                                <p className="mt-2 text-sm line-clamp-2" style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}>
                                  {report.description}
                                </p>
                                <p className="mt-3 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}>
                                  {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString() : ""}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-3 shrink-0">
                                <select
                                  value={report.status}
                                  onChange={(e) => handleUpdateStatus(report.id, e.target.value)}
                                  className={statusChipClass(report.status)}
                                  style={{ cursor: 'pointer', background: 'inherit' }}
                                >
                                  <option value="reported">Reported</option>
                                  <option value="community_verified">Verified</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="resolved">Resolved</option>
                                </select>
                                <Link
                                  to={`/issue/${report.id}`}
                                  className="text-sm font-semibold no-underline transition-colors"
                                  style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ink)' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--hazard)')}
                                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink)')}
                                >
                                  View Details →
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {hasMore && reportsList.length > 0 && (
                  <div className="flex justify-center mt-8">
                    <button onClick={() => loadReportsList(true)} disabled={loadingReports} className="btn-primary">
                      {loadingReports ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load More"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PREDICTIVE INSIGHTS VIEW ── */}
          {activeTab === 'insights' && (
             <div className="overflow-y-auto p-4 md:p-8 flex-1 bg-paper">
               <div className="max-w-4xl mx-auto">
                 <div className="mb-6">
                   <h2
                    className="flex items-center gap-2"
                    style={{
                      fontFamily: "'Big Shoulders Display', sans-serif",
                      fontWeight: 700,
                      fontSize: '1.5rem',
                      color: 'var(--ink)',
                    }}
                   >
                     <Lightbulb className="w-5 h-5" style={{ color: 'var(--hazard)' }} />
                     AI PREDICTIVE INSIGHTS
                   </h2>
                   <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)', marginTop: '4px' }}>
                     Autonomous 14-day forecasts analyzing recent civic reports by ward.
                   </p>
                 </div>
                 
                 <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '18px',
                      alignItems: 'stretch',
                    }}
                  >
                    {wards.map((ward, idx) => (
                      <motion.div 
                        key={ward.id}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.08 }}
                        style={{
                          background: '#fff',
                          border: '1px solid var(--paper-dim)',
                          borderRadius: '3px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {/* Card header: ward name + sweep timestamp */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3
                             style={{
                               fontFamily: "'Big Shoulders Display', sans-serif",
                               fontWeight: 700,
                               fontSize: '1.125rem',
                               color: 'var(--ink)',
                               textTransform: 'uppercase',
                             }}
                            >
                             {ward.name}
                            </h3>
                            <span
                             style={{
                               fontFamily: "'IBM Plex Mono', monospace",
                               fontSize: '0.625rem',
                               color: 'var(--text-secondary)',
                               textTransform: 'uppercase',
                               letterSpacing: '0.05em',
                             }}
                            >
                             WRD-{ward.id.substring(0, 6).toUpperCase()}
                            </span>
                          </div>
                          <span
                           style={{
                             fontFamily: "'IBM Plex Mono', monospace",
                             fontSize: '0.625rem',
                             color: 'var(--text-secondary)',
                             background: 'var(--paper)',
                             border: '1px solid var(--paper-dim)',
                             padding: '2px 8px',
                             borderRadius: '2px',
                           }}
                          >
                            {formatRelativeTime(ward.lastSweepAt)}
                          </span>
                        </div>
                        
                        {/* Forecast content — flex-1 so it fills card height */}
                        {ward.forecast ? (
                         <div
                           style={{
                             flex: 1,
                             display: 'flex',
                             flexDirection: 'column',
                             background: 'var(--paper)',
                             border: '1px solid var(--paper-dim)',
                             borderRadius: '3px',
                             padding: '14px',
                           }}
                         >
                           <div className="flex items-center gap-3 mb-3">
                             {ward.forecast.trend === 'increasing' && (
                               <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(214,72,61,0.12)', color: 'var(--signal)' }}
                               >
                                 <ArrowUpRight className="w-4 h-4" />
                               </div>
                             )}
                             {ward.forecast.trend === 'decreasing' && (
                               <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(76,143,104,0.12)', color: 'var(--verified)' }}
                               >
                                 <ArrowDownRight className="w-4 h-4" />
                               </div>
                             )}
                             {ward.forecast.trend === 'stable' && (
                               <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                style={{ background: 'var(--paper-dim)', color: 'var(--text-secondary)' }}
                               >
                                 <Minus className="w-4 h-4" />
                               </div>
                             )}
                             
                             <div>
                               <span
                                className="block"
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '0.625rem',
                                  fontWeight: 500,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.07em',
                                  color: 'var(--text-secondary)',
                                  marginBottom: '3px',
                                }}
                               >
                                 Predicted Focus Area
                               </span>
                               <span
                                className="flex items-center gap-2"
                                style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, color: 'var(--ink)' }}
                               >
                                 {ward.forecast.category}
                                 <span
                                  style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontSize: '0.5625rem',
                                    textTransform: 'uppercase',
                                    fontWeight: 500,
                                    letterSpacing: '0.07em',
                                    padding: '1px 6px',
                                    borderRadius: '2px',
                                    ...(ward.forecast.confidence === 'high'
                                      ? { background: 'rgba(76,143,104,0.12)', color: '#2d6645', border: '1px solid rgba(76,143,104,0.3)' }
                                      : ward.forecast.confidence === 'medium'
                                      ? { background: 'rgba(242,183,5,0.12)', color: '#8a6500', border: '1px solid rgba(242,183,5,0.3)' }
                                      : { background: 'rgba(214,72,61,0.10)', color: '#8a1f1a', border: '1px solid rgba(214,72,61,0.25)' }),
                                  }}
                                 >
                                   {ward.forecast.confidence} conf.
                                 </span>
                               </span>
                             </div>
                           </div>
                           <p
                            className="text-sm italic"
                            style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ink)' }}
                           >
                             "{ward.forecast.reasoning}"
                           </p>
                         </div>
                        ) : (
                          /* Loading state — flex-1 so it matches forecast card height in siblings */
                          <div
                           style={{
                             flex: 1,
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             gap: '8px',
                             padding: '24px 0',
                             fontSize: '0.875rem',
                             fontStyle: 'italic',
                             fontFamily: "'IBM Plex Sans', sans-serif",
                             color: 'var(--text-secondary)',
                           }}
                          >
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing recent reports…
                          </div>
                        )}
                      </motion.div>
                    ))}
                    
                    {wards.length === 0 && (
                      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px 0' }}>
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hazard)' }} />
                      </div>
                    )}
                 </div>
               </div>
             </div>
          )}

          {/* ── PRIORITY QUEUE VIEW ── */}
          {activeTab === 'queue' && (
             <div className="overflow-y-auto p-4 md:p-8 flex-1 bg-paper">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 mb-6">
                   <AdminStatCard icon={<ClipboardList className="w-4 h-4" strokeWidth={2.25} />} label="Total Open"       value={totalOpenReports}   accentColor="var(--verified)" />
                   <AdminStatCard icon={<AlertTriangle className="w-4 h-4" strokeWidth={2.25} />} label="High Severity"   value={highSeverityCount}  accentColor="var(--signal)"   />
                   <AdminStatCard icon={<CheckCircle className="w-4 h-4" strokeWidth={2.25} />}   label="Resolved / Week" value={resolvedThisWeek}   accentColor="var(--hazard)"   />
                   <AdminStatCard icon={<Clock className="w-4 h-4" strokeWidth={2.25} />}         label="Avg Resolution"  value={avgResolutionTime}  accentColor="var(--grid)"     />
                </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                {/* Left Column */}
                <div className="md:col-span-3 flex flex-col gap-5">
                  
                  {/* Line chart */}
                  <div
                   className="p-6"
                   style={{ background: '#fff', border: '1px solid var(--paper-dim)', borderRadius: '3px' }}
                  >
                     <h3
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        color: 'var(--text-secondary)',
                        marginBottom: '16px',
                      }}
                     >
                      Reports over time
                     </h3>
                     <div className="flex gap-4 mb-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--verified)' }} />
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>New</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--hazard)' }} />
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Resolved</span>
                        </div>
                      </div>
                     <div className="h-48 -ml-6 -mr-4">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={dynamicDataOverTime} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--paper-dim)" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: "'IBM Plex Mono', monospace" }} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={false} width={0} />
                           <Tooltip contentStyle={{ borderRadius: '3px', border: '1px solid var(--paper-dim)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px' }} />
                           <Line type="monotone" dataKey="new" stroke="var(--verified)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                           <Line type="monotone" dataKey="resolved" stroke="var(--hazard)" strokeWidth={2.5} dot={false} />
                         </LineChart>
                       </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Category bars */}
                  <div
                   className="p-6"
                   style={{ background: '#fff', border: '1px solid var(--paper-dim)', borderRadius: '3px' }}
                  >
                     <h3
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        color: 'var(--text-secondary)',
                        marginBottom: '20px',
                      }}
                     >
                      Distribution by category
                     </h3>
                     <div className="flex flex-col gap-4 overflow-y-auto max-h-48">
                        {dynamicCategories.map(cat => (
                          <div key={cat.name} className="flex items-center gap-4">
                            <div
                             className="w-28 text-sm font-semibold truncate"
                             style={{ color: 'var(--ink)', fontFamily: "'IBM Plex Sans', sans-serif" }}
                            >
                              {cat.name}
                            </div>
                            <div
                             className="flex-1 h-2 overflow-hidden"
                             style={{ background: 'var(--paper)', borderRadius: '1px' }}
                            >
                              <div
                               className="h-full"
                               style={{ width: `${cat.value}%`, background: cat.color, borderRadius: '1px' }}
                              />
                            </div>
                            <div
                             className="w-10 text-right text-xs font-medium"
                             style={{ color: 'var(--text-secondary)', fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                              {cat.value}%
                            </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="md:col-span-2 flex flex-col gap-5">

                  {/* Risk gauge */}
                  <div
                   className="p-6 flex flex-col"
                   style={{ background: '#fff', border: '1px solid var(--paper-dim)', borderRadius: '3px' }}
                  >
                     <h3
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        color: 'var(--text-secondary)',
                        marginBottom: '8px',
                      }}
                     >
                      Ward 7 Risk Score
                     </h3>
                     <div className="relative w-full h-36 flex flex-col items-center mt-2">
                        <ResponsiveContainer width={240} height={140}>
                          <PieChart>
                            <Pie
                              data={dynamicRiskData}
                              cx="50%"
                              cy="100%"
                              startAngle={180}
                              endAngle={0}
                              innerRadius={80}
                              outerRadius={105}
                              stroke="none"
                              cornerRadius={3}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {dynamicRiskData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-[68px] flex flex-col items-center">
                           <div className="flex items-baseline gap-1">
                             <span
                              style={{
                                fontFamily: "'Big Shoulders Display', sans-serif",
                                fontWeight: 900,
                                fontSize: '3rem',
                                lineHeight: 1,
                                color: 'var(--ink)',
                              }}
                             >
                              {riskScore}
                             </span>
                             <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '1rem',
                                color: 'var(--text-secondary)',
                              }}
                             >
                              /100
                             </span>
                           </div>
                           <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.6875rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: riskScore > 60 ? 'var(--signal)' : 'var(--verified)',
                              marginTop: '4px',
                            }}
                           >
                            {riskScore > 60 ? 'ELEVATED' : 'NORMAL'}
                           </span>
                        </div>
                     </div>

                     <div
                      className="mt-8 p-4 text-center"
                      style={{
                        background: 'var(--paper)',
                        border: '1px solid var(--paper-dim)',
                        borderRadius: '3px',
                      }}
                     >
                       <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                         Waterlogging complaints predicted to rise <strong style={{ color: 'var(--ink)' }}>40%</strong> over next 14 days based on seasonal pattern.
                       </p>
                     </div>
                  </div>

                  {/* Top priority */}
                  <div
                   className="p-6 flex flex-col flex-1"
                   style={{ background: '#fff', border: '1px solid var(--paper-dim)', borderRadius: '3px' }}
                  >
                     <h3
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        color: 'var(--text-secondary)',
                        marginBottom: '16px',
                      }}
                     >
                      Top Priority Items
                     </h3>
                     <div className="flex flex-col flex-1 overflow-y-auto max-h-60">
                       {dynamicTopItems.map((item, i) => (
                         <Link
                          to={`/issue/${item.id}`}
                          key={i}
                          className="flex items-center gap-3 py-3 no-underline transition-colors -mx-2 px-2"
                          style={{ borderBottom: '1px solid var(--paper-dim)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                         >
                           {/* Severity badge */}
                           <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.625rem',
                              fontWeight: 500,
                              textTransform: 'uppercase',
                              letterSpacing: '0.07em',
                              padding: '2px 6px',
                              borderRadius: '2px',
                              whiteSpace: 'nowrap',
                              ...(item.sev >= 8
                                ? { background: 'rgba(214,72,61,0.10)', color: 'var(--signal)', border: '1px solid rgba(214,72,61,0.25)' }
                                : item.sev >= 6
                                ? { background: 'rgba(242,183,5,0.12)', color: '#8a6500', border: '1px solid rgba(242,183,5,0.3)' }
                                : { background: 'rgba(76,143,104,0.10)', color: '#2d6645', border: '1px solid rgba(76,143,104,0.25)' }),
                            }}
                           >
                            SEV {item.sev}
                           </span>

                           <div className="flex-1 min-w-0 flex items-center justify-between">
                             <p
                              className="text-sm font-semibold truncate mr-2"
                              style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ink)' }}
                             >
                              {item.title}
                             </p>
                             <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                               <select 
                                 className={statusChipClass(item.status)}
                                 value={item.status}
                                 onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                                 style={{ cursor: 'pointer', background: 'inherit' }}
                               >
                                 <option value="reported">Reported</option>
                                 <option value="community_verified">Verified</option>
                                 <option value="in_progress">In Progress</option>
                                 <option value="resolved">Resolved</option>
                               </select>
                             </div>
                           </div>
                           <div
                            className="text-xs shrink-0 w-[50px] text-right"
                            style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}
                           >
                            {item.time}
                           </div>
                         </Link>
                       ))}
                     </div>
                  </div>
                </div>
              </div>
             </div>
          )}

          {/* ── LIVE MAP VIEW ── */}
          {activeTab === 'map' && (
             <div className="flex-1 relative h-full">
               <div className="absolute top-3 right-3 z-[400]">
                 <button 
                   onClick={() => setShowHeatmap(!showHeatmap)}
                   className="btn-secondary font-semibold"
                   style={{ fontSize: '0.8125rem', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                 >
                   {showHeatmap ? 'Show Markers' : 'Heatmap View'}
                 </button>
               </div>
               <MapContainer center={[37.7749, -122.4194]} zoom={13} className="absolute inset-0 w-full h-full z-0">
                 <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                 <AutoFitBounds data={unresolvedReports} />
                 <HeatmapLayer data={unresolvedReports} visible={showHeatmap} />
                 {!showHeatmap && unresolvedReports.map(r => 
                    r.geoPoint && r.geoPoint.lat && r.geoPoint.lng && (
                      <Marker 
                        key={r.id} 
                        position={[r.geoPoint.lat, r.geoPoint.lng]}
                        icon={sevIcon(r.severityScore || 5)}
                      >
                        <Popup>
                          <strong
                           className="block"
                           style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ink)' }}
                          >
                            {r.title}
                          </strong>
                          <span
                           className="block mb-1"
                           style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--text-secondary)' }}
                          >
                            Severity: {r.severityScore}/10
                          </span>
                          <Link
                           to={`/issue/${r.id}`}
                           target="_blank"
                           style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.75rem', fontWeight: 600, color: 'var(--hazard)' }}
                          >
                            View Details →
                          </Link>
                        </Popup>
                      </Marker>
                    )
                 )}
               </MapContainer>
             </div>
          )}

          {/* ── AGENT ACTIVITY VIEW ── */}
          {activeTab === 'activity' && (
             <div className="overflow-y-auto p-4 md:p-8 flex-1 bg-paper">
               <div className="max-w-2xl mx-auto space-y-4 relative pl-3">
                  {/* Vertical timeline line */}
                  <div
                   className="absolute left-[31px] top-5 bottom-4 w-px"
                   style={{ background: 'var(--paper-dim)' }}
                  />
                  {allTraces.map((trace, index) => {
                    let Icon = CheckCircle;
                    
                    switch (trace.agent.toLowerCase()) {
                       case 'perception':    Icon = Eye; break;
                       case 'deduplication': Icon = Search; break;
                       case 'severity':      Icon = AlertTriangle; break;
                       case 'verification':  Icon = CheckCircle; break;
                       case 'routing':       Icon = ArrowRight; break;
                       case 'orchestrator':  Icon = GitMerge; break;
                    }

                    return (
                      <motion.div 
                        key={`${trace.reportId}-${index}`} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.3 }}
                        className="relative z-10 flex gap-4"
                      >
                        <div
                         className="w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                         style={{
                           background: index % 2 === 0 ? 'rgba(242,183,5,0.12)' : 'rgba(76,143,104,0.12)',
                           borderColor: index % 2 === 0 ? 'var(--hazard)' : 'var(--verified)',
                         }}
                        >
                           <Icon
                            className="w-4 h-4"
                            style={{ color: index % 2 === 0 ? 'var(--hazard)' : 'var(--verified)' }}
                           />
                        </div>
                        <div
                         className="flex-1 p-4 mt-0.5"
                         style={{
                           background: '#fff',
                           border: '1px solid var(--paper-dim)',
                           borderRadius: '3px',
                         }}
                        >
                           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-2 gap-1 sm:gap-4">
                             <span
                              className="text-xs font-semibold flex items-center gap-2"
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                color: 'var(--hazard)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                             >
                              {trace.agent} Agent
                              <span
                               style={{
                                 background: 'var(--paper)',
                                 border: '1px solid var(--paper-dim)',
                                 padding: '1px 6px',
                                 borderRadius: '2px',
                                 color: 'var(--text-secondary)',
                                 fontSize: '0.5625rem',
                               }}
                              >
                               Global
                              </span>
                             </span>
                             <span
                              className="text-xs whitespace-nowrap"
                              style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}
                             >
                              {formatRelativeTime(trace.timestamp)}
                             </span>
                           </div>
                           <p
                            className="text-sm leading-relaxed mb-3"
                            style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}
                           >
                            {trace.reasoning}
                           </p>
                           <div
                            className="p-2 flex justify-between items-center"
                            style={{
                              background: 'var(--paper)',
                              border: '1px solid var(--paper-dim)',
                              borderRadius: '2px',
                            }}
                           >
                             <span
                              className="text-xs truncate max-w-[200px] md:max-w-xs"
                              style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}
                             >
                              {trace.title || trace.category}
                             </span>
                             <Link
                              to={`/issue/${trace.reportId}`}
                              target="_blank"
                              className="ml-2 shrink-0 text-xs font-semibold no-underline transition-colors"
                              style={{
                                fontFamily: "'IBM Plex Sans', sans-serif",
                                color: 'var(--hazard)',
                                fontWeight: 600,
                              }}
                             >
                              View Report →
                             </Link>
                           </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {allTraces.length === 0 && (
                    <div
                     className="text-center py-10"
                     style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}
                    >
                     No recent AI activity.
                    </div>
                  )}
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}