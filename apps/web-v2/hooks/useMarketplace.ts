'use client';

import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { parseUnits, stringToHex, hexToString, getAddress, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import {
  MARKETPLACE_ABI,
  OrderDetails,
  OrderSide,
  OrderStatus,
} from '../lib/contracts/marketplace';
import {
  DEPLOYED_CONTRACTS_SEPOLIA,
  DEPLOYED_CONTRACTS_MAINNET,
  getDefaultChainId,
} from '../constants';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function isNonZeroAddress(addr?: string): boolean {
  if (!addr) return false;
  const clean = addr.trim().toLowerCase();
  return (
    clean !== '' &&
    clean !== ZERO_ADDRESS &&
    clean !== '0x0' &&
    clean.startsWith('0x') &&
    clean.length === 42
  );
}

/**
 * Hardened Chain-Specific Marketplace Address Resolver
 * Maps chainId to network-specific marketplace deployment.
 * Fails fast with clean error on unsupported networks or zero address.
 */
export function getMarketplaceAddress(chainId?: number): `0x${string}` {
  const targetChain = chainId || getDefaultChainId();
  if (targetChain === baseSepolia.id) {
    const raw =
      [
        process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_SEPOLIA,
        process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS,
        DEPLOYED_CONTRACTS_SEPOLIA.Marketplace,
      ].find(isNonZeroAddress) || '0x5978273B16467E99f45984Dc8AE9048ba05a30F7';

    const address = getAddress(raw) as `0x${string}`;
    if (!isNonZeroAddress(address)) {
      throw new Error(
        `Marketplace contract address is zero or unconfigured for Base Sepolia (Chain ID: 84532).`,
      );
    }
    return address;
  }
  if (targetChain === base.id) {
    const raw = [
      process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_MAINNET,
      process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS,
      DEPLOYED_CONTRACTS_MAINNET.Marketplace,
    ].find(isNonZeroAddress);

    if (!raw || !isNonZeroAddress(raw)) {
      throw new Error(
        `Marketplace contract address is zero or unconfigured for Base Mainnet (Chain ID: 8453).`,
      );
    }
    const address = getAddress(raw) as `0x${string}`;
    if (!isNonZeroAddress(address)) {
      throw new Error(
        `Marketplace contract address is zero or unconfigured for Base Mainnet (Chain ID: 8453).`,
      );
    }
    return address;
  }
  throw new Error(
    `Unsupported network (Chain ID: ${targetChain}). Please switch your wallet network to Base Sepolia (84532) or Base Mainnet (8453).`,
  );
}

/**
 * Gas & Zero-Address Preflight Verification Function
 * Checks native ETH balance and simulates transaction execution BEFORE calling writeContract.
 */
export async function performMarketplaceGasPreflight(params: {
  publicClient: any;
  userAddress?: `0x${string}`;
  marketplaceAddress: `0x${string}`;
  abi: any;
  functionName: string;
  args: any[];
}) {
  const { publicClient, userAddress, marketplaceAddress, abi, functionName, args } = params;

  if (
    !marketplaceAddress ||
    marketplaceAddress === ZERO_ADDRESS ||
    marketplaceAddress.toLowerCase() === ZERO_ADDRESS
  ) {
    throw new Error('Marketplace contract address is zero or unconfigured.');
  }

  if (!publicClient || !userAddress) return;

  let nativeBalance = 0n;
  try {
    nativeBalance = await publicClient.getBalance({ address: userAddress });
  } catch (balErr) {
    console.warn('Failed to fetch native ETH balance for gas preflight:', balErr);
  }

  if (nativeBalance === 0n) {
    throw new Error('Insufficient ETH for Base network gas.');
  }

  try {
    await publicClient.simulateContract({
      account: userAddress,
      address: marketplaceAddress,
      abi,
      functionName,
      args,
    });
  } catch (simErr: any) {
    const simMsg = (simErr?.message || simErr?.shortMessage || '').toLowerCase();
    if (
      simMsg.includes('insufficient') ||
      simMsg.includes('gas') ||
      simMsg.includes('miners') ||
      simMsg.includes('exceeds balance') ||
      simMsg.includes('funds') ||
      simMsg.includes('eth(base) is not enough')
    ) {
      throw new Error('Insufficient ETH for Base network gas.');
    }
    throw simErr;
  }
}

/**
 * Hook to read all orders from the Marketplace smart contract
 */
export function useMarketplaceOrders() {
  const { chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const publicClient = usePublicClient({ chainId });

  let marketplaceAddress: `0x${string}`;
  try {
    marketplaceAddress = getMarketplaceAddress(chainId);
  } catch {
    marketplaceAddress = DEPLOYED_CONTRACTS_SEPOLIA.Marketplace;
  }

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

import { useTransactionManager } from './useTransactionManager';

/**
 * Hook to execute Marketplace write transactions (Create, Cancel, Match)
 * Enforces strict chain validation & uses production Web3 transaction state machine.
 */
export function useMarketplaceActions() {
  const { address: userAddress, chain } = useAccount();
  const activeChainId = chain?.id || getDefaultChainId();
  const publicClient = usePublicClient({ chainId: activeChainId });
  const { writeContractAsync } = useWriteContract();
  const txManager = useTransactionManager();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateChain = useCallback(() => {
    if (!userAddress) throw new Error('Wallet not connected.');
    const currentChainId = chain?.id || activeChainId;
    if (currentChainId !== baseSepolia.id && currentChainId !== base.id) {
      throw new Error(
        `Unsupported network (Chain ID: ${currentChainId}). Please switch your wallet network to Base Sepolia (84532) or Base Mainnet (8453).`,
      );
    }
    return currentChainId;
  }, [userAddress, chain?.id, activeChainId]);

  const createBuyOrder = async (params: {
    asset: `0x${string}`;
    amount: bigint;
    price: bigint;
    fiatCurrency?: string;
    minLimit?: bigint;
    maxLimit?: bigint;
  }) => {
    const currentChainId = validateChain();
    const marketplaceAddress = getMarketplaceAddress(currentChainId);

    if (!isNonZeroAddress(marketplaceAddress)) {
      const msg = `Marketplace contract address is zero or unconfigured for chain ID ${currentChainId}.`;
      setError(msg);
      throw new Error(msg);
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const currencyBytes32 = stringToHex((params.fiatCurrency || 'INR').padEnd(32, '\0')).slice(
        0,
        66,
      ) as `0x${string}`;

      const args: [`0x${string}`, bigint, bigint, `0x${string}`, bigint, bigint] = [
        params.asset,
        params.amount,
        params.price,
        currencyBytes32,
        params.minLimit || 0n,
        params.maxLimit || params.amount,
      ];

      await performMarketplaceGasPreflight({
        publicClient,
        userAddress,
        marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'createBuyOrder',
        args,
      });

      let orderId: number | null = null;

      const txHash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: marketplaceAddress,
            abi: MARKETPLACE_ABI,
            functionName: 'createBuyOrder',
            args,
          }),
        {
          stepName: 'Create Buy Order',
          stepDescription: 'Broadcasting limit buy order to Marketplace smart contract...',
        },
      );

      if (publicClient) {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

          for (const log of receipt.logs) {
            try {
              if (log.address.toLowerCase() === marketplaceAddress.toLowerCase() && log.topics[1]) {
                orderId = Number(BigInt(log.topics[1]));
                break;
              }
            } catch {
              // Ignore non-matching logs
            }
          }
        } catch {
          // Receipt warning handled by txManager
        }

        if (!orderId) {
          try {
            const countBigInt = (await publicClient.readContract({
              address: marketplaceAddress,
              abi: MARKETPLACE_ABI,
              functionName: 'getOrderCount',
            })) as bigint;
            orderId = Number(countBigInt);
          } catch {
            // Ignore
          }
        }
      }

      return { txHash, orderId };
    } catch (err: any) {
      const errMsg = err?.message || 'Create buy order transaction failed.';
      setError(errMsg);
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
    const currentChainId = validateChain();
    const marketplaceAddress = getMarketplaceAddress(currentChainId);

    if (!isNonZeroAddress(marketplaceAddress)) {
      const msg = `Marketplace contract address is zero or unconfigured for chain ID ${currentChainId}.`;
      setError(msg);
      throw new Error(msg);
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const currencyBytes32 = stringToHex((params.fiatCurrency || 'INR').padEnd(32, '\0')).slice(
        0,
        66,
      ) as `0x${string}`;

      const args: [`0x${string}`, bigint, bigint, `0x${string}`, bigint, bigint] = [
        params.asset,
        params.amount,
        params.price,
        currencyBytes32,
        params.minLimit || 0n,
        params.maxLimit || params.amount,
      ];

      await performMarketplaceGasPreflight({
        publicClient,
        userAddress,
        marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'createSellOrder',
        args,
      });

      let orderId: number | null = null;

      const txHash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: marketplaceAddress,
            abi: MARKETPLACE_ABI,
            functionName: 'createSellOrder',
            args,
          }),
        {
          stepName: 'Create Sell Order',
          stepDescription: 'Broadcasting limit sell order to Marketplace smart contract...',
        },
      );

      if (publicClient) {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

          for (const log of receipt.logs) {
            try {
              if (log.address.toLowerCase() === marketplaceAddress.toLowerCase() && log.topics[1]) {
                orderId = Number(BigInt(log.topics[1]));
                break;
              }
            } catch {
              // Ignore non-matching logs
            }
          }
        } catch {
          // Ignore
        }

        if (!orderId) {
          try {
            const countBigInt = (await publicClient.readContract({
              address: marketplaceAddress,
              abi: MARKETPLACE_ABI,
              functionName: 'getOrderCount',
            })) as bigint;
            orderId = Number(countBigInt);
          } catch {
            // Ignore
          }
        }
      }

      return { txHash, orderId };
    } catch (err: any) {
      const errMsg = err?.message || 'Create sell order transaction failed.';
      setError(errMsg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelOrder = async (orderId: number) => {
    const currentChainId = validateChain();
    const marketplaceAddress = getMarketplaceAddress(currentChainId);

    if (!isNonZeroAddress(marketplaceAddress)) {
      const msg = `Marketplace contract address is zero or unconfigured for chain ID ${currentChainId}.`;
      setError(msg);
      throw new Error(msg);
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const args: [bigint] = [BigInt(orderId)];

      await performMarketplaceGasPreflight({
        publicClient,
        userAddress,
        marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'cancelOrder',
        args,
      });

      const txHash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: marketplaceAddress,
            abi: MARKETPLACE_ABI,
            functionName: 'cancelOrder',
            args,
          }),
        {
          stepName: 'Cancel Order',
          stepDescription: `Cancelling order #${orderId} on Marketplace contract...`,
        },
      );

      return txHash;
    } catch (err: any) {
      const errMsg = err?.message || 'Cancel order transaction failed.';
      setError(errMsg);
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
    const currentChainId = validateChain();
    const marketplaceAddress = getMarketplaceAddress(currentChainId);

    if (!isNonZeroAddress(marketplaceAddress)) {
      const msg = `Marketplace contract address is zero or unconfigured for chain ID ${currentChainId}.`;
      setError(msg);
      throw new Error(msg);
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const args: [bigint, bigint, bigint] = [
        BigInt(params.buyOrderId),
        BigInt(params.sellOrderId),
        params.matchAmount,
      ];

      await performMarketplaceGasPreflight({
        publicClient,
        userAddress,
        marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'matchOrders',
        args,
      });

      let escrowTradeId: number | null = null;

      const txHash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: marketplaceAddress,
            abi: MARKETPLACE_ABI,
            functionName: 'matchOrders',
            args,
          }),
        {
          stepName: 'Match Orders',
          stepDescription: `Matching Buy #${params.buyOrderId} with Sell #${params.sellOrderId}...`,
        },
      );

      if (publicClient) {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

          for (const log of receipt.logs) {
            try {
              if (log.address.toLowerCase() === marketplaceAddress.toLowerCase()) {
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
        } catch {
          // Ignore
        }
      }

      return { txHash, escrowTradeId };
    } catch (err: any) {
      const errMsg = err?.message || 'Match orders transaction failed.';
      setError(errMsg);
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
    isSubmitting: isSubmitting || txManager.progressState.state === 'WALLET_REQUEST' || txManager.progressState.state === 'PREPARING' || txManager.progressState.state === 'CONFIRMING',
    error,
    txManager,
  };
}

