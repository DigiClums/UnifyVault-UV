'use client';

import React from 'react';
import {
  X,
  Loader2,
  Clock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import { TransactionProgressState } from '../../lib/transaction/types';
import { getExplorerBaseUrl } from '../../constants';
import { useAccount } from 'wagmi';

export interface TransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  progressState: TransactionProgressState;
  onRetry?: () => void;
  onCancel?: () => void;
  onContinue?: () => void;
  onOpenWallet?: () => void;
  title?: string;
  customExplorerUrl?: string;
}

export function TransactionStatusModal({
  isOpen,
  onClose,
  progressState,
  onRetry,
  onCancel,
  onContinue,
  onOpenWallet,
  title,
  customExplorerUrl,
}: TransactionStatusModalProps) {
  const { chain } = useAccount();
  const {
    state,
    txHash,
    errorMessage,
    stepName,
    stepDescription,
    allowanceSkipped,
    allowanceCurrent,
    allowanceRequired,
  } = progressState;

  if (!isOpen || state === 'IDLE') return null;

  const explorerBase = getExplorerBaseUrl(chain?.id);
  const explorerUrl = customExplorerUrl || (txHash ? `${explorerBase}/tx/${txHash}` : null);

  const handleClose = () => {
    if (onCancel) onCancel();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[8px_8px_0_#000] p-6 space-y-5 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#BFFF00] shrink-0" />
            <h3 className="text-base font-black text-foreground font-sans tracking-tight">
              {title || stepName || 'Transaction Status'}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close transaction modal"
            className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State 1: PREPARING */}
        {state === 'PREPARING' && (
          <div className="space-y-4 text-center py-3">
            <div className="w-12 h-12 rounded-full bg-[#BFFF00]/20 border-2 border-black dark:border-white/20 flex items-center justify-center mx-auto text-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-black dark:text-white" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-black font-sans text-foreground">
                Preparing Transaction
              </h4>
              <p className="text-xs text-muted-foreground font-sans">
                {stepDescription || 'Simulating transaction & verifying parameters...'}
              </p>
            </div>
          </div>
        )}

        {/* State 2: WALLET_REQUEST */}
        {state === 'WALLET_REQUEST' && (
          <div className="space-y-4 text-center py-2 font-sans">
            <div className="w-14 h-14 rounded-full bg-[#BFFF00]/20 border-2 border-black dark:border-white/20 flex items-center justify-center mx-auto relative">
              <Wallet className="w-7 h-7 text-black dark:text-white" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#BFFF00] border border-black flex items-center justify-center">
                <Loader2 className="w-3 h-3 animate-spin text-black" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-black text-foreground">Waiting for your wallet</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Approve {stepName || 'the transaction'} in your wallet. Your wallet should show an
                approval request shortly.
              </p>
            </div>

            {allowanceSkipped && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono text-center">
                ✓ Allowance already sufficient ({allowanceCurrent?.toString()}). ERC20 approval
                skipped!
              </div>
            )}

            {onOpenWallet && (
              <button
                type="button"
                onClick={onOpenWallet}
                className="w-full py-2.5 px-4 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                <span>OPEN WALLET</span>
              </button>
            )}

            <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-2">
              <p className="text-[11px] text-muted-foreground font-mono">Didn't receive it?</p>
              <div className="flex items-center justify-center gap-2.5">
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="px-3.5 py-2 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>TRY AGAIN</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-2 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent text-xs font-bold transition-all text-muted-foreground"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State 3: WALLET_REQUEST_TIMEOUT */}
        {state === 'WALLET_REQUEST_TIMEOUT' && (
          <div className="space-y-4 text-center py-2 font-sans">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-600 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <Clock className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-black text-foreground">Wallet request not received</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Your wallet approval request did not appear. This can happen when the connection is
                slow or the wallet is temporarily unavailable.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>TRY AGAIN</span>
                </button>
              )}

              {onOpenWallet && (
                <button
                  type="button"
                  onClick={onOpenWallet}
                  className="w-full py-2.5 px-4 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>OPEN WALLET</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2 px-4 rounded-xl border-2 border-black/20 dark:border-white/20 text-xs font-bold text-muted-foreground hover:bg-accent"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* State 4: SUBMITTED & State 5: CONFIRMING */}
        {(state === 'SUBMITTED' || state === 'CONFIRMING') && (
          <div className="space-y-4 text-center py-2 font-sans">
            <div className="w-14 h-14 rounded-full bg-sky-500/20 border-2 border-sky-600 flex items-center justify-center mx-auto text-sky-600 dark:text-sky-400">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-black text-foreground">Transaction submitted</h4>
              <p className="text-xs text-muted-foreground">
                Waiting for blockchain confirmation...
              </p>
            </div>

            {txHash && (
              <div className="p-3 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 space-y-1 font-mono text-xs">
                <span className="text-[10px] text-muted-foreground font-sans">
                  Transaction Hash:
                </span>
                <p className="font-bold text-foreground truncate">
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </p>
              </div>
            )}

            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline font-mono"
              >
                <span>VIEW ON EXPLORER</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* State 6: CONFIRMED */}
        {state === 'CONFIRMED' && (
          <div className="space-y-4 text-center py-2 font-sans">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-600 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-black text-foreground">✓ Transaction confirmed</h4>
              <p className="text-xs text-muted-foreground">
                {stepDescription || 'Operation completed successfully on blockchain.'}
              </p>
            </div>

            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
              >
                <span>VIEW ON EXPLORER</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={onContinue || handleClose}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 text-white font-black text-xs border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              CONTINUE
            </button>
          </div>
        )}

        {/* State 7: USER_REJECTED */}
        {state === 'USER_REJECTED' && (
          <div className="space-y-4 text-center py-2 font-sans">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border-2 border-rose-600 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
              <XCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-black text-foreground">Transaction cancelled</h4>
              <p className="text-xs text-muted-foreground">You rejected the wallet request.</p>
            </div>

            <div className="flex gap-2.5 pt-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>TRY AGAIN</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 px-4 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-bold hover:bg-accent"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {/* State 8: FAILED */}
        {state === 'FAILED' && (
          <div className="space-y-4 text-center py-2 font-sans">
            <div className="w-14 h-14 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center mx-auto text-destructive">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-black text-foreground">Transaction failed</h4>
              <p className="text-xs text-muted-foreground">
                The transaction was not confirmed.
              </p>
              {errorMessage && (
                <p className="text-xs text-destructive font-mono bg-destructive/10 p-2.5 rounded-xl border border-destructive/20 mt-2 text-left">
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>RETRY</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 px-4 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-bold hover:bg-accent"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
