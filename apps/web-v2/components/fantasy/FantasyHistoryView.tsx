'use client';

import React from 'react';
import { useFantasy } from '../../lib/fantasy/fantasyStore';
import { Trophy, History, ShieldCheck, CheckCircle2, ArrowUpRight, Coins } from 'lucide-react';
import Link from 'next/link';

export function FantasyHistoryView() {
  const { joinedContests, contests, matches, userTeams } = useFantasy();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-black dark:text-[#BFFF00]" />
            Fantasy Contest History
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your joined tournaments, final standings, and UVBE settlement status.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-[#BFFF00]/15 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30">
          {joinedContests.length} Total Entries
        </span>
      </div>

      <div className="space-y-3">
        {joinedContests.map((jc) => {
          const contest = contests.find((c) => c.id === jc.contestId);
          const match = matches.find((m) => m.id === jc.matchId);
          const userTeam = userTeams.find((t) => t.id === jc.userTeamId);

          return (
            <div
              key={jc.id}
              className="rounded-3xl border-2 border-black dark:border-white/15 bg-card p-4 sm:p-5 shadow-[3px_3px_0_rgba(0,0,0,0.85)] dark:shadow-none space-y-3"
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-xs">
                    {match?.teamA.flag || '🏏'}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-foreground">
                      {contest?.name || 'Tournament Contest'}
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      {match?.title} • Team: {userTeam?.teamName || 'Custom XI'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {jc.settled ? (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Settled
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      In Progress
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Rank</div>
                  <div className="text-sm sm:text-base font-black font-mono text-foreground">
                    #{jc.rank}
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Score</div>
                  <div className="text-sm sm:text-base font-black font-mono text-foreground">
                    {jc.points} pts
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    Entry Fee
                  </div>
                  <div className="text-sm sm:text-base font-black font-mono text-foreground">
                    {jc.entryFeePaidUVBE} UVBE
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    {jc.settled ? 'Won (Mock)' : 'Est. Payout'}
                  </div>
                  <div className="text-sm sm:text-base font-black font-mono text-[#5f8f00] dark:text-[#BFFF00]">
                    {jc.settled ? `+${jc.settledWinningsUVBE}` : `${jc.potentialWinningUVBE}`} UVBE
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {match && (
                  <Link
                    href={`/fantasy/match/${match.id}`}
                    className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    <span>Match Page</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
