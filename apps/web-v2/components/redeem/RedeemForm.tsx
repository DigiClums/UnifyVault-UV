'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { Card } from '../common/Card';
import { useRedeem } from '../../hooks/useRedeem';
import { useBalances } from '../../hooks/useBalances';
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
  DollarSign,
} from 'lucide-react';

export function RedeemForm() {
  const { isConnected } = useAccount();
  const { sharesBalance, refetch: refetchBalances } = useBalances();
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
    isRedeeming,
    executeRedeem,
  } = useRedeem();

  const [txSuccess, setTxSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sharesBalNum = parseFloat(formatUnits(sharesBalance, 18)) || 0;
  const sharesBalFormatted = formatShares(sharesBalance);

  const handlePercentageSelect = (pct: number) => {
    if (sharesBalNum <= 0) return;
    const amount = (sharesBalNum * (pct / 100)).toFixed(4);
    setSharesInput(amount);
  };

  const handleRedeem = async () => {
    setErrorMessage(null);
    setTxSuccess(false);
    try {
      await executeRedeem();
      setTxSuccess(true);
      refetchBalances();
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      setErrorMessage(error?.shortMessage || error?.message || 'Redemption failed');
    }
  };

  const sharesVal = parseFloat(sharesInput || '0') || 0;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Card
        glow
        className="space-y-6 relative overflow-hidden backdrop-blur-2xl border-border-subtle/80 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle/60">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <ArrowUpRight className="w-5 h-5 text-accent-emerald" />
              <span>Redeem Shares & Payout USDC</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Burn UVBTCETH Shares for USDC Collateral Payout
            </p>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>2.00% Redeem Fee</span>
          </div>
        </div>

        {/* Input Card */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-medium text-slate-400">
            <span className="font-semibold text-slate-300">You Redeem Shares</span>
            <div className="flex items-center space-x-1.5">
              <span>
                Balance:{' '}
                <span className="font-mono font-bold text-slate-200">{sharesBalFormatted}</span>{' '}
                Shares
              </span>
            </div>
          </div>

          <div className="relative rounded-2xl bg-slate-900/90 p-4 border border-border-subtle/80 focus-within:border-accent-emerald/80 transition-all shadow-inner">
            <div className="flex items-center justify-between">
              <input
                type="number"
                placeholder="0.0000"
                value={sharesInput}
                onChange={(e) => setSharesInput(e.target.value)}
                className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold text-white placeholder-slate-600 focus:outline-none font-mono tracking-tight"
              />
              <div className="flex items-center space-x-2 bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-700/80 shrink-0 shadow-md">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white">
                  UV
                </div>
                <span className="text-sm font-bold text-white">UVBTCETH</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
              <span className="font-mono text-slate-400">
                Gross: {isPreviewLoading ? 'Calculating...' : grossUSD}
              </span>

              {/* Quick Percentage Buttons */}
              <div className="flex items-center space-x-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentageSelect(pct)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-accent-emerald/20 text-[10px] font-mono font-semibold text-slate-300 hover:text-accent-emerald border border-slate-700/60 hover:border-accent-emerald/40 transition-all active:scale-95"
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
          <div className="space-y-3 p-4 rounded-2xl bg-slate-900/70 border border-border-subtle/70 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="flex items-center space-x-1.5 font-bold text-slate-200">
                <PieChart className="w-4 h-4 text-accent-emerald" />
                <span>Strategy Unwind Breakdown</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                50% BTC + 50% ETH → USDC
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-400">🟠 cbBTC Unwound</span>
                  <span className="font-mono font-bold text-white">50%</span>
                </div>
                <div className="text-[10px] text-slate-400">Swapped back to USDC via DEX</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-cyan-400">🔷 WETH Unwound</span>
                  <span className="font-mono font-bold text-white">50%</span>
                </div>
                <div className="text-[10px] text-slate-400">Swapped back to USDC via DEX</div>
              </div>
            </div>

            {/* Quote Summary */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between text-slate-400">
                <span>Gross Collateral Value</span>
                <span className="font-mono text-slate-300">
                  {isPreviewLoading ? 'Calculating...' : grossUSD}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span className="flex items-center space-x-1">
                  <span>Protocol Redemption Fee (2.00%)</span>
                  <Info className="w-3 h-3 text-slate-500" />
                </span>
                <span className="font-mono text-slate-400">
                  {isPreviewLoading ? 'Calculating...' : feeUSD}
                </span>
              </div>

              <div className="border-t border-slate-800/80 pt-2 flex justify-between text-slate-200 font-medium">
                <span className="text-accent-emerald font-semibold">Net USDC Received</span>
                <span className="font-mono text-white text-sm font-bold">
                  {isPreviewLoading ? 'Calculating...' : netUSD}
                </span>
              </div>

              {/* Slippage Settings Pills */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800/60 text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <Sliders className="w-3 h-3 text-slate-500" />
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
                          ? 'bg-accent-emerald text-white font-bold shadow-sm'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
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

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Transaction Success Screen */}
        {txSuccess && (
          <div className="p-5 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-xs space-y-4 shadow-xl">
            <div className="flex items-center space-x-3 text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-white">Redemption Executed Successfully</h4>
                <p className="text-slate-300 text-[11px]">
                  Your UVBTCETH index shares have been burned and USDC collateral transferred.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-emerald-500/20 font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Shares Burned</span>
                <span className="font-bold text-white">{sharesInput} UVBTCETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">USDC Payout Received</span>
                <span className="font-bold text-emerald-400">{netUSD}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Redemption Fee (2.00%)</span>
                <span>{feeUSD}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row gap-2">
              <a
                href="https://sepolia.basescan.org"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-surface border border-border-subtle text-slate-300 hover:text-white font-semibold text-center flex items-center justify-center space-x-1.5 transition-colors text-xs"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/portfolio"
                className="flex-1 py-2.5 px-3 rounded-xl bg-accent-emerald hover:bg-emerald-600 text-white font-bold text-center flex items-center justify-center space-x-1.5 transition-colors shadow-glow-emerald text-xs"
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
            className="w-full min-h-[48px] py-4 rounded-xl bg-slate-800 text-slate-400 font-bold text-sm cursor-not-allowed"
          >
            Please Connect Wallet
          </button>
        ) : (
          <button
            onClick={handleRedeem}
            disabled={sharesRaw <= 0n || isRedeeming}
            className="w-full min-h-[48px] py-4 rounded-xl bg-accent-emerald hover:bg-emerald-600 active:scale-[0.99] font-bold text-white text-sm shadow-glow-emerald transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 focus:ring-2 focus:ring-accent-emerald/50"
          >
            {isRedeeming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing Multi-Asset Redemption...</span>
              </>
            ) : (
              <span>Confirm Redemption & Burn Shares</span>
            )}
          </button>
        )}
      </Card>
    </div>
  );
}
