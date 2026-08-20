'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { UNIFY_VAULT_PAYMASTER_ABI, GAS_TREASURY_ABI } from '../../lib/contracts/paymaster';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { PaymasterConfirmationModal } from './PaymasterConfirmationModal';
import { StatusBadge } from '../ui/StatusBadge';
import {
  ShieldAlert,
  Pause,
  Play,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
} from 'lucide-react';
import { PaymasterAdminState } from '../../hooks/usePaymasterAdmin';

export interface PaymasterEmergencySectionProps {
  state: PaymasterAdminState;
  onRefresh: () => void;
}

export function PaymasterEmergencySection({ state, onRefresh }: PaymasterEmergencySectionProps) {
  // Modal state
  type EmergencyModalAction =
    | { target: 'paymaster'; action: 'pause' | 'unpause' }
    | { target: 'treasury'; action: 'pause' | 'unpause' }
    | null;

  const [modalAction, setModalAction] = useState<EmergencyModalAction>(null);

  // Contract write hook
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

  const handleOpenAction = (target: 'paymaster' | 'treasury', action: 'pause' | 'unpause') => {
    resetWrite();
    setModalAction({ target, action });
  };

  const executeModalAction = () => {
    if (!modalAction) return;

    const shouldPause = modalAction.action === 'pause';

    if (modalAction.target === 'paymaster') {
      writeContract({
        address: state.paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'setPaused',
        args: [shouldPause],
      });
    } else if (modalAction.target === 'treasury') {
      writeContract({
        address: state.gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'setPaused',
        args: [shouldPause],
      });
    }
  };

  const decodedError = writeError ? decodeTransactionError(writeError) : null;
  const isAnyPaused = state.isPaymasterPaused || state.isGasTreasuryPaused;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center space-x-3.5">
          <div
            className={`p-3 rounded-xl border ${
              isAnyPaused
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                Account Abstraction Emergency Circuit Breakers
              </h2>
              <StatusBadge
                status={isAnyPaused ? 'Paused' : 'Active'}
                label={isAnyPaused ? 'CIRCUIT BREAKER ACTIVE' : 'ALL SYSTEMS LIVE'}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Role-guarded pause and unpause controls for UnifyVaultPaymaster and GasTreasury on
              Base Sepolia.
            </p>
          </div>
        </div>
      </div>

      {/* Real-Time Transaction Feedback */}
      {isTxWaiting && txHash && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <span>Emergency state change broadcasted. Confirming on Base...</span>
          </div>
          <a
            href={`${state.explorerBaseUrl}/tx/${txHash}`}
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
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Emergency action successfully confirmed on-chain!</span>
          </div>
          <a
            href={`${state.explorerBaseUrl}/tx/${txHash}`}
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

      {/* Emergency Control Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Paymaster Pause Control */}
        <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-border-subtle/50 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                UnifyVaultPaymaster
              </h3>
              <code className="text-[11px] text-purple-400 font-mono">
                {state.paymasterAddress}
              </code>
            </div>
            <StatusBadge
              status={state.isPaymasterPaused ? 'Paused' : 'Active'}
              label={state.isPaymasterPaused ? 'PAUSED' : 'ACTIVE'}
            />
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              Pausing the Paymaster halts all gas sponsorship validation for UserOperations. Users
              attempting gasless transactions will be rejected during validation.
            </p>
            <div className="p-3 rounded-xl bg-card/60 border border-border-subtle space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Contract Owner:</span>
                <code className="text-foreground font-mono">
                  {state.paymasterOwner
                    ? `${state.paymasterOwner.slice(0, 6)}...${state.paymasterOwner.slice(-4)}`
                    : 'Loading...'}
                </code>
              </div>
              <div className="flex justify-between">
                <span>Your Authorization:</span>
                <span
                  className={
                    state.isPaymasterOwner ? 'text-emerald-400 font-bold' : 'text-rose-400'
                  }
                >
                  {state.isPaymasterOwner ? 'Authorized (Owner)' : 'Unauthorized'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            {state.isPaymasterPaused ? (
              <button
                type="button"
                onClick={() => handleOpenAction('paymaster', 'unpause')}
                disabled={!state.canEmergencyPausePaymaster || isWritePending || isTxWaiting}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-40"
              >
                <Play className="w-4 h-4" />
                <span>Unpause Paymaster Sponsorship</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenAction('paymaster', 'pause')}
                disabled={!state.canEmergencyPausePaymaster || isWritePending || isTxWaiting}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-40"
              >
                <Pause className="w-4 h-4" />
                <span>Emergency Pause Paymaster</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Gas Treasury Pause Control */}
        <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-border-subtle/50 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                GasTreasury Reserve
              </h3>
              <code className="text-[11px] text-cyan-400 font-mono">
                {state.gasTreasuryAddress}
              </code>
            </div>
            <StatusBadge
              status={state.isGasTreasuryPaused ? 'Paused' : 'Active'}
              label={state.isGasTreasuryPaused ? 'PAUSED' : 'ACTIVE'}
            />
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              Pausing the Gas Treasury locks automated and manual refill operations. No native ETH
              will be transferred to the Paymaster deposit while locked.
            </p>
            <div className="p-3 rounded-xl bg-card/60 border border-border-subtle space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Contract Owner:</span>
                <code className="text-foreground font-mono">
                  {state.gasTreasuryOwner
                    ? `${state.gasTreasuryOwner.slice(0, 6)}...${state.gasTreasuryOwner.slice(-4)}`
                    : 'Loading...'}
                </code>
              </div>
              <div className="flex justify-between">
                <span>Your Authorization:</span>
                <span
                  className={
                    state.isGasTreasuryOwner ? 'text-emerald-400 font-bold' : 'text-rose-400'
                  }
                >
                  {state.isGasTreasuryOwner ? 'Authorized (Owner)' : 'Unauthorized'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            {state.isGasTreasuryPaused ? (
              <button
                type="button"
                onClick={() => handleOpenAction('treasury', 'unpause')}
                disabled={!state.canEmergencyPauseTreasury || isWritePending || isTxWaiting}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-40"
              >
                <Play className="w-4 h-4" />
                <span>Unpause Gas Treasury</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenAction('treasury', 'pause')}
                disabled={!state.canEmergencyPauseTreasury || isWritePending || isTxWaiting}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-glow flex items-center justify-center space-x-2 disabled:opacity-40"
              >
                <Pause className="w-4 h-4" />
                <span>Emergency Pause Gas Treasury</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <PaymasterConfirmationModal
        isOpen={modalAction !== null}
        onClose={() => setModalAction(null)}
        onConfirm={executeModalAction}
        isPending={isWritePending || isTxWaiting}
        title={
          modalAction?.action === 'pause'
            ? `Emergency Pause — ${modalAction.target === 'paymaster' ? 'UnifyVaultPaymaster' : 'GasTreasury'}`
            : `Unpause — ${modalAction?.target === 'paymaster' ? 'UnifyVaultPaymaster' : 'GasTreasury'}`
        }
        description={`Execute emergency circuit breaker state mutation on ${modalAction?.target === 'paymaster' ? state.paymasterAddress : state.gasTreasuryAddress}`}
        actionLabel={
          modalAction?.action === 'pause' ? 'Execute Emergency Pause' : 'Execute Unpause'
        }
        actionColor={modalAction?.action === 'pause' ? 'rose' : 'emerald'}
        warningMessage={
          modalAction?.action === 'pause'
            ? modalAction.target === 'paymaster'
              ? 'WARNING: Pausing the Paymaster will immediately halt all ERC-4337 gas sponsorship for all users across the platform.'
              : 'WARNING: Pausing Gas Treasury will lock automated gas deposits to the Paymaster.'
            : 'Unpausing will restore live operations.'
        }
        details={[
          {
            label: 'Target Contract',
            value:
              modalAction?.target === 'paymaster' ? 'UnifyVaultPaymaster.sol' : 'GasTreasury.sol',
          },
          {
            label: 'Contract Address',
            value:
              modalAction?.target === 'paymaster'
                ? state.paymasterAddress
                : state.gasTreasuryAddress,
          },
          {
            label: 'Solidity Function Call',
            value: (
              <code className="text-purple-400 font-mono">
                {modalAction?.action === 'pause' ? 'setPaused(true)' : 'setPaused(false)'}
              </code>
            ),
          },
          {
            label: 'Required Permission',
            value:
              modalAction?.target === 'paymaster'
                ? 'Paymaster Owner (onlyOwner)'
                : 'Gas Treasury Owner (onlyOwner)',
          },
        ]}
      />
    </div>
  );
}
