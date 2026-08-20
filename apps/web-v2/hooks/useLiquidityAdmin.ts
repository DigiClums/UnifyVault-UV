'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContracts, usePublicClient } from 'wagmi';
import { parseAbiItem, formatEther, formatUnits } from 'viem';
import { LIQUIDITY_MANAGER_ABI } from '../lib/contracts/liquidity';
import {
  DEPLOYED_CONTRACTS_SEPOLIA,
  getChainTokens,
  getDefaultChainId,
  getExplorerBaseUrl,
} from '../constants';

import {
  GOVERNANCE_ROLE_HASH,
  CONTROLLER_ROLE_HASH,
  DEFAULT_ADMIN_ROLE_HASH,
} from '../lib/contracts/governance';

export const GOVERNANCE_ROLE = GOVERNANCE_ROLE_HASH;
export const CONTROLLER_ROLE = CONTROLLER_ROLE_HASH;
export const DEFAULT_ADMIN_ROLE = DEFAULT_ADMIN_ROLE_HASH;

export interface AssetLiquidityStatus {
  symbol: 'cbBTC' | 'WETH' | 'USDC';
  name: string;
  address: `0x${string}`;
  decimals: number;
  operationalBalance: bigint;
  reserveBalance: bigint;
  totalBalance: bigint;
  operationalBalanceFormatted: string;
  reserveBalanceFormatted: string;
  totalBalanceFormatted: string;
  operationalTargetBps: bigint;
  refillThresholdBps: bigint;
  excessThresholdBps: bigint;
  needsRefill: boolean;
  needsSweep: boolean;
  actionAmount: bigint;
  actionAmountFormatted: string;
  targetOperationalBalance: bigint;
  targetOperationalBalanceFormatted: string;
}

export interface LiquidityEventItem {
  eventName: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  args: Record<string, any>;
}

export function useLiquidityAdmin() {
  const { address: connectedAddress, chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const publicClient = usePublicClient({ chainId });
  const tokens = getChainTokens(chainId);
  const explorerBaseUrl = getExplorerBaseUrl(chainId);

  const liquidityManagerAddress = DEPLOYED_CONTRACTS_SEPOLIA.LiquidityManager;

  const assets = useMemo(
    () => [
      {
        symbol: 'cbBTC' as const,
        name: 'Coinbase Wrapped BTC',
        address: tokens.cbBTC,
        decimals: 8,
      },
      { symbol: 'WETH' as const, name: 'Wrapped Ether', address: tokens.WETH, decimals: 18 },
      { symbol: 'USDC' as const, name: 'USD Coin', address: tokens.USDC, decimals: 6 },
    ],
    [tokens.cbBTC, tokens.WETH, tokens.USDC],
  );

  const contracts = useMemo(() => {
    const list: any[] = [];

    // Role checks
    list.push(
      {
        address: liquidityManagerAddress,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'hasRole',
        args: [GOVERNANCE_ROLE, connectedAddress || '0x0000000000000000000000000000000000000000'],
      },
      {
        address: liquidityManagerAddress,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'hasRole',
        args: [CONTROLLER_ROLE, connectedAddress || '0x0000000000000000000000000000000000000000'],
      },
      {
        address: liquidityManagerAddress,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'custodyVault',
      },
    );

    // Reads for each asset: balances, thresholds, assess
    assets.forEach((asset) => {
      list.push(
        {
          address: liquidityManagerAddress,
          abi: LIQUIDITY_MANAGER_ABI,
          functionName: 'getLiquidityBalances',
          args: [asset.address],
        },
        {
          address: liquidityManagerAddress,
          abi: LIQUIDITY_MANAGER_ABI,
          functionName: 'getThresholds',
          args: [asset.address],
        },
        {
          address: liquidityManagerAddress,
          abi: LIQUIDITY_MANAGER_ABI,
          functionName: 'assessLiquidity',
          args: [asset.address],
        },
      );
    });

    return list;
  }, [liquidityManagerAddress, connectedAddress, assets]);

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
  const isControllerAdmin = Boolean(readData?.[1]?.result);
  const custodyVault =
    (readData?.[2]?.result as `0x${string}`) || '0x0000000000000000000000000000000000000000';

  const assetStatuses: AssetLiquidityStatus[] = useMemo(() => {
    return assets.map((asset, idx) => {
      const offset = 3 + idx * 3;
      const balances = (readData?.[offset]?.result as [bigint, bigint, bigint]) || [0n, 0n, 0n];
      const thresholds = (readData?.[offset + 1]?.result as [bigint, bigint, bigint]) || [
        1000n,
        500n,
        1500n,
      ];
      const assessment = (readData?.[offset + 2]?.result as [boolean, boolean, bigint, bigint]) || [
        false,
        false,
        0n,
        0n,
      ];

      const [operationalBalance, reserveBalance, totalBalance] = balances;
      const [operationalTargetBps, refillThresholdBps, excessThresholdBps] = thresholds;
      const [needsRefill, needsSweep, actionAmount, targetOperationalBalance] = assessment;

      const formatAssetUnits = (val: bigint) => {
        const num = Number(formatUnits(val, asset.decimals));
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
      };

      return {
        symbol: asset.symbol,
        name: asset.name,
        address: asset.address,
        decimals: asset.decimals,
        operationalBalance,
        reserveBalance,
        totalBalance,
        operationalBalanceFormatted: `${formatAssetUnits(operationalBalance)} ${asset.symbol}`,
        reserveBalanceFormatted: `${formatAssetUnits(reserveBalance)} ${asset.symbol}`,
        totalBalanceFormatted: `${formatAssetUnits(totalBalance)} ${asset.symbol}`,
        operationalTargetBps,
        refillThresholdBps,
        excessThresholdBps,
        needsRefill,
        needsSweep,
        actionAmount,
        actionAmountFormatted: `${formatAssetUnits(actionAmount)} ${asset.symbol}`,
        targetOperationalBalance,
        targetOperationalBalanceFormatted: `${formatAssetUnits(targetOperationalBalance)} ${asset.symbol}`,
      };
    });
  }, [assets, readData]);

  // Events fetching
  const [events, setEvents] = useState<LiquidityEventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const fetchEvents = async () => {
    if (!publicClient) return;
    setIsLoadingEvents(true);

    try {
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n;

      const [refilledLogs, sweptLogs, thresholdsLogs, syncedLogs, reqRefillLogs, reqSweepLogs] =
        await Promise.allSettled([
          publicClient.getLogs({
            address: liquidityManagerAddress,
            event: parseAbiItem(
              'event OperationalLiquidityRefilled(address indexed asset, uint256 amount, uint256 newOperationalBalance, uint256 newReserveBalance, address indexed caller)',
            ),
            fromBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: liquidityManagerAddress,
            event: parseAbiItem(
              'event ReserveLiquiditySwept(address indexed asset, uint256 amount, uint256 newOperationalBalance, uint256 newReserveBalance, address indexed caller)',
            ),
            fromBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: liquidityManagerAddress,
            event: parseAbiItem(
              'event ThresholdsConfigured(address indexed asset, uint256 operationalTargetBps, uint256 refillThresholdBps, uint256 excessThresholdBps, address indexed caller)',
            ),
            fromBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: liquidityManagerAddress,
            event: parseAbiItem(
              'event LiquidityBalancesSynced(address indexed asset, uint256 operationalBalance, uint256 reserveBalance, address indexed caller)',
            ),
            fromBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: liquidityManagerAddress,
            event: parseAbiItem(
              'event RefillRequired(address indexed asset, uint256 currentOperationalBalance, uint256 targetOperationalBalance, uint256 requiredRefillAmount)',
            ),
            fromBlock,
            toBlock: 'latest',
          }),
          publicClient.getLogs({
            address: liquidityManagerAddress,
            event: parseAbiItem(
              'event ReserveSweepRequired(address indexed asset, uint256 currentOperationalBalance, uint256 targetOperationalBalance, uint256 excessSweepAmount)',
            ),
            fromBlock,
            toBlock: 'latest',
          }),
        ]);

      const parsed: LiquidityEventItem[] = [];

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

      addLogs(refilledLogs, 'OperationalLiquidityRefilled');
      addLogs(sweptLogs, 'ReserveLiquiditySwept');
      addLogs(thresholdsLogs, 'ThresholdsConfigured');
      addLogs(syncedLogs, 'LiquidityBalancesSynced');
      addLogs(reqRefillLogs, 'RefillRequired');
      addLogs(reqSweepLogs, 'ReserveSweepRequired');

      parsed.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : -1));
      setEvents(parsed);
    } catch {
      // Non-blocking fallback
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [publicClient, liquidityManagerAddress]);

  const refetchAll = async () => {
    await Promise.allSettled([refetchReads(), fetchEvents()]);
  };

  return {
    liquidityManagerAddress,
    custodyVault,
    explorerBaseUrl,
    isGovernanceAdmin,
    isControllerAdmin,
    assetStatuses,
    events,
    isLoading: isReading,
    isLoadingEvents,
    refetch: refetchAll,
  };
}
