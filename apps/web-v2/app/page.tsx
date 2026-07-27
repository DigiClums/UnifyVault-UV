'use client';

import React from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { MetricCards } from '../components/dashboard/MetricCards';
import { PerformanceChart } from '../components/dashboard/PerformanceChart';
import { AllocationChart } from '../components/dashboard/AllocationChart';
import { QuickActions } from '../components/dashboard/QuickActions';

export default function DashboardPage() {
  const metrics = useDashboard();

  return (
    <div className="space-y-8">
      {/* Hero Welcome */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-accent-blue/10 via-surface to-accent-violet/10 p-6 rounded-2xl border border-border-subtle">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            UnifyVault V2 Portfolio Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-asset index tracking, NAV valuation, and cost-basis performance engine.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
          <span>Base Sepolia Live Sync</span>
        </div>
      </div>

      {/* Metric Cards (6 core cards with documented sources) */}
      <MetricCards metrics={metrics} />

      {/* Analytics & Execution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PerformanceChart />
          <QuickActions />
        </div>
        <div>
          <AllocationChart metrics={metrics} />
        </div>
      </div>
    </div>
  );
}
