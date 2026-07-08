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
  createdAt: any;
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
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
        {/* Back Button */}
        <div className="mb-6">
        <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-dark transition-colors"
        >
            <ArrowLeft className="w-4 h-4" />
            Back to Queue
        </Link>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-dark bg-gradient-to-b from-white/15 to-transparent flex items-center justify-center shadow-sm">
                <LayoutList className="w-5 h-5 text-white" strokeWidth={2.25} />
            </div>

            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-dark tracking-tight">
                    Reports
                </h1>

                <p className="text-muted mt-0.5 font-medium text-sm">
                    Civic Pulse Admin • All Reports
                </p>
            </div>
        </div>

        {/* Placeholder */}
        {!loading && reports.length === 0 ? (
            <div className="text-center py-12 text-muted">
                No reports found.
            </div>
            ) : (
            <div className="space-y-5">

                {reports.map((report) => (

                    <div
                        key={report.id}
                        className="bg-white border border-border-subtle rounded-2xl shadow-sm p-5"
                    >
                        <div className="flex justify-between items-start gap-4">

                            <div className="flex-1">

                                <h2 className="text-lg font-bold text-dark">
                                    {report.title}
                                </h2>

                                <p className="text-sm text-muted mt-1">
                                    {report.category}
                                </p>

                                <p className="mt-3 text-sm text-gray-600">
                                    {report.description}
                                </p>

                                <p className="mt-4 text-xs text-muted">
                                    {report.createdAt?.toDate
                                    ? report.createdAt.toDate().toLocaleString()
                                    : ""}
                                </p>

                            </div>

                            <div className="flex flex-col items-end gap-3">

                                <select
                                    value={report.status}
                                    onChange={(e) => handleUpdateStatus(report.id, e.target.value)}
                                    className={`appearance-none cursor-pointer rounded-full px-4 py-2 pr-3 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-mint ${
                                        report.status === "reported"
                                        ? "bg-danger/10 text-danger"
                                        : report.status === "community_verified"
                                        ? "bg-page text-muted"
                                        : report.status === "in_progress"
                                        ? "bg-warning/10 text-warning"
                                        : "bg-success/10 text-success"
                                    }`}
                                >
                                    <option value="reported" className="text-dark bg-page">Reported</option>
                                    <option value="community_verified" className="text-dark bg-page" >Verified</option>
                                    <option value="in_progress" className="text-dark bg-page">In Progress</option>
                                    <option value="resolved" className="text-dark bg-page">Resolved</option>
                                </select>

                                <Link
                                    to={`/issue/${report.id}`}
                                    className="text-sm font-semibold text-primary hover:underline"
                                >
                                    View Report →
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
        


        {hasMore && (
            <div className="flex justify-center mt-8">

                <button
                onClick={() => loadReports(true)}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-dark text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                    {loading ? (<Loader2 className="w-5 h-5 animate-spin" />) : ("Load More")}
                </button>
            </div>
        )}
    </div>
  );
}
