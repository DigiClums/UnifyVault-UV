import { describe, expect, it } from 'vitest';
import { reconcileAccountLedger, P2PTradeData } from '../ledger/accountLedger';
import { transformProtocolMetrics, transformUserPortfolio } from '../portfolioTransforms';

describe('Portfolio Cost Basis Lifecycle & P2P Isolation Regression Suite', () => {
  const CANONICAL_USER = '0xd905920c91853039060246Ed5724AA72B91a96DA';
  const CANONICAL_SHARES_RAW = 8909636827331334363n; // 8.909636827331335 UVBE
  const CANONICAL_COST_BASIS_RAW = 8969489390154033782n; // $8.969489390154035
  const CANONICAL_SHARE_PRICE = 1.00600002;

  const mockProtocolData = {
    wbtcTotalAssets: 100_000_000n,
    wethTotalAssets: 10_000_000_000_000_000_000n,
    usdcTotalAssets: 0n,
    priceWBTC: 60_000_000_000_000_000_000_000n,
    priceWETH: 4_000_000_000_000_000_000_000n,
    priceUSDC: 1_000_000_000_000_000_000n,
    totalSharesRaw: 10_724_532_398_230_682_065n,
    onChainNAV: [10_788_880_000_000_000_000n, 1_006_000_020_000_000_000n] as const,
  };

  const mockStrategyMetrics = {
    targetBtcBps: 6000,
    targetEthBps: 4000,
    targetBtcPercent: '60.0%',
    targetEthPercent: '40.0%',
  };

  const protocolMetrics = transformProtocolMetrics(mockProtocolData, mockStrategyMetrics);

  const historical37Trades: P2PTradeData[] = [
    {
      tradeId: 1,
      buyer: CANONICAL_USER,
      seller: '0x1563915e194D8CfBA1943570603F7606A3115508',
      amount: 100000000000000000n,
      fiatAmount: 1000n,
      fiatCurrency: 'INR',
      state: 2, // FUNDED
    },
    {
      tradeId: 7,
      buyer: '0x000000000000000000000000000000000000dEaD',
      seller: CANONICAL_USER,
      amount: 1000000000000000000n, // 1.0 UVBE
      fiatAmount: 10000000000n,
      fiatCurrency: 'USD',
      state: 5, // RELEASED
    },
    {
      tradeId: 35,
      buyer: '0xB145AC2a59575Fbe306a58aC924718f4DD4659Da',
      seller: CANONICAL_USER,
      amount: 1000000000000000000n, // 1.0 UVBE
      fiatAmount: 1n,
      fiatCurrency: 'INR',
      state: 5, // RELEASED
    },
    {
      tradeId: 36,
      buyer: '0xB145AC2a59575Fbe306a58aC924718f4DD4659Da',
      seller: CANONICAL_USER,
      amount: 5000000000000000000n, // 5.0 UVBE
      fiatAmount: 5n,
      fiatCurrency: 'INR',
      state: 5, // RELEASED
    },
    {
      tradeId: 37,
      buyer: '0xB145AC2a59575Fbe306a58aC924718f4DD4659Da',
      seller: CANONICAL_USER,
      amount: 1000000000000000000n, // 1.0 UVBE
      fiatAmount: 1n,
      fiatCurrency: 'INR',
      state: 5, // RELEASED
    },
  ];

  it('Exact Numbers Regression: Canonical on-chain state must NOT degrade to $4.73', () => {
    // Old buggy behavior produced ~$4.726 ($4.73) due to subtracting 8.0 UVBE historical sales
    // Corrected behavior MUST produce $8.969489 ($8.97)
    const resultWithTrades = reconcileAccountLedger({
      userAddress: CANONICAL_USER,
      totalWalletSharesRaw: CANONICAL_SHARES_RAW,
      onChainCostBasisRaw: CANONICAL_COST_BASIS_RAW,
      currentSharePriceUSD: CANONICAL_SHARE_PRICE,
      p2pTrades: historical37Trades,
    });

    expect(resultWithTrades.vaultPortfolio.portfolioCostBasisUSD).toBeCloseTo(8.969489, 4);
    expect(resultWithTrades.vaultPortfolio.formattedInvestedUSD).toBe('$8.97');
    expect(resultWithTrades.vaultPortfolio.portfolioPnLUSD).toBeCloseTo(-0.00635, 4);
    expect(resultWithTrades.vaultPortfolio.formattedROI).toBe('-0.0713%');
    expect(resultWithTrades.vaultPortfolio.averageEntryPriceUSD).toBeCloseTo(1.006717, 4);
  });

  it('Test 1: Current position exists, historical P2P trades exist, vault events are not yet available', () => {
    const result = reconcileAccountLedger({
      userAddress: CANONICAL_USER,
      totalWalletSharesRaw: CANONICAL_SHARES_RAW,
      onChainCostBasisRaw: CANONICAL_COST_BASIS_RAW,
      currentSharePriceUSD: CANONICAL_SHARE_PRICE,
      p2pTrades: historical37Trades,
      events: undefined, // Vault events not available
    });

    expect(result.vaultPortfolio.portfolioCostBasisUSD).toBeCloseTo(8.969489, 4);
    expect(result.vaultPortfolio.portfolioSharesRaw).toBe(CANONICAL_SHARES_RAW);
    expect(result.vaultPortfolio.formattedInvestedUSD).toBe('$8.97');
  });

  it('Test 2: P2P trades load after initial render -> Cost basis remains unchanged ($8.97)', () => {
    // T0: p2pTrades = []
    const t0 = reconcileAccountLedger({
      userAddress: CANONICAL_USER,
      totalWalletSharesRaw: CANONICAL_SHARES_RAW,
      onChainCostBasisRaw: CANONICAL_COST_BASIS_RAW,
      currentSharePriceUSD: CANONICAL_SHARE_PRICE,
      p2pTrades: [],
    });

    // T1: p2pTrades loaded
    const t1 = reconcileAccountLedger({
      userAddress: CANONICAL_USER,
      totalWalletSharesRaw: CANONICAL_SHARES_RAW,
      onChainCostBasisRaw: CANONICAL_COST_BASIS_RAW,
      currentSharePriceUSD: CANONICAL_SHARE_PRICE,
      p2pTrades: historical37Trades,
    });

    expect(t0.vaultPortfolio.portfolioCostBasisUSD).toBe(t1.vaultPortfolio.portfolioCostBasisUSD);
    expect(t0.vaultPortfolio.formattedInvestedUSD).toBe('$8.97');
    expect(t1.vaultPortfolio.formattedInvestedUSD).toBe('$8.97');
    expect(t0.vaultPortfolio.portfolioPositionValueUSD).toBe(
      t1.vaultPortfolio.portfolioPositionValueUSD,
    );
  });

  it('Test 3: Automatic refetch -> Cost basis remains stable across polling cycles', () => {
    const cycles = [0, 1, 2, 3].map(() =>
      reconcileAccountLedger({
        userAddress: CANONICAL_USER,
        totalWalletSharesRaw: CANONICAL_SHARES_RAW,
        onChainCostBasisRaw: CANONICAL_COST_BASIS_RAW,
        currentSharePriceUSD: CANONICAL_SHARE_PRICE,
        p2pTrades: historical37Trades,
      }),
    );

    for (const c of cycles) {
      expect(c.vaultPortfolio.formattedInvestedUSD).toBe('$8.97');
      expect(c.vaultPortfolio.averageEntryPriceUSD).toBeCloseTo(1.0067, 3);
    }
  });

  it('Test 4: Historical P2P trades from a previous fully redeemed lifecycle cannot reduce current cost basis', () => {
    // User redeemed old position and opened fresh 8.9096 shares with $8.9695 basis
    const portfolio = transformUserPortfolio(
      {
        userAddress: CANONICAL_USER,
        userSharesRaw: CANONICAL_SHARES_RAW,
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: CANONICAL_COST_BASIS_RAW,
        p2pTrades: historical37Trades,
      },
      mockProtocolData,
      protocolMetrics,
    );

    expect(portfolio.investedAssetsUSD).toBe('$8.97');
    expect(portfolio.currentValueUSD).toBe('$8.9631');
    expect(portfolio.pnlUSD).toBe('-$0.0064');
    expect(portfolio.pnlPercentage).toBe('-0.0713%');
    expect(portfolio.averageEntryPriceUSD).toBe('$1.01');
  });

  it('Test 5: Explicit in-lifecycle P2P activity is preserved when events are provided', () => {
    // When full events are provided for a controlled simulation lifecycle:
    const simulation = reconcileAccountLedger({
      userAddress: '0xSELLER_SIM',
      totalWalletSharesRaw: 50_000_000_000_000_000_000n,
      onChainCostBasisRaw: 100_000_000_000_000_000_000n,
      currentSharePriceUSD: 1.0,
      events: [
        {
          id: 'dep-1',
          type: 'VAULT_DEPOSIT',
          timestamp: 100,
          sharesRaw: 100_000_000_000_000_000_000n,
          usdValue: 100,
        },
      ],
      p2pTrades: [
        {
          tradeId: 999,
          seller: '0xSELLER_SIM',
          buyer: '0xBUYER_SIM',
          amount: 50_000_000_000_000_000_000n,
          fiatAmount: 50n,
          fiatCurrency: 'USD',
          state: 5, // RELEASED
          origin: 'VAULT',
          paymentTimestamp: 200,
        },
      ],
    });

    // In a fully-tracked lifecycle, 50 shares remain out of 100 minted, basis scales proportionally to $50
    expect(simulation.vaultPortfolio.portfolioSharesRaw).toBe(50_000_000_000_000_000_000n);
    expect(simulation.vaultPortfolio.portfolioCostBasisUSD).toBe(50);
  });

  it('Test 6: P2P isolation: P2P trades cannot mutate NAV, Cost Basis, ROI, or Unrealized PnL', () => {
    const baseline = transformProtocolMetrics(mockProtocolData, mockStrategyMetrics);

    const userBefore = transformUserPortfolio(
      {
        userAddress: CANONICAL_USER,
        userSharesRaw: CANONICAL_SHARES_RAW,
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: CANONICAL_COST_BASIS_RAW,
        p2pTrades: [],
      },
      mockProtocolData,
      baseline,
    );

    const userAfter = transformUserPortfolio(
      {
        userAddress: CANONICAL_USER,
        userSharesRaw: CANONICAL_SHARES_RAW,
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: CANONICAL_COST_BASIS_RAW,
        p2pTrades: historical37Trades,
      },
      mockProtocolData,
      baseline,
    );

    // Vault accounting is completely isolated from historical P2P noise
    expect(userAfter.investedAssetsUSD).toBe(userBefore.investedAssetsUSD);
    expect(userAfter.currentValueUSD).toBe(userBefore.currentValueUSD);
    expect(userAfter.pnlUSD).toBe(userBefore.pnlUSD);
    expect(userAfter.pnlPercentage).toBe(userBefore.pnlPercentage);
    expect(userAfter.averageEntryPriceUSD).toBe(userBefore.averageEntryPriceUSD);
  });
});
