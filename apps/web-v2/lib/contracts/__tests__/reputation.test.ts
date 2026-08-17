import { describe, it, expect } from 'vitest';
import {
  calculateTrustScoreBps,
  computeTrustTier,
  TrustTier,
  BAYESIAN_PRIOR_WEIGHT,
  BAYESIAN_PRIOR_SCORE,
  MAX_BPS,
  SCALE_FACTOR,
  MERCHANT_MIN_RATINGS,
  MERCHANT_MIN_TRUST_SCORE,
  MERCHANT_MIN_SETTLED_VOLUME,
} from '../reputation';

describe('P2P Reputation Mathematical Parity & Optimization Tests', () => {
  describe('Constants Verification', () => {
    it('matches exact Solidity smart contract constants', () => {
      expect(BAYESIAN_PRIOR_WEIGHT).toBe(5n);
      expect(BAYESIAN_PRIOR_SCORE).toBe(3n);
      expect(MAX_BPS).toBe(10000n);
      expect(SCALE_FACTOR).toBe(5n);
      expect(MERCHANT_MIN_RATINGS).toBe(20);
      expect(MERCHANT_MIN_TRUST_SCORE).toBe(9000);
      expect(MERCHANT_MIN_SETTLED_VOLUME).toBe(100n * 10n ** 18n);
    });
  });

  describe('calculateTrustScoreBps (Laplace/Bayesian Smoothing)', () => {
    it('returns 0 BPS for 0 ratings (Unrated)', () => {
      expect(calculateTrustScoreBps(0, 0n)).toBe(0);
      expect(calculateTrustScoreBps(0, 5n)).toBe(0);
    });

    it('correctly calculates 1 rating of 5 stars', () => {
      // Formula: ((5 * 3 + 5) * 10000) / ((5 + 1) * 5) = (20 * 10000) / 30 = 200000 / 30 = 6666 BPS (66.66%)
      const score = calculateTrustScoreBps(1, 5n);
      expect(score).toBe(6666);
    });

    it('correctly calculates 1 rating of 1 star', () => {
      // Formula: ((5 * 3 + 1) * 10000) / ((5 + 1) * 5) = (16 * 10000) / 30 = 160000 / 30 = 5333 BPS (53.33%)
      const score = calculateTrustScoreBps(1, 1n);
      expect(score).toBe(5333);
    });

    it('correctly calculates 5 ratings of 5 stars', () => {
      // Formula: ((5 * 3 + 25) * 10000) / ((5 + 5) * 5) = (40 * 10000) / 50 = 400000 / 50 = 8000 BPS (80.00%)
      const score = calculateTrustScoreBps(5, 25n);
      expect(score).toBe(8000);
    });

    it('correctly calculates 20 ratings of 5 stars', () => {
      // Formula: ((5 * 3 + 100) * 10000) / ((5 + 20) * 5) = (115 * 10000) / 125 = 1150000 / 125 = 9200 BPS (92.00%)
      const score = calculateTrustScoreBps(20, 100n);
      expect(score).toBe(9200);
    });

    it('correctly calculates 100 ratings of 5 stars', () => {
      // Formula: ((5 * 3 + 500) * 10000) / ((5 + 100) * 5) = (515 * 10000) / 525 = 5150000 / 525 = 9809 BPS (98.09%)
      const score = calculateTrustScoreBps(100, 500n);
      expect(score).toBe(9809);
    });

    it('handles negative or invalid counts safely', () => {
      expect(calculateTrustScoreBps(-1, 0n)).toBe(0);
    });
  });

  describe('computeTrustTier (Tier Classification)', () => {
    it('assigns UNRATED when ratings count is 0', () => {
      expect(computeTrustTier(0, 0, 0n)).toBe(TrustTier.UNRATED);
      expect(computeTrustTier(0, 9500, 500n * 10n ** 18n)).toBe(TrustTier.UNRATED);
    });

    it('assigns PROBATIONARY when ratings count is between 1 and 4', () => {
      expect(computeTrustTier(1, 6666, 1000n * 10n ** 18n)).toBe(TrustTier.PROBATIONARY);
      expect(computeTrustTier(4, 7800, 1000n * 10n ** 18n)).toBe(TrustTier.PROBATIONARY);
    });

    it('assigns ESTABLISHED when ratings count is between 5 and 19', () => {
      expect(computeTrustTier(5, 8000, 1000n * 10n ** 18n)).toBe(TrustTier.ESTABLISHED);
      expect(computeTrustTier(19, 9100, 1000n * 10n ** 18n)).toBe(TrustTier.ESTABLISHED);
    });

    it('assigns ESTABLISHED when ratings >= 20 but score < 9000 BPS', () => {
      const highVolume = 500n * 10n ** 18n;
      expect(computeTrustTier(20, 8999, highVolume)).toBe(TrustTier.ESTABLISHED);
    });

    it('assigns ESTABLISHED when ratings >= 20 and score >= 9000 BPS but volume < 100 * 1e18', () => {
      const lowVolume = 99n * 10n ** 18n;
      expect(computeTrustTier(20, 9200, lowVolume)).toBe(TrustTier.ESTABLISHED);
    });

    it('assigns VERIFIED_MERCHANT when ratings >= 20, score >= 9000 BPS, and volume >= 100 * 1e18', () => {
      const qualifyingVolume = 100n * 10n ** 18n;
      expect(computeTrustTier(20, 9000, qualifyingVolume)).toBe(TrustTier.VERIFIED_MERCHANT);
      expect(computeTrustTier(25, 9500, 500n * 10n ** 18n)).toBe(TrustTier.VERIFIED_MERCHANT);
    });
  });
});
