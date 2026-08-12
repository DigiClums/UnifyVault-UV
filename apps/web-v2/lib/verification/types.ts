/**
 * Off-Chain Payment Verification Lifecycle States
 * Strictly separate from on-chain escrow states.
 */
export type VerificationStatus =
  'UNVERIFIED' | 'WAITING_VERIFICATION' | 'VERIFYING' | 'VERIFIED' | 'REJECTED' | 'UNKNOWN';

/**
 * Standardized Payment Verification Result produced ONLY by trusted verification providers
 */
export interface VerificationResult {
  verificationId: string;
  tradeId: number;
  paymentIntentId: string;
  provider: string; // e.g. "HDFC_BANK_AA", "ICICI_WEBHOOK", "MOCK_PROVIDER"
  providerReference: string; // Bank UTR or Tx ID e.g. "BANK-TXN-987654"
  verifiedAmount: string; // Exact fiat amount e.g. "500.00"
  verifiedCurrency: string; // e.g. "INR"
  verifiedRecipient: string; // e.g. "seller@upi" or seller wallet
  verifiedAt: string; // ISO timestamp
  status: VerificationStatus;
  failureReason?: string;
  metadata?: Record<string, any>;
  attestationSignature?: string;
}

/**
 * Interface for Trusted Payment Verification Providers
 */
export interface PaymentVerificationProvider {
  name: string;
  verifyWebhookAuthenticity?: (rawBody: string, headers: WebhookHeaderAuth) => boolean;
  verifyPayment(params: {
    tradeId: number;
    paymentIntentId: string;
    expectedAmount: string;
    expectedCurrency: string;
    sellerRecipient: string;
    providerReference: string;
    rawPayload?: any;
  }): Promise<VerificationResult>;
}

export interface WebhookHeaderAuth {
  signature?: string;
  timestamp?: string;
  authToken?: string;
}
