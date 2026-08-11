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
} from 'lucide-react';
import {
  TradeDetails,
  TradeState,
  STATE_LABELS,
  useP2PActions,
  generateReceiptHash,
} from '../../hooks/useP2PEscrow';
import { P2P_ESCROW_ABI } from '../../lib/contracts/escrow';
import { useProtocolDirectory } from '../../hooks/useProtocolDirectory';
import { getChainTokens, DEPLOYED_CONTRACTS_SEPOLIA } from '../../constants';

interface TradeDetailCardProps {
  trade: TradeDetails;
  onRefresh?: () => void;
}

const ARBITRATOR_ROLE_HASH =
  '0x5e54d6824982635921c210d7a8d56b4f738b556f8f533a1f81dff90d1f705e46' as `0x${string}`;

export function TradeDetailCard({ trade, onRefresh }: TradeDetailCardProps) {
  const { address: userAddress, chain } = useAccount();
  const publicClient = usePublicClient();
  const { p2pEscrow } = useProtocolDirectory();
  const tokens = getChainTokens(chain?.id);

  const formatAssetAmount = (amount: bigint, asset: Address) => {
    const addr = asset.toLowerCase();
    const isEth = addr === '0x0000000000000000000000000000000000000000';
    const uvAddr = (tokens.UVBTCETH || DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken).toLowerCase();
    const cbBtcAddr = tokens.cbBTC.toLowerCase();
    const wethAddr = tokens.WETH.toLowerCase();

    if (isEth) return `${formatUnits(amount, 18)} ETH`;
    if (addr === uvAddr) return `${formatUnits(amount, 18)} UVBTCETH`;
    if (addr === wethAddr) return `${formatUnits(amount, 18)} WETH`;
    if (addr === cbBtcAddr) return `${formatUnits(amount, 8)} cbBTC`;
    return `${formatUnits(amount, 6)} USDC`;
  };

  const getAssetSymbol = (asset: Address) => {
    const addr = asset.toLowerCase();
    const isEth = addr === '0x0000000000000000000000000000000000000000';
    const uvAddr = (tokens.UVBTCETH || DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken).toLowerCase();
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
  } = useP2PActions();

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

  const isSeller = userAddress?.toLowerCase() === trade.seller.toLowerCase();
  const isBuyer = userAddress?.toLowerCase() === trade.buyer.toLowerCase();

  // Deadline countdown calculation
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);

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

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptFile(file);
      setIsHashing(true);
      try {
        const hash = await generateReceiptHash(file);
        setReceiptHash(hash);
      } catch (err) {
        setUserError('Failed generating cryptographic receipt hash.');
      } finally {
        setIsHashing(false);
      }
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    if (!utr || utr.trim().length === 0) {
      setUserError('Please enter a valid UTR / transaction reference number.');
      return;
    }
    if (!receiptHash) {
      setUserError('Please upload a payment receipt to generate cryptographic hash.');
      return;
    }

    try {
      await submitPayment(trade.tradeId, utr, receiptHash);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Submit payment failed:', err);
    }
  };

  const handleConfirmRelease = async () => {
    setUserError(null);
    try {
      await confirmAndRelease(trade.tradeId);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Confirm release failed:', err);
    }
  };

  const handleRefund = async () => {
    setUserError(null);
    try {
      await refund(trade.tradeId);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Refund failed:', err);
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
      // Pre-flight check: read fresh on-chain trade state directly from smart contract
      if (publicClient && p2pEscrow) {
        try {
          const raw = (await publicClient.readContract({
            address: p2pEscrow,
            abi: P2P_ESCROW_ABI,
            functionName: 'getTrade',
            args: [BigInt(trade.tradeId)],
          })) as { state: number };
          if (raw && Number(raw.state) !== TradeState.CREATED) {
            // Trade is already funded on-chain — refresh UI instead of sending redundant transaction
            if (onRefresh) onRefresh();
            return;
          }
        } catch (readErr) {
          console.warn('Pre-flight trade state check failed, proceeding:', readErr);
        }
      }

      const isEth = trade.asset === '0x0000000000000000000000000000000000000000';
      await fundTrade(trade.tradeId, isEth ? trade.amount : 0n);
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
      await raiseDispute(trade.tradeId, disputeReason);
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
    return `${formatUnits(fiatAmount, 2)} ${currency}`;
  };

  return (
    <div className="bg-background border-2 border-black dark:border-white/10 rounded-2xl shadow-[6px_6px_0_#000] p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#BFFF00] border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center font-black text-black">
            #{trade.tradeId}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-foreground">Trade Order #{trade.tradeId}</h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStateBadgeStyle(
                  trade.state,
                )}`}
              >
                {STATE_LABELS[trade.state]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Network:{' '}
              <span className="font-bold text-foreground">{chain?.name || 'Base Chain'}</span>
            </p>
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

      {/* CRITICAL VERIFICATION DISTINCTION BANNER */}
      {trade.state === TradeState.PAYMENT_SUBMITTED && (
        <div className="p-4 rounded-xl bg-purple-500/10 border-2 border-purple-500/30 text-purple-900 dark:text-purple-200 space-y-1.5">
          <div className="flex items-center gap-2 font-black text-sm">
            <AlertOctagon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>PAYMENT CLAIMED (Pending Seller Verification)</span>
          </div>
          <p className="text-xs leading-relaxed">
            <strong>Notice:</strong> The buyer has submitted an on-chain payment claim with UTR and
            receipt hash. This claim is <em>NOT independently verified</em> until the seller
            manually inspects their bank account and approves release on-chain.
          </p>
        </div>
      )}

      {trade.state === TradeState.RELEASED && (
        <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-900 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>P2P Trade Performance: P2P Fiat Proceeds − Disposed Share Basis</span>
          </div>
          <span className="font-bold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
            {formatFiatAmount(trade.fiatAmount, trade.fiatCurrency)} Proceeds
          </span>
        </div>
      )}

      {/* Trade Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-3.5 rounded-xl bg-accent/40 border border-black/5 dark:border-white/5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Escrow Amount
          </span>
          <p className="text-sm font-black text-foreground">
            {formatAssetAmount(trade.amount, trade.asset)}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-accent/40 border border-black/5 dark:border-white/5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Fiat Amount Expected
          </span>
          <p className="text-sm font-black text-foreground">
            {formatFiatAmount(trade.fiatAmount, trade.fiatCurrency)}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-accent/40 border border-black/5 dark:border-white/5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Seller (Escrow Maker)
          </span>
          <p className="text-xs font-mono font-bold text-foreground truncate">
            {trade.seller} {isSeller && '(You)'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-accent/40 border border-black/5 dark:border-white/5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Buyer (Taker)
          </span>
          <p className="text-xs font-mono font-bold text-foreground truncate">
            {trade.buyer} {isBuyer && '(You)'}
          </p>
        </div>
      </div>

      {/* Payment Claim Evidence Box (If submitted) */}
      {trade.paymentTimestamp > 0 && (
        <div className="p-4 rounded-xl border-2 border-black/10 dark:border-white/10 bg-accent/20 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#BFFF00]" />
            On-Chain Payment Claim Evidence
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground font-bold">UTR / Reference:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="font-mono font-bold text-foreground">
                  {formatPaymentReference(trade.paymentReference).text}
                </p>
                {formatPaymentReference(trade.paymentReference).isDecoded && (
                  <span
                    className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]"
                    title={trade.paymentReference}
                  >
                    ({trade.paymentReference.slice(0, 8)}...)
                  </span>
                )}
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
              <span className="text-muted-foreground font-bold">Receipt Hash (SHA256/Keccak):</span>
              <p className="font-mono text-[11px] text-foreground truncate">{trade.evidenceHash}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Sections according to Role and State */}

      {/* 1. SELLER ACTION: Fund Unfunded Trade */}
      {isSeller && trade.state === TradeState.CREATED && (
        <div className="pt-2 flex justify-end gap-3">
          <button
            onClick={() => cancelUnfundedTrade(trade.tradeId)}
            disabled={isPending}
            className="px-4 py-2 rounded-xl border-2 border-black font-bold text-xs hover:bg-accent"
          >
            Cancel Order
          </button>
          {needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Approve {getAssetSymbol(trade.asset)}</span>
            </button>
          ) : (
            <button
              onClick={handleFund}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"
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
            Submit Off-Chain Payment Claim
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Bank UTR / Transaction Reference ID
              </label>
              <input
                type="text"
                placeholder="e.g. UTR987654321"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border-2 border-black dark:border-white/20 bg-background text-sm font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Upload Payment Receipt (Generates Hash)
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border-2 border-black dark:border-white/20 bg-background"
                required
              />
            </div>
          </div>

          {receiptHash && (
            <div className="p-2.5 rounded-lg bg-accent/40 font-mono text-[11px] text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="truncate">Evidence Hash: {receiptHash}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || isHashing || !receiptHash}
              className="px-5 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {(isPending || isHashing) && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Submit Payment Claim On-Chain</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. SELLER ACTION: Confirm and Release */}
      {isSeller && trade.state === TradeState.PAYMENT_SUBMITTED && (
        <div className="pt-2 flex flex-wrap justify-end gap-3">
          <button
            onClick={() => setShowDisputeInput(!showDisputeInput)}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive font-bold text-xs border border-destructive/20 hover:bg-destructive/20"
          >
            Raise Dispute
          </button>

          <button
            onClick={handleConfirmRelease}
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Fiat Received & Release Crypto</span>
          </button>
        </div>
      )}

      {/* 4. SELLER / BUYER ACTION: Refund on Expired Payment Window */}
      {trade.state === TradeState.FUNDED && timeLeftSeconds === 0 && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleRefund}
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"
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
            <span>ARBITRATION CONTROL PANEL (Arbitrator Access Authorized)</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            As a designated Arbitrator, inspect the on-chain evidence hash and payment reference
            below. Make a final binding decision to release escrowed crypto to the Buyer or refund
            to the Seller.
          </p>
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to REFUND Trade #${trade.tradeId} to the Seller?`,
                  )
                ) {
                  handleResolveDisputeAction(1); // REFUND_TO_SELLER
                }
              }}
              disabled={isPending}
              className="px-4 py-2.5 rounded-xl bg-rose-500 text-white font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Refund Crypto to Seller</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to RELEASE Trade #${trade.tradeId} to the Buyer?`,
                  )
                ) {
                  handleResolveDisputeAction(0); // RELEASE_TO_BUYER
                }
              }}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-[#BFFF00] text-black font-black text-xs border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-2"
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
            className="w-full px-3 py-2 rounded-xl border border-destructive/30 text-xs bg-background"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDisputeInput(false)}
              className="px-3 py-1.5 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleRaiseDispute}
              disabled={isPending}
              className="px-4 py-1.5 rounded-lg bg-destructive text-white font-bold text-xs"
            >
              Submit Dispute
            </button>
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
    </div>
  );
}
