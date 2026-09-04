'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  Users,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Layers,
  ChevronRight,
  Sparkles,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { formatUnits } from 'viem';
import { useStaking, MIN_ACTIVE_STAKE } from '../../hooks/useStaking';
import { APP_DOMAIN, getExplorerBaseUrl } from '../../constants';

const GENERATION_TIERS = [
  {
    gen: 1,
    name: 'Generation 1 (Direct)',
    bps: 500,
    percent: '5.00%',
    activeDirectsNeeded: 1,
    req: 'Active Direct (Personal Net Stake ≥ 47.5 UVBE)',
  },
  {
    gen: 2,
    name: 'Generation 2 Override',
    bps: 200,
    percent: '2.00%',
    activeDirectsNeeded: 2,
    req: '≥ 2 Active Directs',
  },
  {
    gen: 3,
    name: 'Generation 3 Override',
    bps: 150,
    percent: '1.50%',
    activeDirectsNeeded: 3,
    req: '≥ 3 Active Directs',
  },
  {
    gen: 4,
    name: 'Generation 4 Override',
    bps: 100,
    percent: '1.00%',
    activeDirectsNeeded: 4,
    req: '≥ 4 Active Directs',
  },
  {
    gen: 5,
    name: 'Generation 5 Override',
    bps: 75,
    percent: '0.75%',
    activeDirectsNeeded: 5,
    req: '≥ 5 Active Directs',
  },
  {
    gen: 6,
    name: 'Generation 6 Override',
    bps: 50,
    percent: '0.50%',
    activeDirectsNeeded: 6,
    req: '≥ 6 Active Directs',
  },
  {
    gen: 7,
    name: 'Generation 7 Override',
    bps: 50,
    percent: '0.50%',
    activeDirectsNeeded: 7,
    req: '≥ 7 Active Directs',
  },
  {
    gen: 8,
    name: 'Generation 8 Override',
    bps: 25,
    percent: '0.25%',
    activeDirectsNeeded: 8,
    req: '≥ 8 Active Directs',
  },
  {
    gen: 9,
    name: 'Generation 9 Override',
    bps: 25,
    percent: '0.25%',
    activeDirectsNeeded: 9,
    req: '≥ 9 Active Directs',
  },
  {
    gen: 10,
    name: 'Generation 10 Override',
    bps: 25,
    percent: '0.25%',
    activeDirectsNeeded: 10,
    req: '≥ 10 Active Directs',
  },
];

export function ReferralNetworkView() {
  const { address: userAddress, chain } = useAccount();
  const {
    boundReferrer,
    hasGenesisReferrer,
    directsList,
    activeDirectCount,
    teamVolume,
    genesisReferrer,
    rewards,
    isUserActive,
  } = useStaking();

  const [copied, setCopied] = useState<boolean>(false);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState<boolean>(false);
  const explorerBase = getExplorerBaseUrl(chain?.id);

  const referralUrl = useMemo(() => {
    if (!userAddress) return '';
    // Prefer authoritative production domain so shared links are always clean and accessible worldwide
    const baseDomain =
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      !window.location.hostname.includes('127.0.0.1')
        ? window.location.origin
        : APP_DOMAIN;
    return `${baseDomain}/staking?ref=${userAddress}`;
  }, [userAddress]);

  const handleCopyLink = () => {
    if (!userAddress || !referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTeamVol = Number(formatUnits(teamVolume, 18)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const totalAffiliateEarnings = rewards.directReward + rewards.generationReward;
  const formattedAffiliateEarnings = Number(formatUnits(totalAffiliateEarnings, 18)).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 4 },
  );

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_rgba(0,0,0,0.85)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-black dark:text-[#BFFF00]" />
            10-Tier Referral & Affiliate Network
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Build your community and qualify for up to 10 tiers of referral staking rewards.
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
            Affiliate Rewards Accrued
          </span>
          <div className="text-sm sm:text-base font-mono font-black text-emerald-600 dark:text-emerald-400">
            {formattedAffiliateEarnings} UVBE
          </div>
        </div>
      </div>

      {/* Referral Link Generator Banner */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-black dark:border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-black dark:text-[#BFFF00]" />
            Your Unique Referral Link
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Invites partners to your Generation 1
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={userAddress ? referralUrl : 'Connect wallet to generate referral link'}
            className="w-full bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white px-3 py-2.5 rounded-lg border border-slate-300 dark:border-white/15 focus:outline-none select-all"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!userAddress}
            className="px-3.5 py-2.5 rounded-lg bg-[#BFFF00] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_#000] hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-black" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-black" />
            )}
            {copied ? 'COPIED' : 'COPY LINK'}
          </button>
        </div>
      </div>

      {/* Network Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Bound Referrer */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase">
            Your Referrer (Upline)
          </div>
          <div className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
            {hasGenesisReferrer ? (
              <a
                href={`${explorerBase}/address/${boundReferrer}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center gap-1 text-blue-500"
              >
                {boundReferrer.slice(0, 8)}...{boundReferrer.slice(-6)}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-slate-400">Genesis Root (Unbound)</span>
            )}
          </div>
        </div>

        {/* Direct Referrals Count */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Direct Referrals</div>
          <div className="text-lg font-mono font-black text-slate-900 dark:text-white flex items-center gap-2">
            {directsList.length}{' '}
            <span className="text-xs font-normal text-slate-500">({activeDirectCount} Active)</span>
          </div>
        </div>

        {/* 10-Gen Team Volume */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase">10-Gen Team Volume</div>
          <div className="text-lg font-mono font-black text-slate-900 dark:text-white">
            {formattedTeamVol} <span className="text-xs font-bold text-slate-500">UVBE</span>
          </div>
        </div>
      </div>

      {/* Generation Commission Schedule Table (Collapsible) */}
      <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsScheduleExpanded((prev) => !prev)}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                10-Generation Commission Schedule & Live Qualification
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Your Active Directs: {activeDirectCount} · Click to{' '}
                {isScheduleExpanded ? 'collapse' : 'view full tier rates'}
              </span>
            </div>
          </div>
          <ChevronRight
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
              isScheduleExpanded ? 'rotate-90' : ''
            }`}
          />
        </button>

        {isScheduleExpanded && (
          <div className="overflow-x-auto border-t border-slate-200 dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-3.5 py-2.5">Generation Tier</th>
                  <th className="px-3.5 py-2.5">Commission Rate</th>
                  <th className="px-3.5 py-2.5">Unlock Criteria</th>
                  <th className="px-3.5 py-2.5 text-right">Your Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono">
                {GENERATION_TIERS.map((tier) => {
                  const isGen1Qualified = tier.gen === 1 && isUserActive;
                  const isHigherGenQualified =
                    tier.gen > 1 && isUserActive && activeDirectCount >= tier.activeDirectsNeeded;
                  const isQualified = isGen1Qualified || isHigherGenQualified;

                  return (
                    <tr
                      key={tier.gen}
                      className={`transition-colors ${
                        isQualified
                          ? 'bg-[#BFFF00]/5 dark:bg-[#BFFF00]/10'
                          : 'hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <td className="px-3.5 py-2.5 font-sans font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {isQualified ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        {tier.name}
                      </td>
                      <td className="px-3.5 py-2.5 font-black text-emerald-600 dark:text-[#BFFF00]">
                        {tier.percent}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 font-sans text-[11px]">
                        {tier.req}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        {isQualified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            QUALIFIED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-white/10">
                            LOCKED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
