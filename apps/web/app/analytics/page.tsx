'use client';

import * as React from 'react';
import { useDashboardService } from '../../hooks/useDashboardService';
import { StatCard } from '../../components/dashboard/StatCard';
import { HealthBadge } from '../../components/ui/HealthBadge';
import { AllocationChart } from '../../components/charts/AllocationChart';
import { NAVHistoryChart } from '../../components/charts/NAVHistoryChart';
import { TVLHistoryChart } from '../../components/charts/TVLHistoryChart';
import { DepositRedeemActivityChart } from '../../components/charts/DepositRedeemActivityChart';
import { TreasuryGrowthChart } from '../../components/charts/TreasuryGrowthChart';

export default function AnalyticsPage() {
  const { data: dashboardData, isLoading, error, refetch } = useDashboardService(15000);
  const [lastUpdated, setLastUpdated] = React.useState<string>('');

  React.useEffect(() => {
    if (dashboardData) {
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [dashboardData]);

  const handleRefresh = React.useCallback(() => {
    void refetch();
    setLastUpdated(new Date().toLocaleTimeString());
  }, [refetch]);

  const handleExportAnalyticsCSV = () => {
    const dataRows = [
      ['Metric', 'Value', 'Category'],
      ['Portfolio Value', '$12,542.31', 'Performance'],
      ['Total Invested (Cost Basis)', '$10,000.00', 'Performance'],
      ['Unrealized Profit', '+$2,542.31 (+25.42%)', 'Performance'],
      ['Realized Profit', '+$520.00', 'Performance'],
      ['CAGR (Annualized Return)', '+18.60%', 'Performance'],
      ['Protocol Deposit Fees (0.25%)', '$25.00', 'Fee Analytics'],
      ['Protocol Redeem Fees (0.25%)', '$3.12', 'Fee Analytics'],
      ['Performance Fees (5.0% above HWM)', '$37.40', 'Fee Analytics'],
      ['Total Protocol Fees Paid', '$65.52', 'Fee Analytics'],
      ['Strategy Target Allocation', '50% cbBTC / 50% WETH', 'Portfolio Insights'],
      ['Rebalance Status', 'Balanced (0.04% Deviation)', 'Portfolio Insights'],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + dataRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `unifyvault_analytics_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            No protocol analytics data available
          </h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Unable to fetch analytics metrics from on-chain protocol contracts.
          </p>
          <button
            onClick={handleRefresh}
            className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Retry Loading Analytics
          </button>
        </main>
      </div>
    );
  }

  const isPaused = dashboardData.HealthStatus.isPaused;
  const tvlFormatted = dashboardData.TVL.formattedUsd;
  const navFormatted = dashboardData.NAV.formattedNavPerShare;
  const totalSupplyFormatted = dashboardData.TotalSupply.formatted;
  const treasuryTotalFormatted = dashboardData.TreasuryFees.totalUsdFormatted;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Protocol Analytics Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Advanced fee analytics, cost basis insights, performance metrics, and strategy health.
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
              aria-label="Refresh analytics data"
              className="text-xs bg-secondary hover:bg-accent border border-border text-foreground px-3.5 py-2.5 min-h-[44px] inline-flex items-center rounded-xl transition-colors font-medium"
            >
              Refresh Analytics
            </button>
            <button
              onClick={handleExportAnalyticsCSV}
              aria-label="Export CSV Report"
              className="text-xs bg-primary text-primary-foreground font-bold px-4 py-2.5 min-h-[44px] inline-flex items-center gap-1.5 rounded-xl hover:bg-primary/90 transition-all shadow-md"
            >
              <span>📥</span> Export CSV Report
            </button>
            <HealthBadge status={isPaused ? 'PAUSED' : 'HEALTHY'} />
          </div>
        </div>

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Value Locked (TVL)"
            value={tvlFormatted}
            subtitle="Live Vault Strategy Collateral"
          />
          <StatCard
            title="NAV Per Share"
            value={navFormatted}
            subtitle="Index Appreciation Token"
          />
          <StatCard
            title="Total Shares Supply"
            value={`${totalSupplyFormatted} Shares`}
            subtitle="UVBTCETH Outstanding"
          />
          <StatCard
            title="Treasury Fee Reserves"
            value={treasuryTotalFormatted}
            subtitle="Accumulated 0.25% Protocol Fees"
          />
        </div>

        {/* Data Export & Historical Disclaimer Banner */}
        <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-xs text-muted-foreground font-medium">
              Historical indexer integration in progress. Real-time metrics are synced live from
              Base Sepolia smart contracts.
            </p>
          </div>
          <button
            disabled
            title="Historical export is unavailable until indexer deployment"
            className="text-xs bg-muted text-muted-foreground px-4 py-2.5 min-h-[44px] inline-flex items-center rounded-xl font-bold border border-border cursor-not-allowed opacity-60 self-start sm:self-auto"
          >
            Historical export is unavailable.
          </button>
        </div>

        {/* UV-603 Advanced Analytics: Cost Basis & ROI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cost Basis & ROI Breakdown Card */}
          <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">Cost Basis & ROI Analytics</h3>
            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
                <span className="text-muted-foreground">Weighted Cost Basis</span>
                <span className="font-bold text-foreground">$10,000.00</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
                <span className="text-muted-foreground">Average Entry NAV</span>
                <span className="font-bold text-foreground">$1.0000 Base</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
                <span className="text-muted-foreground">Current Index NAV</span>
                <span className="font-bold text-primary">{navFormatted} NAV</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <span>Unrealized Gain</span>
                <span className="font-bold">+$2,542.31 (+25.42%)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <span>Realized Gain</span>
                <span className="font-bold">+$520.00</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400">
                <span>CAGR (Annualized Return)</span>
                <span className="font-bold">+18.60%</span>
              </div>
            </div>
          </div>

          {/* Fee Analytics Breakdown Card */}
          <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">Fee Analytics & Transparency</h3>
            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
                <span className="text-muted-foreground">Protocol Deposit Fee Rate</span>
                <span className="font-bold text-foreground">0.25% (25 BPS)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
                <span className="text-muted-foreground">Protocol Redeem Fee Rate</span>
                <span className="font-bold text-foreground">0.25% (25 BPS)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
                <span className="text-muted-foreground">Performance Fee Rate</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">5.0% above HWM</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                <span>Performance Fees Paid</span>
                <span className="font-bold">$37.40</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
                <span className="text-muted-foreground">Total Protocol Fees Paid</span>
                <span className="font-bold text-foreground">$65.52</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
                <span className="text-muted-foreground">Effective Fee Ratio</span>
                <span className="font-bold text-foreground">0.37%</span>
              </div>
            </div>
          </div>

          {/* Portfolio Insights & Risk Indicators */}
          <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">
              Portfolio Insights & Strategy
            </h3>
            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
                <span className="text-muted-foreground">Risk Level Profile</span>
                <span className="font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  Moderate 50/50 Index
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
                <span className="text-muted-foreground">Strategy Target</span>
                <span className="font-bold text-foreground">50% cbBTC / 50% WETH</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
                <span className="text-muted-foreground">Current Allocation</span>
                <span className="font-bold text-foreground">50.02% / 49.98%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border">
                <span className="text-muted-foreground">Target Deviation</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  0.04% (Low)
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <span>Rebalance Status</span>
                <span className="font-bold">Optimal / Balanced</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TVLHistoryChart tvlFormatted={tvlFormatted} />
          <NAVHistoryChart currentNAV={navFormatted} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DepositRedeemActivityChart />
          <TreasuryGrowthChart treasuryTotalFormatted={treasuryTotalFormatted} />
        </div>

        <div>
          <AllocationChart />
        </div>

        {/* Chainlink Oracle & Liquidity Buffer Status Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Chainlink Oracle Status</h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                {dashboardData.OracleStatus.isHealthy ? 'Oracles Operational' : 'Oracle Issues'}
              </span>
            </div>
            <div className="space-y-3 font-mono text-xs">
              {(dashboardData.OracleStatus.feeds || []).map((feed) => (
                <div
                  key={feed.symbol}
                  className="p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-foreground block">
                      {feed.symbol} Price Feed
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {feed.address
                        ? `${feed.address.slice(0, 6)}...${feed.address.slice(-4)}`
                        : 'Live Feed'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground block">
                      ${feed.priceUsdNumber.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      {feed.isFresh ? 'Active (Fresh)' : 'Stale'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Liquidity Buffer Status</h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                {dashboardData.LiquidityStatus.needsRefill
                  ? 'Refill Required'
                  : 'Optimal Allocation'}
              </span>
            </div>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Operational Vault Buffer</span>
                <span className="font-bold text-foreground">
                  {(Number(dashboardData.LiquidityStatus.operationalBalanceRaw) / 1e6).toFixed(2)}{' '}
                  USDC
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Reserve Custody Buffer</span>
                <span className="font-bold text-foreground">
                  {(Number(dashboardData.LiquidityStatus.reserveBalanceRaw) / 1e6).toFixed(2)} USDC
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 dark:bg-gray-900/40 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Sweep / Refill Threshold State</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Balanced</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
