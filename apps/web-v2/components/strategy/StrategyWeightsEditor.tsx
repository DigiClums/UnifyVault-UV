'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { STRATEGY_MANAGER_ABI } from '../../lib/contracts/strategy';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { StrategyConfirmationModal } from './StrategyConfirmationModal';
import {
  Sliders,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
  PieChart,
} from 'lucide-react';
import { StrategyAssetWeight } from '../../hooks/useStrategyAdmin';

export interface StrategyWeightsEditorProps {
  strategyManagerAddress: `0x${string}`;
  explorerBaseUrl: string;
  isGovernanceAdmin: boolean;
  currentWeights: StrategyAssetWeight[];
  onRefresh: () => void;
}

export function StrategyWeightsEditor({
  strategyManagerAddress,
  explorerBaseUrl,
  isGovernanceAdmin,
  currentWeights,
  onRefresh,
}: StrategyWeightsEditorProps) {
  const [proposedWeights, setProposedWeights] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const initMap: Record<string, string> = {};
    currentWeights.forEach((w) => {
      initMap[w.asset.toLowerCase()] = w.weightBps.toString();
    });
    setProposedWeights(initMap);
  }, [currentWeights]);

  const handleWeightChange = (asset: string, value: string) => {
    setProposedWeights((prev) => ({
      ...prev,
      [asset.toLowerCase()]: value,
    }));
  };

  const totalBps = currentWeights.reduce((acc, w) => {
    const val = parseInt(proposedWeights[w.asset.toLowerCase()] || '0', 10);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const isValidTotal = totalBps === 10000;

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

  const handleInitiateUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!isValidTotal) {
      setValidationError('Target weights must sum to exactly 10,000 basis points (100.00%).');
      return;
    }

    for (const w of currentWeights) {
      const val = parseInt(proposedWeights[w.asset.toLowerCase()] || '0', 10);
      if (isNaN(val) || val <= 0) {
        setValidationError(`Weight for ${w.asset} must be greater than zero.`);
        return;
      }
    }

    setIsModalOpen(true);
  };

  const executeUpdate = () => {
    const assets = currentWeights.map((w) => w.asset);
    const weights = currentWeights.map((w) =>
      BigInt(parseInt(proposedWeights[w.asset.toLowerCase()] || '0', 10)),
    );

    writeContract({
      address: strategyManagerAddress,
      abi: STRATEGY_MANAGER_ABI,
      functionName: 'updateWeights',
      args: [assets, weights],
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
            <span>Strategy weights update broadcasted. Confirming on Base...</span>
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
            <span>Strategy target weights updated successfully on-chain!</span>
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
                Portfolio Target Weight Allocation Editor
              </h3>
              <p className="text-xs text-muted-foreground">
                Set target weight basis points (BPS) for crypto index constituents on
                StrategyManager
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

        {/* Weights Form */}
        <form onSubmit={handleInitiateUpdate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentWeights.map((w) => {
              const currentVal = parseInt(proposedWeights[w.asset.toLowerCase()] || '0', 10);
              const pct = (currentVal / 100).toFixed(2);
              return (
                <div
                  key={w.asset}
                  className="p-4 rounded-xl bg-card/60 border border-border-subtle space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-foreground font-bold truncate max-w-[200px]">
                      {w.asset}
                    </span>
                    <span className="font-mono text-purple-400 font-bold">{pct}%</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-semibold">
                      Target Weight (BPS)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      step="1"
                      value={proposedWeights[w.asset.toLowerCase()] || ''}
                      onChange={(e) => handleWeightChange(w.asset, e.target.value)}
                      disabled={!isGovernanceAdmin}
                      className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Invariant Tracker */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
              isValidTotal
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4" />
              <span>Total Strategy Allocation:</span>
            </div>
            <span className="font-bold text-sm">
              {totalBps.toLocaleString()} BPS ({(totalBps / 100).toFixed(2)}%)
              {isValidTotal ? ' — EXACT 10,000 BPS' : ' — MUST EQUAL 10,000 BPS'}
            </span>
          </div>

          {!isGovernanceAdmin && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
              <Lock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Requires GOVERNANCE_ROLE on StrategyManager to update weights.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isGovernanceAdmin || !isValidTotal || isWritePending || isTxWaiting}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
          >
            <Sliders className="w-4 h-4" />
            <span>Update Portfolio Target Weights</span>
          </button>
        </form>
      </div>

      {/* Confirmation Modal */}
      <StrategyConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => {
          executeUpdate();
          setIsModalOpen(false);
        }}
        isPending={isWritePending || isTxWaiting}
        title="Confirm Strategy Weight Allocation"
        description={`Execute updateWeights on StrategyManager (${strategyManagerAddress.slice(0, 6)}...${strategyManagerAddress.slice(-4)})`}
        actionLabel="Apply Target Weights"
        actionColor="purple"
        warningMessage="WARNING: Altering strategy target weights affects deposit allocation ratios and atomic DEX rebalancing dynamics across the entire protocol."
        details={[
          { label: 'Target Module', value: 'StrategyManager.sol' },
          { label: 'Total Weight Sum', value: `${totalBps} BPS (100.00%)` },
          {
            label: 'Proposed Breakdown',
            value: (
              <div className="space-y-0.5 text-right font-mono text-[11px]">
                {currentWeights.map((w) => (
                  <div key={w.asset}>
                    {w.asset.slice(0, 6)}...{w.asset.slice(-4)}:{' '}
                    {proposedWeights[w.asset.toLowerCase()]} BPS (
                    {(parseInt(proposedWeights[w.asset.toLowerCase()] || '0', 10) / 100).toFixed(2)}
                    %)
                  </div>
                ))}
              </div>
            ),
          },
          { label: 'Required Role', value: 'GOVERNANCE_ROLE' },
        ]}
      />
    </div>
  );
}
