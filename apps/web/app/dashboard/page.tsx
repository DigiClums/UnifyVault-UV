'use client';

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Container } from '../../components/layout/Container';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useVaultMetrics } from '../../hooks/useVaultMetrics';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useWallet } from '../../hooks/useWallet';
import {
  formatBigInt,
  formatUSD,
  formatPercent,
  formatBps,
  formatLimit,
  MAX_UINT256,
} from '../../lib/utils/formatters';
import { AddressDisplay } from '../../components/web3/AddressDisplay';
import { ACTIVE_CHAIN } from '../../lib/config/chains';
import {
  BarChart3,
  Briefcase,
  Coins,
  TrendingUp,
  Info,
  ShieldCheck,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Zap,
  Lock,
} from 'lucide-react';

const WalletButton = dynamic(
  () => import('../../components/web3/WalletButton').then((mod) => mod.WalletButton),
  {
    ssr: false,
    loading: () => <div className="w-32 h-10 rounded-lg bg-secondary animate-pulse" />,
  },
);

export default function Dashboard() {
  const { isConnected } = useWallet();

  // 1. Fetch data hooks
  const { metrics, isLoading: isLoadingMetrics, refetch: refetchMetrics } = useVaultMetrics();
  const { portfolio, isLoading: isLoadingPortfolio, refetch: refetchPortfolio } = usePortfolio();

  const isLoading = isLoadingMetrics || (isConnected && isLoadingPortfolio);
  const isRefreshing = isLoadingMetrics || (isConnected && isLoadingPortfolio);

  // 2. Refresh handler
  const handleRefresh = React.useCallback(async () => {
    refetchMetrics();
    if (isConnected) {
      refetchPortfolio();
    }
  }, [refetchMetrics, refetchPortfolio, isConnected]);

  // 3. Vault utilization percentage calculation
  const utilizationPercentage = React.useMemo(() => {
    if (!metrics || !metrics.maxDepositLimit || metrics.totalTvlUSD === 0n) return 0;
    const limit = metrics.maxDepositLimit;
    if (limit === 0n) return 0;

    // Check if limit is MAX_UINT256
    if (limit >= MAX_UINT256 - 100n) {
      return 0; // unlimited limit implies 0% progress
    }

    const percentage = Number((metrics.totalSupply * 10000n) / limit) / 100;
    return Math.max(0, Math.min(percentage, 100));
  }, [metrics]);

  // 4. Asset allocation visual weights
  const allocationWeights = React.useMemo(() => {
    if (!metrics || metrics.totalTvlUSD === 0n) return [];
    return metrics.assetAllocations.map((alloc) => {
      const percentage = Number((alloc.assetTvlUSD * 10000n) / metrics.totalTvlUSD) / 100;
      return {
        symbol: alloc.symbol,
        percentage,
        tvl: alloc.assetTvlUSD,
      };
    });
  }, [metrics]);

  const hasNoProtocolTvl = !metrics || metrics.totalTvlUSD === 0n;
  const isLimitUnlimited =
    metrics?.maxDepositLimit && metrics.maxDepositLimit >= MAX_UINT256 - 100n;

  return (
    <Container>
      <PageWrapper className="space-y-8 max-w-6xl mx-auto">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-primary" />
              <span>Protocol Dashboard</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              Track your personal portfolio status, quick action portals, and real-time yield asset
              metrics on {ACTIVE_CHAIN.name}.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent text-xs font-bold text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 cursor-pointer"
            aria-label="Refresh Dashboard Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Portfolio</span>
          </button>
        </div>

        {isLoading ? (
          // PREMIUM SKELETON LOADING GRID
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-44 rounded-2xl border border-border bg-card/20 animate-pulse" />
              <div className="h-44 rounded-2xl border border-border bg-card/20 animate-pulse" />
            </div>
            <div className="h-96 rounded-2xl border border-border bg-card/20 animate-pulse" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* TOP ROW: PORTFOLIO SUMMARY + QUICK ACTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* SECTION 1: MY PORTFOLIO */}
              <div className="lg:col-span-2 bg-card/30 border border-border rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <span>My Portfolio</span>
                  </h2>
                  {isConnected && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-3xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Connected
                    </span>
                  )}
                </div>

                {!isConnected ? (
                  // WALLET DISCONNECTED STATE
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-center space-y-4">
                    <div className="p-3 bg-secondary/50 rounded-2xl border border-border">
                      <Lock className="w-6 h-6 text-muted-foreground/60" />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <h3 className="text-sm font-semibold text-foreground">
                        View Portfolio Metrics
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Connect your Web3 wallet to monitor your dynamic balances, index shares, and
                        redeemable yields.
                      </p>
                    </div>
                    <WalletButton />
                  </div>
                ) : !portfolio || portfolio.sharesBalance === 0n ? (
                  // EMPTY PORTFOLIO STATE
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground">
                        Your portfolio is empty.
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Deposit collateral to begin earning blended yield.
                      </p>
                    </div>
                    <Link
                      href="/deposit"
                      className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                    >
                      Make First Deposit
                    </Link>
                  </div>
                ) : (
                  // POPULATED PORTFOLIO METRICS
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {/* Portfolio Value */}
                    <div className="p-4 bg-secondary/20 rounded-2xl border border-border/40 space-y-1">
                      <span className="text-3xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Portfolio Value
                      </span>
                      <span className="text-xl font-extrabold text-foreground block tracking-tight">
                        {formatUSD(portfolio.totalPortfolioValueUSD)}
                      </span>
                      <span className="text-3xs text-muted-foreground block">
                        Wallet balance + vault assets
                      </span>
                    </div>

                    {/* Shares Held */}
                    <div className="p-4 bg-secondary/20 rounded-2xl border border-border/40 space-y-1">
                      <span className="text-3xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Shares Holdings
                      </span>
                      <span className="text-xl font-extrabold text-foreground block tracking-tight">
                        {formatBigInt(portfolio.sharesBalance, 18, 4)}
                      </span>
                      <span className="text-3xs text-muted-foreground block">
                        UV-BTC-ETH Index Shares
                      </span>
                    </div>

                    {/* Redeemable Value */}
                    <div className="p-4 bg-secondary/20 rounded-2xl border border-border/40 space-y-1">
                      <span className="text-3xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Redeemable Value
                      </span>
                      <span className="text-xl font-extrabold text-primary block tracking-tight">
                        {formatUSD(portfolio.sharesValueUSD)}
                      </span>
                      <span className="text-3xs text-muted-foreground block">
                        Estimated withdrawable assets
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: QUICK ACTIONS CARD */}
              <div className="bg-card/30 border border-border rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Quick Actions
                  </h2>
                </div>

                <div className="flex flex-col gap-2.5 flex-1 justify-center">
                  <Link
                    href="/deposit"
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background group shadow-md"
                  >
                    <span className="flex items-center gap-2">
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Deposit Collateral</span>
                    </span>
                    <ArrowUpRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>

                  <Link
                    href="/redeem"
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-secondary hover:bg-accent border border-border text-foreground text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background group"
                  >
                    <span className="flex items-center gap-2">
                      <MinusIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Redeem Shares</span>
                    </span>
                    <ArrowDownRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
                  </Link>
                </div>

                <div className="text-3xs text-center text-muted-foreground leading-snug">
                  Base L2 Transactions incur gas fees in ETH. Check tolerances before executing.
                </div>
              </div>
            </div>

            {/* HOLDINGS: ALLOCATION & COLLATERAL TABLE */}
            <div className="bg-card/30 border border-border rounded-3xl p-6 backdrop-blur-md space-y-6">
              <div>
                <h2 className="text-base font-bold text-foreground">Holdings & Asset Allocation</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Vault assets distribution, decentralised oracle price feeds, and reserves.
                </p>
              </div>

              {hasNoProtocolTvl ? (
                // ZERO-VALUE PROTOCOL STATE
                <div className="min-h-[220px] border border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <Info className="w-10 h-10 text-muted-foreground/35 animate-pulse" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">No deposits yet</h3>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Deposit collateral to begin earning yield. Be the first to deploy assets into
                      the rebalancing pool.
                    </p>
                  </div>
                  <Link
                    href="/deposit"
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold text-white transition-all shadow-md focus:outline-none"
                  >
                    Deposit Collateral
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Visual Asset Allocation Bar */}
                  <div className="space-y-2">
                    <span className="text-xxs font-bold text-muted-foreground uppercase tracking-wider block">
                      Blended Strategy Weights
                    </span>
                    <div className="w-full h-3 bg-secondary/50 rounded-full flex overflow-hidden border border-border/30">
                      {allocationWeights.map((alloc, idx) => {
                        if (alloc.percentage === 0) return null;
                        const colors = [
                          'bg-primary',
                          'bg-indigo-400',
                          'bg-amber-500',
                          'bg-emerald-500',
                        ];
                        const colorClass = colors[idx % colors.length];
                        return (
                          <div
                            key={alloc.symbol}
                            style={{ width: `${alloc.percentage}%` }}
                            className={`${colorClass} h-full transition-all`}
                            title={`${alloc.symbol}: ${alloc.percentage.toFixed(2)}%`}
                          />
                        );
                      })}
                    </div>
                    {/* Visual Legend */}
                    <div className="flex flex-wrap gap-4 pt-1">
                      {allocationWeights.map((alloc, idx) => {
                        if (alloc.percentage === 0) return null;
                        const colors = [
                          'bg-primary',
                          'bg-indigo-400',
                          'bg-amber-500',
                          'bg-emerald-500',
                        ];
                        const dotClass = colors[idx % colors.length];
                        return (
                          <div
                            key={alloc.symbol}
                            className="flex items-center gap-1.5 text-xxs font-medium text-muted-foreground"
                          >
                            <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                            <span className="text-foreground font-semibold">{alloc.symbol}</span>
                            <span>({alloc.percentage.toFixed(2)}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Collateral Table */}
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-border/50 text-xxs text-muted-foreground font-bold uppercase tracking-wider">
                          <th className="pb-3 pr-4 font-semibold">Asset</th>
                          <th className="pb-3 px-4 font-semibold">Decimals</th>
                          <th className="pb-3 px-4 font-semibold">Oracle Price (USD)</th>
                          <th className="pb-3 px-4 font-semibold">Internal Reserves</th>
                          <th className="pb-3 pl-4 font-semibold text-right">TVL (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30 text-xs text-foreground font-medium">
                        {metrics.assetAllocations.map((allocation) => (
                          <tr
                            key={allocation.symbol}
                            className="hover:bg-secondary/10 transition-colors"
                          >
                            <td className="py-3.5 pr-4 font-semibold text-foreground">
                              <div>
                                <span className="block text-sm font-bold">{allocation.symbol}</span>
                                <span className="block text-3xs text-muted-foreground font-normal">
                                  {allocation.name.replace(' (Mock)', '')}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-muted-foreground text-xs">
                              {allocation.decimals}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-foreground text-xs">
                              {formatUSD(allocation.normalizedPrice)}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-foreground text-xs">
                              {formatBigInt(allocation.totalAssets, allocation.decimals, 4)}{' '}
                              {allocation.symbol}
                            </td>
                            <td className="py-3.5 pl-4 font-bold text-foreground text-right text-xs">
                              {formatUSD(allocation.assetTvlUSD)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* PROTOCOL METRICS SUMMARY */}
            <div className="bg-card/30 border border-border rounded-3xl p-6 backdrop-blur-md space-y-6">
              <div>
                <h2 className="text-base font-bold text-foreground">Protocol Metrics</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Global parameters, pool status, and limit capacity bounds.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Value Locked */}
                <div className="p-5 bg-secondary/10 rounded-2xl border border-border/40 space-y-2">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-3xs font-bold uppercase tracking-wider">
                      Total Value Locked
                    </span>
                    <Layers className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-2xl font-extrabold text-foreground tracking-tight">
                    {metrics ? formatUSD(metrics.totalTvlUSD) : '$0.00'}
                  </div>
                  <p className="text-3xs text-muted-foreground leading-normal">
                    Aggregate USD valuation of pool deposits held across strategy smart contracts.
                  </p>
                </div>

                {/* Index Share Supply */}
                <div className="p-5 bg-secondary/10 rounded-2xl border border-border/40 space-y-2">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-3xs font-bold uppercase tracking-wider">
                      Share Supply (UVBTCETH)
                    </span>
                    <Coins className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-2xl font-extrabold text-foreground tracking-tight">
                    {metrics ? `${formatBigInt(metrics.totalSupply, 18, 2)} Shares` : '0.00 Shares'}
                  </div>
                  <p className="text-3xs text-muted-foreground leading-normal">
                    Accumulated pool representation shares minted for protocol depositors.
                  </p>
                </div>

                {/* Vault limit utilization */}
                <div className="p-5 bg-secondary/10 rounded-2xl border border-border/40 space-y-2">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-3xs font-bold uppercase tracking-wider">
                      Vault Limit Utilization
                    </span>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex justify-between items-baseline text-foreground">
                    <span className="text-2xl font-extrabold">
                      {isLimitUnlimited ? '0.00%' : `${utilizationPercentage.toFixed(2)}%`}
                    </span>
                    <span className="text-3xs text-muted-foreground font-semibold">
                      Limit: {metrics ? formatLimit(metrics.maxDepositLimit) : '0 Shares'}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-secondary/50 rounded-full overflow-hidden border border-border/20">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${isLimitUnlimited ? 0 : utilizationPercentage}%` }}
                    />
                  </div>
                  <p className="text-3xs text-muted-foreground leading-normal">
                    The active deployment capacity limit configured by governance.
                  </p>
                </div>
              </div>
            </div>

            {/* ADVANCED PARAMETERS & REGISTRY */}
            <div className="bg-card/30 border border-border rounded-3xl p-6 backdrop-blur-md space-y-6">
              <div>
                <h2 className="text-base font-bold text-foreground">Advanced Parameters</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  On-chain contract registry details and audited protocol fee architectures.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* On-Chain Contract Registry */}
                <div className="p-5 bg-secondary/10 rounded-2xl border border-border/40 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Registry</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xxs">
                      <span className="text-muted-foreground">Custody Vault Address</span>
                      <AddressDisplay address={metrics?.vaultAddress} chars={5} />
                    </div>
                    <div className="flex justify-between items-center text-xxs">
                      <span className="text-muted-foreground">Index Token Address</span>
                      <AddressDisplay address={metrics?.indexTokenAddress} chars={5} />
                    </div>
                  </div>
                </div>

                {/* Protocol Fees */}
                <div className="p-5 bg-secondary/10 rounded-2xl border border-border/40 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-primary" />
                    <span>Audited Fee Parameters</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xxs">
                      <span className="text-muted-foreground">Deposit Fee (FeeLib)</span>
                      <span className="text-foreground font-bold">
                        {formatBps(25)} ({formatPercent(0.25)})
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xxs">
                      <span className="text-muted-foreground">Redemption Fee (FeeLib)</span>
                      <span className="text-foreground font-bold">
                        {formatBps(25)} ({formatPercent(0.25)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageWrapper>
    </Container>
  );
}

// Compact helper components for clean icons
function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className={props.className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function MinusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className={props.className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
  );
}
