'use client';

import React from 'react';
import { TableCard } from '../../components/ui/TableCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatCard } from '../../components/ui/StatCard';
import {
  History,
  RefreshCw,
  Layers,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
} from 'lucide-react';
import { useTransactionHistory, IndexedEvent } from '../../hooks/useIndexerData';
import { formatUnits } from 'viem';

export default function ActivityPage() {
  const { transactions, isLoading } = useTransactionHistory();

  const sortedTransactions = [...transactions].sort((a, b) => b.blockNumber - a.blockNumber);

  function renderEventTypeBadge(type: string) {
    switch (type) {
      case 'DEPOSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowDownLeft className="w-3 h-3" /> Deposit
          </span>
        );
      case 'REDEEM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ArrowUpRight className="w-3 h-3" /> Redeem
          </span>
        );
      case 'FEE_COLLECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <DollarSign className="w-3 h-3" /> Fee Collected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {type}
          </span>
        );
    }
  }

  function formatAmount(tx: IndexedEvent) {
    if (tx.type === 'DEPOSIT') {
      const raw = typeof tx.amountIn === 'string' ? tx.amountIn : '0';
      const val = parseFloat(formatUnits(BigInt(raw), 6)).toFixed(4);
      return `${val} USDC`;
    }
    if (tx.type === 'REDEEM') {
      const raw = typeof tx.grossAmount === 'string' ? tx.grossAmount : '0';
      const val = parseFloat(formatUnits(BigInt(raw), 6)).toFixed(4);
      return `${val} USDC`;
    }
    if (tx.type === 'FEE_COLLECTED') {
      const raw = typeof tx.amount === 'string' ? tx.amount : '0';
      const val = parseFloat(formatUnits(BigInt(raw), 6)).toFixed(4);
      return `${val} USDC`;
    }
    if (tx.type === 'TRANSFER') {
      const raw = typeof tx.value === 'string' ? tx.value : '0';
      const val = parseFloat(formatUnits(BigInt(raw), 18)).toFixed(4);
      return `${val} UV-BTC-ETH`;
    }
    return '-';
  }

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Live Protocol Event Timeline
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-xs font-semibold">
              Base Sepolia
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Auditable transaction stream of user deposits, share redemptions, strategy rebalances,
            and protocol fee accrual.
          </p>
        </div>
      </div>

      {/* Verified On-Chain Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Network"
          value="Base Sepolia"
          subtitle="Chain ID 84532"
          icon={History}
          glowColor="blue"
        />
        <StatCard
          title="Protocol Engine"
          value="V2 Active"
          subtitle="Stateless Custody"
          icon={Layers}
          glowColor="emerald"
        />
        <StatCard
          title="Oracle Keeper"
          value="Active"
          subtitle="Coinbase Spot Feeds"
          icon={RefreshCw}
          glowColor="purple"
        />
      </div>

      {/* Event Timeline Table Card */}
      <TableCard
        title="Protocol Event Timeline"
        subtitle="On-chain activity logs for Deposit, Redeem, Rebalance, and FeeCollection"
        icon={History}
      >
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-accent-blue" />
            <p className="text-sm">Fetching Base Sepolia contract logs...</p>
          </div>
        ) : sortedTransactions.length === 0 ? (
          <EmptyState
            title="No On-Chain Activity Logged"
            description="Contract events will appear here in real-time as users execute deposits, redemptions, and admin operations on Base Sepolia."
            icon={History}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">User / Account</th>
                  <th className="py-3 px-4">Value / Amount</th>
                  <th className="py-3 px-4">Block</th>
                  <th className="py-3 px-4 text-right">Transaction Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {sortedTransactions.map((tx, idx) => {
                  const account = tx.user || tx.from || '-';
                  const accountShort =
                    account.length > 10 ? `${account.slice(0, 6)}...${account.slice(-4)}` : account;
                  const txShort = `${tx.txHash.slice(0, 6)}...${tx.txHash.slice(-4)}`;
                  return (
                    <tr
                      key={`${tx.txHash}-${tx.logIndex || idx}`}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4">{renderEventTypeBadge(tx.type || 'EVENT')}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {account !== '-' ? (
                          <a
                            href={`https://sepolia.basescan.org/address/${account}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-accent-blue transition-colors inline-flex items-center gap-1"
                          >
                            {accountShort}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{formatAmount(tx)}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">#{tx.blockNumber}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        <a
                          href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent-blue hover:underline"
                        >
                          {txShort}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </div>
  );
}
