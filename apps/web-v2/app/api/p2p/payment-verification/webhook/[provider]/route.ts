import { NextRequest, NextResponse } from 'next/server';
import { getPaymentVerificationEngine } from '../../../../../../lib/verification/verificationEngine';
import { BankWebhookVerificationProvider } from '../../../../../../lib/verification/providers/bankWebhookProvider';

/**
 * POST /api/p2p/payment-verification/webhook/[provider]
 * Production Webhook Ingestion Endpoint for Payment Providers / Bank APIs.
 *
 * Security:
 * - Validates provider HMAC-SHA256 signature and timestamp freshness.
 * - Enforces replay protection (idempotent reference consumption).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider: rawProviderName } = await params;
    const providerName = rawProviderName.toUpperCase();
    const rawBody = await req.text();

    const signature = req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-webhook-timestamp') || '';

    // 1. Authenticate Webhook Payload for Bank Webhook Provider
    if (providerName.includes('BANK')) {
      const bankProvider = new BankWebhookVerificationProvider();
      const isAuthentic = bankProvider.verifyWebhookAuthenticity(rawBody, {
        signature,
        timestamp,
      });

      if (!isAuthentic) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized: Invalid webhook signature or expired timestamp.',
          },
          { status: 401 },
        );
      }
    }

    let bodyData: any;
    try {
      bodyData = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON webhook payload.' },
        { status: 400 },
      );
    }

    const { tradeId, providerReference, creditAmount, creditCurrency, payeeIdentifier } = bodyData;

    if (!tradeId || typeof tradeId !== 'number' || tradeId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing tradeId parameter in webhook body.' },
        { status: 400 },
      );
    }

    if (!providerReference || typeof providerReference !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing providerReference parameter in webhook body.' },
        { status: 400 },
      );
    }

    // 2. Invoke Payment Verification Engine
    const engine = getPaymentVerificationEngine();
    const verificationResult = await engine.processVerification({
      tradeId,
      providerName,
      providerReference,
      rawPayload: {
        ...bodyData,
        isSignatureValid: true,
      },
    });

    return NextResponse.json({
      success: true,
      verificationResult,
    });
  } catch (err: any) {
    console.error('Webhook ingestion error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error ingesting webhook.' },
      { status: 500 },
    );
  }
}
