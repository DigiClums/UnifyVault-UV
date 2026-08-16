import { describe, it, expect } from 'vitest';
import fs from 'fs';
import {
  performRealReceiptOCR,
  extractReceiptDataFromText,
  extractAmountCandidateFromText,
  resolveConsensusAmount,
  OCR_LAYOUT_PASS_DELIMITER,
  OCRPassCandidate,
} from '../ocrEngine';
import { verifyPaymentEvidence } from '../evidenceVerifier';
import { TradeVerificationContext } from '../types';

describe('OCR Multi-Layout Amount Candidate Consensus & Navi ₹90 Regression Suite', () => {
  const receipt90Path =
    '/var/lib/unifyvault/p2p-evidence/0x8d078e2eb67650bbfacd1290f82d8974c9933a476501ffa51cdf43d1cc8461af.png';
  const receipt35Path =
    '/var/lib/unifyvault/p2p-evidence/0xbd23a456c6f9237bd98ad66feae371ed7641f4af4f151a7ea7b6c231dc54c681.jpg';
  const receipt10Path =
    '/var/lib/unifyvault/p2p-evidence/0xe414714a00a6ad63eb4621811a5fdcb5e08c7e9fd0e14d2a6323edb91988dd4e.png';
  const receipt5Path =
    '/var/lib/unifyvault/p2p-evidence/0xf720408593ea5200fa0d416e784eda3d4fbf9dfad2d06c13d7ad79f9637d20a6.png';

  // 1. Navi ₹90 Real Receipt Verification
  it('1. Real Navi ₹90 receipt extracts actual amount 90 and matches trade verification', async () => {
    expect(fs.existsSync(receipt90Path)).toBe(true);
    const bytes = new Uint8Array(fs.readFileSync(receipt90Path));

    const ocrResult = await performRealReceiptOCR(bytes, 'image/png', 'navi90.png');
    expect(ocrResult.text).toContain('659459986513');
    expect(ocrResult.text.toLowerCase()).toContain('successful');

    const data = extractReceiptDataFromText(ocrResult.text, ocrResult.passResults);
    expect(data.utr).toBe('659459986513');
    expect(data.amount).toBe(90); // Must be 90, NOT 290 or 1000
    expect(data.paymentStatus).toBe('SUCCESSFUL');
    expect(data.receiverVpa).toBe('6378191156@upi');
    expect(data.transactionDate).toBe('16 Aug 2026');

    const context: TradeVerificationContext = {
      tradeId: 1090,
      expectedAmount: 90,
      expectedCurrency: 'INR',
      expectedUtr: '659459986513',
      expectedPayeeVpa: '6378191156@upi',
    };

    const verification = await verifyPaymentEvidence({
      file: {
        name: 'navi90.png',
        type: 'image/png',
        size: bytes.length,
        bytes,
      },
      context,
    });

    expect(verification.status).toBe('OCR_SUCCESS');
    expect(verification.ocrState).toBe('OCR_SUCCESS');
    expect(verification.isClaimAllowed).toBe(true);
    expect(verification.isReleaseAllowed).toBe(true);
    expect(verification.extractedData.amount).toBe(90);
    expect(verification.extractedData.utr).toBe('659459986513');
  }, 30000);

  // 2. Real receipts (₹35, ₹10, ₹5) continue passing
  it('2. Real Navi ₹35 receipt extracts amount 35 accurately', async () => {
    if (!fs.existsSync(receipt35Path)) return;
    const bytes = new Uint8Array(fs.readFileSync(receipt35Path));
    const ocrResult = await performRealReceiptOCR(bytes, 'image/jpeg', 'receipt35.jpg');
    const data = extractReceiptDataFromText(ocrResult.text, ocrResult.passResults);
    expect(data.amount).toBe(35);
    expect(data.utr).toBe('004122963230');
    expect(data.paymentStatus).toBe('SUCCESSFUL');
  }, 30000);

  it('2. Real Navi ₹10 receipt extracts amount 10 accurately', async () => {
    if (!fs.existsSync(receipt10Path)) return;
    const bytes = new Uint8Array(fs.readFileSync(receipt10Path));
    const ocrResult = await performRealReceiptOCR(bytes, 'image/png', 'receipt10.png');
    const data = extractReceiptDataFromText(ocrResult.text, ocrResult.passResults);
    expect(data.amount).toBe(10);
    expect(data.utr).toBe('004139506652');
    expect(data.paymentStatus).toBe('SUCCESSFUL');
  }, 30000);

  it('2. Real PhonePe ₹5 receipt extracts amount 5 accurately', async () => {
    if (!fs.existsSync(receipt5Path)) return;
    const bytes = new Uint8Array(fs.readFileSync(receipt5Path));
    const ocrResult = await performRealReceiptOCR(bytes, 'image/png', 'receipt5.png');
    const data = extractReceiptDataFromText(ocrResult.text, ocrResult.passResults);
    expect(data.amount).toBe(5);
    expect(data.utr).toBe('004291837465');
    expect(data.paymentStatus).toBe('SUCCESSFUL');
  }, 30000);

  // 3. Hardened Edge-Case Consensus Assertions
  describe('Specific 10-Scenario Edge-Case Hardening Tests', () => {
    it('Audit Case 1: AUTO=90, SINGLE_COLUMN=90, SPARSE_TEXT=290 -> 90', () => {
      const candidates: OCRPassCandidate[] = [
        { amount: 90, isStructured: true, psm: 'AUTO' },
        { amount: 90, isStructured: true, psm: 'SINGLE_COLUMN' },
        { amount: 290, isStructured: false, psm: 'SPARSE_TEXT' },
      ];
      expect(resolveConsensusAmount(candidates)).toBe(90);
    });

    it('Audit Case 2: AUTO=290, SINGLE_COLUMN=290, SPARSE_TEXT=90 -> 290 (preserves structured 290)', () => {
      const candidates: OCRPassCandidate[] = [
        { amount: 290, isStructured: true, psm: 'AUTO' },
        { amount: 290, isStructured: true, psm: 'SINGLE_COLUMN' },
        { amount: 90, isStructured: false, psm: 'SPARSE_TEXT' },
      ];
      expect(resolveConsensusAmount(candidates)).toBe(290);
    });

    it('Audit Case 3: AUTO=290, SINGLE_COLUMN=90, SPARSE_TEXT=290 -> undefined (fails closed on split structured layouts)', () => {
      const candidates: OCRPassCandidate[] = [
        { amount: 290, isStructured: true, psm: 'AUTO' },
        { amount: 90, isStructured: true, psm: 'SINGLE_COLUMN' },
        { amount: 290, isStructured: false, psm: 'SPARSE_TEXT' },
      ];
      expect(resolveConsensusAmount(candidates)).toBeUndefined();
    });

    it('Audit Case 4: Legitimate transaction amount ₹290 across all passes -> 290, never 90', () => {
      const candidates: OCRPassCandidate[] = [
        { amount: 290, isStructured: true, psm: 'AUTO' },
        { amount: 290, isStructured: true, psm: 'SINGLE_COLUMN' },
        { amount: 290, isStructured: false, psm: 'SPARSE_TEXT' },
      ];
      expect(resolveConsensusAmount(candidates)).toBe(290);
    });

    it('Audit Case 5: Legitimate transaction amount ₹2,900 across all passes -> 2900', () => {
      const candidates: OCRPassCandidate[] = [
        { amount: 2900, isStructured: true, psm: 'AUTO' },
        { amount: 2900, isStructured: true, psm: 'SINGLE_COLUMN' },
        { amount: 2900, isStructured: false, psm: 'SPARSE_TEXT' },
      ];
      expect(resolveConsensusAmount(candidates)).toBe(2900);
    });

    it('Audit Case 6: AUTO=500, SINGLE_COLUMN=500, SPARSE_TEXT=1000 -> 500', () => {
      const candidates: OCRPassCandidate[] = [
        { amount: 500, isStructured: true, psm: 'AUTO' },
        { amount: 500, isStructured: true, psm: 'SINGLE_COLUMN' },
        { amount: 1000, isStructured: false, psm: 'SPARSE_TEXT' },
      ];
      expect(resolveConsensusAmount(candidates)).toBe(500);
    });

    it('Audit Case 7: AUTO=500, SINGLE_COLUMN=1000, SPARSE_TEXT=1000 -> undefined (manual review on split structured)', () => {
      const candidates: OCRPassCandidate[] = [
        { amount: 500, isStructured: true, psm: 'AUTO' },
        { amount: 1000, isStructured: true, psm: 'SINGLE_COLUMN' },
        { amount: 1000, isStructured: false, psm: 'SPARSE_TEXT' },
      ];
      expect(resolveConsensusAmount(candidates)).toBeUndefined();
    });

    it('Audit Case 8: AUTO=100, SINGLE_COLUMN=200, SPARSE_TEXT=300 -> undefined (manual review)', () => {
      const candidates: OCRPassCandidate[] = [
        { amount: 100, isStructured: true, psm: 'AUTO' },
        { amount: 200, isStructured: true, psm: 'SINGLE_COLUMN' },
        { amount: 300, isStructured: false, psm: 'SPARSE_TEXT' },
      ];
      expect(resolveConsensusAmount(candidates)).toBeUndefined();
    });

    it('Audit Case 9: Only SPARSE_TEXT has an amount -> preserves single-pass candidate', () => {
      const candidates: OCRPassCandidate[] = [
        { amount: undefined, isStructured: true, psm: 'AUTO' },
        { amount: undefined, isStructured: true, psm: 'SINGLE_COLUMN' },
        { amount: 500, isStructured: false, psm: 'SPARSE_TEXT' },
      ];
      expect(resolveConsensusAmount(candidates)).toBe(500);
    });

    it('Audit Case 10: Promotional ₹1,000 plus legitimate transaction ₹90 -> 90', () => {
      const promoText = `
        Get up to @1,000 on every payment | ®100 = #1
        Payment successful
        to VIJAY KUMAR KEWLANI
        6378191156@upi
        90
        Paid via Navi UPI
        UPI txn ID : 659459986513
      `;
      const candidate = extractAmountCandidateFromText(promoText);
      expect(candidate).toBe(90);
      expect(candidate).not.toBe(1000);

      const data = extractReceiptDataFromText(promoText);
      expect(data.amount).toBe(90);
      expect(data.amount).not.toBe(1000);
    });

    it('Audit Delimiter Impact on Metadata', () => {
      const multiPassSample = [
        `Paid securely on Navi
Payment successful
to VIJAY KUMAR KEWLANI
6378191156@upi
90
Paid via Navi UPI
16 Aug 2026, 9:28 PM
from SHALINI PAL
Punjab National Bank - 3222
UPI txn ID : 659459986513`,
        `Payment successful
to VIJAY KUMAR KEWLANI
6378191156@upi
90
Paid via Navi UPI
16 Aug 2026, 9:28 PM
from SHALINI PAL
Punjab National Bank - 3222
UPI txn ID : 659459986513`,
        `290
Paid via Navi UPI
UPI txn ID : 659459986513`,
      ].join(OCR_LAYOUT_PASS_DELIMITER);

      const data = extractReceiptDataFromText(multiPassSample);
      expect(data.utr).toBe('659459986513');
      expect(data.receiverVpa).toBe('6378191156@upi');
      expect(data.paymentStatus).toBe('SUCCESSFUL');
      expect(data.transactionDate).toBe('16 Aug 2026');
      expect(data.transactionTime).toBe('9:28 PM');
      expect(data.senderName).toBe('SHALINI PAL');
      expect(data.amount).toBe(90);
    });
  });
});
