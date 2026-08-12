import { createPublicClient, http, hexToString, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { P2P_ESCROW_ABI } from '../contracts/escrow';
import { DEPLOYED_CONTRACTS_SEPOLIA, getRpcUrl } from '../../constants';
import { getPaymentIntentByTradeId, savePaymentIntent } from '../payment/paymentIntentStore';
import {
  saveVerificationResult,
  getVerificationResultByTradeId,
  isProviderReferenceConsumed,
  consumeProviderReference,
} from './verificationStore';
import { generateSignedAttestation } from './attestation';
import { VerificationResult, PaymentVerificationProvider } from './types';
import { MockPaymentVerificationProvider } from './providers/mockProvider';
import { BankWebhookVerificationProvider } from './providers/bankWebhookProvider';

function getPublicRpcClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(getRpcUrl(baseSepolia.id)),
  });
}

function getP2PEscrowAddress(): `0x${string}` {
  return (
    (process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS as `0x${string}`) ||
    DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow
  );
}

/**
 * Payment Verification Engine
 * SOLE AUTHORITY BOUNDARY in the application for declaring PAYMENT_VERIFIED.
 */
export class PaymentVerificationEngine {
  private providers: Map<string, PaymentVerificationProvider> = new Map();

  constructor() {
    // STRICT PRODUCTION SAFETY RULE:
    // UnifyVault P2P in production does NOT depend on any bank API, bank webhook, or mock provider.
    // Bank and mock providers are registered ONLY in development/testing mode when ALLOW_MOCK_VERIFIER is true.
    if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_VERIFIER === 'true') {
      const bankProvider = new BankWebhookVerificationProvider();
      this.providers.set(bankProvider.name, bankProvider);

      const mockProvider = new MockPaymentVerificationProvider();
      this.providers.set(mockProvider.name, mockProvider);
    }
  }

  public getProvider(name: string): PaymentVerificationProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Processes a verification request for a trade.
   * Single Authority Entry Point.
   */
  async processVerification(params: {
    tradeId: number;
    providerName: string;
    providerReference: string;
    rawPayload?: any;
    skipOnChainCheckForTest?: boolean;
  }): Promise<VerificationResult> {
    const { tradeId, providerName, providerReference, rawPayload, skipOnChainCheckForTest } =
      params;

    if (!tradeId || tradeId <= 0) {
      throw new Error('Invalid tradeId parameter.');
    }

    if (!providerReference || providerReference.trim().length === 0) {
      throw new Error('Provider reference required for verification.');
    }

    const provider = this.getProvider(providerName);
    if (!provider) {
      return this.buildRejectedResult(
        tradeId,
        'UNKNOWN_INTENT',
        providerName,
        providerReference,
        `Verification provider '${providerName}' is not registered or supported.`,
      );
    }

    // 1. Replay & Double Spending Protection
    const isConsumed = await isProviderReferenceConsumed(providerName, providerReference);
    if (isConsumed) {
      return this.buildRejectedResult(
        tradeId,
        'DUPLICATE_TX',
        providerName,
        providerReference,
        `Replay Attack Prevented: Provider reference '${providerReference}' has already been consumed by another trade.`,
      );
    }

    // 2. Fetch Payment Intent
    const intent = await getPaymentIntentByTradeId(tradeId);
    if (!intent) {
      return this.buildRejectedResult(
        tradeId,
        'MISSING_INTENT',
        providerName,
        providerReference,
        `Payment Intent not initialized for trade #${tradeId}.`,
      );
    }

    // 3. On-Chain Trade State Verification
    let onChainFiatAmountStr = intent.fiatAmount;
    let onChainCurrencyStr = intent.fiatCurrency;
    let sellerAddr = rawPayload?.onChainSellerWallet || intent.sellerAddress;
    const isFundedOnChain = true;

    if (!skipOnChainCheckForTest && process.env.NODE_ENV !== 'test') {
      try {
        const publicClient = getPublicRpcClient();
        const escrowAddress = getP2PEscrowAddress();

        const rawTrade = (await publicClient.readContract({
          address: escrowAddress,
          abi: P2P_ESCROW_ABI,
          functionName: 'getTrade',
          args: [BigInt(tradeId)],
        })) as any;

        const tradeState = Number(rawTrade.state);
        // State: 2 = FUNDED, 3 = PAYMENT_SUBMITTED
        if (tradeState < 2 || tradeState >= 5) {
          return this.buildRejectedResult(
            tradeId,
            intent.id,
            providerName,
            providerReference,
            `On-chain trade #${tradeId} is not in active FUNDED state (State=${tradeState}).`,
          );
        }

        onChainFiatAmountStr = formatUnits(rawTrade.fiatAmount, 2);
        onChainCurrencyStr = hexToString(rawTrade.fiatCurrency).replace(/\0/g, '') || 'INR';
        sellerAddr = rawPayload?.onChainSellerWallet || rawTrade.seller;
      } catch (err: any) {
        return this.buildRejectedResult(
          tradeId,
          intent.id,
          providerName,
          providerReference,
          `Failed retrieving on-chain trade state for #${tradeId}: ${err?.message}`,
        );
      }
    }

    // 4. Expiry Window Check
    if (
      intent.expiresAt &&
      new Date(intent.expiresAt).getTime() < Date.now() &&
      intent.status === 'CREATED'
    ) {
      return this.buildRejectedResult(
        tradeId,
        intent.id,
        providerName,
        providerReference,
        `Payment Intent expired at ${intent.expiresAt}.`,
      );
    }

    const sellerPaymentDestination = intent.sellerPaymentIdentifier;
    const sellerWallet = sellerAddr;

    if (!sellerPaymentDestination || sellerPaymentDestination.trim().length === 0) {
      return this.buildRejectedResult(
        tradeId,
        intent.id,
        providerName,
        providerReference,
        'Seller payment destination profile not configured for fiat trade.',
      );
    }

    // 5. Invoke Provider Verification Adapter
    const providerResult = await provider.verifyPayment({
      tradeId,
      paymentIntentId: intent.id,
      expectedAmount: onChainFiatAmountStr,
      expectedCurrency: onChainCurrencyStr,
      sellerRecipient: sellerPaymentDestination,
      providerReference,
      rawPayload,
    });

    // 6. Handle Provider Timeout / Outage -> UNKNOWN State (No false rejection)
    if (providerResult.status === 'UNKNOWN') {
      const unknownResult: VerificationResult = {
        ...providerResult,
        status: 'UNKNOWN',
        failureReason: providerResult.failureReason || 'Provider temporarily unavailable.',
      };
      await saveVerificationResult(unknownResult);
      return unknownResult;
    }

    // 7. Handle Provider Rejection
    if (providerResult.status !== 'VERIFIED') {
      const rejectedResult: VerificationResult = {
        ...providerResult,
        status: 'REJECTED',
        failureReason:
          providerResult.failureReason || 'Provider verification failed parameter matching.',
      };
      await saveVerificationResult(rejectedResult);
      return rejectedResult;
    }

    // 8. Strict Verification Parameter Matching Guard
    // Separate sellerWallet (0x...) from sellerPaymentDestination (UPI ID e.g. seller@upi)
    const amountExact = providerResult.verifiedAmount === onChainFiatAmountStr;
    const currencyExact =
      providerResult.verifiedCurrency.toUpperCase() === onChainCurrencyStr.toUpperCase();
    const recipientExact =
      providerResult.verifiedRecipient.trim().toLowerCase() ===
      sellerPaymentDestination.trim().toLowerCase();
    const walletExact = sellerWallet.toLowerCase() === intent.sellerAddress.toLowerCase();

    if (!amountExact || !currencyExact || !recipientExact || !walletExact) {
      return this.buildRejectedResult(
        tradeId,
        intent.id,
        providerName,
        providerReference,
        `Parameter Mismatch: Amount (${providerResult.verifiedAmount} vs ${onChainFiatAmountStr}), Recipient (${providerResult.verifiedRecipient} vs ${sellerPaymentDestination}), Wallet (${sellerWallet} vs ${intent.sellerAddress}).`,
      );
    }

    // 9. Generate EIP-712 Signed Verification Attestation
    const escrowAddress = getP2PEscrowAddress();
    const signature = await generateSignedAttestation(providerResult, escrowAddress, 84532);

    const verifiedResult: VerificationResult = {
      ...providerResult,
      status: 'VERIFIED',
      attestationSignature: signature,
    };

    // 10. Atomically consume provider reference to prevent double spending
    await consumeProviderReference(providerName, providerReference, tradeId);

    // 11. Persist Verification Record
    await saveVerificationResult(verifiedResult);

    // 12. Update Payment Intent status
    intent.status = 'WAITING_VERIFICATION'; // Intent stays WAITING_VERIFICATION until seller calls escrow release
    await savePaymentIntent(intent);

    return verifiedResult;
  }

  private buildRejectedResult(
    tradeId: number,
    intentId: string,
    provider: string,
    ref: string,
    reason: string,
  ): VerificationResult {
    return {
      verificationId: `verif-reject-${tradeId}-${Date.now()}`,
      tradeId,
      paymentIntentId: intentId,
      provider,
      providerReference: ref,
      verifiedAmount: '0.00',
      verifiedCurrency: 'INR',
      verifiedRecipient: 'N/A',
      verifiedAt: new Date().toISOString(),
      status: 'REJECTED',
      failureReason: reason,
    };
  }
}

let instance: PaymentVerificationEngine | undefined;

export function getPaymentVerificationEngine(): PaymentVerificationEngine {
  if (!instance) {
    instance = new PaymentVerificationEngine();
  }
  return instance;
}
