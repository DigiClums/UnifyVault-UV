'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress, getAddress } from 'viem';
import { ORACLE_MANAGER_ABI } from '../../lib/contracts/oracle';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { OracleConfirmationModal } from './OracleConfirmationModal';
import {
  Settings,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
} from 'lucide-react';
import { OracleAssetStatus } from '../../hooks/useOracleAdmin';

export interface OracleConfigSectionProps {
  oracleManagerAddress: `0x${string}`;
  explorerBaseUrl: string;
  isGovernanceAdmin: boolean;
  assetStatuses: OracleAssetStatus[];
  onRefresh: () => void;
}

export function OracleConfigSection({
  oracleManagerAddress,
  explorerBaseUrl,
  isGovernanceAdmin,
  assetStatuses,
  onRefresh,
}: OracleConfigSectionProps) {
  const [selectedAssetIdx, setSelectedAssetIdx] = useState<number>(0);
  const currentAsset = assetStatuses[selectedAssetIdx] || assetStatuses[0];

  const [primaryProvider, setPrimaryProvider] = useState<string>('');
  const [fallbackProvider, setFallbackProvider] = useState<string>('');
  const [heartbeatInput, setHeartbeatInput] = useState<string>('86400');
  const [enabledInput, setEnabledInput] = useState<boolean>(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (currentAsset) {
      setPrimaryProvider(currentAsset.primaryProvider);
      setFallbackProvider(
        currentAsset.fallbackProvider === '0x0000000000000000000000000000000000000000'
          ? ''
          : currentAsset.fallbackProvider,
      );
      setHeartbeatInput(currentAsset.heartbeat.toString());
      setEnabledInput(currentAsset.enabled);
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

  const handleInitiateConfigure = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!primaryProvider || !isAddress(primaryProvider)) {
      setValidationError('Please enter a valid 20-byte EVM address for Primary Provider.');
      return;
    }
    if (primaryProvider === '0x0000000000000000000000000000000000000000') {
      setValidationError('Primary provider cannot be the zero address.');
      return;
    }

    if (fallbackProvider && !isAddress(fallbackProvider)) {
      setValidationError('Fallback provider address is invalid. Leave blank to disable.');
      return;
    }

    const hb = Number(heartbeatInput);
    if (isNaN(hb) || hb <= 0) {
      setValidationError('Heartbeat interval must be a positive number in seconds.');
      return;
    }

    setIsModalOpen(true);
  };

  const executeConfigure = () => {
    if (!currentAsset) return;

    const primaryFormatted = getAddress(primaryProvider);
    const fallbackFormatted =
      fallbackProvider && isAddress(fallbackProvider)
        ? getAddress(fallbackProvider)
        : '0x0000000000000000000000000000000000000000';
    const hb = Number(heartbeatInput);

    writeContract({
      address: oracleManagerAddress,
      abi: ORACLE_MANAGER_ABI,
      functionName: 'configureAsset',
      args: [currentAsset.assetId, primaryFormatted, fallbackFormatted, hb, enabledInput],
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
            <span>Asset configuration update broadcasted. Confirming on Base...</span>
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
            <span>Oracle routing configuration saved successfully!</span>
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

      {/* Main Form Container */}
      <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle/50 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Oracle Routing & Provider Configuration
              </h3>
              <p className="text-xs text-muted-foreground">
                Set primary and fallback adapters, heartbeat timeouts, and enable status in
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

        {/* Asset Selector */}
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

        {/* Configuration Form */}
        <form onSubmit={handleInitiateConfigure} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold">
                Primary Provider Address
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={primaryProvider}
                onChange={(e) => setPrimaryProvider(e.target.value)}
                disabled={!isGovernanceAdmin}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold">
                Fallback Provider Address (Optional)
              </label>
              <input
                type="text"
                placeholder="0x... or leave empty"
                value={fallbackProvider}
                onChange={(e) => setFallbackProvider(e.target.value)}
                disabled={!isGovernanceAdmin}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold">
                Heartbeat Interval (Seconds)
              </label>
              <input
                type="number"
                step="1"
                placeholder="86400"
                value={heartbeatInput}
                onChange={(e) => setHeartbeatInput(e.target.value)}
                disabled={!isGovernanceAdmin}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold">Asset Routing Status</label>
              <select
                value={enabledInput ? 'true' : 'false'}
                onChange={(e) => setEnabledInput(e.target.value === 'true')}
                disabled={!isGovernanceAdmin}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              >
                <option value="true">Routing Status: ENABLED</option>
                <option value="false">Routing Status: DISABLED</option>
              </select>
            </div>
          </div>

          {!isGovernanceAdmin && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
              <Lock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Requires GOVERNANCE_ROLE to update oracle configurations.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isGovernanceAdmin || isWritePending || isTxWaiting}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Save {currentAsset?.symbol} Routing Configuration</span>
          </button>
        </form>
      </div>

      {/* Confirmation Modal */}
      <OracleConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => {
          executeConfigure();
          setIsModalOpen(false);
        }}
        isPending={isWritePending || isTxWaiting}
        title={`Configure Oracle Routing: ${currentAsset?.symbol}`}
        description={`Execute configureAsset on OracleManager (${oracleManagerAddress.slice(0, 6)}...${oracleManagerAddress.slice(-4)})`}
        actionLabel="Apply Configuration"
        actionColor="purple"
        details={[
          { label: 'Target Asset', value: `${currentAsset?.name} (${currentAsset?.symbol})` },
          { label: 'Primary Provider', value: primaryProvider },
          {
            label: 'Fallback Provider',
            value: fallbackProvider || 'None (Disabled)',
          },
          { label: 'Heartbeat Timeout', value: `${heartbeatInput} seconds` },
          { label: 'Enabled Status', value: enabledInput ? 'TRUE' : 'FALSE' },
          { label: 'Required Role', value: 'GOVERNANCE_ROLE' },
        ]}
      />
    </div>
  );
}
