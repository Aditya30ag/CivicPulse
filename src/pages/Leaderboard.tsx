import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Medal, User as UserIcon, Trophy, Zap, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';

interface LeaderboardUser {
  id: string;
  name: string;
  photoURL: string;
  points: number;
  trustScore: number;
}

const PODIUM_TONES = [
  { ring: 'ring-warning', badge: 'bg-warning', label: '1st' },
  { ring: 'ring-line-strong', badge: 'bg-subtle text-muted', label: '2nd' },
  { ring: 'ring-warning/60', badge: 'bg-warning-soft text-warning', label: '3rd' },
];

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
            trustScore: data.trustScore || 100,
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
              trustScore: data.trustScore || 100,
            });

            const rankQuery = query(collection(db, 'users'), where('points', '>', userPoints));
            const countSnapshot = await getCountFromServer(rankQuery);
            setCurrentUserRank(countSnapshot.data().count + 1);
          }
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
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
        <Spinner size={32} />
      </div>
    );
  }

  const podium = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <Badge tone="primary" className="mb-3">
          <Trophy className="w-3.5 h-3.5" /> Community
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">Community Leaderboard</h1>
        <p className="text-sm text-muted mt-2 max-w-md mx-auto">
          Points for accurate reports and verifying issues nearby — the map gets better because people trust each other's eyes.
        </p>

        {user && currentUserData && currentUserRank && (
          <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-line bg-card shadow-card px-6 py-4">
            {currentUserData.photoURL ? (
              <img src={currentUserData.photoURL} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/30" />
            ) : (
              <span className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-teal-brand text-white flex items-center justify-center">
                <UserIcon className="w-5 h-5" />
              </span>
            )}
            <div className="text-left">
              <p className="text-xs font-semibold text-faint">Your rank</p>
              <p className="text-lg font-extrabold text-ink leading-none">
                #{currentUserRank} <span className="text-sm font-semibold text-muted">· {currentUserData.points} pts</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {leaders.length === 0 ? (
        <div className="bg-card border border-line rounded-3xl shadow-card">
          <EmptyState
            icon={<Trophy className="w-6 h-6" />}
            title="No citizens on the leaderboard yet"
            description="Report issues and verify your neighbours' reports to earn points and climb the ranks."
          />
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-8 items-end max-w-2xl mx-auto">
            {[1, 0, 2].map((pos) => {
              const leader = podium[pos];
              if (!leader) return <div key={pos} />;
              const tone = PODIUM_TONES[pos];
              const tall = pos === 0;
              return (
                <motion.div
                  key={leader.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: pos * 0.1 }}
                  className="flex flex-col items-center text-center"
                >
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold text-white ${tone.badge} mb-2 shadow-card`}>
                    {pos + 1}
                  </span>
                  <span className={`relative rounded-full overflow-hidden ring-4 ${tone.ring} bg-subtle flex items-center justify-center text-muted`} style={{ width: tall ? 64 : 52, height: tall ? 64 : 52 }}>
                    {leader.photoURL ? (
                      <img src={leader.photoURL} alt={leader.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-6 h-6" />
                    )}
                  </span>
                  <p className="mt-2 text-sm font-bold text-ink truncate max-w-full px-1">{leader.name}</p>
                  <p className="text-xs font-extrabold text-primary tabular-nums">{leader.points} pts</p>
                </motion.div>
              );
            })}
          </div>

          {/* Table */}
          <div className="bg-card border border-line rounded-3xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[560px]">
                <thead>
                  <tr className="border-b border-line bg-subtle/60">
                    <th className="px-6 py-3.5 text-[0.6875rem] font-bold uppercase tracking-widest text-faint">Rank</th>
                    <th className="px-6 py-3.5 text-[0.6875rem] font-bold uppercase tracking-widest text-faint">Citizen</th>
                    <th className="px-6 py-3.5 text-right text-[0.6875rem] font-bold uppercase tracking-widest text-faint">Points</th>
                    <th className="px-6 py-3.5 w-56 text-[0.6875rem] font-bold uppercase tracking-widest text-faint">Trust score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rest.map((leader, index) => {
                    const isCurrentUser = user && user.uid === leader.id;
                    const rank = index + 4;
                    return (
                      <motion.tr
                        key={leader.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.04, 0.5) }}
                        className={isCurrentUser ? 'bg-primary/5' : 'hover:bg-subtle/50 transition-colors'}
                      >
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-subtle text-xs font-extrabold text-muted tabular-nums">
                            {rank}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-full bg-subtle overflow-hidden flex items-center justify-center text-faint shrink-0">
                              {leader.photoURL ? (
                                <img src={leader.photoURL} alt={leader.name} className="w-full h-full object-cover" />
                              ) : (
                                <UserIcon className="w-4 h-4" />
                              )}
                            </span>
                            <span className="text-sm font-semibold text-ink">
                              {leader.name}
                              {isCurrentUser && (
                                <Badge tone="primary" className="ml-2">
                                  You
                                </Badge>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-ink tabular-nums">
                            <Zap className="w-3.5 h-3.5 text-warning" />
                            {leader.points}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-2 rounded-full bg-subtle overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(100, Math.max(0, leader.trustScore))}%`, background: 'var(--success)' }}
                              />
                            </div>
                            <span className="text-xs font-bold text-muted tabular-nums w-9 text-right">
                              <ShieldCheck className="w-3.5 h-3.5 inline text-success mr-0.5" />
                              {leader.trustScore}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rest.length === 0 && (
              <div className="px-6 py-6 text-center text-sm text-muted flex items-center justify-center gap-2">
                <Medal className="w-4 h-4" /> More citizens joining soon — keep reporting!
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
