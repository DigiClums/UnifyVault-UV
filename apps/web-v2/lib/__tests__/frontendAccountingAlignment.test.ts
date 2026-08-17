import { describe, expect, it } from 'vitest';
import { classifyTransaction } from '../contracts/events-registry';
import { classifyTransaction as classifyTransactionExplorer } from '../explorer/eventRegistry';
import { transformProtocolMetrics, transformUserPortfolio } from '../portfolioTransforms';

describe('Frontend Accounting Alignment (Phase 2)', () => {
  const mockStrategyMetrics = {
    targetBtcBps: 5000,
    targetEthBps: 5000,
    targetBtcPercent: '50.0%',
    targetEthPercent: '50.0%',
  };

  const mockProtocolData = {
    wbtcTotalAssets: 100_000_000n, // 1 WBTC ($60,000)
    wethTotalAssets: 10_000_000_000_000_000_000n, // 10 WETH ($30,000)
    usdcTotalAssets: 0n,
    priceWBTC: 60_000_000_000_000_000_000_000n, // $60,000
    priceWETH: 3_000_000_000_000_000_000_000n, // $3,000
    priceUSDC: 1_000_000_000_000_000_000n, // $1.00
    totalSharesRaw: 90_000_000_000_000_000_000_000n, // 90,000 shares ($1.00/share)
  };

  // 1. P2P event -> not protocol transaction
  it('1. verifies P2P events are decoupled and do NOT classify as protocol transaction actions', () => {
    const p2pEvents = [
      'TradeCreated',
      'EscrowFunded',
      'PaymentSubmitted',
      'EscrowReleased',
      'EscrowRefunded',
      'TradeCancelled',
      'DisputeRaised',
      'TradeDisputed',
      'DisputeResolved',
    ];
    for (const eventName of p2pEvents) {
      expect(classifyTransaction([eventName])).not.toBe('p2p_settlement');
      expect(classifyTransactionExplorer([eventName])).not.toBe('p2p_settlement');
    }
  });

  // 2. ERC20 user-to-user Transfer -> wallet_transfer
  it('2. classifies user-to-user ERC20 Transfer as wallet_transfer', () => {
    expect(classifyTransaction(['Transfer'])).toBe('wallet_transfer');
    expect(classifyTransactionExplorer(['Transfer'])).toBe('wallet_transfer');
  });

  // 3. P2P event containing Transfer -> does not classify as p2p_settlement
  it('3. ensures mixed P2P event logs do NOT create protocol accounting p2p_settlement actions', () => {
    expect(classifyTransaction(['Transfer', 'EscrowFunded'])).not.toBe('p2p_settlement');
    expect(classifyTransaction(['Transfer', 'EscrowReleased'])).not.toBe('p2p_settlement');
    expect(classifyTransactionExplorer(['Transfer', 'EscrowFunded'])).not.toBe('p2p_settlement');
    expect(classifyTransactionExplorer(['Transfer', 'EscrowReleased'])).not.toBe('p2p_settlement');
  });

  // 4. Deposit event -> deposit
  it('4. classifies deposit events as deposit', () => {
    expect(classifyTransaction(['DepositExecuted'])).toBe('deposit');
    expect(classifyTransaction(['DepositCompleted'])).toBe('deposit');
    expect(classifyTransactionExplorer(['DepositExecuted'])).toBe('deposit');
    expect(classifyTransactionExplorer(['DepositCompleted'])).toBe('deposit');
  });

  // 5. Redeem event -> redeem
  it('5. classifies redeem events as redeem', () => {
    expect(classifyTransaction(['RedeemExecuted'])).toBe('redeem');
    expect(classifyTransaction(['RedeemCompleted'])).toBe('redeem');
    expect(classifyTransactionExplorer(['RedeemExecuted'])).toBe('redeem');
    expect(classifyTransactionExplorer(['RedeemCompleted'])).toBe('redeem');
  });

  // 6. Wallet transfer does not create PNL
  it('6. verifies wallet transfer moves proportional cost basis with zero PNL creation', () => {
    const protocolMetrics = transformProtocolMetrics(mockProtocolData, mockStrategyMetrics);

    // Initial state: Sender has 10,000 shares ($10,000 value, $10,000 cost basis)
    const senderBefore = transformUserPortfolio(
      {
        userAddress: '0x1111111111111111111111111111111111111111',
        userSharesRaw: 10_000_000_000_000_000_000_000n,
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 10_000_000_000_000_000_000_000n,
      },
      mockProtocolData,
      protocolMetrics,
    );

    expect(senderBefore.rawPnLUSD).toBe(0);

    // After transferring 5,000 shares (50%):
    // Sender has 5,000 shares ($5,000 value, $5,000 cost basis)
    const senderAfter = transformUserPortfolio(
      {
        userAddress: '0x1111111111111111111111111111111111111111',
        userSharesRaw: 5_000_000_000_000_000_000_000n,
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 5_000_000_000_000_000_000_000n,
      },
      mockProtocolData,
      protocolMetrics,
    );

    // Recipient receives 5,000 shares ($5,000 value, $5,000 transferred cost basis)
    const recipientAfter = transformUserPortfolio(
      {
        userAddress: '0x2222222222222222222222222222222222222222',
        userSharesRaw: 5_000_000_000_000_000_000_000n,
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 5_000_000_000_000_000_000_000n,
      },
      mockProtocolData,
      protocolMetrics,
    );

    expect(senderAfter.rawPnLUSD).toBe(0);
    expect(recipientAfter.rawPnLUSD).toBe(0);
  });

  // 7. P2P settlement does not create PNL
  it('7. verifies P2P settlement release does not generate investment PNL for seller or buyer', () => {
    const protocolMetrics = transformProtocolMetrics(mockProtocolData, mockStrategyMetrics);

    // Seller completes P2P sale of 4,000 shares for $5,000 fiat (Proceeds > Basis)
    // Seller remaining: 6,000 shares ($6,000 value, $6,000 remaining cost basis)
    const sellerAfterRelease = transformUserPortfolio(
      {
        userAddress: '0x1111111111111111111111111111111111111111',
        userSharesRaw: 6_000_000_000_000_000_000_000n,
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 6_000_000_000_000_000_000_000n,
        onChainPerformance: [
          6_000_000_000_000_000_000_000n, // currentValue = $6,000
          6_000_000_000_000_000_000_000n, // investedCapital = $6,000
          0n, // P2P realized PnL = 0
          0n, // unrealized PnL = 0
          0n, // net PnL = 0
          0n, // ROI = 0
          86400n,
        ] as any,
      },
      mockProtocolData,
      protocolMetrics,
    );

    // Buyer receives 4,000 shares ($4,000 value, $4,000 transferred seller basis)
    const buyerAfterRelease = transformUserPortfolio(
      {
        userAddress: '0x3333333333333333333333333333333333333333',
        userSharesRaw: 4_000_000_000_000_000_000_000n,
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 4_000_000_000_000_000_000_000n,
        onChainPerformance: [
          4_000_000_000_000_000_000_000n, // currentValue = $4,000
          4_000_000_000_000_000_000_000n, // investedCapital = $4,000
          0n, // P2P realized PnL = 0
          0n, // unrealized PnL = 0
          0n, // net PnL = 0
          0n, // ROI = 0
          86400n,
        ] as any,
      },
      mockProtocolData,
      protocolMetrics,
    );

    expect(sellerAfterRelease.rawPnLUSD).toBe(0);
    expect(sellerAfterRelease.pnlPercentage).toBe('0.0000%');
    expect(buyerAfterRelease.rawPnLUSD).toBe(0);
    expect(buyerAfterRelease.pnlPercentage).toBe('0.0000%');
  });

  // 8. P2P settlement does not create ROI
  it('8. verifies P2P settlement does not inflate or deflate ROI', () => {
    const protocolMetrics = transformProtocolMetrics(mockProtocolData, mockStrategyMetrics);

    const portfolio = transformUserPortfolio(
      {
        userAddress: '0x1111111111111111111111111111111111111111',
        userSharesRaw: 5_000_000_000_000_000_000_000n,
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 5_000_000_000_000_000_000_000n,
      },
      mockProtocolData,
      protocolMetrics,
    );

    expect(portfolio.pnlPercentage).toBe('0.0000%');
  });

  // 9. P2P settlement does not modify investment cost basis
  it('9. verifies P2P settlement does not alter investment cost basis', () => {
    const protocolMetrics = transformProtocolMetrics(mockProtocolData, mockStrategyMetrics);

    const buyer = transformUserPortfolio(
      {
        userAddress: '0x3333333333333333333333333333333333333333',
        userSharesRaw: 2_000_000_000_000_000_000_000n, // 2,000 shares received via P2P
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 0n, // P2P does not create or transfer investment basis
      },
      mockProtocolData,
      protocolMetrics,
    );

    expect(buyer.rawInvestedAssetsUSD).toBe(0);
    expect(buyer.rawCurrentValueUSD).toBe(2000);
    expect(buyer.rawPnLUSD).toBe(2000);
  });

  // 10. P2P buyer holding increase is reflected correctly
  it('10. verifies P2P buyer holding increase is reflected in userHoldings', () => {
    const protocolMetrics = transformProtocolMetrics(mockProtocolData, mockStrategyMetrics);

    const buyer = transformUserPortfolio(
      {
        userAddress: '0x3333333333333333333333333333333333333333',
        userSharesRaw: 9_000_000_000_000_000_000_000n, // 9,000 shares (10% of vault)
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 9_000_000_000_000_000_000_000n,
      },
      mockProtocolData,
      protocolMetrics,
    );

    expect(buyer.ownershipPercentage).toBe('10.00%');
    const btcHolding = buyer.userHoldings.find((h) => h.symbol === 'BTC');
    expect(btcHolding?.balanceRaw).toBe(10_000_000n); // 0.1 BTC (10% of 1 WBTC)
  });

  // 11. P2P seller holding decrease is reflected correctly
  it('11. verifies P2P seller holding decrease is reflected in userHoldings', () => {
    const protocolMetrics = transformProtocolMetrics(mockProtocolData, mockStrategyMetrics);

    const sellerAfterSale = transformUserPortfolio(
      {
        userAddress: '0x1111111111111111111111111111111111111111',
        userSharesRaw: 4_500_000_000_000_000_000_000n, // 4,500 shares (5% of vault)
        userUsdcRaw: 0n,
        contractInvestedAssetsRaw: 4_500_000_000_000_000_000_000n,
      },
      mockProtocolData,
      protocolMetrics,
    );

    expect(sellerAfterSale.ownershipPercentage).toBe('5.00%');
    const btcHolding = sellerAfterSale.userHoldings.find((h) => h.symbol === 'BTC');
    expect(btcHolding?.balanceRaw).toBe(5_000_000n); // 0.05 BTC (5% of 1 WBTC)
  });

  // 12. Escrow intermediate transfers do not create protocol accounting actions
  it('12. verifies P2P escrow intermediate steps do not classify as protocol accounting actions', () => {
    const escrowFundLog = ['EscrowFunded', 'Transfer'];
    const escrowReleaseLog = ['EscrowReleased', 'Transfer'];

    expect(classifyTransaction(escrowFundLog)).not.toBe('p2p_settlement');
    expect(classifyTransaction(escrowReleaseLog)).not.toBe('p2p_settlement');
    expect(classifyTransactionExplorer(escrowFundLog)).not.toBe('p2p_settlement');
    expect(classifyTransactionExplorer(escrowReleaseLog)).not.toBe('p2p_settlement');
  });
});
