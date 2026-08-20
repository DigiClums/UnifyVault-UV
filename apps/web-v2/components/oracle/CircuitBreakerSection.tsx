'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { ORACLE_MANAGER_ABI } from '../../lib/contracts/oracle';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { OracleConfirmationModal } from './OracleConfirmationModal';
import {
  AlertTriangle,
  ShieldAlert,
  Zap,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
} from 'lucide-react';
import { OracleAssetStatus } from '../../hooks/useOracleAdmin';

export interface CircuitBreakerSectionProps {
  oracleManagerAddress: `0x${string}`;
  explorerBaseUrl: string;
  isGovernanceAdmin: boolean;
  assetStatuses: OracleAssetStatus[];
  onRefresh: () => void;
}

export function CircuitBreakerSection({
  oracleManagerAddress,
  explorerBaseUrl,
  isGovernanceAdmin,
  assetStatuses,
  onRefresh,
}: CircuitBreakerSectionProps) {
  const [selectedAssetIdx, setSelectedAssetIdx] = useState<number>(0);
  const [manualPriceInput, setManualPriceInput] = useState<string>('');
  const [deviationBpsInput, setDeviationBpsInput] = useState<string>('1000');

  const [activeModalAction, setActiveModalAction] = useState<'resetBreaker' | 'setMaxDev' | null>(
    null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const currentAsset = assetStatuses[selectedAssetIdx] || assetStatuses[0];

  useEffect(() => {
    if (currentAsset) {
      setDeviationBpsInput(currentAsset.maxDeviationBps.toString());
      if (currentAsset.price > 0n) {
        setManualPriceInput(formatEther(currentAsset.price));
      }
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

  const handleInitiateResetBreaker = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!manualPriceInput || isNaN(Number(manualPriceInput)) || Number(manualPriceInput) <= 0) {
      setValidationError(
        'Please enter a valid positive price in USD for circuit breaker override.',
      );
      return;
    }

    setActiveModalAction('resetBreaker');
  };

  const handleInitiateSetMaxDev = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    const dev = Number(deviationBpsInput);
    if (isNaN(dev) || dev <= 0 || dev > 5000) {
      setValidationError('Max deviation must be between 1 and 5,000 BPS (0.01% - 50.00%).');
      return;
    }

    setActiveModalAction('setMaxDev');
  };

  const executeAction = () => {
    if (!currentAsset) return;

    if (activeModalAction === 'resetBreaker') {
      const priceWei = parseEther(manualPriceInput);
      writeContract({
        address: oracleManagerAddress,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'resetCircuitBreaker',
        args: [currentAsset.assetId, priceWei],
      });
    } else if (activeModalAction === 'setMaxDev') {
      const devBig = BigInt(deviationBpsInput);
      writeContract({
        address: oracleManagerAddress,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'setMaxDeviationBps',
        args: [currentAsset.assetId, devBig],
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
            <span>Circuit breaker transaction broadcasted. Confirming on Base...</span>
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
            <span>Circuit breaker state updated successfully on-chain!</span>
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
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Institutional Circuit Breaker Controls
              </h3>
              <p className="text-xs text-muted-foreground">
                Emergency manual price resets and maximum allowed deviation thresholds for
                OracleManager
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
          <label className="text-muted-foreground font-semibold">Select Target Oracle Asset</label>
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

        {/* Dual Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Action 1: Reset Circuit Breaker */}
          <div className="p-4 rounded-xl bg-card/60 border border-border-subtle space-y-3.5 text-xs">
            <div className="flex items-center space-x-2 font-bold text-rose-400">
              <Zap className="w-4 h-4" />
              <span>Emergency Circuit Breaker Reset</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Manually sets <code className="text-foreground">lastValidPrice</code> in
              OracleManager. Use this if an oracle feed tripped due to extreme volatility or
              temporary network outage.
            </p>

            <form onSubmit={handleInitiateResetBreaker} className="space-y-3">
              <div className="space-y-1">
                <label className="text-muted-foreground font-semibold">
                  Manual Reference Price in USD ($)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 65000.00"
                  value={manualPriceInput}
                  onChange={(e) => setManualPriceInput(e.target.value)}
                  disabled={!isGovernanceAdmin}
                  className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <button
                type="submit"
                disabled={!isGovernanceAdmin || isWritePending || isTxWaiting}
                className="w-full min-h-[40px] py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Reset {currentAsset?.symbol} Circuit Breaker</span>
              </button>
            </form>
          </div>

          {/* Action 2: Max Deviation Threshold */}
          <div className="p-4 rounded-xl bg-card/60 border border-border-subtle space-y-3.5 text-xs">
            <div className="flex items-center space-x-2 font-bold text-purple-400">
              <Sliders className="w-4 h-4" />
              <span>Configure Max Price Deviation</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Defines the maximum round-over-round price fluctuation allowed before the circuit
              breaker trips (max cap: 5,000 BPS / 50.00%).
            </p>

            <form onSubmit={handleInitiateSetMaxDev} className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-muted-foreground font-semibold">Max Deviation (BPS)</label>
                  <span className="font-mono text-purple-400 font-bold">
                    {(Number(deviationBpsInput || 0) / 100).toFixed(2)}%
                  </span>
                </div>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="5000"
                  placeholder="1000"
                  value={deviationBpsInput}
                  onChange={(e) => setDeviationBpsInput(e.target.value)}
                  disabled={!isGovernanceAdmin}
                  className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <button
                type="submit"
                disabled={!isGovernanceAdmin || isWritePending || isTxWaiting}
                className="w-full min-h-[40px] py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Set {currentAsset?.symbol} Max Deviation</span>
              </button>
            </form>
          </div>
        </div>

        {!isGovernanceAdmin && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
            <Lock className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Requires GOVERNANCE_ROLE on OracleManager to execute circuit breaker modifications.
            </span>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <OracleConfirmationModal
        isOpen={activeModalAction !== null}
        onClose={() => setActiveModalAction(null)}
        onConfirm={() => {
          executeAction();
          setActiveModalAction(null);
        }}
        isPending={isWritePending || isTxWaiting}
        title={
          activeModalAction === 'resetBreaker'
            ? `Emergency Breaker Reset: ${currentAsset?.symbol}`
            : `Set Max Deviation: ${currentAsset?.symbol}`
        }
        description={`Execute mutation on OracleManager (${oracleManagerAddress.slice(0, 6)}...${oracleManagerAddress.slice(-4)})`}
        actionLabel={
          activeModalAction === 'resetBreaker' ? 'Override & Reset Breaker' : 'Update Deviation Cap'
        }
        actionColor={activeModalAction === 'resetBreaker' ? 'rose' : 'purple'}
        warningMessage={
          activeModalAction === 'resetBreaker'
            ? 'CRITICAL: Setting an inaccurate manual price will immediately distort UVBE token valuation and NAV calculations!'
            : 'Caution: Raising the deviation cap allows higher price volatility before the oracle triggers safe fallback mode.'
        }
        details={[
          { label: 'Target Module', value: 'OracleManager.sol' },
          { label: 'Target Asset', value: `${currentAsset?.name} (${currentAsset?.symbol})` },
          {
            label: 'Proposed Parameter',
            value:
              activeModalAction === 'resetBreaker'
                ? `$${manualPriceInput} USD`
                : `${deviationBpsInput} BPS (${(Number(deviationBpsInput || 0) / 100).toFixed(2)}%)`,
          },
          { label: 'Required Role', value: 'GOVERNANCE_ROLE' },
        ]}
      />
    </div>
  );
}
