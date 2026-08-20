'use client';

import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { LIQUIDITY_MANAGER_ABI } from '../../lib/contracts/liquidity';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { LiquidityConfirmationModal } from './LiquidityConfirmationModal';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
} from 'lucide-react';
import { AssetLiquidityStatus } from '../../hooks/useLiquidityAdmin';

export interface LiquidityOperationsSectionProps {
  liquidityManagerAddress: `0x${string}`;
  explorerBaseUrl: string;
  isGovernanceAdmin: boolean;
  assetStatuses: AssetLiquidityStatus[];
  onRefresh: () => void;
}

export function LiquidityOperationsSection({
  liquidityManagerAddress,
  explorerBaseUrl,
  isGovernanceAdmin,
  assetStatuses,
  onRefresh,
}: LiquidityOperationsSectionProps) {
  const [selectedAssetIdx, setSelectedAssetIdx] = useState<number>(0);
  const currentAsset = assetStatuses[selectedAssetIdx] || assetStatuses[0];

  const [refillAmountInput, setRefillAmountInput] = useState<string>('');
  const [sweepAmountInput, setSweepAmountInput] = useState<string>('');
  const [syncOpInput, setSyncOpInput] = useState<string>('');
  const [syncResInput, setSyncResInput] = useState<string>('');

  const [activeModalAction, setActiveModalAction] = useState<
    'refill' | 'sweep' | 'syncBalances' | 'checkLiquidity' | null
  >(null);
  const [validationError, setValidationError] = useState<string | null>(null);

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

  const handleInitiateRefill = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!refillAmountInput || isNaN(Number(refillAmountInput)) || Number(refillAmountInput) <= 0) {
      setValidationError('Please enter a valid positive refill amount.');
      return;
    }

    const requestedWei = parseUnits(refillAmountInput, currentAsset.decimals);
    if (requestedWei > currentAsset.reserveBalance) {
      setValidationError(
        `Requested refill exceeds available reserve balance (${currentAsset.reserveBalanceFormatted}).`,
      );
      return;
    }

    setActiveModalAction('refill');
  };

  const handleInitiateSweep = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!sweepAmountInput || isNaN(Number(sweepAmountInput)) || Number(sweepAmountInput) <= 0) {
      setValidationError('Please enter a valid positive sweep amount.');
      return;
    }

    const requestedWei = parseUnits(sweepAmountInput, currentAsset.decimals);
    if (requestedWei > currentAsset.operationalBalance) {
      setValidationError(
        `Requested sweep exceeds available operational balance (${currentAsset.operationalBalanceFormatted}).`,
      );
      return;
    }

    setActiveModalAction('sweep');
  };

  const handleInitiateSyncBalances = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (
      !syncOpInput ||
      isNaN(Number(syncOpInput)) ||
      Number(syncOpInput) < 0 ||
      !syncResInput ||
      isNaN(Number(syncResInput)) ||
      Number(syncResInput) < 0
    ) {
      setValidationError(
        'Please enter valid non-negative balances for operational and reserve liquidity.',
      );
      return;
    }

    setActiveModalAction('syncBalances');
  };

  const handleInitiateCheck = () => {
    setValidationError(null);
    resetWrite();
    setActiveModalAction('checkLiquidity');
  };

  const executeAction = () => {
    if (!currentAsset) return;

    if (activeModalAction === 'refill') {
      const amountWei = parseUnits(refillAmountInput, currentAsset.decimals);
      writeContract({
        address: liquidityManagerAddress,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'refillOperationalLiquidity',
        args: [currentAsset.address, amountWei],
      });
    } else if (activeModalAction === 'sweep') {
      const amountWei = parseUnits(sweepAmountInput, currentAsset.decimals);
      writeContract({
        address: liquidityManagerAddress,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'sweepReserveLiquidity',
        args: [currentAsset.address, amountWei],
      });
    } else if (activeModalAction === 'syncBalances') {
      const opWei = parseUnits(syncOpInput, currentAsset.decimals);
      const resWei = parseUnits(syncResInput, currentAsset.decimals);
      writeContract({
        address: liquidityManagerAddress,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'setLiquidityBalances',
        args: [currentAsset.address, opWei, resWei],
      });
    } else if (activeModalAction === 'checkLiquidity') {
      writeContract({
        address: liquidityManagerAddress,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'checkLiquidity',
        args: [currentAsset.address],
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
            <span>Liquidity transaction broadcasted. Confirming on Base...</span>
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
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Liquidity operation executed successfully on-chain!</span>
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

      {validationError && (
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center space-x-2.5 text-xs font-semibold shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle/50 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Operational Liquidity & Reserve Execution
              </h3>
              <p className="text-xs text-muted-foreground">
                Refill operational buffer from reserves, sweep excess to cold reserves, or sync
                accounting balances
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              isGovernanceAdmin
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            {isGovernanceAdmin ? 'GOVERNANCE AUTHORIZED' : 'UNAUTHORIZED'}
          </span>
        </div>

        {/* Target Asset Selector */}
        <div className="space-y-1.5 text-xs">
          <label className="text-muted-foreground font-semibold">Select Target Asset</label>
          <div className="grid grid-cols-3 gap-2">
            {assetStatuses.map((asset, idx) => (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => setSelectedAssetIdx(idx)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  selectedAssetIdx === idx
                    ? 'bg-purple-600 border-purple-500 text-white shadow-glow'
                    : 'bg-card border-border-subtle text-muted-foreground hover:text-foreground'
                }`}
              >
                {asset.symbol} ({asset.name})
              </button>
            ))}
          </div>
        </div>

        {/* Dual Actions Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Action 1: Refill Operational Buffer */}
          <div className="p-4 rounded-xl bg-card/60 border border-border-subtle space-y-3.5 text-xs">
            <div className="flex items-center space-x-2 font-bold text-amber-400">
              <ArrowDownCircle className="w-4 h-4" />
              <span>Refill Operational Liquidity</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Transfers accounting balance from Reserve to Operational. Available reserve:{' '}
              <strong className="text-foreground">{currentAsset?.reserveBalanceFormatted}</strong>.
            </p>

            <form onSubmit={handleInitiateRefill} className="space-y-3">
              <div className="space-y-1">
                <label className="text-muted-foreground font-semibold">Amount to Refill</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={refillAmountInput}
                  onChange={(e) => setRefillAmountInput(e.target.value)}
                  disabled={!isGovernanceAdmin}
                  className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <button
                type="submit"
                disabled={!isGovernanceAdmin || isWritePending || isTxWaiting}
                className="w-full min-h-[40px] py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span>Refill {currentAsset?.symbol} Operational Buffer</span>
              </button>
            </form>
          </div>

          {/* Action 2: Sweep Excess to Reserve */}
          <div className="p-4 rounded-xl bg-card/60 border border-border-subtle space-y-3.5 text-xs">
            <div className="flex items-center space-x-2 font-bold text-purple-400">
              <ArrowUpCircle className="w-4 h-4" />
              <span>Sweep Excess to Reserves</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Transfers accounting balance from Operational to Reserve. Available operational:{' '}
              <strong className="text-foreground">
                {currentAsset?.operationalBalanceFormatted}
              </strong>
              .
            </p>

            <form onSubmit={handleInitiateSweep} className="space-y-3">
              <div className="space-y-1">
                <label className="text-muted-foreground font-semibold">Amount to Sweep</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={sweepAmountInput}
                  onChange={(e) => setSweepAmountInput(e.target.value)}
                  disabled={!isGovernanceAdmin}
                  className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <button
                type="submit"
                disabled={!isGovernanceAdmin || isWritePending || isTxWaiting}
                className="w-full min-h-[40px] py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>Sweep {currentAsset?.symbol} to Reserves</span>
              </button>
            </form>
          </div>
        </div>

        {/* Action 3: Direct Balance Synchronization */}
        <div className="p-4 rounded-xl bg-card/60 border border-border-subtle space-y-3 text-xs border-t border-border-subtle/50 pt-4">
          <div className="flex items-center space-x-2 font-bold text-foreground">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Direct Accounting Balance Override (GOVERNANCE_ROLE)</span>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Synchronizes the recorded operational and reserve accounting quantities on
            LiquidityManager with CustodyVault vaults.
          </p>

          <form onSubmit={handleInitiateSyncBalances} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground font-semibold">
                  Operational Balance ({currentAsset?.symbol})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={syncOpInput}
                  onChange={(e) => setSyncOpInput(e.target.value)}
                  disabled={!isGovernanceAdmin}
                  className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-semibold">
                  Reserve Balance ({currentAsset?.symbol})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={syncResInput}
                  onChange={(e) => setSyncResInput(e.target.value)}
                  disabled={!isGovernanceAdmin}
                  className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="submit"
                disabled={!isGovernanceAdmin || isWritePending || isTxWaiting}
                className="flex-1 min-h-[42px] py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Override & Set Liquidity Balances</span>
              </button>

              <button
                type="button"
                onClick={handleInitiateCheck}
                disabled={isWritePending || isTxWaiting}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground font-bold transition-colors disabled:opacity-40 flex items-center space-x-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Trigger On-Chain Check (Emit Events)</span>
              </button>
            </div>
          </form>
        </div>

        {!isGovernanceAdmin && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
            <Lock className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Requires GOVERNANCE_ROLE on LiquidityManager to execute liquidity operations.
            </span>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <LiquidityConfirmationModal
        isOpen={activeModalAction !== null}
        onClose={() => setActiveModalAction(null)}
        onConfirm={() => {
          executeAction();
          setActiveModalAction(null);
        }}
        isPending={isWritePending || isTxWaiting}
        title={
          activeModalAction === 'refill'
            ? `Refill Operational Liquidity: ${currentAsset?.symbol}`
            : activeModalAction === 'sweep'
              ? `Sweep Excess Liquidity: ${currentAsset?.symbol}`
              : activeModalAction === 'checkLiquidity'
                ? `Trigger Check Liquidity: ${currentAsset?.symbol}`
                : `Override Balances: ${currentAsset?.symbol}`
        }
        description={`Execute state mutation on LiquidityManager (${liquidityManagerAddress.slice(0, 6)}...${liquidityManagerAddress.slice(-4)})`}
        actionLabel={
          activeModalAction === 'refill'
            ? 'Execute Refill'
            : activeModalAction === 'sweep'
              ? 'Execute Sweep'
              : 'Confirm'
        }
        actionColor={activeModalAction === 'refill' ? 'amber' : 'purple'}
        details={[
          { label: 'Target Module', value: 'LiquidityManager.sol' },
          { label: 'Target Asset', value: `${currentAsset?.name} (${currentAsset?.symbol})` },
          ...(activeModalAction === 'refill'
            ? [{ label: 'Refill Amount', value: `${refillAmountInput} ${currentAsset?.symbol}` }]
            : []),
          ...(activeModalAction === 'sweep'
            ? [{ label: 'Sweep Amount', value: `${sweepAmountInput} ${currentAsset?.symbol}` }]
            : []),
          ...(activeModalAction === 'syncBalances'
            ? [
                { label: 'New Operational', value: `${syncOpInput} ${currentAsset?.symbol}` },
                { label: 'New Reserve', value: `${syncResInput} ${currentAsset?.symbol}` },
              ]
            : []),
          { label: 'Required Role', value: 'GOVERNANCE_ROLE' },
        ]}
      />
    </div>
  );
}
