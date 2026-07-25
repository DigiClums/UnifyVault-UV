'use client';

import * as React from 'react';

export function GovernanceActivityCard() {
  return (
    <div className="rounded-2xl border border-border bg-card/90 dark:bg-[#111827]/60 p-6 backdrop-blur-md shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">Governance & Administrative Activity</h3>
        <span className="text-xs text-muted-foreground font-mono">
          Role Access: GOVERNANCE_ROLE
        </span>
      </div>

      <div className="p-8 rounded-xl bg-secondary/30 border border-border/50 text-center">
        <p className="text-sm font-mono text-muted-foreground">
          &gt; &quot;No governance actions recorded.&quot;
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Governance proposals, weight updates, and emergency pauses will be logged here in future
          releases.
        </p>
      </div>
    </div>
  );
}
