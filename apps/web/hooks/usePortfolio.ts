import { useReadContracts, useAccount } from 'wagmi';
import { type Abi } from 'viem';
import { UNIFY_VAULT_CONTROLLER_ABI, IERC20_ABI } from '../lib/config/abis';
import { useProtocolDirectoryAddresses } from './useProtocolDirectoryAddresses';
import { useNetwork } from './useNetwork';
import { SUPPORTED_ASSETS } from '../lib/config/assets';
import * as React from 'react';

export function usePortfolio() {
  const { address: userAddress } = useAccount();
  const { chainId } = useNetwork();
  const {
    controllerAddress,
    indexTokenAddress,
    isLoading: isLoadingDirectory,
  } = useProtocolDirectoryAddresses();

  const currentChainId = chainId || 84532;
  const assets = SUPPORTED_ASSETS[currentChainId] || [];

  // 1. Single consolidated portfolio contract query array
  const portfolioContracts = React.useMemo(() => {
    if (!userAddress || !controllerAddress || !indexTokenAddress || assets.length === 0) {
      return [];
    }

    const queries: {
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
    }[] = [
      // 0. User share balance
      {
        address: indexTokenAddress,
        abi: IERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      },
    ];

    // Per-asset queries: collateral balance, redemption preview, deposit quote price
    assets.forEach((asset) => {
      // 1. User ERC20 collateral balance
      queries.push({
        address: asset.address,
        abi: IERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      });

      // 2. Redemption preview (uses 0n fallback when initial shares balance pending)
      queries.push({
        address: controllerAddress,
        abi: UNIFY_VAULT_CONTROLLER_ABI,
        functionName: 'previewRedeem',
        args: [asset.address, 0n], // Updated dynamically in second pass or via multicall
      });

      // 3. Oracle deposit quote (normalizedPrice)
      const amountUnit = 10n ** BigInt(asset.decimals);
      queries.push({
        address: controllerAddress,
        abi: UNIFY_VAULT_CONTROLLER_ABI,
        functionName: 'getDepositQuote',
        args: [asset.address, amountUnit, 0n, userAddress],
      });
    });

    return queries;
  }, [userAddress, controllerAddress, indexTokenAddress, assets]);

  // Execute single multicall for index share balance + asset balances & quotes
  const {
    data: initialData,
    isLoading: isLoadingInitial,
    refetch: refetchPortfolio,
  } = useReadContracts({
    contracts: portfolioContracts,
    query: {
      enabled: portfolioContracts.length > 0 && !!userAddress,
      staleTime: 10000,
      refetchInterval: 15000,
    },
  });

  const sharesBalance =
    initialData?.[0]?.status === 'success' ? (initialData[0].result as bigint) : 0n;

  // Build secondary pass with exact sharesBalance for previewRedeem if shares > 0
  const activeContracts = React.useMemo(() => {
    if (!userAddress || !controllerAddress || !indexTokenAddress || assets.length === 0) {
      return [];
    }

    const queries: {
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
    }[] = [
      {
        address: indexTokenAddress,
        abi: IERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      },
    ];

    assets.forEach((asset) => {
      queries.push({
        address: asset.address,
        abi: IERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      });

      queries.push({
        address: controllerAddress,
        abi: UNIFY_VAULT_CONTROLLER_ABI,
        functionName: 'previewRedeem',
        args: [asset.address, sharesBalance],
      });

      const amountUnit = 10n ** BigInt(asset.decimals);
      queries.push({
        address: controllerAddress,
        abi: UNIFY_VAULT_CONTROLLER_ABI,
        functionName: 'getDepositQuote',
        args: [asset.address, amountUnit, 0n, userAddress],
      });
    });

    return queries;
  }, [userAddress, controllerAddress, indexTokenAddress, assets, sharesBalance]);

  const { data: portfolioData, isLoading: isLoadingPortfolio } = useReadContracts({
    contracts: activeContracts,
    query: {
      enabled: activeContracts.length > 0 && !!userAddress,
      staleTime: 10000,
      refetchInterval: 15000,
    },
  });

  const results = React.useMemo(() => {
    if (!userAddress) return null;
    const currentData = portfolioData || initialData;
    if (!currentData || activeContracts.length === 0) {
      return {
        sharesBalance: 0n,
        sharesValueUSD: 0n,
        walletCollateralUSD: 0n,
        totalPortfolioValueUSD: 0n,
        assetsBalances: assets.map((asset) => ({
          ...asset,
          balance: 0n,
          assetValueUSD: 0n,
          redeemableAmount: 0n,
          redeemableValueUSD: 0n,
          normalizedPrice: 0n,
        })),
      };
    }

    const finalShares =
      currentData[0]?.status === 'success' ? (currentData[0].result as bigint) : 0n;
    const hasShares = finalShares > 0n;

    const assetsBalances = assets.map((asset, index) => {
      const baseIdx = 1 + index * 3;

      // 1. ERC20 Balance
      const balanceResult = currentData[baseIdx];
      const balance = balanceResult?.status === 'success' ? (balanceResult.result as bigint) : 0n;

      // 2. Preview Redeem
      let redeemableAmount = 0n;
      if (hasShares) {
        const previewResult = currentData[baseIdx + 1];
        redeemableAmount =
          previewResult?.status === 'success' ? (previewResult.result as bigint) : 0n;
      }

      // 3. Deposit Quote Price
      const quoteResult = currentData[baseIdx + 2];
      const quote =
        quoteResult?.status === 'success'
          ? (quoteResult.result as unknown as { normalizedPrice: bigint })
          : null;
      const normalizedPrice = quote ? quote.normalizedPrice : 0n;

      // redeemableValueUSD = (redeemableAmount * normalizedPrice) / 10^decimals
      const redeemableValueUSD =
        (redeemableAmount * normalizedPrice) / 10n ** BigInt(asset.decimals);

      // userAssetValueUSD = (balance * normalizedPrice) / 10^decimals
      const assetValueUSD = (balance * normalizedPrice) / 10n ** BigInt(asset.decimals);

      return {
        ...asset,
        balance,
        assetValueUSD,
        redeemableAmount,
        redeemableValueUSD,
        normalizedPrice,
      };
    });

    const redeemableUSD = assetsBalances.reduce((maxVal, asset) => {
      return asset.redeemableValueUSD > maxVal ? asset.redeemableValueUSD : maxVal;
    }, 0n);

    const walletCollateralUSD = assetsBalances.reduce(
      (sum, asset) => sum + asset.assetValueUSD,
      0n,
    );
    const totalPortfolioValueUSD = walletCollateralUSD + redeemableUSD;

    return {
      sharesBalance: finalShares,
      sharesValueUSD: redeemableUSD,
      walletCollateralUSD,
      totalPortfolioValueUSD,
      assetsBalances,
    };
  }, [userAddress, portfolioData, initialData, activeContracts, assets]);

  return {
    portfolio: results,
    isLoading: isLoadingDirectory || isLoadingInitial || isLoadingPortfolio,
    refetch: refetchPortfolio,
  };
}
