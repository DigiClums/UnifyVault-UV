'use client';

import * as React from 'react';
import Link from 'next/link';
import { Container } from '../../components/layout/Container';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { usePortfolio } from '../../hooks/usePortfolio';
import { formatBigInt, formatUSD } from '../../lib/utils/formatters';
import { ConnectCard } from '../../components/web3/ConnectCard';
import { ACTIVE_CHAIN } from '../../lib/config/chains';
import { Briefcase, Coins, Info, Layers, History, ArrowUpRight, RefreshCw } from 'lucide-react';

export default function Portfolio() {
  const { isConnected } = useWallet();
  const { isSupported } = useNetwork();
  const { portfolio, isLoading, refetch } = usePortfolio();

  const isRefreshing = isLoading;

  const handleRefresh = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  const hasNoShares = React.useMemo(() => {
    return !portfolio || portfolio.sharesBalance === 0n;
  }, [portfolio]);

  return (
    <Container>
      <PageWrapper className="space-y-6 max-w-6xl mx-auto">
        {/* HEADER SECTION */}
        <div className="flex justify-between items-center border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-primary" />
              <span>Your Portfolio</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              Track your deposit allocations, share balances, and withdrawable collateral assets on{' '}
              {ACTIVE_CHAIN.name}.
            </p>
          </div>
          {isConnected && isSupported && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-xs font-bold text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 cursor-pointer"
              aria-label="Refresh Portfolio Balances"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Balances</span>
            </button>
          )}
        </div>

        {!isConnected ? (
          <div className="max-w-md mx-auto py-12">
            <ConnectCard />
          </div>
        ) : !isSupported ? (
          <div className="min-h-[350px] rounded-3xl border border-border bg-card/30 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-6">
            <h3 className="text-lg font-extrabold text-foreground">Switch Network</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Please connect your wallet to {ACTIVE_CHAIN.name} to load your vault portfolio.
            </p>
          </div>
        ) : isLoading ? (
          // SKELETON LOADING GRID
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-3xl border border-border bg-card/20 animate-pulse"
                />
              ))}
            </div>
            <div className="h-64 rounded-3xl border border-border bg-card/20 animate-pulse" />
          </div>
        ) : !portfolio ? (
          <div className="min-h-[300px] rounded-3xl border border-border bg-card/30 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
            <Info className="w-10 h-10 text-muted-foreground/30" />
            <div>
              <h3 className="text-base font-bold text-foreground">No Portfolio Data Available</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Unable to load your portfolio from the blockchain. Check your wallet connection.
              </p>
            </div>
          </div>
        ) : hasNoShares ? (
          // DETAILED EMPTY STATE
          <div className="min-h-[320px] rounded-3xl border border-border bg-card/30 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-5">
            <div className="p-4 bg-primary/10 border border-primary/20 text-primary rounded-full">
              <Briefcase className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-lg font-bold text-foreground">Your portfolio is empty</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Make your first deposit to start earning blended yields. Secure your liquidity index
                today.
              </p>
            </div>
            <Link
              href="/deposit"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background shadow-md group"
            >
              <span>Make your first deposit</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* PORTFOLIO METRICS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* TOTAL PORTFOLIO VALUE */}
              <div className="bg-card/30 border border-border rounded-3xl p-5 backdrop-blur-md space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider text-xxs">
                    Total Portfolio Value
                  </span>
                  <Briefcase className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-extrabold text-foreground tracking-tight">
                  {formatUSD(portfolio.totalPortfolioValueUSD)}
                </div>
                <p className="text-3xs text-muted-foreground leading-normal">
                  Sum of your direct wallet balances and dynamic redeemable index vault balances in
                  USD.
                </p>
              </div>

              {/* ESTIMATED REDEEMABLE VALUE */}
              <div className="bg-card/30 border border-border rounded-3xl p-5 backdrop-blur-md space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider text-xxs">
                    Withdrawable Vault Value
                  </span>
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-extrabold text-foreground tracking-tight text-primary">
                  {formatUSD(portfolio.sharesValueUSD)}
                </div>
                <p className="text-3xs text-muted-foreground leading-normal">
                  The estimated total net assets you would receive if you redeem all your share
                  tokens.
                </p>
              </div>

              {/* CURRENT SHARE BALANCE */}
              <div className="bg-card/30 border border-border rounded-3xl p-5 backdrop-blur-md space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-xs font-bold uppercase tracking-wider text-xxs">
                    Index Holdings
                  </span>
                  <Coins className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-extrabold text-foreground tracking-tight">
                  {formatBigInt(portfolio.sharesBalance, 18, 4)} Shares
                </div>
                <p className="text-3xs text-muted-foreground leading-normal">
                  Your current holding of UVBTCETH index share tokens representing ownership claims.
                </p>
              </div>
            </div>

            {/* PORTFOLIO ASSET BREAKDOWN TABLE */}
            <div className="bg-card/30 border border-border rounded-3xl p-6 backdrop-blur-md space-y-4">
              <h2 className="text-base font-bold text-foreground">Your Collateral Holdings</h2>

              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-left border-collapse min-w-[550px]">
                  <thead>
                    <tr className="border-b border-border/50 text-xxs text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-4 font-semibold">Asset</th>
                      <th className="pb-3 px-4 font-semibold text-right">Wallet Balance</th>
                      <th className="pb-3 px-4 font-semibold text-right">Redeemable Collateral</th>
                      <th className="pb-3 pl-4 font-semibold text-right">
                        Withdrawable Value (USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-xs text-foreground font-medium">
                    {portfolio.assetsBalances.map((asset) => (
                      <tr key={asset.symbol} className="hover:bg-secondary/10 transition-colors">
                        <td className="py-3.5 pr-4 font-semibold text-foreground">
                          <div>
                            <span className="block text-sm font-bold">{asset.symbol}</span>
                            <span className="block text-3xs text-muted-foreground font-normal">
                              {asset.name.replace(' (Mock)', '')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-right text-muted-foreground text-xs">
                          {formatBigInt(asset.balance, asset.decimals, 4)} {asset.symbol}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-foreground text-right text-xs">
                          {formatBigInt(asset.redeemableAmount, asset.decimals, 4)} {asset.symbol}
                        </td>
                        <td className="py-3.5 pl-4 font-bold text-foreground text-right text-xs">
                          {formatUSD(asset.redeemableValueUSD)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TRANSACTION ACTIVITY SECTION */}
            <div className="bg-card/30 border border-border rounded-3xl p-6 backdrop-blur-md space-y-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-primary" />
                <span>Transaction Activity</span>
              </h2>

              <div className="min-h-[150px] border border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground space-y-2">
                <Info className="w-6 h-6 text-muted-foreground/35" />
                <p className="font-bold text-foreground">
                  No Indexed Transaction History Available
                </p>
                <p className="max-w-md text-3xs opacity-80 leading-relaxed">
                  Transfer, deposit, and redemption events are written directly to the Base
                  blockchain. Real-time events from indexers will render in this panel in a
                  subsequent deployment.
                </p>
              </div>
            </div>
          </div>
        )}
      </PageWrapper>
    </Container>
  );
}
