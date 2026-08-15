import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, Clock, Loader2, Zap, ShieldCheck, LogOut, Plus, FileText } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { STATUS_META, categoryById } from '../lib/status';
import { formatDate } from '../lib/format';
import { useToast } from '../contexts/ToastContext';

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { success } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    success('Signed out', 'See you soon!');
    navigate('/login');
  };

  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
  const activeCount = reports.length - resolvedCount;
  const trustScore = 87;

  const initials = (user?.displayName || user?.email || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Profile card */}
      <div className="bg-card border border-line rounded-3xl shadow-card overflow-hidden mb-6">
        <div className="h-28 bg-gradient-to-r from-primary via-primary-strong to-teal-brand relative">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(40% 100% at 10% 0%, rgba(255,255,255,0.5) 0%, transparent 60%), radial-gradient(40% 100% at 90% 100%, rgba(255,255,255,0.4) 0%, transparent 60%)',
            }}
          />
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 mb-6">
            <span className="w-24 h-24 rounded-2xl overflow-hidden bg-card border-4 border-card shadow-pop shrink-0 flex items-center justify-center">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-teal-brand text-white text-3xl font-extrabold">
                  {initials}
                </span>
              )}
            </span>
            <div className="pb-1 min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink truncate">{user?.displayName || 'My Profile'}</h1>
              <p className="text-sm text-muted truncate">{user?.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-line bg-page p-4">
              <span className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-2">
                <FileText className="w-4 h-4" />
              </span>
              <p className="text-xl font-extrabold text-ink tabular-nums leading-none">{reports.length}</p>
              <p className="text-[0.6875rem] font-semibold text-faint mt-1">Reports</p>
            </div>
            <div className="rounded-2xl border border-line bg-page p-4">
              <span className="w-8 h-8 rounded-lg bg-warning-soft text-warning flex items-center justify-center mb-2">
                <Zap className="w-4 h-4" />
              </span>
              <p className="text-xl font-extrabold text-ink tabular-nums leading-none">{activeCount}</p>
              <p className="text-[0.6875rem] font-semibold text-faint mt-1">Active</p>
            </div>
            <div className="rounded-2xl border border-line bg-page p-4">
              <span className="w-8 h-8 rounded-lg bg-success-soft text-success flex items-center justify-center mb-2">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <p className="text-xl font-extrabold text-ink tabular-nums leading-none">{trustScore}</p>
              <p className="text-[0.6875rem] font-semibold text-faint mt-1">Trust score</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-5">
            <Badge tone="success">
              <ShieldCheck className="w-3 h-3" /> {resolvedCount} resolved · {activeCount} active
            </Badge>
            <Button variant="danger-outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* My reports */}
      <div className="bg-card border border-line rounded-3xl shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-base font-extrabold tracking-tight text-ink">My Reports</h2>
          <Button to="/report" size="sm" variant="secondary">
            <Plus className="w-3.5 h-3.5" /> New report
          </Button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={72} />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<MapPin className="w-6 h-6" />}
            title="You haven't reported any issues yet"
            description="Spot something that needs fixing? Your reports will show up here with live status tracking."
            action={
              <Button to="/report" size="sm">
                <Plus className="w-3.5 h-3.5" /> Report your first issue
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {reports.map((report) => {
              const meta = STATUS_META[report.status] ?? STATUS_META.reported;
              return (
                <li key={report.id}>
                  <Link to={`/issue/${report.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-subtle/60 transition-colors no-underline group">
                    <span className="w-14 h-14 rounded-xl bg-subtle overflow-hidden shrink-0 flex items-center justify-center">
                      {report.mediaURL ? (
                        report.mediaType === 'video' ? (
                          <video src={report.mediaURL} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <img src={report.mediaURL} alt="" className="w-full h-full object-cover" loading="lazy" />
                        )
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-faint">
                          <MapPin className="w-5 h-5" />
                        </span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-bold text-ink truncate group-hover:text-primary transition-colors">
                          {report.title || categoryById(report.category).label}
                        </h3>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${meta.bg} ${meta.text}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted line-clamp-1">{report.description}</p>
                      <p className="text-[0.6875rem] text-faint mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {formatDate(report.createdAt)}
                        {report.geoPoint && (
                          <>
                            <span>·</span>
                            <MapPin className="w-3 h-3" />
                            {report.geoPoint.lat.toFixed(3)}, {report.geoPoint.lng.toFixed(3)}
                          </>
                        )}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
