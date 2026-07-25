'use client';

import * as React from 'react';
import { useDashboardService } from '../../hooks/useDashboardService';
import { useWallet } from '../../hooks/useWallet';
import { StatCard } from '../../components/dashboard/StatCard';
import { BalanceCard } from '../../components/dashboard/BalanceCard';
import { HealthBadge } from '../../components/ui/HealthBadge';
import { NAVHistoryChart } from '../../components/charts/NAVHistoryChart';
import { TVLHistoryChart } from '../../components/charts/TVLHistoryChart';
import { HealthHeroCard } from '../../components/dashboard/HealthHeroCard';
import { OracleCard } from '../../components/dashboard/OracleCard';
import { TreasuryCard } from '../../components/dashboard/TreasuryCard';
import { LiquidityCard } from '../../components/dashboard/LiquidityCard';
import { SecurityCard } from '../../components/dashboard/SecurityCard';
import { ContractAddressesTable } from '../../components/dashboard/ContractAddressesTable';
import { GovernanceActivityCard } from '../../components/dashboard/GovernanceActivityCard';
import { ConnectWalletCard } from '../../components/dashboard/ConnectWalletCard';
import { DashboardErrorCard } from '../../components/dashboard/DashboardErrorCard';

export default function DashboardPage() {
  const { isConnected } = useWallet();
  const { data, isLoading, error, refetch } = useDashboardService(15000);

  const [lastUpdatedText, setLastUpdatedText] = React.useState<string>('Updating...');

  React.useEffect(() => {
    if (data?.HealthStatus?.timestamp) {
      const date = new Date(data.HealthStatus.timestamp);
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      const seconds = date.getUTCSeconds().toString().padStart(2, '0');
      setLastUpdatedText(`${hours}:${minutes}:${seconds} UTC`);
    } else {
      setLastUpdatedText('Updating...');
    }
  }, [data?.HealthStatus?.timestamp]);

  if (error && !data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10">
          <DashboardErrorCard error={error} onRetry={refetch} />
        </main>
      </div>
    );
  }

  const healthStatusString: 'HEALTHY' | 'REFILL_REQUIRED' | 'RESERVE_SWEEP_REQUIRED' | 'PAUSED' =
    data?.HealthStatus?.isPaused
      ? 'PAUSED'
      : data?.LiquidityStatus?.needsRefill
        ? 'REFILL_REQUIRED'
        : data?.LiquidityStatus?.needsSweep
          ? 'RESERVE_SWEEP_REQUIRED'
          : 'HEALTHY';

  const custodyAssetsUsdTotal = data?.CustodyAssets
    ? data.CustodyAssets.reduce((sum, asset) => sum + asset.custodyUsdValueNumber, 0)
    : 0;

  const custodyAssetsFormatted = `$${custodyAssetsUsdTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              UnifyVault V2 Live Protocol Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Real-time on-chain NAV, aggregate TVL, custody balances, and dynamic module health.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 max-w-full">
            <span className="text-xs font-mono text-muted-foreground bg-secondary/80 border border-border/60 px-3 py-2 rounded-xl">
              Last Updated: {lastUpdatedText}
            </span>

            <button
              onClick={() => void refetch()}
              disabled={isLoading}
              aria-label="Refresh dashboard metrics"
              className="text-xs bg-secondary hover:bg-accent border border-border text-foreground px-3.5 py-2.5 min-h-[40px] inline-flex items-center rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>

            <HealthBadge status={healthStatusString} />
          </div>
        </div>

        {/* Row 1 — Key Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Value Locked"
            value={data?.TVL?.formattedUsd || '$0.00'}
            loading={isLoading}
            subtitle="Protocol Custody Assets"
          />
          <StatCard
            title="NAV / Share"
            value={data?.NAV?.formattedNavPerShare || '$1.0000'}
            loading={isLoading}
            subtitle="Live Target Valuation"
          />
          <StatCard
            title="Total Supply"
            value={data?.TotalSupply ? `${data.TotalSupply.formatted} UVBTCETH` : '0.00 UVBTCETH'}
            loading={isLoading}
            subtitle="Circulating Share Supply"
          />
          <StatCard
            title="Treasury Fees"
            value={data?.TreasuryFees?.totalUsdFormatted || '$0.00'}
            loading={isLoading}
            subtitle="Protocol Revenue Stored"
          />
        </div>

        {/* Row 2 — Custody & Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Custody Value"
            value={custodyAssetsFormatted}
            loading={isLoading}
            subtitle="Underlying Custody Assets"
          />
          <StatCard
            title="Operational Liquidity"
            value={
              data?.LiquidityStatus ? data.LiquidityStatus.operationalBalanceRaw.toString() : '0'
            }
            loading={isLoading}
            subtitle="Operational Buffer (10% Target)"
          />
          <StatCard
            title="Reserve Liquidity"
            value={data?.LiquidityStatus ? data.LiquidityStatus.reserveBalanceRaw.toString() : '0'}
            loading={isLoading}
            subtitle="Reserve Accounting Buffer"
          />
          <StatCard
            title="Oracle Status"
            value={data?.OracleStatus?.isHealthy ? 'HEALTHY' : 'DEGRADED'}
            loading={isLoading}
            subtitle="Chainlink Pricing Feeds"
          />
        </div>

        {/* Row 3 — Health Hero Card */}
        {data?.HealthStatus && <HealthHeroCard health={data.HealthStatus} loading={isLoading} />}

        {/* User Position & Balance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            {isConnected ? (
              <BalanceCard
                sharesBalance={data?.UserShareBalance?.formattedShares || '0.00'}
                usdValue={`$${(data?.UserShareBalance?.usdValueNumber || 0).toFixed(2)}`}
                loading={isLoading}
              />
            ) : (
              <ConnectWalletCard />
            )}
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/40 p-6 backdrop-blur-md shadow-sm dark:shadow-none">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center justify-between">
              <span>Custody Portfolio Breakdown</span>
              <span className="text-xs text-muted-foreground font-mono">
                Strategy Target Allocation (10,000 BPS)
              </span>
            </h3>

            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-12 rounded-xl bg-muted w-full" />
                <div className="h-12 rounded-xl bg-muted w-full" />
              </div>
            ) : data?.CustodyAssets && data.CustodyAssets.length > 0 ? (
              <div className="space-y-3 font-mono text-xs">
                {data.CustodyAssets.map((asset) => (
                  <div
                    key={asset.address}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/60 gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{asset.symbol}</span>
                      <span className="text-muted-foreground">({asset.weightPercent}% target)</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="font-bold text-foreground">
                          {asset.custodyBalanceFormatted} {asset.symbol}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          ${asset.custodyUsdValueNumber.toFixed(2)} USD
                        </p>
                      </div>
                      <div className="w-16 bg-muted rounded-full h-2 overflow-hidden hidden sm:block">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${Math.min(100, asset.weightPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-muted-foreground py-4">
                No portfolio custody assets returned
              </p>
            )}
          </div>
        </div>

        {/* Row 4 — Status Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data?.OracleStatus && (
            <OracleCard oracleStatus={data.OracleStatus} loading={isLoading} />
          )}
          {data?.TreasuryFees && <TreasuryCard treasury={data.TreasuryFees} loading={isLoading} />}
          {data?.LiquidityStatus && (
            <LiquidityCard liquidity={data.LiquidityStatus} loading={isLoading} />
          )}
          {data?.HealthStatus && (
            <SecurityCard isPaused={data.HealthStatus.isPaused} loading={isLoading} />
          )}
        </div>

        {/* Row 5 — Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <NAVHistoryChart currentNAV={data?.NAV?.formattedNavPerShare || '$1.0000'} />
          <TVLHistoryChart tvlFormatted={data?.TVL?.formattedUsd || '$0.00'} />
        </div>

        {/* Row 6 — Contract Addresses Table */}
        {data?.addresses && (
          <ContractAddressesTable addresses={data.addresses} loading={isLoading} />
        )}

        {/* Row 7 — Governance Activity */}
        <GovernanceActivityCard />
      </main>
    </div>
  );
}
