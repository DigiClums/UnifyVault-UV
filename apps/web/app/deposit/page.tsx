'use client';

import * as React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { parseUnits, formatUnits } from 'viem';
import { TransactionModal } from '../../components/modals/TransactionModal';
import { useDeposit } from '../../hooks/useDeposit';
import { useAllowance } from '../../hooks/useAllowance';
import { useControllerAddress } from '../../hooks/useControllerAddress';
import { useDepositPreview } from '../../hooks/useDepositPreview';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useIndexTokenAddress } from '../../hooks/useIndexTokenAddress';
import { useDashboardService } from '../../hooks/useDashboardService';
import { useTransactionStore } from '../../store/useTransactionStore';
import { parseWalletError } from '../../lib/utils/formatters';
import { DepositSuccessSummaryCard } from '../../components/deposit/DepositSuccessSummaryCard';
import { DepositValidationBanner } from '../../components/deposit/DepositValidationBanner';

function getErrorMessage(error: unknown, fallback: string) {
  const parsed = parseWalletError(error);
  if (parsed && parsed !== 'An unexpected wallet error occurred. Please try again.') {
    return parsed;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return parsed || fallback;
}

export default function DepositPage() {
  const { address, isConnected, connect } = useWallet();
  const { chainId, isSupported, switchChain } = useNetwork();
  const { controllerAddress } = useControllerAddress();
  const { indexTokenAddress } = useIndexTokenAddress();
  const { data: dashboardData, refetch: refetchDashboard } = useDashboardService(15000);

  const usdcAddress = React.useMemo<`0x${string}`>(() => {
    if (chainId === 8453) return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    return '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  }, [chainId]);

  const [amountInput, setAmountInput] = React.useState<string>('');
  const [isSuccessSummaryVisible, setIsSuccessSummaryVisible] = React.useState<boolean>(false);
  const [lastTxSummary, setLastTxSummary] = React.useState<{
    deposited: string;
    fee: string;
    net: string;
    shares: string;
    hash?: `0x${string}`;
  } | null>(null);

  const slippageBps = 50; // 0.50% default

  const { balance: usdcBalanceRaw, refetch: refetchUsdc } = useTokenBalance(usdcAddress);
  const { refetch: refetchShareBalance } = useTokenBalance(indexTokenAddress);

  const usdcBalanceFormatted =
    usdcBalanceRaw !== undefined ? (Number(usdcBalanceRaw) / 1e6).toFixed(2) : '0.00';

  const parsedAmount = React.useMemo(() => {
    try {
      if (!amountInput || isNaN(Number(amountInput))) return 0n;
      return parseUnits(amountInput, 6);
    } catch {
      return 0n;
    }
  }, [amountInput]);

  const {
    allowance,
    approve,
    isApproving,
    refetch: refetchAllowance,
  } = useAllowance(usdcAddress, controllerAddress);

  const {
    quote: depositQuote,
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
  } = useDepositPreview(usdcAddress, amountInput, 6);

  const { deposit, status, errorMessage, txHash } = useDeposit(usdcAddress);
  const { openModal, setStep, setTxHash, setError, reset: resetTxStore } = useTransactionStore();

  const isPaused = dashboardData?.HealthStatus?.isPaused ?? false;

  // Validation Rules Engine
  const validationError = React.useMemo(() => {
    if (isPaused) {
      return {
        type: 'PAUSED' as const,
        message: 'Deposits are currently paused by Protocol Emergency Governance.',
      };
    }
    if (parsedAmount > 0n && usdcBalanceRaw !== undefined && parsedAmount > usdcBalanceRaw) {
      return {
        type: 'INSUFFICIENT_BALANCE' as const,
        message: `Insufficient USDC balance. You hold ${usdcBalanceFormatted} USDC.`,
      };
    }
    return null;
  }, [isPaused, parsedAmount, usdcBalanceRaw, usdcBalanceFormatted]);

  const needsApproval = React.useMemo(() => {
    const isApprovalNeeded =
      allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;
    return isApprovalNeeded;
  }, [allowance, parsedAmount]);

  const handlePresetClick = (pct: number) => {
    if (!usdcBalanceRaw) return;
    const fraction = (usdcBalanceRaw * BigInt(pct)) / 100n;
    setAmountInput(formatUnits(fraction, 6));
  };

  const handleAction = async () => {
    if (!address || parsedAmount === 0n || validationError) return;

    const minShares = depositQuote
      ? (depositQuote.sharesPreview * BigInt(10000 - slippageBps)) / 10000n
      : 0n;

    if (needsApproval) {
      openModal('APPROVE');
      setStep('APPROVING');
      try {
        await approve(parsedAmount);
        await refetchAllowance();
      } catch (error) {
        setError(getErrorMessage(error, 'Approval failed'));
      }
    } else {
      openModal('DEPOSIT');
      setStep('EXECUTING');

      try {
        await deposit(parsedAmount, minShares, address);
      } catch (error) {
        setError(getErrorMessage(error, 'Deposit execution failed'));
      }
    }
  };

  React.useEffect(() => {
    if (errorMessage) {
      openModal('DEPOSIT');
      setError(errorMessage);
    } else if (status === 'confirmed') {
      openModal('DEPOSIT');
      if (txHash) setTxHash(txHash);
      setStep('CONFIRMED');

      if (!isSuccessSummaryVisible) {
        const feeFormatted = depositQuote
          ? (Number(depositQuote.protocolFee) / 1e6).toFixed(2)
          : '0.00';
        const netFormatted = depositQuote
          ? (Number(depositQuote.netDeposit) / 1e6).toFixed(2)
          : '0.00';
        const sharesFormatted = depositQuote
          ? (Number(depositQuote.sharesPreview) / 1e18).toFixed(4)
          : '0.0000';

        setLastTxSummary({
          deposited: amountInput,
          fee: feeFormatted,
          net: netFormatted,
          shares: sharesFormatted,
          hash: txHash,
        });

        setIsSuccessSummaryVisible(true);

        void refetchUsdc?.();
        void refetchAllowance?.();
        void refetchPreview?.();
        void refetchShareBalance?.();
        void refetchDashboard?.();
      }
    } else if (status === 'pending' || status === 'submitting') {
      openModal('DEPOSIT');
      setStep('EXECUTING');
    }
  }, [
    status,
    txHash,
    errorMessage,
    openModal,
    setStep,
    setTxHash,
    setError,
    refetchUsdc,
    refetchAllowance,
    refetchPreview,
    refetchShareBalance,
    refetchDashboard,
    amountInput,
    depositQuote,
    isSuccessSummaryVisible,
  ]);

  const handleResetForm = () => {
    setAmountInput('');
    setIsSuccessSummaryVisible(false);
    setLastTxSummary(null);
    resetTxStore();
  };

  const navPerShareNum = dashboardData?.NAV?.navUsdNumber || 1.0;
  const amountNum = Number(parsedAmount) / 1e6;
  const estFee = amountNum * 0.0025; // 0.25% fee
  const estNet = amountNum - estFee;
  const estShares = estNet / navPerShareNum;

  const formattedDepositAmount = amountInput ? Number(amountInput).toFixed(2) : '0.00';

  const formattedFee = depositQuote
    ? (Number(depositQuote.protocolFee) / 1e6).toFixed(2)
    : parsedAmount > 0n
      ? estFee.toFixed(2)
      : '0.00';

  const formattedNet = depositQuote
    ? (Number(depositQuote.netDeposit) / 1e6).toFixed(2)
    : parsedAmount > 0n
      ? estNet.toFixed(2)
      : '0.00';

  const formattedShares = depositQuote
    ? (Number(depositQuote.sharesPreview) / 1e18).toFixed(4)
    : parsedAmount > 0n
      ? estShares.toFixed(4)
      : '0.0000';

  const formattedNAV = dashboardData?.NAV?.formattedNavPerShare || '$1.0000';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {isSuccessSummaryVisible && lastTxSummary ? (
          <DepositSuccessSummaryCard
            depositedAmount={lastTxSummary.deposited}
            feePaid={lastTxSummary.fee}
            netInvested={lastTxSummary.net}
            sharesReceived={lastTxSummary.shares}
            txHash={lastTxSummary.hash}
            onReset={handleResetForm}
          />
        ) : (
          <div className="rounded-3xl border border-border bg-card/90 dark:bg-[#111827]/80 p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                  Deposit Collateral
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Mint UVBTCETH index shares using USDC collateral
                </p>
              </div>
              <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">
                0.25% Protocol Fee
              </span>
            </div>

            {/* Amount Input */}
            <div className="rounded-2xl border border-border bg-muted/40 dark:bg-gray-900/60 p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  You Pay (Collateral)
                </span>
                <span className="text-xs text-muted-foreground">
                  Available:{' '}
                  <span className="font-mono text-foreground font-semibold">
                    {usdcBalanceFormatted || '0.00'} USDC
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  aria-label="deposit amount input"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.0"
                  disabled={isPaused}
                  className="w-full bg-transparent font-mono text-2xl sm:text-3xl font-extrabold text-foreground focus:outline-none min-h-[44px] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-2"
                />
                <button
                  onClick={() =>
                    setAmountInput(
                      usdcBalanceRaw ? formatUnits(usdcBalanceRaw, 6) : usdcBalanceFormatted || '0',
                    )
                  }
                  disabled={isPaused}
                  aria-label="Max"
                  className="rounded-lg bg-primary/10 border border-primary/20 px-3.5 py-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs font-bold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Preset Percentage Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handlePresetClick(pct)}
                  disabled={isPaused}
                  className="rounded-xl border border-border bg-secondary/80 hover:bg-accent py-2.5 min-h-[44px] flex items-center justify-center text-xs font-bold text-foreground hover:border-primary/30 transition-all font-mono disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Inline Validation Banner */}
            {validationError && (
              <DepositValidationBanner
                type={validationError.type}
                message={validationError.message}
              />
            )}

            {/* Live Yield & Execution Breakdown */}
            <div className="rounded-2xl border border-border bg-muted/30 dark:bg-gray-900/40 p-4 space-y-3 mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-semibold">
                  Live Yield & Execution Quote
                </span>
                {isLoadingPreview && (
                  <span className="text-[10px] font-mono text-primary animate-pulse">
                    Calculating quote...
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Deposit Amount</span>
                <span className="font-mono text-foreground">
                  {isLoadingPreview ? '...' : `$${formattedDepositAmount} USDC`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Protocol Deposit Fee (0.25%)</span>
                <span className="font-mono text-foreground">
                  {isLoadingPreview ? '...' : `$${formattedFee} USDC`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Net Collateral Allocated</span>
                <span className="font-mono text-foreground">
                  {isLoadingPreview ? '...' : `$${formattedNet} USDC`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Estimated Index NAV</span>
                <span className="font-mono font-semibold text-foreground">{formattedNAV}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Slippage Protection</span>
                <span className="font-mono text-muted-foreground">0.50% (50 BPS)</span>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-bold">
                <span className="text-foreground">Shares to Receive (UVBTCETH)</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  {isLoadingPreview ? '...' : formattedShares}
                </span>
              </div>
            </div>

            {/* Action Trigger Button */}
            {!isConnected ? (
              <div className="text-center py-4">
                <h2 className="text-lg font-bold mb-2 text-foreground">
                  Wallet Connection Required
                </h2>
                <button
                  onClick={() => connect?.()}
                  className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground shadow-xl hover:bg-primary/90 transition-all"
                  aria-label="Connect Wallet"
                >
                  Connect Wallet
                </button>
              </div>
            ) : !isSupported ? (
              <div className="text-center py-4">
                <h2 className="text-lg font-bold mb-2 text-foreground">Unsupported Network</h2>
                <button
                  onClick={() => switchChain?.()}
                  className="w-full rounded-2xl bg-amber-600 py-4 font-bold text-white shadow-xl hover:bg-amber-500 transition-all"
                  aria-label="Switch to Base Sepolia"
                >
                  Switch to Base Sepolia
                </button>
              </div>
            ) : (
              <button
                onClick={handleAction}
                disabled={
                  parsedAmount === 0n ||
                  isApproving ||
                  status === 'submitting' ||
                  status === 'pending' ||
                  Boolean(validationError)
                }
                className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground shadow-xl shadow-primary/25 hover:bg-primary/90 transition-all disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed font-semibold focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={needsApproval ? 'Approve Spend Limit for USDC' : 'Deposit USDC'}
              >
                {isApproving
                  ? 'Approving USDC...'
                  : status === 'submitting' || status === 'pending'
                    ? 'Processing Deposit...'
                    : needsApproval
                      ? 'Approve Spend Limit for USDC'
                      : 'Deposit USDC'}
              </button>
            )}
          </div>
        )}
      </main>

      <TransactionModal />
    </div>
  );
}
