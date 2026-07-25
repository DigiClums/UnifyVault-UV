'use client';

import * as React from 'react';

interface TreasuryGrowthChartProps {
  treasuryTotalFormatted?: string;
}

export function TreasuryGrowthChart({
  treasuryTotalFormatted = '$0.00',
}: TreasuryGrowthChartProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Protocol Treasury Fee Revenue
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
              Historical data not yet available
            </span>
          </div>
          <h3 className="text-2xl font-extrabold text-foreground font-mono mt-1">
            {treasuryTotalFormatted} USD
          </h3>
        </div>

        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono">
          0.25% Protocol Share
        </span>
      </div>

      <div className="relative h-44 w-full overflow-hidden">
        <svg viewBox="0 0 500 150" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="treasuryGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <polygon
            fill="url(#treasuryGradient)"
            points="0,140 0,130 100,115 200,95 300,75 400,50 500,30 500,140"
          />

          <path
            d="M 0,130 L 100,115 L 200,95 L 300,75 L 400,50 L 500,30"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <circle cx="500" cy="30" r="4" fill="#A78BFA" />
        </svg>
      </div>

      <div className="mt-3 text-xs text-muted-foreground text-center font-mono">
        Accumulated protocol fees stored safely in UnifyVault Treasury contract.
      </div>
    </div>
  );
}
