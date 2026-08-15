import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, isAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { P2P_ESCROW_ABI } from '../../../../../lib/contracts/escrow';
import { DEPLOYED_CONTRACTS_SEPOLIA, getRpcUrl } from '../../../../../constants';
import { verifyWalletAuth } from '../../../../../lib/payment/walletAuth';
import {
  getDisputeMessagesByTradeId,
  addDisputeMessage,
  getDisputeRecordByTradeId,
} from '../../../../../lib/dispute/disputeChatStore';
import { DisputeSenderRole, DisputeMessage } from '../../../../../lib/dispute/types';

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

function isAuthorizedAdmin(address: string): boolean {
  const envAdmin = (
    process.env.P2P_ADMIN_ADDRESS ||
    process.env.NEXT_PUBLIC_ADMIN_ADDRESS ||
    '0xd905920c91853039060246Ed5724AA72B91a96DA'
  ).toLowerCase();
  return envAdmin.length > 0 && address.toLowerCase() === envAdmin;
}

/**
 * GET /api/p2p/dispute-chat/messages?tradeId=X&userAddress=Y&signature=Z&timestamp=T
 * Returns private dispute chat transcript for authorized participants (buyer, seller, admin).
 * Enforces cryptographic wallet ownership proof via verifyWalletAuth().
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tradeIdStr = searchParams.get('tradeId');
    const userAddress = searchParams.get('userAddress') || req.headers.get('x-user-address');
    const signature = searchParams.get('signature') || req.headers.get('x-signature');
    const timestampStr = searchParams.get('timestamp') || req.headers.get('x-timestamp');
    const action =
      searchParams.get('action') || req.headers.get('x-action') || 'dispute-chat-message';

    if (!tradeIdStr || isNaN(Number(tradeIdStr))) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid tradeId.' },
        { status: 400 },
      );
    }
    const tradeId = Number(tradeIdStr);

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid userAddress.' },
        { status: 400 },
      );
    }

    // 1. Cryptographic Authentication & Wallet Ownership Proof
    const isAuthBypassedForTest =
      process.env.NODE_ENV === 'test' && req.headers.get('x-skip-auth') === 'true';
    if (!isAuthBypassedForTest) {
      if (!signature || !timestampStr) {
        return NextResponse.json(
          { success: false, error: 'Signature and timestamp required for dispute chat access.' },
          { status: 401 },
        );
      }

      const timestamp = Number(timestampStr);
      const authCheck = await verifyWalletAuth({
        userAddress,
        timestamp,
        signature,
        action,
        tradeId,
      });

      if (!authCheck.isValid) {
        return NextResponse.json(
          { success: false, error: `Authentication failed: ${authCheck.error}` },
          { status: 401 },
        );
      }
    }

    // 2. Read trade from contract to verify participant identity BEFORE fetching sensitive chat data
    const publicClient = getPublicRpcClient();
    const escrowAddress = getP2PEscrowAddress();

    let rawTrade: { buyer: string; seller: string };
    try {
      rawTrade = (await publicClient.readContract({
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'getTrade',
        args: [BigInt(tradeId)],
      })) as typeof rawTrade;
    } catch {
      return NextResponse.json(
        { success: false, error: `Trade #${tradeId} not found.` },
        { status: 404 },
      );
    }

    const caller = userAddress.toLowerCase();
    const isBuyer = caller === rawTrade.buyer.toLowerCase();
    const isSeller = caller === rawTrade.seller.toLowerCase();
    const isAdmin = isAuthorizedAdmin(caller);

    if (!isBuyer && !isSeller && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unauthorized: Private dispute chat is restricted to trade participants and authorized admins.',
        },
        { status: 403 },
      );
    }

    // 3. Authorization Succeeded -> Read private messages
    const messages = await getDisputeMessagesByTradeId(tradeId);
    const disputeRecord = await getDisputeRecordByTradeId(tradeId);

    return NextResponse.json({
      success: true,
      tradeId,
      dispute: disputeRecord,
      messages,
    });
  } catch (err: any) {
    console.error('Dispute chat GET error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error.' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/p2p/dispute-chat/messages
 * Appends an immutable dispute chat message.
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
      content,
      evidenceHash,
      evidenceUrl,
    } = body;

    if (!tradeId || typeof tradeId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid tradeId.' },
        { status: 400 },
      );
    }

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid userAddress.' },
        { status: 400 },
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message content cannot be empty.' },
        { status: 400 },
      );
    }

    // 1. Cryptographic Authentication
    const isAuthBypassedForTest =
      process.env.NODE_ENV === 'test' && req.headers.get('x-skip-auth') === 'true';
    if (!isAuthBypassedForTest) {
      if (!signature || !timestamp) {
        return NextResponse.json(
          { success: false, error: 'Signature and timestamp required.' },
          { status: 401 },
        );
      }

      const authCheck = await verifyWalletAuth({
        userAddress,
        timestamp: Number(timestamp),
        signature,
        action: action || 'dispute-chat-message',
        tradeId,
      });

      if (!authCheck.isValid) {
        return NextResponse.json(
          { success: false, error: `Authentication failed: ${authCheck.error}` },
          { status: 401 },
        );
      }
    }

    // 2. Read trade to determine participant role
    const publicClient = getPublicRpcClient();
    const escrowAddress = getP2PEscrowAddress();

    let rawTrade: { buyer: string; seller: string };
    try {
      rawTrade = (await publicClient.readContract({
        address: escrowAddress,
        abi: P2P_ESCROW_ABI,
        functionName: 'getTrade',
        args: [BigInt(tradeId)],
      })) as typeof rawTrade;
    } catch {
      return NextResponse.json(
        { success: false, error: `Trade #${tradeId} not found.` },
        { status: 404 },
      );
    }

    const caller = userAddress.toLowerCase();
    const isBuyer = caller === rawTrade.buyer.toLowerCase();
    const isSeller = caller === rawTrade.seller.toLowerCase();
    const isAdmin = isAuthorizedAdmin(caller);

    if (!isBuyer && !isSeller && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Only trade participants or admins can post dispute messages.',
        },
        { status: 403 },
      );
    }

    let role: DisputeSenderRole = 'SYSTEM';
    if (isBuyer) role = 'BUYER';
    else if (isSeller) role = 'SELLER';
    else if (isAdmin) role = 'ADMIN';

    const disputeRecord = await getDisputeRecordByTradeId(tradeId);
    const disputeId = disputeRecord?.disputeId || `disp-${tradeId}-active`;

    const newMsg: DisputeMessage = {
      messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tradeId,
      disputeId,
      senderAddress: userAddress,
      senderRole: role,
      content: content.trim(),
      evidenceHash: evidenceHash ? String(evidenceHash) : undefined,
      evidenceUrl: evidenceUrl ? String(evidenceUrl) : undefined,
      timestamp: new Date().toISOString(),
    };

    await addDisputeMessage(newMsg);

    return NextResponse.json({
      success: true,
      message: newMsg,
    });
  } catch (err: any) {
    console.error('Dispute chat POST error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error.' },
      { status: 500 },
    );
  }
}
