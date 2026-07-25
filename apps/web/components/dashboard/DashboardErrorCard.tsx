'use client';

import * as React from 'react';

interface DashboardErrorCardProps {
  error?: Error;
  onRetry: () => void;
}

export function DashboardErrorCard({ error, onRetry }: DashboardErrorCardProps) {
  return (
    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 backdrop-blur-md text-center flex flex-col items-center justify-center my-6">
      <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 font-bold text-lg mb-3">
        ⚠️
      </div>
      <h3 className="text-base font-bold text-foreground">Failed to Load Dashboard Data</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-md font-mono">
        {error?.message || 'An error occurred while querying on-chain protocol metrics.'}
      </p>
      <button
        onClick={onRetry}
        aria-label="Retry loading dashboard data"
        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
      >
        Retry Fetching Data
      </button>
    </div>
  );
}
