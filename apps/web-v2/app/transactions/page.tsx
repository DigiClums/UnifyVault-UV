'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { CONTROLLER_ABI } from '../../lib/contracts';
import { RPC_URL } from '../../constants';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import { TableCard } from '../../components/ui/TableCard';
import { StatCard } from '../../components/ui/StatCard';
import {
  History,
  RefreshCw,
  Layers,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { useTransactionHistory } from '../../hooks/useIndexerData';

const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

export interface DisplayEvent {
  id: string;
  blockNumber: number;
  timestamp: number;
  type: string;
  user: string;
  asset: string;
  amountFormatted: string;
  txHash: `0x${string}`;
  logIndex: number;
}

export default function ActivityPage() {
  const { controller } = useProtocolDirectory();
  const { transactions: indexerTxs, isLoading: isIndexerLoading } = useTransactionHistory();
  const [onChainEvents, setOnChainEvents] = useState<DisplayEvent[]>([]);
  const [isOnChainLoading, setIsOnChainLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const blockTimeCache = useMemo(() => new Map<bigint, number>(), []);

  const getBlockTimestamp = useCallback(
    async (blockNumber: bigint): Promise<number> => {
      if (blockTimeCache.has(blockNumber)) {
        return blockTimeCache.get(blockNumber)!;
      }
      try {
        const block = await publicClient.getBlock({ blockNumber });
        const ts = Number(block.timestamp);
        blockTimeCache.set(blockNumber, ts);
        return ts;
      } catch {
        return Math.floor(Date.now() / 1000);
      }
    },
    [blockTimeCache],
  );

  const fetchOnChainEvents = useCallback(async () => {
    if (!controller) return;
    setIsRefreshing(true);
    try {
      const contractEvents = await publicClient.getContractEvents({
        address: controller,
        abi: CONTROLLER_ABI,
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      const parsedPromises = contractEvents.map(async (log) => {
        if (!log.blockNumber || !log.transactionHash) return null;
        const ts = await getBlockTimestamp(log.blockNumber);
        const logIdx = log.logIndex ?? 0;
        const id = `${log.transactionHash}-${logIdx}`;

        const eventLog = log as unknown as {
          eventName: string;
          args: Record<string, any>;
        };

        const eventName = eventLog.eventName;
        const args = eventLog.args || {};

        let user = '0x0000...0000';
        const asset = 'USDC';
        let amountFormatted = '0.00 USDC';

        switch (eventName) {
          case 'DepositExecuted':
          case 'DepositCompleted':
            user = (args.user as string) || (args.receiver as string) || user;
            amountFormatted =
              args.depositAmount || args.grossDeposit
                ? `${Number(formatUnits((args.depositAmount || args.grossDeposit) as bigint, 6)).toFixed(2)} USDC`
                : '0.00 USDC';
            break;
          case 'RedeemExecuted':
          case 'RedeemCompleted':
            user = (args.user as string) || (args.owner as string) || user;
            amountFormatted =
              args.usdcReturned || args.netAssets
                ? `${Number(formatUnits((args.usdcReturned || args.netAssets) as bigint, 6)).toFixed(2)} USDC`
                : '0.00 USDC';
            break;
          case 'ProtocolFeeCollected':
            user = (args.payer as string) || user;
            amountFormatted = args.feeAmount
              ? `${Number(formatUnits(args.feeAmount as bigint, 6)).toFixed(2)} USDC`
              : '0.00 USDC';
            break;
          case 'EmergencyPaused':
          case 'EmergencyResumed':
            user = (args.caller as string) || user;
            amountFormatted = 'N/A';
            break;
        }

        return {
          id,
          blockNumber: Number(log.blockNumber),
          timestamp: ts,
          type: eventName,
          user,
          asset,
          amountFormatted,
          txHash: log.transactionHash as `0x${string}`,
          logIndex: logIdx,
        };
      });

      const rawResults = await Promise.all(parsedPromises);
      const cleanEvents = rawResults.filter((e): e is DisplayEvent => e !== null);

      cleanEvents.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) return b.blockNumber - a.blockNumber;
        return b.logIndex - a.logIndex;
      });

      setOnChainEvents(cleanEvents);
      setLastSynced(new Date());
    } catch (err) {
      console.warn('Viem event fetch warning:', err);
    } finally {
      setIsOnChainLoading(false);
      setIsRefreshing(false);
    }
  }, [controller, getBlockTimestamp]);

  useEffect(() => {
    if (!controller) return;
    fetchOnChainEvents();

    const unwatch = publicClient.watchContractEvent({
      address: controller,
      abi: CONTROLLER_ABI,
      onLogs: () => {
        fetchOnChainEvents();
      },
    });

    return () => {
      unwatch();
    };
  }, [controller, fetchOnChainEvents]);

  const displayList: DisplayEvent[] = useMemo(() => {
    if (onChainEvents.length > 0) {
      return onChainEvents;
    }

    return indexerTxs
      .map((tx, idx) => {
        const blockNum = tx.blockNumber || 0;
        const type = tx.type || 'EVENT';
        const user = tx.user || tx.from || '-';
        let amountFormatted = '-';

        if (type === 'DEPOSIT') {
          const raw = typeof tx.amountIn === 'string' ? tx.amountIn : '0';
          amountFormatted = `${parseFloat(formatUnits(BigInt(raw), 6)).toFixed(2)} USDC`;
        } else if (type === 'REDEEM') {
          const raw = typeof tx.grossAmount === 'string' ? tx.grossAmount : '0';
          amountFormatted = `${parseFloat(formatUnits(BigInt(raw), 6)).toFixed(2)} USDC`;
        } else if (type === 'FEE_COLLECTED') {
          const raw = typeof tx.amount === 'string' ? tx.amount : '0';
          amountFormatted = `${parseFloat(formatUnits(BigInt(raw), 6)).toFixed(2)} USDC`;
        }

        return {
          id: `${tx.txHash}-${tx.logIndex || idx}`,
          blockNumber: blockNum,
          timestamp: tx.timestamp ? Math.floor(new Date(tx.timestamp).getTime() / 1000) : 0,
          type,
          user,
          asset: 'USDC',
          amountFormatted,
          txHash: (tx.txHash || '0x0') as `0x${string}`,
          logIndex: tx.logIndex || idx,
        };
      })
      .sort((a, b) => b.blockNumber - a.blockNumber);
  }, [onChainEvents, indexerTxs]);

  const isLoading = isOnChainLoading && isIndexerLoading;

  function renderEventTypeBadge(type: string) {
    switch (type) {
      case 'DEPOSIT':
      case 'DepositExecuted':
      case 'DepositCompleted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowUpRight className="w-3 h-3" /> Deposit
          </span>
        );
      case 'REDEEM':
      case 'RedeemExecuted':
      case 'RedeemCompleted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ArrowDownLeft className="w-3 h-3" /> Redeem
          </span>
        );
      case 'FEE_COLLECTED':
      case 'ProtocolFeeCollected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <DollarSign className="w-3 h-3" /> Fee Collected
          </span>
        );
      case 'EmergencyPaused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> Paused
          </span>
        );
      case 'EmergencyResumed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CheckCircle2 className="w-3 h-3" /> Resumed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {type}
          </span>
        );
    }
  }

  const controllerShort = controller
    ? `${controller.slice(0, 6)}...${controller.slice(-4)}`
    : 'Connecting...';

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center space-x-2">
              <Activity className="w-7 h-7 text-accent-blue" />
              <span>Live Protocol Event Timeline</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-xs font-semibold">
              Base Mainnet
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time auditable on-chain transaction stream of deposits, share redemptions, and fee
            collection.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {lastSynced && (
            <span className="text-[11px] text-slate-400 font-mono">
              Synced: {lastSynced.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchOnChainEvents}
            disabled={isRefreshing || !controller}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent-blue' : ''}`}
            />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Logs'}</span>
          </button>
        </div>
      </div>

      {/* Verified On-Chain Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Network Connection"
          value="Base Mainnet"
          subtitle="Chain ID 8453"
          icon={History}
          glowColor="blue"
        />
        <StatCard
          title="Total Events Logged"
          value={displayList.length.toString()}
          subtitle="On-Chain Transactions"
          icon={Layers}
          glowColor="emerald"
        />
        <StatCard
          title="Controller Contract"
          value={controllerShort}
          subtitle="Dynamic Directory Address"
          icon={CheckCircle2}
          glowColor="purple"
        />
      </div>

      {/* Event Timeline Table Card */}
      <TableCard
        title="Auditable Protocol Event Feed"
        subtitle="Live contract logs queried via Viem from UnifyVaultController"
        icon={History}
      >
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-accent-blue" />
            <p className="text-sm font-medium">Syncing live Base Mainnet event stream...</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Layers className="w-10 h-10 text-slate-500" />
            <h3 className="text-base font-bold text-white">No transactions yet</h3>
            <p className="text-xs text-slate-400 max-w-sm text-center">
              Contract events will appear here in real-time as users execute deposits, redemptions,
              and fee collection.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">User / Account</th>
                  <th className="py-3 px-4">Amount / Value</th>
                  <th className="py-3 px-4">Block Number</th>
                  <th className="py-3 px-4 text-right">Transaction Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono">
                {displayList.map((tx) => {
                  const account = tx.user || '-';
                  const accountShort =
                    account.length > 10 ? `${account.slice(0, 6)}...${account.slice(-4)}` : account;
                  const txShort = `${tx.txHash.slice(0, 6)}...${tx.txHash.slice(-4)}`;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-sans">{renderEventTypeBadge(tx.type)}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {account !== '-' && account !== '0x0000...0000' ? (
                          <a
                            href={`https://basescan.org/address/${account}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-accent-blue transition-colors inline-flex items-center gap-1"
                            title={account}
                          >
                            {accountShort}
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{tx.amountFormatted}</td>
                      <td className="py-3 px-4 text-slate-400">#{tx.blockNumber.toString()}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        <a
                          href={`https://basescan.org/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent-blue hover:underline"
                          title="View on BaseScan"
                        >
                          {txShort}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </div>
  );
}
