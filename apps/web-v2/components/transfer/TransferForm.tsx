'use client';

import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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
} from 'lucide-react';
import { SmartAccountBadge } from '../common/SmartAccountBadge';
import { ERC20_ABI } from '../../lib/smartAccount/constants';

export function TransferForm() {
  const { isConnected, chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const { sharesBalance: uvbeBalance, refetch: refetchBalances } = useBalances();
  const { token: uvTokenAddress } = useProtocolDirectory();

  const {
    isGaslessSupported,
    status: smartAccountStatus,
    transferGasless,
    lastTxHash: gaslessTxHash,
    error: smartAccountError,
  } = useSmartAccount();

  const [recipientInput, setRecipientInput] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [txError, setTxError] = useState<string | null>(null);
  const [localTxHash, setLocalTxHash] = useState<string | null>(null);

  // Standard EOA fallback transfer
  const { writeContractAsync, isPending: isEoaPending, data: eoaWriteTxHash } = useWriteContract();
  const { isLoading: isEoaConfirming, isSuccess: isEoaSuccess } = useWaitForTransactionReceipt({
    hash: eoaWriteTxHash,
  });

  const uvbeBalFormatted = formatUnits(uvbeBalance, 18);
  const uvbeBalNum = parseFloat(uvbeBalFormatted) || 0;

  const handlePercentageSelect = (pct: number) => {
    if (uvbeBalNum <= 0) return;
    const amount = (uvbeBalNum * (pct / 100)).toFixed(4);
    setAmountInput(amount);
    setTxError(null);
  };

  const isValidRecipient = recipientInput.length > 0 && isAddress(recipientInput);
  const parsedAmount = parseFloat(amountInput) || 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= uvbeBalNum;
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

    if (isGaslessSupported) {
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
    refetchBalances();
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Account Abstraction Banner */}
      {isConnected && <SmartAccountBadge />}

      <Card className="p-6 bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Transfer UVBE</h2>
              <p className="text-xs text-slate-400">Direct wallet-to-wallet share transfer</p>
            </div>
          </div>

          {isGaslessSupported && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gas sponsored</span>
            </div>
          )}
        </div>

        {/* Success State */}
        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Transfer Confirmed</h3>
              <p className="text-sm text-slate-400">
                Successfully transferred {amountInput} UVBE shares.
              </p>
            </div>

            {activeTxHash && (
              <div className="pt-2">
                <a
                  href={explorerTxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
                >
                  <span>
                    View Transaction: {activeTxHash.slice(0, 8)}...{activeTxHash.slice(-6)}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div className="pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors"
              >
                Send Another Transfer
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-5 space-y-5">
            {/* Recipient Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Recipient Address
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={recipientInput}
                onChange={(e) => {
                  setRecipientInput(e.target.value);
                  setTxError(null);
                }}
                disabled={isProcessing}
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              {recipientInput && !isValidRecipient && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Please enter a valid Ethereum address.
                </p>
              )}
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 uppercase tracking-wider">
                  Amount (UVBE)
                </span>
                <span className="text-slate-400">
                  Balance:{' '}
                  <strong className="text-white font-mono">
                    {parseFloat(uvbeBalFormatted).toFixed(4)}
                  </strong>{' '}
                  UVBE
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  step="any"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setTxError(null);
                  }}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-lg font-mono focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handlePercentageSelect(100)}
                  disabled={isProcessing || uvbeBalNum <= 0}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold transition-colors"
                >
                  MAX
                </button>
              </div>

              {/* Percentage Presets */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentageSelect(pct)}
                    disabled={isProcessing || uvbeBalNum <= 0}
                    className="py-1.5 px-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {(txError || smartAccountError) && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Transfer Error</p>
                  <p className="text-rose-400/90 break-words">{txError || smartAccountError}</p>
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
                      className="w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
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
                className="w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing {isGaslessSupported ? 'Gasless ' : ''}Transfer...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send UVBE Shares</span>
                  </>
                )}
              </button>
            )}

            {/* Cost Basis Notice */}
            <div className="pt-2 flex items-center gap-2 text-xs text-slate-400 justify-center">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>Cost basis is proportionally preserved across transfers.</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
