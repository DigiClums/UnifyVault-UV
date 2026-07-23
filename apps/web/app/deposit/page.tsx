'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { TransactionModal } from '../../components/modals/TransactionModal';
import { useDeposit } from '../../hooks/useDeposit';
import { useAllowance } from '../../hooks/useAllowance';
import { useControllerAddress } from '../../hooks/useControllerAddress';
import { useDepositPreview } from '../../hooks/useDepositPreview';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useTransactionStore } from '../../store/useTransactionStore';

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const { controllerAddress } = useControllerAddress();
  const { navData } = usePortfolio();

  const [usdcAddress, setUsdcAddress] = React.useState<`0x${string}`>(
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  );
  const [amountInput, setAmountInput] = React.useState<string>('1000');
  const [slippageBps, setSlippageBps] = React.useState<number>(50); // 0.5% default

  const { balance: usdcBalanceRaw, formattedBalance: usdcBalanceFormatted } = useTokenBalance(
    usdcAddress,
    address,
  );

  const parsedAmount = React.useMemo(() => {
    try {
      return parseUnits(amountInput || '0', 6);
    } catch {
      return 0n;
    }
  }, [amountInput]);

  const { allowance, approve, isApproving } = useAllowance(usdcAddress, controllerAddress);
  const { depositQuote, isLoading: isQuoteLoading } = useDepositPreview(usdcAddress, parsedAmount);
  const { deposit, status, errorMessage, txHash } = useDeposit(usdcAddress);
  const { openModal, setStep, setTxHash, setError } = useTransactionStore();

  const needsApproval = React.useMemo(() => {
    return allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;
  }, [allowance, parsedAmount]);

  const handleAction = async () => {
    if (!address || parsedAmount === 0n) return;

    if (needsApproval) {
      openModal('APPROVE');
      setStep('APPROVING');
      try {
        await approve(parsedAmount);
        setStep('CONFIRMED');
      } catch (err: any) {
        setError(err?.message || 'Approval failed');
      }
    } else {
      openModal('DEPOSIT');
      setStep('EXECUTING');
      const minShares = depositQuote
        ? (depositQuote.sharesPreview * BigInt(10000 - slippageBps)) / 10000n
        : 0n;

      try {
        await deposit(parsedAmount, minShares, address);
      } catch (err: any) {
        setError(err?.message || 'Deposit execution failed');
      }
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

  const formattedFee = depositQuote ? (Number(depositQuote.protocolFee) / 1e6).toFixed(2) : '0.00';
  const formattedNet = depositQuote ? (Number(depositQuote.netDeposit) / 1e6).toFixed(2) : '0.00';
  const formattedShares = depositQuote
    ? (Number(depositQuote.sharesPreview) / 1e18).toFixed(4)
    : '0.0000';
  const formattedNAV = navData ? `$${(Number(navData.navPerShare) / 1e18).toFixed(4)}` : '$1.0000';

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-2xl w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-3xl border border-gray-800 bg-[#111827]/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Deposit Collateral</h1>
              <p className="text-xs text-gray-400 mt-1">
                Mint UVBTCETH index shares using USDC collateral
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              0.1% Fee
            </span>
          </div>

          {/* Amount Input */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-medium">You Pay (Collateral)</span>
              <span className="text-xs text-gray-400">
                Available:{' '}
                <span className="font-mono text-gray-200">
                  {usdcBalanceFormatted || '0.00'} USDC
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent font-mono text-3xl font-extrabold text-white focus:outline-none"
              />
              <button
                onClick={() => usdcBalanceFormatted && setAmountInput(usdcBalanceFormatted)}
                className="rounded-lg bg-blue-600/10 border border-blue-500/20 px-3 py-1 text-xs font-bold text-blue-400 hover:bg-blue-600/20 transition-colors"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Slippage Settings */}
          <div className="mb-6 flex items-center justify-between rounded-xl bg-gray-900/40 p-3 border border-gray-800/80">
            <span className="text-xs text-gray-400 font-medium">Slippage Tolerance</span>
            <div className="flex items-center gap-2">
              {[10, 50, 100].map((bps) => (
                <button
                  key={bps}
                  onClick={() => setSlippageBps(bps)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    slippageBps === bps
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {bps / 100}%
                </button>
              ))}
            </div>
          </div>

          {/* Quote Breakdown */}
          <div className="rounded-2xl border border-gray-800/80 bg-gray-900/40 p-4 space-y-3 mb-8">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Current NAV Per Share</span>
              <span className="font-mono font-semibold text-gray-200">{formattedNAV}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Protocol Deposit Fee (0.10%)</span>
              <span className="font-mono text-gray-300">${formattedFee} USDC</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Net Collateral Allocated</span>
              <span className="font-mono text-gray-300">${formattedNet} USDC</span>
            </div>
            <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-sm font-bold">
              <span className="text-gray-200">Expected Shares (UVBTCETH)</span>
              <span className="font-mono text-emerald-400">{formattedShares}</span>
            </div>
          </div>

          {/* Action Trigger Button */}
          {!isConnected ? (
            <button
              disabled
              className="w-full rounded-2xl bg-gray-800 py-4 font-bold text-gray-400 cursor-not-allowed"
            >
              Please Connect Wallet
            </button>
          ) : (
            <button
              onClick={handleAction}
              disabled={
                parsedAmount === 0n ||
                isApproving ||
                status === 'submitting' ||
                status === 'pending'
              }
              className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-xl shadow-blue-500/25 hover:bg-blue-500 transition-all disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {needsApproval ? '1. Approve USDC Collateral' : 'Deposit & Mint Shares'}
            </button>
          )}
        </div>
      </main>

      <TransactionModal />
      <Footer />
    </div>
  );
}
