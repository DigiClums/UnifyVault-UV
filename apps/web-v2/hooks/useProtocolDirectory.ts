'use client';

import { useAccount, useReadContracts } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import { PROTOCOL_DIRECTORY_ABI } from '../lib/contracts/directory';
import {
  getProtocolDirectoryAddress,
  getDefaultChainId,
  MODULE_IDS,
  DEPLOYED_CONTRACTS_SEPOLIA,
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

  const moduleKeys = [
    { key: 'controller', moduleId: MODULE_IDS.CONTROLLER, fallback: DEPLOYED_CONTRACTS_SEPOLIA.UnifyVaultController },
    { key: 'vault', moduleId: MODULE_IDS.VAULT, fallback: DEPLOYED_CONTRACTS_SEPOLIA.CustodyVault },
    { key: 'treasury', moduleId: MODULE_IDS.TREASURY, fallback: DEPLOYED_CONTRACTS_SEPOLIA.Treasury },
    { key: 'oracle', moduleId: MODULE_IDS.ORACLE, fallback: DEPLOYED_CONTRACTS_SEPOLIA.OracleManager },
    { key: 'token', moduleId: MODULE_IDS.TOKEN, fallback: DEPLOYED_CONTRACTS_SEPOLIA.UVBTCETHToken },
    { key: 'strategyManager', moduleId: MODULE_IDS.STRATEGY_MANAGER, fallback: DEPLOYED_CONTRACTS_SEPOLIA.StrategyManager },
    { key: 'portfolioManager', moduleId: MODULE_IDS.PORTFOLIO_MANAGER, fallback: DEPLOYED_CONTRACTS_SEPOLIA.PortfolioManager },
    { key: 'swapAdapter', moduleId: MODULE_IDS.SWAP_ADAPTER, fallback: DEPLOYED_CONTRACTS_SEPOLIA.SwapAdapter },
    { key: 'liquidityManager', moduleId: MODULE_IDS.LIQUIDITY_MANAGER, fallback: DEPLOYED_CONTRACTS_SEPOLIA.LiquidityManager },
    { key: 'feeManager', moduleId: MODULE_IDS.FEE_MANAGER, fallback: DEPLOYED_CONTRACTS_SEPOLIA.FeeManager },
    { key: 'costBasisManager', moduleId: MODULE_IDS.COST_BASIS_MANAGER, fallback: DEPLOYED_CONTRACTS_SEPOLIA.CostBasisManager },
    { key: 'performanceManager', moduleId: MODULE_IDS.PERFORMANCE_MANAGER, fallback: DEPLOYED_CONTRACTS_SEPOLIA.PerformanceManager },
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
      staleTime: 60 * 1000, // 1 minute cache
      gcTime: 5 * 60 * 1000,
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
    // Fallback for Sepolia deployment if on-chain registry entry is missing or zero address
    if (chainId === baseSepolia.id || !chain?.id) {
      return moduleKeys[index]?.fallback;
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
    isLoading: !isZeroAddress && isLoading,
    isError,
    error: error as Error | null,
  };
}
