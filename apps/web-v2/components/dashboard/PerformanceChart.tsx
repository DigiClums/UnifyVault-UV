'use client';

import React from 'react';
import { ChartCard } from '../ui/ChartCard';
import { EmptyState } from '../ui/EmptyState';
import { TrendingUp, History } from 'lucide-react';

export function PerformanceChart() {
  return (
    <ChartCard
      title="Vault NAV Performance"
      subtitle="Live Net Asset Value trajectory per share ($/Share)"
      icon={TrendingUp}
    >
      <EmptyState
        title="Historical performance is not yet available."
        description="Historical NAV progression curves will appear automatically as on-chain history accumulates. Current Net Asset Value is updated live above."
        icon={History}
      />
    </ChartCard>
  );
}
