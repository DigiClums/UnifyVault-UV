'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { Card } from '../common/Card';
import { useDeposit } from '../../hooks/useDeposit';
import { useBalances } from '../../hooks/useBalances';
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
  Check,
  PieChart,
  Sliders,
} from 'lucide-react';

export function DepositForm() {
  const { isConnected } = useAccount();
  const { usdcBalance, refetch: refetchBalances } = useBalances();
  const {
    depositAmountInput,
    setDepositAmountInput,
    slippageBps,
    setSlippageBps,
    amountRaw,
    isApproved,
    isApproving,
    isDepositing,
    isQuoteLoading,
    formattedQuote,
    approve,
    executeDeposit,
  } = useDeposit();

  const [txSuccess, setTxSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const usdcBalNum = parseFloat(formatUnits(usdcBalance, 6)) || 0;
  const usdcBalFormatted = formatUnits(usdcBalance, 6);

  const handlePercentageSelect = (pct: number) => {
    if (usdcBalNum <= 0) return;
    const amount = (usdcBalNum * (pct / 100)).toFixed(2);
    setDepositAmountInput(amount);
  };

  const handleApprove = async () => {
    setErrorMessage(null);
    try {
      await approve();
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      setErrorMessage(error?.shortMessage || error?.message || 'Approval failed');
    }
  };

  const handleDeposit = async () => {
    setErrorMessage(null);
    setTxSuccess(false);
    try {
      await executeDeposit();
      setTxSuccess(true);
      refetchBalances();
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      setErrorMessage(error?.shortMessage || error?.message || 'Deposit failed');
    }
  };

  const depositVal = parseFloat(depositAmountInput || '0') || 0;
  const netDepositVal = depositVal * 0.9975; // 0.25% fee deduction
  const halfDepositUSD = netDepositVal / 2;

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
              Mint UVBTCETH Index Shares with USDC Collateral
            </p>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-accent-blue/15 dark:bg-accent-blue/10 text-blue-700 dark:text-accent-blue border border-accent-blue/30 dark:border-accent-blue/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>0.25% Deposit Fee</span>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-border-subtle/80 text-xs">
          <div
            className={`flex items-center space-x-2.5 p-2 rounded-lg font-semibold transition-all ${
              isApproved
                ? 'bg-emerald-500/15 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm'
                : 'bg-accent-blue/15 dark:bg-accent-blue/10 text-blue-700 dark:text-accent-blue border border-accent-blue/30 dark:border-accent-blue/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isApproved
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white'
                  : 'bg-accent-blue text-white'
              }`}
            >
              {isApproved ? <Check className="w-3 h-3" /> : '1'}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70 font-mono">
                STEP 1
              </div>
              <div className="text-xs font-bold">USDC Allowance</div>
            </div>
          </div>

          <div
            className={`flex items-center space-x-2.5 p-2 rounded-lg font-semibold transition-all ${
              isApproved
                ? 'bg-accent-blue/15 dark:bg-accent-blue/10 text-blue-700 dark:text-accent-blue border border-accent-blue/30 dark:border-accent-blue/20 shadow-sm'
                : 'bg-slate-200/50 dark:bg-slate-900/40 text-muted-foreground border border-transparent'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isApproved
                  ? 'bg-accent-blue text-white'
                  : 'bg-slate-300 dark:bg-slate-800 text-muted-foreground'
              }`}
            >
              2
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70 font-mono">
                STEP 2
              </div>
              <div className="text-xs font-bold">Confirm Deposit</div>
            </div>
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
                onChange={(e) => setDepositAmountInput(e.target.value)}
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

        {/* Live 50/50 Collateral Allocation Visualizer */}
        {amountRaw > 0n && (
          <div className="space-y-3 p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-border-subtle/70 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
              <span className="flex items-center space-x-1.5 font-bold text-foreground">
                <PieChart className="w-4 h-4 text-accent-blue" />
                <span>Strategy Allocation Breakdown</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                50% BTC / 50% ETH
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                    <span>🟠 cbBTC Allocation</span>
                  </span>
                  <span className="font-mono font-bold text-foreground">50%</span>
                </div>
                <div className="text-xs font-mono font-bold text-foreground">
                  {formatUSD(halfDepositUSD)}
                </div>
                <div className="text-[10px] text-muted-foreground">Atomic Uniswap V3 Swap</div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-cyan-600 dark:text-cyan-400 flex items-center space-x-1">
                    <span>🔷 WETH Allocation</span>
                  </span>
                  <span className="font-mono font-bold text-foreground">50%</span>
                </div>
                <div className="text-xs font-mono font-bold text-foreground">
                  {formatUSD(halfDepositUSD)}
                </div>
                <div className="text-[10px] text-muted-foreground">Atomic Uniswap V3 Swap</div>
              </div>
            </div>

            {/* Quote Summary */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center space-x-1">
                  <span>Protocol Deposit Fee (0.25%)</span>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </span>
                <span className="font-mono text-foreground">
                  {isQuoteLoading ? 'Calculating...' : formattedQuote?.protocolFeeUSD}
                </span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span>Net Collateral Deposited</span>
                <span className="font-mono text-foreground font-semibold">
                  {isQuoteLoading ? 'Calculating...' : formattedQuote?.netDepositUSD}
                </span>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800/80 pt-2 flex justify-between text-foreground font-medium">
                <span className="text-accent-blue font-semibold">Estimated Shares Out</span>
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

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 dark:bg-accent-rose/10 border border-rose-500/30 dark:border-accent-rose/20 text-rose-700 dark:text-accent-rose text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Transaction Success Screen */}
        {txSuccess && (
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
                href="https://basescan.org"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-surface border border-border-subtle text-foreground hover:text-accent-blue font-semibold text-center flex items-center justify-center space-x-1.5 transition-colors text-xs shadow-xs"
              >
                <span>View on BaseScan</span>
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

        {/* Execution Buttons */}
        {!isConnected ? (
          <button
            disabled
            className="w-full min-h-[48px] py-4 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm cursor-not-allowed"
          >
            Please Connect Wallet
          </button>
        ) : !isApproved ? (
          <button
            onClick={handleApprove}
            disabled={amountRaw <= 0n || isApproving}
            className="w-full min-h-[48px] py-4 rounded-xl bg-accent-blue hover:bg-blue-600 active:scale-[0.99] font-bold text-white text-sm shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 focus:ring-2 focus:ring-accent-blue/50"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Approving USDC Allowance...</span>
              </>
            ) : (
              <span>Step 1: Approve USDC Allowance</span>
            )}
          </button>
        ) : (
          <button
            onClick={handleDeposit}
            disabled={amountRaw <= 0n || isDepositing}
            className="w-full min-h-[48px] py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-accent-emerald dark:hover:bg-emerald-600 active:scale-[0.99] font-bold text-white text-sm shadow-glow-emerald transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 focus:ring-2 focus:ring-accent-emerald/50"
          >
            {isDepositing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing Deposit & Minting Shares...</span>
              </>
            ) : (
              <span>Step 2: Confirm Live Deposit</span>
            )}
          </button>
        )}
      </Card>
    </div>
  );
}
