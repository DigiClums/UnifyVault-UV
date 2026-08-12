import crypto from 'crypto';
import { PaymentVerificationProvider, VerificationResult, WebhookHeaderAuth } from '../types';

/**
 * Production Bank / Account Aggregator Webhook Verification Provider.
 * Enforces HMAC-SHA256 signature verification for incoming webhooks.
 */
export class BankWebhookVerificationProvider implements PaymentVerificationProvider {
  public name = 'BANK_WEBHOOK_PROVIDER';
  private webhookSecret: string;

  constructor(webhookSecret?: string) {
    this.webhookSecret =
      webhookSecret ||
      process.env.BANK_WEBHOOK_SECRET ||
      'unifyvault-bank-webhook-hmac-secret-32b!';
  }

  /**
   * Verifies incoming webhook HMAC-SHA256 signature
   */
  public verifyWebhookAuthenticity(rawBody: string, headers: WebhookHeaderAuth): boolean {
    if (!headers.signature || !headers.timestamp) return false;

    // Check timestamp freshness (5 minute tolerance)
    const timestampMs = parseInt(headers.timestamp, 10);
    if (isNaN(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
      return false;
    }

    const payloadToSign = `${headers.timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payloadToSign)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(headers.signature), Buffer.from(expectedSignature));
  }

  async verifyPayment(params: {
    tradeId: number;
    paymentIntentId: string;
    expectedAmount: string;
    expectedCurrency: string;
    sellerRecipient: string;
    providerReference: string;
    rawPayload?: any;
  }): Promise<VerificationResult> {
    const {
      tradeId,
      paymentIntentId,
      expectedAmount,
      expectedCurrency,
      sellerRecipient,
      providerReference,
      rawPayload,
    } = params;

    const actualAmount = rawPayload?.creditAmount || expectedAmount;
    const actualCurrency = rawPayload?.creditCurrency || expectedCurrency;
    const actualRecipient = rawPayload?.payeeIdentifier || sellerRecipient;
    const isAuthentic = rawPayload?.isSignatureValid === true;

    if (!isAuthentic) {
      return {
        verificationId: `verif-bank-${tradeId}-${Date.now()}`,
        tradeId,
        paymentIntentId,
        provider: this.name,
        providerReference,
        verifiedAmount: '0.00',
        verifiedCurrency: expectedCurrency,
        verifiedRecipient: sellerRecipient,
        verifiedAt: new Date().toISOString(),
        status: 'REJECTED',
        failureReason: 'Invalid webhook HMAC signature or authentication header.',
      };
    }

    const amountMatches = actualAmount === expectedAmount;
    const currencyMatches = actualCurrency.toUpperCase() === expectedCurrency.toUpperCase();
    const recipientMatches = actualRecipient.toLowerCase() === sellerRecipient.toLowerCase();

    if (amountMatches && currencyMatches && recipientMatches) {
      return {
        verificationId: `verif-bank-${tradeId}-${Date.now()}`,
        tradeId,
        paymentIntentId,
        provider: this.name,
        providerReference,
        verifiedAmount: actualAmount,
        verifiedCurrency: actualCurrency,
        verifiedRecipient: actualRecipient,
        verifiedAt: new Date().toISOString(),
        status: 'VERIFIED',
      };
    }

    return {
      verificationId: `verif-bank-${tradeId}-${Date.now()}`,
      tradeId,
      paymentIntentId,
      provider: this.name,
      providerReference,
      verifiedAmount: actualAmount,
      verifiedCurrency: actualCurrency,
      verifiedRecipient: actualRecipient,
      verifiedAt: new Date().toISOString(),
      status: 'REJECTED',
      failureReason: `Parameter mismatch: Amount (${actualAmount} vs ${expectedAmount}), Recipient (${actualRecipient} vs ${sellerRecipient}).`,
    };
  }
}
