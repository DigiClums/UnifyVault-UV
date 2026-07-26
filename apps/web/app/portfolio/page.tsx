'use client';

import * as React from 'react';
import Link from 'next/link';
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useDashboardService } from '../../hooks/useDashboardService';
import { StatCard } from '../../components/dashboard/StatCard';
import { AllocationChart } from '../../components/charts/AllocationChart';
import { NAVHistoryChart } from '../../components/charts/NAVHistoryChart';
import { TVLHistoryChart } from '../../components/charts/TVLHistoryChart';
import { RecentActivityTable } from '../../components/dashboard/RecentActivityTable';
import { HealthBadge } from '../../components/ui/HealthBadge';
import { PortfolioPerformanceCard } from '../../components/portfolio/PortfolioPerformanceCard';

type PortfolioAsset = NonNullable<
  ReturnType<typeof usePortfolio>['portfolio']
>['assetsBalances'][number];

export default function PortfolioPage() {
  const { isConnected, address } = useWallet();
  const { isSupported } = useNetwork();
  const {
    portfolio,
    navData,
    isLoading: isLoadingPortfolio,
    refetch: refetchPortfolio,
  } = usePortfolio();
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    refetch: refetchDashboard,
  } = useDashboardService(15000);

  const isLoading = isLoadingPortfolio || (isLoadingDashboard && !dashboardData);

  const handleRefresh = React.useCallback(() => {
    void refetchPortfolio();
    void refetchDashboard();
  }, [refetchPortfolio, refetchDashboard]);

  const sharesBalance = portfolio?.sharesBalance ?? 0n;
  const sharesCountFormatted = (Number(sharesBalance) / 1e18).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });

  const sharesValueUSDFormatted = portfolio?.sharesValueUSD
    ? `$${(Number(portfolio.sharesValueUSD) / 1e18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$0.00';

  const totalPortfolioValueUSDFormatted = portfolio?.totalPortfolioValueUSD
    ? `$${(Number(portfolio.totalPortfolioValueUSD) / 1e18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$0.00';

  const grossUSDNum = portfolio?.sharesValueUSD ? Number(portfolio.sharesValueUSD) / 1e18 : 0;

  // Total Supply Ownership Share %
  const totalSupply = dashboardData?.TotalSupply?.raw;
  const ownershipPercentage = React.useMemo(() => {
    if (dashboardData?.UserShareBalance?.ownershipPercentage !== undefined && sharesBalance > 0n) {
      return `${dashboardData.UserShareBalance.ownershipPercentage.toFixed(2)}%`;
    }
    if (!totalSupply || totalSupply === 0n || sharesBalance === 0n) return '0.00%';
    const pct = (Number(sharesBalance) * 100) / Number(totalSupply);
    return `${pct.toFixed(2)}%`;
  }, [sharesBalance, totalSupply, dashboardData?.UserShareBalance?.ownershipPercentage]);

  const formattedNAV =
    dashboardData?.NAV?.formattedNavPerShare ||
    (navData ? `$${(Number(navData.navPerShare) / 1e18).toFixed(4)}` : '$1.0000');

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Connect Your Wallet</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Please connect your wallet to view your active index shares, yield metrics, and
            collateral breakdown.
          </p>
        </main>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-4 text-amber-500">Switch Network</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Please connect your wallet to Base Sepolia to load your vault portfolio.
          </p>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-4 gap-6">
            <div className="h-32 bg-muted rounded-2xl animate-pulse" />
            <div className="h-32 bg-muted rounded-2xl animate-pulse" />
            <div className="h-32 bg-muted rounded-2xl animate-pulse" />
            <div className="h-32 bg-muted rounded-2xl animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  if (portfolio === null) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-4 text-rose-500">No portfolio data available</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Unable to query vault portfolio metrics from contract state.
          </p>
        </main>
      </div>
    );
  }

  if (sharesBalance === 0n && (portfolio?.assetsBalances?.length ?? 0) === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Your portfolio is empty</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            You do not own any UVBTCETH index shares yet. Deposit USDC collateral to mint index
            shares.
          </p>
          <Link
            href="/deposit"
            className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary/90 transition-all"
          >
            Make your first deposit
          </Link>
        </main>
      </div>
    );
  }

  const isPaused = dashboardData?.HealthStatus?.isPaused ?? false;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Your Portfolio
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Comprehensive strategy breakdown, historical performance charts, and recent activity.
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
            <button
              onClick={handleRefresh}
              aria-label="Refresh portfolio balances"
              className="text-xs bg-secondary hover:bg-accent border border-border text-foreground px-3.5 py-2.5 min-h-[44px] inline-flex items-center rounded-xl transition-colors font-medium"
            >
              Refresh Balances
            </button>
            <HealthBadge status={isPaused ? 'PAUSED' : 'HEALTHY'} />
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Portfolio Value"
            value={totalPortfolioValueUSDFormatted}
            subtitle="Combined Shares + Collateral"
          />
          <StatCard
            title="Withdrawable Vault Value"
            value={sharesValueUSDFormatted}
            subtitle="Index Redemption Value"
          />
          <StatCard
            title="Index Holdings"
            value={`${sharesCountFormatted} Shares`}
            subtitle="UVBTCETH Vault Tokens"
          />
          <StatCard
            title="Connected Address"
            value={address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Disconnected'}
            subtitle="Base Network"
          />
        </div>

        {/* Performance & Payout Breakdown */}
        <div className="mb-8">
          <PortfolioPerformanceCard
            currentNAV={formattedNAV}
            grossValueUSD={grossUSDNum}
            ownershipPercentage={ownershipPercentage}
            totalInvestedUSD={dashboardData?.UserShareBalance?.costBasisUsdNumber ?? 0}
            performanceFeePaidUSD={
              dashboardData?.UserShareBalance?.performanceFeePaidUsdNumber ?? 0
            }
          />
        </div>

        {/* Assets Collateral Holdings Table */}
        <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md mb-8 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-bold text-foreground mb-4">Your Collateral Holdings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Asset</th>
                  <th className="pb-3 font-semibold">Wallet Balance</th>
                  <th className="pb-3 font-semibold">Redeemable Collateral</th>
                  <th className="pb-3 font-semibold text-right">Redeemable USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono text-xs">
                {(portfolio.assetsBalances || []).map((asset: PortfolioAsset) => {
                  const balanceNum = Number(asset.balance) / 10 ** asset.decimals;
                  const redeemNum = Number(asset.redeemableAmount) / 10 ** asset.decimals;
                  const redeemUSD = (Number(asset.redeemableValueUSD) / 1e18).toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  );
                  return (
                    <tr key={asset.symbol} className="hover:bg-accent/40 transition-colors">
                      <td className="py-4 font-bold text-foreground">
                        {asset.name || asset.symbol}
                      </td>
                      <td className="py-4 text-foreground">
                        {balanceNum.toLocaleString()} {asset.symbol}
                      </td>
                      <td className="py-4 text-foreground">
                        {redeemNum.toLocaleString()} {asset.symbol}
                      </td>
                      <td className="py-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        ${redeemUSD}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <AllocationChart />
          <NAVHistoryChart currentNAV={formattedNAV} />
        </div>

        <div className="mb-8">
          <TVLHistoryChart tvlFormatted={totalPortfolioValueUSDFormatted} />
        </div>

        {/* Transaction Activity */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-foreground mb-4">Transaction Activity</h3>
          <RecentActivityTable />
        </div>
      </main>
    </div>
  );
}
