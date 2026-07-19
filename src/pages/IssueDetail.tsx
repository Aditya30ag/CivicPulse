import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, getDoc, runTransaction, collection, query, where, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, Clock, Loader2, User, Eye, Search, AlertTriangle, CheckCircle, ArrowRight, XCircle, GitMerge } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useIsAdmin } from '../hooks/useIsAdmin';

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
  geoPoint: { lat: number, lng: number };
  reporterId: string;
  status: string;
  severityScore?: number;
  agentTrace?: AgentTraceEntry[];
  createdAt: any;
}

interface ReporterData {
  name: string;
  photoURL: string;
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
  
  if (diffInSeconds < 60) return `${Math.max(1, diffInSeconds)} seconds ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
};

/* ── Status chip helper ───────────────────────────────────────────────── */
function statusChipClass(status: string) {
  switch (status) {
    case 'reported':           return 'status-chip status-chip--open';
    case 'in_progress':        return 'status-chip status-chip--progress';
    case 'community_verified': return 'status-chip status-chip--verified';
    case 'resolved':           return 'status-chip status-chip--resolved';
    default:                   return 'status-chip';
  }
}

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [issue, setIssue] = useState<IssueData | null>(null);
  const [reporter, setReporter] = useState<ReporterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVerified, setHasVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!id || !db) return;

    if (user) {
      const q = query(collection(db, `reports/${id}/verifications`), where("userId", "==", user.uid));
      getDocs(q).then(snap => {
        if (!snap.empty) {
          setHasVerified(true);
        }
      }).catch(console.error);
    }

    const issueRef = doc(db, 'reports', id);
    const unsubscribe = onSnapshot(issueRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as IssueData;
        setIssue(data);
        
        // Fetch reporter details if we haven't already
        if (!reporter && data.reporterId) {
          try {
            const reporterSnap = await getDoc(doc(db, 'users', data.reporterId));
            if (reporterSnap.exists()) {
              setReporter(reporterSnap.data() as ReporterData);
            } else {
               setReporter({ name: 'Anonymous Citizen', photoURL: '' });
            }
          } catch (err) {
            console.error("Failed to fetch reporter:", err);
            setReporter({ name: 'Anonymous Citizen', photoURL: '' });
          }
        }
      } else {
        setError("Issue not found");
      }
      setLoading(false);
    }, (err) => {
      console.error("Firestore subscription error:", err);
      setError("Failed to load issue data");
      setLoading(false);
    });

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
        if (!reportSnap.exists()) throw new Error("Report does not exist!");
        
        const verifyingUserSnap = await transaction.get(verifyingUserRef);
        
        let newCount = (reportSnap.data().verificationCount || 0) + 1;
        let newStatus = reportSnap.data().status;
        let trace = reportSnap.data().agentTrace || [];
        
        let reporterPointsDelta = 0;
        
        if (newCount === 3) {
          newStatus = 'community_verified';
          trace.push({
            agent: "Verification", 
            reasoning: "3 community members confirmed this issue", 
            timestamp: new Date().toISOString()
          });
          reporterPointsDelta = 15;
        }

        const reporterUserSnap = (reporterPointsDelta > 0 && originalReporterRef.id) ? await transaction.get(originalReporterRef) : null;
        
        transaction.set(verificationRef, {
          userId: user.uid,
          type: type,
          createdAt: serverTimestamp()
        });
        
        transaction.update(reportRef, {
          verificationCount: newCount,
          status: newStatus,
          agentTrace: trace
        });
        
        if (verifyingUserSnap.exists()) {
          transaction.update(verifyingUserRef, {
            points: (verifyingUserSnap.data().points || 0) + 5
          });
        } else {
          transaction.set(verifyingUserRef, { points: 5 }, { merge: true });
        }
        
        if (reporterPointsDelta > 0 && reporterUserSnap && reporterUserSnap.exists()) {
          transaction.update(originalReporterRef, {
            points: (reporterUserSnap.data().points || 0) + reporterPointsDelta
          });
        }
      });
      
      setHasVerified(true);
    } catch (e: any) {
       console.error("Transaction Error:", e);
       setError("Verification failed: " + e.message);
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
    } catch(e) {
      console.error("Failed to update status", e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hazard)' }} />
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}>
          Loading issue details…
        </p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto text-center">
        <div
          className="p-6 flex flex-col items-center gap-4"
          style={{
            background: 'rgba(214,72,61,0.06)',
            border: '1px solid rgba(214,72,61,0.25)',
            borderRadius: '3px',
            color: 'var(--signal)',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2
            className="text-xl"
            style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700 }}
          >
            {error || "Issue not found"}
          </h2>
          <Link to="/home" style={{ color: 'var(--signal)', fontWeight: 600 }}>
            Return to Map
          </Link>
        </div>
      </div>
    );
  }

  const dateString = issue.createdAt?.toDate ? issue.createdAt.toDate().toLocaleString() : "Just now";

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        to="/home"
        className="inline-flex items-center text-sm font-semibold mb-6 no-underline transition-colors"
        style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          color: 'var(--ink)',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--hazard)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink)')}
      >
        ← Back to Map
      </Link>
      
      {/* Main card */}
      <div
        className="overflow-hidden"
        style={{
          background: '#fff',
          border: '1px solid var(--paper-dim)',
          borderRadius: '3px',
          boxShadow: '0 2px 8px rgba(22,40,61,0.07)',
        }}
      >
        {/* Media Block */}
        <div className="bg-black w-full flex items-center justify-center min-h-[16rem] max-h-[60vh] overflow-hidden">
          {issue.mediaType === 'video' ? (
            <video src={issue.mediaURL} controls className="max-w-full max-h-[60vh] object-contain" />
          ) : (
            <img src={issue.mediaURL} alt={`Issue: ${issue.category}`} className="max-w-full max-h-[60vh] object-contain" />
          )}
        </div>
        
        <div className="p-5 sm:p-6 md:p-8">
          {/* Status + ID row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {isAdmin ? (
              <select
                className={statusChipClass(issue.status)}
                value={issue.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                style={{ cursor: 'pointer', background: 'inherit' }}
              >
                <option value="reported">Reported</option>
                <option value="community_verified">Verified</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            ) : (
              <span className={statusChipClass(issue.status)}>
                {issue.status === 'community_verified' ? 'Verified'
                  : issue.status === 'in_progress' ? 'In Progress'
                  : issue.status === 'reported' ? 'Reported'
                  : 'Resolved'}
              </span>
            )}
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
              }}
            >
              #{id?.substring(0, 8)}
            </span>
          </div>
          
          {/* Title */}
          <h1
            className="uppercase mb-6"
            style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
              lineHeight: 1.05,
              color: 'var(--ink)',
            }}
          >
            {issue.title || `${issue.category} Issue`}
          </h1>
          
          {/* Metadata grid */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 p-4 sm:p-6"
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--paper-dim)',
              borderRadius: '3px',
            }}
          >
             <div className="flex items-start gap-3">
               <User className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
               <div>
                  <p
                    className="text-xs uppercase tracking-widest mb-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}
                  >
                    Reported By
                  </p>
                  <div className="flex items-center gap-2">
                    {reporter?.photoURL ? (
                      <img src={reporter.photoURL} alt={reporter.name} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--paper-dim)', color: 'var(--ink)' }}
                      >
                        {reporter?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, color: 'var(--ink)' }}>
                      {reporter?.name || 'Loading…'}
                    </span>
                  </div>
               </div>
             </div>

             <div className="flex items-start gap-3">
               <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
               <div>
                  <p
                    className="text-xs uppercase tracking-widest mb-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}
                  >
                    Date Reported
                  </p>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.8125rem',
                      color: 'var(--ink)',
                    }}
                  >
                    {dateString}
                  </span>
               </div>
             </div>

             <div className="flex items-start gap-3 md:col-span-2">
               <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
               <div>
                  <p
                    className="text-xs uppercase tracking-widest mb-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}
                  >
                    Location Coordinates
                  </p>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.8125rem',
                      color: 'var(--ink)',
                    }}
                  >
                    {issue.geoPoint.lat.toFixed(6)}, {issue.geoPoint.lng.toFixed(6)}
                  </span>
               </div>
             </div>
          </div>
          
          {/* Description */}
          <div className="mb-8">
            <h3
              className="text-xs uppercase tracking-widest mb-3"
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, color: 'var(--text-secondary)' }}
            >
              Description
            </h3>
            <p
              className="leading-relaxed whitespace-pre-wrap"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ink)' }}
            >
              {issue.description}
            </p>
          </div>

          {/* Severity block */}
          {(() => {
            const severityTrace = issue.agentTrace?.find(t => t.agent.toLowerCase() === 'severity');
            if (issue.severityScore === undefined || issue.severityScore === null) {
              return (
                <div
                  className="mb-8 p-6 flex items-center justify-center gap-3"
                  style={{
                    border: '1px solid var(--paper-dim)',
                    borderRadius: '3px',
                    background: 'var(--paper)',
                  }}
                >
                   <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-secondary)' }} />
                   <span
                    style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: '0.875rem',
                      fontStyle: 'italic',
                      color: 'var(--text-secondary)',
                    }}
                   >
                    AI is assessing severity…
                   </span>
                </div>
              );
            }

            const sev = issue.severityScore;
            const sevColor = sev >= 7 ? 'var(--signal)' : sev >= 4 ? 'var(--hazard)' : 'var(--verified)';
            const sevLabel = sev >= 7 ? 'HIGH / URGENT' : sev >= 4 ? 'MEDIUM' : 'LOW';
            const reasoning = severityTrace?.reasoning || `Assessed as severity level ${sev}/10 based on civic impact.`;

            return (
              /* Asset-tag style severity block */
              <div className="asset-tag mb-8">
                <div className="asset-tag__stub">
                  <span
                    className={`asset-tag__score ${sev >= 7 ? 'asset-tag__score--high' : sev >= 4 ? 'asset-tag__score--medium' : 'asset-tag__score--low'}`}
                  >
                    {sev}
                  </span>
                  <span
                    className="text-center"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.5625rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: sevColor,
                      lineHeight: 1.2,
                    }}
                  >
                    {sevLabel.split('/').map((l, i) => <span key={i} style={{ display: 'block' }}>{l.trim()}</span>)}
                  </span>
                </div>
                <div className="asset-tag__body flex flex-col justify-center">
                  <h3
                    className="text-xs uppercase tracking-widest mb-2"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, color: 'var(--text-secondary)' }}
                  >
                    AI Severity Assessment
                  </h3>
                  <p
                    className="text-base leading-snug"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, color: 'var(--ink)' }}
                  >
                    {reasoning}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Agent trace */}
          {issue.agentTrace && issue.agentTrace.length > 0 && (
            <div className="mb-8">
              <h3
                className="text-xs uppercase tracking-widest mb-6"
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, color: 'var(--text-secondary)' }}
              >
                AI Agent Reasoning
              </h3>
              
              <div className="space-y-5 relative pl-3">
                {/* Vertical connector */}
                <div
                  className="absolute left-[31px] top-5 bottom-4 w-px"
                  style={{ background: 'var(--paper-dim)' }}
                />
                
                {issue.agentTrace.map((trace, index) => {
                  let Icon = CheckCircle;
                  
                  switch (trace.agent.toLowerCase()) {
                     case 'perception':    Icon = Eye; break;
                     case 'deduplication': Icon = Search; break;
                     case 'severity':      Icon = AlertTriangle; break;
                     case 'verification':  Icon = CheckCircle; break;
                     case 'routing':       Icon = ArrowRight; break;
                     case 'orchestrator':  Icon = GitMerge; break;
                  }

                  return (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.15, duration: 0.4 }}
                      className="relative z-10 flex gap-4"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                        style={{
                          background: index % 2 === 0 ? 'rgba(242,183,5,0.12)' : 'rgba(76,143,104,0.12)',
                          borderColor: index % 2 === 0 ? 'var(--hazard)' : 'var(--verified)',
                        }}
                      >
                         <Icon
                          className="w-4 h-4"
                          style={{ color: index % 2 === 0 ? 'var(--hazard)' : 'var(--verified)' }}
                         />
                      </div>
                      <div
                        className="flex-1 p-4 mt-0.5"
                        style={{
                          background: '#fff',
                          border: '1px solid var(--paper-dim)',
                          borderRadius: '3px',
                        }}
                      >
                         <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-2 gap-1 sm:gap-4">
                           <span
                            className="text-sm font-semibold"
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              color: 'var(--hazard)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                           >
                            {trace.agent} Agent
                           </span>
                           <span
                            className="text-xs whitespace-nowrap"
                            style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}
                           >
                            {formatRelativeTime(trace.timestamp)}
                           </span>
                         </div>
                         <p
                          className="text-sm leading-relaxed"
                          style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}
                         >
                          {trace.reasoning}
                         </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verify block — not yet verified */}
          {user && user.uid !== issue.reporterId && !hasVerified && (
            <div
              className="mb-8 p-5"
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--paper-dim)',
                borderRadius: '3px',
              }}
            >
               <h3
                className="text-base font-semibold mb-1"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ink)' }}
               >
                Community Verification
               </h3>
               <p
                className="text-sm mb-4"
                style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}
               >
                Help the community by verifying if this issue still exists. You earn +5 points for verifying.
               </p>
               <div className="flex flex-col sm:flex-row gap-3">
                 <button
                   onClick={() => handleVerify('confirm')}
                   disabled={isVerifying}
                   className="btn-primary flex-1"
                 >
                   {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                   Confirm this exists
                 </button>
                 <button
                   onClick={() => handleVerify('reject')}
                   disabled={isVerifying}
                   className="btn-secondary flex-1"
                 >
                   {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" style={{ color: 'var(--signal)' }} />}
                   Mark as resolved/fake
                 </button>
               </div>
            </div>
          )}

          {/* Already verified */}
          {user && user.uid !== issue.reporterId && hasVerified && (
            <div
              className="mb-8 p-4 flex items-center justify-between"
              style={{
                background: 'rgba(76,143,104,0.08)',
                border: '1px solid rgba(76,143,104,0.25)',
                borderRadius: '3px',
              }}
            >
              <div className="flex items-center gap-3">
                 <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(76,143,104,0.18)' }}
                 >
                    <CheckCircle className="w-5 h-5" style={{ color: 'var(--verified)' }} />
                 </div>
                 <div>
                   <h3
                    className="text-sm font-semibold"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ink)' }}
                   >
                    You've verified this issue
                   </h3>
                   <p
                    className="text-xs"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}
                   >
                    Thank you for contributing to the community!
                   </p>
                 </div>
              </div>
              <span
                className="text-sm font-bold"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--verified)' }}
              >
                +5 pts
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}