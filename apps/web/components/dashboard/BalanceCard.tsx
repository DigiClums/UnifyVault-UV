'use client';

import Link from 'next/link';

interface BalanceCardProps {
  sharesBalance: string;
  usdValue: string;
  loading?: boolean;
}

export function BalanceCard({ sharesBalance, usdValue, loading }: BalanceCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-blue-500/20 bg-blue-600/5 p-6 backdrop-blur-md animate-pulse">
        <div className="h-4 w-32 rounded bg-gray-800 mb-3" />
        <div className="h-8 w-44 rounded bg-gray-800 mb-2" />
        <div className="h-4 w-24 rounded bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-900/20 via-[#111827] to-[#090d16] p-6 backdrop-blur-md shadow-xl shadow-blue-500/5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
          Your Position Balance
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          UVBTCETH
        </span>
      </div>

      <div className="mt-3">
        <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
          {sharesBalance} UVBTCETH
        </span>
        <span className="block text-sm text-gray-400 mt-1 font-medium font-mono">
          ≈ ${usdValue} USD
        </span>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/deposit"
          className="flex-1 text-center rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30"
        >
          Deposit Collateral
        </Link>
        <Link
          href="/redeem"
          className="flex-1 text-center rounded-xl border border-gray-700 bg-gray-800/60 py-2.5 text-sm font-semibold text-gray-200 hover:bg-gray-700 transition-colors"
        >
          Redeem Shares
        </Link>
      </div>
    </div>
  );
}
