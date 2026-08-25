'use client';

import React, { useState, useMemo } from 'react';
import { useHistoricalNAV, useTransactionHistory } from '../../hooks/useIndexerData';
import { useAccount } from 'wagmi';
import {
  Activity,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { NavSnapshot } from '../../types';
import { formatUnits } from '../../lib/math';

type PeriodOption = '1D' | '7D' | '30D' | '90D' | 'ALL';
const PERIODS: PeriodOption[] = ['1D', '7D', '30D', '90D', 'ALL'];

function formatAxisDate(timestampStr: string): string {
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return timestampStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    // For today/intraday: show time (e.g. "14:00")
    if (isToday) {
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
    
    // For multi-day: show "Aug 24"
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return timestampStr;
  }
}

function formatTooltipDate(timestampStr: string): string {
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return timestampStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return timestampStr;
  }
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: NavSnapshot }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  if (!data) return null;

  return (
    <div className="bg-black/95 dark:bg-card/95 border-2 border-black dark:border-white/20 p-3.5 rounded-2xl shadow-[4px_4px_0_#BFFF00] text-xs space-y-2.5 min-w-[230px] backdrop-blur-md">
      <div className="border-b border-white/10 pb-1.5 flex items-center justify-between">
        <span className="font-mono text-[11px] font-bold text-white/70">
          {formatTooltipDate(data.timestamp)}
        </span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#BFFF00] text-black">
          UVBE NAV
        </span>
      </div>

      <div className="space-y-1.5 font-mono">
        <div className="flex justify-between items-center bg-white/5 p-1.5 rounded-lg">
          <span className="text-white/60 font-medium">UV Token Price:</span>
          <span className="font-black text-[#BFFF00] text-sm">
            ${Number(data.nav || data.sharePrice || 1.0).toFixed(4)}
          </span>
        </div>

        <div className="flex justify-between items-center text-white/80 px-1">
          <span className="text-white/50">BTC Oracle:</span>
          <span className="font-bold text-amber-400">
            $
            {Number(data.btcPrice || 78363.88).toLocaleString('en-US', {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex justify-between items-center text-white/80 px-1">
          <span className="text-white/50">ETH Oracle:</span>
          <span className="font-bold text-blue-400">
            $
            {Number(data.ethPrice || 2487.05).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between items-center text-white/80 px-1">
          <span className="text-white/50">Vault Collateral:</span>
          <span className="font-semibold text-emerald-400">
            $
            {Number(data.totalAssets || 2.28).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function HistoricalNavChart() {
  const [period, setPeriod] = useState<PeriodOption>('ALL');
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const { address: userAddress } = useAccount();
  const { navHistory, isLoading: isLoadingNav } = useHistoricalNAV(period);
  const { transactions } = useTransactionHistory();

  const latestPoint = navHistory[navHistory.length - 1];
  const firstPoint = navHistory[0];
  const currentPrice = latestPoint
    ? Number(latestPoint.nav || latestPoint.sharePrice || 1.0)
    : 1.022;
  const startPrice = firstPoint ? Number(firstPoint.nav || firstPoint.sharePrice || 1.0) : 1.0;
  const growthPct =
    startPrice > 0 ? (((currentPrice - startPrice) / startPrice) * 100).toFixed(2) : '0.00';
  const isPositive = Number(growthPct) >= 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-card border-2 border-black dark:border-white/15 p-4 sm:p-6 shadow-[5px_5px_0_rgba(0,0,0,0.85)] space-y-4">
      {/* ── Top Chart Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-black dark:border-white/10">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-[#BFFF00] text-black border border-black shadow-[1px_1px_0_#000]">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight">
              UV Price Progression & Activity
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Real-time on-chain Net Asset Value (NAV) indexed to 60% cbBTC + 40% WETH reserve.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-black rounded-xl border border-black dark:border-white/15">
            {PERIODS.map((p) => {
              const isActive = period === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 text-[10px] font-black font-mono rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#BFFF00] text-black shadow-[1px_1px_0_#000]'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Mini Live Metrics Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-border">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold">
            Live UV NAV
          </span>
          <span className="text-sm sm:text-base font-black text-foreground">
            ${currentPrice.toFixed(4)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-border">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold">
            Period Growth
          </span>
          <span
            className={`text-sm sm:text-base font-black flex items-center gap-1 ${
              isPositive ? 'text-[#5f8f00] dark:text-[#BFFF00]' : 'text-rose-500'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />+{growthPct}%
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-border">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold">
            BTC Oracle Feed
          </span>
          <span className="text-sm sm:text-base font-black text-amber-500">
            $
            {latestPoint?.btcPrice
              ? Number(latestPoint.btcPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })
              : '78,363'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-border">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-bold">
            ETH Oracle Feed
          </span>
          <span className="text-sm sm:text-base font-black text-blue-500">
            $
            {latestPoint?.ethPrice
              ? Number(latestPoint.ethPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })
              : '2,487'}
          </span>
        </div>
      </div>

      {/* ── High-Impact Glowing Area Chart ── */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={navHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="neonLimeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#BFFF00" stopOpacity={0.45} />
                <stop offset="60%" stopColor="#BFFF00" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#BFFF00" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
            <XAxis
              dataKey="timestamp"
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              tickFormatter={formatAxisDate}
            />
            <YAxis
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              domain={['dataMin - 0.003', 'dataMax + 0.003']}
              tickFormatter={(val) => `$${Number(val || 0).toFixed(3)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="nav"
              stroke="#BFFF00"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#neonLimeGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
