import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Medal, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface LeaderboardUser {
  id: string;
  name: string;
  photoURL: string;
  points: number;
  trustScore: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState<LeaderboardUser | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        const topUsers: LeaderboardUser[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          topUsers.push({
            id: doc.id,
            name: data.name || 'Anonymous',
            photoURL: data.photoURL || '',
            points: data.points || 0,
            trustScore: data.trustScore || 100
          });
        });
        setLeaders(topUsers);

        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          let userPoints = 0;
          if (userDoc.exists()) {
            const data = userDoc.data();
            userPoints = data.points || 0;
            setCurrentUserData({
              id: user.uid,
              name: data.name || user.displayName || 'Anonymous',
              photoURL: data.photoURL || user.photoURL || '',
              points: userPoints,
              trustScore: data.trustScore || 100
            });
            
            const rankQuery = query(collection(db, 'users'), where('points', '>', userPoints));
            const countSnapshot = await getCountFromServer(rankQuery);
            setCurrentUserRank(countSnapshot.data().count + 1);
          }
        }
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    if (db) {
      fetchLeaderboard();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hazard)' }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div
        className="overflow-hidden mb-8"
        style={{
          background: '#fff',
          border: '1px solid var(--paper-dim)',
          borderRadius: '3px',
          boxShadow: '0 2px 10px rgba(22,40,61,0.07)',
        }}
      >
        {/* Header — blueprint grid dark */}
        <div
          className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 bp-grid"
          style={{ borderBottom: '1px solid var(--grid)' }}
        >
          <div>
            <h1
              className="uppercase flex items-center gap-3"
              style={{
                fontFamily: "'Big Shoulders Display', sans-serif",
                fontWeight: 900,
                fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
                color: 'white',
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}
            >
              <Medal className="w-7 h-7 shrink-0" style={{ color: 'var(--hazard)' }} />
              Community Leaderboard
            </h1>
            <p
              className="mt-2"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                color: 'rgba(238,241,236,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Top contributors making the neighborhood better
            </p>
          </div>
          
          {user && currentUserData && currentUserRank && (
            <div
              className="text-center min-w-[180px] p-4"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--grid)',
                borderRadius: '3px',
              }}
            >
              <p
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.625rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'rgba(238,241,236,0.5)',
                  marginBottom: '4px',
                }}
              >
                Your Rank
              </p>
              <div
                className="flex items-center justify-center gap-1"
              >
                <span
                  style={{
                    fontFamily: "'Big Shoulders Display', sans-serif",
                    fontWeight: 900,
                    fontSize: '2.5rem',
                    color: 'white',
                    lineHeight: 1,
                  }}
                >
                  #{currentUserRank}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.625rem',
                  color: 'var(--hazard)',
                  marginTop: '4px',
                }}
              >
                {currentUserData.points} pts
              </p>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--paper-dim)' }}>
                <th
                  className="px-5 py-3"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.625rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Rank
                </th>
                <th
                  className="px-5 py-3"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.625rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Citizen
                </th>
                <th
                  className="px-5 py-3 text-right"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.625rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Points
                </th>
                <th
                  className="px-5 py-3 w-48"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.625rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Trust Score
                </th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((leader, index) => {
                const isCurrentUser = user && user.uid === leader.id;
                const isTop3 = index < 3;
                return (
                  <motion.tr 
                    key={leader.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    style={{
                      borderBottom: '1px solid var(--paper-dim)',
                      background: isCurrentUser ? 'rgba(242,183,5,0.04)' : 'transparent',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--paper)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = isCurrentUser ? 'rgba(242,183,5,0.04)' : 'transparent')}
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {isTop3 ? (
                          <span
                            className="w-8 h-8 flex items-center justify-center font-bold text-sm"
                            style={{
                              fontFamily: "'Big Shoulders Display', sans-serif",
                              fontWeight: 900,
                              background: 'var(--hazard)',
                              color: 'var(--ink)',
                              borderRadius: '3px',
                            }}
                          >
                            {index + 1}
                          </span>
                        ) : (
                          <span
                            className="w-8 h-8 flex items-center justify-center font-bold text-sm"
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {index + 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full overflow-hidden"
                          style={{
                            background: 'var(--paper)',
                            border: '2px solid var(--paper-dim)',
                          }}
                        >
                          {leader.photoURL ? (
                            <img src={leader.photoURL} alt={leader.name} className="w-full h-full object-cover" />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              <UserIcon className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                           <p
                            className="text-sm font-semibold flex items-center gap-2"
                            style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ink)' }}
                           >
                             {leader.name}
                             {isCurrentUser && (
                               <span
                                style={{
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  fontSize: '0.5625rem',
                                  fontWeight: 500,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.07em',
                                  background: 'var(--hazard)',
                                  color: 'var(--ink)',
                                  padding: '1px 5px',
                                  borderRadius: '2px',
                                }}
                               >
                                YOU
                               </span>
                             )}
                           </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <span
                        style={{
                          fontFamily: "'Big Shoulders Display', sans-serif",
                          fontWeight: 700,
                          fontSize: '1.125rem',
                          color: 'var(--ink)',
                        }}
                      >
                        {leader.points}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                       <div
                        className="w-full h-2 overflow-hidden"
                        style={{ background: 'var(--paper)', borderRadius: '1px' }}
                       >
                         <div 
                           className="h-2 transition-all duration-700"
                           style={{
                             width: `${Math.min(100, Math.max(0, leader.trustScore))}%`,
                             background: 'var(--verified)',
                             borderRadius: '1px',
                           }}
                           title={`${leader.trustScore}%`}
                         />
                       </div>
                    </td>
                  </motion.tr>
                );
              })}
              {leaders.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--text-secondary)' }}
                  >
                    No citizens found on the leaderboard yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
