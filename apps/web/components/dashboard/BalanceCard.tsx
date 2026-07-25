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
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 backdrop-blur-md animate-pulse">
        <div className="h-4 w-32 rounded bg-muted mb-3" />
        <div className="h-8 w-44 rounded bg-muted mb-2" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-blue-500/10 via-card to-background dark:from-blue-900/20 dark:via-[#111827] dark:to-[#090d16] p-6 backdrop-blur-md shadow-xl shadow-primary/5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          Your Position Balance
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          UVBTCETH
        </span>
      </div>

      <div className="mt-3">
        <span className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
          {sharesBalance} UVBTCETH
        </span>
        <span className="block text-sm text-muted-foreground mt-1 font-medium font-mono">
          ≈ {usdValue.startsWith('$') ? usdValue : `$${usdValue}`} USD
        </span>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/deposit"
          className="flex-1 text-center rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
        >
          Deposit Collateral
        </Link>
        <Link
          href="/redeem"
          className="flex-1 text-center rounded-xl border border-border bg-secondary hover:bg-accent py-2.5 text-sm font-semibold text-foreground transition-colors"
        >
          Redeem Shares
        </Link>
      </div>
    </div>
  );
}
