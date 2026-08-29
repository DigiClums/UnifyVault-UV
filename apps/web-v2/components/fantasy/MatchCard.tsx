'use client';

import React from 'react';
import Link from 'next/link';
import { Match } from '../../lib/fantasy/types';
import { Trophy, Clock, Zap, Users, ArrowRight } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  featured?: boolean;
}

export function MatchCard({ match, featured = false }: MatchCardProps) {
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';
  const isUpcoming = match.status === 'upcoming';

  const formatMatchTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '7:30 PM';
    }
  };

  return (
    <div
      className={`rounded-3xl border-2 border-black dark:border-white/15 bg-card p-4 sm:p-5 transition-all relative overflow-hidden flex flex-col justify-between ${
        featured
          ? 'shadow-[4px_4px_0_#000] dark:shadow-none bg-gradient-to-br from-card to-slate-50 dark:to-black/40 border-black dark:border-[#BFFF00]/40'
          : 'shadow-[3px_3px_0_rgba(0,0,0,0.85)] dark:shadow-none hover:border-[#BFFF00]/50'
      }`}
    >
      {/* Status & Format Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            {isLive && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                Live Match
              </span>
            )}
            {isCompleted && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-white/10 text-muted-foreground border border-black/10 dark:border-white/10">
                Completed
              </span>
            )}
            {isUpcoming && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#BFFF00]/15 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30">
                <Clock className="w-3 h-3" />
                Upcoming
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/5 text-muted-foreground border border-black/10 dark:border-white/10">
              {match.format}
            </span>
          </div>

          <div className="text-[11px] font-bold text-muted-foreground truncate max-w-[140px] text-right">
            {match.series}
          </div>
        </div>

        {/* Teams Head-to-Head Section */}
        <div className="py-2 px-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/5 dark:border-white/5 mb-3">
          <div className="flex items-center justify-between">
            {/* Team A */}
            <div className="flex items-center gap-2.5">
              <div className="text-2xl sm:text-3xl filter drop-shadow-sm">{match.teamA.flag}</div>
              <div>
                <div className="text-sm sm:text-base font-black text-foreground">
                  {match.teamA.code}
                </div>
                <div className="text-[10px] text-muted-foreground font-semibold">
                  {match.teamA.name}
                </div>
              </div>
            </div>

            {/* VS or Live Scores */}
            <div className="text-center px-2">
              {isLive && match.liveScore ? (
                <div>
                  <div className="text-xs sm:text-sm font-black font-mono text-foreground">
                    {match.liveScore.battingScore.runs}/{match.liveScore.battingScore.wickets}
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground">
                    {match.liveScore.battingScore.overs} ov
                  </div>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-muted-foreground border border-black/10 dark:border-white/10">
                  VS
                </div>
              )}
            </div>

            {/* Team B */}
            <div className="flex items-center gap-2.5 flex-row-reverse text-right">
              <div className="text-2xl sm:text-3xl filter drop-shadow-sm">{match.teamB.flag}</div>
              <div>
                <div className="text-sm sm:text-base font-black text-foreground">
                  {match.teamB.code}
                </div>
                <div className="text-[10px] text-muted-foreground font-semibold">
                  {match.teamB.name}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="truncate max-w-[180px]">{match.venue}</span>
            <span className="font-mono font-bold text-foreground">
              {isLive ? 'In Progress' : formatMatchTime(match.startTime)}
            </span>
          </div>
        </div>

        {/* Prize Pool & Contests meta */}
        <div className="flex items-center justify-between text-xs mb-4 px-1">
          <div className="flex items-center gap-1.5 text-foreground font-bold">
            <Trophy className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span className="text-muted-foreground">Prize Pool:</span>
            <span className="font-mono font-black text-[#5f8f00] dark:text-[#BFFF00]">
              {match.totalPrizePool.toLocaleString('en-US')} UVBE
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
            <Users className="w-3 h-3" />
            <span>{match.contestCount} Contests</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-black/10 dark:border-white/10">
        <Link
          href={`/fantasy/match/${match.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-foreground text-xs font-bold transition-all border border-black/10 dark:border-white/10"
        >
          <span>Match Details</span>
        </Link>

        {isLive ? (
          <Link
            href={`/fantasy/live/${match.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-[2px_2px_0_#000] active:scale-95 transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Live Center</span>
          </Link>
        ) : (
          <Link
            href={`/fantasy/create-team/${match.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-black border border-black shadow-[2px_2px_0_#000] active:scale-95 transition-all"
          >
            <span>Create Team</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
