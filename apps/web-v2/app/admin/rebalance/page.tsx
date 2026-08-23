'use client';

import React, { useState } from 'react';
import { useStrategyAdmin } from '../../../hooks/useStrategyAdmin';
import { StrategyWeightsEditor } from '../../../components/strategy/StrategyWeightsEditor';
import { StrategyAssetManager } from '../../../components/strategy/StrategyAssetManager';
import { StrategyEventHistory } from '../../../components/strategy/StrategyEventHistory';
import { StatCard } from '../../../components/ui/StatCard';
import { TableCard } from '../../../components/ui/TableCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  RefreshCw,
  PieChart,
  ShieldCheck,
  Zap,
  Sliders,
  Layers,
  History,
  Info,
  DollarSign,
} from 'lucide-react';

export default function AdminRebalancePage() {
  const {
    strategyManagerAddress,
    portfolioManagerAddress,
    explorerBaseUrl,
    isGovernanceAdmin,
    currentWeights,
    totalAllocationBps,
    assetCount,
    portfolioValueUSDFormatted,
    uvPriceUSDFormatted,
    events,
    isLoading,
    isLoadingEvents,
    refetch,
  } = useStrategyAdmin();

  const [currentTab, setCurrentTab] = useState<'weights' | 'assets' | 'overview' | 'activity'>(
    'weights',
  );

  const isValidAllocation = totalAllocationBps === 10000n;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Strategy & Target Allocation Console
            </h1>
            <StatusBadge
              status={isValidAllocation ? 'Healthy' : 'Warning'}
              label={isValidAllocation ? '10,000 BPS INVARIANT OK' : 'ALLOCATION MISALIGNED'}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure index portfolio target asset weights (BPS), manage supported constituents, and
            audit atomic DEX rebalancing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground text-xs font-semibold self-start sm:self-auto transition-colors disabled:opacity-50 min-h-[38px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Refresh Strategy Data</span>
        </button>
      </div>

      {/* Architecture Notice */}
      <div className="rounded-xl bg-card/60 border border-border-subtle p-4 space-y-2 text-xs">
        <div className="flex items-center space-x-2 font-bold text-foreground">
          <Info className="w-4 h-4 text-purple-400" />
          <span>Stateless Atomic DEX Rebalancing Engine</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          UnifyVault V2 implements a stateless atomic rebalance mechanism: when users deposit
          collateral into CustodyVault, the{' '}
          <strong className="text-foreground">PortfolioManager</strong> calculates the target
          breakdown based on the authoritative weights in{' '}
          <strong className="text-foreground">
            StrategyManager (
            {strategyManagerAddress
              ? `${strategyManagerAddress.slice(0, 6)}...${strategyManagerAddress.slice(-4)}`
              : 'Dynamic'}
            )
          </strong>
          . Constituent weights must sum to exactly{' '}
          <code className="text-purple-400 font-mono">10,000 BPS (100.00%)</code>.
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Strategy Allocation"
          value={`${totalAllocationBps.toString()} BPS`}
          subtitle={isValidAllocation ? '100.00% Exact Sum' : 'Invariant Breached'}
          icon={PieChart}
          glowColor={isValidAllocation ? 'emerald' : 'amber'}
        />

        <StatCard
          title="Constituent Assets"
          value={`${assetCount.toString()} Tokens`}
          subtitle="Active Strategy Basket"
          icon={Layers}
          glowColor="purple"
        />

        <StatCard
          title="UV Token Price"
          value={uvPriceUSDFormatted}
          subtitle="PortfolioManager NAV"
          icon={Zap}
          glowColor="blue"
        />

        <StatCard
          title="Total Vault Valuation"
          value={portfolioValueUSDFormatted}
          subtitle="Aggregate Collateral NAV"
          icon={DollarSign}
          glowColor="cyan"
        />
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar border-b border-border-subtle/60 pb-1">
        <button
          type="button"
          onClick={() => setCurrentTab('weights')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'weights'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Target Weights Editor</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('assets')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'assets'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Constituent Asset Management</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('overview')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'overview'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Strategy Breakdown & Safeguards</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('activity')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] shrink-0 ${
            currentTab === 'activity'
              ? 'bg-purple-600 text-white shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border-subtle'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Logs ({events.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      {currentTab === 'weights' && (
        <StrategyWeightsEditor
          strategyManagerAddress={strategyManagerAddress}
          explorerBaseUrl={explorerBaseUrl}
          isGovernanceAdmin={isGovernanceAdmin}
          currentWeights={currentWeights}
          onRefresh={refetch}
        />
      )}

      {currentTab === 'assets' && (
        <StrategyAssetManager
          strategyManagerAddress={strategyManagerAddress}
          explorerBaseUrl={explorerBaseUrl}
          isGovernanceAdmin={isGovernanceAdmin}
          currentWeights={currentWeights}
          onRefresh={refetch}
        />
      )}

      {currentTab === 'overview' && (
        <div className="space-y-6">
          <TableCard
            title="Active Strategy Allocation Breakdown"
            subtitle="Current target weights enforced by StrategyManager on Base Sepolia"
            icon={PieChart}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-card/40 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Constituent Asset</th>
                    <th className="py-3 px-4">Target Weight (BPS)</th>
                    <th className="py-3 px-4">Allocation Percentage</th>
                    <th className="py-3 px-4 text-right">Invariant Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/40 font-mono">
                  {currentWeights.map((w) => (
                    <tr key={w.asset} className="hover:bg-card/40 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-bold text-foreground">{w.asset}</td>
                      <td className="py-3.5 px-4 text-foreground font-bold">
                        {w.weightBps.toString()} BPS
                      </td>
                      <td className="py-3.5 px-4 font-sans font-semibold text-purple-400">
                        {w.weightPercent.toFixed(2)}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCard>

          <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-4 shadow-xl text-xs">
            <div className="flex items-center space-x-2 text-foreground font-bold text-sm border-b border-border-subtle/40 pb-3">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>StrategyManager Invariant Rules</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-card/60 border border-border-subtle space-y-1">
                <span className="font-bold text-foreground block">Strict Sum Invariant</span>
                <p className="text-muted-foreground leading-relaxed">
                  Sum of target weights must equal exactly 10,000 BPS at all times. Partial sums or
                  overflows revert on-chain.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card/60 border border-border-subtle space-y-1">
                <span className="font-bold text-foreground block">Non-Zero Weights</span>
                <p className="text-muted-foreground leading-relaxed">
                  Zero weights are forbidden. To drop an asset from index basket, invoke removeAsset
                  instead of setting 0 BPS.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card/60 border border-border-subtle space-y-1">
                <span className="font-bold text-foreground block">Atomic DEX Execution</span>
                <p className="text-muted-foreground leading-relaxed">
                  Deposit flows calculate exact multi-asset split during execution, preventing
                  portfolio drift.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'activity' && (
        <StrategyEventHistory
          events={events}
          isLoadingEvents={isLoadingEvents}
          explorerBaseUrl={explorerBaseUrl}
        />
      )}
    </div>
  );
}
