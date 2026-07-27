'use client';

import React, { useState } from 'react';
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { TREASURY_ABI } from '../../../lib/contracts';
import { FALLBACK_ADDRESSES } from '../../../constants';
import { formatUSD, formatUnits, parseUnits } from '../../../lib/math';
import { StatCard } from '../../../components/ui/StatCard';
import { TableCard } from '../../../components/ui/TableCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  Vault,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function AdminTreasuryPage() {
  const { address: userAddress } = useAccount();
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [assetAddress, setAssetAddress] = useState<string>(FALLBACK_ADDRESSES.USDC);

  const { data: treasuryData, refetch } = useReadContracts({
    contracts: [
      {
        address: FALLBACK_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [FALLBACK_ADDRESSES.USDC],
      },
      {
        address: FALLBACK_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [FALLBACK_ADDRESSES.WBTC],
      },
      {
        address: FALLBACK_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'totalAssetBalance',
        args: [FALLBACK_ADDRESSES.WETH],
      },
    ],
    query: {
      refetchInterval: 5_000,
    },
  });

  const usdcBalRaw = (treasuryData?.[0]?.result as bigint) || 0n;
  const wbtcBalRaw = (treasuryData?.[1]?.result as bigint) || 0n;
  const wethBalRaw = (treasuryData?.[2]?.result as bigint) || 0n;

  const usdcUSD = Number(formatUnits(usdcBalRaw, 6));

  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();
  const { isLoading: isTxWaiting, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount || parseFloat(amount) <= 0) return;

    const decimals = assetAddress.toLowerCase() === FALLBACK_ADDRESSES.WBTC.toLowerCase() ? 8 : 6;
    const amountRaw = parseUnits(amount, decimals);

    writeContract({
      address: FALLBACK_ADDRESSES.TREASURY,
      abi: TREASURY_ABI,
      functionName: 'withdraw',
      args: [assetAddress as `0x${string}`, recipient as `0x${string}`, amountRaw],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Treasury Revenue & Releases
            </h1>
            <StatusBadge status="Admin" label="GOVERNANCE" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Safeguard protocol-owned fee reserves and execute authorized revenue withdrawals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="USDC Fee Reserves"
          value={formatUSD(usdcUSD)}
          subtitle={`${formatUnits(usdcBalRaw, 6)} USDC`}
          icon={Vault}
          glowColor="blue"
        />
        <StatCard
          title="WBTC Reserves"
          value={`${formatUnits(wbtcBalRaw, 8)} BTC`}
          subtitle="Protocol WBTC"
          icon={DollarSign}
          glowColor="emerald"
        />
        <StatCard
          title="WETH Reserves"
          value={`${formatUnits(wethBalRaw, 18)} ETH`}
          subtitle="Protocol WETH"
          icon={ShieldCheck}
          glowColor="purple"
        />
      </div>

      {/* Withdrawal Control Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 border-b border-border-subtle/40 pb-3">
            <ArrowUpRight className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Execute Revenue Release
            </h3>
          </div>

          <form onSubmit={handleWithdraw} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Select Fee Asset</label>
              <select
                value={assetAddress}
                onChange={(e) => setAssetAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value={FALLBACK_ADDRESSES.USDC}>USDC (USD Coin - 6 Decimals)</option>
                <option value={FALLBACK_ADDRESSES.WBTC}>WBTC (Wrapped BTC - 8 Decimals)</option>
                <option value={FALLBACK_ADDRESSES.WETH}>WETH (Wrapped ETH - 18 Decimals)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Recipient Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Withdraw Amount</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={isWritePending || isTxWaiting}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 font-bold text-white shadow-glow disabled:opacity-50 flex items-center justify-center space-x-2 transition-all"
            >
              {(isWritePending || isTxWaiting) && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {isWritePending
                  ? 'Confirming in Wallet...'
                  : isTxWaiting
                    ? 'Broadcasting Tx...'
                    : 'Execute Withdrawal'}
              </span>
            </button>
          </form>

          {isTxSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Revenue withdrawal executed successfully on Base Sepolia!</span>
            </div>
          )}

          {writeError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{writeError.message}</span>
            </div>
          )}
        </div>

        {/* Treasury Status Overview */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base border-b border-border-subtle/40 pb-3">
            <ShieldCheck className="w-5 h-5 text-accent-blue" />
            <span>Treasury Safeguards</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle flex justify-between">
              <span className="text-slate-400">Treasury Contract</span>
              <span className="font-mono text-accent-blue">0x0F51D2...13D</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle flex justify-between">
              <span className="text-slate-400">Withdraw Access</span>
              <span className="font-mono text-purple-400">GOVERNANCE_ROLE Only</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-border-subtle flex justify-between">
              <span className="text-slate-400">Reentrancy Protection</span>
              <span className="font-mono text-emerald-400">Active (ReentrancyGuard)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
