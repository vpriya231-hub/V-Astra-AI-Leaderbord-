import React from 'react';
import { Trophy, Medal, Users, Calendar, Info, Sparkles, Clock } from 'lucide-react';
import { LeaderboardUser } from '../types';
import { getCurrentISTMonthName, getCurrentISTMonthKey } from '../lib/referral';

interface LeaderboardProps {
  users: LeaderboardUser[];
  currentUserId?: string | null;
  loading: boolean;
  selectedMonthKey?: string;
  onMonthChange?: (monthKey: string) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ 
  users, 
  currentUserId, 
  loading,
  selectedMonthKey
}) => {
  const currentISTKey = getCurrentISTMonthKey();
  const activeMonthKey = selectedMonthKey || currentISTKey;
  const currentMonthTitle = getCurrentISTMonthName(activeMonthKey);
  const isCurrentMonth = activeMonthKey === currentISTKey;

  const formatRankNumber = (rank: number) => {
    return rank < 10 ? `0${rank}` : `${rank}`;
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'font-black text-amber-500 text-base';
      case 2:
        return 'font-black text-slate-500 text-base';
      case 3:
        return 'font-black text-amber-700 text-base';
      default:
        return 'font-bold text-slate-400 text-sm';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xs flex flex-col overflow-hidden">
      {/* Bento Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 id="leaderboard-month-title" className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {currentMonthTitle} Leaderboard
            </h2>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-200/60 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{isCurrentMonth ? 'Active Month' : 'Archive'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>Rankings based strictly on points earned in <strong>{currentMonthTitle}</strong></span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-[11px]">
              <Clock className="h-3 w-3 text-slate-500" />
              <span>Resets on 1st of month (IST)</span>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50/70 px-3 py-1.5 rounded-xl border border-indigo-100 font-medium shrink-0">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>Live Firestore Sync</span>
        </div>
      </div>

      {/* Prominent Notice: Fun Community Leaderboard with No Monetary Rewards */}
      <div 
        id="leaderboard-disclaimer-banner" 
        className="mx-6 mt-4 p-3 bg-amber-50/90 rounded-2xl border border-amber-200/70 text-xs text-amber-950 font-medium flex items-center gap-2.5"
      >
        <Info className="h-4 w-4 text-amber-600 shrink-0" />
        <span>
          <strong>Notice:</strong> This is a fun community leaderboard with no monetary rewards.
        </span>
      </div>

      {/* Leaderboard Table Content */}
      <div className="flex-grow px-6 py-2">
        {loading ? (
          /* Loading Skeletons */
          <div className="space-y-4 py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b border-slate-50 animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="h-5 w-6 rounded bg-slate-200" />
                  <div className="h-4 w-36 rounded bg-slate-200" />
                </div>
                <div className="h-4 w-16 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          /* Real Empty State for new month reset */
          <div
            id="empty-leaderboard-state"
            className="flex flex-col items-center justify-center py-14 px-4 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3 border border-indigo-100">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No referral points in {currentMonthTitle} yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
              Points reset on the 1st of every month at 00:00 IST. Share your unique code with friends to claim the #01 spot for {currentMonthTitle}!
            </p>
          </div>
        ) : (
          /* Bento Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-100">
                  <th className="pb-3.5 pt-3 w-14">Rank</th>
                  <th className="pb-3.5 pt-3">Community Member</th>
                  <th className="pb-3.5 pt-3 text-right">{currentMonthTitle.split(' ')[0]} Pts</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.slice(0, 100).map((u, index) => {
                  const rank = index + 1;
                  // Strictly compare currently logged-in user UID with the row's ID
                  const isCurrentUser = Boolean(
                    currentUserId && 
                    u.id && 
                    String(currentUserId).trim() === String(u.id).trim()
                  );

                  return (
                    <tr
                      key={u.id || `rank-${rank}`}
                      id={`leaderboard-row-${rank}`}
                      className={`border-b border-slate-100 transition-colors ${
                        isCurrentUser 
                          ? 'bg-indigo-50/80 font-semibold border-indigo-200 ring-1 ring-inset ring-indigo-300/60' 
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Rank Number */}
                      <td className={`py-3.5 ${getRankStyle(rank)} font-mono`}>
                        {formatRankNumber(rank)}
                      </td>

                      {/* User Display */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.name}
                              className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs ring-1 ring-slate-200 shrink-0">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900 truncate max-w-[170px] sm:max-w-[240px]">
                                {u.name || 'Anonymous User'}
                              </span>
                              {isCurrentUser && (
                                <span 
                                  id="leaderboard-you-badge"
                                  className="inline-flex items-center rounded-md bg-indigo-600 text-white px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide shadow-2xs"
                                >
                                  You
                                </span>
                              )}
                            </div>
                            {u.referralCode && (
                              <span className="text-[10px] font-mono text-slate-400 block">
                                Code: {u.referralCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Referral Points for the current month */}
                      <td className="py-3.5 text-right font-mono font-black text-indigo-600 text-base">
                        {(u.points || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400 font-sans">pts</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bento Footer */}
      <div className="p-4 bg-slate-50 text-center border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
        <span>Automatic monthly reset based on Indian Standard Time (IST).</span>
        <span className="font-medium text-indigo-600">Top 100 Live Monthly Board</span>
      </div>
    </div>
  );
};
