'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits, hexToString, type Address } from 'viem';
import {
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';
import { TradeDetails, TradeState, STATE_LABELS } from '../../hooks/useP2PEscrow';
import { getTokenDecimals, getTokenSymbol } from '../../lib/explorer/eventRegistry';

interface MyTradesProps {
  trades: TradeDetails[];
  isLoading: boolean;
  onSelectTrade: (tradeId: number) => void;
  onRefresh: () => void;
}

export function MyTrades({ trades, isLoading, onSelectTrade, onRefresh }: MyTradesProps) {
  const { address: userAddress } = useAccount();
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [tab, setTab] = useState<'ALL' | 'BUYER' | 'SELLER' | 'ACTIVE' | 'COMPLETED'>('ALL');

  if (!userAddress) {
    return (
      <div className="p-12 text-center bg-background border-2 border-black dark:border-white/10 rounded-2xl space-y-2 font-mono">
        <p className="text-xs text-muted-foreground font-bold">
          Please connect your wallet to view your trades.
        </p>
      </div>
    );
  }

  const myTrades = trades.filter((t) => {
    const userLower = userAddress.toLowerCase();
    return t.buyer.toLowerCase() === userLower || t.seller.toLowerCase() === userLower;
  });

  const filteredTrades = myTrades.filter((t) => {
    const userLower = userAddress.toLowerCase();
    const isBuyer = t.buyer.toLowerCase() === userLower;
    const isSeller = t.seller.toLowerCase() === userLower;

    if (tab === 'BUYER') return isBuyer;
    if (tab === 'SELLER') return isSeller;
    if (tab === 'ACTIVE') return t.state >= TradeState.CREATED && t.state <= TradeState.DISPUTED;
    if (tab === 'COMPLETED') return t.state >= TradeState.RELEASED;
    return true;
  });

  const handleCopy = (addr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const getEscrowBadge = (state: TradeState) => {
    switch (state) {
      case TradeState.CREATED:
        return (
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold border border-blue-500/20">
            CREATED (Unfunded)
          </span>
        );
      case TradeState.FUNDED:
        return (
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20">
            FUNDED (Payment Required)
          </span>
        );
      case TradeState.PAYMENT_SUBMITTED:
        return (
          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 font-bold border border-purple-500/20">
            WAITING VERIFICATION
          </span>
        );
      case TradeState.RELEASED:
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
            RELEASED
          </span>
        );
      case TradeState.REFUNDED:
        return (
          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20">
            REFUNDED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold">
            {STATE_LABELS[state]}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Tab Filter */}
      <div className="flex items-center gap-2 border-b-2 border-black/10 dark:border-white/10 pb-2 overflow-x-auto">
        {(['ALL', 'BUYER', 'SELLER', 'ACTIVE', 'COMPLETED'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 min-h-[38px] ${
              tab === t
                ? 'bg-[#BFFF00] text-black border-2 border-black shadow-[2px_2px_0_#000]'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filteredTrades.length === 0 ? (
        <div className="p-12 text-center bg-background border-2 border-black dark:border-white/10 rounded-2xl text-xs text-muted-foreground font-bold">
          No P2P trades match the selected filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrades.map((t) => {
            const isBuyer = t.buyer.toLowerCase() === userAddress.toLowerCase();
            const counterparty = isBuyer ? t.seller : t.buyer;
            const assetDecimals = getTokenDecimals(t.asset);
            const assetSymbol = getTokenSymbol(t.asset);

            return (
              <div
                key={t.tradeId}
                onClick={() => onSelectTrade(t.tradeId)}
                className="p-4 bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[4px_4px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] text-white ${
                        isBuyer ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}
                    >
                      {isBuyer ? 'BUYER ROLE' : 'SELLER ROLE'}
                    </span>
                    <span>Trade #{t.tradeId}</span>
                    {getEscrowBadge(t.state)}
                  </div>

                  <div className="text-xs space-x-3 text-muted-foreground">
                    <span>
                      Asset:{' '}
                      <strong className="text-foreground">
                        {formatUnits(t.amount, assetDecimals)} {assetSymbol}
                      </strong>
                    </span>
                    <span>
                      Fiat:{' '}
                      <strong className="text-foreground">
                        ₹
                        {(Number(t.fiatAmount) / 100).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        {hexToString(t.fiatCurrency).replace(/\0/g, '') || 'INR'}
                      </strong>
                    </span>
                    <span>
                      Counterparty:{' '}
                      <strong className="text-foreground">
                        {counterparty.slice(0, 6)}...{counterparty.slice(-4)}
                      </strong>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTrade(t.tradeId)}
                  className="w-full md:w-auto px-4 py-2 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 min-h-[40px]"
                >
                  <span>VIEW TRADE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
