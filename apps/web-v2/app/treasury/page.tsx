'use client';

import React from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { TREASURY_ABI, CONTROLLER_ABI } from '../../lib/contracts';
import { FALLBACK_ADDRESSES } from '../../constants';
import { formatUSD, formatUnits } from '../../lib/math';
import { StatCard } from '../../components/ui/StatCard';
import { TableCard } from '../../components/ui/TableCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Vault, DollarSign, ArrowUpRight, ShieldCheck, History, RefreshCw } from 'lucide-react';

export default function TreasuryPage() {
  const { data, refetch } = useReadContracts({
    contracts: [
      // 0. Treasury USDC balance
      {
        address: FALLBACK_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [FALLBACK_ADDRESSES.USDC],
      },
      // 1. Treasury WBTC balance
      {
        address: FALLBACK_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [FALLBACK_ADDRESSES.WBTC],
      },
      // 2. Treasury WETH balance
      {
        address: FALLBACK_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [FALLBACK_ADDRESSES.WETH],
      },
      // 3. Controller deposit fee Bps
      {
        address: FALLBACK_ADDRESSES.CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: 'getDepositFeeBps',
      },
      // 4. Controller redeem fee Bps
      {
        address: FALLBACK_ADDRESSES.CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: 'getRedeemFeeBps',
      },
    ],
    query: {
      refetchInterval: 5_000,
    },
  });

  const usdcBalRaw = (data?.[0]?.result as bigint) || 0n;
  const wbtcBalRaw = (data?.[1]?.result as bigint) || 0n;
  const wethBalRaw = (data?.[2]?.result as bigint) || 0n;

  const depositFeeBps = (data?.[3]?.result as bigint) || 25n;
  const redeemFeeBps = (data?.[4]?.result as bigint) || 200n;

  const usdcBalFormatted = formatUnits(usdcBalRaw, 6);
  const usdcUSD = Number(usdcBalFormatted);

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Protocol Treasury & Fee Reserves
            </h1>
            <StatusBadge status="Healthy" label="Operational" />
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Safeguarding protocol-owned fee reserves custodied inside Treasury contract
            (0x0F51D2...13D).
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-surface border border-border-subtle text-slate-300 hover:text-white text-xs font-semibold self-start sm:self-auto transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Balances</span>
        </button>
      </div>

      {/* Real On-Chain Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current USDC Reserves"
          value={formatUSD(usdcUSD)}
          subtitle={`${usdcBalFormatted} USDC`}
          icon={Vault}
          glowColor="blue"
        />
        <StatCard
          title="Protocol USDC Balance"
          value={formatUSD(usdcUSD)}
          subtitle="Real on-chain balance"
          icon={DollarSign}
          glowColor="emerald"
        />
        <StatCard
          title="Configured Deposit Fee"
          value={`${(Number(depositFeeBps) / 100).toFixed(2)}%`}
          subtitle={`${depositFeeBps.toString()} BPS`}
          icon={ArrowUpRight}
          glowColor="purple"
        />
        <StatCard
          title="Configured Redeem Fee"
          value={`${(Number(redeemFeeBps) / 100).toFixed(2)}%`}
          subtitle={`${redeemFeeBps.toString()} BPS`}
          icon={ShieldCheck}
          glowColor="cyan"
        />
      </div>

      {/* Treasury Asset Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <TableCard
            title="Treasury Asset Reserve Balances"
            subtitle="Protocol-owned assets custodied inside Treasury contract"
            icon={Vault}
          >
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-slate-400 font-semibold">
                  <th className="py-3 px-3">Asset</th>
                  <th className="py-3 px-3">Raw Balance</th>
                  <th className="py-3 px-3">Formatted Amount</th>
                  <th className="py-3 px-3 text-right">USD Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/40">
                <tr className="hover:bg-card/40 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-white flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-extrabold text-[10px]">
                      USD
                    </div>
                    <span>USDC</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-400">{usdcBalRaw.toString()}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-200 font-bold">
                    {formatUnits(usdcBalRaw, 6)} USDC
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-400 font-bold">
                    {formatUSD(usdcUSD)}
                  </td>
                </tr>
                <tr className="hover:bg-card/40 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-white flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-extrabold text-[10px]">
                      BTC
                    </div>
                    <span>WBTC</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-400">{wbtcBalRaw.toString()}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-200 font-bold">
                    {formatUnits(wbtcBalRaw, 8)} WBTC
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-400 font-bold">
                    $0.00
                  </td>
                </tr>
                <tr className="hover:bg-card/40 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-white flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-extrabold text-[10px]">
                      ETH
                    </div>
                    <span>WETH</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-400">{wethBalRaw.toString()}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-200 font-bold">
                    {formatUnits(wethBalRaw, 18)} WETH
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-400 font-bold">
                    $0.00
                  </td>
                </tr>
              </tbody>
            </table>
          </TableCard>
        </div>

        {/* Governance Controls Panel */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base">
            <ShieldCheck className="w-5 h-5 text-accent-blue" />
            <span>Treasury Governance</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Only accounts with <code className="text-accent-blue font-mono">GOVERNANCE_ROLE</code>{' '}
            can release fee revenue from Treasury.
          </p>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-border-subtle space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Withdrawable USDC</span>
              <span className="font-mono text-white font-bold">{formatUSD(usdcUSD)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Vault Contract</span>
              <span className="font-mono text-accent-blue text-[11px]">0x0F51D2...13D</span>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/admin/treasury"
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-accent-blue text-white font-bold text-xs shadow-glow hover:bg-blue-600 transition-all"
            >
              <span>Manage Treasury In Admin</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Treasury Withdrawal History - EmptyState if no indexed releases */}
      <TableCard
        title="Recent Treasury Releases Log"
        subtitle="Auditable record of governance withdrawals"
        icon={History}
      >
        <EmptyState
          title="No Treasury Releases Recorded"
          description="Fee revenue is currently retained inside the Treasury contract reserves."
          icon={History}
        />
      </TableCard>
    </div>
  );
}
