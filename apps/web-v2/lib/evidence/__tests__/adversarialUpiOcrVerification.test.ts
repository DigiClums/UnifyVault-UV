import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  extractReceiptDataFromText,
  normalizeAmountString,
  performRealReceiptOCR,
} from '../ocrEngine';
import { verifyPaymentEvidence } from '../evidenceVerifier';
import { TradeVerificationContext } from '../types';

describe('Comprehensive Adversarial UPI Receipt OCR Verification Suite', () => {
  const validPngBytes = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...new Array(200).fill(0),
  ]);

  const dummyFile = {
    name: 'receipt.png',
    type: 'image/png',
    size: validPngBytes.length,
    bytes: validPngBytes,
  };

  // =========================================================================
  // CATEGORY 1: UPI APP VARIANTS (App Brand Independence)
  // =========================================================================
  describe('1. UPI App Variants', () => {
    it('1.1 PhonePe Receipt parses correctly without app brand dependency', async () => {
      const text = `
        PhonePe UPI
        Payment Successful
        ₹ 1,500.00
        Paid to: Merchant Enterprises
        Payee UPI ID: merchant@ybl
        From: Alice Kumar
        UPI Ref No: 004123456789
        Date: 16 Aug 2026, 02:15 PM
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.utr).toBe('004123456789');
      expect(data.amount).toBe(1500);
      expect(data.paymentStatus).toBe('SUCCESSFUL');
      expect(data.receiverVpa).toBe('merchant@ybl');

      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 101,
          expectedAmount: 1500,
          expectedCurrency: 'INR',
          expectedUtr: '004123456789',
          expectedPayeeVpa: 'merchant@ybl',
        },
      });
      expect(result.status).toBe('OCR_SUCCESS');
      expect(result.isClaimAllowed).toBe(true);
      expect(result.isReleaseAllowed).toBe(true);
    });

    it('1.2 Google Pay Receipt parses correctly without app brand dependency', async () => {
      const text = `
        Google Pay
        ₹500.00
        Paid to Alice Stores
        UPI Transaction ID: 004987654321
        Completed on 16 Aug 2026
        To: alicestores@oksbi
        From: bob@okaxis
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.utr).toBe('004987654321');
      expect(data.amount).toBe(500);
      expect(data.paymentStatus).toBe('SUCCESSFUL');
      expect(data.receiverVpa).toBe('alicestores@oksbi');

      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 102,
          expectedAmount: 500,
          expectedCurrency: 'INR',
          expectedUtr: '004987654321',
          expectedPayeeVpa: 'alicestores@oksbi',
        },
      });
      expect(result.status).toBe('OCR_SUCCESS');
      expect(result.isClaimAllowed).toBe(true);
    });

    it('1.3 Paytm Receipt parses correctly without app brand dependency', async () => {
      const text = `
        Paytm Payments Bank
        Money Sent to Bob
        Amount: ₹2,000
        UPI Ref: 004567891234
        Status: Successful
        Date: 16 Aug 2026
        Payee VPA: bob@paytm
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.utr).toBe('004567891234');
      expect(data.amount).toBe(2000);
      expect(data.paymentStatus).toBe('SUCCESSFUL');
      expect(data.receiverVpa).toBe('bob@paytm');
    });

    it('1.4 Navi UPI Receipt parses correctly without app brand dependency', async () => {
      const text = `
        Navi UPI
        Payment successful to Vyapar.175693334039@hdfcbank
        35
        Paid via Navi UPI
        UPI txn ID : 004122963230
        15 Aug 2026
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.utr).toBe('004122963230');
      expect(data.amount).toBe(35);
      expect(data.paymentStatus).toBe('SUCCESSFUL');
      expect(data.receiverVpa).toBe('Vyapar.175693334039@hdfcbank');
    });

    it('1.5 BHIM UPI Receipt parses correctly without app brand dependency', async () => {
      const text = `
        BHIM UPI
        Transferred to Charlie
        ₹100.00
        Bank Ref No: 004112233445
        Status: Success
        Date: 16 Aug 2026
        Payee: charlie@upi
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.utr).toBe('004112233445');
      expect(data.amount).toBe(100);
      expect(data.paymentStatus).toBe('SUCCESSFUL');
      expect(data.receiverVpa).toBe('charlie@upi');
    });

    it('1.6 MobiKwik UPI Receipt parses correctly without app brand dependency', async () => {
      const text = `
        MobiKwik UPI
        Payment of ₹750 to Store
        UPI Reference Number: 004998877665
        Payment Status: Successful
        Payee: store@ikwik
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.utr).toBe('004998877665');
      expect(data.amount).toBe(750);
      expect(data.paymentStatus).toBe('SUCCESSFUL');
      expect(data.receiverVpa).toBe('store@ikwik');
    });

    it('1.7 CRED Pay Receipt parses correctly without app brand dependency', async () => {
      const text = `
        CRED Pay
        ₹3,500 Paid via CRED
        Transaction ID: 004332211009
        Status: Approved
        Date: 16 Aug 2026
        Paid to: credmerchant@axisbank
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.utr).toBe('004332211009');
      expect(data.amount).toBe(3500);
      expect(data.paymentStatus).toBe('SUCCESSFUL');
      expect(data.receiverVpa).toBe('credmerchant@axisbank');
    });

    it('1.8 Generic Bank UPI App Receipt parses correctly without app brand dependency', async () => {
      const text = `
        Bank UPI Transfer
        Amount Debited: INR 10,000.00
        RRN: 004778899001
        Status: Completed
        Payee VPA: vendor@icici
        Date: 16-08-2026
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.utr).toBe('004778899001');
      expect(data.amount).toBe(10000);
      expect(data.paymentStatus).toBe('SUCCESSFUL');
      expect(data.receiverVpa).toBe('vendor@icici');
    });
  });

  // =========================================================================
  // CATEGORY 2: UTR / REFERENCE FORMATS & LEADING ZEROS
  // =========================================================================
  describe('2. UTR / Reference Formats and Leading Zeros', () => {
    const testCases = [
      {
        label: 'UPI Transaction ID',
        text: 'UPI Transaction ID: 004291837465',
        expected: '004291837465',
      },
      { label: 'UPI Txn ID', text: 'UPI Txn ID: 004291837465', expected: '004291837465' },
      { label: 'UPI Ref No', text: 'UPI Ref No: 004291837465', expected: '004291837465' },
      {
        label: 'UPI Reference Number',
        text: 'UPI Reference Number: 004291837465',
        expected: '004291837465',
      },
      { label: 'UTR', text: 'UTR: 004291837465', expected: '004291837465' },
      { label: 'UTR No', text: 'UTR No: 004291837465', expected: '004291837465' },
      { label: 'RRN', text: 'RRN: 004291837465', expected: '004291837465' },
      { label: 'Transaction ID', text: 'Transaction ID: 004291837465', expected: '004291837465' },
      {
        label: 'Transaction Reference',
        text: 'Transaction Reference: 004291837465',
        expected: '004291837465',
      },
      { label: 'Bank Ref No', text: 'Bank Ref No: 004291837465', expected: '004291837465' },
      {
        label: 'Bare 12-digit Indian UTR',
        text: 'Paid to merchant. Reference: 004291837465',
        expected: '004291837465',
      },
    ];

    for (const tc of testCases) {
      it(`Extracts UTR correctly from label "${tc.label}" preserving leading zeros`, () => {
        const fullText = `Payment Successful\nAmount: ₹35\n${tc.text}\nPayee: merchant@hdfcbank`;
        const data = extractReceiptDataFromText(fullText);
        expect(data.utr).toBe(tc.expected);
        expect(typeof data.utr).toBe('string');
        expect(data.utr?.startsWith('00')).toBe(true);
        expect(data.utr?.length).toBe(12);
      });
    }

    it('Rejects ordinary dictionary words as UTR', () => {
      const text = 'Payment successful. Receipt reference available on portal.';
      const data = extractReceiptDataFromText(text);
      expect(data.utr).toBeUndefined();
    });
  });

  // =========================================================================
  // CATEGORY 3: AMOUNT ADVERSARIAL CASES & PROMO FILTERING
  // =========================================================================
  describe('3. Amount Adversarial Cases and Promotional Filtering', () => {
    const amountCases = [
      { raw: '₹5', text: 'Amount: ₹5', expected: 5 },
      { raw: '₹35', text: 'Paid ₹35', expected: 35 },
      { raw: '₹100', text: 'Payment of ₹100', expected: 100 },
      { raw: '₹1,000', text: 'Amount: ₹1,000', expected: 1000 },
      { raw: '₹10,000', text: 'Transferred Amount: ₹10,000', expected: 10000 },
      { raw: '₹1,00,000', text: 'Total Paid: ₹1,00,000', expected: 100000 },
      { raw: '₹1,234.50', text: 'Debited: ₹1,234.50', expected: 1234.5 },
      { raw: '₹35 Paid via', text: '₹35 Paid via PhonePe', expected: 35 },
      { raw: 'INR 35', text: 'Total: INR 35', expected: 35 },
      { raw: 'Rs. 35', text: 'Amount Paid: Rs. 35', expected: 35 },
    ];

    for (const ac of amountCases) {
      it(`Parses amount format "${ac.raw}" accurately`, () => {
        const fullText = `Payment successful\n${ac.text}\nUTR: 004122963230`;
        const data = extractReceiptDataFromText(fullText);
        expect(data.amount).toBe(ac.expected);
      });
    }

    it('Does NOT select promotional cashback/reward amounts over actual paid amount', () => {
      const text = `
        Payment successful
        ₹35
        Paid via PhonePe

        Get up to ₹1,000 cashback on your next bill!
        Cashback ₹500 credited to wallet
        Rewards ₹1,000 vouchers available

        UPI Transaction ID: 004291837465
        Payee: unifyseller.uv@ybl
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.amount).toBe(35);
      expect(data.amount).not.toBe(1000);
      expect(data.amount).not.toBe(500);
    });
  });

  // =========================================================================
  // CATEGORY 4: PAYMENT STATUS FORMATS & NEGATIVE CODES
  // =========================================================================
  describe('4. Payment Status Detection', () => {
    const positiveStatuses = [
      'Payment successful',
      'Successful',
      'Success',
      'Completed',
      'Paid',
      'Approved',
      'Transferred',
    ];

    for (const status of positiveStatuses) {
      it(`Identifies positive status "${status}" as SUCCESSFUL`, () => {
        const text = `Transaction Status: ${status}\nAmount: ₹35\nUTR: 004122963230`;
        const data = extractReceiptDataFromText(text);
        expect(data.paymentStatus).toBe('SUCCESSFUL');
      });
    }

    const negativeStatuses = [
      { text: 'Payment Failed: Bank server down', expected: 'FAILED' },
      { text: 'Transaction Declined by beneficiary bank', expected: 'FAILED' },
      { text: 'Transfer Rejected due to limit', expected: 'FAILED' },
      { text: 'Order Cancelled by user', expected: 'CANCELLED' },
      { text: 'Transaction Pending: Awaiting bank response', expected: 'PENDING' },
      { text: 'Payment Processing in background', expected: 'PENDING' },
      { text: 'Awaiting Confirmation from merchant bank', expected: 'PENDING' },
    ];

    for (const ns of negativeStatuses) {
      it(`Identifies negative status "${ns.text}" as ${ns.expected} and blocks release`, async () => {
        const fullText = `Status: ${ns.text}\nAmount: ₹35\nUTR: 004122963230\nPayee: seller@hdfcbank`;
        const data = extractReceiptDataFromText(fullText);
        expect(data.paymentStatus).toBe(ns.expected);

        const result = await verifyPaymentEvidence({
          file: dummyFile,
          rawTextOverride: fullText,
          context: {
            tradeId: 104,
            expectedAmount: 35,
            expectedCurrency: 'INR',
            expectedUtr: '004122963230',
            expectedPayeeVpa: 'seller@hdfcbank',
          },
        });

        expect(result.isClaimAllowed).toBe(false);
        expect(result.isReleaseAllowed).toBe(false);
      });
    }
  });

  // =========================================================================
  // CATEGORY 5: MULTIPLE VPAs & PAYEE RESOLUTION
  // =========================================================================
  describe('5. Multiple VPAs and Payee Cross-Examination', () => {
    it('5.1 Identifies single receiver VPA correctly', () => {
      const text = 'Payment successful to seller.crypto@hdfcbank Amount ₹35 UTR: 004122963230';
      const data = extractReceiptDataFromText(text);
      expect(data.receiverVpa).toBe('seller.crypto@hdfcbank');
    });

    it('5.2 Disambiguates sender VPA and receiver VPA when both exist', () => {
      const text = `
        Payment Successful
        From: buyer.alice@oksbi
        To: seller.bob@hdfcbank
        Amount: ₹35
        UPI Ref No: 004122963230
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.senderVpa).toBe('buyer.alice@oksbi');
      expect(data.receiverVpa).toBe('seller.bob@hdfcbank');
    });

    it('5.3 Verifies expectedPayeeVpa matches seller VPA and not sender VPA', async () => {
      const text = `
        Payment Successful
        From: buyer.alice@oksbi
        To: seller.bob@hdfcbank
        Amount: ₹35
        UPI Ref No: 004122963230
      `;

      // Correct seller VPA expected -> PASS
      const passResult = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 105,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
          expectedPayeeVpa: 'seller.bob@hdfcbank',
        },
      });
      expect(passResult.status).toBe('OCR_SUCCESS');
      expect(passResult.isClaimAllowed).toBe(true);

      // Wrong expected seller (e.g. sender VPA passed as seller) -> MISMATCH
      const failResult = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 105,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
          expectedPayeeVpa: 'buyer.alice@oksbi', // This is sender, NOT seller!
        },
      });
      expect(failResult.ocrState).toBe('OCR_MISMATCH');
      expect(failResult.isClaimAllowed).toBe(false);
      expect(failResult.discrepancies.some((d) => d.includes('Payee VPA mismatch'))).toBe(true);
    });
  });

  // =========================================================================
  // CATEGORIES 6, 7, 8, 9: MISMATCHES & DUPLICATE UTR ATTACKS
  // =========================================================================
  describe('6-9. Mismatches and Duplicate UTR Protection', () => {
    const validText = `
      Payment successful
      Amount: ₹35
      UTR: 004122963230
      Payee: seller@hdfcbank
    `;

    it('6. Payee Mismatch blocks claim and release', async () => {
      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: validText,
        context: {
          tradeId: 106,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
          expectedPayeeVpa: 'attacker@okaxis', // mismatch
        },
      });
      expect(result.ocrState).toBe('OCR_MISMATCH');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
    });

    it('7. UTR Mismatch blocks claim and release', async () => {
      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: validText,
        context: {
          tradeId: 107,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963231', // mismatch last digit
          expectedPayeeVpa: 'seller@hdfcbank',
        },
      });
      expect(result.ocrState).toBe('OCR_MISMATCH');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
    });

    it('8. Amount Mismatch blocks claim and release', async () => {
      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: validText,
        context: {
          tradeId: 108,
          expectedAmount: 36, // Expected ₹36, receipt has ₹35
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
          expectedPayeeVpa: 'seller@hdfcbank',
        },
      });
      expect(result.ocrState).toBe('OCR_MISMATCH');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
    });

    it('9. Duplicate UTR blocks replay attack and prevents claim', async () => {
      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: validText,
        context: {
          tradeId: 109,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
          expectedPayeeVpa: 'seller@hdfcbank',
          knownUsedUtrs: ['004122963230'], // Already registered in another trade!
        },
      });
      expect(result.status).toBe('DUPLICATE_REFERENCE');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
      expect(result.discrepancies.some((d) => d.includes('already been registered'))).toBe(true);
    });
  });

  // =========================================================================
  // CATEGORY 10: MISSING DATA & CORRUPTED / UNRELATED IMAGES
  // =========================================================================
  describe('10. Missing Data and Safe Failure Modes', () => {
    it('10.1 Missing UTR fails safely to MANUAL_REVIEW', async () => {
      const text = 'Payment successful. Amount: ₹35. Payee: seller@hdfcbank.';
      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 110,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
        },
      });
      expect(result.ocrState).toBe('OCR_PARTIAL');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
      expect(result.requiresManualReview).toBe(true);
    });

    it('10.2 Missing Amount fails safely to MANUAL_REVIEW', async () => {
      const text = 'Payment successful. UTR: 004122963230. Payee: seller@hdfcbank.';
      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 110,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
        },
      });
      expect(result.ocrState).toBe('OCR_PARTIAL');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
      expect(result.requiresManualReview).toBe(true);
    });

    it('10.3 Unrelated screenshot / noise text fails safely to LOW_CONFIDENCE', async () => {
      const text = 'Random cat photo with text: Good Morning have a nice day ahead!';
      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 110,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
        },
      });
      expect(result.status).toBe('LOW_CONFIDENCE');
      expect(result.ocrState).toBe('OCR_PARTIAL');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
      expect(result.requiresManualReview).toBe(true);
    });
  });

  // =========================================================================
  // CATEGORY 11: OCR CONFUSION & MALFORMED TEXT RECOVERY
  // =========================================================================
  describe('11. OCR Confusion and Edge Formatting Recovery', () => {
    it('11.1 Recovers when currency symbol is omitted but amount is labeled', () => {
      const text = 'Payment successful\nAmount: 35.00\nUTR: 004122963230';
      const data = extractReceiptDataFromText(text);
      expect(data.amount).toBe(35);
      expect(data.utr).toBe('004122963230');
    });

    it('11.2 Recovers with extra spaces inside UTR label', () => {
      const text = 'Payment successful\nAmount: ₹35\nUPI   Txn   ID : 004122963230';
      const data = extractReceiptDataFromText(text);
      expect(data.utr).toBe('004122963230');
    });

    it('11.3 Recovers with line break between UTR label and number', () => {
      const text =
        'Payment successful\nAmount: ₹35\nUPI Ref No:\n004122963230\nPayee: seller@hdfcbank';
      const data = extractReceiptDataFromText(text);
      expect(data.utr).toBe('004122963230');
    });

    it('11.4 Rejects letter O substitution (OO4291837465) when numeric UTR is expected', async () => {
      const text = 'Payment successful\nAmount: ₹35\nUPI Txn ID: OO4291837465';
      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 111,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004291837465', // Numbers '00', receipt has 'OO'
        },
      });
      // Exact UTR mismatch blocks automatic release -> FAIL SAFE
      expect(result.ocrState).toBe('OCR_MISMATCH');
      expect(result.isClaimAllowed).toBe(false);
    });
  });

  // =========================================================================
  // CATEGORY 12: CROSS-FIELD COMBINATORIAL ATTACKS
  // =========================================================================
  describe('12. Cross-Field Combinatorial Attacks', () => {
    it('12.1 Correct UTR + Wrong Amount -> BLOCKED', async () => {
      const text = 'Payment successful\nAmount: ₹10\nUTR: 004122963230\nPayee: seller@hdfcbank';
      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 112,
          expectedAmount: 35, // Trade expects 35
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
          expectedPayeeVpa: 'seller@hdfcbank',
        },
      });
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
    });

    it('12.2 Correct Amount + Wrong UTR -> BLOCKED', async () => {
      const text = 'Payment successful\nAmount: ₹35\nUTR: 999999999999\nPayee: seller@hdfcbank';
      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 112,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
          expectedPayeeVpa: 'seller@hdfcbank',
        },
      });
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
    });

    it('12.3 Correct UTR + Failed Status -> BLOCKED', async () => {
      const text = 'Payment Failed\nAmount: ₹35\nUTR: 004122963230\nPayee: seller@hdfcbank';
      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 112,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
          expectedPayeeVpa: 'seller@hdfcbank',
        },
      });
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
    });

    it('12.4 Correct Amount + Pending Status -> BLOCKED', async () => {
      const text =
        'Payment In Progress / Pending\nAmount: ₹35\nUTR: 004122963230\nPayee: seller@hdfcbank';
      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 112,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
          expectedPayeeVpa: 'seller@hdfcbank',
        },
      });
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
    });
  });

  // =========================================================================
  // CATEGORY 13: REWARD / CASHBACK ATTACK SCENARIO
  // =========================================================================
  describe('13. Explicit Reward / Cashback Adversarial Attack', () => {
    it('Extracts exact ₹35 from complex receipt containing multiple reward numbers', () => {
      const ocrOutput = `
        Payment successful
        ₹35
        Paid via PhonePe

        Get up to ₹1,000 cashback
        Reward ₹500

        UPI Transaction ID
        004291837465
      `;
      const data = extractReceiptDataFromText(ocrOutput);
      expect(data.amount).toBe(35);
      expect(data.utr).toBe('004291837465');
      expect(data.paymentStatus).toBe('SUCCESSFUL');
    });
  });

  // =========================================================================
  // CATEGORY 14: APP-BRAND INDEPENDENCE STATIC VERIFICATION
  // =========================================================================
  describe('14. App-Brand Independence Verification', () => {
    it('Ensures ocrEngine and evidenceVerifier do NOT have hardcoded app name requirements', () => {
      const ocrEngineSource = fs.readFileSync(path.join(__dirname, '../ocrEngine.ts'), 'utf-8');
      const evidenceVerifierSource = fs.readFileSync(
        path.join(__dirname, '../evidenceVerifier.ts'),
        'utf-8',
      );

      // Verify no `if (app === ...)` or hardcoded requirement that forces a specific app
      expect(ocrEngineSource).not.toMatch(/if\s*\(\s*app\s*===/i);
      expect(ocrEngineSource).not.toMatch(/require.*(?:Navi|PhonePe|GPay|Paytm)/i);
      expect(evidenceVerifierSource).not.toMatch(/if\s*\(\s*app\s*===/i);
    });
  });

  // =========================================================================
  // CATEGORY 15: REAL RECEIPT FILES IN VPS EVIDENCE STORAGE
  // =========================================================================
  describe('15. Real VPS Production Receipts Verification', () => {
    const evidenceDir = '/var/lib/unifyvault/p2p-evidence';

    it('15.1 Real Navi Receipt 1 (₹35) verifies cleanly', async () => {
      const filePath = path.join(
        evidenceDir,
        '0xbd23a456c6f9237bd98ad66feae371ed7641f4af4f151a7ea7b6c231dc54c681.jpg',
      );
      if (!fs.existsSync(filePath)) return;

      const bytes = new Uint8Array(fs.readFileSync(filePath));
      const ocrResult = await performRealReceiptOCR(bytes, 'image/jpeg', 'receipt1.jpg');
      const data = extractReceiptDataFromText(ocrResult.text);

      expect(data.utr).toBe('004122963230');
      expect(data.amount).toBe(35);
      expect(data.paymentStatus).toBe('SUCCESSFUL');
    }, 30000);

    it('15.2 Real Navi Receipt 2 (₹10) verifies cleanly', async () => {
      const filePath = path.join(
        evidenceDir,
        '0xe414714a00a6ad63eb4621811a5fdcb5e08c7e9fd0e14d2a6323edb91988dd4e.png',
      );
      if (!fs.existsSync(filePath)) return;

      const bytes = new Uint8Array(fs.readFileSync(filePath));
      const ocrResult = await performRealReceiptOCR(bytes, 'image/png', 'receipt2.png');
      const data = extractReceiptDataFromText(ocrResult.text);

      expect(data.utr).toBe('004139506652');
      expect(data.amount).toBe(10);
      expect(data.paymentStatus).toBe('SUCCESSFUL');
    }, 30000);

    it('15.3 Real PhonePe Receipt (₹5) verifies cleanly', async () => {
      const filePath = path.join(
        evidenceDir,
        '0xf720408593ea5200fa0d416e784eda3d4fbf9dfad2d06c13d7ad79f9637d20a6.png',
      );
      if (!fs.existsSync(filePath)) return;

      const bytes = new Uint8Array(fs.readFileSync(filePath));
      const ocrResult = await performRealReceiptOCR(bytes, 'image/png', 'receipt3.png');
      const data = extractReceiptDataFromText(ocrResult.text);

      expect(data.utr).toBe('004291837465');
      expect(data.amount).toBe(5);
      expect(data.paymentStatus).toBe('SUCCESSFUL');
      expect(data.receiverVpa).toMatch(/^unifyseller\.?uv@ybl$/);
    }, 30000);
  });

  // =========================================================================
  // CATEGORY 16: VERIFIED DEFECTS REGRESSION TESTS (FIX 1 & FIX 2)
  // =========================================================================
  describe('16. Verified Defects Regression Suite (FIX 1 & FIX 2)', () => {
    // 1. Pending receipt: matching UTR + matching amount + PENDING => claim false, release false, manual review true
    it('16.1 Pending receipt: matching UTR + matching amount + PENDING -> blocks claim & release, sets manual review', async () => {
      const text = `
        Payment Status: PENDING
        Paid to: seller@hdfcbank
        Amount: ₹500.00
        UPI Ref No: 004123456789
        Date: 16 Aug 2026
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.paymentStatus).toBe('PENDING');
      expect(data.amount).toBe(500);
      expect(data.utr).toBe('004123456789');

      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 201,
          expectedAmount: 500,
          expectedCurrency: 'INR',
          expectedUtr: '004123456789',
          expectedPayeeVpa: 'seller@hdfcbank',
        },
      });

      expect(result.status).toBe('MANUAL_REVIEW');
      expect(result.ocrState).toBe('MANUAL_REVIEW');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.discrepancies.some((d) => d.includes('pending/processing'))).toBe(true);
      expect(result.extractedData.utr).toBe('004123456789');
      expect(result.extractedData.amount).toBe(500);
    });

    // 2. Processing receipt: same security behavior
    it('16.2 Processing receipt: matching UTR + matching amount + PROCESSING -> blocks claim & release, sets manual review', async () => {
      const text = `
        Payment PROCESSING in background
        Paid to: seller@hdfcbank
        Amount: ₹1,000.00
        UPI Transaction ID: 004987654321
        Date: 16 Aug 2026
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.paymentStatus).toBe('PENDING');
      expect(data.amount).toBe(1000);
      expect(data.utr).toBe('004987654321');

      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 202,
          expectedAmount: 1000,
          expectedCurrency: 'INR',
          expectedUtr: '004987654321',
          expectedPayeeVpa: 'seller@hdfcbank',
        },
      });

      expect(result.status).toBe('MANUAL_REVIEW');
      expect(result.ocrState).toBe('MANUAL_REVIEW');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.discrepancies.some((d) => d.includes('pending/processing'))).toBe(true);
    });

    // 3. Awaiting confirmation: same security behavior
    it('16.3 Awaiting confirmation receipt: matching UTR + matching amount + AWAITING -> blocks claim & release, sets manual review', async () => {
      const text = `
        Awaiting Confirmation from Bank
        Paid to: seller@hdfcbank
        Amount: ₹2,500.00
        UPI Ref No: 004556677889
        Date: 16 Aug 2026
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.paymentStatus).toBe('PENDING');
      expect(data.amount).toBe(2500);
      expect(data.utr).toBe('004556677889');

      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 203,
          expectedAmount: 2500,
          expectedCurrency: 'INR',
          expectedUtr: '004556677889',
          expectedPayeeVpa: 'seller@hdfcbank',
        },
      });

      expect(result.status).toBe('MANUAL_REVIEW');
      expect(result.ocrState).toBe('MANUAL_REVIEW');
      expect(result.isClaimAllowed).toBe(false);
      expect(result.isReleaseAllowed).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.discrepancies.some((d) => d.includes('pending/processing'))).toBe(true);
    });

    // 4. Google Pay-style: To: seller@hdfcbank, From: buyer@oksbi => receiverVpa = seller@hdfcbank, senderVpa = buyer@oksbi
    it('16.4 Google Pay-style receipt (To before From) resolves receiverVpa and senderVpa accurately', async () => {
      const text = `
        Google Pay
        Payment of ₹500.00
        To: seller@hdfcbank
        From: buyer@oksbi
        UPI Transaction ID: 004987654321
        Completed on 16 Aug 2026
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.receiverVpa).toBe('seller@hdfcbank');
      expect(data.senderVpa).toBe('buyer@oksbi');
      expect(data.amount).toBe(500);
      expect(data.utr).toBe('004987654321');
      expect(data.paymentStatus).toBe('SUCCESSFUL');

      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 204,
          expectedAmount: 500,
          expectedCurrency: 'INR',
          expectedUtr: '004987654321',
          expectedPayeeVpa: 'seller@hdfcbank',
        },
      });

      expect(result.status).toBe('OCR_SUCCESS');
      expect(result.ocrState).toBe('OCR_SUCCESS');
      expect(result.isClaimAllowed).toBe(true);
      expect(result.isReleaseAllowed).toBe(true);
    });

    // 5. Existing From -> To receipt must continue passing
    it('16.5 Standard From -> To receipt (From before To) continues passing', async () => {
      const text = `
        Payment Successful
        From: buyer.alice@oksbi
        To: seller.bob@hdfcbank
        Amount: ₹750.00
        UPI Ref No: 004123456789
        Date: 16 Aug 2026
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.senderVpa).toBe('buyer.alice@oksbi');
      expect(data.receiverVpa).toBe('seller.bob@hdfcbank');
      expect(data.amount).toBe(750);
      expect(data.utr).toBe('004123456789');
      expect(data.paymentStatus).toBe('SUCCESSFUL');

      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 205,
          expectedAmount: 750,
          expectedCurrency: 'INR',
          expectedUtr: '004123456789',
          expectedPayeeVpa: 'seller.bob@hdfcbank',
        },
      });

      expect(result.status).toBe('OCR_SUCCESS');
      expect(result.ocrState).toBe('OCR_SUCCESS');
      expect(result.isClaimAllowed).toBe(true);
      expect(result.isReleaseAllowed).toBe(true);
    });

    // 6. Existing single-VPA receipt must continue passing
    it('16.6 Single-VPA receipt (only receiver VPA) continues passing', async () => {
      const text = `
        Payment successful to Vyapar.175693334039@hdfcbank
        Amount: ₹35.00
        Paid via Navi UPI
        UPI txn ID : 004122963230
        Date: 15 Aug 2026
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.receiverVpa).toBe('Vyapar.175693334039@hdfcbank');
      expect(data.senderVpa).toBeUndefined();
      expect(data.amount).toBe(35);
      expect(data.utr).toBe('004122963230');
      expect(data.paymentStatus).toBe('SUCCESSFUL');

      const result = await verifyPaymentEvidence({
        file: dummyFile,
        rawTextOverride: text,
        context: {
          tradeId: 206,
          expectedAmount: 35,
          expectedCurrency: 'INR',
          expectedUtr: '004122963230',
          expectedPayeeVpa: 'Vyapar.175693334039@hdfcbank',
        },
      });

      expect(result.status).toBe('OCR_SUCCESS');
      expect(result.ocrState).toBe('OCR_SUCCESS');
      expect(result.isClaimAllowed).toBe(true);
      expect(result.isReleaseAllowed).toBe(true);
    });

    // 7. Existing real Navi and PhonePe regression tests must continue passing (unlabeled fallback test)
    it('16.7 Two unlabeled VPAs fallback (generic order: first sender, second receiver)', () => {
      const text = `
        Direct UPI Transfer
        Amount: ₹100.00
        UTR: 004112233445
        Status: Success
        buyer@okhdfcbank
        seller@oksbi
      `;
      const data = extractReceiptDataFromText(text);
      expect(data.senderVpa).toBe('buyer@okhdfcbank');
      expect(data.receiverVpa).toBe('seller@oksbi');
    });
  });
});
