'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContracts, usePublicClient } from 'wagmi';
import { parseAbiItem, formatEther } from 'viem';
import { STRATEGY_MANAGER_ABI } from '../lib/contracts/strategy';
import { PORTFOLIO_MANAGER_ABI } from '../lib/contracts/portfolioManager';
import {
  DEPLOYED_CONTRACTS_SEPOLIA,
  DEPLOYED_CONTRACTS_MAINNET,
  getChainTokens,
  getDefaultChainId,
  getExplorerBaseUrl,
} from '../constants';
import { useProtocolDirectory } from './useProtocolDirectory';
import { base } from 'viem/chains';

import { GOVERNANCE_ROLE_HASH, DEFAULT_ADMIN_ROLE_HASH } from '../lib/contracts/governance';

export const GOVERNANCE_ROLE = GOVERNANCE_ROLE_HASH;
export const DEFAULT_ADMIN_ROLE = DEFAULT_ADMIN_ROLE_HASH;

export interface StrategyEventItem {
  eventName: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  args: Record<string, any>;
}

export interface StrategyAssetWeight {
  asset: `0x${string}`;
  weightBps: bigint;
  weightPercent: number;
}

export function useStrategyAdmin() {
  const { address: connectedAddress, chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const publicClient = usePublicClient({ chainId });
  const tokens = getChainTokens(chainId);
  const explorerBaseUrl = getExplorerBaseUrl(chainId);

  const directory = useProtocolDirectory();
  const fallbackContracts =
    chainId === base.id ? DEPLOYED_CONTRACTS_MAINNET : DEPLOYED_CONTRACTS_SEPOLIA;

  const strategyManagerAddress = directory.strategyManager || fallbackContracts.StrategyManager;
  const portfolioManagerAddress = directory.portfolioManager || fallbackContracts.PortfolioManager;

  const {
    data: readData,
    isLoading: isReading,
    refetch: refetchReads,
  } = useReadContracts({
    contracts: [
      {
        address: strategyManagerAddress,
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'hasRole',
        args: [GOVERNANCE_ROLE, connectedAddress || '0x0000000000000000000000000000000000000000'],
      },
      {
        address: strategyManagerAddress,
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'getTargetWeights',
      },
      {
        address: strategyManagerAddress,
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'getTotalAllocationBps',
      },
      {
        address: strategyManagerAddress,
        abi: STRATEGY_MANAGER_ABI,
        functionName: 'getAssetCount',
      },
      {
        address: portfolioManagerAddress,
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: 'calculatePortfolioValue',
      },
      {
        address: portfolioManagerAddress,
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: 'calculateUVPrice',
      },
    ],
    query: {
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  });

  const isGovernanceAdmin = Boolean(readData?.[0]?.result);

  const targetWeightsRaw = readData?.[1]?.result as
    [readonly `0x${string}`[], readonly bigint[]] | undefined;
  const totalAllocationBps = (readData?.[2]?.result as bigint) || 0n;
  const assetCount = (readData?.[3]?.result as bigint) || 0n;
  const portfolioValueUSD = (readData?.[4]?.result as bigint) || 0n;
  const uvPriceRaw = readData?.[5]?.result as [bigint, bigint] | undefined;
  const uvPriceUSD = uvPriceRaw?.[1] || 0n;

  const currentWeights: StrategyAssetWeight[] = useMemo(() => {
    if (!targetWeightsRaw || !targetWeightsRaw[0] || !targetWeightsRaw[1]) {
      return [];
    }
    const [assets, weights] = targetWeightsRaw;
    return assets.map((asset, i) => {
      const weightBps = weights[i] || 0n;
      return {
        asset,
        weightBps,
        weightPercent: Number(weightBps) / 100,
      };
    });
  }, [targetWeightsRaw]);

  // Events fetching
  const [events, setEvents] = useState<StrategyEventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const fetchEvents = async () => {
    if (!publicClient) return;
    setIsLoadingEvents(true);

    try {
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n;

      const [rebalancedLogs, updatedLogs, addedLogs, removedLogs, weightLogs] =
        await Promise.allSettled([
          publicClient.getLogs({
            address: strategyManagerAddress,
            event: parseAbiItem(
              'event StrategyRebalanced(address indexed caller, address[] assets, uint256[] newWeights)',
            ),
            fromBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: strategyManagerAddress,
            event: parseAbiItem(
              'event StrategyUpdated(address[] assets, uint256[] weightsBps, address indexed caller)',
            ),
            fromBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: strategyManagerAddress,
            event: parseAbiItem(
              'event AssetAdded(address indexed asset, uint256 weightBps, address indexed caller)',
            ),
            fromBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: strategyManagerAddress,
            event: parseAbiItem(
              'event AssetRemoved(address indexed asset, address indexed caller)',
            ),
            fromBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: strategyManagerAddress,
            event: parseAbiItem(
              'event WeightUpdated(address indexed asset, uint256 oldWeight, uint256 newWeight, address indexed caller)',
            ),
            fromBlock,
            toBlock: 'latest',
          }),
        ]);

      const parsed: StrategyEventItem[] = [];

      const addLogs = (res: PromiseSettledResult<any[]>, eventName: string) => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          res.value.forEach((log) => {
            parsed.push({
              eventName,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              args: log.args || {},
            });
          });
        }
      };

      addLogs(rebalancedLogs, 'StrategyRebalanced');
      addLogs(updatedLogs, 'StrategyUpdated');
      addLogs(addedLogs, 'AssetAdded');
      addLogs(removedLogs, 'AssetRemoved');
      addLogs(weightLogs, 'WeightUpdated');

      parsed.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : -1));
      setEvents(parsed);
    } catch {
      // Non-blocking log query fallback
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [publicClient, strategyManagerAddress]);

  const refetchAll = async () => {
    await Promise.allSettled([refetchReads(), fetchEvents()]);
  };

  return {
    strategyManagerAddress,
    portfolioManagerAddress,
    explorerBaseUrl,
    tokens,
    isGovernanceAdmin,
    currentWeights,
    totalAllocationBps,
    assetCount,
    portfolioValueUSD,
    uvPriceUSD,
    portfolioValueUSDFormatted: `$${Number(formatEther(portfolioValueUSD)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`,
    uvPriceUSDFormatted: `$${Number(formatEther(uvPriceUSD)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })}`,
    events,
    isLoading: isReading,
    isLoadingEvents,
    refetch: refetchAll,
  };
}
