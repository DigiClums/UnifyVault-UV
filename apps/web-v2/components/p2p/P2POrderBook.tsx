'use client';

import React, { useState } from 'react';
import { formatUnits, type Address } from 'viem';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { TradeDetails, TradeState, STATE_LABELS } from '../../hooks/useP2PEscrow';
import { getChainTokens, DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';

interface P2POrderBookProps {
  trades: TradeDetails[];
  isLoading: boolean;
  onSelectTrade: (tradeId: number) => void;
  onRefresh: () => void;
}

export function P2POrderBook({ trades, isLoading, onSelectTrade, onRefresh }: P2POrderBookProps) {
  const { chain } = useAccount();
  const tokens = getChainTokens(chain?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<string>('ALL');

  const filteredTrades = trades.filter((t) => {
    const matchesSearch =
      t.tradeId.toString().includes(searchTerm) ||
      t.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.buyer.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterState === 'ALL') return true;
    if (filterState === 'ACTIVE')
      return t.state === TradeState.CREATED || t.state === TradeState.FUNDED;
    if (filterState === 'CLAIMED') return t.state === TradeState.PAYMENT_SUBMITTED;
    if (filterState === 'COMPLETED')
      return t.state === TradeState.RELEASED || t.state === TradeState.REFUNDED;
    if (filterState === 'DISPUTED') return t.state === TradeState.DISPUTED;
    return true;
  });

  const formatAssetAmount = (amount: bigint, asset: Address) => {
    const addr = asset.toLowerCase();
    const isEth = addr === '0x0000000000000000000000000000000000000000';
    const uvAddr = (tokens.UVBTCETH || DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken).toLowerCase();
    const cbBtcAddr = tokens.cbBTC.toLowerCase();
    const wethAddr = tokens.WETH.toLowerCase();

    if (isEth) return `${formatUnits(amount, 18)} ETH`;
    if (addr === uvAddr) return `${formatUnits(amount, 18)} UVBTCETH`;
    if (addr === wethAddr) return `${formatUnits(amount, 18)} WETH`;
    if (addr === cbBtcAddr) return `${formatUnits(amount, 8)} cbBTC`;
    return `${formatUnits(amount, 6)} USDC`;
  };

  const formatFiatAmount = (fiatAmount: bigint, currency: string) => {
    return `${formatUnits(fiatAmount, 2)} ${currency}`;
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-background p-4 border-2 border-black dark:border-white/10 rounded-2xl shadow-[4px_4px_0_#000]">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Trade ID or wallet address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border-2 border-black dark:border-white/20 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="px-3 py-2 rounded-xl border-2 border-black dark:border-white/20 text-xs font-bold bg-background focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
          >
            <option value="ALL">All States</option>
            <option value="ACTIVE">Active (Created/Funded)</option>
            <option value="CLAIMED">Payment Claimed</option>
            <option value="COMPLETED">Completed</option>
            <option value="DISPUTED">Disputed</option>
          </select>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent transition-colors disabled:opacity-50"
            title="Refresh on-chain logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Trades Table List */}
      <div className="bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[6px_6px_0_#000] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-mono space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#BFFF00]" />
            <p>Fetching P2P Escrow logs directly from Base RPC...</p>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-mono space-y-1">
            <p className="font-bold text-foreground">No P2P Trade Orders Found</p>
            <p>Create a trade or clear filters to view active orders.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-accent/40 border-b border-black/10 dark:border-white/10 uppercase tracking-wider font-bold text-[10px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Escrow Amount</th>
                  <th className="px-4 py-3">Fiat Value</th>
                  <th className="px-4 py-3">Seller</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5 font-mono">
                {filteredTrades.map((t) => (
                  <tr
                    key={t.tradeId}
                    className="hover:bg-accent/20 transition-colors cursor-pointer"
                    onClick={() => onSelectTrade(t.tradeId)}
                  >
                    <td className="px-4 py-3 font-bold">#{t.tradeId}</td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      {formatAssetAmount(t.amount, t.asset)}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      {formatFiatAmount(t.fiatAmount, t.fiatCurrency)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.seller.slice(0, 6)}...{t.seller.slice(-4)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.buyer.slice(0, 6)}...{t.buyer.slice(-4)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-accent/40 border-black/10">
                        {STATE_LABELS[t.state]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTrade(t.tradeId);
                        }}
                        className="px-3 py-1 rounded-lg bg-[#BFFF00] text-black font-black text-[11px] border border-black shadow-[2px_2px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all inline-flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
