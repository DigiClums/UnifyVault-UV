'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAccount, useSwitchChain } from 'wagmi';
import { StakingHeroCards } from '../../components/staking/StakingHeroCards';
import { StakeActionForm } from '../../components/staking/StakeActionForm';
import { RewardsClaimPanel } from '../../components/staking/RewardsClaimPanel';
import { ProtocolCapitalCard } from '../../components/staking/ProtocolCapitalCard';
import { PermanentStakePositionCard } from '../../components/staking/PermanentStakePositionCard';
import { ReferralNetworkView } from '../../components/staking/ReferralNetworkView';
import { RankProgressionCard } from '../../components/staking/RankProgressionCard';
import { DaoLeadershipPoolCard } from '../../components/staking/DaoLeadershipPoolCard';
import { StakingYieldCalculator } from '../../components/staking/StakingYieldCalculator';
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
  FileCode2,
} from 'lucide-react';

type StakingTab = 'overview' | 'stake' | 'referrals' | 'ranks' | 'calculator' | 'history';

interface TabItem {
  id: StakingTab;
  label: string;
  mobileLabel: string;
  icon: React.ElementType;
  badge?: string;
  description: string;
}

const TABS: TabItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    mobileLabel: 'Overview',
    icon: LayoutDashboard,
    description: 'Vault health, active position, and lifetime return cap progress',
  },
  {
    id: 'stake',
    label: 'Stake & Claim',
    mobileLabel: 'Stake & Claim',
    icon: Coins,
    description: 'Permanent vault staking and 0% fee compound restaking',
  },
  {
    id: 'referrals',
    label: 'Affiliate Network',
    mobileLabel: 'Affiliates',
    icon: Users,
    badge: '10 Tiers',
    description: '10-tier commission overrides and direct referral tree',
  },
  {
    id: 'ranks',
    label: 'Ranks & DAO',
    mobileLabel: 'Ranks & DAO',
    icon: Award,
    badge: '5% Pool',
    description: 'Rank milestone achievements and 30-day DAO leadership distributions',
  },
  {
    id: 'calculator',
    label: 'Calculator',
    mobileLabel: 'Calculator',
    icon: Sparkles,
    description: 'Interactive yield simulator with compounding projections',
  },
  {
    id: 'history',
    label: 'Logs',
    mobileLabel: 'Logs',
    icon: History,
    description: 'Onchain stakes, claims, and restake event records',
  },
];

export default function StakingPage() {
  const { chain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { dynamicApy, rewards, lifetimeCapInfo } = useStaking();
  const [activeTab, setActiveTab] = useState<StakingTab>('overview');

  // Support deep-linking via ?tab=referrals or ?tab=affiliates or ?ref=0x...
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab')?.toLowerCase();
      if (
        tabParam === 'referrals' ||
        tabParam === 'referral' ||
        tabParam === 'affiliate' ||
        tabParam === 'affiliates' ||
        tabParam === 'team'
      ) {
        setActiveTab('referrals');
      } else if (tabParam === 'stake' || tabParam === 'staking') {
        setActiveTab('stake');
      } else if (tabParam === 'ranks' || tabParam === 'rank' || tabParam === 'dao') {
        setActiveTab('ranks');
      } else if (tabParam === 'calculator' || tabParam === 'calc') {
        setActiveTab('calculator');
      } else if (tabParam === 'history' || tabParam === 'logs') {
        setActiveTab('history');
      } else if (params.get('ref')) {
        // If a referral link is opened, switch directly to Stake tab so user can immediately stake under their upline
        setActiveTab('stake');
      }
    }
  }, []);

  const handleTabSelect = (tabId: StakingTab) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const targetChainId = getDefaultChainId();
  const isWrongNetwork = isConnected && chain && chain.id !== targetChainId;

  const activeTabMeta = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-black dark:text-[#BFFF00]" />
              UVBE Staking
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-black bg-[#BFFF00]/20 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/40">
              {dynamicApy}% Live APY
            </span>
            {lifetimeCapInfo.isCapReached && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                {lifetimeCapInfo.hasUnlocked3x ? '3× Cap Reached' : '2× Cap Reached'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
          <Link
            href="/contracts"
            className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-[#BFFF00] hover:text-black dark:hover:bg-[#BFFF00] dark:hover:text-black text-foreground border border-black/20 dark:border-white/20 transition-all"
            title="View Verified Contracts"
          >
            <FileCode2 className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span>Contracts</span>
          </Link>
          <div className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-black text-white dark:bg-white/10 dark:text-white border border-black dark:border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#BFFF00] animate-pulse" />
            <span>{CHAIN_CONFIG.name}</span>
          </div>
          <div className="flex items-center space-x-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-[#BFFF00]/15 text-black dark:text-[#BFFF00] border border-black dark:border-[#BFFF00]/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>10 Tiers</span>
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

      {/* ── Persistent Top KPI Highlights ── */}
      <StakingHeroCards />

      {/* ── Section Navigation Bar (Responsive Clean View) ── */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-1.5 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.85)]">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSelect(tab.id)}
                className={`flex-1 min-w-[125px] sm:min-w-0 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer touch-manipulation select-none active:scale-95 ${
                  isActive
                    ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black shadow-[2px_2px_0_#000] dark:shadow-none'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#BFFF00] dark:text-black' : 'text-slate-500'}`}
                />
                <span className="hidden sm:inline font-extrabold">{tab.label}</span>
                <span className="sm:hidden font-extrabold">{tab.mobileLabel}</span>
                {tab.badge && (
                  <span
                    className={`hidden md:inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-black ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {tab.id === 'stake' && rewards.totalClaimable > 0n && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Tab Header Context ── */}
      <div className="px-1 py-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <activeTabMeta.icon className="w-5 h-5 text-black dark:text-[#BFFF00]" />
          <div>
            <h2 className="text-base font-black text-foreground">{activeTabMeta.label}</h2>
            <p className="text-xs text-muted-foreground">{activeTabMeta.description}</p>
          </div>
        </div>
      </div>

      {/* ── Section Content Panes ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            <ProtocolCapitalCard />
            <PermanentStakePositionCard />
          </div>
        </div>
      )}

      {activeTab === 'stake' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            <StakeActionForm />
            <RewardsClaimPanel />
          </div>
          <PermanentStakePositionCard />
        </div>
      )}

      {activeTab === 'referrals' && (
        <div className="space-y-4">
          <ReferralNetworkView />
        </div>
      )}

      {activeTab === 'ranks' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            <RankProgressionCard />
            <DaoLeadershipPoolCard />
          </div>
        </div>
      )}

      {activeTab === 'calculator' && (
        <div className="space-y-4">
          <StakingYieldCalculator />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <StakingTransactionHistory />
        </div>
      )}
    </div>
  );
}
