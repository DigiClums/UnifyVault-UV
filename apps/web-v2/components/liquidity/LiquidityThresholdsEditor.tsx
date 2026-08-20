'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LIQUIDITY_MANAGER_ABI } from '../../lib/contracts/liquidity';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { LiquidityConfirmationModal } from './LiquidityConfirmationModal';
import {
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
} from 'lucide-react';
import { AssetLiquidityStatus } from '../../hooks/useLiquidityAdmin';

export interface LiquidityThresholdsEditorProps {
  liquidityManagerAddress: `0x${string}`;
  explorerBaseUrl: string;
  isGovernanceAdmin: boolean;
  assetStatuses: AssetLiquidityStatus[];
  onRefresh: () => void;
}

export function LiquidityThresholdsEditor({
  liquidityManagerAddress,
  explorerBaseUrl,
  isGovernanceAdmin,
  assetStatuses,
  onRefresh,
}: LiquidityThresholdsEditorProps) {
  const [selectedAssetIdx, setSelectedAssetIdx] = useState<number>(0);
  const currentAsset = assetStatuses[selectedAssetIdx] || assetStatuses[0];

  const [targetBpsInput, setTargetBpsInput] = useState<string>('1000');
  const [refillBpsInput, setRefillBpsInput] = useState<string>('500');
  const [excessBpsInput, setExcessBpsInput] = useState<string>('1500');

  const [activeModalAction, setActiveModalAction] = useState<
    'setThresholds' | 'resetThresholds' | null
  >(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (currentAsset) {
      setTargetBpsInput(currentAsset.operationalTargetBps.toString());
      setRefillBpsInput(currentAsset.refillThresholdBps.toString());
      setExcessBpsInput(currentAsset.excessThresholdBps.toString());
    }
  }, [currentAsset]);

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

  const handleInitiateSet = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    const target = Number(targetBpsInput);
    const refill = Number(refillBpsInput);
    const excess = Number(excessBpsInput);

    if (isNaN(target) || isNaN(refill) || isNaN(excess)) {
      setValidationError('All threshold fields must be valid numeric values in BPS.');
      return;
    }

    if (refill > target || target > excess || excess > 10000) {
      setValidationError(
        'Thresholds invariant violated: Refill <= Target <= Excess <= 10,000 BPS.',
      );
      return;
    }

    setActiveModalAction('setThresholds');
  };

  const handleInitiateReset = () => {
    setValidationError(null);
    resetWrite();
    setActiveModalAction('resetThresholds');
  };

  const executeAction = () => {
    if (!currentAsset) return;

    if (activeModalAction === 'setThresholds') {
      const targetBig = BigInt(targetBpsInput);
      const refillBig = BigInt(refillBpsInput);
      const excessBig = BigInt(excessBpsInput);

      writeContract({
        address: liquidityManagerAddress,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'setThresholds',
        args: [currentAsset.address, targetBig, refillBig, excessBig],
      });
    } else if (activeModalAction === 'resetThresholds') {
      writeContract({
        address: liquidityManagerAddress,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'resetThresholds',
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
            <span>Liquidity threshold update broadcasted. Confirming on Base...</span>
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
            <span>Liquidity thresholds updated successfully on-chain!</span>
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
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Operational Liquidity Threshold Configuration
              </h3>
              <p className="text-xs text-muted-foreground">
                Set custom operational target, refill trigger, and reserve sweep percentages in BPS
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

        {/* Asset Selector */}
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

        {/* Threshold Form */}
        <form onSubmit={handleInitiateSet} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-muted-foreground font-semibold">Operational Target</label>
                <span className="font-mono text-purple-400 font-bold">
                  {(Number(targetBpsInput || 0) / 100).toFixed(2)}%
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="10000"
                placeholder="1000"
                value={targetBpsInput}
                onChange={(e) => setTargetBpsInput(e.target.value)}
                disabled={!isGovernanceAdmin}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-muted-foreground font-semibold">
                  Refill Trigger Threshold
                </label>
                <span className="font-mono text-amber-400 font-bold">
                  {(Number(refillBpsInput || 0) / 100).toFixed(2)}%
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="10000"
                placeholder="500"
                value={refillBpsInput}
                onChange={(e) => setRefillBpsInput(e.target.value)}
                disabled={!isGovernanceAdmin}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-muted-foreground font-semibold">
                  Excess Sweep Threshold
                </label>
                <span className="font-mono text-purple-400 font-bold">
                  {(Number(excessBpsInput || 0) / 100).toFixed(2)}%
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="10000"
                placeholder="1500"
                value={excessBpsInput}
                onChange={(e) => setExcessBpsInput(e.target.value)}
                disabled={!isGovernanceAdmin}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={!isGovernanceAdmin || isWritePending || isTxWaiting}
              className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <Sliders className="w-4 h-4" />
              <span>Save {currentAsset?.symbol} Custom Thresholds</span>
            </button>

            <button
              type="button"
              onClick={handleInitiateReset}
              disabled={!isGovernanceAdmin || isWritePending || isTxWaiting}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground font-bold transition-colors disabled:opacity-40 flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
              <span>Reset to Protocol Defaults (10% / 5% / 15%)</span>
            </button>
          </div>
        </form>

        {!isGovernanceAdmin && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
            <Lock className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Requires GOVERNANCE_ROLE on LiquidityManager to configure thresholds.</span>
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
          activeModalAction === 'resetThresholds'
            ? `Reset Thresholds: ${currentAsset?.symbol}`
            : `Update Thresholds: ${currentAsset?.symbol}`
        }
        description={`Execute mutation on LiquidityManager (${liquidityManagerAddress.slice(0, 6)}...${liquidityManagerAddress.slice(-4)})`}
        actionLabel={
          activeModalAction === 'resetThresholds' ? 'Reset to Defaults' : 'Apply Thresholds'
        }
        actionColor={activeModalAction === 'resetThresholds' ? 'rose' : 'purple'}
        details={[
          { label: 'Target Module', value: 'LiquidityManager.sol' },
          { label: 'Target Asset', value: `${currentAsset?.name} (${currentAsset?.symbol})` },
          {
            label: 'Operational Target',
            value:
              activeModalAction === 'resetThresholds'
                ? '1,000 BPS (10.00%)'
                : `${targetBpsInput} BPS (${(Number(targetBpsInput || 0) / 100).toFixed(2)}%)`,
          },
          {
            label: 'Refill Threshold',
            value:
              activeModalAction === 'resetThresholds'
                ? '500 BPS (5.00%)'
                : `${refillBpsInput} BPS (${(Number(refillBpsInput || 0) / 100).toFixed(2)}%)`,
          },
          {
            label: 'Excess Threshold',
            value:
              activeModalAction === 'resetThresholds'
                ? '1,500 BPS (15.00%)'
                : `${excessBpsInput} BPS (${(Number(excessBpsInput || 0) / 100).toFixed(2)}%)`,
          },
          { label: 'Required Role', value: 'GOVERNANCE_ROLE' },
        ]}
      />
    </div>
  );
}
