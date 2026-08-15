'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Copy,
  Check,
  CreditCard,
} from 'lucide-react';
import { OrderDetails, OrderSide } from '../../lib/contracts/marketplace';
import { useMarketplaceActions } from '../../hooks/useMarketplace';
import { TransactionStatusModal } from '../common/TransactionStatusModal';

interface TakeOrderModalProps {
  order: OrderDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onMatchSuccess: (escrowTradeId: number) => void;
}

export function TakeOrderModal({ order, isOpen, onClose, onMatchSuccess }: TakeOrderModalProps) {
  const { address: userAddress } = useAccount();
  const { takeOrder, isSubmitting, txManager } = useMarketplaceActions();

  const [tradeAmountStr, setTradeAmountStr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sellerUpi, setSellerUpi] = useState<string | null>(null);
  const [isLoadingSellerUpi, setIsLoadingSellerUpi] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  const isBuy = order ? order.side === OrderSide.BUY : false;
  const isMaker =
    userAddress && order ? userAddress.toLowerCase() === order.maker.toLowerCase() : false;
  const isBuyMode = !isBuy; // Taker is BUYER (buying UVBE from Seller maker)

  // Fetch seller UPI from existing seller payment-profile / payment-intent flow
  useEffect(() => {
    if (!isOpen || !order || isBuy) {
      setSellerUpi(null);
      setIsLoadingSellerUpi(false);
      return;
    }

    // 1. Use immutable snapshot from order/intent if available
    const snapshotUpi =
      (order as any).sellerUpiId || (order as any).sellerPaymentIdentifier || (order as any).upiId;
    if (snapshotUpi && typeof snapshotUpi === 'string' && snapshotUpi.trim().length > 0) {
      setSellerUpi(snapshotUpi.trim());
      setIsLoadingSellerUpi(false);
      return;
    }

    // 2. Query seller's payment profile (never buyer's address)
    const sellerAddress = order.maker;
    if (!sellerAddress) {
      setSellerUpi(null);
      setIsLoadingSellerUpi(false);
      return;
    }

    let isMounted = true;
    setIsLoadingSellerUpi(true);

    fetch(`/api/p2p/seller-profile?userAddress=${sellerAddress}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Seller payment profile not found');
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const upi = data?.profile?.upiVpa || data?.profile?.upiId;
        if (upi && typeof upi === 'string' && upi.trim().length > 0) {
          setSellerUpi(upi.trim());
        } else {
          setSellerUpi(null);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setSellerUpi(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSellerUpi(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, order, isBuy]);

  const handleClose = () => {
    setTradeAmountStr('');
    setError(null);
    setSellerUpi(null);
    setCopiedUpi(false);
    onClose();
  };

  const handleCopyUpi = async () => {
    if (!sellerUpi) return;
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(sellerUpi);
      }
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  if (!isOpen || !order) return null;

  const decimals = 18; // Canonical UVBE Decimals
  const remainingCrypto = parseFloat(formatUnits(order.remainingAmount, decimals));
  const minCrypto = parseFloat(formatUnits(order.minLimit, decimals));
  const maxCrypto = parseFloat(formatUnits(order.maxLimit, decimals));
  const unitPrice = Number(order.price);

  const inputAmountNum = parseFloat(tradeAmountStr) || 0;
  const fiatTotal = inputAmountNum * unitPrice;

  const isSubmitDisabled =
    isSubmitting ||
    !tradeAmountStr ||
    inputAmountNum <= 0 ||
    isMaker ||
    (isBuyMode && (isLoadingSellerUpi || !sellerUpi));

  const handleConfirmTake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress) {
      setError('Please connect your wallet first.');
      return;
    }

    if (isMaker) {
      setError('You cannot take your own order (self-matching prohibited).');
      return;
    }

    if (isBuyMode && !sellerUpi) {
      setError('Seller payment details unavailable. Cannot proceed with payment confirmation.');
      return;
    }

    if (inputAmountNum <= 0 || isNaN(inputAmountNum)) {
      setError('Please enter a valid UVBE trade amount.');
      return;
    }

    if (inputAmountNum > remainingCrypto) {
      setError(`Trade amount cannot exceed available balance of ${remainingCrypto} UVBE.`);
      return;
    }

    if (minCrypto > 0 && inputAmountNum < minCrypto) {
      setError(`Trade amount is below minimum order limit of ${minCrypto} UVBE.`);
      return;
    }

    if (maxCrypto > 0 && inputAmountNum > maxCrypto) {
      setError(`Trade amount exceeds maximum order limit of ${maxCrypto} UVBE.`);
      return;
    }

    try {
      setError(null);
      const matchAmountBigInt = parseUnits(tradeAmountStr.trim(), decimals);

      // Execute single atomic on-chain takeOrder transaction (guarantees no orphan counter-orders)
      const result = await takeOrder({
        orderId: order.orderId,
        takeAmount: matchAmountBigInt,
      });

      if (result.escrowTradeId) {
        onMatchSuccess(result.escrowTradeId);
      } else {
        handleClose();
      }
    } catch (err: any) {
      console.error('Take order error:', err);
      setError(err?.message || 'Transaction failed or was rejected by user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[8px_8px_0_#000] p-6 space-y-4 font-mono max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-black text-foreground font-sans">
              {isBuy ? 'Sell UVBE to Buyer' : 'Buy UVBE from Seller'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Order #{order.orderId} •{' '}
              {isBuy ? 'Buyer wants to buy UVBE' : 'Seller wants to sell UVBE'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Counterparty & Order Spec Box */}
        <div className="p-4 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Maker ({isBuy ? 'Buyer' : 'Seller'}):</span>
            <span className="font-bold text-foreground">
              {order.maker.slice(0, 8)}...{order.maker.slice(-6)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Your Role:</span>
            <span className="font-bold text-[#BFFF00]">
              {isBuy
                ? 'SELLER (You provide UVBE & receive INR)'
                : 'BUYER (You pay INR & receive UVBE)'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Unit Price:</span>
            <span className="font-bold text-foreground">
              ₹{unitPrice.toLocaleString('en-IN')} INR per UVBE
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Available UVBE:</span>
            <span className="font-bold text-foreground">{remainingCrypto} UVBE</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Allowed Trade Limits:</span>
            <span className="font-bold text-foreground">
              {minCrypto} - {maxCrypto} UVBE
            </span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 font-sans">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleConfirmTake} className="space-y-4 font-sans">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Trade Amount (UVBE)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                placeholder={`Enter amount (Max ${remainingCrypto})`}
                value={tradeAmountStr}
                onChange={(e) => setTradeAmountStr(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
                required
              />
              <button
                type="button"
                onClick={() => setTradeAmountStr(remainingCrypto.toString())}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[#BFFF00] text-black font-black text-[10px] border border-black shadow-[1px_1px_0_#000]"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Calculated Fiat Total */}
          <div className="p-4 rounded-xl bg-[#BFFF00]/10 border-2 border-black dark:border-white/10 space-y-1 font-mono">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              Total Calculated Fiat Payment
            </span>
            <p className="text-xl font-black text-foreground">
              ₹{fiatTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })} INR
            </p>
          </div>

          {/* PAYMENT TO SELLER Section (BUY mode - taking a SELL order) */}
          {isBuyMode && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-accent/20 border-2 border-black/10 dark:border-white/10 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  <CreditCard className="w-3.5 h-3.5 text-[#BFFF00]" />
                  <span>PAYMENT TO SELLER</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-sans">
                  Direct UPI Transfer
                </span>
              </div>

              {isLoadingSellerUpi ? (
                <div className="flex items-center gap-2 py-2 text-muted-foreground text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BFFF00]" />
                  <span>Fetching seller payment details...</span>
                </div>
              ) : sellerUpi ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-background border border-black/10 dark:border-white/10">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        UPI ID
                      </span>
                      <span
                        data-testid="seller-upi-id"
                        className="text-sm font-black text-foreground tracking-wide select-all break-all font-mono"
                      >
                        {sellerUpi}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="px-2.5 py-1.5 rounded-lg border border-black/20 dark:border-white/20 bg-accent hover:bg-accent/80 text-foreground font-bold text-[11px] flex items-center gap-1 shrink-0 transition-all active:scale-95 min-h-[32px]"
                      title="Copy UPI ID"
                      aria-label="Copy UPI ID"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="text-muted-foreground">Amount:</span>
                    <span
                      data-testid="seller-payment-amount"
                      className="font-black text-foreground"
                    >
                      ₹{fiatTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })} INR
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2 font-sans">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span data-testid="seller-upi-unavailable">
                    Seller payment details unavailable
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Warning Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Taking this order creates an on-chain P2PEscrow trade in a single atomic transaction.
            </span>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-3 pt-2 font-mono">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent text-xs font-bold transition-all min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="px-6 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 min-h-[44px] flex items-center gap-2 font-sans"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Matching On-Chain...</span>
                </>
              ) : (
                <>
                  <span>{isBuy ? 'SELL UVBE NOW' : 'BUY UVBE NOW'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <TransactionStatusModal
        isOpen={txManager.progressState.state !== 'IDLE'}
        onClose={() => txManager.resetTransactionState()}
        progressState={txManager.progressState}
        onRetry={() => txManager.retryLastTransaction()}
        onCancel={() => txManager.resetTransactionState()}
        onContinue={() => {
          txManager.resetTransactionState();
          handleClose();
        }}
        onOpenWallet={txManager.openMobileWallet}
      />
    </div>
  );
}
