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
  Coins,
  ArrowRight,
  Info,
} from 'lucide-react';
import { formatUnits, parseUnits } from 'viem';
import { useStaking } from '../../hooks/useStaking';
import { TransactionStatusModal } from '../common/TransactionStatusModal';

export function RewardsClaimPanel() {
  const { isConnected } = useAccount();
  const {
    rewards,
    dynamicApy,
    claimRewards,
    claimAllRewards,
    restakeRewards,
    restakeAllRewards,
    txManager,
    isLoading,
  } = useStaking();

  const [claimAmountInput, setClaimAmountInput] = useState<string>('');
  const [restakeAmountInput, setRestakeAmountInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'claim' | 'restake'>('all');
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
      if (!claimAmountInput || isNaN(Number(claimAmountInput)) || Number(claimAmountInput) <= 0)
        return;
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
      if (
        !restakeAmountInput ||
        isNaN(Number(restakeAmountInput)) ||
        Number(restakeAmountInput) <= 0
      )
        return;
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
      <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#3B82F6] flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                Rewards Engine
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Earned rewards can be claimed directly to your wallet or compounded with 0% fees.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                Total Claimable
              </span>
              <div className="text-base sm:text-lg font-mono font-black text-blue-600 dark:text-blue-400">
                {formatUVBE(rewards.totalClaimable, 6)} UVBE
              </div>
            </div>
          </div>

          {/* Detailed Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 mb-4">
            {/* 1. Dynamic Recurring APY */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
              <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1 truncate">
                <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
                Recurring APY ({dynamicApy}%)
              </div>
              <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
                {formatUVBE(rewards.recurringReward, 4)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">UVBE</span>
              </div>
            </div>

            {/* 2. Direct Referral (5%) */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
              <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1 truncate">
                <Users className="w-3 h-3 text-blue-500 shrink-0" />
                Direct Referral (5%)
              </div>
              <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
                {formatUVBE(rewards.directReward, 4)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">UVBE</span>
              </div>
            </div>

            {/* 3. Generation Matching */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
              <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1 truncate">
                <Layers className="w-3 h-3 text-violet-500 shrink-0" />
                Gen 2-10 Matching
              </div>
              <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
                {formatUVBE(rewards.generationReward, 4)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">UVBE</span>
              </div>
            </div>

            {/* 4. Rank Milestones */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
              <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1 truncate">
                <Award className="w-3 h-3 text-amber-500 shrink-0" />
                Rank Milestones
              </div>
              <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
                {formatUVBE(rewards.rankReward, 4)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">UVBE</span>
              </div>
            </div>

            {/* 5. DAO Leadership Pool */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
              <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1 truncate">
                <ShieldCheck className="w-3 h-3 text-indigo-500 shrink-0" />
                DAO Leadership
              </div>
              <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
                {formatUVBE(rewards.daoReward, 4)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">UVBE</span>
              </div>
            </div>

            {/* 6. Lifetime Stats (Claimed + Restaked) */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
              <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1 truncate">
                <CheckCircle2 className="w-3 h-3 text-slate-400 shrink-0" />
                Lifetime Claimed
              </div>
              <div className="text-sm font-mono font-black text-slate-950 dark:text-white">
                {formatUVBE(rewards.totalClaimed, 2)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">UVBE</span>
              </div>
            </div>
          </div>

          {/* Restake Info Alert */}
          <div className="p-3 rounded-xl bg-[#BFFF00]/10 border border-[#BFFF00]/30 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2 mb-4">
            <RefreshCw className="w-4 h-4 text-black dark:text-[#BFFF00] shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-950 dark:text-white">0% Fee Compound Restaking:</strong>{' '}
              Restaking rewards compounds directly into your staking balance with 0% protocol fees.
            </div>
          </div>

          {/* Action Tabs & Custom Inputs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                  activeTab === 'all'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                }`}
              >
                1-Click All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('claim')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                  activeTab === 'claim'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-500'
                }`}
              >
                Custom Claim
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('restake')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                  activeTab === 'restake'
                    ? 'bg-[#BFFF00] text-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#5f8f00] dark:hover:text-[#BFFF00]'
                }`}
              >
                Custom Restake
              </button>
            </div>

            {activeTab === 'claim' && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  max={formatUnits(rewards.totalClaimable, 18)}
                  value={claimAmountInput}
                  onChange={(e) => setClaimAmountInput(e.target.value)}
                  placeholder={`Amount (Max: ${formatUVBE(rewards.totalClaimable, 4)})`}
                  className="w-full bg-transparent text-sm font-mono font-bold text-slate-950 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setClaimAmountInput(formatUnits(rewards.totalClaimable, 18))}
                  className="px-2 py-1 rounded bg-black dark:bg-white/10 text-white dark:text-white text-[10px] font-mono font-bold"
                >
                  MAX
                </button>
                <button
                  type="button"
                  onClick={handleClaimSpecific}
                  disabled={
                    !isConnected ||
                    !hasClaimable ||
                    txManager.progressState.state.includes('PENDING')
                  }
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 shrink-0"
                >
                  Claim
                </button>
              </div>
            )}

            {activeTab === 'restake' && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  max={formatUnits(rewards.totalClaimable, 18)}
                  value={restakeAmountInput}
                  onChange={(e) => setRestakeAmountInput(e.target.value)}
                  placeholder={`Amount (Max: ${formatUVBE(rewards.totalClaimable, 4)})`}
                  className="w-full bg-transparent text-sm font-mono font-bold text-slate-950 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setRestakeAmountInput(formatUnits(rewards.totalClaimable, 18))}
                  className="px-2 py-1 rounded bg-black dark:bg-white/10 text-white dark:text-white text-[10px] font-mono font-bold"
                >
                  MAX
                </button>
                <button
                  type="button"
                  onClick={handleRestakeSpecific}
                  disabled={
                    !isConnected ||
                    !hasClaimable ||
                    txManager.progressState.state.includes('PENDING')
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#BFFF00] text-black font-black text-xs uppercase tracking-wider disabled:opacity-50 shrink-0"
                >
                  Restake
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
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
        title="Reward Execution Action"
      />
    </>
  );
}
