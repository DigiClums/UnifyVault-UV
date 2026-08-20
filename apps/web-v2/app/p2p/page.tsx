'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  ShieldCheck,
  Plus,
  ArrowLeft,
  ShoppingBag,
  ListOrdered,
  UserCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useP2PTrades, useP2PTrade } from '../../hooks/useP2PEscrow';
import { useMarketplaceOrders, isSaneTradeId } from '../../hooks/useMarketplace';
import { MarketplaceOrderBook } from '../../components/p2p/MarketplaceOrderBook';
import { MyOrders } from '../../components/p2p/MyOrders';
import { MyTrades } from '../../components/p2p/MyTrades';
import { OrderDetails } from '../../lib/contracts/marketplace';
import { useDashboard } from '../../hooks/useDashboard';

// Phase B: Code-split heavy interactive components that are not needed during initial orderbook render
const TradeDetailCard = dynamic(
  () => import('../../components/p2p/TradeDetailCard').then((mod) => mod.TradeDetailCard),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 rounded-2xl bg-background border-2 border-black dark:border-white/10 flex flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#BFFF00]" />
        <p className="text-xs font-bold text-muted-foreground font-mono">
          Loading Escrow Trade Details...
        </p>
      </div>
    ),
  },
);

const CreateMarketplaceOrderModal = dynamic(
  () =>
    import('../../components/p2p/CreateMarketplaceOrderModal').then(
      (mod) => mod.CreateMarketplaceOrderModal,
    ),
  {
    ssr: false,
  },
);

const TakeOrderModal = dynamic(
  () => import('../../components/p2p/TakeOrderModal').then((mod) => mod.TakeOrderModal),
  {
    ssr: false,
  },
);

export default function P2PPage() {
  const { address: userAddress } = useAccount();

  // Escrow hooks
  const {
    trades: escrowTrades,
    isLoading: isEscrowLoading,
    refetch: refetchEscrow,
  } = useP2PTrades();

  // Marketplace hooks
  const {
    orders,
    isLoading: isMarketplaceLoading,
    refetch: refetchMarketplace,
  } = useMarketplaceOrders();

  const metrics = useDashboard();

  // Page state
  const [activeTab, setActiveTab] = useState<'orderbook' | 'my-orders' | 'my-trades'>('orderbook');
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [isTakeModalOpen, setIsTakeModalOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);

  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const {
    trade: selectedTrade,
    isLoading: isTradeLoading,
    refetch: refetchSingleTrade,
  } = useP2PTrade(selectedTradeId || undefined);

  const handleSelectOrder = (order: OrderDetails) => {
    setSelectedOrder(order);
    setIsTakeModalOpen(true);
  };

  const handleMatchSuccess = (escrowTradeId: number) => {
    setIsTakeModalOpen(false);
    setSelectedOrder(null);
    refetchMarketplace();
    refetchEscrow();
    if (isSaneTradeId(escrowTradeId)) {
      setSelectedTradeId(escrowTradeId);
    } else {
      console.error('Invalid escrowTradeId received in handleMatchSuccess:', escrowTradeId);
    }
  };

  const handleRefreshAll = () => {
    refetchMarketplace();
    refetchEscrow();
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-background p-6 border-2 border-black dark:border-white/10 rounded-2xl shadow-[6px_6px_0_#000]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#BFFF00] border-2 border-black p-1 shadow-[3px_3px_0_#000] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-sans">
              UnifyVault P2P Marketplace
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Buy and sell UVBE directly with other users via secure non-custodial escrow.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsCreateOrderModalOpen(true)}
            className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[4px_4px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Limit Order</span>
          </button>
        </div>
      </div>

      {/* Trade Detail Single View */}
      {selectedTradeId ? (
        <div className="space-y-4 font-mono">
          <button
            type="button"
            onClick={() => setSelectedTradeId(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/10 text-xs font-bold bg-background hover:bg-accent transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace View</span>
          </button>

          {isTradeLoading ? (
            <div className="p-8 rounded-2xl bg-background border-2 border-black dark:border-white/10 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#BFFF00]" />
              <p className="text-xs font-bold text-muted-foreground font-mono">
                Loading Escrow Trade #{selectedTradeId}...
              </p>
            </div>
          ) : !selectedTrade ? (
            <div className="p-8 rounded-2xl bg-background border-2 border-black dark:border-white/10 flex flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="w-6 h-6 text-rose-500" />
              <p className="text-sm font-bold text-foreground font-sans">
                Unable to resolve escrow trade #{selectedTradeId}.
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                The trade may still be finalizing on-chain, or invalid parameters were provided.
                Please retry from the My Trades tab.
              </p>
              <button
                type="button"
                onClick={() => setSelectedTradeId(null)}
                className="mt-2 px-4 py-2 rounded-xl bg-[#BFFF00] text-black font-bold text-xs border-2 border-black shadow-[2px_2px_0_#000]"
              >
                Back to Orderbook
              </button>
            </div>
          ) : (
            <TradeDetailCard
              trade={selectedTrade}
              onRefresh={() => {
                refetchSingleTrade();
                refetchEscrow();
              }}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* P2P Portfolio Performance Banner */}
          {metrics.p2pTrading && metrics.p2pTrading.hasP2PActivity && (
            <div className="p-4 rounded-2xl bg-card border-2 border-black dark:border-white/10 shadow-[4px_4px_0_#BFFF00] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground font-mono">
                  Your P2P Trading Performance
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30">
                  Decoupled OTC Domain
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 font-mono">
                <div className="p-2.5 rounded-xl bg-background border border-border-subtle">
                  <span className="text-[9px] text-muted-foreground uppercase block">
                    P2P Inventory
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {metrics.p2pTrading.formattedP2PShares} UVBE
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-background border border-border-subtle">
                  <span className="text-[9px] text-muted-foreground uppercase block">
                    Acquisition Cost
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {metrics.p2pTrading.formattedP2PCostUSD}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-background border border-border-subtle">
                  <span className="text-[9px] text-muted-foreground uppercase block">
                    Current Valuation
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {metrics.p2pTrading.formattedP2PCurrentValueUSD}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-background border border-border-subtle">
                  <span className="text-[9px] text-muted-foreground uppercase block">
                    Unrealized PnL
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      metrics.p2pTrading.p2pUnrealizedPnLUSD >= 0
                        ? 'text-[#5f8f00] dark:text-[#BFFF00]'
                        : 'text-rose-500'
                    }`}
                  >
                    {metrics.p2pTrading.formattedP2PUnrealizedPnLUSD}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-2 border-b-2 border-black/10 dark:border-white/10 pb-2 overflow-x-auto font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('orderbook')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 min-h-[44px] ${
                activeTab === 'orderbook'
                  ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[3px_3px_0_#000]'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Public Orderbook</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my-orders')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 min-h-[44px] ${
                activeTab === 'my-orders'
                  ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[3px_3px_0_#000]'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              <span>My Orders</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('my-trades')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 min-h-[44px] ${
                activeTab === 'my-trades'
                  ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[3px_3px_0_#000]'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>My Trades</span>
            </button>
          </div>

          {/* Active Tab Content */}
          {activeTab === 'orderbook' && (
            <MarketplaceOrderBook
              orders={orders}
              isLoading={isMarketplaceLoading}
              onSelectOrder={handleSelectOrder}
              onRefresh={handleRefreshAll}
            />
          )}

          {activeTab === 'my-orders' && (
            <MyOrders
              orders={orders}
              isLoading={isMarketplaceLoading}
              onRefresh={handleRefreshAll}
            />
          )}

          {activeTab === 'my-trades' && (
            <MyTrades
              trades={escrowTrades}
              isLoading={isEscrowLoading}
              onSelectTrade={(id) => setSelectedTradeId(id)}
              onRefresh={handleRefreshAll}
            />
          )}
        </div>
      )}

      {/* Modals */}
      <CreateMarketplaceOrderModal
        isOpen={isCreateOrderModalOpen}
        onClose={() => setIsCreateOrderModalOpen(false)}
        onSuccess={handleRefreshAll}
      />

      <TakeOrderModal
        order={selectedOrder}
        isOpen={isTakeModalOpen}
        onClose={() => {
          setIsTakeModalOpen(false);
          setSelectedOrder(null);
        }}
        onMatchSuccess={handleMatchSuccess}
      />
    </div>
  );
}
