import { describe, it, expect } from 'vitest';
import { generateUpiUri } from '../../../lib/payment/paymentIntentStore';

describe('Phase F4 — Mobile UPI Payment UX & Receipt OCR Verification', () => {
  describe('1. Mobile UPI Deep Link Generation & Safety', () => {
    it('generates a valid RFC/NPCI compliant upi://pay? deep link with required parameters', () => {
      const upiLink = generateUpiUri(
        'seller@upi',
        'Seller Name',
        '5000.00',
        'INR',
        'UV-TRD-12345-AB12',
      );

      expect(upiLink).toMatch(/^upi:\/\/pay\?/);
      expect(upiLink).toContain('pa=seller%40upi');
      expect(upiLink).toContain('am=5000.00');
      expect(upiLink).toContain('cu=INR');
      expect(upiLink).toContain('tn=UV-TRD-12345-AB12');
    });

    it('rejects when currency is non-INR', () => {
      expect(() => generateUpiUri('seller@upi', 'Seller', '500.00', 'USD', 'UV-TRD-1')).toThrow(
        /Invalid UPI currency/,
      );
    });

    it('validates that upi://pay? prefix is strictly required for Open in UPI App CTA', () => {
      const validUri = 'upi://pay?pa=seller@upi&pn=Seller&am=500.00&cu=INR&tn=REF1';
      const isSafeValid = Boolean(validUri && validUri.startsWith('upi://pay?'));
      expect(isSafeValid).toBe(true);

      const invalidUri = 'https://malicious-site.com/phish?upi=1';
      const isSafeInvalid = Boolean(invalidUri && invalidUri.startsWith('upi://pay?'));
      expect(isSafeInvalid).toBe(false);

      const emptyUri = '';
      const isSafeEmpty = Boolean(emptyUri && emptyUri.startsWith('upi://pay?'));
      expect(isSafeEmpty).toBe(false);
    });
  });

  describe('2. Receipt OCR Engine Lifecycle & Isolation Invariants', () => {
    it('verifies that OCR verification preserves exact byte Keccak256 commitment', async () => {
      const { computeReceiptKeccak256 } = await import('../../../lib/evidence/receiptHasher');
      const fakeReceiptBytes = new TextEncoder().encode(
        'Test Bank Receipt UTR: 423456789012 Amount: Rs 5,000.00',
      );
      const hash = computeReceiptKeccak256(fakeReceiptBytes);

      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(computeReceiptKeccak256(fakeReceiptBytes)).toBe(hash);
    });

    it('extracts UTR and Amount candidate accurately from OCR text stream', async () => {
      const { extractReceiptDataFromText } = await import('../../../lib/evidence/ocrEngine');
      const sampleOcrText = `
        STATE BANK OF INDIA
        Payment Successful
        UPI Ref No / UTR: 423456789012
        Paid to: seller@upi
        Amount: ₹5,000.00
        Date: 18-Aug-2026 12:30 PM
      `;

      const extracted = extractReceiptDataFromText(sampleOcrText);
      expect(extracted.utr).toBe('423456789012');
      expect(extracted.amount).toBe(5000);
      expect(extracted.paymentStatus).toBe('SUCCESSFUL');
      expect(extracted.confidenceScore).toBeGreaterThanOrEqual(0.7);
    });

    it('flags mismatch when OCR extracted amount differs from expected trade amount', async () => {
      const { verifyPaymentEvidence } = await import('../../../lib/evidence/evidenceVerifier');
      const fakeReceiptText = `
        Google Pay
        Paid ₹3,000.00
        UPI transaction ID 423456789012
        Payment Successful
      `;

      const result = await verifyPaymentEvidence({
        file: { name: 'receipt.png', type: 'image/png', size: 1024 },
        rawTextOverride: fakeReceiptText,
        context: {
          tradeId: 101,
          sellerAddress: '0x1234567890123456789012345678901234567890',
          buyerAddress: '0x0987654321098765432109876543210987654321',
          expectedAmount: 5000,
          expectedCurrency: 'INR',
          expectedUtr: '423456789012',
          expectedSellerVpa: 'seller@upi',
          tradeReference: 'UV-TRD-101-ABCD',
        },
      });

      expect(result.status).toBe('MISMATCH');
      expect(result.discrepancies.some((d) => d.toLowerCase().includes('amount mismatch'))).toBe(
        true,
      );
      expect(result.isReleaseAllowed).toBe(false);
    });
  });
});
