'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { Card } from '../common/Card';
import { useRedeem } from '../../hooks/useRedeem';
import { useBalances } from '../../hooks/useBalances';
import { useStrategyMetrics } from '../../hooks/useStrategyMetrics';
import { getExplorerBaseUrl } from '../../constants';
import { formatUnits, formatShares } from '../../lib/math';
import {
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Info,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  PieChart,
  Sliders,
} from 'lucide-react';

export function RedeemForm() {
  const { isConnected, chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const { sharesBalance, refetch: refetchBalances } = useBalances();
  const { targetBtcPercent, targetEthPercent, isLoading: strategyLoading } = useStrategyMetrics();
  const {
    sharesInput,
    setSharesInput,
    slippageBps,
    setSlippageBps,
    sharesRaw,
    grossUSD,
    feeUSD,
    netUSD,
    isPreviewLoading,
    stepState,
    isRedeeming,
    isRedeemDisabled,
    txError,
    lastTxHash,
    executeRedeem,
    resetState,
  } = useRedeem();

  const sharesBalNum = parseFloat(formatUnits(sharesBalance, 18)) || 0;
  const sharesBalFormatted = formatShares(sharesBalance);

  const handlePercentageSelect = (pct: number) => {
    if (sharesBalNum <= 0) return;
    const amount = (sharesBalNum * (pct / 100)).toFixed(4);
    setSharesInput(amount);
    resetState();
  };

  const handleRedeemClick = async () => {
    try {
      await executeRedeem();
      refetchBalances();
    } catch {
      // Error handled inside useRedeem state
    }
  };

  const explorerTxUrl = lastTxHash ? `${explorerBaseUrl}/tx/${lastTxHash}` : explorerBaseUrl;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Card
        glow
        className="space-y-6 relative overflow-hidden backdrop-blur-2xl border-border-subtle/80 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle/60">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center space-x-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-accent-emerald" />
              <span>Redeem Shares & Payout USDC</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Burn UVBTCETH Shares for USDC Collateral Payout
            </p>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 dark:bg-accent-emerald/10 text-emerald-700 dark:text-accent-emerald border border-emerald-500/30 dark:border-accent-emerald/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>2.00% Fee</span>
          </div>
        </div>

        {/* Input Card */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
            <span className="font-semibold text-foreground">You Redeem Shares</span>
            <div className="flex items-center space-x-1.5">
              <span>
                Balance:{' '}
                <span className="font-mono font-bold text-foreground">{sharesBalFormatted}</span>{' '}
                Shares
              </span>
            </div>
          </div>

          <div className="relative rounded-2xl bg-slate-50 dark:bg-slate-900/90 p-4 border border-slate-200 dark:border-border-subtle/80 focus-within:border-accent-emerald/80 transition-all shadow-inner">
            <div className="flex items-center justify-between">
              <input
                type="number"
                placeholder="0.0000"
                value={sharesInput}
                onChange={(e) => {
                  setSharesInput(e.target.value);
                  resetState();
                }}
                className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold text-foreground placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none font-mono tracking-tight"
              />
              <div className="flex items-center space-x-2 bg-slate-200/80 dark:bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700/80 shrink-0 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white">
                  UV
                </div>
                <span className="text-sm font-bold text-foreground">UVBTCETH</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
              <span className="font-mono text-muted-foreground">
                Gross: {isPreviewLoading ? 'Calculating...' : grossUSD}
              </span>

              {/* Quick Percentage Buttons */}
              <div className="flex items-center space-x-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentageSelect(pct)}
                    className="px-2 py-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 hover:bg-accent-emerald/20 text-[10px] font-mono font-semibold text-foreground hover:text-emerald-700 dark:hover:text-accent-emerald border border-slate-300 dark:border-slate-700/60 hover:border-accent-emerald/40 transition-all active:scale-95"
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Multi-Asset Unwind Breakdown */}
        {sharesRaw > 0n && (
          <div className="space-y-3 p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-border-subtle/70 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
              <span className="flex items-center space-x-1.5 font-bold text-foreground">
                <PieChart className="w-4 h-4 text-emerald-600 dark:text-accent-emerald" />
                <span>Strategy Unwind Breakdown</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {strategyLoading
                  ? 'Loading weights...'
                  : `${targetBtcPercent ?? '...'} BTC + ${targetEthPercent ?? '...'} ETH → USDC`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    🟠 cbBTC Unwound
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {targetBtcPercent ?? '...'}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Swapped back to USDC via DEX
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                    🔷 WETH Unwound
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {targetEthPercent ?? '...'}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Swapped back to USDC via DEX
                </div>
              </div>
            </div>

            {/* Quote Summary */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <div className="flex justify-between text-muted-foreground">
                <span>Gross Collateral Value</span>
                <span className="font-mono text-foreground">
                  {isPreviewLoading ? 'Calculating...' : grossUSD}
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center space-x-1">
                  <span>Protocol Redemption Fee (2.00%)</span>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </span>
                <span className="font-mono text-muted-foreground">
                  {isPreviewLoading ? 'Calculating...' : feeUSD}
                </span>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800/80 pt-2 flex justify-between text-foreground font-medium">
                <span className="text-emerald-700 dark:text-accent-emerald font-semibold">
                  You Receive (USDC)
                </span>
                <span className="font-mono text-foreground text-sm font-bold">
                  {isPreviewLoading ? 'Calculating...' : netUSD}
                </span>
              </div>

              {/* Slippage Settings Pills */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/60 text-[11px] text-muted-foreground">
                <span className="flex items-center space-x-1">
                  <Sliders className="w-3 h-3 text-muted-foreground" />
                  <span>Slippage Tolerance</span>
                </span>
                <div className="flex space-x-1">
                  {[25, 50, 100].map((bps) => (
                    <button
                      key={bps}
                      type="button"
                      onClick={() => setSlippageBps(bps)}
                      className={`px-2.5 py-0.5 rounded-lg font-mono transition-all focus:ring-2 focus:ring-accent-emerald/50 ${
                        slippageBps === bps
                          ? 'bg-emerald-600 dark:bg-accent-emerald text-white font-bold shadow-sm'
                          : 'bg-slate-200/80 dark:bg-slate-800/80 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {(bps / 100).toFixed(2)}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State Machine Status Message */}
        {isRedeeming && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-accent-emerald text-xs space-y-1">
            <div className="flex items-center space-x-2 font-bold">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>
                {stepState === 'preparing' && 'Preparing redemption & validating quote...'}
                {stepState === 'awaiting_redeem_wallet' && 'Confirm Redeem in your wallet...'}
                {stepState === 'redeem_pending' && 'Burning UVBTCETH shares & unwinding assets...'}
              </span>
            </div>
            {lastTxHash && (
              <div className="pl-6 text-[11px] font-mono opacity-90 truncate">
                Tx:{' '}
                <a href={explorerTxUrl} target="_blank" rel="noreferrer" className="underline">
                  {lastTxHash}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Error Notification */}
        {txError && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 dark:bg-accent-rose/10 border border-rose-500/30 dark:border-accent-rose/20 text-rose-700 dark:text-accent-rose text-xs flex flex-col space-y-1">
            <div className="flex items-center space-x-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{txError}</span>
            </div>
            {lastTxHash && (
              <div className="pl-6 text-[11px] font-mono opacity-80">
                Tx:{' '}
                <a href={explorerTxUrl} target="_blank" rel="noreferrer" className="underline">
                  {lastTxHash}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Transaction Success Screen */}
        {stepState === 'confirmed' && (
          <div className="p-5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/50 border border-emerald-500/30 text-xs space-y-4 shadow-xl">
            <div className="flex items-center space-x-3 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  Redemption Executed Successfully
                </h4>
                <p className="text-muted-foreground text-[11px]">
                  Your UVBTCETH index shares have been burned and USDC collateral transferred.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-emerald-500/20 font-mono text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Shares Burned</span>
                <span className="font-bold text-foreground">{sharesInput} UVBTCETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">USDC Payout Received</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{netUSD}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Redemption Fee (2.00%)</span>
                <span>{feeUSD}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row gap-2">
              <a
                href={explorerTxUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-surface border border-border-subtle text-foreground hover:text-accent-emerald font-semibold text-center flex items-center justify-center space-x-1.5 transition-colors text-xs shadow-xs"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/portfolio"
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center flex items-center justify-center space-x-1.5 transition-colors shadow-glow-emerald text-xs"
              >
                <span>Go to Portfolio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Execution Button */}
        {!isConnected ? (
          <button
            disabled
            className="w-full min-h-[48px] py-4 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm cursor-not-allowed"
          >
            Please Connect Wallet
          </button>
        ) : (
          <button
            onClick={handleRedeemClick}
            disabled={isRedeemDisabled}
            className="w-full min-h-[48px] py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-accent-emerald dark:hover:bg-emerald-600 active:scale-[0.99] font-bold text-white text-sm shadow-glow-emerald transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 focus:ring-2 focus:ring-accent-emerald/50"
          >
            {isRedeeming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing Redemption...</span>
              </>
            ) : (
              <span>Redeem</span>
            )}
          </button>
        )}
      </Card>
    </div>
  );
}
