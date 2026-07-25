'use client';

import * as React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { parseUnits, formatUnits } from 'viem';
import { TransactionModal } from '../../components/modals/TransactionModal';
import { useRedeem } from '../../hooks/useRedeem';
import { useRedeemPreview } from '../../hooks/useRedeemPreview';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useIndexTokenAddress } from '../../hooks/useIndexTokenAddress';
import { useTransactionStore } from '../../store/useTransactionStore';

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error;
    if (typeof message === 'string') return message;
  }

  return fallback;
}

export default function RedeemPage() {
  const { address, isConnected, connect } = useWallet();
  const { chainId, isSupported, switchChain } = useNetwork();
  const { indexTokenAddress } = useIndexTokenAddress();
  const { portfolio, navData } = usePortfolio();

  const usdcAddress = React.useMemo<`0x${string}`>(() => {
    if (chainId === 8453) return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    return '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  }, [chainId]);
  const [sharesInput, setSharesInput] = React.useState<string>('');

  const { balance: shareBalanceRaw, refetch: refetchShareBalance } =
    useTokenBalance(indexTokenAddress);
  const { refetch: refetchUsdc } = useTokenBalance(usdcAddress);

  const effectiveShareBalance = shareBalanceRaw ?? portfolio?.sharesBalance;

  const shareBalanceFormatted =
    effectiveShareBalance !== undefined
      ? effectiveShareBalance === 0n
        ? '0'
        : (Number(effectiveShareBalance) / 1e18).toFixed(4)
      : '0.0000';

  const parsedShares = React.useMemo(() => {
    try {
      return parseUnits(sharesInput || '0', 18);
    } catch {
      return 0n;
    }
  }, [sharesInput]);

  const {
    previewAssets,
    grossAssets,
    protocolFee,
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
  } = useRedeemPreview(usdcAddress, sharesInput);
  const { redeem, status, errorMessage, txHash } = useRedeem(usdcAddress);
  const { openModal, setStep, setTxHash, setError } = useTransactionStore();

  const handlePercentagePreset = (percentage: number) => {
    if (!effectiveShareBalance) return;
    const selectedShares = (effectiveShareBalance * BigInt(percentage)) / 100n;
    setSharesInput(formatUnits(selectedShares, 18));
  };

  const handleRedeem = async () => {
    if (!address || parsedShares === 0n) return;

    openModal('REDEEM');
    setStep('EXECUTING');

    // Default 0.5% slippage
    const minAssets = previewAssets ? (previewAssets * 9950n) / 10000n : 0n;

    try {
      await redeem(parsedShares, minAssets);
    } catch (error) {
      setError(getErrorMessage(error, 'Redemption execution failed'));
    }
  };

  React.useEffect(() => {
    if (errorMessage) {
      openModal('REDEEM');
      setError(errorMessage);
    } else if (status === 'confirmed') {
      openModal('REDEEM');
      if (txHash) setTxHash(txHash);
      else setStep('CONFIRMED');
      refetchShareBalance?.();
      refetchUsdc?.();
      refetchPreview?.();
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
    refetchPreview,
  ]);

  const navPerShareNum = navData ? Number(navData.navPerShare) / 1e18 : 1.0;
  const sharesNum = Number(parsedShares) / 1e18;
  const estGross = sharesNum * navPerShareNum;
  const estFee = estGross * 0.001;
  const estNet = estGross - estFee;

  const formattedOutputUSDC = previewAssets
    ? (Number(previewAssets) / 1e6).toFixed(2)
    : parsedShares > 0n
      ? estNet.toFixed(2)
      : '0.00';

  const grossUSD = grossAssets
    ? (Number(grossAssets) / 1e6).toFixed(2)
    : previewAssets
      ? (Number(previewAssets) / 1e6 / 0.999).toFixed(2)
      : parsedShares > 0n
        ? estGross.toFixed(2)
        : '0.00';

  const feeUSD = protocolFee
    ? (Number(protocolFee) / 1e6).toFixed(2)
    : previewAssets
      ? ((Number(previewAssets) / 1e6 / 0.999) * 0.001).toFixed(2)
      : parsedShares > 0n
        ? estFee > 0 && estFee < 0.005
          ? '0.01'
          : estFee.toFixed(2)
        : '0.00';

  const formattedNAV = navData ? `$${(Number(navData.navPerShare) / 1e18).toFixed(4)}` : '$1.0000';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="rounded-3xl border border-border bg-card/90 dark:bg-[#111827]/80 p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                Redeem Vault Shares
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Interactive withdrawal form: Burn UVBTCETH shares and receive USDC payout
              </p>
            </div>
            <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              0.1% Fee
            </span>
          </div>

          {/* Share Amount Input */}
          <div className="rounded-2xl border border-border bg-muted/40 dark:bg-gray-900/60 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">You Redeem (Shares)</span>
              <span className="text-xs text-muted-foreground">
                Available:{' '}
                <span className="font-mono text-foreground font-semibold">
                  {shareBalanceFormatted || '0.0000'} UVBTCETH
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
                className="w-full bg-transparent font-mono text-2xl sm:text-3xl font-extrabold text-foreground focus:outline-none min-h-[44px]"
              />
              <button
                onClick={() =>
                  setSharesInput(
                    effectiveShareBalance
                      ? formatUnits(effectiveShareBalance, 18)
                      : shareBalanceFormatted || '0',
                  )
                }
                aria-label="Max"
                className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-3.5 py-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors font-mono"
              >
                MAX
              </button>
            </div>
          </div>

          {parsedShares > (effectiveShareBalance || 0n) && (
            <p className="text-xs text-rose-500 dark:text-rose-400 mb-4 font-semibold">
              Insufficient UVBTCETH share balance.
            </p>
          )}

          {/* Percentage Presets */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentagePreset(pct)}
                className="rounded-xl border border-border bg-secondary/80 hover:bg-accent py-2.5 min-h-[44px] flex items-center justify-center text-xs font-bold text-foreground hover:border-primary/30 transition-all"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Output Preview */}
          <div className="rounded-2xl border border-border bg-muted/30 dark:bg-gray-900/40 p-4 space-y-3 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-semibold">
                Redemption Preview
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
              <span className="text-muted-foreground">Protocol Redeem Fee (0.10%)</span>
              <span className="font-mono text-foreground">
                {isLoadingPreview ? '...' : `$${feeUSD} USDC`}
              </span>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-bold">
              <span className="text-foreground">Expected USDC Return</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {isLoadingPreview ? '...' : `$${formattedOutputUSDC} USDC`}
              </span>
            </div>
          </div>

          {/* Action Button */}
          {!isConnected ? (
            <div className="text-center py-4">
              <h2 className="text-lg font-bold mb-2 text-foreground">Wallet Connection Required</h2>
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
              onClick={handleRedeem}
              disabled={
                parsedShares === 0n ||
                parsedShares > (effectiveShareBalance || 0n) ||
                status === 'submitting' ||
                status === 'pending'
              }
              className="w-full rounded-2xl bg-purple-600 py-4 font-bold text-white shadow-xl shadow-purple-500/25 hover:bg-purple-500 transition-all disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
              aria-label="Redeem for USDC"
            >
              Redeem for USDC
            </button>
          )}
        </div>
      </main>

      <TransactionModal />
    </div>
  );
}
