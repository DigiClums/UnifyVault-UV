export const dynamic = "force-static";
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, isAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { P2P_ESCROW_ABI } from '../../../../lib/contracts/escrow';
import { DEPLOYED_CONTRACTS_SEPOLIA, getRpcUrl } from '../../../../constants';
import {
  getPaymentIntentByTradeId,
  savePaymentIntent,
} from '../../../../lib/payment/paymentIntentStore';
import { verifyWalletAuth } from '../../../../lib/payment/walletAuth';

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
 * POST /api/p2p/payment-claim
 * Cryptographically authenticates buyer wallet, records payment claim declaration off-chain.
 *
 * CRITICAL SECURITY GUARANTEES:
 * - MUST NEVER call confirmAndRelease() or release escrow.
 * - MUST NEVER set status to PAYMENT_VERIFIED.
 * - Serves strictly as an off-chain buyer declaration.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tradeId, userAddress, signature, timestamp, utr, evidenceHash } = body;

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

    if (!utr || typeof utr !== 'string' || utr.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payment claim requires a valid UTR / bank reference number.' },
        { status: 400 },
      );
    }

    // 1. Cryptographic Wallet Authentication Guard
    const isAuthBypassedForTest =
      process.env.NODE_ENV === 'test' && req.headers.get('x-skip-auth') === 'true';
    if (!isAuthBypassedForTest) {
      if (!signature || !timestamp) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication failed: Signature and timestamp required for payment claim.',
          },
          { status: 401 },
        );
      }

      const authCheck = await verifyWalletAuth({
        userAddress,
        timestamp: Number(timestamp),
        signature,
        action: 'payment-claim',
        tradeId,
      });

      if (!authCheck.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: `Authentication failed: ${authCheck.error || 'Invalid signature'}`,
          },
          { status: 401 },
        );
      }
    }

    // 2. On-Chain Trade State Verification
    const publicClient = getPublicRpcClient();
    const escrowAddress = getP2PEscrowAddress();

    let rawTrade: {
      buyer: string;
      seller: string;
      state: number;
    };

    try {
      rawTrade = (await publicClient.readContract({
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'getTrade',
        args: [BigInt(tradeId)],
      })) as typeof rawTrade;
    } catch {
      return NextResponse.json(
        { success: false, error: `Trade #${tradeId} does not exist on-chain.` },
        { status: 404 },
      );
    }

    const caller = userAddress.toLowerCase();
    const buyer = rawTrade.buyer.toLowerCase();

    // 3. Authorization: Only buyer can declare payment claim
    if (caller !== buyer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Only the designated buyer can submit a payment claim.',
        },
        { status: 403 },
      );
    }

    // 4. Trade State Check: Must be in CREATED or FUNDED state (state 1 or 2)
    const tradeState = Number(rawTrade.state);
    if (tradeState < 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trade must be created before submitting a payment claim.',
        },
        { status: 400 },
      );
    }

    if (tradeState >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot claim payment on a completed, refunded, or cancelled trade.',
        },
        { status: 400 },
      );
    }

    // 5. Retrieve Intent Record
    const intent = await getPaymentIntentByTradeId(tradeId);
    if (!intent) {
      return NextResponse.json(
        { success: false, error: 'Payment intent record not initialized for trade.' },
        { status: 400 },
      );
    }

    // 6. Update Intent State: QR_READY -> PAYMENT_CLAIMED -> WAITING_VERIFICATION
    intent.status = 'WAITING_VERIFICATION';
    intent.paymentClaimedAt = new Date().toISOString();
    intent.utrSubmitted = utr.trim().toUpperCase();
    if (evidenceHash) intent.evidenceHashSubmitted = String(evidenceHash);

    await savePaymentIntent(intent);

    return NextResponse.json({
      success: true,
      paymentIntent: intent,
      status: 'WAITING_VERIFICATION',
      statusMessage: 'Payment claim registered off-chain. Waiting for independent verification.',
    });
  } catch (err: any) {
    console.error('Payment claim API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error processing payment claim.' },
      { status: 500 },
    );
  }
}
