/**
 * Account Aggregator Consent Lifecycle States
 * Strictly separate from off-chain payment verification and on-chain escrow states.
 */
export type AAConsentStatus =
  | 'NOT_REQUESTED'
  | 'CONSENT_REQUIRED'
  | 'CONSENT_PENDING'
  | 'CONSENT_GRANTED'
  | 'DATA_REQUESTED'
  | 'DATA_RECEIVED'
  | 'MATCHING'
  | 'VERIFIED'
  | 'CONSENT_DENIED'
  | 'CONSENT_EXPIRED'
  | 'DATA_UNAVAILABLE'
  | 'DATA_MISMATCH'
  | 'UNKNOWN';

/**
 * Normalized Bank Transaction Record derived from Account Aggregator FIP payload
 */
export interface BankTransaction {
  provider: string; // e.g. "SETU_AA", "FINVU_AA", "MOCK_AA"
  providerTransactionId: string;
  bankReference: string; // UTR / RRN
  transactionType: 'CREDIT' | 'DEBIT';
  amount: string; // e.g. "500.00"
  currency: string; // e.g. "INR"
  transactionTimestamp: string; // ISO String
  accountReference: string; // Masked seller VPA or account
  counterpartyReference: string; // Buyer/Payer reference or VPA
  narration?: string;
  fetchedAt: string;
  isThirdPartyPayer?: boolean;
}

export interface AAConsentRecord {
  consentId: string;
  tradeId: number;
  sellerAddress: string;
  status: AAConsentStatus;
  requestedAt: string;
  expiresAt: string;
  grantedAt?: string;
  failureReason?: string;
}

export interface AccountAggregatorProvider {
  name: string;
  createConsentRequest(params: {
    tradeId: number;
    sellerAddress: string;
    sellerVpa: string;
    fromTimestamp: string;
    toTimestamp: string;
  }): Promise<{ consentId: string; status: AAConsentStatus; redirectUrl?: string }>;

  getConsentStatus(consentId: string): Promise<AAConsentStatus>;

  requestFinancialData(params: {
    consentId: string;
    tradeId: number;
    rawPayload?: any;
  }): Promise<BankTransaction[]>;

  normalizeTransactionData(raw: any): BankTransaction;
}
