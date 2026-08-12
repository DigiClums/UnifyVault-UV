'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Layers,
  UserCheck,
  ArrowLeft,
  ShoppingBag,
  ListOrdered,
  Lock,
} from 'lucide-react';
import { useP2PTrades, useP2PTrade, TradeDetails } from '../../hooks/useP2PEscrow';
import { useMarketplaceOrders } from '../../hooks/useMarketplace';
import { MarketplaceOrderBook } from '../../components/p2p/MarketplaceOrderBook';
import { TakeOrderModal } from '../../components/p2p/TakeOrderModal';
import { CreateMarketplaceOrderModal } from '../../components/p2p/CreateMarketplaceOrderModal';
import { MyOrders } from '../../components/p2p/MyOrders';
import { MyTrades } from '../../components/p2p/MyTrades';
import { TradeDetailCard } from '../../components/p2p/TradeDetailCard';
import { P2POrderBook } from '../../components/p2p/P2POrderBook';
import { CreateTradeModal } from '../../components/p2p/CreateTradeModal';
import { OrderDetails } from '../../lib/contracts/marketplace';

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

  // Page state
  const [activeTab, setActiveTab] = useState<
    'orderbook' | 'my-orders' | 'my-trades' | 'direct-escrow'
  >('orderbook');
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [isTakeModalOpen, setIsTakeModalOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isDirectEscrowModalOpen, setIsDirectEscrowModalOpen] = useState(false);

  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const { trade: selectedTrade, refetch: refetchSingleTrade } = useP2PTrade(
    selectedTradeId || undefined,
  );

  const handleSelectOrder = (order: OrderDetails) => {
    setSelectedOrder(order);
    setIsTakeModalOpen(true);
  };

  const handleMatchSuccess = (escrowTradeId: number) => {
    setIsTakeModalOpen(false);
    setSelectedOrder(null);
    refetchMarketplace();
    refetchEscrow();
    setSelectedTradeId(escrowTradeId);
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
              Unify P2P Marketplace Protocol
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Non-custodial limit orderbook & settlement engine — Base Sepolia testnet.
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
      {selectedTradeId && selectedTrade ? (
        <div className="space-y-4 font-mono">
          <button
            type="button"
            onClick={() => setSelectedTradeId(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/10 text-xs font-bold bg-background hover:bg-accent transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace View</span>
          </button>

          <TradeDetailCard
            trade={selectedTrade}
            onRefresh={() => {
              refetchSingleTrade();
              refetchEscrow();
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
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

            <button
              type="button"
              onClick={() => setActiveTab('direct-escrow')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 min-h-[44px] ${
                activeTab === 'direct-escrow'
                  ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[3px_3px_0_#000]'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Direct Escrow</span>
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

          {activeTab === 'direct-escrow' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDirectEscrowModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-accent border-2 border-black font-bold text-xs shadow-[2px_2px_0_#000]"
                >
                  + Direct Bilateral Escrow
                </button>
              </div>
              <P2POrderBook
                trades={escrowTrades}
                isLoading={isEscrowLoading}
                onSelectTrade={(id) => setSelectedTradeId(id)}
                onRefresh={refetchEscrow}
              />
            </div>
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

      <CreateTradeModal
        isOpen={isDirectEscrowModalOpen}
        onClose={() => setIsDirectEscrowModalOpen(false)}
        onSuccess={refetchEscrow}
      />
    </div>
  );
}
