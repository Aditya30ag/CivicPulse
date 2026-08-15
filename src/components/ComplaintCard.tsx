import { Link } from 'react-router-dom';
import { MapPin, Clock, ImageOff } from 'lucide-react';
import Badge from './ui/Badge';
import { categoryById, severityLabel, severityColor } from '../lib/status';
import { formatRelativeTime } from '../lib/format';

interface ComplaintCardProps {
  report: any;
  showImage?: boolean;
}

/** Progress timeline dots for a complaint's lifecycle */
export function StatusTimeline({ status }: { status: string }) {
  const order = ['reported', 'community_verified', 'in_progress', 'resolved'];
  const labels: Record<string, string> = {
    reported: 'Reported',
    community_verified: 'Verified',
    in_progress: 'In Progress',
    resolved: 'Resolved',
  };
  const current = order.indexOf(status);

  return (
    <div className="flex items-center gap-1.5" aria-label={`Status: ${labels[status] ?? status}`}>
      {order.map((s, i) => {
        const reached = i <= current;
        const isLast = i === order.length - 1;
        return (
          <div key={s} className="flex items-center gap-1.5 flex-1 last:flex-none">
            <span
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                reached ? (s === 'resolved' ? 'bg-success' : s === 'in_progress' ? 'bg-warning' : 'bg-primary') : 'bg-line-strong'
              }`}
              title={labels[s]}
            />
            {!isLast && <span className={`h-0.5 flex-1 rounded-full ${i < current ? 'bg-primary' : 'bg-line'}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function ComplaintCard({ report, showImage = true }: ComplaintCardProps) {
  const status = report.status ?? 'reported';
  const sev = report.severityScore ?? 5;
  const cat = categoryById(report.category);

  const statusTone =
    status === 'resolved' ? 'success' : status === 'in_progress' || status === 'community_verified' ? 'warning' : 'danger';

  return (
    <Link
      to={`/issue/${report.id}`}
      className="group bg-card border border-line rounded-2xl shadow-card overflow-hidden hover:shadow-pop hover:-translate-y-0.5 transition-all duration-200 flex flex-col no-underline"
    >
      {/* Media */}
      {showImage && (
        <div className="relative h-40 bg-subtle overflow-hidden">
          {report.mediaURL ? (
            report.mediaType === 'video' ? (
              <video src={report.mediaURL} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img
                src={report.mediaURL}
                alt={report.title || report.category}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-faint">
              <ImageOff className="w-8 h-8" />
            </div>
          )}
          {/* Severity badge */}
          <span
            className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide shadow-lg"
            style={{ background: severityColor(sev), color: '#fff' }}
          >
            {severityLabel(sev)} · {sev}
          </span>
        </div>
      )}

      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Badge tone={statusTone}>{status.replace('_', ' ')}</Badge>
          <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-faint uppercase tracking-wide">
            {cat.short}
          </span>
        </div>

        <h3 className="text-sm font-bold text-ink leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {report.title || `${cat.label} issue`}
        </h3>

        <p className="text-xs text-muted line-clamp-2 leading-relaxed">{report.description}</p>

        <div className="mt-auto pt-2 flex flex-col gap-2">
          <StatusTimeline status={status} />
          <div className="flex items-center justify-between text-[0.6875rem] text-faint">
            <span className="inline-flex items-center gap-1 min-w-0">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {report.geoPoint ? `${report.geoPoint.lat.toFixed(3)}, ${report.geoPoint.lng.toFixed(3)}` : 'Location pending'}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(report.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
