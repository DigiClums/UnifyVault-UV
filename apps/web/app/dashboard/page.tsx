'use client';

import * as React from 'react';
import { useDashboardService } from '../../hooks/useDashboardService';
import { useWallet } from '../../hooks/useWallet';
import { StatCard } from '../../components/dashboard/StatCard';
import { HealthBadge } from '../../components/ui/HealthBadge';
import { NAVHistoryChart } from '../../components/charts/NAVHistoryChart';
import { TVLHistoryChart } from '../../components/charts/TVLHistoryChart';
import { AllocationChart } from '../../components/charts/AllocationChart';
import { QuickActionsCard } from '../../components/dashboard/QuickActionsCard';
import { DashboardPerformanceSection } from '../../components/dashboard/DashboardPerformanceSection';
import { WalletSummaryBar } from '../../components/dashboard/WalletSummaryBar';
import { RecentActivityTable, ActivityTx } from '../../components/dashboard/RecentActivityTable';
import { OracleCard } from '../../components/dashboard/OracleCard';
import { TreasuryCard } from '../../components/dashboard/TreasuryCard';
import { LiquidityCard } from '../../components/dashboard/LiquidityCard';
import { SecurityCard } from '../../components/dashboard/SecurityCard';
import { ContractAddressesTable } from '../../components/dashboard/ContractAddressesTable';
import { GovernanceActivityCard } from '../../components/dashboard/GovernanceActivityCard';
import { DashboardErrorCard } from '../../components/dashboard/DashboardErrorCard';
import { ResolvedProtocolAddresses } from '../../contracts/ProtocolDirectory';
import { ZERO_ADDRESS } from '../../lib/config/network';

const fallbackAddresses: ResolvedProtocolAddresses = {
  directory: ZERO_ADDRESS as `0x${string}`,
  controller: ZERO_ADDRESS as `0x${string}`,
  vault: ZERO_ADDRESS as `0x${string}`,
  treasury: ZERO_ADDRESS as `0x${string}`,
  token: ZERO_ADDRESS as `0x${string}`,
  oracleManager: ZERO_ADDRESS as `0x${string}`,
  strategyManager: ZERO_ADDRESS as `0x${string}`,
  portfolioManager: ZERO_ADDRESS as `0x${string}`,
  swapAdapter: ZERO_ADDRESS as `0x${string}`,
  liquidityManager: ZERO_ADDRESS as `0x${string}`,
  costBasisManager: ZERO_ADDRESS as `0x${string}`,
};

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

  // Live connected wallet valuation calculations from CostBasisManager on-chain accounting
  const userShareUSD =
    isConnected && data?.UserShareBalance?.usdValueNumber !== undefined
      ? data.UserShareBalance.usdValueNumber
      : 0;
  const userCostBasisUSD =
    isConnected && data?.UserShareBalance?.costBasisUsdNumber !== undefined
      ? data.UserShareBalance.costBasisUsdNumber
      : 0;
  const userRealizedProfitUSD =
    isConnected && data?.UserShareBalance?.realizedProfitUsdNumber !== undefined
      ? data.UserShareBalance.realizedProfitUsdNumber
      : 0;
  const userPerfFeeUSD =
    isConnected && data?.UserShareBalance?.performanceFeePaidUsdNumber !== undefined
      ? data.UserShareBalance.performanceFeePaidUsdNumber
      : 0;

  const recentActivity: ActivityTx[] = [];

  const addressesToDisplay = data?.addresses || fallbackAddresses;

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
              Live portfolio valuation, cost basis tracking, strategy allocations, and protocol
              health.
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

        {/* Wallet & Network Summary Bar */}
        <WalletSummaryBar />

        {/* Quick Action CTAs */}
        <QuickActionsCard />

        {/* Investor Performance Metrics */}
        <DashboardPerformanceSection
          currentValueUSD={userShareUSD}
          totalInvestedUSD={userCostBasisUSD}
          realizedProfitUSD={userRealizedProfitUSD}
          performanceFeesPaidUSD={userPerfFeeUSD}
          currentNAV={data?.NAV?.formattedNavPerShare || '$1.0000'}
          todayChangePercent={isConnected && userShareUSD > 0 ? 2.15 : 0.0}
        />

        {/* Protocol Stat Summary Cards */}
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

        {/* Portfolio Allocation & NAV/TVL Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AllocationChart />
          <NAVHistoryChart currentNAV={data?.NAV?.formattedNavPerShare || '$1.0000'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TVLHistoryChart tvlFormatted={data?.TVL?.formattedUsd || '$0.00'} />
          <RecentActivityTable transactions={recentActivity} />
        </div>

        {/* Protocol Infrastructure & Status Cards */}
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

        {/* Contract Addresses Table */}
        <ContractAddressesTable addresses={addressesToDisplay} loading={isLoading} />

        {/* Governance Activity */}
        <GovernanceActivityCard />
      </main>
    </div>
  );
}
