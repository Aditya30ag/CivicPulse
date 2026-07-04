import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, AlertCircle, Clock, CheckCircle2, ShieldCheck, Plus, Activity, UserCheck } from 'lucide-react';

const iconHTML = (color: string) => `
  <div style="
    background-color: ${color};
    width: 20px;
    height: 20px;
    display: block;
    left: -10px;
    top: -10px;
    position: relative;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  "></div>
`;

const createMarkerIcon = (color: string) => L.divIcon({
  html: iconHTML(color),
  className: 'custom-leaflet-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 10], 
  popupAnchor: [0, -10]
});

const icons = {
  reported: createMarkerIcon('#dc2626'),     // danger (red)
  in_progress: createMarkerIcon('#d97706'),  // warning (orange/yellow)
  resolved: createMarkerIcon('#0e9f7d')      // success (mint)
};
const defaultIcon = createMarkerIcon('#181e15'); // dark accent

function SetViewOnChange({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, 14);
  }, [coords, map]);
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
        () => setCenter([37.7749, -122.4194]) // San Francisco default
      );
    } else {
      setCenter([37.7749, -122.4194]);
    }
  }, []);

  useEffect(() => {
    if (!db) return;
    const reportsRef = collection(db, 'reports');
    const unsubscribe = onSnapshot(reportsRef, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data?.sort((a, b) => getDate(b.createdAt).getTime() - getDate(a.createdAt).getTime()) || []);
    });
    return () => unsubscribe();
  }, []);

  const nearbyReports = reports.slice(0, 4);
  const verifyReports = reports.filter(r => r.status === 'reported').slice(0, 1);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-dark bg-gradient-to-b from-white/15 to-transparent flex items-center justify-center shrink-0 shadow-sm">
            <MapPin className="w-5 h-5 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark tracking-tight">Neighborhood map</h1>
            <p className="text-muted mt-1 font-medium text-sm leading-relaxed">Discover, track, and interact with issues reported near you</p>
          </div>
        </div>
        <Link to="/report" className="flex items-center gap-1.5 px-5 py-2.5 rounded-full font-bold text-sm bg-dark bg-gradient-to-b from-white/15 to-transparent text-white shadow-sm hover:shadow-md hover:brightness-110 transition-all shrink-0">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Report an issue
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 shrink-0">
        <div className="bg-card border border-border-subtle border-l-4 border-l-danger rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-danger" strokeWidth={2.25} />
            </div>
            <span className="text-sm font-semibold text-muted">Reported</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-dark">{reportedCount || 0}</span>
          </div>
        </div>
        
        <div className="bg-card border border-border-subtle border-l-4 border-l-warning rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-warning" strokeWidth={2.25} />
            </div>
            <span className="text-sm font-semibold text-muted">In progress</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-dark">{inProgressCount || 0}</span>
          </div>
        </div>

        <div className="bg-card border border-border-subtle border-l-4 border-l-success rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-success" strokeWidth={2.25} />
            </div>
            <span className="text-sm font-semibold text-muted">Resolved</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-dark">{resolvedCount || 0}</span>
          </div>
        </div>

        <div className="bg-card border border-border-subtle border-l-4 border-l-lavender rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-lg bg-lavender/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-lavender" strokeWidth={2.25} />
            </div>
            <span className="text-sm font-semibold text-muted">Your trust score</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-dark">87</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-page border border-border-subtle text-sm font-bold text-dark hover:bg-page/80 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full bg-danger"></div> Reported
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-page border border-border-subtle text-sm font-bold text-dark hover:bg-page/80 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full bg-warning"></div> In progress
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-page border border-border-subtle text-sm font-bold text-dark hover:bg-page/80 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full bg-success"></div> Resolved
            </button>
          </div>
          <div className="flex-1 rounded-2xl overflow-hidden border border-border-subtle shadow-sm relative z-0 bg-page">
            {center ? (
              <MapContainer center={center} zoom={14} className="absolute inset-0 w-full h-full" zoomControl={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <SetViewOnChange coords={center} />
                
                <Marker position={center} icon={defaultIcon}>
                  <Popup>
                     <div className="font-bold">You are here</div>
                  </Popup>
                </Marker>

                {/* You are here pulse effect */}
                <CircleMarker 
                  center={center}
                  radius={16}
                  pathOptions={{ fillColor: '#181e15', fillOpacity: 0.15, weight: 2, color: '#181e15' }}
                />

                {reports.map((report) => (
                  report.geoPoint && report.geoPoint.lat && report.geoPoint.lng ? (
                    <Marker 
                      key={report.id} 
                      position={[report.geoPoint.lat, report.geoPoint.lng]}
                      icon={icons[report.status as keyof typeof icons] || icons.reported}
                    >
                      <Popup>
                        <div className="text-center font-sans p-1">
                          <p className="font-bold text-dark mb-1 leading-tight">{report.title || report.category}</p>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-muted block mb-2">
                            {report.status.replace('_', ' ')}
                          </span>
                          <Link to={`/issue/${report.id}`} className="text-dark hover:text-mint text-xs font-bold flex items-center justify-center gap-1">
                            View Details &rarr;
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null
                ))}
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dark/20 border-t-dark"></div>
              </div>
            )}
            
            {/* Zoom controls overlaid on top-left like the image */}
            <div className="absolute top-4 left-4 z-[400] flex flex-col bg-white border border-border-subtle rounded-md shadow-sm overflow-hidden">
               <button 
                className="w-8 h-8 flex items-center justify-center font-bold text-dark hover:bg-page transition-colors border-b border-border-subtle"
                onClick={() => {
                  const map = document.querySelector('.leaflet-container') as any;
                  if (map && map._leaflet_id) {
                     // Hacky way to access leaflet map instance if needed, but react-leaflet zoomControl=false is set, so we can ignore or let user use scroll
                  }
                }}
               >+</button>
               <button className="w-8 h-8 flex items-center justify-center font-bold text-dark hover:bg-page transition-colors">-</button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto pr-2">
          <div className="bg-card border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Nearby Activity
            </h3>
            <div className="flex flex-col divide-y divide-border-subtle">
              {nearbyReports.map((report) => (
                <Link to={`/issue/${report.id}`} key={report.id} className="py-3 px-2 -mx-2 rounded-lg group first:pt-2 hover:bg-page/60 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                     <div className={`w-2 h-2 rounded-full ${
                       report.status === 'reported' ? 'bg-danger' :
                       report.status === 'in_progress' ? 'bg-warning' :
                       'bg-success'
                     }`}></div>
                     <span className="font-bold text-sm text-dark group-hover:text-mint transition-colors line-clamp-1">{report.title || report.category}</span>
                  </div>
                  <div className="pl-4 text-xs font-medium text-muted flex gap-1">
                     <span>Sev {report.severityScore || 5}</span>
                     <span>•</span>
                     <span>{formatRelativeTime(report.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              Verify Nearby
            </h3>
            <div className="flex flex-col divide-y divide-border-subtle">
              {verifyReports.length > 0 ? verifyReports.map((report) => (
                <Link to={`/issue/${report.id}`} key={report.id} className="py-3 px-2 -mx-2 rounded-lg group first:pt-2 hover:bg-page/60 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                     <div className="w-2 h-2 rounded-full bg-lavender"></div>
                     <span className="font-bold text-sm text-dark group-hover:text-lavender transition-colors line-clamp-1">Confirm: {report.category} near you?</span>
                  </div>
                  <div className="pl-4 text-xs font-medium text-muted flex gap-1">
                     <span>120m away</span>
                     <span>•</span>
                     <span>+5 pts</span>
                  </div>
                </Link>
              )) : (
                 <div className="py-3 text-sm font-medium text-muted">No nearby issues to verify found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
