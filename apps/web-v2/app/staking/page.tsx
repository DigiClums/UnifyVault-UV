'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { StakingHeroCards } from '../../components/staking/StakingHeroCards';
import { StakeActionForm } from '../../components/staking/StakeActionForm';
import { RewardsClaimPanel } from '../../components/staking/RewardsClaimPanel';
import { ReferralNetworkView } from '../../components/staking/ReferralNetworkView';
import { RankProgressionCard } from '../../components/staking/RankProgressionCard';
import { DaoLeadershipPoolCard } from '../../components/staking/DaoLeadershipPoolCard';
import { getDefaultChainId } from '../../constants';
import { base } from 'viem/chains';
import { Lock, Sparkles, ShieldCheck } from 'lucide-react';

export default function StakingPage() {
  const { chain } = useAccount();
  const currentChainId = chain?.id || getDefaultChainId();
  const networkName = currentChainId === base.id ? 'Base Mainnet' : 'Base Sepolia';

  return (
    <div className="space-y-4 sm:space-y-6 pt-1 pb-10 sm:py-3 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-black dark:text-[#BFFF00]" />
              UVBE Staking & Yield Hub
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {networkName} · 18.00% APY Perpetual Yield · 10-Generation Affiliate & Leadership
            Rewards
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center space-x-1.5 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#BFFF00] animate-pulse" />
            <span>18% APY Active</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-black text-white dark:bg-white/10 dark:text-white border border-black dark:border-white/20 shrink-0">
            <span>{networkName}</span>
          </div>
        </div>
      </div>

      {/* ── Top Hero Stats (Permanent Staked, Rewards, Active Direct, Rank) ── */}
      <StakingHeroCards />

      {/* ── Main Actions Grid (Stake Form & Rewards Panel) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <StakeActionForm />
        <RewardsClaimPanel />
      </div>

      {/* ── Referral Network & MLM Generations ── */}
      <ReferralNetworkView />

      {/* ── Rank Progression & DAO Leadership Pool ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <RankProgressionCard />
        <DaoLeadershipPoolCard />
      </div>
    </div>
  );
}
