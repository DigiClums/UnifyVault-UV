'use client';

import React from 'react';
import { Match, LiveMatchScore } from '../../lib/fantasy/types';
import { mockUserFantasyPoints } from '../../lib/fantasy/mockData';
import { Zap, Activity, Users, Flame, Shield, ArrowUpRight } from 'lucide-react';

interface LiveScoreCardProps {
  match: Match;
}

export function LiveScoreCard({ match }: LiveScoreCardProps) {
  const liveScore: LiveMatchScore = match.liveScore || {
    currentInnings: 2,
    battingTeamId: match.teamB.id,
    bowlingTeamId: match.teamA.id,
    battingScore: { runs: 182, wickets: 5, overs: 34.2 },
    targetRuns: 288,
    crr: 5.3,
    rrr: 6.77,
    currentBatsmen: [
      {
        playerId: 'aus-5',
        name: 'Glenn Maxwell',
        runs: 48,
        balls: 32,
        fours: 4,
        sixes: 2,
        strikeRate: 150.0,
        isOut: false,
      },
      {
        playerId: 'aus-9',
        name: 'Pat Cummins',
        runs: 14,
        balls: 18,
        fours: 1,
        sixes: 0,
        strikeRate: 77.8,
        isOut: false,
      },
    ],
    currentBowler: {
      playerId: 'ind-9',
      name: 'Jasprit Bumrah',
      overs: 7.2,
      maidens: 1,
      runs: 28,
      wickets: 3,
      economy: 3.82,
    },
    recentBalls: ['1', '0', 'W', '4', '1', '2', '0', '6'],
    recentBallEvents: [],
    partnerships: {
      runs: 38,
      balls: 42,
      batsman1: 'Glenn Maxwell (28)',
      batsman2: 'Pat Cummins (10)',
    },
  };

  const battingTeam = match.teamB.id === liveScore.battingTeamId ? match.teamB : match.teamA;
  const bowlingTeam = match.teamA.id === liveScore.bowlingTeamId ? match.teamA : match.teamB;

  const totalUserPoints = mockUserFantasyPoints.reduce((acc, p) => acc + p.total, 0);

  return (
    <div className="space-y-4">
      {/* ── Live Match Summary Banner ── */}
      <div className="rounded-3xl border-2 border-black dark:border-white/15 bg-card p-4 sm:p-6 shadow-[4px_4px_0_#000] dark:shadow-none relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE MATCH
            </span>
            <span className="text-xs font-bold text-muted-foreground">
              {match.series} • {match.venue}
            </span>
          </div>

          <div className="text-xs font-mono font-bold text-foreground">
            Innings {liveScore.currentInnings}
          </div>
        </div>

        {/* Big Score Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 rounded-2xl bg-slate-50 dark:bg-black/50 border border-black/10 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl">{battingTeam.flag}</span>
            <div>
              <div className="text-sm sm:text-base font-bold text-muted-foreground">
                {battingTeam.name} Batting
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-foreground">
                {liveScore.battingScore.runs} / {liveScore.battingScore.wickets}
                <span className="text-sm sm:text-base text-muted-foreground ml-2">
                  ({liveScore.battingScore.overs} Ov)
                </span>
              </div>
            </div>
          </div>

          {/* CRR & RRR Stats */}
          <div className="flex items-center justify-around p-2 rounded-xl bg-card border border-black/5 dark:border-white/5 text-center">
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase">CRR</div>
              <div className="text-sm sm:text-base font-black font-mono text-foreground">
                {liveScore.crr}
              </div>
            </div>

            {liveScore.targetRuns && (
              <>
                <div className="w-px h-8 bg-black/10 dark:border-white/10" />
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">
                    Target
                  </div>
                  <div className="text-sm sm:text-base font-black font-mono text-[#5f8f00] dark:text-[#BFFF00]">
                    {liveScore.targetRuns}
                  </div>
                </div>
                <div className="w-px h-8 bg-black/10 dark:border-white/10" />
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">RRR</div>
                  <div className="text-sm sm:text-base font-black font-mono text-rose-500">
                    {liveScore.rrr || '6.5'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Recent Balls Strip */}
          <div className="flex flex-col items-end">
            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
              Recent Balls
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {liveScore.recentBalls.map((ball, idx) => (
                <div
                  key={idx}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-black text-xs border ${
                    ball === 'W'
                      ? 'bg-rose-600 text-white border-rose-700 animate-bounce'
                      : ball === '6'
                        ? 'bg-[#BFFF00] text-black border-black font-black'
                        : ball === '4'
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-card text-foreground border-black/15 dark:border-white/15'
                  }`}
                >
                  {ball}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Batsmen & Bowler Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
          {/* Batsmen Table */}
          <div className="p-3.5 rounded-2xl bg-card border border-black/10 dark:border-white/10 space-y-2">
            <div className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Current Batsmen</span>
            </div>

            <div className="space-y-1.5">
              {liveScore.currentBatsmen.map((bat) => (
                <div
                  key={bat.playerId}
                  className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-black/30 border border-black/5 dark:border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#BFFF00]" />
                    <span className="font-black text-foreground">{bat.name}</span>
                  </div>
                  <div className="font-mono text-foreground font-bold">
                    <span className="text-sm font-black">{bat.runs}</span>
                    <span className="text-muted-foreground text-[11px]"> ({bat.balls})</span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      4s: {bat.fours} • 6s: {bat.sixes} • SR: {bat.strikeRate}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-muted-foreground pt-1 flex items-center justify-between">
              <span>
                Partnership: {liveScore.partnerships.runs} runs ({liveScore.partnerships.balls}{' '}
                balls)
              </span>
            </div>
          </div>

          {/* Current Bowler */}
          <div className="p-3.5 rounded-2xl bg-card border border-black/10 dark:border-white/10 space-y-2">
            <div className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span>Current Bowler</span>
            </div>

            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-black/30 border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="font-black text-foreground">{liveScore.currentBowler.name}</span>
                <span className="text-[10px] text-muted-foreground">({bowlingTeam.code})</span>
              </div>

              <div className="font-mono text-foreground font-bold space-x-2">
                <span>{liveScore.currentBowler.overs} Ov</span>
                <span>•</span>
                <span>{liveScore.currentBowler.runs} Runs</span>
                <span>•</span>
                <span className="text-emerald-500 font-black">
                  {liveScore.currentBowler.wickets} Wkts
                </span>
                <span>•</span>
                <span className="text-muted-foreground text-[10px]">
                  Econ: {liveScore.currentBowler.economy}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── My Fantasy Points Breakdown Panel ── */}
      <div className="rounded-3xl border-2 border-black dark:border-white/15 bg-card p-4 sm:p-6 shadow-[4px_4px_0_#000] dark:shadow-none">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#BFFF00] text-black flex items-center justify-center font-black text-xs border border-black shadow-[2px_2px_0_#000]">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">My Fantasy Points</h3>
              <p className="text-xs text-muted-foreground">
                Live calculated fantasy score based on on-field performance.
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">
              Total Fantasy Points
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-[#5f8f00] dark:text-[#BFFF00]">
              {totalUserPoints} pts
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {mockUserFantasyPoints.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-black/10 dark:border-white/10 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-foreground">{item.name}</span>
                  {item.multiplier > 1 && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-black border border-black">
                      {item.multiplier}x
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  Role: {item.role} • Base: {item.points} pts
                </div>
              </div>

              <div className="text-sm font-black font-mono text-foreground text-right">
                {item.total} pts
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
