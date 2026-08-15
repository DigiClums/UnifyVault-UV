'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
  X,
  Loader2,
  Ban,
  AlertTriangle,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { OrderDetails, OrderSide, OrderStatus } from '../../lib/contracts/marketplace';
import { useMarketplaceActions } from '../../hooks/useMarketplace';
import { TransactionStatusModal } from '../common/TransactionStatusModal';

interface CancelMarketplaceOrderModalProps {
  order: OrderDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelMarketplaceOrderModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: CancelMarketplaceOrderModalProps) {
  const { address: userAddress } = useAccount();
  const { cancelOrder, isSubmitting, txManager } = useMarketplaceActions();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const decimals = 18; // Canonical UVBE Decimals
  const isBuy = order.side === OrderSide.BUY;
  const isPartial = order.status === OrderStatus.PARTIALLY_FILLED;

  const originalTotalNum = parseFloat(formatUnits(order.amount, decimals)) || 0;
  const filledNum = parseFloat(formatUnits(order.filledAmount, decimals)) || 0;
  const remainingNum = parseFloat(formatUnits(order.remainingAmount, decimals)) || 0;

  const handleConfirmCancel = async () => {
    setError(null);

    if (!userAddress) {
      setError('Please connect your wallet first.');
      return;
    }

    if (userAddress.toLowerCase() !== order.maker.toLowerCase()) {
      setError('Unauthorized: You can only cancel your own orders.');
      return;
    }

    if (order.status !== OrderStatus.OPEN && order.status !== OrderStatus.PARTIALLY_FILLED) {
      setError('Order is not active for cancellation.');
      return;
    }

    try {
      await cancelOrder(order.orderId);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Cancel order error:', err);
      setError(err?.message || 'Cancel transaction failed or was rejected.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[8px_8px_0_#000] p-6 space-y-5 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground font-sans">
                Cancel {isBuy ? 'Buy' : 'Sell'} Order #{order.orderId}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Confirm cancellation of resting order on Marketplace.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Details Breakdown */}
        <div className="p-4 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Order Side:</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                isBuy ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {isBuy ? 'BUY' : 'SELL'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Execution Price:</span>
            <span className="font-bold text-foreground">
              ₹{Number(order.price).toLocaleString('en-IN')} INR
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Original Total:</span>
            <span className="font-bold text-foreground">{originalTotalNum} UVBE</span>
          </div>

          {isPartial && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Already Filled:</span>
              <span className="font-bold">{filledNum} UVBE</span>
            </div>
          )}

          <div className="flex justify-between border-t border-black/10 dark:border-white/10 pt-1.5 font-bold">
            <span className="text-rose-600 dark:text-rose-400">Remaining to Cancel:</span>
            <span className="text-foreground">{remainingNum} UVBE</span>
          </div>
        </div>

        {/* Partial Fill Cancel Warning */}
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5 font-sans">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Only the remaining quantity will be cancelled.</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Completed trades and funds already matched in escrow remain 100% active and
              unaffected.
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 font-mono">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent text-xs font-bold transition-all min-h-[44px]"
          >
            Keep Order
          </button>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:bg-rose-700 hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 min-h-[44px] flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cancelling On-Chain...</span>
              </>
            ) : (
              <>
                <Ban className="w-4 h-4" />
                <span>Confirm Cancel</span>
              </>
            )}
          </button>
        </div>
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
