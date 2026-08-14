/**
 * Explicit verification statuses for payment evidence processing
 */
export type EvidenceStatus =
  | 'PENDING'
  | 'OCR_PENDING'
  | 'MATCH'
  | 'OCR_SUCCESS'
  | 'MISMATCH'
  | 'OCR_MISMATCH'
  | 'LOW_CONFIDENCE'
  | 'OCR_PARTIAL'
  | 'INVALID'
  | 'OCR_FAILED'
  | 'DUPLICATE_REFERENCE'
  | 'MANUAL_REVIEW';

/**
 * Extracted payment data fields from receipt OCR data extraction
 */
export interface ExtractedReceiptData {
  amount?: number;
  currency?: string;
  utr?: string;
  transactionDate?: string;
  transactionTime?: string;
  paymentStatus?: 'SUCCESSFUL' | 'FAILED' | 'PENDING' | 'CANCELLED';
  senderName?: string;
  senderVpa?: string;
  receiverName?: string;
  receiverVpa?: string;
  confidenceScore: number; // 0.0 to 1.0
  rawTextSample?: string;
}

/**
 * Result of comparing extracted receipt data against on-chain trade details
 */
export interface EvidenceVerificationResult {
  status: EvidenceStatus;
  ocrState:
    'OCR_PENDING' | 'OCR_SUCCESS' | 'OCR_PARTIAL' | 'OCR_FAILED' | 'OCR_MISMATCH' | 'MANUAL_REVIEW';
  fileHash: `0x${string}`;
  cid: string;
  extractedData: ExtractedReceiptData;
  discrepancies: string[];
  isReleaseAllowed: boolean;
  isClaimAllowed: boolean;
  requiresManualReview: boolean;
  statusMessage: string;
}

/**
 * Trade context passed into evidence verifier
 */
export interface TradeVerificationContext {
  tradeId: number;
  expectedAmount: number; // Fiat amount e.g. 500, 10000
  expectedCurrency: string; // e.g. "INR"
  expectedUtr?: string;
  knownUsedUtrs?: string[];
}
