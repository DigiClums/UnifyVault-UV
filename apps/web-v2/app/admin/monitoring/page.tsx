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
  STABILIZER_VAULT_ABI,
} from '../../../lib/contracts';
import { getChainTokens, getDefaultChainId, getDeployedContracts } from '../../../constants';
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
  Gauge,
  ExternalLink,
} from 'lucide-react';

export default function AdminMonitoringPage() {
  const { chain } = useAccount();
  const activeChainId = chain?.id || getDefaultChainId();
  const chainName = chain?.name || (activeChainId === 8453 ? 'Base Mainnet' : 'Base Sepolia');
  const tokens = getChainTokens(activeChainId);
  const deployedContracts = getDeployedContracts(activeChainId);
  const publicClient = usePublicClient({ chainId: activeChainId });

  const { data: blockNumber, isError: isBlockError } = useBlockNumber();
  const { data: gasPrice } = useGasPrice();
  const { oracle, controller, vault, treasury } = useProtocolDirectory();

  const oracleManagerAddress = (deployedContracts.OracleManager || oracle) as `0x${string}`;
  const strategyManagerAddress = (deployedContracts.StrategyManager ||
    '0x4F7f99653d9d7aCD462429ffFc0C4B6C8Cf4354a') as `0x${string}`;
  const liquidityManagerAddress = (deployedContracts.LiquidityManager ||
    '0x9af86a9ac1563b7fdbf43b19335348240a8c16d3') as `0x${string}`;
  const paymasterAddress = (deployedContracts.Paymaster ||
    '0xdf96b619934d17ae85142dcef1655a8d3b19040a') as `0x${string}`;
  const gasTreasuryAddress = (deployedContracts.GasTreasury ||
    '0x136a146af0f3c5f1d62caaea31a3bddaaf4e6424') as `0x${string}`;
  const stabilizerVaultAddress = (deployedContracts.StabilizerVault ||
    '0xc268709ebb4d3f0f473c6c5767f60e540d330c11') as `0x${string}`;

  const [gasTreasuryEthBal, setGasTreasuryEthBal] = useState<bigint>(0n);
  const [stabilizerUsdcBal, setStabilizerUsdcBal] = useState<bigint>(0n);
  const [stabilizerUvbeBal, setStabilizerUvbeBal] = useState<bigint>(0n);

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
      // 13: Stabilizer isPaused
      { address: stabilizerVaultAddress, abi: STABILIZER_VAULT_ABI, functionName: 'paused' },
      // 14: Stabilizer daily exposure accumulator
      {
        address: stabilizerVaultAddress,
        abi: STABILIZER_VAULT_ABI,
        functionName: 'dailyExposureAccumulator',
      },
      // 15: Stabilizer last timestamp
      {
        address: stabilizerVaultAddress,
        abi: STABILIZER_VAULT_ABI,
        functionName: 'lastStabilizeTimestamp',
      },
      // 16: Stabilizer max daily limit
      {
        address: stabilizerVaultAddress,
        abi: STABILIZER_VAULT_ABI,
        functionName: 'maxDailyExposureUsdc',
      },
    ],
    query: {
      staleTime: 15_000,
      gcTime: 60_000,
    },
  });

  const fetchBalances = useCallback(async () => {
    if (!publicClient) return;
    try {
      if (gasTreasuryAddress) {
        const bal = await publicClient.getBalance({ address: gasTreasuryAddress });
        setGasTreasuryEthBal(bal);
      }
      if (stabilizerVaultAddress && tokens.USDC) {
        const usdcBal = await publicClient.readContract({
          address: tokens.USDC,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }],
            },
          ],
          functionName: 'balanceOf',
          args: [stabilizerVaultAddress],
        });
        setStabilizerUsdcBal(usdcBal as bigint);
      }
      if (stabilizerVaultAddress && tokens.UVBE) {
        const uvbeBal = await publicClient.readContract({
          address: tokens.UVBE,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }],
            },
          ],
          functionName: 'balanceOf',
          args: [stabilizerVaultAddress],
        });
        setStabilizerUvbeBal(uvbeBal as bigint);
      }
    } catch {
      // Ignore balance fetch failure
    }
  }, [publicClient, gasTreasuryAddress, stabilizerVaultAddress, tokens.USDC, tokens.UVBE]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

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
  const isStabilizerPaused = Boolean(contractReads?.[13]?.result);
  const stabilizerDailyExposure = (contractReads?.[14]?.result as bigint) || 0n;
  const stabilizerLastTimestamp = (contractReads?.[15]?.result as bigint) || 0n;
  const stabilizerMaxDaily = (contractReads?.[16]?.result as bigint) || 500000000n; // 500 USDC

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
    !isTreasuryPaused &&
    !isStabilizerPaused;

  const handleRefresh = async () => {
    await Promise.all([refetch(), fetchBalances()]);
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

            {/* StabilizerVault */}
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-3.5 px-4 font-sans font-bold text-foreground flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#BFFF00]" />
                <span>StabilizerVault (Uniswap V4 Peg Engine)</span>
              </td>
              <td className="py-3.5 px-4 text-muted-foreground">
                {shortAddr(stabilizerVaultAddress)}
              </td>
              <td className="py-3.5 px-4 font-sans">
                <StatusBadge
                  status={isStabilizerPaused ? 'Paused' : 'Healthy'}
                  label={isStabilizerPaused ? 'PAUSED' : 'HEALTHY & ARMED'}
                />
              </td>
              <td className="py-3.5 px-4 text-right font-sans text-muted-foreground">
                Inventory: {(Number(stabilizerUsdcBal) / 1e6).toFixed(2)} USDC |{' '}
                {(Number(stabilizerUvbeBal) / 1e18).toFixed(2)} UVBE
              </td>
            </tr>
          </tbody>
        </table>
      </TableCard>

      {/* Dedicated Stabilizer Telemetry & Health Console */}
      <div className="p-6 rounded-2xl bg-black border-2 border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#BFFF00]/10 border border-[#BFFF00]/20 text-[#BFFF00]">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">
                Autonomous Price Stabilizer Telemetry (Uniswap V4)
              </h2>
              <p className="text-xs text-white/60">
                Live liquidity-aware dynamic price peg controller bounded by hard limits.
              </p>
            </div>
          </div>
          <a
            href={`https://basescan.org/address/${stabilizerVaultAddress}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-[#BFFF00] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>{shortAddr(stabilizerVaultAddress)}</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Status */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[11px] text-white/50 font-semibold uppercase tracking-wider">
              Operational State
            </span>
            <div className="flex items-center space-x-2 pt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${isStabilizerPaused ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`}
              />
              <span className="font-bold text-sm text-white">
                {isStabilizerPaused ? 'Paused / Halted' : 'Active & Guarded'}
              </span>
            </div>
            <p className="text-[11px] text-white/40">50 BPS Min Threshold | 200 BPS Halt</p>
          </div>

          {/* Card 2: USDC Inventory */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[11px] text-white/50 font-semibold uppercase tracking-wider">
              Vault USDC Inventory
            </span>
            <div className="font-bold text-base text-white pt-1 font-mono">
              {(Number(stabilizerUsdcBal) / 1e6).toFixed(2)}{' '}
              <span className="text-xs text-white/50">USDC</span>
            </div>
            <p className="text-[11px] text-white/40">Used for Buybacks on Discount</p>
          </div>

          {/* Card 3: UVBE Inventory */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[11px] text-white/50 font-semibold uppercase tracking-wider">
              Vault UVBE Inventory
            </span>
            <div className="font-bold text-base text-white pt-1 font-mono">
              {(Number(stabilizerUvbeBal) / 1e18).toFixed(2)}{' '}
              <span className="text-xs text-white/50">UVBE</span>
            </div>
            <p className="text-[11px] text-white/40">Used for Sales on Premium</p>
          </div>

          {/* Card 4: Daily Exposure */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[11px] text-white/50 font-semibold uppercase tracking-wider">
              24h Daily Exposure
            </span>
            <div className="font-bold text-base text-white pt-1 font-mono">
              ${(Number(stabilizerDailyExposure) / 1e6).toFixed(2)}{' '}
              <span className="text-xs text-white/50">
                / ${(Number(stabilizerMaxDaily) / 1e6).toFixed(0)}
              </span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-[#BFFF00] h-full transition-all"
                style={{
                  width: `${Math.min(100, Number(stabilizerMaxDaily) > 0 ? (Number(stabilizerDailyExposure) / Number(stabilizerMaxDaily)) * 100 : 0)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
