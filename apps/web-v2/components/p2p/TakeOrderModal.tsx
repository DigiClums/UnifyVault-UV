'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useSignMessage, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Copy,
  Check,
  CreditCard,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import { OrderDetails, OrderSide } from '../../lib/contracts/marketplace';
import {
  useMarketplaceActions,
  isSaneTradeId,
  getMarketplaceAddress,
} from '../../hooks/useMarketplace';
import { TransactionStatusModal } from '../common/TransactionStatusModal';
import { validateUpiId } from '../../lib/p2p/upiValidation';
import { constructTradePaymentBindingMessage } from '../../lib/payment/walletAuth';
import { getCanonicalUVBEAddress } from '../../lib/p2p/assetValidation';
import { ERC20_ABI } from '../../lib/contracts';
import {
  DEPLOYED_CONTRACTS_SEPOLIA,
  DEPLOYED_CONTRACTS_MAINNET,
  getDefaultChainId,
} from '../../constants';

function getDeployedEscrowAddress(chainId: number): `0x${string}` {
  if (chainId === 84532) {
    return (
      (process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_SEPOLIA as `0x${string}`) ||
      (process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS as `0x${string}`) ||
      DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow
    );
  }
  return (
    (process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_MAINNET as `0x${string}`) ||
    (process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS as `0x${string}`) ||
    DEPLOYED_CONTRACTS_MAINNET.P2PEscrow
  );
}

interface TakeOrderModalProps {
  order: OrderDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onMatchSuccess: (escrowTradeId: number) => void;
}

export function TakeOrderModal({ order, isOpen, onClose, onMatchSuccess }: TakeOrderModalProps) {
  const { address: userAddress, chain } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { takeOrder, isSubmitting, txManager } = useMarketplaceActions();

  const [tradeAmountStr, setTradeAmountStr] = useState('');
  const [error, setError] = useState<string | null>(null);

  // When taking a SELL order (taker is BUYER), this holds maker's UPI
  const [sellerUpi, setSellerUpi] = useState<string | null>(null);
  const [isLoadingSellerUpi, setIsLoadingSellerUpi] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  // When taking a BUY order (taker is SELLER), taker inputs & confirms their receiving UPI
  const [takerSellerUpi, setTakerSellerUpi] = useState<string>('');
  const [isTakerUpiConfirmed, setIsTakerUpiConfirmed] = useState<boolean>(false);
  const [isBindingPending, setIsBindingPending] = useState<boolean>(false);
  const [bindingStatusText, setBindingStatusText] = useState<string>('');

  const isBuy = order ? order.side === OrderSide.BUY : false; // Maker wants to BUY UVBE -> Taker is SELLER
  const isMaker =
    userAddress && order ? userAddress.toLowerCase() === order.maker.toLowerCase() : false;
  const isBuyMode = !isBuy; // Taker is BUYER (taking a SELL order)

  const activeChainId = chain?.id || getDefaultChainId();
  const assetAddress = order?.asset || getCanonicalUVBEAddress(activeChainId);

  // Read connected user's token balance (needed when taker is SELLER)
  const { data: rawUserBalance, isLoading: isUserBalanceLoading } = useReadContract({
    address: assetAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: isOpen && !!userAddress && !isBuyMode,
      staleTime: 10_000,
    },
  });

  // 1. Fetch maker UPI when taker is BUYER (taking SELL order)
  // 2. Or pre-fill taker's own profile UPI when taker is SELLER (taking BUY order)
  useEffect(() => {
    if (!isOpen || !order) {
      setSellerUpi(null);
      setTakerSellerUpi('');
      setIsTakerUpiConfirmed(false);
      setIsLoadingSellerUpi(false);
      return;
    }

    let isMounted = true;

    if (isBuyMode) {
      // Taker is BUYER -> Fetch maker's (seller's) UPI
      const snapshotUpi =
        (order as any).sellerUpiId ||
        (order as any).sellerPaymentIdentifier ||
        (order as any).upiId;
      if (snapshotUpi && typeof snapshotUpi === 'string' && snapshotUpi.trim().length > 0) {
        setSellerUpi(snapshotUpi.trim());
        setIsLoadingSellerUpi(false);
        return;
      }

      const sellerAddress = order.maker;
      if (!sellerAddress) {
        setSellerUpi(null);
        setIsLoadingSellerUpi(false);
        return;
      }

      setIsLoadingSellerUpi(true);
      fetch(`/api/p2p/seller-profile?userAddress=${sellerAddress}`)
        .then((res) => {
          if (!res.ok) throw new Error('Seller payment profile not found');
          return res.json();
        })
        .then((data) => {
          if (!isMounted) return;
          const upi = data?.profile?.upiVpa || data?.profile?.upiId;
          if (upi && typeof upi === 'string' && upi.trim().length > 0) {
            setSellerUpi(upi.trim());
          } else {
            setSellerUpi(null);
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setSellerUpi(null);
        })
        .finally(() => {
          if (isMounted) setIsLoadingSellerUpi(false);
        });
    } else {
      // Taker is SELLER -> Pre-fill from current user's profile if available as a convenience
      if (userAddress) {
        fetch(`/api/p2p/seller-profile?userAddress=${userAddress}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!isMounted) return;
            const upi = data?.profile?.upiVpa || data?.profile?.upiId;
            if (upi && typeof upi === 'string' && upi.trim().length > 0) {
              setTakerSellerUpi(upi.trim());
            }
          })
          .catch(() => {});
      }
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, order, isBuyMode, userAddress]);

  const handleClose = () => {
    setTradeAmountStr('');
    setError(null);
    setSellerUpi(null);
    setTakerSellerUpi('');
    setIsTakerUpiConfirmed(false);
    setIsBindingPending(false);
    setBindingStatusText('');
    setCopiedUpi(false);
    onClose();
  };

  const handleCopyUpi = async () => {
    if (!sellerUpi) return;
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(sellerUpi);
      }
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  if (!isOpen || !order) return null;

  const decimals = 18; // Canonical UVBE Decimals
  const remainingCrypto = parseFloat(formatUnits(order.remainingAmount, decimals));
  const minCrypto = parseFloat(formatUnits(order.minLimit, decimals));
  const maxCrypto = parseFloat(formatUnits(order.maxLimit, decimals));
  const unitPrice = Number(order.price);

  // When taker is SELLER (taking a BUY order), their wallet balance is the hard cap
  const userBalanceNum =
    rawUserBalance !== undefined && rawUserBalance !== null
      ? parseFloat(formatUnits(rawUserBalance, decimals))
      : 0;

  // Maximum crypto taker is allowed to fill
  const orderAvailableCap = maxCrypto > 0 ? Math.min(remainingCrypto, maxCrypto) : remainingCrypto;
  const effectiveMaxCrypto = !isBuyMode
    ? Math.min(orderAvailableCap, userBalanceNum)
    : orderAvailableCap;

  const inputAmountNum = parseFloat(tradeAmountStr) || 0;
  const fiatTotal = inputAmountNum * unitPrice;

  const takerUpiCheck = !isBuyMode
    ? validateUpiId(takerSellerUpi)
    : { isValid: true, trimmedUpi: '' };

  const isSellerBalanceInsufficient =
    !isBuyMode &&
    ((!isUserBalanceLoading && userBalanceNum <= 0) ||
      (!isUserBalanceLoading && minCrypto > 0 && userBalanceNum < minCrypto));

  const isSubmitDisabled =
    isSubmitting ||
    isBindingPending ||
    !tradeAmountStr ||
    inputAmountNum <= 0 ||
    isMaker ||
    (isBuyMode && (isLoadingSellerUpi || !sellerUpi)) ||
    (!isBuyMode &&
      (!takerUpiCheck.isValid ||
        !isTakerUpiConfirmed ||
        isSellerBalanceInsufficient ||
        inputAmountNum > userBalanceNum));

  const handleConfirmTake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress) {
      setError('Please connect your wallet first.');
      return;
    }

    if (isMaker) {
      setError('You cannot take your own order (self-matching prohibited).');
      return;
    }

    if (isBuyMode && !sellerUpi) {
      setError('Seller payment details unavailable. Cannot proceed with payment confirmation.');
      return;
    }

    if (!isBuyMode) {
      if (!takerUpiCheck.isValid) {
        setError(takerUpiCheck.error || 'Please provide a valid receiving UPI ID.');
        return;
      }
      if (!isTakerUpiConfirmed) {
        setError('Please confirm that you will receive payment at the specified UPI ID.');
        return;
      }
      if (!isUserBalanceLoading && userBalanceNum <= 0) {
        setError(
          `Insufficient UVBE balance in your wallet (Balance: 0 UVBE). You cannot sell UVBE without owning tokens.`,
        );
        return;
      }
      if (!isUserBalanceLoading && minCrypto > 0 && userBalanceNum < minCrypto) {
        setError(
          `Your wallet balance (${userBalanceNum.toFixed(4)} UVBE) is below the order minimum limit of ${minCrypto} UVBE.`,
        );
        return;
      }
      if (!isUserBalanceLoading && inputAmountNum > userBalanceNum) {
        setError(
          `Trade amount (${inputAmountNum} UVBE) exceeds your available wallet balance (${userBalanceNum.toFixed(4)} UVBE).`,
        );
        return;
      }
    }

    if (inputAmountNum <= 0 || isNaN(inputAmountNum)) {
      setError('Please enter a valid UVBE trade amount.');
      return;
    }

    if (inputAmountNum > remainingCrypto) {
      setError(`Trade amount cannot exceed available order amount of ${remainingCrypto} UVBE.`);
      return;
    }

    if (minCrypto > 0 && inputAmountNum < minCrypto) {
      setError(`Trade amount is below minimum order limit of ${minCrypto} UVBE.`);
      return;
    }

    if (maxCrypto > 0 && inputAmountNum > maxCrypto) {
      setError(`Trade amount exceeds maximum order limit of ${maxCrypto} UVBE.`);
      return;
    }

    const currentChainId = chain?.id || getDefaultChainId();
    const escrowAddress = getDeployedEscrowAddress(currentChainId);
    const normalizedUpi = takerUpiCheck.trimmedUpi;

    try {
      setError(null);
      let sellerSignature: `0x${string}` | null = null;
      const signatureTimestamp: number = Date.now();

      // Step 1: Pre-trade cryptographic payment binding signature (When taking a BUY order)
      if (!isBuyMode) {
        setBindingStatusText('Requesting payment authorization signature...');
        const bindingMessage = constructTradePaymentBindingMessage({
          chainId: currentChainId,
          escrowAddress,
          marketplaceOrderId: order.orderId,
          sellerAddress: userAddress,
          paymentRail: 'UPI',
          paymentDestination: normalizedUpi,
          timestamp: signatureTimestamp,
        });

        try {
          sellerSignature = await signMessageAsync({ message: bindingMessage });
        } catch (signErr: any) {
          throw new Error(signErr?.message || 'Payment authorization signature was rejected.');
        }
      }

      // Step 2: Execute single atomic on-chain takeOrder transaction
      const matchAmountBigInt = parseUnits(tradeAmountStr.trim(), decimals);
      const result = await takeOrder({
        orderId: order.orderId,
        takeAmount: matchAmountBigInt,
      });

      if (!result.escrowTradeId || !isSaneTradeId(result.escrowTradeId)) {
        handleClose();
        return;
      }

      const spawnedTradeId = result.escrowTradeId;

      // Step 3: Create immutable TradePaymentBinding on server
      if (!isBuyMode && sellerSignature) {
        setIsBindingPending(true);
        setBindingStatusText('Committing immutable trade payment binding...');

        const bindRes = await fetch('/api/p2p/trade-binding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tradeId: spawnedTradeId,
            marketplaceOrderId: order.orderId,
            takeOrderTxHash: result.txHash,
            paymentRail: 'UPI',
            paymentDestination: normalizedUpi,
            signature: sellerSignature,
            signatureTimestamp,
            chainId: currentChainId,
          }),
        });

        if (!bindRes.ok) {
          const bindData = await bindRes.json().catch(() => ({}));
          console.error('Failed to create trade payment binding:', bindData);
          throw new Error(
            bindData.error ||
              `Trade #${spawnedTradeId} created on-chain, but failed to record payment binding. Please contact support.`,
          );
        }
      }

      onMatchSuccess(spawnedTradeId);
    } catch (err: any) {
      console.error('Take order error:', err);
      setError(err?.message || 'Transaction failed or was rejected by user.');
    } finally {
      setIsBindingPending(false);
      setBindingStatusText('');
    }
  };

  const handleMaxClick = () => {
    if (!isBuyMode) {
      // Taker is SELLER -> Cap to min(available_in_order, wallet_balance)
      const maxFill = Math.min(orderAvailableCap, Math.max(0, userBalanceNum));
      setTradeAmountStr(maxFill > 0 ? maxFill.toString() : '0');
    } else {
      // Taker is BUYER -> Fill maximum allowable in order
      setTradeAmountStr(orderAvailableCap.toString());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[8px_8px_0_#000] p-6 space-y-4 font-mono max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-black text-foreground font-sans">
              {isBuy ? 'Sell UVBE to Buyer' : 'Buy UVBE from Seller'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Order #{order.orderId} •{' '}
              {isBuy ? 'Buyer wants to buy UVBE' : 'Seller wants to sell UVBE'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Counterparty & Order Spec Box */}
        <div className="p-4 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Maker ({isBuy ? 'Buyer' : 'Seller'}):</span>
            <span className="font-bold text-foreground">
              {order.maker.slice(0, 8)}...{order.maker.slice(-6)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Your Role:</span>
            <span className="font-bold text-[#BFFF00]">
              {isBuy
                ? 'SELLER (You provide UVBE & receive INR)'
                : 'BUYER (You pay INR & receive UVBE)'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Unit Price:</span>
            <span className="font-bold text-foreground">
              ₹{unitPrice.toLocaleString('en-IN')} INR per UVBE
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Available in Order:</span>
            <span className="font-bold text-foreground">{remainingCrypto} UVBE</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Allowed Trade Limits:</span>
            <span className="font-bold text-foreground">
              {minCrypto} - {maxCrypto} UVBE
            </span>
          </div>

          {!isBuyMode && (
            <div className="flex justify-between border-t border-black/10 dark:border-white/10 pt-2 mt-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-[#BFFF00]" /> Your UVBE Balance:
              </span>
              <span
                className={`font-bold ${userBalanceNum <= 0 ? 'text-destructive' : 'text-[#5f8f00] dark:text-[#BFFF00]'}`}
              >
                {isUserBalanceLoading ? 'Loading...' : `${userBalanceNum.toFixed(4)} UVBE`}
              </span>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 font-sans">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Insufficient Seller Balance Warning */}
        {!isBuyMode &&
          !isUserBalanceLoading &&
          (userBalanceNum <= 0 || (minCrypto > 0 && userBalanceNum < minCrypto)) && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2 font-sans">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Insufficient UVBE Balance in Wallet</p>
                <p className="text-[11px] leading-relaxed">
                  {userBalanceNum <= 0
                    ? 'Your connected wallet has 0 UVBE. You need UVBE to fulfill this buy order and deposit into escrow.'
                    : `Your wallet balance (${userBalanceNum.toFixed(4)} UVBE) is less than the minimum required order limit (${minCrypto} UVBE).`}
                </p>
              </div>
            </div>
          )}

        {/* Status Text Banner */}
        {bindingStatusText && (
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs flex items-center gap-2 font-sans">
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            <span>{bindingStatusText}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleConfirmTake} className="space-y-4 font-sans">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Trade Amount (UVBE)
              </label>
              {!isBuyMode && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  Wallet Max: {userBalanceNum.toFixed(4)} UVBE
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id="trade-amount-input"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder={
                  !isBuyMode
                    ? `Enter amount (Max ${effectiveMaxCrypto.toFixed(4)})`
                    : `Enter amount (Max ${remainingCrypto})`
                }
                value={tradeAmountStr}
                onChange={(e) => setTradeAmountStr(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
                required
              />
              <button
                type="button"
                onClick={handleMaxClick}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded bg-[#BFFF00] text-black font-black text-[10px] border border-black shadow-[1px_1px_0_#000] min-h-[32px] flex items-center justify-center cursor-pointer"
              >
                MAX
              </button>
            </div>
            {!isBuyMode && userBalanceNum > 0 && userBalanceNum < remainingCrypto && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                Note: Order requests {remainingCrypto} UVBE, but you can fill up to your wallet
                balance of {userBalanceNum.toFixed(4)} UVBE.
              </p>
            )}
          </div>

          {/* Calculated Fiat Total */}
          <div className="p-4 rounded-xl bg-[#BFFF00]/10 border-2 border-black dark:border-white/10 space-y-1 font-mono">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              Total Calculated Fiat Payment
            </span>
            <p className="text-xl font-black text-foreground">
              ₹{fiatTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })} INR
            </p>
          </div>

          {/* SELLER MODE (Taking BUY Order): Receiving UPI Destination & Pre-Trade Signing */}
          {!isBuyMode && (
            <div className="p-4 rounded-xl bg-accent/20 border-2 border-black/10 dark:border-white/10 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  <CreditCard className="w-3.5 h-3.5 text-[#BFFF00]" />
                  <span>YOUR RECEIVING UPI DESTINATION</span>
                </div>
                <span className="text-[10px] text-[#5f8f00] dark:text-[#BFFF00] font-sans font-bold flex items-center gap-1">
                  <KeyRound className="w-3 h-3" /> Signed & Bound
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground">
                  UPI VPA (where buyer must pay ₹
                  {fiatTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}):
                </label>
                <input
                  type="text"
                  placeholder="e.g. yourname@okhdfcbank"
                  value={takerSellerUpi}
                  onChange={(e) => {
                    setTakerSellerUpi(e.target.value);
                    setIsTakerUpiConfirmed(false);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00]"
                  required
                />
                {!takerUpiCheck.isValid && takerSellerUpi.length > 0 && (
                  <p className="text-[10px] text-destructive font-sans">{takerUpiCheck.error}</p>
                )}
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isTakerUpiConfirmed}
                    disabled={!takerUpiCheck.isValid}
                    onChange={(e) => setIsTakerUpiConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-black dark:border-white/20 text-[#BFFF00] focus:ring-[#BFFF00]"
                  />
                  <span className="text-[11px] text-foreground leading-tight">
                    I confirm that <strong>{takerUpiCheck.trimmedUpi || 'this UPI ID'}</strong> is
                    my valid payment destination. I will cryptographically sign this authorization
                    before escrow creation.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* BUY MODE (Taking SELL Order): Display Maker's UPI Info */}
          {isBuyMode && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-accent/20 border-2 border-black/10 dark:border-white/10 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  <CreditCard className="w-3.5 h-3.5 text-[#BFFF00]" />
                  <span>ESCROW SECURITY & PAYMENT FLOW</span>
                </div>
                <span className="text-[10px] text-[#5f8f00] dark:text-[#BFFF00] font-sans font-bold">
                  Buyer Protection Active
                </span>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs space-y-1.5 font-sans">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Funds Protected by Escrow</span>
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Accepting this order matches you with the seller. You will only transfer fiat to
                  the seller’s UPI once the seller deposits{' '}
                  <strong className="text-foreground">{tradeAmountStr || '0'} UVBE</strong> into the
                  smart contract escrow.
                </p>
              </div>

              <div className="flex items-center justify-between px-1 text-xs pt-1">
                <span className="text-muted-foreground">Total Payable Upon Deposit:</span>
                <span
                  data-testid="seller-payment-amount"
                  className="font-black text-foreground text-sm"
                >
                  ₹{fiatTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })} INR
                </span>
              </div>
            </div>
          )}

          {/* Warning Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Taking this order creates an on-chain P2PEscrow trade in a single atomic transaction.
            </span>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-3 pt-2 font-mono">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background hover:bg-accent text-xs font-bold transition-all min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="px-6 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 min-h-[44px] flex items-center gap-2 font-sans"
            >
              {isSubmitting || isBindingPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isBindingPending ? 'Binding Payment...' : 'Matching On-Chain...'}</span>
                </>
              ) : (
                <>
                  <span>{isBuy ? 'SIGN & SELL UVBE' : 'BUY UVBE NOW'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <TransactionStatusModal
        isOpen={txManager.progressState.state !== 'IDLE'}
        onClose={() => txManager.resetTransactionState()}
        progressState={txManager.progressState}
        onRetry={() => txManager.retryLastTransaction()}
        onCancel={() => txManager.resetTransactionState()}
        onContinue={() => {
          txManager.resetTransactionState();
          handleClose();
        }}
        onOpenWallet={txManager.openMobileWallet}
      />
    </div>
  );
}
