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
} from 'lucide-react';
import { formatUnits } from 'viem';
import { useStaking } from '../../hooks/useStaking';

export function DaoLeadershipPoolCard() {
  const { currentDaoEpochId, totalOutstandingLiabilities, availableReserve, currentRank } =
    useStaking();

  const isEligible = currentRank >= 4;
  const userShares = currentRank === 4 ? 1 : currentRank === 5 ? 3 : currentRank === 6 ? 10 : 0;

  const isSolvent = availableReserve >= totalOutstandingLiabilities;

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#10B981] space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            DAO Leadership Pool & Reserve Solvency
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            1.00% of all protocol staking volume feeds the 30-day DAO leadership cycle, distributed
            to Platinum+ leaders.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
            Current Epoch
          </span>
          <div className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">
            Epoch #{currentDaoEpochId}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Leadership Eligibility */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
            Your Eligibility
          </div>
          <div className="text-sm font-mono font-black flex items-center gap-1.5">
            {isEligible ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Eligible ({userShares}{' '}
                {userShares === 1 ? 'Share' : 'Shares'})
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Requires Tier 4 (Platinum)
              </span>
            )}
          </div>
        </div>

        {/* Total Outstanding Liabilities */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
            Total Protocol Liabilities
          </div>
          <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
            {Number(formatUnits(totalOutstandingLiabilities, 18)).toFixed(4)}{' '}
            <span className="text-[10px] text-slate-500">UVBE</span>
          </div>
        </div>

        {/* Available Reward Reserve */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
            Reward Reserve Balance
          </div>
          <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
            {Number(formatUnits(availableReserve, 18)).toFixed(4)}{' '}
            <span className="text-[10px] text-slate-500">UVBE</span>
          </div>
        </div>
      </div>

      {/* Tier Weights Info */}
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
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
