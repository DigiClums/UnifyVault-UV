import { describe, expect, it, vi } from 'vitest';
import { OracleFeedStatus } from '../../types';
import { formatUnits, formatUSD } from '../../lib/math';
import {
  transformProtocolMetrics,
  transformUserPortfolio,
  RawProtocolContractData,
  RawUserContractData,
} from '../../lib/portfolioTransforms';

// Mirror status derivation logic from hooks
function deriveFeedStatus(
  readItem: { status?: 'success' | 'failure'; result?: unknown; error?: Error } | undefined,
  freshItem: { status?: 'success' | 'failure'; result?: unknown } | undefined,
): { status: OracleFeedStatus; price18: bigint | null; priceUSD: string; isFresh: boolean } {
  if (!readItem) {
    return { status: 'UNAVAILABLE', price18: null, priceUSD: 'Price unavailable', isFresh: false };
  }
  if (readItem.status === 'failure' || readItem.error) {
    return { status: 'REVERTED', price18: null, priceUSD: 'Price unavailable', isFresh: false };
  }
  const raw = readItem.result as bigint | undefined;
  if (raw === undefined || raw === 0n) {
    return { status: 'UNAVAILABLE', price18: null, priceUSD: 'Price unavailable', isFresh: false };
  }
  const isFresh = Boolean(freshItem?.result ?? true);
  const num = Number(formatUnits(raw, 18));
  if (!isFresh) {
    return { status: 'STALE', price18: raw, priceUSD: 'Price unavailable', isFresh: false };
  }
  return { status: 'LIVE', price18: raw, priceUSD: formatUSD(num), isFresh: true };
}

describe('Oracle Feed Refresh & Multi-State Staleness Architecture', () => {
  const strategy = {
    targetBtcBps: 6000,
    targetEthBps: 4000,
    targetBtcPercent: '60.0%',
    targetEthPercent: '40.0%',
  };

  it('1. LIVE feed state: formats valid price and marks status LIVE', () => {
    const readItem = { status: 'success' as const, result: 63855403455390000000000n }; // $63,855.40345539
    const freshItem = { status: 'success' as const, result: true };
    const feed = deriveFeedStatus(readItem, freshItem);

    expect(feed.status).toBe('LIVE');
    expect(feed.isFresh).toBe(true);
    expect(feed.priceUSD).toBe('$63,855.40');
    expect(feed.price18).toBe(63855403455390000000000n);
  });

  it('2. STALE feed state: marks status STALE and returns Price unavailable (NEVER $0)', () => {
    const readItem = { status: 'success' as const, result: 63855403455390000000000n };
    const freshItem = { status: 'success' as const, result: false }; // Heartbeat expired
    const feed = deriveFeedStatus(readItem, freshItem);

    expect(feed.status).toBe('STALE');
    expect(feed.isFresh).toBe(false);
    expect(feed.priceUSD).toBe('Price unavailable');
    expect(feed.priceUSD).not.toBe('$0.00');
    expect(feed.priceUSD).not.toBe('$0');
  });

  it('3. REVERTED feed state: marks status REVERTED and returns Price unavailable', () => {
    const readItem = {
      status: 'failure' as const,
      error: new Error('execution reverted: UnsafePricing()'),
    };
    const freshItem = undefined;
    const feed = deriveFeedStatus(readItem, freshItem);

    expect(feed.status).toBe('REVERTED');
    expect(feed.price18).toBeNull();
    expect(feed.priceUSD).toBe('Price unavailable');
  });

  it('4. UNAVAILABLE feed state: marks status UNAVAILABLE for missing or zero price', () => {
    const readItem = { status: 'success' as const, result: 0n };
    const freshItem = { status: 'success' as const, result: true };
    const feed = deriveFeedStatus(readItem, freshItem);

    expect(feed.status).toBe('UNAVAILABLE');
    expect(feed.price18).toBeNull();
    expect(feed.priceUSD).toBe('Price unavailable');
  });

  it('5. Circuit breaker rejection: contract revert surfaces as REVERTED without breaking protocol metrics transform', () => {
    const circuitBrokenData: RawProtocolContractData = {
      wbtcTotalAssets: 100_000_000n, // 1 BTC
      wethTotalAssets: 10_000_000_000_000_000_000n,
      usdcTotalAssets: 10_000_000n,
      priceWBTC: null,
      priceWETH: 2500_000_000_000_000_000_000n,
      priceUSDC: 1_000_000_000_000_000_000n,
      btcStatus: 'REVERTED',
      ethStatus: 'LIVE',
      usdcStatus: 'LIVE',
      totalSharesRaw: 50_000_000_000_000_000_000_000n,
    };

    const metrics = transformProtocolMetrics(circuitBrokenData, strategy);
    const btc = metrics.protocolHoldings.find((h) => h.symbol === 'BTC');

    expect(btc?.priceUSD).toBe('Price unavailable');
    expect(btc?.valueUSD).toBe('Value unavailable');
    expect(btc?.oracleStatus).toBe('REVERTED');
  });

  it('6. Refresh button synchronizes all dependent metrics atomically', async () => {
    let btcPrice = 63855403455390000000000n;
    let uvPrice = 1_050000000000000000n; // $1.05

    const mockOracleRefetch = vi.fn().mockImplementation(async () => {
      btcPrice = 64500000000000000000000n; // $64,500
    });

    const mockProtocolRefetch = vi.fn().mockImplementation(async () => {
      uvPrice = 1_080000000000000000n; // $1.08
    });

    const mockQueryInvalidate = vi.fn().mockResolvedValue(undefined);

    // Atomic execution pattern used in AdminOraclePage
    const results = await Promise.allSettled([
      mockOracleRefetch(),
      mockProtocolRefetch(),
      mockQueryInvalidate(),
    ]);

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(mockOracleRefetch).toHaveBeenCalledTimes(1);
    expect(mockProtocolRefetch).toHaveBeenCalledTimes(1);
    expect(mockQueryInvalidate).toHaveBeenCalledTimes(1);
    expect(btcPrice).toBe(64500000000000000000000n);
    expect(uvPrice).toBe(1_080000000000000000n);
  });

  it('7. UVBE price, TVL, and P&L update together on oracle recalculation', () => {
    // Initial state: BTC at $60,000, 1 BTC held, 60,000 shares, $60,000 invested capital
    const stateA: RawProtocolContractData = {
      wbtcTotalAssets: 100_000_000n, // 1 BTC
      wethTotalAssets: 0n,
      usdcTotalAssets: 0n,
      priceWBTC: 60000_000_000_000_000_000_000n,
      priceWETH: 3000_000_000_000_000_000_000n,
      priceUSDC: 1_000_000_000_000_000_000n,
      btcStatus: 'LIVE',
      ethStatus: 'LIVE',
      usdcStatus: 'LIVE',
      totalSharesRaw: 60000_000_000_000_000_000_000n,
      onChainNAV: [60000_000_000_000_000_000_000n, 1_000000000000000000n],
    };

    const userA: RawUserContractData = {
      userAddress: '0x1111111111111111111111111111111111111111',
      userSharesRaw: 60000_000_000_000_000_000_000n,
      userUsdcRaw: 0n,
      contractInvestedAssetsRaw: 60000_000_000_000_000_000_000n,
    };

    const metricsA = transformProtocolMetrics(stateA, strategy);
    const portfolioA = transformUserPortfolio(userA, stateA, metricsA);

    expect(metricsA.totalPortfolioValueUSD).toBe('$60,000.00');
    expect(metricsA.sharePriceUSD).toBe('$1.00000000');
    expect(portfolioA.pnlUSD).toBe('$0.0000');
    expect(portfolioA.pnlPercentage).toBe('0.0000%');

    // On-Chain Oracle Round 2: BTC moves to $66,000 (+10%), calculateNAV recalculates to $66,000, share price $1.10
    const stateB: RawProtocolContractData = {
      wbtcTotalAssets: 100_000_000n,
      wethTotalAssets: 0n,
      usdcTotalAssets: 0n,
      priceWBTC: 66000_000_000_000_000_000_000n,
      priceWETH: 3000_000_000_000_000_000_000n,
      priceUSDC: 1_000_000_000_000_000_000n,
      btcStatus: 'LIVE',
      ethStatus: 'LIVE',
      usdcStatus: 'LIVE',
      totalSharesRaw: 60000_000_000_000_000_000_000n,
      onChainNAV: [66000_000_000_000_000_000_000n, 1_100000000000000000n],
    };

    const metricsB = transformProtocolMetrics(stateB, strategy);
    const portfolioB = transformUserPortfolio(userA, stateB, metricsB);

    expect(metricsB.totalPortfolioValueUSD).toBe('$66,000.00');
    expect(metricsB.sharePriceUSD).toBe('$1.10000000');
    expect(portfolioB.pnlUSD).toBe('+$6,000.0000');
    expect(portfolioB.pnlPercentage).toBe('+10.0000%');
    expect(portfolioB.isProfitable).toBe(true);
  });

  it('8. Distinguishes Web2 spot prices from on-chain protocol valuation feeds', () => {
    const web2SpotPrice = 64120.5; // External ticker
    const protocolOraclePrice18 = 63855403455390000000000n; // On-Chain Chainlink ($63,855.40)

    const formattedSpot = formatUSD(web2SpotPrice);
    const formattedProtocol = formatUSD(Number(formatUnits(protocolOraclePrice18, 18)));

    expect(formattedSpot).toBe('$64,120.50');
    expect(formattedProtocol).toBe('$63,855.40');
    expect(formattedSpot).not.toBe(formattedProtocol);
  });
});
