/* ── Shared domain metadata: statuses, severity, categories ──────────── */

export type IssueStatus = 'reported' | 'community_verified' | 'in_progress' | 'resolved';

export interface StatusMeta {
  label: string;
  /** Tailwind text color class */
  text: string;
  /** Tailwind soft background class */
  bg: string;
  /** Tailwind solid dot class */
  dot: string;
}

export const STATUS_META: Record<string, StatusMeta> = {
  reported:           { label: 'Reported',     text: 'text-danger',  bg: 'bg-danger-soft',  dot: 'bg-danger' },
  community_verified: { label: 'Verified',     text: 'text-warning', bg: 'bg-warning-soft', dot: 'bg-warning' },
  in_progress:        { label: 'In Progress',  text: 'text-warning', bg: 'bg-warning-soft', dot: 'bg-warning' },
  resolved:           { label: 'Resolved',     text: 'text-success', bg: 'bg-success-soft', dot: 'bg-success' },
};

export const STATUS_ORDER: IssueStatus[] = ['reported', 'community_verified', 'in_progress', 'resolved'];

export const statusLabel = (status: string) => STATUS_META[status]?.label ?? status.replace(/_/g, ' ');

export type SeverityTone = 'high' | 'medium' | 'low';

export const severityTone = (sev: number): SeverityTone => (sev >= 7 ? 'high' : sev >= 4 ? 'medium' : 'low');

export const severityLabel = (sev: number) => (sev >= 7 ? 'Critical' : sev >= 4 ? 'Moderate' : 'Low');

/** CSS color for severity tones */
export const severityColor = (sev: number) =>
  sev >= 7 ? 'var(--danger)' : sev >= 4 ? 'var(--warning)' : 'var(--success)';

/** Map marker color per UX spec: red = critical/reported, orange = pending, green = resolved */
export const markerColor = (status: string) => {
  if (status === 'resolved') return 'var(--success)';
  if (status === 'in_progress' || status === 'community_verified') return 'var(--warning)';
  return 'var(--danger)';
};

/* ── Categories ───────────────────────────────────────────────────────── */

export interface CategoryMeta {
  /** Stored value (kept compatible with existing reports) */
  id: string;
  label: string;
  short: string;
  desc: string;
  icon: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'Pothole',       label: 'Road Damage',     short: 'Roads',        desc: 'Potholes, damaged roads, broken sidewalks', icon: 'Road' },
  { id: 'Garbage',       label: 'Garbage & Waste', short: 'Garbage',      desc: 'Overflowing bins, illegal dumping',         icon: 'Trash2' },
  { id: 'Water Leakage', label: 'Water Problem',   short: 'Water',        desc: 'Leaks, burst pipes, supply issues',         icon: 'Droplets' },
  { id: 'Streetlight',   label: 'Electricity',     short: 'Power',        desc: 'Streetlights out, power hazards',           icon: 'Zap' },
  { id: 'Other',         label: 'Public Safety',   short: 'Safety',       desc: 'Safety hazards and other issues',           icon: 'ShieldAlert' },
];

export const categoryById = (id: string): CategoryMeta =>
  CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

/** Suggested department per category (used in the report wizard + admin) */
export const departmentForCategory = (category: string): string => {
  switch (category) {
    case 'Pothole':       return 'Public Works — Roads';
    case 'Garbage':       return 'Sanitation Department';
    case 'Water Leakage': return 'Water & Sewerage Board';
    case 'Streetlight':   return 'Electricity Board';
    default:              return 'General Services';
  }
};

export const DEPARTMENT_OPTIONS = [
  'Public Works — Roads',
  'Sanitation Department',
  'Water & Sewerage Board',
  'Electricity Board',
  'Parks & Recreation',
  'General Services',
];
