'use client';

import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  Loader2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import type { GenesisVerificationCheck } from '../../lib/deployment/types';

interface GenesisVerificationCardProps {
  results: GenesisVerificationCheck[];
  isVerifying: boolean;
  isComplete: boolean;
  onRunVerification: () => void;
}

export function GenesisVerificationCard({
  results,
  isVerifying,
  isComplete,
  onRunVerification,
}: GenesisVerificationCardProps) {
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const allPassed = totalCount > 0 && passedCount === totalCount;

  return (
    <div className="rounded-2xl border-2 border-black dark:border-white/10 bg-card p-5 sm:p-6 shadow-[4px_4px_0_#000] dark:shadow-none space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-black text-foreground">
              On-Chain Genesis Verification Suite (Step 8)
            </h3>
            {totalCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  allPassed
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {passedCount} / {totalCount} Passed
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Executes read-only RPC calls against Base Sepolia to verify zero-supply genesis state,
            price feeds, and role revocation.
          </p>
        </div>

        <button
          onClick={onRunVerification}
          disabled={isVerifying}
          className="px-4 py-2.5 rounded-xl bg-[#BFFF00] hover:bg-[#d0ff66] text-black text-xs font-bold border-2 border-black shadow-[2px_2px_0_#000] flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying On-Chain...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Run Verification Suite</span>
            </>
          )}
        </button>
      </div>

      {results.length === 0 ? (
        <div className="p-6 rounded-xl bg-muted/20 border border-border text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground">
            Click &quot;Run Verification Suite&quot; above to query live contracts on Base Sepolia
            and confirm genesis parameters.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {results.map((check) => (
            <div
              key={check.id}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                check.passed
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                {check.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <div>
                  <span className="font-bold text-foreground">{check.name}</span>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {check.contractName} &bull; Expected: {check.expected}
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-[11px] shrink-0">
                <span
                  className={
                    check.passed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                  }
                >
                  {check.actual}
                </span>
                {check.error && (
                  <div className="text-[10px] text-rose-400/80 max-w-xs truncate">
                    {check.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
