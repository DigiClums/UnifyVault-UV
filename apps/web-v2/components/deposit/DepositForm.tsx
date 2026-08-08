'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { Card } from '../common/Card';
import { useDeposit } from '../../hooks/useDeposit';
import { useBalances } from '../../hooks/useBalances';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';
import { useStrategyMetrics } from '../../hooks/useStrategyMetrics';
import { getExplorerBaseUrl } from '../../constants';
import { formatUnits, formatUSD } from '../../lib/math';
import {
  ArrowDownRight,
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

export function DepositForm() {
  const { isConnected, chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const { usdcBalance, refetch: refetchBalances } = useBalances();
  const { navPerShareUSD } = useUnifiedProtocolData();
  const {
    depositAmountInput,
    setDepositAmountInput,
    slippageBps,
    setSlippageBps,
    amountRaw,
    isApproved,
    isQuoteLoading,
    formattedQuote,
    isDepositDisabled,
    depositDisabledReason,
    stepState,
    isProcessing,
    approvalTxHash,
    depositTxHash,
    txError,
    lastTxHash,
    executeDeposit,
    resetState,
  } = useDeposit();

  const usdcBalNum = parseFloat(formatUnits(usdcBalance, 6)) || 0;
  const usdcBalFormatted = formatUnits(usdcBalance, 6);

  const handlePercentageSelect = (pct: number) => {
    if (usdcBalNum <= 0) return;
    const amount = (usdcBalNum * (pct / 100)).toFixed(2);
    setDepositAmountInput(amount);
    resetState();
  };

  const handleDepositClick = async () => {
    try {
      await executeDeposit();
      refetchBalances();
    } catch {
      // Error handled inside useDeposit state
    }
  };

  const activeTxHash = depositTxHash || approvalTxHash || lastTxHash;
  const explorerTxUrl = activeTxHash ? `${explorerBaseUrl}/tx/${activeTxHash}` : explorerBaseUrl;

  const {
    targetBtcBps,
    targetEthBps,
    targetBtcPercent,
    targetEthPercent,
    isLoading: strategyLoading,
  } = useStrategyMetrics();
  const depositVal = parseFloat(depositAmountInput || '0') || 0;
  const netDepositVal = depositVal * 0.9975; // 0.25% fee deduction
  const btcDepositUSD = targetBtcBps !== undefined ? (netDepositVal * targetBtcBps) / 10000 : 0;
  const ethDepositUSD = targetEthBps !== undefined ? (netDepositVal * targetEthBps) / 10000 : 0;

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
              <ArrowDownRight className="w-5 h-5 text-accent-blue" />
              <span>Deposit & Mint Index Shares</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Single-Click USDC Collateral Deposit & Share Minting
            </p>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-accent-blue/15 dark:bg-accent-blue/10 text-blue-700 dark:text-accent-blue border border-accent-blue/30 dark:border-accent-blue/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>0.25% Fee</span>
          </div>
        </div>

        {/* Input Card */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
            <span className="font-semibold text-foreground">You Deposit Collateral</span>
            <div className="flex items-center space-x-1.5">
              <span>
                Balance:{' '}
                <span className="font-mono font-bold text-foreground">{usdcBalFormatted}</span> USDC
              </span>
            </div>
          </div>

          <div className="relative rounded-2xl bg-slate-50 dark:bg-slate-900/90 p-4 border border-slate-200 dark:border-border-subtle/80 focus-within:border-accent-blue/80 transition-all shadow-inner">
            <div className="flex items-center justify-between">
              <input
                type="number"
                placeholder="0.00"
                value={depositAmountInput}
                onChange={(e) => {
                  setDepositAmountInput(e.target.value);
                  resetState();
                }}
                className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold text-foreground placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none font-mono tracking-tight"
              />
              <div className="flex items-center space-x-2 bg-slate-200/80 dark:bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700/80 shrink-0 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[11px] font-black text-white">
                  $
                </div>
                <span className="text-sm font-bold text-foreground">USDC</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
              <span className="font-mono text-muted-foreground">≈ {formatUSD(depositVal)}</span>

              {/* Quick Percentage Buttons */}
              <div className="flex items-center space-x-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentageSelect(pct)}
                    className="px-2 py-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 hover:bg-accent-blue/20 text-[10px] font-mono font-semibold text-foreground hover:text-accent-blue border border-slate-300 dark:border-slate-700/60 hover:border-accent-blue/40 transition-all active:scale-95"
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Collateral Allocation & Quote Breakdown */}
        {amountRaw > 0n && (
          <div className="space-y-3 p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-border-subtle/70 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
              <span className="flex items-center space-x-1.5 font-bold text-foreground">
                <PieChart className="w-4 h-4 text-accent-blue" />
                <span>Strategy Allocation Breakdown</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {strategyLoading
                  ? 'Loading weights...'
                  : `${targetBtcPercent ?? '...'} BTC / ${targetEthPercent ?? '...'} ETH`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    🟠 cbBTC Allocation
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {targetBtcPercent ?? '...'}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-foreground">
                  {formatUSD(btcDepositUSD)}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                    🔷 WETH Allocation
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {targetEthPercent ?? '...'}
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-foreground">
                  {formatUSD(ethDepositUSD)}
                </div>
              </div>
            </div>

            {/* Quote Summary */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center space-x-1">
                  <span>Current NAV</span>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </span>
                <span className="font-mono text-foreground font-semibold">
                  {navPerShareUSD} / Share
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Protocol Deposit Fee (0.25%)</span>
                <span className="font-mono text-foreground">
                  {isQuoteLoading ? 'Calculating...' : formattedQuote?.protocolFeeUSD}
                </span>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800/80 pt-2 flex justify-between text-foreground font-medium">
                <span className="text-accent-blue font-semibold">Quote Shares Out</span>
                <span className="font-mono text-foreground text-sm font-bold">
                  {isQuoteLoading ? 'Calculating...' : formattedQuote?.sharesToMintFormatted}{' '}
                  UVBTCETH
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
                      className={`px-2.5 py-0.5 rounded-lg font-mono transition-all focus:ring-2 focus:ring-accent-blue/50 ${
                        slippageBps === bps
                          ? 'bg-accent-blue text-white font-bold shadow-sm'
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
        {isProcessing && (
          <div className="p-3.5 rounded-xl bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs space-y-1">
            <div className="flex items-center space-x-2 font-bold">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>
                {stepState === 'preparing' && 'Preparing deposit & fetching latest quote...'}
                {stepState === 'awaiting_approval_wallet' &&
                  'Step 1 of 2: Confirm USDC Allowance in wallet...'}
                {stepState === 'approval_pending' &&
                  'Step 1 of 2: Approving USDC Allowance on-chain...'}
                {stepState === 'approval_confirmed' && 'USDC Approved! Proceeding to Deposit...'}
                {stepState === 'awaiting_deposit_wallet' &&
                  (isApproved
                    ? 'Confirm Deposit in wallet...'
                    : 'Step 2 of 2: Confirm Deposit in wallet...')}
                {stepState === 'deposit_pending' &&
                  'Executing Deposit & Minting UVBTCETH Shares...'}
              </span>
            </div>
            {activeTxHash && (
              <div className="pl-6 text-[11px] font-mono opacity-90 truncate">
                Tx:{' '}
                <a href={explorerTxUrl} target="_blank" rel="noreferrer" className="underline">
                  {activeTxHash}
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
                <h4 className="font-bold text-sm text-foreground">Deposit Executed Successfully</h4>
                <p className="text-muted-foreground text-[11px]">
                  Your USDC collateral has been custodied and index shares minted.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-emerald-500/20 font-mono text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Gross Deposited</span>
                <span className="font-bold text-foreground">{depositAmountInput} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Shares Minted</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {formattedQuote?.sharesToMintFormatted} UVBTCETH
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Deposit Fee (0.25%)</span>
                <span>{formattedQuote?.protocolFeeUSD}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row gap-2">
              <a
                href={explorerTxUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-surface border border-border-subtle text-foreground hover:text-accent-blue font-semibold text-center flex items-center justify-center space-x-1.5 transition-colors text-xs shadow-xs"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/portfolio"
                className="flex-1 py-2.5 px-3 rounded-xl bg-accent-blue hover:bg-blue-600 text-white font-bold text-center flex items-center justify-center space-x-1.5 transition-colors shadow-glow text-xs"
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
          <div className="space-y-2">
            <button
              onClick={handleDepositClick}
              disabled={isDepositDisabled || isProcessing}
              className="w-full min-h-[48px] py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-accent-emerald dark:hover:bg-emerald-600 active:scale-[0.99] font-bold text-white text-sm shadow-glow-emerald transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 focus:ring-2 focus:ring-accent-emerald/50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {stepState === 'awaiting_approval_wallet'
                      ? 'Awaiting Wallet Approval...'
                      : stepState === 'approval_pending'
                        ? 'Approving USDC Allowance...'
                        : stepState === 'awaiting_deposit_wallet'
                          ? 'Awaiting Wallet Deposit...'
                          : 'Executing Deposit...'}
                  </span>
                </>
              ) : (
                <span>Deposit</span>
              )}
            </button>
            {isDepositDisabled && depositDisabledReason && amountRaw > 0n && !isProcessing && (
              <p className="text-[11px] text-center font-mono text-amber-600 dark:text-amber-400 font-semibold">
                ⚠️ {depositDisabledReason}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
