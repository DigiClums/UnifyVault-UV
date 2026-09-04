'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { Card } from '../common/Card';
import { useDeposit } from '../../hooks/useDeposit';
import { useBalances } from '../../hooks/useBalances';
import { useUnifiedProtocolData } from '../../hooks/useUnifiedProtocolData';
import { getExplorerBaseUrl } from '../../constants';
import { formatUnits, formatUSD, formatShares } from '../../lib/math';
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
  Zap,
} from 'lucide-react';

import { AddTokenToWallet } from '../common/AddTokenToWallet';
import { SmartAccountBadge } from '../common/SmartAccountBadge';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import { TokenIcon } from '../ui/TokenIcon';

export function DepositForm() {
  const { isConnected, chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const { sharesBalance: eoaSharesBalance, usdcBalance, refetch: refetchBalances } = useBalances();
  const {
    navPerShareUSD,
    targetBtcBps,
    targetEthBps,
    targetBtcPercent,
    targetEthPercent,
    isLoading: strategyLoading,
  } = useUnifiedProtocolData();
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
    destination,
    setDestination,
    smartAccountAddress,
    smartAccountBalance,
    isGaslessSupported,
  } = useDeposit();

  const usdcBalNum = parseFloat(formatUnits(usdcBalance, 6)) || 0;
  const usdcBalFormatted = formatUnits(usdcBalance, 6);

  const eoaSharesBalNum = parseFloat(formatUnits(eoaSharesBalance, 18)) || 0;
  const eoaSharesBalFormatted = formatShares(eoaSharesBalance);
  const saSharesBalNum = parseFloat(formatUnits(smartAccountBalance, 18)) || 0;
  const saSharesBalFormatted = formatShares(smartAccountBalance);

  const handleDestinationSelect = (nextDestination: 'eoa' | 'smart_account') => {
    setDestination(nextDestination);
    resetState();
  };

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
              <span>Deposit USDC</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deposit USDC to receive index portfolio shares
            </p>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#BFFF00] text-black border-2 border-black text-xs font-semibold shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-black" />
            <span>0.25% fee</span>
          </div>
        </div>

        {/* Mint Destination Selection ("Mint To") */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
            Receive Shares In
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDestinationSelect('eoa')}
              className={`p-3 rounded-xl border text-left transition-all ${
                destination === 'eoa'
                  ? 'bg-[#BFFF00]/10 border-[#BFFF00] text-foreground'
                  : 'bg-muted/40 border-border-subtle text-muted-foreground hover:border-border'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Wallet className="w-3.5 h-3.5" />
                <span>Connected Wallet</span>
              </div>
              <p className="text-[11px] font-mono mt-1 text-foreground/80">
                {eoaSharesBalFormatted} UVBE
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleDestinationSelect('smart_account')}
              className={`p-3 rounded-xl border text-left transition-all ${
                destination === 'smart_account'
                  ? 'bg-[#BFFF00]/10 border-[#BFFF00] text-foreground'
                  : 'bg-muted/40 border-border-subtle text-muted-foreground hover:border-border'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Zap className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
                <span>Smart Account</span>
              </div>
              <p className="text-[11px] font-mono mt-1 text-foreground/80">
                {saSharesBalFormatted} UVBE
              </p>
            </button>
          </div>

          {destination === 'smart_account' && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono text-muted-foreground truncate">
                {smartAccountAddress
                  ? `Smart Account: ${smartAccountAddress.slice(0, 6)}...${smartAccountAddress.slice(-4)}`
                  : 'Smart Account unavailable'}
              </p>
              {isGaslessSupported ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-bold uppercase tracking-wider shrink-0">
                  <Zap className="w-3 h-3" />
                  Gas sponsored account
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 text-[10px] font-bold uppercase tracking-wider shrink-0">
                  Smart Account
                </span>
              )}
            </div>
          )}
        </div>

        {/* Input Card */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-foreground">You Deposit</span>
            <span className="font-mono">
              Available: <span className="font-bold text-foreground">{usdcBalFormatted} USDC</span>
            </span>
          </div>

          <div className="relative rounded-xl bg-black/[0.03] dark:bg-white/[0.03] p-3.5 border-2 border-black dark:border-white/15 focus-within:border-[#BFFF00] transition-all shadow-[3px_3px_0_rgba(0,0,0,0.85)] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <input
                id="deposit-amount-input"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0.00"
                value={depositAmountInput}
                onChange={(e) => {
                  setDepositAmountInput(e.target.value);
                  resetState();
                }}
                className="w-full bg-transparent text-2xl sm:text-3xl font-black text-foreground placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none font-mono tracking-tight"
              />
              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-[#151515] px-2.5 py-1.5 rounded-lg border-2 border-black dark:border-white/15 shrink-0 shadow-2xs">
                <TokenIcon symbol="USDC" size={20} />
                <span className="text-xs font-bold text-foreground">USDC</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span className="font-mono text-muted-foreground">
                Gross: ${depositVal.toFixed(2)}
              </span>

              {/* Quick Percentage Buttons */}
              <div className="flex items-center space-x-1 sm:space-x-1.5">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentageSelect(pct)}
                    className="px-2.5 sm:px-3 py-1.5 sm:py-1 rounded bg-card hover:bg-[#BFFF00] hover:text-black text-[11px] font-mono font-semibold text-foreground border-2 border-black dark:border-white/15 transition-all active:scale-95 shadow-2xs min-h-[36px] flex items-center justify-center cursor-pointer"
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Multi-Asset Allocation Preview */}
        <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-2 border-black dark:border-white/15 text-xs shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-md bg-[#BFFF00] text-black border border-black">
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-foreground text-xs uppercase tracking-wider">
                Target Allocation
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300">
              {strategyLoading
                ? 'Loading...'
                : `${targetBtcPercent ?? '60.0%'} BTC / ${targetEthPercent ?? '40.0%'} ETH`}
            </span>
          </div>

          {/* Allocation Progress Bar */}
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200 dark:bg-neutral-800 border border-black/20 dark:border-white/10">
            <div
              className="bg-[#f7931a] transition-all duration-300"
              style={{ width: targetBtcPercent || '60%' }}
              title={`cbBTC: ${targetBtcPercent || '60%'}`}
            />
            <div
              className="bg-[#627eea] transition-all duration-300"
              style={{ width: targetEthPercent || '40%' }}
              title={`WETH: ${targetEthPercent || '40%'}`}
            />
          </div>

          {/* Asset Allocation Split Cards */}
          <div className="grid grid-cols-2 gap-2 font-mono">
            {/* cbBTC Card */}
            <div className="p-2.5 rounded-xl bg-card border-2 border-black/80 dark:border-white/10 space-y-1 shadow-[2px_2px_0_rgba(0,0,0,0.85)] dark:shadow-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TokenIcon symbol="cbBTC" size={16} />
                  <span className="font-bold text-foreground text-xs">cbBTC</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#f7931a]/15 text-[#f7931a] dark:text-[#f7931a] rounded border border-[#f7931a]/30">
                  {targetBtcPercent ?? '60.0%'}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 pt-0.5">
                ${btcDepositUSD.toFixed(2)}{' '}
                <span className="text-[9px] font-normal text-muted-foreground">allocated</span>
              </div>
            </div>

            {/* WETH Card */}
            <div className="p-2.5 rounded-xl bg-card border-2 border-black/80 dark:border-white/10 space-y-1 shadow-[2px_2px_0_rgba(0,0,0,0.85)] dark:shadow-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TokenIcon symbol="WETH" size={16} />
                  <span className="font-bold text-foreground text-xs">WETH</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#627eea]/15 text-[#627eea] dark:text-[#8ba2ff] rounded border border-[#627eea]/30">
                  {targetEthPercent ?? '40.0%'}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 pt-0.5">
                ${ethDepositUSD.toFixed(2)}{' '}
                <span className="text-[9px] font-normal text-muted-foreground">allocated</span>
              </div>
            </div>
          </div>

          {/* Quote Summary */}
          <div className="space-y-1.5 font-mono text-slate-600 dark:text-slate-400 pt-2 border-t border-black/10 dark:border-white/10">
            <div className="flex justify-between text-[11px]">
              <span>Gross Deposit</span>
              <span className="font-bold text-foreground">${depositVal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-[11px]">
              <span>Protocol Fee (0.25%)</span>
              <span className="text-muted-foreground">-{feeUSD}</span>
            </div>

            <div className="border-t border-black/10 dark:border-white/10 pt-2 flex justify-between items-center font-sans">
              <span className="font-bold text-foreground text-xs sm:text-sm">
                Est. Shares Received
              </span>
              <span className="font-mono font-black text-[#5f8f00] dark:text-[#BFFF00] text-sm sm:text-base">
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
                  minted to{' '}
                  {destination === 'smart_account' ? 'your Smart Account' : 'your connected wallet'}
                  .
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
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-sans">
                  Mint Destination
                </span>
                <span className="font-mono text-xs font-semibold">
                  {destination === 'smart_account'
                    ? smartAccountAddress
                      ? `Smart Account (${smartAccountAddress.slice(0, 6)}...${smartAccountAddress.slice(-4)})`
                      : 'Smart Account'
                    : 'Connected Wallet (EOA)'}
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
              ) : destination === 'smart_account' ? (
                <span>Add USDC & Mint to Smart Account</span>
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
