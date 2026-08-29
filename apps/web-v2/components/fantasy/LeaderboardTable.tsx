'use client';

import React from 'react';
import { LeaderboardEntry } from '../../lib/fantasy/types';
import { mockLeaderboard } from '../../lib/fantasy/mockData';
import { Trophy, Medal, ArrowUp, ArrowDown, Minus, Crown } from 'lucide-react';

interface LeaderboardTableProps {
  entries?: LeaderboardEntry[];
  contestName?: string;
}

export function LeaderboardTable({
  entries = mockLeaderboard,
  contestName = 'Mega Grand League',
}: LeaderboardTableProps) {
  return (
    <div className="rounded-3xl border-2 border-black dark:border-white/15 bg-card p-4 sm:p-6 shadow-[4px_4px_0_#000] dark:shadow-none space-y-4">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-black/10 dark:border-white/10">
        <div>
          <h3 className="text-base font-black text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00]" />
            Live Contest Leaderboard
          </h3>
          <p className="text-xs text-muted-foreground">{contestName}</p>
        </div>

        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-black text-white dark:bg-white/10 border border-black dark:border-white/20">
          Rankings update live
        </span>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => {
          const isTop3 = entry.rank <= 3;

          return (
            <div
              key={entry.rank}
              className={`rounded-2xl border-2 p-3 sm:p-4 flex items-center justify-between gap-3 transition-all ${
                entry.isUser
                  ? 'border-black dark:border-[#BFFF00] bg-[#BFFF00]/15 dark:bg-[#BFFF00]/10 shadow-[3px_3px_0_#000]'
                  : isTop3
                    ? 'border-black/20 dark:border-white/20 bg-slate-50 dark:bg-black/30'
                    : 'border-black/10 dark:border-white/10 bg-card'
              }`}
            >
              {/* Rank & Movement Badge */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1 shrink-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black font-mono text-xs border ${
                      entry.rank === 1
                        ? 'bg-amber-400 text-black border-black shadow-[1px_1px_0_#000]'
                        : entry.rank === 2
                          ? 'bg-slate-300 text-black border-black'
                          : entry.rank === 3
                            ? 'bg-amber-600 text-white border-amber-700'
                            : 'bg-slate-100 dark:bg-white/10 text-muted-foreground border-black/10'
                    }`}
                  >
                    #{entry.rank}
                  </div>

                  {entry.movement === 'up' && (
                    <ArrowUp className="w-3 h-3 text-emerald-500 stroke-[3]" />
                  )}
                  {entry.movement === 'down' && (
                    <ArrowDown className="w-3 h-3 text-rose-500 stroke-[3]" />
                  )}
                  {entry.movement === 'same' && (
                    <Minus className="w-3 h-3 text-muted-foreground opacity-50" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-black text-foreground truncate">
                      {entry.teamName}
                    </span>
                    {entry.isUser && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-[#BFFF00] text-black border border-black">
                        YOU
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-muted-foreground truncate">
                    {entry.captainName} • {entry.viceCaptainName}
                  </div>
                </div>
              </div>

              {/* Points & Estimated Prize */}
              <div className="text-right shrink-0">
                <div className="text-sm sm:text-base font-black font-mono text-foreground">
                  {entry.points} pts
                </div>
                {entry.estimatedPrizeUVBE > 0 && (
                  <div className="text-[10px] font-black font-mono text-emerald-600 dark:text-emerald-400">
                    Est. Win: {entry.estimatedPrizeUVBE.toLocaleString('en-US')} UVBE
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
