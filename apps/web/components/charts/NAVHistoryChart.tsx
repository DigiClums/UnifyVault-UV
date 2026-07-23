'use client';

import * as React from 'react';

export type Timeframe = '24H' | '7D' | '30D' | 'ALL';

interface NAVPoint {
  timestamp: string;
  nav: number;
}

export function NAVHistoryChart() {
  const [timeframe, setTimeframe] = React.useState<Timeframe>('7D');

  const mockData: Record<Timeframe, NAVPoint[]> = {
    '24H': [
      { timestamp: '00:00', nav: 1.0 },
      { timestamp: '04:00', nav: 1.002 },
      { timestamp: '08:00', nav: 1.005 },
      { timestamp: '12:00', nav: 1.003 },
      { timestamp: '16:00', nav: 1.008 },
      { timestamp: '20:00', nav: 1.01 },
      { timestamp: '24:00', nav: 1.012 },
    ],
    '7D': [
      { timestamp: 'Day 1', nav: 1.0 },
      { timestamp: 'Day 2', nav: 1.004 },
      { timestamp: 'Day 3', nav: 1.008 },
      { timestamp: 'Day 4', nav: 1.005 },
      { timestamp: 'Day 5', nav: 1.012 },
      { timestamp: 'Day 6', nav: 1.018 },
      { timestamp: 'Day 7', nav: 1.025 },
    ],
    '30D': [
      { timestamp: 'Week 1', nav: 1.0 },
      { timestamp: 'Week 2', nav: 1.015 },
      { timestamp: 'Week 3', nav: 1.028 },
      { timestamp: 'Week 4', nav: 1.045 },
    ],
    ALL: [
      { timestamp: 'Genesis', nav: 1.0 },
      { timestamp: 'Month 1', nav: 1.025 },
      { timestamp: 'Month 2', nav: 1.05 },
      { timestamp: 'Current', nav: 1.082 },
    ],
  };

  const points = mockData[timeframe];
  const currentNAV = points[points.length - 1].nav.toFixed(4);

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-6 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            NAV Per Share History
          </span>
          <h3 className="text-2xl font-extrabold text-white font-mono mt-1">${currentNAV} USD</h3>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
          {(['24H', '7D', '30D', 'ALL'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
      <div className="relative h-48 w-full">
        <svg viewBox="0 0 500 150" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area */}
          <polygon
            fill="url(#navGradient)"
            points="0,140 0,110 80,95 160,80 240,90 320,60 400,40 500,20 500,140"
          />

          {/* Path Line */}
          <path
            d="M 0,110 L 80,95 L 160,80 L 240,90 L 320,60 L 400,40 L 500,20"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Glowing Target Dot */}
          <circle cx="500" cy="20" r="5" fill="#3B82F6" className="animate-ping opacity-75" />
          <circle cx="500" cy="20" r="4" fill="#60A5FA" />
        </svg>

        <div className="flex items-center justify-between text-xs text-gray-500 mt-2 font-mono">
          {points.map((p) => (
            <span key={p.timestamp}>{p.timestamp}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
