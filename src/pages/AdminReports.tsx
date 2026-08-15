import { Loader2, LayoutList, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from "react";
import {collection,query,orderBy,limit,getDocs,startAfter,updateDoc,doc,QueryDocumentSnapshot,DocumentData} from 'firebase/firestore';
import { db } from '../firebase';

interface Report {
  id: string;
  title?: string;
  category: string;
  description: string;
  status: string;
  severityScore?: number;
  createdAt: any;
}

function statusChipClass(status: string) {
  switch (status) {
    case 'reported':           return 'status-chip status-chip--open';
    case 'in_progress':        return 'status-chip status-chip--progress';
    case 'community_verified': return 'status-chip status-chip--verified';
    case 'resolved':           return 'status-chip status-chip--resolved';
    default:                   return 'status-chip';
  }
}

export default function AdminReports() {

    const PAGE_SIZE = 10;

    const [reports, setReports] = useState<Report[]>([]);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);

    const loadReports = async (loadMore = false) => {
        if (!db) return;

        try {
            setLoading(true);

            let reportsQuery;

            if (loadMore && lastDoc) {
            reportsQuery = query(
                collection(db, "reports"),
                orderBy("createdAt", "desc"),
                startAfter(lastDoc),
                limit(PAGE_SIZE)
            );
            } else {
            reportsQuery = query(
                collection(db, "reports"),
                orderBy("createdAt", "desc"),
                limit(PAGE_SIZE)
            );
            }

            const snapshot = await getDocs(reportsQuery);

            const data: Report[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as any)
            }));

            if (loadMore) {
                setReports(prev => [...prev, ...data]);
            } else {
                setReports(data);
            }

            if (snapshot.docs.length > 0) {
                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            }

            setHasMore(snapshot.docs.length === PAGE_SIZE);

        } catch (error) {
            console.error("Failed to load reports:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const handleUpdateStatus = async (reportId: string, newStatus: string) => {
        try {
            const updateData: any = {
                status: newStatus
            };

            if (newStatus === "resolved") {
                updateData.resolvedAt = new Date().toISOString();
            }

            await updateDoc(doc(db!, "reports", reportId), updateData);
         
            // Update UI immediately
            setReports((prev) =>
            prev.map((report) =>
                report.id === reportId
                ? { ...report, status: newStatus }
                : report
            ));

        } catch (error) {
            console.error(error);
        }
    };

    if (loading && reports.length === 0) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hazard)' }} />
            </div>
        );
    }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold no-underline transition-colors"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--hazard)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Queue
          </Link>
        </div>

        {/* Header — blueprint grid dark */}
        <div
          className="flex items-center gap-3 mb-8 p-4 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8"
          style={{
            background: 'var(--ink)',
            backgroundImage: 'linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            borderBottom: '1px solid var(--grid)',
          }}
        >
            <div
              className="w-10 h-10 flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(242,183,5,0.12)',
                border: '1px solid rgba(242,183,5,0.3)',
                borderRadius: '3px',
              }}
            >
                <LayoutList className="w-5 h-5" style={{ color: 'var(--hazard)' }} strokeWidth={2.25} />
            </div>

            <div>
                <h1
                  className="uppercase tracking-tight"
                  style={{
                    fontFamily: "'Big Shoulders Display', sans-serif",
                    fontWeight: 900,
                    fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
                    lineHeight: 1,
                    color: 'white',
                  }}
                >
                    Reports
                </h1>
                <p
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.6875rem',
                    color: 'rgba(238,241,236,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                    CIVIC PULSE ADMIN · ALL REPORTS
                </p>
            </div>
        </div>

        {/* Empty state */}
        {!loading && reports.length === 0 ? (
            <div
              className="text-center py-12"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}
            >
                No reports found.
            </div>
            ) : (
            <div className="space-y-4">

                {reports.map((report) => {
                  const sev = report.severityScore ?? 5;
                  const sevColor = sev >= 7 ? 'var(--signal)' : sev >= 4 ? 'var(--hazard)' : 'var(--verified)';
                  const sevLabel = sev >= 7 ? 'HIGH' : sev >= 4 ? 'MED' : 'LOW';

                  return (
                    /* Asset-tag card layout */
                    <div key={report.id} className="asset-tag">
                      {/* Severity stub */}
                      <div className="asset-tag__stub">
                        <span
                          className={`asset-tag__score ${sev >= 7 ? 'asset-tag__score--high' : sev >= 4 ? 'asset-tag__score--medium' : 'asset-tag__score--low'}`}
                        >
                          {sev}
                        </span>
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '0.5rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: sevColor,
                            fontWeight: 500,
                          }}
                        >
                          {sevLabel}
                        </span>
                      </div>

                      {/* Card body */}
                      <div className="asset-tag__body">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h2
                              className="text-base font-semibold"
                              style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ink)' }}
                            >
                              {report.title || report.category}
                            </h2>
                            <p
                              className="text-sm mt-0.5"
                              style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)', fontSize: '0.75rem' }}
                            >
                              {report.category}
                            </p>
                            <p
                              className="mt-2 text-sm line-clamp-2"
                              style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}
                            >
                              {report.description}
                            </p>
                            <p
                              className="mt-3 text-xs"
                              style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-secondary)' }}
                            >
                              {report.createdAt?.toDate
                              ? report.createdAt.toDate().toLocaleString()
                              : ""}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-3 shrink-0">
                            <select
                              value={report.status}
                              onChange={(e) => handleUpdateStatus(report.id, e.target.value)}
                              className={statusChipClass(report.status)}
                              style={{ cursor: 'pointer', background: 'inherit' }}
                            >
                              <option value="reported">Reported</option>
                              <option value="community_verified">Verified</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                            </select>

                            <Link
                              to={`/issue/${report.id}`}
                              className="text-sm font-semibold no-underline transition-colors"
                              style={{
                                fontFamily: "'IBM Plex Sans', sans-serif",
                                color: 'var(--ink)',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--hazard)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink)')}
                            >
                              View Report →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
        )}

        {hasMore && (
            <div className="flex justify-center mt-8">
                <button
                  onClick={() => loadReports(true)}
                  disabled={loading}
                  className="btn-primary"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load More"}
                </button>
            </div>
        )}
    </div>
  );
}
