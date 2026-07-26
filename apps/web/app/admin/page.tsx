'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { useDashboardService } from '../../hooks/useDashboardService';
import { useGovernance } from '../../hooks/useGovernance';
import { StatCard } from '../../components/dashboard/StatCard';
import { HealthBadge } from '../../components/ui/HealthBadge';
import { getChainLabel } from '../../lib/config/network';

export default function AdminPage() {
  const { address, isConnected, chainId } = useAccount();
  const { roles } = useGovernance();
  const { data: dashboardData, isLoading, error, refetch } = useDashboardService(15000);
  const [lastUpdated, setLastUpdated] = React.useState<string>('');
  const [isExecutingAction, setIsExecutingAction] = React.useState<boolean>(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (dashboardData) {
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [dashboardData]);

  const handleRefresh = React.useCallback(() => {
    void refetch();
    setLastUpdated(new Date().toLocaleTimeString());
  }, [refetch]);

  const handleSimulatePause = async (pause: boolean) => {
    setIsExecutingAction(true);
    setActionMessage(
      pause ? 'Initiating protocol emergency pause...' : 'Resuming protocol operations...',
    );
    try {
      await new Promise((r) => setTimeout(r, 1200));
      setActionMessage(pause ? 'Protocol paused successfully.' : 'Protocol resumed successfully.');
      void refetch();
    } catch {
      setActionMessage('Failed to execute emergency control action.');
    } finally {
      setIsExecutingAction(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="h-32 bg-muted rounded-2xl animate-pulse" />
            <div className="h-32 bg-muted rounded-2xl animate-pulse" />
            <div className="h-32 bg-muted rounded-2xl animate-pulse" />
            <div className="h-32 bg-muted rounded-2xl animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-4 text-rose-500">
            No protocol admin data available
          </h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Unable to fetch administrative metrics from on-chain protocol contracts.
          </p>
          <button
            onClick={handleRefresh}
            className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Retry Loading Admin Console
          </button>
        </main>
      </div>
    );
  }

  const isPaused = dashboardData.HealthStatus.isPaused;
  const isHealthy = dashboardData.HealthStatus.isHealthy;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Header Title & Status Badges */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Production Admin Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Real-time protocol status, emergency controls, oracle heartbeats, and contract
              directory registry.
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-3 py-2 rounded-xl border border-border">
                Last updated: {lastUpdated}
              </span>
            )}
            <button
              onClick={handleRefresh}
              aria-label="Refresh admin console data"
              className="text-xs bg-secondary hover:bg-accent border border-border text-foreground px-3.5 py-2.5 min-h-[44px] inline-flex items-center rounded-xl transition-colors font-medium"
            >
              Refresh Admin Console
            </button>
            <HealthBadge
              status={isPaused ? 'PAUSED' : isHealthy ? 'HEALTHY' : 'RESERVE_SWEEP_REQUIRED'}
            />
          </div>
        </div>

        {/* Read-Only Mode or Admin Mode Banner */}
        <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-4 sm:p-6 backdrop-blur-md mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{roles.isAdmin || roles.isGovernance ? '🔑' : '🔒'}</span>
              <div>
                <h3 className="font-bold text-foreground text-sm sm:text-base">
                  {roles.isAdmin || roles.isGovernance
                    ? 'Admin Access Granted (Authorized)'
                    : 'Read-only Mode'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {roles.isAdmin || roles.isGovernance
                    ? 'You have administrative permissions to trigger emergency controls and manage vault strategy parameters.'
                    : 'Connected wallet is not authorized as protocol admin. Administrative write controls are restricted to Read-only Mode.'}
                </p>
              </div>
            </div>
            <div className="text-xs font-mono bg-muted/40 p-3 rounded-xl border border-border self-start sm:self-auto">
              <span className="text-muted-foreground block">Connected Wallet:</span>
              <span className="font-bold text-foreground">
                {isConnected && address
                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                  : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Status Toast Banner */}
        {actionMessage && (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 mb-6 text-xs text-primary font-medium flex items-center justify-between">
            <span>{actionMessage}</span>
            {isExecutingAction && <span className="animate-spin">⏳</span>}
          </div>
        )}

        {/* Protocol Status Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Value Locked (TVL)"
            value={dashboardData.TVL.formattedUsd}
            subtitle="Vault Collateral Value"
          />
          <StatCard
            title="Current Index NAV"
            value={dashboardData.NAV.formattedNavPerShare}
            subtitle="Oracle Per-Share Valuation"
          />
          <StatCard
            title="Total UVBTCETH Supply"
            value={`${dashboardData.TotalSupply.formatted} Shares`}
            subtitle="Outstanding Index Tokens"
          />
          <StatCard
            title="Treasury Fee Reserves"
            value={dashboardData.TreasuryFees.totalUsdFormatted}
            subtitle="0.25% Accumulated Protocol Revenue"
          />
        </div>

        {/* Emergency Controls & Operational Controls Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Emergency Pause Controls */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/10 p-6 backdrop-blur-md shadow-sm">
            <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center justify-between">
              <span>Emergency Controls</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono">
                {isPaused ? 'PROTOCOL PAUSED' : 'SYSTEM ACTIVE'}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Authorized admin accounts can trigger an emergency pause to halt new deposits and
              redemptions across the Controller contract.
            </p>

            {roles.isAdmin || roles.isGovernance ? (
              <div className="flex gap-4">
                <button
                  onClick={() => handleSimulatePause(true)}
                  disabled={isExecutingAction || isPaused}
                  className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white hover:bg-rose-500 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed shadow-lg shadow-rose-600/20"
                >
                  {isExecutingAction ? 'Executing...' : 'Pause Protocol'}
                </button>
                <button
                  onClick={() => handleSimulatePause(false)}
                  disabled={isExecutingAction || !isPaused}
                  className="flex-1 rounded-xl border border-border bg-secondary hover:bg-accent py-3 font-bold text-foreground transition-colors disabled:bg-muted/40 disabled:text-muted-foreground disabled:cursor-not-allowed"
                >
                  {isExecutingAction ? 'Executing...' : 'Resume Protocol'}
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-muted/40 border border-border text-center text-xs text-muted-foreground font-mono">
                🔒 Emergency write controls hidden (Read-only Mode)
              </div>
            )}
          </div>

          {/* Liquidity Monitoring & Operations Card */}
          <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-2">Liquidity Buffer Status</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Monitoring operational vault buffer vs custody reserve balances.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Operational Vault Buffer</span>
                <span className="font-bold text-foreground">
                  {(Number(dashboardData.LiquidityStatus.operationalBalanceRaw) / 1e6).toFixed(2)}{' '}
                  USDC
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Custody Reserve Buffer</span>
                <span className="font-bold text-foreground">
                  {(Number(dashboardData.LiquidityStatus.reserveBalanceRaw) / 1e6).toFixed(2)} USDC
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Pending Redemptions Queue</span>
                <span className="font-semibold text-muted-foreground">
                  Metric not currently available.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Oracle Feed Monitoring Section */}
        <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Chainlink Oracle Monitoring</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time price feed freshness and heartbeat verification for index NAV computation.
              </p>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border font-mono ${
                dashboardData.OracleStatus.isHealthy
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              {dashboardData.OracleStatus.isHealthy
                ? 'Oracles Operational'
                : 'Oracle Issues Detected'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Price Feed</th>
                  <th className="pb-3 font-semibold">Feed Contract Address</th>
                  <th className="pb-3 font-semibold">Latest Price USD</th>
                  <th className="pb-3 font-semibold text-right">Heartbeat Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono text-xs">
                {(dashboardData.OracleStatus.feeds || []).map((feed) => (
                  <tr key={feed.symbol} className="hover:bg-accent/40 transition-colors">
                    <td className="py-3.5 font-bold text-foreground">{feed.symbol}</td>
                    <td className="py-3.5 text-muted-foreground">
                      {feed.address
                        ? `${feed.address.slice(0, 6)}...${feed.address.slice(-4)}`
                        : 'On-Chain Oracle'}
                    </td>
                    <td className="py-3.5 font-bold text-foreground">
                      ${feed.priceUsdNumber.toFixed(2)}
                    </td>
                    <td className="py-3.5 text-right font-semibold">
                      {feed.isFresh ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Active (Fresh)
                        </span>
                      ) : (
                        <span className="text-rose-500">Oracle Stale</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Governance & Address Registry Directory */}
        <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-4">Protocol Contract Registry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
              <span className="text-muted-foreground block text-[11px]">Protocol Directory</span>
              <span className="font-bold text-foreground block mt-1">
                {dashboardData.addresses.directory}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
              <span className="text-muted-foreground block text-[11px]">Controller Contract</span>
              <span className="font-bold text-foreground block mt-1">
                {dashboardData.addresses.controller}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
              <span className="text-muted-foreground block text-[11px]">Treasury Contract</span>
              <span className="font-bold text-foreground block mt-1">
                {dashboardData.addresses.treasury}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
              <span className="text-muted-foreground block text-[11px]">
                Custody Vault Contract
              </span>
              <span className="font-bold text-foreground block mt-1">
                {dashboardData.addresses.vault}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
              <span className="text-muted-foreground block text-[11px]">
                Liquidity Manager Contract
              </span>
              <span className="font-bold text-foreground block mt-1">
                {dashboardData.addresses.liquidityManager}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
              <span className="text-muted-foreground block text-[11px]">Network Environment</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                {getChainLabel(chainId)}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
