import { formatUnits } from 'viem';
import { ResolvedProtocolAddresses } from '../../contracts/ProtocolDirectory';
import {
  ProtocolService,
  StrategyAssetDetail,
  TreasuryAssetDetail,
  OracleFeedDetail,
} from './protocolService';
import { ZERO_ADDRESS } from '../../lib/config/network';

export interface TVLData {
  rawUsd: bigint;
  formattedUsd: string;
  usdValueNumber: number;
}

export interface NAVData {
  rawNavPerShare: bigint;
  formattedNavPerShare: string;
  navUsdNumber: number;
}

export interface TotalSupplyData {
  raw: bigint;
  formatted: string;
}

export interface TreasuryFeesData {
  totalUsdNumber: number;
  totalUsdFormatted: string;
  nativeBalanceRaw: bigint;
  nativeBalanceFormatted: string;
  balances: TreasuryAssetDetail[];
}

export interface UserShareBalanceData {
  userAddress?: `0x${string}`;
  rawShares: bigint;
  formattedShares: string;
  usdValueNumber: number;
  ownershipPercentage: number;
  userUsdcBalanceRaw: bigint;
  userUsdcBalanceFormatted: string;
  costBasisRaw: bigint;
  costBasisFormatted: string;
  costBasisUsdNumber: number;
  realizedProfitUsdNumber: number;
  performanceFeePaidUsdNumber: number;
}

export interface OracleStatusData {
  isHealthy: boolean;
  feeds: OracleFeedDetail[];
}

export interface LiquidityStatusData {
  needsRefill: boolean;
  needsSweep: boolean;
  amountRaw: bigint;
  operationalBalanceRaw: bigint;
  reserveBalanceRaw: bigint;
  totalBalanceRaw: bigint;
}

export interface HealthStatusData {
  isHealthy: boolean;
  isPaused: boolean;
  isDirectoryResolved: boolean;
  timestamp: number;
}

export interface DashboardData {
  addresses: ResolvedProtocolAddresses;
  TVL: TVLData;
  NAV: NAVData;
  TotalSupply: TotalSupplyData;
  TreasuryFees: TreasuryFeesData;
  CustodyAssets: StrategyAssetDetail[];
  UserShareBalance: UserShareBalanceData;
  OracleStatus: OracleStatusData;
  LiquidityStatus: LiquidityStatusData;
  HealthStatus: HealthStatusData;
}

export interface DashboardParams {
  userAddress?: `0x${string}`;
  chainId?: number;
}

/**
 * DashboardService aggregates core protocol metrics into a single, strongly typed
 * DashboardData object for components and pages to consume.
 */
export const DashboardService = {
  /**
   * Primary entry point for fetching complete Dashboard metrics.
   * Never throws exceptions; handles errors gracefully with fallbacks.
   */
  async getDashboardData(params: DashboardParams = {}): Promise<DashboardData> {
    try {
      const metrics = await ProtocolService.fetchRawMetrics(params.userAddress, params.chainId);

      // 1. TVL calculation
      let aggregateCustodyUsd = 0;
      metrics.assets.forEach((asset) => {
        aggregateCustodyUsd += asset.custodyUsdValueNumber;
      });

      const tvlNumber =
        aggregateCustodyUsd > 0
          ? aggregateCustodyUsd
          : Number(formatUnits(metrics.totalPortfolioValueUsdRaw, 18));
      const tvlFormatted = `$${tvlNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // 2. NAV calculation
      const navNumber = Number(formatUnits(metrics.navPerShareRaw, 18));
      const navFormatted = `$${navNumber.toFixed(4)}`;

      // 3. Total Supply
      const totalSupplyFormatted = formatUnits(metrics.totalSupplyRaw, 18);

      // 4. Treasury Fees calculation
      let totalTreasuryFeeUsd = 0;
      metrics.treasuryFees.forEach((tf) => {
        totalTreasuryFeeUsd += tf.usdValueNumber;
      });
      const treasuryFeeFormatted = `$${totalTreasuryFeeUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

      // 5. User Share Balance
      const userShare: UserShareBalanceData = metrics.userMetrics
        ? {
            userAddress: metrics.userMetrics.userAddress,
            rawShares: metrics.userMetrics.shareBalanceRaw,
            formattedShares: metrics.userMetrics.shareBalanceFormatted,
            usdValueNumber: metrics.userMetrics.shareUsdValueNumber,
            ownershipPercentage: metrics.userMetrics.ownershipPercentage,
            userUsdcBalanceRaw: metrics.userMetrics.usdcBalanceRaw,
            userUsdcBalanceFormatted: metrics.userMetrics.usdcBalanceFormatted,
            costBasisRaw: metrics.userMetrics.costBasisRaw,
            costBasisFormatted: metrics.userMetrics.costBasisFormatted,
            costBasisUsdNumber: metrics.userMetrics.costBasisUsdNumber,
            realizedProfitUsdNumber: metrics.userMetrics.realizedProfitUsdNumber,
            performanceFeePaidUsdNumber: metrics.userMetrics.performanceFeePaidUsdNumber,
          }
        : {
            rawShares: 0n,
            formattedShares: '0.00',
            usdValueNumber: 0,
            ownershipPercentage: 0,
            userUsdcBalanceRaw: 0n,
            userUsdcBalanceFormatted: '0.00',
            costBasisRaw: 0n,
            costBasisFormatted: '0.00',
            costBasisUsdNumber: 0,
            realizedProfitUsdNumber: 0,
            performanceFeePaidUsdNumber: 0,
          };

      // 6. Health Status
      const isDirectoryResolved =
        metrics.addresses.directory !== ZERO_ADDRESS &&
        metrics.addresses.controller !== ZERO_ADDRESS;

      const isHealthy =
        isDirectoryResolved && !metrics.isControllerPaused && metrics.isOracleHealthy;

      return {
        addresses: metrics.addresses,
        TVL: {
          rawUsd: metrics.totalPortfolioValueUsdRaw,
          formattedUsd: tvlFormatted,
          usdValueNumber: tvlNumber,
        },
        NAV: {
          rawNavPerShare: metrics.navPerShareRaw,
          formattedNavPerShare: navFormatted,
          navUsdNumber: navNumber,
        },
        TotalSupply: {
          raw: metrics.totalSupplyRaw,
          formatted: totalSupplyFormatted,
        },
        TreasuryFees: {
          totalUsdNumber: totalTreasuryFeeUsd,
          totalUsdFormatted: treasuryFeeFormatted,
          nativeBalanceRaw: metrics.treasuryNativeRaw,
          nativeBalanceFormatted: formatUnits(metrics.treasuryNativeRaw, 18),
          balances: metrics.treasuryFees,
        },
        CustodyAssets: metrics.assets,
        UserShareBalance: userShare,
        OracleStatus: {
          isHealthy: metrics.isOracleHealthy,
          feeds: metrics.oracleFeeds,
        },
        LiquidityStatus: metrics.liquidity,
        HealthStatus: {
          isHealthy,
          isPaused: metrics.isControllerPaused,
          isDirectoryResolved,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      console.error('DashboardService: Failed to fetch dashboard data:', error);
      return getFallbackDashboardData();
    }
  },
};

/**
 * Helper function returning default fallback data in case of complete RPC/network failure.
 * Prevents application crashes.
 */
function getFallbackDashboardData(): DashboardData {
  return {
    addresses: {
      directory: ZERO_ADDRESS as `0x${string}`,
      controller: ZERO_ADDRESS as `0x${string}`,
      vault: ZERO_ADDRESS as `0x${string}`,
      treasury: ZERO_ADDRESS as `0x${string}`,
      token: ZERO_ADDRESS as `0x${string}`,
      oracleManager: ZERO_ADDRESS as `0x${string}`,
      strategyManager: ZERO_ADDRESS as `0x${string}`,
      portfolioManager: ZERO_ADDRESS as `0x${string}`,
      swapAdapter: ZERO_ADDRESS as `0x${string}`,
      liquidityManager: ZERO_ADDRESS as `0x${string}`,
    },
    TVL: { rawUsd: 0n, formattedUsd: '$0.00', usdValueNumber: 0 },
    NAV: {
      rawNavPerShare: 1000000000000000000n,
      formattedNavPerShare: '$1.0000',
      navUsdNumber: 1.0,
    },
    TotalSupply: { raw: 0n, formatted: '0.00' },
    TreasuryFees: {
      totalUsdNumber: 0,
      totalUsdFormatted: '$0.00',
      nativeBalanceRaw: 0n,
      nativeBalanceFormatted: '0.00',
      balances: [],
    },
    CustodyAssets: [],
    UserShareBalance: {
      rawShares: 0n,
      formattedShares: '0.00',
      usdValueNumber: 0,
      ownershipPercentage: 0,
      userUsdcBalanceRaw: 0n,
      userUsdcBalanceFormatted: '0.00',
      costBasisRaw: 0n,
      costBasisFormatted: '0.00',
      costBasisUsdNumber: 0,
      realizedProfitUsdNumber: 0,
      performanceFeePaidUsdNumber: 0,
    },
    OracleStatus: { isHealthy: false, feeds: [] },
    LiquidityStatus: {
      needsRefill: false,
      needsSweep: false,
      amountRaw: 0n,
      operationalBalanceRaw: 0n,
      reserveBalanceRaw: 0n,
      totalBalanceRaw: 0n,
    },
    HealthStatus: {
      isHealthy: false,
      isPaused: false,
      isDirectoryResolved: false,
      timestamp: Date.now(),
    },
  };
}
