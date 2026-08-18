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
    <div className="w-full overflow-hidden bg-slate-100/90 dark:bg-slate-950/90 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800/60 backdrop-blur-md px-2 sm:px-4 lg:px-6 py-1 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2 text-xs overflow-x-auto no-scrollbar">
        {/* Left: Status & Pulse Indicator */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <div className="flex items-center space-x-1 sm:space-x-1.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide">
              Live
            </span>
          </div>

          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline text-[11px]">
            {livePrices.isUpdating ? (
              <span className="text-[#5f8f00] dark:text-[#BFFF00] font-medium animate-pulse">
                Syncing...
              </span>
            ) : (
              <span>Sync: {secondsAgo}s ago</span>
            )}
          </span>
        </div>

        {/* Center: Live Price Badges with Flash Indicators */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 font-mono text-[11px] shrink-0">
          {/* BTC Price Badge */}
          <div
            className={cn(
              'flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border transition-all duration-300 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs',
              livePrices.flashStates.btc === 'up' &&
                'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 scale-[1.02]',
              livePrices.flashStates.btc === 'down' &&
                'border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-400 scale-[1.02]',
            )}
          >
            <span className="font-bold text-[#5f8f00] dark:text-[#BFFF00]">BTC</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatUSD(livePrices.btcPriceUSD)}
            </span>
            {livePrices.flashStates.btc === 'up' && (
              <TrendingUp className="w-3 h-3 text-emerald-500 animate-bounce" />
            )}
            {livePrices.flashStates.btc === 'down' && (
              <TrendingDown className="w-3 h-3 text-rose-500 animate-bounce" />
            )}
          </div>

          {/* ETH Price Badge */}
          <div
            className={cn(
              'flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border transition-all duration-300 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs',
              livePrices.flashStates.eth === 'up' &&
                'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 scale-[1.02]',
              livePrices.flashStates.eth === 'down' &&
                'border-rose-500/60 bg-rose-500/10 text-rose-700 dark:text-rose-400 scale-[1.02]',
            )}
          >
            <span className="font-bold text-slate-700 dark:text-slate-300">ETH</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatUSD(livePrices.ethPriceUSD)}
            </span>
            {livePrices.flashStates.eth === 'up' && (
              <TrendingUp className="w-3 h-3 text-emerald-500 animate-bounce" />
            )}
            {livePrices.flashStates.eth === 'down' && (
              <TrendingDown className="w-3 h-3 text-rose-500 animate-bounce" />
            )}
          </div>

          {/* USDC Peg Badge */}
          <div className="flex items-center space-x-1 px-2 py-0.5 sm:py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hidden md:flex">
            <span className="font-bold text-muted-foreground">USDC</span>
            <span className="font-semibold">$1.00</span>
          </div>
        </div>

        {/* Right: Actions & Notification Toggle */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={cn(
              'p-1 sm:px-2 sm:py-0.5 rounded-md transition-colors text-[10px] flex items-center space-x-1 border min-h-[28px] min-w-[28px] justify-center cursor-pointer',
              notificationsEnabled
                ? 'bg-[#BFFF00]/10 border-[#BFFF00]/30 text-[#5f8f00] dark:text-[#BFFF00]'
                : 'bg-slate-800/40 border-slate-700 text-slate-500',
            )}
            title={notificationsEnabled ? 'Mute Price Update Alerts' : 'Enable Price Update Alerts'}
            aria-label={
              notificationsEnabled ? 'Mute Price Update Alerts' : 'Enable Price Update Alerts'
            }
          >
            {notificationsEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            <span className="hidden lg:inline">
              {notificationsEnabled ? 'Alerts On' : 'Alerts Off'}
            </span>
          </button>

          <button
            onClick={() => livePrices.refetch()}
            disabled={livePrices.isUpdating}
            className="flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-medium text-slate-300 transition-all disabled:opacity-50 cursor-pointer min-h-[28px] min-w-[28px] justify-center"
            title="Force Price Feed Refresh"
            aria-label="Force Price Feed Refresh"
          >
            <RefreshCw
              className={cn(
                'w-3 h-3 text-[#5f8f00] dark:text-[#BFFF00]',
                livePrices.isUpdating && 'animate-spin',
              )}
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
