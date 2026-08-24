'use client';

import React, { useState } from 'react';
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
import { getDefaultChainId, CHAIN_CONFIG } from '../../constants';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  LayoutDashboard,
  Coins,
  Users,
  Award,
  History,
} from 'lucide-react';

type StakingMobileTab = 'overview' | 'stake' | 'referrals' | 'ranks' | 'history';

export default function StakingPage() {
  const { chain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { dynamicApy } = useStaking();
  const [activeTab, setActiveTab] = useState<StakingMobileTab>('overview');

  const targetChainId = getDefaultChainId();
  const isWrongNetwork = isConnected && chain && chain.id !== targetChainId;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      {/* ── Header (Compact on mobile) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-black dark:text-[#BFFF00]" />
              UVBE Staking
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-black bg-[#BFFF00]/15 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/40">
              Dynamic {dynamicApy}% APY
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            Perpetual dynamic staking rewards, 10-tier affiliate commissions, and DAO leadership
            pool.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
          <div className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-black text-white dark:bg-white/10 dark:text-white border border-black dark:border-white/20 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#BFFF00] animate-pulse" />
            <span>{CHAIN_CONFIG.name}</span>
          </div>
          <div className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-[#BFFF00]/15 text-black dark:text-[#BFFF00] border border-black dark:border-[#BFFF00]/30 shadow-[1px_1px_0_#000]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>10 Tiers Active</span>
          </div>
        </div>
      </div>

      {/* Network Mismatch Warning Banner */}
      {isWrongNetwork && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              <strong>Wrong Network:</strong> Switch to {CHAIN_CONFIG.name} for UVBE Staking.
            </span>
          </div>
          {switchChain && (
            <button
              type="button"
              onClick={() => switchChain({ chainId: targetChainId })}
              className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shrink-0 hover:bg-rose-700 transition-colors"
            >
              Switch Network
            </button>
          )}
        </div>
      )}

      {/* ── Mobile Compact Segment Selector (Zero Scroll Experience) ── */}
      <div className="md:hidden flex items-center p-1 bg-slate-200 dark:bg-black/80 rounded-2xl border-2 border-black dark:border-white/15 overflow-x-auto no-scrollbar shadow-[2px_2px_0_#000] gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[70px] py-2 px-1.5 rounded-xl text-center font-black text-[11px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'overview'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Stats</span>
        </button>

        <button
          onClick={() => setActiveTab('stake')}
          className={`flex-1 min-w-[70px] py-2 px-1.5 rounded-xl text-center font-black text-[11px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'stake'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Stake</span>
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`flex-1 min-w-[70px] py-2 px-1.5 rounded-xl text-center font-black text-[11px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'referrals'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Referral</span>
        </button>

        <button
          onClick={() => setActiveTab('ranks')}
          className={`flex-1 min-w-[70px] py-2 px-1.5 rounded-xl text-center font-black text-[11px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'ranks'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Ranks</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[70px] py-2 px-1.5 rounded-xl text-center font-black text-[11px] transition-all flex items-center justify-center gap-1 ${
            activeTab === 'history'
              ? 'bg-[#BFFF00] text-black shadow-[2px_2px_0_#000]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      </div>

      {/* ── 1. Top Metrics (Active on 'overview' on mobile or always on desktop) ── */}
      <div className={`${activeTab === 'overview' ? 'block' : 'hidden md:block'}`}>
        <StakingHeroCards />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch mt-4">
          <ProtocolCapitalCard />
          <PermanentStakePositionCard />
        </div>
      </div>

      {/* ── 2. Primary Action Area (Stake & Claim) ── */}
      <div className={`${activeTab === 'stake' ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <StakeActionForm />
          <RewardsClaimPanel />
        </div>
      </div>

      {/* ── 3. Referrals & MLM Network ── */}
      <div className={`${activeTab === 'referrals' ? 'block' : 'hidden md:block'}`}>
        <ReferralNetworkView />
      </div>

      {/* ── 4. Ranks & DAO Pool ── */}
      <div className={`${activeTab === 'ranks' ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <RankProgressionCard />
          <DaoLeadershipPoolCard />
        </div>
      </div>

      {/* ── 5. Staking History ── */}
      <div className={`${activeTab === 'history' ? 'block' : 'hidden md:block'}`}>
        <StakingTransactionHistory />
      </div>
    </div>
  );
}
