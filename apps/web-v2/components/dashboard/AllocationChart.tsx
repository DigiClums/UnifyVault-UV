'use client';

import React from 'react';
import { ChartCard } from '../ui/ChartCard';
import { PieChart as PieIcon, ShieldCheck } from 'lucide-react';
import { DashboardMetrics } from '../../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AllocationChartProps {
  metrics: DashboardMetrics;
}

const COLORS = ['#F7931A', '#627EEA', '#2775CA'];

export function AllocationChart({ metrics }: AllocationChartProps) {
  const btcVal = parseFloat(metrics.btcAllocationPercent.replace('%', '')) || 50.0;
  const ethVal = parseFloat(metrics.ethAllocationPercent.replace('%', '')) || 50.0;

  const data = [
    { name: 'BTC', value: btcVal },
    { name: 'ETH', value: ethVal },
  ];

  return (
    <ChartCard
      title="Asset Weights & Strategy"
      subtitle="50% BTC / 50% ETH Index Target Ratio"
      icon={PieIcon}
    >
      <div className="h-44 w-full relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
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
                borderRadius: '12px',
                color: '#FFF',
              }}
              formatter={(val: unknown) => [`${Number(val || 0).toFixed(1)}%`, 'Weight']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs font-extrabold text-white">100%</span>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            Allocated
          </span>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        {/* BTC Bar */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
            <span className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Wrapped Bitcoin (cbBTC)</span>
            </span>
            <span className="font-mono text-amber-400">{metrics.btcAllocationPercent}</span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-500 shadow-glow"
              style={{ width: metrics.btcAllocationPercent }}
            />
          </div>
        </div>

        {/* ETH Bar */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
            <span className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <span>Wrapped Ether (WETH)</span>
            </span>
            <span className="font-mono text-indigo-400">{metrics.ethAllocationPercent}</span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-400 h-full rounded-full transition-all duration-500 shadow-glow"
              style={{ width: metrics.ethAllocationPercent }}
            />
          </div>
        </div>

        {/* Security badge */}
        <div className="pt-2 flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-border-subtle">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Custody Vault Safeguard</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold">Verified Stateless</span>
        </div>
      </div>
    </ChartCard>
  );
}
