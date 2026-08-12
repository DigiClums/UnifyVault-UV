import { AccountAggregatorProvider, AAConsentStatus, BankTransaction } from './types';

/**
 * Development & Testing Mock Account Aggregator Provider.
 *
 * STRICT REGULATORY SAFETY RULE:
 * Must NEVER be capable of being enabled or called in production.
 * Throws a hard error if invoked in production mode.
 */
export class MockAccountAggregatorProvider implements AccountAggregatorProvider {
  public name = 'MOCK_AA_DEVELOPMENT_PROVIDER';

  async createConsentRequest(params: {
    tradeId: number;
    sellerAddress: string;
    sellerVpa: string;
    fromTimestamp: string;
    toTimestamp: string;
  }): Promise<{ consentId: string; status: AAConsentStatus; redirectUrl?: string }> {
    this.enforceProductionGuard();

    const consentId = `aa-consent-${params.tradeId}-${Date.now()}`;
    return {
      consentId,
      status: 'CONSENT_PENDING',
      redirectUrl: `https://aa-sandbox.unifyvault.org/consent/${consentId}`,
    };
  }

  async getConsentStatus(consentId: string): Promise<AAConsentStatus> {
    this.enforceProductionGuard();
    if (consentId.includes('denied')) return 'CONSENT_DENIED';
    if (consentId.includes('expired')) return 'CONSENT_EXPIRED';
    return 'CONSENT_GRANTED';
  }

  async requestFinancialData(params: {
    consentId: string;
    tradeId: number;
    rawPayload?: any;
  }): Promise<BankTransaction[]> {
    this.enforceProductionGuard();

    if (params.rawPayload?.forceTimeout) {
      throw new Error('AA Provider Connection Timeout');
    }

    if (params.rawPayload?.forceUnavailable) {
      return [];
    }

    if (params.rawPayload?.transactions) {
      return params.rawPayload.transactions.map((tx: any) => this.normalizeTransactionData(tx));
    }

    // Default mock credit transaction matching expected trade
    return [
      {
        provider: this.name,
        providerTransactionId: `aa-tx-${params.tradeId}-101`,
        bankReference: params.rawPayload?.bankReference || `UTR-AA-${params.tradeId}`,
        transactionType: params.rawPayload?.transactionType || 'CREDIT',
        amount: params.rawPayload?.amount || '500.00',
        currency: params.rawPayload?.currency || 'INR',
        transactionTimestamp: params.rawPayload?.transactionTimestamp || new Date().toISOString(),
        accountReference: params.rawPayload?.sellerVpa || 'seller.payee@upi',
        counterpartyReference: params.rawPayload?.counterparty || 'buyer.payer@upi',
        narration: params.rawPayload?.narration || `UPI/CR/${params.tradeId}/UVBE`,
        fetchedAt: new Date().toISOString(),
      },
    ];
  }

  normalizeTransactionData(raw: any): BankTransaction {
    return {
      provider: this.name,
      providerTransactionId: raw.providerTransactionId || raw.txId || `tx-${Date.now()}`,
      bankReference: raw.bankReference || raw.rrn || raw.utr || 'N/A',
      transactionType: raw.transactionType === 'DEBIT' ? 'DEBIT' : 'CREDIT',
      amount: raw.amount || '0.00',
      currency: (raw.currency || 'INR').toUpperCase(),
      transactionTimestamp: raw.transactionTimestamp || new Date().toISOString(),
      accountReference: raw.accountReference || raw.payeeVpa || 'N/A',
      counterpartyReference: raw.counterpartyReference || raw.payerVpa || 'N/A',
      narration: raw.narration,
      fetchedAt: new Date().toISOString(),
      isThirdPartyPayer: raw.isThirdPartyPayer === true,
    };
  }

  private enforceProductionGuard(): void {
    const isProduction =
      process.env.NODE_ENV === 'production' || process.env.AA_INTEGRATION_MODE === 'production';
    const isMockAllowed = process.env.ALLOW_MOCK_VERIFIER === 'true';

    if (isProduction && !isMockAllowed) {
      throw new Error(
        'CRITICAL PRODUCTION SAFETY ERROR: MockAccountAggregatorProvider cannot be executed in production environments.',
      );
    }
  }
}
