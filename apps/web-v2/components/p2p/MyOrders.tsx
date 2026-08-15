'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
  Ban,
  Edit3,
  MoreVertical,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { OrderDetails, OrderSide, OrderStatus } from '../../lib/contracts/marketplace';
import { getTokenDecimals, getTokenSymbol } from '../../lib/explorer/eventRegistry';
import { EditMarketplaceOrderModal } from './EditMarketplaceOrderModal';
import { CancelMarketplaceOrderModal } from './CancelMarketplaceOrderModal';

interface MyOrdersProps {
  orders: OrderDetails[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function MyOrders({ orders, isLoading, onRefresh }: MyOrdersProps) {
  const { address: userAddress } = useAccount();

  const [activeTab, setActiveTab] = useState<
    'ALL' | 'BUY' | 'SELL' | 'OPEN' | 'FILLED' | 'CANCELLED'
  >('ALL');

  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<OrderDetails | null>(null);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<OrderDetails | null>(null);
  const [openMenuOrderId, setOpenMenuOrderId] = useState<number | null>(null);

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
      {/* Filter Tabs */}
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
            const isSell = order.side === OrderSide.SELL;
            const isPartial = order.status === OrderStatus.PARTIALLY_FILLED;
            const isFilled = order.status === OrderStatus.FILLED;
            const isCancelled = order.status === OrderStatus.CANCELLED;
            const canManage =
              order.status === OrderStatus.OPEN || order.status === OrderStatus.PARTIALLY_FILLED;

            const decimals = getTokenDecimals(order.asset);
            const symbol = getTokenSymbol(order.asset);

            const isMenuOpen = openMenuOrderId === order.orderId;

            return (
              <div
                key={order.orderId}
                className="p-4 bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[4px_4px_0_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
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

                  <div className="text-xs flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                    <span>
                      Price:{' '}
                      <strong className="text-foreground">
                        ₹{Number(order.price).toLocaleString('en-IN')} INR
                      </strong>
                    </span>
                    <span>
                      Total:{' '}
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

                  {isPartial && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-sans font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>
                        Partially filled ({formatUnits(order.filledAmount, decimals)} {symbol}{' '}
                        executed). Remaining quantity available for trades.
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end relative">
                  {canManage && isSell && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForEdit(order)}
                        className="px-3.5 py-2 rounded-xl bg-[#BFFF00] text-black font-bold border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs flex items-center gap-1.5 min-h-[38px]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderForCancel(order)}
                        className="px-3.5 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border-2 border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all text-xs flex items-center gap-1.5 min-h-[38px]"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}

                  {canManage && isBuy && (
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForCancel(order)}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border-2 border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all text-xs flex items-center gap-1.5 min-h-[38px]"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancel Order</span>
                    </button>
                  )}

                  {isFilled && (
                    <span className="text-[11px] text-muted-foreground font-sans font-medium">
                      Order fully filled
                    </span>
                  )}

                  {isCancelled && (
                    <span className="text-[11px] text-muted-foreground font-sans font-medium">
                      Order cancelled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Order Modal */}
      <EditMarketplaceOrderModal
        order={selectedOrderForEdit}
        isOpen={Boolean(selectedOrderForEdit)}
        onClose={() => setSelectedOrderForEdit(null)}
        onSuccess={() => {
          onRefresh();
          setSelectedOrderForEdit(null);
        }}
      />

      {/* Cancel Order Modal */}
      <CancelMarketplaceOrderModal
        order={selectedOrderForCancel}
        isOpen={Boolean(selectedOrderForCancel)}
        onClose={() => setSelectedOrderForCancel(null)}
        onSuccess={() => {
          onRefresh();
          setSelectedOrderForCancel(null);
        }}
      />
    </div>
  );
}
