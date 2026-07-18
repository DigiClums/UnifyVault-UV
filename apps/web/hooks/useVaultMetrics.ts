import { useReadContracts } from 'wagmi';
import { type Abi } from 'viem';
import { UNIFY_VAULT_CONTROLLER_ABI, IERC20_ABI } from '../lib/config/abis';
import { useControllerAddress } from './useControllerAddress';
import { useNetwork } from './useNetwork';
import { SUPPORTED_ASSETS } from '../lib/config/assets';
import * as React from 'react';

export function useVaultMetrics() {
  const { chainId } = useNetwork();
  const { controllerAddress, isLoading: isLoadingController } = useControllerAddress();
  const currentChainId = chainId || 84532;
  const assets = SUPPORTED_ASSETS[currentChainId] || [];

  // 1. Resolve Vault and Token Addresses from Controller
  const { data: controllerConfig, isLoading: isLoadingConfig } = useReadContracts({
    contracts: [
      {
        address: controllerAddress,
        abi: UNIFY_VAULT_CONTROLLER_ABI,
        functionName: 'vault',
      },
      {
        address: controllerAddress,
        abi: UNIFY_VAULT_CONTROLLER_ABI,
        functionName: 'token',
      },
      {
        address: controllerAddress,
        abi: UNIFY_VAULT_CONTROLLER_ABI,
        functionName: 'maxDeposit',
      },
    ],
    query: {
      enabled: !!controllerAddress,
    },
  });

  const vaultAddress =
    controllerConfig?.[0]?.status === 'success'
      ? (controllerConfig[0].result as `0x${string}`)
      : undefined;
  const indexTokenAddress =
    controllerConfig?.[1]?.status === 'success'
      ? (controllerConfig[1].result as `0x${string}`)
      : undefined;
  const maxDepositLimit =
    controllerConfig?.[2]?.status === 'success'
      ? (controllerConfig[2].result as bigint)
      : undefined;

  // 2. Fetch TVL Balances and share supply
  const custodyVaultAbi = [
    {
      type: 'function',
      name: 'totalAssets',
      inputs: [{ name: 'asset', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
    },
  ] as const;

  // Construct contracts query array dynamically for supported assets
  const contractsQuery = React.useMemo(() => {
    if (!vaultAddress || !indexTokenAddress) return [];

    const queries: {
      address: `0x${string}` | undefined;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
    }[] = [
      {
        address: indexTokenAddress,
        abi: IERC20_ABI,
        functionName: 'totalSupply',
      },
    ];

    // Add totalAssets reads for each asset
    assets.forEach((asset) => {
      queries.push({
        address: vaultAddress,
        abi: custodyVaultAbi,
        functionName: 'totalAssets',
        args: [asset.address],
      });
    });

    return queries;
  }, [vaultAddress, indexTokenAddress, assets]);

  const {
    data: metricsData,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics,
  } = useReadContracts({
    contracts: contractsQuery,
    query: {
      enabled: contractsQuery.length > 0,
    },
  });

  // 3. Query price feeds for assets using getDepositQuote view
  const quoteContracts = React.useMemo(() => {
    if (!controllerAddress) return [];

    // Query quote of 1 unit of each asset to retrieve normalizedPrice
    return assets.map((asset) => {
      const amountUnit = 10n ** BigInt(asset.decimals);
      return {
        address: controllerAddress,
        abi: UNIFY_VAULT_CONTROLLER_ABI,
        functionName: 'getDepositQuote',
        args: [asset.address, amountUnit, 0n, '0x0000000000000000000000000000000000000000'],
      };
    });
  }, [controllerAddress, assets]);

  const {
    data: quotesData,
    isLoading: isLoadingQuotes,
    refetch: refetchQuotes,
  } = useReadContracts({
    contracts: quoteContracts,
    query: {
      enabled: quoteContracts.length > 0,
    },
  });

  // Calculate compiled metrics
  const results = React.useMemo(() => {
    if (!metricsData || !quotesData) return null;

    const totalSupply =
      metricsData[0]?.status === 'success' ? (metricsData[0].result as bigint) : 0n;

    let totalTvlUSD = 0n;
    const assetAllocations = assets.map((asset, index) => {
      const balanceResult = metricsData[index + 1];
      const quoteResult = quotesData[index];

      const totalAssets =
        balanceResult?.status === 'success' ? (balanceResult.result as bigint) : 0n;
      const quote =
        quoteResult?.status === 'success'
          ? (quoteResult.result as unknown as { normalizedPrice: bigint })
          : null;
      const normalizedPrice = quote ? quote.normalizedPrice : 0n; // 18 decimals USD price

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
  }, [metricsData, quotesData, assets, maxDepositLimit, vaultAddress, indexTokenAddress]);

  const refetchAll = React.useCallback(() => {
    refetchMetrics();
    refetchQuotes();
  }, [refetchMetrics, refetchQuotes]);

  return {
    metrics: results,
    isLoading: isLoadingController || isLoadingConfig || isLoadingMetrics || isLoadingQuotes,
    refetch: refetchAll,
  };
}
