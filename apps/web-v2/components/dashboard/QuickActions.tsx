'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '../common/Card';
import { ArrowDownRight, ArrowUpRight, Zap } from 'lucide-react';

export function QuickActions() {
  return (
    <Card glow className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center space-x-2">
        <Zap className="w-5 h-5 text-accent-cyan" />
        <span>Vault Execution Actions</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/deposit"
          className="group relative overflow-hidden rounded-xl p-4 bg-blue-purple-gradient p-0.5 shadow-glow transition-all hover:scale-[1.02]"
        >
          <div className="w-full h-full bg-surface rounded-[10px] p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-bold text-white block group-hover:text-accent-blue transition-colors">
                Deposit Collateral
              </span>
              <span className="text-xs text-slate-400 block">
                Instant USDC deposit & share minting
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-accent-blue/10 text-accent-blue group-hover:bg-accent-blue group-hover:text-white transition-all">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
        </Link>

        <Link
          href="/redeem"
          className="group relative overflow-hidden rounded-xl p-4 bg-emerald-cyan-gradient p-0.5 shadow-glow-emerald transition-all hover:scale-[1.02]"
        >
          <div className="w-full h-full bg-surface rounded-[10px] p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-bold text-white block group-hover:text-accent-emerald transition-colors">
                Redeem Shares
              </span>
              <span className="text-xs text-slate-400 block">Burn UVBTCETH for USDC payout</span>
            </div>
            <div className="p-2.5 rounded-xl bg-accent-emerald/10 text-accent-emerald group-hover:bg-accent-emerald group-hover:text-white transition-all">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </Link>
      </div>
    </Card>
  );
}
