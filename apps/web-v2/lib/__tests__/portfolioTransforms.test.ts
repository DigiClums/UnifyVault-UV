import { describe, expect, it } from 'vitest';
import { transformProtocolMetrics, transformUserPortfolio } from '../portfolioTransforms';

describe('portfolioTransforms Domain Transformation Module', () => {
  // Test StrategyManager.getTargetWeights() result at 50/50
  // Values derived from on-chain weights — never hardcoded fallbacks
  const mockStrategyMetrics = {
    targetBtcBps: 5000,
    targetEthBps: 5000,
    targetBtcPercent: '50.0%',
    targetEthPercent: '50.0%',
  };

  const mockRawProtocolData = {
    wbtcTotalAssets: 100_000_000n, // 1 WBTC
    wethTotalAssets: 10_000_000_000_000_000_000n, // 10 WETH
    usdcTotalAssets: 0n,
    priceWBTC: 60_000_000_000_000_000_000_000n, // $60,000
    priceWETH: 3_000_000_000_000_000_000_000n, // $3,000
    priceUSDC: 1_000_000_000_000_000_000n, // $1.00
    totalSharesRaw: 90_000_000_000_000_000_000_000n, // 90,000 shares
  };

  it('transforms raw contract outputs into structured ProtocolMetrics with Target Weight & Current Weight', () => {
    const protocolMetrics = transformProtocolMetrics(mockRawProtocolData, mockStrategyMetrics);

    // TVL = $60,000 (1 WBTC) + $30,000 (10 WETH) = $90,000
    expect(protocolMetrics.totalPortfolioValueUSDNumber).toBe(90000);
    expect(protocolMetrics.totalPortfolioValueUSD).toBe('$90,000.00');

    // Share Price = $90,000 / 90,000 shares = $1.00000000
    expect(protocolMetrics.sharePriceUSD).toBe('$1.00000000');

    // Target Weights vs Current Custody Weights
    expect(protocolMetrics.targetBtcPercent).toBe('50.0%');
    expect(protocolMetrics.targetEthPercent).toBe('50.0%');
    expect(protocolMetrics.custodyBtcPercent).toBe('66.7%'); // $60k / $90k = 66.7%
    expect(protocolMetrics.custodyEthPercent).toBe('33.3%'); // $30k / $90k = 33.3%

    // Holdings inventory checks
    const btcHolding = protocolMetrics.protocolHoldings.find((h) => h.symbol === 'BTC');
    expect(btcHolding).toBeDefined();
    expect(btcHolding?.targetWeightPercent).toBe('50.0%');
    expect(btcHolding?.currentWeightPercent).toBe('66.7%');
    expect(btcHolding?.weightPercent).toBe('66.7%');
  });

  it('transforms raw user data for a connected user with 10% pool ownership', () => {
    const protocolMetrics = transformProtocolMetrics(mockRawProtocolData, mockStrategyMetrics);

    const mockRawUserData = {
      userAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      userSharesRaw: 9_000_000_000_000_000_000_000n, // 9,000 shares (10% of 90,000)
      userUsdcRaw: 500_000_000n, // 500 USDC
      contractInvestedAssetsRaw: 8_000_000_000_000_000_000_000n, // $8,000 invested capital (18 decimals)
    };

    const userPortfolio = transformUserPortfolio(
      mockRawUserData,
      mockRawProtocolData,
      protocolMetrics,
    );

    expect(userPortfolio.ownershipPercentage).toBe('10.00%');
    expect(userPortfolio.rawCurrentValueUSD).toBe(9000); // 10% of $90,000
    expect(userPortfolio.rawInvestedAssetsUSD).toBe(8000);
    expect(userPortfolio.rawPnLUSD).toBe(1000); // $9,000 - $8,000 = $1,000
    expect(userPortfolio.isProfitable).toBe(true);

    // Check user pro-rata holdings
    const userBtcHolding = userPortfolio.userHoldings.find((h) => h.symbol === 'BTC');
    expect(userBtcHolding?.balanceRaw).toBe(10_000_000n); // 10% of 1 WBTC (0.1 BTC)
    expect(userBtcHolding?.targetWeightPercent).toBe('50.0%');
    expect(userBtcHolding?.currentWeightPercent).toBe('66.7%');
  });

  it('handles disconnected wallet gracefully', () => {
    const protocolMetrics = transformProtocolMetrics(mockRawProtocolData, mockStrategyMetrics);

    const mockDisconnectedUser = {
      userAddress: undefined,
      userSharesRaw: 0n,
      userUsdcRaw: 0n,
      contractInvestedAssetsRaw: 0n,
    };

    const userPortfolio = transformUserPortfolio(
      mockDisconnectedUser,
      mockRawProtocolData,
      protocolMetrics,
    );

    expect(userPortfolio.ownershipPercentage).toBe('0.00%');
    expect(userPortfolio.rawCurrentValueUSD).toBe(0);
    expect(userPortfolio.rawInvestedAssetsUSD).toBe(0);
    expect(userPortfolio.rawPnLUSD).toBe(0);
    expect(userPortfolio.userSharesBalance).toBe('0.0000');
  });

  it('handles zero TVL and zero supply ProtocolMetrics gracefully', () => {
    const zeroProtocolData = {
      wbtcTotalAssets: 0n,
      wethTotalAssets: 0n,
      usdcTotalAssets: 0n,
      priceWBTC: 60_000_000_000_000_000_000_000n,
      priceWETH: 3_000_000_000_000_000_000_000n,
      priceUSDC: 1_000_000_000_000_000_000n,
      totalSharesRaw: 0n,
    };

    const protocolMetrics = transformProtocolMetrics(zeroProtocolData, mockStrategyMetrics);

    expect(protocolMetrics.totalPortfolioValueUSDNumber).toBe(0);
    expect(protocolMetrics.totalPortfolioValueUSD).toBe('$0.00');
    expect(protocolMetrics.sharePriceUSD).toBe('$1.00000000');
    expect(protocolMetrics.navPerShareUSD).toBe('$1.00000000');
    expect(protocolMetrics.totalSharesFormatted).toBe('0.0000');
    expect(protocolMetrics.protocolHoldings).toHaveLength(3);

    const btc = protocolMetrics.protocolHoldings.find((h) => h.symbol === 'BTC');
    expect(btc?.balanceFormatted).toBe('0');
    expect(btc?.valueUSD).toBe('$0.00');
  });

  it('correctly parses PerformanceManager 7-element positional array without swapping currentValue and investedCapital', () => {
    const protocolMetrics = transformProtocolMetrics(mockRawProtocolData, mockStrategyMetrics);

    const mockUserDataWithPerformanceArray = {
      userAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      userSharesRaw: 4_560_000_000_000_000_000n, // 4.56 shares
      userUsdcRaw: 0n,
      contractInvestedAssetsRaw: 10_000_000_000_000_000_000n,
      // PerformanceManager returns [currentValueUSD, investedCapitalUSD, realizedPnL, unrealizedPnL, netPnL, roiBps, holdingPeriod]
      onChainPerformance: [
        9_970_000_000_000_000_000n, // currentValue = $9.97
        10_000_000_000_000_000_000n, // investedCapital = $10.00
        0n,
        -30_000_000_000_000_000n,
        -30_000_000_000_000_000n, // netPnL = -$0.03
        -30n, // roiBps = -0.30%
        86400n,
      ] as any,
    };

    const userPortfolio = transformUserPortfolio(
      mockUserDataWithPerformanceArray,
      mockRawProtocolData,
      protocolMetrics,
    );

    expect(userPortfolio.currentValueUSD).toBe('$9.9700');
    expect(userPortfolio.investedAssetsUSD).toBe('$10.00');
    expect(userPortfolio.averageEntryPriceUSD).toBe('$2.19');
    expect(userPortfolio.pnlPercentage).toBe('-0.3000%');
  });

  it('correctly parses CostBasisManager 4-element positional array', () => {
    const protocolMetrics = transformProtocolMetrics(mockRawProtocolData, mockStrategyMetrics);

    const mockUserDataWithCostBasisArray = {
      userAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      userSharesRaw: 4_560_000_000_000_000_000n, // 4.56 shares
      userUsdcRaw: 0n,
      contractInvestedAssetsRaw: 10_000_000_000_000_000_000n,
      // CostBasisManager returns [costBasisUSD, currentValueUSD, pnlUSD, pnlBps]
      onChainPerformance: [
        10_000_000_000_000_000_000n, // costBasis = $10.00
        9_970_000_000_000_000_000n, // currentValue = $9.97
        -30_000_000_000_000_000n, // pnlUSD = -$0.03
        -30n, // pnlBps = -0.30%
      ] as any,
    };

    const userPortfolio = transformUserPortfolio(
      mockUserDataWithCostBasisArray,
      mockRawProtocolData,
      protocolMetrics,
    );

    expect(userPortfolio.currentValueUSD).toBe('$9.9700');
    expect(userPortfolio.investedAssetsUSD).toBe('$10.00');
    expect(userPortfolio.averageEntryPriceUSD).toBe('$2.19');
    expect(userPortfolio.pnlPercentage).toBe('-0.3000%');
  });
});
