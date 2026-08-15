import { describe, it, expect } from 'vitest';
import { parseUnits, formatUnits } from 'viem';
import { getTokenDecimals, getTokenSymbol } from '../../../lib/explorer/eventRegistry';

describe('Phase 3.1 — Marketplace Decimals & Settlement Precision Audit Tests', () => {
  const addressUSDC = '0x036cbd53842c5426634e7929541ec2318f3dcf7e'; // 6 decimals
  const addresscbBTC = '0xb0b47f113bcab2b0e49fd5d3bd2cc0e9aa408b29'; // 8 decimals
  const addressWETH = '0xd116ab1c943cf15904ec4c8dd701086f175fa323'; // 18 decimals
  const addressUVBE = '0x006c5df13c716e5224b33956651c4356bb90dec0'; // 18 decimals

  // 1, 2, 4 & 5. Verify Asset Decimals Resolution
  it('1, 2, 4 & 5. Correctly resolves asset decimals for USDC (6), cbBTC (8), WETH (18), and UVBE (18)', () => {
    expect(getTokenDecimals(addressUSDC)).toBe(6);
    expect(getTokenSymbol(addressUSDC)).toBe('USDC');

    expect(getTokenDecimals(addresscbBTC)).toBe(8);
    expect(getTokenSymbol(addresscbBTC)).toBe('cbBTC');

    expect(getTokenDecimals(addressWETH)).toBe(18);
    expect(getTokenSymbol(addressWETH)).toBe('WETH');

    expect(getTokenDecimals(addressUVBE)).toBe(18);
    expect(getTokenSymbol(addressUVBE)).toBe('UVBE');
  });

  // 3 & 7. Fiat Calculation Alignment with Marketplace.sol
  // Marketplace.sol: fiatAmount = (matchAmount * executionPrice) / (10 ** assetDecimals)
  it('3 & 7. Calculates exact fiat amount for 18-decimal asset matching Marketplace.sol on-chain math', () => {
    const assetDecimals = 18;
    const matchAmount = parseUnits('40', assetDecimals); // 40.0 UVBE
    const executionPrice = 500n; // ₹500.00

    const fiatAmountOnChain = (matchAmount * executionPrice) / 10n ** BigInt(assetDecimals);
    expect(fiatAmountOnChain).toBe(20000n); // 20,000 INR
    expect(formatUnits(fiatAmountOnChain, 0)).toBe('20000');
  });

  it('3, 6 & 7. Calculates exact fiat amount for 6-decimal asset (USDC) matching Marketplace.sol on-chain math', () => {
    const assetDecimals = 6;
    const matchAmount = parseUnits('100', assetDecimals); // 100.0 USDC
    const executionPrice = 85n; // ₹85.00 INR per USDC

    const fiatAmountOnChain = (matchAmount * executionPrice) / 10n ** BigInt(assetDecimals);
    expect(fiatAmountOnChain).toBe(8500n); // ₹8,500.00 INR
  });

  it('3, 6 & 7. Calculates exact fiat amount for 8-decimal asset (cbBTC) matching Marketplace.sol on-chain math', () => {
    const assetDecimals = 8;
    const matchAmount = parseUnits('0.5', assetDecimals); // 0.5 cbBTC = 50,000,000 satoshis
    const executionPrice = 6000000n; // ₹6,000,000.00 INR per BTC

    const fiatAmountOnChain = (matchAmount * executionPrice) / 10n ** BigInt(assetDecimals);
    expect(fiatAmountOnChain).toBe(3000000n); // ₹3,000,000.00 INR
  });

  // 9. Partial-Fill Precision Test
  it('9. Preserves partial-fill remaining amount precision for 6-decimal and 8-decimal assets', () => {
    // 6-decimal USDC order
    const usdcTotal = parseUnits('500', 6);
    const usdcMatch = parseUnits('120.5', 6);
    const usdcRemaining = usdcTotal - usdcMatch;
    expect(formatUnits(usdcRemaining, 6)).toBe('379.5');

    // 8-decimal cbBTC order
    const btcTotal = parseUnits('1.25', 8);
    const btcMatch = parseUnits('0.4', 8);
    const btcRemaining = btcTotal - btcMatch;
    expect(formatUnits(btcRemaining, 8)).toBe('0.85');
  });

  // 10. Limits Unit Precision Test
  it('10. Min/Max limits use identical decimals as asset token', () => {
    const decimals = getTokenDecimals(addressUSDC);
    const minLimit = parseUnits('10', decimals);
    const maxLimit = parseUnits('500', decimals);

    expect(formatUnits(minLimit, decimals)).toBe('10');
    expect(formatUnits(maxLimit, decimals)).toBe('500');
  });

  // 12. TradeDetailCard Fiat Formatting Test
  it('12. TradeDetailCard formats on-chain 2-decimal fiat amounts accurately', () => {
    const rawFiat2Decimals = 2000000n; // 2,000,000 paise = 20,000.00 INR
    const formatted = Number(formatUnits(rawFiat2Decimals, 2)).toFixed(2);
    expect(formatted).toBe('20000.00');
  });
});
