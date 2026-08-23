'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useReadContracts, usePublicClient } from 'wagmi';
import { isAddress, getAddress, parseAbiItem, Log } from 'viem';
import {
  COST_BASIS_MANAGER_V2_ABI,
  PERFORMANCE_MANAGER_ABI,
  UVBE_TOKEN_ABI,
  ERC20_ABI,
} from '../lib/contracts';
import {
  DEPLOYED_CONTRACTS_SEPOLIA,
  DEPLOYED_CONTRACTS_MAINNET,
  getDefaultChainId,
  getExplorerBaseUrl,
} from '../constants';
import { useProtocolDirectory } from './useProtocolDirectory';
import { base } from 'viem/chains';

export interface AccountingPerformanceStruct {
  currentValueUSD: bigint;
  investedCapitalUSD: bigint;
  realizedPnL: bigint;
  unrealizedPnL: bigint;
  netPnL: bigint;
  roiBps: bigint;
  holdingPeriod: bigint;
}

export interface AccountingEventItem {
  eventName: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  timestamp?: number;
  args: Record<string, any>;
}

export interface UserAccountingState {
  targetAddress: `0x${string}` | null;
  isValidAddress: boolean;
  isConnecting: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // Connected Admin Roles
  isGovernanceAdmin: boolean;
  isDefaultAdmin: boolean;
  isController: boolean;

  // Contracts
  costBasisManagerAddress: `0x${string}`;
  performanceManagerAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  explorerBaseUrl: string;

  // Token Balance
  shareBalance: bigint;

  // Cost Basis Manager V2 State
  costBasisUSD: bigint;
  averageEntryPriceUSD: bigint;
  realizedPnLUSD: bigint;
  unrealizedPnLUSD: bigint;
  firstDepositTimestamp: bigint;
  isEscrow: boolean;

  // Performance Manager State
  investedCapitalUSD: bigint;
  currentValueUSD: bigint;
  netProfitUSD: bigint;
  roiBps: bigint;
  performanceStruct: AccountingPerformanceStruct;

  // Event History
  events: AccountingEventItem[];
  isLoadingEvents: boolean;

  // Actions
  refetch: () => Promise<void>;
}

import {
  GOVERNANCE_ROLE_HASH,
  CONTROLLER_ROLE_HASH,
  DEFAULT_ADMIN_ROLE_HASH,
} from '../lib/contracts/governance';

// AccessRoles hashes
export const GOVERNANCE_ROLE = GOVERNANCE_ROLE_HASH;
export const DEFAULT_ADMIN_ROLE = DEFAULT_ADMIN_ROLE_HASH;
export const CONTROLLER_ROLE = CONTROLLER_ROLE_HASH;

export function useUserAccounting(initialAddress?: string): UserAccountingState {
  const { address: connectedAddress, chain } = useAccount();
  const activeChainId = chain?.id || getDefaultChainId();
  const explorerBaseUrl = getExplorerBaseUrl(activeChainId);
  const publicClient = usePublicClient({ chainId: activeChainId });

  const directory = useProtocolDirectory();
  const fallbackContracts =
    activeChainId === base.id ? DEPLOYED_CONTRACTS_MAINNET : DEPLOYED_CONTRACTS_SEPOLIA;

  // Target address parsing and normalization
  const formattedAddress = useMemo<`0x${string}` | null>(() => {
    const raw = (initialAddress || connectedAddress || '').trim();
    if (isAddress(raw)) {
      return getAddress(raw) as `0x${string}`;
    }
    return null;
  }, [initialAddress, connectedAddress]);

  const isValidAddress = Boolean(formattedAddress);

  const costBasisManagerAddress = directory.costBasisManager || fallbackContracts.CostBasisManager;
  const performanceManagerAddress =
    directory.performanceManager || fallbackContracts.PerformanceManager;
  const tokenAddress =
    directory.token || fallbackContracts.UVBEToken || fallbackContracts.UVBTCETHToken;

  // Batch read contracts
  const {
    data: contractData,
    isLoading: isContractLoading,
    isError,
    error,
    refetch: refetchContracts,
  } = useReadContracts({
    contracts: [
      // 0: CostBasisManager.costBasis(target)
      {
        address: costBasisManagerAddress,
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'costBasis',
        args: [formattedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 1: CostBasisManager.averageEntryPrice(target)
      {
        address: costBasisManagerAddress,
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'averageEntryPrice',
        args: [formattedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 2: CostBasisManager.realizedPnL(target)
      {
        address: costBasisManagerAddress,
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'realizedPnL',
        args: [formattedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 3: CostBasisManager.unrealizedPnL(target)
      {
        address: costBasisManagerAddress,
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'unrealizedPnL',
        args: [formattedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 4: CostBasisManager.firstDepositTimestamp(target)
      {
        address: costBasisManagerAddress,
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'firstDepositTimestamp',
        args: [formattedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 5: CostBasisManager.isEscrow(target)
      {
        address: costBasisManagerAddress,
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'isEscrow',
        args: [formattedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 6: PerformanceManager.investedCapital(target)
      {
        address: performanceManagerAddress,
        abi: PERFORMANCE_MANAGER_ABI,
        functionName: 'investedCapital',
        args: [formattedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 7: PerformanceManager.currentValue(target)
      {
        address: performanceManagerAddress,
        abi: PERFORMANCE_MANAGER_ABI,
        functionName: 'currentValue',
        args: [formattedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 8: PerformanceManager.netProfit(target)
      {
        address: performanceManagerAddress,
        abi: PERFORMANCE_MANAGER_ABI,
        functionName: 'netProfit',
        args: [formattedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 9: PerformanceManager.roi(target)
      {
        address: performanceManagerAddress,
        abi: PERFORMANCE_MANAGER_ABI,
        functionName: 'roi',
        args: [formattedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 10: PerformanceManager.performance(target)
      {
        address: performanceManagerAddress,
        abi: PERFORMANCE_MANAGER_ABI,
        functionName: 'performance',
        args: [formattedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 11: UVBEToken.balanceOf(target)
      {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [formattedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 12: CostBasisManager.hasRole(GOVERNANCE_ROLE, connectedAddress)
      {
        address: costBasisManagerAddress,
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'hasRole',
        args: [GOVERNANCE_ROLE, connectedAddress || '0x0000000000000000000000000000000000000000'],
      },
      // 13: CostBasisManager.hasRole(DEFAULT_ADMIN_ROLE, connectedAddress)
      {
        address: costBasisManagerAddress,
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'hasRole',
        args: [
          DEFAULT_ADMIN_ROLE,
          connectedAddress || '0x0000000000000000000000000000000000000000',
        ],
      },
      // 14: CostBasisManager.hasRole(CONTROLLER_ROLE, connectedAddress)
      {
        address: costBasisManagerAddress,
        abi: COST_BASIS_MANAGER_V2_ABI,
        functionName: 'hasRole',
        args: [CONTROLLER_ROLE, connectedAddress || '0x0000000000000000000000000000000000000000'],
      },
    ],
    query: {
      enabled: !!formattedAddress && !!costBasisManagerAddress && !!performanceManagerAddress,
      staleTime: 10_000,
    },
  });

  // Event log fetching state
  const [events, setEvents] = useState<AccountingEventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);

  const fetchAccountingEvents = useCallback(async () => {
    if (!publicClient || !formattedAddress || !costBasisManagerAddress) {
      setEvents([]);
      return;
    }

    setIsLoadingEvents(true);
    try {
      // Query past logs bounded by latest 20,000 blocks to prevent unbounded RPC loads
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > 20000n ? currentBlock - 20000n : 0n;

      const [costBasisLogs, realizedPnLLogs, migratedLogs, escrowLogs] = await Promise.all([
        publicClient.getLogs({
          address: costBasisManagerAddress,
          event: parseAbiItem(
            'event CostBasisUpdated(address indexed user, uint256 costBasisUSD, uint256 sharesBalance, uint256 timestamp)',
          ),
          args: { user: formattedAddress },
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: costBasisManagerAddress,
          event: parseAbiItem(
            'event RealizedPnLRecorded(address indexed user, int256 realizedPnLUSD, uint256 sharesBurned, uint256 timestamp)',
          ),
          args: { user: formattedAddress },
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: costBasisManagerAddress,
          event: parseAbiItem(
            'event AccountingMigrated(address indexed user, uint256 costBasisUSD, int256 realizedPnLUSD, uint256 firstDepositTimestamp)',
          ),
          args: { user: formattedAddress },
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: costBasisManagerAddress,
          event: parseAbiItem('event EscrowStatusUpdated(address indexed escrow, bool status)'),
          args: { escrow: formattedAddress },
          fromBlock,
          toBlock: 'latest',
        }),
      ]);

      const parsedItems: AccountingEventItem[] = [];

      for (const log of costBasisLogs) {
        parsedItems.push({
          eventName: 'CostBasisUpdated',
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          args: log.args,
        });
      }

      for (const log of realizedPnLLogs) {
        parsedItems.push({
          eventName: 'RealizedPnLRecorded',
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          args: log.args,
        });
      }

      for (const log of migratedLogs) {
        parsedItems.push({
          eventName: 'AccountingMigrated',
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          args: log.args,
        });
      }

      for (const log of escrowLogs) {
        parsedItems.push({
          eventName: 'EscrowStatusUpdated',
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          args: log.args,
        });
      }

      // Sort newest block first
      parsedItems.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : -1));
      setEvents(parsedItems);
    } catch {
      // Event log lookup graceful fallback
    } finally {
      setIsLoadingEvents(false);
    }
  }, [publicClient, formattedAddress, costBasisManagerAddress]);

  useEffect(() => {
    fetchAccountingEvents();
  }, [fetchAccountingEvents]);

  const refetch = useCallback(async () => {
    await Promise.all([refetchContracts(), fetchAccountingEvents()]);
  }, [refetchContracts, fetchAccountingEvents]);

  // Extract read results
  const costBasisUSD = (contractData?.[0]?.result as bigint) || 0n;
  const averageEntryPriceUSD = (contractData?.[1]?.result as bigint) || 0n;
  const realizedPnLUSD = (contractData?.[2]?.result as bigint) || 0n;
  const unrealizedPnLUSD = (contractData?.[3]?.result as bigint) || 0n;
  const firstDepositTimestamp = (contractData?.[4]?.result as bigint) || 0n;
  const isEscrow = Boolean(contractData?.[5]?.result);

  const investedCapitalUSD = (contractData?.[6]?.result as bigint) || 0n;
  const currentValueUSD = (contractData?.[7]?.result as bigint) || 0n;
  const netProfitUSD = (contractData?.[8]?.result as bigint) || 0n;
  const roiBps = (contractData?.[9]?.result as bigint) || 0n;

  // Performance struct extraction
  const rawPerf = contractData?.[10]?.result as any;
  const performanceStruct: AccountingPerformanceStruct = useMemo(() => {
    if (!rawPerf) {
      return {
        currentValueUSD: 0n,
        investedCapitalUSD: 0n,
        realizedPnL: 0n,
        unrealizedPnL: 0n,
        netPnL: 0n,
        roiBps: 0n,
        holdingPeriod: 0n,
      };
    }
    return {
      currentValueUSD: rawPerf.currentValueUSD || 0n,
      investedCapitalUSD: rawPerf.investedCapitalUSD || 0n,
      realizedPnL: rawPerf.realizedPnL || 0n,
      unrealizedPnL: rawPerf.unrealizedPnL || 0n,
      netPnL: rawPerf.netPnL || 0n,
      roiBps: rawPerf.roiBps || 0n,
      holdingPeriod: rawPerf.holdingPeriod || 0n,
    };
  }, [rawPerf]);

  const shareBalance = (contractData?.[11]?.result as bigint) || 0n;

  // Role extraction
  const isGovernanceAdmin = Boolean(contractData?.[12]?.result);
  const isDefaultAdmin = Boolean(contractData?.[13]?.result);
  const isController = Boolean(contractData?.[14]?.result);

  return {
    targetAddress: formattedAddress,
    isValidAddress,
    isConnecting: !connectedAddress,
    isLoading: isContractLoading,
    isError: isError,
    error: error as Error | null,

    isGovernanceAdmin,
    isDefaultAdmin,
    isController,

    costBasisManagerAddress,
    performanceManagerAddress,
    tokenAddress,
    explorerBaseUrl,

    shareBalance,

    costBasisUSD,
    averageEntryPriceUSD,
    realizedPnLUSD,
    unrealizedPnLUSD,
    firstDepositTimestamp,
    isEscrow,

    investedCapitalUSD,
    currentValueUSD,
    netProfitUSD,
    roiBps,
    performanceStruct,

    events,
    isLoadingEvents,

    refetch,
  };
}
