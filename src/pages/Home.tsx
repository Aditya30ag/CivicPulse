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
  reported: createMarkerIcon('#ef4444'),
  in_progress: createMarkerIcon('#f5a623'),
  resolved: createMarkerIcon('#16f0bf')
};
const defaultIcon = createMarkerIcon('#181e15');
  reported: createMarkerIcon('var(--accent-danger)'),     // danger (red)
  in_progress: createMarkerIcon('var(--accent-warning)'),  // warning (orange/yellow)
  resolved: createMarkerIcon('var(--accent-success)')      // success (mint)
};
const defaultIcon = createMarkerIcon('var(--bg-dark-accent)'); // dark accent

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
            background: linear-gradient(135deg, #ef4444 0%, #f5a623 100%);
            width: ${size}px;
            height: ${size}px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-weight: bold;
            font-size: ${count > 100 ? '14px' : '12px'};
            color: white;
          ">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -size / 2]
        });
      }
    });

    reports.forEach((report) => {
      if (report.geoPoint && report.geoPoint.lat && report.geoPoint.lng) {
        const marker = L.marker([report.geoPoint.lat, report.geoPoint.lng], {
          icon: icons[report.status as keyof typeof icons] || icons.reported
        });

        const popupContent = `
          <div style="text-align: center; font-family: sans-serif; padding: 4px;">
            <p style="font-weight: bold; color: #181e15; margin-bottom: 4px; line-height: 1.2;">${report.title || report.category}</p>
            <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold; color: #666; display: block; margin-bottom: 8px;">
              ${report.status.replace('_', ' ')}
            </span>
            <a href="/issue/${report.id}" style="color: #181e15; text-decoration: none; font-size: 12px; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 4px;">
              View Details →
            </a>
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
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data?.sort((a, b) => getDate(b.createdAt).getTime() - getDate(a.createdAt).getTime()) || []);
    });
    return () => unsubscribe();
  }, []);

  const nearbyReports = reports.slice(0, 4);
  const verifyReports = reports.filter(r => r.status === 'reported').slice(0, 1);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] w-full mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-dark tracking-tight">Neighborhood map</h1>
          <p className="text-muted mt-0.5 font-medium text-sm">Discover, track, and interact with issues reported near you</p>
        </div>
        <Link to="/report" className="px-5 py-2 rounded-full font-bold text-sm bg-dark text-white shadow-sm hover:bg-dark/90 transition-colors">
          + Report an issue
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-card border border-border-subtle rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-danger"></div>
            <span className="text-sm font-semibold text-muted">Reported</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-dark">{reportedCount || 0}</span>
          </div>
        </div>
        
        <div className="bg-card border border-border-subtle rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-warning"></div>
            <span className="text-sm font-semibold text-muted">In progress</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-dark">{inProgressCount || 0}</span>
          </div>
        </div>

        <div className="bg-card border border-border-subtle rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-success"></div>
            <span className="text-sm font-semibold text-muted">Resolved</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-dark">{resolvedCount || 0}</span>
          </div>
        </div>

        <div className="bg-card border border-border-subtle rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-lavender"></div>
            <span className="text-sm font-semibold text-muted">Your trust score</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-dark">87</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="flex gap-4">
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
          <div className="flex-1 rounded-xl overflow-hidden border border-border-subtle shadow-sm relative z-0 bg-page">
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

                <CircleMarker 
                  center={center}
                  radius={16}
                  pathOptions={{ fillColor: '#dc2626', fillOpacity: 0.2, weight: 2, color: '#dc2626' }}
                />

                <ClusterLayer reports={reports} icons={icons} />
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dark/20 border-t-dark"></div>
              </div>
            )}
            
            <div className="absolute top-4 left-4 z-[400] flex flex-col bg-white border border-border-subtle rounded-md shadow-sm overflow-hidden">
               <button 
                className="w-8 h-8 flex items-center justify-center font-bold text-dark hover:bg-page transition-colors border-b border-border-subtle"
               >+</button>
               <button className="w-8 h-8 flex items-center justify-center font-bold text-dark hover:bg-page transition-colors">-</button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto pr-2">
          <div className="bg-card border border-border-subtle rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Nearby Activity</h3>
            <div className="flex flex-col divide-y divide-border-subtle">
              {nearbyReports.map((report) => (
                <Link to={`/issue/${report.id}`} key={report.id} className="py-3 group first:pt-2">
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

          <div className="bg-card border border-border-subtle rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Verify Nearby</h3>
            <div className="flex flex-col divide-y divide-border-subtle">
              {verifyReports.length > 0 ? verifyReports.map((report) => (
                <Link to={`/issue/${report.id}`} key={report.id} className="py-3 group first:pt-2">
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