'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { X, ArrowRight, Loader2, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { OrderDetails, OrderSide } from '../../lib/contracts/marketplace';
import { useMarketplaceActions, useMarketplaceOrders } from '../../hooks/useMarketplace';
import { getTokenDecimals, getTokenSymbol } from '../../lib/explorer/eventRegistry';

interface TakeOrderModalProps {
  order: OrderDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onMatchSuccess: (escrowTradeId: number) => void;
}

export function TakeOrderModal({ order, isOpen, onClose, onMatchSuccess }: TakeOrderModalProps) {
  const { address: userAddress } = useAccount();
  const { createBuyOrder, createSellOrder, matchOrders, isSubmitting } = useMarketplaceActions();
  const { orders: allOrders } = useMarketplaceOrders();

  const [tradeAmountStr, setTradeAmountStr] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const isBuy = order.side === OrderSide.BUY;
  const isMaker = userAddress?.toLowerCase() === order.maker.toLowerCase();

  const assetDecimals = getTokenDecimals(order.asset);
  const assetSymbol = getTokenSymbol(order.asset);

  const remainingCrypto = parseFloat(formatUnits(order.remainingAmount, assetDecimals));
  const minCrypto = parseFloat(formatUnits(order.minLimit, assetDecimals));
  const maxCrypto = parseFloat(formatUnits(order.maxLimit, assetDecimals));
  const unitPrice = Number(order.price);

  const inputAmountNum = parseFloat(tradeAmountStr) || 0;
  const fiatTotal = inputAmountNum * unitPrice;

  const handleConfirmMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress) {
      setError('Please connect your wallet first.');
      return;
    }

    if (isMaker) {
      setError('You cannot take your own order (self-matching prohibited).');
      return;
    }

    if (inputAmountNum <= 0 || isNaN(inputAmountNum)) {
      setError('Please enter a valid trade amount.');
      return;
    }

    if (inputAmountNum > remainingCrypto) {
      setError(
        `Trade amount cannot exceed available balance of ${remainingCrypto} ${assetSymbol}.`,
      );
      return;
    }

    if (minCrypto > 0 && inputAmountNum < minCrypto) {
      setError(`Trade amount is below minimum order limit of ${minCrypto} ${assetSymbol}.`);
      return;
    }

    if (maxCrypto > 0 && inputAmountNum > maxCrypto) {
      setError(`Trade amount exceeds maximum order limit of ${maxCrypto} ${assetSymbol}.`);
      return;
    }

    try {
      setError(null);
      const matchAmountBigInt = parseUnits(tradeAmountStr.trim(), assetDecimals);

      let buyOrderId: number;
      let sellOrderId: number;

      if (isBuy) {
        // Taking a BUY order -> Connected user is SELLER -> Create a counter SELL order
        const sellRes = await createSellOrder({
          asset: order.asset,
          amount: matchAmountBigInt,
          price: order.price,
          fiatCurrency: order.fiatCurrency,
          minLimit: order.minLimit,
          maxLimit: matchAmountBigInt,
        });

        if (!sellRes?.orderId) {
          throw new Error('Failed to obtain new counter SELL order ID after transaction execution.');
        }

        buyOrderId = order.orderId;
        sellOrderId = sellRes.orderId;
      } else {
        // Taking a SELL order -> Connected user is BUYER -> Create a counter BUY order
        const buyRes = await createBuyOrder({
          asset: order.asset,
          amount: matchAmountBigInt,
          price: order.price,
          fiatCurrency: order.fiatCurrency,
          minLimit: order.minLimit,
          maxLimit: matchAmountBigInt,
        });

        if (!buyRes?.orderId) {
          throw new Error('Failed to obtain new counter BUY order ID after transaction execution.');
        }

        buyOrderId = buyRes.orderId;
        sellOrderId = order.orderId;
      }

      // Hard safety check: ensure buyOrderId and sellOrderId are distinct IDs
      if (buyOrderId === sellOrderId) {
        throw new Error('Invalid order match: Counter-order ID cannot equal target order ID.');
      }

      // Execute on-chain matchOrders on Marketplace contract
      const result = await matchOrders({
        buyOrderId,
        sellOrderId,
        matchAmount: matchAmountBigInt,
      });

      if (result.escrowTradeId) {
        onMatchSuccess(result.escrowTradeId);
      } else {
        // Fallback if event indexing is delayed
        onClose();
      }
    } catch (err: any) {
      console.error('Match orders error:', err);
      setError(err?.message || 'Transaction failed or was rejected by user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[8px_8px_0_#000] p-6 space-y-5 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-black text-foreground font-sans">
              {isBuy ? 'Sell Crypto to Buyer' : 'Buy Crypto from Seller'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Order #{order.orderId} • Non-Custodial Orderbook Match
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

        {/* Counterparty & Order Spec Box */}
        <div className="p-4 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order Maker:</span>
            <span className="font-bold text-foreground">
              {order.maker.slice(0, 8)}...{order.maker.slice(-6)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Unit Price:</span>
            <span className="font-bold text-foreground">
              ₹{unitPrice.toLocaleString('en-IN')} INR / UVBE
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Available Balance:</span>
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
        <form onSubmit={handleConfirmMatch} className="space-y-4 font-sans">
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

          {/* Warning Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Matching creates an on-chain P2PEscrow trade. Seller will fund crypto collateral to
              initiate payment window.
            </span>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent text-xs font-bold transition-all min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !tradeAmountStr || inputAmountNum <= 0}
              className="px-6 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 min-h-[44px] flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Matching On-Chain...</span>
                </>
              ) : (
                <>
                  <span>CONFIRM MATCH</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
