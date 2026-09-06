'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Info,
  ExternalLink,
  Sparkles,
  Wallet,
  Users,
  TrendingUp,
  Percent,
  Coins,
} from 'lucide-react';
import { formatUnits, parseUnits, isAddress, type Address } from 'viem';
import {
  useStaking,
  MIN_STAKE_AMOUNT,
  MAX_STAKE_AMOUNT,
  ADMIN_FEE_BPS,
  BPS_DENOMINATOR,
} from '../../hooks/useStaking';
import { TransactionStatusModal } from '../common/TransactionStatusModal';

export function StakeActionForm() {
  const { isConnected } = useAccount();
  const {
    uvbeBalance,
    uvbeAllowance,
    boundReferrer,
    hasGenesisReferrer,
    genesisReferrer,
    dynamicApy,
    stake,
    approveUVBE,
    txManager,
  } = useStaking();

  const [stakeAmountStr, setStakeAmountStr] = useState<string>('100');
  const [referrerInput, setReferrerInput] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Check URL query parameters for ?ref=0x... or fallback to cached referrer in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref');
      if (refParam && isAddress(refParam)) {
        setReferrerInput(refParam);
        try {
          localStorage.setItem('uv_cached_referrer', refParam);
        } catch {}
      } else {
        const cached = localStorage.getItem('uv_cached_referrer');
        if (cached && isAddress(cached)) {
          setReferrerInput(cached);
        }
      }
    }
  }, []);

  // Parse amount in bigint
  const parsedAmount = useMemo(() => {
    try {
      if (!stakeAmountStr || isNaN(Number(stakeAmountStr)) || Number(stakeAmountStr) <= 0) {
        return 0n;
      }
      return parseUnits(stakeAmountStr, 18);
    } catch {
      return 0n;
    }
  }, [stakeAmountStr]);

  // Economic Model Calculations
  const feeAmount = useMemo(() => {
    return (parsedAmount * ADMIN_FEE_BPS) / BPS_DENOMINATOR; // 5% fee
  }, [parsedAmount]);

  const protocolCapitalAmount = useMemo(() => {
    return parsedAmount >= feeAmount ? parsedAmount - feeAmount : 0n; // 95% net
  }, [parsedAmount, feeAmount]);

  const estimatedAnnualYield = useMemo(() => {
    const capitalNum = Number(formatUnits(protocolCapitalAmount, 18));
    return (capitalNum * dynamicApy) / 100;
  }, [protocolCapitalAmount, dynamicApy]);

  // Validation logic
  const isBelowMin = parsedAmount > 0n && parsedAmount < MIN_STAKE_AMOUNT;
  const isExceedingMax = parsedAmount > MAX_STAKE_AMOUNT;
  const isExceedingBalance = parsedAmount > uvbeBalance;
  const needsApproval = parsedAmount > uvbeAllowance;

  const isValidReferrer = useMemo(() => {
    if (!referrerInput) return true; // Will fallback to genesis
    return isAddress(referrerInput);
  }, [referrerInput]);

  const canStake =
    isConnected &&
    parsedAmount >= MIN_STAKE_AMOUNT &&
    !isExceedingMax &&
    !isExceedingBalance &&
    isValidReferrer &&
    !txManager.progressState.state.includes('PENDING');

  const effectiveReferrer = hasGenesisReferrer
    ? boundReferrer
    : referrerInput && isAddress(referrerInput)
      ? referrerInput
      : genesisReferrer;

  const handleMaxClick = () => {
    const balFormatted = formatUnits(uvbeBalance, 18);
    setStakeAmountStr(balFormatted);
  };

  const handleQuickAmount = (amt: string) => {
    setStakeAmountStr(amt);
  };

  const handleStake = async () => {
    if (!canStake) return;
    setIsModalOpen(true);
    try {
      await stake(parsedAmount, effectiveReferrer);
    } catch (e) {
      console.error('Stake execution failed:', e);
    }
  };

  const handleApprove = async () => {
    if (parsedAmount < MIN_STAKE_AMOUNT) return;
    setIsModalOpen(true);
    try {
      await approveUVBE(parsedAmount);
    } catch (e) {
      console.error('Approval failed:', e);
    }
  };

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-black dark:border-white/15 p-5 sm:p-6 shadow-[6px_6px_0_#BFFF00] flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                <Lock className="w-4 h-4 text-black dark:text-[#BFFF00]" />
                Stake UVBE
              </h2>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                Min Stake
              </span>
              <div className="text-xs font-mono font-black text-slate-900 dark:text-white">
                50.0 UVBE
              </div>
            </div>
          </div>

          {/* Input Card */}
          <div className="space-y-3.5">
            {/* Stake Amount */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-black dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Stake Amount</span>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Bal: {Number(formatUnits(uvbeBalance, 18)).toFixed(4)} UVBE</span>
                  <button
                    type="button"
                    onClick={handleMaxClick}
                    className="px-1.5 py-0.5 rounded bg-black dark:bg-white/10 text-[#BFFF00] font-bold text-[10px] hover:scale-105 transition-transform"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="100000"
                  step="any"
                  value={stakeAmountStr}
                  onChange={(e) => setStakeAmountStr(e.target.value)}
                  placeholder="100"
                  className="w-full bg-transparent text-xl sm:text-2xl font-black font-mono text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none"
                />
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black text-[#BFFF00] font-black font-mono text-xs shrink-0 shadow-[2px_2px_0_#000]">
                  UVBE
                </div>
              </div>

              {/* Quick buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                {['50', '100', '250', '500', '1000', '5000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                      stakeAmountStr === amt
                        ? 'bg-[#BFFF00] text-black border-black font-black'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-black'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Economic Model Breakdown Card */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-black dark:text-[#BFFF00]" />
                  Economic Breakdown (5% / 95%)
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {dynamicApy}% Current APY
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-[11px] divide-y divide-slate-200 dark:divide-white/5">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600 dark:text-slate-400 font-sans">Gross Stake:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {Number(formatUnits(parsedAmount, 18)).toFixed(2)} UVBE
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-slate-600 dark:text-slate-400">
                  <span className="font-sans flex items-center gap-1">Treasury Fee (5.00%):</span>
                  <span>{Number(formatUnits(feeAmount, 18)).toFixed(4)} UVBE</span>
                </div>

                <div className="flex items-center justify-between pt-1 text-slate-900 dark:text-white font-bold">
                  <span className="font-sans flex items-center gap-1 text-slate-700 dark:text-slate-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Protocol-Owned Capital (95.00%):
                  </span>
                  <span className="text-emerald-600 dark:text-[#BFFF00]">
                    {Number(formatUnits(protocolCapitalAmount, 18)).toFixed(4)} UVBE
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-slate-500 text-[10px]">
                  <span className="font-sans">Est. Annual Return (Dynamic):</span>
                  <span>~{estimatedAnnualYield.toFixed(2)} UVBE/yr</span>
                </div>
              </div>
            </div>

            {/* Referrer Address Input */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-black dark:border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Referrer Address (Upline)
                </span>
                {hasGenesisReferrer ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Bound On-Chain
                  </span>
                ) : referrerInput && isAddress(referrerInput) ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-[#BFFF00] bg-[#BFFF00]/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    <Sparkles className="w-3 h-3" /> Verified Invite Link
                  </span>
                ) : null}
              </div>

              {hasGenesisReferrer ? (
                <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 truncate bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <span>{boundReferrer}</span>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={referrerInput}
                    onChange={(e) => setReferrerInput(e.target.value)}
                    placeholder={`Genesis Root: ${genesisReferrer.slice(0, 8)}...${genesisReferrer.slice(-6)}`}
                    className={`w-full bg-transparent text-xs font-mono font-bold text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none border-b pb-1 ${
                      referrerInput && isAddress(referrerInput)
                        ? 'border-emerald-500 text-emerald-600 dark:text-[#BFFF00]'
                        : 'border-dashed border-slate-300 dark:border-white/20'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    {referrerInput && isAddress(referrerInput)
                      ? '✓ You are joining under this verified upline. It will be permanently bound on your first stake.'
                      : 'Optional. Defaults to Genesis Root Referrer if empty.'}
                  </p>
                </div>
              )}
            </div>

            {/* Validation Warnings */}
            {isBelowMin && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Minimum stake is 50.0 UVBE.</span>
              </div>
            )}

            {isExceedingMax && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Maximum stake per transaction is 100,000 UVBE.</span>
              </div>
            )}

            {isExceedingBalance && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Insufficient UVBE balance. Mint or transfer tokens first.</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4">
          {!isConnected ? (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="w-full py-3.5 rounded-xl bg-[#BFFF00] text-black font-black text-sm uppercase tracking-wider border-2 border-black shadow-[4px_4px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#000] transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Connect Wallet to Stake
                </button>
              )}
            </ConnectButton.Custom>
          ) : needsApproval && parsedAmount >= MIN_STAKE_AMOUNT ? (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleApprove}
                disabled={isExceedingBalance || txManager.progressState.state.includes('PENDING')}
                className="w-full py-3.5 rounded-xl bg-black text-[#BFFF00] dark:bg-[#BFFF00] dark:text-black font-black text-sm uppercase tracking-wider border-2 border-black shadow-[4px_4px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Step 1: Approve {stakeAmountStr} UVBE
              </button>
              <p className="text-[10px] text-center text-slate-500">
                1-time approval required before staking into vault.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStake}
              disabled={!canStake}
              className="w-full py-3.5 rounded-xl bg-[#BFFF00] text-black font-black text-sm uppercase tracking-wider border-2 border-black shadow-[4px_4px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Confirm & Stake {stakeAmountStr} UVBE
            </button>
          )}
        </div>
      </div>

      {/* Transaction Progress Modal */}
      <TransactionStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        progressState={txManager.progressState}
        onRetry={txManager.retryLastTransaction}
        onCancel={() => setIsModalOpen(false)}
        title="Staking Transaction"
      />
    </>
  );
}
