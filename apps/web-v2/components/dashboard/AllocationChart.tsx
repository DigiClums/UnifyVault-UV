'use client';

import React from 'react';
import { PieChart as PieIcon } from 'lucide-react';
import { DashboardMetrics } from '../../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AllocationChartProps {
  metrics: DashboardMetrics;
}

const COLORS = ['#F59E0B', '#3B82F6'];

export function AllocationChart({ metrics }: AllocationChartProps) {
  const btcPctStr = metrics.btcAllocationPercent?.replace('%', '') ?? '';
  const ethPctStr = metrics.ethAllocationPercent?.replace('%', '') ?? '';
  const btcVal = parseFloat(btcPctStr) || 60.0;
  const ethVal = parseFloat(ethPctStr) || 40.0;

  const data = [
    { name: 'BTC', value: btcVal },
    { name: 'ETH', value: ethVal },
  ];

  return (
    <div className="rounded-xl bg-card border border-border-subtle px-3.5 py-3 sm:px-4 sm:py-3.5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-1.5">
          <PieIcon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Allocation
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          Target: {btcVal.toFixed(0)}% BTC / {ethVal.toFixed(0)}% ETH
        </span>
      </div>

      {metrics.isLoading ? (
        <div className="h-16 w-full flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-muted-foreground border-t-accent-blue animate-spin" />
        </div>
      ) : (
        <>
          {/* Desktop: Donut chart + bars. Mobile: bars only */}
          <div className="flex items-center gap-3">
            {/* Donut — hidden on mobile */}
            <div className="hidden sm:block relative w-[88px] h-[88px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={40}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] font-bold text-foreground font-mono leading-tight">
                  {btcVal.toFixed(0)}/{ethVal.toFixed(0)}
                </span>
                <span className="text-[8px] text-muted-foreground font-semibold uppercase">
                  Ratio
                </span>
              </div>
            </div>

            {/* Progress bars */}
            <div className="flex-1 space-y-2.5 min-w-0">
              {/* BTC */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-foreground">BTC</span>
                    <span className="text-[10px] text-muted-foreground">cbBTC</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {metrics.btcAllocationPercent ?? '...'}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${btcVal}%` }}
                  />
                </div>
              </div>

              {/* ETH */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-foreground">ETH</span>
                    <span className="text-[10px] text-muted-foreground">WETH</span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {metrics.ethAllocationPercent ?? '...'}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${ethVal}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer: target info */}
          <div className="flex items-center justify-end mt-1.5 pt-1.5 border-t border-border-subtle">
            <span className="text-[9px] text-muted-foreground font-mono">
              {btcVal.toFixed(0)}/{ethVal.toFixed(0)} BTC/ETH
            </span>
          </div>
        </>
      )}
    </div>
  );
}
