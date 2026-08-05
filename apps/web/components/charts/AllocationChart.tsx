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

const DEFAULT_COLORS = ['#F59E0B', '#6366F1', '#22C55E'];

// Circumference of circle r=40: 2 * PI * 40 ≈ 251.33
const CIRCUMFERENCE = 251.33;

export function AllocationChart({ items }: AllocationChartProps) {
  // NO FALLBACK: always derive from on-chain data. Show skeleton when empty.
  const hasItems = items && items.length > 0;
  const chartData: AllocationItem[] = items || [];

  // Precompute SVG stroke-dasharray segments from live weights
  const segments = React.useMemo(() => {
    if (!hasItems) return [];
    const total = chartData.reduce((sum, item) => sum + item.percentage, 0) || 100;
    let accumulated = 0;
    return chartData.map((item) => {
      const pct = item.percentage / total;
      const dashLength = CIRCUMFERENCE * pct;
      const dashOffset = -accumulated;
      accumulated += dashLength;
      return { dashLength, dashOffset, color: item.color };
    });
  }, [chartData, hasItems]);

  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm dark:shadow-none">
      <h3 className="text-lg font-bold text-foreground mb-6 flex items-center justify-between">
        <span>Portfolio Strategy Allocation</span>
        <span className="text-xs text-primary font-semibold px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
          Target 10,000 BPS
        </span>
      </h3>

      {!hasItems ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Loading strategy weights from chain...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* SVG Donut Visual — dynamically rendered from live weights */}
          <div className="relative flex items-center justify-center h-48 w-48 mx-auto">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                className="text-muted/80"
                strokeWidth="12"
                fill="transparent"
              />
              {segments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={seg.color}
                  strokeWidth="12"
                  strokeDasharray={`${seg.dashLength} ${CIRCUMFERENCE}`}
                  strokeDashoffset={seg.dashOffset}
                  fill="transparent"
                  className="transition-all duration-500 ease-out"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-muted-foreground font-medium">Allocation</span>
              <span className="text-xl font-extrabold text-foreground font-mono">100%</span>
            </div>
          </div>

          {/* Legend & Breakdown */}
          <div className="space-y-4">
            {chartData.map((item, idx) => (
              <div
                key={item.symbol}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50 dark:bg-gray-900/50 border border-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3.5 w-3.5 rounded-full"
                    style={{
                      backgroundColor: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                    }}
                  />
                  <div>
                    <span className="font-bold text-foreground text-sm block">{item.symbol}</span>
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-foreground text-sm block">
                    {item.percentage}%
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{item.valueUSD}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
