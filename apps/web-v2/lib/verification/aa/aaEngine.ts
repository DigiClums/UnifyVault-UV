import { getPaymentIntentByTradeId } from '../../payment/paymentIntentStore';
import { getPaymentVerificationEngine } from '../verificationEngine';
import { saveVerificationResult, isProviderReferenceConsumed } from '../verificationStore';
import { VerificationResult } from '../types';
import { AccountAggregatorProvider, AAConsentStatus, BankTransaction } from './types';
import { MockAccountAggregatorProvider } from './mockAaProvider';

export class AccountAggregatorVerificationEngine {
  private aaProviders: Map<string, AccountAggregatorProvider> = new Map();

  constructor() {
    // Register Mock AA Provider ONLY in dev/test/sandbox
    const mode = process.env.AA_INTEGRATION_MODE || 'sandbox';
    if (mode === 'sandbox' || process.env.NODE_ENV === 'test') {
      const mockAa = new MockAccountAggregatorProvider();
      this.aaProviders.set(mockAa.name, mockAa);
    }
  }

  public getAAProvider(name?: string): AccountAggregatorProvider {
    const providerName = name || 'MOCK_AA_DEVELOPMENT_PROVIDER';
    const provider = this.aaProviders.get(providerName);
    if (!provider) {
      throw new Error(
        `AA Integration Error: Account Aggregator provider '${providerName}' is not registered or mode is disabled.`,
      );
    }
    return provider;
  }

  /**
   * Evaluates normalized AA transactions against active P2P trade parameters.
   * Single Authority for AA Data Matching.
   */
  async matchAndVerifyAATransactions(params: {
    tradeId: number;
    consentId: string;
    providerName?: string;
    rawPayload?: any;
    skipOnChainCheckForTest?: boolean;
  }): Promise<{ consentStatus: AAConsentStatus; verificationResult?: VerificationResult }> {
    const { tradeId, consentId, providerName, rawPayload, skipOnChainCheckForTest } = params;

    const provider = this.getAAProvider(providerName);

    // 1. Fetch Consent Status
    const consentStatus = await provider.getConsentStatus(consentId);
    if (consentStatus === 'CONSENT_DENIED' || consentStatus === 'CONSENT_EXPIRED') {
      return { consentStatus };
    }

    // 2. Fetch Financial Statement Data
    let transactions: BankTransaction[] = [];
    try {
      transactions = await provider.requestFinancialData({ consentId, tradeId, rawPayload });
    } catch (err: any) {
      console.error(`AA Data Fetch Error for trade #${tradeId}:`, err?.message);
      return { consentStatus: 'UNKNOWN' };
    }

    if (!transactions || transactions.length === 0) {
      return { consentStatus: 'DATA_UNAVAILABLE' };
    }

    // 3. Fetch Payment Intent
    const intent = await getPaymentIntentByTradeId(tradeId);
    if (!intent) {
      return { consentStatus: 'DATA_MISMATCH' };
    }

    // 4. Candidate Transaction Evaluation
    let matchingCandidate: BankTransaction | null = null;
    let mismatchReason = '';

    for (const tx of transactions) {
      // 4a. Credit Check
      if (tx.transactionType !== 'CREDIT') {
        mismatchReason = 'Transaction is DEBIT, not CREDIT.';
        continue;
      }

      // 4b. Currency Check
      if (tx.currency.toUpperCase() !== intent.fiatCurrency.toUpperCase()) {
        mismatchReason = `Currency mismatch (${tx.currency} vs ${intent.fiatCurrency}).`;
        continue;
      }

      // 4c. Amount Exact Check
      if (tx.amount !== intent.fiatAmount) {
        mismatchReason = `Amount mismatch (${tx.amount} vs ${intent.fiatAmount}).`;
        continue;
      }

      // 4d. Recipient Destination Check (Must match snapshotted intent VPA)
      if (
        tx.accountReference.toLowerCase().trim() !==
        intent.sellerPaymentIdentifier.toLowerCase().trim()
      ) {
        mismatchReason = `Seller destination mismatch (${tx.accountReference} vs ${intent.sellerPaymentIdentifier}).`;
        continue;
      }

      // 4e. Expiry Window Check
      if (
        intent.expiresAt &&
        new Date(tx.transactionTimestamp).getTime() > new Date(intent.expiresAt).getTime()
      ) {
        mismatchReason = `Transaction timestamp (${tx.transactionTimestamp}) is outside payment window.`;
        continue;
      }

      // 4f. Replay Protection Check
      const isConsumed = await isProviderReferenceConsumed(
        tx.provider,
        tx.bankReference || tx.providerTransactionId,
      );
      if (isConsumed) {
        mismatchReason = `Replay Guard: Bank reference '${tx.bankReference}' already consumed by another trade.`;
        continue;
      }

      matchingCandidate = tx;
      break;
    }

    if (!matchingCandidate) {
      return { consentStatus: 'DATA_MISMATCH' };
    }

    // 5. Delegate to VerificationEngine Authority Boundary
    const verificationEngine = getPaymentVerificationEngine();
    const verifResult = await verificationEngine.processVerification({
      tradeId,
      providerName: 'MOCK_DEVELOPMENT_PROVIDER',
      providerReference: matchingCandidate.bankReference || matchingCandidate.providerTransactionId,
      rawPayload: {
        creditAmount: matchingCandidate.amount,
        creditCurrency: matchingCandidate.currency,
        payeeIdentifier: intent.sellerPaymentIdentifier,
        isThirdPartyPayer: matchingCandidate.isThirdPartyPayer === true,
        isSignatureValid: true,
      },
      skipOnChainCheckForTest,
    });

    return {
      consentStatus: 'VERIFIED',
      verificationResult: verifResult,
    };
  }
}

let aaInstance: AccountAggregatorVerificationEngine | undefined;

export function getAAEngine(): AccountAggregatorVerificationEngine {
  if (!aaInstance) {
    aaInstance = new AccountAggregatorVerificationEngine();
  }
  return aaInstance;
}
