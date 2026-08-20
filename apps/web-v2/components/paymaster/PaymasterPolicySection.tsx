'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, parseGwei, formatGwei, isAddress } from 'viem';
import { UNIFY_VAULT_PAYMASTER_ABI } from '../../lib/contracts/paymaster';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { PaymasterConfirmationModal } from './PaymasterConfirmationModal';
import { TableCard } from '../ui/TableCard';
import {
  Sliders,
  Key,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  ArrowDownToLine,
} from 'lucide-react';
import { PaymasterAdminState } from '../../hooks/usePaymasterAdmin';

export interface PaymasterPolicySectionProps {
  state: PaymasterAdminState;
  onRefresh: () => void;
}

export function PaymasterPolicySection({ state, onRefresh }: PaymasterPolicySectionProps) {
  // Form states
  const [maxCostEth, setMaxCostEth] = useState<string>('');
  const [maxFeeGwei, setMaxFeeGwei] = useState<string>('');
  const [cooldownSec, setCooldownSec] = useState<string>('');
  const [requireSignerToggle, setRequireSignerToggle] = useState<boolean>(false);
  const [newSigner, setNewSigner] = useState<string>('');

  // Deposit withdraw states
  const [withdrawDest, setWithdrawDest] = useState<string>('');
  const [withdrawAmountEth, setWithdrawAmountEth] = useState<string>('');

  // Modal action
  type PolicyModalAction =
    | {
        type: 'setPolicy';
        maxCost: bigint;
        maxFeeCap: bigint;
        cooldown: bigint;
        requireSigner: boolean;
        maxCostEth: string;
        maxFeeGwei: string;
      }
    | { type: 'setSigner'; signer: `0x${string}` }
    | { type: 'withdrawDeposit'; dest: `0x${string}`; amount: bigint; amountEth: string }
    | null;

  const [modalAction, setModalAction] = useState<PolicyModalAction>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync initial state values into form
  useEffect(() => {
    if (state.maxCostPerUserOp > 0n && !maxCostEth) {
      setMaxCostEth(formatEther(state.maxCostPerUserOp));
    }
    if (state.maxFeePerGasCap > 0n && !maxFeeGwei) {
      setMaxFeeGwei(formatGwei(state.maxFeePerGasCap));
    }
    if (state.userOpCooldown >= 0n && !cooldownSec) {
      setCooldownSec(state.userOpCooldown.toString());
    }
    setRequireSignerToggle(state.requireSigner);
  }, [
    state.maxCostPerUserOp,
    state.maxFeePerGasCap,
    state.userOpCooldown,
    state.requireSigner,
    maxCostEth,
    maxFeeGwei,
    cooldownSec,
  ]);

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

  // Handlers
  const handleInitiatePolicyUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!maxCostEth || isNaN(Number(maxCostEth)) || Number(maxCostEth) <= 0) {
      setValidationError('Please enter a valid max cost per UserOp in ETH.');
      return;
    }
    if (!maxFeeGwei || isNaN(Number(maxFeeGwei)) || Number(maxFeeGwei) < 0) {
      setValidationError('Please enter a valid max fee per gas cap in Gwei (0 = uncapped).');
      return;
    }
    if (!cooldownSec || isNaN(Number(cooldownSec)) || Number(cooldownSec) < 0) {
      setValidationError('Please enter a valid cooldown period in seconds (0 = disabled).');
      return;
    }

    if (requireSignerToggle) {
      const currentSigner = state.verifyingSigner;
      if (!currentSigner || currentSigner === '0x0000000000000000000000000000000000000000') {
        setValidationError(
          'Cannot enable requireSigner when verifyingSigner is not configured (0x0). Please set a verifying signer address first.',
        );
        return;
      }
    }

    try {
      const maxCostWei = parseEther(maxCostEth);
      const maxFeeWei = parseGwei(maxFeeGwei);
      const cooldownBig = BigInt(cooldownSec);

      setModalAction({
        type: 'setPolicy',
        maxCost: maxCostWei,
        maxFeeCap: maxFeeWei,
        cooldown: cooldownBig,
        requireSigner: requireSignerToggle,
        maxCostEth,
        maxFeeGwei,
      });
    } catch {
      setValidationError('Failed to parse policy configuration parameters.');
    }
  };

  const handleInitiateSetSigner = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!newSigner || !isAddress(newSigner)) {
      setValidationError('Please enter a valid 20-byte EVM address for verifying signer.');
      return;
    }

    if (newSigner === '0x0000000000000000000000000000000000000000' && state.requireSigner) {
      setValidationError(
        'Cannot set verifyingSigner to zero address while requireSigner is active. Disable requireSigner in policy first.',
      );
      return;
    }

    setModalAction({
      type: 'setSigner',
      signer: newSigner as `0x${string}`,
    });
  };

  const handleInitiateWithdrawDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!withdrawDest || !isAddress(withdrawDest)) {
      setValidationError(
        'Please enter a valid destination address for EntryPoint deposit withdrawal.',
      );
      return;
    }
    if (withdrawDest === '0x0000000000000000000000000000000000000000') {
      setValidationError('Cannot withdraw EntryPoint deposit to zero address.');
      return;
    }
    if (!withdrawAmountEth || isNaN(Number(withdrawAmountEth)) || Number(withdrawAmountEth) <= 0) {
      setValidationError('Please enter a valid positive withdrawal amount in ETH.');
      return;
    }

    try {
      const amountWei = parseEther(withdrawAmountEth);
      if (amountWei > state.entryPointDeposit) {
        setValidationError(
          `Amount exceeds EntryPoint deposit (${formatEther(state.entryPointDeposit)} ETH).`,
        );
        return;
      }

      setModalAction({
        type: 'withdrawDeposit',
        dest: withdrawDest as `0x${string}`,
        amount: amountWei,
        amountEth: withdrawAmountEth,
      });
    } catch {
      setValidationError('Failed to parse withdrawal amount.');
    }
  };

  const executeModalAction = () => {
    if (!modalAction) return;

    if (modalAction.type === 'setPolicy') {
      writeContract({
        address: state.paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'setPolicyConfig',
        args: [
          modalAction.maxCost,
          modalAction.maxFeeCap,
          modalAction.cooldown,
          modalAction.requireSigner,
        ],
      });
    } else if (modalAction.type === 'setSigner') {
      writeContract({
        address: state.paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'setVerifyingSigner',
        args: [modalAction.signer],
      });
    } else if (modalAction.type === 'withdrawDeposit') {
      writeContract({
        address: state.paymasterAddress,
        abi: UNIFY_VAULT_PAYMASTER_ABI,
        functionName: 'withdrawTo',
        args: [modalAction.dest, modalAction.amount],
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
            <span>Paymaster policy change broadcasted. Confirming on Base...</span>
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
            <span>Paymaster policy updated successfully on Base!</span>
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

      {/* Policy Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1: Policy Parameters */}
        <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-5 shadow-xl">
          <div className="flex items-center space-x-3 border-b border-border-subtle/50 pb-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Gas Sponsorship Limits & Cooldown
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure maximum gas cost per UserOp, fee cap, and sender cooldown period
              </p>
            </div>
          </div>

          <form onSubmit={handleInitiatePolicyUpdate} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-muted-foreground font-semibold">
                  Max Cost Per UserOp (ETH)
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Current:{' '}
                  <span className="font-mono text-foreground font-bold">
                    {formatEther(state.maxCostPerUserOp)} ETH
                  </span>
                </span>
              </div>
              <input
                type="number"
                step="any"
                placeholder="0.05"
                value={maxCostEth}
                onChange={(e) => setMaxCostEth(e.target.value)}
                disabled={!state.isPaymasterOwner}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-muted-foreground font-semibold">
                  Max Fee Per Gas Cap (Gwei)
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Current:{' '}
                  <span className="font-mono text-foreground font-bold">
                    {formatGwei(state.maxFeePerGasCap)} Gwei
                  </span>
                </span>
              </div>
              <input
                type="number"
                step="any"
                placeholder="100"
                value={maxFeeGwei}
                onChange={(e) => setMaxFeeGwei(e.target.value)}
                disabled={!state.isPaymasterOwner}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
              <p className="text-[10px] text-muted-foreground">
                Set 0 to allow uncapped gas price (rely on network market rates).
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-muted-foreground font-semibold">
                  Sender Anti-Spam Cooldown (Seconds)
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Current:{' '}
                  <span className="font-mono text-foreground font-bold">
                    {state.userOpCooldown.toString()}s
                  </span>
                </span>
              </div>
              <input
                type="number"
                step="1"
                placeholder="0"
                value={cooldownSec}
                onChange={(e) => setCooldownSec(e.target.value)}
                disabled={!state.isPaymasterOwner}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
              <p className="text-[10px] text-muted-foreground">
                Minimum elapsed seconds between sponsored operations per wallet address (0 =
                disabled).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-card/60 border border-border-subtle flex items-center justify-between">
              <div>
                <span className="font-semibold text-foreground block">
                  Mandatory Verification Signature
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Require valid ECDSA signature from verifying signer for sponsorship
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireSignerToggle}
                  onChange={(e) => setRequireSignerToggle(e.target.checked)}
                  disabled={!state.isPaymasterOwner}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {!state.isPaymasterOwner && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Requires Paymaster Owner permissions to update policy configuration.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!state.isPaymasterOwner || isWritePending || isTxWaiting}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-glow disabled:opacity-40"
            >
              Update Policy Configuration
            </button>
          </form>
        </div>

        {/* Form 2: Verifying Signer & Deposit Management */}
        <div className="space-y-6">
          {/* Signer Setup */}
          <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-5 shadow-xl">
            <div className="flex items-center space-x-3 border-b border-border-subtle/50 pb-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Verifying ECDSA Signer
                </h3>
                <p className="text-xs text-muted-foreground">
                  Designate authorized backend key for ECDSA paymaster signature verification
                </p>
              </div>
            </div>

            <form onSubmit={handleInitiateSetSigner} className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-muted-foreground font-semibold">New Signer Address</label>
                  <span className="text-[11px] text-muted-foreground">
                    Current:{' '}
                    <code className="text-foreground font-mono font-bold">
                      {state.verifyingSigner &&
                      state.verifyingSigner !== '0x0000000000000000000000000000000000000000'
                        ? `${state.verifyingSigner.slice(0, 6)}...${state.verifyingSigner.slice(-4)}`
                        : 'None (0x0)'}
                    </code>
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="0x..."
                  value={newSigner}
                  onChange={(e) => setNewSigner(e.target.value)}
                  disabled={!state.isPaymasterOwner}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <button
                type="submit"
                disabled={!state.isPaymasterOwner || isWritePending || isTxWaiting || !newSigner}
                className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground text-xs font-bold transition-all disabled:opacity-40"
              >
                Set Verifying Signer
              </button>
            </form>
          </div>

          {/* Deposit Withdrawal */}
          <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-5 shadow-xl">
            <div className="flex items-center space-x-3 border-b border-border-subtle/50 pb-3">
              <div className="p-2 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                <ArrowDownToLine className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Withdraw EntryPoint Deposit
                </h3>
                <p className="text-xs text-muted-foreground">
                  Withdraw excess gas deposit from EntryPoint v0.7 to designated treasury address
                </p>
              </div>
            </div>

            <form onSubmit={handleInitiateWithdrawDeposit} className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Destination Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={withdrawDest}
                  onChange={(e) => setWithdrawDest(e.target.value)}
                  disabled={!state.isPaymasterOwner}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-muted-foreground font-semibold">Amount (ETH)</label>
                  <span className="text-[11px] text-muted-foreground">
                    Deposit:{' '}
                    <span className="font-mono text-foreground font-bold">
                      {formatEther(state.entryPointDeposit)} ETH
                    </span>
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  placeholder="0.01"
                  value={withdrawAmountEth}
                  onChange={(e) => setWithdrawAmountEth(e.target.value)}
                  disabled={!state.isPaymasterOwner}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <button
                type="submit"
                disabled={
                  !state.isPaymasterOwner ||
                  isWritePending ||
                  isTxWaiting ||
                  !withdrawDest ||
                  !withdrawAmountEth
                }
                className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground text-xs font-bold transition-all disabled:opacity-40"
              >
                Withdraw Gas Deposit
              </button>
            </form>
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
          modalAction?.type === 'setPolicy'
            ? 'Confirm Policy Configuration Update'
            : modalAction?.type === 'setSigner'
              ? 'Confirm Verifying Signer Update'
              : 'Confirm EntryPoint Deposit Withdrawal'
        }
        description={`Execute state mutation on UnifyVaultPaymaster (${state.paymasterAddress.slice(0, 6)}...${state.paymasterAddress.slice(-4)})`}
        actionLabel="Confirm & Execute"
        actionColor={modalAction?.type === 'withdrawDeposit' ? 'blue' : 'purple'}
        details={[
          { label: 'Contract Target', value: 'UnifyVaultPaymaster.sol' },
          { label: 'Contract Address', value: state.paymasterAddress },
          {
            label: 'Solidity Function Call',
            value: (
              <code className="text-purple-400 font-mono">
                {modalAction?.type === 'setPolicy'
                  ? `setPolicyConfig(${modalAction.maxCostEth} ETH, ${modalAction.maxFeeGwei} Gwei, ${modalAction.cooldown}s, ${modalAction.requireSigner})`
                  : modalAction?.type === 'setSigner'
                    ? `setVerifyingSigner(${modalAction.signer})`
                    : modalAction?.type === 'withdrawDeposit'
                      ? `withdrawTo(${modalAction.dest}, ${modalAction.amountEth} ETH)`
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
