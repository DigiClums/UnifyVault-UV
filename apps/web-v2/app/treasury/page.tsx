'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useReadContracts, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { TREASURY_ABI, CONTROLLER_ABI, ORACLE_MANAGER_ABI } from '../../lib/contracts';
import { getChainTokens, getExplorerBaseUrl, getDefaultChainId } from '../../constants';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import { formatUSD } from '../../lib/math';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  ArrowUpRight,
  ShieldCheck,
  History,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { prefetchBlockTimestamps } from '../../lib/utils/blockTimestamp';

export interface PublicTreasuryLog {
  id: string;
  blockNumber: bigint;
  timestamp?: number;
  type: 'TreasuryWithdrawal' | 'FeeCollected' | 'NativeWithdrawn';
  asset: string;
  recipient: `0x${string}`;
  amountFormatted: string;
  transactionHash: `0x${string}`;
  logIndex: number;
}

export default function PublicTreasuryPage() {
  const { chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const publicClient = usePublicClient({ chainId });
  const tokens = getChainTokens(chain?.id);
  const explorerBaseUrl = getExplorerBaseUrl(chain?.id);
  const { treasury, controller, oracle } = useProtocolDirectory();

  const [treasuryLogs, setTreasuryLogs] = useState<PublicTreasuryLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState<boolean>(true);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showOnChainDetails, setShowOnChainDetails] = useState(false);

  const fetchTreasuryLogs = useCallback(async () => {
    if (!treasury || !publicClient) return;
    setIsRefreshingLogs(true);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock >= 1999n ? latestBlock - 1999n : 0n;

      const logs = await publicClient.getContractEvents({
        address: treasury,
        abi: TREASURY_ABI,
        fromBlock,
        toBlock: latestBlock,
      });

      // Phase E3: Prefetch unique block timestamps in a single batched deduplicated request
      const blockNumbers = logs.map((l) => l.blockNumber);
      const timestampMap = await prefetchBlockTimestamps(publicClient, chainId, blockNumbers);

      const valid: PublicTreasuryLog[] = [];

      for (const log of logs) {
        if (!log.blockNumber || !log.transactionHash) continue;
        const ts = timestampMap.get(log.blockNumber);
        const logIndex = log.logIndex ?? 0;
        const id = `${log.transactionHash}-${logIndex}`;

        const eventLog = log as unknown as {
          eventName: PublicTreasuryLog['type'];
          args: Record<string, unknown>;
        };

        const eventName = eventLog.eventName;
        const args = eventLog.args || {};

        let assetSymbol = 'USDC';
        let amountFormatted = '0.00';
        let rec: `0x${string}` = '0x0000000000000000000000000000000000000000';

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

        valid.push({
          id,
          blockNumber: log.blockNumber,
          timestamp: ts,
          type: eventName,
          asset: assetSymbol,
          recipient: rec,
          amountFormatted,
          transactionHash: log.transactionHash,
          logIndex,
        });
      }

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
  }, [treasury, publicClient, tokens, chainId]);

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

  const { data, refetch } = useReadContracts({
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
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: 'getDepositFeeBps',
      },
      {
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: 'getRedeemFeeBps',
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
      enabled: !!treasury && !!controller && !!oracle,
      staleTime: 15_000,
      gcTime: 60_000,
    },
  });

  const usdcBalRaw = (data?.[0]?.result as bigint) || 0n;
  const wbtcBalRaw = (data?.[1]?.result as bigint) || 0n;
  const wethBalRaw = (data?.[2]?.result as bigint) || 0n;

  const depositFeeBps = (data?.[3]?.result as bigint) || 25n;
  const redeemFeeBps = (data?.[4]?.result as bigint) || 200n;

  const btcPriceRaw = (data?.[5]?.result as bigint) || 0n;
  const ethPriceRaw = (data?.[6]?.result as bigint) || 0n;
  const usdcPriceRaw = (data?.[7]?.result as bigint) || 0n;

  const usdcBalFormatted = formatUnits(usdcBalRaw, 6);
  const btcPrice = Number(formatUnits(btcPriceRaw, 18));
  const ethPrice = Number(formatUnits(ethPriceRaw, 18));
  const usdcPrice = Number(formatUnits(usdcPriceRaw, 18));

  const usdcUSD = Number(usdcBalFormatted) * usdcPrice;
  const wbtcUSD = Number(formatUnits(wbtcBalRaw, 8)) * btcPrice;
  const wethUSD = Number(formatUnits(wethBalRaw, 18)) * ethPrice;
  const totalTreasuryUSD = usdcUSD + wbtcUSD + wethUSD;

  const treasuryShort = treasury
    ? `${treasury.slice(0, 6)}...${treasury.slice(-4)}`
    : 'Connecting...';

  // Build asset list from existing data (not hardcoded)
  const treasuryAssets = useMemo(() => {
    return [
      {
        symbol: 'USDC',
        balanceRaw: usdcBalRaw,
        balanceFormatted: `${formatUnits(usdcBalRaw, 6)} USDC`,
        usdValue: usdcUSD,
        iconBg: 'bg-[#BFFF00]/10 border-[#BFFF00]/25 text-[#5f8f00] dark:text-[#BFFF00]',
        iconLabel: 'USD',
      },
      {
        symbol: 'cbBTC',
        balanceRaw: wbtcBalRaw,
        balanceFormatted: `${formatUnits(wbtcBalRaw, 8)} cbBTC`,
        usdValue: wbtcUSD,
        iconBg: 'bg-[#BFFF00]/10 border-[#BFFF00]/25 text-[#5f8f00] dark:text-[#BFFF00]',
        iconLabel: 'BTC',
      },
      {
        symbol: 'WETH',
        balanceRaw: wethBalRaw,
        balanceFormatted: `${formatUnits(wethBalRaw, 18)} WETH`,
        usdValue: wethUSD,
        iconBg: 'bg-[#BFFF00]/10 border-[#BFFF00]/25 text-[#5f8f00] dark:text-[#BFFF00]',
        iconLabel: 'ETH',
      },
    ];
  }, [usdcBalRaw, wbtcBalRaw, wethBalRaw, usdcUSD, wbtcUSD, wethUSD]);

  const secondsAgoStr = lastSyncTime
    ? `${Math.max(0, Math.floor((Date.now() - lastSyncTime.getTime()) / 1000))}s ago`
    : null;

  const handleRefresh = () => {
    refetch();
    fetchTreasuryLogs();
  };

  return (
    <div className="space-y-2.5 sm:space-y-4 pt-1 pb-6 sm:py-2">
      {/* ── Compact Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight">
            Treasury
          </h1>
          <StatusBadge status="Healthy" label="Operational" className="shrink-0" />
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          {secondsAgoStr && (
            <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
              Synced: {secondsAgoStr}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshingLogs || !treasury}
            className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-card hover:bg-muted/60 border border-border-subtle text-[11px] font-medium text-foreground transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={cn('w-3 h-3', isRefreshingLogs && 'animate-spin text-[#BFFF00]')}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Treasury Hero Card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border-subtle px-4 py-3 sm:px-5 sm:py-3.5">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#BFFF00]/60 to-transparent" />

        {/* Header row: Label + Live badge */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total Treasury Value
          </span>
          <div className="flex items-center space-x-1">
            <span className="inline-flex items-center space-x-1 text-[9px] font-medium font-mono text-[#5f8f00] dark:text-[#BFFF00]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#BFFF00] animate-pulse shrink-0" />
              <span>LIVE</span>
            </span>
          </div>
        </div>

        {/* Main value */}
        <div className="mb-1">
          <div className="text-[28px] sm:text-[36px] font-black text-foreground tracking-tight font-mono leading-tight">
            {formatUSD(totalTreasuryUSD)}
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
          Protocol fee reserves custodied inside Treasury contract ({treasuryShort})
        </p>
      </div>

      {/* ── Stats Grid 2×2: Fee Reserves + Fee Configuration ── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* USDC Fee Reserves */}
        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            USDC Fee Reserves
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-foreground font-mono tracking-tight">
            {formatUSD(usdcUSD)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {Number(usdcBalFormatted).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC
          </p>
        </div>

        {/* Deposit Fee */}
        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Deposit Fee
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-foreground font-mono tracking-tight">
            {(Number(depositFeeBps) / 100).toFixed(2)}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{depositFeeBps.toString()} BPS</p>
        </div>

        {/* Redeem Fee */}
        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Redeem Fee
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-foreground font-mono tracking-tight">
            {(Number(redeemFeeBps) / 100).toFixed(2)}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{redeemFeeBps.toString()} BPS</p>
        </div>

        {/* Synced info — replaces the 4th stat slot */}
        <div className="rounded-xl bg-card border border-border-subtle px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Synced
          </span>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-foreground font-mono tracking-tight">
            {secondsAgoStr ?? '—'}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">On-chain balance</p>
        </div>
      </div>

      {/* ── Treasury Assets Section ── */}
      <div className="rounded-2xl bg-card border border-border-subtle px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Treasury Assets
          </h2>
          <span className="text-[9px] text-muted-foreground font-mono">
            Total: {formatUSD(totalTreasuryUSD)}
          </span>
        </div>

        <div className="divide-y divide-border-subtle/60">
          {treasuryAssets.map((asset) => (
            <div
              key={asset.symbol}
              className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full border flex items-center justify-center font-extrabold text-[10px] shrink-0',
                    asset.iconBg,
                  )}
                >
                  {asset.iconLabel}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-foreground">{asset.symbol}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-bold text-foreground">
                  {asset.balanceFormatted}
                </p>
                <p className="text-[11px] text-[#5f8f00] dark:text-[#BFFF00] font-mono">
                  {formatUSD(asset.usdValue)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Governance Section ── */}
      <div className="rounded-2xl bg-card border border-border-subtle px-4 py-3 sm:px-5 sm:py-3.5">
        <button
          onClick={() => setShowOnChainDetails(!showOnChainDetails)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#5f8f00] dark:text-[#BFFF00] shrink-0" />
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Treasury Governance
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Admin-controlled · Only Admin Role can release fee revenue
              </p>
            </div>
          </div>
          {showOnChainDetails ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showOnChainDetails && (
          <div className="mt-3 pt-3 border-t border-border-subtle/60 space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Treasury Contract</span>
              <span className="font-mono text-[#5f8f00] dark:text-[#BFFF00] font-bold text-[11px]">
                {treasuryShort}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Network</span>
              <span className="font-mono text-foreground font-semibold">Base Sepolia</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Recent Treasury Activity ── */}
      <div className="rounded-2xl bg-card border border-border-subtle px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center space-x-2 mb-2">
          <History className="w-4 h-4 text-muted-foreground shrink-0" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Treasury Activity
          </h2>
        </div>

        {isLogsLoading ? (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="w-4 h-4 animate-spin text-[#BFFF00] mr-2" />
            <span className="text-[11px] text-muted-foreground">Syncing event logs...</span>
          </div>
        ) : treasuryLogs.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              No Treasury Releases Recorded
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Fee revenue is currently retained inside the Treasury contract reserves.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle/60 -mx-4 sm:-mx-5">
            {treasuryLogs.slice(0, 10).map((log) => {
              const dateStr = log.timestamp
                ? new Date(log.timestamp * 1000).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Timestamp unavailable';

              const isWithdrawal =
                log.type === 'TreasuryWithdrawal' || log.type === 'NativeWithdrawn';

              return (
                <div key={log.id} className="flex items-center justify-between px-4 py-2.5 sm:px-5">
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className={cn(
                        'inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0',
                        isWithdrawal
                          ? 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/25'
                          : 'bg-[#BFFF00]/10 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/25',
                      )}
                    >
                      {isWithdrawal ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <DollarSign className="w-3 h-3" />
                      )}
                      <span>{isWithdrawal ? 'Release' : 'Collection'}</span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {isWithdrawal ? '-' : '+'}
                        {log.amountFormatted}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {log.asset} ·{' '}
                        <a
                          href={`${explorerBaseUrl}/tx/${log.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#5f8f00] dark:hover:text-[#BFFF00] transition-colors"
                        >
                          {log.transactionHash.slice(0, 6)}...{log.transactionHash.slice(-4)}
                        </a>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{dateStr}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
