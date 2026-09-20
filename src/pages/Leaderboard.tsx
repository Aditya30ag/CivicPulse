import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Zap, ShieldCheck, Award, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import Spinner from '../components/ui/Spinner';
import { MOCK_LEADERS, MockLeader } from '../lib/dummyData';

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<MockLeader[]>(MOCK_LEADERS);
  const [loading, setLoading] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<MockLeader | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(4);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!db) return;
      try {
        const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(20));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs.length > 0) {
          const topUsers: MockLeader[] = [];
          querySnapshot.forEach((d) => {
            const data = d.data();
            topUsers.push({
              id: d.id,
              name: data.name || 'Anonymous Citizen',
              photoURL: data.photoURL || '',
              points: data.points || 0,
              trustScore: data.trustScore || 95,
              ward: data.ward || 'Central Ward',
              badge: data.badge || 'VERIFIED CITIZEN',
              reportsCount: data.reportsCount || 1,
              verificationsCount: data.verificationsCount || 1,
            });
          });
          setLeaders(topUsers);
        }

        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const userPoints = data.points || 0;
            setCurrentUserData({
              id: user.uid,
              name: data.name || user.displayName || 'Citizen',
              photoURL: data.photoURL || user.photoURL || '',
              points: userPoints,
              trustScore: data.trustScore || 100,
              ward: 'Ward 07 · Metro Hub',
              badge: 'ACTIVE CONTRIBUTOR',
              reportsCount: 3,
              verificationsCount: 8,
            });

            const rankQuery = query(collection(db, 'users'), where('points', '>', userPoints));
            const countSnapshot = await getCountFromServer(rankQuery);
            setCurrentUserRank(countSnapshot.data().count + 1);
          }
        }
      } catch (err) {
        console.warn('Leaderboard live query note, using mock standings:', err);
      }
    };

    fetchLeaderboard();
  }, [user]);

  const podium = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="min-h-full bg-[#0A0A0A] text-[#F5F5F5] font-sans pb-16">
      {/* ── Top Header Banner ── */}
      <div className="border-b border-[#222222] bg-[#111111]/90 backdrop-blur-md py-6">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-mono tracking-[0.08em] uppercase text-[#888888] px-2 py-0.5 border border-[#222222] bg-[#0A0A0A] rounded-[2px]">
                  © CIVIC TRUST & IMPACT STANDINGS
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#22C55E]">
                  <span className="live-dot" /> VERIFIED REAL-TIME
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-[-0.02em] text-[#F5F5F5] leading-tight">
                Citizen Trust & Resolution Ranks.
              </h1>
              <p className="text-xs font-mono text-[#888888] mt-1 max-w-xl">
                Points awarded for high-accuracy defect reporting, photo audit verification, and closing the municipal response loop.
              </p>
            </div>

            {/* Current User Standings Card */}
            {user && (
              <div className="editorial-card px-4 py-3 bg-[#161616] border border-[#333333] flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-[2px] bg-[#2563EB] text-white font-mono text-xs font-bold flex items-center justify-center">
                  #{currentUserRank || 4}
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-[#888888]">YOUR CITY RANK</p>
                  <p className="text-xs font-bold text-[#F5F5F5]">
                    {currentUserData?.points || 840} <span className="text-[#2563EB] font-mono font-normal">PTS</span> · 98% TRUST
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 flex flex-col gap-10">
        {/* ── Podium Top 3 ── */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#555555] block mb-4">
            TOP CIVIC CHAMPIONS
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 0, 2].map((posIndex) => {
              const leader = podium[posIndex];
              if (!leader) return null;
              const isFirst = posIndex === 0;
              const rank = posIndex + 1;
              const rankColor =
                rank === 1 ? '#F59E0B' : rank === 2 ? '#94A3B8' : '#D97706';

              return (
                <div
                  key={leader.id}
                  className={`editorial-card p-6 flex flex-col justify-between relative ${
                    isFirst ? 'md:-translate-y-2 border-[#F59E0B]/50 bg-[#161616]' : 'bg-[#111111]'
                  }`}
                  style={{
                    borderTop: `3px solid ${rankColor}`,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className="font-mono text-xs font-bold px-2 py-0.5 rounded-[2px]"
                        style={{
                          color: rankColor,
                          backgroundColor: `${rankColor}15`,
                          border: `1px solid ${rankColor}40`,
                        }}
                      >
                        RANK #{rank}
                      </span>
                      <span className="text-[10px] font-mono text-[#555555]">
                        {leader.ward}
                      </span>
                    </div>

                    <div className="flex items-center gap-3.5 mb-4">
                      <img
                        src={leader.photoURL}
                        alt={leader.name}
                        className="w-12 h-12 rounded-[2px] object-cover border border-[#222222]"
                      />
                      <div>
                        <h3 className="text-base font-bold text-[#F5F5F5] leading-snug">{leader.name}</h3>
                        <p className="text-[10px] font-mono text-[#2563EB] tracking-wide mt-0.5">{leader.badge}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#222222] grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <p className="text-[10px] text-[#555555] uppercase">Total Points</p>
                      <p className="text-lg font-bold text-[#F5F5F5] mt-0.5 tabular-nums">
                        {leader.points}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555555] uppercase">Trust Score</p>
                      <p className="text-lg font-bold text-[#22C55E] mt-0.5 tabular-nums flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> {leader.trustScore}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Standings Table ── */}
        <div className="editorial-card p-0 overflow-hidden bg-[#111111]">
          <div className="px-6 py-4 border-b border-[#222222] bg-[#161616] flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold text-[#F5F5F5] uppercase tracking-wider">
              Metropolitan Citizen Standings
            </h2>
            <span className="text-[10px] font-mono text-[#888888]">
              SHOWING TOP {leaders.length} CITIZENS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[620px] font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] bg-[#0E0E0E] text-[10px] uppercase text-[#555555]">
                  <th className="px-6 py-3 w-16">Rank</th>
                  <th className="px-6 py-3">Citizen & Ward</th>
                  <th className="px-6 py-3">Audit Role</th>
                  <th className="px-6 py-3 text-right">Reports / Audits</th>
                  <th className="px-6 py-3 text-right">Points</th>
                  <th className="px-6 py-3 text-right w-36">Trust Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {rest.map((leader, idx) => {
                  const rank = idx + 4;
                  return (
                    <tr
                      key={leader.id}
                      className="hover:bg-[#161616] transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-[#888888]">
                        #{rank.toString().padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={leader.photoURL}
                            alt=""
                            className="w-8 h-8 rounded-[2px] object-cover border border-[#222222]"
                          />
                          <div>
                            <p className="font-sans text-sm font-semibold text-[#F5F5F5] leading-snug">{leader.name}</p>
                            <p className="text-[10px] text-[#555555]">{leader.ward}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] text-[#2563EB] px-2 py-0.5 bg-[#2563EB]/10 border border-[#2563EB]/30 rounded-[2px]">
                          {leader.badge}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-[#888888] tabular-nums">
                        {leader.reportsCount} rep · {leader.verificationsCount} ver
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-[#F5F5F5] tabular-nums text-sm">
                        {leader.points}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1 font-bold text-[#22C55E] tabular-nums">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {leader.trustScore}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
