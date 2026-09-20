import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, getDoc, runTransaction, collection, query, where, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, Clock, Loader2, User, Search, AlertTriangle, CheckCircle, ArrowRight, XCircle, GitMerge, Building2, ArrowLeft, Eye, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useIsAdmin } from '../hooks/useIsAdmin';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { StatusTimeline } from '../components/ComplaintCard';
import { categoryById, departmentForCategory, severityColor, severityLabel, STATUS_META } from '../lib/status';
import { formatDateTime, formatRelativeTime } from '../lib/format';
import { useToast } from '../contexts/ToastContext';
import { DUMMY_REPORTS } from '../lib/dummyData';

interface AgentTraceEntry {
  agent: string;
  reasoning: string;
  timestamp: string;
}

interface IssueData {
  mediaURL: string;
  mediaType: 'image' | 'video';
  category: string;
  title?: string;
  description: string;
  geoPoint: { lat: number; lng: number };
  reporterId: string;
  status: string;
  severityScore?: number;
  agentTrace?: AgentTraceEntry[];
  updates?: { text: string; by: string; at: string }[];
  department?: string;
  createdAt: any;
  resolvedAt?: any;
}

interface ReporterData {
  name: string;
  photoURL: string;
}

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { success } = useToast();
  const [issue, setIssue] = useState<IssueData | null>(null);
  const [reporter, setReporter] = useState<ReporterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVerified, setHasVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!id || !db) return;

    if (user) {
      const q = query(collection(db, `reports/${id}/verifications`), where('userId', '==', user.uid));
      getDocs(q)
        .then((snap) => {
          if (!snap.empty) setHasVerified(true);
        })
        .catch(console.error);
    }

    const issueRef = doc(db, 'reports', id);
    const unsubscribe = onSnapshot(
      issueRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as IssueData;
          setIssue(data);

          if (!reporter && data.reporterId) {
            try {
              const reporterSnap = await getDoc(doc(db, 'users', data.reporterId));
              setReporter(reporterSnap.exists() ? (reporterSnap.data() as ReporterData) : { name: 'Anonymous Citizen', photoURL: '' });
            } catch (err) {
              console.error('Failed to fetch reporter:', err);
              setReporter({ name: 'Anonymous Citizen', photoURL: '' });
            }
          }
        } else {
          const dummy = DUMMY_REPORTS.find((d) => d.id === id);
          if (dummy) {
            setIssue({
              mediaURL: dummy.mediaURL,
              mediaType: dummy.mediaType || 'image',
              category: dummy.category,
              title: dummy.title,
              description: dummy.description,
              geoPoint: dummy.geoPoint,
              reporterId: 'citizen-demo',
              status: dummy.status,
              severityScore: dummy.severityScore,
              department: dummy.department,
              createdAt: dummy.createdAt,
              agentTrace: [
                {
                  agent: 'Perception Agent',
                  reasoning: `Perception model classified hazard severity as ${dummy.severityScore}/10 under ${dummy.category}.`,
                  timestamp: formatRelativeTime(dummy.createdAt),
                },
                {
                  agent: 'Routing Agent',
                  reasoning: `Geofence mapped within Metropolitan Ward 07. Automatically routed to ${dummy.department}.`,
                  timestamp: formatRelativeTime(dummy.createdAt),
                },
              ],
              updates: [
                {
                  text: `Automated dispatch created for ${dummy.department}`,
                  by: 'CivicPulse Engine',
                  at: formatRelativeTime(dummy.createdAt),
                },
              ],
            });
            setReporter({
              name: 'Aarav Sharma (Verified Citizen)',
              photoURL: '',
            });
          } else {
            setError('Issue not found');
          }
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Firestore subscription warning, checking mock reports:', err);
        const dummy = DUMMY_REPORTS.find((d) => d.id === id);
        if (dummy) {
          setIssue({
            mediaURL: dummy.mediaURL,
            mediaType: dummy.mediaType || 'image',
            category: dummy.category,
            title: dummy.title,
            description: dummy.description,
            geoPoint: dummy.geoPoint,
            reporterId: 'citizen-demo',
            status: dummy.status,
            severityScore: dummy.severityScore,
            department: dummy.department,
            createdAt: dummy.createdAt,
          });
          setReporter({
            name: 'Aarav Sharma (Verified Citizen)',
            photoURL: '',
          });
        } else {
          setError('Failed to load issue data');
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id, reporter, user]);

  const handleVerify = async (type: 'confirm' | 'reject') => {
    if (!user || !id || !issue || hasVerified || isVerifying) return;
    try {
      setIsVerifying(true);
      const reportRef = doc(db, 'reports', id);
      const verificationRef = doc(collection(db, `reports/${id}/verifications`));
      const verifyingUserRef = doc(db, 'users', user.uid);
      const originalReporterRef = doc(db, 'users', issue.reporterId);

      await runTransaction(db, async (transaction) => {
        const reportSnap = await transaction.get(reportRef);
        if (!reportSnap.exists()) throw new Error('Report does not exist!');

        const verifyingUserSnap = await transaction.get(verifyingUserRef);
        let newCount = (reportSnap.data().verificationCount || 0) + 1;
        let newStatus = reportSnap.data().status;
        const trace = reportSnap.data().agentTrace || [];
        let reporterPointsDelta = 0;

        if (newCount === 3) {
          newStatus = 'community_verified';
          trace.push({ agent: 'Verification', reasoning: '3 community members confirmed this issue', timestamp: new Date().toISOString() });
          reporterPointsDelta = 15;
        }

        const reporterUserSnap = reporterPointsDelta > 0 && originalReporterRef.id ? await transaction.get(originalReporterRef) : null;

        transaction.set(verificationRef, { userId: user.uid, type, createdAt: serverTimestamp() });
        transaction.update(reportRef, { verificationCount: newCount, status: newStatus, agentTrace: trace });

        if (verifyingUserSnap.exists()) {
          transaction.update(verifyingUserRef, { points: (verifyingUserSnap.data().points || 0) + 5 });
        } else {
          transaction.set(verifyingUserRef, { points: 5 }, { merge: true });
        }

        if (reporterPointsDelta > 0 && reporterUserSnap && reporterUserSnap.exists()) {
          transaction.update(originalReporterRef, { points: (reporterUserSnap.data().points || 0) + reporterPointsDelta });
        }
      });

      setHasVerified(true);
      success('Thanks for verifying!', '+5 points added to your account.');
    } catch (e: any) {
      console.error('Transaction Error:', e);
      setError('Verification failed: ' + e.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id) return;
    try {
      const issueRef = doc(db, 'reports', id);
      const updateData: any = { status: newStatus };
      if (newStatus === 'resolved') {
        updateData.resolvedAt = new Date().toISOString();
      }
      await updateDoc(issueRef, updateData);
      success('Status updated', `Issue moved to ${newStatus.replace('_', ' ')}.`);
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Spinner size={32} />
        <p className="text-sm text-muted">Loading issue details…</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-2xl bg-danger-soft border border-danger/25 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-3" />
          <h2 className="text-lg font-bold text-ink">{error || 'Issue not found'}</h2>
          <Button to="/home" variant="secondary" className="mt-5">
            <ArrowLeft className="w-4 h-4" /> Return to map
          </Button>
        </div>
      </div>
    );
  }

  const sev = issue.severityScore;
  const status = issue.status ?? 'reported';
  const statusMeta = STATUS_META[status] ?? STATUS_META.reported;
  const cat = categoryById(issue.category);
  const dept = issue.department || departmentForCategory(issue.category);
  const severityTrace = issue.agentTrace?.find((t) => t.agent.toLowerCase() === 'severity');

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-[#0A0A0A] text-[#F5F5F5]">
      <Link to="/home" className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#888888] hover:text-[#F5F5F5] transition-colors no-underline mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> BACK TO INCIDENT MAP
      </Link>

      <div className="editorial-card p-0 overflow-hidden bg-[#161616]">
        {/* Media */}
        <div className="bg-[#0A0A0A] w-full flex items-center justify-center min-h-[16rem] max-h-[55vh] overflow-hidden border-b border-[#222222]">
          {issue.mediaType === 'video' ? (
            <video src={issue.mediaURL} controls className="max-w-full max-h-[55vh] object-contain" />
          ) : (
            <img src={issue.mediaURL} alt={`Issue: ${issue.category}`} className="max-w-full max-h-[55vh] object-contain filter brightness-95" />
          )}
        </div>

        <div className="p-6 sm:p-8">
          {/* Status + id row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {isAdmin ? (
              <select
                value={status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className="rounded-[2px] px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer border border-[#222222] bg-[#111111] text-[#F5F5F5] focus:outline-none"
              >
                <option value="reported">Reported</option>
                <option value="community_verified">Verified</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            ) : (
              <span
                className={
                  status === 'resolved'
                    ? 'status-badge-resolved'
                    : status === 'in_progress' || status === 'community_verified'
                      ? 'status-badge-progress'
                      : 'status-badge-open'
                }
              >
                {status.replace('_', ' ')}
              </span>
            )}
            <span className="text-xs font-mono text-[#555555]">#{id?.substring(0, 8).toUpperCase()}</span>
            {issue.department && (
              <span className="px-2.5 py-0.5 rounded-[2px] bg-[#2563EB]/10 border border-[#2563EB]/30 font-mono text-[11px] text-[#2563EB] flex items-center gap-1.5">
                <Building2 className="w-3 h-3" /> {issue.department}
              </span>
            )}
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl font-normal text-[#F5F5F5] tracking-tight mb-4">
            {issue.title || `${cat.label} issue`}
          </h1>

          {/* Progress timeline */}
          <div className="mb-6 rounded-[2px] bg-[#111111] border border-[#222222] p-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#555555]">
                DISPATCH LIFECYCLE
              </p>
              <span className="text-xs font-mono font-bold text-[#2563EB] uppercase">
                {status.replace('_', ' ')}
              </span>
            </div>
            <StatusTimeline status={status} />
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-[2px] border border-[#222222] bg-[#111111] p-4 flex items-start gap-3">
              <User className="w-4 h-4 mt-0.5 shrink-0 text-[#888888]" />
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#555555] mb-1">Reported by</p>
                <div className="flex items-center gap-2">
                  {reporter?.photoURL ? (
                    <img src={reporter.photoURL} alt={reporter.name} className="w-6 h-6 rounded-[2px] object-cover" />
                  ) : (
                    <span className="w-6 h-6 rounded-[2px] bg-[#2563EB]/20 text-[#2563EB] text-xs font-bold flex items-center justify-center font-mono">
                      {reporter?.name?.charAt(0) || 'C'}
                    </span>
                  )}
                  <span className="text-xs font-mono font-semibold text-[#F5F5F5]">{reporter?.name || 'Anonymous Citizen'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[2px] border border-[#222222] bg-[#111111] p-4 flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 shrink-0 text-[#888888]" />
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#555555] mb-1">Timestamp</p>
                <span className="text-xs font-mono font-semibold text-[#F5F5F5]">{formatDateTime(issue.createdAt)}</span>
              </div>
            </div>

            <div className="rounded-[2px] border border-[#222222] bg-[#111111] p-4 flex items-start gap-3 sm:col-span-2">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#888888]" />
              <div className="flex-1">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#555555] mb-1">Geographic Coordinates</p>
                <span className="text-xs font-mono font-semibold text-[#F5F5F5]">
                  {issue.geoPoint.lat.toFixed(6)}° N, {issue.geoPoint.lng.toFixed(6)}° E
                </span>
                <span className="text-xs font-mono text-[#888888] ml-2">· [{cat.short}]</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#555555] mb-2">Description</h3>
            <p className="text-xs sm:text-sm text-[#888888] leading-relaxed font-sans whitespace-pre-wrap">{issue.description}</p>
          </div>

          {/* Severity block */}
          {sev === undefined || sev === null ? (
            <div className="mb-8 rounded-[2px] border border-[#222222] bg-[#111111] p-6 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
              <span className="text-xs font-mono text-[#888888]">AI is assessing incident severity…</span>
            </div>
          ) : (
            <div className="mb-8 editorial-card p-0 overflow-hidden bg-[#111111]">
              <div className="flex items-stretch">
                <div
                  className="w-24 shrink-0 flex flex-col items-center justify-center gap-1 border-r border-[#222222]"
                  style={{ backgroundColor: `${severityColor(sev)}12` }}
                >
                  <span className="font-mono text-4xl font-bold leading-none" style={{ color: severityColor(sev) }}>
                    {sev}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: severityColor(sev) }}>
                    {severityLabel(sev)}
                  </span>
                </div>
                <div className="flex-1 p-5">
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#555555] mb-1.5">
                    Machine Vision Severity Assessment
                  </h3>
                  <p className="text-xs font-mono text-[#F5F5F5] leading-relaxed">
                    {severityTrace?.reasoning || `Assessed as severity level ${sev}/10 based on civic disruption and hazard proximity.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Admin updates */}
          {issue.updates && issue.updates.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#555555] mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#2563EB]" /> Municipal Dispatch Log
              </h3>
              <div className="space-y-3">
                {issue.updates.slice().reverse().map((u, i) => (
                  <div key={i} className="editorial-card p-4 bg-[#111111]">
                    <div className="flex items-center justify-between mb-1.5 font-mono text-xs">
                      <span className="text-[#2563EB] font-bold">[{u.by}]</span>
                      <span className="text-[10px] text-[#555555]">{formatRelativeTime(u.at)}</span>
                    </div>
                    <p className="text-xs text-[#F5F5F5] leading-relaxed font-sans">{u.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent trace */}
          {issue.agentTrace && issue.agentTrace.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#555555] mb-5">
                Autonomous AI Routing Pipeline
              </h3>
              <div className="relative space-y-4 pl-2">
                <div className="absolute left-[21px] top-4 bottom-4 w-[2px] bg-[#222222]" aria-hidden="true" />
                {issue.agentTrace.map((trace, index) => {
                  const agent = trace.agent.toLowerCase();
                  const Icon =
                    agent === 'perception' ? Eye
                    : agent === 'deduplication' ? Search
                    : agent === 'severity' ? AlertTriangle
                    : agent === 'verification' ? CheckCircle
                    : agent === 'routing' ? Building2
                    : agent === 'orchestrator' ? GitMerge
                    : CheckCircle;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.12, 0.6), duration: 0.35 }}
                      className="relative z-10 flex gap-4"
                    >
                      <span className="w-9 h-9 rounded-[2px] flex items-center justify-center border border-[#222222] bg-[#161616] text-[#2563EB] shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex-1 editorial-card p-4 bg-[#111111]">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2563EB]">
                            {trace.agent} AGENT
                          </span>
                          <span className="text-[10px] text-[#555555] font-mono">{formatRelativeTime(trace.timestamp)}</span>
                        </div>
                        <p className="text-xs text-[#888888] leading-relaxed font-mono">{trace.reasoning}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Community verification action */}
          <div className="pt-6 border-t border-[#222222] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <p className="text-xs font-mono font-bold text-[#F5F5F5]">Community Audit & Verification</p>
              <p className="text-[11px] font-mono text-[#888888] mt-0.5">
                Neighbors confirming reports earn trust points and accelerate dispatch priority.
              </p>
            </div>
            <button
              onClick={() => handleVerify('confirm')}
              disabled={hasVerified || isVerifying}
              className={`editorial-btn-primary text-xs py-2 px-6 ${
                hasVerified ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 pointer-events-none' : ''
              }`}
            >
              {hasVerified ? '✓ VERIFIED BY YOU' : 'CONFIRM THIS INCIDENT (+5 PTS)'}
            </button>
          </div>

          {/* Verify block */}
          {user && user.uid !== issue.reporterId && !hasVerified && (
            <div className="rounded-2xl border border-line bg-gradient-to-br from-primary/5 to-teal-brand/5 p-5">
              <h3 className="text-base font-bold text-ink mb-1">Community Verification</h3>
              <p className="text-sm text-muted mb-4">
                Help the community by verifying if this issue still exists. You earn <strong className="text-ink">+5 points</strong> for verifying.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => handleVerify('confirm')} loading={isVerifying} className="flex-1">
                  <CheckCircle className="w-4 h-4" /> Confirm this exists
                </Button>
                <Button variant="danger-outline" onClick={() => handleVerify('reject')} disabled={isVerifying} className="flex-1">
                  <XCircle className="w-4 h-4" /> Mark as resolved/fake
                </Button>
              </div>
            </div>
          )}

          {user && user.uid !== issue.reporterId && hasVerified && (
            <div className="rounded-2xl bg-success-soft border border-success/25 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-success text-white flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-ink">You've verified this issue</h3>
                  <p className="text-xs text-muted">Thank you for contributing to the community!</p>
                </div>
              </div>
              <span className="text-sm font-extrabold text-success">+5 pts</span>
            </div>
          )}

          {/* Assigned department */}
          <div className="mt-6 flex items-center gap-2.5 rounded-2xl border border-line bg-page p-4">
            <span className="w-9 h-9 rounded-xl bg-teal-soft text-teal-brand flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-faint">Handled by</p>
              <p className="text-sm font-bold text-ink">{dept}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-faint ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
