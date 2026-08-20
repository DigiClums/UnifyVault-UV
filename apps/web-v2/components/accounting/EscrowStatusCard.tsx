'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress, getAddress } from 'viem';
import { COST_BASIS_MANAGER_V2_ABI } from '../../lib/contracts/costBasis';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { AccountingConfirmationModal } from './AccountingConfirmationModal';
import { StatusBadge } from '../ui/StatusBadge';
import {
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
} from 'lucide-react';
import { UserAccountingState } from '../../hooks/useUserAccounting';

export interface EscrowStatusCardProps {
  state: UserAccountingState;
  onRefresh: () => void;
}

export function EscrowStatusCard({ state, onRefresh }: EscrowStatusCardProps) {
  const [customEscrowAddress, setCustomEscrowAddress] = useState<string>(state.targetAddress || '');
  const [newEscrowStatus, setNewEscrowStatus] = useState<boolean>(!state.isEscrow);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync inspected address
  useEffect(() => {
    if (state.targetAddress) {
      setCustomEscrowAddress(state.targetAddress);
      setNewEscrowStatus(!state.isEscrow);
    }
  }, [state.targetAddress, state.isEscrow]);

  // Modal action
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleInitiateSetEscrow = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!customEscrowAddress || !isAddress(customEscrowAddress)) {
      setValidationError('Please enter a valid 20-byte EVM address.');
      return;
    }
    if (customEscrowAddress === '0x0000000000000000000000000000000000000000') {
      setValidationError('Cannot set escrow status on zero address.');
      return;
    }

    setIsModalOpen(true);
  };

  const executeSetEscrow = () => {
    const formatted = getAddress(customEscrowAddress);
    writeContract({
      address: state.costBasisManagerAddress,
      abi: COST_BASIS_MANAGER_V2_ABI,
      functionName: 'setEscrowStatus',
      args: [formatted, newEscrowStatus],
    });
  };

  const decodedError = writeError ? decodeTransactionError(writeError) : null;

  return (
    <div className="space-y-6">
      {/* Real-Time Transaction Feedback */}
      {isTxWaiting && txHash && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <span>Escrow status modification broadcasted. Confirming on Base...</span>
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
            <span>Escrow status updated successfully on-chain!</span>
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

      {validationError && (
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center space-x-2.5 text-xs font-semibold shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Escrow Status Card */}
      <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle/50 pb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl border ${
                state.isEscrow
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              }`}
            >
              {state.isEscrow ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                P2P Escrow Accounting Isolation Context
              </h3>
              <p className="text-xs text-muted-foreground">
                Designates smart contract addresses excluded from proportional cost basis movement
              </p>
            </div>
          </div>

          <StatusBadge
            status={state.isEscrow ? 'Warning' : 'Healthy'}
            label={state.isEscrow ? 'ESCROW ISOLATION ACTIVE' : 'STANDARD USER WALLET'}
          />
        </div>

        {/* Informational Context */}
        <div className="p-4 rounded-xl bg-card/60 border border-border-subtle text-xs text-muted-foreground space-y-2 leading-relaxed">
          <p>
            <strong className="text-foreground">Architectural Rule in CostBasisManagerV2:</strong>{' '}
            In the <code className="text-purple-400 font-mono">onTokenTransfer</code> pre-transfer
            hook, any token transfers where either <code className="text-foreground">from</code> or{' '}
            <code className="text-foreground">to</code> is designated as an Escrow address do{' '}
            <strong className="text-foreground">not</strong> alter user cost basis.
          </p>
          <p>
            This guarantees that temporary escrow locks during P2P orders do not distort the
            investor&apos;s personal purchase price or cost basis history.
          </p>
        </div>

        {/* Escrow Status Mutation Form */}
        <div className="border-t border-border-subtle/50 pt-4">
          <form onSubmit={handleInitiateSetEscrow} className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                Modify Escrow Whitelist Status (GOVERNANCE_ROLE)
              </span>
              <span
                className={`text-[11px] font-bold ${
                  state.isGovernanceAdmin ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {state.isGovernanceAdmin ? 'Authorized (Governance)' : 'Unauthorized'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-muted-foreground font-semibold">
                  Target Escrow Contract Address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={customEscrowAddress}
                  onChange={(e) => setCustomEscrowAddress(e.target.value)}
                  disabled={!state.isGovernanceAdmin}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Proposed Status</label>
                <select
                  value={newEscrowStatus ? 'true' : 'false'}
                  onChange={(e) => setNewEscrowStatus(e.target.value === 'true')}
                  disabled={!state.isGovernanceAdmin}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                >
                  <option value="true">Is Escrow: TRUE</option>
                  <option value="false">Is Escrow: FALSE</option>
                </select>
              </div>
            </div>

            {!state.isGovernanceAdmin && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Requires GOVERNANCE_ROLE on CostBasisManagerV2 to execute mutation.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                !state.isGovernanceAdmin || isWritePending || isTxWaiting || !customEscrowAddress
              }
              className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              {newEscrowStatus ? (
                <>
                  <ToggleRight className="w-4 h-4" />
                  <span>Set Address as P2P Escrow Context</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" />
                  <span>Remove Address from Escrow Context</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AccountingConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={executeSetEscrow}
        isPending={isWritePending || isTxWaiting}
        title={newEscrowStatus ? 'Designate Escrow Address' : 'Revoke Escrow Designation'}
        description={`Execute state mutation on CostBasisManagerV2 (${state.costBasisManagerAddress.slice(0, 6)}...${state.costBasisManagerAddress.slice(-4)})`}
        actionLabel={newEscrowStatus ? 'Enable Escrow Status' : 'Revoke Escrow Status'}
        actionColor={newEscrowStatus ? 'purple' : 'rose'}
        warningMessage={
          !newEscrowStatus
            ? 'WARNING: Revoking escrow status will cause token transfers to/from this address to shift proportional investor cost basis.'
            : 'Designating this address as an escrow will prevent transfers to/from it from moving investment cost basis.'
        }
        details={[
          { label: 'Target Contract', value: 'CostBasisManagerV2.sol' },
          { label: 'Target Address', value: customEscrowAddress },
          {
            label: 'Solidity Call',
            value: (
              <code className="text-purple-400 font-mono">
                setEscrowStatus({customEscrowAddress.slice(0, 6)}...{customEscrowAddress.slice(-4)},{' '}
                {newEscrowStatus ? 'true' : 'false'})
              </code>
            ),
          },
          { label: 'Required Role', value: 'GOVERNANCE_ROLE' },
        ]}
      />
    </div>
  );
}
