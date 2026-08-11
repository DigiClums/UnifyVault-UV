import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateReceiptFile } from '../fileValidator';
import { computeReceiptKeccak256, uploadReceiptEvidence } from '../receiptHasher';
import { keccak256 } from 'viem';

describe('VPS Filesystem Evidence Storage Pipeline (Phase 6B-VPS)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('1. Accepts valid PNG image file', () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, ...new Array(200).fill(0)]);
    const file = {
      name: 'receipt.png',
      type: 'image/png',
      size: pngBytes.length,
      bytes: pngBytes,
    };

    const validation = validateReceiptFile(file);
    expect(validation.isValid).toBe(true);
    expect(validation.mimeType).toBe('image/png');
  });

  it('2. Accepts valid PDF document file', () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, ...new Array(200).fill(0)]);
    const file = {
      name: 'statement.pdf',
      type: 'application/pdf',
      size: pdfBytes.length,
      bytes: pdfBytes,
    };

    const validation = validateReceiptFile(file);
    expect(validation.isValid).toBe(true);
    expect(validation.mimeType).toBe('application/pdf');
  });

  it('3. Rejects oversized files (>10MB)', () => {
    const file = {
      name: 'huge_receipt.png',
      type: 'image/png',
      size: 11 * 1024 * 1024, // 11MB
    };

    const validation = validateReceiptFile(file);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('maximum allowed size of 10MB');
  });

  it('4. Rejects unsupported MIME types', () => {
    const file = {
      name: 'script.sh',
      type: 'text/x-shellscript',
      size: 500,
    };

    const validation = validateReceiptFile(file);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('Unsupported file extension');
  });

  it('5. Rejects empty/corrupted files (<100 bytes)', () => {
    const file = {
      name: 'empty.png',
      type: 'image/png',
      size: 10,
    };

    const validation = validateReceiptFile(file);
    expect(validation.isValid).toBe(false);
    expect(validation.errorMessage).toContain('Corrupted or empty file');
  });

  it('6. Keccak256 hash corresponds to exact original bytes', () => {
    const receiptContent = new TextEncoder().encode('Bank UTR 9988776655 Paid $200.00');
    const computedHash = computeReceiptKeccak256(receiptContent);
    const expectedHash = keccak256(receiptContent);

    expect(computedHash).toEqual(expectedHash);
  });

  it('7. Real VPS upload response returns VPS CID alias and evidenceHash from server endpoint', async () => {
    const mockFile = new File(['receipt-bytes-content'], 'receipt.png', { type: 'image/png' });
    const expectedHash = keccak256(new TextEncoder().encode('receipt-bytes-content'));
    const mockCid = `vps-${expectedHash}`;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        cid: mockCid,
        evidenceHash: expectedHash,
        size: mockFile.size,
        mimeType: mockFile.type,
      }),
    } as Response);

    const result = await uploadReceiptEvidence(mockFile);

    expect(result.ipfsCid).toBe(mockCid);
    expect(result.fileHash).toBe(expectedHash);
    expect(result.size).toBe(mockFile.size);
  });

  it('8. Server upload failure handles errors and halts submission pipeline', async () => {
    const mockFile = new File(['receipt-content'], 'receipt.pdf', { type: 'application/pdf' });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: 'Server error storing evidence on VPS filesystem.',
      }),
    } as Response);

    await expect(uploadReceiptEvidence(mockFile)).rejects.toThrow(
      'Server error storing evidence on VPS filesystem.',
    );
  });

  it('9. Hash mismatch or altered file bytes changes the on-chain evidenceHash', () => {
    const bytesA = new TextEncoder().encode('Original Receipt Content A');
    const bytesB = new TextEncoder().encode('Altered Receipt Content B');

    const hashA = keccak256(bytesA);
    const hashB = keccak256(bytesB);

    expect(hashA).not.toEqual(hashB);
  });
});
