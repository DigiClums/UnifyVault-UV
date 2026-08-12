import { PaymentVerificationProvider, VerificationResult, WebhookHeaderAuth } from '../types';

/**
 * Development & Testing Mock Verification Provider.
 *
 * STRICT SAFETY RULE:
 * Must NEVER be capable of being enabled or called in production.
 * Throws a hard error if invoked in production mode.
 */
export class MockPaymentVerificationProvider implements PaymentVerificationProvider {
  public name = 'MOCK_DEVELOPMENT_PROVIDER';

  public verifyWebhookAuthenticity(rawBody: string, headers: WebhookHeaderAuth): boolean {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_VERIFIER !== 'true') {
      return false;
    }
    return headers.signature === 'mock-valid-signature';
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
    // 1. Production Mode Safety Guard
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_VERIFIER !== 'true') {
      throw new Error(
        'CRITICAL PRODUCTION SAFETY ERROR: MockPaymentVerificationProvider cannot be executed in production environments.',
      );
    }

    const {
      tradeId,
      paymentIntentId,
      expectedAmount,
      expectedCurrency,
      sellerRecipient,
      providerReference,
      rawPayload,
    } = params;

    const isSimulatedFailure = rawPayload?.forceFailure === true;
    const isSimulatedTimeout = rawPayload?.forceTimeout === true;

    if (isSimulatedTimeout) {
      return {
        verificationId: `verif-mock-${tradeId}-${Date.now()}`,
        tradeId,
        paymentIntentId,
        provider: this.name,
        providerReference,
        verifiedAmount: expectedAmount,
        verifiedCurrency: expectedCurrency,
        verifiedRecipient: sellerRecipient,
        verifiedAt: new Date().toISOString(),
        status: 'UNKNOWN',
        failureReason: 'Provider connection timeout / temporary outage.',
      };
    }

    if (isSimulatedFailure) {
      return {
        verificationId: `verif-mock-${tradeId}-${Date.now()}`,
        tradeId,
        paymentIntentId,
        provider: this.name,
        providerReference,
        verifiedAmount: '0.00',
        verifiedCurrency: expectedCurrency,
        verifiedRecipient: sellerRecipient,
        verifiedAt: new Date().toISOString(),
        status: 'REJECTED',
        failureReason: 'Simulated payment credit failure.',
      };
    }

    return {
      verificationId: `verif-mock-${tradeId}-${Date.now()}`,
      tradeId,
      paymentIntentId,
      provider: this.name,
      providerReference,
      verifiedAmount: expectedAmount,
      verifiedCurrency: expectedCurrency,
      verifiedRecipient: sellerRecipient,
      verifiedAt: new Date().toISOString(),
      status: 'VERIFIED',
    };
  }
}
