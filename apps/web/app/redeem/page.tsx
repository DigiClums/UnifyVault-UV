'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { TransactionModal } from '../../components/modals/TransactionModal';
import { useRedeem } from '../../hooks/useRedeem';
import { useRedeemPreview } from '../../hooks/useRedeemPreview';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useIndexTokenAddress } from '../../hooks/useIndexTokenAddress';
import { useTransactionStore } from '../../store/useTransactionStore';

export default function RedeemPage() {
  const { address, isConnected } = useAccount();
  const { indexTokenAddress } = useIndexTokenAddress();
  const { navData } = usePortfolio();

  const [usdcAddress] = React.useState<`0x${string}`>('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
  const [sharesInput, setSharesInput] = React.useState<string>('10');

  const { balance: shareBalanceRaw, formattedBalance: shareBalanceFormatted } = useTokenBalance(
    indexTokenAddress,
    address,
  );

  const parsedShares = React.useMemo(() => {
    try {
      return parseUnits(sharesInput || '0', 18);
    } catch {
      return 0n;
    }
  }, [sharesInput]);

  const { previewAssets, isLoading: isPreviewLoading } = useRedeemPreview(
    usdcAddress,
    parsedShares,
  );
  const { redeem, status, errorMessage, txHash } = useRedeem(usdcAddress);
  const { openModal, setStep, setTxHash, setError } = useTransactionStore();

  const handlePercentagePreset = (percentage: number) => {
    if (!shareBalanceRaw) return;
    const selectedShares = (shareBalanceRaw * BigInt(percentage)) / 100n;
    setSharesInput(formatUnits(selectedShares, 18));
  };

  const handleRedeem = async () => {
    if (!address || parsedShares === 0n) return;

    openModal('REDEEM');
    setStep('EXECUTING');

    // Default 1% slippage & 10 minute deadline
    const minAssets = previewAssets ? (previewAssets * 99n) / 100n : 0n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

    try {
      await redeem(parsedShares, minAssets, address, deadline);
    } catch (err: any) {
      setError(err?.message || 'Redemption execution failed');
    }
  };

  React.useEffect(() => {
    if (status === 'confirmed' && txHash) {
      setTxHash(txHash);
    } else if (status === 'submitting') {
      setStep('EXECUTING');
    } else if (errorMessage) {
      setError(errorMessage);
    }
  }, [status, txHash, errorMessage, setTxHash, setStep, setError]);

  const formattedOutputUSDC = previewAssets ? (Number(previewAssets) / 1e6).toFixed(2) : '0.00';
  const grossUSD = previewAssets ? (Number(previewAssets) / 1e6 / 0.999).toFixed(2) : '0.00';
  const feeUSD = previewAssets
    ? (Number(grossUSD) - Number(formattedOutputUSDC)).toFixed(2)
    : '0.00';
  const formattedNAV = navData ? `$${(Number(navData.navPerShare) / 1e18).toFixed(4)}` : '$1.0000';

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-2xl w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-3xl border border-gray-800 bg-[#111827]/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Redeem Index Shares</h1>
              <p className="text-xs text-gray-400 mt-1">
                Burn UVBTCETH shares and receive USDC payout
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              0.1% Fee
            </span>
          </div>

          {/* Share Amount Input */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">You Redeem (Shares)</span>
              <span className="text-xs text-gray-400">
                Available:{' '}
                <span className="font-mono text-gray-200">
                  {shareBalanceFormatted || '0.0000'} UVBTCETH
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={sharesInput}
                onChange={(e) => setSharesInput(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent font-mono text-3xl font-extrabold text-white focus:outline-none"
              />
              <span className="text-sm font-bold text-gray-400 bg-gray-800 px-3 py-1.5 rounded-xl font-mono">
                UVBTCETH
              </span>
            </div>
          </div>

          {/* Percentage Presets */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentagePreset(pct)}
                className="rounded-xl border border-gray-800 bg-gray-900/40 py-2 text-xs font-bold text-gray-300 hover:border-blue-500/30 hover:bg-blue-600/10 hover:text-blue-400 transition-all"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Output Preview */}
          <div className="rounded-2xl border border-gray-800/80 bg-gray-900/40 p-4 space-y-3 mb-8">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Current NAV Per Share</span>
              <span className="font-mono font-semibold text-gray-200">{formattedNAV}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Gross Asset Valuation</span>
              <span className="font-mono text-gray-300">${grossUSD} USDC</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Protocol Redeem Fee (0.10%)</span>
              <span className="font-mono text-gray-300">${feeUSD} USDC</span>
            </div>
            <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-sm font-bold">
              <span className="text-gray-200">Expected USDC Return</span>
              <span className="font-mono text-emerald-400">${formattedOutputUSDC} USDC</span>
            </div>
          </div>

          {/* Action Button */}
          {!isConnected ? (
            <button
              disabled
              className="w-full rounded-2xl bg-gray-800 py-4 font-bold text-gray-400 cursor-not-allowed"
            >
              Please Connect Wallet
            </button>
          ) : (
            <button
              onClick={handleRedeem}
              disabled={parsedShares === 0n || status === 'submitting' || status === 'pending'}
              className="w-full rounded-2xl bg-purple-600 py-4 font-bold text-white shadow-xl shadow-purple-500/25 hover:bg-purple-500 transition-all disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              Redeem Shares for USDC
            </button>
          )}
        </div>
      </main>

      <TransactionModal />
      <Footer />
    </div>
  );
}
