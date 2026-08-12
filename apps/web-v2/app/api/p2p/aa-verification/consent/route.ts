import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { getPaymentIntentByTradeId } from '@/lib/payment/paymentIntentStore';
import { verifyWalletAuth } from '@/lib/payment/walletAuth';
import { getAAEngine } from '@/lib/verification/aa/aaEngine';

/**
 * POST /api/p2p/aa-verification/consent
 * Initiates an Account Aggregator consent request for a seller in a disputed or unverified trade.
 */
export async function POST(req: NextRequest) {
  try {
    // Production Safety Guard: Reject AA consent in production without active production AA credentials
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_MOCK_VERIFIER !== 'true' &&
      process.env.AA_INTEGRATION_MODE !== 'production'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Forbidden: Account Aggregator verification is disabled in production environments without production credentials.',
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { tradeId, userAddress, signature, timestamp } = body;

    if (!tradeId || typeof tradeId !== 'number' || tradeId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing tradeId parameter.' },
        { status: 400 },
      );
    }

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing userAddress parameter.' },
        { status: 400 },
      );
    }

    // Cryptographic Wallet Authentication Guard
    const isAuthBypassedForTest =
      process.env.NODE_ENV === 'test' && req.headers.get('x-skip-auth') === 'true';
    if (!isAuthBypassedForTest) {
      if (!signature || !timestamp) {
        return NextResponse.json(
          { success: false, error: 'Authentication failed: Signature and timestamp required.' },
          { status: 401 },
        );
      }

      const authCheck = await verifyWalletAuth({
        userAddress,
        timestamp: parseInt(timestamp, 10),
        signature,
        action: 'request-aa-consent',
        tradeId,
      });

      if (!authCheck.isValid) {
        return NextResponse.json(
          { success: false, error: `Authentication failed: ${authCheck.error}` },
          { status: 401 },
        );
      }
    }

    // Check Trade Intent & Verify Seller Authorization
    const intent = await getPaymentIntentByTradeId(tradeId);
    if (!intent) {
      return NextResponse.json(
        { success: false, error: 'Payment Intent not initialized for trade.' },
        { status: 404 },
      );
    }

    // STRICT GUARD: Buyer CANNOT initiate seller AA consent
    if (userAddress.toLowerCase() !== intent.sellerAddress.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Only the seller can initiate AA consent for their bank account.',
        },
        { status: 403 },
      );
    }

    const aaEngine = getAAEngine();
    const aaProvider = aaEngine.getAAProvider();

    const consentRes = await aaProvider.createConsentRequest({
      tradeId,
      sellerAddress: userAddress,
      sellerVpa: intent.sellerPaymentIdentifier,
      fromTimestamp: intent.createdAt,
      toTimestamp: intent.expiresAt || new Date(Date.now() + 86400000).toISOString(),
    });

    return NextResponse.json({
      success: true,
      tradeId,
      consentId: consentRes.consentId,
      status: consentRes.status,
      redirectUrl: consentRes.redirectUrl,
    });
  } catch (err: any) {
    console.error('AA consent error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error initiating AA consent.' },
      { status: 500 },
    );
  }
}
