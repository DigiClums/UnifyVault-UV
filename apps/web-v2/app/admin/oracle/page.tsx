'use client';

import React, { useState } from 'react';
import { useOracleAdmin } from '../../../hooks/useOracleAdmin';
import { OracleFeedCard } from '../../../components/oracle/OracleFeedCard';
import { CircuitBreakerSection } from '../../../components/oracle/CircuitBreakerSection';
import { OracleConfigSection } from '../../../components/oracle/OracleConfigSection';
import { ChainlinkFeedAdminSection } from '../../../components/oracle/ChainlinkFeedAdminSection';
import { OracleEventHistory } from '../../../components/oracle/OracleEventHistory';
import { StatCard } from '../../../components/ui/StatCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  Zap,
  RefreshCw,
  Sliders,
  Settings,
  Link2,
  History,
  Info,
} from 'lucide-react';

export default function AdminOraclePage() {
  const {
    oracleManagerAddress,
    chainlinkProviderAddress,
    explorerBaseUrl,
    isGovernanceAdmin,
    isChainlinkAdmin,
    assetStatuses,
    events,
    isLoading,
    isLoadingEvents,
    refetch,
  } = useOracleAdmin();

  const [currentTab, setCurrentTab] = useState<
    'status' | 'breaker' | 'config' | 'chainlink' | 'activity'
  >('status');

  const allHealthy = assetStatuses.every((a) => a.isHealthy && a.enabled);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Oracle & Circuit Breaker Risk Console
            </h1>
            <StatusBadge
              status={allHealthy ? 'Healthy' : 'Warning'}
              label={allHealthy ? 'FEEDS NOMINAL' : 'ATTENTION REQUIRED'}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            On-chain price feeds, heartbeat telemetry, max deviation circuit breakers, and
            AggregatorV3 provider routing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground text-xs font-semibold self-start sm:self-auto transition-colors disabled:opacity-50 min-h-[38px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Refresh Oracle Telemetry</span>
        </button>
      </div>

      {/* Architecture Notice */}
      <div className="rounded-xl bg-card/60 border border-border-subtle p-4 space-y-2 text-xs">
        <div className="flex items-center space-x-2 font-bold text-foreground">
          <Info className="w-4 h-4 text-purple-400" />
          <span>Institutional Pricing Pipeline Architecture</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          <strong className="text-foreground">OracleManager (0xc96d...73BF)</strong> acts as the
          central coordinator on Base Sepolia. It queries the configured{' '}
          <strong className="text-foreground">Primary Provider (ChainlinkOracleProvider)</strong>,
          validates price freshness and deviation against{' '}
          <code className="text-purple-400 font-mono">lastValidPrice</code>, automatically shifts to
          fallback routing if the primary breaches limits, and trips the circuit breaker on unsafe
          pricing.
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="cbBTC / USD Feed"
          value={assetStatuses[0]?.priceFormatted || '$0.00'}
          subtitle={assetStatuses[0]?.isHealthy ? 'Healthy · Primary Feed' : 'Breach / Stale'}
          icon={Activity}
          glowColor={assetStatuses[0]?.isHealthy ? 'amber' : undefined}
        />
        <StatCard
          title="WETH / USD Feed"
          value={assetStatuses[1]?.priceFormatted || '$0.00'}
          subtitle={assetStatuses[1]?.isHealthy ? 'Healthy · Primary Feed' : 'Breach / Stale'}
          icon={Activity}
          glowColor={assetStatuses[1]?.isHealthy ? 'blue' : undefined}
        />
        <StatCard
          title="USDC / USD Feed"
          value={assetStatuses[2]?.priceFormatted || '$0.00'}
          subtitle={assetStatuses[2]?.isHealthy ? 'Healthy · Peg Verified' : 'Breach / Stale'}
          icon={ShieldCheck}
          glowColor={assetStatuses[2]?.isHealthy ? 'emerald' : undefined}
        />
        <StatCard
          title="Circuit Breakers"
          value={allHealthy ? 'ALL ARMED' : 'TRIPPED / STALE'}
          subtitle={`Max Dev: ${(Number(assetStatuses[0]?.maxDeviationBps || 1000n) / 100).toFixed(0)}% BPS Cap`}
          icon={Zap}
          glowColor="purple"
        />
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar border-b border-border-subtle/60 pb-1">
        <button
          type="button"
          onClick={() => setCurrentTab('status')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'status'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Oracle Feeds ({assetStatuses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('breaker')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'breaker'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Circuit Breaker Controls</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('config')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'config'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Oracle Routing Config</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('chainlink')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'chainlink'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <Link2 className="w-4 h-4" />
          <span>Chainlink Aggregator Admin</span>
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
      {currentTab === 'status' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {assetStatuses.map((status) => (
              <OracleFeedCard
                key={status.symbol}
                status={status}
                explorerBaseUrl={explorerBaseUrl}
              />
            ))}
          </div>
        </div>
      )}

      {currentTab === 'breaker' && (
        <CircuitBreakerSection
          oracleManagerAddress={oracleManagerAddress}
          explorerBaseUrl={explorerBaseUrl}
          isGovernanceAdmin={isGovernanceAdmin}
          assetStatuses={assetStatuses}
          onRefresh={refetch}
        />
      )}

      {currentTab === 'config' && (
        <OracleConfigSection
          oracleManagerAddress={oracleManagerAddress}
          explorerBaseUrl={explorerBaseUrl}
          isGovernanceAdmin={isGovernanceAdmin}
          assetStatuses={assetStatuses}
          onRefresh={refetch}
        />
      )}

      {currentTab === 'chainlink' && (
        <ChainlinkFeedAdminSection
          chainlinkProviderAddress={chainlinkProviderAddress}
          explorerBaseUrl={explorerBaseUrl}
          isChainlinkAdmin={isChainlinkAdmin}
          assetStatuses={assetStatuses}
          onRefresh={refetch}
        />
      )}

      {currentTab === 'activity' && (
        <OracleEventHistory
          events={events}
          isLoadingEvents={isLoadingEvents}
          explorerBaseUrl={explorerBaseUrl}
        />
      )}
    </div>
  );
}
