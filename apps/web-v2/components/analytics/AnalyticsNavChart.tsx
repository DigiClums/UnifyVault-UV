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

  return (
    <div className="bg-card border border-border-subtle p-2.5 rounded-lg shadow-xl backdrop-blur-md text-[11px] space-y-1.5 min-w-[190px]">
      <div className="border-b border-border-subtle pb-1 font-semibold text-foreground">
        {formatTooltipDate(data.timestamp)}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[#5f8f00] dark:text-[#BFFF00] font-medium">UVBE Price:</span>
          <span className="font-bold text-foreground font-mono">
            ${Number(data.nav || data.sharePrice || 0).toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Assets:</span>
          <span className="font-semibold font-mono">
            $
            {Number(data.totalAssets || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
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
    <div className="h-48 sm:h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={navHistory} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="analyticsNavGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#BFFF00" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#BFFF00" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.6} />
          <XAxis
            dataKey="timestamp"
            stroke="#64748B"
            fontSize={10}
            tickLine={false}
            tickFormatter={formatAxisDate}
          />
          <YAxis
            stroke="#64748B"
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
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#analyticsNavGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
