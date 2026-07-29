'use client';

import React from 'react';
import { ChartCard } from '../ui/ChartCard';
import { EmptyState } from '../ui/EmptyState';
import { usePortfolio } from '../../hooks/usePortfolio';
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

export function HistoricalNavChart() {
  const { historicalNAV } = usePortfolio();

  return (
    <ChartCard
      title="Historical Net Asset Value (NAV) Progression"
      subtitle="On-chain valuation tracking per index share ($/Share)"
      icon={Activity}
    >
      {historicalNAV && historicalNAV.length > 0 ? (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalNAV}>
              <defs>
                <linearGradient id="portfolioNavGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="timestamp" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                domain={['dataMin - 0.002', 'dataMax + 0.002']}
                tickFormatter={(val) => `$${val.toFixed(3)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#FFF',
                }}
                formatter={(val: unknown) => [`$${Number(val || 0).toFixed(4)}`, 'NAV/Share']}
              />
              <Area
                type="monotone"
                dataKey="navUSD"
                stroke="#06B6D4"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#portfolioNavGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState
          title="Historical Indexer Integration Required"
          description="Historical NAV trajectory curves require an off-chain indexer to track block-by-block price history."
          icon={History}
        />
      )}
    </ChartCard>
  );
}
