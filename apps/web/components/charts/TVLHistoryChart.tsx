'use client';

import * as React from 'react';
import { Timeframe } from './NAVHistoryChart';

export function TVLHistoryChart() {
  const [timeframe, setTimeframe] = React.useState<Timeframe>('7D');

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-6 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Total Value Locked (TVL) History
          </span>
          <h3 className="text-2xl font-extrabold text-white font-mono mt-1">$1,000,000.00 USD</h3>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
          {(['24H', '7D', '30D', 'ALL'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeframe === tf
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* TVL Area Chart Visual */}
      <div className="relative h-48 w-full">
        <svg viewBox="0 0 500 150" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area */}
          <polygon
            fill="url(#tvlGradient)"
            points="0,140 0,120 100,105 200,90 300,70 400,45 500,25 500,140"
          />

          {/* Line */}
          <path
            d="M 0,120 L 100,105 L 200,90 L 300,70 L 400,45 L 500,25"
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <circle cx="500" cy="25" r="4" fill="#34D399" />
        </svg>
      </div>
    </div>
  );
}
