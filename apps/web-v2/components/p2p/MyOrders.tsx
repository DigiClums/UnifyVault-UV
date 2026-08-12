'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { Ban, Loader2, RefreshCw, ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { OrderDetails, OrderSide, OrderStatus } from '../../lib/contracts/marketplace';
import { useMarketplaceActions } from '../../hooks/useMarketplace';
import { getTokenDecimals, getTokenSymbol } from '../../lib/explorer/eventRegistry';

interface MyOrdersProps {
  orders: OrderDetails[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function MyOrders({ orders, isLoading, onRefresh }: MyOrdersProps) {
  const { address: userAddress } = useAccount();
  const { cancelOrder, isSubmitting } = useMarketplaceActions();
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<
    'ALL' | 'BUY' | 'SELL' | 'OPEN' | 'FILLED' | 'CANCELLED'
  >('ALL');

  if (!userAddress) {
    return (
      <div className="p-12 text-center bg-background border-2 border-black dark:border-white/10 rounded-2xl space-y-2 font-mono">
        <p className="text-xs text-muted-foreground font-bold">
          Please connect your wallet to view your marketplace orders.
        </p>
      </div>
    );
  }

  const myOrders = orders.filter((o) => o.maker.toLowerCase() === userAddress.toLowerCase());

  const filtered = myOrders.filter((o) => {
    if (activeTab === 'BUY') return o.side === OrderSide.BUY;
    if (activeTab === 'SELL') return o.side === OrderSide.SELL;
    if (activeTab === 'OPEN')
      return o.status === OrderStatus.OPEN || o.status === OrderStatus.PARTIALLY_FILLED;
    if (activeTab === 'FILLED') return o.status === OrderStatus.FILLED;
    if (activeTab === 'CANCELLED') return o.status === OrderStatus.CANCELLED;
    return true;
  });

  const handleCancel = async (orderId: number) => {
    try {
      setCancellingId(orderId);
      await cancelOrder(orderId);
      onRefresh();
    } catch (err) {
      console.error('Cancel order error:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.OPEN:
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
            OPEN
          </span>
        );
      case OrderStatus.PARTIALLY_FILLED:
        return (
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20">
            PARTIAL
          </span>
        );
      case OrderStatus.FILLED:
        return (
          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 font-bold border border-purple-500/20">
            FILLED
          </span>
        );
      case OrderStatus.CANCELLED:
        return (
          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20">
            CANCELLED
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-black/10 dark:border-white/10 pb-2 overflow-x-auto">
        {(['ALL', 'BUY', 'SELL', 'OPEN', 'FILLED', 'CANCELLED'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 min-h-[38px] ${
              activeTab === tab
                ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[2px_2px_0_#000]'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-12 text-center bg-background border-2 border-black dark:border-white/10 rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#BFFF00]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-background border-2 border-black dark:border-white/10 rounded-2xl text-xs text-muted-foreground font-bold">
          No orders match the selected filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const isBuy = order.side === OrderSide.BUY;
            const canCancel =
              order.status === OrderStatus.OPEN || order.status === OrderStatus.PARTIALLY_FILLED;
            const decimals = getTokenDecimals(order.asset);
            const symbol = getTokenSymbol(order.asset);

            return (
              <div
                key={order.orderId}
                className="p-4 bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[4px_4px_0_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] text-white ${
                        isBuy ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    >
                      {isBuy ? 'BUY' : 'SELL'}
                    </span>
                    <span>Order #{order.orderId}</span>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="text-xs space-x-4 text-muted-foreground">
                    <span>
                      Price:{' '}
                      <strong className="text-foreground">
                        ₹{Number(order.price).toLocaleString('en-IN')} INR
                      </strong>
                    </span>
                    <span>
                      Original:{' '}
                      <strong className="text-foreground">
                        {formatUnits(order.amount, decimals)} {symbol}
                      </strong>
                    </span>
                    <span>
                      Filled:{' '}
                      <strong className="text-foreground">
                        {formatUnits(order.filledAmount, decimals)} {symbol}
                      </strong>
                    </span>
                    <span>
                      Remaining:{' '}
                      <strong className="text-foreground">
                        {formatUnits(order.remainingAmount, decimals)} {symbol}
                      </strong>
                    </span>
                  </div>
                </div>

                {canCancel && (
                  <button
                    type="button"
                    onClick={() => handleCancel(order.orderId)}
                    disabled={cancellingId === order.orderId || isSubmitting}
                    className="w-full md:w-auto px-4 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border-2 border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all text-xs flex items-center justify-center gap-1.5 min-h-[40px]"
                  >
                    {cancellingId === order.orderId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Ban className="w-3.5 h-3.5" />
                    )}
                    <span>Cancel Order</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
