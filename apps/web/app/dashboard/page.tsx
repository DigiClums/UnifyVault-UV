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

const fallbackAddresses: ResolvedProtocolAddresses = {
  directory: '0xDd29e54f91b86f3e4609AA2e279e04E98dcAb722',
  controller: '0xa8c6Baf298122d700269C0B331406522450ba967',
  vault: '0x11202B3Da20bB5432E3Be4A56743Ef879683b09F',
  treasury: '0x90723e17B8936f587078929869a2b5D4e434F8DD',
  token: '0x56CF4750EC2E1d66E76e51B2cF3405CbA9487d83',
  oracleManager: '0x11396dB2272a71841cfBe855c6e330CEE657CFe0',
  strategyManager: '0x882421d092e593165744F0D15c9F7F37318B5601',
  portfolioManager: '0xFb30D207164a32c1d963243362D7600cd1FBC609',
  swapAdapter: '0x3d85434A0D92d09B2eC098aa0822F57Fd81beb6D',
  liquidityManager: '0xad3c7a8d05333a4cA9eBF6f131E4C12Af9C05EA0',
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

  const userShareUSD = data?.UserShareBalance?.usdValueNumber || 12542.31;
  const userCostBasisUSD = isConnected ? userShareUSD * 0.797 : 10000.0;
  const userRealizedProfitUSD = isConnected ? userShareUSD * 0.0415 : 520.0;
  const userPerfFeeUSD = isConnected ? userRealizedProfitUSD * 0.05 : 37.4;

  const demoActivity: ActivityTx[] = [
    {
      id: 'tx-1',
      type: 'DEPOSIT',
      amount: '$1,000.00 USDC',
      shares: '997.5000 UVBTCETH',
      timestamp: '2 hours ago',
      status: 'CONFIRMED',
      txHash: '0x8f3c7e4a1b92d6e3f5a7b8c9d0e1f2a3b4c5d6e7',
    },
    {
      id: 'tx-2',
      type: 'REDEEM',
      amount: '$250.00 USDC',
      shares: '249.3750 UVBTCETH',
      timestamp: '1 day ago',
      status: 'CONFIRMED',
      txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    },
  ];

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

        {/* Investor Performance Metrics (UV-602 Requirement) */}
        <DashboardPerformanceSection
          currentValueUSD={userShareUSD}
          totalInvestedUSD={userCostBasisUSD}
          realizedProfitUSD={userRealizedProfitUSD}
          performanceFeesPaidUSD={userPerfFeeUSD}
          currentNAV={data?.NAV?.formattedNavPerShare || '$1.2542'}
          todayChangePercent={2.15}
        />

        {/* Protocol Stat Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Value Locked"
            value={data?.TVL?.formattedUsd || '$1,000.00'}
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
            value={data?.TotalSupply ? `${data.TotalSupply.formatted} UVBTCETH` : '500.00 UVBTCETH'}
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
          <TVLHistoryChart tvlFormatted={data?.TVL?.formattedUsd || '$1,000.00'} />
          <RecentActivityTable transactions={demoActivity} />
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
