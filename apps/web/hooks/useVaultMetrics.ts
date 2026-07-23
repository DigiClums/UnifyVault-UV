import { useReadContracts } from 'wagmi';
import { type Abi } from 'viem';
import { UNIFY_VAULT_CONTROLLER_ABI, IERC20_ABI } from '../lib/config/abis';
import { useProtocolDirectoryAddresses } from './useProtocolDirectoryAddresses';
import { useNetwork } from './useNetwork';
import { SUPPORTED_ASSETS } from '../lib/config/assets';
import * as React from 'react';

const custodyVaultAbi = [
  {
    type: 'function',
    name: 'totalAssets',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export function useVaultMetrics() {
  const { chainId } = useNetwork();
  const {
    controllerAddress,
    indexTokenAddress,
    vaultAddress,
    isLoading: isLoadingDirectory,
  } = useProtocolDirectoryAddresses();

  const currentChainId = chainId || 84532;
  const assets = SUPPORTED_ASSETS[currentChainId] || [];

  // Build single consolidated multicall array for all vault metrics
  const combinedContracts = React.useMemo(() => {
    if (!controllerAddress || !indexTokenAddress || !vaultAddress || assets.length === 0) {
      return [];
    }

    const queries: {
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
    }[] = [
      // 0. Max deposit limit
      {
        address: controllerAddress,
        abi: UNIFY_VAULT_CONTROLLER_ABI,
        functionName: 'maxDeposit',
      },
      // 1. Total index share supply
      {
        address: indexTokenAddress,
        abi: IERC20_ABI,
        functionName: 'totalSupply',
      },
    ];

    // 2. Vault collateral totalAssets per asset
    assets.forEach((asset) => {
      queries.push({
        address: vaultAddress,
        abi: custodyVaultAbi,
        functionName: 'totalAssets',
        args: [asset.address],
      });
    });

    // 3. Oracle deposit quote (normalizedPrice) per asset
    assets.forEach((asset) => {
      const amountUnit = 10n ** BigInt(asset.decimals);
      queries.push({
        address: controllerAddress,
        abi: UNIFY_VAULT_CONTROLLER_ABI,
        functionName: 'getDepositQuote',
        args: [asset.address, amountUnit, 0n, ZERO_ADDRESS],
      });
    });

    return queries;
  }, [controllerAddress, indexTokenAddress, vaultAddress, assets]);

  const {
    data: metricsData,
    isLoading: isLoadingMetrics,
    refetch,
  } = useReadContracts({
    contracts: combinedContracts,
    query: {
      enabled: combinedContracts.length > 0,
      staleTime: 10000,
      refetchInterval: 15000,
    },
  });

  // Calculate compiled metrics from single multicall result
  const results = React.useMemo(() => {
    if (!metricsData || combinedContracts.length === 0) return null;

    const maxDepositResult = metricsData[0];
    const maxDepositLimit =
      maxDepositResult?.status === 'success' ? (maxDepositResult.result as bigint) : 0n;

    const totalSupplyResult = metricsData[1];
    const totalSupply =
      totalSupplyResult?.status === 'success' ? (totalSupplyResult.result as bigint) : 0n;

    let totalTvlUSD = 0n;
    const assetAllocations = assets.map((asset, index) => {
      const totalAssetsIdx = 2 + index;
      const quoteIdx = 2 + assets.length + index;

      const balanceResult = metricsData[totalAssetsIdx];
      const quoteResult = metricsData[quoteIdx];

      const totalAssets =
        balanceResult?.status === 'success' ? (balanceResult.result as bigint) : 0n;

      let normalizedPrice = 0n;
      if (quoteResult?.status === 'success' && quoteResult.result) {
        const rawRes = quoteResult.result as any;
        if (typeof rawRes === 'object' && rawRes !== null && 'normalizedPrice' in rawRes) {
          normalizedPrice = BigInt(rawRes.normalizedPrice);
        } else if (Array.isArray(rawRes) && rawRes.length >= 6) {
          normalizedPrice = BigInt(rawRes[5]);
        }
      }

      // tvlUsd = (totalAssets * normalizedPrice) / 10^decimals
      const assetTvlUSD = (totalAssets * normalizedPrice) / 10n ** BigInt(asset.decimals);
      totalTvlUSD += assetTvlUSD;

      return {
        ...asset,
        totalAssets,
        normalizedPrice,
        assetTvlUSD,
      };
    });

    return {
      totalSupply,
      totalTvlUSD,
      assetAllocations,
      maxDepositLimit,
      vaultAddress,
      indexTokenAddress,
    };
  }, [metricsData, combinedContracts, assets, vaultAddress, indexTokenAddress]);

  return {
    metrics: results,
    isLoading: isLoadingDirectory || isLoadingMetrics,
    refetch,
  };
}
