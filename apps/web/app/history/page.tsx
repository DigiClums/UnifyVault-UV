'use client';

import * as React from 'react';
import Link from 'next/link';

export interface ExtendedActivityTx {
  id: string;
  type: 'DEPOSIT' | 'REDEEM' | 'FEE_SETTLEMENT';
  amount: string;
  amountNum: number;
  shares: string;
  fees: string;
  feesNum: number;
  timestamp: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
  txHash: `0x${string}`;
}

const mockTransactions: ExtendedActivityTx[] = [
  {
    id: 'tx-101',
    type: 'DEPOSIT',
    amount: '$5,000.00 USDC',
    amountNum: 5000.0,
    shares: '4,987.5000 UVBTCETH',
    fees: '$12.50 USDC',
    feesNum: 12.5,
    timestamp: '2026-07-26 08:30 UTC',
    status: 'CONFIRMED',
    txHash: '0x8f3c7e4a1b92d6e3f5a7b8c9d0e1f2a3b4c5d6e7',
  },
  {
    id: 'tx-102',
    type: 'DEPOSIT',
    amount: '$5,000.00 USDC',
    amountNum: 5000.0,
    shares: '4,987.5000 UVBTCETH',
    fees: '$12.50 USDC',
    feesNum: 12.5,
    timestamp: '2026-07-25 14:15 UTC',
    status: 'CONFIRMED',
    txHash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
  },
  {
    id: 'tx-103',
    type: 'REDEEM',
    amount: '$1,250.00 USDC',
    amountNum: 1250.0,
    shares: '1,000.0000 UVBTCETH',
    fees: '$11.50 USDC',
    feesNum: 11.5,
    timestamp: '2026-07-24 11:05 UTC',
    status: 'CONFIRMED',
    txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
  },
  {
    id: 'tx-104',
    type: 'FEE_SETTLEMENT',
    amount: '$37.40 USDC',
    amountNum: 37.4,
    shares: '0.0000 UVBTCETH',
    fees: '$37.40 USDC',
    feesNum: 37.4,
    timestamp: '2026-07-24 11:05 UTC',
    status: 'CONFIRMED',
    txHash: '0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
  },
];

export default function HistoryPage() {
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  const filteredTxs = React.useMemo(() => {
    return mockTransactions.filter((tx) => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
      return true;
    });
  }, [typeFilter, statusFilter]);

  const totalDeposited = mockTransactions
    .filter((t) => t.type === 'DEPOSIT')
    .reduce((sum, t) => sum + t.amountNum, 0);

  const totalRedeemed = mockTransactions
    .filter((t) => t.type === 'REDEEM')
    .reduce((sum, t) => sum + t.amountNum, 0);

  const totalFees = mockTransactions.reduce((sum, t) => sum + t.feesNum, 0);

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Date (UTC)',
      'Type',
      'Collateral Amount',
      'Shares',
      'Fees Paid',
      'Status',
      'Tx Hash',
    ];
    const rows = filteredTxs.map((t) => [
      t.id,
      t.timestamp,
      t.type,
      t.amount,
      t.shares,
      t.fees,
      t.status,
      t.txHash,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `unifyvault_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Transaction History
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Complete on-chain audit trail of your vault deposits, redemptions, and fee
              settlements.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <span>📥</span> Export CSV Report
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 backdrop-blur-md">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Operations
            </span>
            <p className="text-2xl font-mono font-extrabold text-foreground mt-1">
              {mockTransactions.length}
            </p>
            <span className="text-[11px] text-muted-foreground">On-Chain Executions</span>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 backdrop-blur-md">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Deposited
            </span>
            <p className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              ${totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-muted-foreground">USDC Collateral</span>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 backdrop-blur-md">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Redeemed
            </span>
            <p className="text-2xl font-mono font-extrabold text-purple-600 dark:text-purple-400 mt-1">
              ${totalRedeemed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-muted-foreground">USDC Returned</span>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 backdrop-blur-md">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Fees Settled
            </span>
            <p className="text-2xl font-mono font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              ${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-muted-foreground">Protocol + Performance</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">
              Filter Type:
            </span>
            {['ALL', 'DEPOSIT', 'REDEEM', 'FEE_SETTLEMENT'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  typeFilter === t
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-foreground hover:bg-accent border border-border'
                }`}
              >
                {t === 'FEE_SETTLEMENT' ? 'FEE SETTLEMENT' : t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">
              Status:
            </span>
            {['ALL', 'CONFIRMED', 'PENDING', 'FAILED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-foreground hover:bg-accent border border-border'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider font-mono">
                  <th className="pb-3 font-semibold">Date & Time</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Collateral Amount</th>
                  <th className="pb-3 font-semibold">Share Balance</th>
                  <th className="pb-3 font-semibold">Fees Paid</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Basescan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono text-xs">
                {filteredTxs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No transaction records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTxs.map((tx) => (
                    <tr key={tx.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 text-muted-foreground">{tx.timestamp}</td>
                      <td className="py-3.5 font-bold">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] ${
                            tx.type === 'DEPOSIT'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : tx.type === 'REDEEM'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3.5 text-foreground font-semibold">{tx.amount}</td>
                      <td className="py-3.5 text-foreground">{tx.shares}</td>
                      <td className="py-3.5 text-amber-600 dark:text-amber-400 font-semibold">
                        {tx.fees}
                      </td>
                      <td className="py-3.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <a
                          href={`https://basescan.org/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline font-semibold"
                        >
                          {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)} ↗
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
