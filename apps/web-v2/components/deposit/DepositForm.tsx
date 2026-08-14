'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
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
  Wallet,
} from 'lucide-react';

import { AddTokenToWallet } from '../common/AddTokenToWallet';
import { SmartAccountBadge } from '../common/SmartAccountBadge';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';

export function DepositForm() {
  const { isConnected, chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const { usdcBalance, refetch: refetchBalances } = useBalances();
  const { navPerShareUSD } = useUnifiedProtocolData();
  const { token: uvTokenAddress } = useProtocolDirectory();
  const {
    depositAmountInput,
    setDepositAmountInput,
    slippageBps,
    setSlippageBps,
    amountRaw,
    formattedQuote,
    stepState,
    isProcessing,
    isDepositDisabled,
    depositDisabledReason,
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
  const estSharesUSD =
    formattedQuote?.sharesToMintFormatted ??
    (netDepositVal > 0 ? (netDepositVal / 1.00065).toFixed(4) : '0.0000');
  const feeUSD = formattedQuote?.protocolFeeUSD ?? `$${(depositVal * 0.0025).toFixed(2)}`;

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

      {/* Smart Account & Gasless Status */}
      {isConnected && <SmartAccountBadge />}

      <Card className="space-y-4 relative overflow-hidden bg-card border-2 border-black dark:border-white/15 shadow-glass p-4 sm:p-5 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-white/10">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center space-x-2">
              <ArrowDownRight className="w-5 h-5 text-[#5f8f00] dark:text-[#BFFF00] shrink-0" />
              <span>Deposit Shares</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Single-Click USDC Collateral Deposit & Share Minting
            </p>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#BFFF00] text-black border-2 border-black text-xs font-semibold shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
            <span>0.25% fee</span>
          </div>
        </div>

        {/* Input Card */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-foreground">You Deposit Collateral</span>
            <span className="font-mono">
              Available: <span className="font-bold text-foreground">{usdcBalFormatted} USDC</span>
            </span>
          </div>

          <div className="relative rounded-xl bg-black/[0.03] dark:bg-white/[0.03] p-3.5 border-2 border-black dark:border-white/15 focus-within:border-[#BFFF00] transition-all shadow-[3px_3px_0_rgba(0,0,0,0.85)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <input
                type="number"
                placeholder="0.00"
                value={depositAmountInput}
                onChange={(e) => {
                  setDepositAmountInput(e.target.value);
                  resetState();
                }}
                className="w-full bg-transparent text-2xl sm:text-3xl font-black text-foreground placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none font-mono tracking-tight"
              />
              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-[#151515] px-2.5 py-1.5 rounded-lg border-2 border-black dark:border-white/15 shrink-0 shadow-2xs">
                <div className="w-5 h-5 rounded-full bg-[#BFFF00] border-2 border-black flex items-center justify-center text-[9px] font-black text-black">
                  $
                </div>
                <span className="text-xs font-bold text-foreground">USDC</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span className="font-mono text-slate-500 dark:text-slate-400">
                Gross: ${depositVal.toFixed(2)}
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

        {/* Live Multi-Asset Allocation Preview */}
        <div className="space-y-2 p-3 rounded-xl bg-black/[0.025] dark:bg-white/[0.025] border-2 border-black dark:border-white/10 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="font-semibold text-foreground flex items-center space-x-1.5">
              <PieChart className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
              <span>Target Allocation Breakdown</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {strategyLoading
                ? 'Loading weights...'
                : `${targetBtcPercent ?? '...'} BTC + ${targetEthPercent ?? '...'} ETH`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 font-mono">
            <div className="p-2 rounded-lg bg-card border border-slate-200 dark:border-slate-800 space-y-0.5 shadow-2xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-amber-700 dark:text-amber-400">🟠 cbBTC</span>
                <span className="font-bold text-foreground">{targetBtcPercent ?? '...'}</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                ${btcDepositUSD.toFixed(2)} allocated
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-card border border-slate-200 dark:border-slate-800 space-y-0.5 shadow-2xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">🔷 WETH</span>
                <span className="font-bold text-foreground">{targetEthPercent ?? '...'}</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                ${ethDepositUSD.toFixed(2)} allocated
              </div>
            </div>
          </div>

          {/* Quote Summary */}
          <div className="space-y-1.5 font-mono text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
            <div className="flex justify-between">
              <span>Gross Deposit</span>
              <span className="font-bold text-foreground">${depositVal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Protocol Fee (0.25%)</span>
              <span>-${feeUSD}</span>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between items-center font-sans">
              <span className="font-bold text-foreground text-sm">Est. Index Shares Minted</span>
              <span className="font-mono font-bold text-[#5f8f00] dark:text-[#BFFF00] text-base">
                {estSharesUSD} UVBE
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
        {isProcessing && (
          <div className="p-3.5 rounded-xl bg-[#BFFF00]/10 border-2 border-[#BFFF00] text-[#5f8f00] dark:text-[#BFFF00] text-xs space-y-1 font-mono">
            <div className="flex items-center space-x-2 font-bold font-sans">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>
                {stepState === 'awaiting_approval_wallet' && 'Confirm USDC approval in wallet...'}
                {stepState === 'approval_pending' && 'Broadcasting USDC approval on-chain...'}
                {stepState === 'awaiting_deposit_wallet' && 'Confirm Deposit in wallet...'}
                {stepState === 'deposit_pending' && 'Executing DEX swaps & minting shares...'}
              </span>
            </div>
            {activeTxHash && (
              <div className="pl-6 text-[11px] opacity-90 truncate">
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
          <div className="p-3.5 rounded-xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-700 dark:text-rose-400 text-xs flex flex-col space-y-1 font-mono">
            <div className="flex items-center space-x-2 font-semibold font-sans">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{txError}</span>
            </div>
            {activeTxHash && (
              <div className="pl-6 text-[11px] opacity-80">
                Tx:{' '}
                <a href={explorerTxUrl} target="_blank" rel="noreferrer" className="underline">
                  {activeTxHash}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Transaction Success Screen */}
        {stepState === 'confirmed' && (
          <div className="p-4 rounded-xl bg-[#BFFF00]/10 border-2 border-[#BFFF00] shadow-[3px_3px_0_#000] text-xs space-y-3.5">
            <div className="flex items-center space-x-3 text-[#4d7500] dark:text-[#BFFF00]">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-foreground">Deposit Executed Successfully</h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  USDC collateral deposited, allocated across cbBTC + WETH via DEX, and index shares
                  minted to your wallet.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-black/20 dark:border-white/10 font-mono text-foreground">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-sans">USDC Deposited</span>
                <span className="font-bold">${depositVal.toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-sans">
                  Index Shares Minted
                </span>
                <span className="font-bold text-[#4d7500] dark:text-[#BFFF00]">
                  {estSharesUSD} UVBE
                </span>
              </div>
            </div>

            {/* Wallet Token Auto-Add CTA */}
            {uvTokenAddress && (
              <div className="pt-2">
                <AddTokenToWallet address={uvTokenAddress as `0x${string}`} symbol="UVBE" />
              </div>
            )}

            <div className="pt-3 border-t border-black/20 dark:border-white/10 flex flex-col sm:flex-row gap-2">
              <a
                href={explorerTxUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-card border-2 border-black dark:border-white/15 text-slate-700 dark:text-slate-200 hover:text-[#5f8f00] dark:text-[#BFFF00] font-semibold text-center flex items-center justify-center space-x-1.5 transition-colors text-xs shadow-2xs"
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
          <div className="space-y-2">
            <button
              onClick={handleDepositClick}
              disabled={isDepositDisabled || isProcessing}
              className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] active:translate-x-[1px] active:translate-y-[1px] font-bold text-black text-sm border-2 border-black shadow-[4px_4px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                <span>Add USDC & Mint Shares</span>
              )}
            </button>
            {isDepositDisabled && depositDisabledReason && amountRaw > 0n && !isProcessing && (
              <p className="text-[11px] text-center font-mono text-[#5f8f00] dark:text-[#BFFF00] font-semibold">
                ⚠️ {depositDisabledReason}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
