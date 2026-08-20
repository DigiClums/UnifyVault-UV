'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress, getAddress } from 'viem';
import { UNIFY_VAULT_PAYMASTER_ABI } from '../../lib/contracts/paymaster';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { PaymasterConfirmationModal } from './PaymasterConfirmationModal';
import { TableCard } from '../ui/TableCard';
import { StatusBadge } from '../ui/StatusBadge';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
  Plus,
  ToggleLeft,
  ToggleRight,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PaymasterAdminState, TargetStatus } from '../../hooks/usePaymasterAdmin';

export interface ApprovedTargetsSectionProps {
  state: PaymasterAdminState;
  onRefresh: () => void;
}

export function ApprovedTargetsSection({ state, onRefresh }: ApprovedTargetsSectionProps) {
  // Custom addition states
  const [customTarget, setCustomTarget] = useState<string>('');
  const [customSelectorTarget, setCustomSelectorTarget] = useState<string>('');
  const [customSelectorHex, setCustomSelectorHex] = useState<string>('');
  const [customSelectorName, setCustomSelectorName] = useState<string>('');
  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);

  // Modal action
  type TargetModalAction =
    | { type: 'target'; target: `0x${string}`; approved: boolean; name?: string }
    | {
        type: 'selector';
        target: `0x${string}`;
        selector: `0x${string}`;
        approved: boolean;
        name?: string;
        selectorName?: string;
      }
    | null;

  const [modalAction, setModalAction] = useState<TargetModalAction>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

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

  // Helper for selector validation (must be 0x + 8 hex chars = 10 chars)
  const isValidSelector = (sel: string): boolean => {
    const clean = sel.trim().toLowerCase();
    return /^0x[0-9a-fA-F]{8}$/.test(clean);
  };

  // Toggle Target Handler
  const handleToggleTarget = (target: TargetStatus) => {
    setValidationError(null);
    resetWrite();

    if (!state.isPaymasterOwner) {
      setValidationError('Only the Paymaster Owner can modify target whitelist approvals.');
      return;
    }

    setModalAction({
      type: 'target',
      target: target.address,
      approved: !target.isApproved,
      name: target.name,
    });
  };

  // Toggle Selector Handler
  const handleToggleSelector = (
    target: TargetStatus,
    selector: `0x${string}`,
    currentApproved: boolean,
    selectorName?: string,
  ) => {
    setValidationError(null);
    resetWrite();

    if (!state.isPaymasterOwner) {
      setValidationError('Only the Paymaster Owner can modify selector whitelist approvals.');
      return;
    }

    setModalAction({
      type: 'selector',
      target: target.address,
      selector,
      approved: !currentApproved,
      name: target.name,
      selectorName,
    });
  };

  // Custom Target Form
  const handleAddCustomTarget = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!customTarget || !isAddress(customTarget)) {
      setValidationError('Please enter a valid checksummed EVM contract address.');
      return;
    }
    if (customTarget === '0x0000000000000000000000000000000000000000') {
      setValidationError('Target cannot be zero address.');
      return;
    }

    const formattedTarget = getAddress(customTarget);

    setModalAction({
      type: 'target',
      target: formattedTarget as `0x${string}`,
      approved: true,
      name: 'Custom Target',
    });
  };

  // Custom Selector Form
  const handleAddCustomSelector = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!customSelectorTarget || !isAddress(customSelectorTarget)) {
      setValidationError('Please select or enter a valid target contract address.');
      return;
    }

    const cleanSelector = customSelectorHex.trim().toLowerCase();
    if (!isValidSelector(cleanSelector)) {
      setValidationError(
        'Invalid function selector format. Must be a 4-byte hex string (e.g. 0x095ea7b3).',
      );
      return;
    }

    const formattedTarget = getAddress(customSelectorTarget);

    setModalAction({
      type: 'selector',
      target: formattedTarget as `0x${string}`,
      selector: cleanSelector as `0x${string}`,
      approved: true,
      name: 'Contract',
      selectorName: customSelectorName || cleanSelector,
    });
  };

  const executeModalAction = () => {
    if (!modalAction) return;

    if (modalAction.type === 'target') {
      writeContract({
        address: state.paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'setApprovedTarget',
        args: [modalAction.target, modalAction.approved],
      });
    } else if (modalAction.type === 'selector') {
      writeContract({
        address: state.paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'setApprovedSelector',
        args: [modalAction.target, modalAction.selector, modalAction.approved],
      });
    }
  };

  const decodedError = writeError ? decodeTransactionError(writeError) : null;

  return (
    <div className="space-y-6">
      {/* Real-Time Transaction Feedback */}
      {isTxWaiting && txHash && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <span>Target whitelist modification broadcasted. Confirming on Base...</span>
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
            <span>Target approval updated successfully on-chain!</span>
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

      {/* Interactive Targets Table */}
      <TableCard
        title="Whitelisted Protocol Target Contracts & Selector Policies"
        subtitle="On-chain policy matrix determining which smart contract calls can be sponsored by UnifyVaultPaymaster"
        icon={ShieldCheck}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-card/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Protocol Contract Module</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Target Status</th>
                <th className="py-3 px-4">Approved Selectors</th>
                <th className="py-3 px-4 text-right">Target Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40 font-mono">
              {state.targets.map((target) => {
                const isExpanded = expandedTarget === target.address;
                const approvedSelectorsCount = target.selectors.filter((s) => s.isApproved).length;

                return (
                  <React.Fragment key={target.address}>
                    <tr className="hover:bg-card/40 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-bold text-foreground">
                        <div className="flex items-center space-x-2">
                          <span>{target.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <a
                          href={`${state.explorerBaseUrl}/address/${target.address}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-400 hover:text-purple-300 underline"
                        >
                          {target.address.slice(0, 6)}...{target.address.slice(-4)}
                        </a>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-muted-foreground">
                        <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-semibold text-foreground">
                          {target.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        {target.isApproved ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <span>APPROVED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <span>NOT APPROVED</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <button
                          type="button"
                          onClick={() => setExpandedTarget(isExpanded ? null : target.address)}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border-subtle text-[11px] font-semibold text-foreground transition-colors"
                        >
                          <Code2 className="w-3.5 h-3.5 text-purple-400" />
                          <span>
                            {approvedSelectorsCount} / {target.selectors.length} Selectors
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <button
                          type="button"
                          onClick={() => handleToggleTarget(target)}
                          disabled={!state.isPaymasterOwner || isWritePending || isTxWaiting}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all disabled:opacity-40 flex items-center space-x-1.5 ml-auto ${
                            target.isApproved
                              ? 'bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300'
                              : 'bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300'
                          }`}
                        >
                          {target.isApproved ? (
                            <>
                              <ToggleLeft className="w-4 h-4" />
                              <span>Revoke</span>
                            </>
                          ) : (
                            <>
                              <ToggleRight className="w-4 h-4" />
                              <span>Approve</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Selector Rows */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-card/20 p-4 border-b border-border-subtle">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-foreground">
                              <span>Configured Function Selectors for {target.name}</span>
                              <span className="text-[11px] text-muted-foreground font-normal">
                                Target must be approved AND selector must be approved for execution.
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {target.selectors.map((sel) => (
                                <div
                                  key={sel.selector}
                                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                    sel.isApproved
                                      ? 'bg-emerald-500/5 border-emerald-500/30'
                                      : 'bg-card/60 border-border-subtle'
                                  }`}
                                >
                                  <div className="space-y-0.5 min-w-0 pr-2">
                                    <div className="font-sans font-bold text-xs text-foreground truncate">
                                      {sel.name}()
                                    </div>
                                    <code className="text-[10px] text-purple-400 font-mono block truncate">
                                      {sel.selector}
                                    </code>
                                    <div
                                      className="text-[9px] text-muted-foreground font-mono truncate"
                                      title={sel.signature}
                                    >
                                      {sel.signature}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleSelector(
                                        target,
                                        sel.selector,
                                        sel.isApproved,
                                        sel.name,
                                      )
                                    }
                                    disabled={
                                      !state.isPaymasterOwner || isWritePending || isTxWaiting
                                    }
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 disabled:opacity-40 ${
                                      sel.isApproved
                                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300'
                                        : 'bg-muted text-muted-foreground border border-border-subtle hover:bg-emerald-500/20 hover:text-emerald-300'
                                    }`}
                                  >
                                    {sel.isApproved ? 'Enabled' : 'Disabled'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </TableCard>

      {/* Forms Grid: Custom Target & Custom Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1: Add Custom Target */}
        <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-3 border-b border-border-subtle/50 pb-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Approve New Target Contract
              </h3>
              <p className="text-xs text-muted-foreground">
                Whitelist an arbitrary smart contract target for Paymaster gas sponsorship
              </p>
            </div>
          </div>

          <form onSubmit={handleAddCustomTarget} className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold">Contract Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={customTarget}
                onChange={(e) => setCustomTarget(e.target.value)}
                disabled={!state.isPaymasterOwner}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>

            <button
              type="submit"
              disabled={!state.isPaymasterOwner || isWritePending || isTxWaiting || !customTarget}
              className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-glow disabled:opacity-40"
            >
              Approve Target Contract
            </button>
          </form>
        </div>

        {/* Form 2: Add Custom Selector */}
        <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-3 border-b border-border-subtle/50 pb-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Approve Function Selector
              </h3>
              <p className="text-xs text-muted-foreground">
                Whitelist a 4-byte function selector on an approved contract
              </p>
            </div>
          </div>

          <form onSubmit={handleAddCustomSelector} className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold">Target Contract Address</label>
              <select
                value={customSelectorTarget}
                onChange={(e) => setCustomSelectorTarget(e.target.value)}
                disabled={!state.isPaymasterOwner}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              >
                <option value="">Select an approved target or enter address below</option>
                {state.targets.map((t) => (
                  <option key={t.address} value={t.address}>
                    {t.name} ({t.address.slice(0, 6)}...{t.address.slice(-4)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Selector Hex (bytes4)</label>
                <input
                  type="text"
                  placeholder="0x095ea7b3"
                  value={customSelectorHex}
                  onChange={(e) => setCustomSelectorHex(e.target.value)}
                  disabled={!state.isPaymasterOwner}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Function Label</label>
                <input
                  type="text"
                  placeholder="approve()"
                  value={customSelectorName}
                  onChange={(e) => setCustomSelectorName(e.target.value)}
                  disabled={!state.isPaymasterOwner}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-card border border-border-subtle text-foreground text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={
                !state.isPaymasterOwner ||
                isWritePending ||
                isTxWaiting ||
                !customSelectorTarget ||
                !customSelectorHex
              }
              className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground text-xs font-bold transition-all disabled:opacity-40"
            >
              Approve Function Selector
            </button>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <PaymasterConfirmationModal
        isOpen={modalAction !== null}
        onClose={() => setModalAction(null)}
        onConfirm={executeModalAction}
        isPending={isWritePending || isTxWaiting}
        title={
          modalAction?.type === 'target'
            ? `${modalAction.approved ? 'Approve' : 'Revoke'} Target Contract`
            : `${modalAction?.approved ? 'Approve' : 'Revoke'} Function Selector`
        }
        description={`Modify Paymaster sponsorship whitelist on UnifyVaultPaymaster (${state.paymasterAddress.slice(0, 6)}...${state.paymasterAddress.slice(-4)})`}
        actionLabel={modalAction?.approved ? 'Confirm Approval' : 'Confirm Revocation'}
        actionColor={modalAction?.approved ? 'emerald' : 'rose'}
        warningMessage={
          !modalAction?.approved
            ? 'WARNING: Revoking this target or selector will immediately prevent users from sponsoring transactions targeting this contract method.'
            : undefined
        }
        details={[
          { label: 'Contract Target', value: modalAction?.name || 'Protocol Contract' },
          { label: 'Target Address', value: modalAction?.target || '' },
          {
            label: 'Solidity Function Call',
            value: (
              <code className="text-purple-400 font-mono">
                {modalAction?.type === 'target'
                  ? `setApprovedTarget(${modalAction.target}, ${modalAction.approved})`
                  : modalAction?.type === 'selector'
                    ? `setApprovedSelector(${modalAction.target}, ${modalAction.selector}, ${modalAction.approved})`
                    : ''}
              </code>
            ),
          },
          { label: 'Required Permission', value: 'Paymaster Owner (onlyOwner)' },
        ]}
      />
    </div>
  );
}
