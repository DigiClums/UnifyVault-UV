'use client';

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
  const defaultTxs: ActivityTx[] = [
    {
      id: '1',
      type: 'DEPOSIT',
      amount: '$1,000.00 USDC',
      shares: '999.0000 UVBTCETH',
      timestamp: '10 mins ago',
      status: 'CONFIRMED',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
    },
    {
      id: '2',
      type: 'REDEEM',
      amount: '$500.00 USDC',
      shares: '499.5000 UVBTCETH',
      timestamp: '1 hour ago',
      status: 'CONFIRMED',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`,
    },
  ];

  const list = transactions || defaultTxs;

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-[#111827]/40 p-8 text-center">
        <span className="text-3xl mb-2 block">📜</span>
        <h4 className="font-bold text-gray-300">No Recent Transactions</h4>
        <p className="text-xs text-gray-500 mt-1">
          Your deposits and redemptions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-6 backdrop-blur-md overflow-hidden">
      <h3 className="text-lg font-bold text-white mb-4">Recent Protocol Activity</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase tracking-wider">
              <th className="pb-3 font-semibold">Type</th>
              <th className="pb-3 font-semibold">Collateral Amount</th>
              <th className="pb-3 font-semibold">Shares</th>
              <th className="pb-3 font-semibold">Time</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold text-right">Transaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
            {list.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="py-3 font-bold">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs ${
                      tx.type === 'DEPOSIT'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    }`}
                  >
                    {tx.type}
                  </span>
                </td>
                <td className="py-3 text-gray-200">{tx.amount}</td>
                <td className="py-3 text-gray-200">{tx.shares}</td>
                <td className="py-3 text-gray-400">{tx.timestamp}</td>
                <td className="py-3">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {tx.status}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <a
                    href={`https://basescan.org/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline"
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
