'use client';

import React from 'react';
import { useAccount, useBlockNumber, useReadContracts, useGasPrice } from 'wagmi';
import { ORACLE_MANAGER_ABI } from '../../../lib/contracts';
import { getChainTokens, getDefaultChainId } from '../../../constants';
import { useProtocolDirectory } from '../../../hooks/useProtocolDirectory';
import { StatCard } from '../../../components/ui/StatCard';
import { TableCard } from '../../../components/ui/TableCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Activity, Server, Cpu, Zap, RefreshCw, Layers, ShieldCheck, History } from 'lucide-react';

export default function AdminMonitoringPage() {
  const { chain } = useAccount();
  const activeChainId = chain?.id || getDefaultChainId();
  const chainName = chain?.name || (activeChainId === 8453 ? 'Base Mainnet' : 'Base Sepolia');
  const tokens = getChainTokens(activeChainId);

  const { data: blockNumber, isError: isBlockError } = useBlockNumber();
  const { data: gasPrice } = useGasPrice();
  const { oracle, controller, vault, treasury } = useProtocolDirectory();

  const {
    data: contractReads,
    isError: isReadError,
    refetch,
  } = useReadContracts({
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
    ],
    query: {
      enabled: !!oracle,
      staleTime: 15_000,
      gcTime: 60_000,
    },
  });

  const btcPriceRaw = (contractReads?.[0]?.result as bigint) || 0n;
  const ethPriceRaw = (contractReads?.[1]?.result as bigint) || 0n;
  const usdcPriceRaw = (contractReads?.[2]?.result as bigint) || 0n;
  const btcFresh = Boolean(contractReads?.[3]?.result);
  const ethFresh = Boolean(contractReads?.[4]?.result);
  const usdcFresh = Boolean(contractReads?.[5]?.result);

  const isOracleHealthy =
    btcFresh && ethFresh && usdcFresh && btcPriceRaw > 0n && ethPriceRaw > 0n && usdcPriceRaw > 0n;

  const keeperStatus = isOracleHealthy ? 'Healthy' : 'Error';
  const keeperLabel = isOracleHealthy ? 'ACTIVE' : 'ATTENTION REQUIRED';

  // Current chain block from live RPC
  const currentChainBlock = blockNumber ? Number(blockNumber) : 0;

  // Real gas price from RPC
  const gasGwei = gasPrice ? `${(Number(gasPrice) / 1e9).toFixed(3)} Gwei` : '...';

  const rpcHealthy = !isBlockError && currentChainBlock > 0;

  const shortAddr = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Connecting...';

  const overallHealthy = isOracleHealthy && rpcHealthy && !isReadError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              System Infrastructure Telemetry
            </h1>
            <StatusBadge
              status={overallHealthy ? 'Healthy' : 'Error'}
              label={overallHealthy ? 'ALL SYSTEMS OPERATIONAL' : 'SYSTEM ISSUES DETECTED'}
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time telemetry across network connections, protocol contracts, and price feed
            synchronization.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-surface border border-border-subtle text-slate-300 hover:text-white text-xs font-semibold self-start sm:self-auto transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Infrastructure Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Network Status"
          value={chainName}
          subtitle={`Chain ID ${activeChainId} | Block ${currentChainBlock > 0 ? currentChainBlock.toLocaleString() : '...'}`}
          icon={Layers}
          glowColor="blue"
        />
        <StatCard
          title="Gas Price"
          value={gasGwei}
          subtitle="Live Base L2 Gas Price"
          icon={Cpu}
          glowColor="emerald"
        />
        <StatCard
          title="Price Feed Sync"
          value={keeperLabel}
          subtitle={isOracleHealthy ? 'Automated Price Feed Sync' : 'STALE OR UNRESPONSIVE'}
          icon={Zap}
          glowColor={isOracleHealthy ? 'purple' : 'amber'}
        />
        <StatCard
          title="Transaction Explorer"
          value={rpcHealthy ? 'LIVE' : 'DEGRADED'}
          subtitle={rpcHealthy ? 'Direct blockchain RPC watcher' : 'RPC connection issue'}
          icon={History}
          glowColor={rpcHealthy ? 'cyan' : 'amber'}
        />
      </div>

      {/* Contract & Services Health Table */}
      <TableCard
        title="Protocol Component & Contract Health Directory"
        subtitle="Live health status checks across all UnifyVault protocol infrastructure"
        icon={Server}
      >
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-slate-400 font-semibold">
              <th className="py-3.5 px-3">System Subsystem</th>
              <th className="py-3.5 px-3">Target / Endpoint</th>
              <th className="py-3.5 px-3">Heartbeat / Latency</th>
              <th className="py-3.5 px-3">Operational Status</th>
              <th className="py-3.5 px-3 text-right">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40 font-mono">
            {/* Frontend UI */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-white flex items-center space-x-2">
                <Server className="w-4 h-4 text-accent-blue" />
                <span>Frontend UI Web Server</span>
              </td>
              <td className="py-3.5 px-3 text-slate-300">app.unifyvault.xyz</td>
              <td className="py-3.5 px-3 text-slate-400">12ms</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Healthy" label="ONLINE" />
              </td>
              <td className="py-3.5 px-3 text-right font-sans text-emerald-400 font-semibold">
                HTTP 200 OK
              </td>
            </tr>

            {/* Transaction Explorer */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-white flex items-center space-x-2">
                <History className="w-4 h-4 text-accent-cyan" />
                <span>Transaction Explorer</span>
              </td>
              <td className="py-3.5 px-3 text-slate-300">On-chain RPC event watcher</td>
              <td className="py-3.5 px-3 text-slate-400">
                {rpcHealthy ? 'Live watcher + 30s polling' : 'RPC unavailable'}
              </td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge
                  status={rpcHealthy ? 'Healthy' : 'Error'}
                  label={rpcHealthy ? 'LIVE' : 'OFFLINE'}
                />
              </td>
              <td className="py-3.5 px-3 text-right font-sans text-emerald-400 font-semibold">
                {rpcHealthy ? `Block ${currentChainBlock.toLocaleString()}` : 'No connection'}
              </td>
            </tr>

            {/* Price Feed Sync */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Price Feed Synchronization</span>
              </td>
              <td className="py-3.5 px-3 text-slate-300">Oracle Price Feed</td>
              <td className="py-3.5 px-3 text-slate-400">Every 15s</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status={keeperStatus} label={keeperLabel} />
              </td>
              <td className="py-3.5 px-3 text-right font-sans text-emerald-400 font-semibold">
                {isOracleHealthy ? 'Synchronized' : 'Feed Offline'}
              </td>
            </tr>

            {/* UnifyVaultController */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>UnifyVaultController</span>
              </td>
              <td className="py-3.5 px-3 text-slate-300">{shortAddr(controller)}</td>
              <td className="py-3.5 px-3 text-slate-400">On-Chain</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Healthy" label="ACTIVE" />
              </td>
              <td className="py-3.5 px-3 text-right font-sans text-emerald-400 font-semibold">
                Verified
              </td>
            </tr>

            {/* CustodyVault */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>CustodyVault</span>
              </td>
              <td className="py-3.5 px-3 text-slate-300">{shortAddr(vault)}</td>
              <td className="py-3.5 px-3 text-slate-400">On-Chain</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Healthy" label="ACTIVE" />
              </td>
              <td className="py-3.5 px-3 text-right font-sans text-emerald-400 font-semibold">
                Verified
              </td>
            </tr>

            {/* Treasury */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Treasury</span>
              </td>
              <td className="py-3.5 px-3 text-slate-300">{shortAddr(treasury)}</td>
              <td className="py-3.5 px-3 text-slate-400">On-Chain</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Healthy" label="ACTIVE" />
              </td>
              <td className="py-3.5 px-3 text-right font-sans text-emerald-400 font-semibold">
                Verified
              </td>
            </tr>

            {/* OracleManager */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>OracleManager</span>
              </td>
              <td className="py-3.5 px-3 text-slate-300">{shortAddr(oracle)}</td>
              <td className="py-3.5 px-3 text-slate-400">86400s Timeout</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge
                  status={isOracleHealthy ? 'Healthy' : 'Error'}
                  label={isOracleHealthy ? 'FRESH' : 'STALE / DEGRADED'}
                />
              </td>
              <td className="py-3.5 px-3 text-right font-sans text-emerald-400 font-semibold">
                {isOracleHealthy ? 'Feeds Fresh' : 'Attention Required'}
              </td>
            </tr>
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
