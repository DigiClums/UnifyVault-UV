'use client';

import React, { useState, useEffect } from 'react';
import { useLivePrices } from '../../hooks/useLivePrices';
import { formatUSD } from '../../lib/math';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Bell,
  BellOff,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function LivePriceTicker() {
  const livePrices = useLivePrices();
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeToast, setActiveToast] = useState<{ message: string; type: 'up' | 'down' } | null>(
    null,
  );

  // Timer to count seconds since last update
  useEffect(() => {
    if (!livePrices.lastUpdated) return;

    setSecondsAgo(0);
    const interval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [livePrices.lastUpdated]);

  // Show live price update toast when price updates
  useEffect(() => {
    if (!notificationsEnabled || livePrices.updateCount <= 1) return;

    if (livePrices.flashStates.btc) {
      const type = livePrices.flashStates.btc;
      const arrow = type === 'up' ? '▲' : '▼';
      const changeStr = livePrices.btcChangeUSD
        ? ` (${type === 'up' ? '+' : ''}${formatUSD(livePrices.btcChangeUSD)})`
        : '';
      setActiveToast({
        message: `BTC/USD updated ${arrow} ${formatUSD(livePrices.btcPriceUSD)}${changeStr}`,
        type,
      });

      const timer = setTimeout(() => setActiveToast(null), 3500);
      return () => clearTimeout(timer);
    } else if (livePrices.flashStates.eth) {
      const type = livePrices.flashStates.eth;
      const arrow = type === 'up' ? '▲' : '▼';
      const changeStr = livePrices.ethChangeUSD
        ? ` (${type === 'up' ? '+' : ''}${formatUSD(livePrices.ethChangeUSD)})`
        : '';
      setActiveToast({
        message: `ETH/USD updated ${arrow} ${formatUSD(livePrices.ethPriceUSD)}${changeStr}`,
        type,
      });

      const timer = setTimeout(() => setActiveToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [
    livePrices.updateCount,
    livePrices.flashStates,
    notificationsEnabled,
    livePrices.btcPriceUSD,
    livePrices.ethPriceUSD,
    livePrices.btcChangeUSD,
    livePrices.ethChangeUSD,
  ]);

  return (
    <div className="w-full bg-slate-900/90 dark:bg-slate-950/90 text-white border-b border-border-subtle/40 backdrop-blur-md px-3 sm:px-6 py-1.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Status & Pulse Indicator */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-accent-emerald/10 border border-accent-emerald/30 text-accent-emerald">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-emerald"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide">Live Feed</span>
          </div>

          <span className="text-slate-400 hidden sm:inline text-[11px]">
            {livePrices.isUpdating ? (
              <span className="text-accent-blue font-medium animate-pulse">Syncing...</span>
            ) : (
              <span>Sync: {secondsAgo}s ago</span>
            )}
          </span>
        </div>

        {/* Center: Live Price Ticker Cards */}
        <div className="flex items-center space-x-3 sm:space-x-6 overflow-x-auto py-0.5 no-scrollbar">
          {/* BTC Price */}
          <div
            className={cn(
              'flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md border transition-colors duration-200 font-mono text-[11px]',
              livePrices.flashStates.btc === 'up'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : livePrices.flashStates.btc === 'down'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-200',
            )}
          >
            <span className="font-semibold text-slate-400">BTC</span>
            <span className="font-bold text-white">
              {livePrices.btcPriceUSD > 0 ? formatUSD(livePrices.btcPriceUSD) : '...'}
            </span>
            {livePrices.btcTrend === 'up' ? (
              <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : livePrices.btcTrend === 'down' ? (
              <TrendingDown className="w-3 h-3 text-rose-400 shrink-0" />
            ) : null}
          </div>

          {/* ETH Price */}
          <div
            className={cn(
              'flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md border transition-colors duration-200 font-mono text-[11px]',
              livePrices.flashStates.eth === 'up'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : livePrices.flashStates.eth === 'down'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-200',
            )}
          >
            <span className="font-semibold text-slate-400">ETH</span>
            <span className="font-bold text-white">
              {livePrices.ethPriceUSD > 0 ? formatUSD(livePrices.ethPriceUSD) : '...'}
            </span>
            {livePrices.ethTrend === 'up' ? (
              <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : livePrices.ethTrend === 'down' ? (
              <TrendingDown className="w-3 h-3 text-rose-400 shrink-0" />
            ) : null}
          </div>

          {/* USDC Price */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-slate-800/40 border border-slate-700/50 font-mono text-[11px] text-slate-300">
            <span className="font-semibold text-slate-400">USDC</span>
            <span className="font-bold text-white">$1.000</span>
          </div>
        </div>

        {/* Right: Actions & Notification Toggle */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={cn(
              'p-1 rounded-md transition-colors text-[10px] flex items-center space-x-1 border',
              notificationsEnabled
                ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                : 'bg-slate-800/40 border-slate-700 text-slate-500',
            )}
            title={notificationsEnabled ? 'Mute Price Update Alerts' : 'Enable Price Update Alerts'}
          >
            {notificationsEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            <span className="hidden lg:inline">
              {notificationsEnabled ? 'Alerts On' : 'Alerts Off'}
            </span>
          </button>

          <button
            onClick={() => livePrices.refetch()}
            disabled={livePrices.isUpdating}
            className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-300 transition-all disabled:opacity-50 cursor-pointer"
            title="Force Price Feed Refresh"
          >
            <RefreshCw
              className={cn('w-3 h-3 text-accent-blue', livePrices.isUpdating && 'animate-spin')}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Compact Toast Notification */}
      {activeToast && (
        <div className="fixed top-20 right-4 z-50 pointer-events-none max-w-xs sm:max-w-sm">
          <div
            role="alert"
            aria-live="polite"
            className={cn(
              'flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono shadow-md backdrop-blur-md transition-all',
              activeToast.type === 'up'
                ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900/95 border-rose-500/40 text-rose-400',
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-[11px]">{activeToast.message}</span>
            </div>
            <CheckCircle2 className="w-3 h-3 opacity-60 shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
}
