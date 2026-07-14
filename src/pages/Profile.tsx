import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, Clock, Loader2 } from 'lucide-react';

function statusChipClass(status: string) {
  switch (status) {
    case 'reported':           return 'status-chip status-chip--open';
    case 'in_progress':        return 'status-chip status-chip--progress';
    case 'community_verified': return 'status-chip status-chip--verified';
    case 'resolved':           return 'status-chip status-chip--resolved';
    default:                   return 'status-chip';
  }
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) return;

    const q = query(
      collection(db, 'reports'),
      where('reporterId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in JS instead of Firestore to avoid requiring a composite index immediately
      data.sort((a: any, b: any) => {
         const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
         const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
         return tB - tA;
      });
      setReports(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user reports:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Profile card */}
      <div
        className="overflow-hidden mb-5 mt-4"
        style={{
          background: '#fff',
          border: '1px solid var(--paper-dim)',
          borderRadius: '3px',
          boxShadow: '0 2px 8px rgba(22,40,61,0.07)',
        }}
      >
        {/* Banner — blueprint grid */}
        <div
          className="h-24 bp-grid"
          style={{ borderBottom: '1px solid var(--grid)' }}
        />

        {/* Avatar + name */}
        <div className="px-6 flex flex-col items-center -mt-12 mb-6">
          <div
            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              background: 'var(--paper)',
              border: '4px solid var(--hazard)',
              boxShadow: '0 4px 14px rgba(22,40,61,0.14)',
              color: 'var(--text-secondary)',
              fontSize: '2.5rem',
            }}
          >
             {user?.photoURL ? (
               <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
                 <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
               </svg>
             )}
          </div>
          <h1
            className="uppercase mt-3"
            style={{
              fontFamily: "'Big Shoulders Display', sans-serif",
              fontWeight: 900,
              fontSize: '1.75rem',
              color: 'var(--ink)',
              lineHeight: 1,
            }}
          >
            {user?.displayName || 'My Profile'}
          </h1>
          <p
            className="mt-1"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            {user?.email}
          </p>
        </div>
      </div>

      {/* My Reports section */}
      <div
        className="p-5 mb-5"
        style={{
          background: '#fff',
          border: '1px solid var(--paper-dim)',
          borderRadius: '3px',
        }}
      >
        <h2
          className="mb-4 uppercase"
          style={{
            fontFamily: "'Big Shoulders Display', sans-serif",
            fontWeight: 700,
            fontSize: '1.125rem',
            color: 'var(--ink)',
            letterSpacing: '0.04em',
          }}
        >
          My Reports
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hazard)' }} />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8">
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}>
              You haven't reported any issues yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report) => (
              <Link
                key={report.id}
                to={`/issue/${report.id}`}
                className="flex flex-col sm:flex-row gap-3 no-underline transition-all"
                style={{
                  border: '1px solid var(--paper-dim)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  background: '#fff',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--hazard)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(22,40,61,0.08)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--paper-dim)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Thumbnail */}
                <div
                  className="w-full sm:w-24 h-24 bg-paper overflow-hidden flex-shrink-0"
                  style={{ background: 'var(--paper)' }}
                >
                  {report.mediaType === 'video' ? (
                     <video src={report.mediaURL} className="w-full h-full object-cover" />
                  ) : (
                     <img src={report.mediaURL} className="w-full h-full object-cover" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-3">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <h3
                      className="font-semibold"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ink)' }}
                    >
                      {report.category}
                    </h3>
                    <span className={statusChipClass(report.status)}>
                       {report.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p
                    className="text-sm line-clamp-2 mb-2"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}
                  >
                    {report.description}
                  </p>
                  <div
                    className="flex items-center gap-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--text-secondary)' }}
                  >
                    <Clock className="w-3 h-3" />
                    <span>
                      {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sign out */}
      <div className="flex justify-center">
        <button 
          onClick={handleSignOut}
          className="btn-secondary"
          style={{ borderColor: 'rgba(214,72,61,0.35)', color: 'var(--signal)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--signal)';
            (e.currentTarget as HTMLElement).style.color = 'var(--signal)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(214,72,61,0.05)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(214,72,61,0.35)';
            (e.currentTarget as HTMLElement).style.color = 'var(--signal)';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
