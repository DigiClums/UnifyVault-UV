'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPublicClient, http, formatUnits, Log } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CONTROLLER_ABI } from '../../../lib/contracts';
import { FALLBACK_ADDRESSES, RPC_URL } from '../../../constants';
import { TableCard } from '../../../components/ui/TableCard';
import { StatCard } from '../../../components/ui/StatCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  History,
  ExternalLink,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Layers,
} from 'lucide-react';

// Create dedicated Viem public client for Base Sepolia
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

export interface ParsedProtocolEvent {
  id: string;
  blockNumber: bigint;
  timestamp: number;
  eventType:
    | 'DepositExecuted'
    | 'RedeemExecuted'
    | 'DepositCompleted'
    | 'RedeemCompleted'
    | 'ProtocolFeeCollected'
    | 'EmergencyPaused'
    | 'EmergencyResumed';
  user: `0x${string}`;
  asset: string;
  amount: string;
  transactionHash: `0x${string}`;
  logIndex: number;
}

export default function AdminTransactionsPage() {
  const [events, setEvents] = useState<ParsedProtocolEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Cache block timestamps to avoid redundant RPC getBlock calls
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
      } catch (err) {
        return Math.floor(Date.now() / 1000);
      }
    },
    [blockTimeCache],
  );

  // Helper to parse individual logs into uniform event objects
  const parseLog = useCallback(
    async (log: Log): Promise<ParsedProtocolEvent | null> => {
      if (!log.blockNumber || !log.transactionHash) return null;

      const timestamp = await getBlockTimestamp(log.blockNumber);
      const logIndex = log.logIndex ?? 0;
      const id = `${log.transactionHash}-${logIndex}`;

      // Match event by topics / args
      // Using viem contract event decoding via getContractEvents returns decoded args
      const eventLog = log as unknown as {
        eventName: ParsedProtocolEvent['eventType'];
        args: Record<string, any>;
      };

      const eventName = eventLog.eventName;
      const args = eventLog.args || {};

      let user: `0x${string}` = '0x0000000000000000000000000000000000000000';
      let asset = 'USDC';
      let amount = '0.00';

      switch (eventName) {
        case 'DepositExecuted':
          user = (args.user as `0x${string}`) || user;
          asset = 'USDC Multi-Asset';
          amount = args.depositAmount
            ? `$${Number(formatUnits(args.depositAmount as bigint, 6)).toFixed(2)}`
            : '$0.00';
          break;

        case 'RedeemExecuted':
          user = (args.user as `0x${string}`) || user;
          asset = 'USDC Multi-Asset';
          amount = args.usdcReturned
            ? `$${Number(formatUnits(args.usdcReturned as bigint, 6)).toFixed(2)}`
            : '$0.00';
          break;

        case 'DepositCompleted':
          user = (args.receiver as `0x${string}`) || user;
          asset = (args.asset as string) === FALLBACK_ADDRESSES.USDC ? 'USDC' : 'Collateral';
          amount = args.grossDeposit
            ? `$${Number(formatUnits(args.grossDeposit as bigint, 6)).toFixed(2)}`
            : '$0.00';
          break;

        case 'RedeemCompleted':
          user = (args.owner as `0x${string}`) || (args.receiver as `0x${string}`) || user;
          asset = (args.asset as string) === FALLBACK_ADDRESSES.USDC ? 'USDC' : 'Collateral';
          amount = args.netAssets
            ? `$${Number(formatUnits(args.netAssets as bigint, 6)).toFixed(2)}`
            : '$0.00';
          break;

        case 'ProtocolFeeCollected':
          user = (args.payer as `0x${string}`) || user;
          asset = (args.asset as string) === FALLBACK_ADDRESSES.USDC ? 'USDC' : 'Collateral';
          amount = args.feeAmount
            ? `$${Number(formatUnits(args.feeAmount as bigint, 6)).toFixed(2)}`
            : '$0.00';
          break;

        case 'EmergencyPaused':
        case 'EmergencyResumed':
          user = (args.caller as `0x${string}`) || user;
          asset = 'N/A';
          amount = 'N/A';
          break;

        default:
          return null;
      }

      return {
        id,
        blockNumber: log.blockNumber,
        timestamp,
        eventType: eventName,
        user,
        asset,
        amount,
        transactionHash: log.transactionHash,
        logIndex,
      };
    },
    [getBlockTimestamp],
  );

  // Fetch all historical events
  const fetchEvents = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Query events directly via getContractEvents
      const contractEvents = await publicClient.getContractEvents({
        address: FALLBACK_ADDRESSES.CONTROLLER,
        abi: CONTROLLER_ABI,
        fromBlock: 0n, // Scan from genesis / deployment block
        toBlock: 'latest',
      });

      const parsedPromises = contractEvents.map((log) => parseLog(log as unknown as Log));
      const parsedResults = await Promise.all(parsedPromises);
      const validEvents = parsedResults.filter((e): e is ParsedProtocolEvent => e !== null);

      // Sort newest events first (highest blockNumber, highest logIndex)
      validEvents.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) {
          return b.blockNumber > a.blockNumber ? 1 : -1;
        }
        return b.logIndex - a.logIndex;
      });

      setEvents(validEvents);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error fetching protocol events:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [parseLog]);

  // Initial load & real-time watcher setup
  useEffect(() => {
    fetchEvents();

    // Subscribe to new incoming contract events in real-time using watchContractEvent
    const unwatch = publicClient.watchContractEvent({
      address: FALLBACK_ADDRESSES.CONTROLLER,
      abi: CONTROLLER_ABI,
      onLogs: async (logs) => {
        const newParsedPromises = logs.map((log) => parseLog(log as unknown as Log));
        const newParsedResults = await Promise.all(newParsedPromises);
        const newValidEvents = newParsedResults.filter((e): e is ParsedProtocolEvent => e !== null);

        if (newValidEvents.length > 0) {
          setEvents((prev) => {
            const combined = [...newValidEvents, ...prev];
            // Remove duplicates by ID
            const uniqueMap = new Map<string, ParsedProtocolEvent>();
            combined.forEach((ev) => uniqueMap.set(ev.id, ev));
            const sorted = Array.from(uniqueMap.values());
            sorted.sort((a, b) => {
              if (b.blockNumber !== a.blockNumber) {
                return b.blockNumber > a.blockNumber ? 1 : -1;
              }
              return b.logIndex - a.logIndex;
            });
            return sorted;
          });
          setLastSyncTime(new Date());
        }
      },
    });

    return () => {
      unwatch();
    };
  }, [fetchEvents, parseLog]);

  // Stats calculation
  const totalLogsCount = events.length;
  const depositCount = events.filter((e) => e.eventType.includes('Deposit')).length;
  const redeemCount = events.filter((e) => e.eventType.includes('Redeem')).length;
  const isPaused = events.length > 0 && events[0].eventType === 'EmergencyPaused';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Live Protocol Activity Stream
            </h1>
            <StatusBadge status="Admin" label="GOVERNANCE" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time on-chain event stream from UnifyVaultController on Base Sepolia.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {lastSyncTime && (
            <span className="text-[11px] text-slate-400 font-mono">
              Synced: {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchEvents}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
            title="Refresh On-Chain Events"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`}
            />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Logs'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Activity Logs"
          value={totalLogsCount.toString()}
          subtitle="Events On-Chain"
          icon={History}
          glowColor="blue"
        />
        <StatCard
          title="Deposit Operations"
          value={depositCount.toString()}
          subtitle="Executed Deposits"
          icon={ArrowUpRight}
          glowColor="emerald"
        />
        <StatCard
          title="Redeem Operations"
          value={redeemCount.toString()}
          subtitle="Executed Redemptions"
          icon={ArrowDownLeft}
          glowColor="purple"
        />
        <StatCard
          title="Controller Status"
          value={isPaused ? 'Paused' : 'Active'}
          subtitle={isPaused ? 'Emergency Guard Active' : 'Normal Operations'}
          icon={isPaused ? ShieldAlert : ShieldCheck}
          glowColor={isPaused ? 'amber' : 'emerald'}
        />
      </div>

      {/* Event Table Card */}
      <TableCard
        title="Auditable Protocol Transaction Feed"
        subtitle="Live event logs queried via viem from UnifyVaultController on Base Sepolia"
        icon={History}
      >
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">
              Syncing live Base Sepolia event logs...
            </p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
            <Layers className="w-10 h-10 text-slate-500" />
            <h3 className="text-base font-bold text-white">No transactions yet</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              No on-chain events have been emitted by UnifyVaultController on Base Sepolia yet. New
              transactions will appear automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Block</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">User / Operator</th>
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50 font-mono">
                {events.map((ev) => {
                  const dateStr = new Date(ev.timestamp * 1000).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Block Number */}
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        #{ev.blockNumber.toString()}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-400">{dateStr}</td>

                      {/* Event Type Badge */}
                      <td className="py-3 px-4">
                        <EventBadge eventType={ev.eventType} />
                      </td>

                      {/* User Address */}
                      <td className="py-3 px-4 text-slate-200">
                        {ev.user !== '0x0000000000000000000000000000000000000000' ? (
                          <span title={ev.user}>
                            {ev.user.slice(0, 6)}...{ev.user.slice(-4)}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Asset */}
                      <td className="py-3 px-4 text-slate-300 font-medium">{ev.asset}</td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-bold text-slate-100">{ev.amount}</td>

                      {/* Explorer Link */}
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`https://sepolia.basescan.org/tx/${ev.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 transition-colors hover:underline"
                          title="View on BaseScan Explorer"
                        >
                          <span>
                            {ev.transactionHash.slice(0, 6)}...{ev.transactionHash.slice(-4)}
                          </span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
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

function EventBadge({ eventType }: { eventType: ParsedProtocolEvent['eventType'] }) {
  switch (eventType) {
    case 'DepositExecuted':
    case 'DepositCompleted':
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ArrowUpRight className="w-3 h-3" />
          <span>{eventType}</span>
        </span>
      );

    case 'RedeemExecuted':
    case 'RedeemCompleted':
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <ArrowDownLeft className="w-3 h-3" />
          <span>{eventType}</span>
        </span>
      );

    case 'ProtocolFeeCollected':
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <DollarSign className="w-3 h-3" />
          <span>{eventType}</span>
        </span>
      );

    case 'EmergencyPaused':
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertTriangle className="w-3 h-3" />
          <span>{eventType}</span>
        </span>
      );

    case 'EmergencyResumed':
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <CheckCircle2 className="w-3 h-3" />
          <span>{eventType}</span>
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300">
          {eventType}
        </span>
      );
  }
}
