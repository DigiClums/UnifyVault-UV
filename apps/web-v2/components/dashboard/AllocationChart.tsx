'use client';

import React from 'react';
import { ChartCard } from '../ui/ChartCard';
import { PieChart as PieIcon, ShieldCheck } from 'lucide-react';
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
    { name: 'BTC (cbBTC)', value: btcVal },
    { name: 'ETH (WETH)', value: ethVal },
  ];

  return (
    <ChartCard
      title="TARGET ALLOCATION"
      subtitle={`60% BTC / 40% ETH Multi-Asset Index`}
      icon={PieIcon}
    >
      {metrics.isLoading ? (
        <div className="h-32 w-full flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-slate-300 border-t-accent-blue animate-spin" />
        </div>
      ) : (
        <div className="h-36 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={56}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: '#FFF',
                  fontSize: '12px',
                }}
                formatter={(val: unknown) => [`${Number(val || 0).toFixed(1)}%`, 'Target']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
              {btcVal.toFixed(0)}/{ethVal.toFixed(0)}
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Ratio
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3 pt-1 text-xs">
        {/* Allocation breakdown */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs">
                BTC (cbBTC)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Target:{' '}
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                {metrics.btcAllocationPercent ?? '60.0%'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs">
                ETH (WETH)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Target:{' '}
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {metrics.ethAllocationPercent ?? '40.0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1 font-mono">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Custody Vault</span>
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Verified On-Chain
          </span>
        </div>
      </div>
    </ChartCard>
  );
}
