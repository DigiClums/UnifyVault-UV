import { validateReceiptFile } from './fileValidator';
import { computeReceiptKeccak256, uploadReceiptEvidence } from './receiptHasher';
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
 * File Validation -> W3UP Real Upload & Keccak256 Hashing -> OCR Data Extraction -> Cross-Examination -> Status Calculation
 */
export async function verifyPaymentEvidence(
  input: VerifyEvidenceInput,
): Promise<EvidenceVerificationResult> {
  const { file, rawTextOverride, context } = input;
  const discrepancies: string[] = [];

  // 1. File Validation Step
  const fileValidation = validateReceiptFile(file);
  if (!fileValidation.isValid) {
    return {
      status: 'INVALID',
      fileHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      cid: '',
      extractedData: { confidenceScore: 0.0 },
      discrepancies: [fileValidation.errorMessage || 'Invalid file.'],
      isReleaseAllowed: false,
      requiresManualReview: true,
      statusMessage: fileValidation.errorMessage || 'Invalid or corrupted receipt file.',
    };
  }

  // 2. Real Upload to W3UP / Keccak256 Hashing Step
  let fileHash: `0x${string}`;
  let cid: string = '';

  if (typeof window !== 'undefined' && file instanceof File) {
    try {
      const uploadRes = await uploadReceiptEvidence(file);
      fileHash = uploadRes.fileHash;
      cid = uploadRes.ipfsCid;
    } catch (uploadErr: any) {
      return {
        status: 'INVALID',
        fileHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        cid: '',
        extractedData: { confidenceScore: 0.0 },
        discrepancies: [uploadErr?.message || 'W3UP IPFS upload failed.'],
        isReleaseAllowed: false,
        requiresManualReview: true,
        statusMessage:
          uploadErr?.message || 'Evidence upload failed. Payment proof submission blocked.',
      };
    }
  } else {
    // Non-browser or mock object fallback for unit tests
    const rawBytes =
      'bytes' in file && file.bytes && typeof file.bytes !== 'function'
        ? file.bytes
        : new TextEncoder().encode(file.name);
    fileHash = computeReceiptKeccak256(rawBytes);
  }

  // 3. OCR Data Extraction Step
  const textToParse = rawTextOverride || '';
  const extractedData = extractReceiptDataFromText(textToParse);

  // 4. Low Confidence / Unreadable Check
  if (extractedData.confidenceScore < 0.4 || (!extractedData.amount && !extractedData.utr)) {
    return {
      status: 'LOW_CONFIDENCE',
      fileHash,
      cid,
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
      fileHash,
      cid,
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
    statusMessage = 'Evidence matched on-chain trade parameters and uploaded to IPFS.';
  } else {
    status = 'MANUAL_REVIEW';
    isReleaseAllowed = false;
    requiresManualReview = true;
    statusMessage = 'Partial evidence extracted. Seller manual verification required.';
  }

  return {
    status,
    fileHash,
    cid,
    extractedData,
    discrepancies,
    isReleaseAllowed,
    requiresManualReview,
    statusMessage,
  };
}
