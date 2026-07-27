'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
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
            <p className="text-xs text-slate-400">Mint UVBTCETH Index Shares with USDC</p>
          </div>
          <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Coinbase-Style Live Quote</span>
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
                className="text-accent-blue hover:underline font-semibold ml-1"
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
                    className={`px-2 py-0.5 rounded font-mono transition-all ${
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

        {/* Success Notification */}
        {txSuccess && (
          <div className="p-4 rounded-xl bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Deposit Executed Successfully!</p>
              <p className="text-[11px] text-slate-300">
                Your UVBTCETH index shares have been minted and cost basis recorded.
              </p>
            </div>
          </div>
        )}

        {/* Execution Buttons */}
        {!isConnected ? (
          <button
            disabled
            className="w-full py-4 rounded-xl bg-slate-800 text-slate-400 font-bold text-sm"
          >
            Please Connect Wallet
          </button>
        ) : !isApproved ? (
          <button
            onClick={handleApprove}
            disabled={amountRaw <= 0n || isApproving}
            className="w-full py-4 rounded-xl bg-accent-blue hover:bg-blue-600 font-bold text-white text-sm shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Approving USDC Allowance...</span>
              </>
            ) : (
              <span>1. Approve USDC Allowance</span>
            )}
          </button>
        ) : (
          <button
            onClick={handleDeposit}
            disabled={amountRaw <= 0n || isDepositing}
            className="w-full py-4 rounded-xl bg-accent-emerald hover:bg-emerald-600 font-bold text-white text-sm shadow-glow-emerald transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isDepositing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing Deposit & Minting Shares...</span>
              </>
            ) : (
              <span>2. Confirm Live Deposit</span>
            )}
          </button>
        )}
      </Card>
    </div>
  );
}
