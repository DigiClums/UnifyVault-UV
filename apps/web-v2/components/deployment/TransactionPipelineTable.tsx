'use client';

import React, { useState } from 'react';
import { FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS } from '../../lib/deployment/freshBaseSepoliaSequence';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertCircle,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';
import type { StepExecutionRecord, DeployedContractsMap } from '../../lib/deployment/types';

interface TransactionPipelineTableProps {
  currentStepIndex: number;
  stepRecords: Record<number, StepExecutionRecord>;
  deployedContracts: DeployedContractsMap;
  onSelectStep?: (stepIndex: number) => void;
}

export function TransactionPipelineTable({
  currentStepIndex,
  stepRecords,
  deployedContracts,
  onSelectStep,
}: TransactionPipelineTableProps) {
  const [selectedPhase, setSelectedPhase] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredSteps = FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.filter((step) => {
    if (selectedPhase !== 'all' && step.phaseNumber !== selectedPhase) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        step.contractName.toLowerCase().includes(q) ||
        step.functionName.toLowerCase().includes(q) ||
        step.title.toLowerCase().includes(q) ||
        step.stepNumber.toString().includes(q)
      );
    }
    return true;
  });

  const phases = [
    { id: 'all' as const, name: 'All Phases', count: 53 },
    { id: 1, name: 'P1: Core Contracts', count: 15 },
    { id: 2, name: 'P2: Directory Registry', count: 13 },
    { id: 3, name: 'P3: Module Sync', count: 6 },
    { id: 4, name: 'P4: Oracles', count: 6 },
    { id: 5, name: 'P5: Assets', count: 6 },
    { id: 6, name: 'P6: Slippage', count: 1 },
    { id: 7, name: 'P7: Roles', count: 6 },
  ];

  return (
    <div className="rounded-2xl border-2 border-black dark:border-white/10 bg-card p-5 sm:p-6 shadow-[4px_4px_0_#000] dark:shadow-none space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h3 className="text-lg font-black text-foreground">
            Transaction Pipeline (53 Sequence Steps)
          </h3>
          <p className="text-xs text-muted-foreground">
            Complete Foundry dry-run deployment sequence to be approved in MetaMask.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search steps..."
            className="pl-8 pr-3 py-1.5 rounded-xl bg-background border border-border text-xs focus:outline-none focus:border-[#BFFF00] w-full sm:w-48"
          />
        </div>
      </div>

      {/* Phase Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {phases.map((p) => {
          const isActive = selectedPhase === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPhase(p.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-[#BFFF00] text-black border-black shadow-[2px_2px_0_#000]'
                  : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {p.name} ({p.count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Target Contract</th>
              <th className="py-2.5 px-3">Function</th>
              <th className="py-2.5 px-3">Est. Gas</th>
              <th className="py-2.5 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono">
            {filteredSteps.map((step) => {
              const record = stepRecords[step.stepNumber];
              const isCurrent = step.stepNumber === currentStepIndex + 1;
              const isDone = record?.status === 'confirmed' || step.stepNumber <= currentStepIndex;
              const isFailed = record?.status === 'failed';
              const isRejected = record?.status === 'rejected';

              return (
                <tr
                  key={step.stepNumber}
                  className={`transition-colors ${
                    isCurrent
                      ? 'bg-[#BFFF00]/10 font-bold'
                      : isDone
                        ? 'bg-emerald-950/5'
                        : 'hover:bg-muted/20'
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-foreground">{step.stepNumber}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        step.type === 'DEPLOY'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}
                    >
                      {step.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-foreground">
                    {step.contractName}
                  </td>
                  <td className="py-2.5 px-3 text-[#BFFF00] dark:text-[#BFFF00]">
                    {step.functionName}()
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    {step.expectedGasLimit.toString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {isDone ? (
                      <div className="inline-flex items-center space-x-1 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmed</span>
                        {record?.txHash && (
                          <a
                            href={`https://sepolia.basescan.org/tx/${record.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-300 hover:text-emerald-100 ml-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : isCurrent ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#BFFF00] text-black">
                        Active Step
                      </span>
                    ) : isRejected ? (
                      <span className="text-amber-400 font-bold">Rejected</span>
                    ) : isFailed ? (
                      <span className="text-rose-400 font-bold">Failed</span>
                    ) : (
                      <span className="text-muted-foreground flex items-center justify-end space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
