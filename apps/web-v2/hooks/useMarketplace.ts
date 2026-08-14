'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import {
  parseUnits,
  stringToHex,
  hexToString,
  getAddress,
  createPublicClient,
  http,
  type Address,
} from 'viem';
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
  getRpcUrl,
} from '../constants';
import { validateP2PAsset } from '../lib/p2p/assetValidation';

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
      ].find(isNonZeroAddress) || '0xe908377f96F313a6b7771570ff6Fb414D38F451A';

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
  const wagmiPublicClient = usePublicClient({ chainId });

  const fallbackClient = useMemo(() => {
    const rpc = getRpcUrl(chainId);
    return createPublicClient({
      chain: chainId === base.id ? base : baseSepolia,
      transport: http(rpc),
    });
  }, [chainId]);

  const publicClient = wagmiPublicClient || fallbackClient;

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
    if (!publicClient || !marketplaceAddress || marketplaceAddress === ZERO_ADDRESS) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);

      const countBigInt = (await publicClient.readContract({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'getOrderCount',
      })) as bigint;

      const count = Number(countBigInt);
      if (count === 0) {
        setOrders([]);
        return;
      }

      const contractCalls = [];
      for (let i = 1; i <= count; i++) {
        contractCalls.push({
          address: marketplaceAddress,
          abi: MARKETPLACE_ABI,
          functionName: 'getOrder',
          args: [BigInt(i)],
        });
      }

      let results: any[];
      try {
        results = (await publicClient.multicall({
          contracts: contractCalls,
          allowFailure: true,
        })) as any[];
      } catch {
        results = await Promise.all(
          contractCalls.map(async (call) => {
            try {
              const res = await publicClient.readContract(call as any);
              return { status: 'success', result: res };
            } catch (err) {
              return { status: 'failure', error: err };
            }
          }),
        );
      }

      const loadedOrders: OrderDetails[] = [];

      for (let i = 0; i < results.length; i++) {
        const item = results[i];
        if (item && item.status === 'success' && item.result) {
          const raw: any = item.result;
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

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

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

    // Enforce UVBE-only asset validation
    const assetCheck = validateP2PAsset(params.asset, currentChainId);
    if (!assetCheck.isValid) {
      const err = assetCheck.errorMessage || 'P2P marketplace exclusively supports UVBE token.';
      setError(err);
      throw new Error(err);
    }

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

    // Enforce UVBE-only asset validation
    const assetCheck = validateP2PAsset(params.asset, currentChainId);
    if (!assetCheck.isValid) {
      const err = assetCheck.errorMessage || 'P2P marketplace exclusively supports UVBE token.';
      setError(err);
      throw new Error(err);
    }

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

  const takeOrder = async (params: { orderId: number; takeAmount: bigint }) => {
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

      const args: [bigint, bigint] = [BigInt(params.orderId), params.takeAmount];

      await performMarketplaceGasPreflight({
        publicClient,
        userAddress,
        marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'takeOrder',
        args,
      });

      let escrowTradeId: number | null = null;

      const txHash = await txManager.executeTransaction(
        () =>
          writeContractAsync({
            address: marketplaceAddress,
            abi: MARKETPLACE_ABI,
            functionName: 'takeOrder',
            args,
          }),
        {
          stepName: 'Take Order',
          stepDescription: `Filling order #${params.orderId} atomically on Marketplace...`,
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
      const errMsg = err?.message || 'Take order transaction failed.';
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
    takeOrder,
    isSubmitting:
      isSubmitting ||
      txManager.progressState.state === 'WALLET_REQUEST' ||
      txManager.progressState.state === 'PREPARING' ||
      txManager.progressState.state === 'CONFIRMING',
    error,
    txManager,
  };
}
