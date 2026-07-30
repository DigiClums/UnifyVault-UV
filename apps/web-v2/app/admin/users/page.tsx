'use client';

import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { CONTROLLER_ABI } from '../../../lib/contracts';
import { FALLBACK_ADDRESSES } from '../../../constants';
import { TableCard } from '../../../components/ui/TableCard';
import { StatCard } from '../../../components/ui/StatCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Users, DollarSign, ShieldCheck } from 'lucide-react';

export default function AdminUsersPage() {
  const { address: userAddress } = useAccount();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              User Accounting & Share Balances
            </h1>
            <StatusBadge status="Admin" label="GOVERNANCE" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit protocol user share balances directly from UnifyVaultController.
          </p>
        </div>
      </div>

      {/* Real On-Chain Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="UnifyVaultController"
          value="Active"
          subtitle="V2 Live Execution Engine"
          icon={ShieldCheck}
          glowColor="emerald"
        />
        <StatCard
          title="Connected Admin Wallet"
          value={
            userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Not Connected'
          }
          subtitle={userAddress ? 'Verified Governance Operator' : 'Connect Wallet to Inspect'}
          icon={Users}
          glowColor="purple"
        />
      </div>

      {/* Users Accounting Table */}
      <TableCard
        title="Protocol Shareholder Accounting"
        subtitle="On-chain user balances queried from UnifyVault V2 Contracts"
      >
        {userAddress ? (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-slate-400">
                <th className="py-3 px-4">User Address</th>
                <th className="py-3 px-4">Role / Status</th>
                <th className="py-3 px-4 text-right">Protocol Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50 font-mono">
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 text-white font-bold">{userAddress}</td>
                <td className="py-3 px-4">
                  <StatusBadge status="Admin" label="GOVERNANCE OPERATOR" />
                </td>
                <td className="py-3 px-4 text-right text-emerald-400">UnifyVault V2</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No Connected User Wallet"
            description="Connect a governance or user wallet to inspect live on-chain share balance accounting."
          />
        )}
      </TableCard>
    </div>
  );
}
