'use client';

import React from 'react';
import { TableCard } from '../../../components/ui/TableCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { History } from 'lucide-react';

export default function AdminTransactionsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Live Protocol Activity Stream
            </h1>
            <StatusBadge status="Admin" label="GOVERNANCE" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time on-chain transaction monitoring across Controller, Vault, SwapAdapter, and
            Treasury.
          </p>
        </div>
      </div>

      <TableCard
        title="Auditable Protocol Transaction Feed"
        subtitle="Executed transactions on Base Sepolia testnet"
        icon={History}
      >
        <EmptyState
          title="No On-Chain Transactions Logged"
          description="Real-time transaction logs will populate automatically as deposits, redemptions, and rebalances execute on Base Sepolia."
          icon={History}
        />
      </TableCard>
    </div>
  );
}
