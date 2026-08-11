/**
 * Explicit verification statuses for payment evidence processing
 */
export type EvidenceStatus =
  | 'PENDING'
  | 'MATCH'
  | 'MISMATCH'
  | 'LOW_CONFIDENCE'
  | 'INVALID'
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
  paymentStatus?: string;
  senderName?: string;
  receiverName?: string;
  confidenceScore: number; // 0.0 to 1.0
}

/**
 * Result of comparing extracted receipt data against on-chain trade details
 */
export interface EvidenceVerificationResult {
  status: EvidenceStatus;
  fileHash: `0x${string}`;
  cid: string;
  extractedData: ExtractedReceiptData;
  discrepancies: string[];
  isReleaseAllowed: boolean;
  requiresManualReview: boolean;
  statusMessage: string;
}

/**
 * Trade context passed into evidence verifier
 */
export interface TradeVerificationContext {
  tradeId: number;
  expectedAmount: number; // Fiat amount e.g. 10000
  expectedCurrency: string; // e.g. "USD", "INR"
  expectedUtr?: string;
  knownUsedUtrs?: string[];
}
