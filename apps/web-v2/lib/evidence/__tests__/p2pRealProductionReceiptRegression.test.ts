import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { performRealReceiptOCR, extractReceiptDataFromText } from '../ocrEngine';
import { verifyPaymentEvidence } from '../evidenceVerifier';
import { uploadReceiptEvidence } from '../receiptHasher';
import { validateReceiptFile } from '../fileValidator';
import { TradeVerificationContext } from '../types';

describe('Real Production Receipt Regression & Security Negative Tests', () => {
  const receipt1Path =
    '/var/lib/unifyvault/p2p-evidence/0xbd23a456c6f9237bd98ad66feae371ed7641f4af4f151a7ea7b6c231dc54c681.jpg';
  const receipt2Path =
    '/var/lib/unifyvault/p2p-evidence/0xe414714a00a6ad63eb4621811a5fdcb5e08c7e9fd0e14d2a6323edb91988dd4e.png';

  // 1. Real Receipt 1 (Navi UPI ₹35)
  it('Phase 7 — Real Receipt 1 (₹35 Navi UPI) OCR extracts UTR, Amount, Status, and Date accurately', async () => {
    expect(fs.existsSync(receipt1Path)).toBe(true);
    const bytes = new Uint8Array(fs.readFileSync(receipt1Path));

    const ocrResult = await performRealReceiptOCR(bytes, 'image/jpeg', 'receipt1.jpg');
    expect(ocrResult.text).toContain('004122963230');
    expect(ocrResult.text.toLowerCase()).toContain('successful');

    const data = extractReceiptDataFromText(ocrResult.text);
    expect(data.utr).toBe('004122963230');
    expect(typeof data.utr).toBe('string');
    expect(data.utr?.startsWith('00')).toBe(true);
    expect(data.amount).toBe(35);
    expect(data.paymentStatus).toBe('SUCCESSFUL');
    expect(data.transactionDate).toBe('15 Aug 2026');

    const context: TradeVerificationContext = {
      tradeId: 1001,
      expectedAmount: 35,
      expectedCurrency: 'INR',
      expectedUtr: '004122963230',
      expectedPayeeVpa: 'Vyapar.175693334039@hdfcbank',
    };

    const verification = await verifyPaymentEvidence({
      file: {
        name: 'receipt1.jpg',
        type: 'image/jpeg',
        size: bytes.length,
        bytes,
      },
      context,
    });

    expect(verification.status).toBe('OCR_SUCCESS');
    expect(verification.ocrState).toBe('OCR_SUCCESS');
    expect(verification.isClaimAllowed).toBe(true);
    expect(verification.isReleaseAllowed).toBe(true);
    expect(verification.extractedData.utr).toBe('004122963230');
    expect(verification.extractedData.amount).toBe(35);
  }, 30000);

  // 2. Real Receipt 2 (Navi UPI ₹10)
  it('Phase 7 — Real Receipt 2 (₹10 Navi UPI) OCR extracts UTR, Amount, Status, and Date accurately', async () => {
    expect(fs.existsSync(receipt2Path)).toBe(true);
    const bytes = new Uint8Array(fs.readFileSync(receipt2Path));

    const ocrResult = await performRealReceiptOCR(bytes, 'image/png', 'receipt2.png');
    expect(ocrResult.text).toContain('004139506652');
    expect(ocrResult.text.toLowerCase()).toContain('successful');

    const data = extractReceiptDataFromText(ocrResult.text);
    expect(data.utr).toBe('004139506652');
    expect(typeof data.utr).toBe('string');
    expect(data.utr?.startsWith('00')).toBe(true);
    expect(data.amount).toBe(10);
    expect(data.paymentStatus).toBe('SUCCESSFUL');
    expect(data.transactionDate).toBe('16 Aug 2026');

    const context: TradeVerificationContext = {
      tradeId: 1002,
      expectedAmount: 10,
      expectedCurrency: 'INR',
      expectedUtr: '004139506652',
      expectedPayeeVpa: '6378191156@upi',
    };

    const verification = await verifyPaymentEvidence({
      file: {
        name: 'receipt2.png',
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
    expect(verification.extractedData.utr).toBe('004139506652');
    expect(verification.extractedData.amount).toBe(10);
  }, 30000);

  // 3. Real Receipt 3 (Navi UPI ₹90)
  it('Phase 7 — Real Receipt 3 (₹90 Navi UPI) OCR extracts UTR, Amount 90, Status, and Date accurately', async () => {
    const receipt3Path =
      '/var/lib/unifyvault/p2p-evidence/0x8d078e2eb67650bbfacd1290f82d8974c9933a476501ffa51cdf43d1cc8461af.png';
    expect(fs.existsSync(receipt3Path)).toBe(true);
    const bytes = new Uint8Array(fs.readFileSync(receipt3Path));

    const ocrResult = await performRealReceiptOCR(bytes, 'image/png', 'receipt3.png');
    expect(ocrResult.text).toContain('659459986513');
    expect(ocrResult.text.toLowerCase()).toContain('successful');

    const data = extractReceiptDataFromText(ocrResult.text);
    expect(data.utr).toBe('659459986513');
    expect(typeof data.utr).toBe('string');
    expect(data.amount).toBe(90);
    expect(data.paymentStatus).toBe('SUCCESSFUL');
    expect(data.transactionDate).toBe('16 Aug 2026');

    const context: TradeVerificationContext = {
      tradeId: 1003,
      expectedAmount: 90,
      expectedCurrency: 'INR',
      expectedUtr: '659459986513',
      expectedPayeeVpa: '6378191156@upi',
    };

    const verification = await verifyPaymentEvidence({
      file: {
        name: 'receipt3.png',
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
    expect(verification.extractedData.utr).toBe('659459986513');
    expect(verification.extractedData.amount).toBe(90);
  }, 30000);

  // 4. Security Negative Tests (1 through 11)
  describe('Phase 9 — Security Negative Tests Suite', () => {
    const bytes1 = fs.existsSync(receipt1Path)
      ? new Uint8Array(fs.readFileSync(receipt1Path))
      : new Uint8Array(100);

    // Negative 1: Wrong UTR
    it('1. Wrong UTR: Mismatched UTR blocks claim submission', async () => {
      const result = await verifyPaymentEvidence({
        file: { name: 'receipt.jpg', type: 'image/jpeg', size: bytes1.length, bytes: bytes1 },
        rawTextOverride:
          'Payment successful to Vyapar.175693334039@hdfcbank 35 Paid via Navi UPI UPI txn ID : 999999999999',
        context: {
          tradeId: 1,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230', // user entered UTR != receipt UTR
        },
      });

      expect(result.ocrState).toBe('OCR_MISMATCH');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.discrepancies.some((d) => d.includes('UTR mismatch'))).toBe(true);
    });

    // Negative 2: Wrong Amount
    it('2. Wrong Amount: Mismatched INR fiat amount blocks claim submission', async () => {
      const result = await verifyPaymentEvidence({
        file: { name: 'receipt.jpg', type: 'image/jpeg', size: bytes1.length, bytes: bytes1 },
        rawTextOverride:
          'Payment successful to Vyapar.175693334039@hdfcbank 35 Paid via Navi UPI UPI txn ID : 004122963230',
        context: {
          tradeId: 1,
          expectedAmount: 100, // Trade expects ₹100, receipt is ₹35
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
        },
      });

      expect(result.ocrState).toBe('OCR_MISMATCH');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.discrepancies.some((d) => d.includes('Amount mismatch'))).toBe(true);
    });

    // Negative 3: Failed payment receipt
    it('3. Failed payment receipt: Transaction Failed / Declined blocks claim submission', async () => {
      const result = await verifyPaymentEvidence({
        file: { name: 'receipt.jpg', type: 'image/jpeg', size: bytes1.length, bytes: bytes1 },
        rawTextOverride:
          'Payment Failed: Transaction Declined by Bank. UPI txn ID : 004122963230 Amount: ₹35',
        context: {
          tradeId: 1,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
        },
      });

      expect(result.ocrState).toBe('OCR_FAILED');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.discrepancies.some((d) => d.includes('failed'))).toBe(true);
    });

    // Negative 4: Pending payment receipt
    it('4. Pending payment receipt: Processing / Awaiting confirmation halts auto approval', async () => {
      const data = extractReceiptDataFromText(
        'Transaction Pending. Processing payment of ₹35. UTR: 004122963230',
      );
      expect(data.paymentStatus).toBe('PENDING');
    });

    // Negative 5: Receipt with no transaction reference
    it('5. Receipt with no transaction reference: Blocks automatic verification', async () => {
      const result = await verifyPaymentEvidence({
        file: { name: 'receipt.jpg', type: 'image/jpeg', size: bytes1.length, bytes: bytes1 },
        rawTextOverride: 'Payment successful to merchant for amount ₹35. No ref available.',
        context: {
          tradeId: 1,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
        },
      });

      expect(result.ocrState).toBe('OCR_PARTIAL');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.requiresManualReview).toBe(true);
    });

    // Negative 6: Corrupted image
    it('6. Corrupted image: Rejects corrupted header signature', () => {
      const corruptedBytes = new Uint8Array([0x00, 0x11, 0x22, 0x33, ...new Array(200).fill(0)]);
      const validation = validateReceiptFile({
        name: 'test.png',
        type: 'image/png',
        size: corruptedBytes.length,
        bytes: corruptedBytes,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errorMessage).toContain('Corrupted or spoofed file header');
    });

    // Negative 7: HTML response from OCR endpoint
    it('7. HTML response from OCR endpoint: Protected against Unexpected token < errors', async () => {
      // Mock fetch returning HTML 500
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(
          '<!DOCTYPE html><html><head><title>500 Internal Server Error</title></head><body>Error</body></html>',
          {
            status: 500,
            headers: { 'Content-Type': 'text/html' },
          },
        );

      try {
        const dummyFile = new File([new Uint8Array(200)], 'test.png', { type: 'image/png' });
        await expect(uploadReceiptEvidence(dummyFile)).rejects.toThrow(
          /Receipt OCR service is temporarily unavailable/i,
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    // Negative 8: OCR timeout / Network failure
    it('8. OCR timeout / Network failure: Returns clean user-facing error message', async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => {
        throw new TypeError('Network request failed / timeout');
      };

      try {
        const dummyFile = new File([new Uint8Array(200)], 'test.png', { type: 'image/png' });
        await expect(uploadReceiptEvidence(dummyFile)).rejects.toThrow(
          /Receipt upload failed due to network connectivity issues/i,
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    // Negative 9: OCR HTTP 500 with JSON
    it('9. OCR HTTP 500: Handles 500 JSON error gracefully without exposing stack traces', async () => {
      const originalFetch = global.fetch;
      global.fetch = async () =>
        new Response(JSON.stringify({ success: false, error: 'OCR engine busy. Please retry.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });

      try {
        const dummyFile = new File([new Uint8Array(200)], 'test.png', { type: 'image/png' });
        await expect(uploadReceiptEvidence(dummyFile)).rejects.toThrow(
          /OCR engine busy\. Please retry\./i,
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    // Negative 10: Duplicate UTR
    it('10. Duplicate UTR: Blocks reuse of previously submitted UTR reference', async () => {
      const result = await verifyPaymentEvidence({
        file: { name: 'receipt.jpg', type: 'image/jpeg', size: bytes1.length, bytes: bytes1 },
        rawTextOverride:
          'Payment successful to Vyapar.175693334039@hdfcbank 35 Paid via Navi UPI UPI txn ID : 004122963230',
        context: {
          tradeId: 2,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
          knownUsedUtrs: ['004122963230'], // Already used in another trade
        },
      });

      expect(result.status).toBe('DUPLICATE_REFERENCE');
      expect(result.ocrState).toBe('OCR_FAILED');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.discrepancies.some((d) => d.includes('already been registered'))).toBe(true);
    });

    // Negative 11: Payee VPA mismatch
    it('11. Payee VPA mismatch: Mismatch between seller expected UPI and receipt payee flags discrepancy', async () => {
      const result = await verifyPaymentEvidence({
        file: { name: 'receipt.jpg', type: 'image/jpeg', size: bytes1.length, bytes: bytes1 },
        rawTextOverride:
          'Payment successful to wrongseller@okaxis 35 Paid via Navi UPI UPI txn ID : 004122963230',
        context: {
          tradeId: 1,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
          expectedPayeeVpa: 'correctseller@hdfcbank',
        },
      });

      expect(result.ocrState).toBe('OCR_MISMATCH');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.discrepancies.some((d) => d.includes('Payee VPA mismatch'))).toBe(true);
    });
  });
});
