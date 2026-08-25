import { validateReceiptFile } from './fileValidator';
import { computeReceiptKeccak256, uploadReceiptEvidence } from './receiptHasher';
import { extractReceiptDataFromText, performRealReceiptOCR } from './ocrEngine';
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
 * Executes the complete real UPI receipt verification pipeline:
 * 1. File & Header Validation (PDF, JPG, JPEG, PNG, WEBP)
 * 2. Exact Byte Keccak256 Hashing & VPS Filesystem Storage
 * 3. Optical Character Recognition / Text Extraction on uploaded receipt
 * 4. UTR Cross-Examination (User-Entered vs OCR-Extracted)
 * 5. INR Amount Cross-Examination (Trade Expected vs OCR-Extracted)
 * 6. Payment Status Verification (SUCCESSFUL vs FAILED/PENDING/CANCELLED)
 * 7. Duplicate Reference Protection
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
      status: 'OCR_FAILED',
      ocrState: 'OCR_FAILED',
      fileHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      cid: '',
      extractedData: { confidenceScore: 0.0 },
      discrepancies: [fileValidation.errorMessage || 'Invalid file.'],
      isReleaseAllowed: false,
      isClaimAllowed: false,
      requiresManualReview: true,
      statusMessage: fileValidation.errorMessage || 'Invalid or corrupted receipt file.',
    };
  }

  // 2. Resolve Bytes & Compute Keccak256
  let rawBytes: Uint8Array;
  if ('bytes' in file && file.bytes && typeof file.bytes !== 'function') {
    rawBytes = file.bytes;
  } else if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    rawBytes = new Uint8Array(arrayBuffer);
  } else {
    rawBytes = new TextEncoder().encode(file.name);
  }

  let fileHash: `0x${string}` = computeReceiptKeccak256(rawBytes);
  let cid: string = `local-${fileHash}`;
  let ocrRawText = rawTextOverride;

  // 3. OCR Text Extraction Step (Execute 100% Client-Side / Local Device OCR)
  if (ocrRawText === undefined) {
    try {
      const ocrResult = await performRealReceiptOCR(rawBytes, file.type, file.name);
      ocrRawText = ocrResult.text;
    } catch (ocrErr: any) {
      console.warn('Client-side OCR processing error:', ocrErr);
      ocrRawText = '';
    }
  }

  // Optional: Background sync to VPS evidence cache if server endpoint is available (non-blocking)
  if (typeof window !== 'undefined' && file instanceof File) {
    uploadReceiptEvidence(file).catch(() => {
      // Non-blocking: Offline/Standalone APK continues seamlessly with local bytes & local hash
    });
  }

  const extractedData = extractReceiptDataFromText(ocrRawText);

  // 4. Low Confidence / Empty OCR Text Check
  if (extractedData.confidenceScore < 0.35 && !extractedData.amount && !extractedData.utr) {
    return {
      status: 'LOW_CONFIDENCE',
      ocrState: 'OCR_PARTIAL',
      fileHash,
      cid,
      extractedData,
      discrepancies: [
        'Receipt text could not be extracted with sufficient confidence. Manual inspection required.',
      ],
      isReleaseAllowed: false,
      isClaimAllowed: false,
      requiresManualReview: true,
      statusMessage: 'Receipt could not be automatically verified. Seller/manual review required.',
    };
  }

  // 5. Payment Status Check (FAILED / DECLINED / CANCELLED / PENDING / PROCESSING / AWAITING)
  if (extractedData.paymentStatus === 'FAILED' || extractedData.paymentStatus === 'CANCELLED') {
    discrepancies.push(
      `Receipt status indicates transaction was ${extractedData.paymentStatus.toLowerCase()}. Payment claim rejected.`,
    );
    return {
      status: 'OCR_FAILED',
      ocrState: 'OCR_FAILED',
      fileHash,
      cid,
      extractedData,
      discrepancies,
      isReleaseAllowed: false,
      isClaimAllowed: false,
      requiresManualReview: true,
      statusMessage: `PAYMENT FAILED: Receipt indicates transaction was ${extractedData.paymentStatus.toLowerCase()}.`,
    };
  }

  if (extractedData.paymentStatus === 'PENDING') {
    discrepancies.push(
      'Receipt status indicates transaction is pending/processing. Automatic approval blocked.',
    );
    return {
      status: 'MANUAL_REVIEW',
      ocrState: 'MANUAL_REVIEW',
      fileHash,
      cid,
      extractedData,
      discrepancies,
      isReleaseAllowed: false,
      isClaimAllowed: false,
      requiresManualReview: true,
      statusMessage:
        'PAYMENT PENDING: Receipt indicates transaction is pending or processing. Manual review required.',
    };
  }

  // 6. Duplicate Reference Check
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
      ocrState: 'OCR_FAILED',
      fileHash,
      cid,
      extractedData,
      discrepancies,
      isReleaseAllowed: false,
      isClaimAllowed: false,
      requiresManualReview: true,
      statusMessage: `DUPLICATE REFERENCE DETECTED: UTR ${extractedData.utr} was previously submitted.`,
    };
  }

  // 7. Amount Cross-Examination
  let isAmountMatch = false;
  if (extractedData.amount !== undefined) {
    const diff = Math.abs(extractedData.amount - context.expectedAmount);
    if (diff < 0.01) {
      isAmountMatch = true;
    } else {
      discrepancies.push(
        `Amount mismatch: Extracted receipt amount (₹${extractedData.amount.toFixed(2)}) does not match expected trade amount (₹${context.expectedAmount.toFixed(2)} ${context.expectedCurrency}).`,
      );
    }
  } else {
    discrepancies.push('OCR could not detect paid amount on receipt.');
  }

  // 8. UTR Cross-Examination (User-Entered vs OCR-Extracted)
  // Preserves exact string representation including leading zeroes
  let isUtrMatch = false;
  const expectedUtrClean = context.expectedUtr?.trim().toUpperCase();
  const extractedUtrClean = extractedData.utr?.trim().toUpperCase();

  if (expectedUtrClean && extractedUtrClean) {
    if (expectedUtrClean === extractedUtrClean) {
      isUtrMatch = true;
    } else {
      discrepancies.push(
        `UTR mismatch: User-entered reference (${expectedUtrClean}) does not match OCR-extracted receipt reference (${extractedUtrClean}).`,
      );
    }
  } else if (!expectedUtrClean) {
    discrepancies.push('User has not entered a bank UTR / transaction reference number.');
  } else {
    discrepancies.push('OCR could not detect a valid transaction reference or UTR on receipt.');
  }

  // 9. Payee Cross-Examination (where expected payee is provided)
  if (context.expectedPayeeVpa && extractedData.receiverVpa) {
    const expectedVpaClean = context.expectedPayeeVpa.trim().toLowerCase();
    const extractedVpaClean = extractedData.receiverVpa.trim().toLowerCase();
    if (expectedVpaClean !== extractedVpaClean) {
      discrepancies.push(
        `Payee VPA mismatch: Receipt payee (${extractedData.receiverVpa}) does not match expected seller UPI ID (${context.expectedPayeeVpa}).`,
      );
    }
  }

  // 10. Calculate Final Verification State
  if (discrepancies.some((d) => d.includes('mismatch') || d.includes('Mismatch'))) {
    return {
      status: 'MISMATCH',
      ocrState: 'OCR_MISMATCH',
      fileHash,
      cid,
      extractedData,
      discrepancies,
      isReleaseAllowed: false,
      isClaimAllowed: false,
      requiresManualReview: true,
      statusMessage: 'EVIDENCE MISMATCH: Receipt details do not match trade requirements.',
    };
  }

  if (isAmountMatch && isUtrMatch && extractedData.paymentStatus === 'SUCCESSFUL') {
    return {
      status: 'OCR_SUCCESS',
      ocrState: 'OCR_SUCCESS',
      fileHash,
      cid,
      extractedData,
      discrepancies: [],
      isReleaseAllowed: true,
      isClaimAllowed: true,
      requiresManualReview: false,
      statusMessage: 'Receipt verified successfully. UTR and INR amount match trade parameters.',
    };
  }

  if (extractedData.paymentStatus !== 'SUCCESSFUL') {
    discrepancies.push('Confirmed successful payment status was not detected on receipt.');
  }

  // Partial match / missing fields / unconfirmed status -> Manual Review
  return {
    status: 'MANUAL_REVIEW',
    ocrState: 'OCR_PARTIAL',
    fileHash,
    cid,
    extractedData,
    discrepancies,
    isReleaseAllowed: false,
    isClaimAllowed: false,
    requiresManualReview: true,
    statusMessage: 'Receipt could not be automatically verified. Seller/manual review required.',
  };
}
