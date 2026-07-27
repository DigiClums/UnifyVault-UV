'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { StatusBadge } from './StatusBadge';
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
  const getSymbolBadgeClass = (sym: string) => {
    switch (sym.toUpperCase()) {
      case 'BTC':
      case 'CBBTC':
      case 'WBTC':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'ETH':
      case 'WETH':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'USDC':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'p-5 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 hover:border-border-subtle transition-all shadow-lg',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl border flex items-center justify-center font-extrabold text-sm',
              getSymbolBadgeClass(symbol),
            )}
          >
            {symbol.substring(0, 3)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-base font-bold text-white tracking-tight">{symbol}</h4>
              <StatusBadge status={status} showPulse={false} className="text-[10px] py-0 px-2" />
            </div>
            <p className="text-xs text-slate-400">{name}</p>
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
          <span className="text-slate-400">Balance</span>
          <p className="text-sm font-bold text-white font-mono mt-0.5">{balance}</p>
        </div>
        <div className="text-right">
          <span className="text-slate-400">Current Price</span>
          <p className="text-sm font-bold text-slate-200 font-mono mt-0.5">{priceUSD}</p>
        </div>
        <div>
          <span className="text-slate-400">USD Valuation</span>
          <p className="text-sm font-bold text-accent-emerald font-mono mt-0.5">{valueUSD}</p>
        </div>
        {change24h && (
          <div className="text-right">
            <span className="text-slate-400">24h Change</span>
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
