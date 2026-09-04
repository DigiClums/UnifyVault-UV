'use client';

import React from 'react';
import {
  ShieldCheck,
  Award,
  Users,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
  Coins,
} from 'lucide-react';
import { formatUnits } from 'viem';
import { useStaking } from '../../hooks/useStaking';

export function DaoLeadershipPoolCard() {
  const { currentDaoEpochId, totalOutstandingLiabilities, availableProtocolCapital, currentRank } =
    useStaking();

  const isEligible = currentRank >= 4;
  const userShares = currentRank === 4 ? 1 : currentRank === 5 ? 3 : currentRank === 6 ? 10 : 0;
  const isSolvent = availableProtocolCapital >= totalOutstandingLiabilities;

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#10B981] space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            DAO Leadership Pool & Solvency
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            5.00% of all gross staking volume is allocated to the 30-day DAO leadership cycle,
            distributed to Platinum, Diamond, and Crown Ambassador leaders.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
            Active Cycle
          </span>
          <div className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
            Epoch #{currentDaoEpochId}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Leadership Eligibility */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Your Eligibility</div>
          <div className="text-sm font-mono font-black flex items-center gap-1.5 pt-0.5">
            {isEligible ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Eligible ({userShares}{' '}
                {userShares === 1 ? 'Share' : 'Shares'})
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1 text-xs">
                <Lock className="w-3.5 h-3.5" /> Requires Tier 4 (Platinum)
              </span>
            )}
          </div>
        </div>

        {/* Total Outstanding Liabilities */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Protocol Liabilities</div>
          <div className="text-sm font-mono font-black text-slate-950 dark:text-white pt-0.5">
            {Number(formatUnits(totalOutstandingLiabilities, 18)).toFixed(4)}{' '}
            <span className="text-[10px] text-slate-500 font-normal">UVBE</span>
          </div>
        </div>

        {/* Available Protocol Capital */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase">
            Vault Capital Balance
          </div>
          <div className="text-sm font-mono font-black text-slate-950 dark:text-white pt-0.5">
            {Number(formatUnits(availableProtocolCapital, 18)).toFixed(4)}{' '}
            <span className="text-[10px] text-slate-500 font-normal">UVBE</span>
          </div>
        </div>
      </div>

      {/* Tier Weights Info */}
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
        <span className="font-bold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          DAO Pool Share Weights:
        </span>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>
            Platinum (Tier 4): <strong>1 Share</strong>
          </span>
          <span>
            Diamond (Tier 5): <strong>3 Shares</strong>
          </span>
          <span>
            Crown Ambassador (Tier 6): <strong>10 Shares</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
