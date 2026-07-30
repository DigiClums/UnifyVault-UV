'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { TREASURY_ABI, CONTROLLER_ABI, ORACLE_MANAGER_ABI } from '../../lib/contracts';
import { FALLBACK_ADDRESSES, RPC_URL } from '../../constants';
import { formatUSD } from '../../lib/math';
import { StatCard } from '../../components/ui/StatCard';
import { TableCard } from '../../components/ui/TableCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Vault,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  History,
  RefreshCw,
  ExternalLink,
  Layers,
} from 'lucide-react';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

export interface PublicTreasuryLog {
  id: string;
  blockNumber: bigint;
  timestamp: number;
  type: 'TreasuryWithdrawal' | 'FeeCollected' | 'NativeWithdrawn';
  asset: string;
  recipient: `0x${string}`;
  amountFormatted: string;
  transactionHash: `0x${string}`;
  logIndex: number;
}

export default function TreasuryPage() {
  const [treasuryLogs, setTreasuryLogs] = useState<PublicTreasuryLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState<boolean>(true);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

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

  const fetchTreasuryLogs = useCallback(async () => {
    setIsRefreshingLogs(true);
    try {
      const logs = await publicClient.getContractEvents({
        address: FALLBACK_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        fromBlock: 0n,
        toBlock: 'latest',
      });

      const parsedPromises = logs.map(async (log) => {
        if (!log.blockNumber || !log.transactionHash) return null;
        const ts = await getBlockTimestamp(log.blockNumber);
        const logIndex = log.logIndex ?? 0;
        const id = `${log.transactionHash}-${logIndex}`;

        const eventLog = log as unknown as {
          eventName: PublicTreasuryLog['type'];
          args: Record<string, any>;
        };

        const eventName = eventLog.eventName;
        const args = eventLog.args || {};

        let assetSymbol = 'USDC';
        let amountFormatted = '0.00';
        let rec: `0x${string}` = '0x0000000000000000000000000000000000000000';

        const assetAddr = (args.asset as string)?.toLowerCase() || '';

        if (assetAddr === FALLBACK_ADDRESSES.WBTC.toLowerCase()) {
          assetSymbol = 'WBTC';
        } else if (assetAddr === FALLBACK_ADDRESSES.WETH.toLowerCase()) {
          assetSymbol = 'WETH';
        } else {
          assetSymbol = 'USDC';
        }

        const decimals = assetSymbol === 'WBTC' ? 8 : assetSymbol === 'WETH' ? 18 : 6;

        if (eventName === 'TreasuryWithdrawal') {
          rec = (args.recipient as `0x${string}`) || rec;
          amountFormatted = args.amount
            ? `${Number(formatUnits(args.amount as bigint, decimals)).toFixed(4)} ${assetSymbol}`
            : `0.00 ${assetSymbol}`;
        } else if (eventName === 'FeeCollected') {
          rec = (args.from as `0x${string}`) || rec;
          amountFormatted = args.amount
            ? `${Number(formatUnits(args.amount as bigint, decimals)).toFixed(4)} ${assetSymbol}`
            : `0.00 ${assetSymbol}`;
        } else if (eventName === 'NativeWithdrawn') {
          rec = (args.recipient as `0x${string}`) || rec;
          assetSymbol = 'ETH';
          amountFormatted = args.amount
            ? `${Number(formatUnits(args.amount as bigint, 18)).toFixed(4)} ETH`
            : '0.00 ETH';
        }

        return {
          id,
          blockNumber: log.blockNumber,
          timestamp: ts,
          type: eventName,
          asset: assetSymbol,
          recipient: rec,
          amountFormatted,
          transactionHash: log.transactionHash,
          logIndex,
        };
      });

      const results = await Promise.all(parsedPromises);
      const valid = results.filter((e): e is PublicTreasuryLog => e !== null);

      valid.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) {
          return b.blockNumber > a.blockNumber ? 1 : -1;
        }
        return b.logIndex - a.logIndex;
      });

      setTreasuryLogs(valid);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Public treasury log fetch error:', err);
    } finally {
      setIsLogsLoading(false);
      setIsRefreshingLogs(false);
    }
  }, [getBlockTimestamp]);

  useEffect(() => {
    fetchTreasuryLogs();

    const unwatch = publicClient.watchContractEvent({
      address: FALLBACK_ADDRESSES.TREASURY,
      abi: TREASURY_ABI,
      onLogs: () => {
        fetchTreasuryLogs();
      },
    });

    return () => {
      unwatch();
    };
  }, [fetchTreasuryLogs]);

  const { data, refetch } = useReadContracts({
    contracts: [
      {
        address: FALLBACK_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [FALLBACK_ADDRESSES.USDC],
      },
      {
        address: FALLBACK_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [FALLBACK_ADDRESSES.WBTC],
      },
      {
        address: FALLBACK_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [FALLBACK_ADDRESSES.WETH],
      },
      {
        address: FALLBACK_ADDRESSES.CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: 'getDepositFeeBps',
      },
      {
        address: FALLBACK_ADDRESSES.CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: 'getRedeemFeeBps',
      },
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.WBTC],
      },
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.WETH],
      },
    ],
    query: {
      refetchInterval: 5_000,
    },
  });

  const usdcBalRaw = (data?.[0]?.result as bigint) || 0n;
  const wbtcBalRaw = (data?.[1]?.result as bigint) || 0n;
  const wethBalRaw = (data?.[2]?.result as bigint) || 0n;

  const depositFeeBps = (data?.[3]?.result as bigint) || 25n;
  const redeemFeeBps = (data?.[4]?.result as bigint) || 200n;

  const btcPriceRaw = (data?.[5]?.result as bigint) || 0n;
  const ethPriceRaw = (data?.[6]?.result as bigint) || 0n;

  const usdcBalFormatted = formatUnits(usdcBalRaw, 6);
  const usdcUSD = Number(usdcBalFormatted);
  const btcPrice = Number(formatUnits(btcPriceRaw, 18));
  const ethPrice = Number(formatUnits(ethPriceRaw, 18));

  const wbtcUSD = Number(formatUnits(wbtcBalRaw, 8)) * btcPrice;
  const wethUSD = Number(formatUnits(wethBalRaw, 18)) * ethPrice;
  const totalTreasuryUSD = usdcUSD + wbtcUSD + wethUSD;

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Protocol Treasury & Fee Reserves
            </h1>
            <StatusBadge status="Healthy" label="Operational" />
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Safeguarding protocol-owned fee reserves custodied inside Treasury contract (
            {FALLBACK_ADDRESSES.TREASURY.slice(0, 6)}...{FALLBACK_ADDRESSES.TREASURY.slice(-4)}).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {lastSyncTime && (
            <span className="text-[11px] text-slate-400 font-mono">
              Synced: {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => {
              refetch();
              fetchTreasuryLogs();
            }}
            disabled={isRefreshingLogs}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-surface border border-border-subtle text-slate-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin text-accent-blue' : ''}`}
            />
            <span>Refresh Balances & Logs</span>
          </button>
        </div>
      </div>

      {/* Real On-Chain Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Treasury Value"
          value={formatUSD(totalTreasuryUSD)}
          subtitle="All asset reserves"
          icon={Vault}
          glowColor="blue"
        />
        <StatCard
          title="USDC Fee Reserves"
          value={formatUSD(usdcUSD)}
          subtitle={`${usdcBalFormatted} USDC`}
          icon={DollarSign}
          glowColor="emerald"
        />
        <StatCard
          title="Configured Deposit Fee"
          value={`${(Number(depositFeeBps) / 100).toFixed(2)}%`}
          subtitle={`${depositFeeBps.toString()} BPS`}
          icon={ArrowUpRight}
          glowColor="purple"
        />
        <StatCard
          title="Configured Redeem Fee"
          value={`${(Number(redeemFeeBps) / 100).toFixed(2)}%`}
          subtitle={`${redeemFeeBps.toString()} BPS`}
          icon={ShieldCheck}
          glowColor="cyan"
        />
      </div>

      {/* Treasury Asset Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <TableCard
            title="Treasury Asset Reserve Balances"
            subtitle="Protocol-owned assets custodied inside Treasury contract"
            icon={Vault}
          >
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-slate-400 font-semibold">
                  <th className="py-3 px-3">Asset</th>
                  <th className="py-3 px-3">Raw Balance</th>
                  <th className="py-3 px-3">Formatted Amount</th>
                  <th className="py-3 px-3 text-right">USD Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/40 font-mono">
                <tr className="hover:bg-card/40 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-white flex items-center space-x-2 font-sans">
                    <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-extrabold text-[10px]">
                      USD
                    </div>
                    <span>USDC</span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-400">{usdcBalRaw.toString()}</td>
                  <td className="py-3.5 px-3 text-slate-200 font-bold">
                    {formatUnits(usdcBalRaw, 6)} USDC
                  </td>
                  <td className="py-3.5 px-3 text-right text-emerald-400 font-bold">
                    {formatUSD(usdcUSD)}
                  </td>
                </tr>
                <tr className="hover:bg-card/40 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-white flex items-center space-x-2 font-sans">
                    <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-extrabold text-[10px]">
                      BTC
                    </div>
                    <span>WBTC</span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-400">{wbtcBalRaw.toString()}</td>
                  <td className="py-3.5 px-3 text-slate-200 font-bold">
                    {formatUnits(wbtcBalRaw, 8)} WBTC
                  </td>
                  <td className="py-3.5 px-3 text-right text-emerald-400 font-bold">
                    {formatUSD(wbtcUSD)}
                  </td>
                </tr>
                <tr className="hover:bg-card/40 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-white flex items-center space-x-2 font-sans">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-extrabold text-[10px]">
                      ETH
                    </div>
                    <span>WETH</span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-400">{wethBalRaw.toString()}</td>
                  <td className="py-3.5 px-3 text-slate-200 font-bold">
                    {formatUnits(wethBalRaw, 18)} WETH
                  </td>
                  <td className="py-3.5 px-3 text-right text-emerald-400 font-bold">
                    {formatUSD(wethUSD)}
                  </td>
                </tr>
              </tbody>
            </table>
          </TableCard>
        </div>

        {/* Governance Controls Panel */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base">
            <ShieldCheck className="w-5 h-5 text-accent-blue" />
            <span>Treasury Governance</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Only accounts with <code className="text-accent-blue font-mono">GOVERNANCE_ROLE</code>{' '}
            can release fee revenue from Treasury.
          </p>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-border-subtle space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Total Treasury USD</span>
              <span className="font-mono text-white font-bold">{formatUSD(totalTreasuryUSD)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Treasury Contract</span>
              <span className="font-mono text-accent-blue text-[11px]">
                {FALLBACK_ADDRESSES.TREASURY.slice(0, 6)}...{FALLBACK_ADDRESSES.TREASURY.slice(-4)}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/admin/treasury"
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-accent-blue text-white font-bold text-xs shadow-glow hover:bg-blue-600 transition-all"
            >
              <span>Manage Treasury In Admin</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Live Recent Treasury Releases Log & Fee Inflows Table */}
      <TableCard
        title="Recent Treasury Releases Log & Fee Inflows"
        subtitle="Auditable live event record of governance releases and protocol fee collections"
        icon={History}
      >
        {isLogsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-accent-blue" />
            <p className="text-sm font-medium">Syncing Treasury log events from Base Sepolia...</p>
          </div>
        ) : treasuryLogs.length === 0 ? (
          <EmptyState
            title="No Treasury Releases Recorded"
            description="Fee revenue is currently retained inside the Treasury contract reserves."
            icon={History}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Block</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4">Recipient / Sender</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono">
                {treasuryLogs.map((log) => {
                  const dateStr = new Date(log.timestamp * 1000).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const isWithdrawal =
                    log.type === 'TreasuryWithdrawal' || log.type === 'NativeWithdrawn';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Block Number */}
                      <td className="py-3 px-4 text-slate-300">
                        #{log.blockNumber.toString()}
                        <div className="text-[10px] text-slate-500 font-sans">{dateStr}</div>
                      </td>

                      {/* Event Type Badge */}
                      <td className="py-3 px-4 font-sans">
                        {isWithdrawal ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Revenue Release</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <DollarSign className="w-3 h-3" />
                            <span>Fee Inflow</span>
                          </span>
                        )}
                      </td>

                      {/* Asset */}
                      <td className="py-3 px-4 font-bold text-white">{log.asset}</td>

                      {/* Recipient */}
                      <td className="py-3 px-4 text-slate-300">
                        {log.recipient !== '0x0000000000000000000000000000000000000000' ? (
                          <a
                            href={`https://sepolia.basescan.org/address/${log.recipient}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-accent-blue transition-colors"
                            title={log.recipient}
                          >
                            {log.recipient.slice(0, 6)}...{log.recipient.slice(-4)}
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-bold text-slate-100">
                        {log.amountFormatted}
                      </td>

                      {/* Explorer Link */}
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`https://sepolia.basescan.org/tx/${log.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-accent-blue hover:underline"
                          title="View on BaseScan"
                        >
                          <span>
                            {log.transactionHash.slice(0, 6)}...{log.transactionHash.slice(-4)}
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
