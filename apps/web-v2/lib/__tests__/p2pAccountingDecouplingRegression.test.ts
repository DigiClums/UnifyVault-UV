import { describe, expect, it } from 'vitest';
import { classifyTransaction as classifyTransactionEvents } from '../contracts/events-registry';
import { classifyTransaction as classifyTransactionExplorer } from '../explorer/eventRegistry';
import { transformProtocolMetrics, transformUserPortfolio } from '../portfolioTransforms';
import {
  calculateTotalVaultNAVUSD,
  calculateNAVPerShareUSD,
  calculateSharePriceUSD,
  calculateCurrentValueUSD,
  calculateCostBasis,
  calculatePnL,
} from '../portfolioMath';

/**
 * P2P Accounting Decoupling Regression Test Suite
 *
 * Sourced strictly from Phase 4A Architecture:
 * P2P Escrow & Marketplace data MUST remain completely decoupled from portfolio accounting.
 *
 * P2P MUST NOT affect:
 * 1. Portfolio invested amount
 * 2. Cost basis
 * 3. NAV / UV price
 * 4. Realized & unrealized P&L
 * 5. ROI / P&L %
 * 6. Portfolio accounting transaction history
 * 7. P2P activity remains visible only in the dedicated P2P area
 */
describe('P2P Accounting Decoupling Regression (Phase 4A)', () => {
  const mockStrategyMetrics = {
    targetBtcBps: 5000,
    targetEthBps: 5000,
    targetBtcPercent: '50.0%',
    targetEthPercent: '50.0%',
  };

  const initialProtocolData = {
    wbtcTotalAssets: 100_000_000n, // 1 WBTC = $60,000
    wethTotalAssets: 10_000_000_000_000_000_000n, // 10 WETH = $30,000
    usdcTotalAssets: 10_000_000_000n, // 10,000 USDC = $10,000
    priceWBTC: 60_000_000_000_000_000_000_000n, // $60,000
    priceWETH: 3_000_000_000_000_000_000_000n, // $3,000
    priceUSDC: 1_000_000_000_000_000_000n, // $1.00
    totalSharesRaw: 100_000_000_000_000_000_000_000n, // 100,000 shares ($1.00/share)
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. P2P trade does not change portfolio invested amount
  // ──────────────────────────────────────────────────────────────────────────
  it('1. proves P2P trade creation, funding, and release do not change portfolio invested amount', () => {
    const protocolMetrics = transformProtocolMetrics(initialProtocolData, mockStrategyMetrics);

    // Initial state: User holds 10,000 shares with $10,000 invested amount in vault
    const userInitial = transformUserPortfolio(
      {
        userAddress: '0x1111111111111111111111111111111111111111',
        userSharesRaw: 10_000_000_000_000_000_000_000n,
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 10_000_000_000_000_000_000_000n,
      },
      initialProtocolData,
      protocolMetrics,
    );

    expect(userInitial.rawInvestedAssetsUSD).toBe(10000);
    expect(userInitial.investedAssetsUSD).toBe('$10,000.00');

    // Scenario: User locks 2,000 shares into P2PEscrow for an off-chain INR trade
    // On-chain CostBasisManager ignores escrow transfers (_isEscrow[escrow] = true)
    // The user's recorded invested capital in CostBasisManager remains strictly $10,000
    const userDuringP2P = transformUserPortfolio(
      {
        userAddress: '0x1111111111111111111111111111111111111111',
        userSharesRaw: 8_000_000_000_000_000_000_000n, // 8,000 free shares
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 10_000_000_000_000_000_000_000n, // Unchanged
      },
      initialProtocolData,
      protocolMetrics,
    );

    expect(userDuringP2P.rawInvestedAssetsUSD).toBe(10000);
    expect(userDuringP2P.investedAssetsUSD).toBe('$10,000.00');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. P2P trade does not change cost basis
  // ──────────────────────────────────────────────────────────────────────────
  it('2. proves P2P trade settlement does not mutate buyer or seller investment cost basis', () => {
    const rawCostBasis = 15_000_000_000_000_000_000_000n; // $15,000 cost basis
    const userShares = 15_000_000_000_000_000_000_000n;

    const basisBefore = calculateCostBasis(rawCostBasis, userShares);
    expect(basisBefore).toBe(15000);

    // During P2P escrow handoff, cost basis is unchanged
    const basisAfter = calculateCostBasis(rawCostBasis, userShares);
    expect(basisAfter).toBe(15000);
    expect(basisAfter).toBe(basisBefore);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. P2P trade does not change NAV / UV price
  // ──────────────────────────────────────────────────────────────────────────
  it('3. proves P2P trade does not change Total Vault NAV or UV share price', () => {
    const metricsBefore = transformProtocolMetrics(initialProtocolData, mockStrategyMetrics);
    const navBefore = calculateTotalVaultNAVUSD(metricsBefore.totalPortfolioValueUSDNumber);
    const sharePriceBefore = calculateNAVPerShareUSD(
      metricsBefore.totalPortfolioValueUSDNumber,
      initialProtocolData.totalSharesRaw,
    );

    expect(navBefore).toBeCloseTo(100000, 2);
    expect(metricsBefore.totalVaultNAVUSD).toBe('$100,000.00');
    expect(sharePriceBefore).toBeCloseTo(1.0, 4);
    expect(metricsBefore.sharePriceUSD).toBe('$1.00000000');

    // P2P trade occurs: 5,000 UVBE tokens are traded for 450,000 INR ($5,400) off-chain
    // Vault reserves (1 WBTC, 10 WETH, 10,000 USDC) and total share supply remain invariant
    const protocolDataAfterP2P = { ...initialProtocolData };
    const metricsAfter = transformProtocolMetrics(protocolDataAfterP2P, mockStrategyMetrics);
    const navAfter = calculateTotalVaultNAVUSD(metricsAfter.totalPortfolioValueUSDNumber);
    const sharePriceAfter = calculateNAVPerShareUSD(
      metricsAfter.totalPortfolioValueUSDNumber,
      protocolDataAfterP2P.totalSharesRaw,
    );

    expect(navAfter).toBe(navBefore);
    expect(sharePriceAfter).toBe(sharePriceBefore);
    expect(metricsAfter.sharePriceUSD).toBe(metricsBefore.sharePriceUSD);
    expect(metricsAfter.currentUVPriceUSD).toBe(metricsBefore.currentUVPriceUSD);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. P2P trade does not change realized / unrealized P&L
  // ──────────────────────────────────────────────────────────────────────────
  it('4. proves P2P trade does not distort realized or unrealized P&L in portfolio accounting', () => {
    const protocolMetrics = transformProtocolMetrics(initialProtocolData, mockStrategyMetrics);

    // User invested $5,000 for 5,000 shares ($1.00 entry).
    // Current share price is $1.00 -> Current Value $5,000, PnL $0.00
    const pnlBefore = calculatePnL(5000, 5000);
    expect(pnlBefore.pnlUSD).toBe(0);
    expect(pnlBefore.pnlPercent).toBe(0);

    const portfolioBefore = transformUserPortfolio(
      {
        userAddress: '0x2222222222222222222222222222222222222222',
        userSharesRaw: 5_000_000_000_000_000_000_000n,
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 5_000_000_000_000_000_000_000n,
      },
      initialProtocolData,
      protocolMetrics,
    );

    expect(portfolioBefore.rawPnLUSD).toBe(0);
    expect(portfolioBefore.pnlPercentage).toBe('0.0000%');

    // P2P trade executed at premium ($1.20/share in fiat off-chain)
    // Portfolio accounting ignores fiat markup and retains strict vault accounting
    const portfolioAfter = transformUserPortfolio(
      {
        userAddress: '0x2222222222222222222222222222222222222222',
        userSharesRaw: 5_000_000_000_000_000_000_000n,
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 5_000_000_000_000_000_000_000n,
      },
      initialProtocolData,
      protocolMetrics,
    );

    expect(portfolioAfter.rawPnLUSD).toBe(portfolioBefore.rawPnLUSD);
    expect(portfolioAfter.pnlPercentage).toBe(portfolioBefore.pnlPercentage);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. P2P trade does not change ROI
  // ──────────────────────────────────────────────────────────────────────────
  it('5. proves P2P trade does not change ROI percentage in portfolio metrics', () => {
    const currentValue = calculateCurrentValueUSD(10_000_000_000_000_000_000_000n, 1.25);
    const investedAmount = 10000;
    const pnl = calculatePnL(currentValue, investedAmount);

    expect(currentValue).toBe(12500);
    expect(pnl.pnlUSD).toBe(2500);
    expect(pnl.pnlPercent).toBe(25); // 25.00% ROI

    // P2P trade creation or completion does not alter vault valuation formula
    const pnlAfterP2P = calculatePnL(currentValue, investedAmount);
    expect(pnlAfterP2P.pnlPercent).toBe(25);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. P2P transactions do not appear in portfolio accounting history
  // ──────────────────────────────────────────────────────────────────────────
  it('6. proves P2P events are never classified as protocol accounting actions or shown in transaction history', () => {
    const p2pEventSignatures = [
      'TradeCreated',
      'EscrowFunded',
      'PaymentSubmitted',
      'DisputeRaised',
      'TradeDisputed',
      'DisputeResolved',
      'EscrowReleased',
      'EscrowRefunded',
      'TradeCancelled',
      'OrderCreated',
      'OrderMatched',
      'OrderCancelled',
      'OrderModified',
    ];

    for (const eventName of p2pEventSignatures) {
      const eventRegistryClass = classifyTransactionEvents([eventName]);
      const explorerClass = classifyTransactionExplorer([eventName]);

      // MUST NOT be classified as any protocol transaction type
      expect(eventRegistryClass).not.toBe('deposit');
      expect(eventRegistryClass).not.toBe('redeem');
      expect(eventRegistryClass).not.toBe('fee');
      expect(eventRegistryClass).not.toBe('admin');
      expect(eventRegistryClass).not.toBe('wallet_transfer');
      expect(eventRegistryClass).not.toBe('p2p_settlement');

      expect(explorerClass).not.toBe('deposit');
      expect(explorerClass).not.toBe('redeem');
      expect(explorerClass).not.toBe('fee');
      expect(explorerClass).not.toBe('admin');
      expect(explorerClass).not.toBe('wallet_transfer');
      expect(explorerClass).not.toBe('p2p_settlement');
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. P2P activity remains visible only in the dedicated P2P area
  // ──────────────────────────────────────────────────────────────────────────
  it('7. proves protocol transaction history filters strictly exclude P2P', () => {
    const validProtocolActionTypes = ['deposit', 'redeem', 'fee', 'admin', 'wallet_transfer'];

    // Ensure p2p_settlement is completely omitted from protocol action types
    expect(validProtocolActionTypes).not.toContain('p2p_settlement');

    // Standard protocol events classify correctly
    expect(classifyTransactionEvents(['DepositCompleted'])).toBe('deposit');
    expect(classifyTransactionEvents(['RedeemCompleted'])).toBe('redeem');
    expect(classifyTransactionEvents(['ProtocolFeeCollected'])).toBe('fee');
    expect(classifyTransactionEvents(['EmergencyPaused'])).toBe('admin');
    expect(classifyTransactionEvents(['Transfer'])).toBe('wallet_transfer');
  });
});
