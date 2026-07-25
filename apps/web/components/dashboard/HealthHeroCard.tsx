'use client';

import * as React from 'react';
import { HealthStatusData } from '../../services/protocol/dashboardService';

interface HealthHeroCardProps {
  health: HealthStatusData;
  loading?: boolean;
}

export function HealthHeroCard({ health, loading }: HealthHeroCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 dark:bg-[#111827]/60 p-6 backdrop-blur-md animate-pulse">
        <div className="h-6 w-48 rounded bg-muted mb-4" />
        <div className="h-4 w-full rounded bg-muted mb-2" />
        <div className="h-4 w-3/4 rounded bg-muted" />
      </div>
    );
  }

  const statusColor = health.isHealthy
    ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
    : health.isPaused
      ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
      : 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400';

  const statusBadge = health.isHealthy
    ? 'HEALTHY & OPERATIONAL'
    : health.isPaused
      ? 'EMERGENCY PAUSED'
      : 'DEGRADED / STALE FEEDS';

  return (
    <div
      className={`rounded-2xl border ${statusColor} p-6 sm:p-8 backdrop-blur-md shadow-sm dark:shadow-none transition-all duration-200`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-current">
              {statusBadge}
            </span>
            <span className="text-xs font-mono text-muted-foreground">Protocol Health Index</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            System Invariants & Module Synchronization
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl">
            UnifyVault V2 operates under real-time multi-module resolution via ProtocolDirectory.
            All collateral deposits are atomically converted into index strategy assets and
            custodies in CustodyVault.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
          <div className="bg-card/80 dark:bg-[#1f293d]/50 p-3 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Directory
            </span>
            <p className="text-xs font-bold font-mono text-emerald-500">
              {health.isDirectoryResolved ? 'RESOLVED' : 'UNRESOLVED'}
            </p>
          </div>
          <div className="bg-card/80 dark:bg-[#1f293d]/50 p-3 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Oracles
            </span>
            <p
              className={`text-xs font-bold font-mono ${health.isHealthy ? 'text-emerald-500' : 'text-amber-500'}`}
            >
              {health.isHealthy ? 'FRESH (18D)' : 'CHECK FEEDS'}
            </p>
          </div>
          <div className="bg-card/80 dark:bg-[#1f293d]/50 p-3 rounded-xl border border-border col-span-2 sm:col-span-1">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Controller
            </span>
            <p
              className={`text-xs font-bold font-mono ${health.isPaused ? 'text-rose-500' : 'text-emerald-500'}`}
            >
              {health.isPaused ? 'PAUSED' : 'ACTIVE'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
