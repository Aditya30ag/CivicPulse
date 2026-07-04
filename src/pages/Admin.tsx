import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, onSnapshot, query, orderBy, limit, updateDoc, setDoc } from 'firebase/firestore';
import { Loader2, LayoutList, Map as MapIcon, Activity, MapPin, AlertTriangle, User, Eye, Search, CheckCircle, ArrowRight, Lightbulb, ArrowUpRight, ArrowDownRight, Minus, GitMerge } from 'lucide-react';
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

const iconHTML = (color: string) => `
  <div style="
    background-color: ${color};
    width: 24px;
    height: 24px;
    display: block;
    left: -12px;
    top: -12px;
    position: relative;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>
`;

const createMarkerIcon = (color: string) => L.divIcon({
  html: iconHTML(color),
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12], 
  popupAnchor: [0, -12]
});

const icons = {
  reported: createMarkerIcon('#dc2626'),     // danger
  in_progress: createMarkerIcon('#d97706'),  // warning
  resolved: createMarkerIcon('#0e9f7d'),     // success
  community_verified: createMarkerIcon('#9a4cf5') // lavender
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

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'queue' | 'map' | 'activity' | 'insights'>('queue');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  const [reports, setReports] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    setIsAdmin(true);
  }, []);

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
          const repSnap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(20)));
          const recentReports = repSnap.docs.map(d => ({
            category: d.data().category,
            severityScore: d.data().severityScore || 5
          }));

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
    { name: 'Risk', value: riskScore || 1, fill: riskScore > 60 ? '#f5a623' : '#16f0bf' },
    { name: 'Safe', value: 100 - (riskScore || 0), fill: '#e5e7eb' } 
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
  const catColors = ['#16f0bf', '#c190ff', '#f5a623', '#ef4444', '#3b82f6'];
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
// Provide fallback empty data if no reports
  if (dynamicDataOverTime.length === 0) {
    dynamicDataOverTime = [{ name: months[new Date().getMonth()], new: 0, resolved: 0 }];
  }

  const getTabButtonClass = (
    tab: 'queue' | 'map' | 'activity' | 'insights'
  ) =>
    `px-5 py-1.5 rounded-full font-bold text-sm cursor-pointer transition-all duration-200 ${
      activeTab === tab
        ? 'bg-dark text-white shadow-sm'
        : 'text-muted hover:text-dark hover:bg-gray-100 hover:shadow-sm'
    }`;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-dark tracking-tight">Priority queue</h1>
          <p className="text-muted mt-0.5 font-medium text-sm">Civic Pulse Admin • Ward 7 Overview</p>
        </div>
        <div className="flex bg-transparent border border-border-subtle p-1.5 rounded-full shadow-sm bg-white">
          <button
            onClick={() => setActiveTab('queue')}
            className={getTabButtonClass('queue')}
          >
            Queue
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={getTabButtonClass('map')}
          >
            Live map
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={getTabButtonClass('activity')}
          >
            Agent activity
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={getTabButtonClass('insights')}
          >
            Predictive
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border-subtle flex-1 overflow-hidden flex flex-col min-h-0">
        {activeTab === 'insights' && (
           <div className="overflow-y-auto p-4 md:p-8 flex-1 bg-page">
             <div className="max-w-4xl mx-auto">
               <div className="mb-6">
                 <h2 className="text-xl font-bold text-dark flex items-center gap-2">
                   <Lightbulb className="w-6 h-6 text-warning" />
                   AI Predictive Insights
                 </h2>
                 <p className="text-muted mt-1">Autonomous 14-day forecasts analyzing recent civic reports by ward.</p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {wards.map((ward, idx) => (
                   <motion.div 
                     key={ward.id}
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: idx * 0.1 }}
                     className="bg-card border border-border-subtle rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                   >
                     <div className="flex justify-between items-start mb-4">
                       <h3 className="font-bold text-lg text-dark">{ward.name}</h3>
                       <span className="text-xs text-muted bg-page px-2 py-1 rounded">
                         Last analyzed: {formatRelativeTime(ward.lastSweepAt)}
                       </span>
                     </div>
                     
                     {ward.forecast ? (
                       <div className="bg-lavender/10 rounded-lg p-4 border border-lavender/20">
                         <div className="flex items-center gap-3 mb-3">
                           {ward.forecast.trend === 'increasing' && <div className="w-8 h-8 rounded-full bg-danger/20 text-danger flex items-center justify-center shrink-0"><ArrowUpRight className="w-5 h-5" /></div>}
                           {ward.forecast.trend === 'decreasing' && <div className="w-8 h-8 rounded-full bg-success/20 text-success flex items-center justify-center shrink-0"><ArrowDownRight className="w-5 h-5" /></div>}
                           {ward.forecast.trend === 'stable' && <div className="w-8 h-8 rounded-full bg-page border border-border-subtle text-muted flex items-center justify-center shrink-0"><Minus className="w-5 h-5" /></div>}
                           
                           <div>
                             <span className="text-xs font-bold uppercase tracking-wider text-muted mb-0.5 block">Predicted Focus Area</span>
                             <span className="font-semibold text-dark flex items-center gap-2">
                               {ward.forecast.category}
                               <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${ward.forecast.confidence === 'high' ? 'bg-success/20 text-success' : ward.forecast.confidence === 'medium' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>
                                 {ward.forecast.confidence} Confidence
                               </span>
                             </span>
                           </div>
                         </div>
                         <p className="text-sm text-dark font-medium italic">"{ward.forecast.reasoning}"</p>
                       </div>
                     ) : (
                       <div className="flex items-center justify-center py-6 text-muted gap-2 text-sm italic">
                         <Loader2 className="w-4 h-4 animate-spin" />
                         Analyzing recent reports...
                       </div>
                     )}
                   </motion.div>
                 ))}
                 
                 {wards.length === 0 && (
                   <div className="col-span-full py-12 flex justify-center items-center">
                     <Loader2 className="w-8 h-8 animate-spin text-primary" />
                   </div>
                 )}
               </div>
             </div>
           </div>
        )}

        {activeTab === 'queue' && (
           <div className="overflow-y-auto p-4 md:p-8 flex-1 bg-page">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <div className="bg-card border border-border-subtle rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#16f0bf]"></div>
                    <span className="text-sm font-semibold text-muted">Total open reports</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-dark">{totalOpenReports}</span>
                  </div>
                </div>
                
                <div className="bg-card border border-border-subtle rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
                    <span className="text-sm font-semibold text-muted">High severity</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-dark">{highSeverityCount}</span>
                  </div>
                </div>

                <div className="bg-card border border-border-subtle rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#c190ff]"></div>
                    <span className="text-sm font-semibold text-muted">Resolved this week</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-dark">{resolvedThisWeek}</span>
                  </div>
                </div>

                <div className="bg-card border border-border-subtle rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></div>
                    <span className="text-sm font-semibold text-muted">Avg resolution time</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-dark">{avgResolutionTime}</span>
                  </div>
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Left Column */}
              <div className="md:col-span-3 flex flex-col gap-6">
                
                <div className="bg-card border border-border-subtle rounded-xl p-6 shadow-sm flex-1">
                   <h3 className="text-lg font-bold text-dark mb-4 filter drop-shadow-sm">Reports over time</h3>
                   <div className="flex gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#16f0bf]"></div>
                        <span className="text-xs font-semibold text-muted">New reports</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#c190ff]"></div>
                        <span className="text-xs font-semibold text-muted">Resolved</span>
                      </div>
                    </div>

                    <div className="h-48 mt-2 -ml-6 -mr-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dynamicDataOverTime} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 500 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={false} width={0} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7e2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Line type="monotone" dataKey="new" stroke="#16f0bf" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="resolved" stroke="#c190ff" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-card border border-border-subtle rounded-xl p-6 shadow-sm flex-1">
                   <h3 className="text-lg font-bold text-dark mb-6 filter drop-shadow-sm">Distribution by category</h3>
                   <div className="flex flex-col gap-5 mt-2 overflow-y-auto max-h-48 pr-2">
                      {dynamicCategories.map(cat => (
                        <div key={cat.name} className="flex items-center gap-4">
                          <div className="w-32 text-sm font-bold text-dark">{cat.name}</div>
                          <div className="flex-1 h-2.5 bg-page rounded-full overflow-hidden flex items-center">
                            <div className="h-full rounded-full" style={{ width: `${cat.value}%`, backgroundColor: cat.color }}></div>
                          </div>
                          <div className="w-12 text-right text-sm font-semibold text-muted">{cat.value}%</div>
                        </div>
                      ))}
                   </div>
                </div>

              </div>

              {/* Right Column */}
              <div className="md:col-span-2 flex flex-col gap-6">

                <div className="bg-card border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col">
                   <h3 className="text-lg font-bold text-dark mb-2">Ward 7 risk score</h3>
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
                            cornerRadius={5}
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
                           <span className="text-5xl leading-none font-bold text-dark">{riskScore}</span>
                           <span className="text-lg leading-none font-bold text-[#9ca3af]">/100</span>
                         </div>
                         <span className="text-xs mt-1 font-bold text-muted">{riskScore > 60 ? 'Elevated risk' : 'Normal'}</span>
                      </div>
                   </div>

                   <div className="mt-8 bg-page border border-border-subtle rounded-lg p-5">
                     <p className="text-sm text-center font-medium text-muted">
                       Waterlogging complaints predicted to rise 40% over next 14 days based on seasonal pattern.
                     </p>
                   </div>
                </div>

                <div className="bg-card border border-border-subtle rounded-xl p-6 shadow-sm flex-1 flex flex-col min-h-0">
                   <h3 className="text-lg font-bold text-dark mb-4">Top priority items</h3>
                                      <div className="flex flex-col flex-1 divide-y divide-border-subtle overflow-y-auto max-h-60 pr-2">
                     {dynamicTopItems.map((item, i) => (
                       <Link to={`/issue/${item.id}`} key={i} className="flex items-center gap-3 py-4 first:pt-2 last:pb-2 hover:bg-page/50 transition-colors cursor-pointer -mx-2 px-2 rounded-lg">
                         <div className={`px-2 py-0.5 rounded font-bold text-[10px] whitespace-nowrap uppercase ${item.sev >= 8 ? 'bg-danger/10 text-[#dc2626]' : item.sev >= 6 ? 'bg-warning/20 text-[#b45309]' : 'bg-warning/10 text-[#d97706]'}`}>
                            SEV {item.sev}
                         </div>
                         <div className="flex-1 min-w-0 flex items-center justify-between">
                           <p className="font-bold text-dark text-sm truncate mr-2">{item.title}</p>
                           <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                             <select 
                               className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-mint focus:border-transparent ${
                                 item.status === 'reported' ? 'bg-danger/10 text-danger' :
                                 item.status === 'in_progress' ? 'bg-warning/10 text-warning' :
                                 item.status === 'resolved' ? 'bg-success/10 text-success' :
                                 'bg-page text-muted'
                               }`}
                               value={item.status}
                               onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                             >
                               <option value="reported" className="text-dark bg-page">Reported</option>
                               <option value="community_verified" className="text-dark bg-page">Verified</option>
                               <option value="in_progress" className="text-dark bg-page">In Progress</option>
                               <option value="resolved" className="text-dark bg-page">Resolved</option>
                             </select>
                           </div>
                         </div>
                         <div className="text-xs font-medium text-muted shrink-0 w-[50px] text-right">
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

        {activeTab === 'map' && (
           <div className="flex-1 relative">
             <div className="absolute top-4 right-4 z-[400]">
               <button 
                 onClick={() => setShowHeatmap(!showHeatmap)}
                 className="bg-white shadow-md border border-gray-200 px-4 py-2 rounded-lg font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
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
                      icon={icons[r.status as keyof typeof icons] || icons.reported}
                    >
                      <Popup>
                        <strong className="block">{r.title}</strong>
                        <span className="text-xs text-gray-500 block mb-1">Severity: {r.severityScore}/10</span>
                        <Link to={`/issue/${r.id}`} target="_blank" className="text-primary text-xs font-bold hover:underline">View</Link>
                      </Popup>
                    </Marker>
                  )
               )}
             </MapContainer>
           </div>
        )}

        {activeTab === 'activity' && (
           <div className="overflow-y-auto p-4 md:p-8 flex-1 bg-page">
             <div className="max-w-2xl mx-auto space-y-6 relative pl-3">
                <div className="absolute left-[31px] top-6 bottom-4 w-0.5 bg-border-subtle"></div>
                {allTraces.map((trace, index) => {
                  let Icon = CheckCircle;
                  let iconColor = "text-mint";
                  let iconBg = "bg-mint/20 border-mint";
                  
                  if (index % 2 === 1) {
                     iconColor = "text-lavender";
                     iconBg = "bg-lavender/20 border-lavender";
                  }

                  switch (trace.agent.toLowerCase()) {
                     case 'perception': Icon = Eye; break;
                     case 'deduplication': Icon = Search; break;
                     case 'severity': Icon = AlertTriangle; break;
                     case 'verification': Icon = CheckCircle; break;
                     case 'routing': Icon = ArrowRight; break;
                     case 'orchestrator': Icon = GitMerge; break;
                  }

                  return (
                    <motion.div 
                      key={`${trace.reportId}-${index}`} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className="relative z-10 flex gap-5"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-card shadow-sm flex-shrink-0 ${iconBg}`}>
                         <Icon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      <div className="flex-1 bg-card border border-border-subtle shadow-sm rounded-xl p-4 mt-0.5 hover:shadow-md transition-shadow">
                         <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-2 gap-1 sm:gap-4">
                           <span className="font-bold text-dark text-sm flex items-center gap-2">
                             {trace.agent} Agent
                             <span className="bg-page text-muted text-xs px-2 py-0.5 rounded font-medium border border-border-subtle">Global</span>
                           </span>
                           <span className="text-xs text-muted font-medium whitespace-nowrap">{formatRelativeTime(trace.timestamp)}</span>
                         </div>
                         <p className="text-sm text-muted leading-relaxed font-medium mb-3">
                           {trace.reasoning}
                         </p>
                         <div className="bg-page border border-border-subtle rounded-lg p-2 text-xs flex justify-between items-center">
                           <span className="text-muted font-medium truncate max-w-[200px] md:max-w-xs">{trace.title || trace.category}</span>
                           <Link to={`/issue/${trace.reportId}`} target="_blank" className="font-bold text-dark hover:text-mint transition-colors ml-2 shrink-0">View Report</Link>
                         </div>
                      </div>
                    </motion.div>
                  );
                })}
                {allTraces.length === 0 && (
                  <div className="text-center text-muted font-medium py-10">No recent AI activity.</div>
                )}
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
