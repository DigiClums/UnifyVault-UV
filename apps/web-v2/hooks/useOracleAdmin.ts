'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContracts, usePublicClient } from 'wagmi';
import { pad, parseAbiItem, formatEther } from 'viem';
import { ORACLE_MANAGER_ABI, CHAINLINK_ORACLE_PROVIDER_ABI } from '../lib/contracts/oracle';
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

export interface OracleAssetStatus {
  symbol: 'cbBTC' | 'WETH' | 'USDC';
  name: string;
  address: `0x${string}`;
  assetId: `0x${string}`;
  price: bigint;
  priceFormatted: string;
  isFresh: boolean;
  isHealthy: boolean;
  primaryProvider: `0x${string}`;
  fallbackProvider: `0x${string}`;
  heartbeat: number;
  enabled: boolean;
  maxDeviationBps: bigint;
  lastValidPrice: bigint;
  lastValidPriceFormatted: string;
  chainlinkFeedAddress?: `0x${string}`;
  chainlinkHeartbeat?: number;
  chainlinkEnabled?: boolean;
  chainlinkHealthy?: boolean;
}

export interface OracleEventItem {
  eventName: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  args: Record<string, any>;
}

export function toAssetId(address: `0x${string}`): `0x${string}` {
  return pad(address.toLowerCase() as `0x${string}`, { size: 32 });
}

export function useOracleAdmin() {
  const { address: connectedAddress, chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const publicClient = usePublicClient({ chainId });
  const tokens = getChainTokens(chainId);
  const explorerBaseUrl = getExplorerBaseUrl(chainId);

  const directory = useProtocolDirectory();
  const fallbackContracts =
    chainId === base.id ? DEPLOYED_CONTRACTS_MAINNET : DEPLOYED_CONTRACTS_SEPOLIA;

  const oracleManagerAddress = directory.oracle || fallbackContracts.OracleManager;
  const chainlinkProviderAddress = fallbackContracts.ChainlinkOracleProvider;

  const assets = useMemo(
    () => [
      { symbol: 'cbBTC' as const, name: 'Coinbase Wrapped BTC', address: tokens.cbBTC },
      { symbol: 'WETH' as const, name: 'Wrapped Ether', address: tokens.WETH },
      { symbol: 'USDC' as const, name: 'USD Coin', address: tokens.USDC },
    ],
    [tokens.cbBTC, tokens.WETH, tokens.USDC],
  );

  const assetIds = useMemo(() => assets.map((a) => toAssetId(a.address)), [assets]);

  // Batched on-chain contract reads
  const contracts = useMemo(() => {
    const list: any[] = [];

    // Role checks
    list.push(
      {
        address: oracleManagerAddress,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'hasRole',
        args: [GOVERNANCE_ROLE, connectedAddress || '0x0000000000000000000000000000000000000000'],
      },
      {
        address: chainlinkProviderAddress,
        abi: CHAINLINK_ORACLE_PROVIDER_ABI,
        functionName: 'hasRole',
        args: [GOVERNANCE_ROLE, connectedAddress || '0x0000000000000000000000000000000000000000'],
      },
    );

    // Asset status reads for each token
    assets.forEach((asset, idx) => {
      const assetId = assetIds[idx];
      list.push(
        {
          address: oracleManagerAddress,
          abi: ORACLE_MANAGER_ABI,
          functionName: 'getAssetPrice',
          args: [asset.address],
        },
        {
          address: oracleManagerAddress,
          abi: ORACLE_MANAGER_ABI,
          functionName: 'isPriceFresh',
          args: [asset.address],
        },
        {
          address: oracleManagerAddress,
          abi: ORACLE_MANAGER_ABI,
          functionName: 'isHealthy',
          args: [assetId],
        },
        {
          address: oracleManagerAddress,
          abi: ORACLE_MANAGER_ABI,
          functionName: 'getAssetConfig',
          args: [assetId],
        },
        {
          address: oracleManagerAddress,
          abi: ORACLE_MANAGER_ABI,
          functionName: 'getMaxDeviationBps',
          args: [assetId],
        },
        {
          address: oracleManagerAddress,
          abi: ORACLE_MANAGER_ABI,
          functionName: 'getLastValidPrice',
          args: [assetId],
        },
        {
          address: chainlinkProviderAddress,
          abi: CHAINLINK_ORACLE_PROVIDER_ABI,
          functionName: 'getFeedConfig',
          args: [assetId],
        },
        {
          address: chainlinkProviderAddress,
          abi: CHAINLINK_ORACLE_PROVIDER_ABI,
          functionName: 'isHealthy',
          args: [assetId],
        },
      );
    });

    return list;
  }, [oracleManagerAddress, chainlinkProviderAddress, connectedAddress, assets, assetIds]);

  const {
    data: readData,
    isLoading: isReading,
    refetch: refetchReads,
  } = useReadContracts({
    contracts,
    query: {
      staleTime: 15_000,
      refetchInterval: 30_000,
    },
  });

  const isGovernanceAdmin = Boolean(readData?.[0]?.result);
  const isChainlinkAdmin = Boolean(readData?.[1]?.result);

  // Parse asset statuses
  const assetStatuses: OracleAssetStatus[] = useMemo(() => {
    return assets.map((asset, idx) => {
      const offset = 2 + idx * 8;
      const price = (readData?.[offset]?.result as bigint) || 0n;
      const isFresh = Boolean(readData?.[offset + 1]?.result);
      const isHealthy = Boolean(readData?.[offset + 2]?.result);
      const config = (readData?.[offset + 3]?.result as any) || {
        primaryProvider: '0x0000000000000000000000000000000000000000',
        fallbackProvider: '0x0000000000000000000000000000000000000000',
        heartbeat: 86400,
        enabled: false,
      };
      const maxDeviationBps = (readData?.[offset + 4]?.result as bigint) || 1000n;
      const lastValidPrice = (readData?.[offset + 5]?.result as bigint) || 0n;

      const clConfig = (readData?.[offset + 6]?.result as any) || {
        feedAddress: '0x0000000000000000000000000000000000000000',
        heartbeat: 86400,
        enabled: false,
      };
      const clHealthy = Boolean(readData?.[offset + 7]?.result);

      const numPrice = Number(formatEther(price));
      const priceFormatted = `$${numPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })}`;

      const numLastPrice = Number(formatEther(lastValidPrice));
      const lastValidPriceFormatted = `$${numLastPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })}`;

      return {
        symbol: asset.symbol,
        name: asset.name,
        address: asset.address,
        assetId: assetIds[idx],
        price,
        priceFormatted,
        isFresh,
        isHealthy,
        primaryProvider: config.primaryProvider,
        fallbackProvider: config.fallbackProvider,
        heartbeat: Number(config.heartbeat || 86400),
        enabled: Boolean(config.enabled),
        maxDeviationBps,
        lastValidPrice,
        lastValidPriceFormatted,
        chainlinkFeedAddress: clConfig.feedAddress,
        chainlinkHeartbeat: Number(clConfig.heartbeat || 86400),
        chainlinkEnabled: Boolean(clConfig.enabled),
        chainlinkHealthy: clHealthy,
      };
    });
  }, [assets, assetIds, readData]);

  // Event log fetching
  const [events, setEvents] = useState<OracleEventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const fetchEvents = async () => {
    if (!publicClient) return;
    setIsLoadingEvents(true);

    try {
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n;

      const [
        primaryLogs,
        fallbackLogs,
        maxDevLogs,
        resetLogs,
        oracleFailureLogs,
        feedRegLogs,
        feedUpLogs,
        feedRemLogs,
        feedHbLogs,
      ] = await Promise.allSettled([
        publicClient.getLogs({
          address: oracleManagerAddress,
          event: parseAbiItem(
            'event PrimaryProviderUpdated(bytes32 indexed assetId, address oldProvider, address newProvider, address indexed caller)',
          ),
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: oracleManagerAddress,
          event: parseAbiItem(
            'event FallbackProviderUpdated(bytes32 indexed assetId, address oldProvider, address newProvider, address indexed caller)',
          ),
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: oracleManagerAddress,
          event: parseAbiItem(
            'event MaxDeviationUpdated(bytes32 indexed assetId, uint256 oldBps, uint256 newBps, address indexed caller)',
          ),
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: oracleManagerAddress,
          event: parseAbiItem(
            'event CircuitBreakerReset(bytes32 indexed assetId, uint256 oldPrice, uint256 newPrice, address indexed caller)',
          ),
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: oracleManagerAddress,
          event: parseAbiItem('event OracleFailure(address indexed asset, string reason)'),
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: chainlinkProviderAddress,
          event: parseAbiItem(
            'event FeedRegistered(bytes32 indexed assetId, address indexed feedAddress, uint32 heartbeat, address indexed caller)',
          ),
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: chainlinkProviderAddress,
          event: parseAbiItem(
            'event FeedUpdated(bytes32 indexed assetId, address oldFeedAddress, address newFeedAddress, uint32 oldHeartbeat, uint32 newHeartbeat, address indexed caller)',
          ),
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: chainlinkProviderAddress,
          event: parseAbiItem(
            'event FeedRemoved(bytes32 indexed assetId, address indexed oldFeedAddress, address indexed caller)',
          ),
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: chainlinkProviderAddress,
          event: parseAbiItem(
            'event HeartbeatUpdated(bytes32 indexed assetId, uint32 oldHeartbeat, uint32 newHeartbeat, address indexed caller)',
          ),
          fromBlock,
          toBlock: 'latest',
        }),
      ]);

      const parsed: OracleEventItem[] = [];

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

      addLogs(primaryLogs, 'PrimaryProviderUpdated');
      addLogs(fallbackLogs, 'FallbackProviderUpdated');
      addLogs(maxDevLogs, 'MaxDeviationUpdated');
      addLogs(resetLogs, 'CircuitBreakerReset');
      addLogs(oracleFailureLogs, 'OracleFailure');
      addLogs(feedRegLogs, 'FeedRegistered');
      addLogs(feedUpLogs, 'FeedUpdated');
      addLogs(feedRemLogs, 'FeedRemoved');
      addLogs(feedHbLogs, 'HeartbeatUpdated');

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
  }, [publicClient, oracleManagerAddress, chainlinkProviderAddress]);

  const refetchAll = async () => {
    await Promise.allSettled([refetchReads(), fetchEvents()]);
  };

  return {
    oracleManagerAddress,
    chainlinkProviderAddress,
    explorerBaseUrl,
    isGovernanceAdmin,
    isChainlinkAdmin,
    assetStatuses,
    events,
    isLoading: isReading,
    isLoadingEvents,
    refetch: refetchAll,
  };
}
