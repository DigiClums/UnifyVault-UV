'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { ShieldCheck, Plus, RefreshCw, Layers, UserCheck, ArrowLeft } from 'lucide-react';
import { useP2PTrades, useP2PTrade, TradeDetails } from '../../hooks/useP2PEscrow';
import { P2POrderBook } from '../../components/p2p/P2POrderBook';
import { TradeDetailCard } from '../../components/p2p/TradeDetailCard';
import { CreateTradeModal } from '../../components/p2p/CreateTradeModal';

export default function P2PPage() {
  const { address: userAddress } = useAccount();
  const { trades, isLoading, refetch } = useP2PTrades();

  const [activeTab, setActiveTab] = useState<'all' | 'my-trades'>('all');
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { trade: selectedTrade, refetch: refetchSingle } = useP2PTrade(
    selectedTradeId || undefined,
  );

  const myTrades = trades.filter((t) => {
    if (!userAddress) return false;
    const lowerUser = userAddress.toLowerCase();
    return t.seller.toLowerCase() === lowerUser || t.buyer.toLowerCase() === lowerUser;
  });

  const displayedTrades = activeTab === 'my-trades' ? myTrades : trades;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-background p-6 border-2 border-black dark:border-white/10 rounded-2xl shadow-[6px_6px_0_#000]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#BFFF00] border-2 border-black p-1 shadow-[3px_3px_0_#000] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Non-Custodial P2P Escrow Protocol
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct blockchain-backed peer-to-peer crypto/fiat escrow — Zero database reliance.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[4px_4px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Escrow Order</span>
        </button>
      </div>

      {/* Main View Area */}
      {selectedTradeId && selectedTrade ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedTradeId(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black dark:border-white/10 text-xs font-bold bg-background hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to P2P Orderbook</span>
          </button>

          <TradeDetailCard
            trade={selectedTrade}
            onRefresh={() => {
              refetchSingle();
              refetch();
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b-2 border-black/10 dark:border-white/10 pb-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[3px_3px_0_#000]'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>All Protocol Orders ({trades.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('my-trades')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === 'my-trades'
                  ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[3px_3px_0_#000]'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>My Trades ({myTrades.length})</span>
            </button>
          </div>

          {/* Orderbook Component */}
          <P2POrderBook
            trades={displayedTrades}
            isLoading={isLoading}
            onSelectTrade={(id) => setSelectedTradeId(id)}
            onRefresh={refetch}
          />
        </div>
      )}

      {/* Create Order Modal */}
      <CreateTradeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
