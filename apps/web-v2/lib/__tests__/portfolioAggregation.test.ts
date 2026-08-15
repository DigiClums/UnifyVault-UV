import { describe, expect, it } from 'vitest';
import { aggregatePortfolioAddresses } from '../portfolioMath';
import { transformProtocolMetrics, transformUserPortfolio } from '../portfolioTransforms';

const EOA = '0x1111111111111111111111111111111111111111' as `0x${string}`;
const SMART_ACCOUNT = '0x2222222222222222222222222222222222222222' as `0x${string}`;

const mockStrategyMetrics = {
  targetBtcBps: 5000,
  targetEthBps: 5000,
  targetBtcPercent: '50.0%',
  targetEthPercent: '50.0%',
};

// $1.00 / share: TVL $90,000 over 90,000 shares.
const mockProtocolData = {
  wbtcTotalAssets: 100_000_000n, // 1 WBTC
  wethTotalAssets: 10_000_000_000_000_000_000n, // 10 WETH
  usdcTotalAssets: 0n,
  priceWBTC: 60_000_000_000_000_000_000_000n, // $60,000
  priceWETH: 3_000_000_000_000_000_000_000n, // $3,000
  priceUSDC: 1_000_000_000_000_000_000n, // $1.00
  totalSharesRaw: 90_000_000_000_000_000_000_000n, // 90,000 shares
};

const shares = (n: number): bigint => BigInt(Math.round(n * 1e18));

function buildPortfolio(eoaShares: number, saShares: number, eoaBasis: number, saBasis: number) {
  const protocolMetrics = transformProtocolMetrics(mockProtocolData, mockStrategyMetrics);
  const aggregated = aggregatePortfolioAddresses({
    eoaSharesRaw: shares(eoaShares),
    smartAccountSharesRaw: shares(saShares),
    eoaCostBasisRaw: shares(eoaBasis),
    smartAccountCostBasisRaw: shares(saBasis),
  });
  const portfolio = transformUserPortfolio(
    {
      userAddress: EOA,
      userSharesRaw: aggregated.totalSharesRaw,
      userUsdcRaw: 0n,
      contractInvestedAssetsRaw: aggregated.totalCostBasisRaw,
    },
    mockProtocolData,
    protocolMetrics,
  );
  return { aggregated, portfolio };
}

describe('Portfolio Smart Account Aggregation (EOA + deterministic SA)', () => {
  it('TEST 1: no Smart Account balance — portfolio equals EOA balance', () => {
    const result = aggregatePortfolioAddresses({
      eoaSharesRaw: shares(10),
      smartAccountSharesRaw: shares(0),
      eoaCostBasisRaw: shares(10),
      smartAccountCostBasisRaw: shares(0),
    });
    expect(result.totalSharesRaw).toBe(shares(10));
    expect(result.totalCostBasisRaw).toBe(shares(10));
  });

  it('TEST 2: Smart Account balance — portfolio sums both addresses', () => {
    const result = aggregatePortfolioAddresses({
      eoaSharesRaw: shares(1),
      smartAccountSharesRaw: shares(9),
      eoaCostBasisRaw: shares(1),
      smartAccountCostBasisRaw: shares(9),
    });
    expect(result.totalSharesRaw).toBe(shares(10));
  });

  it('TEST 3: cost basis aggregation sums EOA + Smart Account', () => {
    const result = aggregatePortfolioAddresses({
      eoaSharesRaw: shares(1),
      smartAccountSharesRaw: shares(9),
      eoaCostBasisRaw: shares(1),
      smartAccountCostBasisRaw: shares(9),
    });
    expect(result.totalCostBasisRaw).toBe(shares(10));
  });

  it('TEST 4: pure EOA → Smart Account transfer preserves unified portfolio', () => {
    const before = buildPortfolio(10, 0, 10, 0);
    const after = buildPortfolio(1, 9, 1, 9);

    expect(before.aggregated.totalSharesRaw).toBe(after.aggregated.totalSharesRaw);
    expect(before.aggregated.totalCostBasisRaw).toBe(after.aggregated.totalCostBasisRaw);
    expect(before.portfolio.rawCurrentValueUSD).toBe(after.portfolio.rawCurrentValueUSD);
    expect(before.portfolio.rawInvestedAssetsUSD).toBe(after.portfolio.rawInvestedAssetsUSD);
    expect(before.portfolio.rawPnLUSD).toBe(after.portfolio.rawPnLUSD);
    expect(after.portfolio.rawPnLUSD).toBe(0);
  });

  it('TEST 5/6: aggregation is a pure function over exactly two known addresses (no arbitrary injection)', () => {
    // The aggregation function only accepts four bigint values (EOA shares/basis, SA shares/basis).
    // There is no address parameter, so no arbitrary/third-party address can be injected.
    const result = aggregatePortfolioAddresses({
      eoaSharesRaw: shares(5),
      smartAccountSharesRaw: shares(5),
      eoaCostBasisRaw: shares(5),
      smartAccountCostBasisRaw: shares(5),
    });
    expect(result.totalSharesRaw).toBe(shares(10));
    // SMART_ACCOUNT is intentionally unused here to document that aggregation is bound to
    // the derived SA (passed as smartAccountSharesRaw), never a user-supplied address.
    void SMART_ACCOUNT;
  });

  it('TEST 7: zero cost basis yields finite P&L and a non-NaN return percentage', () => {
    const protocolMetrics = transformProtocolMetrics(mockProtocolData, mockStrategyMetrics);
    const portfolio = transformUserPortfolio(
      {
        userAddress: EOA,
        userSharesRaw: shares(10),
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 0n,
      },
      mockProtocolData,
      protocolMetrics,
    );
    expect(Number.isFinite(portfolio.rawPnLUSD)).toBe(true);
    expect(Number.isFinite(portfolio.rawCurrentValueUSD)).toBe(true);
    expect(portfolio.pnlPercentage).not.toContain('NaN');
    expect(portfolio.pnlPercentage).not.toContain('Infinity');
  });

  it('STEP 13: realistic scenario — 74.92 UVBE does not collapse to 0.92 after transfer', () => {
    const before = buildPortfolio(74.92, 0, 74.92, 0);
    const after = buildPortfolio(0.92, 74.0, 0.92, 74.0);

    expect(before.aggregated.totalSharesRaw).toBe(after.aggregated.totalSharesRaw);
    expect(after.aggregated.totalSharesRaw).toBe(shares(74.92));

    // Unified portfolio must remain ~$74.92, not collapse to the EOA residual ~$0.92.
    expect(after.portfolio.rawCurrentValueUSD).toBeCloseTo(74.92, 2);
    expect(after.portfolio.rawInvestedAssetsUSD).toBeCloseTo(74.92, 2);
    expect(after.portfolio.rawPnLUSD).toBeCloseTo(0, 2);
    expect(after.portfolio.rawCurrentValueUSD).toBeGreaterThan(70);
  });
});
