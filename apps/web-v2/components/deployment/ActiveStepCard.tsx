'use client';

import React from 'react';
import {
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Zap,
  Shield,
  Layers,
  ArrowRight,
  ChevronRight,
  FastForward,
  Lock,
} from 'lucide-react';
import type {
  DeploymentStepDefinition,
  StepExecutionRecord,
  DeployedContractsMap,
} from '../../lib/deployment/types';
import { FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS } from '../../lib/deployment/freshBaseSepoliaSequence';

interface ActiveStepCardProps {
  currentStep?: DeploymentStepDefinition;
  currentStepIndex: number;
  totalSteps: number;
  isDeploying: boolean;
  isLocked?: boolean;
  stepRecord?: StepExecutionRecord;
  deployedContracts: DeployedContractsMap;
  deployerAddress?: `0x${string}`;
  errorMessage: string | null;
  activeTxHash: `0x${string}` | null;
  autoAdvance: boolean;
  simulationGas: string | null;
  isSimulating: boolean;
  isCorrectNetwork: boolean;
  isConnected: boolean;
  onExecuteCurrent: () => void;
  onExecuteAll: () => void;
  onStopAutoAdvance: () => void;
  onReset?: () => void;
  onGoToStep?: (stepNumber: number) => void;
}

export function ActiveStepCard({
  currentStep,
  currentStepIndex,
  totalSteps,
  isDeploying,
  isLocked,
  stepRecord,
  deployedContracts,
  deployerAddress,
  errorMessage,
  activeTxHash,
  autoAdvance,
  simulationGas,
  isSimulating,
  isCorrectNetwork,
  isConnected,
  onExecuteCurrent,
  onExecuteAll,
  onStopAutoAdvance,
  onReset,
  onGoToStep,
}: ActiveStepCardProps) {
  if (!currentStep) {
    return (
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/20 p-6 text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-emerald-300">
          All {totalSteps} Deployment Transactions Completed!
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          The UnifyVault protocol has been deployed and verified on Base Sepolia. Review the
          manifest and run on-chain genesis verification below.
        </p>
      </div>
    );
  }

  const progressPercent = Math.round(((currentStep.stepNumber - 1) / totalSteps) * 100);

  // Extract argument summary
  let argsSummary: { label: string; value: string }[] = [];
  try {
    const ctx = {
      chainId: 84532,
      deployerAddress:
        deployerAddress || ('0x0000000000000000000000000000000000000000' as `0x${string}`),
      deployedContracts,
    };
    const execData = currentStep.getExecutionData(ctx);
    if (execData.args && Array.isArray(execData.args)) {
      argsSummary = execData.args.map((arg, idx) => ({
        label: `arg[${idx}]`,
        value: typeof arg === 'bigint' ? arg.toString() : JSON.stringify(arg),
      }));
    }
  } catch (e: any) {
    argsSummary = [
      { label: 'Pending Dependencies', value: e?.message || 'Will resolve at execution' },
    ];
  }

  const isStepConfirmed = stepRecord?.status === 'confirmed';
  const isActionDisabled =
    isLocked || isStepConfirmed || !isConnected || !isCorrectNetwork || isDeploying;

  return (
    <div className="rounded-2xl border-2 border-black dark:border-white/10 bg-card p-5 sm:p-6 shadow-[4px_4px_0_#000] dark:shadow-none space-y-5">
      {/* Step Selector & Quick Jump */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-muted-foreground">Jump to Step:</span>
          <select
            value={currentStep.stepNumber}
            onChange={(e) => onGoToStep && onGoToStep(Number(e.target.value))}
            className="px-2.5 py-1 text-xs font-bold bg-background border border-border rounded-lg text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#BFFF00]"
          >
            {FRESH_BASE_SEPOLIA_DEPLOYMENT_STEPS.map((s) => (
              <option key={s.stepNumber} value={s.stepNumber}>
                Step #{s.stepNumber}: {s.title} ({s.contractName})
              </option>
            ))}
          </select>
        </div>

        {isLocked && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-mono font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>MANIFEST LOCKED ON SERVER</span>
          </div>
        )}
      </div>

      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#BFFF00] text-black border border-black shadow-[1px_1px_0_#000]">
              Step {currentStep.stepNumber} of {totalSteps}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {currentStep.phaseName}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-foreground">{currentStep.title}</h3>
          <p className="text-xs text-muted-foreground">{currentStep.description}</p>
        </div>

        {/* Transaction Category Pill */}
        <div className="flex items-center space-x-2 shrink-0">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold border ${
              currentStep.type === 'DEPLOY'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            {currentStep.type === 'DEPLOY' ? 'Deploy Contract (CREATE)' : 'Execute Call'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-muted-foreground">
          <span>Deployment Progress</span>
          <span>
            {currentStep.stepNumber - 1} / {totalSteps} Transactions ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-[#BFFF00] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step Metadata & Simulation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Target Contract
          </span>
          <p className="font-mono text-xs font-bold text-foreground truncate">
            {currentStep.contractName}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Method
          </span>
          <p className="font-mono text-xs font-bold text-foreground truncate">
            {currentStep.functionName}()
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Gas Limit (Est)
            </span>
            {isSimulating && <Loader2 className="w-3 h-3 animate-spin text-[#BFFF00]" />}
          </div>
          <p className="font-mono text-xs font-bold text-foreground">
            {simulationGas ? `${Number(simulationGas).toLocaleString()} gas` : 'Estimating...'}
          </p>
        </div>
      </div>

      {/* Arguments Table */}
      {argsSummary.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Transaction Arguments
          </span>
          <div className="p-3 rounded-xl bg-black/60 border border-border/80 space-y-1.5 font-mono text-xs overflow-x-auto">
            {argsSummary.map((arg, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">{arg.label}:</span>
                <span className="text-[#BFFF00] break-all">{arg.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Transaction Hash / Status Notice */}
      {activeTxHash && (
        <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-blue-300 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>Confirming on block...</span>
          </div>
          <a
            href={`https://sepolia.basescan.org/tx/${activeTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 underline font-mono"
          >
            <span>View on BaseScan</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Execution Notice:</span>
            <p className="font-mono">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        {isStepConfirmed || isLocked ? (
          <div className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-black tracking-wide uppercase flex items-center justify-center space-x-2 border-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono">
            <CheckCircle2 className="w-4 h-4" />
            <span>ALREADY DEPLOYED & LOCKED</span>
          </div>
        ) : (
          <>
            <button
              onClick={onExecuteCurrent}
              disabled={isActionDisabled}
              className={`w-full sm:flex-1 py-3.5 px-4 rounded-xl text-xs sm:text-sm font-black tracking-wide uppercase transition-all flex items-center justify-center space-x-2 border-2 ${
                !isActionDisabled
                  ? 'bg-[#BFFF00] text-black border-black shadow-[3px_3px_0_#000] hover:bg-[#d0ff66] cursor-pointer'
                  : 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60'
              }`}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Prompting MetaMask...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Sign Transaction #{currentStep.stepNumber} in MetaMask</span>
                </>
              )}
            </button>

            {!autoAdvance ? (
              <button
                onClick={onExecuteAll}
                disabled={isActionDisabled}
                className={`w-full sm:w-auto py-3.5 px-5 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all flex items-center justify-center space-x-2 ${
                  !isActionDisabled
                    ? 'bg-purple-600 text-white border-black shadow-[3px_3px_0_#000] hover:bg-purple-500 cursor-pointer'
                    : 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60'
                }`}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Auto-Advance All</span>
              </button>
            ) : (
              <button
                onClick={onStopAutoAdvance}
                className="w-full sm:w-auto py-3.5 px-5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 text-black border-2 border-black shadow-[3px_3px_0_#000] hover:bg-amber-400 cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Stop Auto-Advance</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
