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
  Users,
  Award,
  History,
} from 'lucide-react';

export default function StakingPage() {
  const { chain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { dynamicApy } = useStaking();
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'ranks' | 'history'>(
    'overview',
  );

  const targetChainId = getDefaultChainId();
  const isWrongNetwork = isConnected && chain && chain.id !== targetChainId;

  return (
    <div className="space-y-4 sm:space-y-5 pt-1 pb-10 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-black dark:text-[#BFFF00]" />
                UVBE Staking
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-[#BFFF00]/15 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/40">
                Dynamic {dynamicApy}% APY
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Perpetual dynamic staking rewards, 10-tier affiliate commissions, and DAO leadership
              pool.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl bg-black text-white dark:bg-white/10 dark:text-white border border-black dark:border-white/20 shrink-0 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#BFFF00] animate-pulse" />
              <span>{CHAIN_CONFIG.name}</span>
            </div>
            <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30 shrink-0">
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
                <strong>Wrong Network Detected:</strong> You are connected to {chain?.name}. Please
                switch to {CHAIN_CONFIG.name} to interact with UVBE Staking.
              </span>
            </div>
            {switchChain && (
              <button
                type="button"
                onClick={() => switchChain({ chainId: targetChainId })}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shrink-0 hover:bg-rose-700 transition-colors"
              >
                Switch to {CHAIN_CONFIG.name}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Compact Top Metric Cards ── */}
      <StakingHeroCards />

      {/* ── Primary Action Area (Stake & Claim) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <StakeActionForm />
        <RewardsClaimPanel />
      </div>

      {/* ── Segmented Secondary Navigation Tabs ── */}
      <div className="border-b border-black/10 dark:border-white/10 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black shadow-[2px_2px_0_#000]'
                : 'bg-slate-100 dark:bg-white/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Position & Vault Health</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'referrals'
                ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black shadow-[2px_2px_0_#000]'
                : 'bg-slate-100 dark:bg-white/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Referrals & MLM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ranks')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'ranks'
                ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black shadow-[2px_2px_0_#000]'
                : 'bg-slate-100 dark:bg-white/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Ranks & DAO Pool</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'history'
                ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black shadow-[2px_2px_0_#000]'
                : 'bg-slate-100 dark:bg-white/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Staking History</span>
          </button>
        </div>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <ProtocolCapitalCard />
          <PermanentStakePositionCard />
        </div>
      )}

      {activeTab === 'referrals' && <ReferralNetworkView />}

      {activeTab === 'ranks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <RankProgressionCard />
          <DaoLeadershipPoolCard />
        </div>
      )}

      {activeTab === 'history' && <StakingTransactionHistory />}
    </div>
  );
}
