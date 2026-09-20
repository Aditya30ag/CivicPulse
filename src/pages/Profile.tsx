import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, Clock, Loader2, Zap, ShieldCheck, LogOut, Plus, FileText, Award, CheckCircle2, ChevronRight, Activity, ArrowUpRight } from 'lucide-react';
import { STATUS_META, categoryById, severityColor, markerColor } from '../lib/status';
import { formatDate } from '../lib/format';
import { useToast } from '../contexts/ToastContext';
import { DUMMY_REPORTS } from '../lib/dummyData';

const CITIZEN_BADGES = [
  { title: 'First Responder', code: 'RANK·ALPHA', desc: 'Reported an emergency hazard resolved in <48h', unlocked: true },
  { title: 'Sentinel of Wards', code: 'WARD·CENTRAL', desc: '5+ verified reports across civic zones', unlocked: true },
  { title: 'Verified Steward', code: 'TRUST·90+', desc: 'Maintained 90%+ verification accuracy rate', unlocked: true },
  { title: 'Infrastructure Hero', code: 'RESOLVE·10', desc: '10 neighborhood issues successfully closed', unlocked: false },
];

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { success } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'resolved'>('all');

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'reports'), where('reporterId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        data.sort((a: any, b: any) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        setReports(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user reports:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    success('Signed out', 'Session terminated successfully.');
    navigate('/login');
  };

  // If user has zero reports (e.g. freshly created or demo account), provide rich sample reports
  const displayReports = reports.length > 0 ? reports : DUMMY_REPORTS.slice(0, 4);
  const isSample = reports.length === 0;

  const resolvedCount = displayReports.filter((r) => r.status === 'resolved').length;
  const activeCount = displayReports.length - resolvedCount;
  const trustScore = 88;

  const initials = (user?.displayName || user?.email || 'Citizen User')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const filteredReports = displayReports.filter((r) => {
    if (activeFilter === 'resolved') return r.status === 'resolved';
    if (activeFilter === 'active') return r.status !== 'resolved';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white py-8 sm:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Breadcrumbs / Status */}
        <div className="flex items-center justify-between font-mono text-[0.6875rem] text-white/50 border-b border-[#222222] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot" />
            <span className="text-white/80">CITIZEN DOSSIER</span>
            <span>/</span>
            <span className="text-blue-400">UID-{user?.uid?.slice(0, 8) || 'VERIFIED-01'}</span>
          </div>
          <span className="hidden sm:inline-block uppercase tracking-wider text-white/40">
            SYSTEM NODE: NCR·DELHI·NORTH
          </span>
        </div>

        {/* Citizen Profile Card */}
        <div className="border-2 border-[#222222] rounded-[4px] overflow-hidden">
          <div className="px-6 pb-8">
            <div className="flex h-40 flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 mb-8">
              <div className="flex items-end gap-4">
                <span className="w-20 h-20 rounded-[4px] overflow-hidden bg-[#161616] border-2 border-[#333333] shrink-0 flex items-center justify-center shadow-lg">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-2xl font-mono font-bold">
                      {initials}
                    </span>
                  )}
                </span>
                <div className="pb-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="font-serif text-3xl sm:text-4xl text-white font-normal tracking-[-0.01em] truncate">
                      {user?.displayName || 'Aditya Sharma'}
                    </h1>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                  <p className="font-mono text-xs text-white/50 truncate mt-0.5">{user?.email || 'citizen@civicpulse.org'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/report"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-[2px] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> File Report
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#161616] hover:bg-[#222222] border border-[#333333] hover:border-red-500/50 text-white/80 hover:text-red-400 font-mono text-xs uppercase tracking-wider rounded-[2px] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#141414] border border-[#222222] rounded-[4px] p-4 relative overflow-hidden">
                <div className="w-1 h-full absolute left-0 top-0 bg-blue-500" />
                <span className="font-mono text-[0.625rem] text-white/50 tracking-wider uppercase block mb-1">
                  TOTAL REPORTS
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-white leading-none">
                  {displayReports.length}
                </p>
                <span className="font-mono text-[0.625rem] text-white/40 block mt-2">All-time lodged</span>
              </div>

              <div className="bg-[#141414] border border-[#222222] rounded-[4px] p-4 relative overflow-hidden">
                <div className="w-1 h-full absolute left-0 top-0 bg-amber-500" />
                <span className="font-mono text-[0.625rem] text-white/50 tracking-wider uppercase block mb-1">
                  ACTIVE IN FIELD
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-amber-400 leading-none">
                  {activeCount}
                </p>
                <span className="font-mono text-[0.625rem] text-white/40 block mt-2">Dispatched/Pending</span>
              </div>

              <div className="bg-[#141414] border border-[#222222] rounded-[4px] p-4 relative overflow-hidden">
                <div className="w-1 h-full absolute left-0 top-0 bg-emerald-500" />
                <span className="font-mono text-[0.625rem] text-white/50 tracking-wider uppercase block mb-1">
                  RESOLVED ISSUES
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-emerald-400 leading-none">
                  {resolvedCount}
                </p>
                <span className="font-mono text-[0.625rem] text-white/40 block mt-2">Community verified</span>
              </div>

              <div className="bg-[#141414] border border-[#222222] rounded-[4px] p-4 relative overflow-hidden">
                <div className="w-1 h-full absolute left-0 top-0 bg-purple-500" />
                <span className="font-mono text-[0.625rem] text-white/50 tracking-wider uppercase block mb-1">
                  TRUST SCORE
                </span>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-purple-400 leading-none">
                  {trustScore}<span className="text-sm text-white/40">/100</span>
                </p>
                <span className="font-mono text-[0.625rem] text-emerald-400 block mt-2">▲ 98% Accuracy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badges & Recognition */}
        <div className="bg-[#111111] border-2 border-[#222222] rounded-[4px] p-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#222222] mb-6">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h2 className="font-serif text-2xl text-white font-normal">Citizen Merits & Distinctions</h2>
            </div>
            <span className="font-mono text-[0.625rem] text-white/50 uppercase tracking-wider">
              3/4 UNLOCKED
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CITIZEN_BADGES.map((b) => (
              <div
                key={b.code}
                className={`p-4 border rounded-[4px] transition-colors ${
                  b.unlocked
                    ? 'bg-[#161616] border-[#333333]'
                    : 'bg-[#111111] border-[#222222] opacity-40'
                }`}
              >
                <span className="font-mono text-[0.625rem] text-blue-400 tracking-wider uppercase block mb-1">
                  {b.code}
                </span>
                <p className="text-sm font-bold text-white mb-1">{b.title}</p>
                <p className="text-xs text-white/50 leading-relaxed font-sans">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reports Ledger */}
        <div className="bg-[#111111] border-2 border-[#222222] rounded-[4px] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 border-b border-[#222222]">
            <div>
              <h2 className="font-serif text-2xl text-white font-normal">Reported Issues Ledger</h2>
              <p className="font-mono text-xs text-white/50 mt-1">
                {isSample ? 'Showing sample verified citizen reports' : `Live records (${reports.length} lodged)`}
              </p>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1 bg-[#161616] border border-[#262626] p-1 rounded-[2px]">
              {(['all', 'active', 'resolved'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-wider rounded-[2px] transition-colors ${
                    activeFilter === filter
                      ? 'bg-white text-black font-bold'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-mono text-sm text-white/50 mb-3">No reports found for this filter.</p>
              <Link
                to="/report"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs uppercase tracking-wider rounded-[2px]"
              >
                <Plus className="w-3.5 h-3.5" /> Lodge First Report
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#1D1D1D]">
              {filteredReports.map((report) => {
                const meta = STATUS_META[report.status] ?? STATUS_META.reported;
                const sev = report.severityScore || 6;
                const color = severityColor(sev);
                const stColor = markerColor(report.status);

                return (
                  <Link
                    key={report.id}
                    to={`/issue/${report.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-[#141414] transition-colors group relative"
                  >
                    {/* Status Left Accent Bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: stColor }}
                    />

                    <div className="flex items-start gap-4 min-w-0 pl-1">
                      <div className="w-16 h-16 rounded-[2px] bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden shrink-0">
                        {report.mediaURL ? (
                          <img src={report.mediaURL} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/30">
                            <MapPin className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[0.625rem] text-blue-400 uppercase tracking-wider">
                            #{report.id.slice(0, 8)}
                          </span>
                          <span
                            className="font-mono text-[0.625rem] font-bold uppercase px-2 py-0.5 rounded-[2px]"
                            style={{ backgroundColor: `${stColor}20`, color: stColor }}
                          >
                            {meta.label}
                          </span>
                          <span
                            className="font-mono text-[0.625rem] px-2 py-0.5 rounded-[2px] border"
                            style={{ borderColor: `${color}40`, color }}
                          >
                            SEV · {sev}/10
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                          {report.title || categoryById(report.category).label}
                        </h3>

                        <p className="text-xs text-white/50 line-clamp-1 font-sans">
                          {report.description}
                        </p>

                        <div className="flex items-center gap-3 font-mono text-[0.625rem] text-white/40 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(report.createdAt)}
                          </span>
                          {report.address && (
                            <span className="flex items-center gap-1 truncate max-w-xs">
                              <MapPin className="w-3 h-3" />
                              {report.address}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <span className="font-mono text-xs text-white/40 group-hover:text-white transition-colors flex items-center gap-1">
                        VIEW FILE <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

