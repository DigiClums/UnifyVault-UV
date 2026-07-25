'use client';

import { useWallet } from '../../hooks/useWallet';
import { StatCard } from '../../components/dashboard/StatCard';
import { BalanceCard } from '../../components/dashboard/BalanceCard';
import { TokenCard } from '../../components/dashboard/TokenCard';
import { HealthBadge } from '../../components/ui/HealthBadge';
import { NAVHistoryChart } from '../../components/charts/NAVHistoryChart';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useVaultMetrics } from '../../hooks/useVaultMetrics';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useIndexTokenAddress } from '../../hooks/useIndexTokenAddress';

export default function DashboardPage() {
  const { address, isConnected } = useWallet();
  const { indexTokenAddress } = useIndexTokenAddress();
  const {
    navData,
    portfolio,
    isLoading: isPortfolioLoading,
    refetch: refetchPortfolio,
  } = usePortfolio();
  const { metrics, isLoading: isMetricsLoading, refetch: refetchMetrics } = useVaultMetrics();
  const { formattedBalance: shareBalance, isLoading: isShareBalanceLoading } =
    useTokenBalance(indexTokenAddress);
  const isNavLoading = isPortfolioLoading;

  const tvlUSD = metrics?.totalTvlUSD;
  const totalShares = metrics?.totalSupply;

  const formattedNAV = navData ? `$${(Number(navData.navPerShare) / 1e18).toFixed(4)}` : '$1.0000';
  const formattedTVL =
    tvlUSD !== undefined
      ? `$${(Number(tvlUSD) / 1e18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '$0.00';
  const userShares =
    portfolio?.sharesBalance !== undefined
      ? portfolio.sharesBalance
      : shareBalance
        ? BigInt(Math.floor(Number(shareBalance) * 1e18))
        : 0n;
  const formattedShares = (Number(userShares) / 1e18).toString();
  const userPositionUSD = navData
    ? `$${((Number(userShares) / 1e18) * (Number(navData.navPerShare) / 1e18)).toFixed(2)}`
    : '$0.00';
  const estRedeemUSD = navData
    ? `$${((Number(userShares) / 1e18) * (Number(navData.navPerShare) / 1e18) * 0.999).toFixed(2)}`
    : '$0.00';

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col">
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Header Title & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Protocol Dashboard & Position Analytics
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Real-time NAV, Unrealized PnL, TVL, and asset breakdown on Base Mainnet.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 max-w-full">
            <button
              onClick={() => {
                void refetchPortfolio();
                void refetchMetrics();
              }}
              aria-label="Refresh dashboard metrics"
              className="text-xs bg-gray-800 hover:bg-gray-700 px-3.5 py-2.5 min-h-[44px] inline-flex items-center rounded-xl font-medium transition-colors"
            >
              Refresh
            </button>
            <HealthBadge status="HEALTHY" />
            <span className="text-xs text-gray-400 font-mono bg-gray-900 border border-gray-800 px-3 py-2.5 min-h-[44px] inline-flex items-center rounded-xl max-w-full shrink truncate">
              {isConnected && address
                ? `${address.slice(0, 6)}...${address.slice(-4)}`
                : 'Wallet Disconnected'}
            </span>
          </div>
        </div>

        {/* Enhanced Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Portfolio Value (USD)"
            value={userPositionUSD}
            loading={isShareBalanceLoading}
            subtitle="Current Position Value"
          />
          <StatCard
            title="Unrealized PnL"
            value="--"
            loading={isShareBalanceLoading}
            subtitle="Unindexed (Requires Indexer)"
          />
          <StatCard
            title="Current NAV / Share"
            value={formattedNAV}
            loading={isNavLoading}
            subtitle="Live Target Valuation"
          />
          <StatCard
            title="Est. Redeem Value"
            value={estRedeemUSD}
            loading={isShareBalanceLoading}
            subtitle="Net of 0.10% Fee"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Value Locked"
            value={formattedTVL}
            loading={isMetricsLoading}
            subtitle="Protocol Custody Assets"
          />
          <StatCard
            title="Shares Owned"
            value={`${formattedShares} UVBTCETH`}
            loading={isShareBalanceLoading}
            subtitle="Index Share Supply"
          />
          <StatCard
            title="Total Supply"
            value={totalShares ? (Number(totalShares) / 1e18).toFixed(2) : '0.00'}
            loading={isMetricsLoading}
            subtitle="Circulating Shares"
          />
          <StatCard
            title="Treasury Fees"
            value="$0.00 USD"
            loading={isMetricsLoading}
            subtitle="Protocol Fee Storage"
          />
        </div>

        {/* Charts & Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Balance Card */}
          <div className="lg:col-span-1">
            <BalanceCard
              sharesBalance={formattedShares}
              usdValue={userPositionUSD}
              loading={isShareBalanceLoading}
            />
          </div>

          {/* NAV Area Chart */}
          <div className="lg:col-span-2">
            <NAVHistoryChart currentNAV={formattedNAV} />
          </div>
        </div>

        {/* Asset Allocation Breakdown */}
        <div className="rounded-2xl border border-gray-800 bg-[#111827]/40 p-6 backdrop-blur-md">
          <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
            <span>Portfolio Target Allocation</span>
            <span className="text-xs text-gray-400">Total BPS: 10,000 (100.00%)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TokenCard
              symbol="cbBTC"
              name="Coinbase Wrapped BTC"
              weightBps={6000}
              balance="60.00%"
              valueUSD="Target Ratio"
              iconBg="bg-amber-600"
            />
            <TokenCard
              symbol="WETH"
              name="Wrapped Ether"
              weightBps={4000}
              balance="40.00%"
              valueUSD="Target Ratio"
              iconBg="bg-indigo-600"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
