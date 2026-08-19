'use client';

import React from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Coins,
  Activity,
  Sparkles,
  RefreshCw,
  Info,
  Layers,
  Lock,
} from 'lucide-react';
import { formatUnits } from 'viem';
import { useStaking } from '../../hooks/useStaking';
import { TransactionStatusModal } from '../common/TransactionStatusModal';

export function ProtocolCapitalCard() {
  const {
    totalPermanentStaked,
    availableProtocolCapital,
    surplusCapacity,
    totalOutstandingLiabilities,
    dynamicApy,
    dynamicApyBps,
    healthRatio,
    checkpoint,
    txManager,
    isLoading,
  } = useStaking();

  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const formattedTotalStaked = Number(formatUnits(totalPermanentStaked, 18)).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  );

  const formattedVaultCapital = Number(formatUnits(availableProtocolCapital, 18)).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  );

  const formattedSurplus = Number(formatUnits(surplusCapacity, 18)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  const formattedLiabilities = Number(formatUnits(totalOutstandingLiabilities, 18)).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 4 },
  );

  const handleSyncRate = async () => {
    setIsModalOpen(true);
    try {
      await checkpoint();
    } catch (e) {
      console.error('Checkpoint sync failed:', e);
    }
  };

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#10B981] space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Protocol-Owned Capital & Dynamic Capacity
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              95% of all user staking volume is held in the UVBEStakingVault as permanent
              protocol-owned capital backing dynamic APY and affiliate rewards.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncRate}
              disabled={txManager.progressState.state.includes('PENDING')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs border border-slate-300 dark:border-white/10 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
              Sync Rate
            </button>
            <div className="text-right">
              <span className="text-[9px] font-mono uppercase font-bold text-slate-500 block">
                Solvency Status
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                100% SOLVENT
              </span>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Protocol-Owned Capital */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-black dark:text-[#BFFF00]" />
                Protocol-Owned Capital
              </span>
            </div>
            <div className="text-xl font-mono font-black text-slate-950 dark:text-white">
              {formattedTotalStaked} <span className="text-xs text-slate-500">UVBE</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Vault balance: {formattedVaultCapital} UVBE
            </p>
          </div>

          {/* 2. Available Reward Capacity */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3 text-emerald-500" />
                Available Reward Capacity
              </span>
            </div>
            <div className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">
              {formattedSurplus} <span className="text-xs text-slate-500">UVBE</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Surplus backing: {healthRatio}% health ratio
            </p>
          </div>

          {/* 3. Total Outstanding Liabilities */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-500" />
                Reward Liabilities
              </span>
            </div>
            <div className="text-xl font-mono font-black text-slate-950 dark:text-white">
              {formattedLiabilities} <span className="text-xs text-slate-500">UVBE</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Committed claimable reward liability
            </p>
          </div>

          {/* 4. Dynamic APY */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-blue-500" />
                Dynamic APY
              </span>
              <span className="text-[9px] font-mono text-slate-400">{dynamicApyBps} BPS</span>
            </div>
            <div className="text-xl font-mono font-black text-blue-600 dark:text-blue-400">
              {dynamicApy}% <span className="text-xs text-slate-500">APY</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Capacity-backed (Max 100.00% cap)
            </p>
          </div>
        </div>

        {/* Dynamic APY Solvency Explanation */}
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-slate-700 dark:text-slate-300 space-y-1">
            <div>
              <strong className="text-slate-950 dark:text-white">
                Dynamic APY & Zero-Minting Model:
              </strong>{' '}
              APY is continuously calculated from available vault surplus capacity:
              <code className="mx-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 font-mono text-[10px]">
                APY = min(100%, (Surplus Capacity × 10,000) ÷ Total Staked)
              </code>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              No new tokens are minted for rewards. If available capital is fully consumed by
              claims, APY naturally decays toward 0.00% without insolvencies or bank runs.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Progress Modal */}
      <TransactionStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        progressState={txManager.progressState}
        onRetry={txManager.retryLastTransaction}
        onCancel={() => setIsModalOpen(false)}
        title="Dynamic Rate Checkpoint"
      />
    </>
  );
}
