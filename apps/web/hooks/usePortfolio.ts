import { useReadContracts, useAccount } from 'wagmi';
import { type Abi } from 'viem';
import { UNIFY_VAULT_CONTROLLER_ABI, IERC20_ABI } from '../lib/config/abis';
import { useControllerAddress } from './useControllerAddress';
import { useIndexTokenAddress } from './useIndexTokenAddress';
import { useNetwork } from './useNetwork';
import { SUPPORTED_ASSETS } from '../lib/config/assets';
import * as React from 'react';

export function usePortfolio() {
  const { address: userAddress } = useAccount();
  const { chainId } = useNetwork();
  const { controllerAddress, isLoading: isLoadingController } = useControllerAddress();
  const { indexTokenAddress, isLoading: isLoadingTokenAddress } = useIndexTokenAddress();
  const currentChainId = chainId || 84532;
  const assets = SUPPORTED_ASSETS[currentChainId] || [];

  // 1. Fetch user share balance
  const {
    data: userShareData,
    isLoading: isLoadingShare,
    refetch: refetchShare,
  } = useReadContracts({
    contracts: [
      {
        address: indexTokenAddress,
        abi: IERC20_ABI,
        functionName: 'balanceOf',
        args: userAddress ? [userAddress] : undefined,
      },
    ],
    query: {
      enabled: !!indexTokenAddress && !!userAddress,
    },
  });

  const sharesBalance =
    userShareData?.[0]?.status === 'success' ? (userShareData[0].result as bigint) : 0n;

  // 2. Fetch user asset balances and redemption previews
  const portfolioContracts = React.useMemo(() => {
    if (!userAddress || !controllerAddress) return [];

    const queries: {
      address: `0x${string}` | undefined;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
    }[] = [];

    // User ERC20 balance for each collateral asset
    assets.forEach((asset) => {
      queries.push({
        address: asset.address,
        abi: IERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      });
    });

    // Redemption preview for user's full share balance for each asset
    if (sharesBalance > 0n) {
      assets.forEach((asset) => {
        queries.push({
          address: controllerAddress,
          abi: UNIFY_VAULT_CONTROLLER_ABI,
          functionName: 'previewRedeem',
          args: [asset.address, sharesBalance],
        });
      });
    }

    // Dynamic oracle prices (normalizedPrice via getDepositQuote)
    assets.forEach((asset) => {
      const amountUnit = 10n ** BigInt(asset.decimals);
      queries.push({
        address: controllerAddress,
        abi: UNIFY_VAULT_CONTROLLER_ABI,
        functionName: 'getDepositQuote',
        args: [asset.address, amountUnit, 0n, '0x0000000000000000000000000000000000000000'],
      });
    });

    return queries;
  }, [userAddress, controllerAddress, assets, sharesBalance]);

  const {
    data: portfolioData,
    isLoading: isLoadingPortfolio,
    refetch: refetchPortfolio,
  } = useReadContracts({
    contracts: portfolioContracts,
    query: {
      enabled: portfolioContracts.length > 0 && !!userAddress,
    },
  });

  const results = React.useMemo(() => {
    if (!userAddress) return null;
    if (portfolioContracts.length === 0) {
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

    const assetCount = assets.length;
    const hasShares = sharesBalance > 0n;

    // Extract balance results
    const assetsBalances = assets.map((asset, index) => {
      const balanceResult = portfolioData?.[index];
      const balance = balanceResult?.status === 'success' ? (balanceResult.result as bigint) : 0n;

      // Extract preview redeem results (if sharesBalance > 0, otherwise 0n)
      let redeemableAmount = 0n;
      if (hasShares) {
        const previewResult = portfolioData?.[assetCount + index];
        redeemableAmount =
          previewResult?.status === 'success' ? (previewResult.result as bigint) : 0n;
      }

      // Extract price results
      const priceIndex = hasShares ? assetCount * 2 + index : assetCount + index;
      const quoteResult = portfolioData?.[priceIndex];
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

    // Total portfolio value in USD represents the sum of the USD value of their direct collateral wallet balances + their redeemable index holdings USD value
    // We average their redeemable USD values across supported assets (since redeemable value is functionally equivalent in terms of USD value)
    const redeemableUSD = assetsBalances.reduce((maxVal, asset) => {
      return asset.redeemableValueUSD > maxVal ? asset.redeemableValueUSD : maxVal;
    }, 0n);

    const walletCollateralUSD = assetsBalances.reduce(
      (sum, asset) => sum + asset.assetValueUSD,
      0n,
    );
    const totalPortfolioValueUSD = walletCollateralUSD + redeemableUSD;

    return {
      sharesBalance,
      sharesValueUSD: redeemableUSD,
      walletCollateralUSD,
      totalPortfolioValueUSD,
      assetsBalances,
    };
  }, [userAddress, portfolioData, assets, sharesBalance, portfolioContracts]);

  const refetchAll = React.useCallback(() => {
    refetchShare();
    if (userAddress) {
      refetchPortfolio();
    }
  }, [refetchShare, refetchPortfolio, userAddress]);

  return {
    portfolio: results,
    isLoading: isLoadingController || isLoadingTokenAddress || isLoadingShare || isLoadingPortfolio,
    refetch: refetchAll,
  };
}
