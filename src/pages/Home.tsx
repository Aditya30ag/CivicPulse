import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, AlertCircle, Clock, CheckCircle2, ShieldCheck, Plus, Activity, UserCheck } from 'lucide-react';

/* ── Severity-based marker icons ──────────────────────────────────────── */
const sevColor = (score: number) =>
  score >= 7 ? 'var(--signal)' : score >= 4 ? 'var(--hazard)' : 'var(--verified)';

const iconHTML = (color: string, pulse = false) => `
  <div style="
    position: relative;
    width: 20px; height: 20px;
    ${pulse ? 'animation: ring-pulse 1.8s ease-out infinite;' : ''}
  ">
    <div style="
      background-color: ${color};
      width: 20px; height: 20px;
      border-radius: 50%;
      border: 2.5px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    "></div>
  </div>
`;

const createMarkerIcon = (color: string, pulse = false) => L.divIcon({
  html: iconHTML(color, pulse),
  className: 'custom-leaflet-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

const getStatusIcon = (report: any) => {
  const sev = report.severityScore ?? 5;
  const color = sevColor(sev);
  const pulse = sev >= 7;
  return createMarkerIcon(color, pulse);
};

const defaultIcon = createMarkerIcon('var(--ink)');

const icons = {
  reported: createMarkerIcon('var(--signal)', true),
  in_progress: createMarkerIcon('var(--hazard)'),
  resolved: createMarkerIcon('var(--verified)'),
};

function SetViewOnChange({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, 14);
  }, [coords, map]);
  return null;
}

function ClusterLayer({ reports, icons }: { reports: any[], icons: any }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const markerClusterGroup = L.markerClusterGroup({
      maxClusterRadius: 80,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const size = count > 100 ? 40 : count > 50 ? 35 : 30;
        return L.divIcon({
          html: `<div style="
            background: var(--ink);
            border: 2.5px solid var(--hazard);
            width: ${size}px; height: ${size}px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
            font-family: 'IBM Plex Mono', monospace;
            font-weight: 500;
            font-size: ${count > 100 ? '13px' : '11px'};
            color: var(--hazard);
          ">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -size / 2],
        });
      },
    });

    reports.forEach((report) => {
      if (report.geoPoint && report.geoPoint.lat && report.geoPoint.lng) {
        const marker = L.marker([report.geoPoint.lat, report.geoPoint.lng], {
          icon: getStatusIcon(report),
        });

        const sev = report.severityScore ?? 5;
        const sevLabel = sev >= 7 ? 'HIGH' : sev >= 4 ? 'MED' : 'LOW';
        const sevClr = sev >= 7 ? '#D6483D' : sev >= 4 ? '#F2B705' : '#4C8F68';

        const popupContent = `
          <div style="font-family: 'IBM Plex Sans', sans-serif; padding: 4px 2px; min-width: 160px;">
            <p style="font-weight: 600; color: #16283D; margin-bottom: 6px; line-height: 1.3; font-size: 13px;">${report.title || report.category}</p>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
              <span style="
                font-family: 'IBM Plex Mono', monospace;
                font-size: 10px; font-weight: 500;
                text-transform: uppercase; letter-spacing: .07em;
                background: ${sevClr}22; color: ${sevClr};
                border: 1px solid ${sevClr}44;
                padding: 1px 6px; border-radius: 2px;
              ">SEV ${sev} · ${sevLabel}</span>
            </div>
            <a href="/issue/${report.id}" style="
              color: #16283D; text-decoration: none;
              font-size: 12px; font-weight: 600;
              font-family: 'IBM Plex Sans', sans-serif;
            ">View Details →</a>
          </div>
        `;

        marker.bindPopup(popupContent);
        markerClusterGroup.addLayer(marker);
      }
    });

    map.addLayer(markerClusterGroup);

    return () => {
      map.removeLayer(markerClusterGroup);
    };
  }, [map, reports, icons]);

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
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

/* ── Severity stat card ───────────────────────────────────────────────── */
function StatCard({
  icon,
  label,
  value,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accentColor: string;
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
        <div
          className="w-8 h-8 flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}18`, borderRadius: '3px' }}
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
        <span
          className="text-xs uppercase tracking-widest font-medium"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}
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

export default function Home() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [center, setCenter] = useState<[number, number] | null>(null);

  const reportedCount = reports.filter(r => r.status === 'reported').length;
  const inProgressCount = reports.filter(r => r.status === 'in_progress').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;

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
    if (!db) return;
    const reportsRef = collection(db, 'reports');
    const unsubscribe = onSnapshot(reportsRef, (snap) => {
      const data = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      setReports(data?.sort((a: any, b: any) => getDate(b.createdAt).getTime() - getDate(a.createdAt).getTime()) || []);
    });
    return () => unsubscribe();
  }, []);

  const nearbyReports = reports.slice(0, 4);
  const verifyReports = reports.filter(r => r.status === 'reported').slice(0, 1);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto h-[calc(100vh-56px)] flex flex-col">
      {/* Page header */}
      <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center shrink-0 bp-grid"
            style={{ borderRadius: '3px' }}
          >
            <MapPin className="w-5 h-5" style={{ color: 'var(--hazard)' }} strokeWidth={2.25} />
          </div>
          <div>
            <h1
              className="text-3xl sm:text-4xl uppercase tracking-tight"
              style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 900,
                color: 'var(--ink)',
                lineHeight: 1,
              }}
            >
              Neighborhood Map
            </h1>
            <p
              className="mt-0.5 text-sm"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}
            >
              Discover, track, and interact with issues reported near you
            </p>
          </div>
        </div>

        <Link to="/report" className="btn-primary shrink-0">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Report an issue
        </Link>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5 shrink-0">
        <StatCard icon={<AlertCircle className="w-4 h-4" strokeWidth={2.25} />} label="Reported"      value={reportedCount || 0}   accentColor="var(--signal)"   />
        <StatCard icon={<Clock className="w-4 h-4" strokeWidth={2.25} />}       label="In Progress"  value={inProgressCount || 0} accentColor="var(--hazard)"   />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" strokeWidth={2.25} />} label="Resolved"    value={resolvedCount || 0}   accentColor="var(--verified)" />
        <StatCard icon={<ShieldCheck className="w-4 h-4" strokeWidth={2.25} />} label="Trust Score"  value={87}                   accentColor="var(--ink)"      />
      </div>

      {/* Map + sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* Map column */}
        <div className="md:col-span-2 flex flex-col gap-3">
          {/* Legend filter buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Reported',    color: 'var(--signal)'   },
              { label: 'In Progress', color: 'var(--hazard)'   },
              { label: 'Resolved',    color: 'var(--verified)' },
            ].map(f => (
              <button
                key={f.label}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors btn-secondary"
                style={{ padding: '4px 12px' }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: f.color }}
                />
                {f.label}
              </button>
            ))}
          </div>

          {/* Map */}
          <div
            className="flex-1 overflow-hidden relative z-0"
            style={{
              border: '1px solid var(--paper-dim)',
              borderRadius: '3px',
              background: 'var(--paper)',
              minHeight: '260px',
            }}
          >
            {center ? (
              <MapContainer center={center} zoom={14} className="absolute inset-0 w-full h-full" zoomControl={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <SetViewOnChange coords={center} />
                
                <Marker position={center} icon={defaultIcon}>
                  <Popup>
                     <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>You are here</div>
                  </Popup>
                </Marker>

                <CircleMarker 
                  center={center}
                  radius={16}
                  pathOptions={{ fillColor: 'var(--ink)', fillOpacity: 0.12, weight: 2, color: 'var(--ink)' }}
                />

                <ClusterLayer reports={reports} icons={icons} />
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div
                  className="w-8 h-8 rounded-full border-2"
                  style={{
                    borderColor: 'var(--paper-dim)',
                    borderTopColor: 'var(--hazard)',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              </div>
            )}
            
            {/* Custom zoom controls */}
            <div
              className="absolute top-3 left-3 z-[400] flex flex-col overflow-hidden"
              style={{
                background: '#fff',
                border: '1px solid var(--paper-dim)',
                borderRadius: '3px',
                boxShadow: '0 2px 6px rgba(22,40,61,0.12)',
              }}
            >
               <button 
                className="w-8 h-8 flex items-center justify-center font-bold transition-colors"
                style={{ color: 'var(--ink)', borderBottom: '1px solid var(--paper-dim)', fontFamily: 'monospace' }}
               >+</button>
               <button
                className="w-8 h-8 flex items-center justify-center font-bold transition-colors"
                style={{ color: 'var(--ink)', fontFamily: 'monospace' }}
               >−</button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          {/* Nearby Activity */}
          <div
            className="p-4 sm:p-5"
            style={{
              background: '#fff',
              border: '1px solid var(--paper-dim)',
              borderRadius: '3px',
            }}
          >
            <h3
              className="text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              <Activity className="w-3.5 h-3.5" />
              Nearby Activity
            </h3>
            <div className="flex flex-col">
              {nearbyReports.map((report) => {
                const sev = report.severityScore ?? 5;
                const dotColor = sev >= 7 ? 'var(--signal)' : sev >= 4 ? 'var(--hazard)' : 'var(--verified)';
                return (
                  <Link
                    to={`/issue/${report.id}`}
                    key={report.id}
                    className="py-3 px-2 -mx-2 group transition-colors no-underline"
                    style={{ borderBottom: '1px solid var(--paper-dim)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                       <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: dotColor }}
                       />
                       <span
                        className="text-sm font-semibold line-clamp-1 transition-colors group-hover:text-hazard"
                        style={{ color: 'var(--ink)', fontFamily: "'IBM Plex Sans', sans-serif" }}
                       >
                        {report.title || report.category}
                       </span>
                    </div>
                    <div
                      className="pl-4 text-xs flex gap-1"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}
                    >
                       <span>Sev {report.severityScore || 5}</span>
                       <span>·</span>
                       <span>{formatRelativeTime(report.createdAt)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Verify Nearby */}
          <div
            className="p-4 sm:p-5"
            style={{
              background: '#fff',
              border: '1px solid var(--paper-dim)',
              borderRadius: '3px',
            }}
          >
            <h3
              className="text-xs uppercase tracking-widest mb-3 flex items-center gap-1.5"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Verify Nearby
            </h3>
            <div className="flex flex-col">
              {verifyReports.length > 0 ? verifyReports.map((report) => (
                <Link
                  to={`/issue/${report.id}`}
                  key={report.id}
                  className="py-3 px-2 -mx-2 group transition-colors no-underline"
                  style={{ borderBottom: '1px solid var(--paper-dim)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                     <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: 'var(--verified)' }}
                     />
                     <span
                      className="text-sm font-semibold line-clamp-1 transition-colors"
                      style={{ color: 'var(--ink)', fontFamily: "'IBM Plex Sans', sans-serif" }}
                     >
                      Confirm: {report.category} near you?
                     </span>
                  </div>
                  <div
                    className="pl-4 text-xs flex gap-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}
                  >
                     <span>120m away</span>
                     <span>·</span>
                     <span style={{ color: 'var(--verified)', fontWeight: 500 }}>+5 pts</span>
                  </div>
                </Link>
              )) : (
                 <div
                  className="py-3 text-sm"
                  style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}
                 >
                  No nearby issues to verify found.
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}