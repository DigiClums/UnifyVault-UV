'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { TREASURY_ABI, ORACLE_MANAGER_ABI } from '../../../lib/contracts';
import { getChainTokens, getExplorerBaseUrl } from '../../../constants';
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

export interface TreasuryEventLog {
  id: string;
  blockNumber: bigint;
  timestamp: number;
  type: 'TreasuryWithdrawal' | 'FeeCollected' | 'NativeWithdrawn';
  asset: string;
  recipient: string;
  amountFormatted: string;
  caller: string;
  transactionHash: string;
  logIndex: number;
}

export default function AdminTreasuryPage() {
  const { address: connectedAddress, chain } = useAccount();
  const publicClient = usePublicClient();
  const tokens = getChainTokens(chain?.id);
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const { treasury, oracle } = useProtocolDirectory();

  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [assetAddress, setAssetAddress] = useState<string>('');

  useEffect(() => {
    if (tokens.USDC && !assetAddress) {
      setAssetAddress(tokens.USDC);
    }
  }, [tokens, assetAddress]);

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
        if (!publicClient) return Math.floor(Date.now() / 1000);
        const block = await publicClient.getBlock({ blockNumber });
        const ts = Number(block.timestamp);
        blockTimeCache.set(blockNumber, ts);
        return ts;
      } catch {
        return Math.floor(Date.now() / 1000);
      }
    },
    [blockTimeCache, publicClient],
  );

  const fetchTreasuryLogs = useCallback(async () => {
    if (!treasury || !publicClient) return;
    setIsRefreshingLogs(true);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock >= 2000n ? latestBlock - 2000n : 0n;

      const logs = await publicClient.getContractEvents({
        address: treasury,
        abi: TREASURY_ABI,
        fromBlock,
        toBlock: latestBlock,
      });

      const parsedPromises: Promise<TreasuryEventLog | null>[] = logs.map(
        async (log): Promise<TreasuryEventLog | null> => {
          if (!log.blockNumber || !log.transactionHash) return null;
          const ts = await getBlockTimestamp(log.blockNumber);
          const logIndex = log.logIndex ?? 0;
          const id = `${log.transactionHash}-${logIndex}`;

          const eventLog = log as unknown as {
            eventName: TreasuryEventLog['type'];
            args: Record<string, unknown>;
          };

          const eventName = eventLog.eventName;
          const args = eventLog.args || {};

          let assetSymbol = 'USDC';
          let amountFormatted = '0.00';
          let rec: string = '0x0000000000000000000000000000000000000000';
          const caller: string =
            (args.caller as string) || '0x0000000000000000000000000000000000000000';

          const assetAddr = (args.asset as string)?.toLowerCase() || '';

          if (assetAddr === tokens.cbBTC.toLowerCase()) {
            assetSymbol = 'cbBTC';
          } else if (assetAddr === tokens.WETH.toLowerCase()) {
            assetSymbol = 'WETH';
          } else {
            assetSymbol = 'USDC';
          }

          const decimals = assetSymbol === 'cbBTC' ? 8 : assetSymbol === 'WETH' ? 18 : 6;

          if (eventName === 'TreasuryWithdrawal') {
            rec = (args.recipient as string) || rec;
            amountFormatted = args.amount
              ? `${Number(formatUnits(args.amount as bigint, decimals)).toFixed(4)} ${assetSymbol}`
              : `0.00 ${assetSymbol}`;
          } else if (eventName === 'FeeCollected') {
            rec = (args.from as string) || rec;
            amountFormatted = args.amount
              ? `${Number(formatUnits(args.amount as bigint, decimals)).toFixed(4)} ${assetSymbol}`
              : `0.00 ${assetSymbol}`;
          } else if (eventName === 'NativeWithdrawn') {
            rec = (args.recipient as string) || rec;
            assetSymbol = 'ETH';
            amountFormatted = args.amount
              ? `${Number(formatUnits(args.amount as bigint, 18)).toFixed(4)} ETH`
              : '0.00 ETH';
          } else {
            return null;
          }

          return {
            id,
            blockNumber: log.blockNumber,
            timestamp: ts,
            type: eventName,
            asset: assetSymbol,
            recipient: rec,
            amountFormatted,
            caller,
            transactionHash: log.transactionHash,
            logIndex,
          };
        },
      );

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
  }, [treasury, publicClient, tokens, getBlockTimestamp]);

  useEffect(() => {
    if (!treasury || !publicClient) return;
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
  }, [treasury, publicClient, fetchTreasuryLogs]);

  // Read Treasury balance & Oracle asset prices
  const { data: treasuryData } = useReadContracts({
    contracts: [
      {
        address: treasury,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [tokens.USDC],
      },
      {
        address: treasury,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [tokens.cbBTC],
      },
      {
        address: treasury,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [tokens.WETH],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.cbBTC],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.WETH],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.USDC],
      },
    ],
    query: {
      enabled: !!treasury && !!oracle,
      staleTime: 15_000,
      gcTime: 60_000,
    },
  });

  const usdcBalRaw = (treasuryData?.[0]?.result as bigint) || 0n;
  const wbtcBalRaw = (treasuryData?.[1]?.result as bigint) || 0n;
  const wethBalRaw = (treasuryData?.[2]?.result as bigint) || 0n;
  const btcPriceRaw = (treasuryData?.[3]?.result as bigint) || 0n;
  const ethPriceRaw = (treasuryData?.[4]?.result as bigint) || 0n;
  const usdcPriceRaw = (treasuryData?.[5]?.result as bigint) || 0n;

  const btcPrice = Number(formatUnits(btcPriceRaw, 18));
  const ethPrice = Number(formatUnits(ethPriceRaw, 18));
  const usdcPrice = Number(formatUnits(usdcPriceRaw, 18));

  const usdcUSD = Number(formatUnits(usdcBalRaw, 6)) * usdcPrice;
  const wbtcUSD = Number(formatUnits(wbtcBalRaw, 8)) * btcPrice;
  const wethUSD = Number(formatUnits(wethBalRaw, 18)) * ethPrice;
  const totalTreasuryValUSD = usdcUSD + wbtcUSD + wethUSD;

  const selectedAssetSymbol = useMemo(() => {
    if (!assetAddress) return 'USDC';
    if (assetAddress.toLowerCase() === tokens.cbBTC?.toLowerCase()) return 'cbBTC';
    if (assetAddress.toLowerCase() === tokens.WETH?.toLowerCase()) return 'WETH';
    return 'USDC';
  }, [assetAddress, tokens]);

  const selectedAssetDecimals = useMemo(() => {
    if (!assetAddress) return 6;
    if (assetAddress.toLowerCase() === tokens.cbBTC?.toLowerCase()) return 8;
    if (assetAddress.toLowerCase() === tokens.WETH?.toLowerCase()) return 18;
    return 6;
  }, [assetAddress, tokens]);

  const selectedAssetBalRaw = useMemo(() => {
    if (!assetAddress) return usdcBalRaw;
    if (assetAddress.toLowerCase() === tokens.cbBTC?.toLowerCase()) return wbtcBalRaw;
    if (assetAddress.toLowerCase() === tokens.WETH?.toLowerCase()) return wethBalRaw;
    return usdcBalRaw;
  }, [assetAddress, tokens, wbtcBalRaw, wethBalRaw, usdcBalRaw]);

  const selectedAssetBalFormatted = formatUnits(selectedAssetBalRaw, selectedAssetDecimals);

  const selectedAssetPrice = useMemo(() => {
    if (!assetAddress) return usdcPrice;
    if (assetAddress.toLowerCase() === tokens.cbBTC?.toLowerCase()) return btcPrice;
    if (assetAddress.toLowerCase() === tokens.WETH?.toLowerCase()) return ethPrice;
    return usdcPrice;
  }, [assetAddress, tokens, btcPrice, ethPrice, usdcPrice]);

  const estimatedWithdrawUSD = useMemo(() => {
    const amtNum = parseFloat(amount || '0') || 0;
    return amtNum * selectedAssetPrice;
  }, [amount, selectedAssetPrice]);

  const handlePercentageSelect = (pct: number) => {
    const balNum = parseFloat(selectedAssetBalFormatted) || 0;
    if (balNum <= 0) return;
    const val = (balNum * (pct / 100)).toFixed(selectedAssetDecimals === 8 ? 8 : 4);
    setAmount(val);
  };

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

    const amountRaw = parseUnits(amount, selectedAssetDecimals);

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
          Combined protocol-owned fee reserves custodied in Treasury on Base.
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
        <div className="p-6 rounded-2xl bg-surface/90 border border-border-subtle/80 backdrop-blur-2xl space-y-5 shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700 pointer-events-none" />

          <div className="flex items-center justify-between border-b border-border-subtle/50 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-xs">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white tracking-tight flex items-center space-x-2">
                  <span>Execute Revenue Release</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Disburse collected protocol fee revenue to authorized treasury recipients
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold font-mono">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              <span>Governance Restricted</span>
            </div>
          </div>

          <form onSubmit={handleWithdraw} className="space-y-4 text-xs">
            {/* 1. Select Fee Asset */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-300 font-bold flex items-center space-x-1.5">
                  <span>Select Fee Asset</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  Available:{' '}
                  <span className="font-mono font-bold text-white">
                    {selectedAssetBalFormatted}
                  </span>{' '}
                  {selectedAssetSymbol}
                </span>
              </div>

              <div className="relative">
                <select
                  value={assetAddress}
                  onChange={(e) => setAssetAddress(e.target.value)}
                  className="w-full min-h-[48px] pl-10 pr-10 py-3 rounded-xl bg-slate-950/90 border border-border-subtle text-white focus:outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/30 font-mono font-bold text-xs appearance-none transition-all cursor-pointer shadow-inner"
                >
                  <option value={tokens.USDC}>USDC (USD Coin — 6 Decimals)</option>
                  <option value={tokens.cbBTC}>cbBTC (Coinbase Wrapped BTC — 8 Decimals)</option>
                  <option value={tokens.WETH}>WETH (Wrapped Ether — 18 Decimals)</option>
                </select>
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs">
                  {selectedAssetSymbol === 'USDC'
                    ? '💲'
                    : selectedAssetSymbol === 'cbBTC'
                      ? '🟠'
                      : '🔷'}
                </div>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* 2. Recipient Address */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-300 font-bold">Recipient Address</label>
                {connectedAddress && (
                  <button
                    type="button"
                    onClick={() => setRecipient(connectedAddress)}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-mono font-semibold underline decoration-dashed underline-offset-2 transition-colors"
                  >
                    Use My Wallet ({connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)})
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 py-3 rounded-xl bg-slate-950/90 border border-border-subtle text-white font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/30 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* 3. Withdraw Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-300 font-bold">Withdraw Amount</label>
                <div className="flex items-center space-x-1">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentageSelect(pct)}
                      className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-purple-500/20 text-[10px] font-mono font-semibold text-slate-300 hover:text-purple-300 border border-slate-700/60 hover:border-purple-500/40 transition-all active:scale-95"
                    >
                      {pct === 100 ? 'MAX' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative rounded-xl bg-slate-950/90 border border-border-subtle focus-within:border-purple-500/80 focus-within:ring-2 focus-within:ring-purple-500/30 transition-all p-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent text-xl font-mono font-extrabold text-white placeholder:text-slate-600 focus:outline-none tracking-tight"
                  />
                  <span className="text-xs font-bold text-slate-300 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700/80 shrink-0 font-mono shadow-xs">
                    {selectedAssetSymbol}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60 font-mono">
                  <span>≈ {formatUSD(estimatedWithdrawUSD)}</span>
                  <span>
                    Reserve: {selectedAssetBalFormatted} {selectedAssetSymbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                isWritePending ||
                isTxWaiting ||
                !treasury ||
                !amount ||
                parseFloat(amount) <= 0 ||
                !recipient
              }
              className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.99] font-bold text-white text-xs shadow-glow-purple disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all focus:ring-2 focus:ring-purple-500/50 mt-2"
            >
              {isWritePending || isTxWaiting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>
                    {isWritePending ? 'Confirming in Wallet...' : 'Broadcasting Revenue Release...'}
                  </span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Execute Revenue Release ({selectedAssetSymbol})</span>
                </>
              )}
            </button>
          </form>

          {isTxSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center space-x-2 text-xs font-semibold shadow-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Revenue release executed successfully on Base!</span>
            </div>
          )}

          {writeError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center space-x-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
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
                            href={`${explorerBaseUrl}/address/${log.recipient}`}
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
                          href={`${explorerBaseUrl}/tx/${log.transactionHash}`}
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
