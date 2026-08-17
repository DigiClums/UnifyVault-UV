import { describe, it, expect } from 'vitest';
import {
  formatCountdown,
  calculateRemainingSeconds,
  isPaymentWindowExpired,
} from '../../../lib/p2p/countdown';

describe('Phase C — PaymentCountdown Logic & Time Math Invariants', () => {
  describe('formatCountdown Function', () => {
    it('formats 0 seconds as 00:00', () => {
      expect(formatCountdown(0)).toBe('00:00');
    });

    it('formats negative seconds safely as 00:00 without crashing', () => {
      expect(formatCountdown(-1)).toBe('00:00');
      expect(formatCountdown(-100)).toBe('00:00');
    });

    it('formats single-digit seconds with leading zero', () => {
      expect(formatCountdown(1)).toBe('00:01');
      expect(formatCountdown(9)).toBe('00:09');
    });

    it('formats multi-second intervals under one minute', () => {
      expect(formatCountdown(30)).toBe('00:30');
      expect(formatCountdown(59)).toBe('00:59');
    });

    it('formats exact minutes accurately', () => {
      expect(formatCountdown(60)).toBe('01:00');
      expect(formatCountdown(300)).toBe('05:00');
      expect(formatCountdown(900)).toBe('15:00'); // Standard 15 min payment window
      expect(formatCountdown(1800)).toBe('30:00'); // Standard 30 min payment window
    });

    it('formats minutes and seconds combined', () => {
      expect(formatCountdown(65)).toBe('01:05');
      expect(formatCountdown(899)).toBe('14:59');
      expect(formatCountdown(3599)).toBe('59:59');
    });
  });

  describe('calculateRemainingSeconds & isPaymentWindowExpired', () => {
    it('correctly calculates remaining window when funded recently', () => {
      const now = 1700000000;
      const fundingTimestamp = 1700000000; // Just funded
      const paymentWindow = 900; // 15 mins

      const remaining = calculateRemainingSeconds(fundingTimestamp, paymentWindow, now);
      const isExpired = isPaymentWindowExpired(fundingTimestamp, paymentWindow, now);

      expect(remaining).toBe(900);
      expect(isExpired).toBe(false);
      expect(formatCountdown(remaining)).toBe('15:00');
    });

    it('correctly calculates remaining window midway through payment period', () => {
      const fundingTimestamp = 1700000000;
      const paymentWindow = 900; // 15 mins (deadline = 1700000900)
      const now = 1700000500; // 500s elapsed (400s remaining = 06:40)

      const remaining = calculateRemainingSeconds(fundingTimestamp, paymentWindow, now);
      const isExpired = isPaymentWindowExpired(fundingTimestamp, paymentWindow, now);

      expect(remaining).toBe(400);
      expect(isExpired).toBe(false);
      expect(formatCountdown(remaining)).toBe('06:40');
    });

    it('correctly determines expired state when deadline is past', () => {
      const fundingTimestamp = 1700000000;
      const paymentWindow = 900; // deadline = 1700000900
      const now = 1700000901; // 1 second past deadline

      const remaining = calculateRemainingSeconds(fundingTimestamp, paymentWindow, now);
      const isExpired = isPaymentWindowExpired(fundingTimestamp, paymentWindow, now);

      expect(remaining).toBe(0);
      expect(isExpired).toBe(true);
      expect(formatCountdown(remaining)).toBe('00:00');
    });

    it('handles zero funding timestamp or zero window safely', () => {
      const now = 1700000000;
      expect(calculateRemainingSeconds(0, 900, now)).toBe(0);
      expect(calculateRemainingSeconds(1700000000, 0, now)).toBe(0);
      expect(isPaymentWindowExpired(0, 900, now)).toBe(false);
      expect(isPaymentWindowExpired(1700000000, 0, now)).toBe(false);
    });
  });
});
