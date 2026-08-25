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
import {
  saveDisputeRecord,
  addDisputeMessage,
  getDisputeRecordByTradeId,
} from '../../../../lib/dispute/disputeChatStore';
import { DisputeRecord } from '../../../../lib/dispute/types';

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

const ALLOWED_REASONS = [
  'PAYMENT_NOT_RECEIVED',
  'WRONG_AMOUNT',
  'WRONG_DESTINATION',
  'SUSPICIOUS_PAYMENT',
  'DUPLICATE_PAYMENT',
  'OTHER',
];

/**
 * POST /api/p2p/payment-dispute
 * Cryptographically authenticates SELLER wallet and registers off-chain dispute record.
 *
 * CRITICAL SECURITY GUARANTEES:
 * - MUST NEVER call confirmAndRelease() or release escrow.
 * - MUST NEVER call refund() or alter EVM escrow balances.
 * - Serves strictly to flag trade for off-chain arbitration and open dispute chat workspace.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tradeId,
      userAddress,
      signature,
      timestamp,
      action,
      reason,
      sellerRemarks,
      evidenceHash,
    } = body;

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

    if (!reason || !ALLOWED_REASONS.includes(reason)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid dispute reason. Must be one of: ${ALLOWED_REASONS.join(', ')}`,
        },
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
            error: 'Authentication failed: Signature and timestamp required for opening dispute.',
          },
          { status: 401 },
        );
      }

      const authCheck = await verifyWalletAuth({
        userAddress,
        timestamp: Number(timestamp),
        signature,
        action: action || 'payment-dispute',
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

    // 3. Authorization: Only seller can initiate dispute in this endpoint
    if (caller !== seller) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Only the designated seller can open a payment dispute.',
        },
        { status: 403 },
      );
    }

    // 4. On-Chain Trade State Check: Must be in FUNDED state (state == 2)
    const tradeState = Number(rawTrade.state);
    if (tradeState !== 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trade must be in FUNDED state before opening a dispute.',
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

    // Check existing dispute record
    const existingDispute = await getDisputeRecordByTradeId(tradeId);
    if (existingDispute) {
      return NextResponse.json(
        {
          success: false,
          error: `Dispute already exists for trade #${tradeId} (Dispute ID: ${existingDispute.disputeId}).`,
        },
        { status: 400 },
      );
    }

    // 6. Create Dispute Record & System Event
    const disputeId = `disp-${tradeId}-${Date.now()}`;
    const disputeRecord: DisputeRecord = {
      disputeId,
      tradeId,
      buyerAddress: rawTrade.buyer,
      sellerAddress: rawTrade.seller,
      status: 'DISPUTE_OPEN',
      openedBy: 'SELLER',
      reason,
      evidenceHash: evidenceHash ? String(evidenceHash) : undefined,
      sellerRemarks: sellerRemarks ? String(sellerRemarks).trim() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveDisputeRecord(disputeRecord);

    // Initial System Message in Dispute Chat Workspace
    await addDisputeMessage({
      messageId: `msg-${Date.now()}-sys`,
      tradeId,
      disputeId,
      senderAddress: 'SYSTEM',
      senderRole: 'SYSTEM',
      content: `Dispute opened by Seller. Reason: ${reason}. ${sellerRemarks ? 'Remarks: ' + sellerRemarks : ''}`,
      evidenceHash: evidenceHash ? String(evidenceHash) : undefined,
      timestamp: new Date().toISOString(),
    });

    // Update Intent State: PAYMENT_CLAIMED / WAITING_VERIFICATION -> PAYMENT_DISPUTED
    intent.status = 'PAYMENT_DISPUTED';
    await savePaymentIntent(intent);

    return NextResponse.json({
      success: true,
      dispute: disputeRecord,
      paymentIntent: intent,
      status: 'DISPUTE_OPEN',
      statusMessage:
        'Payment dispute opened off-chain. Private dispute chat workspace initialized.',
    });
  } catch (err: any) {
    console.error('Payment dispute API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error opening payment dispute.' },
      { status: 500 },
    );
  }
}
