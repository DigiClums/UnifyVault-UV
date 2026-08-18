'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  Sparkles,
  RefreshCw,
  Download,
  Award,
  Layers,
  Users,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { formatUnits, parseUnits } from 'viem';
import { useStaking } from '../../hooks/useStaking';
import { TransactionStatusModal } from '../common/TransactionStatusModal';

export function RewardsClaimPanel() {
  const { isConnected } = useAccount();
  const {
    rewards,
    claimRewards,
    claimAllRewards,
    restakeRewards,
    restakeAllRewards,
    txManager,
    isLoading,
  } = useStaking();

  const [claimAmountInput, setClaimAmountInput] = useState<string>('');
  const [restakeAmountInput, setRestakeAmountInput] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const hasClaimable = rewards.totalClaimable > 0n;

  const handleClaimAll = async () => {
    if (!hasClaimable) return;
    setIsModalOpen(true);
    try {
      await claimAllRewards();
    } catch (e) {
      console.error('Claim all failed:', e);
    }
  };

  const handleRestakeAll = async () => {
    if (!hasClaimable) return;
    setIsModalOpen(true);
    try {
      await restakeAllRewards();
    } catch (e) {
      console.error('Restake all failed:', e);
    }
  };

  const handleClaimSpecific = async () => {
    try {
      const amt = parseUnits(claimAmountInput, 18);
      if (amt === 0n || amt > rewards.totalClaimable) return;
      setIsModalOpen(true);
      await claimRewards(amt);
      setClaimAmountInput('');
    } catch (e) {
      console.error('Claim specific failed:', e);
    }
  };

  const handleRestakeSpecific = async () => {
    try {
      const amt = parseUnits(restakeAmountInput, 18);
      if (amt === 0n || amt > rewards.totalClaimable) return;
      setIsModalOpen(true);
      await restakeRewards(amt);
      setRestakeAmountInput('');
    } catch (e) {
      console.error('Restake specific failed:', e);
    }
  };

  const formatUVBE = (val: bigint, decimals: number = 4) =>
    Number(formatUnits(val, 18)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#3B82F6]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Rewards & Yield Engine
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Accrues 18% APY continuous recurring rewards + generation referral commissions.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
              Total Claimable
            </span>
            <div className="text-sm sm:text-base font-mono font-black text-blue-600 dark:text-blue-400">
              {formatUVBE(rewards.totalClaimable, 6)} UVBE
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-5">
          {/* Recurring 18% APY */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              18% APY Recurring
            </div>
            <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
              {formatUVBE(rewards.recurringReward, 6)}{' '}
              <span className="text-[10px] text-slate-500">UVBE</span>
            </div>
          </div>

          {/* Gen 1 Direct (5%) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
              <Users className="w-3 h-3 text-blue-500" />
              Gen 1 Direct (5%)
            </div>
            <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
              {formatUVBE(rewards.directReward)}{' '}
              <span className="text-[10px] text-slate-500">UVBE</span>
            </div>
          </div>

          {/* Gen 2-10 Overrides */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
              <Layers className="w-3 h-3 text-violet-500" />
              Gen 2-10 Matching
            </div>
            <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
              {formatUVBE(rewards.generationReward)}{' '}
              <span className="text-[10px] text-slate-500">UVBE</span>
            </div>
          </div>

          {/* Rank Milestones */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
              <Award className="w-3 h-3 text-amber-500" />
              Rank Milestone
            </div>
            <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
              {formatUVBE(rewards.rankReward)}{' '}
              <span className="text-[10px] text-slate-500">UVBE</span>
            </div>
          </div>

          {/* DAO Leadership Pool */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
              <ShieldCheck className="w-3 h-3 text-indigo-500" />
              DAO Leadership
            </div>
            <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
              {formatUVBE(rewards.daoReward)}{' '}
              <span className="text-[10px] text-slate-500">UVBE</span>
            </div>
          </div>

          {/* Lifetime Historical Claims */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
              <CheckCircle2 className="w-3 h-3 text-slate-400" />
              Lifetime Claimed
            </div>
            <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
              {formatUVBE(rewards.totalClaimed)}{' '}
              <span className="text-[10px] text-slate-500">UVBE</span>
            </div>
          </div>
        </div>

        {/* 1-Click Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Claim All to Wallet */}
          <button
            type="button"
            onClick={handleClaimAll}
            disabled={
              !isConnected || !hasClaimable || txManager.progressState.state.includes('PENDING')
            }
            className="w-full py-3 px-4 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-black dark:border-white/20 shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-blue-500" />
            Claim All ({formatUVBE(rewards.totalClaimable, 4)} UVBE)
          </button>

          {/* Compound Restake All */}
          <button
            type="button"
            onClick={handleRestakeAll}
            disabled={
              !isConnected || !hasClaimable || txManager.progressState.state.includes('PENDING')
            }
            className="w-full py-3 px-4 rounded-xl bg-[#BFFF00] text-black font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-black" />
            Compound Restake All (0% Fee)
          </button>
        </div>
      </div>

      {/* Transaction Progress Modal */}
      <TransactionStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        progressState={txManager.progressState}
        onRetry={txManager.retryLastTransaction}
        onCancel={() => setIsModalOpen(false)}
        title="Reward Distribution Action"
      />
    </>
  );
}
