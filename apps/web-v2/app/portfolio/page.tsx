'use client';

import React from 'react';
import { useDashboard } from '../../hooks/useDashboard';
import { PortfolioAnalyticsCard } from '../../components/dashboard/PortfolioAnalyticsCard';
import { HoldingsTable } from '../../components/portfolio/HoldingsTable';
import { HistoricalNavChart } from '../../components/portfolio/HistoricalNavChart';

export default function PortfolioPage() {
  const metrics = useDashboard();

  return (
    <div className="py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Portfolio Analytics & Custody Breakdown
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Real-time cost basis performance, entry price analytics, asset custody inventory, and NAV
          trajectory.
        </p>
      </div>

      <PortfolioAnalyticsCard metrics={metrics} />
      <HoldingsTable />
      <HistoricalNavChart />
    </div>
  );
}
