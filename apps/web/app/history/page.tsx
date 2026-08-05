'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { getExplorerBaseUrl } from '../../lib/config/network';

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

export default function HistoryPage() {
  const { chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');

  // Live connected user transactions (empty array when fresh wallet)
  const userTransactions: ExtendedActivityTx[] = React.useMemo(() => [], []);

  const filteredTxs = React.useMemo(() => {
    return userTransactions.filter((tx) => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
      return true;
    });
  }, [userTransactions, typeFilter, statusFilter]);

  const totalDeposited = userTransactions
    .filter((t) => t.type === 'DEPOSIT')
    .reduce((sum, t) => sum + t.amountNum, 0);

  const totalRedeemed = userTransactions
    .filter((t) => t.type === 'REDEEM')
    .reduce((sum, t) => sum + t.amountNum, 0);

  const totalFees = userTransactions.reduce((sum, t) => sum + t.feesNum, 0);

  const handleExportCSV = () => {
    if (filteredTxs.length === 0) return;
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
            disabled={filteredTxs.length === 0}
            aria-label="Export CSV Report"
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
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
              {userTransactions.length}
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

        {/* Transactions Table & Empty State */}
        {userTransactions.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card/90 dark:bg-[#111827]/60 p-12 text-center shadow-xl backdrop-blur-xl">
            <span className="text-5xl mb-4 block">📜</span>
            <h3 className="text-xl font-bold text-foreground">No transactions yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 mb-6">
              Make your first deposit to start building your portfolio.
            </p>
            <Link
              href="/deposit"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-xl hover:bg-primary/90 transition-all"
            >
              Deposit USDC Collateral
            </Link>
          </div>
        ) : (
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
                  {filteredTxs.map((tx) => (
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
                          href={`${explorerBaseUrl}/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline font-semibold"
                        >
                          {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)} ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
