'use client';
import { useMemo, useState } from 'react';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { getExplorerBaseUrl } from '../../../constants';
import { TableCard } from '../../../components/ui/TableCard';
import { StatCard } from '../../../components/ui/StatCard';
import { useProtocolTransactionExplorer } from '../../../hooks/useProtocolTransactionExplorer';
const short = (v?: string) => (v ? `${v.slice(0, 6)}…${v.slice(-4)}` : '—');
function ErrorState({ error }: { error: unknown }) {
  const m = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    <State
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
export default function AdminTransactionsPage() {
  const [page, setPage] = useState(0);
  const { chain } = useAccount();
  const explorer = getExplorerBaseUrl(chain?.id);
  const { data, error, isFetching, refetch, state, controller } =
    useProtocolTransactionExplorer(page);
  const events = data?.events ?? [];
  const counts = useMemo(
    () => ({
      deposits: events.filter((x) => x.eventName.startsWith('Deposit')).length,
      redeems: events.filter((x) => x.eventName.startsWith('Redeem')).length,
      fees: events.filter((x) => x.eventName === 'ProtocolFeeCollected').length,
    }),
    [events],
  );
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Live Protocol Activity Stream
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {chain
              ? `${chain.name} · controller ${short(controller)}`
              : 'Connect a supported protocol network to load activity.'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching || state === 'unsupported'}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>{isFetching ? 'Syncing…' : 'Refresh'}</span>
        </button>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Activity logs"
          value={String(events.length)}
          subtitle="Current block window"
          icon={History}
          glowColor="blue"
        />
        <StatCard
          title="Deposits"
          value={String(counts.deposits)}
          subtitle="Decoded protocol events"
          icon={CheckCircle2}
          glowColor="emerald"
        />
        <StatCard
          title="Redemptions"
          value={String(counts.redeems)}
          subtitle="Decoded protocol events"
          icon={History}
          glowColor="purple"
        />
        <StatCard
          title="Fee collections"
          value={String(counts.fees)}
          subtitle="Decoded protocol events"
          icon={History}
          glowColor="amber"
        />
      </div>
      <TableCard
        title="Auditable transaction feed"
        subtitle="Bounded RPC event window; confirmed receipts; live watcher enabled"
        icon={History}
      >
        {state === 'loading' && (
          <State
            icon={<RefreshCw className="w-8 h-8 animate-spin" />}
            title="Loading live protocol events"
            detail="Fetching a bounded recent block window…"
          />
        )}
        {state === 'unsupported' && (
          <State
            icon={<AlertTriangle className="w-8 h-8" />}
            title="Network unsupported"
            detail="The Protocol Directory did not resolve a controller for the connected network."
          />
        )}
        {state === 'error' && <ErrorState error={error} />}
        {state === 'ready' && !events.length && (
          <State
            icon={<History className="w-8 h-8" />}
            title="No events in this block window"
            detail="The RPC query succeeded. Load older blocks to continue searching."
          />
        )}
        {state === 'ready' && !!events.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3">Block / time</th>
                  <th className="py-3 px-3">Method / event</th>
                  <th className="py-3 px-3">Wallet</th>
                  <th className="py-3 px-3">Asset / amount</th>
                  <th className="py-3 px-3">USD value</th>
                  <th className="py-3 px-3">Receipt</th>
                  <th className="py-3 px-3 text-right">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 font-mono">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 text-slate-300">
                      #{e.blockNumber.toString()}
                      <br />
                      <span className="text-slate-500">
                        {new Date(e.timestamp * 1000).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      {e.method}
                      <br />
                      <span className="text-slate-500">{e.eventName}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300" title={e.wallet}>
                      {short(e.wallet)}
                    </td>
                    <td className="py-3 px-3 text-slate-300" title={e.asset}>
                      {e.amountDisplay ?? short(e.asset)}
                    </td>
                    <td className="py-3 px-3 text-slate-500">Unavailable on-chain</td>
                    <td className="py-3 px-3 text-slate-300">
                      <span
                        className={e.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}
                      >
                        {e.status}
                      </span>
                      <br />
                      <span className="text-slate-500">
                        {e.gasUsed?.toString() ?? '—'} gas ·{' '}
                        {e.gasFeeWei ? `${formatEther(e.gasFeeWei)} ETH` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <a
                        href={`${explorer}/tx/${e.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-400 hover:underline"
                      >
                        {short(e.transactionHash)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {state === 'ready' && (
          <footer className="flex justify-between p-4 border-t border-border-subtle">
            <button
              onClick={() => setPage((x) => Math.max(0, x - 1))}
              disabled={!page || isFetching}
              className="inline-flex items-center gap-1 text-xs text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              Newer
            </button>
            <span className="text-xs text-slate-500">Block window {page + 1}</span>
            <button
              onClick={() => setPage((x) => x + 1)}
              disabled={isFetching}
              className="inline-flex items-center gap-1 text-xs text-slate-300 disabled:opacity-40"
            >
              Load older
              <ChevronRight className="w-4 h-4" />
            </button>
          </footer>
        )}
      </TableCard>
    </div>
  );
}
function State({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="py-16 text-center flex flex-col items-center gap-3 text-slate-400">
      <div>{icon}</div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-xs max-w-md">{detail}</p>
    </div>
  );
}
