'use client';

import React, { useState, useEffect } from 'react';
import { useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress, keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';
import { UNIFY_VAULT_TIMELOCK_ABI, generateTimelockSalt } from '../../lib/contracts/governance';
import { decodeTransactionError } from '../../lib/utils/errorDecoder';
import { GovernanceConfirmationModal } from './GovernanceConfirmationModal';
import { StatCard } from '../ui/StatCard';
import {
  Clock,
  ShieldCheck,
  ShieldAlert,
  Play,
  XCircle,
  Calendar,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Hash,
  ArrowRight,
} from 'lucide-react';

export { generateTimelockSalt };

export interface TimelockConsoleProps {
  timelockAddress: `0x${string}`;
  minDelaySeconds: bigint;
  timelockDelayConstant: bigint;
  isProposer: boolean;
  isExecutor: boolean;
  isCanceller: boolean;
  explorerBaseUrl: string;
  onRefresh: () => void;
}

export function TimelockConsole({
  timelockAddress,
  minDelaySeconds,
  timelockDelayConstant,
  isProposer,
  isExecutor,
  isCanceller,
  explorerBaseUrl,
  onRefresh,
}: TimelockConsoleProps) {
  // Action Tab State
  const [activeTab, setActiveTab] = useState<'schedule' | 'execute' | 'cancel' | 'inspect'>(
    'schedule',
  );

  // Form Fields
  const [targetAddress, setTargetAddress] = useState<string>('');
  const [ethValue, setEthValue] = useState<string>('0');
  const [callData, setCallData] = useState<string>('0x');
  const [predecessor, setPredecessor] = useState<string>(
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  );
  const [salt, setSalt] = useState<string>(
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  );
  const [delaySeconds, setDelaySeconds] = useState<string>(
    minDelaySeconds ? minDelaySeconds.toString() : '172800',
  );
  const [inspectOperationId, setInspectOperationId] = useState<string>('');

  // Confirmation Modal
  const [confirmModalType, setConfirmModalType] = useState<
    'schedule' | 'execute' | 'cancel' | null
  >(null);

  // Computed Operation Hash
  const [computedOperationId, setComputedOperationId] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    if (isAddress(targetAddress) && callData.startsWith('0x')) {
      try {
        const val = BigInt(ethValue || '0');
        const predBytes =
          predecessor.startsWith('0x') && predecessor.length === 66
            ? (predecessor as `0x${string}`)
            : ('0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`);
        const saltBytes =
          salt.startsWith('0x') && salt.length === 66
            ? (salt as `0x${string}`)
            : ('0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`);

        const encoded = encodeAbiParameters(
          parseAbiParameters('address, uint256, bytes, bytes32, bytes32'),
          [targetAddress as `0x${string}`, val, callData as `0x${string}`, predBytes, saltBytes],
        );
        const hash = keccak256(encoded);
        setComputedOperationId(hash);
      } catch {
        setComputedOperationId(null);
      }
    } else {
      setComputedOperationId(null);
    }
  }, [targetAddress, ethValue, callData, predecessor, salt]);

  // Target query ID for status inspector
  const activeQueryId = (
    inspectOperationId.startsWith('0x') && inspectOperationId.length === 66
      ? inspectOperationId
      : computedOperationId
  ) as `0x${string}` | undefined;

  // Query on-chain operation status
  const { data: opStatusData, refetch: refetchOpStatus } = useReadContracts({
    contracts: activeQueryId
      ? [
          {
            address: timelockAddress,
            abi: UNIFY_VAULT_TIMELOCK_ABI,
            functionName: 'isOperation',
            args: [activeQueryId],
          },
          {
            address: timelockAddress,
            abi: UNIFY_VAULT_TIMELOCK_ABI,
            functionName: 'isOperationPending',
            args: [activeQueryId],
          },
          {
            address: timelockAddress,
            abi: UNIFY_VAULT_TIMELOCK_ABI,
            functionName: 'isOperationReady',
            args: [activeQueryId],
          },
          {
            address: timelockAddress,
            abi: UNIFY_VAULT_TIMELOCK_ABI,
            functionName: 'isOperationDone',
            args: [activeQueryId],
          },
          {
            address: timelockAddress,
            abi: UNIFY_VAULT_TIMELOCK_ABI,
            functionName: 'getTimestamp',
            args: [activeQueryId],
          },
          {
            address: timelockAddress,
            abi: UNIFY_VAULT_TIMELOCK_ABI,
            functionName: 'getOperationState',
            args: [activeQueryId],
          },
        ]
      : [],
    query: {
      enabled: !!activeQueryId,
      staleTime: 15_000,
    },
  });

  const isOp = Boolean(opStatusData?.[0]?.result);
  const isPending = Boolean(opStatusData?.[1]?.result);
  const isReady = Boolean(opStatusData?.[2]?.result);
  const isDone = Boolean(opStatusData?.[3]?.result);
  const timestamp = (opStatusData?.[4]?.result as bigint) || 0n;
  const opStateRaw = opStatusData?.[5]?.result as number | undefined;

  // Write contract hook
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
      refetchOpStatus();
      onRefresh();
    }
  }, [isTxSuccess, refetchOpStatus, onRefresh]);

  const handleOpenSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProposer || !isAddress(targetAddress)) return;
    resetWrite();
    setConfirmModalType('schedule');
  };

  const handleOpenExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isExecutor || !isAddress(targetAddress)) return;
    resetWrite();
    setConfirmModalType('execute');
  };

  const handleOpenCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCanceller || !activeQueryId) return;
    resetWrite();
    setConfirmModalType('cancel');
  };

  const executeTimelockAction = () => {
    if (confirmModalType === 'schedule') {
      const parsedDelay = BigInt(delaySeconds || '172800');
      const val = BigInt(ethValue || '0');
      writeContract({
        address: timelockAddress,
        abi: UNIFY_VAULT_TIMELOCK_ABI,
        functionName: 'schedule',
        args: [
          targetAddress as `0x${string}`,
          val,
          callData as `0x${string}`,
          predecessor as `0x${string}`,
          salt as `0x${string}`,
          parsedDelay,
        ],
      });
    } else if (confirmModalType === 'execute') {
      const val = BigInt(ethValue || '0');
      writeContract({
        address: timelockAddress,
        abi: UNIFY_VAULT_TIMELOCK_ABI,
        functionName: 'execute',
        args: [
          targetAddress as `0x${string}`,
          val,
          callData as `0x${string}`,
          predecessor as `0x${string}`,
          salt as `0x${string}`,
        ],
        value: val,
      });
    } else if (confirmModalType === 'cancel') {
      if (!activeQueryId) return;
      writeContract({
        address: timelockAddress,
        abi: UNIFY_VAULT_TIMELOCK_ABI,
        functionName: 'cancel',
        args: [activeQueryId],
      });
    }
  };

  const decodedError = writeError ? decodeTransactionError(writeError) : null;

  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  const etaFormatted = timestamp > 0n ? new Date(Number(timestamp) * 1000).toLocaleString() : 'N/A';
  const remainingSeconds = timestamp > nowSeconds ? timestamp - nowSeconds : 0n;
  const hoursRemaining = (Number(remainingSeconds) / 3600).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Timelock Minimum Delay"
          value={`${Number(minDelaySeconds) / 3600} Hours`}
          subtitle={`${minDelaySeconds.toString()} Seconds`}
          icon={Clock}
          glowColor="purple"
        />
        <StatCard
          title="Proposer Role"
          value={isProposer ? 'ACTIVE' : 'INACTIVE'}
          subtitle="Required to queue schedule"
          icon={isProposer ? ShieldCheck : ShieldAlert}
          glowColor={isProposer ? 'emerald' : 'amber'}
        />
        <StatCard
          title="Executor Role"
          value={isExecutor ? 'ACTIVE' : 'INACTIVE'}
          subtitle="Required to execute delay"
          icon={isExecutor ? ShieldCheck : ShieldAlert}
          glowColor={isExecutor ? 'emerald' : 'amber'}
        />
        <StatCard
          title="Canceller Role"
          value={isCanceller ? 'ACTIVE' : 'INACTIVE'}
          subtitle="Required to cancel ops"
          icon={isCanceller ? ShieldCheck : ShieldAlert}
          glowColor={isCanceller ? 'emerald' : 'amber'}
        />
      </div>

      {/* Real-Time Transaction Feedback */}
      {isTxWaiting && txHash && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <span>Timelock transaction broadcasted. Confirming on Base Sepolia...</span>
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
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>Timelock transaction successfully confirmed on-chain!</span>
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

      {/* Operations Console & Action Workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Action Workspace */}
        <div className="lg:col-span-7 space-y-4">
          {/* Action Tabs */}
          <div className="flex items-center space-x-2 border-b border-border-subtle/60 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                activeTab === 'schedule'
                  ? 'bg-purple-600 text-white shadow-glow'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule Call</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('execute')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                activeTab === 'execute'
                  ? 'bg-purple-600 text-white shadow-glow'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Execute Queued</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cancel')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                activeTab === 'cancel'
                  ? 'bg-rose-600 text-white shadow-glow'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Operation</span>
            </button>
          </div>

          {/* Schedule Form */}
          {activeTab === 'schedule' && (
            <form
              onSubmit={handleOpenSchedule}
              className="p-5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-4 shadow-xl text-xs"
            >
              <div className="border-b border-border-subtle/50 pb-2">
                <h3 className="font-bold text-foreground text-sm">Schedule Governance Operation</h3>
                <p className="text-muted-foreground text-[11px]">
                  Requires <code className="text-purple-400 font-mono">PROPOSER_ROLE</code>. Call
                  will be locked for 48 hours before execution eligibility.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">
                    Target Contract Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0x..."
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[42px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">
                      ETH Value (in Wei)
                    </label>
                    <input
                      type="text"
                      placeholder="0"
                      value={ethValue}
                      onChange={(e) => setEthValue(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[42px]"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">
                      Execution Delay (Seconds &ge; 172800)
                    </label>
                    <input
                      type="number"
                      min="172800"
                      value={delaySeconds}
                      onChange={(e) => setDelaySeconds(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[42px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">
                    Calldata Payload (hex)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="0x..."
                    value={callData}
                    onChange={(e) => setCallData(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">
                      Predecessor (bytes32)
                    </label>
                    <input
                      type="text"
                      value={predecessor}
                      onChange={(e) => setPredecessor(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-muted-foreground font-semibold">
                        Salt (bytes32)
                      </label>
                      <button
                        type="button"
                        onClick={() => setSalt(generateTimelockSalt(targetAddress))}
                        className="text-[10px] text-purple-400 hover:text-purple-300 font-bold underline font-mono"
                      >
                        Generate Unique Salt
                      </button>
                    </div>
                    <input
                      type="text"
                      value={salt}
                      onChange={(e) => setSalt(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isProposer || !isAddress(targetAddress) || isWritePending || isTxWaiting}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-xs font-bold text-white shadow-glow transition-all flex items-center justify-center space-x-2 min-h-[44px]"
              >
                {!isProposer ? (
                  <span>Unauthorized (Missing PROPOSER_ROLE)</span>
                ) : (
                  <span>Queue Operation on Timelock</span>
                )}
              </button>
            </form>
          )}

          {/* Execute Form */}
          {activeTab === 'execute' && (
            <form
              onSubmit={handleOpenExecute}
              className="p-5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-4 shadow-xl text-xs"
            >
              <div className="border-b border-border-subtle/50 pb-2">
                <h3 className="font-bold text-foreground text-sm">Execute Queued Operation</h3>
                <p className="text-muted-foreground text-[11px]">
                  Requires <code className="text-purple-400 font-mono">EXECUTOR_ROLE</code> and
                  elapsed 48-hour timelock delay.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">
                    Target Contract Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0x..."
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">
                    ETH Value (in Wei)
                  </label>
                  <input
                    type="text"
                    placeholder="0"
                    value={ethValue}
                    onChange={(e) => setEthValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1">
                    Calldata Payload (hex)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="0x..."
                    value={callData}
                    onChange={(e) => setCallData(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">
                      Predecessor (bytes32)
                    </label>
                    <input
                      type="text"
                      value={predecessor}
                      onChange={(e) => setPredecessor(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1">
                      Salt (bytes32)
                    </label>
                    <input
                      type="text"
                      value={salt}
                      onChange={(e) => setSalt(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isExecutor || !isAddress(targetAddress) || isWritePending || isTxWaiting}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-xs font-bold text-white shadow-glow transition-all flex items-center justify-center space-x-2 min-h-[44px]"
              >
                {!isExecutor ? (
                  <span>Unauthorized (Missing EXECUTOR_ROLE)</span>
                ) : (
                  <span>Execute Operation on Chain</span>
                )}
              </button>
            </form>
          )}

          {/* Cancel Form */}
          {activeTab === 'cancel' && (
            <form
              onSubmit={handleOpenCancel}
              className="p-5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-4 shadow-xl text-xs"
            >
              <div className="border-b border-border-subtle/50 pb-2">
                <h3 className="font-bold text-foreground text-sm">Cancel Scheduled Operation</h3>
                <p className="text-muted-foreground text-[11px]">
                  Requires <code className="text-rose-400 font-mono">CANCELLER_ROLE</code> to cancel
                  an active queued operation.
                </p>
              </div>

              <div>
                <label className="block text-muted-foreground font-semibold mb-1">
                  Operation ID (bytes32)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={inspectOperationId}
                  onChange={(e) => setInspectOperationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border-subtle text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 min-h-[42px]"
                />
              </div>

              <button
                type="submit"
                disabled={!isCanceller || !inspectOperationId || isWritePending || isTxWaiting}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-xs font-bold text-white shadow-glow transition-all flex items-center justify-center space-x-2 min-h-[44px]"
              >
                {!isCanceller ? (
                  <span>Unauthorized (Missing CANCELLER_ROLE)</span>
                ) : (
                  <span>Cancel Operation Permanently</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right: Live Operation Inspector */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-surface/90 border border-border-subtle backdrop-blur-xl space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 border-b border-border-subtle/50 pb-2.5">
              <Hash className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-foreground text-sm">Live Operation Telemetry</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">Computed Operation Hash:</span>
                <code className="p-2 rounded-lg bg-card border border-border-subtle text-purple-400 font-mono text-[11px] block break-all">
                  {activeQueryId || 'No active parameters'}
                </code>
              </div>

              <div className="space-y-2 pt-1 border-t border-border-subtle/40">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Is Registered Operation:</span>
                  <span className="font-mono font-bold text-foreground">
                    {isOp ? 'YES (On-chain)' : 'NO / UNSET'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Operation State:</span>
                  {isDone ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                      DONE / EXECUTED
                    </span>
                  ) : isReady ? (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px] font-bold">
                      READY TO EXECUTE
                    </span>
                  ) : isPending ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                      WAITING (PENDING)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 text-[10px] font-bold">
                      UNSET / CANCELLED
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Execution ETA Timestamp:</span>
                  <span className="font-mono text-foreground font-medium">{etaFormatted}</span>
                </div>

                {isPending && timestamp > nowSeconds && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] space-y-1">
                    <p className="font-bold flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Timelock Delay Active</span>
                    </p>
                    <p className="text-amber-300/80">
                      Operation unlocks in {hoursRemaining} hours ({remainingSeconds.toString()}{' '}
                      seconds remaining).
                    </p>
                  </div>
                )}

                {isReady && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] space-y-1">
                    <p className="font-bold flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Eligible for Execution</span>
                    </p>
                    <p className="text-emerald-300/80">
                      The 48-hour timelock delay has elapsed. Authorized executors may execute this
                      operation now.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <GovernanceConfirmationModal
        isOpen={confirmModalType !== null}
        onClose={() => setConfirmModalType(null)}
        onConfirm={executeTimelockAction}
        isPending={isWritePending || isTxWaiting}
        title={
          confirmModalType === 'schedule'
            ? 'Schedule Timelock Operation'
            : confirmModalType === 'execute'
              ? 'Execute Timelock Operation'
              : 'Cancel Timelock Operation'
        }
        description="Verify parameters before broadcasting transaction to Base Sepolia."
        actionLabel={
          confirmModalType === 'schedule'
            ? 'Confirm Schedule'
            : confirmModalType === 'execute'
              ? 'Confirm Execute'
              : 'Confirm Cancel'
        }
        actionColor={confirmModalType === 'cancel' ? 'rose' : 'purple'}
        details={[
          { label: 'Action', value: confirmModalType?.toUpperCase() || '' },
          { label: 'Timelock Contract', value: timelockAddress },
          { label: 'Target Contract', value: targetAddress || 'N/A' },
          { label: 'ETH Value', value: `${ethValue || '0'} Wei` },
          { label: 'Operation ID', value: activeQueryId || '0x0' },
        ]}
      />
    </div>
  );
}
