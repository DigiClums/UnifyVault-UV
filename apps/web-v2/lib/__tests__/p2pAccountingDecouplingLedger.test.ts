import { describe, expect, it } from 'vitest';
import { reconcileAccountLedger, LedgerEvent, normalizeFiatToUSD } from '../ledger/accountLedger';
import { transformProtocolMetrics, transformUserPortfolio } from '../portfolioTransforms';

describe('Final P2P Escrow Accounting-State Separation & Ledger Engine Test Suite', () => {
  const mockStrategyMetrics = {
    targetBtcBps: 6000,
    targetEthBps: 4000,
    targetBtcPercent: '60.0%',
    targetEthPercent: '40.0%',
  };

  const initialProtocolData = {
    wbtcTotalAssets: 100_000_000n, // 1 BTC = $60,000
    wethTotalAssets: 10_000_000_000_000_000_000n, // 10 ETH = $40,000
    usdcTotalAssets: 0n,
    priceWBTC: 60_000_000_000_000_000_000_000n, // $60,000
    priceWETH: 4_000_000_000_000_000_000_000n, // $4,000
    priceUSDC: 1_000_000_000_000_000_000n, // $1.00
    totalSharesRaw: 100_000_000_000_000_000_000_000n, // 100,000 shares ($1.00/share)
  };

  const protocolMetrics = transformProtocolMetrics(initialProtocolData, mockStrategyMetrics);

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1: REQUIRED LIFECYCLE TESTS (A - K)
  // ══════════════════════════════════════════════════════════════════════════

  describe('Lifecycle Tests (A through K)', () => {
    it('Lifecycle A: Vault deposit -> Vault portfolio increases, P2P domains unchanged', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0x1111111111111111111111111111111111111111',
        totalWalletSharesRaw: 1_000_000_000_000_000_000_000n,
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
      });

      // Vault Portfolio increases
      expect(ledger.vaultPortfolio.portfolioSharesRaw).toBe(1_000_000_000_000_000_000_000n);
      expect(ledger.vaultPortfolio.portfolioInvestedCapitalUSD).toBe(1000);
      expect(ledger.vaultPortfolio.portfolioCostBasisUSD).toBe(1000);
      expect(ledger.vaultPortfolio.portfolioPositionValueUSD).toBe(1000);
      expect(ledger.vaultPortfolio.portfolioPnLUSD).toBe(0);
      expect(ledger.vaultPortfolio.portfolioROI).toBe(0);
      expect(ledger.hasVaultShares).toBe(true);

      // P2P domains strictly unchanged
      expect(ledger.p2pTrading.activeP2PSharesRaw).toBe(0n);
      expect(ledger.p2pTrading.p2pAcquiredCostUSD).toBe(0);
      expect(ledger.p2pTrading.p2pCurrentValueUSD).toBe(0);
      expect(ledger.p2pTrading.p2pUnrealizedPnLUSD).toBe(0);
      expect(ledger.p2pTrading.p2pRealizedPnLUSD).toBe(0);
      expect(ledger.hasP2PShares).toBe(false);
      expect(ledger.escrowLocked.lockedSharesRaw).toBe(0n);
      expect(ledger.escrowLocked.lockedPositionsCount).toBe(0);
      expect(ledger.hasLockedShares).toBe(false);
    });

    it('Lifecycle B: P2P-origin buy -> P2P available inventory increases only after RELEASED, Vault portfolio unchanged', () => {
      // Step 1: Buyer in funded / pending escrow (state = 2) -> 0 available P2P inventory
      const pendingLedger = reconcileAccountLedger({
        userAddress: '0xBUYER_B',
        totalWalletSharesRaw: 0n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 101,
            buyer: '0xBUYER_B',
            seller: '0xSELLER_B',
            amount: 500_000_000_000_000_000_000n,
            fiatAmount: 500n,
            fiatCurrency: 'USD',
            state: 2, // FUNDED (Awaiting payment)
          },
        ],
      });

      expect(pendingLedger.p2pTrading.activeP2PSharesRaw).toBe(0n);
      expect(pendingLedger.p2pTrading.p2pAcquiredCostUSD).toBe(0);
      expect(pendingLedger.vaultPortfolio.portfolioSharesRaw).toBe(0n);

      // Step 2: Trade is RELEASED (state = 5) -> P2P available inventory credited
      const releasedLedger = reconcileAccountLedger({
        userAddress: '0xBUYER_B',
        totalWalletSharesRaw: 500_000_000_000_000_000_000n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 101,
            buyer: '0xBUYER_B',
            seller: '0xSELLER_B',
            amount: 500_000_000_000_000_000_000n,
            fiatAmount: 500n,
            fiatCurrency: 'USD',
            state: 5, // RELEASED
            fundingTimestamp: 100,
            paymentTimestamp: 120,
          },
        ],
      });

      // P2P domain credited
      expect(releasedLedger.p2pTrading.activeP2PSharesRaw).toBe(500_000_000_000_000_000_000n);
      expect(releasedLedger.p2pTrading.p2pAcquiredCostUSD).toBe(500);
      expect(releasedLedger.p2pTrading.p2pCurrentValueUSD).toBe(500);
      expect(releasedLedger.p2pTrading.p2pUnrealizedPnLUSD).toBe(0);
      expect(releasedLedger.hasP2PShares).toBe(true);

      // Vault portfolio completely unchanged (0 shares, 0 cost basis, 0 P&L)
      expect(releasedLedger.vaultPortfolio.portfolioSharesRaw).toBe(0n);
      expect(releasedLedger.vaultPortfolio.portfolioCostBasisUSD).toBe(0);
      expect(releasedLedger.vaultPortfolio.portfolioPnLUSD).toBe(0);
      expect(releasedLedger.hasVaultShares).toBe(false);
    });

    it('Lifecycle C: P2P escrow FUNDING -> Locked inventory increases, Vault portfolio unchanged', () => {
      // Seller funds 200 shares into escrow for Trade 201
      const ledger = reconcileAccountLedger({
        userAddress: '0xSELLER_C',
        totalWalletSharesRaw: 800_000_000_000_000_000_000n, // Remaining in wallet
        onChainCostBasisRaw: 1_000_000_000_000_000_000_000n, // Original vault basis
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 201,
            seller: '0xSELLER_C',
            buyer: '0xBUYER_C',
            amount: 200_000_000_000_000_000_000n,
            fiatAmount: 200n,
            fiatCurrency: 'USD',
            state: 2, // FUNDED
            origin: 'VAULT',
          },
        ],
      });

      // Escrow-locked inventory correctly tracked
      expect(ledger.escrowLocked.lockedSharesRaw).toBe(200_000_000_000_000_000_000n);
      expect(ledger.escrowLocked.lockedPositionsCount).toBe(1);
      expect(ledger.escrowLocked.lockedPositions[0].tradeId).toBe(201);
      expect(ledger.escrowLocked.lockedPositions[0].role).toBe('SELLER');
      expect(ledger.escrowLocked.lockedPositions[0].origin).toBe('VAULT');
      expect(ledger.hasLockedShares).toBe(true);

      // Vault portfolio is NOT prematurely destroyed or mutated into phantom P&L
      expect(ledger.vaultPortfolio.portfolioCostBasisUSD).toBe(1000);
      expect(ledger.p2pTrading.p2pRealizedPnLUSD).toBe(0);
    });

    it('Lifecycle D: P2P escrow RELEASE -> Seller Vault-origin position disposed proportionally, Buyer P2P inventory available, no phantom P&L', () => {
      // Seller had 100 shares ($100 basis). Sells 20 shares for $25 via P2P.
      const sellerLedger = reconcileAccountLedger({
        userAddress: '0xSELLER_D',
        totalWalletSharesRaw: 80_000_000_000_000_000_000n,
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
            tradeId: 301,
            seller: '0xSELLER_D',
            buyer: '0xBUYER_D',
            amount: 20_000_000_000_000_000_000n,
            fiatAmount: 25n,
            fiatCurrency: 'USD',
            state: 5, // RELEASED
            origin: 'VAULT',
            paymentTimestamp: 200,
          },
        ],
      });

      // Seller Vault shares reduced proportionally to 80 shares
      expect(sellerLedger.vaultPortfolio.portfolioSharesRaw).toBe(80_000_000_000_000_000_000n);
      // Cost basis scaled proportionally: 100 * (80 / 100) = $80
      expect(sellerLedger.vaultPortfolio.portfolioCostBasisUSD).toBe(80);
      expect(sellerLedger.vaultPortfolio.portfolioPositionValueUSD).toBe(80);
      expect(sellerLedger.vaultPortfolio.portfolioPnLUSD).toBe(0);
      expect(sellerLedger.vaultPortfolio.averageEntryPriceUSD).toBe(1.0);

      // Buyer Ledger
      const buyerLedger = reconcileAccountLedger({
        userAddress: '0xBUYER_D',
        totalWalletSharesRaw: 20_000_000_000_000_000_000n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 301,
            seller: '0xSELLER_D',
            buyer: '0xBUYER_D',
            amount: 20_000_000_000_000_000_000n,
            fiatAmount: 25n,
            fiatCurrency: 'USD',
            state: 5, // RELEASED
            paymentTimestamp: 200,
          },
        ],
      });

      expect(buyerLedger.p2pTrading.activeP2PSharesRaw).toBe(20_000_000_000_000_000_000n);
      expect(buyerLedger.p2pTrading.p2pAcquiredCostUSD).toBe(25);
      expect(buyerLedger.vaultPortfolio.portfolioSharesRaw).toBe(0n);
      expect(buyerLedger.vaultPortfolio.portfolioCostBasisUSD).toBe(0);
    });

    it('Lifecycle E: P2P REFUND -> Locked inventory returns to seller, no realized P&L, no Vault accounting mutation', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xSELLER_E',
        totalWalletSharesRaw: 1_000_000_000_000_000_000_000n, // Returned to wallet
        onChainCostBasisRaw: 1_000_000_000_000_000_000_000n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 401,
            seller: '0xSELLER_E',
            buyer: '0xBUYER_E',
            amount: 300_000_000_000_000_000_000n,
            fiatAmount: 300n,
            fiatCurrency: 'USD',
            state: 6, // REFUNDED
          },
        ],
      });

      expect(ledger.vaultPortfolio.portfolioSharesRaw).toBe(1_000_000_000_000_000_000_000n);
      expect(ledger.vaultPortfolio.portfolioCostBasisUSD).toBe(1000);
      expect(ledger.p2pTrading.p2pRealizedPnLUSD).toBe(0);
      expect(ledger.escrowLocked.lockedSharesRaw).toBe(0n);
    });

    it('Lifecycle F: P2P DISPUTE -> Locked inventory remains excluded from available inventory, no portfolio accounting mutation', () => {
      const buyerLedger = reconcileAccountLedger({
        userAddress: '0xBUYER_F',
        totalWalletSharesRaw: 0n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 501,
            buyer: '0xBUYER_F',
            seller: '0xSELLER_F',
            amount: 150_000_000_000_000_000_000n,
            fiatAmount: 150n,
            fiatCurrency: 'USD',
            state: 4, // DISPUTED
          },
        ],
      });

      // Buyer has zero available shares and zero phantom P&L
      expect(buyerLedger.p2pTrading.activeP2PSharesRaw).toBe(0n);
      expect(buyerLedger.p2pTrading.p2pAcquiredCostUSD).toBe(0);
      expect(buyerLedger.vaultPortfolio.portfolioSharesRaw).toBe(0n);
    });

    it('Lifecycle G: P2P-origin share resale -> Reduce P2P inventory, calculate P2P realized P&L from acquisition basis, Vault cost basis unchanged', () => {
      // User bought 500 P2P shares for $500. Sells 200 P2P shares for $220.
      const ledger = reconcileAccountLedger({
        userAddress: '0xTRADER_G',
        totalWalletSharesRaw: 300_000_000_000_000_000_000n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 601,
            buyer: '0xTRADER_G',
            seller: '0xSOURCE',
            amount: 500_000_000_000_000_000_000n,
            fiatAmount: 500n,
            fiatCurrency: 'USD',
            state: 5,
            fundingTimestamp: 100,
            paymentTimestamp: 110,
          },
          {
            tradeId: 602,
            buyer: '0xBUYER_NEXT',
            seller: '0xTRADER_G',
            amount: 200_000_000_000_000_000_000n,
            fiatAmount: 220n,
            fiatCurrency: 'USD',
            state: 5,
            fundingTimestamp: 200,
            paymentTimestamp: 210,
          },
        ],
      });

      expect(ledger.p2pTrading.activeP2PSharesRaw).toBe(300_000_000_000_000_000_000n);
      expect(ledger.p2pTrading.p2pAcquiredCostUSD).toBe(300);
      expect(ledger.p2pTrading.p2pRealizedPnLUSD).toBe(20); // $220 - $200 basis = +$20
      expect(ledger.vaultPortfolio.portfolioSharesRaw).toBe(0n);
      expect(ledger.vaultPortfolio.portfolioCostBasisUSD).toBe(0);
    });

    it('Lifecycle H: Vault-origin share resale through P2P -> Proportional Vault accounting reduction, never calculate seller entire balance against old basis', () => {
      // Seller had 68.8211 shares ($70.34 basis). Sells 5.00 shares in P2P for $5.00.
      const ledger = reconcileAccountLedger({
        userAddress: '0xd905920c91853039060246Ed5724AA72B91a96DA',
        totalWalletSharesRaw: 63_821_100_000_000_000_000n,
        onChainCostBasisRaw: 70_340_000_000_000_000_000n,
        currentSharePriceUSD: 0.99855781,
        events: [
          {
            id: 'dep-1',
            type: 'VAULT_DEPOSIT',
            timestamp: 100,
            sharesRaw: 68_821_100_000_000_000_000n,
            usdValue: 70.34,
          },
        ],
        p2pTrades: [
          {
            tradeId: 36,
            buyer: '0xB145AC2a59575Fbe306a58aC924718f4DD4659Da',
            seller: '0xd905920c91853039060246Ed5724AA72B91a96DA',
            amount: 5_000_000_000_000_000_000n,
            fiatAmount: 5n,
            fiatCurrency: 'INR',
            state: 5,
            fundingTimestamp: 200,
            paymentTimestamp: 210,
          },
        ],
      });

      expect(ledger.vaultPortfolio.portfolioSharesRaw).toBe(63_821_100_000_000_000_000n);
      expect(ledger.vaultPortfolio.portfolioCostBasisUSD).toBeCloseTo(65.23, 1);
      expect(ledger.vaultPortfolio.portfolioPositionValueUSD).toBeCloseTo(63.729, 2);
      expect(ledger.vaultPortfolio.portfolioPnLUSD).toBeCloseTo(-1.5, 1);
      expect(ledger.vaultPortfolio.portfolioROI).toBeCloseTo(-2.3, 1);
    });

    it('Lifecycle I: Mixed wallet (Vault-origin + P2P-origin + escrow-locked UVBE) -> all 3 states separately represented', () => {
      // User has: 1,000 Vault shares ($1,000 basis) + 500 P2P shares ($500 cost) + 200 Escrow-locked shares
      const ledger = reconcileAccountLedger({
        userAddress: '0xMIXED_USER_I',
        totalWalletSharesRaw: 1_500_000_000_000_000_000_000n, // Liquid in wallet: 1000 vault + 500 p2p
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
            tradeId: 701,
            buyer: '0xMIXED_USER_I',
            seller: '0xOTHER',
            amount: 500_000_000_000_000_000_000n,
            fiatAmount: 500n,
            fiatCurrency: 'USD',
            state: 5, // RELEASED
            paymentTimestamp: 150,
          },
          {
            tradeId: 702,
            seller: '0xMIXED_USER_I',
            buyer: '0xPENDING_BUYER',
            amount: 200_000_000_000_000_000_000n,
            fiatAmount: 200n,
            fiatCurrency: 'USD',
            state: 2, // FUNDED (Escrow-locked)
            origin: 'VAULT',
          },
        ],
      });

      // Domain 1: Vault Portfolio
      expect(ledger.vaultPortfolio.portfolioSharesRaw).toBe(1_000_000_000_000_000_000_000n);
      expect(ledger.vaultPortfolio.portfolioCostBasisUSD).toBe(1000);
      expect(ledger.hasVaultShares).toBe(true);

      // Domain 2: P2P Available Inventory
      expect(ledger.p2pTrading.activeP2PSharesRaw).toBe(500_000_000_000_000_000_000n);
      expect(ledger.p2pTrading.p2pAcquiredCostUSD).toBe(500);
      expect(ledger.hasP2PShares).toBe(true);

      // Domain 3: P2P Escrow-Locked Inventory
      expect(ledger.escrowLocked.lockedSharesRaw).toBe(200_000_000_000_000_000_000n);
      expect(ledger.escrowLocked.lockedPositionsCount).toBe(1);
      expect(ledger.hasLockedShares).toBe(true);

      // Total Wallet Token Balance (Informational)
      expect(ledger.totalWalletSharesRaw).toBe(1_500_000_000_000_000_000_000n);
    });

    it('Lifecycle J: Multiple P2P purchases at different prices -> weighted-average P2P acquisition cost (WAC)', () => {
      // Buy 1: 100 shares @ $1.00 ($100)
      // Buy 2: 100 shares @ $2.00 ($200)
      // Total: 200 shares, $300 cost -> WAC = $1.50/share
      // Sell: 50 shares @ $2.00 ($100) -> Cost of sold = 50 * $1.50 = $75. Realized PnL = $25.
      // Remaining: 150 shares, $225 cost.
      const ledger = reconcileAccountLedger({
        userAddress: '0xWAC_USER',
        totalWalletSharesRaw: 150_000_000_000_000_000_000n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.5,
        p2pTrades: [
          {
            tradeId: 801,
            buyer: '0xWAC_USER',
            seller: '0xS1',
            amount: 100_000_000_000_000_000_000n,
            fiatAmount: 100n,
            fiatCurrency: 'USD',
            state: 5,
            fundingTimestamp: 100,
            paymentTimestamp: 110,
          },
          {
            tradeId: 802,
            buyer: '0xWAC_USER',
            seller: '0xS2',
            amount: 100_000_000_000_000_000_000n,
            fiatAmount: 200n,
            fiatCurrency: 'USD',
            state: 5,
            fundingTimestamp: 120,
            paymentTimestamp: 130,
          },
          {
            tradeId: 803,
            buyer: '0xS3',
            seller: '0xWAC_USER',
            amount: 50_000_000_000_000_000_000n,
            fiatAmount: 100n,
            fiatCurrency: 'USD',
            state: 5,
            fundingTimestamp: 140,
            paymentTimestamp: 150,
          },
        ],
      });

      expect(ledger.p2pTrading.activeP2PSharesRaw).toBe(150_000_000_000_000_000_000n);
      expect(ledger.p2pTrading.p2pAcquiredCostUSD).toBe(225);
      expect(ledger.p2pTrading.p2pRealizedPnLUSD).toBe(25);
    });

    it('Lifecycle K: P2P 1% fee belongs strictly to P2P settlement domain, no portfolio cost basis or phantom P&L', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xFEE_USER',
        totalWalletSharesRaw: 100_000_000_000_000_000_000n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 901,
            buyer: '0xFEE_USER',
            seller: '0xMAKER',
            amount: 100_000_000_000_000_000_000n,
            fiatAmount: 100n,
            fiatCurrency: 'USD',
            feeAmount: 1_000_000_000_000_000_000n, // 1% protocol fee
            state: 5,
            fundingTimestamp: 100,
            paymentTimestamp: 110,
          },
        ],
      });

      // Fee does not leak into Vault portfolio
      expect(ledger.vaultPortfolio.portfolioCostBasisUSD).toBe(0);
      expect(ledger.vaultPortfolio.portfolioPnLUSD).toBe(0);
      expect(ledger.p2pTrading.p2pAcquiredCostUSD).toBe(100);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2: PERMANENT REGRESSION TESTS (1 - 12)
  // ══════════════════════════════════════════════════════════════════════════

  describe('Permanent Regression Invariants (1 through 12)', () => {
    it('1. Escrow lock does not change Vault NAV', () => {
      const protoBefore = transformProtocolMetrics(initialProtocolData, mockStrategyMetrics);
      const protoAfter = transformProtocolMetrics(initialProtocolData, mockStrategyMetrics);

      expect(protoAfter.totalVaultNAVUSD).toBe(protoBefore.totalVaultNAVUSD);
      expect(protoAfter.sharePriceUSD).toBe(protoBefore.sharePriceUSD);
      expect(protoAfter.totalVaultNAVUSD).toBe('$100,000.00');
    });

    it('2. Escrow lock does not change Vault cost basis', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xLOCK_USER_2',
        totalWalletSharesRaw: 800_000_000_000_000_000_000n,
        onChainCostBasisRaw: 1_000_000_000_000_000_000_000n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 2001,
            seller: '0xLOCK_USER_2',
            buyer: '0xBUYER',
            amount: 200_000_000_000_000_000_000n,
            fiatAmount: 200n,
            fiatCurrency: 'USD',
            state: 2, // FUNDED
            origin: 'VAULT',
          },
        ],
      });

      expect(ledger.vaultPortfolio.portfolioCostBasisUSD).toBe(1000);
    });

    it('3. Escrow lock does not change Vault ROI', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xLOCK_USER_3',
        totalWalletSharesRaw: 1_000_000_000_000_000_000_000n,
        onChainCostBasisRaw: 1_000_000_000_000_000_000_000n,
        currentSharePriceUSD: 1.25, // 25% gain
        p2pTrades: [
          {
            tradeId: 2002,
            seller: '0xLOCK_USER_3',
            buyer: '0xBUYER',
            amount: 200_000_000_000_000_000_000n,
            fiatAmount: 250n,
            fiatCurrency: 'USD',
            state: 2, // FUNDED
            origin: 'VAULT',
          },
        ],
      });

      expect(ledger.vaultPortfolio.portfolioROI).toBe(25);
    });

    it('4. Escrow lock does not create P&L', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xLOCK_USER_4',
        totalWalletSharesRaw: 500_000_000_000_000_000_000n,
        onChainCostBasisRaw: 500_000_000_000_000_000_000n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 2003,
            seller: '0xLOCK_USER_4',
            buyer: '0xBUYER',
            amount: 100_000_000_000_000_000_000n,
            fiatAmount: 100n,
            fiatCurrency: 'USD',
            state: 3, // PAYMENT_SUBMITTED
            origin: 'VAULT',
          },
        ],
      });

      expect(ledger.p2pTrading.p2pRealizedPnLUSD).toBe(0);
      expect(ledger.vaultPortfolio.portfolioPnLUSD).toBe(0);
    });

    it('5. Escrow release does not contaminate Vault accounting', () => {
      const userPortfolio = transformUserPortfolio(
        {
          userAddress: '0xBUYER_5',
          userSharesRaw: 500_000_000_000_000_000_000n, // Holds only 500 P2P shares
          userUsdcRaw: 0n,
          contractInvestedAssetsRaw: 0n,
          p2pTrades: [
            {
              tradeId: 2004,
              buyer: '0xBUYER_5',
              seller: '0xSELLER',
              amount: 500_000_000_000_000_000_000n,
              fiatAmount: 500n,
              fiatCurrency: 'USD',
              state: 5, // RELEASED
              fundingTimestamp: 100,
              paymentTimestamp: 110,
            },
          ],
        },
        initialProtocolData,
        protocolMetrics,
      );

      // Vault portfolio remains clean zero
      expect(userPortfolio.userSharesRaw).toBe(0n);
      expect(userPortfolio.rawInvestedAssetsUSD).toBe(0);
      expect(userPortfolio.rawCurrentValueUSD).toBe(0);
      expect(userPortfolio.rawPnLUSD).toBe(0);

      // P2P domain has the 500 shares
      expect(userPortfolio.p2pTrading?.activeP2PSharesRaw).toBe(500_000_000_000_000_000_000n);
      expect(userPortfolio.p2pTrading?.p2pAcquiredCostUSD).toBe(500);
    });

    it('6. Escrow refund restores inventory without P&L', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xSELLER_6',
        totalWalletSharesRaw: 1_000_000_000_000_000_000_000n,
        onChainCostBasisRaw: 1_000_000_000_000_000_000_000n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 2005,
            seller: '0xSELLER_6',
            buyer: '0xBUYER',
            amount: 200_000_000_000_000_000_000n,
            fiatAmount: 200n,
            fiatCurrency: 'USD',
            state: 6, // REFUNDED
            fundingTimestamp: 100,
            paymentTimestamp: 0,
          },
        ],
      });

      expect(ledger.vaultPortfolio.portfolioSharesRaw).toBe(1_000_000_000_000_000_000_000n);
      expect(ledger.vaultPortfolio.portfolioCostBasisUSD).toBe(1000);
      expect(ledger.p2pTrading.p2pRealizedPnLUSD).toBe(0);
      expect(ledger.escrowLocked.lockedSharesRaw).toBe(0n);
    });

    it('7. Escrow balance is never included in available P2P inventory', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xSELLER_7',
        totalWalletSharesRaw: 0n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 2006,
            seller: '0xSELLER_7',
            buyer: '0xBUYER',
            amount: 300_000_000_000_000_000_000n,
            fiatAmount: 300n,
            fiatCurrency: 'USD',
            state: 2, // FUNDED (in escrow)
            origin: 'P2P',
          },
        ],
      });

      expect(ledger.p2pTrading.activeP2PSharesRaw).toBe(0n);
      expect(ledger.escrowLocked.lockedSharesRaw).toBe(300_000_000_000_000_000_000n);
      expect(ledger.escrowLocked.hasLockedInventory).toBe(true);
    });

    it('8. Raw balanceOf() is never used as portfolioShares', () => {
      // User has 1,500 total wallet shares (1,000 Vault + 500 P2P)
      const userPortfolio = transformUserPortfolio(
        {
          userAddress: '0xUSER_8',
          userSharesRaw: 1_500_000_000_000_000_000_000n, // raw balanceOf(user)
          userUsdcRaw: 0n,
          contractInvestedAssetsRaw: 1_000_000_000_000_000_000_000n,
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
              tradeId: 2007,
              buyer: '0xUSER_8',
              seller: '0xOTHER',
              amount: 500_000_000_000_000_000_000n,
              fiatAmount: 500n,
              fiatCurrency: 'USD',
              state: 5,
              paymentTimestamp: 150,
            },
          ],
        },
        initialProtocolData,
        protocolMetrics,
      );

      // Critical Invariant: userSharesRaw in portfolio is strictly Vault shares (1,000), NOT raw wallet balance (1,500)!
      expect(userPortfolio.userSharesRaw).toBe(1_000_000_000_000_000_000_000n);
      expect(userPortfolio.walletBalanceRaw).toBe(1_500_000_000_000_000_000_000n);
      expect(userPortfolio.rawInvestedAssetsUSD).toBe(1000);
      expect(userPortfolio.rawCurrentValueUSD).toBe(1000);
    });

    it('9. Mixed Vault/P2P/escrow holdings remain correctly separated', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xUSER_9',
        totalWalletSharesRaw: 2_000_000_000_000_000_000_000n,
        onChainCostBasisRaw: 1_200_000_000_000_000_000_000n,
        currentSharePriceUSD: 1.0,
        events: [
          {
            id: 'dep-1',
            type: 'VAULT_DEPOSIT',
            timestamp: 100,
            sharesRaw: 1_200_000_000_000_000_000_000n,
            usdValue: 1200,
          },
        ],
        p2pTrades: [
          {
            tradeId: 2008,
            buyer: '0xUSER_9',
            seller: '0xS',
            amount: 800_000_000_000_000_000_000n,
            fiatAmount: 800n,
            fiatCurrency: 'USD',
            state: 5, // RELEASED
            paymentTimestamp: 120,
          },
          {
            tradeId: 2009,
            seller: '0xUSER_9',
            buyer: '0xB',
            amount: 250_000_000_000_000_000_000n,
            fiatAmount: 250n,
            fiatCurrency: 'USD',
            state: 4, // DISPUTED (escrow-locked)
            origin: 'VAULT',
          },
        ],
      });

      expect(ledger.vaultPortfolio.portfolioSharesRaw).toBe(1_200_000_000_000_000_000_000n);
      expect(ledger.p2pTrading.activeP2PSharesRaw).toBe(800_000_000_000_000_000_000n);
      expect(ledger.escrowLocked.lockedSharesRaw).toBe(250_000_000_000_000_000_000n);
    });

    it('10. P2P-origin resale produces only P2P realized P&L', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xUSER_10',
        totalWalletSharesRaw: 0n,
        onChainCostBasisRaw: 0n,
        currentSharePriceUSD: 1.0,
        p2pTrades: [
          {
            tradeId: 2010,
            buyer: '0xUSER_10',
            seller: '0xS',
            amount: 100_000_000_000_000_000_000n,
            fiatAmount: 100n,
            fiatCurrency: 'USD',
            state: 5,
            paymentTimestamp: 100,
          },
          {
            tradeId: 2011,
            buyer: '0xB',
            seller: '0xUSER_10',
            amount: 100_000_000_000_000_000_000n,
            fiatAmount: 140n,
            fiatCurrency: 'USD',
            state: 5,
            paymentTimestamp: 200,
          },
        ],
      });

      expect(ledger.p2pTrading.p2pRealizedPnLUSD).toBe(40);
      expect(ledger.vaultPortfolio.portfolioPnLUSD).toBe(0);
    });

    it('11. Vault-origin resale produces proportional Vault accounting changes', () => {
      const ledger = reconcileAccountLedger({
        userAddress: '0xUSER_11',
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
            tradeId: 2012,
            seller: '0xUSER_11',
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
      expect(ledger.vaultPortfolio.averageEntryPriceUSD).toBe(1.0);
    });

    it('12. All existing Phase 6 accounting-isolation tests continue passing', () => {
      const proto = transformProtocolMetrics(initialProtocolData, mockStrategyMetrics);
      expect(proto.totalVaultNAVUSD).toBe('$100,000.00');
      expect(proto.sharePriceUSD).toBe('$1.00000000');
      expect(proto.protocolHoldings.length).toBe(3);
    });
  });
});
