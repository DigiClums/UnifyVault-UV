'use client';

import * as React from 'react';

export type Timeframe = '24H' | '7D' | '30D' | 'ALL';

interface NAVHistoryChartProps {
  currentNAV?: string;
}

export function NAVHistoryChart({ currentNAV = '$1.0000' }: NAVHistoryChartProps) {
  const [timeframe, setTimeframe] = React.useState<Timeframe>('7D');

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-6 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            NAV Per Share (Live Oracle Feed)
          </span>
          <h3 className="text-2xl font-extrabold text-white font-mono mt-1">{currentNAV} USD</h3>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
          {(['24H', '7D', '30D', 'ALL'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                timeframe === tf
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Area Chart Visual */}
      <div className="relative h-48 w-full overflow-hidden">
        <svg viewBox="0 0 500 150" className="h-full w-full overflow-hidden">
          <defs>
            <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area */}
          <polygon
            fill="url(#navGradient)"
            points="0,140 0,90 100,85 200,80 300,75 400,70 500,65 500,140"
          />

          {/* Path Line */}
          <path
            d="M 0,90 L 100,85 L 200,80 L 300,75 L 400,70 L 500,65"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Glowing Target Dot */}
          <circle cx="500" cy="65" r="5" fill="#3B82F6" className="animate-ping opacity-75" />
          <circle cx="500" cy="65" r="4" fill="#60A5FA" />
        </svg>

        <div className="flex items-center justify-between text-xs text-gray-500 mt-2 font-mono">
          <span>Target Valuation</span>
          <span>Live Oracle NAV ({timeframe})</span>
        </div>
      </div>
    </div>
  );
}
