'use client';

import React, { useState } from 'react';
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { CONTROLLER_ABI, FEE_MANAGER_ABI, PROTOCOL_DIRECTORY_ABI } from '../../../lib/contracts';
import { MODULE_IDS } from '../../../constants';
import { useProtocolDirectory } from '../../../hooks/useProtocolDirectory';
import { getTransactionNonce } from '../../../lib/utils/getTransactionNonce';
import { StatCard } from '../../../components/ui/StatCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const {
    directory,
    controller,
    treasury,
    feeManager: directoryFeeManager,
  } = useProtocolDirectory();

  const [depositFeeInput, setDepositFeeInput] = useState<string>('25');
  const [redeemFeeInput, setRedeemFeeInput] = useState<string>('200');
  const [slippageBps, setSlippageBps] = useState<string>('100');

  const [activeAction, setActiveAction] = useState<'depositFee' | 'redeemFee' | 'slippage' | null>(
    null,
  );

  const { data: feeManagerAddress } = useReadContract({
    address: directory,
    abi: PROTOCOL_DIRECTORY_ABI,
    functionName: 'getAddress',
    args: [MODULE_IDS.FEE_MANAGER],
    query: {
      enabled: !!directory && directory !== '0x0000000000000000000000000000000000000000',
    },
  });

  const targetFeeManager = (feeManagerAddress as `0x${string}`) || directoryFeeManager;

  const { data: controllerSettings } = useReadContracts({
    contracts: [
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
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: 'swapSlippageBps',
      },
      {
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: 'paused',
      },
    ],
    query: {
      enabled: !!controller,
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
    },
  });

  const depositFeeBps = (controllerSettings?.[0]?.result as bigint) || 25n;
  const redeemFeeBps = (controllerSettings?.[1]?.result as bigint) || 200n;
  const currentSlippageBps = (controllerSettings?.[2]?.result as bigint) || 100n;
  const isPaused = (controllerSettings?.[3]?.result as boolean) ?? false;

  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleUpdateDepositFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(depositFeeInput);
    if (
      isNaN(parsed) ||
      parsed < 0 ||
      parsed > 500 ||
      !targetFeeManager ||
      !address ||
      !publicClient
    )
      return;

    setActiveAction('depositFee');
    const nonce = await getTransactionNonce(publicClient, address);
    writeContract({
      address: targetFeeManager,
      abi: FEE_MANAGER_ABI,
      functionName: 'setDepositFeeBps',
      args: [BigInt(parsed)],
      nonce,
    });
  };

  const handleUpdateRedeemFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(redeemFeeInput);
    if (
      isNaN(parsed) ||
      parsed < 0 ||
      parsed > 500 ||
      !targetFeeManager ||
      !address ||
      !publicClient
    )
      return;

    setActiveAction('redeemFee');
    const nonce = await getTransactionNonce(publicClient, address);
    writeContract({
      address: targetFeeManager,
      abi: FEE_MANAGER_ABI,
      functionName: 'setRedeemFeeBps',
      args: [BigInt(parsed)],
      nonce,
    });
  };

  const handleUpdateSlippage = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(slippageBps);
    if (isNaN(parsed) || parsed < 0 || parsed > 10000 || !controller || !address || !publicClient)
      return;

    setActiveAction('slippage');
    const nonce = await getTransactionNonce(publicClient, address);
    writeContract({
      address: controller,
      abi: CONTROLLER_ABI,
      functionName: 'setSwapSlippageBps',
      args: [BigInt(parsed)],
      nonce,
    });
  };

  const treasuryShort = treasury
    ? `${treasury.slice(0, 6)}...${treasury.slice(-4)}`
    : 'Connecting...';
  const feeManagerShort = targetFeeManager
    ? `${targetFeeManager.slice(0, 6)}...${targetFeeManager.slice(-4)}`
    : 'Connecting...';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Protocol Parameters & Governance Settings
            </h1>
            <StatusBadge
              status={isPaused ? 'Paused' : 'Active'}
              label={isPaused ? 'PAUSED' : 'LIVE'}
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure live Deposit Fee, Redemption Fee, DEX Swap Slippage limits, and Treasury
            destinations.
          </p>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Deposit Protocol Fee"
          value={`${(Number(depositFeeBps) / 100).toFixed(2)}%`}
          subtitle={`${depositFeeBps.toString()} BPS (Max 5.00%)`}
          icon={ArrowUpRight}
          glowColor="emerald"
        />
        <StatCard
          title="Redemption Protocol Fee"
          value={`${(Number(redeemFeeBps) / 100).toFixed(2)}%`}
          subtitle={`${redeemFeeBps.toString()} BPS (Max 5.00%)`}
          icon={ArrowDownLeft}
          glowColor="purple"
        />
        <StatCard
          title="Swap Slippage Limit"
          value={`${(Number(currentSlippageBps) / 100).toFixed(2)}%`}
          subtitle={`${currentSlippageBps.toString()} BPS`}
          icon={ShieldCheck}
          glowColor="cyan"
        />
      </div>

      {/* Settings Forms Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Set Deposit Fee Form */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-border-subtle/40 pb-3">
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Update Deposit Protocol Fee
              </h3>
              <p className="text-[11px] text-slate-400">
                Applied to gross collateral deposits (Max Cap: 500 BPS = 5.00%)
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateDepositFee} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Deposit Fee Rate (in BPS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="500"
                  placeholder="25"
                  value={depositFeeInput}
                  onChange={(e) => setDepositFeeInput(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <span className="absolute right-3 top-3 text-emerald-400 font-mono text-xs font-bold">
                  = {(parseInt(depositFeeInput || '0') / 100).toFixed(2)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                25 BPS = 0.25%, 50 BPS = 0.50%, 100 BPS = 1.00%
              </p>
            </div>

            <button
              type="submit"
              disabled={isWritePending || isTxWaiting || !targetFeeManager}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] font-bold text-white shadow-glow disabled:opacity-50 flex items-center justify-center space-x-2 transition-all focus:ring-2 focus:ring-emerald-500/50"
            >
              {activeAction === 'depositFee' && (isWritePending || isTxWaiting) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              <span>
                {activeAction === 'depositFee' && isWritePending
                  ? 'Confirming in Wallet...'
                  : activeAction === 'depositFee' && isTxWaiting
                    ? 'Broadcasting Tx...'
                    : 'Set Deposit Fee'}
              </span>
            </button>
          </form>

          {activeAction === 'depositFee' && isTxSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Deposit fee successfully updated on-chain!</span>
            </div>
          )}
        </div>

        {/* 2. Set Redemption Fee Form */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-border-subtle/40 pb-3">
            <ArrowDownLeft className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Update Redemption Protocol Fee
              </h3>
              <p className="text-[11px] text-slate-400">
                Deducted from net payout collateral upon redemption (Max Cap: 500 BPS = 5.00%)
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateRedeemFee} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Redemption Fee Rate (in BPS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="500"
                  placeholder="200"
                  value={redeemFeeInput}
                  onChange={(e) => setRedeemFeeInput(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <span className="absolute right-3 top-3 text-purple-400 font-mono text-xs font-bold">
                  = {(parseInt(redeemFeeInput || '0') / 100).toFixed(2)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                200 BPS = 2.00%, 150 BPS = 1.50%, 100 BPS = 1.00%
              </p>
            </div>

            <button
              type="submit"
              disabled={isWritePending || isTxWaiting || !targetFeeManager}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] font-bold text-white shadow-glow disabled:opacity-50 flex items-center justify-center space-x-2 transition-all focus:ring-2 focus:ring-purple-500/50"
            >
              {activeAction === 'redeemFee' && (isWritePending || isTxWaiting) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              <span>
                {activeAction === 'redeemFee' && isWritePending
                  ? 'Confirming in Wallet...'
                  : activeAction === 'redeemFee' && isTxWaiting
                    ? 'Broadcasting Tx...'
                    : 'Set Redemption Fee'}
              </span>
            </button>
          </form>

          {activeAction === 'redeemFee' && isTxSuccess && (
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Redemption fee successfully updated on-chain!</span>
            </div>
          )}
        </div>

        {/* 3. Set Swap Slippage Limit Form */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-border-subtle/40 pb-3">
            <Settings className="w-5 h-5 text-accent-blue" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Update Swap Slippage Limit
              </h3>
              <p className="text-[11px] text-slate-400">
                Max allowed slippage tolerance during DEX swaps (e.g. 100 BPS = 1.00%)
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateSlippage} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                DEX Swap Slippage Limit (in BPS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="100"
                  value={slippageBps}
                  onChange={(e) => setSlippageBps(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                />
                <span className="absolute right-3 top-3 text-slate-400 font-mono text-xs font-bold">
                  = {(parseInt(slippageBps || '0') / 100).toFixed(2)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                100 BPS = 1.00% max allowed slippage during swaps.
              </p>
            </div>

            <button
              type="submit"
              disabled={isWritePending || isTxWaiting || !controller}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-accent-blue hover:bg-blue-600 active:scale-[0.99] font-bold text-white shadow-glow disabled:opacity-50 flex items-center justify-center space-x-2 transition-all focus:ring-2 focus:ring-accent-blue/50"
            >
              {activeAction === 'slippage' && (isWritePending || isTxWaiting) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              <span>
                {activeAction === 'slippage' && isWritePending
                  ? 'Confirming in Wallet...'
                  : activeAction === 'slippage' && isTxWaiting
                    ? 'Broadcasting Tx...'
                    : 'Update Slippage Limit'}
              </span>
            </button>
          </form>

          {activeAction === 'slippage' && isTxSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Slippage limit successfully updated on-chain!</span>
            </div>
          )}

          {writeError && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>Transaction failed or requires Admin Role permission.</span>
            </div>
          )}
        </div>

        {/* 4. Protocol Configuration Info */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-border-subtle/40 pb-3">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Active Protocol Configuration
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle flex justify-between">
              <span className="text-slate-400">FeeManager Contract</span>
              <span className="font-mono text-emerald-400 font-bold">{feeManagerShort}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle flex justify-between">
              <span className="text-slate-400">Target Index Ratio</span>
              <span className="font-mono text-amber-400 font-bold">
                StrategyManager Target Weights
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle flex justify-between">
              <span className="text-slate-400">Fee Routing Destination</span>
              <span className="font-mono text-accent-blue font-bold">
                Treasury ({treasuryShort})
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle flex justify-between">
              <span className="text-slate-400">Max Fee Safety Cap</span>
              <span className="font-mono text-slate-300 font-bold">500 BPS (5.00%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
