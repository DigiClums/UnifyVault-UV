'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { EMERGENCY_PAUSABLE_ABI } from '../../lib/contracts/governance';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { GovernanceConfirmationModal } from './GovernanceConfirmationModal';
import { StatusBadge } from '../ui/StatusBadge';
import {
  ShieldAlert,
  ShieldCheck,
  Pause,
  Play,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { PausableModuleState } from '../../hooks/useGovernanceConsole';

export interface EmergencyGovernanceViewProps {
  pausableModules: PausableModuleState[];
  explorerBaseUrl: string;
  onRefresh: () => void;
}

export function EmergencyGovernanceView({
  pausableModules,
  explorerBaseUrl,
  onRefresh,
}: EmergencyGovernanceViewProps) {
  // Selected Action & Modal State
  const [selectedModule, setSelectedModule] = useState<PausableModuleState | null>(null);
  const [modalAction, setModalAction] = useState<'pause' | 'unpause' | null>(null);

  // Write contract hook
  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isTxSuccess) {
      onRefresh();
    }
  }, [isTxSuccess, onRefresh]);

  const handleOpenAction = (moduleState: PausableModuleState, action: 'pause' | 'unpause') => {
    resetWrite();
    setSelectedModule(moduleState);
    setModalAction(action);
  };

  const executePauseAction = () => {
    if (!selectedModule || !modalAction) return;

    const functionName =
      modalAction === 'pause' ? selectedModule.pauseFunction : selectedModule.unpauseFunction;

    writeContract({
      address: selectedModule.address,
      abi: EMERGENCY_PAUSABLE_ABI,
      functionName,
    });
  };

  const decodedError = writeError ? decodeTransactionError(writeError) : null;
  const totalPaused = pausableModules.filter((m) => m.isPaused).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center space-x-3.5">
          <div
            className={`p-3 rounded-xl border ${
              totalPaused > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                Emergency Circuit Breakers & Pause Controls
              </h2>
              <StatusBadge
                status={totalPaused > 0 ? 'Paused' : 'Active'}
                label={totalPaused > 0 ? `${totalPaused} MODULE(S) PAUSED` : 'ALL MODULES LIVE'}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live status telemetry across {pausableModules.length} pausable protocol modules.
              Automatic execution is strictly disabled.
            </p>
          </div>
        </div>
      </div>

      {/* Real-Time Transaction Feedback */}
      {isTxWaiting && txHash && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <span>Emergency state change broadcasted. Confirming on Base Sepolia...</span>
          </div>
          <a
            href={`${explorerBaseUrl}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 underline font-mono text-blue-300 hover:text-blue-200"
          >
            <span>BaseScan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {isTxSuccess && txHash && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>Emergency action successfully confirmed on-chain!</span>
          </div>
          <a
            href={`${explorerBaseUrl}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 underline font-mono text-emerald-300 hover:text-emerald-200"
          >
            <span>BaseScan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {decodedError && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center space-x-2.5 text-xs font-semibold shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{decodedError.message}</span>
        </div>
      )}

      {/* Pausable Modules Table */}
      <div className="rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-border-subtle/60 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-foreground font-bold text-sm">
            <Lock className="w-4 h-4 text-purple-400" />
            <span>Pausable Protocol Modules ({pausableModules.length})</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-card/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Contract Module</th>
                <th className="py-3 px-4">Contract Address</th>
                <th className="py-3 px-4">Operational Status</th>
                <th className="py-3 px-4">Authorized Authorities</th>
                <th className="py-3 px-4 text-right">Emergency Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40 font-mono">
              {pausableModules.map((mod) => (
                <tr key={mod.address} className="hover:bg-card/40 transition-colors">
                  <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                    <div className="flex items-center space-x-2">
                      <span>{mod.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <a
                      href={`${explorerBaseUrl}/address/${mod.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:text-purple-300 underline"
                    >
                      {`${mod.address.slice(0, 6)}...${mod.address.slice(-4)}`}
                    </a>
                  </td>
                  <td className="py-3.5 px-4 font-sans">
                    {mod.isPaused ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        <Pause className="w-3 h-3" />
                        <span>PAUSED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <Play className="w-3 h-3" />
                        <span>LIVE / ACTIVE</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-muted-foreground">
                    <div className="space-y-0.5 text-[11px]">
                      <div>
                        <span className="font-semibold text-foreground/80">Pause:</span>{' '}
                        <code className="text-amber-400 font-mono text-[10px]">
                          GUARDIAN_ROLE ({mod.pauseFunction})
                        </code>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground/80">Unpause:</span>{' '}
                        <code className="text-purple-400 font-mono text-[10px]">
                          GOVERNANCE_ROLE ({mod.unpauseFunction})
                        </code>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-sans">
                    {mod.isPaused ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAction(mod, 'unpause')}
                        disabled={!mod.userCanUnpause}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-all disabled:opacity-40"
                        title={
                          !mod.userCanUnpause
                            ? 'Requires GOVERNANCE_ROLE to unpause'
                            : 'Unpause contract operations'
                        }
                      >
                        Unpause Module
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenAction(mod, 'pause')}
                        disabled={!mod.userCanPause}
                        className="px-3 py-1.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 font-bold text-xs transition-all disabled:opacity-40"
                        title={
                          !mod.userCanPause
                            ? 'Requires GUARDIAN_ROLE to pause'
                            : 'Pause contract operations'
                        }
                      >
                        Pause Module
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <GovernanceConfirmationModal
        isOpen={modalAction !== null}
        onClose={() => setModalAction(null)}
        onConfirm={executePauseAction}
        isPending={isWritePending || isTxWaiting}
        title={
          modalAction === 'pause'
            ? `Emergency Pause — ${selectedModule?.name}`
            : `Unpause Protocol — ${selectedModule?.name}`
        }
        description={`Perform emergency circuit-breaker state modification on ${selectedModule?.name}.`}
        actionLabel={modalAction === 'pause' ? 'Execute Emergency Pause' : 'Execute Unpause'}
        actionColor={modalAction === 'pause' ? 'rose' : 'emerald'}
        warningMessage={
          modalAction === 'pause'
            ? 'WARNING: Pausing will temporarily halt all user deposit, redeem, trading, or staking actions on this contract module.'
            : 'Unpausing will restore live protocol execution.'
        }
        details={[
          { label: 'Target Module', value: selectedModule?.name || '' },
          { label: 'Contract Address', value: selectedModule?.address || '' },
          {
            label: 'Solidity Function Call',
            value: (
              <code className="text-purple-400 font-mono">
                {modalAction === 'pause'
                  ? `${selectedModule?.pauseFunction}()`
                  : `${selectedModule?.unpauseFunction}()`}
              </code>
            ),
          },
          {
            label: 'Required Permission',
            value: modalAction === 'pause' ? 'GUARDIAN_ROLE' : 'GOVERNANCE_ROLE',
          },
        ]}
      />
    </div>
  );
}
