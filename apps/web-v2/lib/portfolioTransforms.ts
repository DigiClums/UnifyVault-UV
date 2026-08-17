/**
 * Canonical Data Transformation Engine for UnifyVault.
 *
 * Transforms raw on-chain multi-call data and mathematical computations into structured
 * domain models (ProtocolMetrics, UserPortfolio, AssetHolding[]).
 */

import { getChainTokens } from '../constants';
import {
  AssetHolding,
  OracleFeedStatus,
  ProtocolMetrics,
  StrategyMetrics,
  UserPortfolio,
} from '../types';
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
  priceWBTC: bigint | null;
  priceWETH: bigint | null;
  priceUSDC: bigint | null;
  btcStatus?: OracleFeedStatus;
  ethStatus?: OracleFeedStatus;
  usdcStatus?: OracleFeedStatus;
  totalSharesRaw: bigint;
  onChainNAV?: readonly [bigint, bigint];
}

import { reconcileAccountLedger, LedgerEvent } from './ledger/accountLedger';

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
  p2pTrades?: {
    tradeId: number;
    buyer: string;
    seller: string;
    amount: bigint;
    fiatAmount: bigint;
    fiatCurrency: string;
    state: number;
    fundingTimestamp: number;
    paymentTimestamp: number;
  }[];
  ledgerEvents?: LedgerEvent[];
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
    btcStatus = priceWBTC && priceWBTC > 0n ? 'LIVE' : 'UNAVAILABLE',
    ethStatus = priceWETH && priceWETH > 0n ? 'LIVE' : 'UNAVAILABLE',
    usdcStatus = priceUSDC && priceUSDC > 0n ? 'LIVE' : 'UNAVAILABLE',
    totalSharesRaw,
    onChainNAV,
  } = rawData;

  const isBtcValid = btcStatus === 'LIVE' && priceWBTC !== null && priceWBTC > 0n;
  const isEthValid = ethStatus === 'LIVE' && priceWETH !== null && priceWETH > 0n;
  const isUsdcValid = usdcStatus === 'LIVE' && priceUSDC !== null && priceUSDC > 0n;

  const wbtcUSDValue18 = isBtcValid ? calculateAssetUSDValue18(wbtcTotalAssets, 8, priceWBTC!) : 0n;
  const wethUSDValue18 = isEthValid
    ? calculateAssetUSDValue18(wethTotalAssets, 18, priceWETH!)
    : 0n;
  const usdcUSDValue18 = isUsdcValid
    ? calculateAssetUSDValue18(usdcTotalAssets, 6, priceUSDC!)
    : 0n;

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
      priceUSD: isBtcValid ? formatUSD(Number(formatUnits(priceWBTC!, 18))) : 'Price unavailable',
      valueUSD: isBtcValid
        ? formatUSD(wbtcUSDValue)
        : wbtcTotalAssets > 0n
          ? 'Value unavailable'
          : '$0.00',
      weightBps: calculateAllocationBps(wbtcUSDValue, totalPortfolioValueUSDNumber),
      weightPercent: `${custodyBtcPercent}%`,
      currentWeightPercent: `${custodyBtcPercent}%`,
      targetWeightPercent: strategy.targetBtcPercent ?? '...',
      oracleStatus: btcStatus,
    },
    {
      symbol: 'ETH',
      name: 'Wrapped Ether',
      address: tokens.WETH,
      decimals: 18,
      balanceRaw: wethTotalAssets,
      balanceFormatted: formatUnits(wethTotalAssets, 18),
      priceUSD: isEthValid ? formatUSD(Number(formatUnits(priceWETH!, 18))) : 'Price unavailable',
      valueUSD: isEthValid
        ? formatUSD(wethUSDValue)
        : wethTotalAssets > 0n
          ? 'Value unavailable'
          : '$0.00',
      weightBps: calculateAllocationBps(wethUSDValue, totalPortfolioValueUSDNumber),
      weightPercent: `${custodyEthPercent}%`,
      currentWeightPercent: `${custodyEthPercent}%`,
      targetWeightPercent: strategy.targetEthPercent ?? '...',
      oracleStatus: ethStatus,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin (Reserve)',
      address: tokens.USDC,
      decimals: 6,
      balanceRaw: usdcTotalAssets,
      balanceFormatted: formatUnits(usdcTotalAssets, 6),
      priceUSD: isUsdcValid ? formatUSD(Number(formatUnits(priceUSDC!, 18))) : 'Price unavailable',
      valueUSD: isUsdcValid
        ? formatUSD(usdcUSDValue)
        : usdcTotalAssets > 0n
          ? 'Value unavailable'
          : '$0.00',
      weightBps: calculateAllocationBps(usdcUSDValue, totalPortfolioValueUSDNumber),
      weightPercent: `${custodyUsdcPercent}%`,
      currentWeightPercent: `${custodyUsdcPercent}%`,
      targetWeightPercent: '0.0%',
      oracleStatus: usdcStatus,
    },
  ];

  return {
    totalPortfolioValueUSD: formatUSD(totalPortfolioValueUSDNumber),
    totalVaultNAVUSD: formatUSD(totalVaultNAVUSD),
    backingValueUSD: formatUSD(totalVaultNAVUSD),
    totalPortfolioValueUSDNumber,
    navPerShareUSD: formatNAVUSD(sharePriceUSD),
    sharePriceUSD: formatNAVUSD(sharePriceUSD),
    currentUVPriceUSD: formatNAVUSD(sharePriceUSD),
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

  // ── Deterministic Decoupled Ledger Reconciliation ──
  const ledgerResult = reconcileAccountLedger({
    userAddress,
    totalWalletSharesRaw: userSharesRaw,
    onChainCostBasisRaw: contractInvestedAssetsRaw,
    currentSharePriceUSD: sharePriceNum,
    onChainPerformance: rawUserData.onChainPerformance,
    p2pTrades: rawUserData.p2pTrades,
    events: rawUserData.ledgerEvents,
  });

  const vaultSharesRaw = ledgerResult.vaultPortfolio.portfolioSharesRaw;
  const investedAssetsUSD = ledgerResult.vaultPortfolio.portfolioInvestedCapitalUSD;
  const currentValueUSD = ledgerResult.vaultPortfolio.portfolioPositionValueUSD;
  const pnlUSD = ledgerResult.vaultPortfolio.portfolioPnLUSD;
  const pnlPercent = ledgerResult.vaultPortfolio.portfolioROI;
  const isProfitable = ledgerResult.vaultPortfolio.isProfitable;
  const averageEntryPriceUSDNum = ledgerResult.vaultPortfolio.averageEntryPriceUSD;

  // Pro-rata claims on vault collateral are calculated strictly from Vault portfolio shares
  const ownershipRatio = calculateOwnershipRatio(vaultSharesRaw, totalSharesRaw);
  const ownershipPercentage = calculateOwnershipPercentage(ownershipRatio);

  const userWbtcBalRaw = calculateUserProRataBalance(
    wbtcTotalAssets,
    vaultSharesRaw,
    totalSharesRaw,
  );
  const userWethBalRaw = calculateUserProRataBalance(
    wethTotalAssets,
    vaultSharesRaw,
    totalSharesRaw,
  );
  const userUsdcBalRaw = calculateUserProRataBalance(
    usdcTotalAssets,
    vaultSharesRaw,
    totalSharesRaw,
  );

  const wbtcUSDValue = calculateAssetUSDValue(wbtcTotalAssets, 8, priceWBTC || 0n);
  const wethUSDValue = calculateAssetUSDValue(wethTotalAssets, 18, priceWETH || 0n);
  const usdcUSDValue = calculateAssetUSDValue(usdcTotalAssets, 6, priceUSDC || 0n);

  const userWbtcUSD = calculateUserProRataUSD(wbtcUSDValue, ownershipRatio);
  const userWethUSD = calculateUserProRataUSD(wethUSDValue, ownershipRatio);
  const userUsdcUSD = calculateUserProRataUSD(usdcUSDValue, ownershipRatio);
  const userTotalUSDNumber = userWbtcUSD + userWethUSD + userUsdcUSD;

  const formattedShares = formatShares(vaultSharesRaw);
  const formattedCostBasisUSD = formatUSD(investedAssetsUSD);
  const formattedHoldingValueUSD = formatUSD(currentValueUSD);
  const formattedAvgEntryUSD = formatUSD(averageEntryPriceUSDNum);
  const formattedNavPerShareUSD = formatUSD(sharePriceNum);

  if (typeof window !== 'undefined') {
    console.log('[Portfolio Accounting Audit]:', {
      rawShares: vaultSharesRaw.toString(),
      walletShares: userSharesRaw.toString(),
      formattedShares,
      totalSupply: totalSharesRaw.toString(),
      navPerShare: formattedNavPerShareUSD,
      costBasisRaw: contractInvestedAssetsRaw.toString(),
      costBasisUSD: formattedCostBasisUSD,
      holdingValue: formattedHoldingValueUSD,
      ownership: ownershipPercentage,
      averageEntryPrice: formattedAvgEntryUSD,
      p2pShares: ledgerResult.p2pTrading.activeP2PSharesRaw.toString(),
    });
  }

  const btcStatus =
    rawProtocolData.btcStatus ?? (priceWBTC && priceWBTC > 0n ? 'LIVE' : 'UNAVAILABLE');
  const ethStatus =
    rawProtocolData.ethStatus ?? (priceWETH && priceWETH > 0n ? 'LIVE' : 'UNAVAILABLE');
  const usdcStatus =
    rawProtocolData.usdcStatus ?? (priceUSDC && priceUSDC > 0n ? 'LIVE' : 'UNAVAILABLE');

  const isBtcValid = btcStatus === 'LIVE' && priceWBTC !== null && priceWBTC > 0n;
  const isEthValid = ethStatus === 'LIVE' && priceWETH !== null && priceWETH > 0n;
  const isUsdcValid = usdcStatus === 'LIVE' && priceUSDC !== null && priceUSDC > 0n;

  const userHoldings: AssetHolding[] = [
    {
      symbol: 'BTC',
      name: 'Coinbase Wrapped BTC',
      address: tokens.cbBTC,
      decimals: 8,
      balanceRaw: userWbtcBalRaw,
      balanceFormatted: formatUnits(userWbtcBalRaw, 8),
      priceUSD: isBtcValid ? formatUSD(Number(formatUnits(priceWBTC!, 18))) : 'Price unavailable',
      valueUSD: isBtcValid
        ? formatUSD(userWbtcUSD)
        : userWbtcBalRaw > 0n
          ? 'Value unavailable'
          : '$0.00',
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
      oracleStatus: btcStatus,
    },
    {
      symbol: 'ETH',
      name: 'Wrapped Ether',
      address: tokens.WETH,
      decimals: 18,
      balanceRaw: userWethBalRaw,
      balanceFormatted: formatUnits(userWethBalRaw, 18),
      priceUSD: isEthValid ? formatUSD(Number(formatUnits(priceWETH!, 18))) : 'Price unavailable',
      valueUSD: isEthValid
        ? formatUSD(userWethUSD)
        : userWethBalRaw > 0n
          ? 'Value unavailable'
          : '$0.00',
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
      oracleStatus: ethStatus,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin (Reserve)',
      address: tokens.USDC,
      decimals: 6,
      balanceRaw: userUsdcBalRaw,
      balanceFormatted: formatUnits(userUsdcBalRaw, 6),
      priceUSD: isUsdcValid ? formatUSD(Number(formatUnits(priceUSDC!, 18))) : 'Price unavailable',
      valueUSD: isUsdcValid
        ? formatUSD(userUsdcUSD)
        : userUsdcBalRaw > 0n
          ? 'Value unavailable'
          : '$0.00',
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
      oracleStatus: usdcStatus,
    },
  ];

  return {
    userAddress,
    userSharesRaw: vaultSharesRaw,
    userSharesBalance: formatShares(vaultSharesRaw),
    walletBalanceRaw: userSharesRaw,
    walletBalanceFormatted: formatShares(userSharesRaw),
    userUsdcBalanceRaw: userUsdcRaw,
    userUsdcBalanceFormatted: formatUnits(userUsdcRaw, 6),
    investedAssetsUSD: formatUSD(investedAssetsUSD),
    rawInvestedAssetsUSD: investedAssetsUSD,
    currentValueUSD: formatHighPrecisionUSD(currentValueUSD, 4),
    rawCurrentValueUSD: currentValueUSD,
    pnlUSD: formatPnLUSD(pnlUSD),
    rawPnLUSD: pnlUSD,
    pnlPercentage: formatPnLPercent(pnlPercent),
    isProfitable,
    averageEntryPriceUSD: formatUSD(averageEntryPriceUSDNum),
    ownershipPercentage,
    userHoldings,
    vaultPortfolio: ledgerResult.vaultPortfolio,
    p2pTrading: ledgerResult.p2pTrading,
    escrowLocked: ledgerResult.escrowLocked,
    hasP2PShares: ledgerResult.hasP2PShares,
    hasVaultShares: ledgerResult.hasVaultShares,
    hasLockedShares: ledgerResult.hasLockedShares,
  };
}
