'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  X,
  Plus,
  Loader2,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Info,
  Coins,
} from 'lucide-react';
import { useMarketplaceActions } from '../../hooks/useMarketplace';
import { useSellOrderPreflight } from '../../hooks/useSellOrderPreflight';
import { getDefaultChainId } from '../../constants';
import { getSupportedP2PAssetsForChain } from '../../lib/p2p/assetValidation';

interface CreateMarketplaceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateMarketplaceOrderModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateMarketplaceOrderModalProps) {
  const { address: userAddress, chain } = useAccount();
  const targetChainId = getDefaultChainId();
  const activeChainId = chain?.id || targetChainId;
  const supportedAssets = getSupportedP2PAssetsForChain(activeChainId);

  const { createBuyOrder, createSellOrder, isSubmitting } = useMarketplaceActions();

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [priceStr, setPriceStr] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [minLimitStr, setMinLimitStr] = useState('');
  const [maxLimitStr, setMaxLimitStr] = useState('');
  const [error, setError] = useState<string | null>(null);

  const defaultAsset = supportedAssets[0]?.address || '0x0000000000000000000000000000000000000000';
  const [selectedAsset, setSelectedAsset] = useState<`0x${string}`>(defaultAsset);

  // Auto-switch selected asset if current selected asset is not supported on active chain
  useEffect(() => {
    if (supportedAssets.length > 0) {
      const match = supportedAssets.find(
        (a) => a.address.toLowerCase() === selectedAsset.toLowerCase()
      );
      if (!match) {
        setSelectedAsset(supportedAssets[0].address);
      }
    }
  }, [supportedAssets, selectedAsset]);

  // Pre-flight balance & allowance check for SELL orders
  const {
    decimals,
    symbol,
    isNative,
    requestedAmountBigInt,
    availableBalanceBigInt,
    remainingBalanceBigInt,
    isInsufficientBalance,
    isInsufficientAllowance,
    isWrongNetwork,
    canSubmitSellOrder,
    errorMessage: preflightErrorMessage,
    warningMessage: allowanceWarningMessage,
    rawBalance,
    isBalanceLoading,
    balanceError,
    refetch: refetchBalance,
    verifyFinalSubmissionState,
  } = useSellOrderPreflight({
    side,
    asset: selectedAsset,
    amountStr,
  });

  // Numeric computations
  const priceNum = useMemo(() => (priceStr ? parseFloat(priceStr) : 0), [priceStr]);
  const amountNum = useMemo(() => (amountStr ? parseFloat(amountStr) : 0), [amountStr]);
  const minLimitNum = useMemo(() => (minLimitStr ? parseFloat(minLimitStr) : 0), [minLimitStr]);
  const maxLimitNum = useMemo(
    () => (maxLimitStr ? parseFloat(maxLimitStr) : amountNum),
    [maxLimitStr, amountNum]
  );

  // Progressive Validation Error Checks
  const validationError = useMemo(() => {
    if (priceStr && (isNaN(priceNum) || priceNum <= 0)) {
      return 'Please enter a valid unit price greater than 0.';
    }

    if (amountStr && (isNaN(amountNum) || amountNum <= 0)) {
      return 'Please enter a valid total order amount greater than 0.';
    }

    if (amountNum > 0) {
      if (minLimitStr && (isNaN(minLimitNum) || minLimitNum <= 0)) {
        return 'Minimum limit must be greater than 0.';
      }

      if (maxLimitStr && (isNaN(maxLimitNum) || maxLimitNum <= 0)) {
        return 'Maximum limit must be greater than 0.';
      }

      if (minLimitStr && minLimitNum > amountNum) {
        return `Minimum limit (${minLimitNum}) cannot exceed total order amount (${amountNum}).`;
      }

      if (maxLimitStr && maxLimitNum > amountNum) {
        return `Maximum limit (${maxLimitNum}) cannot exceed total order amount (${amountNum}).`;
      }

      if (minLimitStr && maxLimitStr && minLimitNum > maxLimitNum) {
        return `Minimum limit (${minLimitNum}) cannot exceed maximum limit (${maxLimitNum}).`;
      }
    }

    return null;
  }, [priceStr, priceNum, amountStr, amountNum, minLimitStr, minLimitNum, maxLimitStr, maxLimitNum]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userAddress) {
      setError('Please connect your wallet first.');
      return;
    }

    if (isWrongNetwork) {
      setError('Wrong network. Please switch to Base Sepolia or Base Mainnet.');
      return;
    }

    if (!priceNum || priceNum <= 0) {
      setError('Please enter a valid unit price in INR.');
      return;
    }

    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid total order amount.');
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    // Final Submission Revalidation for SELL orders
    if (side === 'SELL') {
      if (balanceError) {
        setError(balanceError.includes('Failed to read') ? balanceError : `Balance read failure: ${balanceError}`);
        return;
      }

      if (isBalanceLoading) {
        setError('Wallet balance is currently loading. Please wait.');
        return;
      }

      if (!canSubmitSellOrder || isInsufficientBalance || requestedAmountBigInt > availableBalanceBigInt) {
        const availableFormatted = formatUnits(availableBalanceBigInt, decimals);
        setError(
          preflightErrorMessage ||
            `Insufficient balance: Available balance is ${availableFormatted} ${symbol}, but requested ${amountStr} ${symbol}.`
        );
        return;
      }

      const finalCheck = await verifyFinalSubmissionState({
        expectedAsset: selectedAsset,
        expectedAmountStr: amountStr,
      });

      if (!finalCheck.isValid) {
        setError(
          finalCheck.errorMessage ||
            'Pre-flight validation state is stale or changed. Please verify details and try again.'
        );
        refetchBalance();
        return;
      }
    }

    try {
      const amountBigInt = parseUnits(amountStr.trim(), decimals);
      const priceBigInt = BigInt(Math.floor(priceNum));
      const minLimitBigInt = parseUnits(minLimitStr ? minLimitStr.trim() : '0', decimals);
      const maxLimitBigInt = parseUnits(
        maxLimitStr ? maxLimitStr.trim() : amountStr.trim(),
        decimals
      );

      if (side === 'BUY') {
        await createBuyOrder({
          asset: selectedAsset,
          amount: amountBigInt,
          price: priceBigInt,
          fiatCurrency: 'INR',
          minLimit: minLimitBigInt,
          maxLimit: maxLimitBigInt,
        });
      } else {
        await createSellOrder({
          asset: selectedAsset,
          amount: amountBigInt,
          price: priceBigInt,
          fiatCurrency: 'INR',
          minLimit: minLimitBigInt,
          maxLimit: maxLimitBigInt,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Order creation error:', err);
      refetchBalance();
      const errMsg = (err?.message || '').toLowerCase();
      if (
        err?.message === 'Insufficient ETH for Base network gas.' ||
        errMsg.includes('insufficient eth for base network gas') ||
        errMsg.includes('insufficient eth')
      ) {
        setError('Insufficient ETH for Base network gas.');
      } else if (
        errMsg.includes('insufficient balance') ||
        errMsg.includes('revert') ||
        errMsg.includes('execution reverted')
      ) {
        setError(
          'Order creation failed on-chain: Balance may have changed or transaction reverted. Please verify your balance and try again.'
        );
      } else {
        setError(err?.message || 'Transaction failed or was rejected by user.');
      }
    }
  };

  const activeErrorMessage = error || validationError || (side === 'SELL' ? preflightErrorMessage : null);
  const totalOrderValueINR = priceNum > 0 && amountNum > 0 ? priceNum * amountNum : 0;
  const isSubmitDisabled =
    isSubmitting ||
    !priceNum ||
    priceNum <= 0 ||
    !amountNum ||
    amountNum <= 0 ||
    !!validationError ||
    isWrongNetwork ||
    (side === 'SELL' && (!canSubmitSellOrder || isInsufficientBalance || isBalanceLoading));

  const chainName = activeChainId === 8453 ? 'Base Mainnet' : 'Base Sepolia';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[8px_8px_0_#000] p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#BFFF00] border-2 border-black flex items-center justify-center shadow-[2px_2px_0_#000] shrink-0">
              <Plus className="w-4 h-4 text-black" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-foreground font-sans tracking-tight">
                Create Limit Order
              </h3>
              <p className="text-[11px] text-muted-foreground font-sans">
                Trade directly from your wallet • Non-custodial
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Side Selector Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border-2 ${
              side === 'BUY'
                ? 'bg-emerald-600 text-white border-black shadow-[3px_3px_0_#000]'
                : 'bg-background text-muted-foreground border-black/20 hover:bg-accent'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>CREATE BUY ORDER</span>
          </button>

          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border-2 ${
              side === 'SELL'
                ? 'bg-rose-600 text-white border-black shadow-[3px_3px_0_#000]'
                : 'bg-background text-muted-foreground border-black/20 hover:bg-accent'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>CREATE SELL ORDER</span>
          </button>
        </div>

        {/* Error Banner */}
        {activeErrorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 font-sans font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{activeErrorMessage}</span>
          </div>
        )}

        {/* ERC20 Allowance Warning Banner (SELL only) */}
        {side === 'SELL' && isInsufficientAllowance && allowanceWarningMessage && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2 font-sans">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{allowanceWarningMessage}</span>
          </div>
        )}

        {/* Order Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 font-sans text-xs">
          {/* Asset Selection */}
          <div className="space-y-1">
            <label htmlFor="asset-select" className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
              Asset
            </label>
            <div className="relative">
              <select
                id="asset-select"
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value as `0x${string}`)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00] appearance-none"
              >
                {supportedAssets.map((ast) => (
                  <option key={ast.address} value={ast.address}>
                    {ast.symbol} — {ast.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <Coins className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Real Wallet Balance Pre-Flight Display Box (SELL Orders Only) */}
          {side === 'SELL' && (
            <div className="p-3 rounded-xl border-2 border-black/20 dark:border-white/20 bg-accent/10 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between font-bold">
                <span className="text-muted-foreground text-[11px]">Available Balance:</span>
                <span className="text-foreground">
                  {isBalanceLoading ? (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                    </span>
                  ) : rawBalance !== null ? (
                    `${formatUnits(availableBalanceBigInt, decimals)} ${symbol}`
                  ) : (
                    '—'
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Requested Sell Amount:</span>
                <span className="text-foreground font-bold">
                  {amountStr && !isNaN(Number(amountStr)) ? `${amountStr} ${symbol}` : `0 ${symbol}`}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 pt-1 font-bold">
                <span className="text-muted-foreground text-[11px]">Remaining Balance:</span>
                <span
                  className={
                    isInsufficientBalance ? 'text-destructive font-black' : 'text-emerald-500'
                  }
                >
                  {isBalanceLoading ? (
                    '...'
                  ) : rawBalance !== null ? (
                    `${formatUnits(remainingBalanceBigInt, decimals)} ${symbol}`
                  ) : (
                    '—'
                  )}
                </span>
              </div>

              {isNative && (
                <div className="text-[10px] text-muted-foreground pt-0.5 flex items-center gap-1 font-sans">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Includes 0.001 ETH reserve for network gas fees.</span>
                </div>
              )}
            </div>
          )}

          {/* Price & Amount Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Unit Price Input */}
            <div className="space-y-1">
              <label htmlFor="unit-price-input" className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                Unit Price (INR per {symbol})
              </label>
              <input
                id="unit-price-input"
                type="number"
                step="any"
                placeholder="e.g. 500"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
                required
              />
            </div>

            {/* Total Amount Input */}
            <div className="space-y-1">
              <label htmlFor="total-amount-input" className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                Total Order Amount ({symbol})
              </label>
              <input
                id="total-amount-input"
                type="number"
                step="any"
                placeholder="e.g. 100"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
                required
              />
            </div>
          </div>

          {/* Partial Fill Limits Section */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                Partial Fill Limits (Optional)
              </label>
              <span className="text-[10px] text-muted-foreground font-sans">Allow partial order takes</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <input
                  id="min-limit-input"
                  type="number"
                  step="any"
                  placeholder="Min Limit (e.g. 10)"
                  value={minLimitStr}
                  onChange={(e) => setMinLimitStr(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-black/30 dark:border-white/20 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
                />
              </div>

              <div className="space-y-1">
                <input
                  id="max-limit-input"
                  type="number"
                  step="any"
                  placeholder="Max Limit (e.g. 100)"
                  value={maxLimitStr}
                  onChange={(e) => setMaxLimitStr(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-black/30 dark:border-white/20 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
                />
              </div>
            </div>
          </div>

          {/* Live Order Summary Card */}
          <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-accent/20 space-y-1 text-xs font-mono">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pb-0.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between font-sans">
              <span>Live Order Summary</span>
              <span className="text-foreground">{side}</span>
            </div>

            <div className="grid grid-cols-2 gap-1 pt-1 text-[11px]">
              <span className="text-muted-foreground">Asset:</span>
              <span className="text-right font-bold">{symbol}</span>

              <span className="text-muted-foreground">Unit Price:</span>
              <span className="text-right font-bold">
                {priceNum > 0 ? `₹${priceNum.toLocaleString('en-IN')}` : '—'}
              </span>

              <span className="text-muted-foreground">Total Amount:</span>
              <span className="text-right font-bold">
                {amountNum > 0 ? `${amountNum} ${symbol}` : '—'}
              </span>

              <span className="text-muted-foreground">Total Order Value:</span>
              <span className="text-right font-black text-emerald-600 dark:text-emerald-400">
                {totalOrderValueINR > 0 ? `₹${totalOrderValueINR.toLocaleString('en-IN')}` : '—'}
              </span>

              <span className="text-muted-foreground">Partial Fill Range:</span>
              <span className="text-right">
                {amountNum > 0
                  ? `${minLimitNum > 0 ? minLimitNum : 0} – ${maxLimitNum > 0 ? maxLimitNum : amountNum} ${symbol}`
                  : '—'}
              </span>

              <span className="text-muted-foreground">Network:</span>
              <span className="text-right text-[10px] font-sans">{chainName}</span>
            </div>
          </div>

          {/* Non-Custodial Security Note */}
          <div className="p-2.5 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 text-[10px] text-muted-foreground flex items-center gap-2 font-sans">
            <ShieldCheck className="w-4 h-4 text-[#BFFF00] shrink-0" />
            <span>
              Order creation is non-custodial and does NOT lock collateral until a trade match occurs.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent text-xs font-bold transition-all min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`px-5 py-2.5 rounded-xl text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 min-h-[44px] flex items-center gap-2 ${
                side === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500 text-white'
              }`}
            >
              {side === 'SELL' && isBalanceLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>CHECKING...</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>CREATING ORDER...</span>
                </>
              ) : side === 'SELL' && isInsufficientBalance ? (
                <span>INSUFFICIENT BALANCE</span>
              ) : (
                <span>{side === 'BUY' ? 'CREATE BUY ORDER' : 'CREATE SELL ORDER'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
