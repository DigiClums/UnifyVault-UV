import { describe, it, expect } from 'vitest';
import { validateReceiptFile } from '../fileValidator';
import { computeReceiptHashes } from '../receiptHasher';
import { extractReceiptDataFromText } from '../ocrEngine';
import { verifyPaymentEvidence } from '../evidenceVerifier';
import { TradeVerificationContext } from '../types';

describe('Decentralized Payment Evidence Pipeline (M3)', () => {
  const baseContext: TradeVerificationContext = {
    tradeId: 101,
    expectedAmount: 10000,
    expectedCurrency: 'INR',
    expectedUtr: 'UTR123456789',
    knownUsedUtrs: ['DUP999888777'],
  };

  const validBytes = new Uint8Array([
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
    size: 208,
    bytes: validBytes,
  };

  it('1. Valid receipt: parses amount and UTR correctly', async () => {
    const text = 'Payment Successful. Paid: ₹10,000.00. UTR: UTR123456789 Date: 2026-08-10';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: text,
      context: baseContext,
    });

    expect(result.status).toBe('MATCH');
    expect(result.isReleaseAllowed).toBe(true);
    expect(result.extractedData.amount).toBe(10000);
    expect(result.extractedData.utr).toBe('UTR123456789');
    expect(result.discrepancies).toHaveLength(0);
    expect(result.statusMessage).toContain('Evidence matched');
  });

  it('2. Amount match: exact expected amount match', async () => {
    const text = 'Paid Amount: $500.00. Ref No: REF500';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: text,
      context: {
        tradeId: 102,
        expectedAmount: 500,
        expectedCurrency: 'USD',
        expectedUtr: 'REF500',
      },
    });

    expect(result.status).toBe('MATCH');
    expect(result.extractedData.amount).toBe(500);
  });

  it('3. Amount mismatch: Trade ₹10,000 vs Receipt ₹100 -> MISMATCH', async () => {
    const text = 'Payment Successful. Paid: ₹100.00. UTR: UTR123456789';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: text,
      context: baseContext, // expectedAmount = 10000
    });

    expect(result.status).toBe('MISMATCH');
    expect(result.isReleaseAllowed).toBe(false);
    expect(result.discrepancies[0]).toContain('Amount mismatch');
    expect(result.discrepancies[0]).toContain('100');
    expect(result.discrepancies[0]).toContain('10000');
  });

  it('4. UTR match: exact reference match', async () => {
    const text = 'Amount: ₹10,000. UTR: UTR123456789';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: text,
      context: baseContext,
    });

    expect(result.status).toBe('MATCH');
    expect(result.extractedData.utr).toBe('UTR123456789');
  });

  it('5. UTR mismatch: expected UTR123456789 vs receipt UTR999999999 -> MISMATCH', async () => {
    const text = 'Amount: ₹10,000. UTR: UTR999999999';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: text,
      context: baseContext,
    });

    expect(result.status).toBe('MISMATCH');
    expect(result.isReleaseAllowed).toBe(false);
    expect(result.discrepancies[0]).toContain('UTR mismatch');
  });

  it('6. Duplicate UTR: UTR previously used -> DUPLICATE_REFERENCE', async () => {
    const text = 'Amount: ₹10,000. UTR: DUP999888777';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: text,
      context: baseContext, // knownUsedUtrs includes DUP999888777
    });

    expect(result.status).toBe('DUPLICATE_REFERENCE');
    expect(result.isReleaseAllowed).toBe(false);
    expect(result.discrepancies[0]).toContain('already been registered');
    expect(result.statusMessage).toContain('DUPLICATE REFERENCE DETECTED');
  });

  it('7. Unreadable receipt: empty or blurred text -> LOW_CONFIDENCE', async () => {
    const text = 'blur blur random noise';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: text,
      context: baseContext,
    });

    expect(result.status).toBe('LOW_CONFIDENCE');
    expect(result.isReleaseAllowed).toBe(false);
    expect(result.requiresManualReview).toBe(true);
  });

  it('8. Unsupported file extension or MIME type -> INVALID', async () => {
    const invalidFile = {
      name: 'script.exe',
      type: 'application/x-msdownload',
      size: 500,
      bytes: new Uint8Array(500).fill(1),
    };

    const validation = validateReceiptFile(invalidFile);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('Unsupported file extension');
  });

  it('9. Corrupted file: file size too small -> INVALID', async () => {
    const corruptedFile = {
      name: 'receipt.pdf',
      type: 'application/pdf',
      size: 10, // < 100 bytes
    };

    const validation = validateReceiptFile(corruptedFile);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('Corrupted or empty file');
  });

  it('10. Low OCR confidence score', () => {
    const data = extractReceiptDataFromText('Some random note');
    expect(data.confidenceScore).toBeLessThan(0.4);
    expect(data.amount).toBeUndefined();
    expect(data.utr).toBeUndefined();
  });

  it('11. Changed receipt hash: altering file content alters Keccak256 hash', async () => {
    const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
    const bytes2 = new Uint8Array([1, 2, 3, 4, 6]);

    const hash1 = await computeReceiptHashes(bytes1);
    const hash2 = await computeReceiptHashes(bytes2);

    expect(hash1.fileHash).not.toEqual(hash2.fileHash);
  });

  it('12. Evidence replacement attempt: new hash generated on replacement', async () => {
    const originalReceipt = new TextEncoder().encode('Receipt A Content');
    const replacedReceipt = new TextEncoder().encode('Receipt B Content (Replaced)');

    const origHashes = await computeReceiptHashes(originalReceipt);
    const replHashes = await computeReceiptHashes(replacedReceipt);

    expect(origHashes.fileHash).not.toEqual(replHashes.fileHash);
  });

  it('13. Replay attempt: submitting same receipt hash twice', async () => {
    const text = 'Amount: ₹10,000. UTR: DUP999888777';
    const result = await verifyPaymentEvidence({
      file: validFile,
      rawTextOverride: text,
      context: baseContext,
    });

    expect(result.status).toBe('DUPLICATE_REFERENCE');
    expect(result.isReleaseAllowed).toBe(false);
  });
});
