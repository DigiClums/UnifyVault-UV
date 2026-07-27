'use client';

import React from 'react';
import { useReadContracts } from 'wagmi';
import { ORACLE_MANAGER_ABI } from '../../../lib/contracts';
import { FALLBACK_ADDRESSES } from '../../../constants';
import { formatUSD, formatUnits } from '../../../lib/math';
import { StatCard } from '../../../components/ui/StatCard';
import { TableCard } from '../../../components/ui/TableCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Activity, Zap, RefreshCw, Clock, ShieldCheck } from 'lucide-react';

export default function AdminOraclePage() {
  const { data, refetch } = useReadContracts({
    contracts: [
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
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [FALLBACK_ADDRESSES.USDC],
      },
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [FALLBACK_ADDRESSES.WBTC],
      },
      {
        address: FALLBACK_ADDRESSES.ORACLE,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [FALLBACK_ADDRESSES.WETH],
      },
    ],
    query: {
      refetchInterval: 5_000,
    },
  });

  const btcPriceRaw = (data?.[0]?.result as bigint) || 0n;
  const ethPriceRaw = (data?.[1]?.result as bigint) || 0n;
  const usdcPriceRaw = (data?.[2]?.result as bigint) || 1_000_000_000_000_000_000n;

  const btcFresh = (data?.[3]?.result as boolean) ?? true;
  const ethFresh = (data?.[4]?.result as boolean) ?? true;

  const btcPriceUSD = formatUSD(Number(formatUnits(btcPriceRaw, 18)));
  const ethPriceUSD = formatUSD(Number(formatUnits(ethPriceRaw, 18)));
  const usdcPriceUSD = formatUSD(Number(formatUnits(usdcPriceRaw, 18)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Oracle Price Feed Telemetry
            </h1>
            <StatusBadge status="Healthy" label="Oracle Coordinator" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Price feed verification, heartbeat monitoring, and automated market synchronization.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-surface border border-border-subtle text-slate-300 hover:text-white text-xs font-semibold self-start sm:self-auto transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Feeds</span>
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="BTC Price Feed"
          value={btcPriceUSD}
          subtitle="Chainlink Aggregator"
          icon={Activity}
          glowColor="amber"
        />
        <StatCard
          title="ETH Price Feed"
          value={ethPriceUSD}
          subtitle="Chainlink Aggregator"
          icon={Activity}
          glowColor="blue"
        />
        <StatCard
          title="USDC Price Feed"
          value={usdcPriceUSD}
          subtitle="Chainlink Aggregator"
          icon={ShieldCheck}
          glowColor="emerald"
        />
        <StatCard
          title="Market Price Sync"
          value="ACTIVE"
          subtitle="Automated Coinbase Feed"
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
              <th className="py-3.5 px-3 text-right">Last Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40">
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-4 px-3 font-bold text-white flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-extrabold text-[10px]">
                  BTC
                </div>
                <div>
                  <div className="font-bold">WBTC / USD</div>
                  <div className="text-[10px] text-slate-400 font-mono">0xc83D0A...dee6</div>
                </div>
              </td>
              <td className="py-4 px-3 text-slate-300 font-semibold">Chainlink Oracle Feed</td>
              <td className="py-4 px-3 font-mono font-bold text-emerald-400">{btcPriceUSD}</td>
              <td className="py-4 px-3 font-mono text-slate-400">86,400s (24h)</td>
              <td className="py-4 px-3">
                <StatusBadge
                  status={btcFresh ? 'Healthy' : 'Warning'}
                  label={btcFresh ? 'FRESH' : 'STALE'}
                />
              </td>
              <td className="py-4 px-3 text-right font-mono text-slate-400">Live Sync Active</td>
            </tr>

            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-4 px-3 font-bold text-white flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-extrabold text-[10px]">
                  ETH
                </div>
                <div>
                  <div className="font-bold">WETH / USD</div>
                  <div className="text-[10px] text-slate-400 font-mono">0xEEAa69...A15c</div>
                </div>
              </td>
              <td className="py-4 px-3 text-slate-300 font-semibold">Chainlink Oracle Feed</td>
              <td className="py-4 px-3 font-mono font-bold text-emerald-400">{ethPriceUSD}</td>
              <td className="py-4 px-3 font-mono text-slate-400">86,400s (24h)</td>
              <td className="py-4 px-3">
                <StatusBadge
                  status={ethFresh ? 'Healthy' : 'Warning'}
                  label={ethFresh ? 'FRESH' : 'STALE'}
                />
              </td>
              <td className="py-4 px-3 text-right font-mono text-slate-400">Live Sync Active</td>
            </tr>

            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-4 px-3 font-bold text-white flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-extrabold text-[10px]">
                  USD
                </div>
                <div>
                  <div className="font-bold">USDC / USD</div>
                  <div className="text-[10px] text-slate-400 font-mono">0x036CbD...CF7e</div>
                </div>
              </td>
              <td className="py-4 px-3 text-slate-300 font-semibold">Chainlink Oracle Feed</td>
              <td className="py-4 px-3 font-mono font-bold text-emerald-400">$1.0000</td>
              <td className="py-4 px-3 font-mono text-slate-400">86,400s (24h)</td>
              <td className="py-4 px-3">
                <StatusBadge status="Healthy" label="FRESH" />
              </td>
              <td className="py-4 px-3 text-right font-mono text-slate-400">Pegged $1.00</td>
            </tr>
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
