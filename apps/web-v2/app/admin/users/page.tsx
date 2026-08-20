'use client';

import React, { useState } from 'react';
import { useUserAccounting } from '../../../hooks/useUserAccounting';
import { UserLookupBar } from '../../../components/accounting/UserLookupBar';
import { UserOverviewCard } from '../../../components/accounting/UserOverviewCard';
import { CostBasisSection } from '../../../components/accounting/CostBasisSection';
import { PerformanceSection } from '../../../components/accounting/PerformanceSection';
import { EscrowStatusCard } from '../../../components/accounting/EscrowStatusCard';
import { AccountingMigrationSection } from '../../../components/accounting/AccountingMigrationSection';
import { AccountingEventHistory } from '../../../components/accounting/AccountingEventHistory';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Users, Wallet, Activity, ShieldAlert, RefreshCw, History, Layers } from 'lucide-react';

export default function AdminUsersPage() {
  const [inspectedAddress, setInspectedAddress] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<
    'overview' | 'costbasis' | 'performance' | 'escrow' | 'migration' | 'activity'
  >('overview');

  const state = useUserAccounting(inspectedAddress);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              User Accounting & Performance Console
            </h1>
            <StatusBadge status="Admin" label="ACCOUNTING ENGINE" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time on-chain cost basis inspection, realized/unrealized PnL audits, and historical
            accounting migration.
          </p>
        </div>

        <button
          type="button"
          onClick={() => state.refetch()}
          disabled={state.isLoading}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground text-xs font-semibold self-start sm:self-auto transition-colors disabled:opacity-50 min-h-[38px]"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${state.isLoading ? 'animate-spin text-purple-400' : ''}`}
          />
          <span>Refresh On-Chain State</span>
        </button>
      </div>

      {/* User Search & Lookup */}
      <UserLookupBar
        currentAddress={inspectedAddress || state.targetAddress || ''}
        onSelectAddress={(addr) => setInspectedAddress(addr)}
      />

      {/* Inspected Account Body */}
      {state.isValidAddress ? (
        <div className="space-y-6">
          {/* Navigation Sub-Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar border-b border-border-subtle/60 pb-1">
            <button
              type="button"
              onClick={() => setCurrentTab('overview')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                currentTab === 'overview'
                  ? 'bg-purple-600 text-white shadow-glow'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Account Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('costbasis')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                currentTab === 'costbasis'
                  ? 'bg-purple-600 text-white shadow-glow'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Cost Basis Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('performance')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                currentTab === 'performance'
                  ? 'bg-purple-600 text-white shadow-glow'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Performance & ROI</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('escrow')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                currentTab === 'escrow'
                  ? 'bg-purple-600 text-white shadow-glow'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Escrow Context</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('migration')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                currentTab === 'migration'
                  ? 'bg-purple-600 text-white shadow-glow'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Accounting Migration</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('activity')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
                currentTab === 'activity'
                  ? 'bg-purple-600 text-white shadow-glow'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit Logs ({state.events.length})</span>
            </button>
          </div>

          {/* Sub-Tab Panels */}
          {currentTab === 'overview' && (
            <div className="space-y-6">
              <UserOverviewCard state={state} />
              <CostBasisSection state={state} />
              <PerformanceSection state={state} />
            </div>
          )}

          {currentTab === 'costbasis' && <CostBasisSection state={state} />}

          {currentTab === 'performance' && <PerformanceSection state={state} />}

          {currentTab === 'escrow' && <EscrowStatusCard state={state} onRefresh={state.refetch} />}

          {currentTab === 'migration' && (
            <AccountingMigrationSection state={state} onRefresh={state.refetch} />
          )}

          {currentTab === 'activity' && <AccountingEventHistory state={state} />}
        </div>
      ) : (
        <EmptyState
          title="No User Wallet Inspected"
          description="Enter an EVM wallet address above or click 'Inspect My Wallet' to view live on-chain cost basis and performance analytics."
        />
      )}
    </div>
  );
}
