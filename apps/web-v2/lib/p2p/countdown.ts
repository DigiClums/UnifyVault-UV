/**
 * Pure countdown formatting and deadline calculation utilities for P2P Escrow
 */
export function formatCountdown(secs: number): string {
  if (secs <= 0) return '00:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function calculateRemainingSeconds(
  fundingTimestamp: number,
  paymentWindow: number,
  currentTimestamp: number = Math.floor(Date.now() / 1000),
): number {
  if (fundingTimestamp <= 0 || paymentWindow <= 0) return 0;
  const deadline = fundingTimestamp + paymentWindow;
  return Math.max(0, deadline - currentTimestamp);
}

export function isPaymentWindowExpired(
  fundingTimestamp: number,
  paymentWindow: number,
  currentTimestamp: number = Math.floor(Date.now() / 1000),
): boolean {
  if (fundingTimestamp <= 0 || paymentWindow <= 0) return false;
  return currentTimestamp >= fundingTimestamp + paymentWindow;
}
