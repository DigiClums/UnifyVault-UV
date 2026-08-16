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
 * POST /api/p2p/payment-confirm
 * Cryptographically authenticates SELLER wallet and marks payment as seller-confirmed off-chain.
 *
 * CRITICAL SECURITY GUARANTEES:
 * - MUST NEVER call confirmAndRelease() or release escrow.
 * - MUST NEVER perform blockchain transfers or write transactions.
 * - ONLY the seller's connected web3 wallet can execute confirmAndRelease() on-chain.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tradeId, userAddress, signature, timestamp, action, confirmationReference } = body;

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

    // 1. Cryptographic Wallet Authentication Guard
    const isAuthBypassedForTest =
      process.env.NODE_ENV === 'test' && req.headers.get('x-skip-auth') === 'true';
    if (!isAuthBypassedForTest) {
      if (!signature || !timestamp) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Authentication failed: Signature and timestamp required for payment confirmation.',
          },
          { status: 401 },
        );
      }

      const authCheck = await verifyWalletAuth({
        userAddress,
        timestamp: Number(timestamp),
        signature,
        action: action || 'payment-confirm',
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

    // 2. On-Chain Trade State Verification directly from P2PEscrow
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
    const seller = rawTrade.seller.toLowerCase();

    // 3. Authorization: Only seller can confirm payment receipt
    if (caller !== seller) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Only the designated seller can confirm payment receipt.',
        },
        { status: 403 },
      );
    }

    // 4. On-Chain Trade State Check: Must be in PAYMENT_SUBMITTED state (state == 3)
    const tradeState = Number(rawTrade.state);
    if (tradeState !== 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trade must be in PAYMENT_SUBMITTED state before seller can confirm payment.',
        },
        { status: 400 },
      );
    }

    // 5. Retrieve Payment Intent Record
    const intent = await getPaymentIntentByTradeId(tradeId);
    if (!intent) {
      return NextResponse.json(
        { success: false, error: 'Payment intent record not initialized for trade.' },
        { status: 400 },
      );
    }

    if (intent.status === 'RELEASE_ELIGIBLE' || intent.status === 'SELLER_CONFIRMED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment claim has already been confirmed by seller.',
        },
        { status: 400 },
      );
    }

    // 6. Update Intent State: WAITING_VERIFICATION / PAYMENT_CLAIMED -> SELLER_CONFIRMED / RELEASE_ELIGIBLE
    intent.status = 'RELEASE_ELIGIBLE';
    intent.sellerConfirmedAt = new Date().toISOString();
    if (confirmationReference) {
      intent.confirmationReference = String(confirmationReference).trim();
    }

    await savePaymentIntent(intent);

    return NextResponse.json({
      success: true,
      paymentIntent: intent,
      status: 'RELEASE_ELIGIBLE',
      statusMessage:
        'Seller confirmed payment receipt off-chain. Escrow release is eligible via seller wallet transaction.',
    });
  } catch (err: any) {
    console.error('Payment confirm API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error processing payment confirmation.' },
      { status: 500 },
    );
  }
}
