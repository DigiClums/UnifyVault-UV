/**
 * Off-chain Payment Intent lifecycle states (Strictly separate from on-chain escrow states)
 */
export type PaymentIntentStatus =
  | 'CREATED'
  | 'QR_READY'
  | 'PAYMENT_CLAIMED'
  | 'WAITING_VERIFICATION'
  | 'SELLER_CONFIRMED'
  | 'RELEASE_ELIGIBLE'
  | 'PAYMENT_DISPUTED'
  | 'DISPUTE_OPEN'
  | 'EXPIRED';

/**
 * Trade-specific Payment Intent data model
 */
export interface PaymentIntent {
  id: string; // Unique intent identifier
  tradeId: number;
  buyerAddress: string;
  sellerAddress: string;
  sellerPaymentIdentifier: string; // PRIVATE seller UPI ID e.g. "seller@upi"
  fiatAmount: string; // Exact fiat amount e.g. "500.00"
  fiatCurrency: string; // e.g. "INR" or "USD"
  status: PaymentIntentStatus;
  reference: string; // Trade-bound unique reference e.g. "UV-TRD-1-8F3A2B"
  expiresAt: string; // ISO timestamp string
  createdAt: string; // ISO timestamp string
  paymentClaimedAt?: string;
  sellerConfirmedAt?: string;
  confirmationReference?: string;
  utrSubmitted?: string;
  evidenceHashSubmitted?: string;
}

export interface CreatePaymentIntentInput {
  tradeId: number;
  userAddress: string;
  sellerUpiId?: string;
}

export interface PaymentClaimInput {
  tradeId: number;
  userAddress: string;
  utr: string;
  evidenceHash?: string;
}

export interface PaymentIntentResponse {
  success: boolean;
  paymentIntent?: PaymentIntent;
  upiUri?: string;
  error?: string;
}

/**
 * Immutable per-trade seller payment binding data model (Phase 1 Foundation)
 */
export interface TradePaymentBinding {
  readonly tradeId: number;
  readonly chainId: number;
  readonly escrowAddress: `0x${string}`;
  readonly marketplaceOrderId: number;
  readonly takeOrderTxHash: `0x${string}`;
  readonly sellerAddress: `0x${string}`;
  readonly buyerAddress: `0x${string}`;
  readonly paymentRail: 'UPI' | 'BANK_TRANSFER';
  readonly paymentDestination: string; // Private seller payment destination (AES-256-GCM encrypted at rest)
  readonly sellerSignature: `0x${string}`;
  readonly signatureTimestamp: number;
  readonly bindingHash: `0x${string}`;
  readonly createdAt: string;
}

export interface CreateTradePaymentBindingInput {
  tradeId: number;
  marketplaceOrderId?: number;
  takeOrderTxHash?: `0x${string}`;
  paymentRail?: 'UPI' | 'BANK_TRANSFER';
  paymentDestination: string;
  signature: `0x${string}`;
  signatureTimestamp: number;
  chainId?: number;
}

export interface TradePaymentBindingResponse {
  success: boolean;
  binding?: TradePaymentBinding;
  isIdempotent?: boolean;
  error?: string;
}
