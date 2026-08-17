'use client';

import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';
import { useDashboard } from '../../hooks/useDashboard';
import { MetricCards } from '../../components/dashboard/MetricCards';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { getDefaultChainId } from '../../constants';
import { base } from 'viem/chains';

const AllocationChart = dynamic(
  () => import('../../components/dashboard/AllocationChart').then((mod) => mod.AllocationChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[160px] rounded-2xl bg-card border-2 border-black dark:border-white/15 p-4 sm:p-5 flex items-center justify-center shadow-[4px_4px_0_rgba(0,0,0,0.85)]">
        <div className="w-8 h-8 rounded-full border-2 border-black dark:border-white/30 border-t-[#BFFF00] animate-spin" />
      </div>
    ),
  },
);

export default function AppHomePage() {
  const metrics = useDashboard();
  const { chain } = useAccount();
  const currentChainId = chain?.id || getDefaultChainId();
  const networkName = currentChainId === base.id ? 'Base Mainnet' : 'Base Sepolia';

  return (
    <div className="space-y-2.5 sm:space-y-5 pt-1 pb-6 sm:py-2">
      {/* ── Compact Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">Home</h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {networkName} · Real-time index tracking
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] font-mono font-semibold px-2 py-1 rounded-lg bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#BFFF00] animate-pulse" />
          <span className="hidden sm:inline">{networkName} Live</span>
          <span className="sm:hidden">Live</span>
        </div>
      </div>

      {/* ── Dashboard Hero + Stats ── */}
      <MetricCards metrics={metrics} />

      {/* ── Allocation + Actions (side by side on desktop) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-1 min-w-0">
          <AllocationChart metrics={metrics} />
        </div>
        <div className="lg:col-span-2 min-w-0">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
