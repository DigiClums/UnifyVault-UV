'use client';

import React, { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { getExplorerBaseUrl } from '../../constants';
import { useTransactionExplorer } from '../../hooks/useTransactionExplorer';
import type { ExplorerData } from '../../hooks/useTransactionExplorer';
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
} from 'lucide-react';

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
      ? 'RPC rate limited. Please wait a moment and try again.'
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
  onScanOlder,
  isFetching,
}: {
  fromBlock: string;
  toBlock: string;
  onScanOlder: () => void;
  isFetching: boolean;
}) {
  return (
    <div className="py-12 text-center flex flex-col items-center gap-3 text-muted-foreground">
      <History className="w-8 h-8 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">
        No events in block range {fromBlock} → {toBlock}
      </h3>
      <p className="text-xs max-w-md text-muted-foreground">
        This 1,500-block window has no transaction events. Scan older blocks to view past protocol
        transactions.
      </p>
      <button
        onClick={onScanOlder}
        disabled={isFetching}
        className="mt-2 px-4 py-2 rounded-xl bg-[#BFFF00] text-black font-semibold text-xs shadow-xs hover:bg-[#a8e600] transition-all flex items-center gap-1.5 disabled:opacity-50"
      >
        <span>Scan Older Blocks</span>
        <ChevronRight className="w-4 h-4" />
      </button>
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

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ProtocolExplorerPage() {
  const [pageIndex, setPageIndex] = useState(0);
  const { chain } = useAccount();
  const explorerUrl = getExplorerBaseUrl(chain?.id);

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

  const transactions = useMemo(() => data?.transactions ?? [], [data?.transactions]);
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
            Real-time on-chain transaction explorer — deposits, redemptions, fees, and admin
            activity across all protocol contracts.
          </p>
          {latestBlock && currentWindow && (
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">
              Block: {latestBlock.toString()} &nbsp;|&nbsp; Scanned Range:{' '}
              {currentWindow.fromBlock.toString()} → {currentWindow.toBlock.toString()}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refresh()}
            disabled={isFetching || state === 'unsupported'}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-background hover:bg-muted border border-border-subtle text-xs font-semibold text-foreground transition-all disabled:opacity-50 shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#5f8f00] dark:text-[#BFFF00]' : ''}`}
            />
            <span>{isFetching ? 'Syncing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <StatsRow stats={stats} />

      {/* ── Timeline ───────────────────────────────────────────────── */}
      <TableCard
        title="Decoded Protocol Timeline"
        subtitle="Each row is one transaction. Click to expand the full multi-contract execution trace."
        icon={History}
        action={
          <div className="flex items-center gap-2">
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

        {/* Empty window */}
        {state === 'ready' && transactions.length === 0 && currentWindow && (
          <EmptyBlockWindow
            fromBlock={currentWindow.fromBlock.toString()}
            toBlock={currentWindow.toBlock.toString()}
            onScanOlder={() => setPageIndex(pageIndex + 1)}
            isFetching={isFetching}
          />
        )}

        {/* Transactions */}
        {state !== 'loading' &&
          state !== 'unsupported' &&
          state !== 'error' &&
          transactions.length > 0 && (
            <div className="space-y-2.5">
              {transactions.map((tx) => (
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
