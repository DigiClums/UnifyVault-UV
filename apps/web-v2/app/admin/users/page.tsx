'use client';

import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { COST_BASIS_ABI } from '../../../lib/contracts';
import { FALLBACK_ADDRESSES } from '../../../constants';
import { formatUSD, formatUnits } from '../../../lib/math';
import { TableCard } from '../../../components/ui/TableCard';
import { StatCard } from '../../../components/ui/StatCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Users, DollarSign, PieChart, ShieldCheck } from 'lucide-react';

export default function AdminUsersPage() {
  const { address: userAddress } = useAccount();

  // Read connected user's real cost basis from CostBasisManager
  const { data: costBasisData } = useReadContract({
    address: FALLBACK_ADDRESSES.COST_BASIS,
    abi: COST_BASIS_ABI,
    functionName: 'costBasis',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: 5_000,
    },
  });

  const investedAssetsRaw = (costBasisData?.[0] as bigint) || 0n;
  const sharesOwnedRaw = (costBasisData?.[1] as bigint) || 0n;

  const investedUSD = Number(formatUnits(investedAssetsRaw, 18));
  const sharesOwned = formatUnits(sharesOwnedRaw, 18);

  const hasCostBasis = investedAssetsRaw > 0n || sharesOwnedRaw > 0n;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              User Accounting & Cost Basis
            </h1>
            <StatusBadge status="Admin" label="GOVERNANCE" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit protocol user share balances and cost basis accounting directly from
            CostBasisManager (0xef0637...0A6).
          </p>
        </div>
      </div>

      {/* Real On-Chain Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="CostBasisManager"
          value="Active"
          subtitle="0xef0637...0A6"
          icon={ShieldCheck}
          glowColor="blue"
        />
        <StatCard
          title="Connected User Invested"
          value={formatUSD(investedUSD)}
          subtitle={`${investedAssetsRaw.toString()} raw`}
          icon={DollarSign}
          glowColor="purple"
        />
        <StatCard
          title="Connected User Shares"
          value={sharesOwned}
          subtitle="UV-INDEX Shares"
          icon={PieChart}
          glowColor="emerald"
        />
      </div>

      {/* Users Accounting Table */}
      <TableCard
        title="Protocol User Shareholder Registry"
        subtitle="On-chain cost basis data queried from CostBasisManager contract"
        icon={ShieldCheck}
      >
        {hasCostBasis && userAddress ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-slate-400 font-semibold">
                <th className="py-3.5 px-3">User Wallet Address</th>
                <th className="py-3.5 px-3">Index Shares Owned</th>
                <th className="py-3.5 px-3">Cost Basis (USD)</th>
                <th className="py-3.5 px-3 text-right">On-Chain Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40 font-mono">
              <tr className="hover:bg-card/40 transition-colors">
                <td className="py-4 px-3 font-sans font-bold text-white flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-[10px]">
                    0x
                  </div>
                  <span>{userAddress}</span>
                </td>
                <td className="py-4 px-3 text-slate-200 font-bold">{sharesOwned} UV-INDEX</td>
                <td className="py-4 px-3 text-emerald-400 font-bold">{formatUSD(investedUSD)}</td>
                <td className="py-4 px-3 text-right font-sans">
                  <StatusBadge status="Healthy" label="Recorded" showPulse={false} />
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No Depositor Records Found"
            description="No active cost basis entries were found for the connected wallet on-chain. Connect an active depositor account to audit cost basis metrics."
            icon={Users}
          />
        )}
      </TableCard>
    </div>
  );
}
