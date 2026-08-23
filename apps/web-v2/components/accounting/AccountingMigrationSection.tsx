'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, isAddress, getAddress } from 'viem';
import { COST_BASIS_MANAGER_V2_ABI } from '../../lib/contracts/costBasis';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { AccountingConfirmationModal } from './AccountingConfirmationModal';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
  ArrowRight,
  ShieldAlert,
  Layers,
  User,
  FileSpreadsheet,
} from 'lucide-react';
import { UserAccountingState } from '../../hooks/useUserAccounting';

export interface AccountingMigrationSectionProps {
  state: UserAccountingState;
  onRefresh: () => void;
}

export interface ParsedMigrationItem {
  user: `0x${string}`;
  costBasisUSD: bigint;
  realizedPnLUSD: bigint;
  firstDepositTimestamp: bigint;
  rawBasisStr: string;
  rawPnLStr: string;
}

const MAX_CHUNK_SIZE = 50;

export function AccountingMigrationSection({ state, onRefresh }: AccountingMigrationSectionProps) {
  // Mode: single user vs batch chunked migration
  const [migrationMode, setMigrationMode] = useState<'single' | 'batch'>('single');

  // Single Form inputs
  const [targetUser, setTargetUser] = useState<string>(state.targetAddress || '');
  const [costBasisInput, setCostBasisInput] = useState<string>('');
  const [realizedPnLInput, setRealizedPnLInput] = useState<string>('');
  const [timestampInput, setTimestampInput] = useState<string>('');

  // Batch Form inputs
  const [batchRawCsv, setBatchRawCsv] = useState<string>('');
  const [batchItems, setBatchItems] = useState<ParsedMigrationItem[]>([]);
  const [activeBatchIndex, setActiveBatchIndex] = useState<number>(0);
  const [completedBatches, setCompletedBatches] = useState<number>(0);
  const [failedBatchIndex, setFailedBatchIndex] = useState<number | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync inspected address in single mode
  useEffect(() => {
    if (state.targetAddress) {
      setTargetUser(state.targetAddress);
      setCostBasisInput(formatEther(state.costBasisUSD));
      setRealizedPnLInput(
        state.realizedPnLUSD < 0n
          ? `-${formatEther(-state.realizedPnLUSD)}`
          : formatEther(state.realizedPnLUSD),
      );
      setTimestampInput(
        state.firstDepositTimestamp > 0n
          ? state.firstDepositTimestamp.toString()
          : Math.floor(Date.now() / 1000).toString(),
      );
    }
  }, [state.targetAddress, state.costBasisUSD, state.realizedPnLUSD, state.firstDepositTimestamp]);

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

  // Helper for signed parseEther
  const parseSignedEther = (valStr: string): bigint => {
    const trimmed = valStr.trim();
    if (trimmed.startsWith('-')) {
      const positivePart = trimmed.slice(1);
      return -parseEther(positivePart);
    }
    const positivePart = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
    return parseEther(positivePart);
  };

  // Split parsed batch items into max 50-user chunks
  const batchChunks = useMemo(() => {
    const chunks: ParsedMigrationItem[][] = [];
    for (let i = 0; i < batchItems.length; i += MAX_CHUNK_SIZE) {
      chunks.push(batchItems.slice(i, i + MAX_CHUNK_SIZE));
    }
    return chunks;
  }, [batchItems]);

  useEffect(() => {
    if (isTxSuccess) {
      onRefresh();
      if (migrationMode === 'batch' && batchChunks.length > 0) {
        setCompletedBatches((prev) => prev + 1);
        if (activeBatchIndex + 1 < batchChunks.length) {
          setActiveBatchIndex((prev) => prev + 1);
        }
      }
    }
  }, [isTxSuccess, onRefresh, migrationMode, batchChunks.length, activeBatchIndex]);

  useEffect(() => {
    if (writeError) {
      if (migrationMode === 'batch') {
        setFailedBatchIndex(activeBatchIndex);
      }
    }
  }, [writeError, migrationMode, activeBatchIndex]);

  // Parse CSV / multiline text for batch mode
  const handleParseCsv = (rawText: string) => {
    setBatchRawCsv(rawText);
    setValidationError(null);
    setFailedBatchIndex(null);
    setActiveBatchIndex(0);
    setCompletedBatches(0);

    if (!rawText.trim()) {
      setBatchItems([]);
      return;
    }

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const parsed: ParsedMigrationItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header if present
      if (
        i === 0 &&
        (line.toLowerCase().includes('address') || line.toLowerCase().includes('user'))
      ) {
        continue;
      }

      const parts = line.split(',').map((p) => p.trim());
      if (parts.length < 4) {
        setValidationError(
          `Line ${i + 1}: Must contain 4 comma-separated values: address, costBasisUSD, realizedPnLUSD, firstDepositTimestamp.`,
        );
        setBatchItems([]);
        return;
      }

      const [rawAddr, rawBasis, rawPnL, rawTimestamp] = parts;

      if (!isAddress(rawAddr) || rawAddr === '0x0000000000000000000000000000000000000000') {
        setValidationError(`Line ${i + 1}: Invalid 20-byte EVM address '${rawAddr}'.`);
        setBatchItems([]);
        return;
      }

      if (isNaN(Number(rawBasis)) || Number(rawBasis) < 0) {
        setValidationError(`Line ${i + 1}: Invalid non-negative cost basis '${rawBasis}'.`);
        setBatchItems([]);
        return;
      }

      if (isNaN(Number(rawPnL))) {
        setValidationError(`Line ${i + 1}: Invalid realized PnL '${rawPnL}'.`);
        setBatchItems([]);
        return;
      }

      if (isNaN(Number(rawTimestamp)) || Number(rawTimestamp) <= 0) {
        setValidationError(`Line ${i + 1}: Invalid Unix timestamp '${rawTimestamp}'.`);
        setBatchItems([]);
        return;
      }

      try {
        parsed.push({
          user: getAddress(rawAddr) as `0x${string}`,
          costBasisUSD: parseEther(rawBasis),
          realizedPnLUSD: parseSignedEther(rawPnL),
          firstDepositTimestamp: BigInt(rawTimestamp),
          rawBasisStr: rawBasis,
          rawPnLStr: rawPnL,
        });
      } catch (err) {
        setValidationError(`Line ${i + 1}: Failed to parse accounting values: ${String(err)}`);
        setBatchItems([]);
        return;
      }
    }

    setBatchItems(parsed);
  };

  const handleInitiateSingleMigration = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (!targetUser || !isAddress(targetUser)) {
      setValidationError('Please enter a valid 20-byte EVM address for target user.');
      return;
    }
    if (targetUser === '0x0000000000000000000000000000000000000000') {
      setValidationError('Cannot migrate accounting for zero address.');
      return;
    }

    if (!costBasisInput || isNaN(Number(costBasisInput)) || Number(costBasisInput) < 0) {
      setValidationError('Please enter a valid non-negative cost basis in USD.');
      return;
    }

    if (!realizedPnLInput || isNaN(Number(realizedPnLInput))) {
      setValidationError('Please enter a valid numeric realized PnL in USD (e.g. 0, 15.5, -10.2).');
      return;
    }

    if (!timestampInput || isNaN(Number(timestampInput)) || Number(timestampInput) < 0) {
      setValidationError('Please enter a valid Unix timestamp in seconds for first deposit.');
      return;
    }

    setIsModalOpen(true);
  };

  const handleInitiateBatchMigration = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    resetWrite();

    if (batchItems.length === 0) {
      setValidationError('Please paste or enter at least one valid CSV user row.');
      return;
    }

    if (failedBatchIndex !== null && failedBatchIndex === activeBatchIndex) {
      setValidationError(
        `Batch ${activeBatchIndex + 1} previously failed. Resolve error before continuing.`,
      );
      return;
    }

    setIsModalOpen(true);
  };

  const executeMigration = () => {
    try {
      if (migrationMode === 'single') {
        const checksummedUser = getAddress(targetUser);
        const basisWei = parseEther(costBasisInput);
        const realizedWei = parseSignedEther(realizedPnLInput);
        const timestampBig = BigInt(timestampInput);

        writeContract({
          address: state.costBasisManagerAddress,
          abi: COST_BASIS_MANAGER_V2_ABI,
          functionName: 'migrateAccounting',
          args: [checksummedUser, basisWei, realizedWei, timestampBig],
        });
      } else {
        const currentChunk = batchChunks[activeBatchIndex];
        if (!currentChunk || currentChunk.length === 0) {
          setValidationError('No remaining batch items to execute.');
          setIsModalOpen(false);
          return;
        }

        const targetItem = currentChunk[0];
        writeContract({
          address: state.costBasisManagerAddress,
          abi: COST_BASIS_MANAGER_V2_ABI,
          functionName: 'migrateAccounting',
          args: [
            targetItem.user,
            targetItem.costBasisUSD,
            targetItem.realizedPnLUSD,
            targetItem.firstDepositTimestamp,
          ],
        });
      }
    } catch {
      setValidationError('Failed to encode migration parameters.');
      setIsModalOpen(false);
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
            <span>
              {migrationMode === 'batch'
                ? `Executing Batch ${activeBatchIndex + 1} of ${batchChunks.length}... Confirming on Base...`
                : 'Accounting migration broadcasted. Confirming on Base...'}
            </span>
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
            <span>
              {migrationMode === 'batch'
                ? `Batch ${activeBatchIndex + (activeBatchIndex < batchChunks.length ? 0 : 1)} executed successfully!`
                : 'Accounting successfully migrated on-chain!'}
            </span>
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

      {failedBatchIndex !== null && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center space-x-2.5 text-xs font-semibold shadow-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>
            Batch {failedBatchIndex + 1} failed during execution. Safe stop triggered. Do not
            continue without investigating revert cause.
          </span>
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

      {/* Main Migration Form Card */}
      <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle/50 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Historical User Accounting Migration Tool
              </h3>
              <p className="text-xs text-muted-foreground">
                Set authoritative starting cost basis, realized PnL, and deposit timestamp in
                CostBasisManagerV2
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-card border border-border-subtle p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMigrationMode('single');
                  setValidationError(null);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  migrationMode === 'single'
                    ? 'bg-purple-600 text-white shadow-glow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Single User</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMigrationMode('batch');
                  setValidationError(null);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  migrationMode === 'batch'
                    ? 'bg-purple-600 text-white shadow-glow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Batch CSV (Chunked ≤50)</span>
              </button>
            </div>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                state.isGovernanceAdmin
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {state.isGovernanceAdmin ? 'GOVERNANCE AUTHORIZED' : 'UNAUTHORIZED'}
            </span>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1.5 leading-relaxed">
          <div className="flex items-center space-x-2 font-bold text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Strict One-Time Migration Invariant</span>
          </div>
          <p>
            CostBasisManagerV2 enforces{' '}
            <code className="text-foreground">
              require(!_accountingMigrated[user], &quot;Accounting already migrated&quot;)
            </code>
            . Once executed, this action permanently commits the starting accounting state on Base
            Sepolia.
          </p>
        </div>

        {migrationMode === 'single' ? (
          /* Single User Form */
          <form onSubmit={handleInitiateSingleMigration} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold">
                Target User Wallet Address
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                disabled={!state.isGovernanceAdmin}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Cost Basis USD ($)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="100.00"
                  value={costBasisInput}
                  onChange={(e) => setCostBasisInput(e.target.value)}
                  disabled={!state.isGovernanceAdmin}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">Realized PnL USD ($)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={realizedPnLInput}
                  onChange={(e) => setRealizedPnLInput(e.target.value)}
                  disabled={!state.isGovernanceAdmin}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted-foreground font-semibold">
                  First Deposit Unix Timestamp (s)
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="1720000000"
                  value={timestampInput}
                  onChange={(e) => setTimestampInput(e.target.value)}
                  disabled={!state.isGovernanceAdmin}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
                />
              </div>
            </div>

            {/* Comparison Preview */}
            <div className="p-4 rounded-xl bg-card/60 border border-border-subtle space-y-3">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Accounting Mutation Preview
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[10px] uppercase font-sans">
                    Cost Basis
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground line-through">
                      ${Number(formatEther(state.costBasisUSD)).toFixed(2)}
                    </span>
                    <ArrowRight className="w-3 h-3 text-purple-400" />
                    <span className="text-foreground font-bold">${costBasisInput || '0.00'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground text-[10px] uppercase font-sans">
                    Realized PnL
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground line-through">
                      $
                      {Number(
                        formatEther(
                          state.realizedPnLUSD < 0n ? -state.realizedPnLUSD : state.realizedPnLUSD,
                        ),
                      ).toFixed(2)}
                    </span>
                    <ArrowRight className="w-3 h-3 text-purple-400" />
                    <span className="text-foreground font-bold">${realizedPnLInput || '0.00'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground text-[10px] uppercase font-sans">
                    First Deposit Time
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground line-through">
                      {state.firstDepositTimestamp.toString()}
                    </span>
                    <ArrowRight className="w-3 h-3 text-purple-400" />
                    <span className="text-foreground font-bold">{timestampInput || '0'}</span>
                  </div>
                </div>
              </div>
            </div>

            {!state.isGovernanceAdmin && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Requires GOVERNANCE_ROLE to execute accounting migration.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!state.isGovernanceAdmin || isWritePending || isTxWaiting || !targetUser}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Migrate Accounting Record</span>
            </button>
          </form>
        ) : (
          /* Batch Chunked Mode Form */
          <form onSubmit={handleInitiateBatchMigration} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-muted-foreground font-semibold">
                  Batch Migration CSV Input (Max 50 users per transaction chunk)
                </label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Format: address, costBasisUSD, realizedPnLUSD, timestamp
                </span>
              </div>
              <textarea
                rows={6}
                placeholder={`0x1111111111111111111111111111111111111111, 100.50, 0, 1720000000\n0x2222222222222222222222222222222222222222, 250.00, 15.25, 1720050000`}
                value={batchRawCsv}
                onChange={(e) => handleParseCsv(e.target.value)}
                disabled={!state.isGovernanceAdmin}
                className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:border-purple-500 disabled:opacity-40"
              />
            </div>

            {/* Batch Chunks Summary */}
            {batchItems.length > 0 && (
              <div className="p-4 rounded-xl bg-card/60 border border-border-subtle space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle/50 pb-2">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-foreground">
                      {batchItems.length} Users Loaded &rarr; {batchChunks.length} Batch Chunk
                      {batchChunks.length > 1 ? 's' : ''} (≤{MAX_CHUNK_SIZE} users/tx)
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Completed: {completedBatches} / {batchChunks.length} Chunks
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-surface/60 border border-border-subtle/60">
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Total Accounts
                    </span>
                    <span className="font-mono font-bold text-foreground text-sm">
                      {batchItems.length}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface/60 border border-border-subtle/60">
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Current Active Chunk
                    </span>
                    <span className="font-mono font-bold text-purple-400 text-sm">
                      Batch {activeBatchIndex + 1} of {batchChunks.length} (
                      {batchChunks[activeBatchIndex]?.length || 0} users)
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface/60 border border-border-subtle/60">
                    <span className="text-muted-foreground text-[10px] uppercase block">
                      Execution Status
                    </span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {completedBatches === batchChunks.length && batchChunks.length > 0
                        ? 'All Completed'
                        : 'Ready'}
                    </span>
                  </div>
                </div>

                {/* Chunk Preview Table */}
                <div className="max-h-40 overflow-y-auto space-y-1 text-[11px] font-mono">
                  {batchChunks.map((chunk, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border flex items-center justify-between ${
                        idx === activeBatchIndex
                          ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                          : idx < completedBatches
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-card border-border-subtle text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold">Batch {idx + 1}:</span>
                        <span>
                          {chunk.length} users ({chunk[0].user.slice(0, 6)}... &ndash;{' '}
                          {chunk[chunk.length - 1].user.slice(0, 6)}...)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase">
                        {idx < completedBatches
                          ? 'SUCCESS'
                          : idx === activeBatchIndex
                            ? 'ACTIVE'
                            : 'PENDING'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!state.isGovernanceAdmin && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center space-x-2">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Requires GOVERNANCE_ROLE to execute batch migration.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                !state.isGovernanceAdmin || isWritePending || isTxWaiting || batchItems.length === 0
              }
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-glow disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>
                {batchChunks.length > 0
                  ? `Execute Batch ${activeBatchIndex + 1} of ${batchChunks.length}`
                  : 'Parse & Execute Batch Migration'}
              </span>
            </button>
          </form>
        )}
      </div>

      {/* Confirmation Modal */}
      <AccountingConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={executeMigration}
        isPending={isWritePending || isTxWaiting}
        title={
          migrationMode === 'single'
            ? 'Confirm Historical Accounting Migration'
            : `Confirm Batch Migration (Batch ${activeBatchIndex + 1} of ${batchChunks.length})`
        }
        description={
          migrationMode === 'single'
            ? `Permanently migrate starting accounting record for ${targetUser.slice(0, 6)}...${targetUser.slice(-4)}`
            : `Migrate accounting records for ${batchChunks[activeBatchIndex]?.length || 0} users in chunk ${activeBatchIndex + 1}`
        }
        actionLabel={
          migrationMode === 'single'
            ? 'Execute On-Chain Migration'
            : `Execute Batch ${activeBatchIndex + 1}`
        }
        actionColor="purple"
        warningMessage="WARNING: This action will overwrite historical accounting on CostBasisManagerV2. It can only be called once per account."
        details={
          migrationMode === 'single'
            ? [
                { label: 'Target Contract', value: 'CostBasisManagerV2.sol' },
                { label: 'Target Account', value: targetUser },
                { label: 'New Cost Basis', value: `$${costBasisInput} USD` },
                { label: 'New Realized PnL', value: `$${realizedPnLInput} USD` },
                { label: 'Deposit Timestamp', value: timestampInput },
                { label: 'Required Permission', value: 'GOVERNANCE_ROLE' },
              ]
            : [
                { label: 'Target Contract', value: 'CostBasisManagerV2.sol' },
                {
                  label: 'Batch Index',
                  value: `Batch ${activeBatchIndex + 1} of ${batchChunks.length}`,
                },
                {
                  label: 'Users in This Batch',
                  value: `${batchChunks[activeBatchIndex]?.length || 0} users (max 50/chunk)`,
                },
                { label: 'Total Users', value: `${batchItems.length} accounts` },
                { label: 'Required Permission', value: 'GOVERNANCE_ROLE' },
              ]
        }
      />
    </div>
  );
}
