'use client';

import { useAccount, useReadContracts } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import { PROTOCOL_DIRECTORY_ABI } from '../lib/contracts/directory';
import {
  getProtocolDirectoryAddress,
  getDefaultChainId,
  MODULE_IDS,
  DEPLOYED_CONTRACTS_SEPOLIA,
  DEPLOYED_CONTRACTS_MAINNET,
} from '../constants';

export interface ProtocolAddresses {
  directory: `0x${string}`;
  controller?: `0x${string}`;
  vault?: `0x${string}`;
  treasury?: `0x${string}`;
  oracle?: `0x${string}`;
  token?: `0x${string}`;
  strategyManager?: `0x${string}`;
  portfolioManager?: `0x${string}`;
  swapAdapter?: `0x${string}`;
  liquidityManager?: `0x${string}`;
  feeManager?: `0x${string}`;
  costBasisManager?: `0x${string}`;
  performanceManager?: `0x${string}`;
  p2pEscrow?: `0x${string}`;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useProtocolDirectory(): ProtocolAddresses {
  const { chain } = useAccount();
  const chainId = chain?.id || getDefaultChainId();
  const directoryAddress = getProtocolDirectoryAddress(chainId);
  const isZeroAddress =
    !directoryAddress || directoryAddress === '0x0000000000000000000000000000000000000000';

  const fallback = chainId === 8453 ? DEPLOYED_CONTRACTS_MAINNET : DEPLOYED_CONTRACTS_SEPOLIA;

  const moduleKeys = [
    {
      key: 'controller',
      moduleId: MODULE_IDS.CONTROLLER,
      fallback: fallback.UnifyVaultController,
    },
    { key: 'vault', moduleId: MODULE_IDS.VAULT, fallback: fallback.CustodyVault },
    {
      key: 'treasury',
      moduleId: MODULE_IDS.TREASURY,
      fallback: fallback.Treasury,
    },
    {
      key: 'oracle',
      moduleId: MODULE_IDS.ORACLE,
      fallback: fallback.OracleManager,
    },
    {
      key: 'token',
      moduleId: MODULE_IDS.TOKEN,
      fallback: fallback.UVBEToken || fallback.UVBTCETHToken,
    },
    {
      key: 'strategyManager',
      moduleId: MODULE_IDS.STRATEGY_MANAGER,
      fallback: fallback.StrategyManager,
    },
    {
      key: 'portfolioManager',
      moduleId: MODULE_IDS.PORTFOLIO_MANAGER,
      fallback: fallback.PortfolioManager,
    },
    {
      key: 'swapAdapter',
      moduleId: MODULE_IDS.SWAP_ADAPTER,
      fallback: fallback.SwapAdapter,
    },
    {
      key: 'liquidityManager',
      moduleId: MODULE_IDS.LIQUIDITY_MANAGER,
      fallback: fallback.LiquidityManager,
    },
    {
      key: 'feeManager',
      moduleId: MODULE_IDS.FEE_MANAGER,
      fallback: fallback.FeeManager,
    },
    {
      key: 'costBasisManager',
      moduleId: MODULE_IDS.COST_BASIS_MANAGER,
      fallback: fallback.CostBasisManager,
    },
    {
      key: 'performanceManager',
      moduleId: MODULE_IDS.PERFORMANCE_MANAGER,
      fallback: fallback.PerformanceManager,
    },
    {
      key: 'p2pEscrow',
      moduleId: MODULE_IDS.P2P_ESCROW,
      fallback: fallback.P2PEscrow,
    },
  ];

  const contracts = moduleKeys.map((item) => ({
    address: directoryAddress,
    abi: PROTOCOL_DIRECTORY_ABI,
    functionName: 'getAddress' as const,
    args: [item.moduleId] as const,
    chainId,
  }));

  const { data, isLoading, isError, error } = useReadContracts({
    contracts,
    query: {
      enabled: !isZeroAddress,
      staleTime: Infinity, // Protocol directory module addresses are immutable
      refetchOnWindowFocus: false,
      gcTime: 24 * 60 * 60 * 1000,
    },
  });

  const getResult = (index: number): `0x${string}` | undefined => {
    if (data && data[index]) {
      const res = data[index];
      if (
        res.status === 'success' &&
        res.result &&
        res.result !== '0x0000000000000000000000000000000000000000'
      ) {
        return res.result as `0x${string}`;
      }
    }
    if (chainId === baseSepolia.id) {
      return moduleKeys[index]?.fallback;
    }
    // Mainnet fallbacks (canonical verified addresses)
    const mainnetFallbackMap: Record<string, `0x${string}` | undefined> = {
      controller: DEPLOYED_CONTRACTS_MAINNET.UnifyVaultController,
      vault: DEPLOYED_CONTRACTS_MAINNET.CustodyVault,
      treasury: DEPLOYED_CONTRACTS_MAINNET.Treasury,
      oracle: DEPLOYED_CONTRACTS_MAINNET.OracleManager,
      token: DEPLOYED_CONTRACTS_MAINNET.UVBEToken,
      strategyManager: DEPLOYED_CONTRACTS_MAINNET.StrategyManager,
      portfolioManager: DEPLOYED_CONTRACTS_MAINNET.PortfolioManager,
      swapAdapter: DEPLOYED_CONTRACTS_MAINNET.SwapAdapter,
      liquidityManager: DEPLOYED_CONTRACTS_MAINNET.LiquidityManager,
      feeManager: DEPLOYED_CONTRACTS_MAINNET.FeeManager,
      costBasisManager: DEPLOYED_CONTRACTS_MAINNET.CostBasisManager,
      performanceManager: DEPLOYED_CONTRACTS_MAINNET.PerformanceManager,
      p2pEscrow: DEPLOYED_CONTRACTS_MAINNET.P2PEscrow,
    };
    const key = moduleKeys[index]?.key;
    if (key && mainnetFallbackMap[key]) {
      return mainnetFallbackMap[key];
    }
    return undefined;
  };

  return {
    directory: directoryAddress,
    controller: getResult(0),
    vault: getResult(1),
    treasury: getResult(2),
    oracle: getResult(3),
    token: getResult(4),
    strategyManager: getResult(5),
    portfolioManager: getResult(6),
    swapAdapter: getResult(7),
    liquidityManager: getResult(8),
    feeManager: getResult(9),
    costBasisManager: getResult(10),
    performanceManager: getResult(11),
    p2pEscrow: getResult(12),
    isLoading: !isZeroAddress && isLoading,
    isError,
    error: error as Error | null,
  };
}
