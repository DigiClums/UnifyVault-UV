'use client';

import React, { useState } from 'react';
import { useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTROLLER_ABI } from '../../../lib/contracts';
import { FALLBACK_ADDRESSES } from '../../../constants';
import { StatCard } from '../../../components/ui/StatCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Settings, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const [slippageBps, setSlippageBps] = useState<string>('100');

  const { data: controllerSettings, refetch } = useReadContracts({
    contracts: [
      {
        address: FALLBACK_ADDRESSES.CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: 'getDepositFeeBps',
      },
      {
        address: FALLBACK_ADDRESSES.CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: 'getRedeemFeeBps',
      },
      {
        address: FALLBACK_ADDRESSES.CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: 'swapSlippageBps',
      },
      {
        address: FALLBACK_ADDRESSES.CONTROLLER,
        abi: CONTROLLER_ABI,
        functionName: 'paused',
      },
    ],
    query: {
      refetchInterval: 5_000,
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

  const handleUpdateSlippage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slippageBps || parseInt(slippageBps) < 0 || parseInt(slippageBps) > 10000) return;

    writeContract({
      address: FALLBACK_ADDRESSES.CONTROLLER,
      abi: CONTROLLER_ABI,
      functionName: 'setSwapSlippageBps',
      args: [BigInt(slippageBps)],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Protocol Parameters & Settings
            </h1>
            <StatusBadge
              status={isPaused ? 'Paused' : 'Active'}
              label={isPaused ? 'PAUSED' : 'LIVE'}
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure deposit/redeem fees, DEX swap slippage limits, and emergency controls.
          </p>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Deposit Fee"
          value={`${(Number(depositFeeBps) / 100).toFixed(2)}%`}
          subtitle={`${depositFeeBps.toString()} BPS`}
          icon={Settings}
          glowColor="blue"
        />
        <StatCard
          title="Redeem Fee"
          value={`${(Number(redeemFeeBps) / 100).toFixed(2)}%`}
          subtitle={`${redeemFeeBps.toString()} BPS`}
          icon={Settings}
          glowColor="purple"
        />
        <StatCard
          title="Swap Slippage Limit"
          value={`${(Number(currentSlippageBps) / 100).toFixed(2)}%`}
          subtitle={`${currentSlippageBps.toString()} BPS`}
          icon={ShieldCheck}
          glowColor="emerald"
        />
      </div>

      {/* Settings Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slippage Update Form */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-border-subtle/40 pb-3">
            <Settings className="w-5 h-5 text-accent-blue" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Update Swap Slippage Limit
            </h3>
          </div>

          <form onSubmit={handleUpdateSlippage} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                DEX Swap Slippage Tolerance (in BPS)
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="100"
                  value={slippageBps}
                  onChange={(e) => setSlippageBps(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-accent-blue"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 font-mono text-xs">
                  = {(parseInt(slippageBps || '0') / 100).toFixed(2)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                100 BPS = 1.00% max allowed slippage during swaps.
              </p>
            </div>

            <button
              type="submit"
              disabled={isWritePending || isTxWaiting}
              className="w-full py-3 px-4 rounded-xl bg-accent-blue hover:bg-blue-600 font-bold text-white shadow-glow disabled:opacity-50 flex items-center justify-center space-x-2 transition-all"
            >
              {(isWritePending || isTxWaiting) && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {isWritePending
                  ? 'Confirming in Wallet...'
                  : isTxWaiting
                    ? 'Broadcasting Tx...'
                    : 'Update Slippage Limit'}
              </span>
            </button>
          </form>

          {isTxSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Slippage limit successfully updated on-chain!</span>
            </div>
          )}

          {writeError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{writeError.message}</span>
            </div>
          )}
        </div>

        {/* Read-Only Fixed Protocol Parameters */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-border-subtle/40 pb-3">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Active Protocol Configuration
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle flex justify-between">
              <span className="text-slate-400">Target Index Ratio</span>
              <span className="font-mono text-amber-400 font-bold">50% BTC / 50% ETH</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle flex justify-between">
              <span className="text-slate-400">Oracle Heartbeat Threshold</span>
              <span className="font-mono text-emerald-400 font-bold">86,400 Seconds (24h)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle flex justify-between">
              <span className="text-slate-400">Fee Routing Destination</span>
              <span className="font-mono text-accent-blue font-bold">
                Treasury (0x0F51D2...13D)
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle flex justify-between">
              <span className="text-slate-400">Maximum Deposit Cap</span>
              <span className="font-mono text-slate-300">Unlimited (type(uint256).max)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
