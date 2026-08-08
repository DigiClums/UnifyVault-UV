'use client';

import React from 'react';
import { ChartCard } from '../ui/ChartCard';
import { PieChart as PieIcon, ShieldCheck } from 'lucide-react';
import { DashboardMetrics } from '../../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AllocationChartProps {
  metrics: DashboardMetrics;
}

const COLORS = ['#F7931A', '#627EEA'];

export function AllocationChart({ metrics }: AllocationChartProps) {
  const btcPctStr = metrics.btcAllocationPercent?.replace('%', '') ?? '';
  const ethPctStr = metrics.ethAllocationPercent?.replace('%', '') ?? '';
  const btcVal = parseFloat(btcPctStr) || 60.0;
  const ethVal = parseFloat(ethPctStr) || 40.0;

  const data = [
    { name: 'BTC Target', value: btcVal },
    { name: 'ETH Target', value: ethVal },
  ];

  return (
    <ChartCard
      title="Strategy Allocation"
      subtitle={`Target Ratio: ${btcVal.toFixed(0)}% BTC / ${ethVal.toFixed(0)}% ETH`}
      icon={PieIcon}
    >
      {metrics.isLoading ? (
        <div className="h-32 w-full flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-2 border-slate-700 border-t-accent-blue animate-spin" />
        </div>
      ) : (
        <div className="h-36 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={54}
                paddingAngle={3}
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
            <span className="text-xs font-bold text-white font-mono">
              {btcVal.toFixed(0)}/{ethVal.toFixed(0)}
            </span>
            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
              Target
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3 pt-1 text-xs">
        {/* Allocation breakdown */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-semibold text-slate-200">BTC (cbBTC)</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Target:{' '}
              <span className="text-amber-400 font-bold">
                {metrics.btcAllocationPercent ?? '60.0%'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="font-semibold text-slate-200">ETH (WETH)</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Target:{' '}
              <span className="text-indigo-400 font-bold">
                {metrics.ethAllocationPercent ?? '40.0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Custody Safeguard info */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Custody Vault Allocation</span>
          </div>
          <span className="text-emerald-400 font-semibold font-mono">Target Enforced</span>
        </div>
      </div>
    </ChartCard>
  );
}
