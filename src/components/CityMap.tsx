import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { Link } from 'react-router-dom';
import { markerColor, severityColor } from '../lib/status';
import { useTheme } from '../lib/theme';

/* ── Marker icon factory ──────────────────────────────────────────────── */
const iconHTML = (color: string, pulse = false) => `
  <div style="
    position: relative;
    width: 22px; height: 22px;
    ${pulse ? 'animation: ring-pulse 1.8s ease-out infinite; border-radius: 50%;' : ''}
  ">
    <div style="
      background-color: ${color};
      width: 22px; height: 22px;
      border-radius: 50%;
      border: 2.5px solid #fff;
      box-shadow: 0 3px 10px rgba(2,6,23,0.35);
    "></div>
  </div>
`;

const createMarkerIcon = (color: string, pulse = false) =>
  L.divIcon({
    html: iconHTML(color, pulse),
    className: 'custom-leaflet-icon',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });

const userIcon = L.divIcon({
  html: `<div style="
    width: 30px; height: 30px; border-radius: 50%;
    border: 3px solid #fff;
    background: radial-gradient(circle, var(--primary) 0 40%, transparent 41%);
    box-shadow: 0 0 0 6px rgba(37,99,235,0.18), 0 4px 12px rgba(2,6,23,0.3);
  "></div>`,
  className: 'custom-leaflet-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function ClusterLayer({ reports }: { reports: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 70,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const size = count > 100 ? 44 : count > 50 ? 38 : 32;
        return L.divIcon({
          html: `<div style="
            width: ${size}px; height: ${size}px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
            background: linear-gradient(180deg, var(--primary), var(--primary-strong));
            border: 2.5px solid #fff;
            box-shadow: 0 6px 16px -6px rgba(37,99,235,0.55);
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: ${count > 100 ? '13px' : '11px'};
            color: #fff;
          ">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    reports.forEach((report) => {
      if (!report.geoPoint?.lat || !report.geoPoint?.lng) return;
      const status = report.status ?? 'reported';
      const color = markerColor(status);
      const pulse = status === 'reported';
      const sev = report.severityScore ?? 5;

      const marker = L.marker([report.geoPoint.lat, report.geoPoint.lng], {
        icon: createMarkerIcon(color, pulse),
      });

      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; min-width: 180px;">
          <p style="font-weight: 700; color: var(--text-primary); margin-bottom: 8px; line-height: 1.35; font-size: 13px;">
            ${report.title || report.category}
          </p>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            <span style="
              font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
              background: ${severityColor(sev)}1f; color: ${severityColor(sev)};
              padding: 2px 8px; border-radius: 999px;
            ">${sev >= 7 ? 'Critical' : sev >= 4 ? 'Moderate' : 'Low'} · Sev ${sev}</span>
            <span style="
              font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em;
              background: var(--bg-subtle); color: var(--text-secondary);
              padding: 2px 8px; border-radius: 999px;
            ">${status.replace('_', ' ')}</span>
          </div>
          <a href="/issue/${report.id}" style="
            color: var(--primary); text-decoration: none;
            font-size: 12px; font-weight: 700;
          ">View details →</a>
        </div>
      `);

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, reports]);

  return null;
}

function SetViewOnChange({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

function FitBounds({ reports }: { reports: any[] }) {
  const map = useMap();
  useEffect(() => {
    const points = reports
      .filter((r) => r.geoPoint?.lat && r.geoPoint?.lng)
      .map((r) => [r.geoPoint.lat, r.geoPoint.lng] as [number, number]);
    if (points.length > 0) {
      map.fitBounds(points, { padding: [48, 48], maxZoom: 15 });
    }
  }, [map, reports]);
  return null;
}

export interface CityMapProps {
  reports: any[];
  center?: [number, number] | null;
  zoom?: number;
  showUserMarker?: boolean;
  fitBounds?: boolean;
  className?: string;
}

export default function CityMap({
  reports,
  center,
  zoom = 13,
  showUserMarker = false,
  fitBounds = false,
  className = '',
}: CityMapProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const tileAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const initialCenter = center ?? [37.7749, -122.4194];

  return (
    <div className={`relative w-full h-full min-h-[280px] rounded-2xl overflow-hidden border border-line shadow-card ${className}`}>
      <MapContainer center={initialCenter} zoom={zoom} className="absolute inset-0 w-full h-full" zoomControl={false}>
        <TileLayer attribution={tileAttribution} url={tileUrl} />
        {fitBounds ? <FitBounds reports={reports} /> : center ? <SetViewOnChange center={center} /> : null}
        {showUserMarker && center && (
          <>
            <Marker position={center} icon={userIcon}>
              <Popup>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13 }}>You are here</div>
              </Popup>
            </Marker>
            <CircleMarker
              center={center}
              radius={18}
              pathOptions={{ fillColor: 'var(--primary)', fillOpacity: 0.14, weight: 2, color: 'var(--primary)' }}
            />
          </>
        )}
        <ClusterLayer reports={reports} />
      </MapContainer>
    </div>
  );
}
