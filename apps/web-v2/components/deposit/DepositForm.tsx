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
} from 'lucide-react';

export function DepositForm() {
  const { isConnected } = useAccount();
  const { usdcBalance } = useBalances();
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

  const handleMax = () => {
    setDepositAmountInput(formatUnits(usdcBalance, 6));
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
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      setErrorMessage(error?.shortMessage || error?.message || 'Deposit failed');
    }
  };

  const usdcBalFormatted = formatUnits(usdcBalance, 6);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Card glow className="space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <ArrowDownRight className="w-5 h-5 text-accent-blue" />
              <span>Deposit Collateral</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Mint UVBTCETH Index Shares with USDC</p>
          </div>
          <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Coinbase-Style Live Quote</span>
          </div>
        </div>

        {/* Task 7: Two-Step Progress Indicator */}
        <div className="grid grid-cols-2 gap-3 p-1 bg-surface/60 rounded-xl border border-border-subtle/80 text-xs">
          <div
            className={`flex items-center space-x-2 p-2 rounded-lg font-semibold transition-all ${
              isApproved
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isApproved ? 'bg-emerald-500 text-white' : 'bg-accent-blue text-white'
              }`}
            >
              {isApproved ? <Check className="w-3 h-3" /> : '1'}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">STEP 1</div>
              <div className="text-xs font-bold">USDC Allowance</div>
            </div>
          </div>

          <div
            className={`flex items-center space-x-2 p-2 rounded-lg font-semibold transition-all ${
              isApproved
                ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                : 'bg-slate-900/40 text-slate-500 border border-transparent'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isApproved ? 'bg-accent-blue text-white' : 'bg-slate-800 text-slate-500'
              }`}
            >
              2
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">STEP 2</div>
              <div className="text-xs font-bold">Confirm Deposit</div>
            </div>
          </div>
        </div>

        {/* Input Card */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-slate-400">
            <span>You Deposit</span>
            <span className="flex items-center space-x-1">
              <span>Balance: {usdcBalFormatted} USDC</span>
              <button
                onClick={handleMax}
                className="text-accent-blue hover:underline font-semibold ml-1 focus:ring-2 focus:ring-accent-blue/50 rounded"
              >
                MAX
              </button>
            </span>
          </div>

          <div className="relative rounded-xl bg-surface/80 p-4 border border-border-subtle focus-within:border-accent-blue transition-all">
            <div className="flex items-center justify-between">
              <input
                type="number"
                placeholder="0.00"
                value={depositAmountInput}
                onChange={(e) => setDepositAmountInput(e.target.value)}
                className="w-full bg-transparent text-2xl font-bold text-white placeholder-slate-600 focus:outline-none font-mono"
              />
              <div className="flex items-center space-x-2 bg-card px-3 py-1.5 rounded-lg border border-border-subtle shrink-0">
                <div className="w-5 h-5 rounded-full bg-accent-blue flex items-center justify-center text-[10px] font-bold text-white">
                  $
                </div>
                <span className="text-sm font-bold text-white">USDC</span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              ≈ {formatUSD(depositAmountInput ? parseFloat(depositAmountInput) || 0 : 0)}
            </div>
          </div>
        </div>

        {/* Live Calculation Preview Breakdown */}
        {amountRaw > 0n && (
          <div className="space-y-3 p-4 rounded-xl bg-surface/40 border border-border-subtle text-xs">
            <div className="flex justify-between text-slate-400">
              <span className="flex items-center space-x-1">
                <span>Protocol Deposit Fee (0.25%)</span>
                <Info className="w-3 h-3 text-slate-500" />
              </span>
              <span className="font-mono text-slate-300">
                {isQuoteLoading ? 'Calculating...' : formattedQuote?.protocolFeeUSD}
              </span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Net Collateral Deposited</span>
              <span className="font-mono text-slate-200 font-semibold">
                {isQuoteLoading ? 'Calculating...' : formattedQuote?.netDepositUSD}
              </span>
            </div>

            <div className="border-t border-border-subtle pt-2 flex justify-between text-slate-200 font-medium">
              <span className="text-accent-blue font-semibold">Estimated Shares Out</span>
              <span className="font-mono text-white text-sm font-bold">
                {isQuoteLoading ? 'Calculating...' : formattedQuote?.sharesToMintFormatted} UVBTCETH
              </span>
            </div>

            {/* Slippage Settings */}
            <div className="pt-2 flex items-center justify-between border-t border-border-subtle/50 text-[11px] text-slate-400">
              <span>Slippage Tolerance</span>
              <div className="flex space-x-1">
                {[25, 50, 100].map((bps) => (
                  <button
                    key={bps}
                    onClick={() => setSlippageBps(bps)}
                    className={`px-2 py-0.5 rounded font-mono transition-all focus:ring-2 focus:ring-accent-blue/50 ${
                      slippageBps === bps
                        ? 'bg-accent-blue text-white font-bold'
                        : 'bg-card text-slate-400 hover:text-white'
                    }`}
                  >
                    {(bps / 100).toFixed(1)}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Task 8: Institutional Transaction Success Screen */}
        {txSuccess && (
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-white">Deposit Executed Successfully</h4>
                <p className="text-slate-300 text-[11px]">
                  Your collateral has been custodied and index shares minted.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-emerald-500/20 font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Amount Deposited</span>
                <span className="font-bold text-white">{depositAmountInput} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Shares Minted</span>
                <span className="font-bold text-emerald-400">
                  {formattedQuote?.sharesToMintFormatted} UVBTCETH
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Fee Charged (0.25%)</span>
                <span>{formattedQuote?.protocolFeeUSD}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row gap-2">
              <a
                href="https://sepolia.basescan.org"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-surface border border-border-subtle text-slate-300 hover:text-white font-semibold text-center flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/portfolio"
                className="flex-1 py-2 px-3 rounded-xl bg-accent-blue hover:bg-blue-600 text-white font-bold text-center flex items-center justify-center space-x-1.5 transition-colors shadow-glow"
              >
                <span>Go to Portfolio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Task 9: Execution Buttons */}
        {!isConnected ? (
          <button
            disabled
            className="w-full min-h-[48px] py-4 rounded-xl bg-slate-800 text-slate-400 font-bold text-sm cursor-not-allowed"
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
            className="w-full min-h-[48px] py-4 rounded-xl bg-accent-emerald hover:bg-emerald-600 active:scale-[0.99] font-bold text-white text-sm shadow-glow-emerald transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 focus:ring-2 focus:ring-accent-emerald/50"
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
