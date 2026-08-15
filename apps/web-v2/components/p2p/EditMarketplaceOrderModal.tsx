'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  X,
  Loader2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { OrderDetails, OrderStatus } from '../../lib/contracts/marketplace';
import { useMarketplaceActions } from '../../hooks/useMarketplace';
import { validateUpiId } from '../../lib/p2p/upiValidation';
import { TransactionStatusModal } from '../common/TransactionStatusModal';

interface EditMarketplaceOrderModalProps {
  order: OrderDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditMarketplaceOrderModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: EditMarketplaceOrderModalProps) {
  const { address: userAddress } = useAccount();
  const { editSellOrder, isSubmitting, txManager } = useMarketplaceActions();

  const decimals = 18; // Canonical UVBE Decimals

  // Form States
  const [priceStr, setPriceStr] = useState('');
  const [remainingStr, setRemainingStr] = useState('');
  const [minLimitStr, setMinLimitStr] = useState('');
  const [maxLimitStr, setMaxLimitStr] = useState('');
  const [sellerUpiStr, setSellerUpiStr] = useState('');
  const [hasInteractedUpi, setHasInteractedUpi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preload Order Values whenever modal opens or order changes
  useEffect(() => {
    if (isOpen && order) {
      setPriceStr(order.price.toString());
      setRemainingStr(formatUnits(order.remainingAmount, decimals));
      setMinLimitStr(order.minLimit > 0n ? formatUnits(order.minLimit, decimals) : '');
      setMaxLimitStr(
        order.maxLimit > 0n && order.maxLimit !== order.remainingAmount
          ? formatUnits(order.maxLimit, decimals)
          : '',
      );
      setError(null);
      setHasInteractedUpi(false);

      // Fetch existing seller UPI profile if available
      if (userAddress) {
        fetch(`/api/p2p/seller-profile?userAddress=${userAddress}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.profile?.upiVpa) {
              setSellerUpiStr(data.profile.upiVpa);
            }
          })
          .catch(() => {
            // Ignore fetch error, user can type manually
          });
      }
    }
  }, [isOpen, order, userAddress]);

  if (!isOpen || !order) return null;

  const filledNum = parseFloat(formatUnits(order.filledAmount, decimals)) || 0;
  const originalTotalNum = parseFloat(formatUnits(order.amount, decimals)) || 0;

  const priceNum = priceStr ? parseFloat(priceStr) : 0;
  const remainingNum = remainingStr ? parseFloat(remainingStr) : 0;
  const minLimitNum = minLimitStr ? parseFloat(minLimitStr) : 0;
  const maxLimitNum = maxLimitStr ? parseFloat(maxLimitStr) : remainingNum;

  const newTotalQuantityNum = filledNum + remainingNum;

  // Real-time progressive validation
  const validationError = useMemo(() => {
    if (!priceStr || isNaN(priceNum) || priceNum <= 0) {
      return 'Please enter a valid unit price in INR greater than 0.';
    }

    if (!remainingStr || isNaN(remainingNum) || remainingNum <= 0) {
      return 'Remaining UVBE quantity must be greater than 0.';
    }

    if (newTotalQuantityNum < filledNum) {
      return `Total quantity (${newTotalQuantityNum} UVBE) cannot be less than already-filled quantity (${filledNum} UVBE).`;
    }

    if (minLimitStr && (isNaN(minLimitNum) || minLimitNum < 0)) {
      return 'Minimum fill limit cannot be negative.';
    }

    if (maxLimitStr && (isNaN(maxLimitNum) || maxLimitNum <= 0)) {
      return 'Maximum fill limit must be greater than 0.';
    }

    if (minLimitStr && minLimitNum > remainingNum) {
      return `Minimum limit (${minLimitNum} UVBE) cannot exceed remaining quantity (${remainingNum} UVBE).`;
    }

    if (maxLimitStr && maxLimitNum > remainingNum) {
      return `Maximum limit (${maxLimitNum} UVBE) cannot exceed remaining quantity (${remainingNum} UVBE).`;
    }

    if (minLimitStr && maxLimitStr && minLimitNum > maxLimitNum) {
      return `Minimum limit (${minLimitNum} UVBE) cannot exceed maximum limit (${maxLimitNum} UVBE).`;
    }

    const upiRes = validateUpiId(sellerUpiStr);
    if (!upiRes.isValid) {
      return upiRes.error || 'Seller UPI ID is required.';
    }

    return null;
  }, [
    priceStr,
    priceNum,
    remainingStr,
    remainingNum,
    newTotalQuantityNum,
    filledNum,
    minLimitStr,
    minLimitNum,
    maxLimitStr,
    maxLimitNum,
    sellerUpiStr,
  ]);

  const inlineUpiError = useMemo(() => {
    if (!hasInteractedUpi && !sellerUpiStr) return null;
    const res = validateUpiId(sellerUpiStr);
    return res.isValid ? null : res.error;
  }, [sellerUpiStr, hasInteractedUpi]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userAddress) {
      setError('Please connect your wallet first.');
      return;
    }

    if (userAddress.toLowerCase() !== order.maker.toLowerCase()) {
      setError('Unauthorized: You can only edit your own orders.');
      return;
    }

    if (order.status !== OrderStatus.OPEN && order.status !== OrderStatus.PARTIALLY_FILLED) {
      setError('Only active OPEN or PARTIALLY_FILLED orders can be edited.');
      return;
    }

    setHasInteractedUpi(true);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const newRemainingBigInt = parseUnits(remainingStr.trim(), decimals);
      const newPriceBigInt = BigInt(Math.floor(priceNum));
      const newMinLimitBigInt = parseUnits(minLimitStr ? minLimitStr.trim() : '0', decimals);
      const newMaxLimitBigInt = parseUnits(
        maxLimitStr ? maxLimitStr.trim() : remainingStr.trim(),
        decimals,
      );

      await editSellOrder({
        orderId: order.orderId,
        asset: order.asset,
        newRemainingAmount: newRemainingBigInt,
        newPrice: newPriceBigInt,
        fiatCurrency: order.fiatCurrency || 'INR',
        newMinLimit: newMinLimitBigInt,
        newMaxLimit: newMaxLimitBigInt,
        sellerUpiId: sellerUpiStr.trim(),
        currentOrder: order,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Edit sell order error:', err);
      setError(err?.message || 'Transaction failed or was rejected by user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[8px_8px_0_#000] p-6 space-y-5 font-mono max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-black text-foreground font-sans">
              Edit Sell Limit Order #{order.orderId}
            </h3>
            <p className="text-xs text-muted-foreground">
              Update unit price, remaining quantity, trade limits, or your seller UPI ID.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Status & History Summary */}
        <div className="p-4 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order Status:</span>
            <span className="font-bold text-foreground">
              {order.status === OrderStatus.PARTIALLY_FILLED ? 'PARTIALLY FILLED' : 'OPEN'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Original Total Quantity:</span>
            <span className="font-bold text-foreground">{originalTotalNum} UVBE</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Already Filled (Immutable):</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {filledNum} UVBE
            </span>
          </div>

          <div className="flex justify-between border-t border-black/10 dark:border-white/10 pt-1.5">
            <span className="text-muted-foreground">New Total Order Quantity:</span>
            <span className="font-bold text-[#BFFF00]">{newTotalQuantityNum} UVBE</span>
          </div>
        </div>

        {/* Edit Notice Alert */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 font-sans">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Changes apply only to future fills.</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Completed trades and historical execution prices will not be modified.
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 font-sans">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleEditSubmit} className="space-y-4 font-sans">
          {/* Price Input */}
          <div className="space-y-1.5 font-mono">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Price (INR per UVBE)
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 10500"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
              required
            />
          </div>

          {/* Remaining Quantity Input */}
          <div className="space-y-1.5 font-mono">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Remaining Quantity to Sell (UVBE)
              </label>
              <span className="text-[10px] text-muted-foreground">
                Current remaining: {formatUnits(order.remainingAmount, decimals)} UVBE
              </span>
            </div>
            <input
              type="number"
              step="any"
              placeholder="e.g. 50"
              value={remainingStr}
              onChange={(e) => setRemainingStr(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
              required
            />
          </div>

          {/* Min & Max Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Min Fill (UVBE, Optional)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0 = No Min"
                value={minLimitStr}
                onChange={(e) => setMinLimitStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Max Fill (UVBE, Optional)
              </label>
              <input
                type="number"
                step="any"
                placeholder={`Max ${remainingNum || ''}`}
                value={maxLimitStr}
                onChange={(e) => setMaxLimitStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
              />
            </div>
          </div>

          {/* Seller UPI ID */}
          <div className="space-y-1.5 font-mono">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Seller UPI ID (VPA)</span>
              <span className="text-[10px] text-rose-500 font-normal">* Required for SELL</span>
            </label>
            <input
              type="text"
              placeholder="name@upi"
              value={sellerUpiStr}
              onChange={(e) => {
                setSellerUpiStr(e.target.value);
                setHasInteractedUpi(true);
              }}
              onBlur={() => setHasInteractedUpi(true)}
              className={`w-full px-4 py-2.5 rounded-xl border-2 bg-background text-sm font-mono focus:outline-none focus:ring-2 ${
                inlineUpiError
                  ? 'border-destructive focus:ring-destructive'
                  : 'border-black dark:border-white/20 focus:ring-[#BFFF00]'
              }`}
              required
            />
            {inlineUpiError && (
              <p className="text-[11px] text-destructive font-sans font-medium flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{inlineUpiError}</span>
              </p>
            )}
          </div>

          {/* Modal Action Buttons */}
          <div className="flex justify-end gap-3 pt-2 font-mono">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent text-xs font-bold transition-all min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(validationError)}
              className="px-6 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 min-h-[44px] flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Order...</span>
                </>
              ) : (
                <>
                  <span>Save Order Changes</span>
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
          onClose();
        }}
        onOpenWallet={txManager.openMobileWallet}
      />
    </div>
  );
}
