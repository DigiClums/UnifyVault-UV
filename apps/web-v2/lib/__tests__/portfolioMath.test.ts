import { describe, expect, it } from 'vitest';
import {
  calculateAllocationBps,
  calculateAllocationPercent,
  calculateAssetUSDValue,
  calculateAverageEntryPrice,
  calculateCostBasis,
  calculateCurrentValueUSD,
  calculateTotalVaultNAVUSD,
  calculateNAVPerShareUSD,
  calculateOwnershipPercentage,
  calculateOwnershipRatio,
  calculatePnL,
  calculateSharePriceUSD,
  calculateTVLUSD,
  calculateUserProRataBalance,
  calculateUserProRataUSD,
} from '../portfolioMath';

describe('portfolioMath Utility Library', () => {
  describe('Zero Supply & Boundary Safeguards', () => {
    it('handles zero share supply for share price calculation with genesis $1.00 fallback', () => {
      const sharePrice = calculateSharePriceUSD(100000, 0n);
      expect(sharePrice).toBe(1.0);
    });

    it('returns 0 for ownership ratio when total shares supply is zero', () => {
      const ratio = calculateOwnershipRatio(100n, 0n);
      expect(ratio).toBe(0);
    });

    it('returns 0n for user pro-rata asset balance when total share supply is zero', () => {
      const proRata = calculateUserProRataBalance(100000000n, 100n, 0n);
      expect(proRata).toBe(0n);
    });

    it('returns 0 for Total Vault NAV when total portfolio value is 0', () => {
      const nav = calculateTotalVaultNAVUSD(0);
      expect(nav).toBe(0);
    });
  });

  describe('Disconnected Wallet & Zero Holdings', () => {
    it('returns 0 cost basis for disconnected wallet with zero shares', () => {
      const costBasis = calculateCostBasis(0n, 0n, undefined);
      expect(costBasis).toBe(0);
    });

    it('returns 0 current portfolio value when user holds zero shares', () => {
      const currentValue = calculateCurrentValueUSD(0n, 1.5);
      expect(currentValue).toBe(0);
    });

    it('formats zero ownership ratio as "0.00%"', () => {
      const formatted = calculateOwnershipPercentage(0);
      expect(formatted).toBe('0.00%');
    });

    it('returns 0 pro-rata USD when user ownership ratio is zero', () => {
      const usdClaim = calculateUserProRataUSD(50000, 0);
      expect(usdClaim).toBe(0);
    });
  });

  describe('Invested Capital Fallback Logic', () => {
    it('uses on-chain CostBasisManager value when available (18 decimals)', () => {
      const costBasis = calculateCostBasis(500_000_000_000_000_000_000n, 0n, '0x123');
      expect(costBasis).toBe(500.0);
    });

    it('returns 0 cost basis when untracked on-chain', () => {
      // User holds 50 shares (50e18) but untracked on-chain
      const costBasis = calculateCostBasis(0n, 50_000_000_000_000_000_000n, undefined);
      expect(costBasis).toBe(0);
    });
  });

  describe('Precision & Deterministic BigInt Math', () => {
    it('calculates 8-decimal WBTC USD value accurately via BigInt without premature float conversion', () => {
      // 1.0 WBTC (100,000,000 raw) at $65,000.00 (65,000e18 raw oracle price)
      const wbtcUSD = calculateAssetUSDValue(100_000_000n, 8, 65_000_000_000_000_000_000_000n);
      expect(wbtcUSD).toBe(65000);
    });

    it('calculates 18-decimal WETH USD value accurately via BigInt', () => {
      // 2.5 WETH (2.5e18 raw) at $3,500.00 (3,500e18 raw oracle price)
      const wethUSD = calculateAssetUSDValue(
        2_500_000_000_000_000_000n,
        18,
        3_500_000_000_000_000_000_000n,
      );
      expect(wethUSD).toBe(8750);
    });

    it('computes exact fractional ownership ratio without floating point precision truncation', () => {
      // 1/3 ownership: 333,333,333,333,333,333 / 1,000,000,000,000,000,000
      const ratio = calculateOwnershipRatio(333_333_333_333_333_333n, 1_000_000_000_000_000_000n);
      expect(ratio).toBeCloseTo(0.3333333333333333, 10);
    });

    it('computes exact BigInt pro-rata asset share', () => {
      // Vault has 300,000,000 satoshis (3 BTC). User owns 1/3 of supply.
      const userSatoshis = calculateUserProRataBalance(
        300_000_000n,
        1_000_000_000_000_000_000n,
        3_000_000_000_000_000_000n,
      );
      expect(userSatoshis).toBe(100_000_000n);
    });
  });

  describe('NAV & TVL Calculations', () => {
    it('sums asset valuations into Total Value Locked (TVL)', () => {
      const tvl = calculateTVLUSD([65000, 8750, 1000]);
      expect(tvl).toBe(74750);
    });

    it('returns Total Vault NAV matching TVL valuation', () => {
      const nav = calculateTotalVaultNAVUSD(74750);
      expect(nav).toBe(74750);
    });

    it('calculates share price correctly when total supply is active', () => {
      // TVL = $100,000, Total Shares = 100,000 (100,000e18) -> Share price = $1.00
      const price = calculateSharePriceUSD(100000, 100_000_000_000_000_000_000_000n);
      expect(price).toBe(1.0);
    });
  });

  describe('Allocation & Basis Points (BPS)', () => {
    it('calculates exact asset allocation percentage', () => {
      const percent = calculateAllocationPercent(50000, 100000);
      expect(percent).toBe(50.0);
    });

    it('calculates exact asset allocation in basis points (BPS)', () => {
      const bps = calculateAllocationBps(50000, 100000);
      expect(bps).toBe(5000);
    });
  });

  describe('Profit and Loss (PnL) & Entry Price', () => {
    it('evaluates profitable scenario correctly', () => {
      const { pnlUSD, pnlPercent, isProfitable } = calculatePnL(120, 100);
      expect(pnlUSD).toBe(20);
      expect(pnlPercent).toBe(20);
      expect(isProfitable).toBe(true);
    });

    it('evaluates unprofitable scenario correctly', () => {
      const { pnlUSD, pnlPercent, isProfitable } = calculatePnL(80, 100);
      expect(pnlUSD).toBe(-20);
      expect(pnlPercent).toBe(-20);
      expect(isProfitable).toBe(false);
    });

    it('calculates average entry price per share', () => {
      // 100 shares held, $200 invested capital -> average entry price = $2.00/share
      const avgEntry = calculateAverageEntryPrice(100_000_000_000_000_000_000n, 200, 2.5);
      expect(avgEntry).toBe(2.0);
    });
  });
});
