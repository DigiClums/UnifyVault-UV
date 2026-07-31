/**
 * Canonical Data Transformation Engine for UnifyVault.
 *
 * Transforms raw on-chain multi-call data and mathematical computations into structured
 * domain models (ProtocolMetrics, UserPortfolio, AssetHolding[]).
 *
 * Fixes Holdings Table labeling by explicitly populating:
 * - Target Weight  -> StrategyManager target allocations
 * - Current Weight -> CustodyVault actual allocations
 */

import { FALLBACK_ADDRESSES } from '../constants';
import { AssetHolding, ProtocolMetrics, StrategyMetrics, UserPortfolio } from '../types';
import {
  calculateAllocationBps,
  calculateAllocationPercent,
  calculateAssetUSDValue,
  calculateAverageEntryPrice,
  calculateCostBasis,
  calculateCurrentValueUSD,
  calculateTotalVaultNAVUSD,
  calculateOwnershipPercentage,
  calculateOwnershipRatio,
  calculatePnL,
  calculateSharePriceUSD,
  calculateTVLUSD,
  calculateUserProRataBalance,
  calculateUserProRataUSD,
} from './portfolioMath';
import { formatPercent, formatShares, formatUnits, formatUSD } from './math';

export interface RawProtocolContractData {
  wbtcTotalAssets: bigint;
  wethTotalAssets: bigint;
  usdcTotalAssets: bigint;
  priceWBTC: bigint;
  priceWETH: bigint;
  priceUSDC: bigint;
  totalSharesRaw: bigint;
}

export interface RawUserContractData {
  userAddress?: `0x${string}`;
  userSharesRaw: bigint;
  userUsdcRaw: bigint;
  contractInvestedAssetsRaw: bigint;
}

/**
 * Builds the ProtocolMetrics model containing TVL, NAV, Share Price, Total Supply,
 * Target Strategy Allocations, Current Custody Allocations, and Protocol Reserves Inventory.
 *
 * @param rawData - Raw protocol multi-call contract responses.
 * @param strategy - Target strategy weight metrics from StrategyManager.
 * @returns Structured ProtocolMetrics object.
 */
export function transformProtocolMetrics(
  rawData: RawProtocolContractData,
  strategy: StrategyMetrics,
): ProtocolMetrics {
  const {
    wbtcTotalAssets,
    wethTotalAssets,
    usdcTotalAssets,
    priceWBTC,
    priceWETH,
    priceUSDC,
    totalSharesRaw,
  } = rawData;

  // Calculate individual asset USD values
  const wbtcUSDValue = calculateAssetUSDValue(wbtcTotalAssets, 8, priceWBTC);
  const wethUSDValue = calculateAssetUSDValue(wethTotalAssets, 18, priceWETH);
  const usdcUSDValue = calculateAssetUSDValue(usdcTotalAssets, 6, priceUSDC);

  // Total Portfolio Value (TVL)
  const totalPortfolioValueUSDNumber = calculateTVLUSD([wbtcUSDValue, wethUSDValue, usdcUSDValue]);

  // NAV and Share Price
  const sharePriceUSD = calculateSharePriceUSD(totalPortfolioValueUSDNumber, totalSharesRaw);
  const totalVaultNAVUSD = calculateTotalVaultNAVUSD(totalPortfolioValueUSDNumber);

  // Actual Custody Allocation Percentages
  const custodyBtcPercentNum = calculateAllocationPercent(
    wbtcUSDValue,
    totalPortfolioValueUSDNumber,
  );
  const custodyEthPercentNum = calculateAllocationPercent(
    wethUSDValue,
    totalPortfolioValueUSDNumber,
  );
  const custodyUsdcPercentNum = calculateAllocationPercent(
    usdcUSDValue,
    totalPortfolioValueUSDNumber,
  );

  const custodyBtcPercent =
    totalPortfolioValueUSDNumber > 0 ? custodyBtcPercentNum.toFixed(1) : '50.0';
  const custodyEthPercent =
    totalPortfolioValueUSDNumber > 0 ? custodyEthPercentNum.toFixed(1) : '50.0';
  const custodyUsdcPercent =
    totalPortfolioValueUSDNumber > 0 ? custodyUsdcPercentNum.toFixed(1) : '0.0';

  // Construct Protocol-Wide Asset Holdings Inventory
  const protocolHoldings: AssetHolding[] = [
    {
      symbol: 'BTC',
      name: 'Wrapped Bitcoin',
      address: FALLBACK_ADDRESSES.WBTC,
      decimals: 8,
      balanceRaw: wbtcTotalAssets,
      balanceFormatted: formatUnits(wbtcTotalAssets, 8),
      priceUSD: formatUSD(Number(formatUnits(priceWBTC, 18))),
      valueUSD: formatUSD(wbtcUSDValue),
      weightBps: calculateAllocationBps(wbtcUSDValue, totalPortfolioValueUSDNumber),
      weightPercent: `${custodyBtcPercent}%`,
      currentWeightPercent: `${custodyBtcPercent}%`,
      targetWeightPercent: strategy.targetBtcPercent,
    },
    {
      symbol: 'ETH',
      name: 'Wrapped Ether',
      address: FALLBACK_ADDRESSES.WETH,
      decimals: 18,
      balanceRaw: wethTotalAssets,
      balanceFormatted: formatUnits(wethTotalAssets, 18),
      priceUSD: formatUSD(Number(formatUnits(priceWETH, 18))),
      valueUSD: formatUSD(wethUSDValue),
      weightBps: calculateAllocationBps(wethUSDValue, totalPortfolioValueUSDNumber),
      weightPercent: `${custodyEthPercent}%`,
      currentWeightPercent: `${custodyEthPercent}%`,
      targetWeightPercent: strategy.targetEthPercent,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin (Reserve)',
      address: FALLBACK_ADDRESSES.USDC,
      decimals: 6,
      balanceRaw: usdcTotalAssets,
      balanceFormatted: formatUnits(usdcTotalAssets, 6),
      priceUSD: formatUSD(Number(formatUnits(priceUSDC, 18))),
      valueUSD: formatUSD(usdcUSDValue),
      weightBps: calculateAllocationBps(usdcUSDValue, totalPortfolioValueUSDNumber),
      weightPercent: `${custodyUsdcPercent}%`,
      currentWeightPercent: `${custodyUsdcPercent}%`,
      targetWeightPercent: '0.0%',
    },
  ];

  return {
    totalPortfolioValueUSD: formatUSD(totalPortfolioValueUSDNumber),
    totalVaultNAVUSD: formatUSD(totalVaultNAVUSD),
    totalPortfolioValueUSDNumber,
    navPerShareUSD: formatUSD(sharePriceUSD),
    sharePriceUSD: formatUSD(sharePriceUSD),
    sharePriceNumber: sharePriceUSD,
    totalSharesRaw,
    totalSharesFormatted: formatShares(totalSharesRaw),

    targetBtcBps: strategy.targetBtcBps,
    targetEthBps: strategy.targetEthBps,
    targetBtcPercent: strategy.targetBtcPercent,
    targetEthPercent: strategy.targetEthPercent,

    custodyBtcPercent: `${custodyBtcPercent}%`,
    custodyEthPercent: `${custodyEthPercent}%`,

    protocolHoldings,
  };
}

/**
 * Builds the UserPortfolio model containing user shares, USDC balance, ownership ratio,
 * invested assets, current portfolio value, PnL metrics, average entry price, and pro-rata holdings.
 *
 * @param rawUserData - User specific on-chain multi-call contract responses.
 * @param rawProtocolData - Protocol raw contract responses for pro-rata asset allocation.
 * @param protocolMetrics - Evaluated ProtocolMetrics for share pricing and target allocations.
 * @returns Structured UserPortfolio object.
 */
export function transformUserPortfolio(
  rawUserData: RawUserContractData,
  rawProtocolData: RawProtocolContractData,
  protocolMetrics: ProtocolMetrics,
): UserPortfolio {
  const { userAddress, userSharesRaw, userUsdcRaw, contractInvestedAssetsRaw } = rawUserData;
  const {
    totalSharesRaw,
    wbtcTotalAssets,
    wethTotalAssets,
    usdcTotalAssets,
    priceWBTC,
    priceWETH,
    priceUSDC,
  } = rawProtocolData;

  // Use raw unrounded numeric share price directly from protocol metrics
  const sharePriceNum = protocolMetrics.sharePriceNumber ?? 1.0;

  // Calculate user ownership ratio
  const ownershipRatio = calculateOwnershipRatio(userSharesRaw, totalSharesRaw);
  const ownershipPercentage = calculateOwnershipPercentage(ownershipRatio);

  // User pro-rata raw asset balances
  const userWbtcBalRaw = calculateUserProRataBalance(
    wbtcTotalAssets,
    userSharesRaw,
    totalSharesRaw,
  );
  const userWethBalRaw = calculateUserProRataBalance(
    wethTotalAssets,
    userSharesRaw,
    totalSharesRaw,
  );
  const userUsdcBalRaw = calculateUserProRataBalance(
    usdcTotalAssets,
    userSharesRaw,
    totalSharesRaw,
  );

  // User pro-rata USD values
  const wbtcUSDValue = calculateAssetUSDValue(wbtcTotalAssets, 8, priceWBTC);
  const wethUSDValue = calculateAssetUSDValue(wethTotalAssets, 18, priceWETH);
  const usdcUSDValue = calculateAssetUSDValue(usdcTotalAssets, 6, priceUSDC);

  const userWbtcUSD = calculateUserProRataUSD(wbtcUSDValue, ownershipRatio);
  const userWethUSD = calculateUserProRataUSD(wethUSDValue, ownershipRatio);
  const userUsdcUSD = calculateUserProRataUSD(usdcUSDValue, ownershipRatio);
  const userTotalUSDNumber = userWbtcUSD + userWethUSD + userUsdcUSD;

  // Derive cost basis & invested assets
  const investedAssetsUSD = calculateCostBasis(
    contractInvestedAssetsRaw,
    userSharesRaw,
    userAddress,
  );

  // Calculate current user value and PnL
  const currentValueUSD = calculateCurrentValueUSD(userSharesRaw, sharePriceNum);
  const { pnlUSD, pnlPercent, isProfitable } = calculatePnL(currentValueUSD, investedAssetsUSD);

  // Average Entry Price
  const averageEntryPriceUSDNum = calculateAverageEntryPrice(
    userSharesRaw,
    investedAssetsUSD,
    sharePriceNum,
  );

  // Construct Connected User Pro-Rata Share Holdings
  const userHoldings: AssetHolding[] = [
    {
      symbol: 'BTC',
      name: 'Wrapped Bitcoin',
      address: FALLBACK_ADDRESSES.WBTC,
      decimals: 8,
      balanceRaw: userWbtcBalRaw,
      balanceFormatted: formatUnits(userWbtcBalRaw, 8),
      priceUSD: formatUSD(Number(formatUnits(priceWBTC, 18))),
      valueUSD: formatUSD(userWbtcUSD),
      weightBps: calculateAllocationBps(userWbtcUSD, userTotalUSDNumber),
      weightPercent:
        userTotalUSDNumber > 0
          ? `${calculateAllocationPercent(userWbtcUSD, userTotalUSDNumber).toFixed(1)}%`
          : '0.0%',
      currentWeightPercent:
        userTotalUSDNumber > 0
          ? `${calculateAllocationPercent(userWbtcUSD, userTotalUSDNumber).toFixed(1)}%`
          : '0.0%',
      targetWeightPercent: protocolMetrics.targetBtcPercent,
    },
    {
      symbol: 'ETH',
      name: 'Wrapped Ether',
      address: FALLBACK_ADDRESSES.WETH,
      decimals: 18,
      balanceRaw: userWethBalRaw,
      balanceFormatted: formatUnits(userWethBalRaw, 18),
      priceUSD: formatUSD(Number(formatUnits(priceWETH, 18))),
      valueUSD: formatUSD(userWethUSD),
      weightBps: calculateAllocationBps(userWethUSD, userTotalUSDNumber),
      weightPercent:
        userTotalUSDNumber > 0
          ? `${calculateAllocationPercent(userWethUSD, userTotalUSDNumber).toFixed(1)}%`
          : '0.0%',
      currentWeightPercent:
        userTotalUSDNumber > 0
          ? `${calculateAllocationPercent(userWethUSD, userTotalUSDNumber).toFixed(1)}%`
          : '0.0%',
      targetWeightPercent: protocolMetrics.targetEthPercent,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin (Reserve)',
      address: FALLBACK_ADDRESSES.USDC,
      decimals: 6,
      balanceRaw: userUsdcBalRaw,
      balanceFormatted: formatUnits(userUsdcBalRaw, 6),
      priceUSD: formatUSD(Number(formatUnits(priceUSDC, 18))),
      valueUSD: formatUSD(userUsdcUSD),
      weightBps: calculateAllocationBps(userUsdcUSD, userTotalUSDNumber),
      weightPercent:
        userTotalUSDNumber > 0
          ? `${calculateAllocationPercent(userUsdcUSD, userTotalUSDNumber).toFixed(1)}%`
          : '0.0%',
      currentWeightPercent:
        userTotalUSDNumber > 0
          ? `${calculateAllocationPercent(userUsdcUSD, userTotalUSDNumber).toFixed(1)}%`
          : '0.0%',
      targetWeightPercent: '0.0%',
    },
  ];

  return {
    userAddress,
    userSharesRaw,
    userSharesBalance: formatShares(userSharesRaw),
    userUsdcBalanceRaw: userUsdcRaw,
    userUsdcBalanceFormatted: formatUnits(userUsdcRaw, 6),
    investedAssetsUSD: formatUSD(investedAssetsUSD),
    rawInvestedAssetsUSD: investedAssetsUSD,
    currentValueUSD: formatUSD(currentValueUSD),
    rawCurrentValueUSD: currentValueUSD,
    pnlUSD: pnlUSD > 0.005 ? `+${formatUSD(pnlUSD)}` : formatUSD(pnlUSD),
    rawPnLUSD: pnlUSD,
    pnlPercentage: formatPercent(pnlPercent),
    isProfitable,
    averageEntryPriceUSD: formatUSD(averageEntryPriceUSDNum),
    ownershipPercentage,
    userHoldings,
  };
}
