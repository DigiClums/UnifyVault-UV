'use client';

import React from 'react';
import { HoldingsTable } from '../../components/portfolio/HoldingsTable';
import { HistoricalNavChart } from '../../components/portfolio/HistoricalNavChart';

export default function PortfolioPage() {
  return (
    <div className="py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Portfolio & Custody Breakdown
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Detailed holding weights, custody vault token balances, and historical NAV metrics.
        </p>
      </div>

      <HoldingsTable />
      <HistoricalNavChart />
    </div>
  );
}
