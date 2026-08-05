'use client';

import { useAccount } from 'wagmi';
import { getExplorerBaseUrl } from '../../lib/config/network';

export interface ActivityTx {
  id: string;
  type: 'DEPOSIT' | 'REDEEM';
  amount: string;
  shares: string;
  timestamp: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
  txHash: `0x${string}`;
}

interface RecentActivityTableProps {
  transactions?: ActivityTx[];
}

export function RecentActivityTable({ transactions }: RecentActivityTableProps) {
  const { chain } = useAccount();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const list = transactions || [];

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 dark:bg-[#111827]/40 p-8 text-center shadow-sm dark:shadow-none">
        <span className="text-3xl mb-2 block">📜</span>
        <h4 className="font-bold text-foreground">No Recent Transactions</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Your deposits and redemptions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md overflow-hidden shadow-sm dark:shadow-none">
      <h3 className="text-lg font-bold text-foreground mb-4">Recent Protocol Activity</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="pb-3 font-semibold">Type</th>
              <th className="pb-3 font-semibold">Collateral Amount</th>
              <th className="pb-3 font-semibold">Shares</th>
              <th className="pb-3 font-semibold">Time</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold text-right">Transaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 font-mono text-xs">
            {list.map((tx) => (
              <tr key={tx.id} className="hover:bg-accent/40 transition-colors">
                <td className="py-3 font-bold">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs ${
                      tx.type === 'DEPOSIT'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                    }`}
                  >
                    {tx.type}
                  </span>
                </td>
                <td className="py-3 text-foreground">{tx.amount}</td>
                <td className="py-3 text-foreground">{tx.shares}</td>
                <td className="py-3 text-muted-foreground">{tx.timestamp}</td>
                <td className="py-3">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {tx.status}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <a
                    href={`${explorerBaseUrl}/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
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
  );
}
