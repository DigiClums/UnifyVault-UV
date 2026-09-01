'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { formatUnits } from 'viem';
import {
  STAKING_VAULT_ABI,
  REWARD_DISTRIBUTOR_ABI,
  REFERRAL_REGISTRY_ABI,
  DaoEpoch,
  RewardCapacity,
  DaoLeaderShares,
} from '../../../lib/contracts/staking';
import {
  GOVERNANCE_ROLE_HASH,
  GUARDIAN_ROLE_HASH,
  DEFAULT_ADMIN_ROLE_HASH,
} from '../../../lib/contracts/escrow';
import { getDeployedContracts, getExplorerBaseUrl, getDefaultChainId } from '../../../constants';
import { isAddress, type Address } from 'viem';
import { StatCard } from '../../../components/ui/StatCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  Coins,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Lock,
  Unlock,
  Scale,
  Copy,
  Check,
  Award,
  Crown,
  Zap,
  Info,
  Clock,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';

export default function AdminStakingPage() {
  const { address: connectedAddress, chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);

  const deployed = getDeployedContracts(chainId);
  const vaultAddress = (deployed.UVBEStakingVault || deployed.StakingVault) as Address;
  const distributorAddress = (deployed.UVBERewardDistributor ||
    deployed.RewardDistributor) as Address;
  const registryAddress = (deployed.UVBEReferralRegistry || deployed.ReferralRegistry) as Address;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [lookupInput, setLookupInput] = useState('');
  const [targetWallet, setTargetWallet] = useState<Address | null>(null);
  const [activeAction, setActiveAction] = useState<
    | 'checkpoint'
    | 'finalizeEpoch'
    | 'pauseVault'
    | 'unpauseVault'
    | 'pauseDistributor'
    | 'unpauseDistributor'
    | null
  >(null);

  const isValidTarget = Boolean(targetWallet && isAddress(targetWallet));

  const { data: userLookupData, isLoading: isLookupLoading } = useReadContracts({
    contracts: [
      {
        address: registryAddress,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'getRank',
        args: isValidTarget ? [targetWallet as Address] : undefined,
      },
      {
        address: registryAddress,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'getTeamVolume',
        args: isValidTarget ? [targetWallet as Address] : undefined,
      },
      {
        address: registryAddress,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'getActiveDirectCount',
        args: isValidTarget ? [targetWallet as Address] : undefined,
      },
      {
        address: vaultAddress,
        abi: STAKING_VAULT_ABI,
        functionName: 'getPermanentStake',
        args: isValidTarget ? [targetWallet as Address] : undefined,
      },
      {
        address: registryAddress,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'getDirects',
        args: isValidTarget ? [targetWallet as Address] : undefined,
      },
      {
        address: registryAddress,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'getReferrer',
        args: isValidTarget ? [targetWallet as Address] : undefined,
      },
    ],
    query: {
      enabled: isValidTarget,
    },
  });

  const inspectedRank = Number(userLookupData?.[0]?.result ?? 0);
  const inspectedTeamVolume = (userLookupData?.[1]?.result as bigint) ?? 0n;
  const inspectedDirectsCount = Number(userLookupData?.[2]?.result ?? 0n);
  const inspectedPermanentStake = (userLookupData?.[3]?.result as bigint) ?? 0n;
  const inspectedDirectsList = (userLookupData?.[4]?.result as Address[]) ?? [];
  const inspectedReferrer =
    (userLookupData?.[5]?.result as Address) ??
    ('0x0000000000000000000000000000000000000000' as Address);

  const handleSearchWallet = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupInput.trim();
    if (isAddress(clean)) {
      setTargetWallet(clean as Address);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --- On-Chain Role Reads ---
  const { data: roleData, refetch: refetchRoles } = useReadContracts({
    contracts: [
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'hasRole',
        args: connectedAddress
          ? [GOVERNANCE_ROLE_HASH, connectedAddress as `0x${string}`]
          : undefined,
      },
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'hasRole',
        args: connectedAddress
          ? [GUARDIAN_ROLE_HASH, connectedAddress as `0x${string}`]
          : undefined,
      },
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'hasRole',
        args: connectedAddress
          ? [DEFAULT_ADMIN_ROLE_HASH, connectedAddress as `0x${string}`]
          : undefined,
      },
      {
        address: vaultAddress,
        abi: STAKING_VAULT_ABI,
        functionName: 'hasRole',
        args: connectedAddress
          ? [GOVERNANCE_ROLE_HASH, connectedAddress as `0x${string}`]
          : undefined,
      },
      {
        address: vaultAddress,
        abi: STAKING_VAULT_ABI,
        functionName: 'hasRole',
        args: connectedAddress
          ? [GUARDIAN_ROLE_HASH, connectedAddress as `0x${string}`]
          : undefined,
      },
    ],
    query: {
      enabled: !!connectedAddress && !!distributorAddress && !!vaultAddress,
      staleTime: 15_000,
    },
  });

  const isDistributorGov = Boolean(roleData?.[0]?.result);
  const isDistributorGuardian = Boolean(roleData?.[1]?.result);
  const isDistributorAdmin = Boolean(roleData?.[2]?.result);
  const isVaultGov = Boolean(roleData?.[3]?.result);
  const isVaultGuardian = Boolean(roleData?.[4]?.result);

  const isGovernanceAuthorized = isDistributorGov || isVaultGov || isDistributorAdmin;

  // --- Live Solvency & Staking Metrics ---
  const {
    data: stakingMetrics,
    refetch: refetchStakingMetrics,
    isLoading: isLoadingMetrics,
    isRefetching: isRefetchingMetrics,
  } = useReadContracts({
    contracts: [
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'getRewardCapacity',
      },
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'totalOutstandingLiabilities',
      },
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'totalRewardPaid',
      },
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'getCurrentAnnualBps',
      },
      {
        address: vaultAddress,
        abi: STAKING_VAULT_ABI,
        functionName: 'getAvailableProtocolCapital',
      },
      {
        address: vaultAddress,
        abi: STAKING_VAULT_ABI,
        functionName: 'totalPermanentStaked',
      },
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'currentDaoEpochId',
      },
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'paused',
      },
      {
        address: vaultAddress,
        abi: STAKING_VAULT_ABI,
        functionName: 'paused',
      },
      {
        address: vaultAddress,
        abi: STAKING_VAULT_ABI,
        functionName: 'distributor',
      },
      {
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'vault',
      },
      {
        address: registryAddress,
        abi: REFERRAL_REGISTRY_ABI,
        functionName: 'vault',
      },
    ],
    query: {
      enabled: !!distributorAddress && !!vaultAddress && !!registryAddress,
      staleTime: 10_000,
    },
  });

  const capacityData = stakingMetrics?.[0]?.result as [bigint, bigint, bigint, bigint] | undefined;

  const availableCapital = capacityData ? capacityData[0] : 0n;
  const rawLiabilities = capacityData ? capacityData[1] : 0n;
  const surplusCapacity = capacityData ? capacityData[2] : 0n;
  const currentBps = capacityData ? capacityData[3] : 0n;

  const totalOutstandingLiabilities = (stakingMetrics?.[1]?.result as bigint) || 0n;
  const totalRewardPaid = (stakingMetrics?.[2]?.result as bigint) || 0n;
  const currentAnnualBps = (stakingMetrics?.[3]?.result as bigint) || currentBps;
  const vaultAvailableCapital = (stakingMetrics?.[4]?.result as bigint) || availableCapital;
  const totalPermanentStaked = (stakingMetrics?.[5]?.result as bigint) || 0n;
  const currentEpochId = (stakingMetrics?.[6]?.result as bigint) || 1n;
  const isDistributorPaused = Boolean(stakingMetrics?.[7]?.result);
  const isVaultPaused = Boolean(stakingMetrics?.[8]?.result);

  const isVaultInitialized =
    stakingMetrics?.[9]?.result !== undefined &&
    stakingMetrics?.[9]?.result !== '0x0000000000000000000000000000000000000000';
  const isDistributorInitialized =
    stakingMetrics?.[10]?.result !== undefined &&
    stakingMetrics?.[10]?.result !== '0x0000000000000000000000000000000000000000';
  const isRegistryInitialized =
    stakingMetrics?.[11]?.result !== undefined &&
    stakingMetrics?.[11]?.result !== '0x0000000000000000000000000000000000000000';

  const areModulesFrozen = isVaultInitialized && isDistributorInitialized && isRegistryInitialized;

  // --- Current DAO Epoch Details ---
  const { data: currentEpochData, refetch: refetchEpochData } = useReadContract({
    address: distributorAddress,
    abi: REWARD_DISTRIBUTOR_ABI,
    functionName: 'getDaoEpoch',
    args: [currentEpochId],
    query: {
      enabled: !!distributorAddress && currentEpochId > 0n,
      staleTime: 10_000,
    },
  });

  const epochInfo = currentEpochData as
    | {
        epochId: bigint;
        poolAmount: bigint;
        totalShares: bigint;
        startTime: bigint;
        endTime: bigint;
        isFinalized: boolean;
      }
    | undefined;

  // --- DAO Leadership & Shares ---
  const { data: daoLeaderData, refetch: refetchDaoLeaders } = useReadContract({
    address: registryAddress,
    abi: REFERRAL_REGISTRY_ABI,
    functionName: 'getDaoLeaderShares',
    query: {
      enabled: !!registryAddress,
      staleTime: 20_000,
    },
  });

  const daoLeaderShares = daoLeaderData as
    [readonly `0x${string}`[], readonly bigint[], bigint] | undefined;

  const leaders = daoLeaderShares ? daoLeaderShares[0] : [];
  const shares = daoLeaderShares ? daoLeaderShares[1] : [];
  const totalShares = daoLeaderShares ? daoLeaderShares[2] : 0n;

  // --- Solvency Health Status Calculation ---
  const solvencyHealth = useMemo(() => {
    if (isLoadingMetrics) {
      return {
        status: 'DATA UNAVAILABLE' as const,
        color: 'slate',
        badge: 'bg-slate-800 text-slate-400 border-slate-700',
        ratio: 0,
        description: 'Querying on-chain protocol capital and liabilities...',
      };
    }

    if (vaultAvailableCapital === 0n && totalOutstandingLiabilities === 0n) {
      return {
        status: 'HEALTHY' as const,
        color: 'emerald',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        ratio: 100,
        description: 'Zero outstanding liabilities. System is fully solvent.',
      };
    }

    if (totalOutstandingLiabilities === 0n) {
      return {
        status: 'HEALTHY' as const,
        color: 'emerald',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        ratio: 999,
        description: '100% Capital backing with zero debt obligation.',
      };
    }

    const ratio = Number((vaultAvailableCapital * 100n) / totalOutstandingLiabilities);

    if (ratio >= 120 && surplusCapacity > 0n) {
      return {
        status: 'HEALTHY' as const,
        color: 'emerald',
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        ratio,
        description: `Protocol capital exceeds outstanding liabilities by ${ratio}% with active surplus capacity.`,
      };
    }

    if (ratio >= 100) {
      return {
        status: 'WARNING' as const,
        color: 'amber',
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        ratio,
        description: `Protocol capital is near parity (${ratio}%). Dynamic rate is throttled to preserve solvency.`,
      };
    }

    return {
      status: 'CRITICAL' as const,
      color: 'rose',
      badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse',
      ratio,
      description: `Liabilities exceed available liquid capital (${ratio}%). Dynamic rate throttled to 0% APY.`,
    };
  }, [isLoadingMetrics, vaultAvailableCapital, totalOutstandingLiabilities, surplusCapacity]);

  // --- Transactions / Contract Writes ---
  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const refetchAll = useCallback(() => {
    refetchStakingMetrics();
    refetchEpochData();
    refetchDaoLeaders();
    refetchRoles();
  }, [refetchStakingMetrics, refetchEpochData, refetchDaoLeaders, refetchRoles]);

  useEffect(() => {
    if (isTxSuccess) {
      refetchAll();
      setActiveAction(null);
    }
  }, [isTxSuccess, refetchAll]);

  // Actions
  const handleCheckpoint = () => {
    if (!distributorAddress) return;
    setActiveAction('checkpoint');
    writeContract({
      address: distributorAddress,
      abi: REWARD_DISTRIBUTOR_ABI,
      functionName: 'checkpoint',
    });
  };

  const handleFinalizeEpoch = () => {
    if (!distributorAddress || !currentEpochId) return;
    setActiveAction('finalizeEpoch');
    writeContract({
      address: distributorAddress,
      abi: REWARD_DISTRIBUTOR_ABI,
      functionName: 'finalizeDaoEpoch',
      args: [currentEpochId],
    });
  };

  const handleToggleVaultPause = () => {
    if (!vaultAddress) return;
    if (isVaultPaused) {
      if (!isVaultGov) return;
      setActiveAction('unpauseVault');
      writeContract({
        address: vaultAddress,
        abi: STAKING_VAULT_ABI,
        functionName: 'unpause',
      });
    } else {
      if (!isVaultGuardian) return;
      setActiveAction('pauseVault');
      writeContract({
        address: vaultAddress,
        abi: STAKING_VAULT_ABI,
        functionName: 'pause',
      });
    }
  };

  const handleToggleDistributorPause = () => {
    if (!distributorAddress) return;
    if (isDistributorPaused) {
      if (!isDistributorGov) return;
      setActiveAction('unpauseDistributor');
      writeContract({
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'unpause',
      });
    } else {
      if (!isDistributorGuardian) return;
      setActiveAction('pauseDistributor');
      writeContract({
        address: distributorAddress,
        abi: REWARD_DISTRIBUTOR_ABI,
        functionName: 'pause',
      });
    }
  };

  const getFriendlyErrorMessage = (err: unknown): string => {
    if (!err) return '';
    console.error('[Developer Logs - Staking Admin Error]:', err);
    const errorObj = err as { shortMessage?: string; message?: string };
    if (errorObj.shortMessage) return errorObj.shortMessage;
    if (errorObj.message) return errorObj.message;
    return 'Transaction reverted. Verify contract state, timestamps, and caller role permissions.';
  };

  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  const isEpochEnded = epochInfo ? nowSeconds >= epochInfo.endTime : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Staking, Solvency & DAO Leadership
            </h1>
            <StatusBadge
              status={isVaultPaused || isDistributorPaused ? 'Paused' : 'Active'}
              label={
                isVaultPaused && isDistributorPaused
                  ? 'ALL PAUSED'
                  : isVaultPaused
                    ? 'VAULT PAUSED'
                    : isDistributorPaused
                      ? 'DISTRIBUTOR PAUSED'
                      : 'SYSTEM LIVE'
              }
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time protocol solvency surveillance, dynamic APY accumulator checkpointing, and DAO
            leadership epoch management.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={refetchAll}
            disabled={isRefetchingMetrics}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefetchingMetrics ? 'animate-spin text-purple-400' : ''}`}
            />
            <span>{isRefetchingMetrics ? 'Refreshing...' : 'Refresh On-Chain'}</span>
          </button>
        </div>
      </div>

      {/* Solvency Health Status Card */}
      <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Protocol Solvency Surveillance</h3>
                <span
                  className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded border ${solvencyHealth.badge}`}
                >
                  {solvencyHealth.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{solvencyHealth.description}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCheckpoint}
              disabled={isWritePending || isTxWaiting || isDistributorPaused}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white text-xs shadow-glow disabled:opacity-50 flex items-center space-x-1.5 transition-all"
            >
              {activeAction === 'checkpoint' && (isWritePending || isTxWaiting) ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span>
                {activeAction === 'checkpoint' && isWritePending
                  ? 'Signing...'
                  : activeAction === 'checkpoint' && isTxWaiting
                    ? 'Syncing...'
                    : 'Execute APY Checkpoint'}
              </span>
            </button>
          </div>
        </div>

        {/* Mathematical Formula Footnote */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            Solvency Invariant: Available Capital ({formatUnits(vaultAvailableCapital, 18)} UVBE) ≥
            Liabilities ({formatUnits(rawLiabilities, 18)} UVBE)
          </span>
          <div className="flex items-center space-x-3">
            <span className="text-amber-300 font-semibold">
              MAXIMUM PENALTY / FEE CAP: 5,000 BPS (50.00%)
            </span>
            <span className="text-purple-300">
              Surplus Capacity: {formatUnits(surplusCapacity, 18)} UVBE
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row (Section 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Available Protocol Capital"
          value={`${formatUnits(vaultAvailableCapital, 18)} UVBE`}
          subtitle="Held in UVBEStakingVault"
          icon={Coins}
          glowColor="emerald"
        />
        <StatCard
          title="Outstanding Liabilities"
          value={`${formatUnits(rawLiabilities, 18)} UVBE`}
          subtitle="Pending claim & accumulator debt"
          icon={Scale}
          glowColor="purple"
        />
        <StatCard
          title="Surplus Capital Capacity"
          value={`${formatUnits(surplusCapacity, 18)} UVBE`}
          subtitle="Available for prospective APY"
          icon={TrendingUp}
          glowColor="blue"
        />
        <StatCard
          title="Current Dynamic APY Rate"
          value={`${(Number(currentAnnualBps) / 100).toFixed(2)}%`}
          subtitle={`${currentAnnualBps.toString()} BPS annual yield`}
          icon={Zap}
          glowColor="purple"
        />
        <StatCard
          title="Total Permanent Staked"
          value={`${formatUnits(totalPermanentStaked, 18)} UVBE`}
          subtitle="100% Protocol-Owned Principal"
          icon={Layers}
          glowColor="blue"
        />
        <StatCard
          title="Total Lifetime Rewards Paid"
          value={`${formatUnits(totalRewardPaid, 18)} UVBE`}
          subtitle="Disbursed from StakingVault"
          icon={ShieldCheck}
          glowColor="emerald"
        />
      </div>

      {/* Transaction Lifecycle Status Banner */}
      {isTxWaiting && txHash && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <span>Staking transaction broadcasted. Confirming on Base...</span>
          </div>
          <a
            href={`${explorerBaseUrl}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 underline font-mono text-blue-300 hover:text-blue-200"
          >
            <span>Basescan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {isTxSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs font-semibold shadow-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>Transaction executed successfully on Base!</span>
          </div>
          {txHash && (
            <a
              href={`${explorerBaseUrl}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1 underline font-mono text-emerald-300 hover:text-emerald-200"
            >
              <span>Basescan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {writeError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center space-x-2 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{getFriendlyErrorMessage(writeError)}</span>
        </div>
      )}

      {/* Main Grid: DAO Epoch Management (Left) & DAO Leadership Shares (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: DAO Epoch Details (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle/40">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  DAO Leadership Epoch #{currentEpochId.toString()}
                </h3>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                  epochInfo?.isFinalized
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : isEpochEnded
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}
              >
                {epochInfo?.isFinalized
                  ? 'FINALIZED'
                  : isEpochEnded
                    ? 'READY TO FINALIZE'
                    : 'CYCLE ACTIVE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle space-y-1">
                <span className="text-slate-400 block text-[10px]">Accumulated Pool</span>
                <span className="text-sm font-bold text-emerald-400">
                  {epochInfo ? formatUnits(epochInfo.poolAmount, 18) : '0'} UVBE
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle space-y-1">
                <span className="text-slate-400 block text-[10px]">Eligible DAO Shares</span>
                <span className="text-sm font-bold text-purple-300">
                  {epochInfo ? epochInfo.totalShares.toString() : '0'} Shares
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle space-y-1">
                <span className="text-slate-400 block text-[10px]">Cycle Start Time</span>
                <span className="text-slate-200 text-[11px]">
                  {epochInfo && epochInfo.startTime > 0n
                    ? new Date(Number(epochInfo.startTime) * 1000).toLocaleString()
                    : 'Not Started'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle space-y-1">
                <span className="text-slate-400 block text-[10px]">Cycle End Time</span>
                <span className="text-slate-200 text-[11px]">
                  {epochInfo && epochInfo.endTime > 0n
                    ? new Date(Number(epochInfo.endTime) * 1000).toLocaleString()
                    : 'Pending'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-[280px]">
                Finalizing takes a snapshot of eligible Platinum/Diamond/Crown leaders and allocates
                pool shares.
              </p>

              <button
                onClick={handleFinalizeEpoch}
                disabled={
                  isWritePending ||
                  isTxWaiting ||
                  isDistributorPaused ||
                  !isEpochEnded ||
                  epochInfo?.isFinalized
                }
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-white text-xs shadow-glow disabled:opacity-50 flex items-center space-x-1.5 transition-all"
              >
                {activeAction === 'finalizeEpoch' && (isWritePending || isTxWaiting) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Award className="w-3.5 h-3.5" />
                )}
                <span>
                  {activeAction === 'finalizeEpoch' && isWritePending
                    ? 'Signing...'
                    : activeAction === 'finalizeEpoch' && isTxWaiting
                      ? 'Finalizing...'
                      : 'Finalize DAO Epoch'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: DAO Leadership Roster (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle/40">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Qualified DAO Leaders ({leaders.length})
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Total Pool Shares: {totalShares.toString()}
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {leaders.length === 0 ? (
                <div className="py-8 text-center text-slate-500 space-y-1">
                  <Crown className="w-6 h-6 mx-auto text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">
                    No qualified DAO leaders yet
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Traders achieve DAO leadership upon reaching Platinum (Rank 4), Diamond (Rank
                    5), or Crown Ambassador (Rank 6).
                  </p>
                </div>
              ) : (
                leaders.map((leader, idx) => {
                  const shareCount = shares[idx] || 0n;
                  const sharePct =
                    totalShares > 0n
                      ? ((Number(shareCount) / Number(totalShares)) * 100).toFixed(1)
                      : '0';

                  return (
                    <div
                      key={leader}
                      className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-amber-400 font-bold">#{idx + 1}</span>
                        <span className="text-white truncate max-w-[140px]" title={leader}>
                          {leader.slice(0, 6)}...{leader.slice(-4)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(leader, `leader-${idx}`)}
                          className="text-[10px] text-purple-400 hover:text-purple-300"
                        >
                          {copiedKey === `leader-${idx}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-white font-bold block">
                          {shareCount.toString()} Shares
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {sharePct}% of Epoch Pool
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── LIVE WALLET RANK & DOWNLINE INSPECTOR ── */}
      <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle/40">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              On-Chain Wallet Rank & Downline Inspector
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Query any staker rank, volume & affiliate hierarchy
          </span>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchWallet} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Enter staker wallet address (0x...)"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:border-[#BFFF00]"
            />
          </div>
          <button
            type="submit"
            disabled={!isAddress(lookupInput.trim())}
            className="px-4 py-2.5 rounded-xl bg-[#BFFF00] text-black font-bold text-xs hover:bg-[#a6df00] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Inspect Wallet
          </button>
        </form>

        {/* Query Result Card */}
        {isValidTarget && (
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 space-y-4">
            {isLookupLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2 font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-[#BFFF00]" />
                <span>Reading on-chain registry state...</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-xs text-white font-bold">{targetWallet}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">Current Rank:</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                        inspectedRank === 5
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : inspectedRank === 4
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : inspectedRank === 3
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                              : inspectedRank === 2
                                ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                                : inspectedRank === 1
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {inspectedRank === 5
                        ? '👑 Rank 5: Diamond Legend'
                        : inspectedRank === 4
                          ? '💎 Rank 4: Platinum Ambassador'
                          : inspectedRank === 3
                            ? '🥇 Rank 3: Gold Commander'
                            : inspectedRank === 2
                              ? '🥈 Rank 2: Silver Captain'
                              : inspectedRank === 1
                                ? '🥉 Rank 1: Bronze Pioneer'
                                : 'Rank 0: Member'}
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Permanent Stake
                    </span>
                    <span className="text-sm font-mono font-bold text-white">
                      {Number(formatUnits(inspectedPermanentStake, 18)).toLocaleString()} UVBE
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Team Volume
                    </span>
                    <span className="text-sm font-mono font-bold text-[#BFFF00]">
                      ${Number(formatUnits(inspectedTeamVolume, 18)).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Active Directs
                    </span>
                    <span className="text-sm font-mono font-bold text-cyan-400">
                      {inspectedDirectsCount} Members
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Bound Referrer
                    </span>
                    <span
                      className="text-xs font-mono font-bold text-purple-300 truncate block"
                      title={inspectedReferrer}
                    >
                      {inspectedReferrer === '0x0000000000000000000000000000000000000000'
                        ? 'Genesis Root (Admin)'
                        : `${inspectedReferrer.slice(0, 6)}...${inspectedReferrer.slice(-4)}`}
                    </span>
                  </div>
                </div>

                {/* Direct Referrals List */}
                {inspectedDirectsList.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      Direct Downlines ({inspectedDirectsList.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {inspectedDirectsList.map((direct, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setLookupInput(direct);
                            setTargetWallet(direct as Address);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-mono text-slate-300 hover:border-[#BFFF00] hover:text-white transition-colors"
                        >
                          {direct.slice(0, 6)}...{direct.slice(-4)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Module Initialization & Emergency Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Module Initialization Status (6 Cols) */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl shadow-xl space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-border-subtle/40">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Module Linking State</h3>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">
                {areModulesFrozen
                  ? 'Module linking initialized & permanently frozen'
                  : 'Modules configured on-chain'}
              </span>
            </div>
            <span className="font-mono text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200">
              IMMUTABLE
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 pt-1">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block">StakingVault:</span>
              <span className="text-purple-300 truncate block" title={vaultAddress}>
                {vaultAddress.slice(0, 6)}...{vaultAddress.slice(-4)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block">Distributor:</span>
              <span className="text-purple-300 truncate block" title={distributorAddress}>
                {distributorAddress.slice(0, 6)}...{distributorAddress.slice(-4)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block">Registry:</span>
              <span className="text-purple-300 truncate block" title={registryAddress}>
                {registryAddress.slice(0, 6)}...{registryAddress.slice(-4)}
              </span>
            </div>
          </div>
        </div>

        {/* Emergency Pause Controls (6 Cols) */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-border-subtle/40">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Emergency Pause Controls
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Vault Pause */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">Staking Vault</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isVaultPaused
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {isVaultPaused ? 'PAUSED' : 'LIVE'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleVaultPause}
                disabled={
                  isWritePending || isTxWaiting || (isVaultPaused ? !isVaultGov : !isVaultGuardian)
                }
                className={`w-full py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 ${
                  isVaultPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {isVaultPaused ? (
                  <Unlock className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>{isVaultPaused ? 'Unpause Vault' : 'Emergency Pause Vault'}</span>
              </button>
            </div>

            {/* Distributor Pause */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">Reward Distributor</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isDistributorPaused
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {isDistributorPaused ? 'PAUSED' : 'LIVE'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleDistributorPause}
                disabled={
                  isWritePending ||
                  isTxWaiting ||
                  (isDistributorPaused ? !isDistributorGov : !isDistributorGuardian)
                }
                className={`w-full py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 ${
                  isDistributorPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {isDistributorPaused ? (
                  <Unlock className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>
                  {isDistributorPaused ? 'Unpause Distributor' : 'Emergency Pause Distributor'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
