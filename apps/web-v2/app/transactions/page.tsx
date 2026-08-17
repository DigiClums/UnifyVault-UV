'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getExplorerBaseUrl } from '../../constants';
import { useTransactionExplorer } from '../../hooks/useTransactionExplorer';
import type { ExplorerData, TransactionGroup } from '../../hooks/useTransactionExplorer';
import { TimelineCard } from '../../components/transactions/TimelineCard';
import { StatCard } from '../../components/ui/StatCard';
import { TableCard } from '../../components/ui/TableCard';
import {
  History,
  RefreshCw,
  Layers,
  CheckCircle2,
  Activity,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Settings,
  Radio,
  WifiOff,
  Clock,
  Search,
  Filter,
  User,
  Globe,
  Download,
  X,
  Wallet,
  Coins,
  ArrowRightLeft,
  SlidersHorizontal,
} from 'lucide-react';

// ─── Types & Constants ──────────────────────────────────────────────────────

type ViewMode = 'global' | 'my';
type TypeFilter = 'all' | 'deposit' | 'redeem' | 'fee' | 'admin';
type TokenFilter = 'all' | 'USDC' | 'cbBTC' | 'WETH' | 'UVBE';
type StatusFilter = 'all' | 'success' | 'failed';

const TYPE_OPTIONS: { id: TypeFilter; label: string; icon?: React.ReactNode; dotColor?: string }[] =
  [
    { id: 'all', label: 'All Types' },
    { id: 'deposit', label: 'Deposits', dotColor: 'bg-emerald-400' },
    { id: 'redeem', label: 'Redemptions', dotColor: 'bg-purple-400' },
    { id: 'fee', label: 'Fees', dotColor: 'bg-amber-400' },
    { id: 'admin', label: 'Admin / Strategy', dotColor: 'bg-cyan-400' },
  ];

const TOKEN_OPTIONS: { id: TokenFilter; label: string }[] = [
  { id: 'all', label: 'All Tokens' },
  { id: 'USDC', label: 'USDC' },
  { id: 'cbBTC', label: 'cbBTC' },
  { id: 'WETH', label: 'WETH' },
  { id: 'UVBE', label: 'UVBE' },
];

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All Status' },
  { id: 'success', label: 'Success' },
  { id: 'failed', label: 'Failed' },
];

// ─── State Components ──────────────────────────────────────────────────────

function StateDisplay({
  icon,
  title,
  detail,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-16 text-center flex flex-col items-center gap-3 text-muted-foreground">
      <div>{icon}</div>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="text-xs max-w-md">{detail}</p>
      {children}
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  const m = error instanceof Error ? error.message.toLowerCase() : '';
  const detail =
    m.includes('429') || m.includes('rate')
      ? 'RPC rate limited. Cached items will be served while retrying…'
      : m.includes('timeout')
        ? 'RPC request timed out. Retrying…'
        : 'RPC temporarily unavailable. Retrying…';

  return (
    <StateDisplay
      icon={<XCircle className="w-8 h-8 text-rose-500" />}
      title="Unable to load transactions"
      detail={detail}
    />
  );
}

function EmptyBlockWindow({
  fromBlock,
  toBlock,
  pageIndex,
  onScanOlder,
  onJumpToLatest,
  isFetching,
}: {
  fromBlock: string;
  toBlock: string;
  pageIndex: number;
  onScanOlder: () => void;
  onJumpToLatest: () => void;
  isFetching: boolean;
}) {
  return (
    <div className="py-12 text-center flex flex-col items-center gap-3 text-muted-foreground">
      <History className="w-8 h-8 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">
        No events in block range {fromBlock} → {toBlock}
      </h3>
      <p className="text-xs max-w-md text-muted-foreground">
        This 1,500-block window (Page {pageIndex + 1}) has no transaction events. New deposits and
        transactions are on the latest blocks (Page 1).
      </p>
      <div className="flex items-center gap-2.5 mt-2">
        {pageIndex > 0 && (
          <button
            onClick={onJumpToLatest}
            disabled={isFetching}
            className="px-4 py-2 rounded-xl bg-[#BFFF00] text-black font-semibold text-xs shadow-xs hover:bg-[#a8e600] transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Jump to Latest (Page 1)</span>
          </button>
        )}
        <button
          onClick={onScanOlder}
          disabled={isFetching}
          className="px-4 py-2 rounded-xl bg-background hover:bg-muted text-foreground border border-border-subtle font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
        >
          <span>Scan Older Blocks</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyFilterResults({
  searchQuery,
  typeFilter,
  tokenFilter,
  statusFilter,
  viewMode,
  onResetFilters,
}: {
  searchQuery: string;
  typeFilter: TypeFilter;
  tokenFilter: TokenFilter;
  statusFilter: StatusFilter;
  viewMode: ViewMode;
  onResetFilters: () => void;
}) {
  return (
    <div className="py-12 text-center flex flex-col items-center gap-3 text-muted-foreground">
      <SlidersHorizontal className="w-8 h-8 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">
        No transactions match your filter criteria
      </h3>
      <p className="text-xs max-w-md text-muted-foreground">
        {viewMode === 'my'
          ? 'No transactions found for your connected wallet with the active filters in this 1,500-block window.'
          : 'No transactions found matching your search term, action type, token, or status in this block window.'}
      </p>
      <button
        onClick={onResetFilters}
        className="mt-2 px-4 py-2 rounded-xl bg-background hover:bg-muted text-foreground border border-border-subtle font-semibold text-xs transition-all flex items-center gap-1.5 shadow-xs"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
        <span>Reset All Filters</span>
      </button>
    </div>
  );
}

function ConnectWalletPrompt() {
  return (
    <div className="py-12 text-center flex flex-col items-center gap-3 text-muted-foreground">
      <div className="w-12 h-12 rounded-full bg-[#BFFF00]/10 flex items-center justify-center text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/25 mb-1">
        <Wallet className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-foreground">Connect Wallet to View Your Activity</h3>
      <p className="text-xs max-w-md text-muted-foreground">
        Switching to &ldquo;My Transactions&rdquo; requires an active wallet connection to isolate
        your deposits, redemptions, and transfers.
      </p>
    </div>
  );
}

// ─── Header Badge ──────────────────────────────────────────────────────────

function LiveIndicator({
  isLive,
  syncStatus,
  lastSyncTime,
}: {
  isLive: boolean;
  syncStatus: string;
  lastSyncTime: number;
}) {
  const secondsAgo = lastSyncTime ? Math.floor((Date.now() - lastSyncTime) / 1000) : null;

  const config = {
    live: {
      icon: <Radio className="w-3 h-3 text-[#5f8f00] dark:text-[#BFFF00]" />,
      color: 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border-[#BFFF00]/25',
      label: '● LiveWatcher',
    },
    syncing: {
      icon: <RefreshCw className="w-3 h-3 animate-spin text-[#5f8f00] dark:text-[#BFFF00]" />,
      color: 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border-[#BFFF00]/25',
      label: 'Syncing…',
    },
    stale: {
      icon: <Clock className="w-3 h-3 text-[#5f8f00] dark:text-[#BFFF00]" />,
      color: 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border-[#BFFF00]/25',
      label: `Stale (${secondsAgo}s ago)`,
    },
    offline: {
      icon: <WifiOff className="w-3 h-3 text-muted-foreground" />,
      color: 'bg-muted text-muted-foreground border-border-subtle',
      label: 'Offline',
    },
  };

  const c = config[syncStatus as keyof typeof config] ?? config.offline;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${c.color}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

// ─── Stats Row ─────────────────────────────────────────────────────────────

function StatsRow({ stats }: { stats: ExplorerData['stats'] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      <StatCard
        title="Total Transactions"
        value={String(stats.total)}
        subtitle="Current block window"
        icon={Layers}
        glowColor="blue"
      />
      <StatCard
        title="Deposits"
        value={String(stats.deposits)}
        subtitle="Protocol deposits"
        icon={ArrowUpRight}
        glowColor="emerald"
      />
      <StatCard
        title="Redemptions"
        value={String(stats.redeems)}
        subtitle="Protocol redemptions"
        icon={ArrowDownLeft}
        glowColor="purple"
      />
      <StatCard
        title="Fees"
        value={String(stats.fees)}
        subtitle="Fee collections"
        icon={DollarSign}
        glowColor="amber"
      />
      <StatCard
        title="Admin"
        value={String(stats.admin)}
        subtitle="Governance actions"
        icon={Settings}
        glowColor="cyan"
      />
    </div>
  );
}

// ─── CSV Exporter Helper ────────────────────────────────────────────────────

function exportTransactionsToCsv(
  transactions: TransactionGroup[],
  pageIndex: number,
  explorerUrl: string,
) {
  if (!transactions.length) return;

  const headers = [
    'Transaction Hash',
    'Block Number',
    'Timestamp',
    'Date (UTC)',
    'Type',
    'Method',
    'Status',
    'Amount',
    'Asset',
    'Initiator Wallet',
    'Gas Used',
    'Explorer URL',
  ];

  const rows = transactions.map((tx) => [
    tx.transactionHash,
    tx.blockNumber.toString(),
    tx.timestamp.toString(),
    tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : '',
    tx.actionType,
    tx.method,
    tx.status,
    tx.summaryAmount || '0',
    tx.summaryAsset || 'USDC',
    tx.wallet || tx.from || '',
    tx.gasUsed?.toString() || '0',
    `${explorerUrl}/tx/${tx.transactionHash}`,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `unifyvault-transactions-page${pageIndex + 1}-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ProtocolExplorerPage() {
  const [pageIndex, setPageIndex] = useState(0);
  const { chain, address, isConnected } = useAccount();
  const explorerUrl = getExplorerBaseUrl(chain?.id);

  // ─── View & Filter States ────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const {
    data,
    error,
    isFetching,
    state,
    syncStatus,
    lastSyncTime,
    isLive,
    controller,
    chainName,
    refresh,
  } = useTransactionExplorer(pageIndex);

  const allTransactions = useMemo(() => data?.transactions ?? [], [data?.transactions]);
  const stats = useMemo(
    () =>
      data?.stats ?? {
        total: 0,
        deposits: 0,
        redeems: 0,
        fees: 0,
        admin: 0,
      },
    [data?.stats],
  );

  const currentWindow = data?.currentWindow;
  const latestBlock = data?.latestBlock;

  const controllerShort = controller
    ? `${controller.slice(0, 6)}…${controller.slice(-4)}`
    : 'Connecting…';

  const userAddressLower = address?.toLowerCase();

  // Calculate my activity count in current block window
  const myTxCount = useMemo(() => {
    if (!userAddressLower) return 0;
    return allTransactions.filter((tx) => {
      const matchWallet = tx.wallet?.toLowerCase() === userAddressLower;
      const matchFrom = tx.from?.toLowerCase() === userAddressLower;
      const matchTo = tx.to?.toLowerCase() === userAddressLower;
      const matchParticipants = tx.allAddresses?.some((a) => a.toLowerCase() === userAddressLower);
      return matchWallet || matchFrom || matchTo || matchParticipants;
    }).length;
  }, [allTransactions, userAddressLower]);

  // ─── Apply All Filters ────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      // 1. View Mode (Global vs My Activity)
      if (viewMode === 'my') {
        if (!userAddressLower) return false;
        const matchWallet = tx.wallet?.toLowerCase() === userAddressLower;
        const matchFrom = tx.from?.toLowerCase() === userAddressLower;
        const matchTo = tx.to?.toLowerCase() === userAddressLower;
        const matchParticipants = tx.allAddresses?.some(
          (a) => a.toLowerCase() === userAddressLower,
        );
        if (!matchWallet && !matchFrom && !matchTo && !matchParticipants) {
          return false;
        }
      }

      // 2. Action Type Filter
      if (typeFilter !== 'all' && tx.actionType !== typeFilter) {
        return false;
      }

      // 3. Token Filter
      if (tokenFilter !== 'all') {
        const targetToken = tokenFilter.toUpperCase();
        const matchesSummary = tx.summaryAsset?.toUpperCase() === targetToken;
        const matchesInvolved = tx.involvedTokens?.some((t) => t.toUpperCase() === targetToken);
        if (!matchesSummary && !matchesInvolved) return false;
      }

      // 4. Status Filter
      if (statusFilter !== 'all') {
        if (tx.status !== statusFilter) return false;
      }

      // 5. Search Query (Hash, Address, Block, Method, Event)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        const matchHash = tx.transactionHash.toLowerCase().includes(q);
        const matchBlock = tx.blockNumber.toString().includes(q);
        const matchWallet = tx.wallet?.toLowerCase().includes(q);
        const matchFrom = tx.from?.toLowerCase().includes(q);
        const matchMethod = tx.method?.toLowerCase().includes(q);
        const matchAsset = tx.summaryAsset?.toLowerCase().includes(q);
        const matchParticipants = tx.allAddresses?.some((a) => a.toLowerCase().includes(q));
        const matchEvents = tx.events.some(
          (e) =>
            e.displayName.toLowerCase().includes(q) ||
            e.eventName.toLowerCase().includes(q) ||
            e.contractName.toLowerCase().includes(q),
        );

        if (
          !matchHash &&
          !matchBlock &&
          !matchWallet &&
          !matchFrom &&
          !matchMethod &&
          !matchAsset &&
          !matchParticipants &&
          !matchEvents
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    allTransactions,
    viewMode,
    userAddressLower,
    typeFilter,
    tokenFilter,
    statusFilter,
    searchQuery,
  ]);

  // Check if any filter is actively applied
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    typeFilter !== 'all' ||
    tokenFilter !== 'all' ||
    statusFilter !== 'all' ||
    viewMode === 'my';

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('all');
    setTokenFilter('all');
    setStatusFilter('all');
    setViewMode('global');
  }, []);

  return (
    <div className="space-y-6 py-4">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/60">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center space-x-2">
              <Activity className="w-7 h-7 text-[#5f8f00] dark:text-[#BFFF00]" />
              <span>Protocol Transactions</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/30 text-xs font-semibold">
              {chainName}
            </span>
            <LiveIndicator isLive={isLive} syncStatus={syncStatus} lastSyncTime={lastSyncTime} />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time on-chain transaction explorer — deposits, redemptions, fees, strategy
            rebalances, and P2P settlements.
          </p>
          {latestBlock && currentWindow && (
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">
              Block: {latestBlock.toString()} &nbsp;|&nbsp; Scanned Range:{' '}
              {currentWindow.fromBlock.toString()} → {currentWindow.toBlock.toString()}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2.5">
          {/* CSV Export */}
          <button
            onClick={() => exportTransactionsToCsv(filteredTransactions, pageIndex, explorerUrl)}
            disabled={filteredTransactions.length === 0}
            title="Export filtered transactions as CSV"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-background hover:bg-muted border border-border-subtle text-xs font-semibold text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </button>

          {/* Refresh Feed */}
          <button
            onClick={() => {
              setPageIndex(0);
              refresh();
            }}
            disabled={isFetching || state === 'unsupported'}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-background hover:bg-muted border border-border-subtle text-xs font-semibold text-foreground transition-all disabled:opacity-50 shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#5f8f00] dark:text-[#BFFF00]' : ''}`}
            />
            <span>{isFetching ? 'Syncing…' : 'Refresh Feed'}</span>
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <StatsRow stats={stats} />

      {/* ── Timeline & Filter Card ─────────────────────────────────── */}
      <TableCard
        title="Decoded Protocol Timeline"
        subtitle="Filter by activity mode, action type, token, or search by transaction hash / wallet address."
        icon={History}
        action={
          <div className="flex items-center gap-2">
            {pageIndex > 0 && (
              <button
                onClick={() => setPageIndex(0)}
                disabled={isFetching}
                className="px-2.5 py-1.5 rounded-lg bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] hover:bg-[#BFFF00]/20 text-xs font-semibold border border-[#BFFF00]/30 transition-all flex items-center gap-1 shadow-2xs"
              >
                <span>Latest (Page 1)</span>
              </button>
            )}
            <button
              onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
              disabled={pageIndex === 0 || isFetching}
              className="px-3 py-1.5 rounded-lg bg-background hover:bg-muted text-xs font-semibold text-foreground border border-border-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs text-foreground font-mono font-bold px-2.5 py-1 rounded bg-muted border border-border-subtle">
              Page {pageIndex + 1}
            </span>
            <button
              onClick={() => setPageIndex(pageIndex + 1)}
              disabled={(currentWindow && currentWindow.fromBlock === 0n) || isFetching}
              className="px-3 py-1.5 rounded-lg bg-background hover:bg-muted text-xs font-semibold text-foreground border border-border-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-2xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        {/* ── Interactive Toolbar: View Modes, Search, and Filters ───── */}
        <div className="space-y-3 pb-4 mb-3 border-b border-border-subtle/70">
          {/* Row 1: View Modes & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* View Mode Toggle: Global vs My Activity */}
            <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border-subtle self-start">
              <button
                onClick={() => setViewMode('global')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'global'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Protocol Global</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-muted text-muted-foreground border border-border-subtle">
                  {allTransactions.length}
                </span>
              </button>

              <button
                onClick={() => setViewMode('my')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'my'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Transactions</span>
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono border ${
                    isConnected && myTxCount > 0
                      ? 'bg-[#BFFF00]/15 text-[#5f8f00] dark:text-[#BFFF00] border-[#BFFF00]/30 font-bold'
                      : 'bg-muted text-muted-foreground border-border-subtle'
                  }`}
                >
                  {isConnected ? myTxCount : '—'}
                </span>
              </button>
            </div>

            {/* Real-time Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Tx Hash (0x...), Address, or Block #..."
                className="w-full pl-9 pr-8 py-1.5 bg-background border border-border-subtle rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-[#BFFF00]/50 transition-all font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Filter Selectors (Type, Token, Status) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" />
              <span>Filters:</span>
            </span>

            {/* Type Selector Dropdown / Pills */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="px-2.5 py-1 rounded-lg bg-background border border-border-subtle text-xs text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-[#BFFF00]/50 cursor-pointer shadow-2xs"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Token Selector Dropdown */}
            <select
              value={tokenFilter}
              onChange={(e) => setTokenFilter(e.target.value as TokenFilter)}
              className="px-2.5 py-1 rounded-lg bg-background border border-border-subtle text-xs text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-[#BFFF00]/50 cursor-pointer shadow-2xs"
            >
              {TOKEN_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Status Selector Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-2.5 py-1 rounded-lg bg-background border border-border-subtle text-xs text-foreground font-medium focus:outline-hidden focus:ring-1 focus:ring-[#BFFF00]/50 cursor-pointer shadow-2xs"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Active Filter Chips and Clear Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all shadow-2xs"
              >
                <X className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Active Filters Summary Bar */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
              <span className="font-mono">
                Showing <strong className="text-foreground">{filteredTransactions.length}</strong>{' '}
                of {allTransactions.length} transactions
              </span>

              {viewMode === 'my' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/25 text-[10px] font-medium">
                  Mode: My Activity (
                  {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Disconnected'})
                  <button onClick={() => setViewMode('global')}>
                    <X className="w-2.5 h-2.5 ml-0.5 hover:text-foreground" />
                  </button>
                </span>
              )}

              {typeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border-subtle text-foreground text-[10px] font-medium">
                  Type: {TYPE_OPTIONS.find((t) => t.id === typeFilter)?.label}
                  <button onClick={() => setTypeFilter('all')}>
                    <X className="w-2.5 h-2.5 ml-0.5 hover:text-foreground" />
                  </button>
                </span>
              )}

              {tokenFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border-subtle text-foreground text-[10px] font-medium">
                  Token: {tokenFilter}
                  <button onClick={() => setTokenFilter('all')}>
                    <X className="w-2.5 h-2.5 ml-0.5 hover:text-foreground" />
                  </button>
                </span>
              )}

              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border-subtle text-foreground text-[10px] font-medium">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('all')}>
                    <X className="w-2.5 h-2.5 ml-0.5 hover:text-foreground" />
                  </button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border-subtle text-foreground text-[10px] font-mono">
                  Search: &ldquo;{searchQuery}&rdquo;
                  <button onClick={() => setSearchQuery('')}>
                    <X className="w-2.5 h-2.5 ml-0.5 hover:text-foreground" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Loading */}
        {state === 'loading' && (
          <StateDisplay
            icon={<RefreshCw className="w-8 h-8 animate-spin text-[#5f8f00] dark:text-[#BFFF00]" />}
            title="Loading protocol transactions…"
            detail="Fetching and decoding on-chain events from all protocol contracts."
          />
        )}

        {/* Unsupported */}
        {state === 'unsupported' && (
          <StateDisplay
            icon={<AlertTriangle className="w-8 h-8 text-[#5f8f00] dark:text-[#BFFF00]" />}
            title="Network unsupported"
            detail="No protocol controller found for the connected network."
          />
        )}

        {/* Error */}
        {state === 'error' && <ErrorState error={error} />}

        {/* Connect Wallet Prompt (When My Activity is selected without wallet) */}
        {state === 'ready' && viewMode === 'my' && !isConnected && <ConnectWalletPrompt />}

        {/* Empty raw window */}
        {state === 'ready' &&
          allTransactions.length === 0 &&
          currentWindow &&
          (viewMode !== 'my' || isConnected) && (
            <EmptyBlockWindow
              fromBlock={currentWindow.fromBlock.toString()}
              toBlock={currentWindow.toBlock.toString()}
              pageIndex={pageIndex}
              onScanOlder={() => setPageIndex(pageIndex + 1)}
              onJumpToLatest={() => setPageIndex(0)}
              isFetching={isFetching}
            />
          )}

        {/* Empty filtered results */}
        {state === 'ready' &&
          allTransactions.length > 0 &&
          filteredTransactions.length === 0 &&
          (viewMode !== 'my' || isConnected) && (
            <EmptyFilterResults
              searchQuery={searchQuery}
              typeFilter={typeFilter}
              tokenFilter={tokenFilter}
              statusFilter={statusFilter}
              viewMode={viewMode}
              onResetFilters={resetFilters}
            />
          )}

        {/* Transactions List */}
        {state !== 'loading' &&
          state !== 'unsupported' &&
          state !== 'error' &&
          (viewMode !== 'my' || isConnected) &&
          filteredTransactions.length > 0 && (
            <div className="space-y-2.5">
              {filteredTransactions.map((tx) => (
                <TimelineCard key={tx.transactionHash} tx={tx} explorerUrl={explorerUrl} />
              ))}
            </div>
          )}

        {/* Footer */}
        <div className="pt-3 mt-2 border-t border-border-subtle/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5f8f00] dark:text-[#BFFF00]" />
            Controller: {controllerShort}
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <Layers className="w-3.5 h-3.5" />
            {isLive
              ? 'Live watcher active — new transactions appear automatically'
              : 'Polling for new transactions every 30s'}
          </span>
        </div>
      </TableCard>
    </div>
  );
}
