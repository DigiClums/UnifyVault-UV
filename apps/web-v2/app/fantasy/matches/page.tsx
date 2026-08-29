'use client';

import React, { useState } from 'react';
import { useFantasy } from '../../../lib/fantasy/fantasyStore';
import { MatchCard } from '../../../components/fantasy/MatchCard';
import { MatchStatus } from '../../../lib/fantasy/types';
import { Zap, Clock, CheckCircle2, Trophy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MatchesPage() {
  const { matches } = useFantasy();
  const [activeTab, setActiveTab] = useState<MatchStatus>('upcoming');

  const filteredMatches = matches.filter((m) => m.status === activeTab);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/fantasy"
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              Cricket Matches & Fixtures
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-8">
            Choose an upcoming or live match to create your team and join prize pools.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-200 dark:bg-black/70 p-1.5 rounded-2xl border-2 border-black dark:border-white/15 shadow-[2px_2px_0_#000] max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'upcoming'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Upcoming ({matches.filter((m) => m.status === 'upcoming').length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'live'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Live ({matches.filter((m) => m.status === 'live').length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'completed'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Finished ({matches.filter((m) => m.status === 'completed').length})</span>
        </button>
      </div>

      {/* Matches Grid */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl border-2 border-dashed border-black/20 dark:border-white/20 bg-card space-y-2">
          <div className="text-2xl">🏏</div>
          <h3 className="text-base font-black text-foreground">No Matches Found</h3>
          <p className="text-xs text-muted-foreground">
            No matches are currently in this category. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
