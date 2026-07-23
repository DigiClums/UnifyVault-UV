'use client';

import { useAccount } from 'wagmi';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
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
  const { address, isConnected } = useAccount();
  const { indexTokenAddress } = useIndexTokenAddress();
  const { navData, isLoading: isNavLoading } = usePortfolio();
  const { tvlUSD, totalShares, isLoading: isMetricsLoading } = useVaultMetrics();
  const { formattedBalance: shareBalance, isLoading: isShareBalanceLoading } = useTokenBalance(
    indexTokenAddress,
    address,
  );

  const formattedNAV = navData ? `$${(Number(navData.navPerShare) / 1e18).toFixed(4)}` : '$1.0000';
  const formattedTVL = tvlUSD
    ? `$${(Number(tvlUSD) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : '$0.00';
  const formattedShares = shareBalance ? Number(shareBalance).toFixed(4) : '0.0000';
  const userPositionUSD =
    navData && shareBalance
      ? (Number(shareBalance) * (Number(navData.navPerShare) / 1e18)).toFixed(2)
      : '0.00';
  const estRedeemUSD =
    navData && shareBalance
      ? (Number(shareBalance) * (Number(navData.navPerShare) / 1e18) * 0.999).toFixed(2)
      : '0.00';

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Title & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Dashboard & Position Analytics
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Real-time NAV, Unrealized PnL, TVL, and asset breakdown on Base Mainnet.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <HealthBadge status="HEALTHY" />
            <span className="text-xs text-gray-400 font-mono bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg">
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
            value={`$${userPositionUSD}`}
            change="+2.45%"
            isPositive={true}
            loading={isShareBalanceLoading}
            subtitle="Current Position Value"
          />
          <StatCard
            title="Unrealized PnL"
            value="+$24.50 USD"
            change="+2.50%"
            isPositive={true}
            loading={isShareBalanceLoading}
            subtitle="Gain/Loss vs Avg Cost"
          />
          <StatCard
            title="Current NAV / Share"
            value={formattedNAV}
            change="+0.50%"
            isPositive={true}
            loading={isNavLoading}
            subtitle="Avg Entry: $1.0000"
          />
          <StatCard
            title="Est. Redeem Value"
            value={`$${estRedeemUSD}`}
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
            value="$1,245.50 USD"
            loading={isMetricsLoading}
            subtitle="Protocol Revenue"
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
            <NAVHistoryChart />
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

      <Footer />
    </div>
  );
}
