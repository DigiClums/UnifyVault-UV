'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StatusBadge } from './StatusBadge';
import { TokenIcon } from './TokenIcon';
import { cn } from '../../lib/utils/cn';

interface TokenCardProps {
  symbol: string;
  name: string;
  balance: string;
  priceUSD: string;
  valueUSD: string;
  weightPercent: string;
  change24h?: string;
  isPositive?: boolean;
  status?: string;
  className?: string;
}

export function TokenCard({
  symbol,
  name,
  balance,
  priceUSD,
  valueUSD,
  weightPercent,
  change24h,
  isPositive = true,
  status = 'Active',
  className,
}: TokenCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
      className={cn(
        'p-5 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 hover:border-accent-blue/40 transition-all shadow-lg hover:shadow-accent-blue/5',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TokenIcon symbol={symbol} size={36} />
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-base font-bold text-slate-950 dark:text-white tracking-tight">
                {symbol}
              </h4>
              <StatusBadge status={status} showPulse={false} className="text-[10px] py-0 px-2" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{name}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
            {weightPercent} Weight
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-subtle/40 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Balance</span>
          <p className="text-sm font-bold text-slate-950 dark:text-white font-mono mt-0.5">
            {balance}
          </p>
        </div>
        <div className="text-right">
          <span className="text-slate-500 dark:text-slate-400">Current Price</span>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
            {priceUSD}
          </p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">USD Valuation</span>
          <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{valueUSD}</p>
        </div>
        {change24h && (
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400">24h Change</span>
            <p
              className={cn(
                'text-sm font-bold font-mono mt-0.5',
                isPositive ? 'text-emerald-400' : 'text-rose-400',
              )}
            >
              {change24h}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
