'use client';

import React, { useState } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { ORACLE_MANAGER_ABI, PORTFOLIO_MANAGER_ABI } from '../../../lib/contracts';
import { getChainTokens, DEPLOYED_CONTRACTS_SEPOLIA } from '../../../constants';
import { useProtocolDirectory } from '../../../hooks/useProtocolDirectory';
import { useUnifiedProtocolData } from '../../../hooks/useUnifiedProtocolData';
import { useLivePrices } from '../../../hooks/useLivePrices';
import { formatUSD, formatUnits } from '../../../lib/math';
import { StatCard } from '../../../components/ui/StatCard';
import { TableCard } from '../../../components/ui/TableCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { OracleFeedStatus } from '../../../types';
import { Activity, Zap, RefreshCw, Clock, ShieldCheck, Info, AlertTriangle } from 'lucide-react';

function deriveStatus(
  readItem: { status?: 'success' | 'failure'; result?: unknown; error?: Error } | undefined,
  freshItem: { status?: 'success' | 'failure'; result?: unknown } | undefined,
): { status: OracleFeedStatus; priceNum: number | null; priceUSD: string } {
  if (!readItem) {
    return { status: 'UNAVAILABLE', priceNum: null, priceUSD: 'Price unavailable' };
  }
  if (readItem.status === 'failure' || readItem.error) {
    return { status: 'REVERTED', priceNum: null, priceUSD: 'Price unavailable' };
  }
  const raw = readItem.result as bigint | undefined;
  if (raw === undefined || raw === 0n) {
    return { status: 'UNAVAILABLE', priceNum: null, priceUSD: 'Price unavailable' };
  }
  const isFresh = Boolean(freshItem?.result ?? true);
  const num = Number(formatUnits(raw, 18));
  if (!isFresh) {
    return { status: 'STALE', priceNum: num, priceUSD: 'Price unavailable' };
  }
  return { status: 'LIVE', priceNum: num, priceUSD: formatUSD(num) };
}

export default function AdminOraclePage() {
  const { chain } = useAccount();
  const tokens = getChainTokens(chain?.id);
  const queryClient = useQueryClient();
  const { oracle: directoryOracle, portfolioManager } = useProtocolDirectory();
  const oracle = directoryOracle || DEPLOYED_CONTRACTS_SEPOLIA.OracleManager;
  const pm = portfolioManager || DEPLOYED_CONTRACTS_SEPOLIA.PortfolioManager;

  const protocolData = useUnifiedProtocolData();
  const livePrices = useLivePrices();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { data, refetch, isFetching } = useReadContracts({
    contracts: [
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
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.cbBTC],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.WETH],
      },
      {
        address: oracle,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.USDC],
      },
      {
        address: pm,
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: 'calculateUVPrice',
      },
    ],
    query: {
      enabled: !!oracle,
      staleTime: 5_000,
      refetchInterval: 5_000,
      gcTime: 60_000,
    },
  });

  const btcFeed = deriveStatus(data?.[0], data?.[3]);
  const ethFeed = deriveStatus(data?.[1], data?.[4]);
  const usdcFeed = deriveStatus(data?.[2], data?.[5]);

  const handleRefreshAll = async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.allSettled([
        refetch(),
        protocolData.refetch(),
        livePrices.refetch(),
        queryClient.invalidateQueries(),
      ]);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const isBusy = isFetching || isManualRefreshing || protocolData.isLoading;

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const getStatusBadge = (status: OracleFeedStatus) => {
    switch (status) {
      case 'LIVE':
        return <StatusBadge status="Healthy" label="LIVE" />;
      case 'STALE':
        return <StatusBadge status="Warning" label="STALE" />;
      case 'REVERTED':
        return <StatusBadge status="Error" label="REVERTED" />;
      case 'UNAVAILABLE':
      default:
        return <StatusBadge status="Error" label="UNAVAILABLE" />;
    }
  };

  const isAllLive =
    btcFeed.status === 'LIVE' && ethFeed.status === 'LIVE' && usdcFeed.status === 'LIVE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Oracle Price Feed Telemetry
            </h1>
            <StatusBadge
              status={isAllLive ? 'Healthy' : 'Warning'}
              label={isAllLive ? 'Feeds Fresh' : 'Attention Required'}
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            On-chain price feed verification, heartbeat monitoring, and UVBE valuation coordination.
          </p>
        </div>

        <button
          onClick={handleRefreshAll}
          disabled={isBusy}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-surface border border-border-subtle text-slate-300 hover:text-white text-xs font-semibold self-start sm:self-auto transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin text-[#BFFF00]' : ''}`} />
          <span>{isBusy ? 'Synchronizing...' : 'Refresh Feeds'}</span>
        </button>
      </div>

      {/* Testnet / Architecture Architecture Notice */}
      <div className="rounded-xl bg-muted/40 border border-border-subtle p-4 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-semibold text-white">
          <Info className="w-4 h-4 text-[#BFFF00]" />
          <span>Protocol Architecture: Market Spot vs Protocol Oracle</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-300">Market Price:</strong> External live ticker (Coinbase /
          CoinGecko) displays real-time spot pricing.{' '}
          <strong className="text-slate-300">Protocol Price:</strong> Authoritative on-chain oracle
          (Chainlink &rarr; OracleManager &rarr; PortfolioManager) powers UVBE token NAV, TVL, and
          collateral valuation. Base Sepolia oracle updates depend on the configured Chainlink
          testnet feed.
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="BTC Protocol Feed"
          value={btcFeed.priceUSD}
          subtitle={`Status: ${btcFeed.status} · Chainlink`}
          icon={Activity}
          glowColor={btcFeed.status === 'LIVE' ? 'amber' : undefined}
        />
        <StatCard
          title="ETH Protocol Feed"
          value={ethFeed.priceUSD}
          subtitle={`Status: ${ethFeed.status} · Chainlink`}
          icon={Activity}
          glowColor={ethFeed.status === 'LIVE' ? 'blue' : undefined}
        />
        <StatCard
          title="USDC Protocol Feed"
          value={usdcFeed.priceUSD}
          subtitle={`Status: ${usdcFeed.status} · Chainlink`}
          icon={ShieldCheck}
          glowColor={usdcFeed.status === 'LIVE' ? 'emerald' : undefined}
        />
        <StatCard
          title="UVBE Valuation Engine"
          value={protocolData.currentUVPriceUSD || '$1.00000000'}
          subtitle={`TVL: ${protocolData.totalVaultNAVUSD}`}
          icon={Zap}
          glowColor="purple"
        />
      </div>

      {/* Detailed Oracle Feeds Table */}
      <TableCard
        title="Active Asset Price Feeds & Heartbeat Monitoring"
        subtitle="On-chain price feeds registered inside OracleManager"
        icon={Clock}
      >
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-slate-400 font-semibold">
              <th className="py-3.5 px-3">Asset</th>
              <th className="py-3.5 px-3">Oracle Provider</th>
              <th className="py-3.5 px-3">Current Price</th>
              <th className="py-3.5 px-3">Heartbeat Timeout</th>
              <th className="py-3.5 px-3">Feed Status</th>
              <th className="py-3.5 px-3 text-right">Data Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40">
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-4 px-3 font-bold text-white flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-extrabold text-[10px]">
                  BTC
                </div>
                <div>
                  <div className="font-bold">cbBTC / USD</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {shortAddr(tokens.cbBTC)}
                  </div>
                </div>
              </td>
              <td className="py-4 px-3 text-slate-300 font-semibold">Chainlink (AggregatorV3)</td>
              <td
                className={`py-4 px-3 font-mono font-bold ${
                  btcFeed.status === 'LIVE' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {btcFeed.priceUSD}
              </td>
              <td className="py-4 px-3 font-mono text-slate-400">86,400s (24h)</td>
              <td className="py-4 px-3">{getStatusBadge(btcFeed.status)}</td>
              <td className="py-4 px-3 text-right font-mono text-slate-400">
                On-Chain OracleManager
              </td>
            </tr>

            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-4 px-3 font-bold text-white flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-extrabold text-[10px]">
                  ETH
                </div>
                <div>
                  <div className="font-bold">WETH / USD</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {shortAddr(tokens.WETH)}
                  </div>
                </div>
              </td>
              <td className="py-4 px-3 text-slate-300 font-semibold">Chainlink (AggregatorV3)</td>
              <td
                className={`py-4 px-3 font-mono font-bold ${
                  ethFeed.status === 'LIVE' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {ethFeed.priceUSD}
              </td>
              <td className="py-4 px-3 font-mono text-slate-400">86,400s (24h)</td>
              <td className="py-4 px-3">{getStatusBadge(ethFeed.status)}</td>
              <td className="py-4 px-3 text-right font-mono text-slate-400">
                On-Chain OracleManager
              </td>
            </tr>

            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-4 px-3 font-bold text-white flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-extrabold text-[10px]">
                  USD
                </div>
                <div>
                  <div className="font-bold">USDC / USD</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {shortAddr(tokens.USDC)}
                  </div>
                </div>
              </td>
              <td className="py-4 px-3 text-slate-300 font-semibold">Chainlink (AggregatorV3)</td>
              <td
                className={`py-4 px-3 font-mono font-bold ${
                  usdcFeed.status === 'LIVE' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {usdcFeed.priceUSD}
              </td>
              <td className="py-4 px-3 font-mono text-slate-400">86,400s (24h)</td>
              <td className="py-4 px-3">{getStatusBadge(usdcFeed.status)}</td>
              <td className="py-4 px-3 text-right font-mono text-slate-400">
                On-Chain OracleManager
              </td>
            </tr>
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
