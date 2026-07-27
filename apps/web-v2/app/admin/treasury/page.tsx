'use client';

import React, { useState } from 'react';
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { TREASURY_ABI, ORACLE_MANAGER_ABI } from '../../../lib/contracts';
import { FALLBACK_ADDRESSES } from '../../../constants';
import { formatUSD, formatUnits, parseUnits } from '../../../lib/math';
import { StatCard } from '../../../components/ui/StatCard';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import {
  Vault,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';

export default function AdminTreasuryPage() {
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [assetAddress, setAssetAddress] = useState<string>(FALLBACK_ADDRESSES.USDC);

  const { data: treasuryData } = useReadContracts({
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
    ],
    query: {
      refetchInterval: 5_000,
    },
  });

  const usdcBalRaw = (treasuryData?.[0]?.result as bigint) || 0n;
  const wbtcBalRaw = (treasuryData?.[1]?.result as bigint) || 0n;
  const wethBalRaw = (treasuryData?.[2]?.result as bigint) || 0n;
  const btcPriceRaw = (treasuryData?.[3]?.result as bigint) || 0n;
  const ethPriceRaw = (treasuryData?.[4]?.result as bigint) || 0n;

  const usdcUSD = Number(formatUnits(usdcBalRaw, 6));
  const btcPrice = Number(formatUnits(btcPriceRaw, 18));
  const ethPrice = Number(formatUnits(ethPriceRaw, 18));

  const wbtcUSD = Number(formatUnits(wbtcBalRaw, 8)) * btcPrice;
  const wethUSD = Number(formatUnits(wethBalRaw, 18)) * ethPrice;
  const totalTreasuryValUSD = usdcUSD + wbtcUSD + wethUSD;

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

  // Task 1: Hide Raw Developer Errors
  const getFriendlyErrorMessage = (err: unknown): string => {
    if (!err) return '';
    console.error('[Developer Logs - Treasury Error]:', err);
    return 'Treasury withdrawal is currently unavailable or unauthorized by connected wallet.';
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

      {/* Task 4: Total Treasury Value Summary Card */}
      <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl shadow-xl space-y-2">
        <span className="text-xs font-semibold text-purple-400 tracking-wider uppercase">
          Total Treasury Value
        </span>
        <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
          {formatUSD(totalTreasuryValUSD)}
        </div>
        <p className="text-xs text-slate-400">
          Combined protocol-owned reserves across all supported strategy assets.
        </p>
      </div>

      {/* Asset Reserves Grid */}
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
          subtitle={`≈ ${formatUSD(wbtcUSD)}`}
          icon={DollarSign}
          glowColor="emerald"
        />
        <StatCard
          title="WETH Reserves"
          value={`${formatUnits(wethBalRaw, 18)} ETH`}
          subtitle={`≈ ${formatUSD(wethUSD)}`}
          icon={ShieldCheck}
          glowColor="purple"
        />
      </div>

      {/* Task 7 & Task 6: Withdrawal Form & Treasury Safeguards */}
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
              <label className="block text-slate-400 font-semibold mb-1">Select Fee Asset</label>
              <select
                value={assetAddress}
                onChange={(e) => setAssetAddress(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
              >
                <option value={FALLBACK_ADDRESSES.USDC}>USDC (USD Coin - 6 Decimals)</option>
                <option value={FALLBACK_ADDRESSES.WBTC}>WBTC (Wrapped BTC - 8 Decimals)</option>
                <option value={FALLBACK_ADDRESSES.WETH}>WETH (Wrapped ETH - 18 Decimals)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Recipient Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Withdraw Amount</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-border-subtle text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={isWritePending || isTxWaiting}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] font-bold text-white shadow-glow disabled:opacity-50 flex items-center justify-center space-x-2 transition-all focus:ring-2 focus:ring-purple-500/50"
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
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Revenue withdrawal executed successfully on Base Sepolia!</span>
            </div>
          )}

          {/* Task 1: Friendly User Error Message */}
          {writeError && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>{getFriendlyErrorMessage(writeError)}</span>
            </div>
          )}
        </div>

        {/* Task 6: Treasury Safeguards Polish */}
        <div className="p-6 rounded-2xl bg-surface/80 border border-border-subtle/80 backdrop-blur-xl space-y-5">
          <div className="flex items-center space-x-2 text-white font-bold text-base border-b border-border-subtle/40 pb-3">
            <ShieldCheck className="w-5 h-5 text-accent-blue" />
            <span>Treasury Safeguards</span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Treasury Contract</span>
              </div>
              <span className="font-mono text-accent-blue font-bold">0x0F51D2...13D</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Governance Restricted</span>
              </div>
              <span className="font-mono text-purple-400 font-bold">GOVERNANCE_ROLE Only</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Reentrancy Protected</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">Active (ReentrancyGuard)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">Live On-Chain</span>
              </div>
              <span className="font-mono text-slate-300 font-bold">Base Sepolia L2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
