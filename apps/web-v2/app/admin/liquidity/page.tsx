'use client';

import React, { useState } from 'react';
import { useLiquidityAdmin } from '../../../hooks/useLiquidityAdmin';
import { LiquidityOverviewCards } from '../../../components/liquidity/LiquidityOverviewCards';
import { LiquidityThresholdsEditor } from '../../../components/liquidity/LiquidityThresholdsEditor';
import { LiquidityOperationsSection } from '../../../components/liquidity/LiquidityOperationsSection';
import { LiquidityEventHistory } from '../../../components/liquidity/LiquidityEventHistory';
import { StatCard } from '../../../components/ui/StatCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  Droplets,
  ShieldCheck,
  RefreshCw,
  Sliders,
  History,
  Info,
  ArrowDownCircle,
  ArrowUpCircle,
  Vault,
} from 'lucide-react';

export default function AdminLiquidityPage() {
  const {
    liquidityManagerAddress,
    custodyVault,
    explorerBaseUrl,
    isGovernanceAdmin,
    assetStatuses,
    events,
    isLoading,
    isLoadingEvents,
    refetch,
  } = useLiquidityAdmin();

  const [currentTab, setCurrentTab] = useState<
    'overview' | 'operations' | 'thresholds' | 'activity'
  >('overview');

  const hasBreaches = assetStatuses.some((a) => a.needsRefill || a.needsSweep);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Operational Liquidity & Reserve Console
            </h1>
            <StatusBadge
              status={hasBreaches ? 'Warning' : 'Healthy'}
              label={hasBreaches ? 'ATTENTION REQUIRED' : 'LIQUIDITY BALANCED'}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational liquidity buffer management, excess sweep triggers, and reserve accounting
            on LiquidityManager.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground text-xs font-semibold self-start sm:self-auto transition-colors disabled:opacity-50 min-h-[38px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Refresh Liquidity Data</span>
        </button>
      </div>

      {/* Architecture Notice */}
      <div className="rounded-xl bg-card/60 border border-border-subtle p-4 space-y-2 text-xs">
        <div className="flex items-center space-x-2 font-bold text-foreground">
          <Info className="w-4 h-4 text-purple-400" />
          <span>Liquidity Management Architecture</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          <strong className="text-foreground">LiquidityManager (0xd1DC...227F)</strong> segregates
          assets inside <strong className="text-foreground">CustodyVault</strong> into an active{' '}
          <strong className="text-foreground">Operational Buffer</strong> (for instant redemptions
          and swaps) and <strong className="text-foreground">Reserve Liquidity</strong> (for
          institutional safety). Thresholds trigger automated refill or sweep events when
          operational buffers deviate outside target parameters.
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monitored Assets"
          value={`${assetStatuses.length} Tokens`}
          subtitle="cbBTC · WETH · USDC"
          icon={Droplets}
          glowColor="purple"
        />

        <StatCard
          title="Threshold Engine"
          value="10% Target"
          subtitle="5% Refill · 15% Sweep"
          icon={Sliders}
          glowColor="blue"
        />

        <StatCard
          title="Refill Alerts"
          value={assetStatuses.filter((a) => a.needsRefill).length > 0 ? 'ACTIVE DEFICIT' : 'NONE'}
          subtitle="Operational Reserve Check"
          icon={ArrowDownCircle}
          glowColor={assetStatuses.some((a) => a.needsRefill) ? 'amber' : 'emerald'}
        />

        <StatCard
          title="Vault Integration"
          value="CustodyVault"
          subtitle={`${custodyVault.slice(0, 6)}...${custodyVault.slice(-4)}`}
          icon={Vault}
          glowColor="cyan"
        />
      </div>

      {/* Sub-Tabs Navigation */}
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
          <Droplets className="w-4 h-4" />
          <span>Liquidity Balances & Status</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('operations')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'operations'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refill & Sweep Operations</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('thresholds')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'thresholds'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Threshold Configuration</span>
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
          <span>Audit Logs ({events.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      {currentTab === 'overview' && (
        <LiquidityOverviewCards assetStatuses={assetStatuses} explorerBaseUrl={explorerBaseUrl} />
      )}

      {currentTab === 'operations' && (
        <LiquidityOperationsSection
          liquidityManagerAddress={liquidityManagerAddress}
          explorerBaseUrl={explorerBaseUrl}
          isGovernanceAdmin={isGovernanceAdmin}
          assetStatuses={assetStatuses}
          onRefresh={refetch}
        />
      )}

      {currentTab === 'thresholds' && (
        <LiquidityThresholdsEditor
          liquidityManagerAddress={liquidityManagerAddress}
          explorerBaseUrl={explorerBaseUrl}
          isGovernanceAdmin={isGovernanceAdmin}
          assetStatuses={assetStatuses}
          onRefresh={refetch}
        />
      )}

      {currentTab === 'activity' && (
        <LiquidityEventHistory
          events={events}
          isLoadingEvents={isLoadingEvents}
          explorerBaseUrl={explorerBaseUrl}
        />
      )}
    </div>
  );
}
