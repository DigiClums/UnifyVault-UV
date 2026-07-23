'use client';

import * as React from 'react';

interface AllocationItem {
  symbol: string;
  name: string;
  percentage: number;
  valueUSD: string;
  color: string;
}

interface AllocationChartProps {
  items?: AllocationItem[];
}

export function AllocationChart({ items }: AllocationChartProps) {
  const defaultItems: AllocationItem[] = [
    {
      symbol: 'cbBTC',
      name: 'Coinbase Wrapped BTC',
      percentage: 60,
      valueUSD: '$600,000.00',
      color: '#F59E0B',
    },
    {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      percentage: 40,
      valueUSD: '$400,000.00',
      color: '#6366F1',
    },
  ];

  const chartData = items || defaultItems;

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-6 backdrop-blur-md">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center justify-between">
        <span>Portfolio Strategy Allocation</span>
        <span className="text-xs text-blue-400 font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
          Target 10,000 BPS
        </span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* SVG Donut Visual */}
        <div className="relative flex items-center justify-center h-48 w-48 mx-auto">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
            <circle cx="50" cy="50" r="40" stroke="#1F2937" strokeWidth="12" fill="transparent" />
            {/* Segment 1: cbBTC (60%) */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#F59E0B"
              strokeWidth="12"
              strokeDasharray="150.8 251.3"
              strokeDashoffset="0"
              fill="transparent"
              className="transition-all duration-500 ease-out"
            />
            {/* Segment 2: WETH (40%) */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#6366F1"
              strokeWidth="12"
              strokeDasharray="100.5 251.3"
              strokeDashoffset="-150.8"
              fill="transparent"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-gray-400 font-medium">Allocation</span>
            <span className="text-xl font-extrabold text-white font-mono">100%</span>
          </div>
        </div>

        {/* Legend & Breakdown */}
        <div className="space-y-4">
          {chartData.map((item) => (
            <div
              key={item.symbol}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-800/80"
            >
              <div className="flex items-center gap-3">
                <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: item.color }} />
                <div>
                  <span className="font-bold text-white text-sm block">{item.symbol}</span>
                  <span className="text-xs text-gray-400">{item.name}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-white text-sm block">
                  {item.percentage}%
                </span>
                <span className="text-xs text-gray-400 font-mono">{item.valueUSD}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
