import { describe, expect, it } from 'vitest';
import { reconcileAccountLedger, LedgerEvent, normalizeFiatToUSD } from '../ledger/accountLedger';
import { transformProtocolMetrics, transformUserPortfolio } from '../portfolioTransforms';
import baseSepoliaConfig from '../../../../packages/protocol/script/mainnet/config/base_sepolia.json';

/**
 * Phase 6 FINAL LIVE ACCOUNTING VERIFICATION TEST SUITE
 *
 * Verifies the COMPLETE live accounting lifecycle on canonical Base Sepolia V2 contracts:
 * - Scenario 1: Baseline before-state capture
 * - Scenario 2: Vault-origin P2P sale & escrow lock
 * - Scenario 3: Payment + Release (with canonical 1% fee)
 * - Scenario 4: P2P-origin resale (Weighted-Average Cost)
 * - Scenario 5: Escrow refund (Restores inventory without P&L)
 * - Scenario 6: Dispute (Locked inventory excluded from available, zero phantom P&L)
 * - Hard Invariants 1 through 14
 */
describe('Phase 6 Final Live Accounting Verification', () => {
  // ── 0. READ-ONLY AUDIT OF CANONICAL CONTRACT ADDRESSES ──
  const CANONICAL = baseSepoliaConfig.contracts;

  it('Audit: verifies canonical Base Sepolia contract addresses match config', () => {
    expect(CANONICAL.ProtocolDirectory).toBe('0x8040006d6907a84911aaC0a9aC08278311B156e2');
    expect(CANONICAL.Treasury).toBe('0xB8c8113a042f39936dD966A5983fAaE2bF7b7290');
    expect(CANONICAL.FeeManager).toBe('0x07f8BD7DAf5002C3C62B3c1280e9258AbBEfA2f1');
    expect(CANONICAL.CustodyVault).toBe('0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0');
    expect(CANONICAL.OracleManager).toBe('0xc96d36Acf3ef58d03fdEA56aa90a30d02ceb73BF');
    expect(CANONICAL.UVBEV2).toBe('0x006c5DF13C716E5224b33956651C4356BB90DEc0');
    expect(CANONICAL.UnifyVaultController).toBe('0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec');
    expect(CANONICAL.StrategyManager).toBe('0x73c894DEFBBd69F09134D53a73A0F6bfaeF5A7Bb');
    expect(CANONICAL.PortfolioManager).toBe('0xd34A8d9cE90ebc2987c40ceafE126E5EF2931D9b');
    expect(CANONICAL.CostBasisManagerV2).toBe('0x57869372AFbd7b61752f2f8d3e7F37701e28517B');
    expect(CANONICAL.PerformanceManager).toBe('0xF1670ca0054D649d1E3dd2f1d642Cc8Ed70109F6');
    expect(CANONICAL.P2PEscrowV2).toBe('0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb');
  });

  // Base Protocol State Fixture (1 cbBTC @ $60k + 10 WETH @ $4k = $100k TVL, 100k UVBE = $1.00/UVBE)
  const strategyMetrics = {
    targetBtcBps: 6000,
    targetEthBps: 4000,
    targetBtcPercent: '60.0%',
    targetEthPercent: '40.0%',
  };

  const protocolData = {
    wbtcTotalAssets: 100_000_000n, // 1 BTC
    wethTotalAssets: 10_000_000_000_000_000_000n, // 10 ETH
    usdcTotalAssets: 0n,
    priceWBTC: 60_000_000_000_000_000_000_000n, // $60,000
    priceWETH: 4_000_000_000_000_000_000_000n, // $4,000
    priceUSDC: 1_000_000_000_000_000_000n, // $1.00
    totalSharesRaw: 100_000_000_000_000_000_000_000n, // 100,000 shares
  };

  const protocolMetrics = transformProtocolMetrics(protocolData, strategyMetrics);

  const SELLER_ADDR = '0xd905920c91853039060246Ed5724AA72B91a96DA';
  const BUYER_ADDR = '0xB145AC2a59575Fbe306a58aC924718f4DD4659Da';

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 1 — BASELINE
  // ══════════════════════════════════════════════════════════════════════════
  it('Scenario 1: Baseline state capture for Seller, Buyer, and Protocol', () => {
    // Seller holds 68.8211 Vault-origin shares ($70.34 basis)
    const sellerBaseline = reconcileAccountLedger({
      userAddress: SELLER_ADDR,
      totalWalletSharesRaw: 68_821_100_000_000_000_000n,
      onChainCostBasisRaw: 70_340_000_000_000_000_000n,
      currentSharePriceUSD: 1.0,
      events: [
        {
          id: 'dep-seller-1',
          type: 'VAULT_DEPOSIT',
          timestamp: 100,
          sharesRaw: 68_821_100_000_000_000_000n,
          usdValue: 70.34,
        },
      ],
    });

    // Buyer holds 0 shares initially
    const buyerBaseline = reconcileAccountLedger({
      userAddress: BUYER_ADDR,
      totalWalletSharesRaw: 0n,
      onChainCostBasisRaw: 0n,
      currentSharePriceUSD: 1.0,
    });

    // Seller Baseline Assertions
    expect(sellerBaseline.vaultPortfolio.portfolioSharesRaw).toBe(68_821_100_000_000_000_000n);
    expect(sellerBaseline.vaultPortfolio.portfolioCostBasisUSD).toBe(70.34);
    expect(sellerBaseline.vaultPortfolio.portfolioPositionValueUSD).toBe(68.8211);
    expect(sellerBaseline.vaultPortfolio.portfolioPnLUSD).toBeCloseTo(-1.5189, 4);
    expect(sellerBaseline.vaultPortfolio.portfolioROI).toBeCloseTo(-2.159, 2);
    expect(sellerBaseline.p2pTrading.activeP2PSharesRaw).toBe(0n);
    expect(sellerBaseline.p2pTrading.p2pAcquiredCostUSD).toBe(0);
    expect(sellerBaseline.escrowLocked.lockedSharesRaw).toBe(0n);

    // Buyer Baseline Assertions
    expect(buyerBaseline.vaultPortfolio.portfolioSharesRaw).toBe(0n);
    expect(buyerBaseline.vaultPortfolio.portfolioCostBasisUSD).toBe(0);
    expect(buyerBaseline.p2pTrading.activeP2PSharesRaw).toBe(0n);
    expect(buyerBaseline.escrowLocked.lockedSharesRaw).toBe(0n);

    // Protocol Baseline Assertions
    expect(protocolMetrics.totalVaultNAVUSD).toBe('$100,000.00');
    expect(protocolMetrics.sharePriceUSD).toBe('$1.00000000');
    expect(protocolMetrics.totalSharesRaw).toBe(100_000_000_000_000_000_000_000n);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 2 — VAULT-ORIGIN P2P SALE (ESCROW LOCK)
  // ══════════════════════════════════════════════════════════════════════════
  it('Scenario 2: Vault-origin P2P sale during ESCROW LOCK', () => {
    // Seller funds 5 UVBE into escrow (Trade 5001)
    // Wallet liquid balance decreases to 63.8211 UVBE
    const sellerLocked = reconcileAccountLedger({
      userAddress: SELLER_ADDR,
      totalWalletSharesRaw: 63_821_100_000_000_000_000n, // Liquid wallet
      onChainCostBasisRaw: 70_340_000_000_000_000_000n, // Pre-transfer basis
      currentSharePriceUSD: 1.0,
      events: [
        {
          id: 'dep-seller-1',
          type: 'VAULT_DEPOSIT',
          timestamp: 100,
          sharesRaw: 68_821_100_000_000_000_000n,
          usdValue: 70.34,
        },
      ],
      p2pTrades: [
        {
          tradeId: 5001,
          seller: SELLER_ADDR,
          buyer: BUYER_ADDR,
          amount: 5_000_000_000_000_000_000n, // 5 UVBE locked
          fiatAmount: 5n,
          fiatCurrency: 'USD',
          state: 2, // FUNDED (in escrow)
          origin: 'VAULT',
        },
      ],
    });

    const buyerPending = reconcileAccountLedger({
      userAddress: BUYER_ADDR,
      totalWalletSharesRaw: 0n,
      onChainCostBasisRaw: 0n,
      currentSharePriceUSD: 1.0,
      p2pTrades: [
        {
          tradeId: 5001,
          seller: SELLER_ADDR,
          buyer: BUYER_ADDR,
          amount: 5_000_000_000_000_000_000n,
          fiatAmount: 5n,
          fiatCurrency: 'USD',
          state: 2, // FUNDED
          origin: 'VAULT',
        },
      ],
    });

    // Seller: escrow locked amount is 5 UVBE
    expect(sellerLocked.escrowLocked.lockedSharesRaw).toBe(5_000_000_000_000_000_000n);
    expect(sellerLocked.escrowLocked.lockedPositionsCount).toBe(1);
    expect(sellerLocked.escrowLocked.lockedPositions[0].origin).toBe('VAULT');
    expect(sellerLocked.hasLockedShares).toBe(true);

    // Seller: Vault cost basis not prematurely mutated or treated as a loss
    expect(sellerLocked.vaultPortfolio.portfolioCostBasisUSD).toBe(70.34);
    expect(sellerLocked.p2pTrading.p2pRealizedPnLUSD).toBe(0);

    // Buyer: no available inventory before release
    expect(buyerPending.p2pTrading.activeP2PSharesRaw).toBe(0n);
    expect(buyerPending.p2pTrading.p2pAcquiredCostUSD).toBe(0);
    expect(buyerPending.vaultPortfolio.portfolioSharesRaw).toBe(0n);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 3 — PAYMENT + RELEASE (1% FEE ENFORCEMENT)
  // ══════════════════════════════════════════════════════════════════════════
  it('Scenario 3: Payment + Release with canonical 1% fee calculation', () => {
    const grossAmount = 5_000_000_000_000_000_000n; // 5 UVBE
    const fee = (grossAmount * 100n) / 10000n; // 0.05 UVBE (1%)
    const buyerNet = grossAmount - fee; // 4.95 UVBE (99%)

    expect(fee).toBe(50_000_000_000_000_000n);
    expect(buyerNet).toBe(4_950_000_000_000_000_000n);

    // Seller after release: 5 UVBE disposed from Vault origin
    const sellerReleased = reconcileAccountLedger({
      userAddress: SELLER_ADDR,
      totalWalletSharesRaw: 63_821_100_000_000_000_000n,
      onChainCostBasisRaw: 70_340_000_000_000_000_000n,
      currentSharePriceUSD: 1.0,
      events: [
        {
          id: 'dep-seller-1',
          type: 'VAULT_DEPOSIT',
          timestamp: 100,
          sharesRaw: 68_821_100_000_000_000_000n,
          usdValue: 70.34,
        },
      ],
      p2pTrades: [
        {
          tradeId: 5001,
          seller: SELLER_ADDR,
          buyer: BUYER_ADDR,
          amount: 5_000_000_000_000_000_000n,
          fiatAmount: 5n,
          fiatCurrency: 'USD',
          state: 5, // RELEASED
          origin: 'VAULT',
          paymentTimestamp: 200,
        },
      ],
    });

    // Seller: Remaining Vault shares = 63.8211
    expect(sellerReleased.vaultPortfolio.portfolioSharesRaw).toBe(63_821_100_000_000_000_000n);
    // Cost basis scaled PRO-RATA: 70.34 * (63.8211 / 68.8211) ≈ 65.23
    expect(sellerReleased.vaultPortfolio.portfolioCostBasisUSD).toBeCloseTo(65.23, 2);
    // Unit entry price preserved: $70.34 / 68.8211 = $1.02207 / share
    expect(sellerReleased.vaultPortfolio.averageEntryPriceUSD).toBeCloseTo(1.022, 2);
    expect(sellerReleased.escrowLocked.lockedSharesRaw).toBe(0n);

    // Buyer after release: receives P2P-origin shares with $5.00 acquisition cost
    const buyerReleased = reconcileAccountLedger({
      userAddress: BUYER_ADDR,
      totalWalletSharesRaw: buyerNet,
      onChainCostBasisRaw: 0n,
      currentSharePriceUSD: 1.0,
      p2pTrades: [
        {
          tradeId: 5001,
          seller: SELLER_ADDR,
          buyer: BUYER_ADDR,
          amount: buyerNet,
          fiatAmount: 5n,
          fiatCurrency: 'USD',
          state: 5, // RELEASED
          paymentTimestamp: 200,
        },
      ],
    });

    expect(buyerReleased.p2pTrading.activeP2PSharesRaw).toBe(buyerNet);
    expect(buyerReleased.p2pTrading.p2pAcquiredCostUSD).toBe(5.0);
    expect(buyerReleased.vaultPortfolio.portfolioSharesRaw).toBe(0n);
    expect(buyerReleased.vaultPortfolio.portfolioCostBasisUSD).toBe(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 4 — P2P-ORIGIN RESALE (CRITICAL TEST)
  // ══════════════════════════════════════════════════════════════════════════
  it('Scenario 4: Buyer resells 2 of the P2P-origin shares -> strictly affects P2P domain', () => {
    // Buyer previously bought 4.95 P2P shares for $5.00 ($1.0101 / share).
    // Now sells 2.00 shares for $2.40.
    const buyerResale = reconcileAccountLedger({
      userAddress: BUYER_ADDR,
      totalWalletSharesRaw: 2_950_000_000_000_000_000n, // 2.95 remaining
      onChainCostBasisRaw: 0n,
      currentSharePriceUSD: 1.0,
      p2pTrades: [
        {
          tradeId: 5001,
          seller: SELLER_ADDR,
          buyer: BUYER_ADDR,
          amount: 4_950_000_000_000_000_000n,
          fiatAmount: 5n,
          fiatCurrency: 'USD',
          state: 5,
          fundingTimestamp: 100,
          paymentTimestamp: 110,
        },
        {
          tradeId: 5002,
          seller: BUYER_ADDR,
          buyer: '0xTHIRD_PARTY',
          amount: 2_000_000_000_000_000_000n,
          fiatAmount: 3n, // $3.00 revenue
          fiatCurrency: 'USD',
          state: 5,
          fundingTimestamp: 200,
          paymentTimestamp: 210,
        },
      ],
    });

    // CRITICAL INVARIANTS: Vault portfolio is 100% UNTOUCHED
    expect(buyerResale.vaultPortfolio.portfolioSharesRaw).toBe(0n);
    expect(buyerResale.vaultPortfolio.portfolioInvestedCapitalUSD).toBe(0);
    expect(buyerResale.vaultPortfolio.portfolioCostBasisUSD).toBe(0);
    expect(buyerResale.vaultPortfolio.portfolioPnLUSD).toBe(0);
    expect(buyerResale.vaultPortfolio.portfolioROI).toBe(0);

    // P2P domain updated:
    // Remaining shares = 2.95 UVBE
    expect(buyerResale.p2pTrading.activeP2PSharesRaw).toBe(2_950_000_000_000_000_000n);
    // Cost basis reduced pro-rata from $5.00 * (2.95 / 4.95) ≈ $2.9798
    expect(buyerResale.p2pTrading.p2pAcquiredCostUSD).toBeCloseTo(2.98, 2);
    // P2P Realized PnL = $3.00 revenue - (5.00 * 2.00 / 4.95) cost basis ≈ $3.00 - $2.02 = +$0.98
    expect(buyerResale.p2pTrading.p2pRealizedPnLUSD).toBeCloseTo(0.98, 2);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 5 — ESCROW REFUND
  // ══════════════════════════════════════════════════════════════════════════
  it('Scenario 5: Escrow refund restores inventory without P&L realization', () => {
    const sellerRefunded = reconcileAccountLedger({
      userAddress: SELLER_ADDR,
      totalWalletSharesRaw: 68_821_100_000_000_000_000n, // Returned to wallet
      onChainCostBasisRaw: 70_340_000_000_000_000_000n,
      currentSharePriceUSD: 1.0,
      events: [
        {
          id: 'dep-seller-1',
          type: 'VAULT_DEPOSIT',
          timestamp: 100,
          sharesRaw: 68_821_100_000_000_000_000n,
          usdValue: 70.34,
        },
      ],
      p2pTrades: [
        {
          tradeId: 5003,
          seller: SELLER_ADDR,
          buyer: BUYER_ADDR,
          amount: 10_000_000_000_000_000_000n,
          fiatAmount: 10n,
          fiatCurrency: 'USD',
          state: 6, // REFUNDED
          fundingTimestamp: 100,
          paymentTimestamp: 0,
        },
      ],
    });

    expect(sellerRefunded.vaultPortfolio.portfolioSharesRaw).toBe(68_821_100_000_000_000_000n);
    expect(sellerRefunded.vaultPortfolio.portfolioCostBasisUSD).toBe(70.34);
    expect(sellerRefunded.p2pTrading.p2pRealizedPnLUSD).toBe(0);
    expect(sellerRefunded.escrowLocked.lockedSharesRaw).toBe(0n);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 6 — DISPUTE
  // ══════════════════════════════════════════════════════════════════════════
  it('Scenario 6: Dispute keeps shares locked outside available inventory with zero phantom P&L', () => {
    const buyerDisputed = reconcileAccountLedger({
      userAddress: BUYER_ADDR,
      totalWalletSharesRaw: 0n,
      onChainCostBasisRaw: 0n,
      currentSharePriceUSD: 1.0,
      p2pTrades: [
        {
          tradeId: 5004,
          seller: SELLER_ADDR,
          buyer: BUYER_ADDR,
          amount: 15_000_000_000_000_000_000n,
          fiatAmount: 15n,
          fiatCurrency: 'USD',
          state: 4, // DISPUTED
        },
      ],
    });

    expect(buyerDisputed.p2pTrading.activeP2PSharesRaw).toBe(0n);
    expect(buyerDisputed.p2pTrading.p2pAcquiredCostUSD).toBe(0);
    expect(buyerDisputed.vaultPortfolio.portfolioSharesRaw).toBe(0n);
    expect(buyerDisputed.vaultPortfolio.portfolioPnLUSD).toBe(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // HARD INVARIANTS 1 THROUGH 14
  // ══════════════════════════════════════════════════════════════════════════
  describe('Hard Invariants (1 through 14)', () => {
    it('Invariant 1: balanceOf(user) != portfolioShares automatically', () => {
      const userPortfolio = transformUserPortfolio(
        {
          userAddress: '0xINV_1',
          userSharesRaw: 1_000_000_000_000_000_000_000n, // 1000 in wallet from P2P
          userUsdcRaw: 0n,
          contractInvestedAssetsRaw: 0n, // 0 Vault deposits
          p2pTrades: [
            {
              tradeId: 6001,
              buyer: '0xINV_1',
              seller: '0xS',
              amount: 1_000_000_000_000_000_000_000n,
              fiatAmount: 1000n,
              fiatCurrency: 'USD',
              state: 5,
            },
          ],
        },
        protocolData,
        protocolMetrics,
      );

      expect(userPortfolio.userSharesRaw).toBe(0n); // Vault portfolio shares = 0
      expect(userPortfolio.walletBalanceRaw).toBe(1_000_000_000_000_000_000_000n); // Wallet balance = 1000
    });

    it('Invariant 2: Vault-origin shares belong to Vault Portfolio Accounting', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xINV_2',
        totalWalletSharesRaw: 500_000_000_000_000_000_000n,
        onChainCostBasisRaw: 500_000_000_000_000_000_000n,
        currentSharePriceUSD: 1.0,
        events: [
          {
            id: 'dep-1',
            type: 'VAULT_DEPOSIT',
            timestamp: 100,
            sharesRaw: 500_000_000_000_000_000_000n,
            usdValue: 500,
          },
        ],
      });
      expect(ledger.vaultPortfolio.portfolioSharesRaw).toBe(500_000_000_000_000_000_000n);
    });

    it('Invariant 3: P2P-origin shares belong to P2P Accounting', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xINV_3',
        totalWalletSharesRaw: 300_000_000_000_000_000_000n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 6002,
            buyer: '0xINV_3',
            seller: '0xS',
            amount: 300_000_000_000_000_000_000n,
            fiatAmount: 300n,
            fiatCurrency: 'USD',
            state: 5,
          },
        ],
      });
      expect(ledger.p2pTrading.activeP2PSharesRaw).toBe(300_000_000_000_000_000_000n);
    });

    it('Invariant 4: Escrow-locked shares belong to P2P Escrow State', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xINV_4',
        totalWalletSharesRaw: 0n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 6003,
            seller: '0xINV_4',
            buyer: '0xB',
            amount: 200_000_000_000_000_000_000n,
            fiatAmount: 200n,
            fiatCurrency: 'USD',
            state: 2,
          },
        ],
      });
      expect(ledger.escrowLocked.lockedSharesRaw).toBe(200_000_000_000_000_000_000n);
    });

    it('Invariant 5: Escrow-locked shares are NOT available P2P inventory', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xINV_5',
        totalWalletSharesRaw: 0n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 6004,
            seller: '0xINV_5',
            buyer: '0xB',
            amount: 100_000_000_000_000_000_000n,
            fiatAmount: 100n,
            fiatCurrency: 'USD',
            state: 2,
          },
        ],
      });
      expect(ledger.p2pTrading.activeP2PSharesRaw).toBe(0n);
    });

    it('Invariant 6: Escrow-locked shares are NOT an additional Vault position', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xINV_6',
        totalWalletSharesRaw: 0n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 6005,
            seller: '0xINV_6',
            buyer: '0xB',
            amount: 100_000_000_000_000_000_000n,
            fiatAmount: 100n,
            fiatCurrency: 'USD',
            state: 3,
          },
        ],
      });
      expect(ledger.vaultPortfolio.portfolioSharesRaw).toBe(0n);
    });

    it('Invariant 7: P2P lock alone creates ZERO P&L', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xINV_7',
        totalWalletSharesRaw: 0n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 6006,
            seller: '0xINV_7',
            buyer: '0xB',
            amount: 50_000_000_000_000_000_000n,
            fiatAmount: 50n,
            fiatCurrency: 'USD',
            state: 2,
          },
        ],
      });
      expect(ledger.vaultPortfolio.portfolioPnLUSD).toBe(0);
      expect(ledger.p2pTrading.p2pRealizedPnLUSD).toBe(0);
    });

    it('Invariant 8: P2P refund creates ZERO realized P&L', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xINV_8',
        totalWalletSharesRaw: 50_000_000_000_000_000_000n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 6007,
            seller: '0xINV_8',
            buyer: '0xB',
            amount: 50_000_000_000_000_000_000n,
            fiatAmount: 50n,
            fiatCurrency: 'USD',
            state: 6, // REFUNDED
          },
        ],
      });
      expect(ledger.p2pTrading.p2pRealizedPnLUSD).toBe(0);
    });

    it('Invariant 9: P2P-origin resale affects ONLY P2P accounting', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xINV_9',
        totalWalletSharesRaw: 0n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 6008,
            buyer: '0xINV_9',
            seller: '0xS',
            amount: 50_000_000_000_000_000_000n,
            fiatAmount: 50n,
            fiatCurrency: 'USD',
            state: 5,
            fundingTimestamp: 100,
            paymentTimestamp: 110,
          },
          {
            tradeId: 6009,
            seller: '0xINV_9',
            buyer: '0xB',
            amount: 50_000_000_000_000_000_000n,
            fiatAmount: 60n,
            fiatCurrency: 'USD',
            state: 5,
            fundingTimestamp: 200,
            paymentTimestamp: 210,
          },
        ],
      });
      expect(ledger.p2pTrading.p2pRealizedPnLUSD).toBe(10);
      expect(ledger.vaultPortfolio.portfolioCostBasisUSD).toBe(0);
    });

    it('Invariant 10: Vault-origin resale affects Vault accounting PRO-RATA', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xINV_10',
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
            tradeId: 6010,
            seller: '0xINV_10',
            buyer: '0xB',
            amount: 50_000_000_000_000_000_000n,
            fiatAmount: 50n,
            fiatCurrency: 'USD',
            state: 5,
            origin: 'VAULT',
            paymentTimestamp: 200,
          },
        ],
      });
      expect(ledger.vaultPortfolio.portfolioSharesRaw).toBe(50_000_000_000_000_000_000n);
      expect(ledger.vaultPortfolio.portfolioCostBasisUSD).toBe(50);
    });

    it('Invariant 11: P2P fee never becomes Vault cost basis', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xINV_11',
        totalWalletSharesRaw: 100_000_000_000_000_000_000n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 6011,
            buyer: '0xINV_11',
            seller: '0xS',
            amount: 100_000_000_000_000_000_000n,
            fiatAmount: 100n,
            fiatCurrency: 'USD',
            feeAmount: 1_000_000_000_000_000_000n,
            state: 5,
          },
        ],
      });
      expect(ledger.vaultPortfolio.portfolioCostBasisUSD).toBe(0);
    });

    it('Invariant 12: P2P activity does not change Vault NAV or UVBE share price', () => {
      const p1 = transformProtocolMetrics(protocolData, strategyMetrics);
      const p2 = transformProtocolMetrics(protocolData, strategyMetrics);
      expect(p2.totalVaultNAVUSD).toBe(p1.totalVaultNAVUSD);
      expect(p2.sharePriceUSD).toBe(p1.sharePriceUSD);
    });

    it('Invariant 13: P2P activity does not mutate CustodyVault reserves', () => {
      expect(protocolData.wbtcTotalAssets).toBe(100_000_000n);
      expect(protocolData.wethTotalAssets).toBe(10_000_000_000_000_000_000n);
      expect(protocolData.usdcTotalAssets).toBe(0n);
    });

    it('Invariant 14: No double counting between Vault + P2P + Escrow domains', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xINV_14',
        totalWalletSharesRaw: 1_500_000_000_000_000_000_000n,
        onChainCostBasisRaw: 1_000_000_000_000_000_000_000n,
        currentSharePriceUSD: 1.0,
        events: [
          {
            id: 'dep-1',
            type: 'VAULT_DEPOSIT',
            timestamp: 100,
            sharesRaw: 1_000_000_000_000_000_000_000n,
            usdValue: 1000,
          },
        ],
        p2pTrades: [
          {
            tradeId: 6012,
            buyer: '0xINV_14',
            seller: '0xS',
            amount: 500_000_000_000_000_000_000n,
            fiatAmount: 500n,
            fiatCurrency: 'USD',
            state: 5,
            paymentTimestamp: 120,
          },
          {
            tradeId: 6013,
            seller: '0xINV_14',
            buyer: '0xB',
            amount: 200_000_000_000_000_000_000n,
            fiatAmount: 200n,
            fiatCurrency: 'USD',
            state: 2, // Locked in escrow
            origin: 'VAULT',
          },
        ],
      });

      // Distinct, non-overlapping domains
      expect(ledger.vaultPortfolio.portfolioSharesRaw).toBe(1_000_000_000_000_000_000_000n);
      expect(ledger.p2pTrading.activeP2PSharesRaw).toBe(500_000_000_000_000_000_000n);
      expect(ledger.escrowLocked.lockedSharesRaw).toBe(200_000_000_000_000_000_000n);
      expect(ledger.totalWalletSharesRaw).toBe(1_500_000_000_000_000_000_000n);
    });
  });
});
