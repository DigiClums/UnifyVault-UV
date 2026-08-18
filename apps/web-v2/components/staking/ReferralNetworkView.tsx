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
} from 'lucide-react';
import { formatUnits } from 'viem';
import { useStaking } from '../../hooks/useStaking';
import { APP_DOMAIN, getExplorerBaseUrl } from '../../constants';

const GENERATION_TIERS = [
  {
    gen: 1,
    name: 'Direct Referral (Gen 1)',
    bps: 500,
    percent: '5.00%',
    req: '≥ 1 Active Direct, ≥ 50 UVBE',
  },
  {
    gen: 2,
    name: 'Generation 2 Override',
    bps: 200,
    percent: '2.00%',
    req: '≥ 2 Active Directs, ≥ 100 UVBE',
  },
  {
    gen: 3,
    name: 'Generation 3 Override',
    bps: 150,
    percent: '1.50%',
    req: '≥ 2 Active Directs, ≥ 100 UVBE',
  },
  {
    gen: 4,
    name: 'Generation 4 Override',
    bps: 100,
    percent: '1.00%',
    req: '≥ 3 Active Directs, ≥ 250 UVBE',
  },
  {
    gen: 5,
    name: 'Generation 5 Override',
    bps: 75,
    percent: '0.75%',
    req: '≥ 3 Active Directs, ≥ 250 UVBE',
  },
  {
    gen: 6,
    name: 'Generation 6 Override',
    bps: 50,
    percent: '0.50%',
    req: '≥ 4 Active Directs, ≥ 500 UVBE',
  },
  {
    gen: 7,
    name: 'Generation 7 Override',
    bps: 50,
    percent: '0.50%',
    req: '≥ 4 Active Directs, ≥ 500 UVBE',
  },
  {
    gen: 8,
    name: 'Generation 8 Override',
    bps: 25,
    percent: '0.25%',
    req: '≥ 5 Active Directs, ≥ 1,000 UVBE',
  },
  {
    gen: 9,
    name: 'Generation 9 Override',
    bps: 25,
    percent: '0.25%',
    req: '≥ 5 Active Directs, ≥ 1,000 UVBE',
  },
  {
    gen: 10,
    name: 'Generation 10 Override',
    bps: 25,
    percent: '0.25%',
    req: '≥ 5 Active Directs, ≥ 1,000 UVBE',
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
  } = useStaking();

  const [copied, setCopied] = useState<boolean>(false);
  const explorerBase = getExplorerBaseUrl(chain?.id);

  const referralUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/staking?ref=${userAddress || ''}`
      : `${APP_DOMAIN}/staking?ref=${userAddress || ''}`;

  const handleCopyLink = () => {
    if (!userAddress) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTeamVol = Number(formatUnits(teamVolume, 18)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_rgba(0,0,0,0.85)] space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-black dark:text-[#BFFF00]" />
            10-Generation Referral Network
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Build your team volume and unlock up to 10 generations of matching staking commissions.
          </p>
        </div>
      </div>

      {/* Referral Link Generator Banner */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-black dark:border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>Your Unique Referral Link</span>
          <span className="text-[10px] text-slate-500 font-mono">
            Binds new stakers permanently
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={userAddress ? referralUrl : 'Connect wallet to generate referral link'}
            className="w-full bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white px-3 py-2 rounded-lg border border-slate-300 dark:border-white/15 focus:outline-none select-all"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!userAddress}
            className="px-3 py-2 rounded-lg bg-[#BFFF00] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_#000] hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-black" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-black" />
            )}
            {copied ? 'COPIED' : 'COPY'}
          </button>
        </div>
      </div>

      {/* Network Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Bound Referrer */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
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
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
            Direct Referrals
          </div>
          <div className="text-lg font-mono font-black text-slate-900 dark:text-white flex items-center gap-2">
            {directsList.length}{' '}
            <span className="text-xs font-normal text-slate-500">({activeDirectCount} Active)</span>
          </div>
        </div>

        {/* 10-Gen Team Volume */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10">
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
            10-Gen Team Volume
          </div>
          <div className="text-lg font-mono font-black text-slate-900 dark:text-white">
            {formattedTeamVol} <span className="text-xs font-bold text-slate-500">UVBE</span>
          </div>
        </div>
      </div>

      {/* Generation Commission Schedule Table */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
          10-Generation Commission Schedule & Unlock Requirements
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="px-3.5 py-2.5">Generation</th>
                <th className="px-3.5 py-2.5">Commission Rate</th>
                <th className="px-3.5 py-2.5">Unlock Qualification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono">
              {GENERATION_TIERS.map((tier) => (
                <tr
                  key={tier.gen}
                  className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-3.5 py-2 font-sans font-semibold text-slate-900 dark:text-white">
                    {tier.name}
                  </td>
                  <td className="px-3.5 py-2 font-black text-emerald-600 dark:text-[#BFFF00]">
                    {tier.percent}
                  </td>
                  <td className="px-3.5 py-2 text-slate-600 dark:text-slate-400 font-sans text-[11px]">
                    {tier.req}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
