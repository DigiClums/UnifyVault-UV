/**
 * Canonical Data Transformation Engine for UnifyVault.
 *
 * Transforms raw on-chain multi-call data and mathematical computations into structured
 * domain models (ProtocolMetrics, UserPortfolio, AssetHolding[]).
 */

import { getChainTokens } from '../constants';
import { AssetHolding, ProtocolMetrics, StrategyMetrics, UserPortfolio } from '../types';
import {
  calculateAllocationBps,
  calculateAllocationPercent,
  calculateAssetUSDValue,
  calculateAssetUSDValue18,
  calculateAverageEntryPrice,
  calculateCostBasis,
  calculateCurrentValueUSD,
  calculateTotalVaultNAVUSD,
  calculateOwnershipPercentage,
  calculateOwnershipRatio,
  calculatePnL,
  calculateSharePriceUSD,
  calculateSharePriceUSD18,
  calculateTVLUSD,
  calculateTVLUSD18,
  calculateUserProRataBalance,
  calculateUserProRataUSD,
} from './portfolioMath';
import {
  formatNAVUSD,
  formatPercent,
  formatPnLPercent,
  formatPnLUSD,
  formatShares,
  formatUnits,
  formatUSD,
  formatHighPrecisionUSD,
} from './math';

export interface RawProtocolContractData {
  wbtcTotalAssets: bigint;
  wethTotalAssets: bigint;
  usdcTotalAssets: bigint;
  priceWBTC: bigint;
  priceWETH: bigint;
  priceUSDC: bigint;
  totalSharesRaw: bigint;
  onChainNAV?: readonly [bigint, bigint];
}

export interface PerformanceStruct {
  currentValueUSD: bigint;
  investedCapitalUSD: bigint;
  realizedPnL: bigint;
  unrealizedPnL: bigint;
  netPnL: bigint;
  roiBps: bigint;
  holdingPeriod: bigint;
}

export interface RawUserContractData {
  userAddress?: `0x${string}`;
  userSharesRaw: bigint;
  userUsdcRaw: bigint;
  contractInvestedAssetsRaw: bigint;
  onChainPerformance?:
    | PerformanceStruct
    | readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint]
    | readonly [bigint, bigint, bigint, bigint];
}

export function transformProtocolMetrics(
  rawData: RawProtocolContractData,
  strategy: StrategyMetrics,
  chainId?: number,
): ProtocolMetrics {
  const tokens = getChainTokens(chainId);
  const {
    wbtcTotalAssets,
    wethTotalAssets,
    usdcTotalAssets,
    priceWBTC,
    priceWETH,
    priceUSDC,
    totalSharesRaw,
    onChainNAV,
  } = rawData;

  const wbtcUSDValue18 = calculateAssetUSDValue18(wbtcTotalAssets, 8, priceWBTC);
  const wethUSDValue18 = calculateAssetUSDValue18(wethTotalAssets, 18, priceWETH);
  const usdcUSDValue18 = calculateAssetUSDValue18(usdcTotalAssets, 6, priceUSDC);

  const wbtcUSDValue = Number(wbtcUSDValue18) / 1e18;
  const wethUSDValue = Number(wethUSDValue18) / 1e18;
  const usdcUSDValue = Number(usdcUSDValue18) / 1e18;

  // Primary source of truth: On-chain PortfolioManager.calculateNAV()
  const totalPortfolioValueUSDNumber = onChainNAV
    ? Number(onChainNAV[0]) / 1e18
    : Number(calculateTVLUSD18([wbtcUSDValue18, wethUSDValue18, usdcUSDValue18])) / 1e18;

  const sharePriceUSD = onChainNAV
    ? Number(onChainNAV[1]) / 1e18
    : Number(
        calculateSharePriceUSD18(
          calculateTVLUSD18([wbtcUSDValue18, wethUSDValue18, usdcUSDValue18]),
          totalSharesRaw,
        ),
      ) / 1e18;

  const totalVaultNAVUSD = calculateTotalVaultNAVUSD(totalPortfolioValueUSDNumber);

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

  // When portfolio has no value AND strategy data is available, display target weights.
  // When strategy data hasn't loaded, show "0.0" — never fabricate.
  const defaultBtcPercent =
    strategy.targetBtcBps !== undefined ? (strategy.targetBtcBps / 100).toFixed(1) : '0.0';
  const defaultEthPercent =
    strategy.targetEthBps !== undefined ? (strategy.targetEthBps / 100).toFixed(1) : '0.0';

  const custodyBtcPercent =
    totalPortfolioValueUSDNumber > 0 ? custodyBtcPercentNum.toFixed(1) : defaultBtcPercent;
  const custodyEthPercent =
    totalPortfolioValueUSDNumber > 0 ? custodyEthPercentNum.toFixed(1) : defaultEthPercent;
  const custodyUsdcPercent =
    totalPortfolioValueUSDNumber > 0 ? custodyUsdcPercentNum.toFixed(1) : '0.0';

  const protocolHoldings: AssetHolding[] = [
    {
      symbol: 'BTC',
      name: 'Coinbase Wrapped BTC',
      address: tokens.cbBTC,
      decimals: 8,
      balanceRaw: wbtcTotalAssets,
      balanceFormatted: formatUnits(wbtcTotalAssets, 8),
      priceUSD: formatUSD(Number(formatUnits(priceWBTC, 18))),
      valueUSD: formatUSD(wbtcUSDValue),
      weightBps: calculateAllocationBps(wbtcUSDValue, totalPortfolioValueUSDNumber),
      weightPercent: `${custodyBtcPercent}%`,
      currentWeightPercent: `${custodyBtcPercent}%`,
      targetWeightPercent: strategy.targetBtcPercent ?? '...',
    },
    {
      symbol: 'ETH',
      name: 'Wrapped Ether',
      address: tokens.WETH,
      decimals: 18,
      balanceRaw: wethTotalAssets,
      balanceFormatted: formatUnits(wethTotalAssets, 18),
      priceUSD: formatUSD(Number(formatUnits(priceWETH, 18))),
      valueUSD: formatUSD(wethUSDValue),
      weightBps: calculateAllocationBps(wethUSDValue, totalPortfolioValueUSDNumber),
      weightPercent: `${custodyEthPercent}%`,
      currentWeightPercent: `${custodyEthPercent}%`,
      targetWeightPercent: strategy.targetEthPercent ?? '...',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin (Reserve)',
      address: tokens.USDC,
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
    navPerShareUSD: formatNAVUSD(sharePriceUSD),
    sharePriceUSD: formatNAVUSD(sharePriceUSD),
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

export function transformUserPortfolio(
  rawUserData: RawUserContractData,
  rawProtocolData: RawProtocolContractData,
  protocolMetrics: ProtocolMetrics,
  chainId?: number,
): UserPortfolio {
  const tokens = getChainTokens(chainId);
  const { userAddress, userSharesRaw, userUsdcRaw, contractInvestedAssetsRaw, onChainPerformance } =
    rawUserData;
  const {
    totalSharesRaw,
    wbtcTotalAssets,
    wethTotalAssets,
    usdcTotalAssets,
    priceWBTC,
    priceWETH,
    priceUSDC,
  } = rawProtocolData;

  const sharePriceNum = protocolMetrics.sharePriceNumber ?? 1.0;

  const ownershipRatio = calculateOwnershipRatio(userSharesRaw, totalSharesRaw);
  const ownershipPercentage = calculateOwnershipPercentage(ownershipRatio);

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

  const wbtcUSDValue = calculateAssetUSDValue(wbtcTotalAssets, 8, priceWBTC);
  const wethUSDValue = calculateAssetUSDValue(wethTotalAssets, 18, priceWETH);
  const usdcUSDValue = calculateAssetUSDValue(usdcTotalAssets, 6, priceUSDC);

  const userWbtcUSD = calculateUserProRataUSD(wbtcUSDValue, ownershipRatio);
  const userWethUSD = calculateUserProRataUSD(wethUSDValue, ownershipRatio);
  const userUsdcUSD = calculateUserProRataUSD(usdcUSDValue, ownershipRatio);
  const userTotalUSDNumber = userWbtcUSD + userWethUSD + userUsdcUSD;

  // Primary source of truth: On-chain PerformanceManager.performance() or CostBasisManager.portfolioPerformance()
  let investedAssetsUSD = 0;
  let currentValueUSD = 0;
  let pnlUSD = 0;
  let pnlPercent = 0;
  let p2pRealizedPnLUSD = 0;

  if (onChainPerformance && typeof onChainPerformance === 'object') {
    if ('investedCapitalUSD' in onChainPerformance) {
      // PerformanceManager struct (Viem object or proxy array with named properties)
      const perf = onChainPerformance as PerformanceStruct;
      investedAssetsUSD = Number(perf.investedCapitalUSD) / 1e18;
      currentValueUSD = Number(perf.currentValueUSD) / 1e18;
      p2pRealizedPnLUSD = Number(perf.realizedPnL) / 1e18;
      const unrealizedUSD = Number(perf.unrealizedPnL) / 1e18;
      pnlUSD = unrealizedUSD;
      pnlPercent = investedAssetsUSD >= 0.001 ? (unrealizedUSD / investedAssetsUSD) * 100 : 0;
    } else if ('costBasisUSD' in onChainPerformance) {
      // CostBasisManager portfolioPerformance tuple (Viem object or proxy array with named properties)
      const cbm = onChainPerformance as unknown as {
        costBasisUSD: bigint;
        currentValueUSD: bigint;
        pnlUSD: bigint;
        pnlBps: bigint;
      };
      investedAssetsUSD = Number(cbm.costBasisUSD) / 1e18;
      currentValueUSD = Number(cbm.currentValueUSD) / 1e18;
      const unrealizedUSD = currentValueUSD - investedAssetsUSD;
      pnlUSD = unrealizedUSD;
      pnlPercent = investedAssetsUSD >= 0.001 ? (unrealizedUSD / investedAssetsUSD) * 100 : 0;
    } else if (Array.isArray(onChainPerformance) && onChainPerformance.length >= 7) {
      // Positional array from PerformanceManager
      // [currentValueUSD, investedCapitalUSD, realizedPnL, unrealizedPnL, netPnL, roiBps, holdingPeriod]
      currentValueUSD = Number(onChainPerformance[0]) / 1e18;
      investedAssetsUSD = Number(onChainPerformance[1]) / 1e18;
      p2pRealizedPnLUSD = Number(onChainPerformance[2]) / 1e18;
      const unrealizedUSD = Number(onChainPerformance[3]) / 1e18;
      pnlUSD = unrealizedUSD;
      pnlPercent = investedAssetsUSD >= 0.001 ? (unrealizedUSD / investedAssetsUSD) * 100 : 0;
    } else if (Array.isArray(onChainPerformance) && onChainPerformance.length >= 4) {
      // Positional array from CostBasisManager
      // [costBasisUSD, currentValueUSD, pnlUSD, pnlBps]
      investedAssetsUSD = Number(onChainPerformance[0]) / 1e18;
      currentValueUSD = Number(onChainPerformance[1]) / 1e18;
      const unrealizedUSD = currentValueUSD - investedAssetsUSD;
      pnlUSD = unrealizedUSD;
      pnlPercent = investedAssetsUSD >= 0.001 ? (unrealizedUSD / investedAssetsUSD) * 100 : 0;
    } else {
      investedAssetsUSD = calculateCostBasis(contractInvestedAssetsRaw, userSharesRaw, userAddress);
      currentValueUSD = calculateCurrentValueUSD(userSharesRaw, sharePriceNum);
      const computedPnL = calculatePnL(currentValueUSD, investedAssetsUSD);
      pnlUSD = computedPnL.pnlUSD;
      pnlPercent = computedPnL.pnlPercent;
    }
  } else {
    investedAssetsUSD = calculateCostBasis(contractInvestedAssetsRaw, userSharesRaw, userAddress);
    currentValueUSD = calculateCurrentValueUSD(userSharesRaw, sharePriceNum);
    const computedPnL = calculatePnL(currentValueUSD, investedAssetsUSD);
    pnlUSD = computedPnL.pnlUSD;
    pnlPercent = computedPnL.pnlPercent;
  }

  const isProfitable = pnlUSD >= 0;

  const averageEntryPriceUSDNum = calculateAverageEntryPrice(
    userSharesRaw,
    investedAssetsUSD,
    sharePriceNum,
  );

  const formattedShares = formatShares(userSharesRaw);
  const formattedCostBasisUSD = formatUSD(investedAssetsUSD);
  const formattedHoldingValueUSD = formatUSD(currentValueUSD);
  const formattedAvgEntryUSD = formatUSD(averageEntryPriceUSDNum);
  const formattedNavPerShareUSD = formatUSD(sharePriceNum);

  if (typeof window !== 'undefined') {
    console.log('[Portfolio Accounting Audit]:', {
      rawShares: userSharesRaw.toString(),
      formattedShares,
      totalSupply: totalSharesRaw.toString(),
      navPerShare: formattedNavPerShareUSD,
      costBasisRaw: contractInvestedAssetsRaw.toString(),
      costBasisUSD: formattedCostBasisUSD,
      holdingValue: formattedHoldingValueUSD,
      ownership: ownershipPercentage,
      averageEntryPrice: formattedAvgEntryUSD,
    });
  }

  const userHoldings: AssetHolding[] = [
    {
      symbol: 'BTC',
      name: 'Coinbase Wrapped BTC',
      address: tokens.cbBTC,
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
      targetWeightPercent: protocolMetrics.targetBtcPercent ?? '...',
    },
    {
      symbol: 'ETH',
      name: 'Wrapped Ether',
      address: tokens.WETH,
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
      targetWeightPercent: protocolMetrics.targetEthPercent ?? '...',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin (Reserve)',
      address: tokens.USDC,
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
    currentValueUSD: formatHighPrecisionUSD(currentValueUSD, 4),
    rawCurrentValueUSD: currentValueUSD,
    pnlUSD: formatPnLUSD(pnlUSD),
    rawPnLUSD: pnlUSD,
    pnlPercentage: formatPnLPercent(pnlPercent),
    p2pRealizedPnLUSD: formatPnLUSD(p2pRealizedPnLUSD),
    rawP2PRealizedPnLUSD: p2pRealizedPnLUSD,
    isProfitable,
    averageEntryPriceUSD: formatUSD(averageEntryPriceUSDNum),
    ownershipPercentage,
    userHoldings,
  };
}
