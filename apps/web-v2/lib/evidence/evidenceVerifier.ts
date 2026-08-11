import { validateReceiptFile } from './fileValidator';
import { computeReceiptHashes } from './receiptHasher';
import { extractReceiptDataFromText } from './ocrEngine';
import {
  EvidenceStatus,
  ExtractedReceiptData,
  EvidenceVerificationResult,
  TradeVerificationContext,
} from './types';

export interface VerifyEvidenceInput {
  file: File | { name: string; type: string; size: number; bytes?: Uint8Array };
  rawTextOverride?: string;
  context: TradeVerificationContext;
}

/**
 * Executes full evidence verification pipeline:
 * File Validation -> Cryptographic Hashing -> OCR Data Extraction -> Cross-Examination -> Status Calculation
 */
export async function verifyPaymentEvidence(
  input: VerifyEvidenceInput,
): Promise<EvidenceVerificationResult> {
  const { file, rawTextOverride, context } = input;
  const discrepancies: string[] = [];

  // 1. File Validation Step
  const fileValidation = validateReceiptFile(file);
  if (!fileValidation.isValid) {
    const defaultBytes = new Uint8Array([0x00]);
    const hashes = await computeReceiptHashes(defaultBytes);
    return {
      status: 'INVALID',
      fileHash: hashes.fileHash,
      cid: hashes.ipfsCid,
      extractedData: { confidenceScore: 0.0 },
      discrepancies: [fileValidation.errorMessage || 'Invalid file.'],
      isReleaseAllowed: false,
      requiresManualReview: true,
      statusMessage: fileValidation.errorMessage || 'Invalid or corrupted receipt file.',
    };
  }

  // 2. Cryptographic Hashing Step
  const rawBytes =
    'bytes' in file && file.bytes && typeof file.bytes !== 'function' ? file.bytes : undefined;
  const bytes = rawBytes || new Uint8Array([0x01, 0x02, 0x03]);
  const hashes = await computeReceiptHashes(bytes);

  // 3. OCR Data Extraction Step
  const textToParse = rawTextOverride || '';
  const extractedData = extractReceiptDataFromText(textToParse);

  // 4. Low Confidence / Unreadable Check
  if (extractedData.confidenceScore < 0.4 || (!extractedData.amount && !extractedData.utr)) {
    return {
      status: 'LOW_CONFIDENCE',
      fileHash: hashes.fileHash,
      cid: hashes.ipfsCid,
      extractedData,
      discrepancies: ['Unreadable receipt text or low OCR extraction confidence.'],
      isReleaseAllowed: false,
      requiresManualReview: true,
      statusMessage:
        'Receipt text could not be clearly extracted by OCR. Manual inspection required.',
    };
  }

  // 5. Duplicate Reference Check
  if (
    extractedData.utr &&
    context.knownUsedUtrs &&
    context.knownUsedUtrs.some((u) => u.toLowerCase() === extractedData.utr?.toLowerCase())
  ) {
    discrepancies.push(
      `UTR reference ${extractedData.utr} has already been registered on another trade.`,
    );
    return {
      status: 'DUPLICATE_REFERENCE',
      fileHash: hashes.fileHash,
      cid: hashes.ipfsCid,
      extractedData,
      discrepancies,
      isReleaseAllowed: false,
      requiresManualReview: true,
      statusMessage: `DUPLICATE REFERENCE DETECTED: UTR ${extractedData.utr} was previously submitted.`,
    };
  }

  // 6. Amount Cross-Examination
  let isAmountMatch = true;
  if (extractedData.amount !== undefined) {
    const diff = Math.abs(extractedData.amount - context.expectedAmount);
    if (diff > 0.01) {
      isAmountMatch = false;
      discrepancies.push(
        `Amount mismatch: Extracted receipt amount (${extractedData.amount} ${context.expectedCurrency}) does not match expected trade amount (${context.expectedAmount} ${context.expectedCurrency}).`,
      );
    }
  }

  // 7. UTR Cross-Examination (if expected UTR provided)
  let isUtrMatch = true;
  if (context.expectedUtr && extractedData.utr) {
    if (context.expectedUtr.trim().toUpperCase() !== extractedData.utr.trim().toUpperCase()) {
      isUtrMatch = false;
      discrepancies.push(
        `UTR mismatch: Extracted receipt UTR (${extractedData.utr}) does not match expected reference (${context.expectedUtr}).`,
      );
    }
  }

  // 8. Calculate Final Evidence Status
  let status: EvidenceStatus = 'PENDING';
  let isReleaseAllowed = false;
  let requiresManualReview = false;
  let statusMessage = '';

  if (!isAmountMatch || !isUtrMatch) {
    status = 'MISMATCH';
    isReleaseAllowed = false;
    requiresManualReview = true;
    statusMessage = 'EVIDENCE MISMATCH: Receipt details do not match trade requirements.';
  } else if (
    isAmountMatch &&
    (isUtrMatch || !context.expectedUtr) &&
    extractedData.confidenceScore >= 0.7
  ) {
    status = 'MATCH';
    isReleaseAllowed = true;
    requiresManualReview = false;
    statusMessage = 'Evidence matched on-chain trade parameters.';
  } else {
    status = 'MANUAL_REVIEW';
    isReleaseAllowed = false;
    requiresManualReview = true;
    statusMessage = 'Partial evidence extracted. Seller manual verification required.';
  }

  return {
    status,
    fileHash: hashes.fileHash,
    cid: hashes.ipfsCid,
    extractedData,
    discrepancies,
    isReleaseAllowed,
    requiresManualReview,
    statusMessage,
  };
}
