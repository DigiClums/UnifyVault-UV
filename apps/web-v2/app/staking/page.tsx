'use client';

import React from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { StakingHeroCards } from '../../components/staking/StakingHeroCards';
import { StakeActionForm } from '../../components/staking/StakeActionForm';
import { RewardsClaimPanel } from '../../components/staking/RewardsClaimPanel';
import { ProtocolCapitalCard } from '../../components/staking/ProtocolCapitalCard';
import { PermanentStakePositionCard } from '../../components/staking/PermanentStakePositionCard';
import { ReferralNetworkView } from '../../components/staking/ReferralNetworkView';
import { RankProgressionCard } from '../../components/staking/RankProgressionCard';
import { DaoLeadershipPoolCard } from '../../components/staking/DaoLeadershipPoolCard';
import { StakingTransactionHistory } from '../../components/staking/StakingTransactionHistory';
import { useStaking } from '../../hooks/useStaking';
import { getDefaultChainId } from '../../constants';
import { base, baseSepolia } from 'viem/chains';
import { Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function StakingPage() {
  const { chain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { dynamicApy, healthRatio } = useStaking();

  const targetChainId = baseSepolia.id;
  const isWrongNetwork = isConnected && chain && chain.id !== targetChainId;

  return (
    <div className="space-y-5 sm:space-y-7 pt-1 pb-12 sm:py-4 max-w-7xl mx-auto">
      {/* ── Section A: Hero & Staking Header ── */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight flex items-center gap-2.5">
                <Sparkles className="w-7 h-7 text-black dark:text-[#BFFF00]" />
                UVBE Staking
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-[#BFFF00]/15 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/40">
                Dynamic {dynamicApy}% APY
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
              Stake UVBE to earn continuous dynamic APY, 10-tier affiliate commissions, and monthly
              DAO leadership pool rewards.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center space-x-1.5 text-[11px] font-mono font-bold px-3 py-1.5 rounded-xl bg-black text-white dark:bg-white/10 dark:text-white border border-black dark:border-white/20 shrink-0 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#BFFF00] animate-pulse" />
              <span>Base Sepolia</span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] font-mono font-bold px-3 py-1.5 rounded-xl bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>10-Tier Referrals Active</span>
            </div>
          </div>
        </div>

        {/* Network Mismatch Warning Banner */}
        {isWrongNetwork && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                <strong>Wrong Network Detected:</strong> You are connected to {chain?.name}. Please
                switch to Base Sepolia to interact with UVBE Staking.
              </span>
            </div>
            {switchChain && (
              <button
                type="button"
                onClick={() => switchChain({ chainId: targetChainId })}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shrink-0 hover:bg-rose-700 transition-colors"
              >
                Switch to Base Sepolia
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Section A: Top Summary Cards ── */}
      <StakingHeroCards />

      {/* ── Section B & D: Stake Card & Rewards Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        <StakeActionForm />
        <RewardsClaimPanel />
      </div>

      {/* ── Section C & E: Protocol Capital & Permanent Stake Position ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        <ProtocolCapitalCard />
        <PermanentStakePositionCard />
      </div>

      {/* ── Section F: Referral / MLM Network ── */}
      <ReferralNetworkView />

      {/* ── Section G: DAO / Rank Progression & Leadership Pool ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        <RankProgressionCard />
        <DaoLeadershipPoolCard />
      </div>

      {/* ── Section H: Staking Transaction History ── */}
      <StakingTransactionHistory />
    </div>
  );
}
