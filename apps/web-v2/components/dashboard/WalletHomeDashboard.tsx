'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Coins,
  ShieldCheck,
  Zap,
  ChevronRight,
  Wallet,
  ExternalLink,
  Layers,
  Sparkles,
  Send,
} from 'lucide-react';
import { DashboardMetrics } from '../../types';
import { useAccount } from 'wagmi';
import { useStaking } from '../../hooks/useStaking';
import { getExplorerBaseUrl } from '../../constants';

import { TokenIcon } from '../ui/TokenIcon';

interface WalletHomeDashboardProps {
  metrics: DashboardMetrics;
  networkName: string;
}

export function WalletHomeDashboard({ metrics, networkName }: WalletHomeDashboardProps) {
  const { address, isConnected, chain } = useAccount();
  const { userStake, claimableRewards, formattedStakeAmount, formattedRewardsAmount } =
    useStaking();
  const explorerUrl = getExplorerBaseUrl(chain?.id || 8453);

  const shortAddr = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Connect Wallet';

  const isLive = metrics.isLiveSynced ?? true;
  const isPositive = metrics.isProfitable ?? true;

  // Numerical values
  const uvbeSharePrice = metrics.sharePriceNumber || 1.0;
  const userVaultShares = parseFloat(metrics.userSharesBalance?.replace(/,/g, '') || '0');
  const userUsdc = parseFloat(metrics.userUsdcBalance?.replace(/,/g, '') || '0');
  const userStakedUvbe = parseFloat(formattedStakeAmount?.replace(/,/g, '') || '0');
  const userClaimableUvbe = parseFloat(formattedRewardsAmount?.replace(/,/g, '') || '0');

  // USD Calculations
  const uvbeHoldingUsd = userVaultShares * uvbeSharePrice;
  const usdcHoldingUsd = userUsdc * 1.0;
  const stakedHoldingUsd = userStakedUvbe * uvbeSharePrice;
  const rewardsHoldingUsd = userClaimableUvbe * uvbeSharePrice;
  const totalNetWorthUsd = uvbeHoldingUsd + usdcHoldingUsd + stakedHoldingUsd + rewardsHoldingUsd;

  // Percentage Calculations
  const uvbePct = totalNetWorthUsd > 0 ? (uvbeHoldingUsd / totalNetWorthUsd) * 100 : 0;
  const usdcPct = totalNetWorthUsd > 0 ? (usdcHoldingUsd / totalNetWorthUsd) * 100 : 0;
  const stakedPct = totalNetWorthUsd > 0 ? (stakedHoldingUsd / totalNetWorthUsd) * 100 : 0;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto pb-10">
      {/* ── 1. WALLET HERO CARD (Total Net Worth) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-card border-2 border-black dark:border-white/15 p-5 sm:p-7 shadow-[6px_6px_0_#BFFF00] text-foreground">
        {/* Neon Top Accent */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#BFFF00]" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Total Wallet Net Worth
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black bg-[#BFFF00] text-black border border-black">
                <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
                {networkName}
              </span>
            </div>

            {/* Total Balance */}
            <div className="mt-2 text-3xl sm:text-5xl lg:text-6xl font-black font-mono tracking-tight text-foreground">
              {metrics.isLoading ? (
                <div className="h-12 w-48 bg-muted rounded-lg animate-pulse" />
              ) : (
                `$${totalNetWorthUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>

            {/* PnL & Yield Badges */}
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
              <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold ${
                  isPositive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{metrics.pnlUSD || '$0.00'}</span>
                <span className="opacity-70">({metrics.pnlPercentage || '0.00%'})</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-foreground/80 border border-black/10 dark:border-white/10">
                <Zap className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
                <span>
                  UV Price: <strong>${uvbeSharePrice.toFixed(4)}</strong>
                </span>
              </div>

              {rewardsHoldingUsd > 0 && (
                <Link
                  href="/staking"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30 hover:bg-[#BFFF00]/20 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Claimable: +${rewardsHoldingUsd.toFixed(2)}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Wallet Address & Status Pill */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
            <div className="flex items-center space-x-2 text-xs font-mono text-muted-foreground bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-border">
              <Wallet className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
              <span>{shortAddr(address)}</span>
            </div>
            <a
              href={`${explorerUrl}/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono text-muted-foreground hover:text-[#5f8f00] dark:hover:text-[#BFFF00] flex items-center gap-1 transition-colors"
            >
              <span>View on BaseScan</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* ── 5 ONE-TAP ACTION BUTTONS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5 mt-6 pt-5 border-t border-border">
          {/* Action 1: Deposit */}
          <Link
            href="/deposit"
            className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-[#BFFF00] text-black font-black hover:bg-[#a6df00] transition-all transform active:scale-95 border-2 border-black shadow-[2px_2px_0_#000]"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black text-[#BFFF00] flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm font-black truncate">Deposit</div>
              <div className="text-[9px] sm:text-[10px] opacity-70 font-semibold hidden sm:block truncate">
                Mint Shares
              </div>
            </div>
          </Link>

          {/* Action 2: Redeem */}
          <Link
            href="/redeem"
            className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-foreground font-black border-2 border-black dark:border-white/15 hover:border-[#BFFF00] transition-all transform active:scale-95 shadow-[2px_2px_0_rgba(0,0,0,0.85)]"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black text-rose-400 dark:bg-white/10 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm font-black truncate">Redeem</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground font-normal hidden sm:block truncate">
                Cash Out
              </div>
            </div>
          </Link>

          {/* Action 3: Transfer / Send */}
          <Link
            href="/transfer"
            className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-foreground font-black border-2 border-black dark:border-white/15 hover:border-[#BFFF00] transition-all transform active:scale-95 shadow-[2px_2px_0_rgba(0,0,0,0.85)]"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black text-white dark:bg-white/10 dark:text-white flex items-center justify-center shrink-0">
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm font-black truncate">Send</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground font-normal hidden sm:block truncate">
                Transfer
              </div>
            </div>
          </Link>

          {/* Action 4: P2P Trade */}
          <Link
            href="/p2p"
            className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-foreground font-black border-2 border-black dark:border-white/15 hover:border-[#BFFF00] transition-all transform active:scale-95 shadow-[2px_2px_0_rgba(0,0,0,0.85)]"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black text-[#BFFF00] dark:bg-white/10 dark:text-[#BFFF00] flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm font-black truncate">P2P Trade</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground font-normal hidden sm:block truncate">
                Zero Gas
              </div>
            </div>
          </Link>

          {/* Action 5: Staking APY */}
          <Link
            href="/staking"
            className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-foreground font-black border-2 border-black dark:border-white/15 hover:border-[#BFFF00] transition-all transform active:scale-95 shadow-[2px_2px_0_rgba(0,0,0,0.85)] col-span-2 sm:col-span-1"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black text-emerald-400 dark:bg-white/10 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm font-black truncate">Stake & Earn</div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground font-normal hidden sm:block truncate">
                Live Yield
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 2. ASSETS / TOKEN HOLDINGS LIST ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 Cols: Asset List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#BFFF00]" />
              <span>Your Assets & Holdings</span>
            </h2>
            <span className="text-xs font-mono text-muted-foreground">{networkName}</span>
          </div>

          <div className="space-y-2.5">
            {/* Asset 1: UVBE Index Shares */}
            <div className="p-4 rounded-2xl bg-card border-2 border-black dark:border-white/15 hover:border-[#BFFF00] transition-all shadow-[3px_3px_0_rgba(0,0,0,0.85)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TokenIcon symbol="UVBE" size={40} />
                  <div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <span>UVBE Index Token</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        60% cbBTC / 40% ETH
                      </span>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">
                      NAV: ${uvbeSharePrice.toFixed(4)} USD
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="font-bold text-sm text-foreground">
                    $
                    {uvbeHoldingUsd.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {userVaultShares.toLocaleString('en-US', { maximumFractionDigits: 4 })} UVBE
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Vault Allocation Weight</span>
                  <span>{uvbePct.toFixed(1)}% of Portfolio</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#BFFF00] h-full transition-all"
                    style={{ width: `${uvbePct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Asset 2: USDC Stablecoin */}
            <div className="p-4 rounded-2xl bg-card border-2 border-black dark:border-white/15 hover:border-[#BFFF00] transition-all shadow-[3px_3px_0_rgba(0,0,0,0.85)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TokenIcon symbol="USDC" size={40} />
                  <div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <span>USD Coin (USDC)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Liquid Reserve
                      </span>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">
                      Price: $1.0000 USD
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="font-bold text-sm text-foreground">
                    $
                    {usdcHoldingUsd.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {userUsdc.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Liquid Cash Weight</span>
                  <span>{usdcPct.toFixed(1)}% of Portfolio</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all"
                    style={{ width: `${usdcPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Asset 3: Staked UVBE */}
            <div className="p-4 rounded-2xl bg-card border-2 border-black dark:border-white/15 hover:border-[#BFFF00] transition-all shadow-[3px_3px_0_rgba(0,0,0,0.85)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 text-white font-black flex items-center justify-center border-2 border-black text-sm">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <span>Staked UVBE (Locked 95%)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        Yield Accruing
                      </span>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">
                      Dynamic APY Engine Active
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="font-bold text-sm text-foreground">
                    $
                    {stakedHoldingUsd.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {userStakedUvbe.toLocaleString('en-US', { maximumFractionDigits: 4 })} UVBE
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Staked Capital Weight</span>
                  <span>{stakedPct.toFixed(1)}% of Portfolio</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full transition-all"
                    style={{ width: `${stakedPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Info & Vault Allocations */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-card border-2 border-black dark:border-white/15 space-y-4 shadow-[4px_4px_0_rgba(0,0,0,0.85)]">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#BFFF00]" />
              <span>Institutional Strategy</span>
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-border-subtle flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="font-bold">cbBTC Reserve</span>
                </div>
                <span className="font-black text-[#F59E0B]">60.0% (6,000 BPS)</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-border-subtle flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                  <span className="font-bold">WETH Reserve</span>
                </div>
                <span className="font-black text-[#3B82F6]">40.0% (4,000 BPS)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border-subtle/60 text-xs text-muted-foreground leading-relaxed">
              UnifyVault indices are backed 100% on-chain by cbBTC & WETH reserves custodianed by
              the Custody Vault on Base Mainnet.
            </div>

            <Link
              href="/portfolio"
              className="w-full py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold text-xs flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
            >
              <span>View Deep Portfolio Analytics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick Support & Documentation */}
          <div className="p-4 rounded-2xl bg-[#BFFF00]/10 border border-[#BFFF00]/30 text-xs space-y-2">
            <div className="font-bold text-[#5f8f00] dark:text-[#BFFF00] flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>Smart Wallet (Zero Gas)</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Transactions are automatically sponsored with zero gas fees on Base network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
