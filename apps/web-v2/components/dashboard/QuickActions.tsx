'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '../common/Card';
import { ArrowDownRight, ArrowUpRight, Zap } from 'lucide-react';

export function QuickActions() {
  return (
    <Card glow className="space-y-4">
      <h3 className="text-lg font-bold text-foreground flex items-center space-x-2">
        <Zap className="w-5 h-5 text-accent-cyan" />
        <span>Vault Execution Actions</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/deposit"
          className="group relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-sm hover:border-accent-blue/50 transition-all hover:scale-[1.01]"
        >
          <div className="w-full flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-base font-bold text-white block group-hover:text-accent-blue transition-colors">
                Deposit
              </span>
              <span className="text-xs text-slate-400 block">Add USDC and mint UVBTCETH</span>
            </div>
            <div className="p-2.5 rounded-xl bg-accent-blue/10 text-accent-blue group-hover:bg-accent-blue group-hover:text-white transition-all shrink-0">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
        </Link>

        <Link
          href="/redeem"
          className="group relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-sm hover:border-accent-emerald/50 transition-all hover:scale-[1.01]"
        >
          <div className="w-full flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-base font-bold text-white block group-hover:text-emerald-400 transition-colors">
                Redeem
              </span>
              <span className="text-xs text-slate-400 block">Burn UVBTCETH and receive USDC</span>
            </div>
            <div className="p-2.5 rounded-xl bg-accent-emerald/10 text-accent-emerald group-hover:bg-accent-emerald group-hover:text-white transition-all shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </Link>
      </div>
    </Card>
  );
}
