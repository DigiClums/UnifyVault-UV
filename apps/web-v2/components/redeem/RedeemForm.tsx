'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal, ConnectButton } from '@rainbow-me/rainbowkit';
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
  Wallet,
} from 'lucide-react';

export function RedeemForm() {
  const { isConnected, chain } = useAccount();
  const { openConnectModal } = useConnectModal();
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
    <div className="max-w-xl mx-auto space-y-4">
      {/* Wallet Disconnected Subtle Banner */}
      {!isConnected && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs flex items-center space-x-2.5 shadow-2xs">
          <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Wallet disconnected:</span> Connect your wallet to access
            portfolio operations.
          </div>
        </div>
      )}

      <Card className="space-y-5 relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Redeem Shares</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Burn UVBTCETH → receive USDC collateral payout
            </p>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>2.00% fee</span>
          </div>
        </div>

        {/* Input Card */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">You Redeem</span>
            <span className="font-mono">
              Available:{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {sharesBalFormatted} UVBTCETH
              </span>
            </span>
          </div>

          <div className="relative rounded-xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 focus-within:border-accent-blue transition-all shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <input
                type="number"
                placeholder="0.0000"
                value={sharesInput}
                onChange={(e) => {
                  setSharesInput(e.target.value);
                  resetState();
                }}
                className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none font-mono tracking-tight"
              />
              <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0 shadow-2xs">
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] font-black text-white">
                  UV
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">UVBTCETH</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span className="font-mono text-slate-500 dark:text-slate-400">
                Gross: {isPreviewLoading ? 'Calculating...' : grossUSD}
              </span>

              {/* Quick Percentage Buttons */}
              <div className="flex items-center space-x-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentageSelect(pct)}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-2xs"
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payout Preview Breakdown */}
        <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="font-semibold text-slate-900 dark:text-white">
              Estimated Redemption
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {strategyLoading
                ? 'Loading weights...'
                : `${targetBtcPercent ?? '...'} BTC + ${targetEthPercent ?? '...'} ETH → USDC`}
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-slate-600 dark:text-slate-400 pt-1">
            <div className="flex justify-between">
              <span>Gross Value</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {isPreviewLoading ? 'Calculating...' : grossUSD}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Redemption Fee (2.00%)</span>
              <span>-{isPreviewLoading ? 'Calculating...' : feeUSD}</span>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between items-center font-sans">
              <span className="font-bold text-slate-900 dark:text-white text-sm">You Receive</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                {isPreviewLoading ? 'Calculating...' : netUSD}
              </span>
            </div>

            {/* Slippage Settings Pills */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 text-[11px] font-sans">
              <span className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
                <Sliders className="w-3 h-3" />
                <span>Slippage Tolerance</span>
              </span>
              <div className="flex space-x-1">
                {[25, 50, 100].map((bps) => (
                  <button
                    key={bps}
                    type="button"
                    onClick={() => setSlippageBps(bps)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                      slippageBps === bps
                        ? 'bg-accent-blue text-white font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {(bps / 100).toFixed(2)}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* State Machine Status Message */}
        {isRedeeming && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs space-y-1 font-mono">
            <div className="flex items-center space-x-2 font-bold font-sans">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>
                {stepState === 'preparing' && 'Preparing redemption & validating quote...'}
                {stepState === 'awaiting_redeem_wallet' && 'Confirm Redeem in your wallet...'}
                {stepState === 'redeem_pending' && 'Burning UVBTCETH shares & unwinding assets...'}
              </span>
            </div>
            {lastTxHash && (
              <div className="pl-6 text-[11px] opacity-90 truncate">
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
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex flex-col space-y-1 font-mono">
            <div className="flex items-center space-x-2 font-semibold font-sans">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{txError}</span>
            </div>
            {lastTxHash && (
              <div className="pl-6 text-[11px] opacity-80">
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
          <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-4 shadow-sm">
            <div className="flex items-center space-x-3 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Redemption Executed Successfully
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Your UVBTCETH index shares have been burned and USDC collateral transferred.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-emerald-500/20 font-mono text-slate-900 dark:text-white">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-sans">Shares Burned</span>
                <span className="font-bold">{sharesInput} UVBTCETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-sans">
                  USDC Payout Received
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{netUSD}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-sans">
                  Redemption Fee (2.00%)
                </span>
                <span>{feeUSD}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row gap-2">
              <a
                href={explorerTxUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-accent-blue font-semibold text-center flex items-center justify-center space-x-1.5 transition-colors text-xs shadow-2xs"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/portfolio"
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center flex items-center justify-center space-x-1.5 transition-colors shadow-xs text-xs"
              >
                <span>Go to Portfolio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Execution Button / Disconnected CTA */}
        {!isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal: openModal }) => (
              <button
                onClick={openModal}
                type="button"
                className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-accent-blue hover:bg-blue-600 active:scale-[0.99] font-bold text-white text-sm shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            )}
          </ConnectButton.Custom>
        ) : (
          <button
            onClick={handleRedeemClick}
            disabled={isRedeemDisabled}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] font-bold text-white text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isRedeeming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing Redemption...</span>
              </>
            ) : (
              <span>Burn Shares & Receive USDC</span>
            )}
          </button>
        )}
      </Card>
    </div>
  );
}
