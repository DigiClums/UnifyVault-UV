'use client';

import React, { useState } from 'react';
import { ChartCard } from '../ui/ChartCard';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { useHistoricalNAV } from '../../hooks/useIndexerData';
import { Activity, History } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { NavSnapshot } from '../../types';

type PeriodOption = '1D' | '7D' | '30D' | '90D' | 'ALL';

const PERIODS: PeriodOption[] = ['1D', '7D', '30D', '90D', 'ALL'];

function formatAxisDate(timestampStr: string): string {
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return timestampStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
      second: '2-digit',
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
    <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
      <div className="border-b border-slate-800 pb-1.5 font-semibold text-slate-300">
        {formatTooltipDate(data.timestamp)}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center text-slate-200">
          <span className="text-cyan-400 font-medium">NAV Value:</span>
          <span className="font-bold text-white">
            ${Number(data.nav || data.sharePrice || 0).toFixed(4)}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Total Assets:</span>
          <span className="font-semibold text-slate-200">
            $
            {Number(data.totalAssets || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">BTC Price:</span>
          <span className="font-medium text-amber-400">
            $
            {Number(data.btcPrice || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">ETH Price:</span>
          <span className="font-medium text-blue-400">
            $
            {Number(data.ethPrice || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function HistoricalNavChart() {
  const [period, setPeriod] = useState<PeriodOption>('ALL');
  const { navHistory, isLoading } = useHistoricalNAV(period);

  const periodSelector = (
    <div className="flex items-center space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
      {PERIODS.map((p) => {
        const isActive = period === p;
        return (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              isActive
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );

  return (
    <ChartCard
      title="Historical Net Asset Value (NAV) Progression"
      subtitle="On-chain valuation tracking per index share ($/Share)"
      icon={Activity}
      action={periodSelector}
    >
      {isLoading ? (
        <div className="h-64 w-full pt-2 flex items-center justify-center">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      ) : !navHistory || navHistory.length < 2 ? (
        <EmptyState
          title="Collecting NAV history..."
          description="At least 2 historical NAV snapshots are required to display progression trajectory."
          icon={History}
        />
      ) : (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={navHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioNavGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                dataKey="timestamp"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                tickFormatter={formatAxisDate}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                domain={['dataMin - 0.002', 'dataMax + 0.002']}
                tickFormatter={(val) => `$${Number(val || 0).toFixed(3)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="nav"
                stroke="#06B6D4"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#portfolioNavGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
