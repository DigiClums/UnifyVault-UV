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
    <div className="h-full rounded-2xl bg-card border-2 border-black dark:border-white/15 p-4 sm:p-5 shadow-[4px_4px_0_rgba(0,0,0,0.85)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b-2 border-black dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-black text-[#5f8f00] dark:text-[#BFFF00] border-2 border-black dark:border-white/15">
            <PieIcon className="w-4 h-4" />
          </div>

          <div>
            <h3 className="text-sm font-black text-foreground tracking-tight">Allocation</h3>
            <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
              Portfolio exposure
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="block text-[8px] uppercase tracking-wider text-muted-foreground font-bold">
            Target
          </span>
          <span className="text-[10px] font-black font-mono text-foreground">
            {btcVal.toFixed(0)}/{ethVal.toFixed(0)}
          </span>
        </div>
      </div>

      {metrics.isLoading ? (
        <div className="min-h-[150px] flex items-center justify-center">
          <div className="w-9 h-9 rounded-full border-2 border-black dark:border-white/30 border-t-[#BFFF00] animate-spin" />
        </div>
      ) : (
        <div className="pt-2">
          {/* Chart + allocation details */}
          <div className="flex items-center gap-3">
            <div className="relative w-[104px] h-[104px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={47}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-black text-foreground font-mono">
                  {btcVal.toFixed(0)}/{ethVal.toFixed(0)}
                </span>
                <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider">
                  BTC / ETH
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              {/* BTC */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-xs font-black text-foreground">BTC</span>
                    <span className="text-[9px] text-muted-foreground">cbBTC</span>
                  </div>

                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                    {metrics.btcAllocationPercent ?? '...'}
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden border border-black/10 dark:border-white/10">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${btcVal}%` }}
                  />
                </div>
              </div>

              {/* ETH */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-xs font-black text-foreground">ETH</span>
                    <span className="text-[9px] text-muted-foreground">WETH</span>
                  </div>

                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                    {metrics.ethAllocationPercent ?? '...'}
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden border border-black/10 dark:border-white/10">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${ethVal}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-2.5 pt-2 border-t-2 border-black dark:border-white/10 flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground font-mono">
              Live portfolio allocation
            </span>

            <span className="text-[9px] font-black font-mono text-[#5f8f00] dark:text-[#BFFF00]">
              {btcVal.toFixed(0)}% BTC
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
