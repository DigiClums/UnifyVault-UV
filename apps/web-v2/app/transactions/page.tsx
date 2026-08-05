'use client';

import React, { useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { getExplorerBaseUrl } from '../../constants';
import { useProtocolTransactionExplorer } from '../../hooks/useProtocolTransactionExplorer';
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
} from 'lucide-react';

// ─── State Components ──────────────────────────────────────────────────────

function StateDisplay({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="py-16 text-center flex flex-col items-center gap-3 text-slate-400">
      <div>{icon}</div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-xs max-w-md">{detail}</p>
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  const m = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    <StateDisplay
      icon={<XCircle className="w-8 h-8" />}
      title="Transaction source unavailable"
      detail={
        m.includes('429') || m.includes('rate limit')
          ? 'RPC rate limited. Please try again shortly.'
          : 'RPC query failed. No transaction data was loaded.'
      }
    />
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ProtocolExplorerPage() {
  const [page, setPage] = useState(0);
  const { chain } = useAccount();
  const publicClient = usePublicClient();
  const explorerUrl = getExplorerBaseUrl(chain?.id);

  const { data, error, isFetching, refetch, state, controller } =
    useProtocolTransactionExplorer(page);

  const transactions = useMemo(() => data?.transactions ?? [], [data?.transactions]);

  // Compute stats
  const stats = useMemo(() => {
    const counts = {
      deposits: 0,
      redeems: 0,
      fees: 0,
      admin: 0,
      total: transactions.length,
    };
    for (const tx of transactions) {
      switch (tx.actionType) {
        case 'deposit':
          counts.deposits++;
          break;
        case 'redeem':
          counts.redeems++;
          break;
        case 'fee':
          counts.fees++;
          break;
        case 'admin':
          counts.admin++;
          break;
      }
    }
    return counts;
  }, [transactions]);

  const controllerShort = controller
    ? `${controller.slice(0, 6)}…${controller.slice(-4)}`
    : 'Connecting…';

  return (
    <div className="space-y-6 py-4">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center space-x-2">
              <Activity className="w-7 h-7 text-accent-blue" />
              <span>Protocol Transaction Explorer</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-xs font-semibold">
              {chain?.name ?? 'Base Mainnet'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Every protocol action decoded into an expandable on-chain timeline — deposits,
            redemptions, fees, and custody events across all protocol contracts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching || state === 'unsupported'}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-accent-blue' : ''}`}
            />
            <span>{isFetching ? 'Syncing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          subtitle="Live protocol events"
          icon={ArrowUpRight}
          glowColor="emerald"
        />
        <StatCard
          title="Redemptions"
          value={String(stats.redeems)}
          subtitle="Live protocol events"
          icon={ArrowDownLeft}
          glowColor="purple"
        />
        <StatCard
          title="Fee & Admin"
          value={String(stats.fees + stats.admin)}
          subtitle="Fee collections + governance"
          icon={DollarSign}
          glowColor="amber"
        />
      </div>

      {/* ── Timeline Cards ──────────────────────────────────────────── */}
      <TableCard
        title="Decoded Protocol Timeline"
        subtitle="Each transaction is a fully decoded, expandable audit trail. Click any row to expand."
        icon={History}
        action={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 font-mono px-1 min-w-[3ch] text-center">
              {page + 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        }
      >
        {state === 'loading' && (
          <StateDisplay
            icon={<RefreshCw className="w-8 h-8 animate-spin" />}
            title="Loading live protocol events…"
            detail="Fetching and decoding transaction receipts across all protocol contracts."
          />
        )}

        {state === 'unsupported' && (
          <StateDisplay
            icon={<AlertTriangle className="w-8 h-8" />}
            title="Network unsupported"
            detail="The Protocol Directory did not resolve a controller for the connected network."
          />
        )}

        {state === 'error' && <ErrorState error={error} />}

        {state === 'ready' && transactions.length === 0 && (
          <StateDisplay
            icon={<History className="w-8 h-8" />}
            title="No events in this block window"
            detail="The RPC query succeeded. Load older blocks to continue searching."
          />
        )}

        {state === 'ready' && transactions.length > 0 && (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <TimelineCard key={tx.transactionHash} tx={tx} explorerUrl={explorerUrl} />
            ))}
          </div>
        )}

        {/* Footer with contract info */}
        <div className="pt-3 mt-2 border-t border-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Controller: {controllerShort}
          </span>
          <span className="flex items-center gap-1.5">
            <Layers className="w-3 h-3" />
            Live watcher enabled — events appear in real time
          </span>
        </div>
      </TableCard>
    </div>
  );
}
