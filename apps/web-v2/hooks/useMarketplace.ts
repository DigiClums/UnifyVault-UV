'use client';

import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract, useReadContract } from 'wagmi';
import { parseUnits, stringToHex, hexToString, type Address } from 'viem';
import {
  MARKETPLACE_ABI,
  OrderDetails,
  OrderSide,
  OrderStatus,
} from '../lib/contracts/marketplace';
import { DEPLOYED_CONTRACTS_SEPOLIA } from '../constants';

export function getMarketplaceAddress(): `0x${string}` {
  return (
    (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS as `0x${string}`) ||
    DEPLOYED_CONTRACTS_SEPOLIA.Marketplace
  );
}

/**
 * Hook to read all orders from the Marketplace smart contract
 */
export function useMarketplaceOrders() {
  const publicClient = usePublicClient();
  const marketplaceAddress = getMarketplaceAddress();
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!publicClient) return;
    try {
      setIsLoading(true);
      setError(null);

      const countBigInt = (await publicClient.readContract({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'getOrderCount',
      })) as bigint;

      const count = Number(countBigInt);
      const loadedOrders: OrderDetails[] = [];

      for (let i = 1; i <= count; i++) {
        try {
          const raw = (await publicClient.readContract({
            address: marketplaceAddress,
            abi: MARKETPLACE_ABI,
            functionName: 'getOrder',
            args: [BigInt(i)],
          })) as {
            orderId: bigint;
            maker: `0x${string}`;
            side: number;
            asset: `0x${string}`;
            amount: bigint;
            filledAmount: bigint;
            remainingAmount: bigint;
            price: bigint;
            fiatCurrency: `0x${string}`;
            minLimit: bigint;
            maxLimit: bigint;
            status: number;
            createdAt: bigint;
          };

          const fiatCurrencyStr = hexToString(raw.fiatCurrency).replace(/\0/g, '') || 'INR';

          loadedOrders.push({
            orderId: Number(raw.orderId),
            maker: raw.maker,
            side: Number(raw.side) as OrderSide,
            asset: raw.asset,
            amount: raw.amount,
            filledAmount: raw.filledAmount,
            remainingAmount: raw.remainingAmount,
            price: raw.price,
            fiatCurrency: fiatCurrencyStr,
            minLimit: raw.minLimit,
            maxLimit: raw.maxLimit,
            status: Number(raw.status) as OrderStatus,
            createdAt: Number(raw.createdAt),
          });
        } catch (err) {
          console.warn(`Failed loading order #${i}:`, err);
        }
      }

      setOrders(loadedOrders.reverse()); // Most recent first
    } catch (err: any) {
      console.error('Error fetching marketplace orders:', err);
      setError(err?.message || 'Failed to fetch marketplace orders.');
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, marketplaceAddress]);

  return { orders, isLoading, error, refetch: fetchOrders };
}

/**
 * Hook to execute Marketplace write transactions (Create, Cancel, Match)
 */
export function useMarketplaceActions() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const marketplaceAddress = getMarketplaceAddress();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBuyOrder = async (params: {
    asset: `0x${string}`;
    amount: bigint;
    price: bigint;
    fiatCurrency?: string;
    minLimit?: bigint;
    maxLimit?: bigint;
  }) => {
    if (!userAddress) throw new Error('Wallet not connected.');
    try {
      setIsSubmitting(true);
      setError(null);

      const currencyBytes32 = stringToHex((params.fiatCurrency || 'INR').padEnd(32, '\0')).slice(
        0,
        66,
      ) as `0x${string}`;

      const txHash = await writeContractAsync({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'createBuyOrder',
        args: [
          params.asset,
          params.amount,
          params.price,
          currencyBytes32,
          params.minLimit || 0n,
          params.maxLimit || params.amount,
        ],
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }
      return txHash;
    } catch (err: any) {
      setError(err?.message || 'Create buy order transaction failed.');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const createSellOrder = async (params: {
    asset: `0x${string}`;
    amount: bigint;
    price: bigint;
    fiatCurrency?: string;
    minLimit?: bigint;
    maxLimit?: bigint;
  }) => {
    if (!userAddress) throw new Error('Wallet not connected.');
    try {
      setIsSubmitting(true);
      setError(null);

      const currencyBytes32 = stringToHex((params.fiatCurrency || 'INR').padEnd(32, '\0')).slice(
        0,
        66,
      ) as `0x${string}`;

      const txHash = await writeContractAsync({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'createSellOrder',
        args: [
          params.asset,
          params.amount,
          params.price,
          currencyBytes32,
          params.minLimit || 0n,
          params.maxLimit || params.amount,
        ],
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }
      return txHash;
    } catch (err: any) {
      setError(err?.message || 'Create sell order transaction failed.');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelOrder = async (orderId: number) => {
    if (!userAddress) throw new Error('Wallet not connected.');
    try {
      setIsSubmitting(true);
      setError(null);

      const txHash = await writeContractAsync({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'cancelOrder',
        args: [BigInt(orderId)],
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }
      return txHash;
    } catch (err: any) {
      setError(err?.message || 'Cancel order transaction failed.');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchOrders = async (params: {
    buyOrderId: number;
    sellOrderId: number;
    matchAmount: bigint;
  }) => {
    if (!userAddress) throw new Error('Wallet not connected.');
    try {
      setIsSubmitting(true);
      setError(null);

      const txHash = await writeContractAsync({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'matchOrders',
        args: [BigInt(params.buyOrderId), BigInt(params.sellOrderId), params.matchAmount],
      });

      let escrowTradeId: number | null = null;

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        // Parse EscrowTradeLinked event from logs
        for (const log of receipt.logs) {
          try {
            if (log.address.toLowerCase() === marketplaceAddress.toLowerCase()) {
              // Log event topic matching EscrowTradeLinked
              const tradeIdHex = log.topics[2];
              if (tradeIdHex) {
                escrowTradeId = Number(BigInt(tradeIdHex));
                break;
              }
            }
          } catch {
            // Ignore non-matching logs
          }
        }
      }

      return { txHash, escrowTradeId };
    } catch (err: any) {
      setError(err?.message || 'Match orders transaction failed.');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    createBuyOrder,
    createSellOrder,
    cancelOrder,
    matchOrders,
    isSubmitting,
    error,
  };
}
