'use client';

import React from 'react';
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

function formatAxisDate(timestampStr: string): string {
  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) return timestampStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
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
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestampStr;
  }
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: NavSnapshot }>;
}

function ChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  if (!data) return null;

  const currentNav = Number(data.nav || data.sharePrice || 1.0);
  const btcVal = Number(data.btcPrice || 78363.88);
  const ethVal = Number(data.ethPrice || 2487.05);

  return (
    <div className="bg-[#0c0e14]/95 border-2 border-black dark:border-white/20 p-3.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(191,255,0,0.15)] text-xs space-y-2.5 min-w-[210px] backdrop-blur-xl font-mono text-white">
      <div className="border-b border-white/10 pb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-bold text-white/60">
          {formatTooltipDate(data.timestamp)}
        </span>
        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#BFFF00] text-black">
          UVBE NAV
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center bg-white/[0.06] p-1.5 rounded-xl border border-white/10">
          <span className="text-white/60 font-medium text-[11px]">Price:</span>
          <span className="font-black text-[#BFFF00] text-sm">${currentNav.toFixed(4)}</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-0.5">
          <div className="bg-white/[0.03] p-1.5 rounded-lg border border-white/5 space-y-0.5">
            <span className="text-white/40 block text-[8px] uppercase font-bold">cbBTC</span>
            <span className="font-bold text-amber-400">
              ${btcVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="bg-white/[0.03] p-1.5 rounded-lg border border-white/5 space-y-0.5">
            <span className="text-white/40 block text-[8px] uppercase font-bold">WETH</span>
            <span className="font-bold text-blue-400">
              ${ethVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface AnalyticsNavChartProps {
  navHistory: NavSnapshot[];
}

/**
 * Phase E1: Isolated Analytics AreaChart Component
 * Lazy-loaded via next/dynamic to eliminate Recharts from the initial /analytics bundle.
 */
export function AnalyticsNavChart({ navHistory }: AnalyticsNavChartProps) {
  return (
    <div className="h-56 sm:h-64 w-full pt-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={navHistory} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="analyticsNavGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#BFFF00" stopOpacity={0.4} />
              <stop offset="55%" stopColor="#BFFF00" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#BFFF00" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.12} />
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
            domain={['dataMin - 0.002', 'dataMax + 0.002']}
            tickFormatter={(val) => `$${Number(val || 0).toFixed(3)}`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="nav"
            stroke="#BFFF00"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#analyticsNavGrad)"
            activeDot={{
              r: 5,
              fill: '#BFFF00',
              stroke: '#000',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
