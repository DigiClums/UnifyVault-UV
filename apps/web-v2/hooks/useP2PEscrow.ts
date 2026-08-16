'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi';
import {
  formatUnits,
  parseUnits,
  encodePacked,
  keccak256,
  stringToHex,
  hexToString,
  type Address,
} from 'viem';
import { useProtocolDirectory } from './useProtocolDirectory';
import { P2P_ESCROW_ABI } from '../lib/contracts/escrow';
import {
  DEPLOYED_CONTRACTS_SEPOLIA,
  getProtocolDirectoryAddress,
  getDefaultChainId,
  getExplorerBaseUrl,
  DEFAULT_P2P_FIAT_CURRENCY,
} from '../constants';

export enum TradeState {
  NONE = 0,
  CREATED = 1,
  FUNDED = 2,
  PAYMENT_SUBMITTED = 3,
  DISPUTED = 4,
  RELEASED = 5,
  REFUNDED = 6,
  CANCELLED = 7,
}

export const STATE_LABELS: Record<TradeState, string> = {
  [TradeState.NONE]: 'Uninitialized',
  [TradeState.CREATED]: 'Created (Unfunded)',
  [TradeState.FUNDED]: 'Escrow Funded (Awaiting Payment)',
  [TradeState.PAYMENT_SUBMITTED]: 'Payment Claimed (Buyer Submitted)',
  [TradeState.DISPUTED]: 'Under Dispute',
  [TradeState.RELEASED]: 'Released & Completed',
  [TradeState.REFUNDED]: 'Refunded to Seller',
  [TradeState.CANCELLED]: 'Cancelled',
};

export interface TradeDetails {
  tradeId: number;
  buyer: Address;
  seller: Address;
  asset: Address;
  amount: bigint;
  fiatAmount: bigint;
  fiatCurrency: string;
  state: TradeState;
  paymentWindow: number;
  fundingTimestamp: number;
  paymentTimestamp: number;
  paymentReference: string;
  evidenceHash: string;
  disputeInitiator: Address;
}

/**
 * Generate client-side cryptographic SHA256 / Keccak256 hash of receipt file or payload
 */
export async function generateReceiptHash(file: File): Promise<`0x${string}`> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const hashHex = keccak256(bytes);
  return hashHex;
}

/**
 * Hook to read trade state directly from blockchain without database reliance
 */
export function useP2PTrade(tradeId?: number) {
  const { chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const { p2pEscrow } = useProtocolDirectory();

  const isSaneId =
    typeof tradeId === 'number' &&
    Number.isInteger(tradeId) &&
    tradeId > 0 &&
    tradeId <= Number.MAX_SAFE_INTEGER &&
    tradeId < 1_000_000_000;

  const { data, isError, isLoading, refetch } = useReadContract({
    address: p2pEscrow,
    abi: P2P_ESCROW_ABI,
    functionName: 'getTrade',
    args: isSaneId && tradeId ? [BigInt(tradeId)] : undefined,
    chainId,
    query: {
      enabled: Boolean(p2pEscrow && isSaneId),
      refetchInterval: 10_000,
    },
  });

  const raw = data as unknown as
    | {
        tradeId: bigint;
        buyer: Address;
        seller: Address;
        asset: Address;
        amount: bigint;
        fiatAmount: bigint;
        fiatCurrency: `0x${string}`;
        state: number;
        paymentWindow: bigint;
        fundingTimestamp: bigint;
        paymentTimestamp: bigint;
        paymentReference: `0x${string}`;
        evidenceHash: `0x${string}`;
        disputeInitiator: Address;
      }
    | undefined;

  const trade: TradeDetails | undefined = raw
    ? {
        tradeId: Number(raw.tradeId),
        buyer: raw.buyer,
        seller: raw.seller,
        asset: raw.asset,
        amount: raw.amount,
        fiatAmount: raw.fiatAmount,
        fiatCurrency: raw.fiatCurrency
          ? hexToString(raw.fiatCurrency).replace(/\0/g, '') || DEFAULT_P2P_FIAT_CURRENCY
          : DEFAULT_P2P_FIAT_CURRENCY,
        state: raw.state as TradeState,
        paymentWindow: Number(raw.paymentWindow),
        fundingTimestamp: Number(raw.fundingTimestamp),
        paymentTimestamp: Number(raw.paymentTimestamp),
        paymentReference: raw.paymentReference,
        evidenceHash: raw.evidenceHash,
        disputeInitiator: raw.disputeInitiator,
      }
    : undefined;

  return { trade, isLoading, isError, refetch };
}

/**
 * Hook to query all protocol P2P trades live from Base RPC event logs
 */
export function useP2PTrades() {
  const { chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const publicClient = usePublicClient({ chainId });
  const { p2pEscrow } = useProtocolDirectory();
  const [trades, setTrades] = useState<TradeDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!publicClient || !p2pEscrow || p2pEscrow === '0x0000000000000000000000000000000000000000') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const totalTradesCount = (await publicClient.readContract({
        address: p2pEscrow,
        abi: P2P_ESCROW_ABI,
        functionName: 'totalTrades',
      })) as bigint;

      const items: TradeDetails[] = [];
      for (let id = 1; id <= Number(totalTradesCount); id++) {
        try {
          const raw = (await publicClient.readContract({
            address: p2pEscrow,
            abi: P2P_ESCROW_ABI,
            functionName: 'getTrade',
            args: [BigInt(id)],
          })) as unknown as {
            tradeId: bigint;
            buyer: Address;
            seller: Address;
            asset: Address;
            amount: bigint;
            fiatAmount: bigint;
            fiatCurrency: `0x${string}`;
            state: number;
            paymentWindow: bigint;
            fundingTimestamp: bigint;
            paymentTimestamp: bigint;
            paymentReference: `0x${string}`;
            evidenceHash: `0x${string}`;
            disputeInitiator: Address;
          };

          if (raw) {
            items.push({
              tradeId: Number(raw.tradeId),
              buyer: raw.buyer,
              seller: raw.seller,
              asset: raw.asset,
              amount: raw.amount,
              fiatAmount: raw.fiatAmount,
              fiatCurrency: raw.fiatCurrency
                ? hexToString(raw.fiatCurrency).replace(/\0/g, '') || DEFAULT_P2P_FIAT_CURRENCY
                : DEFAULT_P2P_FIAT_CURRENCY,
              state: raw.state as TradeState,
              paymentWindow: Number(raw.paymentWindow),
              fundingTimestamp: Number(raw.fundingTimestamp),
              paymentTimestamp: Number(raw.paymentTimestamp),
              paymentReference: raw.paymentReference,
              evidenceHash: raw.evidenceHash,
              disputeInitiator: raw.disputeInitiator,
            });
          }
        } catch (err) {
          console.warn(`Failed reading trade ${id}:`, err);
        }
      }

      setTrades(items.reverse());
    } catch (err) {
      console.warn('Error fetching P2P trades from chain:', err);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, p2pEscrow]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  return { trades, isLoading, refetch: fetchTrades };
}

import { useTransactionManager } from './useTransactionManager';

/**
 * State-changing Wagmi write actions for P2PEscrow
 */
export function useP2PActions() {
  const { p2pEscrow } = useProtocolDirectory();
  const { chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const publicClient = usePublicClient({ chainId });
  const explorerUrl = getExplorerBaseUrl(chain?.id);

  const { writeContractAsync, isPending } = useWriteContract();
  const txManager = useTransactionManager();

  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [userError, setUserError] = useState<string | null>(null);

  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const parseTxError = (err: unknown): string => {
    const message = (err as { message?: string })?.message || String(err);
    if (message.includes('User rejected') || message.includes('user rejected')) {
      return 'Transaction rejected in wallet.';
    }
    if (message.includes('TradePaymentWindowExpired')) {
      return 'Payment deadline has expired.';
    }
    if (message.includes('EvidenceHashAlreadyUsed')) {
      return 'Receipt evidence hash has already been used in another trade.';
    }
    if (message.includes('InvalidTradeState')) {
      return 'Invalid trade state for this operation.';
    }
    if (message.includes('UnauthorizedDisputeResolver')) {
      return 'Only designated Arbitrators can resolve disputes.';
    }
    if (message.includes('insufficient funds')) {
      return 'Insufficient wallet balance to execute transaction.';
    }
    return message.slice(0, 150);
  };

  const createTrade = async (params: {
    buyer: Address;
    seller: Address;
    asset: Address;
    amount: bigint;
    fiatAmount: bigint;
    fiatCurrency: string;
    paymentWindowSeconds: number;
    valueEth?: bigint;
  }) => {
    if (!p2pEscrow) throw new Error('P2P Escrow contract address not available.');
    setUserError(null);
    try {
      const currencyBytes32 = stringToHex(params.fiatCurrency, { size: 32 });
      const hash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: p2pEscrow,
            abi: P2P_ESCROW_ABI,
            functionName: 'createTrade',
            args: [
              {
                buyer: params.buyer,
                seller: params.seller,
                asset: params.asset,
                amount: params.amount,
                fiatAmount: params.fiatAmount,
                fiatCurrency: currencyBytes32,
                paymentWindow: BigInt(params.paymentWindowSeconds),
              },
            ],
            value: params.valueEth || 0n,
          }),
        {
          stepName: 'Create Escrow Trade',
          stepDescription: 'Creating non-custodial smart contract trade lock on-chain...',
        },
      );
      setTxHash(hash);
      return hash;
    } catch (err: unknown) {
      const parsed = parseTxError(err);
      setUserError(parsed);
      throw err;
    }
  };

  const fundTrade = async (tradeId: number, valueEth?: bigint) => {
    if (!p2pEscrow) throw new Error('P2P Escrow contract address not available.');
    setUserError(null);

    if (publicClient) {
      try {
        const raw = (await publicClient.readContract({
          address: p2pEscrow,
          abi: P2P_ESCROW_ABI,
          functionName: 'getTrade',
          args: [BigInt(tradeId)],
        })) as { state: number };
        if (raw && Number(raw.state) !== TradeState.CREATED) {
          throw new Error('Trade is already funded on-chain.');
        }
      } catch (err: unknown) {
        const msg = (err as { message?: string })?.message || String(err);
        if (msg.includes('already funded')) throw err;
      }
    }

    try {
      const hash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: p2pEscrow,
            abi: P2P_ESCROW_ABI,
            functionName: 'fundTrade',
            args: [BigInt(tradeId)],
            value: valueEth || 0n,
          }),
        {
          stepName: 'Fund Escrow Collateral',
          stepDescription: `Funding crypto collateral for Trade #${tradeId}...`,
        },
      );
      setTxHash(hash);
      return hash;
    } catch (err: unknown) {
      const parsed = parseTxError(err);
      setUserError(parsed);
      throw err;
    }
  };

  const submitPayment = async (
    tradeId: number,
    utrReference: string,
    evidenceHash: `0x${string}`,
  ) => {
    if (!p2pEscrow) throw new Error('P2P Escrow contract address not available.');
    setUserError(null);
    try {
      const utrBytes32 = stringToHex(utrReference, { size: 32 });
      const hash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: p2pEscrow,
            abi: P2P_ESCROW_ABI,
            functionName: 'submitPayment',
            args: [BigInt(tradeId), utrBytes32, evidenceHash],
          }),
        {
          stepName: 'Submit Payment Claim',
          stepDescription: `Submitting UTR reference & evidence hash on-chain for Trade #${tradeId}...`,
        },
      );
      setTxHash(hash);
      return hash;
    } catch (err: unknown) {
      const parsed = parseTxError(err);
      setUserError(parsed);
      throw err;
    }
  };

  const confirmAndRelease = async (tradeId: number) => {
    if (!p2pEscrow) throw new Error('P2P Escrow contract address not available.');
    setUserError(null);
    try {
      const hash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: p2pEscrow,
            abi: P2P_ESCROW_ABI,
            functionName: 'confirmAndRelease',
            args: [BigInt(tradeId)],
          }),
        {
          stepName: 'Confirm & Release Escrow',
          stepDescription: `Releasing locked crypto collateral to Buyer for Trade #${tradeId}...`,
        },
      );
      setTxHash(hash);
      return hash;
    } catch (err: unknown) {
      const parsed = parseTxError(err);
      setUserError(parsed);
      throw err;
    }
  };

  const refund = async (tradeId: number) => {
    if (!p2pEscrow) throw new Error('P2P Escrow contract address not available.');
    setUserError(null);
    try {
      const hash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: p2pEscrow,
            abi: P2P_ESCROW_ABI,
            functionName: 'refund',
            args: [BigInt(tradeId)],
          }),
        {
          stepName: 'Refund Escrow',
          stepDescription: `Refunding locked crypto collateral to Seller for Trade #${tradeId}...`,
        },
      );
      setTxHash(hash);
      return hash;
    } catch (err: unknown) {
      const parsed = parseTxError(err);
      setUserError(parsed);
      throw err;
    }
  };

  const cancelUnfundedTrade = async (tradeId: number) => {
    if (!p2pEscrow) throw new Error('P2P Escrow contract address not available.');
    setUserError(null);
    try {
      const hash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: p2pEscrow,
            abi: P2P_ESCROW_ABI,
            functionName: 'cancelUnfundedTrade',
            args: [BigInt(tradeId)],
          }),
        {
          stepName: 'Cancel Unfunded Trade',
          stepDescription: `Cancelling unfunded Trade #${tradeId}...`,
        },
      );
      setTxHash(hash);
      return hash;
    } catch (err: unknown) {
      const parsed = parseTxError(err);
      setUserError(parsed);
      throw err;
    }
  };

  const raiseDispute = async (tradeId: number, reasonText: string) => {
    if (!p2pEscrow) throw new Error('P2P Escrow contract address not available.');
    setUserError(null);
    try {
      const reasonBytes32 = stringToHex(reasonText, { size: 32 });
      const hash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: p2pEscrow,
            abi: P2P_ESCROW_ABI,
            functionName: 'raiseDispute',
            args: [BigInt(tradeId), reasonBytes32],
          }),
        {
          stepName: 'Raise On-Chain Dispute',
          stepDescription: `Initiating dispute for Trade #${tradeId}...`,
        },
      );
      setTxHash(hash);
      return hash;
    } catch (err: unknown) {
      const parsed = parseTxError(err);
      setUserError(parsed);
      throw err;
    }
  };

  const approveAsset = async (assetAddress: Address, amount: bigint) => {
    if (!p2pEscrow) throw new Error('P2P Escrow contract address not available.');
    setUserError(null);
    try {
      const hash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: assetAddress,
            abi: [
              {
                inputs: [
                  { name: 'spender', type: 'address' },
                  { name: 'amount', type: 'uint256' },
                ],
                name: 'approve',
                outputs: [{ name: '', type: 'bool' }],
                stateMutability: 'nonpayable',
                type: 'function',
              },
            ],
            functionName: 'approve',
            args: [p2pEscrow, amount],
          }),
        {
          stepName: 'Approve Token Allowance',
          stepDescription: 'Approving P2PEscrow contract spending allowance...',
        },
      );
      setTxHash(hash);
      return hash;
    } catch (err: unknown) {
      const parsed = parseTxError(err);
      setUserError(parsed);
      throw err;
    }
  };

  const resolveDispute = async (tradeId: number, outcome: 0 | 1) => {
    if (!p2pEscrow) throw new Error('P2P Escrow contract address not available.');
    setUserError(null);
    try {
      const hash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: p2pEscrow,
            abi: P2P_ESCROW_ABI,
            functionName: 'resolveDispute',
            args: [BigInt(tradeId), outcome],
          }),
        {
          stepName: 'Resolve Dispute',
          stepDescription: `Executing dispute outcome for Trade #${tradeId}...`,
        },
      );
      setTxHash(hash);
      return hash;
    } catch (err: unknown) {
      const parsed = parseTxError(err);
      setUserError(parsed);
      throw err;
    }
  };

  return {
    createTrade,
    fundTrade,
    approveAsset,
    submitPayment,
    confirmAndRelease,
    refund,
    cancelUnfundedTrade,
    raiseDispute,
    resolveDispute,
    isPending:
      isPending ||
      isWaiting ||
      txManager.progressState.state === 'WALLET_REQUEST' ||
      txManager.progressState.state === 'PREPARING' ||
      txManager.progressState.state === 'CONFIRMING',
    isSuccess: isSuccess || txManager.progressState.state === 'CONFIRMED',
    txHash: txHash || txManager.progressState.txHash || undefined,
    explorerUrl,
    userError,
    setUserError,
    txManager,
  };
}
