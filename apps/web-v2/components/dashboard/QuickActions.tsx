'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '../common/Card';
import { ArrowDownRight, ArrowUpRight, Zap } from 'lucide-react';

export function QuickActions() {
  return (
    <Card className="space-y-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-xs">
      <div className="flex items-center space-x-2">
        <div className="p-1.5 rounded-lg bg-accent-blue/10 text-accent-blue">
          <Zap className="w-4 h-4" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Vault Execution Actions
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Deposit Card */}
        <Link
          href="/deposit"
          className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-blue-500/30 hover:border-accent-blue p-4 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <div className="w-full flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-base font-bold text-slate-900 dark:text-white block group-hover:text-accent-blue transition-colors">
                Deposit
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Add USDC & mint UVBTCETH shares
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-accent-blue border border-blue-500/20 group-hover:bg-accent-blue group-hover:text-white transition-all shrink-0">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
        </Link>

        {/* Redeem Card */}
        <Link
          href="/redeem"
          className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/30 hover:border-emerald-500 p-4 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <div className="w-full flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-base font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Redeem
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Burn UVBTCETH & receive USDC
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </Link>
      </div>
    </Card>
  );
}
