'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Copy,
  Check,
  Search,
  SlidersHorizontal,
  Layers,
} from 'lucide-react';
import { OrderDetails, OrderSide, OrderStatus } from '../../lib/contracts/marketplace';

interface MarketplaceOrderBookProps {
  orders: OrderDetails[];
  isLoading: boolean;
  onSelectOrder: (order: OrderDetails) => void;
  onRefresh: () => void;
}

export function MarketplaceOrderBook({
  orders,
  isLoading,
  onSelectOrder,
  onRefresh,
}: MarketplaceOrderBookProps) {
  const { address: userAddress } = useAccount();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [filterSide, setFilterSide] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const activeOrders = orders.filter(
    (o) => o.status === OrderStatus.OPEN || o.status === OrderStatus.PARTIALLY_FILLED,
  );

  const filteredOrders = activeOrders.filter((o) => {
    if (filterSide === 'BUY' && o.side !== OrderSide.BUY) return false;
    if (filterSide === 'SELL' && o.side !== OrderSide.SELL) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const makerLower = o.maker.toLowerCase();
      const idStr = o.orderId.toString();
      if (!makerLower.includes(term) && !idStr.includes(term)) return false;
    }
    return true;
  });

  const buyOrders = filteredOrders.filter((o) => o.side === OrderSide.BUY);
  const sellOrders = filteredOrders.filter((o) => o.side === OrderSide.SELL);

  const handleCopy = (addr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  import { getTokenDecimals, getTokenSymbol } from '../../lib/explorer/eventRegistry';

  const formatPrice = (priceBigInt: bigint) => {
    return Number(priceBigInt).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    });
  };

  const formatCryptoAmount = (amountBigInt: bigint, assetAddr: string) => {
    const decimals = getTokenDecimals(assetAddr);
    const symbol = getTokenSymbol(assetAddr);
    const formatted = formatUnits(amountBigInt, decimals);
    const num = parseFloat(formatted);
    return `${num.toLocaleString('en-US', { maximumFractionDigits: decimals === 8 ? 6 : 4 })} ${symbol}`;
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[4px_4px_0_#000]">
        {/* Side Tabs */}
        <div className="flex items-center gap-1 bg-accent/40 p-1 rounded-xl border border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={() => setFilterSide('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              filterSide === 'ALL'
                ? 'bg-background text-foreground border border-black shadow-[2px_2px_0_#000]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Orders ({activeOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSide('BUY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
              filterSide === 'BUY'
                ? 'bg-emerald-500 text-white border border-black shadow-[2px_2px_0_#000]'
                : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Buy Orders ({activeOrders.filter((o) => o.side === OrderSide.BUY).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSide('SELL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
              filterSide === 'SELL'
                ? 'bg-rose-500 text-white border border-black shadow-[2px_2px_0_#000]'
                : 'text-rose-600 dark:text-rose-400 hover:text-rose-500'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>
              Sell Orders ({activeOrders.filter((o) => o.side === OrderSide.SELL).length})
            </span>
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search maker/ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-black/20 dark:border-white/20 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent text-foreground transition-all disabled:opacity-50 min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Refresh Orderbook"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Order Grid / Cards */}
      {isLoading ? (
        <div className="p-12 text-center bg-background border-2 border-black dark:border-white/10 rounded-2xl space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#BFFF00]" />
          <p className="text-xs text-muted-foreground font-bold">
            Loading live smart contract orderbook...
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-background border-2 border-black dark:border-white/10 rounded-2xl space-y-2">
          <Layers className="w-8 h-8 text-muted-foreground mx-auto" />
          <h4 className="text-sm font-black text-foreground">No Open Orders Found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto font-sans">
            Be the first market maker to create a Buy or Sell limit order on the non-custodial
            orderbook.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isBuy = order.side === OrderSide.BUY;
            const isMaker = userAddress?.toLowerCase() === order.maker.toLowerCase();

            return (
              <div
                key={order.orderId}
                className="bg-background border-2 border-black dark:border-white/10 rounded-2xl p-4 shadow-[4px_4px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex flex-col justify-between space-y-3"
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black border text-white flex items-center gap-1 ${
                        isBuy ? 'bg-emerald-600 border-emerald-700' : 'bg-rose-600 border-rose-700'
                      }`}
                    >
                      {isBuy ? (
                        <ArrowDownRight className="w-3 h-3" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3" />
                      )}
                      <span>{isBuy ? 'BUY ORDER' : 'SELL ORDER'}</span>
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      #{order.orderId}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                    <span>
                      {order.maker.slice(0, 6)}...{order.maker.slice(-4)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(order.maker, e)}
                      className="p-1 hover:text-foreground"
                      title="Copy Maker Address"
                    >
                      {copiedAddress === order.maker ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Price & Available Grid */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-accent/30 border border-black/5 dark:border-white/5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
                      Unit Price
                    </span>
                    <p className="text-sm font-black text-foreground">{formatPrice(order.price)}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
                      Available
                    </span>
                    <p className="text-sm font-black text-foreground">
                      {formatCryptoAmount(order.remainingAmount, order.asset)}
                    </p>
                  </div>
                </div>

                {/* Limits & Maker Status */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    Limits: {formatUnits(order.minLimit, getTokenDecimals(order.asset))} -{' '}
                    {formatUnits(order.maxLimit, getTokenDecimals(order.asset))}{' '}
                    {getTokenSymbol(order.asset)}
                  </span>
                  {isMaker && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                      Your Order
                    </span>
                  )}
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={() => onSelectOrder(order)}
                  disabled={isMaker}
                  className={`w-full py-2.5 px-4 rounded-xl font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                    isMaker
                      ? 'bg-muted text-muted-foreground border-black/20 shadow-none cursor-not-allowed'
                      : isBuy
                        ? 'bg-rose-500 text-white hover:bg-rose-600'
                        : 'bg-emerald-500 text-black hover:bg-emerald-600'
                  }`}
                >
                  {isMaker
                    ? 'Your Own Order'
                    : isBuy
                      ? `SELL TO BUYER (${formatPrice(order.price)})`
                      : `BUY FROM SELLER (${formatPrice(order.price)})`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
