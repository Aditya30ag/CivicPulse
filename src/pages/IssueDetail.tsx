import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, getDoc, runTransaction, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, Clock, Loader2, User, Eye, Search, AlertTriangle, CheckCircle, ArrowRight, XCircle, GitMerge } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

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

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [issue, setIssue] = useState<IssueData | null>(null);
  const [reporter, setReporter] = useState<ReporterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVerified, setHasVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user && db) {
      const userRef = doc(db, 'users', user.uid);
      getDoc(userRef).then(snap => {
        if (snap.exists() && snap.data().role === 'admin') {
          setIsAdmin(true);
        }
      }).catch(console.error);
    }
  }, [user]);

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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-gray-500 font-medium">Loading issue details...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 flex flex-col items-center gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold">{error || "Issue not found"}</h2>
          <Link to="/" className="text-red-700 underline font-medium hover:text-red-900">
            Return to Map
          </Link>
        </div>
      </div>
    );
  }

  const dateString = issue.createdAt?.toDate ? issue.createdAt.toDate().toLocaleString() : "Just now";

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-dark font-medium hover:underline mb-6">
        &larr; Back to Map
      </Link>
      
      <div className="bg-card rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
        {/* Media Block */}
        <div className="bg-black w-full flex items-center justify-center min-h-[16rem] max-h-[60vh] overflow-hidden">
          {issue.mediaType === 'video' ? (
            <video src={issue.mediaURL} controls className="max-w-full max-h-[60vh] object-contain" />
          ) : (
            <img src={issue.mediaURL} alt={`Issue: ${issue.category}`} className="max-w-full max-h-[60vh] object-contain" />
          )}
        </div>
        
        <div className="p-5 sm:p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select 
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-full uppercase tracking-wider appearance-none cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-mint focus:border-transparent ${
                    issue.status === 'reported' ? 'bg-danger/10 text-danger' :
                    issue.status === 'in_progress' ? 'bg-warning/10 text-warning' :
                    issue.status === 'resolved' ? 'bg-success/10 text-success' :
                    'bg-page text-muted'
                  }`}
                  value={issue.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                >
                  <option value="reported" className="text-dark bg-page">Reported</option>
                  <option value="community_verified" className="text-dark bg-page">Verified</option>
                  <option value="in_progress" className="text-dark bg-page">In Progress</option>
                  <option value="resolved" className="text-dark bg-page">Resolved</option>
             </select>
             <span className="text-muted text-sm">Issue #{id?.substring(0, 8)}</span>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold text-dark mb-6">
            {issue.title || `${issue.category} Issue`}
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-page p-4 sm:p-6 rounded-2xl border border-border-subtle">
             <div className="flex items-start gap-3">
               <User className="w-5 h-5 text-muted mt-0.5" />
               <div>
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Reported By</p>
                  <div className="flex items-center gap-2">
                    {reporter?.photoURL ? (
                      <img src={reporter.photoURL} alt={reporter.name} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-border-subtle text-dark flex items-center justify-center text-xs font-bold">
                        {reporter?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <span className="font-medium text-dark">{reporter?.name || 'Loading...'}</span>
                  </div>
               </div>
             </div>

             <div className="flex items-start gap-3">
               <Clock className="w-5 h-5 text-muted mt-0.5" />
               <div>
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Date Reported</p>
                  <span className="font-medium text-dark">{dateString}</span>
               </div>
             </div>

             <div className="flex items-start gap-3 md:col-span-2">
               <MapPin className="w-5 h-5 text-muted mt-0.5" />
               <div>
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Location Coordinates</p>
                  <span className="font-medium text-dark">
                    {issue.geoPoint.lat.toFixed(6)}, {issue.geoPoint.lng.toFixed(6)}
                  </span>
               </div>
             </div>
          </div>
          
          <div className="mb-8 block">
            <h3 className="text-sm font-bold text-dark mb-2 uppercase tracking-wider">Description</h3>
            <p className="text-dark leading-relaxed whitespace-pre-wrap">
              {issue.description}
            </p>
          </div>

          {(() => {
            const severityTrace = issue.agentTrace?.find(t => t.agent.toLowerCase() === 'severity');
            if (issue.severityScore === undefined || issue.severityScore === null) {
              return (
                <div className="mb-8 p-6 rounded-2xl border border-border-subtle bg-page flex items-center justify-center gap-3">
                   <Loader2 className="w-5 h-5 animate-spin text-muted" />
                   <span className="text-sm font-medium text-muted italic">AI is assessing severity...</span>
                </div>
              );
            }

            let strokeColor = "var(--accent-mint)";
            let label = "Low";
            if (issue.severityScore >= 8) {
              strokeColor = "var(--accent-danger)";
              label = "High / Urgent";
            } else if (issue.severityScore >= 4) {
              strokeColor = "var(--accent-warning)";
              label = "Medium";
            }
            
            const reasoning = severityTrace?.reasoning || `Assessed as severity level ${issue.severityScore}/10 based on civic impact.`;
            const arcLength = 125.66;
            const progress = (issue.severityScore / 10) * arcLength;

            return (
              <div className="mb-8 p-6 rounded-2xl border border-border-subtle bg-card shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="flex flex-col items-center shrink-0 w-32 relative">
                  <svg viewBox="0 0 100 55" className="w-full">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" strokeWidth="12" stroke="var(--bg-dark-accent)" strokeLinecap="round" opacity="0.1"/>
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" strokeWidth="12" stroke={strokeColor} strokeLinecap="round" strokeDasharray={arcLength} strokeDashoffset={arcLength - progress} />
                  </svg>
                  <div className="absolute top-7 flex flex-col items-center">
                    <span className="text-3xl font-bold text-dark leading-none">{issue.severityScore}</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider mt-1 text-dark">
                    {label}
                  </span>
                </div>
                <div className="flex-1 text-center md:text-left mt-2 md:mt-0 flex flex-col justify-center">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">AI Severity Assessment</h3>
                  <p className="text-xl font-medium text-dark leading-snug">
                    {reasoning}
                  </p>
                </div>
              </div>
            );
          })()}

          {issue.agentTrace && issue.agentTrace.length > 0 && (
            <div className="mb-8 block">
              <h3 className="text-sm font-bold text-dark mb-6 uppercase tracking-wider">AI Agent Reasoning</h3>
              
              <div className="space-y-6 relative pl-3">
                {/* Vertical line connecting them */}
                <div className="absolute left-[31px] top-6 bottom-4 w-0.5 bg-border-subtle"></div>
                
                {issue.agentTrace.map((trace, index) => {
                  let Icon = CheckCircle;
                  let iconColor = "text-mint";
                  let iconBg = "bg-mint/20 border-mint";
                  
                  if (index % 2 === 1) {
                     iconColor = "text-lavender";
                     iconBg = "bg-lavender/20 border-lavender";
                  }

                  switch (trace.agent.toLowerCase()) {
                     case 'perception': Icon = Eye; break;
                     case 'deduplication': Icon = Search; break;
                     case 'severity': Icon = AlertTriangle; break;
                     case 'verification': Icon = CheckCircle; break;
                     case 'routing': Icon = ArrowRight; break;
                     case 'orchestrator': Icon = GitMerge; break;
                  }

                  return (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.15, duration: 0.4 }}
                      className="relative z-10 flex gap-5"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-card shadow-sm flex-shrink-0 ${iconBg}`}>
                         <Icon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      <div className="flex-1 bg-card border border-border-subtle shadow-sm rounded-2xl p-4 mt-0.5 hover:shadow-md transition-shadow">
                         <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-2 gap-1 sm:gap-4">
                           <span className="font-bold text-dark text-sm">{trace.agent} Agent</span>
                           <span className="text-xs text-muted font-medium whitespace-nowrap">{formatRelativeTime(trace.timestamp)}</span>
                         </div>
                         <p className="text-sm text-muted leading-relaxed font-medium">
                           {trace.reasoning}
                         </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {user && user.uid !== issue.reporterId && !hasVerified && (
            <div className="mb-8 block bg-page p-6 rounded-2xl border border-border-subtle">
               <h3 className="text-lg font-bold text-dark mb-2">Community Verification</h3>
               <p className="text-sm text-muted mb-4">Help the community by verifying if this issue still exists. You earn +5 points for verifying.</p>
               <div className="flex flex-col sm:flex-row gap-3">
                 <button
                   onClick={() => handleVerify('confirm')}
                   disabled={isVerifying}
                   className="flex items-center justify-center gap-2 bg-dark bg-gradient-to-b from-white/15 to-transparent text-white font-medium px-4 py-2.5 rounded-lg hover:brightness-110 transition flex-1 disabled:opacity-50"
                 >
                   {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                   Confirm this exists
                 </button>
                 <button
                   onClick={() => handleVerify('reject')}
                   disabled={isVerifying}
                   className="flex items-center justify-center gap-2 bg-card text-dark border border-border-subtle font-medium px-4 py-2.5 rounded-lg hover:bg-page transition flex-1 disabled:opacity-50"
                 >
                   {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 text-danger" />}
                   Mark as resolved/fake
                 </button>
               </div>
            </div>
          )}

          {user && user.uid !== issue.reporterId && hasVerified && (
            <div className="mb-8 block bg-success/10 p-4 rounded-2xl border border-success/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success" />
                 </div>
                 <div>
                   <h3 className="text-sm font-bold text-dark">You've verified this issue</h3>
                   <p className="text-xs text-muted">Thank you for contributing to the community!</p>
                 </div>
              </div>
              <span className="text-sm font-bold text-success">+5 pts</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}