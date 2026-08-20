'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useBlockNumber, useReadContracts, useGasPrice, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import {
  ORACLE_MANAGER_ABI,
  CHAINLINK_ORACLE_PROVIDER_ABI,
  STRATEGY_MANAGER_ABI,
  LIQUIDITY_MANAGER_ABI,
  UNIFY_VAULT_PAYMASTER_ABI,
  GAS_TREASURY_ABI,
} from '../../../lib/contracts';
import { getChainTokens, getDefaultChainId, DEPLOYED_CONTRACTS_SEPOLIA } from '../../../constants';
import { useProtocolDirectory } from '../../../hooks/useProtocolDirectory';
import { StatCard } from '../../../components/ui/StatCard';
import { TableCard } from '../../../components/ui/TableCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  Activity,
  Server,
  Cpu,
  Zap,
  RefreshCw,
  Layers,
  ShieldCheck,
  History,
  Fuel,
  Vault,
  AlertTriangle,
  Sliders,
  Droplets,
  PieChart,
} from 'lucide-react';

export default function AdminMonitoringPage() {
  const { chain } = useAccount();
  const activeChainId = chain?.id || getDefaultChainId();
  const chainName = chain?.name || (activeChainId === 8453 ? 'Base Mainnet' : 'Base Sepolia');
  const tokens = getChainTokens(activeChainId);
  const publicClient = usePublicClient({ chainId: activeChainId });

  const { data: blockNumber, isError: isBlockError } = useBlockNumber();
  const { data: gasPrice } = useGasPrice();
  const { oracle, controller, vault, treasury } = useProtocolDirectory();

  const oracleManagerAddress = DEPLOYED_CONTRACTS_SEPOLIA.OracleManager;
  const chainlinkProviderAddress = DEPLOYED_CONTRACTS_SEPOLIA.ChainlinkOracleProvider;
  const strategyManagerAddress = DEPLOYED_CONTRACTS_SEPOLIA.StrategyManager;
  const liquidityManagerAddress = DEPLOYED_CONTRACTS_SEPOLIA.LiquidityManager;
  const paymasterAddress = DEPLOYED_CONTRACTS_SEPOLIA.Paymaster;
  const gasTreasuryAddress = DEPLOYED_CONTRACTS_SEPOLIA.GasTreasury;

  const [gasTreasuryEthBal, setGasTreasuryEthBal] = useState<bigint>(0n);

  const {
    data: contractReads,
    isError: isReadError,
    refetch,
  } = useReadContracts({
    contracts: [
      // 0-2: Oracle prices
      {
        address: oracleManagerAddress,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.cbBTC],
      },
      {
        address: oracleManagerAddress,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.WETH],
      },
      {
        address: oracleManagerAddress,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [tokens.USDC],
      },
      // 3-5: Oracle freshness
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
      // 6: Strategy total BPS
      {
        address: strategyManagerAddress,
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'getTotalAllocationBps',
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
      // 10: Paymaster isPaused
      { address: paymasterAddress, abi: UNIFY_VAULT_PAYMASTER_ABI, functionName: 'isPaused' },
      // 11: Paymaster getDeposit
      { address: paymasterAddress, abi: UNIFY_VAULT_PAYMASTER_ABI, functionName: 'getDeposit' },
      // 12: Gas Treasury isPaused
      { address: gasTreasuryAddress, abi: GAS_TREASURY_ABI, functionName: 'isPaused' },
    ],
    query: {
      staleTime: 15_000,
      gcTime: 60_000,
    },
  });

  const fetchTreasuryBalance = useCallback(async () => {
    if (!publicClient || !gasTreasuryAddress) return;
    try {
      const bal = await publicClient.getBalance({ address: gasTreasuryAddress });
      setGasTreasuryEthBal(bal);
    } catch {
      // Ignore balance fetch failure
    }
  }, [publicClient, gasTreasuryAddress]);

  useEffect(() => {
    fetchTreasuryBalance();
  }, [fetchTreasuryBalance]);

  const btcPriceRaw = (contractReads?.[0]?.result as bigint) || 0n;
  const ethPriceRaw = (contractReads?.[1]?.result as bigint) || 0n;
  const usdcPriceRaw = (contractReads?.[2]?.result as bigint) || 0n;
  const btcFresh = Boolean(contractReads?.[3]?.result);
  const ethFresh = Boolean(contractReads?.[4]?.result);
  const usdcFresh = Boolean(contractReads?.[5]?.result);

  const totalStrategyBps = (contractReads?.[6]?.result as bigint) || 0n;
  const isStrategyHealthy = totalStrategyBps === 10000n;

  const btcLiqAssess = contractReads?.[7]?.result as [boolean, boolean, bigint, bigint] | undefined;
  const ethLiqAssess = contractReads?.[8]?.result as [boolean, boolean, bigint, bigint] | undefined;
  const usdcLiqAssess = contractReads?.[9]?.result as
    [boolean, boolean, bigint, bigint] | undefined;

  const hasLiquidityBreach = Boolean(
    btcLiqAssess?.[0] ||
    btcLiqAssess?.[1] ||
    ethLiqAssess?.[0] ||
    ethLiqAssess?.[1] ||
    usdcLiqAssess?.[0] ||
    usdcLiqAssess?.[1],
  );

  const isPaymasterPaused = Boolean(contractReads?.[10]?.result);
  const paymasterDeposit = (contractReads?.[11]?.result as bigint) || 0n;
  const isTreasuryPaused = Boolean(contractReads?.[12]?.result);

  const isOracleHealthy =
    btcFresh && ethFresh && usdcFresh && btcPriceRaw > 0n && ethPriceRaw > 0n && usdcPriceRaw > 0n;

  // Current chain block from live RPC
  const currentChainBlock = blockNumber ? Number(blockNumber) : 0;
  const gasGwei = gasPrice ? `${(Number(gasPrice) / 1e9).toFixed(3)} Gwei` : '...';
  const rpcHealthy = !isBlockError && currentChainBlock > 0;

  const shortAddr = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Connecting...';

  const isLowDeposit = paymasterDeposit < 10000000000000000n; // < 0.01 ETH
  const overallHealthy =
    isOracleHealthy &&
    isStrategyHealthy &&
    !hasLiquidityBreach &&
    rpcHealthy &&
    !isReadError &&
    !isPaymasterPaused &&
    !isTreasuryPaused;

  const handleRefresh = async () => {
    await Promise.all([refetch(), fetchTreasuryBalance()]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              System Infrastructure & Protocol Telemetry
            </h1>
            <StatusBadge
              status={overallHealthy ? 'Healthy' : 'Warning'}
              label={overallHealthy ? 'ALL SUBSYSTEMS NOMINAL' : 'ATTENTION REQUIRED'}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time health telemetry across Network, Oracle Risk Engine, Strategy Weights,
            Liquidity Reserves, and Gas Sponsorship.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border-subtle text-foreground text-xs font-semibold self-start sm:self-auto transition-colors min-h-[38px]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh All Subsystems</span>
        </button>
      </div>

      {/* Infrastructure Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Network Status"
          value={chainName}
          subtitle={`Chain ID ${activeChainId} · Block #${currentChainBlock.toLocaleString()}`}
          icon={Layers}
          glowColor="blue"
        />
        <StatCard
          title="Oracle Risk Telemetry"
          value={isOracleHealthy ? 'HEALTHY' : 'BREACH / STALE'}
          subtitle={isOracleHealthy ? '3/3 Feeds Fresh & Armed' : 'Attention Required'}
          icon={Activity}
          glowColor={isOracleHealthy ? 'emerald' : 'amber'}
        />
        <StatCard
          title="Strategy Allocation"
          value={isStrategyHealthy ? '10,000 BPS OK' : 'MISALIGNED'}
          subtitle="Strict Invariant Verified"
          icon={PieChart}
          glowColor={isStrategyHealthy ? 'emerald' : 'amber'}
        />
        <StatCard
          title="Liquidity Reserves"
          value={hasLiquidityBreach ? 'ALERT' : 'BALANCED'}
          subtitle={hasLiquidityBreach ? 'Threshold Action Required' : 'Optimal Operational Buffer'}
          icon={Droplets}
          glowColor={hasLiquidityBreach ? 'amber' : 'purple'}
        />
      </div>

      {/* Subsystem Health Matrix */}
      <TableCard
        title="Protocol Subsystem & Contract Health Matrix"
        subtitle="Live on-chain health derived from verified contract state"
        icon={Server}
      >
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle bg-card/40 text-muted-foreground font-semibold">
              <th className="py-3 px-4">Subsystem / Module</th>
              <th className="py-3 px-4">Contract Target</th>
              <th className="py-3 px-4">Derived Health State</th>
              <th className="py-3 px-4 text-right">Telemetry Parameter</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40 font-mono">
            {/* OracleManager */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-4 font-sans font-bold text-foreground flex items-center space-x-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span>OracleManager (Pricing Coordinator)</span>
              </td>
              <td className="py-3.5 px-4 text-muted-foreground">
                {shortAddr(oracleManagerAddress)}
              </td>
              <td className="py-3.5 px-4 font-sans">
                <StatusBadge
                  status={isOracleHealthy ? 'Healthy' : 'Error'}
                  label={isOracleHealthy ? 'HEALTHY' : 'STALE / BREACH'}
                />
              </td>
              <td className="py-3.5 px-4 text-right font-sans text-muted-foreground">
                cbBTC: {btcFresh ? 'Fresh' : 'Stale'} | ETH: {ethFresh ? 'Fresh' : 'Stale'} | USDC:{' '}
                {usdcFresh ? 'Fresh' : 'Stale'}
              </td>
            </tr>

            {/* StrategyManager */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-4 font-sans font-bold text-foreground flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-blue-400" />
                <span>StrategyManager (Target Weights)</span>
              </td>
              <td className="py-3.5 px-4 text-muted-foreground">
                {shortAddr(strategyManagerAddress)}
              </td>
              <td className="py-3.5 px-4 font-sans">
                <StatusBadge
                  status={isStrategyHealthy ? 'Healthy' : 'Warning'}
                  label={isStrategyHealthy ? 'HEALTHY' : 'WARNING'}
                />
              </td>
              <td className="py-3.5 px-4 text-right font-sans text-muted-foreground">
                Sum: {totalStrategyBps.toString()} / 10,000 BPS
              </td>
            </tr>

            {/* LiquidityManager */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-4 font-sans font-bold text-foreground flex items-center space-x-2">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <span>LiquidityManager (Buffer & Reserves)</span>
              </td>
              <td className="py-3.5 px-4 text-muted-foreground">
                {shortAddr(liquidityManagerAddress)}
              </td>
              <td className="py-3.5 px-4 font-sans">
                <StatusBadge
                  status={hasLiquidityBreach ? 'Warning' : 'Healthy'}
                  label={hasLiquidityBreach ? 'WARNING' : 'HEALTHY'}
                />
              </td>
              <td className="py-3.5 px-4 text-right font-sans text-muted-foreground">
                {hasLiquidityBreach ? 'Refill or Sweep Threshold Met' : 'Buffers within bounds'}
              </td>
            </tr>

            {/* Paymaster */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-4 font-sans font-bold text-foreground flex items-center space-x-2">
                <Fuel className="w-4 h-4 text-purple-400" />
                <span>UnifyVaultPaymaster (ERC-4337)</span>
              </td>
              <td className="py-3.5 px-4 text-muted-foreground">{shortAddr(paymasterAddress)}</td>
              <td className="py-3.5 px-4 font-sans">
                <StatusBadge
                  status={isPaymasterPaused ? 'Paused' : isLowDeposit ? 'Warning' : 'Healthy'}
                  label={isPaymasterPaused ? 'PAUSED' : isLowDeposit ? 'WARNING' : 'HEALTHY'}
                />
              </td>
              <td className="py-3.5 px-4 text-right font-sans text-muted-foreground">
                Deposit: {Number(formatEther(paymasterDeposit)).toFixed(4)} ETH
              </td>
            </tr>

            {/* Gas Treasury */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-4 font-sans font-bold text-foreground flex items-center space-x-2">
                <Vault className="w-4 h-4 text-emerald-400" />
                <span>GasTreasury (Refill Reserve)</span>
              </td>
              <td className="py-3.5 px-4 text-muted-foreground">{shortAddr(gasTreasuryAddress)}</td>
              <td className="py-3.5 px-4 font-sans">
                <StatusBadge
                  status={isTreasuryPaused ? 'Paused' : 'Healthy'}
                  label={isTreasuryPaused ? 'PAUSED' : 'HEALTHY'}
                />
              </td>
              <td className="py-3.5 px-4 text-right font-sans text-muted-foreground">
                Reserve: {Number(formatEther(gasTreasuryEthBal)).toFixed(4)} ETH
              </td>
            </tr>
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
