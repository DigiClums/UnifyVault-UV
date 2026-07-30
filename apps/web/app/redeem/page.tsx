'use client';

import * as React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { parseUnits, formatUnits } from 'viem';
import { TransactionModal } from '../../components/modals/TransactionModal';
import { useRedeem } from '../../hooks/useRedeem';
import { useRedeemPreview } from '../../hooks/useRedeemPreview';
import { useAllowance } from '../../hooks/useAllowance';
import { useControllerAddress } from '../../hooks/useControllerAddress';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useIndexTokenAddress } from '../../hooks/useIndexTokenAddress';
import { useDashboardService } from '../../hooks/useDashboardService';
import { useTransactionStore } from '../../store/useTransactionStore';
import { parseWalletError } from '../../lib/utils/formatters';
import { RedeemSuccessSummaryCard } from '../../components/redeem/RedeemSuccessSummaryCard';
import { DepositValidationBanner } from '../../components/deposit/DepositValidationBanner';
import { getTokenAddress, getDefaultChainId } from '../../lib/config/network';

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

export default function RedeemPage() {
  const { address, isConnected, connect } = useWallet();
  const { chainId, isSupported, switchChain } = useNetwork();
  const { controllerAddress } = useControllerAddress();
  const { indexTokenAddress } = useIndexTokenAddress();
  const { data: dashboardData, refetch: refetchDashboard } = useDashboardService(15000);

  const usdcAddress = React.useMemo<`0x${string}`>(() => {
    return getTokenAddress(chainId || getDefaultChainId(), 'USDC');
  }, [chainId]);

  const [sharesInput, setSharesInput] = React.useState<string>('');
  const [isSuccessSummaryVisible, setIsSuccessSummaryVisible] = React.useState<boolean>(false);
  const [lastTxSummary, setLastTxSummary] = React.useState<{
    shares: string;
    gross: string;
    fee: string;
    net: string;
    hash?: `0x${string}`;
  } | null>(null);

  const slippageBps = 50; // 0.50% default

  const { balance: shareBalanceRaw, refetch: refetchShareBalance } =
    useTokenBalance(indexTokenAddress);
  const { refetch: refetchUsdc } = useTokenBalance(usdcAddress);

  const shareBalanceFormatted =
    shareBalanceRaw !== undefined
      ? shareBalanceRaw === 0n
        ? '0.0000'
        : (Number(shareBalanceRaw) / 1e18).toFixed(4)
      : '0.0000';

  const parsedShares = React.useMemo(() => {
    try {
      if (!sharesInput || isNaN(Number(sharesInput))) return 0n;
      return parseUnits(sharesInput, 18);
    } catch {
      return 0n;
    }
  }, [sharesInput]);

  const {
    allowance,
    approve,
    isApproving,
    refetch: refetchAllowance,
  } = useAllowance(indexTokenAddress, controllerAddress);

  const {
    previewAssets,
    grossAssets,
    protocolFee,
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
  } = useRedeemPreview(usdcAddress, sharesInput);

  const { redeem, status, errorMessage, txHash } = useRedeem(usdcAddress);
  const { openModal, setStep, setTxHash, setError, reset: resetTxStore } = useTransactionStore();

  const isPaused = dashboardData?.HealthStatus?.isPaused ?? false;

  // Validation Rules Engine
  const validationError = React.useMemo(() => {
    if (isPaused) {
      return {
        type: 'PAUSED' as const,
        message: 'Redemptions are currently paused by Protocol Emergency Governance.',
      };
    }
    if (parsedShares > 0n && shareBalanceRaw !== undefined && parsedShares > shareBalanceRaw) {
      return {
        type: 'INSUFFICIENT_BALANCE' as const,
        message: `Insufficient UVBTCETH share balance. You hold ${shareBalanceFormatted} shares.`,
      };
    }
    return null;
  }, [isPaused, parsedShares, shareBalanceRaw, shareBalanceFormatted]);

  const needsApproval = React.useMemo(() => {
    const isApprovalNeeded =
      allowance !== undefined && parsedShares > 0n && allowance < parsedShares;
    return isApprovalNeeded;
  }, [allowance, parsedShares]);

  const handlePercentagePreset = (percentage: number) => {
    if (!shareBalanceRaw) return;
    const selectedShares = (shareBalanceRaw * BigInt(percentage)) / 100n;
    setSharesInput(formatUnits(selectedShares, 18));
  };

  const handleAction = async () => {
    if (!address || parsedShares === 0n || validationError) return;

    const minAssets = previewAssets ? (previewAssets * BigInt(10000 - slippageBps)) / 10000n : 0n;

    if (needsApproval) {
      openModal('APPROVE');
      setStep('APPROVING');
      try {
        await approve(parsedShares);
        await refetchAllowance();
      } catch (error) {
        setError(getErrorMessage(error, 'Approval failed'));
      }
    } else {
      openModal('REDEEM');
      setStep('EXECUTING');

      try {
        await redeem(parsedShares, minAssets);
      } catch (error) {
        setError(getErrorMessage(error, 'Redemption execution failed'));
      }
    }
  };

  React.useEffect(() => {
    if (errorMessage) {
      openModal('REDEEM');
      setError(errorMessage);
    } else if (status === 'confirmed') {
      openModal('REDEEM');
      if (txHash) setTxHash(txHash);
      setStep('CONFIRMED');

      if (!isSuccessSummaryVisible) {
        const netFormatted = previewAssets ? (Number(previewAssets) / 1e6).toFixed(2) : '0.00';
        const grossFormatted = grossAssets ? (Number(grossAssets) / 1e6).toFixed(2) : netFormatted;
        const feeFormatted = protocolFee ? (Number(protocolFee) / 1e6).toFixed(2) : '0.00';

        setLastTxSummary({
          shares: sharesInput,
          gross: grossFormatted,
          fee: feeFormatted,
          net: netFormatted,
          hash: txHash,
        });

        setIsSuccessSummaryVisible(true);

        void refetchShareBalance?.();
        void refetchUsdc?.();
        void refetchAllowance?.();
        void refetchPreview?.();
        void refetchDashboard?.();
      }
    } else if (status === 'pending' || status === 'submitting') {
      openModal('REDEEM');
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
    refetchShareBalance,
    refetchUsdc,
    refetchAllowance,
    refetchPreview,
    refetchDashboard,
    sharesInput,
    previewAssets,
    grossAssets,
    protocolFee,
    isSuccessSummaryVisible,
  ]);

  const handleResetForm = () => {
    setSharesInput('');
    setIsSuccessSummaryVisible(false);
    setLastTxSummary(null);
    resetTxStore();
  };

  const navPerShareNum = dashboardData?.NAV?.navUsdNumber || 1.0;
  const sharesNum = Number(parsedShares) / 1e18;
  const estGross = sharesNum * navPerShareNum;
  const estFee = estGross * 0.0025; // 0.25% fee
  const estNet = estGross - estFee;

  const formattedOutputUSDC = previewAssets
    ? (Number(previewAssets) / 1e6).toFixed(2)
    : parsedShares > 0n
      ? estNet.toFixed(2)
      : '0.00';

  const grossUSD = grossAssets
    ? (Number(grossAssets) / 1e6).toFixed(2)
    : parsedShares > 0n
      ? estGross.toFixed(2)
      : '0.00';

  const feeUSD = protocolFee
    ? (Number(protocolFee) / 1e6).toFixed(2)
    : parsedShares > 0n
      ? estFee.toFixed(2)
      : '0.00';

  const formattedNAV = dashboardData?.NAV?.formattedNavPerShare || '$1.0000';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {isSuccessSummaryVisible && lastTxSummary ? (
          <RedeemSuccessSummaryCard
            sharesRedeemed={lastTxSummary.shares}
            grossAssets={lastTxSummary.gross}
            feePaid={lastTxSummary.fee}
            netReceived={lastTxSummary.net}
            txHash={lastTxSummary.hash}
            onReset={handleResetForm}
          />
        ) : (
          <div className="rounded-3xl border border-border bg-card/90 dark:bg-[#111827]/80 p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                  Redeem Vault Shares
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Burn UVBTCETH index shares to withdraw USDC collateral with live on-chain fee
                  breakdown
                </p>
              </div>
              <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono">
                v2.2.0 Engine
              </span>
            </div>

            {/* Share Amount Input */}
            <div className="rounded-2xl border border-border bg-muted/40 dark:bg-gray-900/60 p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  You Redeem (Shares)
                </span>
                <span className="text-xs text-muted-foreground">
                  Available:{' '}
                  <span className="font-mono text-foreground font-semibold">
                    {shareBalanceFormatted} UVBTCETH
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  aria-label="redeem shares amount input"
                  value={sharesInput}
                  onChange={(e) => setSharesInput(e.target.value)}
                  placeholder="0.0"
                  disabled={isPaused}
                  className="w-full bg-transparent font-mono text-2xl sm:text-3xl font-extrabold text-foreground focus:outline-none min-h-[44px] disabled:opacity-50"
                />
                <button
                  onClick={() =>
                    setSharesInput(
                      shareBalanceRaw
                        ? formatUnits(shareBalanceRaw, 18)
                        : shareBalanceFormatted || '0',
                    )
                  }
                  disabled={isPaused}
                  aria-label="Max"
                  className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-3.5 py-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors font-mono disabled:opacity-50"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Inline Validation Banner */}
            {validationError && (
              <DepositValidationBanner
                type={validationError.type}
                message={validationError.message}
              />
            )}

            {/* Percentage Presets */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handlePercentagePreset(pct)}
                  disabled={isPaused}
                  className="rounded-xl border border-border bg-secondary/80 hover:bg-accent py-2.5 min-h-[44px] flex items-center justify-center text-xs font-bold text-foreground hover:border-primary/30 transition-all font-mono disabled:opacity-50"
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Output Preview */}
            <div className="rounded-2xl border border-border bg-muted/30 dark:bg-gray-900/40 p-4 space-y-3 mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-semibold">
                  Live Redemption & Execution Preview
                </span>
                {isLoadingPreview && (
                  <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 animate-pulse">
                    Calculating payout...
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Current NAV Per Share</span>
                <span className="font-mono font-semibold text-foreground">{formattedNAV}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Gross Asset Valuation</span>
                <span className="font-mono text-foreground">
                  {isLoadingPreview ? '...' : `$${grossUSD} USDC`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Protocol Redeem Fee (2.00%)</span>
                <span className="font-mono text-foreground">
                  {isLoadingPreview ? '...' : `$${feeUSD} USDC`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Slippage Protection</span>
                <span className="font-mono text-muted-foreground">0.50% (50 BPS)</span>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-bold">
                <span className="text-foreground">Expected USDC Return</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  {isLoadingPreview ? '...' : `$${formattedOutputUSDC} USDC`}
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
                  className="w-full rounded-2xl bg-purple-600 py-4 font-bold text-white shadow-xl hover:bg-purple-500 transition-all"
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
                  parsedShares === 0n ||
                  isApproving ||
                  status === 'submitting' ||
                  status === 'pending' ||
                  Boolean(validationError)
                }
                className="w-full rounded-2xl bg-purple-600 py-4 font-bold text-white shadow-xl shadow-purple-500/25 hover:bg-purple-500 transition-all disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed font-semibold"
                aria-label={needsApproval ? 'Approve Spend Limit for UVBTCETH' : 'Redeem for USDC'}
              >
                {isApproving
                  ? 'Approving UVBTCETH...'
                  : status === 'submitting' || status === 'pending'
                    ? 'Processing Redemption...'
                    : needsApproval
                      ? 'Approve Spend Limit for UVBTCETH'
                      : 'Redeem for USDC'}
              </button>
            )}
          </div>
        )}
      </main>

      <TransactionModal />
    </div>
  );
}
