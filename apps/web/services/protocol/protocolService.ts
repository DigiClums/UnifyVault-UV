import { formatUnits } from 'viem';
import {
  ProtocolDirectoryContract,
  ResolvedProtocolAddresses,
} from '../../contracts/ProtocolDirectory';
import {
  PORTFOLIO_MANAGER_ABI,
  STRATEGY_MANAGER_ABI,
  CUSTODY_VAULT_ABI,
  TREASURY_ABI,
  ORACLE_MANAGER_ABI,
  LIQUIDITY_MANAGER_ABI,
  ERC20_ABI,
  CONTROLLER_ABI,
  COST_BASIS_MANAGER_ABI,
} from '../../contracts/ABIs';
import { executeMulticall } from '../../utils/multicall';
import { ZERO_ADDRESS, getTokens, getDefaultChainId } from '../../lib/config/network';

export interface StrategyAssetDetail {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  weightBps: number;
  weightPercent: number;
  custodyBalanceRaw: bigint;
  custodyBalanceFormatted: string;
  priceUsdRaw: bigint;
  priceUsdNumber: number;
  custodyUsdValueNumber: number;
}

export interface TreasuryAssetDetail {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  balanceRaw: bigint;
  balanceFormatted: string;
  priceUsdNumber: number;
  usdValueNumber: number;
}

export interface OracleFeedDetail {
  address: `0x${string}`;
  symbol: string;
  isFresh: boolean;
  priceUsdRaw: bigint;
  priceUsdNumber: number;
}

export interface RawProtocolMetrics {
  addresses: ResolvedProtocolAddresses;
  navPerShareRaw: bigint;
  totalPortfolioValueUsdRaw: bigint;
  totalSupplyRaw: bigint;
  isControllerPaused: boolean;
  maxDepositRaw: bigint;
  swapSlippageBps: bigint;
  assets: StrategyAssetDetail[];
  treasuryFees: TreasuryAssetDetail[];
  treasuryNativeRaw: bigint;
  oracleFeeds: OracleFeedDetail[];
  isOracleHealthy: boolean;
  liquidity: {
    needsRefill: boolean;
    needsSweep: boolean;
    amountRaw: bigint;
    operationalBalanceRaw: bigint;
    reserveBalanceRaw: bigint;
    totalBalanceRaw: bigint;
  };
  userMetrics?: {
    userAddress: `0x${string}`;
    shareBalanceRaw: bigint;
    shareBalanceFormatted: string;
    shareUsdValueNumber: number;
    ownershipPercentage: number;
    usdcBalanceRaw: bigint;
    usdcBalanceFormatted: string;
    costBasisRaw: bigint;
    costBasisFormatted: string;
    costBasisUsdNumber: number;
    realizedProfitUsdNumber: number;
    performanceFeePaidUsdNumber: number;
  };
}

/**
 * Builds a fallback token metadata lookup from the centralized network configuration.
 */
function buildAssetMetadataLookup(
  chainId?: number,
): Record<string, { symbol: string; decimals: number }> {
  const tokens = getTokens(chainId || getDefaultChainId());
  const lookup: Record<string, { symbol: string; decimals: number }> = {};
  for (const token of tokens) {
    lookup[token.address.toLowerCase()] = { symbol: token.symbol, decimals: token.decimals };
  }
  return lookup;
}

/** Default token addresses used as fallback when StrategyManager cannot be reached. */
function getDefaultTargetAssets(chainId?: number): `0x${string}`[] {
  const tokens = getTokens(chainId || getDefaultChainId());
  return tokens.map((t) => t.address) as `0x${string}`[];
}

/**
 * ProtocolService orchestrates dynamic ProtocolDirectory address resolution and
 * executes batch multicalls to query state across all UnifyVault protocol contracts.
 */
export const ProtocolService = {
  async fetchRawMetrics(
    userAddress?: `0x${string}`,
    chainId?: number,
  ): Promise<RawProtocolMetrics> {
    // 1. Resolve all module addresses dynamically via ProtocolDirectory
    const addresses = await ProtocolDirectoryContract.resolveAllModules(chainId);

    // 2. Fetch Strategy Assets & Target Weights from StrategyManager
    let targetAssets: `0x${string}`[] = getDefaultTargetAssets(chainId);
    let targetWeightsBps: bigint[] = [0n, 5000n, 5000n];

    if (addresses.strategyManager !== ZERO_ADDRESS) {
      try {
        const weightsCall = await executeMulticall([
          {
            address: addresses.strategyManager,
            abi: STRATEGY_MANAGER_ABI,
            functionName: 'getTargetWeights',
          },
        ]);
        if (weightsCall[0]?.status === 'success' && weightsCall[0].result) {
          const [resAssets, resWeights] = weightsCall[0].result as [`0x${string}`[], bigint[]];
          if (resAssets && resAssets.length > 0) {
            targetAssets = resAssets;
            targetWeightsBps = resWeights;
          }
        }
      } catch (err) {
        console.warn(
          '⚠️ ProtocolService: StrategyManager read failed, using fallback asset targets:',
          err,
        );
      }
    }

    // 3. Prepare Batch Multicall array for single RPC batch request
    const batchCalls: any[] = [
      // 0: PortfolioManager.calculateNAV()
      {
        address: addresses.portfolioManager,
        abi: PORTFOLIO_MANAGER_ABI,
        functionName: 'calculateNAV',
      },
      // 1: UVBTCETHToken.totalSupply()
      {
        address: addresses.token,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      },
      // 2: Controller.paused()
      {
        address: addresses.controller,
        abi: CONTROLLER_ABI,
        functionName: 'paused',
      },
      // 3: Controller.maxDeposit()
      {
        address: addresses.controller,
        abi: CONTROLLER_ABI,
        functionName: 'maxDeposit',
      },
      // 4: Controller.swapSlippageBps()
      {
        address: addresses.controller,
        abi: CONTROLLER_ABI,
        functionName: 'swapSlippageBps',
      },
      // 5: Treasury.nativeBalance()
      {
        address: addresses.treasury,
        abi: TREASURY_ABI,
        functionName: 'nativeBalance',
      },
      // 6: LiquidityManager.checkLiquidity(USDC)
      {
        address: addresses.liquidityManager,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'checkLiquidity',
        args: [targetAssets[0]],
      },
      // 7: LiquidityManager.getLiquidityBalances(USDC)
      {
        address: addresses.liquidityManager,
        abi: LIQUIDITY_MANAGER_ABI,
        functionName: 'getLiquidityBalances',
        args: [targetAssets[0]],
      },
    ];

    // Append Per-Asset Calls (Custody Vault, Treasury, Oracle, Token metadata)
    const assetMetaIndex = batchCalls.length;
    targetAssets.forEach((assetAddr) => {
      // CustodyVault.totalAssets
      batchCalls.push({
        address: addresses.vault,
        abi: CUSTODY_VAULT_ABI,
        functionName: 'totalAssets',
        args: [assetAddr],
      });
      // OracleManager.getAssetPrice
      batchCalls.push({
        address: addresses.oracleManager,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'getAssetPrice',
        args: [assetAddr],
      });
      // OracleManager.isPriceFresh
      batchCalls.push({
        address: addresses.oracleManager,
        abi: ORACLE_MANAGER_ABI,
        functionName: 'isPriceFresh',
        args: [assetAddr],
      });
      // Treasury.balance
      batchCalls.push({
        address: addresses.treasury,
        abi: TREASURY_ABI,
        functionName: 'balance',
        args: [assetAddr],
      });
      // ERC20.decimals
      batchCalls.push({
        address: assetAddr,
        abi: ERC20_ABI,
        functionName: 'decimals',
      });
      // ERC20.symbol
      batchCalls.push({
        address: assetAddr,
        abi: ERC20_ABI,
        functionName: 'symbol',
      });
    });

    // Optional User Calls
    let userShareIndex = -1;
    let userUsdcIndex = -1;
    let userCostBasisIndex = -1;
    if (userAddress && userAddress !== ZERO_ADDRESS) {
      userShareIndex = batchCalls.length;
      batchCalls.push({
        address: addresses.token,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      });
      userUsdcIndex = batchCalls.length;
      batchCalls.push({
        address: targetAssets[0],
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      });
      if (addresses.costBasisManager && addresses.costBasisManager !== ZERO_ADDRESS) {
        userCostBasisIndex = batchCalls.length;
        batchCalls.push({
          address: addresses.costBasisManager,
          abi: COST_BASIS_MANAGER_ABI,
          functionName: 'costBasis',
          args: [userAddress],
        });
      }
    }

    // Execute batch multicall
    const batchResults = await executeMulticall(batchCalls);

    // Extract core results with safe fallback handling
    const navResult = batchResults[0]?.status === 'success' ? batchResults[0].result : undefined;
    const [totalPortfolioValueUsdRaw, navPerShareRaw] = Array.isArray(navResult)
      ? (navResult as [bigint, bigint])
      : [0n, 1000000000000000000n];

    const totalSupplyRaw =
      batchResults[1]?.status === 'success' ? (batchResults[1].result as bigint) : 0n;
    const isControllerPaused =
      batchResults[2]?.status === 'success' ? Boolean(batchResults[2].result) : false;
    const maxDepositRaw =
      batchResults[3]?.status === 'success' ? (batchResults[3].result as bigint) : 0n;
    const swapSlippageBps =
      batchResults[4]?.status === 'success' ? (batchResults[4].result as bigint) : 100n;
    const treasuryNativeRaw =
      batchResults[5]?.status === 'success' ? (batchResults[5].result as bigint) : 0n;

    // Liquidity Status
    const checkLiqResult =
      batchResults[6]?.status === 'success' ? batchResults[6].result : undefined;
    const [needsRefill, needsSweep, amountRaw] = Array.isArray(checkLiqResult)
      ? (checkLiqResult as [boolean, boolean, bigint])
      : [false, false, 0n];

    const getLiqResult = batchResults[7]?.status === 'success' ? batchResults[7].result : undefined;
    const [operationalBalanceRaw, reserveBalanceRaw, totalBalanceRaw] = Array.isArray(getLiqResult)
      ? (getLiqResult as [bigint, bigint, bigint])
      : [0n, 0n, 0n];

    // Process Strategy Assets & Treasury Fees
    const assets: StrategyAssetDetail[] = [];
    const treasuryFees: TreasuryAssetDetail[] = [];
    const oracleFeeds: OracleFeedDetail[] = [];
    let allOraclesFresh = true;

    const defaultMetaLookup = buildAssetMetadataLookup(chainId);

    targetAssets.forEach((assetAddr, i) => {
      const offset = assetMetaIndex + i * 6;
      const custodyBal =
        batchResults[offset]?.status === 'success' ? (batchResults[offset].result as bigint) : 0n;
      const priceRaw =
        batchResults[offset + 1]?.status === 'success'
          ? (batchResults[offset + 1].result as bigint)
          : 0n;
      const isFresh =
        batchResults[offset + 2]?.status === 'success'
          ? Boolean(batchResults[offset + 2].result)
          : false;
      const treasuryBal =
        batchResults[offset + 3]?.status === 'success'
          ? (batchResults[offset + 3].result as bigint)
          : 0n;

      const lowerAddr = assetAddr.toLowerCase();
      const defaultMeta = defaultMetaLookup[lowerAddr] || { symbol: 'TOKEN', decimals: 18 };

      const decimals =
        batchResults[offset + 4]?.status === 'success'
          ? Number(batchResults[offset + 4].result)
          : defaultMeta.decimals;
      const symbol =
        batchResults[offset + 5]?.status === 'success'
          ? String(batchResults[offset + 5].result)
          : defaultMeta.symbol;

      if (!isFresh) allOraclesFresh = false;

      const priceUsdNumber = Number(priceRaw) / 1e18;
      const custodyBalFormatted = formatUnits(custodyBal, decimals);
      const custodyUsdValueNumber = Number(custodyBalFormatted) * priceUsdNumber;

      const weightBps = Number(targetWeightsBps[i] || 0n);
      const weightPercent = weightBps / 100;

      assets.push({
        address: assetAddr,
        symbol,
        decimals,
        weightBps,
        weightPercent,
        custodyBalanceRaw: custodyBal,
        custodyBalanceFormatted: custodyBalFormatted,
        priceUsdRaw: priceRaw,
        priceUsdNumber,
        custodyUsdValueNumber,
      });

      const treasuryBalFormatted = formatUnits(treasuryBal, decimals);
      const treasuryUsdValueNumber = Number(treasuryBalFormatted) * priceUsdNumber;

      treasuryFees.push({
        address: assetAddr,
        symbol,
        decimals,
        balanceRaw: treasuryBal,
        balanceFormatted: treasuryBalFormatted,
        priceUsdNumber,
        usdValueNumber: treasuryUsdValueNumber,
      });

      oracleFeeds.push({
        address: assetAddr,
        symbol,
        isFresh,
        priceUsdRaw: priceRaw,
        priceUsdNumber,
      });
    });

    // Process User Metrics if requested
    let userMetrics;
    if (userAddress && userShareIndex !== -1 && userUsdcIndex !== -1) {
      const shareBal =
        batchResults[userShareIndex]?.status === 'success'
          ? (batchResults[userShareIndex].result as bigint)
          : 0n;
      const usdcBal =
        batchResults[userUsdcIndex]?.status === 'success'
          ? (batchResults[userUsdcIndex].result as bigint)
          : 0n;

      let costBasisRaw = 0n;
      if (userCostBasisIndex !== -1 && batchResults[userCostBasisIndex]?.status === 'success') {
        const cbRes = batchResults[userCostBasisIndex].result;
        if (Array.isArray(cbRes) && cbRes.length >= 1) {
          const first = cbRes[0];
          if (typeof first === 'bigint' || typeof first === 'number' || typeof first === 'string') {
            costBasisRaw = BigInt(first);
          } else if (first && typeof first === 'object') {
            const firstObj = first as Record<string | number, unknown>;
            if ('investedAssets' in firstObj && firstObj.investedAssets !== undefined) {
              costBasisRaw = BigInt(firstObj.investedAssets as any);
            } else if (0 in firstObj && firstObj[0] !== undefined) {
              costBasisRaw = BigInt(firstObj[0] as any);
            }
          }
        } else if (
          typeof cbRes === 'bigint' ||
          typeof cbRes === 'number' ||
          typeof cbRes === 'string'
        ) {
          costBasisRaw = BigInt(cbRes);
        } else if (cbRes && typeof cbRes === 'object') {
          const resObj = cbRes as Record<string | number, unknown>;
          if ('investedAssets' in resObj && resObj.investedAssets !== undefined) {
            costBasisRaw = BigInt(resObj.investedAssets as any);
          } else if (0 in resObj && resObj[0] !== undefined) {
            costBasisRaw = BigInt(resObj[0] as any);
          }
        }
      }

      const navNumber = Number(navPerShareRaw) / 1e18;
      const shareBalFormatted = formatUnits(shareBal, 18);
      const shareUsdValueNumber = Number(shareBalFormatted) * navNumber;

      const totalSharesNumber = Number(formatUnits(totalSupplyRaw, 18));
      const ownershipPercentage =
        totalSharesNumber > 0 ? (Number(shareBalFormatted) / totalSharesNumber) * 100 : 0;

      const costBasisFormatted = formatUnits(costBasisRaw, 6);
      const costBasisUsdNumber = Number(costBasisFormatted);
      const realizedProfitUsdNumber = 0;
      const performanceFeePaidUsdNumber = 0;

      userMetrics = {
        userAddress,
        shareBalanceRaw: shareBal,
        shareBalanceFormatted: shareBalFormatted,
        shareUsdValueNumber,
        ownershipPercentage,
        usdcBalanceRaw: usdcBal,
        usdcBalanceFormatted: formatUnits(usdcBal, 6),
        costBasisRaw,
        costBasisFormatted,
        costBasisUsdNumber,
        realizedProfitUsdNumber,
        performanceFeePaidUsdNumber,
      };
    }

    return {
      addresses,
      navPerShareRaw,
      totalPortfolioValueUsdRaw,
      totalSupplyRaw,
      isControllerPaused,
      maxDepositRaw,
      swapSlippageBps,
      assets,
      treasuryFees,
      treasuryNativeRaw,
      oracleFeeds,
      isOracleHealthy: allOraclesFresh,
      liquidity: {
        needsRefill,
        needsSweep,
        amountRaw,
        operationalBalanceRaw,
        reserveBalanceRaw,
        totalBalanceRaw,
      },
      userMetrics,
    };
  },
};
