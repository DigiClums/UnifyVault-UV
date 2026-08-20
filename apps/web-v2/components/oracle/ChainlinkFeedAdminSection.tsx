'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress, getAddress } from 'viem';
import { CHAINLINK_ORACLE_PROVIDER_ABI } from '../../lib/contracts/oracle';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { OracleConfirmationModal } from './OracleConfirmationModal';
import {
  Link2,
  Trash2,
  Clock,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
} from 'lucide-react';
import { OracleAssetStatus } from '../../hooks/useOracleAdmin';

export interface ChainlinkFeedAdminSectionProps {
  chainlinkProviderAddress: `0x${string}`;
  explorerBaseUrl: string;
  isChainlinkAdmin: boolean;
  assetStatuses: OracleAssetStatus[];
  onRefresh: () => void;
}

export function ChainlinkFeedAdminSection({
  chainlinkProviderAddress,
  explorerBaseUrl,
  isChainlinkAdmin,
  assetStatuses,
  onRefresh,
}: ChainlinkFeedAdminSectionProps) {
  const [selectedAssetIdx, setSelectedAssetIdx] = useState<number>(0);
  const currentAsset = assetStatuses[selectedAssetIdx] || assetStatuses[0];

  const [feedAddress, setFeedAddress] = useState<string>('');
  const [heartbeatInput, setHeartbeatInput] = useState<string>('86400');
  const [enabledInput, setEnabledInput] = useState<boolean>(true);

  const [activeModalAction, setActiveModalAction] = useState<
    'registerOrUpdate' | 'setHeartbeat' | 'setEnabled' | 'remove' | null
  >(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (currentAsset) {
      setFeedAddress(
        currentAsset.chainlinkFeedAddress === '0x0000000000000000000000000000000000000000'
          ? ''
          : currentAsset.chainlinkFeedAddress || '',
      );
      setHeartbeatInput((currentAsset.chainlinkHeartbeat || 86400).toString());
      setEnabledInput(Boolean(currentAsset.chainlinkEnabled));
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

  const hasExistingFeed =
    currentAsset?.chainlinkFeedAddress &&
    currentAsset.chainlinkFeedAddress !== '0x0000000000000000000000000000000000000000';

  const handleInitiateRegisterOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!feedAddress || !isAddress(feedAddress)) {
      setValidationError('Please enter a valid 20-byte EVM address for Chainlink Aggregator.');
      return;
    }
    if (feedAddress === '0x0000000000000000000000000000000000000000') {
      setValidationError('Feed address cannot be zero address.');
      return;
    }

    const hb = Number(heartbeatInput);
    if (isNaN(hb) || hb <= 0) {
      setValidationError('Heartbeat timeout must be greater than zero seconds.');
      return;
    }

    setActiveModalAction('registerOrUpdate');
  };

  const handleInitiateToggleEnabled = () => {
    setValidationError(null);
    resetWrite();
    setActiveModalAction('setEnabled');
  };

  const handleInitiateRemove = () => {
    setValidationError(null);
    resetWrite();
    setActiveModalAction('remove');
  };

  const executeAction = () => {
    if (!currentAsset) return;

    const formattedFeed =
      feedAddress && isAddress(feedAddress)
        ? getAddress(feedAddress)
        : '0x0000000000000000000000000000000000000000';
    const hb = Number(heartbeatInput);

    if (activeModalAction === 'registerOrUpdate') {
      if (hasExistingFeed) {
        writeContract({
          address: chainlinkProviderAddress,
          abi: CHAINLINK_ORACLE_PROVIDER_ABI,
          functionName: 'updateFeed',
          args: [currentAsset.assetId, formattedFeed, hb],
        });
      } else {
        writeContract({
          address: chainlinkProviderAddress,
          abi: CHAINLINK_ORACLE_PROVIDER_ABI,
          functionName: 'registerFeed',
          args: [currentAsset.assetId, formattedFeed, hb],
        });
      }
    } else if (activeModalAction === 'setEnabled') {
      writeContract({
        address: chainlinkProviderAddress,
        abi: CHAINLINK_ORACLE_PROVIDER_ABI,
        functionName: 'setFeedEnabled',
        args: [currentAsset.assetId, !currentAsset.chainlinkEnabled],
      });
    } else if (activeModalAction === 'remove') {
      writeContract({
        address: chainlinkProviderAddress,
        abi: CHAINLINK_ORACLE_PROVIDER_ABI,
        functionName: 'removeFeed',
        args: [currentAsset.assetId],
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
            <span>Chainlink feed update broadcasted. Confirming on Base...</span>
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
            <span>Chainlink feed configuration updated successfully!</span>
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
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Chainlink Aggregator Provider Management
              </h3>
              <p className="text-xs text-muted-foreground">
                Register, update, and manage AggregatorV3 feed mappings on ChainlinkOracleProvider
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              isChainlinkAdmin
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            {isChainlinkAdmin ? 'GOVERNANCE AUTHORIZED' : 'UNAUTHORIZED'}
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

        {/* Form Container */}
        <form onSubmit={handleInitiateRegisterOrUpdate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold">
                Chainlink AggregatorV3 Address
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={feedAddress}
                onChange={(e) => setFeedAddress(e.target.value)}
                disabled={!isChainlinkAdmin}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold">
                Heartbeat Timeout (Seconds)
              </label>
              <input
                type="number"
                step="1"
                placeholder="86400"
                value={heartbeatInput}
                onChange={(e) => setHeartbeatInput(e.target.value)}
                disabled={!isChainlinkAdmin}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={!isChainlinkAdmin || isWritePending || isTxWaiting}
              className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <Link2 className="w-4 h-4" />
              <span>
                {hasExistingFeed
                  ? `Update ${currentAsset?.symbol} Feed`
                  : `Register ${currentAsset?.symbol} Feed`}
              </span>
            </button>

            {hasExistingFeed && (
              <>
                <button
                  type="button"
                  onClick={handleInitiateToggleEnabled}
                  disabled={!isChainlinkAdmin || isWritePending || isTxWaiting}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground font-bold transition-colors disabled:opacity-40 flex items-center space-x-2"
                >
                  {currentAsset.chainlinkEnabled ? (
                    <>
                      <ToggleLeft className="w-4 h-4 text-amber-400" />
                      <span>Disable Feed</span>
                    </>
                  ) : (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-400" />
                      <span>Enable Feed</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleInitiateRemove}
                  disabled={!isChainlinkAdmin || isWritePending || isTxWaiting}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-300 font-bold transition-colors disabled:opacity-40 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Remove Feed</span>
                </button>
              </>
            )}
          </div>
        </form>

        {!isChainlinkAdmin && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
            <Lock className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Requires GOVERNANCE_ROLE on ChainlinkOracleProvider to manage aggregator feeds.
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
          activeModalAction === 'remove'
            ? `Remove Chainlink Feed: ${currentAsset?.symbol}`
            : activeModalAction === 'setEnabled'
              ? `${currentAsset?.chainlinkEnabled ? 'Disable' : 'Enable'} Chainlink Feed: ${currentAsset?.symbol}`
              : `${hasExistingFeed ? 'Update' : 'Register'} Chainlink Feed: ${currentAsset?.symbol}`
        }
        description={`Execute mutation on ChainlinkOracleProvider (${chainlinkProviderAddress.slice(0, 6)}...${chainlinkProviderAddress.slice(-4)})`}
        actionLabel={
          activeModalAction === 'remove'
            ? 'Remove Feed'
            : activeModalAction === 'setEnabled'
              ? 'Toggle Status'
              : 'Save Feed'
        }
        actionColor={activeModalAction === 'remove' ? 'rose' : 'emerald'}
        warningMessage={
          activeModalAction === 'remove'
            ? 'WARNING: Removing this feed will cause OracleManager to fall back or fail pricing for this asset!'
            : undefined
        }
        details={[
          { label: 'Target Module', value: 'ChainlinkOracleProvider.sol' },
          { label: 'Target Asset', value: `${currentAsset?.name} (${currentAsset?.symbol})` },
          { label: 'Aggregator Address', value: feedAddress || 'None' },
          { label: 'Heartbeat Timeout', value: `${heartbeatInput} seconds` },
          { label: 'Required Role', value: 'GOVERNANCE_ROLE' },
        ]}
      />
    </div>
  );
}
