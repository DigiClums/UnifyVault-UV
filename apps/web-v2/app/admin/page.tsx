'use client';

import React from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableCard } from '../../components/ui/TableCard';
import { useDashboard } from '../../hooks/useDashboard';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import {
  ORACLE_MANAGER_ABI,
  STRATEGY_MANAGER_ABI,
  LIQUIDITY_MANAGER_ABI,
  UNIFY_VAULT_PAYMASTER_ABI,
  GAS_TREASURY_ABI,
} from '../../lib/contracts';
import {
  getExplorerBaseUrl,
  getProtocolDirectoryAddress,
  DIRECTORY_ADDRESS_SEPOLIA,
  DEPLOYED_CONTRACTS_SEPOLIA,
  getChainTokens,
  getDefaultChainId,
} from '../../constants';
import {
  ShieldCheck,
  Vault,
  Activity,
  RefreshCw,
  ArrowUpRight,
  Zap,
  Fuel,
  Droplets,
  PieChart,
  Users,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminOverviewPage() {
  const { chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const explorerBaseUrl = getExplorerBaseUrl(chainId);
  const tokens = getChainTokens(chainId);
  const { totalPortfolioValueUSD, sharePriceUSD } = useDashboard();
  const protocolDirectory = useProtocolDirectory();
  const { controller, vault, treasury, oracle, strategyManager, liquidityManager } =
    protocolDirectory;

  const oracleManagerAddress = oracle || DEPLOYED_CONTRACTS_SEPOLIA.OracleManager;
  const strategyManagerAddress = strategyManager || DEPLOYED_CONTRACTS_SEPOLIA.StrategyManager;
  const liquidityManagerAddress = liquidityManager || DEPLOYED_CONTRACTS_SEPOLIA.LiquidityManager;
  const paymasterAddress = DEPLOYED_CONTRACTS_SEPOLIA.Paymaster;
  const gasTreasuryAddress = DEPLOYED_CONTRACTS_SEPOLIA.GasTreasury;

  // Batched live telemetry reads
  const { data: telemetryReads, isLoading: isTelemetryLoading } = useReadContracts({
    contracts: [
      // 0: Paymaster isPaused
      { address: paymasterAddress, abi: UNIFY_VAULT_PAYMASTER_ABI, functionName: 'isPaused' },
      // 1: Paymaster getDeposit
      { address: paymasterAddress, abi: UNIFY_VAULT_PAYMASTER_ABI, functionName: 'getDeposit' },
      // 2: Gas Treasury isPaused
      { address: gasTreasuryAddress, abi: GAS_TREASURY_ABI, functionName: 'isPaused' },
      // 3: Strategy total allocation BPS
      {
        address: strategyManagerAddress,
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'getTotalAllocationBps',
      },
      // 4-6: Oracle price freshness
      {
        address: oracleManagerAddress,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.cbBTC],
      },
      {
        address: oracleManagerAddress,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.WETH],
      },
      {
        address: oracleManagerAddress,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [tokens.USDC],
      },
      // 7-9: Liquidity assessments
      {
        address: liquidityManagerAddress,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'assessLiquidity',
        args: [tokens.cbBTC],
      },
      {
        address: liquidityManagerAddress,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'assessLiquidity',
        args: [tokens.WETH],
      },
      {
        address: liquidityManagerAddress,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'assessLiquidity',
        args: [tokens.USDC],
      },
    ],
    query: {
      staleTime: 15_000,
      gcTime: 60_000,
    },
  });

  const isPaymasterPaused = Boolean(telemetryReads?.[0]?.result);
  const paymasterDeposit = (telemetryReads?.[1]?.result as bigint) || 0n;
  const isTreasuryPaused = Boolean(telemetryReads?.[2]?.result);
  const strategyBps = (telemetryReads?.[3]?.result as bigint) || 0n;
  const isStrategyOk = strategyBps === 10000n;

  const isBtcFresh = Boolean(telemetryReads?.[4]?.result);
  const isEthFresh = Boolean(telemetryReads?.[5]?.result);
  const isUsdcFresh = Boolean(telemetryReads?.[6]?.result);
  const isOracleAllFresh = isBtcFresh && isEthFresh && isUsdcFresh;

  const btcLiq = telemetryReads?.[7]?.result as [boolean, boolean, bigint, bigint] | undefined;
  const ethLiq = telemetryReads?.[8]?.result as [boolean, boolean, bigint, bigint] | undefined;
  const usdcLiq = telemetryReads?.[9]?.result as [boolean, boolean, bigint, bigint] | undefined;
  const hasLiquidityBreach = Boolean(
    btcLiq?.[0] || btcLiq?.[1] || ethLiq?.[0] || ethLiq?.[1] || usdcLiq?.[0] || usdcLiq?.[1],
  );

  const shortAddr = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Connecting...';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Admin Governance & Operations Console
            </h1>
            <StatusBadge status="Admin" label="SYSTEM NOMINAL" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Central telemetry, contract status, treasury revenue, and operational controls for
            UnifyVault V2 on Base Sepolia.
          </p>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Value Locked"
          value={totalPortfolioValueUSD || '$0.00'}
          subtitle="On-chain CustodyVault assets"
          icon={Vault}
          glowColor="blue"
        />
        <StatCard
          title="Current UVBE Price"
          value={sharePriceUSD}
          subtitle="PortfolioManager NAV"
          icon={Activity}
          glowColor="emerald"
        />
        <StatCard
          title="Oracle Risk Engine"
          value={isOracleAllFresh ? '100% FRESH' : 'ATTENTION'}
          subtitle="cbBTC · WETH · USDC Feeds"
          icon={Zap}
          glowColor={isOracleAllFresh ? 'purple' : 'amber'}
        />
        <StatCard
          title="Strategy Total Allocation"
          value={`${strategyBps.toString()} BPS`}
          subtitle={isStrategyOk ? '100.00% Exact Invariant' : 'Misaligned'}
          icon={PieChart}
          glowColor={isStrategyOk ? 'cyan' : 'amber'}
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Oracle Manager */}
        <Link
          href="/admin/oracle"
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-purple-500/40 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                  isOracleAllFresh
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {isOracleAllFresh ? 'FEEDS NOMINAL' : 'ATTENTION'}
              </span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
            </div>
          </div>
          <h3 className="text-base font-bold text-foreground tracking-tight">Oracle Manager</h3>
          <p className="text-xs text-muted-foreground">
            Price feed health, heartbeat monitoring, max deviation circuit breakers, and
            AggregatorV3 routing.
          </p>
        </Link>

        {/* Strategy Rebalance */}
        <Link
          href="/admin/rebalance"
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-purple-500/40 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <PieChart className="w-5 h-5" />
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                  isStrategyOk
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {isStrategyOk ? '10,000 BPS OK' : 'MISALIGNED'}
              </span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
            </div>
          </div>
          <h3 className="text-base font-bold text-foreground tracking-tight">Strategy Rebalance</h3>
          <p className="text-xs text-muted-foreground">
            Constituent asset weights, atomic DEX rebalancing, and portfolio basket governance.
          </p>
        </Link>

        {/* Liquidity & Reserves */}
        <Link
          href="/admin/liquidity"
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-purple-500/40 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Droplets className="w-5 h-5" />
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                  hasLiquidityBreach
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {hasLiquidityBreach ? 'REFILL / SWEEP' : 'BALANCED'}
              </span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
            </div>
          </div>
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Liquidity & Reserves
          </h3>
          <p className="text-xs text-muted-foreground">
            Operational buffers, excess sweep execution, custom thresholds, and reserve accounting.
          </p>
        </Link>

        {/* Paymaster & Gas Treasury */}
        <Link
          href="/admin/paymaster"
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-purple-500/40 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Fuel className="w-5 h-5" />
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                  isPaymasterPaused || isTreasuryPaused
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {isPaymasterPaused ? 'PAUSED' : 'ACTIVE'}
              </span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
            </div>
          </div>
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Paymaster & Gas Treasury
          </h3>
          <p className="text-xs text-muted-foreground">
            ERC-4337 gas sponsorship policy, EntryPoint deposit (
            {Number(formatEther(paymasterDeposit)).toFixed(4)} ETH), and reserves.
          </p>
        </Link>

        {/* Governance & Timelock */}
        <Link
          href="/admin/governance"
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-purple-500/40 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
          </div>
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Governance & Timelock
          </h3>
          <p className="text-xs text-muted-foreground">
            Protocol Directory, RBAC AccessControl, 48h Timelock, and Emergency Pause Controls.
          </p>
        </Link>

        {/* User Accounting */}
        <Link
          href="/admin/users"
          className="p-5 rounded-2xl bg-surface/80 border border-border-subtle hover:border-purple-500/40 transition-all space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
          </div>
          <h3 className="text-base font-bold text-foreground tracking-tight">User Accounting</h3>
          <p className="text-xs text-muted-foreground">
            On-chain cost basis ledger, realized/unrealized PnL, ROI analytics, and migration tool.
          </p>
        </Link>
      </div>

      {/* System Contract Registry Table */}
      <TableCard
        title="Deployed Protocol Module Directory"
        subtitle={`Canonical module registrations on ${chain?.name || (getProtocolDirectoryAddress(chain?.id) === DIRECTORY_ADDRESS_SEPOLIA ? 'Base Sepolia' : 'Base Mainnet')}`}
        icon={ShieldCheck}
      >
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-muted-foreground font-semibold">
              <th className="py-3 px-3">Module Name</th>
              <th className="py-3 px-3">Contract Address</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Explorer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40 font-mono">
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-foreground">OracleManager</td>
              <td className="py-3.5 px-3 text-foreground/80">{shortAddr(oracleManagerAddress)}</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Active" showPulse={false} />
              </td>
              <td className="py-3.5 px-3 text-right font-sans">
                <a
                  href={`${explorerBaseUrl}/address/${oracleManagerAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  Block Explorer
                </a>
              </td>
            </tr>
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-foreground">StrategyManager</td>
              <td className="py-3.5 px-3 text-foreground/80">
                {shortAddr(strategyManagerAddress)}
              </td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Active" showPulse={false} />
              </td>
              <td className="py-3.5 px-3 text-right font-sans">
                <a
                  href={`${explorerBaseUrl}/address/${strategyManagerAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  Block Explorer
                </a>
              </td>
            </tr>
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-foreground">LiquidityManager</td>
              <td className="py-3.5 px-3 text-foreground/80">
                {shortAddr(liquidityManagerAddress)}
              </td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Active" showPulse={false} />
              </td>
              <td className="py-3.5 px-3 text-right font-sans">
                <a
                  href={`${explorerBaseUrl}/address/${liquidityManagerAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  Block Explorer
                </a>
              </td>
            </tr>
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-foreground">
                UnifyVaultController
              </td>
              <td className="py-3.5 px-3 text-foreground/80">{shortAddr(controller)}</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Active" showPulse={false} />
              </td>
              <td className="py-3.5 px-3 text-right font-sans">
                {controller ? (
                  <a
                    href={`${explorerBaseUrl}/address/${controller}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:underline"
                  >
                    Block Explorer
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
            </tr>
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-foreground">CustodyVault</td>
              <td className="py-3.5 px-3 text-foreground/80">{shortAddr(vault)}</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Active" showPulse={false} />
              </td>
              <td className="py-3.5 px-3 text-right font-sans">
                {vault ? (
                  <a
                    href={`${explorerBaseUrl}/address/${vault}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:underline"
                  >
                    Block Explorer
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
            </tr>
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-3 font-sans font-bold text-foreground">Treasury</td>
              <td className="py-3.5 px-3 text-foreground/80">{shortAddr(treasury)}</td>
              <td className="py-3.5 px-3 font-sans">
                <StatusBadge status="Active" showPulse={false} />
              </td>
              <td className="py-3.5 px-3 text-right font-sans">
                {treasury ? (
                  <a
                    href={`${explorerBaseUrl}/address/${treasury}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:underline"
                  >
                    Block Explorer
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
