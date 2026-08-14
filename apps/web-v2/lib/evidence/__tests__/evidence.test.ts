import { describe, it, expect } from 'vitest';
import { validateReceiptFile } from '../fileValidator';
import { computeReceiptKeccak256, computeReceiptHashes } from '../receiptHasher';
import { extractReceiptDataFromText, normalizeAmountString } from '../ocrEngine';
import { verifyPaymentEvidence } from '../evidenceVerifier';
import { TradeVerificationContext } from '../types';

describe('Phase 2 — Real UTR & Receipt OCR Verification Pipeline Tests (A through T)', () => {
  const baseContext: TradeVerificationContext = {
    tradeId: 101,
    expectedAmount: 500,
    expectedCurrency: 'INR',
    expectedUtr: '423456789012',
    knownUsedUtrs: ['999888777666'],
  };

  const validPngBytes = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...new Array(200).fill(1),
  ]);

  const validFile = {
    name: 'receipt.png',
    type: 'image/png',
    size: validPngBytes.length,
    bytes: validPngBytes,
  };

  // A. Valid UTR extraction
  it('A. Valid UTR extraction: Correctly extracts 12-digit Indian UPI UTR and alphanumeric reference', () => {
    const text = 'State Bank of India. UPI Ref No: 423456789012. Paid ₹500.00. Status: Success';
    const data = extractReceiptDataFromText(text);

    expect(data.utr).toBe('423456789012');
    expect(data.amount).toBe(500);
    expect(data.paymentStatus).toBe('SUCCESSFUL');
  });

  // B. Invalid UTR
  it('B. Invalid UTR: Rejects short or invalid reference strings', () => {
    const text = 'Paid ₹500.00. Ref: 123';
    const data = extractReceiptDataFromText(text);

    expect(data.utr).toBeUndefined();
  });

  // C. UTR mismatch
  it('C. UTR mismatch: Expected 423456789012 vs receipt 987654321098 blocks claim with OCR_MISMATCH', async () => {
    const text = 'Transaction Successful. Amount: ₹500.00. UTR: 987654321098';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: text,
      context: baseContext, // expectedUtr = 423456789012
    });

    expect(result.ocrState).toBe('OCR_MISMATCH');
    expect(result.isClaimAllowed).toBe(false);
    expect(result.isReleaseAllowed).toBe(false);
    expect(result.discrepancies.some((d) => d.includes('UTR mismatch'))).toBe(true);
  });

  // D. Missing UTR
  it('D. Missing UTR: Receipt with missing UTR cannot be auto-verified and blocks claim', async () => {
    const text = 'Payment of ₹500.00 completed successfully on Google Pay.';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: text,
      context: baseContext,
    });

    expect(result.ocrState).toBe('OCR_PARTIAL');
    expect(result.isClaimAllowed).toBe(false);
    expect(result.requiresManualReview).toBe(true);
    expect(
      result.discrepancies.some((d) =>
        d.includes('could not detect a valid transaction reference'),
      ),
    ).toBe(true);
  });

  // E. Valid INR amount
  it('E. Valid INR amount: Matches exact expected trade amount of ₹500', async () => {
    const text = 'Paid to merchant: ₹500.00. UTR: 423456789012. Status: Completed';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: text,
      context: baseContext,
    });

    expect(result.ocrState).toBe('OCR_SUCCESS');
    expect(result.extractedData.amount).toBe(500);
    expect(result.isClaimAllowed).toBe(true);
  });

  // F. Wrong INR amount
  it('F. Wrong INR amount: Expected ₹500 vs Receipt ₹490 or ₹550 blocks claim with OCR_MISMATCH', async () => {
    const textWrong = 'Paid: ₹490.00. UTR: 423456789012. Payment Successful';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: textWrong,
      context: baseContext,
    });

    expect(result.ocrState).toBe('OCR_MISMATCH');
    expect(result.isClaimAllowed).toBe(false);
    expect(result.discrepancies.some((d) => d.includes('Amount mismatch'))).toBe(true);
  });

  // G. Amount formatting normalization
  it('G. Amount formatting normalization: ₹500, 500.00, INR 500.00 all normalize accurately to numeric 500', () => {
    expect(normalizeAmountString('₹500')).toBe(500);
    expect(normalizeAmountString('₹ 500.00')).toBe(500);
    expect(normalizeAmountString('500.00')).toBe(500);
    expect(normalizeAmountString('INR 500.00')).toBe(500);
    expect(normalizeAmountString('Rs. 500')).toBe(500);
    expect(normalizeAmountString('Rs 500.00')).toBe(500);
    expect(normalizeAmountString('10,000.50')).toBe(10000.5);
  });

  // H. Successful payment status
  it('H. Successful payment status: Status SUCCESSFUL / PAID / COMPLETED accepts positive signal', () => {
    const text1 = 'Payment Successful. UTR: 423456789012. Amount: ₹500';
    const data1 = extractReceiptDataFromText(text1);
    expect(data1.paymentStatus).toBe('SUCCESSFUL');

    const text2 = 'Paid ₹500.00. UTR: 423456789012. Completed';
    const data2 = extractReceiptDataFromText(text2);
    expect(data2.paymentStatus).toBe('SUCCESSFUL');
  });

  // I. Failed payment status
  it('I. Failed payment status: FAILED / DECLINED blocks claim with OCR_FAILED', async () => {
    const textFailed =
      'Payment Failed. Transaction Declined by Bank. UTR: 423456789012. Amount: ₹500';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: textFailed,
      context: baseContext,
    });

    expect(result.ocrState).toBe('OCR_FAILED');
    expect(result.isClaimAllowed).toBe(false);
    expect(result.discrepancies.some((d) => d.includes('failed'))).toBe(true);
  });

  // J. Pending payment
  it('J. Pending payment: PENDING / PROCESSING halts automatic approval for manual review', async () => {
    const textPending =
      'Transaction in Progress. Awaiting Confirmation. UTR: 423456789012. Amount: ₹500';
    const data = extractReceiptDataFromText(textPending);

    expect(data.paymentStatus).toBe('PENDING');
  });

  // K. OCR failure / unreadable text
  it('K. OCR failure: Blurred noise text results in OCR_PARTIAL / LOW_CONFIDENCE and blocks claim', async () => {
    const noiseText = 'xkjdfh kjsdfh noise %% 12';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: noiseText,
      context: baseContext,
    });

    expect(result.ocrState).toBe('OCR_PARTIAL');
    expect(result.isClaimAllowed).toBe(false);
    expect(result.requiresManualReview).toBe(true);
    expect(result.statusMessage).toContain('could not be automatically verified');
  });

  // L. Unsupported file
  it('L. Unsupported file: Rejects .exe, .sh, or unsupported formats', () => {
    const invalidFile = {
      name: 'malware.exe',
      type: 'application/x-msdownload',
      size: 1024,
    };

    const validation = validateReceiptFile(invalidFile);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('Unsupported file extension');
  });

  // M. Corrupted image
  it('M. Corrupted image: Rejects file with spoofed PNG extension but invalid magic bytes', () => {
    const spoofedBytes = new Uint8Array([0x00, 0x00, 0x00, 0x00, ...new Array(200).fill(0)]);
    const corruptedImage = {
      name: 'fake.png',
      type: 'image/png',
      size: spoofedBytes.length,
      bytes: spoofedBytes,
    };

    const validation = validateReceiptFile(corruptedImage);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('Corrupted or spoofed file header signature');
  });

  // N. Corrupted PDF
  it('N. Corrupted PDF: Rejects file with spoofed PDF extension but invalid magic bytes', () => {
    const spoofedPdfBytes = new Uint8Array([0x11, 0x22, 0x33, 0x44, ...new Array(200).fill(0)]);
    const corruptedPdf = {
      name: 'corrupted.pdf',
      type: 'application/pdf',
      size: spoofedPdfBytes.length,
      bytes: spoofedPdfBytes,
    };

    const validation = validateReceiptFile(corruptedPdf);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('Corrupted or spoofed file header signature');
  });

  // O. Oversized file
  it('O. Oversized file: Rejects files exceeding 10MB limit', () => {
    const hugeFile = {
      name: 'huge_receipt.png',
      type: 'image/png',
      size: 11 * 1024 * 1024,
    };

    const validation = validateReceiptFile(hugeFile);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('maximum allowed size of 10MB');
  });

  // P. Evidence hash stability
  it('P. Evidence hash stability: Computes exact deterministic Keccak256 hash from original bytes', () => {
    const rawBytes = new TextEncoder().encode('Receipt Content Pay ₹500 UTR 423456789012');
    const hash1 = computeReceiptKeccak256(rawBytes);
    const hash2 = computeReceiptKeccak256(rawBytes);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  // Q. Same receipt -> Same hash
  it('Q. Same receipt -> Same hash: Identical byte buffers yield identical evidenceHash', () => {
    const bytesA = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 10, 20, 30]);
    const bytesB = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 10, 20, 30]);

    expect(computeReceiptKeccak256(bytesA)).toBe(computeReceiptKeccak256(bytesB));
  });

  // R. Modified receipt -> Different hash
  it('R. Modified receipt -> Different hash: Altering a single byte completely changes Keccak256 hash', () => {
    const bytesOriginal = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 10, 20, 30]);
    const bytesModified = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 10, 20, 31]);

    expect(computeReceiptKeccak256(bytesOriginal)).not.toBe(computeReceiptKeccak256(bytesModified));
  });

  // S. Valid receipt -> Claim eligible
  it('S. Valid receipt -> Claim eligible: Perfectly matching UTR and INR amount sets isClaimAllowed to true', async () => {
    const validReceiptText =
      'Payment Successful. Transfer of ₹500.00 to merchant completed. UTR: 423456789012. Date: 14 Aug 2026';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: validReceiptText,
      context: baseContext,
    });

    expect(result.ocrState).toBe('OCR_SUCCESS');
    expect(result.isClaimAllowed).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  // T. Invalid receipt -> Claim blocked
  it('T. Invalid receipt -> Claim blocked: Discrepancies or mismatch sets isClaimAllowed to false', async () => {
    const invalidReceiptText = 'Payment Successful. Paid: ₹100.00. UTR: 999999999999';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: invalidReceiptText,
      context: baseContext,
    });

    expect(result.isClaimAllowed).toBe(false);
    expect(result.ocrState).toBe('OCR_MISMATCH');
  });
});
