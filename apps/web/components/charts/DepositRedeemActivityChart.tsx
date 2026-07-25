'use client';

import * as React from 'react';

export function DepositRedeemActivityChart() {
  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Deposit vs. Redeem Volume
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
              Historical data not yet available
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-foreground font-mono mt-1">
            Flow Volume Activity
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Deposits</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-muted-foreground">Redeems</span>
          </div>
        </div>
      </div>

      {/* Bar visual representation */}
      <div className="relative h-44 w-full flex items-end justify-between gap-2 pt-6 pb-2 border-b border-border">
        {[
          { label: 'Mon', deposit: 70, redeem: 20 },
          { label: 'Tue', deposit: 85, redeem: 30 },
          { label: 'Wed', deposit: 60, redeem: 40 },
          { label: 'Thu', deposit: 95, redeem: 15 },
          { label: 'Fri', deposit: 110, redeem: 50 },
          { label: 'Sat', deposit: 45, redeem: 10 },
          { label: 'Sun', deposit: 80, redeem: 25 },
        ].map((day) => (
          <div
            key={day.label}
            className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
          >
            <div className="w-full flex items-end justify-center gap-1 h-full">
              <div
                className="w-1/2 bg-emerald-500/80 rounded-t transition-all hover:bg-emerald-400"
                style={{ height: `${day.deposit}%` }}
                title={`Deposits: ${day.deposit}k USDC`}
              />
              <div
                className="w-1/2 bg-purple-500/80 rounded-t transition-all hover:bg-purple-400"
                style={{ height: `${day.redeem}%` }}
                title={`Redeems: ${day.redeem}k USDC`}
              />
            </div>
            <span className="text-[11px] text-muted-foreground font-mono mt-1">{day.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-muted-foreground text-center font-mono">
        Showing illustrative flow activity. Live historical indexer integration coming soon.
      </div>
    </div>
  );
}
