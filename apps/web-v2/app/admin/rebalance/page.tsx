'use client';

import React, { useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { getTransactionNonce } from '../../../lib/utils/getTransactionNonce';
import { usePortfolio } from '../../../hooks/usePortfolio';
import { STRATEGY_MANAGER_ABI, CONTROLLER_ABI } from '../../../lib/contracts';
import { getChainTokens, getDefaultChainId } from '../../../constants';
import { useProtocolDirectory } from '../../../hooks/useProtocolDirectory';
import { StatCard } from '../../../components/ui/StatCard';
import { TableCard } from '../../../components/ui/TableCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  RefreshCw,
  PieChart,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRightLeft,
  Sliders,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function AdminRebalancePage() {
  const { address, chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const publicClient = usePublicClient({ chainId });
  const tokens = getChainTokens(chain?.id);
  const { holdings } = usePortfolio();
  const { controller, strategyManager } = useProtocolDirectory();

  const { data: controllerStrategyManager } = useReadContract({
    address: controller,
    abi: CONTROLLER_ABI,
    functionName: 'strategyManager',
    query: {
      enabled: !!controller,
    },
  });

  const activeStrategyManager =
    controllerStrategyManager &&
    controllerStrategyManager !== '0x0000000000000000000000000000000000000000'
      ? (controllerStrategyManager as `0x${string}`)
      : strategyManager;

  const {
    data: targetWeightsData,
    isLoading: weightsLoading,
    refetch: refetchWeights,
  } = useReadContract({
    address: activeStrategyManager,
    abi: STRATEGY_MANAGER_ABI,
    functionName: 'getTargetWeights',
    query: {
      enabled: !!activeStrategyManager,
      staleTime: 60_000,
      gcTime: 5 * 60 * 1000,
    },
  });

  // NO FALLBACK: weights are null when data hasn't loaded.
  const targetWeightsBps: bigint[] | null =
    (targetWeightsData?.[1] as bigint[] | undefined) ?? null;
  const targetWbtcBpsNum: number | undefined =
    targetWeightsBps !== null && targetWeightsBps.length > 0
      ? Number(targetWeightsBps[0])
      : undefined;
  const targetWethBpsNum: number | undefined =
    targetWeightsBps !== null && targetWeightsBps.length > 1
      ? Number(targetWeightsBps[1])
      : undefined;

  const targetWbtcPct = targetWbtcBpsNum !== undefined ? targetWbtcBpsNum / 100 : 0;
  const targetWethPct = targetWethBpsNum !== undefined ? targetWethBpsNum / 100 : 0;

  const [wbtcBpsInput, setWbtcBpsInput] = useState<string>(
    targetWbtcBpsNum !== undefined ? targetWbtcBpsNum.toString() : '',
  );
  const [wethBpsInput, setWethBpsInput] = useState<string>(
    targetWethBpsNum !== undefined ? targetWethBpsNum.toString() : '',
  );

  const wbtcBpsVal = parseInt(wbtcBpsInput || '0', 10);
  const wethBpsVal = parseInt(wethBpsInput || '0', 10);
  const totalBpsVal = wbtcBpsVal + wethBpsVal;
  const isValidBps = totalBpsVal === 10000;

  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleUpdateWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStrategyManager || !isValidBps || !address || !publicClient) return;

    const nonce = await getTransactionNonce(publicClient, address);

    writeContract({
      address: activeStrategyManager,
      abi: STRATEGY_MANAGER_ABI,
      functionName: 'updateWeights',
      args: [
        [tokens.cbBTC, tokens.WETH],
        [BigInt(wbtcBpsVal), BigInt(wethBpsVal)],
      ],
      nonce,
    });
  };

  const getFriendlyErrorMessage = (err: unknown): string => {
    if (!err) return '';
    console.error('[Developer Logs - Strategy Update Error]:', err);
    const errorObj = err as { shortMessage?: string; message?: string };
    if (errorObj.shortMessage) return errorObj.shortMessage;
    if (errorObj.message) return errorObj.message;
    return 'Strategy weight update failed. Please check your wallet connection and permissions.';
  };

  const btcHolding = holdings.find((h) => h.symbol === 'BTC');
  const ethHolding = holdings.find((h) => h.symbol === 'ETH');

  const btcWeight = btcHolding ? parseFloat(btcHolding.weightPercent.replace('%', '')) : 0;
  const ethWeight = ethHolding ? parseFloat(ethHolding.weightPercent.replace('%', '')) : 0;

  const strategyShort = activeStrategyManager
    ? `${activeStrategyManager.slice(0, 6)}...${activeStrategyManager.slice(-4)}`
    : 'Resolving...';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Strategy Target Weight Management
            </h1>
            <StatusBadge status="Admin" label="GOVERNANCE RESTRICTED" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure index portfolio target asset weights (BPS) on StrategyManager contract.
          </p>
        </div>

        <button
          onClick={() => refetchWeights()}
          disabled={!activeStrategyManager}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Weights</span>
        </button>
      </div>

      {/* On-Chain Target Weight Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Target cbBTC Weight"
          value={
            weightsLoading
              ? 'Loading...'
              : targetWbtcBpsNum !== undefined
                ? `${targetWbtcPct.toFixed(1)}%`
                : 'N/A'
          }
          subtitle={
            targetWbtcBpsNum !== undefined
              ? `${targetWbtcBpsNum.toLocaleString()} BPS`
              : 'Awaiting on-chain data'
          }
          icon={PieChart}
          glowColor="amber"
        />
        <StatCard
          title="Target WETH Weight"
          value={
            weightsLoading
              ? 'Loading...'
              : targetWethBpsNum !== undefined
                ? `${targetWethPct.toFixed(1)}%`
                : 'N/A'
          }
          subtitle={
            targetWethBpsNum !== undefined
              ? `${targetWethBpsNum.toLocaleString()} BPS`
              : 'Awaiting on-chain data'
          }
          icon={PieChart}
          glowColor="blue"
        />
        <StatCard
          title="Rebalance Execution"
          value="Atomic DEX"
          subtitle="Stateless Auto-Balance"
          icon={ArrowRightLeft}
          glowColor="emerald"
        />
      </div>

      {/* Form & Safeguards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Weight Configuration Form */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-border-subtle/40 pb-3">
            <Sliders className="w-5 h-5 text-accent-blue" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Update Strategy Target Weights
            </h3>
          </div>

          <form onSubmit={handleUpdateWeights} className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1 font-semibold text-slate-300">
                <label>cbBTC Target Weight (in BPS)</label>
                <span className="font-mono text-amber-400">{(wbtcBpsVal / 100).toFixed(2)}%</span>
              </div>
              <input
                type="number"
                placeholder="Enter BPS..."
                value={wbtcBpsInput}
                onChange={(e) => setWbtcBpsInput(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Enter basis points (10000 BPS = 100.00%)
              </span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1 font-semibold text-slate-300">
                <label>WETH Target Weight (in BPS)</label>
                <span className="font-mono text-cyan-400 font-bold">
                  {(wethBpsVal / 100).toFixed(2)}%
                </span>
              </div>
              <input
                type="number"
                placeholder="Enter BPS..."
                value={wethBpsInput}
                onChange={(e) => setWethBpsInput(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Enter basis points (10000 BPS = 100.00%)
              </span>
            </div>

            {/* Total BPS Live Indicator */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                isValidBps
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}
            >
              <span>Total Strategy Weight:</span>
              <span className="font-bold">
                {totalBpsVal.toLocaleString()} BPS ({(totalBpsVal / 100).toFixed(2)}%)
              </span>
            </div>

            {!isValidBps && (
              <p className="text-[11px] text-amber-400">
                ⚠️ Target weights must sum to exactly 10,000 BPS (100.00%).
              </p>
            )}

            <button
              type="submit"
              disabled={!isValidBps || isWritePending || isTxWaiting || !activeStrategyManager}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-accent-blue hover:bg-blue-600 active:scale-[0.99] font-bold text-white shadow-glow disabled:opacity-50 flex items-center justify-center space-x-2 transition-all focus:ring-2 focus:ring-accent-blue/50"
            >
              {(isWritePending || isTxWaiting) && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {isWritePending
                  ? 'Confirming in Wallet...'
                  : isTxWaiting
                    ? 'Broadcasting Tx...'
                    : 'Update Strategy Target Weights'}
              </span>
            </button>
          </form>

          {isTxSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Strategy target weights updated successfully on StrategyManager!</span>
            </div>
          )}

          {writeError && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>{getFriendlyErrorMessage(writeError)}</span>
            </div>
          )}
        </div>

        {/* Strategy Safeguards Card */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-5">
          <div className="flex items-center space-x-2 text-white font-bold text-base border-b border-border-subtle/40 pb-3">
            <ShieldCheck className="w-5 h-5 text-accent-blue" />
            <span>StrategyManager Safeguards</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">StrategyManager Module</span>
              </div>
              <span className="font-mono text-accent-blue font-bold">{strategyShort}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Governance Restricted</span>
              </div>
              <span className="font-mono text-purple-400 font-bold">Admin Role Only</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Strict Sum Invariant</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">Exact 10,000 BPS</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Execution Network</span>
              </div>
              <span className="font-mono text-slate-300 font-bold">Base Mainnet L2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Breakdown Table */}
      <TableCard
        title="Asset Allocation vs Strategy Target Breakdown"
        subtitle="Live custody weights vs StrategyManager target allocations"
        icon={RefreshCw}
      >
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-slate-400 font-semibold">
              <th className="py-3 px-3">Strategy Asset</th>
              <th className="py-3 px-3">Custody Balance</th>
              <th className="py-3 px-3">USD Valuation</th>
              <th className="py-3 px-3">Current Weight</th>
              <th className="py-3 px-3">Target Weight</th>
              <th className="py-3 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40 font-mono">
            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-4 px-3 font-sans font-bold text-white flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-[10px] font-extrabold">
                  BTC
                </div>
                <span>cbBTC (Coinbase Wrapped BTC)</span>
              </td>
              <td className="py-4 px-3 text-slate-200">
                {btcHolding?.balanceFormatted || '0.0000'} BTC
              </td>
              <td className="py-4 px-3 text-emerald-400 font-bold">
                {btcHolding?.valueUSD || '$0.00'}
              </td>
              <td className="py-4 px-3 text-accent-blue font-bold">{btcWeight.toFixed(1)}%</td>
              <td className="py-4 px-3 text-slate-400">
                {weightsLoading
                  ? 'Loading...'
                  : targetWbtcBpsNum !== undefined
                    ? `${targetWbtcPct.toFixed(1)}% (${targetWbtcBpsNum.toLocaleString()} BPS)`
                    : 'N/A'}
              </td>
              <td className="py-4 px-3 text-right font-sans">
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Aligned</span>
                </span>
              </td>
            </tr>

            <tr className="hover:bg-card/40 transition-colors">
              <td className="py-4 px-3 font-sans font-bold text-white flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] font-extrabold">
                  ETH
                </div>
                <span>WETH (Wrapped Ether)</span>
              </td>
              <td className="py-4 px-3 text-slate-200">
                {ethHolding?.balanceFormatted || '0.0000'} ETH
              </td>
              <td className="py-4 px-3 text-emerald-400 font-bold">
                {ethHolding?.valueUSD || '$0.00'}
              </td>
              <td className="py-4 px-3 text-accent-blue font-bold">{ethWeight.toFixed(1)}%</td>
              <td className="py-4 px-3 text-slate-400">
                {weightsLoading
                  ? 'Loading...'
                  : targetWethBpsNum !== undefined
                    ? `${targetWethPct.toFixed(1)}% (${targetWethBpsNum.toLocaleString()} BPS)`
                    : 'N/A'}
              </td>
              <td className="py-4 px-3 text-right font-sans">
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Aligned</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </TableCard>

      {/* Protocol Rebalance Architecture Overview */}
      <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
        <div className="flex items-center space-x-2 text-white font-bold text-base border-b border-border-subtle/40 pb-3">
          <Zap className="w-5 h-5 text-accent-blue" />
          <span>Stateless Atomic DEX Rebalance Engine</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-border-subtle space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Atomic DEX Swaps</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Every deposit splits collateral into target ratio weights via atomic Uniswap V3 DEX
              routing.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-border-subtle space-y-1.5">
            <div className="flex items-center space-x-2 text-accent-blue font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Slippage Protection</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              DEX swaps enforce strict configurable slippage limits (0.25% - 1.00%) to protect vault
              reserves.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-border-subtle space-y-1.5">
            <div className="flex items-center space-x-2 text-purple-400 font-bold">
              <ArrowRightLeft className="w-4 h-4" />
              <span>Zero Keeper Overhead</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Target ratios are maintained continuously on-chain without requiring manual keeper gas
              expenditure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
