import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ImageOff } from 'lucide-react';
import { categoryById, severityLabel, severityColor } from '../lib/status';
import { formatRelativeTime } from '../lib/format';

interface ComplaintCardProps {
  report: any;
  showImage?: boolean;
  onUpvote?: (id: string) => void;
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
        const activeColor =
          s === 'resolved' ? '#22C55E' : s === 'in_progress' ? '#F59E0B' : '#2563EB';

        return (
          <div key={s} className="flex items-center gap-1 flex-1 last:flex-none">
            <span
              className="w-1.5 h-1.5 rounded-[1px] transition-colors duration-300"
              style={{
                backgroundColor: reached ? activeColor : '#333333',
              }}
              title={labels[s]}
            />
            {!isLast && (
              <span
                className="h-[1px] flex-1"
                style={{
                  backgroundColor: i < current ? activeColor : '#222222',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ComplaintCard({ report, showImage = true, onUpvote }: ComplaintCardProps) {
  const status = report.status ?? 'reported';
  const sev = report.severityScore ?? 5;
  const cat = categoryById(report.category);

  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState<number>(report.upvotes ?? Math.floor(10 + Math.random() * 30));

  const handleUpvote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (upvoted) {
      setUpvoted(false);
      setUpvoteCount((c) => c - 1);
    } else {
      setUpvoted(true);
      setUpvoteCount((c) => c + 1);
    }
    if (onUpvote) onUpvote(report.id);
  };

  const statusBorderColor =
    status === 'resolved'
      ? '#22C55E'
      : status === 'in_progress' || status === 'community_verified'
        ? '#F59E0B'
        : '#EF4444';

  const statusBadgeClass =
    status === 'resolved'
      ? 'status-badge-resolved'
      : status === 'in_progress' || status === 'community_verified'
        ? 'status-badge-progress'
        : 'status-badge-open';

  return (
    <div
      className="editorial-card relative overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 group"
      style={{
        borderLeft: `3px solid ${statusBorderColor}`,
      }}
    >
      {/* Media */}
      {showImage && (
        <div className="relative h-44 bg-[#111111] overflow-hidden border-b border-[#222222]">
          {report.mediaURL ? (
            report.mediaType === 'video' ? (
              <video src={report.mediaURL} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img
                src={report.mediaURL}
                alt={report.title || report.category}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 filter brightness-90"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#555555]">
              <ImageOff className="w-8 h-8 opacity-40" />
            </div>
          )}

          {/* Severity Pill */}
          <span
            className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-[2px] px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider"
            style={{
              backgroundColor: '#0A0A0A',
              color: severityColor(sev),
              border: `1px solid ${severityColor(sev)}60`,
            }}
          >
            {severityLabel(sev)} · {sev}
          </span>

          {/* Gradient shadow overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#161616] via-transparent to-transparent opacity-60 pointer-events-none" />
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Category & Status */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-[#111111] border border-[#222222] text-[10px] font-mono text-[#F5F5F5] uppercase tracking-wide">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: statusBorderColor }}
            />
            [{cat.short}]
          </span>
          <span className={statusBadgeClass}>
            {status.replace('_', ' ')}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-[#F5F5F5] leading-snug line-clamp-2 group-hover:text-[#2563EB] transition-colors">
          <Link to={`/issue/${report.id}`} className="no-underline text-inherit">
            {report.title || `${cat.label} issue`}
          </Link>
        </h3>

        {/* Description */}
        <p className="text-xs text-[#888888] line-clamp-2 leading-relaxed font-sans">
          {report.description}
        </p>

        <div className="mt-auto pt-3 border-t border-[#222222] flex flex-col gap-2.5">
          <StatusTimeline status={status} />

          <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
            <span className="inline-flex items-center gap-1 min-w-0 max-w-[140px] truncate">
              <MapPin className="w-3 h-3 text-[#555555] shrink-0" />
              <span className="truncate">
                {report.address || (report.geoPoint ? `${report.geoPoint.lat.toFixed(2)}, ${report.geoPoint.lng.toFixed(2)}` : 'Location pending')}
              </span>
            </span>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 shrink-0 text-[10px] text-[#555555]">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(report.createdAt)}
              </span>

              {/* Interactive Upvote button */}
              <button
                onClick={handleUpvote}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] font-mono text-[11px] transition-colors cursor-pointer ${
                  upvoted
                    ? 'bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/60'
                    : 'bg-[#111111] text-[#888888] border border-[#222222] hover:text-[#F5F5F5] hover:border-[#333333]'
                }`}
                title={upvoted ? 'Remove upvote' : 'Upvote this issue'}
              >
                <span>▲</span>
                <span>{upvoteCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
