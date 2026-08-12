import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { getVerificationResultByTradeId } from '../../../../lib/verification/verificationStore';
import { getPaymentIntentByTradeId } from '../../../../lib/payment/paymentIntentStore';
import { verifyWalletAuth } from '../../../../lib/payment/walletAuth';

/**
 * GET /api/p2p/payment-verification?tradeId=123&userAddress=0x...&signature=0x...&timestamp=...
 * Serves payment verification status and attestation ONLY to authenticated trade participants.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tradeIdStr = searchParams.get('tradeId');
    const userAddress = searchParams.get('userAddress');
    const signature = searchParams.get('signature');
    const timestampStr = searchParams.get('timestamp');

    if (!tradeIdStr || !userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid tradeId or userAddress parameters.' },
        { status: 400 },
      );
    }

    const tradeId = parseInt(tradeIdStr, 10);

    // Cryptographic Wallet Authentication Guard
    const isAuthBypassedForTest =
      process.env.NODE_ENV === 'test' && req.headers.get('x-skip-auth') === 'true';
    if (!isAuthBypassedForTest) {
      if (!signature || !timestampStr) {
        return NextResponse.json(
          { success: false, error: 'Authentication failed: Signature and timestamp required.' },
          { status: 401 },
        );
      }

      const authCheck = await verifyWalletAuth({
        userAddress,
        timestamp: parseInt(timestampStr, 10),
        signature,
        action: 'get-verification',
        tradeId,
      });

      if (!authCheck.isValid) {
        return NextResponse.json(
          { success: false, error: `Authentication failed: ${authCheck.error}` },
          { status: 401 },
        );
      }
    }

    // Check Intent for participant validation
    const intent = await getPaymentIntentByTradeId(tradeId);
    if (!intent) {
      return NextResponse.json(
        { success: false, error: 'Payment Intent not initialized for trade.' },
        { status: 404 },
      );
    }

    const caller = userAddress.toLowerCase();
    const buyer = intent.buyerAddress.toLowerCase();
    const seller = intent.sellerAddress.toLowerCase();

    if (caller !== buyer && caller !== seller) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Verification results are private to trade participants.',
        },
        { status: 403 },
      );
    }

    // Retrieve Verification Record
    const verification = await getVerificationResultByTradeId(tradeId);

    if (!verification) {
      return NextResponse.json({
        success: true,
        tradeId,
        status: 'WAITING_VERIFICATION',
        statusMessage: 'Payment verification has not been completed by provider yet.',
      });
    }

    // Sanitize output for security
    const safeResult = {
      verificationId: verification.verificationId,
      tradeId: verification.tradeId,
      paymentIntentId: verification.paymentIntentId,
      provider: verification.provider,
      providerReference: verification.providerReference,
      verifiedAmount: verification.verifiedAmount,
      verifiedCurrency: verification.verifiedCurrency,
      verifiedAt: verification.verifiedAt,
      status: verification.status,
      failureReason: verification.failureReason,
      attestationSignature: verification.attestationSignature,
      isReleaseEligible: verification.status === 'VERIFIED',
    };

    return NextResponse.json({
      success: true,
      verificationResult: safeResult,
    });
  } catch (err: any) {
    console.error('Payment verification GET error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error fetching verification result.' },
      { status: 500 },
    );
  }
}
