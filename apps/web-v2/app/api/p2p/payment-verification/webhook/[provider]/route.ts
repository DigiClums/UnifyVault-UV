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
    // Production Safety Guard: Reject all bank webhook ingestion in production
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_VERIFIER !== 'true') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Bank webhook integration is disabled in production. UnifyVault P2P does not rely on bank APIs or webhooks.',
        },
        { status: 403 },
      );
    }

    const { provider: rawProviderName } = await params;
    const providerName = rawProviderName.toUpperCase();
    const rawBody = await req.text();

    const signature = req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-webhook-timestamp') || '';

    // 1. Provider Registration Guard: Reject unregistered / untrusted providers immediately
    const engine = getPaymentVerificationEngine();
    const provider = engine.getProvider(providerName);

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: `Forbidden: Verification provider '${providerName}' is not registered or supported.`,
        },
        { status: 403 },
      );
    }

    // 2. Mandatory Webhook Authentication Guard for all providers
    const isAuthentic =
      typeof provider.verifyWebhookAuthenticity === 'function'
        ? provider.verifyWebhookAuthenticity(rawBody, { signature, timestamp })
        : false;

    if (!isAuthentic) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid webhook signature or expired/missing timestamp.',
        },
        { status: 401 },
      );
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

    // 3. Invoke Payment Verification Engine
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
