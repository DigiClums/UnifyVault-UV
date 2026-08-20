'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem';
import { GAS_TREASURY_ABI } from '../../lib/contracts/paymaster';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { PaymasterConfirmationModal } from './PaymasterConfirmationModal';
import { TableCard } from '../ui/TableCard';
import { StatCard } from '../ui/StatCard';
import {
  Vault,
  Fuel,
  RefreshCw,
  UserCheck,
  Sliders,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { PaymasterAdminState } from '../../hooks/usePaymasterAdmin';

export interface GasTreasurySectionProps {
  state: PaymasterAdminState;
  onRefresh: () => void;
}

export function GasTreasurySection({ state, onRefresh }: GasTreasurySectionProps) {
  // Form states
  const [refillAmountEth, setRefillAmountEth] = useState<string>('0.05');
  const [newOperator, setNewOperator] = useState<string>('');
  const [maxPerTxEth, setMaxPerTxEth] = useState<string>('');
  const [dailyLimitEth, setDailyLimitEth] = useState<string>('');
  const [emergencyTo, setEmergencyTo] = useState<string>('');
  const [emergencyAmountEth, setEmergencyAmountEth] = useState<string>('');

  // Active modal action state
  type TreasuryModalAction =
    | { type: 'refill'; amount: bigint; amountEth: string }
    | { type: 'setOperator'; operator: `0x${string}` }
    | { type: 'setLimits'; maxPerTx: bigint; dailyLimit: bigint; maxEth: string; dailyEth: string }
    | { type: 'emergencyWithdraw'; to: `0x${string}`; amount: bigint; amountEth: string }
    | null;

  const [modalAction, setModalAction] = useState<TreasuryModalAction>(null);
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

  // Set initial limit values from state
  useEffect(() => {
    if (state.maxRefillPerTx > 0n && !maxPerTxEth) {
      setMaxPerTxEth(formatEther(state.maxRefillPerTx));
    }
    if (state.dailyRefillLimit > 0n && !dailyLimitEth) {
      setDailyLimitEth(formatEther(state.dailyRefillLimit));
    }
  }, [state.maxRefillPerTx, state.dailyRefillLimit, maxPerTxEth, dailyLimitEth]);

  // Handlers for initiating actions
  const handleInitiateRefill = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!refillAmountEth || isNaN(Number(refillAmountEth)) || Number(refillAmountEth) <= 0) {
      setValidationError('Please enter a valid positive refill amount in ETH.');
      return;
    }

    try {
      const amountWei = parseEther(refillAmountEth);
      if (amountWei > state.gasTreasuryEthBalance) {
        setValidationError(
          `Refill amount exceeds Gas Treasury balance (${formatEther(state.gasTreasuryEthBalance)} ETH).`,
        );
        return;
      }
      if (state.maxRefillPerTx > 0n && amountWei > state.maxRefillPerTx) {
        setValidationError(
          `Refill amount exceeds max per transaction limit (${formatEther(state.maxRefillPerTx)} ETH).`,
        );
        return;
      }
      if (state.dailyRefillLimit > 0n && amountWei > state.remainingDailyLimit) {
        setValidationError(
          `Refill amount exceeds remaining 24-hour daily allowance (${formatEther(state.remainingDailyLimit)} ETH).`,
        );
        return;
      }

      setModalAction({
        type: 'refill',
        amount: amountWei,
        amountEth: refillAmountEth,
      });
    } catch {
      setValidationError('Failed to parse refill amount.');
    }
  };

  const handleInitiateSetOperator = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!newOperator || !isAddress(newOperator)) {
      setValidationError('Please provide a valid 20-byte EVM address for the refill operator.');
      return;
    }

    setModalAction({
      type: 'setOperator',
      operator: newOperator as `0x${string}`,
    });
  };

  const handleInitiateSetLimits = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!maxPerTxEth || isNaN(Number(maxPerTxEth)) || Number(maxPerTxEth) <= 0) {
      setValidationError('Please enter a valid max refill per transaction in ETH.');
      return;
    }
    if (!dailyLimitEth || isNaN(Number(dailyLimitEth)) || Number(dailyLimitEth) <= 0) {
      setValidationError('Please enter a valid daily refill limit in ETH.');
      return;
    }

    try {
      const maxWei = parseEther(maxPerTxEth);
      const dailyWei = parseEther(dailyLimitEth);

      if (maxWei > dailyWei) {
        setValidationError(
          'Max refill per transaction cannot exceed the 24-hour daily refill limit.',
        );
        return;
      }

      setModalAction({
        type: 'setLimits',
        maxPerTx: maxWei,
        dailyLimit: dailyWei,
        maxEth: maxPerTxEth,
        dailyEth: dailyLimitEth,
      });
    } catch {
      setValidationError('Failed to parse limits values.');
    }
  };

  const handleInitiateEmergencyWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!emergencyTo || !isAddress(emergencyTo)) {
      setValidationError('Please enter a valid recipient address for emergency funds withdrawal.');
      return;
    }
    if (emergencyTo === '0x0000000000000000000000000000000000000000') {
      setValidationError('Cannot withdraw funds to zero address.');
      return;
    }
    if (
      !emergencyAmountEth ||
      isNaN(Number(emergencyAmountEth)) ||
      Number(emergencyAmountEth) <= 0
    ) {
      setValidationError('Please enter a valid withdrawal amount in ETH.');
      return;
    }

    try {
      const amountWei = parseEther(emergencyAmountEth);
      if (amountWei > state.gasTreasuryEthBalance) {
        setValidationError(
          `Withdrawal amount exceeds treasury balance (${formatEther(state.gasTreasuryEthBalance)} ETH).`,
        );
        return;
      }

      setModalAction({
        type: 'emergencyWithdraw',
        to: emergencyTo as `0x${string}`,
        amount: amountWei,
        amountEth: emergencyAmountEth,
      });
    } catch {
      setValidationError('Failed to parse emergency withdrawal amount.');
    }
  };

  // Execute confirmed modal action
  const executeModalAction = () => {
    if (!modalAction) return;

    if (modalAction.type === 'refill') {
      writeContract({
        address: state.gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'refillPaymaster',
        args: [modalAction.amount],
      });
    } else if (modalAction.type === 'setOperator') {
      writeContract({
        address: state.gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'setRefillOperator',
        args: [modalAction.operator],
      });
    } else if (modalAction.type === 'setLimits') {
      writeContract({
        address: state.gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'setLimits',
        args: [modalAction.maxPerTx, modalAction.dailyLimit],
      });
    } else if (modalAction.type === 'emergencyWithdraw') {
      writeContract({
        address: state.gasTreasuryAddress,
        abi: GAS_TREASURY_ABI,
        functionName: 'withdrawEmergency',
        args: [modalAction.to, modalAction.amount],
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
            <span>Gas Treasury transaction broadcasted. Confirming on Base...</span>
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
            <span>Gas Treasury action executed successfully on Base!</span>
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

      {/* Timelock Governance Ownership Banner */}
      {state.isGasTreasuryOwnedByTimelock && (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-start space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-foreground block">
                Gas Treasury is owned by TimelockController (
                {state.gasTreasuryOwner
                  ? `${state.gasTreasuryOwner.slice(0, 6)}...${state.gasTreasuryOwner.slice(-4)}`
                  : 'Timelock'}
                )
              </span>
              <span className="text-muted-foreground leading-relaxed">
                Configuration changes (limits, operator, and emergency withdrawals) require a
                governance proposal via Timelock.
              </span>
            </div>
          </div>
          <Link
            href="/admin/governance"
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-glow shrink-0 flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <span>Schedule via Timelock</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Gas Treasury Statistics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Max Refill Per Tx"
          value={`${formatEther(state.maxRefillPerTx)} ETH`}
          subtitle="Single transaction ceiling"
          icon={Sliders}
          glowColor="blue"
        />

        <StatCard
          title="24h Daily Limit"
          value={`${formatEther(state.dailyRefillLimit)} ETH`}
          subtitle={`Remaining: ${formatEther(state.remainingDailyLimit)} ETH`}
          icon={Vault}
          glowColor="emerald"
        />

        <StatCard
          title="Current 24h Total"
          value={`${formatEther(state.currentDayRefillTotal)} ETH`}
          subtitle="Rolling 24-hour total refilled"
          icon={RefreshCw}
          glowColor="purple"
        />

        <StatCard
          title="Refill Operator"
          value={
            state.refillOperator
              ? `${state.refillOperator.slice(0, 6)}...${state.refillOperator.slice(-4)}`
              : 'None'
          }
          subtitle={
            state.isRefillOperator ? 'Your wallet is operator' : 'Automated relayer authority'
          }
          icon={UserCheck}
          glowColor={state.isRefillOperator ? 'emerald' : 'cyan'}
        />
      </div>

      {/* Operations Grid: Refill & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1: Refill Paymaster Deposit */}
        <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-5 shadow-xl">
          <div className="flex items-center space-x-3 border-b border-border-subtle/50 pb-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Refill Paymaster EntryPoint Deposit
              </h3>
              <p className="text-xs text-muted-foreground">
                Transfer native ETH from Gas Treasury directly into EntryPoint deposit for
                UnifyVaultPaymaster
              </p>
            </div>
          </div>

          <form onSubmit={handleInitiateRefill} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-muted-foreground font-semibold">Refill Amount (ETH)</label>
                <span className="text-[11px] text-muted-foreground">
                  Available:{' '}
                  <span className="font-mono font-bold text-foreground">
                    {formatEther(state.gasTreasuryEthBalance)} ETH
                  </span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="0.05"
                  value={refillAmountEth}
                  onChange={(e) => setRefillAmountEth(e.target.value)}
                  disabled={!state.canRefill || state.isGasTreasuryPaused}
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-40"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setRefillAmountEth(
                        formatEther(
                          state.maxRefillPerTx > state.gasTreasuryEthBalance
                            ? state.gasTreasuryEthBalance
                            : state.maxRefillPerTx,
                        ),
                      )
                    }
                    className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[10px] font-mono font-bold text-purple-400"
                  >
                    MAX TX
                  </button>
                  <span className="text-xs font-bold text-muted-foreground">ETH</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card/60 border border-border-subtle space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Target Paymaster:</span>
                <code className="text-foreground font-mono">
                  {state.paymasterAddress.slice(0, 6)}...{state.paymasterAddress.slice(-4)}
                </code>
              </div>
              <div className="flex justify-between">
                <span>Max Allowed Per Tx:</span>
                <span className="text-foreground font-mono font-semibold">
                  {formatEther(state.maxRefillPerTx)} ETH
                </span>
              </div>
              <div className="flex justify-between">
                <span>Remaining 24h Allowance:</span>
                <span className="text-foreground font-mono font-semibold">
                  {formatEther(state.remainingDailyLimit)} ETH
                </span>
              </div>
            </div>

            {!state.canRefill && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Requires Gas Treasury Owner or designated Refill Operator.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                !state.canRefill || state.isGasTreasuryPaused || isWritePending || isTxWaiting
              }
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-glow disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Fuel className="w-4 h-4" />
              <span>Execute Refill to EntryPoint</span>
            </button>
          </form>
        </div>

        {/* Form 2: Configure Limits & Operator */}
        <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-5 shadow-xl">
          <div className="flex items-center space-x-3 border-b border-border-subtle/50 pb-3">
            <div className="p-2 rounded-xl bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Gas Treasury Policy Limits
              </h3>
              <p className="text-xs text-muted-foreground">
                Set per-transaction ceiling and 24-hour daily rolling refill limits (onlyOwner)
              </p>
            </div>
          </div>

          <form onSubmit={handleInitiateSetLimits} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">
                  Max Refill Per Tx (ETH)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.5"
                  value={maxPerTxEth}
                  onChange={(e) => setMaxPerTxEth(e.target.value)}
                  disabled={!state.isGasTreasuryOwner}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Daily 24h Limit (ETH)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="2.0"
                  value={dailyLimitEth}
                  onChange={(e) => setDailyLimitEth(e.target.value)}
                  disabled={!state.isGasTreasuryOwner}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!state.isGasTreasuryOwner || isWritePending || isTxWaiting}
              className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground text-xs font-bold transition-all disabled:opacity-40"
            >
              Update Treasury Limits
            </button>
          </form>

          {/* Operator Update */}
          <div className="border-t border-border-subtle/50 pt-4">
            <form onSubmit={handleInitiateSetOperator} className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">
                  Set Refill Operator Address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={newOperator}
                  onChange={(e) => setNewOperator(e.target.value)}
                  disabled={!state.isGasTreasuryOwner}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <button
                type="submit"
                disabled={
                  !state.isGasTreasuryOwner || isWritePending || isTxWaiting || !newOperator
                }
                className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground text-xs font-bold transition-all disabled:opacity-40"
              >
                Set Refill Operator
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
          modalAction?.type === 'refill'
            ? 'Confirm Paymaster Gas Refill'
            : modalAction?.type === 'setOperator'
              ? 'Confirm Refill Operator Update'
              : modalAction?.type === 'setLimits'
                ? 'Confirm Treasury Limits Update'
                : 'Confirm Emergency Funds Withdrawal'
        }
        description={`Execute state mutation on GasTreasury (${state.gasTreasuryAddress.slice(0, 6)}...${state.gasTreasuryAddress.slice(-4)})`}
        actionLabel={
          modalAction?.type === 'refill'
            ? 'Execute Refill'
            : modalAction?.type === 'emergencyWithdraw'
              ? 'Execute Emergency Drain'
              : 'Confirm Configuration'
        }
        actionColor={
          modalAction?.type === 'emergencyWithdraw'
            ? 'rose'
            : modalAction?.type === 'refill'
              ? 'purple'
              : 'blue'
        }
        warningMessage={
          modalAction?.type === 'emergencyWithdraw'
            ? 'WARNING: This will drain native ETH from the Gas Treasury reserve to the designated recipient address.'
            : modalAction?.type === 'refill'
              ? 'This will transfer native ETH from GasTreasury to the canonical EntryPoint deposit for UnifyVaultPaymaster.'
              : undefined
        }
        details={[
          { label: 'Contract Target', value: 'GasTreasury.sol' },
          { label: 'Contract Address', value: state.gasTreasuryAddress },
          {
            label: 'Solidity Function Call',
            value: (
              <code className="text-purple-400 font-mono">
                {modalAction?.type === 'refill'
                  ? `refillPaymaster(${modalAction.amountEth} ETH)`
                  : modalAction?.type === 'setOperator'
                    ? `setRefillOperator(${modalAction.operator})`
                    : modalAction?.type === 'setLimits'
                      ? `setLimits(${modalAction.maxEth} ETH, ${modalAction.dailyEth} ETH)`
                      : modalAction?.type === 'emergencyWithdraw'
                        ? `withdrawEmergency(${modalAction.to}, ${modalAction.amountEth} ETH)`
                        : ''}
              </code>
            ),
          },
          {
            label: 'Required Role',
            value:
              modalAction?.type === 'refill'
                ? 'Gas Treasury Owner or Refill Operator'
                : 'Gas Treasury Owner (onlyOwner)',
          },
        ]}
      />
    </div>
  );
}
