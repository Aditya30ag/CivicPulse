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
          setError('Issue not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firestore subscription error:', err);
        setError('Failed to load issue data');
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
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Link to="/home" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-primary transition-colors no-underline mb-5">
        <ArrowLeft className="w-4 h-4" /> Back to map
      </Link>

      <div className="bg-card border border-line rounded-3xl shadow-card overflow-hidden">
        {/* Media */}
        <div className="bg-night w-full flex items-center justify-center min-h-[16rem] max-h-[55vh] overflow-hidden">
          {issue.mediaType === 'video' ? (
            <video src={issue.mediaURL} controls className="max-w-full max-h-[55vh] object-contain" />
          ) : (
            <img src={issue.mediaURL} alt={`Issue: ${issue.category}`} className="max-w-full max-h-[55vh] object-contain" />
          )}
        </div>

        <div className="p-5 sm:p-8">
          {/* Status + id row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {isAdmin ? (
              <select
                value={status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className={`rounded-full px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide cursor-pointer border ${statusMeta.bg} ${statusMeta.text} focus:outline-none`}
              >
                <option value="reported">Reported</option>
                <option value="community_verified">Verified</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            ) : (
              <Badge tone={status === 'resolved' ? 'success' : status === 'in_progress' || status === 'community_verified' ? 'warning' : 'danger'} dot dotColor={severityColor(sev ?? 5)}>
                {status.replace('_', ' ')}
              </Badge>
            )}
            <span className="text-xs font-mono text-faint">#{id?.substring(0, 8)}</span>
            {issue.department && (
              <Badge tone="primary">
                <Building2 className="w-3 h-3" /> {issue.department}
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mb-2">{issue.title || `${cat.label} issue`}</h1>

          {/* Progress timeline */}
          <div className="mt-4 mb-6 rounded-2xl bg-subtle border border-line p-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-faint">Progress</p>
              <span className="text-xs font-bold text-ink capitalize">{status.replace('_', ' ')}</span>
            </div>
            <StatusTimeline status={status} />
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl border border-line bg-page p-4 flex items-start gap-3">
              <User className="w-4 h-4 mt-0.5 shrink-0 text-muted" />
              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-faint mb-1">Reported by</p>
                <div className="flex items-center gap-2">
                  {reporter?.photoURL ? (
                    <img src={reporter.photoURL} alt={reporter.name} className="w-6 h-6 rounded-full" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-primary-soft text-primary text-xs font-bold flex items-center justify-center">
                      {reporter?.name?.charAt(0) || '?'}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-ink">{reporter?.name || 'Loading…'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-page p-4 flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 shrink-0 text-muted" />
              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-faint mb-1">Date reported</p>
                <span className="text-sm font-semibold text-ink">{formatDateTime(issue.createdAt)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-page p-4 flex items-start gap-3 sm:col-span-2">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted" />
              <div className="flex-1">
                <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-faint mb-1">Location</p>
                <span className="text-sm font-semibold text-ink">
                  {issue.geoPoint.lat.toFixed(6)}, {issue.geoPoint.lng.toFixed(6)}
                </span>
                <span className="text-xs text-faint ml-2">· {cat.label}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-[0.6875rem] font-bold uppercase tracking-widest text-faint mb-2.5">Description</h3>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{issue.description}</p>
          </div>

          {/* Severity block */}
          {sev === undefined || sev === null ? (
            <div className="mb-8 rounded-2xl border border-line bg-subtle p-6 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm italic text-muted">AI is assessing severity…</span>
            </div>
          ) : (
            <div className="mb-8 rounded-2xl border border-line overflow-hidden">
              <div className="flex items-stretch">
                <div
                  className="w-20 shrink-0 flex flex-col items-center justify-center gap-1"
                  style={{ background: `${severityColor(sev)}14`, borderRight: '1px solid var(--line)' }}
                >
                  <span className="text-4xl font-extrabold leading-none" style={{ color: severityColor(sev) }}>
                    {sev}
                  </span>
                  <span className="text-[0.625rem] font-bold uppercase tracking-widest" style={{ color: severityColor(sev) }}>
                    {severityLabel(sev)}
                  </span>
                </div>
                <div className="flex-1 p-5">
                  <h3 className="text-[0.6875rem] font-bold uppercase tracking-widest text-faint mb-2">AI Severity Assessment</h3>
                  <p className="text-sm font-medium text-ink leading-relaxed">
                    {severityTrace?.reasoning || `Assessed as severity level ${sev}/10 based on civic impact.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Admin updates */}
          {issue.updates && issue.updates.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[0.6875rem] font-bold uppercase tracking-widest text-faint mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Department updates
              </h3>
              <div className="space-y-3">
                {issue.updates.slice().reverse().map((u, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-page p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-primary">{u.by}</span>
                      <span className="text-[0.6875rem] text-faint">{formatRelativeTime(u.at)}</span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed">{u.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent trace */}
          {issue.agentTrace && issue.agentTrace.length > 0 && (
            <div className="mb-8">
              <h3 className="text-[0.6875rem] font-bold uppercase tracking-widest text-faint mb-5">AI Agent Reasoning</h3>
              <div className="relative space-y-5 pl-2">
                <div className="absolute left-[23px] top-4 bottom-4 w-px bg-line" aria-hidden="true" />
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
                  const tone = index % 2 === 0 ? 'bg-primary-soft text-primary' : 'bg-teal-soft text-teal-brand';
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.12, 0.6), duration: 0.35 }}
                      className="relative z-10 flex gap-4"
                    >
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-card shadow-card shrink-0 ${tone}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex-1 bg-card border border-line rounded-2xl shadow-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold uppercase tracking-wide text-primary">{trace.agent} Agent</span>
                          <span className="text-xs text-faint font-mono">{formatRelativeTime(trace.timestamp)}</span>
                        </div>
                        <p className="text-sm text-muted leading-relaxed">{trace.reasoning}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

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
