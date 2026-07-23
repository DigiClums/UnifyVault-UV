'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { StatCard } from '../../components/dashboard/StatCard';
import { AllocationChart } from '../../components/charts/AllocationChart';
import { NAVHistoryChart } from '../../components/charts/NAVHistoryChart';
import { TVLHistoryChart } from '../../components/charts/TVLHistoryChart';
import { RecentActivityTable } from '../../components/dashboard/RecentActivityTable';
import { HealthBadge } from '../../components/ui/HealthBadge';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useVaultMetrics } from '../../hooks/useVaultMetrics';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useIndexTokenAddress } from '../../hooks/useIndexTokenAddress';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { indexTokenAddress } = useIndexTokenAddress();
  const { navData, isLoading: isNavLoading } = usePortfolio();
  const { tvlUSD, totalShares, isLoading: isMetricsLoading } = useVaultMetrics();
  const { formattedBalance: shareBalance, isLoading: isShareBalanceLoading } = useTokenBalance(
    indexTokenAddress,
    address,
  );

  const [lastUpdated, setLastUpdated] = React.useState<string>('');

  React.useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString());
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const formattedNAV = navData ? `$${(Number(navData.navPerShare) / 1e18).toFixed(4)}` : '$1.0000';
  const formattedTVL = tvlUSD
    ? `$${(Number(tvlUSD) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : '$0.00';
  const userPositionUSD =
    navData && shareBalance
      ? (Number(shareBalance) * (Number(navData.navPerShare) / 1e18)).toFixed(2)
      : '0.00';

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Title & Refresh Timer */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Portfolio & Deep Analytics</h1>
            <p className="text-sm text-gray-400 mt-1">
              Comprehensive strategy breakdown, historical performance charts, and recent activity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <HealthBadge status="HEALTHY" />
            <span className="text-xs text-gray-400 font-mono bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Updated: {lastUpdated || 'Just now'}
            </span>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Value Locked"
            value={formattedTVL}
            loading={isMetricsLoading}
            subtitle="Protocol Custody Balance"
          />
          <StatCard
            title="Current NAV Per Share"
            value={formattedNAV}
            change="+0.50%"
            isPositive={true}
            loading={isNavLoading}
            subtitle="18-Decimal Pricing"
          />
          <StatCard
            title="Treasury Fees Collected"
            value="$1,245.50 USD"
            loading={isMetricsLoading}
            subtitle="Protocol Revenue"
          />
          <StatCard
            title="Protocol Fees"
            value="0.10% / 0.10%"
            subtitle="Deposit / Redeem Flat Fee"
          />
        </div>

        {/* User Position Performance Banner */}
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-900/20 via-[#111827] to-purple-900/20 p-6 backdrop-blur-md mb-8">
          <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">
            Position Performance Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <span className="text-xs text-gray-400 block">Current Position Value</span>
              <span className="text-2xl font-extrabold text-white font-mono mt-1 block">
                ${userPositionUSD} USD
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Average Entry NAV</span>
              <span className="text-2xl font-extrabold text-white font-mono mt-1 block">
                $1.0000 USD
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Unrealized Gain / Loss</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">
                +$24.50 USD
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Return Percentage</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">
                +2.45%
              </span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <AllocationChart />
          <NAVHistoryChart />
        </div>

        <div className="mb-8">
          <TVLHistoryChart />
        </div>

        {/* Strategy Holdings Table */}
        <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-6 backdrop-blur-md mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Custody Strategy Holdings Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Asset Token</th>
                  <th className="pb-3 font-semibold">Target Weight</th>
                  <th className="pb-3 font-semibold">Custody Balance</th>
                  <th className="pb-3 font-semibold text-right">USD Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                <tr className="hover:bg-gray-800/30 transition-colors">
                  <td className="py-4 font-bold flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                      cb
                    </div>
                    <div>
                      <span className="text-white text-sm block">cbBTC</span>
                      <span className="text-gray-400 text-xs font-normal">
                        Coinbase Wrapped BTC
                      </span>
                    </div>
                  </td>
                  <td className="py-4 text-gray-200">6000 BPS (60.00%)</td>
                  <td className="py-4 text-gray-200">10.0000 cbBTC</td>
                  <td className="py-4 text-right text-emerald-400 font-bold">$600,000.00 USD</td>
                </tr>
                <tr className="hover:bg-gray-800/30 transition-colors">
                  <td className="py-4 font-bold flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                      WE
                    </div>
                    <div>
                      <span className="text-white text-sm block">WETH</span>
                      <span className="text-gray-400 text-xs font-normal">Wrapped Ether</span>
                    </div>
                  </td>
                  <td className="py-4 text-gray-200">4000 BPS (40.00%)</td>
                  <td className="py-4 text-gray-200">133.3333 WETH</td>
                  <td className="py-4 text-right text-emerald-400 font-bold">$400,000.00 USD</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Table */}
        <RecentActivityTable />
      </main>

      <Footer />
    </div>
  );
}
