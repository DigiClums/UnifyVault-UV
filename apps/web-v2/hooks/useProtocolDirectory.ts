'use client';

import { useReadContracts } from 'wagmi';
import { PROTOCOL_DIRECTORY_ABI } from '../lib/contracts/directory';
import { PROTOCOL_DIRECTORY_ADDRESS, MODULE_IDS } from '../constants';

export interface ProtocolAddresses {
  directory: `0x${string}`;
  controller?: `0x${string}`;
  vault?: `0x${string}`;
  treasury?: `0x${string}`;
  oracle?: `0x${string}`;
  token?: `0x${string}`;
  strategyManager?: `0x${string}`;
  feeManager?: `0x${string}`;
  costBasisManager?: `0x${string}`;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useProtocolDirectory(): ProtocolAddresses {
  const directoryAddress = PROTOCOL_DIRECTORY_ADDRESS;
  const isZeroAddress =
    !directoryAddress || directoryAddress === '0x0000000000000000000000000000000000000000';

  const moduleKeys = [
    { key: 'controller', moduleId: MODULE_IDS.CONTROLLER },
    { key: 'vault', moduleId: MODULE_IDS.VAULT },
    { key: 'treasury', moduleId: MODULE_IDS.TREASURY },
    { key: 'oracle', moduleId: MODULE_IDS.ORACLE },
    { key: 'token', moduleId: MODULE_IDS.TOKEN },
    { key: 'strategyManager', moduleId: MODULE_IDS.STRATEGY_MANAGER },
    { key: 'feeManager', moduleId: MODULE_IDS.FEE_MANAGER },
    { key: 'costBasisManager', moduleId: MODULE_IDS.COST_BASIS_MANAGER },
  ];

  const contracts = moduleKeys.map((item) => ({
    address: directoryAddress,
    abi: PROTOCOL_DIRECTORY_ABI,
    functionName: 'getModuleAddress' as const,
    args: [item.moduleId] as const,
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
    if (!data || !data[index]) return undefined;
    const res = data[index];
    if (
      res.status === 'success' &&
      res.result &&
      res.result !== '0x0000000000000000000000000000000000000000'
    ) {
      return res.result as `0x${string}`;
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
    feeManager: getResult(6),
    costBasisManager: getResult(7),
    isLoading: !isZeroAddress && isLoading,
    isError,
    error: error as Error | null,
  };
}
