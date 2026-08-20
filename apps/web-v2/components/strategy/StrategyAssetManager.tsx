'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress, getAddress } from 'viem';
import { STRATEGY_MANAGER_ABI } from '../../lib/contracts/strategy';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { StrategyConfirmationModal } from './StrategyConfirmationModal';
import {
  Layers,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
} from 'lucide-react';
import { StrategyAssetWeight } from '../../hooks/useStrategyAdmin';

export interface StrategyAssetManagerProps {
  strategyManagerAddress: `0x${string}`;
  explorerBaseUrl: string;
  isGovernanceAdmin: boolean;
  currentWeights: StrategyAssetWeight[];
  onRefresh: () => void;
}

export function StrategyAssetManager({
  strategyManagerAddress,
  explorerBaseUrl,
  isGovernanceAdmin,
  currentWeights,
  onRefresh,
}: StrategyAssetManagerProps) {
  const [newAssetAddress, setNewAssetAddress] = useState<string>('');
  const [newAssetWeightBps, setNewAssetWeightBps] = useState<string>('');
  const [removeAssetAddress, setRemoveAssetAddress] = useState<string>('');

  const [activeModalAction, setActiveModalAction] = useState<'add' | 'remove' | null>(null);
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

  useEffect(() => {
    if (isTxSuccess) {
      onRefresh();
      setNewAssetAddress('');
      setNewAssetWeightBps('');
    }
  }, [isTxSuccess, onRefresh]);

  const handleInitiateAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!newAssetAddress || !isAddress(newAssetAddress)) {
      setValidationError('Please enter a valid 20-byte EVM address for the new asset.');
      return;
    }
    if (newAssetAddress === '0x0000000000000000000000000000000000000000') {
      setValidationError('Cannot add the zero address to the strategy.');
      return;
    }

    const isAlreadySupported = currentWeights.some(
      (w) => w.asset.toLowerCase() === newAssetAddress.toLowerCase(),
    );
    if (isAlreadySupported) {
      setValidationError('This asset is already supported by the strategy.');
      return;
    }

    const weight = parseInt(newAssetWeightBps, 10);
    if (isNaN(weight) || weight <= 0) {
      setValidationError('Weight must be a positive integer in BPS.');
      return;
    }

    // StrategyManager checks that sum equals exactly 10,000 BPS
    const currentSum = currentWeights.reduce((acc, w) => acc + Number(w.weightBps), 0);
    const projectedSum = currentSum + weight;
    if (projectedSum !== 10000) {
      setValidationError(
        `Adding this asset would result in total allocation of ${projectedSum} BPS. Total must equal exactly 10,000 BPS. Please rebalance existing weights or use atomic update.`,
      );
      return;
    }

    setActiveModalAction('add');
  };

  const handleInitiateRemove = (asset: `0x${string}`) => {
    setValidationError(null);
    resetWrite();
    setRemoveAssetAddress(asset);

    if (currentWeights.length <= 1) {
      setValidationError(
        'Cannot remove the last asset from the strategy (portfolio would be empty).',
      );
      return;
    }

    setActiveModalAction('remove');
  };

  const executeAction = () => {
    if (activeModalAction === 'add') {
      const formatted = getAddress(newAssetAddress);
      const weightBig = BigInt(newAssetWeightBps);
      writeContract({
        address: strategyManagerAddress,
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'addAsset',
        args: [formatted, weightBig],
      });
    } else if (activeModalAction === 'remove' && removeAssetAddress) {
      const formatted = getAddress(removeAssetAddress);
      writeContract({
        address: strategyManagerAddress,
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'removeAsset',
        args: [formatted],
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
            <span>Strategy asset modification broadcasted. Confirming on Base...</span>
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
            <span>Strategy portfolio assets updated successfully on-chain!</span>
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
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Strategy Portfolio Asset Management
              </h3>
              <p className="text-xs text-muted-foreground">
                Add or remove supported constituent tokens on StrategyManager
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

        {/* Current Assets List with Removal Option */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Active Portfolio Constituents ({currentWeights.length})
          </span>
          <div className="divide-y divide-border-subtle/40 rounded-xl bg-card/60 border border-border-subtle overflow-hidden">
            {currentWeights.map((w) => (
              <div key={w.asset} className="p-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-mono text-foreground font-bold">{w.asset}</span>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    Weight: {w.weightBps.toString()} BPS ({w.weightPercent.toFixed(2)}%)
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleInitiateRemove(w.asset)}
                  disabled={!isGovernanceAdmin || isWritePending || isTxWaiting}
                  className="p-2 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-500/20 transition-colors disabled:opacity-40"
                  title="Remove asset from strategy"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add Asset Form */}
        <div className="border-t border-border-subtle/50 pt-4 space-y-3">
          <span className="text-xs font-bold text-foreground block">
            Add New Asset to Strategy (GOVERNANCE_ROLE)
          </span>

          <form onSubmit={handleInitiateAdd} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-muted-foreground font-semibold">
                  New Asset Token Address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={newAssetAddress}
                  onChange={(e) => setNewAssetAddress(e.target.value)}
                  disabled={!isGovernanceAdmin}
                  className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-semibold">Weight in BPS</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  placeholder="e.g. 1000"
                  value={newAssetWeightBps}
                  onChange={(e) => setNewAssetWeightBps(e.target.value)}
                  disabled={!isGovernanceAdmin}
                  className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>
            </div>

            {!isGovernanceAdmin && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Requires GOVERNANCE_ROLE to add or remove assets.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!isGovernanceAdmin || isWritePending || isTxWaiting}
              className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Constituent Asset</span>
            </button>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <StrategyConfirmationModal
        isOpen={activeModalAction !== null}
        onClose={() => setActiveModalAction(null)}
        onConfirm={() => {
          executeAction();
          setActiveModalAction(null);
        }}
        isPending={isWritePending || isTxWaiting}
        title={activeModalAction === 'add' ? 'Add Strategy Asset' : 'Remove Strategy Asset'}
        description={`Execute mutation on StrategyManager (${strategyManagerAddress.slice(0, 6)}...${strategyManagerAddress.slice(-4)})`}
        actionLabel={activeModalAction === 'add' ? 'Add Asset' : 'Remove Asset'}
        actionColor={activeModalAction === 'add' ? 'purple' : 'rose'}
        warningMessage={
          activeModalAction === 'remove'
            ? 'WARNING: Removing an asset will cause the strategy to reject it during subsequent portfolio calculations unless total allocation equals 10,000 BPS.'
            : undefined
        }
        details={[
          { label: 'Target Module', value: 'StrategyManager.sol' },
          {
            label: 'Asset',
            value: activeModalAction === 'add' ? newAssetAddress : removeAssetAddress,
          },
          ...(activeModalAction === 'add'
            ? [
                {
                  label: 'Proposed Weight',
                  value: `${newAssetWeightBps} BPS (${(Number(newAssetWeightBps || 0) / 100).toFixed(2)}%)`,
                },
              ]
            : []),
          { label: 'Required Role', value: 'GOVERNANCE_ROLE' },
        ]}
      />
    </div>
  );
}
