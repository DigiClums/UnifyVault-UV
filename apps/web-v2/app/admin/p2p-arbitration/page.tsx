'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { formatUnits, hexToString } from 'viem';
import {
  P2P_ESCROW_ABI,
  TradeState,
  DisputeOutcome,
  EscrowTrade,
  ARBITRATOR_ROLE_HASH,
  GOVERNANCE_ROLE_HASH,
  GUARDIAN_ROLE_HASH,
  DEFAULT_ADMIN_ROLE_HASH,
} from '../../../lib/contracts/escrow';
import { P2P_REPUTATION_ABI } from '../../../lib/contracts/reputation';
import {
  getChainTokens,
  getExplorerBaseUrl,
  getDefaultChainId,
  DEPLOYED_CONTRACTS_SEPOLIA,
} from '../../../constants';
import { useProtocolDirectory } from '../../../hooks/useProtocolDirectory';
import { StatCard } from '../../../components/ui/StatCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  EvidenceInvestigationConsole,
  type VerificationConclusion,
} from '../../../components/p2p/EvidenceInvestigationConsole';
import {
  Gavel,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  UserCheck,
  Ban,
  Lock,
  Unlock,
  Settings,
  Scale,
  Copy,
  Check,
  DollarSign,
  FileText,
  Layers,
} from 'lucide-react';

const STATE_LABELS: Record<TradeState, string> = {
  [TradeState.NONE]: 'None / Uninitialized',
  [TradeState.CREATED]: 'Created (Pending Funding)',
  [TradeState.FUNDED]: 'Funded (Awaiting Payment)',
  [TradeState.PAYMENT_SUBMITTED]: 'Payment Claimed',
  [TradeState.DISPUTED]: 'Active Dispute',
  [TradeState.RELEASED]: 'Released (Completed)',
  [TradeState.REFUNDED]: 'Refunded',
  [TradeState.CANCELLED]: 'Cancelled',
};

const STATE_BADGE_CLASSES: Record<TradeState, string> = {
  [TradeState.NONE]: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  [TradeState.CREATED]: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  [TradeState.FUNDED]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [TradeState.PAYMENT_SUBMITTED]: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  [TradeState.DISPUTED]: 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse',
  [TradeState.RELEASED]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  [TradeState.REFUNDED]: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  [TradeState.CANCELLED]: 'bg-slate-800 text-slate-400 border-slate-700',
};

export default function AdminP2PArbitrationPage() {
  const { address: connectedAddress, chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const publicClient = usePublicClient({ chainId });
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const tokens = useMemo(() => getChainTokens(chain?.id), [chain?.id]);
  const { p2pEscrow } = useProtocolDirectory();

  const escrowAddress = (p2pEscrow || DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow) as `0x${string}`;
  const reputationAddress = DEPLOYED_CONTRACTS_SEPOLIA.P2PReputation as `0x${string}`;

  // Tab & Search State
  const [filterTab, setFilterTab] = useState<'disputed' | 'all' | 'resolved'>('disputed');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTradeId, setSelectedTradeId] = useState<bigint | null>(null);
  const [tradesList, setTradesList] = useState<EscrowTrade[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Configuration State
  const [newFeeInput, setNewFeeInput] = useState<string>('25');
  const [newTreasuryInput, setNewTreasuryInput] = useState<string>('');

  // Resolution confirmation modal state
  const [resolutionModalOutcome, setResolutionModalOutcome] = useState<DisputeOutcome | null>(null);
  const [verificationConclusion, setVerificationConclusion] =
    useState<VerificationConclusion>('INSUFFICIENT_EVIDENCE');
  const [investigationNotes, setInvestigationNotes] = useState<string>('');
  const [isSavingAudit, setIsSavingAudit] = useState<boolean>(false);

  const handleSaveAuditNote = async () => {
    if (!selectedTradeId || !connectedAddress || !investigationNotes.trim()) return;
    try {
      setIsSavingAudit(true);
      await fetch('/api/p2p/dispute-chat/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: Number(selectedTradeId),
          userAddress: connectedAddress,
          timestamp: Date.now(),
          action: 'REVIEW_EVIDENCE',
          reason: `Investigation Conclusion: ${verificationConclusion}`,
          resolutionNotes: investigationNotes,
        }),
      });
      alert('Investigation note saved to server audit log.');
    } catch (err) {
      console.error('Error saving audit note:', err);
    } finally {
      setIsSavingAudit(false);
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
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'hasRole',
        args: connectedAddress
          ? [ARBITRATOR_ROLE_HASH, connectedAddress as `0x${string}`]
          : undefined,
      },
      {
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'hasRole',
        args: connectedAddress
          ? [GOVERNANCE_ROLE_HASH, connectedAddress as `0x${string}`]
          : undefined,
      },
      {
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'hasRole',
        args: connectedAddress
          ? [GUARDIAN_ROLE_HASH, connectedAddress as `0x${string}`]
          : undefined,
      },
      {
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'hasRole',
        args: connectedAddress
          ? [DEFAULT_ADMIN_ROLE_HASH, connectedAddress as `0x${string}`]
          : undefined,
      },
    ],
    query: {
      enabled: !!escrowAddress && !!connectedAddress,
      staleTime: 15_000,
    },
  });

  const isArbitrator = Boolean(roleData?.[0]?.result);
  const isGovernance = Boolean(roleData?.[1]?.result);
  const isGuardian = Boolean(roleData?.[2]?.result);

  const isAuthorizedArbitrator = isArbitrator || isGovernance;

  // --- Escrow Global Parameters ---
  const { data: escrowMeta, refetch: refetchEscrowMeta } = useReadContracts({
    contracts: [
      {
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'totalTrades',
      },
      {
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'paused',
      },
      {
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'feeBps',
      },
      {
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'treasury',
      },
    ],
    query: {
      enabled: !!escrowAddress,
      staleTime: 10_000,
    },
  });

  const totalTradesCount = (escrowMeta?.[0]?.result as bigint) || 0n;
  const isEscrowPaused = Boolean(escrowMeta?.[1]?.result);
  const currentFeeBps = (escrowMeta?.[2]?.result as bigint) || 0n;
  const currentTreasury =
    (escrowMeta?.[3]?.result as `0x${string}`) || '0x0000000000000000000000000000000000000000';

  // --- Read Selected Trade ---
  const {
    data: selectedTradeData,
    refetch: refetchSelectedTrade,
    isLoading: isLoadingSelectedTrade,
  } = useReadContract({
    address: escrowAddress,
    abi: P2P_ESCROW_ABI,
    functionName: 'getTrade',
    args: selectedTradeId ? [selectedTradeId] : undefined,
    query: {
      enabled: !!escrowAddress && !!selectedTradeId,
      staleTime: 5_000,
    },
  });

  const selectedTrade = selectedTradeData as EscrowTrade | undefined;

  // Evidence and payment reference usage verification
  const { data: verificationData } = useReadContracts({
    contracts: [
      {
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'isEvidenceHashUsed',
        args: selectedTrade?.evidenceHash ? [selectedTrade.evidenceHash] : undefined,
      },
      {
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'isPaymentReferenceUsed',
        args: selectedTrade?.paymentReference ? [selectedTrade.paymentReference] : undefined,
      },
    ],
    query: {
      enabled: !!escrowAddress && !!selectedTrade?.evidenceHash,
      staleTime: 30_000,
    },
  });

  const isEvidenceUsed = Boolean(verificationData?.[0]?.result);
  const isReferenceUsed = Boolean(verificationData?.[1]?.result);

  // Trader Profiles from Reputation Contract
  const { data: traderProfiles } = useReadContracts({
    contracts: [
      {
        address: reputationAddress,
        abi: P2P_REPUTATION_ABI,
        functionName: 'getProfile',
        args: selectedTrade?.buyer ? [selectedTrade.buyer] : undefined,
      },
      {
        address: reputationAddress,
        abi: P2P_REPUTATION_ABI,
        functionName: 'getProfile',
        args: selectedTrade?.seller ? [selectedTrade.seller] : undefined,
      },
    ],
    query: {
      enabled: !!reputationAddress && !!selectedTrade,
      staleTime: 30_000,
    },
  });

  const buyerProfile = traderProfiles?.[0]?.result as
    | {
        totalTradesAsBuyer: number;
        totalTradesAsSeller: number;
        buyerStats: { ratingsCount: number; scoreSum: bigint; volumeSettled: bigint };
      }
    | undefined;

  const sellerProfile = traderProfiles?.[1]?.result as
    | {
        totalTradesAsBuyer: number;
        totalTradesAsSeller: number;
        sellerStats: { ratingsCount: number; scoreSum: bigint; volumeSettled: bigint };
      }
    | undefined;

  // --- Fetch On-Chain Trades List ---
  const fetchTrades = useCallback(async () => {
    if (!escrowAddress || !publicClient) return;
    setIsRefreshing(true);
    try {
      const count = (await publicClient.readContract({
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'totalTrades',
      })) as bigint;

      const total = Number(count);
      if (total === 0) {
        setTradesList([]);
        setIsLoadingTrades(false);
        setIsRefreshing(false);
        return;
      }

      // Read trades in batches of up to 100
      const tradeIds = Array.from({ length: Math.min(total, 100) }, (_, i) => BigInt(total - i));

      const tradeResults = await Promise.all(
        tradeIds.map(async (id) => {
          try {
            const trade = (await publicClient.readContract({
              address: escrowAddress,
              abi: P2P_ESCROW_ABI,
              functionName: 'getTrade',
              args: [id],
            })) as EscrowTrade;
            return trade;
          } catch {
            return null;
          }
        }),
      );

      const validTrades = tradeResults.filter((t): t is EscrowTrade => t !== null);
      setTradesList(validTrades);

      // Auto-select first disputed trade if none selected
      if (!selectedTradeId && validTrades.length > 0) {
        const firstDisputed = validTrades.find((t) => t.state === TradeState.DISPUTED);
        setSelectedTradeId(firstDisputed ? firstDisputed.tradeId : validTrades[0].tradeId);
      }
    } catch (err) {
      console.error('[Developer Logs - Fetch Trades Error]:', err);
    } finally {
      setIsLoadingTrades(false);
      setIsRefreshing(false);
    }
  }, [escrowAddress, publicClient, selectedTradeId]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // --- Contract Write & Transaction Lifecycle ---
  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isTxSuccess) {
      refetchEscrowMeta();
      refetchRoles();
      refetchSelectedTrade();
      fetchTrades();
      setResolutionModalOutcome(null);
    }
  }, [isTxSuccess, refetchEscrowMeta, refetchRoles, refetchSelectedTrade, fetchTrades]);

  // Execute Dispute Resolution with Safety Gate & Pre-Check
  const handleResolveDispute = async (outcome: DisputeOutcome) => {
    if (
      !selectedTradeId ||
      !escrowAddress ||
      !connectedAddress ||
      !isAuthorizedArbitrator ||
      !publicClient
    )
      return;

    if (verificationConclusion === 'INSUFFICIENT_EVIDENCE') {
      alert(
        'Safety Gate Blocked: Cannot execute ruling while verification conclusion is INSUFFICIENT EVIDENCE.',
      );
      return;
    }

    if (
      outcome === DisputeOutcome.RELEASE_TO_BUYER &&
      verificationConclusion !== 'PAYMENT_VERIFIED'
    ) {
      alert('Safety Gate Blocked: Release to Buyer requires PAYMENT VERIFIED conclusion.');
      return;
    }

    if (
      outcome === DisputeOutcome.REFUND_TO_SELLER &&
      verificationConclusion !== 'PAYMENT_NOT_VERIFIED'
    ) {
      alert('Safety Gate Blocked: Refund to Seller requires PAYMENT NOT VERIFIED conclusion.');
      return;
    }

    try {
      // Re-read trade state on-chain immediately before transaction to prevent race conditions
      const latestTrade = (await publicClient.readContract({
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'getTrade',
        args: [selectedTradeId],
      })) as EscrowTrade;

      if (latestTrade.state !== TradeState.DISPUTED) {
        alert(
          `This dispute has already been resolved or changed state (Current: ${STATE_LABELS[latestTrade.state]}). Refreshing queue...`,
        );
        refetchSelectedTrade();
        fetchTrades();
        setResolutionModalOutcome(null);
        return;
      }

      writeContract({
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'resolveDispute',
        args: [selectedTradeId, outcome],
      });
    } catch (err: any) {
      console.error('[handleResolveDispute Precheck Error]:', err);
      alert(`Pre-flight check failed: ${err?.message || 'Error reading latest trade state'}`);
    }
  };

  // Execute Escrow Configuration
  const handleSetFee = (e: React.FormEvent) => {
    e.preventDefault();
    const bps = parseInt(newFeeInput, 10);
    if (isNaN(bps) || bps < 0 || bps > 500 || !isGovernance) return;
    writeContract({
      address: escrowAddress,
      abi: P2P_ESCROW_ABI,
      functionName: 'setFeeConfig',
      args: [BigInt(bps)],
    });
  };

  const handleSetTreasury = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreasuryInput || !isGovernance) return;
    writeContract({
      address: escrowAddress,
      abi: P2P_ESCROW_ABI,
      functionName: 'setTreasury',
      args: [newTreasuryInput as `0x${string}`],
    });
  };

  const handleTogglePause = () => {
    if (!escrowAddress) return;
    if (isEscrowPaused) {
      if (!isGovernance) return;
      writeContract({
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'unpause',
      });
    } else {
      if (!isGuardian) return;
      writeContract({
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'pause',
      });
    }
  };

  const getFriendlyErrorMessage = (err: unknown): string => {
    if (!err) return '';
    console.error('[Developer Logs - Arbitration Error]:', err);
    const errorObj = err as { shortMessage?: string; message?: string };
    if (errorObj.shortMessage) return errorObj.shortMessage;
    if (errorObj.message) return errorObj.message;
    return 'Transaction reverted. Verify your connected wallet holds ARBITRATOR_ROLE and the trade is in DISPUTED state.';
  };

  // Helper formatting functions
  const formatAssetDisplay = (amount: bigint, assetAddr: string) => {
    const cleanAddr = assetAddr.toLowerCase();
    const isEth = cleanAddr === '0x0000000000000000000000000000000000000000';
    const uvAddr = (tokens.UVBE || DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken).toLowerCase();
    const cbBtcAddr = tokens.cbBTC.toLowerCase();
    const wethAddr = tokens.WETH.toLowerCase();

    if (isEth) return `${formatUnits(amount, 18)} ETH`;
    if (cleanAddr === uvAddr) return `${formatUnits(amount, 18)} UVBE`;
    if (cleanAddr === wethAddr) return `${formatUnits(amount, 18)} WETH`;
    if (cleanAddr === cbBtcAddr) return `${formatUnits(amount, 8)} cbBTC`;
    return `${formatUnits(amount, 6)} USDC`;
  };

  const getAssetSymbol = (assetAddr: string) => {
    const cleanAddr = assetAddr.toLowerCase();
    const isEth = cleanAddr === '0x0000000000000000000000000000000000000000';
    const uvAddr = (tokens.UVBE || DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken).toLowerCase();
    const cbBtcAddr = tokens.cbBTC.toLowerCase();
    const wethAddr = tokens.WETH.toLowerCase();

    if (isEth) return 'ETH';
    if (cleanAddr === uvAddr) return 'UVBE';
    if (cleanAddr === wethAddr) return 'WETH';
    if (cleanAddr === cbBtcAddr) return 'cbBTC';
    return 'USDC';
  };

  const decodeCurrency = (hexStr: string): string => {
    try {
      const clean = hexToString(hexStr as `0x${string}`)
        .replace(/\0/g, '')
        .trim();
      return clean || 'INR';
    } catch {
      return 'INR';
    }
  };

  const disputedCount = tradesList.filter((t) => t.state === TradeState.DISPUTED).length;

  const filteredTrades = useMemo(() => {
    return tradesList.filter((trade) => {
      // Filter tab
      if (filterTab === 'disputed' && trade.state !== TradeState.DISPUTED) return false;
      if (
        filterTab === 'resolved' &&
        trade.state !== TradeState.RELEASED &&
        trade.state !== TradeState.REFUNDED
      )
        return false;

      // Search query
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        trade.tradeId.toString().includes(q) ||
        trade.buyer.toLowerCase().includes(q) ||
        trade.seller.toLowerCase().includes(q) ||
        trade.paymentReference.toLowerCase().includes(q)
      );
    });
  }, [tradesList, filterTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              P2P Arbitration & Dispute Console
            </h1>
            <StatusBadge
              status={isEscrowPaused ? 'Paused' : 'Active'}
              label={isEscrowPaused ? 'ESCROW PAUSED' : 'ESCROW ACTIVE'}
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            On-chain dispute resolution, evidence audit, and non-custodial arbitration for
            P2PEscrowV2 ({escrowAddress.slice(0, 6)}...{escrowAddress.slice(-4)}).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchTrades}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`}
            />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Trades'}</span>
          </button>
        </div>
      </div>

      {/* Authority Status Banner */}
      <div
        className={`p-4 rounded-2xl border backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isAuthorizedArbitrator
            ? 'bg-purple-950/20 border-purple-800/40 text-purple-300'
            : 'bg-amber-950/25 border-amber-500/30 text-amber-300'
        }`}
      >
        <div className="flex items-start sm:items-center space-x-3">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isAuthorizedArbitrator
                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            }`}
          >
            {isAuthorizedArbitrator ? (
              <Gavel className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white">Connected Authority Status:</span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  isAuthorizedArbitrator
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {isArbitrator
                  ? 'ARBITRATOR_ROLE'
                  : isGovernance
                    ? 'GOVERNANCE_ROLE'
                    : 'READ-ONLY OBSERVER'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAuthorizedArbitrator
                ? 'Connected wallet is authorized on-chain to execute binding dispute resolutions.'
                : 'Connected wallet lacks ARBITRATOR_ROLE. Resolution actions are disabled.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400">Escrow Contract:</span>
          <a
            href={`${explorerBaseUrl}/address/${escrowAddress}`}
            target="_blank"
            rel="noreferrer"
            className="text-purple-400 hover:text-purple-300 underline inline-flex items-center space-x-1"
          >
            <span>
              {escrowAddress.slice(0, 6)}...{escrowAddress.slice(-4)}
            </span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Escrow Paused Alert Banner */}
      {isEscrowPaused && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-start space-x-3">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">P2PEscrowV2 Protocol is Currently PAUSED</span>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              New trade creation, funding, payment submissions, and voluntary releases are suspended
              on-chain. Arbitration resolution remains operational if authorized by
              Governance/Arbitrator.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Disputes"
          value={disputedCount.toString()}
          subtitle="Pending Arbitrator ruling"
          icon={Gavel}
          glowColor={disputedCount > 0 ? 'purple' : 'blue'}
        />
        <StatCard
          title="Total Lifetime Trades"
          value={totalTradesCount.toString()}
          subtitle="Created in P2PEscrowV2"
          icon={Layers}
          glowColor="blue"
        />
        <StatCard
          title="Escrow Protocol Fee"
          value={`${Number(currentFeeBps) / 100}%`}
          subtitle={`${currentFeeBps.toString()} BPS on settlement`}
          icon={DollarSign}
          glowColor="emerald"
        />
        <StatCard
          title="Protocol Treasury"
          value={`${currentTreasury.slice(0, 6)}...${currentTreasury.slice(-4)}`}
          subtitle="Fee recipient contract"
          icon={ShieldCheck}
          glowColor="purple"
        />
      </div>

      {/* Main Grid: Dispute Dashboard (Left) & Trade Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dispute Queue & Search (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <Scale className="w-4 h-4 text-purple-400" />
                <span>Arbitration Queue</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                {filteredTrades.length} Trade{filteredTrades.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-1 bg-slate-900/80 rounded-xl border border-border-subtle text-xs">
              <button
                onClick={() => setFilterTab('disputed')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  filterTab === 'disputed'
                    ? 'bg-purple-600 text-white shadow-glow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Disputed ({disputedCount})
              </button>
              <button
                onClick={() => setFilterTab('all')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  filterTab === 'all'
                    ? 'bg-purple-600 text-white shadow-glow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Trades ({tradesList.length})
              </button>
              <button
                onClick={() => setFilterTab('resolved')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  filterTab === 'resolved'
                    ? 'bg-purple-600 text-white shadow-glow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Resolved
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search trade ID, wallet, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950/80 border border-border-subtle text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            </div>

            {/* Trade List Scroll Area */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {isLoadingTrades ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                  <p className="text-xs">Loading escrow trades from Base...</p>
                </div>
              ) : filteredTrades.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/40" />
                  <p className="text-xs font-semibold text-slate-300">No matching trades</p>
                  <p className="text-[11px] text-slate-500">
                    {filterTab === 'disputed'
                      ? 'No active disputes requiring arbitration.'
                      : 'No trades matching current search filter.'}
                  </p>
                </div>
              ) : (
                filteredTrades.map((trade) => {
                  const isSelected = selectedTradeId === trade.tradeId;
                  const isDisputed = trade.state === TradeState.DISPUTED;
                  const currencyStr = decodeCurrency(trade.fiatCurrency);

                  return (
                    <div
                      key={trade.tradeId.toString()}
                      onClick={() => setSelectedTradeId(trade.tradeId)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? 'bg-purple-950/30 border-purple-500/80 shadow-glow-purple'
                          : isDisputed
                            ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60'
                            : 'bg-slate-900/60 border-border-subtle hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-white text-xs">
                            Trade #{trade.tradeId.toString()}
                          </span>
                          <span
                            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                              STATE_BADGE_CLASSES[trade.state] || 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {STATE_LABELS[trade.state]}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-xs text-white">
                          {formatAssetDisplay(trade.amount, trade.asset)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Buyer:</span>
                          <span className="text-slate-300">
                            {trade.buyer.slice(0, 6)}...{trade.buyer.slice(-4)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block text-[10px]">Fiat Settlement:</span>
                          <span className="text-slate-200 font-bold">
                            {trade.fiatAmount > 0n
                              ? `${trade.fiatAmount.toString()} ${currencyStr}`
                              : 'Off-chain'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Deep Trade Inspector & Arbitration Actions (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {isLoadingSelectedTrade ? (
            <div className="p-12 rounded-2xl bg-surface/80 border border-border-subtle text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
              <p className="text-sm font-semibold text-white">Reading trade from P2PEscrowV2...</p>
            </div>
          ) : !selectedTrade ? (
            <div className="p-12 rounded-2xl bg-surface/80 border border-border-subtle text-center space-y-3 text-slate-400">
              <Gavel className="w-10 h-10 mx-auto text-slate-600" />
              <h3 className="text-base font-bold text-white">Select a Trade to Inspect</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Choose a trade from the queue on the left to inspect on-chain state, verified
                payment reference, and execute binding arbitration rulings.
              </p>
            </div>
          ) : (
            <>
              {/* Trade Inspector Header Card */}
              <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle/40">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-extrabold text-white font-mono">
                          Trade #{selectedTrade.tradeId.toString()}
                        </h3>
                        <span
                          className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded border ${
                            STATE_BADGE_CLASSES[selectedTrade.state]
                          }`}
                        >
                          {STATE_LABELS[selectedTrade.state]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Escrow Asset:{' '}
                        <span className="font-mono text-purple-300 font-bold">
                          {getAssetSymbol(selectedTrade.asset)}
                        </span>{' '}
                        ({selectedTrade.asset})
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xs text-slate-400 block">Escrow Amount</span>
                    <span className="text-xl font-extrabold text-white">
                      {formatAssetDisplay(selectedTrade.amount, selectedTrade.asset)}
                    </span>
                  </div>
                </div>

                {/* Compact Trade Overview Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {/* Buyer */}
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-border-subtle">
                    <div className="flex justify-between items-center text-slate-400 text-[10px]">
                      <span>Buyer</span>
                      <button
                        onClick={() => copyToClipboard(selectedTrade.buyer, 'buyer')}
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
                      >
                        {copiedKey === 'buyer' ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>
                    <div
                      className="text-slate-200 font-bold truncate text-[11px] mt-0.5"
                      title={selectedTrade.buyer}
                    >
                      {selectedTrade.buyer.slice(0, 6)}...{selectedTrade.buyer.slice(-4)}
                    </div>
                  </div>

                  {/* Seller */}
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-border-subtle">
                    <div className="flex justify-between items-center text-slate-400 text-[10px]">
                      <span>Seller</span>
                      <button
                        onClick={() => copyToClipboard(selectedTrade.seller, 'seller')}
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
                      >
                        {copiedKey === 'seller' ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>
                    <div
                      className="text-slate-200 font-bold truncate text-[11px] mt-0.5"
                      title={selectedTrade.seller}
                    >
                      {selectedTrade.seller.slice(0, 6)}...{selectedTrade.seller.slice(-4)}
                    </div>
                  </div>

                  {/* Fiat Settlement */}
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-border-subtle">
                    <span className="text-slate-400 block text-[10px]">Fiat Settlement</span>
                    <span className="text-emerald-400 font-bold text-[11px] block mt-0.5">
                      {selectedTrade.fiatAmount > 0n
                        ? `${selectedTrade.fiatAmount.toString()} ${decodeCurrency(selectedTrade.fiatCurrency)}`
                        : 'Off-Chain'}
                    </span>
                  </div>

                  {/* Dispute Initiator */}
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-border-subtle">
                    <span className="text-slate-400 block text-[10px]">Dispute Raised By</span>
                    <span className="text-amber-300 font-bold text-[11px] truncate block mt-0.5">
                      {selectedTrade.disputeInitiator ===
                      '0x0000000000000000000000000000000000000000'
                        ? 'None'
                        : selectedTrade.disputeInitiator.toLowerCase() ===
                            selectedTrade.buyer.toLowerCase()
                          ? 'Buyer'
                          : 'Seller'}
                    </span>
                  </div>
                </div>

                {/* Hashes Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Payment Reference (UTR)</span>
                      <span
                        className={`font-bold px-1 rounded ${isReferenceUsed ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500'}`}
                      >
                        {isReferenceUsed ? 'REPLAY PROTECTED' : 'UNRECORDED'}
                      </span>
                    </div>
                    <div
                      className="text-purple-300 text-[11px] truncate"
                      title={selectedTrade.paymentReference}
                    >
                      {selectedTrade.paymentReference}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Evidence Commitment (Hash)</span>
                      <span
                        className={`font-bold px-1 rounded ${isEvidenceUsed ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500'}`}
                      >
                        {isEvidenceUsed ? '✓ COMMITTED ON-CHAIN' : 'UNRECORDED'}
                      </span>
                    </div>
                    <div
                      className="text-purple-300 text-[11px] truncate"
                      title={selectedTrade.evidenceHash}
                    >
                      {selectedTrade.evidenceHash}
                    </div>
                  </div>
                </div>

                {/* Evidence Investigation Console */}
                <EvidenceInvestigationConsole
                  selectedTrade={selectedTrade}
                  isEvidenceHashUsed={isEvidenceUsed}
                  isReferenceUsed={isReferenceUsed}
                  onConclusionChange={setVerificationConclusion}
                  investigationNotes={investigationNotes}
                  onNotesChange={setInvestigationNotes}
                  onSaveAuditNote={handleSaveAuditNote}
                  isSavingAudit={isSavingAudit}
                />

                {/* --- Section C: Arbitration Ruling Actions --- */}
                <div className="pt-4 border-t border-border-subtle/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Gavel className="w-5 h-5 text-purple-400" />
                      <h4 className="text-base font-bold text-white tracking-tight">
                        Arbitration Ruling & Execution
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      BINDING RESOLUTION
                    </span>
                  </div>

                  {selectedTrade.state !== TradeState.DISPUTED ? (
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-border-subtle text-slate-400 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        Trade #{selectedTrade.tradeId.toString()} is currently in state{' '}
                        <strong>{STATE_LABELS[selectedTrade.state]}</strong>. Only active{' '}
                        <strong>DISPUTED</strong> trades can be arbitrated.
                      </span>
                    </div>
                  ) : !isAuthorizedArbitrator ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Connected wallet is not authorized as Arbitrator/Governance. Dispute
                        resolution buttons are locked.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {verificationConclusion === 'INSUFFICIENT_EVIDENCE' ? (
                        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-bold block">
                              INSUFFICIENT EVIDENCE — RULING LOCKED
                            </span>
                            <p className="text-[11px] text-amber-200/90 leading-relaxed">
                              Financial settlements are locked. You must complete the investigation
                              above and select an explicit conclusion (
                              <strong>PAYMENT VERIFIED</strong> or{' '}
                              <strong>PAYMENT NOT VERIFIED</strong>) before executing a binding
                              financial ruling.
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. Release to Buyer */}
                        <button
                          type="button"
                          onClick={() => setResolutionModalOutcome(DisputeOutcome.RELEASE_TO_BUYER)}
                          disabled={
                            isWritePending ||
                            isTxWaiting ||
                            verificationConclusion !== 'PAYMENT_VERIFIED'
                          }
                          className={`p-4 rounded-xl font-bold text-white text-xs shadow-glow flex items-center justify-center space-x-2 transition-all ${
                            verificationConclusion === 'PAYMENT_VERIFIED' &&
                            !isWritePending &&
                            !isTxWaiting
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 cursor-pointer active:scale-[0.99]'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <UserCheck className="w-4 h-4 shrink-0" />
                          <span>RELEASE TO BUYER (PAYMENT VERIFIED)</span>
                        </button>

                        {/* 2. Refund to Seller */}
                        <button
                          type="button"
                          onClick={() => setResolutionModalOutcome(DisputeOutcome.REFUND_TO_SELLER)}
                          disabled={
                            isWritePending ||
                            isTxWaiting ||
                            verificationConclusion !== 'PAYMENT_NOT_VERIFIED'
                          }
                          className={`p-4 rounded-xl font-bold text-white text-xs shadow-glow flex items-center justify-center space-x-2 transition-all ${
                            verificationConclusion === 'PAYMENT_NOT_VERIFIED' &&
                            !isWritePending &&
                            !isTxWaiting
                              ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 cursor-pointer active:scale-[0.99]'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <Ban className="w-4 h-4 shrink-0" />
                          <span>REFUND TO SELLER (PAYMENT NOT VERIFIED)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Section D: Transaction Lifecycle Display */}
                  {isTxWaiting && txHash && (
                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                        <span>Arbitration transaction broadcasted. Confirming on Base...</span>
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
                        <span>Dispute ruling successfully executed on Base!</span>
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
                </div>
              </div>
            </>
          )}

          {/* Section E: Escrow Protocol Configuration Panel */}
          <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 border-b border-border-subtle/40 pb-3">
              <Settings className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                P2PEscrowV2 Protocol Configuration
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Fee Config */}
              <form
                onSubmit={handleSetFee}
                className="p-4 rounded-xl bg-slate-900/60 border border-border-subtle space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200">Protocol Fee Rate</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    Current: {Number(currentFeeBps) / 100}% ({currentFeeBps.toString()} BPS)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    placeholder="25"
                    value={newFeeInput}
                    onChange={(e) => setNewFeeInput(e.target.value)}
                    disabled={!isGovernance}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isWritePending || isTxWaiting || !isGovernance}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white disabled:opacity-50 transition-all"
                  >
                    Set Fee
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Requires GOVERNANCE_ROLE (Max Cap: 500 BPS = 5.00%)
                </p>
              </form>

              {/* Treasury Address */}
              <form
                onSubmit={handleSetTreasury}
                className="p-4 rounded-xl bg-slate-900/60 border border-border-subtle space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200">Fee Treasury Address</span>
                  <span
                    className="font-mono text-purple-300 font-bold truncate max-w-[120px]"
                    title={currentTreasury}
                  >
                    {currentTreasury.slice(0, 6)}...{currentTreasury.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={newTreasuryInput}
                    onChange={(e) => setNewTreasuryInput(e.target.value)}
                    disabled={!isGovernance}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isWritePending || isTxWaiting || !isGovernance}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white disabled:opacity-50 transition-all"
                  >
                    Set Treasury
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">Requires GOVERNANCE_ROLE</p>
              </form>
            </div>

            {/* Emergency Pause / Unpause Action */}
            <div className="pt-2 flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-border-subtle">
              <div>
                <span className="font-bold text-white text-xs block">
                  Emergency Pause Controller
                </span>
                <span className="text-[11px] text-slate-400">
                  {isEscrowPaused
                    ? 'Protocol is PAUSED. Click unpause to resume normal P2P trading.'
                    : 'Pause suspends all new trades and payments across P2PEscrowV2.'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleTogglePause}
                disabled={
                  isWritePending || isTxWaiting || (isEscrowPaused ? !isGovernance : !isGuardian)
                }
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all disabled:opacity-50 ${
                  isEscrowPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-glow'
                }`}
              >
                {isEscrowPaused ? (
                  <Unlock className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>{isEscrowPaused ? 'Unpause Protocol' : 'Emergency Pause'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Arbitrator Ruling */}
      {resolutionModalOutcome !== null && selectedTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-2xl bg-surface border border-border-subtle shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-border-subtle/50">
              <div
                className={`p-2 rounded-xl ${
                  resolutionModalOutcome === DisputeOutcome.RELEASE_TO_BUYER
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                <Gavel className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Dispute Ruling</h3>
                <span className="text-xs text-slate-400">
                  Trade #{selectedTrade.tradeId.toString()}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-border-subtle text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Investigation Conclusion:</span>
                <span className="font-bold text-purple-300 font-mono">
                  {verificationConclusion}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ruling Decision:</span>
                <span
                  className={`font-bold ${
                    resolutionModalOutcome === DisputeOutcome.RELEASE_TO_BUYER
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {resolutionModalOutcome === DisputeOutcome.RELEASE_TO_BUYER
                    ? 'RELEASE TO BUYER'
                    : 'REFUND TO SELLER'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient:</span>
                <span className="text-white">
                  {resolutionModalOutcome === DisputeOutcome.RELEASE_TO_BUYER
                    ? `${selectedTrade.buyer.slice(0, 6)}...${selectedTrade.buyer.slice(-4)}`
                    : `${selectedTrade.seller.slice(0, 6)}...${selectedTrade.seller.slice(-4)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-white">
                  {formatAssetDisplay(selectedTrade.amount, selectedTrade.asset)}
                </span>
              </div>
              {resolutionModalOutcome === DisputeOutcome.RELEASE_TO_BUYER && (
                <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  <span>Protocol Fee ({Number(currentFeeBps) / 100}%):</span>
                  <span>Deducted & Routed to Treasury</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This action executes an on-chain transaction that irreversibly settles the dispute.
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setResolutionModalOutcome(null)}
                disabled={isWritePending || isTxWaiting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-slate-300 text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResolveDispute(resolutionModalOutcome)}
                disabled={isWritePending || isTxWaiting}
                className={`flex-1 py-2.5 rounded-xl font-bold text-white text-xs shadow-glow transition-all flex items-center justify-center space-x-1.5 ${
                  resolutionModalOutcome === DisputeOutcome.RELEASE_TO_BUYER
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {(isWritePending || isTxWaiting) && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {isWritePending ? 'Signing...' : isTxWaiting ? 'Confirming...' : 'Confirm Ruling'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
