'use client';

import React from 'react';
import { TableCard } from '../../components/ui/TableCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatCard } from '../../components/ui/StatCard';
import { History, RefreshCw, DollarSign, Layers } from 'lucide-react';

export default function ActivityPage() {
  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Live Protocol Event Timeline
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-xs font-semibold">
              Base Sepolia
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Auditable transaction stream of user deposits, share redemptions, strategy rebalances,
            and protocol fee accrual.
          </p>
        </div>
      </div>

      {/* Verified On-Chain Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Network"
          value="Base Sepolia"
          subtitle="Chain ID 84532"
          icon={History}
          glowColor="blue"
        />
        <StatCard
          title="Protocol Engine"
          value="V2 Active"
          subtitle="Stateless Custody"
          icon={Layers}
          glowColor="emerald"
        />
        <StatCard
          title="Oracle Keeper"
          value="Active"
          subtitle="Coinbase Spot Feeds"
          icon={RefreshCw}
          glowColor="purple"
        />
      </div>

      {/* Event Timeline Table Card */}
      <TableCard
        title="Protocol Event Timeline"
        subtitle="On-chain activity logs for Deposit, Redeem, Rebalance, and FeeCollection"
        icon={History}
      >
        <EmptyState
          title="No On-Chain Activity Logged"
          description="Contract events will appear here in real-time as users execute deposits, redemptions, and admin operations on Base Sepolia."
          icon={History}
        />
      </TableCard>
    </div>
  );
}
