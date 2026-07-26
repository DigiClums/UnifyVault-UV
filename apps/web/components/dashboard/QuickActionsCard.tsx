'use client';

import * as React from 'react';
import Link from 'next/link';

export function QuickActionsCard() {
  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
      <h3 className="text-lg font-bold text-foreground mb-4">Quick Vault Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/deposit"
          className="group rounded-xl bg-primary/10 border border-primary/20 hover:border-primary/40 p-4 transition-all hover:scale-[1.02] flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-primary block uppercase tracking-wider">
              Deposit
            </span>
            <span className="text-sm font-extrabold text-foreground">Mint UV Shares</span>
          </div>
          <span className="text-xl group-hover:translate-x-1 transition-transform">📥</span>
        </Link>

        <Link
          href="/redeem"
          className="group rounded-xl bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 p-4 transition-all hover:scale-[1.02] flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 block uppercase tracking-wider">
              Redeem
            </span>
            <span className="text-sm font-extrabold text-foreground">Burn for USDC</span>
          </div>
          <span className="text-xl group-hover:translate-x-1 transition-transform">📤</span>
        </Link>

        <Link
          href="/portfolio"
          className="group rounded-xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 p-4 transition-all hover:scale-[1.02] flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">
              Portfolio
            </span>
            <span className="text-sm font-extrabold text-foreground">View Cost Basis</span>
          </div>
          <span className="text-xl group-hover:translate-x-1 transition-transform">💼</span>
        </Link>

        <Link
          href="/analytics"
          className="group rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 p-4 transition-all hover:scale-[1.02] flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">
              Analytics
            </span>
            <span className="text-sm font-extrabold text-foreground">Protocol Metrics</span>
          </div>
          <span className="text-xl group-hover:translate-x-1 transition-transform">📈</span>
        </Link>
      </div>
    </div>
  );
}
