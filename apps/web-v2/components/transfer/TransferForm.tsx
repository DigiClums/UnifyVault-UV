'use client';

import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card } from '../common/Card';
import { useBalances } from '../../hooks/useBalances';
import { useSmartAccount } from '../../hooks/useSmartAccount';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import { getExplorerBaseUrl } from '../../constants';
import { formatUnits, parseUnits } from '../../lib/math';
import { isAddress, Address } from 'viem';
import {
  Send,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Wallet,
  Zap,
  ScanLine,
} from 'lucide-react';
import { SmartAccountBadge } from '../common/SmartAccountBadge';
import { QrScannerModal } from '../common/QrScannerModal';
import { TokenIcon } from '../ui/TokenIcon';
import { ERC20_ABI } from '../../lib/smartAccount/constants';
import { Clipboard } from '@capacitor/clipboard';

export function TransferForm() {
  const { isConnected, chain, address: eoaAddress } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const { sharesBalance: eoaUvbeBalance, refetch: refetchBalances } = useBalances();
  const { token: uvTokenAddress } = useProtocolDirectory();

  const {
    smartAccountAddress,
    isGaslessSupported,
    status: smartAccountStatus,
    transferGasless,
    lastTxHash: gaslessTxHash,
    error: smartAccountError,
    reset: resetSmartAccount,
  } = useSmartAccount();

  // Read Smart Account UVBE balance
  const { data: saBalanceData, refetch: refetchSaBalance } = useReadContract({
    address: uvTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: smartAccountAddress ? [smartAccountAddress] : undefined,
    query: {
      enabled: !!smartAccountAddress && !!uvTokenAddress,
    },
  });

  const saUvbeBalance = (saBalanceData as bigint) || 0n;

  const [transferSource, setTransferSource] = useState<'eoa' | 'smart_account'>('eoa');
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [txError, setTxError] = useState<string | null>(null);
  const [localTxHash, setLocalTxHash] = useState<string | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // Standard EOA fallback transfer
  const {
    writeContractAsync,
    isPending: isEoaPending,
    data: eoaWriteTxHash,
    reset: resetEoaWrite,
  } = useWriteContract();
  const { isLoading: isEoaConfirming, isSuccess: isEoaSuccess } = useWaitForTransactionReceipt({
    hash: eoaWriteTxHash,
  });

  const eoaBalFormatted = formatUnits(eoaUvbeBalance, 18);
  const eoaBalNum = parseFloat(eoaBalFormatted) || 0;

  const saBalFormatted = formatUnits(saUvbeBalance, 18);
  const saBalNum = parseFloat(saBalFormatted) || 0;

  const activeBalanceNum = transferSource === 'smart_account' ? saBalNum : eoaBalNum;
  const activeBalanceFormatted =
    transferSource === 'smart_account' ? saBalFormatted : eoaBalFormatted;

  const handlePercentageSelect = (pct: number) => {
    if (activeBalanceNum <= 0) return;
    const amount = (activeBalanceNum * (pct / 100)).toFixed(4);
    setAmountInput(amount);
    setTxError(null);
  };

  const isValidRecipient = recipientInput.length > 0 && isAddress(recipientInput);
  const parsedAmount = parseFloat(amountInput) || 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= activeBalanceNum;
  const isFormValid = isValidRecipient && isAmountValid;

  const isProcessing =
    smartAccountStatus === 'preparing_calls' ||
    smartAccountStatus === 'requesting_sponsorship' ||
    smartAccountStatus === 'awaiting_signature' ||
    smartAccountStatus === 'submitting_user_op' ||
    smartAccountStatus === 'confirming' ||
    isEoaPending ||
    isEoaConfirming;

  const isSuccess = smartAccountStatus === 'success' || isEoaSuccess;
  const activeTxHash = gaslessTxHash || eoaWriteTxHash || localTxHash;
  const explorerTxUrl = activeTxHash ? `${explorerBaseUrl}/tx/${activeTxHash}` : explorerBaseUrl;

  const handleTransfer = async () => {
    if (!isFormValid || !uvTokenAddress) return;
    setTxError(null);

    const amountRaw = parseUnits(amountInput, 18);
    const recipientAddr = recipientInput.trim() as Address;

    if (transferSource === 'smart_account' && isGaslessSupported) {
      try {
        const result = await transferGasless({
          recipient: recipientAddr,
          amount: amountRaw,
          tokenAddress: uvTokenAddress,
        });
        if (result?.txHash) {
          setLocalTxHash(result.txHash);
        }
        refetchBalances();
        refetchSaBalance();
      } catch (err: any) {
        setTxError(err?.message || 'Gasless transfer failed.');
      }
    } else {
      try {
        const hash = await writeContractAsync({
          address: uvTokenAddress,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [recipientAddr, amountRaw],
        });
        if (hash) {
          setLocalTxHash(hash);
        }
        refetchBalances();
        refetchSaBalance();
      } catch (err: any) {
        setTxError(err?.message || 'Token transfer failed.');
      }
    }
  };

  const handleReset = () => {
    setAmountInput('');
    setRecipientInput('');
    setTxError(null);
    setLocalTxHash(null);
    resetSmartAccount?.();
    resetEoaWrite?.();
    refetchBalances();
    refetchSaBalance();
  };

  const handlePaste = async () => {
    try {
      // 1. Try native Capacitor Clipboard first (works inside Android APK)
      const { value } = await Clipboard.read();
      if (value) {
        setRecipientInput(value.trim());
        setTxError(null);
        return;
      }
    } catch {
      // Fall through to browser clipboard
    }

    try {
      // 2. Fallback to standard web navigator.clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setRecipientInput(text.trim());
          setTxError(null);
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-1 sm:py-2 px-0 box-border">
      {/* Smart Account & Gasless Status */}
      {isConnected && (
        <div className="mb-3">
          <SmartAccountBadge />
        </div>
      )}

      <Card className="w-full max-w-full p-3.5 sm:p-6 bg-card border-2 border-black dark:border-white/15 shadow-[4px_4px_0_#BFFF00] sm:shadow-[5px_5px_0_#BFFF00] rounded-2xl sm:rounded-3xl box-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-5 border-b border-border-subtle gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-xl bg-[#BFFF00] text-black border-2 border-black shadow-[2px_2px_0_#000] shrink-0">
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-black text-foreground tracking-tight truncate">
                Transfer UVBE
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                Direct wallet-to-wallet share transfer
              </p>
            </div>
          </div>

          {transferSource === 'smart_account' && isGaslessSupported && (
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#BFFF00]/15 border border-[#BFFF00]/40 text-[#5f8f00] dark:text-[#BFFF00] text-[10px] sm:text-xs font-semibold shrink-0">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Gas sponsored</span>
            </div>
          )}
        </div>

        {/* Success State */}
        {isSuccess ? (
          <div className="py-6 sm:py-8 text-center space-y-4">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">Transfer Confirmed</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Successfully transferred {amountInput} UVBE shares.
              </p>
            </div>

            {activeTxHash && (
              <div className="pt-2">
                <a
                  href={explorerTxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#5f8f00] dark:text-[#BFFF00] hover:underline font-mono transition-colors"
                >
                  <span>
                    View Transaction: {activeTxHash.slice(0, 8)}...{activeTxHash.slice(-6)}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div className="pt-3">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 px-4 rounded-xl bg-card hover:bg-muted text-foreground text-sm font-semibold border-2 border-black dark:border-white/15 shadow-[2px_2px_0_#000] transition-colors cursor-pointer"
              >
                Send Another Transfer
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4 sm:pt-5 space-y-4 sm:space-y-5">
            {/* Transfer Source Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                Transfer From
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTransferSource('eoa');
                    setAmountInput('');
                    setTxError(null);
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all ${
                    transferSource === 'eoa'
                      ? 'bg-[#BFFF00]/15 border-black dark:border-[#BFFF00] text-foreground font-bold shadow-[2px_2px_0_#000]'
                      : 'bg-card border-border-subtle text-muted-foreground hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
                      Connected Wallet
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">
                      EOA
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-mono font-bold text-foreground">
                    {parseFloat(eoaBalFormatted).toFixed(4)} UVBE
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTransferSource('smart_account');
                    setAmountInput('');
                    setTxError(null);
                  }}
                  disabled={!smartAccountAddress}
                  className={`p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all ${
                    transferSource === 'smart_account'
                      ? 'bg-[#BFFF00]/15 border-black dark:border-[#BFFF00] text-foreground font-bold shadow-[2px_2px_0_#000]'
                      : 'bg-card border-border-subtle text-muted-foreground hover:border-border'
                  } ${!smartAccountAddress ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
                      Smart Account
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                      GASLESS
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-mono font-bold text-foreground">
                    {parseFloat(saBalFormatted).toFixed(4)} UVBE
                  </p>
                </button>
              </div>

              {transferSource === 'smart_account' && saBalNum <= 0 && (
                <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-[11px] sm:text-xs">
                    Your tokens are in your Connected Wallet (
                    {parseFloat(eoaBalFormatted).toFixed(4)} UVBE).
                  </span>
                  <button
                    type="button"
                    onClick={() => setTransferSource('eoa')}
                    className="px-2.5 py-1 bg-[#BFFF00] text-black font-bold border border-black rounded-lg text-[11px] hover:bg-[#d0ff66] shrink-0 shadow-[1px_1px_0_#000] cursor-pointer"
                  >
                    Switch to Wallet
                  </button>
                </div>
              )}
            </div>

            {/* Recipient Input with Clean In-Field Paste & QR Scan */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                Recipient Address
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="0x..."
                  value={recipientInput}
                  onChange={(e) => {
                    setRecipientInput(e.target.value.trim());
                    setTxError(null);
                  }}
                  disabled={isProcessing}
                  className="w-full px-3 py-2.5 sm:py-3 pr-24 bg-black/[0.03] dark:bg-white/[0.03] border-2 border-black dark:border-white/15 rounded-xl text-foreground placeholder:text-muted-foreground text-xs sm:text-sm font-mono focus:outline-none focus:border-[#BFFF00] transition-colors truncate box-border"
                />

                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePaste}
                    disabled={isProcessing}
                    title="Paste from Clipboard"
                    className="px-2 py-1 sm:py-1.5 rounded-lg bg-[#BFFF00] text-black text-[10px] sm:text-[11px] font-black font-mono border border-black shadow-[1px_1px_0_#000] hover:bg-[#d0ff66] transition-all cursor-pointer disabled:opacity-50"
                  >
                    PASTE
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsQrScannerOpen(true)}
                    disabled={isProcessing}
                    title="Scan QR Code"
                    className="p-1 sm:p-1.5 rounded-lg bg-black/[0.06] dark:bg-white/[0.08] hover:bg-black/10 dark:hover:bg-white/15 text-foreground border border-black/20 dark:border-white/15 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {recipientInput && !isValidRecipient && (
                <p className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Please enter a valid Ethereum address.</span>
                </p>
              )}
            </div>

            {/* QR Code Scanner Modal */}
            <QrScannerModal
              isOpen={isQrScannerOpen}
              onClose={() => setIsQrScannerOpen(false)}
              onScan={(address) => {
                setRecipientInput(address);
                setTxError(null);
              }}
            />

            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs gap-1">
                <span className="font-semibold text-foreground/70 uppercase tracking-wider truncate">
                  Amount (UVBE)
                </span>
                <span className="text-muted-foreground truncate text-[11px] sm:text-xs">
                  Available:{' '}
                  <strong className="text-foreground font-mono">
                    {parseFloat(activeBalanceFormatted).toFixed(4)}
                  </strong>{' '}
                  UVBE
                </span>
              </div>

              <div className="relative">
                <input
                  id="transfer-amount-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  step="any"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setTxError(null);
                  }}
                  disabled={isProcessing}
                  className="w-full px-3 py-2.5 sm:py-3 pr-24 sm:pr-28 bg-black/[0.03] dark:bg-white/[0.03] border-2 border-black dark:border-white/15 rounded-xl text-foreground placeholder:text-muted-foreground text-base sm:text-lg font-mono focus:outline-none focus:border-[#BFFF00] transition-colors box-border"
                />
                <div className="absolute right-12 sm:right-14 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-[#151515] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg border border-black/20 dark:border-white/15">
                  <TokenIcon symbol="UVBE" size={14} />
                  <span className="text-[10px] sm:text-[11px] font-bold text-foreground font-mono">
                    UVBE
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePercentageSelect(100)}
                  disabled={isProcessing || activeBalanceNum <= 0}
                  className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg bg-[#BFFF00] text-black border border-black text-[11px] sm:text-xs font-bold shadow-[1px_1px_0_#000] hover:bg-[#d0ff66] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[26px] sm:min-h-[28px] flex items-center justify-center"
                >
                  MAX
                </button>
              </div>

              {/* Percentage Presets */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentageSelect(pct)}
                    disabled={isProcessing || activeBalanceNum <= 0}
                    className="py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg bg-card hover:bg-muted text-xs font-semibold text-foreground border border-border-subtle hover:border-border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[34px] sm:min-h-[38px] flex items-center justify-center"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {(txError || smartAccountError) && (
              <div className="p-3 sm:p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold">Transfer Error</p>
                  <p className="text-rose-600 dark:text-rose-400/90 break-words">
                    {txError || smartAccountError}
                  </p>
                </div>
              </div>
            )}

            {/* Action Button */}
            {!isConnected ? (
              <div className="pt-2">
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black font-bold text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0_#000] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Connect Wallet to Transfer
                    </button>
                  )}
                </ConnectButton.Custom>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleTransfer}
                disabled={!isFormValid || isProcessing}
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] disabled:bg-muted disabled:text-muted-foreground disabled:border-border-subtle disabled:shadow-none text-black font-bold text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Processing {transferSource === 'smart_account' ? 'Gasless ' : ''}Transfer...
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      Send UVBE Shares{' '}
                      {transferSource === 'smart_account' ? '(Gasless)' : '(From Wallet)'}
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Cost Basis Notice */}
            <div className="pt-1 sm:pt-2 flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground justify-center text-center">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5f8f00] dark:text-[#BFFF00] shrink-0" />
              <span>Cost basis is proportionally preserved across transfers.</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
