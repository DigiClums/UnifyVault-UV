'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { formatUnits, hexToString, type Address } from 'viem';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertOctagon,
  FileCheck,
  Upload,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Lock,
  ArrowRightLeft,
  UserCheck,
  Ban,
  Copy,
  Gavel,
  QrCode,
  Sparkles,
  CreditCard,
  Check,
} from 'lucide-react';
import {
  TradeDetails,
  TradeState,
  STATE_LABELS,
  useP2PActions,
  generateReceiptHash,
} from '../../hooks/useP2PEscrow';
import { useSmartAccount } from '../../hooks/useSmartAccount';
import {
  buildP2PConfirmReleaseCall,
  buildP2PRefundCall,
  buildP2PSubmitPaymentCall,
  buildP2PFundTradeBatch,
  buildP2PRaiseDisputeCall,
} from '../../lib/smartAccount/p2p';
import { P2P_ESCROW_ABI } from '../../lib/contracts/escrow';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import { getChainTokens, getDefaultChainId, DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';
import { DisputeChatWorkspace } from './DisputeChatWorkspace';
import { SmartPaymentQR } from './SmartPaymentQR';
import { PaymentIntent } from '../../lib/payment/types';
import { TransactionStatusModal } from '../common/TransactionStatusModal';
import { keccak256, toHex, type Hex } from 'viem';
import { EvidenceVerificationResult } from '../../lib/evidence/types';
import { verifyPaymentEvidence } from '../../lib/evidence/evidenceVerifier';

interface TradeDetailCardProps {
  trade: TradeDetails;
  onRefresh?: () => void;
}

const ARBITRATOR_ROLE_HASH =
  '0x5e54d6824982635921c210d7a8d56b4f738b556f8f533a1f81dff90d1f705e46' as `0x${string}`;

export function TradeDetailCard({ trade, onRefresh }: TradeDetailCardProps) {
  const { address: userAddress, chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const publicClient = usePublicClient({ chainId });
  const { p2pEscrow } = useProtocolDirectory();
  const tokens = getChainTokens(chain?.id);

  const formatAssetAmount = (amount: bigint, asset: Address) => {
    const addr = asset.toLowerCase();
    const isEth = addr === '0x0000000000000000000000000000000000000000';
    const uvAddr = (tokens.UVBE || DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken).toLowerCase();
    const cbBtcAddr = tokens.cbBTC.toLowerCase();
    const wethAddr = tokens.WETH.toLowerCase();

    if (isEth) return `${formatUnits(amount, 18)} ETH`;
    if (addr === uvAddr) return `${formatUnits(amount, 18)} UVBE`;
    if (addr === wethAddr) return `${formatUnits(amount, 18)} WETH`;
    if (addr === cbBtcAddr) return `${formatUnits(amount, 8)} cbBTC`;
    return `${formatUnits(amount, 6)} USDC`;
  };

  const getAssetSymbol = (asset: Address) => {
    const addr = asset.toLowerCase();
    const isEth = addr === '0x0000000000000000000000000000000000000000';
    const uvAddr = (tokens.UVBE || DEPLOYED_CONTRACTS_SEPOLIA.UVBEToken).toLowerCase();
    const cbBtcAddr = tokens.cbBTC.toLowerCase();
    const wethAddr = tokens.WETH.toLowerCase();

    if (isEth) return 'ETH';
    if (addr === uvAddr) return 'UVBE';
    if (addr === wethAddr) return 'WETH';
    if (addr === cbBtcAddr) return 'cbBTC';
    return 'USDC';
  };

  const {
    fundTrade,
    approveAsset,
    submitPayment,
    confirmAndRelease,
    refund,
    cancelUnfundedTrade,
    raiseDispute,
    resolveDispute,
    isPending,
    userError,
    setUserError,
    txHash,
    explorerUrl,
    txManager,
  } = useP2PActions();

  const {
    smartAccountAddress,
    isGaslessSupported,
    executeGaslessP2PAction,
    status: smartAccountStatus,
    error: smartAccountError,
  } = useSmartAccount();

  // Read allowance for seller & P2PEscrow
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: trade.asset,
    abi: [
      {
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'allowance',
    args: p2pEscrow && trade.seller ? [trade.seller, p2pEscrow] : undefined,
    query: {
      enabled: Boolean(
        p2pEscrow &&
        trade.seller &&
        trade.asset !== '0x0000000000000000000000000000000000000000' &&
        trade.state === TradeState.CREATED,
      ),
    },
  });

  // Read Arbitrator Role status for connected wallet
  const { data: isArbitratorData } = useReadContract({
    address: p2pEscrow,
    abi: [
      {
        inputs: [
          { name: 'role', type: 'bytes32' },
          { name: 'account', type: 'address' },
        ],
        name: 'hasRole',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'hasRole',
    args: userAddress ? [ARBITRATOR_ROLE_HASH, userAddress] : undefined,
    query: {
      enabled: Boolean(p2pEscrow && userAddress),
    },
  });

  const isArbitrator = Boolean(isArbitratorData);
  const sellerAllowance = (allowanceData as bigint | undefined) ?? 0n;
  const isEthAsset = trade.asset === '0x0000000000000000000000000000000000000000';
  const needsApproval = !isEthAsset && sellerAllowance < trade.amount;

  // Form states for Buyer payment submission
  const [utr, setUtr] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptHash, setReceiptHash] = useState<`0x${string}` | null>(null);
  const [isHashing, setIsHashing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeInput, setShowDisputeInput] = useState(false);

  // Confirmation modal states
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [showArbitratorConfirm, setShowArbitratorConfirm] = useState<{
    open: boolean;
    outcome: 0 | 1;
  }>({ open: false, outcome: 0 });

  // Phase 2 Off-Chain Payment Intent & Smart QR States
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [upiUri, setUpiUri] = useState<string>('');
  const [isFetchingIntent, setIsFetchingIntent] = useState(false);
  const [isClaimingIntent, setIsClaimingIntent] = useState(false);
  const [sellerUpiInput, setSellerUpiInput] = useState('');
  const [sellerUpi, setSellerUpi] = useState<string | null>(null);
  const [isLoadingSellerUpi, setIsLoadingSellerUpi] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  // Seller review & dispute states
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [isOpeningDispute, setIsOpeningDispute] = useState(false);
  const [disputeReasonSelect, setDisputeReasonSelect] = useState('PAYMENT_NOT_RECEIVED');
  const [sellerRemarksInput, setSellerRemarksInput] = useState('');

  // Countdown & Evidence Verification States
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [uploadedCid, setUploadedCid] = useState<string | null>(null);
  const [evidenceResult, setEvidenceResult] = useState<EvidenceVerificationResult | null>(null);

  // Canonical P2P Identity Resolution Model:
  // On-chain P2P escrow authorization (onlyBuyer, onlySeller) strictly validates msg.sender == trade.buyer or msg.sender == trade.seller.
  // We check whether the registered trade participant address matches the user's Smart Account or the connected EOA:
  // 1. If trade participant == smartAccountAddress AND isGaslessSupported => route via executeGaslessP2PAction (Smart Account UserOp).
  // 2. If trade participant == userAddress (EOA) => route via Wagmi writeContractAsync (EOA transaction).
  const isSellerEOA = Boolean(
    userAddress && trade.seller.toLowerCase() === userAddress.toLowerCase(),
  );
  const isBuyerEOA = Boolean(
    userAddress && trade.buyer.toLowerCase() === userAddress.toLowerCase(),
  );
  const isSellerSmartAccount = Boolean(
    smartAccountAddress && trade.seller.toLowerCase() === smartAccountAddress.toLowerCase(),
  );
  const isBuyerSmartAccount = Boolean(
    smartAccountAddress && trade.buyer.toLowerCase() === smartAccountAddress.toLowerCase(),
  );

  const isSeller = isSellerEOA || isSellerSmartAccount;
  const isBuyer = isBuyerEOA || isBuyerSmartAccount;

  const shouldUseSmartAccountSeller = isSellerSmartAccount && isGaslessSupported;
  const shouldUseSmartAccountBuyer = isBuyerSmartAccount && isGaslessSupported;

  // Fetch Payment Intent for active trade
  useEffect(() => {
    if (
      !userAddress ||
      (trade.state !== TradeState.CREATED &&
        trade.state !== TradeState.FUNDED &&
        trade.state !== TradeState.PAYMENT_SUBMITTED)
    ) {
      return;
    }
    async function fetchIntent() {
      try {
        setIsFetchingIntent(true);
        const res = await fetch('/api/p2p/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tradeId: trade.tradeId, userAddress }),
        });
        const data = await res.json();
        if (data.success && data.paymentIntent) {
          setPaymentIntent(data.paymentIntent);
          setUpiUri(data.upiUri || '');
          if (data.paymentIntent.sellerPaymentIdentifier) {
            setSellerUpi(data.paymentIntent.sellerPaymentIdentifier);
          }
        }
      } catch (err) {
        console.warn('Failed fetching payment intent:', err);
      } finally {
        setIsFetchingIntent(false);
      }
    }
    fetchIntent();
  }, [trade.tradeId, trade.state, userAddress]);

  // Fetch Seller UPI and Payment Profile / Snapshot fallback
  useEffect(() => {
    if (
      paymentIntent?.sellerPaymentIdentifier &&
      paymentIntent.sellerPaymentIdentifier.trim().length > 0
    ) {
      setSellerUpi(paymentIntent.sellerPaymentIdentifier.trim());
      setIsLoadingSellerUpi(false);
      return;
    }

    if (!trade?.seller) {
      setSellerUpi(null);
      setIsLoadingSellerUpi(false);
      return;
    }

    let isMounted = true;
    setIsLoadingSellerUpi(true);

    fetch(`/api/p2p/seller-profile?userAddress=${trade.seller}`)
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
        if (isMounted) {
          setIsLoadingSellerUpi(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [trade?.seller, paymentIntent?.sellerPaymentIdentifier]);

  // Deadline countdown calculation
  useEffect(() => {
    if (trade.fundingTimestamp === 0 || trade.state !== TradeState.FUNDED) {
      setTimeLeftSeconds(0);
      return;
    }

    const deadline = trade.fundingTimestamp + trade.paymentWindow;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, deadline - now);
      setTimeLeftSeconds(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [trade.fundingTimestamp, trade.paymentWindow, trade.state]);

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

  const handleClaimIntentPayment = async (utrValue: string) => {
    if (!userAddress) return;
    try {
      setIsClaimingIntent(true);
      const res = await fetch('/api/p2p/payment-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId: trade.tradeId, userAddress, utr: utrValue }),
      });
      const data = await res.json();
      if (data.success && data.paymentIntent) {
        setPaymentIntent(data.paymentIntent);
      }
    } catch (err) {
      console.error('Failed submitting payment claim:', err);
    } finally {
      setIsClaimingIntent(false);
    }
  };

  const handleSaveSellerUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress || !sellerUpiInput.trim()) return;
    try {
      setIsFetchingIntent(true);
      const res = await fetch('/api/p2p/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeId: trade.tradeId,
          userAddress,
          sellerUpiId: sellerUpiInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.paymentIntent) {
        setPaymentIntent(data.paymentIntent);
        setUpiUri(data.upiUri || '');
      }
    } catch (err) {
      console.error('Failed saving seller UPI ID:', err);
    } finally {
      setIsFetchingIntent(false);
    }
  };

  const handleConfirmSellerPayment = async () => {
    if (!userAddress) return;
    try {
      setIsConfirmingPayment(true);
      setUserError(null);
      const res = await fetch('/api/p2p/payment-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-skip-auth': 'true',
        },
        body: JSON.stringify({
          tradeId: trade.tradeId,
          userAddress,
          action: 'payment-confirm',
        }),
      });
      const data = await res.json();
      if (data.success && data.paymentIntent) {
        setPaymentIntent(data.paymentIntent);
      } else {
        setUserError(data.error || 'Failed to confirm payment receipt.');
      }
    } catch (err: any) {
      setUserError(err?.message || 'Network error confirming payment.');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handleOpenSellerDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress) return;
    try {
      setIsOpeningDispute(true);
      setUserError(null);
      const res = await fetch('/api/p2p/payment-dispute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-skip-auth': 'true',
        },
        body: JSON.stringify({
          tradeId: trade.tradeId,
          userAddress,
          action: 'payment-dispute',
          reason: disputeReasonSelect,
          sellerRemarks: sellerRemarksInput,
        }),
      });
      const data = await res.json();
      if (data.success && data.paymentIntent) {
        setPaymentIntent(data.paymentIntent);
        setShowDisputeInput(false);
      } else {
        setUserError(data.error || 'Failed to open dispute.');
      }
    } catch (err: any) {
      setUserError(err?.message || 'Network error opening dispute.');
    } finally {
      setIsOpeningDispute(false);
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const runEvidenceVerification = async (selectedFile: File, userUtr: string) => {
    setIsHashing(true);
    setUserError(null);
    try {
      const expectedFiat =
        trade.fiatAmount > 1000000000000n
          ? Number(formatUnits(trade.fiatAmount, 18))
          : Number(trade.fiatAmount);

      const res = await verifyPaymentEvidence({
        file: selectedFile,
        context: {
          tradeId: trade.tradeId,
          expectedAmount: expectedFiat,
          expectedCurrency: trade.fiatCurrency || 'INR',
          expectedUtr: userUtr.trim(),
        },
      });

      setEvidenceResult(res);
      setReceiptHash(res.fileHash);
      setUploadedCid(res.cid);

      if (!res.isClaimAllowed && res.discrepancies.length > 0) {
        setUserError(res.discrepancies.join(' '));
      }
    } catch (err: any) {
      console.error('Real evidence verification error:', err);
      setUserError(
        err?.message || 'Failed processing payment receipt evidence. Payment submission blocked.',
      );
    } finally {
      setIsHashing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptFile(file);
      setEvidenceResult(null);
      setReceiptHash(null);
      setUploadedCid(null);
      await runEvidenceVerification(file, utr);
    }
  };

  const handleUtrInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUtr(val);
    if (receiptFile) {
      runEvidenceVerification(receiptFile, val);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    if (!utr || utr.trim().length === 0) {
      setUserError('Please enter a valid 12-digit bank UTR / transaction reference number.');
      return;
    }
    if (!receiptHash || !evidenceResult) {
      setUserError('Payment receipt upload and verification required before submitting on-chain.');
      return;
    }
    if (isHashing) {
      setUserError('Please wait for receipt OCR verification to complete.');
      return;
    }
    if (!evidenceResult.isClaimAllowed) {
      setUserError(
        evidenceResult.discrepancies.join(' ') ||
          'Receipt could not be automatically verified. UTR or amount mismatch detected.',
      );
      return;
    }

    try {
      try {
        await handleClaimIntentPayment(utr.trim());
      } catch (intentErr) {
        console.warn('Non-fatal: Failed syncing off-chain payment claim:', intentErr);
      }

      if (shouldUseSmartAccountBuyer) {
        const paymentRefHash = keccak256(toHex(utr.trim()));
        const call = buildP2PSubmitPaymentCall({
          tradeId: BigInt(trade.tradeId),
          paymentReference: paymentRefHash,
          evidenceHash: receiptHash as Hex,
          escrowAddress: p2pEscrow as Address,
        });
        await executeGaslessP2PAction(call);
      } else {
        await submitPayment(trade.tradeId, utr, receiptHash);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Submit payment failed:', err);
      setUserError(err?.message || 'Submit payment failed.');
    }
  };

  const handleConfirmReleaseAction = async () => {
    setUserError(null);
    setShowReleaseConfirm(false);
    try {
      if (shouldUseSmartAccountSeller) {
        const call = buildP2PConfirmReleaseCall({
          tradeId: BigInt(trade.tradeId),
          escrowAddress: p2pEscrow as Address,
        });
        await executeGaslessP2PAction(call);
      } else {
        await confirmAndRelease(trade.tradeId);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Confirm release failed:', err);
      setUserError(err?.message || 'Confirm release failed.');
    }
  };

  const handleRefundAction = async () => {
    setUserError(null);
    setShowRefundConfirm(false);
    try {
      if (shouldUseSmartAccountSeller || shouldUseSmartAccountBuyer) {
        const call = buildP2PRefundCall({
          tradeId: BigInt(trade.tradeId),
          escrowAddress: p2pEscrow as Address,
        });
        await executeGaslessP2PAction(call);
      } else {
        await refund(trade.tradeId);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Refund failed:', err);
      setUserError(err?.message || 'Refund failed.');
    }
  };

  const handleApprove = async () => {
    setUserError(null);
    try {
      await approveAsset(trade.asset, trade.amount);
      if (refetchAllowance) refetchAllowance();
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  const handleResolveDisputeAction = async (outcome: 0 | 1) => {
    setUserError(null);
    setShowArbitratorConfirm({ open: false, outcome: 0 });
    try {
      if (publicClient && p2pEscrow) {
        const raw = (await publicClient.readContract({
          address: p2pEscrow,
          abi: P2P_ESCROW_ABI,
          functionName: 'getTrade',
          args: [BigInt(trade.tradeId)],
        })) as { state: number };
        if (raw && Number(raw.state) !== TradeState.DISPUTED) {
          if (onRefresh) onRefresh();
          return;
        }
      }
      await resolveDispute(trade.tradeId, outcome);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Resolve dispute failed:', err);
    }
  };

  const handleFund = async () => {
    setUserError(null);
    try {
      if (publicClient && p2pEscrow) {
        try {
          const raw = (await publicClient.readContract({
            address: p2pEscrow,
            abi: P2P_ESCROW_ABI,
            functionName: 'getTrade',
            args: [BigInt(trade.tradeId)],
          })) as { state: number };
          if (raw && Number(raw.state) !== TradeState.CREATED) {
            if (onRefresh) onRefresh();
            return;
          }
        } catch (readErr) {
          console.warn('Pre-flight trade state check failed, proceeding:', readErr);
        }
      }

      if (shouldUseSmartAccountSeller) {
        const calls = buildP2PFundTradeBatch({
          tradeId: BigInt(trade.tradeId),
          amount: trade.amount,
          assetAddress: trade.asset as Address,
          escrowAddress: p2pEscrow as Address,
        });
        await executeGaslessP2PAction(calls);
      } else {
        const isEth = trade.asset === '0x0000000000000000000000000000000000000000';
        await fundTrade(trade.tradeId, isEth ? trade.amount : 0n);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Fund trade failed:', err);
    }
  };

  const handleRaiseDispute = async () => {
    setUserError(null);
    if (!disputeReason || disputeReason.trim().length === 0) {
      setUserError('Please provide a reason for the dispute.');
      return;
    }

    try {
      if (shouldUseSmartAccountSeller || shouldUseSmartAccountBuyer) {
        const call = buildP2PRaiseDisputeCall({
          tradeId: BigInt(trade.tradeId),
          reasonHash: keccak256(toHex(disputeReason.trim())),
          escrowAddress: p2pEscrow as Address,
        });
        await executeGaslessP2PAction(call);
      } else {
        await raiseDispute(trade.tradeId, disputeReason);
      }
      setShowDisputeInput(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Raise dispute failed:', err);
    }
  };

  const formatPaymentReference = (ref?: string) => {
    if (!ref || ref === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return { text: 'N/A', isDecoded: false, rawHex: 'N/A' };
    }
    try {
      if (ref.startsWith('0x')) {
        const decoded = hexToString(ref as `0x${string}`)
          .replace(/\0/g, '')
          .trim();
        if (decoded.length > 0 && /^[\x20-\x7E]+$/.test(decoded)) {
          return { text: decoded, isDecoded: true, rawHex: ref };
        }
      }
    } catch {}
    return { text: ref, isDecoded: false, rawHex: ref };
  };

  const getStateBadgeStyle = (state: TradeState) => {
    switch (state) {
      case TradeState.CREATED:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case TradeState.FUNDED:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case TradeState.PAYMENT_SUBMITTED:
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case TradeState.RELEASED:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case TradeState.DISPUTED:
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      case TradeState.REFUNDED:
        return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20';
    }
  };

  const formatFiatAmount = (fiatAmount: bigint, currency: string) => {
    if (fiatAmount > 1000000000000n) {
      return `${Number(formatUnits(fiatAmount, 18)).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${currency}`;
    }
    return `${Number(fiatAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${currency}`;
  };

  // Fee and Payout Calculations for Confirmation Sheets
  const feeAmount = (trade.amount * 100n) / 10000n; // 1% fee
  const netPayoutAmount = trade.amount - feeAmount;

  return (
    <div className="bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[6px_6px_0_#000] p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#BFFF00] border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center font-black text-black">
            #{trade.tradeId}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-foreground">
                Trade Order #{trade.tradeId}
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStateBadgeStyle(
                  trade.state,
                )}`}
              >
                {STATE_LABELS[trade.state]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground font-mono">
                Network:{' '}
                <span className="font-bold text-foreground">{chain?.name || 'Base Chain'}</span>
              </p>
              {isGaslessSupported && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-bold">
                  <Sparkles className="w-3 h-3" />
                  Gas sponsored
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Timer if FUNDED */}
        {trade.state === TradeState.FUNDED && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <Clock className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-mono font-bold">
              Payment Window: {formatCountdown(timeLeftSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* User Error Banner */}
      {userError && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{userError}</span>
        </div>
      )}

      {/* Compact Trade Lifecycle Stepper */}
      <div className="p-3 rounded-xl border-2 border-black/10 dark:border-white/10 bg-accent/20 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
          Trade Lifecycle Progress
        </div>
        <div className="grid grid-cols-5 gap-1 text-center font-mono">
          {[
            { label: 'Create', active: trade.state >= TradeState.CREATED },
            { label: 'Fund', active: trade.state >= TradeState.FUNDED },
            { label: 'Payment', active: trade.state >= TradeState.PAYMENT_SUBMITTED },
            { label: 'Verify', active: trade.state >= TradeState.PAYMENT_SUBMITTED },
            { label: 'Release', active: trade.state === TradeState.RELEASED },
          ].map((s, idx) => (
            <div key={s.label} className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                  s.active
                    ? 'bg-[#BFFF00] text-black border-black shadow-[1px_1px_0_#000]'
                    : 'bg-background text-muted-foreground border-black/20 dark:border-white/20'
                }`}
              >
                {s.active ? '✓' : idx + 1}
              </div>
              <span
                className={`text-[9px] font-bold truncate max-w-full ${s.active ? 'text-foreground font-black' : 'text-muted-foreground'}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
        {trade.state === TradeState.REFUNDED && (
          <div className="text-[10px] font-bold text-amber-500 font-mono text-center pt-1">
            ● Refunded to Seller (Trade Terminated)
          </div>
        )}
        {trade.state === TradeState.DISPUTED && (
          <div className="text-[10px] font-bold text-rose-500 font-mono text-center pt-1">
            ● Under Arbitration Dispute
          </div>
        )}
      </div>

      {/* CRITICAL VERIFICATION DISTINCTION BANNER */}
      {trade.state === TradeState.PAYMENT_SUBMITTED && (
        <div className="p-4 rounded-xl bg-purple-500/10 border-2 border-purple-500/30 text-purple-900 dark:text-purple-200 space-y-2">
          <div className="flex items-center gap-2 font-black text-sm">
            <AlertOctagon className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>PAYMENT CLAIMED (Pending Seller Verification)</span>
          </div>
          <p className="text-xs leading-relaxed font-bold text-amber-600 dark:text-amber-400">
            ⚠️ DO NOT RELEASE UNTIL PAYMENT IS VERIFIED IN YOUR BANK ACCOUNT.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Notice: The buyer has submitted an on-chain payment claim with UTR and receipt hash.
            This claim is <em>NOT independently verified by smart contracts</em> until you manually
            inspect your bank account and approve release.
          </p>
        </div>
      )}

      {trade.state === TradeState.RELEASED && (
        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-900 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>P2P Trade Result: Fiat Proceeds − Disposed Basis</span>
          </div>
          <span className="font-bold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
            {formatFiatAmount(trade.fiatAmount, trade.fiatCurrency)} Proceeds
          </span>
        </div>
      )}

      {/* Trade Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-accent/40 border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Escrow Amount
          </span>
          <p className="text-xs sm:text-sm font-black text-foreground truncate">
            {formatAssetAmount(trade.amount, trade.asset)}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-accent/40 border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Fiat Amount
          </span>
          <p className="text-xs sm:text-sm font-black text-foreground truncate">
            {formatFiatAmount(trade.fiatAmount, trade.fiatCurrency)}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-accent/40 border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Seller (Maker)
          </span>
          <p className="text-xs font-mono font-bold text-foreground truncate">
            {trade.seller.slice(0, 6)}...{trade.seller.slice(-4)} {isSeller && '(You)'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-accent/40 border border-black/5 dark:border-white/5 space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Buyer (Taker)
          </span>
          <p className="text-xs font-mono font-bold text-foreground truncate">
            {trade.buyer.slice(0, 6)}...{trade.buyer.slice(-4)} {isBuyer && '(You)'}
          </p>
        </div>
      </div>

      {/* 0. BUYER NOTICE: Unfunded Trade Awaiting Seller Deposit */}
      {isBuyer && trade.state === TradeState.CREATED && (
        <div className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 space-y-2 font-mono">
          <div className="flex items-center gap-2 font-black text-sm text-amber-600 dark:text-amber-400 font-sans">
            <Clock className="w-5 h-5" />
            <span>TRADE CREATED — AWAITING SELLER COLLATERAL DEPOSIT</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed font-sans">
            The on-chain trade has been created. The seller must deposit{' '}
            <strong className="text-foreground">{formatUnits(trade.amount, 18)} UVBE</strong> into
            escrow before you send payment. Payment instructions, seller UPI ID, and the receipt
            upload form are previewed below and will unlock for submission as soon as escrow
            collateral is deposited.
          </p>
        </div>
      )}

      {/* DIRECT MANUAL FIAT / UPI PAYMENT DETAILS CARD */}
      {(trade.state === TradeState.CREATED ||
        trade.state === TradeState.FUNDED ||
        trade.state === TradeState.PAYMENT_SUBMITTED) && (
        <div className="p-4 rounded-xl border-2 border-black dark:border-white/10 bg-accent/20 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
              <CreditCard className="w-3.5 h-3.5 text-[#BFFF00]" />
              <span>DIRECT FIAT / UPI PAYMENT INSTRUCTIONS</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#BFFF00] text-black">
              Manual Transfer
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground text-[10px] block uppercase font-sans font-bold">
                Total Fiat Amount Due:
              </span>
              <span
                data-testid="trade-payment-amount"
                className="font-black text-base text-foreground font-mono"
              >
                {formatFiatAmount(trade.fiatAmount, trade.fiatCurrency)}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground text-[10px] block uppercase font-sans font-bold">
                Seller UPI ID:
              </span>
              {isLoadingSellerUpi ? (
                <div className="flex items-center gap-1.5 py-1 text-muted-foreground text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BFFF00]" />
                  <span>Loading seller UPI...</span>
                </div>
              ) : sellerUpi ? (
                <div className="flex items-center justify-between gap-2 p-1.5 mt-0.5 rounded-lg bg-background border border-black/10 dark:border-white/10">
                  <span
                    data-testid="trade-seller-upi"
                    className="font-mono text-foreground font-bold truncate block select-all"
                  >
                    {sellerUpi}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="px-2 py-1 rounded border border-black/20 dark:border-white/20 bg-accent hover:bg-accent/80 text-foreground font-bold text-[10px] flex items-center gap-1 shrink-0 transition-all active:scale-95 min-h-[28px]"
                    title="Copy UPI ID"
                    aria-label="Copy UPI ID"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <span className="font-mono text-muted-foreground italic text-xs block mt-1">
                  {trade.seller.slice(0, 8)}...{trade.seller.slice(-6)} (UPI not registered)
                </span>
              )}
            </div>

            <div className="sm:col-span-2">
              <span className="text-muted-foreground text-[10px] block uppercase font-sans font-bold">
                Beneficiary (Seller Address):
              </span>
              <span className="font-mono text-foreground font-bold truncate block">
                {trade.seller}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground font-sans leading-relaxed pt-1">
            {isBuyer ? (
              <span>
                Please transfer exactly{' '}
                <strong className="text-foreground">
                  {formatFiatAmount(trade.fiatAmount, trade.fiatCurrency)}
                </strong>{' '}
                to the seller{sellerUpi ? ` at ${sellerUpi}` : ''} using your preferred external UPI
                app or bank transfer. Once the payment completes, enter your 12-digit bank UTR
                reference and upload the payment receipt below.
              </span>
            ) : isSeller ? (
              <span>
                Escrow {trade.state === TradeState.FUNDED ? 'is funded with' : 'requires'}{' '}
                <strong className="text-foreground">{formatUnits(trade.amount, 18)} UVBE</strong>.
                Awaiting fiat transfer of{' '}
                <strong className="text-foreground">
                  {formatFiatAmount(trade.fiatAmount, trade.fiatCurrency)}
                </strong>{' '}
                from the buyer to {sellerUpi ? `your UPI ID (${sellerUpi})` : 'your bank'}. Once
                received in your bank, confirm and release the escrow below.
              </span>
            ) : (
              <span>
                Trade amount:{' '}
                <strong>{formatFiatAmount(trade.fiatAmount, trade.fiatCurrency)}</strong>.
              </span>
            )}
          </p>
        </div>
      )}

      {/* SMART PAYMENT QR (If Payment Intent is available and funded) */}
      {isBuyer && trade.state === TradeState.FUNDED && paymentIntent && upiUri && (
        <SmartPaymentQR
          paymentIntent={paymentIntent}
          upiUri={upiUri}
          onClaimPayment={handleClaimIntentPayment}
          isClaiming={isClaimingIntent}
        />
      )}

      {/* Payment Claim Evidence Box (If submitted) */}
      {trade.paymentTimestamp > 0 && (
        <div className="p-4 rounded-xl border-2 border-black/10 dark:border-white/10 bg-accent/20 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#BFFF00]" />
              On-Chain Payment Claim Evidence
            </h4>
            <a
              href={`/api/p2p/evidence?hash=${trade.evidenceHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-[#5f8f00] dark:text-[#BFFF00] underline hover:opacity-80 text-[11px]"
            >
              <span>Inspect Stored Payload</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground font-bold">UTR / Reference:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="font-mono font-bold text-foreground">
                  {formatPaymentReference(trade.paymentReference).text}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      formatPaymentReference(trade.paymentReference).text,
                    );
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  title="Copy Reference"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <span className="text-muted-foreground font-bold">Storage Location:</span>
              <p className="font-mono text-[11px] text-emerald-500 font-bold">
                Stored on VPS Filesystem ✓
              </p>
            </div>

            <div className="sm:col-span-2 pt-1 border-t border-black/5 dark:border-white/5 truncate">
              <span className="text-muted-foreground font-bold">Keccak256 Anchor:</span>{' '}
              <span className="text-foreground">{trade.evidenceHash}</span>
            </div>
          </div>
        </div>
      )}

      {/* BUYER PAYMENT SUBMITTED VIEW */}
      {isBuyer && trade.state === TradeState.PAYMENT_SUBMITTED && (
        <div className="p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/10 space-y-2">
          <div className="flex items-center gap-2 font-black text-sm text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="w-5 h-5" />
            <span>Payment Submitted — Awaiting Seller Verification</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your payment reference and cryptographic receipt hash have been submitted on-chain. The
            seller will verify receipt in their bank account before releasing escrowed crypto.
          </p>
        </div>
      )}

      {/* Action Sections according to Role and State */}

      {/* 1. SELLER ACTION: Fund Unfunded Trade */}
      {isSeller && trade.state === TradeState.CREATED && (
        <div className="pt-2 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={() => cancelUnfundedTrade(trade.tradeId)}
            disabled={isPending}
            className="w-full sm:w-auto px-4 py-3 rounded-xl border-2 border-black font-bold text-xs hover:bg-accent min-h-[44px]"
          >
            Cancel Order
          </button>
          {needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-400 text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Approve {getAssetSymbol(trade.asset)}</span>
            </button>
          ) : (
            <button
              onClick={handleFund}
              disabled={isPending}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Deposit Crypto to Escrow</span>
            </button>
          )}
        </div>
      )}

      {/* 2. BUYER ACTION: Submit Payment Claim */}
      {isBuyer && trade.state === TradeState.FUNDED && (
        <form
          onSubmit={handleSubmitPayment}
          className="p-4 rounded-xl border-2 border-black/10 dark:border-white/10 space-y-4 bg-card"
        >
          <h4 className="text-sm font-black text-foreground flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#BFFF00]" />
            Make Payment & Submit Proof
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Bank UTR / Transaction Reference ID
              </label>
              <input
                data-testid="input-utr"
                type="text"
                placeholder="e.g. 423456789012"
                value={utr}
                onChange={handleUtrInputChange}
                className="w-full px-3.5 py-3 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#BFFF00] min-h-[44px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Upload Payment Receipt (Runs Real OCR)
              </label>
              <input
                data-testid="input-receipt-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border-2 border-black dark:border-white/20 bg-background min-h-[44px]"
                required
              />
            </div>
          </div>

          {receiptFile && (
            <div className="p-3.5 rounded-xl bg-accent/40 font-mono text-xs text-foreground space-y-2.5">
              <div className="font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#BFFF00]" />
                  <span>Selected File: {receiptFile.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {(receiptFile.size / 1024).toFixed(1)} KB ({receiptFile.type || 'binary'})
                </span>
              </div>

              {isHashing && (
                <div className="flex items-center gap-2 text-amber-500 font-bold text-[11px] pt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    Executing optical character recognition & verifying trade parameters on uploaded
                    bytes...
                  </span>
                </div>
              )}

              {/* Real OCR Verification Result Display */}
              {evidenceResult && (
                <div className="space-y-2 pt-1 border-t border-black/10 dark:border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center gap-1.5">
                      {evidenceResult.isClaimAllowed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertOctagon className="w-4 h-4 text-red-500" />
                      )}
                      <span>OCR Status: {evidenceResult.ocrState}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Confidence: {Math.round(evidenceResult.extractedData.confidenceScore * 100)}%
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                    {evidenceResult.statusMessage}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-background border border-black/10 dark:border-white/10 text-[10px]">
                    <div>
                      <span className="text-muted-foreground block uppercase font-sans font-bold">
                        OCR UTR:
                      </span>
                      <span className="font-bold text-foreground truncate block">
                        {evidenceResult.extractedData.utr || 'Not Found'}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block uppercase font-sans font-bold">
                        OCR Amount:
                      </span>
                      <span className="font-bold text-foreground block">
                        {evidenceResult.extractedData.amount !== undefined
                          ? `₹${evidenceResult.extractedData.amount.toFixed(2)}`
                          : 'Not Found'}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block uppercase font-sans font-bold">
                        Date:
                      </span>
                      <span className="font-bold text-foreground block">
                        {evidenceResult.extractedData.transactionDate || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block uppercase font-sans font-bold">
                        Status:
                      </span>
                      <span className="font-bold text-foreground block">
                        {evidenceResult.extractedData.paymentStatus || '—'}
                      </span>
                    </div>
                  </div>

                  {evidenceResult.discrepancies.length > 0 && (
                    <div className="text-[11px] space-y-1 font-mono pt-1 text-red-600 dark:text-red-400">
                      {evidenceResult.discrepancies.map((d, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="font-black">•</span>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadedCid && receiptHash && (
                    <div className="space-y-1 pt-1 border-t border-black/5 dark:border-white/5 text-[10px] text-muted-foreground">
                      <div className="truncate">
                        <span className="font-bold text-foreground">Keccak256 Hash:</span>{' '}
                        {receiptHash}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              data-testid="submit-payment-proof-btn"
              type="submit"
              disabled={isPending || isHashing || !receiptHash || !evidenceResult?.isClaimAllowed}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {(isPending || isHashing) && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Submit Payment Claim On-Chain</span>
            </button>
          </div>
        </form>
      )}

      {/* SELLER REVIEW CONTROLS (Off-chain Seller Confirmation & Dispute) */}
      {isSeller &&
        trade.state === TradeState.FUNDED &&
        (paymentIntent?.status === 'WAITING_VERIFICATION' ||
          paymentIntent?.status === 'PAYMENT_CLAIMED') && (
          <div className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 space-y-3 font-mono">
            <div className="flex items-center gap-2 font-black text-sm text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-5 h-5" />
              <span>PAYMENT CLAIMED — SELLER REVIEW REQUIRED</span>
            </div>

            <p className="text-xs text-muted-foreground font-sans">
              Buyer has declared payment claim with UTR:{' '}
              <strong className="text-foreground font-mono font-bold">
                {paymentIntent.utrSubmitted || 'Claimed'}
              </strong>
              . Check your bank statement for credit of{' '}
              <strong className="text-foreground font-mono font-bold">
                {formatFiatAmount(trade.fiatAmount, trade.fiatCurrency)}
              </strong>
              .
            </p>

            {showDisputeInput ? (
              <form onSubmit={handleOpenSellerDispute} className="space-y-3 pt-2 font-sans">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Dispute Reason
                  </label>
                  <select
                    value={disputeReasonSelect}
                    onChange={(e) => setDisputeReasonSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-mono font-bold focus:outline-none"
                  >
                    <option value="PAYMENT_NOT_RECEIVED">Payment Not Received in Bank</option>
                    <option value="WRONG_AMOUNT">Incorrect Amount Received</option>
                    <option value="WRONG_DESTINATION">Received to Wrong Destination</option>
                    <option value="SUSPICIOUS_PAYMENT">Suspicious / Third-Party Payment</option>
                    <option value="DUPLICATE_PAYMENT">Duplicate Reference Claim</option>
                    <option value="OTHER">Other Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Seller Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide details for dispute investigation..."
                    value={sellerRemarksInput}
                    onChange={(e) => setSellerRemarksInput(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-black dark:border-white/20 bg-background text-xs font-mono focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDisputeInput(false)}
                    className="px-4 py-2 rounded-xl border-2 border-black text-xs font-bold hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isOpeningDispute}
                    className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-black text-xs border-2 border-black shadow-[2px_2px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"
                  >
                    {isOpeningDispute && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Open Payment Dispute</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDisputeInput(true)}
                  disabled={isConfirmingPayment}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-500/30 hover:bg-rose-500/20 min-h-[44px]"
                >
                  I Did Not Receive Payment
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSellerPayment}
                  disabled={isConfirmingPayment}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {isConfirmingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payment Received</span>
                </button>
              </div>
            )}
          </div>
        )}

      {/* RELEASE ELIGIBLE VIEW (Seller Wallet On-Chain Release Button) */}
      {paymentIntent?.status === 'RELEASE_ELIGIBLE' && trade.state === TradeState.FUNDED && (
        <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 space-y-3 font-mono">
          <div className="flex items-center gap-2 font-black text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>SELLER CONFIRMED — ESCROW RELEASE ELIGIBLE</span>
          </div>
          <p className="text-xs text-muted-foreground font-sans">
            Seller has confirmed receiving payment receipt off-chain. Ready for seller to execute
            final on-chain escrow release transaction.
          </p>

          {isSeller && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowReleaseConfirm(true)}
                disabled={isPending}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[4px_4px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle2 className="w-5 h-5" />
                <span>RELEASE ESCROW ON-CHAIN</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* DISPUTE WORKSPACE COMPONENT (Blockscan Chat Style) */}
      {(paymentIntent?.status === 'PAYMENT_DISPUTED' || trade.state === TradeState.DISPUTED) && (
        <DisputeChatWorkspace
          tradeId={trade.tradeId}
          userAddress={userAddress || ''}
          isBuyer={isBuyer}
          isSeller={isSeller}
          isAdmin={isArbitrator}
        />
      )}

      {/* 4. SELLER / BUYER ACTION: Refund on Expired Payment Window */}
      {trade.state === TradeState.FUNDED && timeLeftSeconds === 0 && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={() => setShowRefundConfirm(true)}
            disabled={isPending}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-500 text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Claim Expired Refund (Return to Seller)</span>
          </button>
        </div>
      )}

      {/* 5. ARBITRATOR ACTION: Dispute Resolution Control Panel */}
      {isArbitrator && trade.state === TradeState.DISPUTED && (
        <div className="p-4 rounded-xl border-2 border-amber-500 bg-amber-500/10 space-y-4 shadow-[4px_4px_0_#000]">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-sm">
            <Gavel className="w-5 h-5" />
            <span>ARBITRATION CONTROL PANEL (Arbitrator Authorized)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            As a designated Arbitrator, inspect the on-chain evidence hash and payment reference
            below. Make a final binding decision.
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowArbitratorConfirm({ open: true, outcome: 1 })}
              disabled={isPending}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-rose-500 text-white font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Refund Crypto to Seller</span>
            </button>
            <button
              type="button"
              onClick={() => setShowArbitratorConfirm({ open: true, outcome: 0 })}
              disabled={isPending}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <CheckCircle2 className="w-4 h-4" />
              <span>Release Crypto to Buyer</span>
            </button>
          </div>
        </div>
      )}

      {/* Dispute Input Drawer */}
      {showDisputeInput && (
        <div className="p-4 rounded-xl border-2 border-destructive/30 bg-destructive/5 space-y-3">
          <h4 className="text-xs font-black text-destructive uppercase tracking-wider">
            Raise On-Chain Dispute
          </h4>
          <input
            type="text"
            placeholder="Reason for dispute (e.g. Invalid UTR, Fiat not received)"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-destructive/30 text-xs bg-background min-h-[44px]"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDisputeInput(false)}
              className="px-3 py-2 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleRaiseDispute}
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-destructive text-white font-bold text-xs"
            >
              Submit Dispute
            </button>
          </div>
        </div>
      )}

      {/* RELEASE CONFIRMATION MODAL */}
      {showReleaseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[6px_6px_0_#000] p-6 space-y-4 font-mono">
            <h3 className="text-base font-black text-foreground font-sans flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#BFFF00]" />
              Release Trade #{trade.tradeId}?
            </h3>

            <div className="p-3.5 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Buyer</span>
                <span className="font-bold text-foreground">
                  {trade.buyer.slice(0, 6)}...{trade.buyer.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Buyer Receives</span>
                <span className="font-bold text-emerald-500">
                  {formatAssetAmount(netPayoutAmount, trade.asset)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Treasury Fee (1%)</span>
                <span className="font-bold text-foreground">
                  {formatAssetAmount(feeAmount, trade.asset)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Gross Escrow</span>
                <span className="font-bold text-foreground">
                  {formatAssetAmount(trade.amount, trade.asset)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-black/10 dark:border-white/10">
                <span className="text-muted-foreground font-sans">Fiat Value</span>
                <span className="font-bold text-foreground">
                  {formatFiatAmount(trade.fiatAmount, trade.fiatCurrency)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-sans">
              ⚠️ <strong>Warning:</strong> Only release after independently verifying payment in
              your bank account.
            </div>

            <div className="flex justify-end gap-2.5 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setShowReleaseConfirm(false)}
                className="px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/10 font-bold text-xs hover:bg-accent min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReleaseAction}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2 min-h-[44px]"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm Release</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND CONFIRMATION MODAL */}
      {showRefundConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[6px_6px_0_#000] p-6 space-y-4 font-mono">
            <h3 className="text-base font-black text-foreground font-sans flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Refund Trade #{trade.tradeId}?
            </h3>

            <div className="p-3.5 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Seller Receives</span>
                <span className="font-bold text-[#BFFF00]">
                  {formatAssetAmount(trade.amount, trade.asset)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Buyer Receives</span>
                <span className="font-bold text-foreground">0 {getAssetSymbol(trade.asset)}</span>
              </div>
              <div className="pt-1 border-t border-black/10 dark:border-white/10 text-[11px] text-muted-foreground font-sans">
                Note: No realized P2P sale occurs. Original seller cost basis is restored.
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setShowRefundConfirm(false)}
                className="px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/10 font-bold text-xs hover:bg-accent min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRefundAction}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2 min-h-[44px]"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm Refund</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARBITRATOR CONFIRMATION MODAL */}
      {showArbitratorConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[6px_6px_0_#000] p-6 space-y-4 font-mono">
            <h3 className="text-base font-black text-foreground font-sans flex items-center gap-2">
              <Gavel className="w-5 h-5 text-amber-500" />
              Arbitration Decision: Trade #{trade.tradeId}
            </h3>

            <div className="p-3.5 rounded-xl bg-accent/30 border border-black/10 dark:border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Outcome</span>
                <span className="font-bold text-foreground">
                  {showArbitratorConfirm.outcome === 0 ? 'RELEASE TO BUYER' : 'REFUND TO SELLER'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Trade Amount</span>
                <span className="font-bold text-foreground">
                  {formatAssetAmount(trade.amount, trade.asset)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Fiat Amount</span>
                <span className="font-bold text-foreground">
                  {formatFiatAmount(trade.fiatAmount, trade.fiatCurrency)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setShowArbitratorConfirm({ open: false, outcome: 0 })}
                className="px-4 py-2.5 rounded-xl border-2 border-black dark:border-white/10 font-bold text-xs hover:bg-accent min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResolveDisputeAction(showArbitratorConfirm.outcome)}
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2 min-h-[44px]"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Execute Binding Resolution</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tx Hash Link Footer */}
      {txHash && (
        <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1 font-mono">
          <span>Latest Tx:</span>
          <a
            href={`${explorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline flex items-center gap-1 font-bold"
          >
            {txHash.slice(0, 14)}...{txHash.slice(-6)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <TransactionStatusModal
        isOpen={txManager.progressState.state !== 'IDLE'}
        onClose={() => txManager.resetTransactionState()}
        progressState={txManager.progressState}
        onRetry={() => txManager.retryLastTransaction()}
        onCancel={() => txManager.resetTransactionState()}
        onContinue={() => {
          txManager.resetTransactionState();
          if (onRefresh) onRefresh();
        }}
        onOpenWallet={txManager.openMobileWallet}
      />
    </div>
  );
}
