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
    <div className="max-w-xl mx-auto space-y-3.5">
      {/* Wallet Disconnected Subtle Banner */}
      {!isConnected && (
        <div className="p-3.5 rounded-xl bg-[#BFFF00]/10 border-2 border-black dark:border-white/15 text-foreground text-xs flex items-center space-x-2.5 shadow-2xs">
          <Wallet className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00] shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Wallet disconnected:</span> Connect your wallet to access
            portfolio operations.
          </div>
        </div>
      )}

      <Card className="space-y-4 relative overflow-hidden bg-card border-2 border-black dark:border-white/15 shadow-glass p-4 sm:p-5 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-white/10">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center space-x-2">
              <ArrowUpRight className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00] shrink-0" />
              <span>Redeem Shares</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Burn UVBE → receive USDC collateral payout
            </p>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#BFFF00] text-black border-2 border-black text-xs font-semibold shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span>2.00% fee</span>
          </div>
        </div>

        {/* Input Card */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-foreground">You Redeem</span>
            <span className="font-mono">
              Available:{' '}
              <span className="font-bold text-foreground">{sharesBalFormatted} UVBE</span>
            </span>
          </div>

          <div className="relative rounded-xl bg-black/[0.03] dark:bg-white/[0.03] p-4 border-2 border-black dark:border-white/15 focus-within:border-[#BFFF00] transition-all shadow-[3px_3px_0_rgba(0,0,0,0.85)] space-y-3">
            <div className="flex items-center justify-between gap-2">
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
              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-[#151515] px-3 py-1.5 rounded-lg border-2 border-black dark:border-white/15 shrink-0 shadow-2xs">
                <div className="w-5 h-5 rounded-full bg-[#BFFF00] border-2 border-black flex items-center justify-center text-[9px] font-black text-black">
                  UV
                </div>
                <span className="text-xs font-bold text-foreground">UVBE</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t-2 border-black dark:border-white/10">
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
                    className="px-2 py-0.5 rounded bg-card hover:bg-[#BFFF00] hover:text-black text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300 border-2 border-black dark:border-white/15 transition-all active:scale-95 shadow-2xs"
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payout Preview Breakdown */}
        <div className="space-y-2 p-3.5 rounded-xl bg-black/[0.025] dark:bg-white/[0.025] border-2 border-black dark:border-white/10 text-xs">
          <div className="flex items-center justify-between border-b-2 border-black dark:border-white/10 pb-2">
            <span className="font-semibold text-foreground">Estimated Redemption</span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {strategyLoading
                ? 'Loading weights...'
                : `${targetBtcPercent ?? '...'} BTC + ${targetEthPercent ?? '...'} ETH → USDC`}
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-slate-600 dark:text-slate-400 pt-1">
            <div className="flex justify-between">
              <span>Gross Value</span>
              <span className="font-bold text-foreground">
                {isPreviewLoading ? 'Calculating...' : grossUSD}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Redemption Fee (2.00%)</span>
              <span>-{isPreviewLoading ? 'Calculating...' : feeUSD}</span>
            </div>

            <div className="border-t-2 border-black dark:border-white/10 pt-2 flex justify-between items-center font-sans">
              <span className="font-bold text-foreground text-sm">You Receive</span>
              <span className="font-mono font-bold text-[#5f8f00] dark:text-[#BFFF00] text-base">
                {isPreviewLoading ? 'Calculating...' : netUSD}
              </span>
            </div>

            {/* Slippage Settings Pills */}
            <div className="pt-2 flex items-center justify-between border-t-2 border-black dark:border-white/10 text-[11px] font-sans">
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
                        ? 'bg-[#BFFF00] text-black border-2 border-black font-bold'
                        : 'bg-card text-slate-600 dark:text-slate-400 border-2 border-black dark:border-white/15'
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
          <div className="p-3.5 rounded-xl bg-[#BFFF00]/10 border-2 border-[#BFFF00] text-[#5f8f00] dark:text-[#BFFF00] text-xs space-y-1 font-mono">
            <div className="flex items-center space-x-2 font-bold font-sans">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>
                {stepState === 'preparing' && 'Preparing redemption & validating quote...'}
                {stepState === 'awaiting_redeem_wallet' && 'Confirm Redeem in your wallet...'}
                {stepState === 'redeem_pending' && 'Burning UVBE shares & unwinding assets...'}
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
          <div className="p-3.5 rounded-xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-700 dark:text-rose-400 text-xs flex flex-col space-y-1 font-mono">
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
          <div className="p-4 rounded-xl bg-[#BFFF00]/10 border-2 border-[#BFFF00] text-xs space-y-3.5 shadow-[3px_3px_0_#000]">
            <div className="flex items-center space-x-3 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  Redemption Executed Successfully
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Your UVBE index shares have been burned and USDC collateral transferred.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t-2 border-black/20 dark:border-white/10 font-mono text-foreground">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-sans">Shares Burned</span>
                <span className="font-bold">{sharesInput} UVBE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-sans">
                  USDC Payout Received
                </span>
                <span className="font-bold text-[#5f8f00] dark:text-[#BFFF00]">{netUSD}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-sans">
                  Redemption Fee (2.00%)
                </span>
                <span>{feeUSD}</span>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-black/20 dark:border-white/10 flex flex-col sm:flex-row gap-2">
              <a
                href={explorerTxUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-card border-2 border-black dark:border-white/15 text-slate-700 dark:text-slate-200 hover:text-[#5f8f00] dark:hover:text-[#BFFF00] font-semibold text-center flex items-center justify-center space-x-1.5 transition-colors text-xs shadow-2xs"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/portfolio"
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black border-2 border-black shadow-[3px_3px_0_#000] font-bold text-center flex items-center justify-center space-x-1.5 transition-colors shadow-xs text-xs"
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
                className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] active:translate-x-[1px] active:translate-y-[1px] font-bold text-black text-sm border-2 border-black shadow-[4px_4px_0_#000] transition-all flex items-center justify-center space-x-2"
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
            className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] active:translate-x-[1px] active:translate-y-[1px] font-bold text-black text-sm border-2 border-black shadow-[4px_4px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
