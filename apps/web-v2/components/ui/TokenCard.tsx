'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StatusBadge } from './StatusBadge';
import { TokenIcon } from './TokenIcon';
import { formatDisplayCryptoBalance } from '../../lib/math/format';
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
  const displayBalance = formatDisplayCryptoBalance(balance, symbol);

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
      className={cn(
        'p-4 sm:p-5 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 hover:border-accent-blue/40 transition-all shadow-lg hover:shadow-accent-blue/5',
        className,
      )}
    >
      {/* Top Header Row 1: Token Icon & Symbol + Weight Badge */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center space-x-2.5 min-w-0">
          <TokenIcon symbol={symbol} size={32} />
          <h4 className="text-base font-bold text-slate-950 dark:text-white tracking-tight font-mono">
            {symbol}
          </h4>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-flex items-center text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 whitespace-nowrap">
            {weightPercent} Weight
          </span>
        </div>
      </div>

      {/* Header Row 2: Asset Full Name + Status Badge */}
      <div className="flex items-center justify-between gap-2 min-w-0 -mt-1.5">
        <p
          className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1 min-w-0"
          title={name}
        >
          {name}
        </p>
        <div className="shrink-0">
          <StatusBadge
            status={status}
            showPulse={false}
            className="text-[9px] sm:text-[10px] py-0 px-1.5 font-bold uppercase tracking-wider shrink-0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-2.5 border-t border-border-subtle/40 text-xs">
        <div className="min-w-0 pr-1">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">
            Balance
          </span>
          <p
            className="text-xs sm:text-sm font-bold text-slate-950 dark:text-white font-mono mt-0.5 truncate"
            title={balance}
            aria-label={`Exact Balance: ${balance}`}
          >
            {displayBalance}
          </p>
        </div>
        <div className="text-right min-w-0 pl-1">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">
            Current Price
          </span>
          <p
            className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 truncate"
            title={priceUSD}
            aria-label={`Current Price: ${priceUSD}`}
          >
            {priceUSD}
          </p>
        </div>
        <div className="min-w-0 pr-1 mt-1 sm:mt-0">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">
            USD Valuation
          </span>
          <p
            className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 truncate"
            title={valueUSD}
            aria-label={`USD Valuation: ${valueUSD}`}
          >
            {valueUSD}
          </p>
        </div>
        {change24h && (
          <div className="text-right min-w-0 pl-1 mt-1 sm:mt-0">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">
              24h Change
            </span>
            <p
              className={cn(
                'text-xs sm:text-sm font-bold font-mono mt-0.5 truncate',
                isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400',
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
