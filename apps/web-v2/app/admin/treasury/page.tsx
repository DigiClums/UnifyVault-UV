'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { createPublicClient, http, formatUnits, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { TREASURY_ABI, ORACLE_MANAGER_ABI } from '../../../lib/contracts';
import { MAINNET_TOKENS, RPC_URL } from '../../../constants';
import { useProtocolDirectory } from '../../../hooks/useProtocolDirectory';
import { formatUSD } from '../../../lib/math';
import { StatCard } from '../../../components/ui/StatCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { TableCard } from '../../../components/ui/TableCard';
import {
  Vault,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  History,
  RefreshCw,
  ExternalLink,
  Layers,
} from 'lucide-react';

const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

export interface TreasuryEventLog {
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

export default function AdminTreasuryPage() {
  const { treasury, oracle } = useProtocolDirectory();

  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [assetAddress, setAssetAddress] = useState<string>(MAINNET_TOKENS.USDC);

  const [treasuryLogs, setTreasuryLogs] = useState<TreasuryEventLog[]>([]);
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
      } catch {
        return Math.floor(Date.now() / 1000);
      }
    },
    [blockTimeCache],
  );

  const fetchTreasuryLogs = useCallback(async () => {
    if (!treasury) return;
    setIsRefreshingLogs(true);
    try {
      const logs = await publicClient.getContractEvents({
        address: treasury,
        abi: TREASURY_ABI,
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      const parsedPromises = logs.map(async (log) => {
        if (!log.blockNumber || !log.transactionHash) return null;
        const ts = await getBlockTimestamp(log.blockNumber);
        const logIndex = log.logIndex ?? 0;
        const id = `${log.transactionHash}-${logIndex}`;

        const eventLog = log as unknown as {
          eventName: TreasuryEventLog['type'];
          args: Record<string, any>;
        };

        const eventName = eventLog.eventName;
        const args = eventLog.args || {};

        let assetSymbol = 'USDC';
        let amountFormatted = '0.00';
        let rec: `0x${string}` = '0x0000000000000000000000000000000000000000';

        const assetAddr = (args.asset as string)?.toLowerCase() || '';

        if (assetAddr === MAINNET_TOKENS.cbBTC.toLowerCase()) {
          assetSymbol = 'cbBTC';
        } else if (assetAddr === MAINNET_TOKENS.WETH.toLowerCase()) {
          assetSymbol = 'WETH';
        } else {
          assetSymbol = 'USDC';
        }

        const decimals = assetSymbol === 'cbBTC' ? 8 : assetSymbol === 'WETH' ? 18 : 6;

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
      const valid = results.filter((e): e is TreasuryEventLog => e !== null);

      valid.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) {
          return b.blockNumber > a.blockNumber ? 1 : -1;
        }
        return b.logIndex - a.logIndex;
      });

      setTreasuryLogs(valid);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Treasury event log fetch error:', err);
    } finally {
      setIsLogsLoading(false);
      setIsRefreshingLogs(false);
    }
  }, [treasury, getBlockTimestamp]);

  useEffect(() => {
    if (!treasury) return;
    fetchTreasuryLogs();

    const unwatch = publicClient.watchContractEvent({
      address: treasury,
      abi: TREASURY_ABI,
      onLogs: () => {
        fetchTreasuryLogs();
      },
    });

    return () => {
      unwatch();
    };
  }, [treasury, fetchTreasuryLogs]);

  const { data: treasuryData } = useReadContracts({
    contracts: [
      {
        address: treasury,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [MAINNET_TOKENS.USDC],
      },
      {
        address: treasury,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [MAINNET_TOKENS.cbBTC],
      },
      {
        address: treasury,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [MAINNET_TOKENS.WETH],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [MAINNET_TOKENS.cbBTC],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [MAINNET_TOKENS.WETH],
      },
    ],
    query: {
      enabled: !!treasury && !!oracle,
      refetchInterval: 5_000,
    },
  });

  const usdcBalRaw = (treasuryData?.[0]?.result as bigint) || 0n;
  const wbtcBalRaw = (treasuryData?.[1]?.result as bigint) || 0n;
  const wethBalRaw = (treasuryData?.[2]?.result as bigint) || 0n;
  const btcPriceRaw = (treasuryData?.[3]?.result as bigint) || 0n;
  const ethPriceRaw = (treasuryData?.[4]?.result as bigint) || 0n;

  const usdcUSD = Number(formatUnits(usdcBalRaw, 6));
  const btcPrice = Number(formatUnits(btcPriceRaw, 18));
  const ethPrice = Number(formatUnits(ethPriceRaw, 18));

  const wbtcUSD = Number(formatUnits(wbtcBalRaw, 8)) * btcPrice;
  const wethUSD = Number(formatUnits(wethBalRaw, 18)) * ethPrice;
  const totalTreasuryValUSD = usdcUSD + wbtcUSD + wethUSD;

  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();
  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount || parseFloat(amount) <= 0 || !treasury) return;

    const decimals = assetAddress.toLowerCase() === MAINNET_TOKENS.cbBTC.toLowerCase() ? 8 : 6;
    const amountRaw = parseUnits(amount, decimals);

    writeContract({
      address: treasury,
      abi: TREASURY_ABI,
      functionName: 'withdraw',
      args: [assetAddress as `0x${string}`, recipient as `0x${string}`, amountRaw],
    });
  };

  const getFriendlyErrorMessage = (err: unknown): string => {
    if (!err) return '';
    console.error('[Developer Logs - Treasury Error]:', err);
    return 'Treasury withdrawal is currently unavailable or requires authorized Admin Role permission.';
  };

  const treasuryShort = treasury
    ? `${treasury.slice(0, 6)}...${treasury.slice(-4)}`
    : 'Connecting...';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Treasury Revenue & Releases Log
            </h1>
            <StatusBadge status="Admin" label="GOVERNANCE" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Safeguard protocol-owned fee reserves, audit release history, and execute authorized
            revenue withdrawals.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {lastSyncTime && (
            <span className="text-[11px] text-slate-400 font-mono">
              Synced: {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchTreasuryLogs}
            disabled={isRefreshingLogs || !treasury}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin text-purple-400' : ''}`}
            />
            <span>{isRefreshingLogs ? 'Syncing...' : 'Sync Log'}</span>
          </button>
        </div>
      </div>

      {/* Total Treasury Value Summary Card */}
      <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl shadow-xl space-y-2">
        <span className="text-xs font-semibold text-purple-400 tracking-wider uppercase">
          Total Treasury Value
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
          {formatUSD(totalTreasuryValUSD)}
        </div>
        <p className="text-xs text-slate-400">
          Combined protocol-owned fee reserves custodied in Treasury on Base Mainnet.
        </p>
      </div>

      {/* Asset Reserves Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="USDC Fee Reserves"
          value={formatUSD(usdcUSD)}
          subtitle={`${formatUnits(usdcBalRaw, 6)} USDC`}
          icon={Vault}
          glowColor="blue"
        />
        <StatCard
          title="cbBTC Reserves"
          value={`${formatUnits(wbtcBalRaw, 8)} BTC`}
          subtitle={`≈ ${formatUSD(wbtcUSD)}`}
          icon={DollarSign}
          glowColor="emerald"
        />
        <StatCard
          title="WETH Reserves"
          value={`${formatUnits(wethBalRaw, 18)} ETH`}
          subtitle={`≈ ${formatUSD(wethUSD)}`}
          icon={ShieldCheck}
          glowColor="purple"
        />
      </div>

      {/* Withdrawal Form & Safeguards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-border-subtle/40 pb-3">
            <ArrowUpRight className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Execute Revenue Release
            </h3>
          </div>

          <form onSubmit={handleWithdraw} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Select Fee Asset</label>
              <select
                value={assetAddress}
                onChange={(e) => setAssetAddress(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
              >
                <option value={MAINNET_TOKENS.USDC}>USDC (USD Coin - 6 Decimals)</option>
                <option value={MAINNET_TOKENS.cbBTC}>
                  cbBTC (Coinbase Wrapped BTC - 8 Decimals)
                </option>
                <option value={MAINNET_TOKENS.WETH}>WETH (Wrapped ETH - 18 Decimals)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Recipient Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Withdraw Amount</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={isWritePending || isTxWaiting || !treasury}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] font-bold text-white shadow-glow disabled:opacity-50 flex items-center justify-center space-x-2 transition-all focus:ring-2 focus:ring-purple-500/50"
            >
              {(isWritePending || isTxWaiting) && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {isWritePending
                  ? 'Confirming in Wallet...'
                  : isTxWaiting
                    ? 'Broadcasting Tx...'
                    : 'Execute Revenue Release'}
              </span>
            </button>
          </form>

          {isTxSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Revenue release executed successfully on Base Mainnet!</span>
            </div>
          )}

          {writeError && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>{getFriendlyErrorMessage(writeError)}</span>
            </div>
          )}
        </div>

        {/* Treasury Safeguards */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-5">
          <div className="flex items-center space-x-2 text-white font-bold text-base border-b border-border-subtle/40 pb-3">
            <ShieldCheck className="w-5 h-5 text-accent-blue" />
            <span>Treasury Safeguards</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Treasury Contract</span>
              </div>
              <span className="font-mono text-accent-blue font-bold">{treasuryShort}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Governance Restricted</span>
              </div>
              <span className="font-mono text-purple-400 font-bold">Admin Role Only</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Reentrancy Protected</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">Active (ReentrancyGuard)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Live On-Chain Network</span>
              </div>
              <span className="font-mono text-slate-300 font-bold">Base Mainnet L2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Treasury Releases & Fee Log Table */}
      <TableCard
        title="Recent Treasury Releases Log & Fee Inflows"
        subtitle="Auditable log of on-chain revenue releases and fee collections from Treasury"
        icon={History}
      >
        {isLogsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-sm font-medium">Syncing live Treasury releases log...</p>
          </div>
        ) : treasuryLogs.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Layers className="w-10 h-10 text-slate-500" />
            <h3 className="text-base font-bold text-white">No treasury releases yet</h3>
            <p className="text-xs text-slate-400 max-w-sm text-center">
              On-chain revenue withdrawals and fee collections will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Block</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4">Recipient / From</th>
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
                      <td className="py-3 px-4 text-slate-300">
                        #{log.blockNumber.toString()}
                        <div className="text-[10px] text-slate-500 font-sans">{dateStr}</div>
                      </td>

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

                      <td className="py-3 px-4 font-bold text-white">{log.asset}</td>

                      <td className="py-3 px-4 text-slate-300">
                        {log.recipient !== '0x0000000000000000000000000000000000000000' ? (
                          <a
                            href={`https://basescan.org/address/${log.recipient}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-purple-400 transition-colors"
                            title={log.recipient}
                          >
                            {log.recipient.slice(0, 6)}...{log.recipient.slice(-4)}
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-100">
                        {log.amountFormatted}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <a
                          href={`https://basescan.org/tx/${log.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-purple-400 hover:text-purple-300 transition-colors hover:underline"
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
