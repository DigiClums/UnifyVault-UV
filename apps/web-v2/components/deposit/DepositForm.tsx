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

      <Card className="space-y-5 relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <ArrowDownRight className="w-5 h-5 text-accent-blue shrink-0" />
              <span>Deposit Shares</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Single-Click USDC Collateral Deposit & Share Minting
            </p>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-blue" />
            <span>0.25% fee</span>
          </div>
        </div>

        {/* Input Card */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">
              You Deposit Collateral
            </span>
            <span className="font-mono">
              Available:{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {usdcBalFormatted} USDC
              </span>
            </span>
          </div>

          <div className="relative rounded-xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 focus-within:border-accent-blue transition-all shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <input
                type="number"
                placeholder="0.00"
                value={depositAmountInput}
                onChange={(e) => {
                  setDepositAmountInput(e.target.value);
                  resetState();
                }}
                className="w-full bg-transparent text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none font-mono tracking-tight"
              />
              <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0 shadow-2xs">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-black text-white">
                  $
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">USDC</span>
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
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-2xs"
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Multi-Asset Allocation Preview */}
        <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <PieChart className="w-3.5 h-3.5 text-accent-blue" />
              <span>Target Allocation Breakdown</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {strategyLoading
                ? 'Loading weights...'
                : `${targetBtcPercent ?? '...'} BTC + ${targetEthPercent ?? '...'} ETH`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5 shadow-2xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-amber-700 dark:text-amber-400">🟠 cbBTC</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {targetBtcPercent ?? '...'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                ${btcDepositUSD.toFixed(2)} allocated
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-0.5 shadow-2xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-indigo-700 dark:text-indigo-400">🔷 WETH</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {targetEthPercent ?? '...'}
                </span>
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
              <span className="font-bold text-slate-900 dark:text-white">
                ${depositVal.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Protocol Fee (0.25%)</span>
              <span>-${feeUSD}</span>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between items-center font-sans">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                Est. Index Shares Minted
              </span>
              <span className="font-mono font-bold text-accent-blue text-base">
                {estSharesUSD} UVBTCETH
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
        {isProcessing && (
          <div className="p-3.5 rounded-xl bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-xs space-y-1 font-mono">
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
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex flex-col space-y-1 font-mono">
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
          <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-4 shadow-sm">
            <div className="flex items-center space-x-3 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Deposit Executed Successfully
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  USDC collateral deposited, allocated across cbBTC + WETH via DEX, and index shares
                  minted to your wallet.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-emerald-500/20 font-mono text-slate-900 dark:text-white">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-sans">USDC Deposited</span>
                <span className="font-bold">${depositVal.toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-sans">
                  Index Shares Minted
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {estSharesUSD} UVBTCETH
                </span>
              </div>
            </div>

            {/* Wallet Token Auto-Add CTA */}
            {uvTokenAddress && (
              <div className="pt-2">
                <AddTokenToWallet address={uvTokenAddress as `0x${string}`} symbol="UVBTCETH" />
              </div>
            )}

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
                className="flex-1 py-2.5 px-3 rounded-xl bg-accent-blue hover:bg-blue-600 text-white font-bold text-center flex items-center justify-center space-x-1.5 transition-colors shadow-xs text-xs"
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
          <div className="space-y-2">
            <button
              onClick={handleDepositClick}
              disabled={isDepositDisabled || isProcessing}
              className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-accent-blue hover:bg-blue-600 active:scale-[0.99] font-bold text-white text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
