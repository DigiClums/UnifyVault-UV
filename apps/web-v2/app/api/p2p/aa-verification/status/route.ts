export const dynamic = "force-static";
import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { getPaymentIntentByTradeId } from '@/lib/payment/paymentIntentStore';
import { verifyWalletAuth } from '@/lib/payment/walletAuth';
import { getAAEngine } from '@/lib/verification/aa/aaEngine';

/**
 * GET /api/p2p/aa-verification/status?tradeId=123&consentId=...&userAddress=0x...&signature=0x...&timestamp=...
 * Serves AA consent status & triggers bank statement verification safely.
 */
export async function GET(req: NextRequest) {
  try {
    // Production Safety Guard: Reject AA status in production without active production AA credentials
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

    const { searchParams } = new URL(req.url);
    const tradeIdStr = searchParams.get('tradeId');
    const consentId = searchParams.get('consentId');
    const userAddress = searchParams.get('userAddress');
    const signature = searchParams.get('signature');
    const timestampStr = searchParams.get('timestamp');

    if (!tradeIdStr || !consentId || !userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Missing tradeId, consentId, or userAddress parameter.' },
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
        action: 'get-aa-status',
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
        { success: false, error: 'Forbidden: AA status is private to trade participants.' },
        { status: 403 },
      );
    }

    const aaEngine = getAAEngine();
    const matchRes = await aaEngine.matchAndVerifyAATransactions({
      tradeId,
      consentId,
    });

    return NextResponse.json({
      success: true,
      tradeId,
      consentStatus: matchRes.consentStatus,
      verificationResult: matchRes.verificationResult
        ? {
            verificationId: matchRes.verificationResult.verificationId,
            status: matchRes.verificationResult.status,
            verifiedAmount: matchRes.verificationResult.verifiedAmount,
            verifiedCurrency: matchRes.verificationResult.verifiedCurrency,
            verifiedAt: matchRes.verificationResult.verifiedAt,
            attestationSignature: matchRes.verificationResult.attestationSignature,
            isReleaseEligible: matchRes.verificationResult.status === 'VERIFIED',
          }
        : undefined,
    });
  } catch (err: any) {
    console.error('AA status GET error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error checking AA status.' },
      { status: 500 },
    );
  }
}
