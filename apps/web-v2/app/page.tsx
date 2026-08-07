'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { useDashboard } from '../hooks/useDashboard';
import { MetricCards } from '../components/dashboard/MetricCards';
import { AllocationChart } from '../components/dashboard/AllocationChart';
import { QuickActions } from '../components/dashboard/QuickActions';
import { getDefaultChainId } from '../constants';
import { base } from 'viem/chains';
import { Layers, Zap } from 'lucide-react';

import { NavDebugLogger } from '../components/dashboard/NavDebugLogger';
import { useUnifiedProtocolData } from '../hooks/useUnifiedProtocolData';

export default function DashboardPage() {
  const metrics = useDashboard();
  const { chain } = useAccount();
  const currentChainId = chain?.id || getDefaultChainId();
  const networkName = currentChainId === base.id ? 'Base Mainnet' : 'Base Sepolia';

  return (
    <div className="space-y-8 py-2">
      {/* Hero Welcome */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-accent-blue/10 via-surface to-accent-violet/10 p-6 rounded-2xl border border-border-subtle shadow-glow">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            UnifyVault V2 Portfolio Dashboard
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Real-time multi-asset index tracking, NAV valuation, and strategy execution engine.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
          <span>{networkName} Live Sync</span>
        </div>
      </div>

      {/* 1. Protocol Overview Metrics Section */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2 pb-1 border-b border-border-subtle">
          <Layers className="w-4 h-4 text-accent-blue" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Protocol Metrics
          </h2>
        </div>
        <MetricCards metrics={metrics} />
      </section>

      {/* 2. Strategy Allocation & Quick Execution Section */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2 pb-1 border-b border-border-subtle">
          <Zap className="w-4 h-4 text-accent-blue" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Live Strategy Allocation & Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <AllocationChart metrics={metrics} />
          </div>
          <div className="lg:col-span-2">
            <QuickActions />
          </div>
        </div>
      </section>

      <NavDebugLogger data={metrics} />
    </div>
  );
}

