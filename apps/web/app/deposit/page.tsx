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
import { usePortfolio } from '../../hooks/usePortfolio';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useIndexTokenAddress } from '../../hooks/useIndexTokenAddress';
import { useTransactionStore } from '../../store/useTransactionStore';

import { parseWalletError } from '../../lib/utils/formatters';

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
  const { navData } = usePortfolio();

  const usdcAddress = React.useMemo<`0x${string}`>(() => {
    if (chainId === 8453) return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    return '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  }, [chainId]);
  const [amountInput, setAmountInput] = React.useState<string>('');
  const slippageBps = 50; // 0.5% default

  const { balance: usdcBalanceRaw, refetch: refetchUsdc } = useTokenBalance(usdcAddress);
  const { refetch: refetchShareBalance } = useTokenBalance(indexTokenAddress);
  const usdcBalanceFormatted =
    usdcBalanceRaw !== undefined ? (Number(usdcBalanceRaw) / 1e6).toFixed(2) : '0.00';

  const parsedAmount = React.useMemo(() => {
    try {
      return parseUnits(amountInput || '0', 6);
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
  const { openModal, setStep, setTxHash, setError } = useTransactionStore();

  const needsApproval = React.useMemo(() => {
    const isApprovalNeeded =
      allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;
    console.log('[AUDIT] condition deciding whether approval is complete:', {
      allowance,
      parsedAmount,
      needsApproval: isApprovalNeeded,
    });
    return isApprovalNeeded;
  }, [allowance, parsedAmount]);

  const handleAction = async () => {
    if (!address || parsedAmount === 0n) return;
    console.log('[AUDIT] handleAction invoked:', { needsApproval, parsedAmount });

    const minShares = depositQuote
      ? (depositQuote.sharesPreview * BigInt(10000 - slippageBps)) / 10000n
      : 0n;

    if (needsApproval) {
      console.log('[AUDIT] handleAction: starting approval flow (openModal APPROVE)');
      openModal('APPROVE');
      setStep('APPROVING');
      try {
        await approve(parsedAmount);
        console.log('[AUDIT] approval write/confirm finished, refetching allowance...');
        await refetchAllowance();
      } catch (error) {
        console.error('[AUDIT] handleAction approval error:', error);
        setError(getErrorMessage(error, 'Approval failed'));
      }
    } else {
      console.log(
        '[AUDIT] handleAction: needsApproval is false, starting deposit flow (openModal DEPOSIT)',
      );
      openModal('DEPOSIT');
      setStep('EXECUTING');

      try {
        console.log('[AUDIT] calling deposit() with:', { parsedAmount, minShares, address });
        await deposit(parsedAmount, minShares, address);
      } catch (error) {
        console.error('[AUDIT] handleAction deposit error:', error);
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
      else setStep('CONFIRMED');
      refetchUsdc?.();
      refetchAllowance?.();
      refetchPreview?.();
      refetchShareBalance?.();
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
  ]);

  const navPerShareNum = navData ? Number(navData.navPerShare) / 1e18 : 1.0;
  const amountNum = Number(parsedAmount) / 1e6;
  const estFee = amountNum * 0.001;
  const estNet = amountNum - estFee;
  const estShares = estNet / navPerShareNum;

  const formattedFee = depositQuote
    ? (Number(depositQuote.protocolFee) / 1e6).toFixed(2)
    : parsedAmount > 0n
      ? estFee > 0 && estFee < 0.005
        ? '0.01'
        : estFee.toFixed(2)
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

  const formattedNAV = navData ? `$${(Number(navData.navPerShare) / 1e18).toFixed(4)}` : '$1.0000';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="rounded-3xl border border-border bg-card/90 dark:bg-[#111827]/80 p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                Deposit Collateral
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Interactive deposit form: Mint UVBTCETH index shares using USDC collateral
              </p>
            </div>
            <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              0.1% Fee
            </span>
          </div>

          {/* Amount Input */}
          <div className="rounded-2xl border border-border bg-muted/40 dark:bg-gray-900/60 p-4 mb-6">
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
                className="w-full bg-transparent font-mono text-2xl sm:text-3xl font-extrabold text-foreground focus:outline-none min-h-[44px]"
              />
              <button
                onClick={() =>
                  setAmountInput(
                    usdcBalanceRaw ? formatUnits(usdcBalanceRaw, 6) : usdcBalanceFormatted || '0',
                  )
                }
                aria-label="Max"
                className="rounded-lg bg-primary/10 border border-primary/20 px-3.5 py-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Quote Breakdown */}
          <div className="rounded-2xl border border-border bg-muted/30 dark:bg-gray-900/40 p-4 space-y-3 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-semibold">
                Live Yield Preview
              </span>
              {isLoadingPreview && (
                <span className="text-[10px] font-mono text-primary animate-pulse">
                  Calculating quote...
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Current NAV Per Share</span>
              <span className="font-mono font-semibold text-foreground">{formattedNAV}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Protocol Deposit Fee (0.10%)</span>
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
            <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-bold">
              <span className="text-foreground">Expected Shares (UVBTCETH)</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {isLoadingPreview ? '...' : formattedShares}
              </span>
            </div>
          </div>

          {/* Action Trigger Button */}
          {!isConnected ? (
            <div className="text-center py-4">
              <h2 className="text-lg font-bold mb-2 text-foreground">Wallet Connection Required</h2>
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
                status === 'pending'
              }
              className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground shadow-xl shadow-primary/25 hover:bg-primary/90 transition-all disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
              aria-label={needsApproval ? 'Approve Spend Limit for USDC' : 'Deposit USDC'}
            >
              {needsApproval ? 'Approve Spend Limit for USDC' : 'Deposit USDC'}
            </button>
          )}
        </div>
      </main>

      <TransactionModal />
    </div>
  );
}
