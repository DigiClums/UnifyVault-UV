import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { verifyWalletAuth } from '../../../../../lib/payment/walletAuth';
import {
  getDisputeRecordByTradeId,
  saveDisputeRecord,
  recordAdminAuditEvent,
  addDisputeMessage,
} from '../../../../../lib/dispute/disputeChatStore';
import { AdminDisputeAction, AdminAuditEvent } from '../../../../../lib/dispute/types';

function isAuthorizedAdmin(address: string): boolean {
  const envAdmin = (
    process.env.P2P_ADMIN_ADDRESS ||
    process.env.NEXT_PUBLIC_ADMIN_ADDRESS ||
    ''
  ).toLowerCase();
  return envAdmin.length > 0 && address.toLowerCase() === envAdmin;
}

/**
 * POST /api/p2p/dispute-chat/admin-action
 * Records authorized admin investigation decision and generates immutable audit log.
 *
 * CRITICAL SECURITY INVARIANT:
 * - Admin action DOES NOT execute on-chain fund movement.
 * - MUST NEVER call confirmAndRelease() or transfer escrow tokens.
 * - On-chain release remains strictly controlled by trade.seller wallet transaction.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tradeId, userAddress, signature, timestamp, action, reason, resolutionNotes } = body;

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

    const caller = userAddress.toLowerCase();
    const isTestMode = process.env.NODE_ENV === 'test' && req.headers.get('x-skip-auth') === 'true';

    if (!isTestMode && !isAuthorizedAdmin(caller)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Only authorized admin can execute dispute resolution actions.',
        },
        { status: 403 },
      );
    }

    // Cryptographic Authentication
    if (!isTestMode) {
      const authCheck = await verifyWalletAuth({
        userAddress,
        timestamp: Number(timestamp),
        signature,
        action: 'admin-dispute-action',
        tradeId,
      });

      if (!authCheck.isValid) {
        return NextResponse.json(
          { success: false, error: `Authentication failed: ${authCheck.error}` },
          { status: 401 },
        );
      }
    }

    const disputeRecord = await getDisputeRecordByTradeId(tradeId);
    if (!disputeRecord) {
      return NextResponse.json(
        { success: false, error: `No active dispute record found for trade #${tradeId}.` },
        { status: 404 },
      );
    }

    const adminAction: AdminDisputeAction = action || 'REVIEW_EVIDENCE';
    const eventId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Create Audit Event
    const auditEvent: AdminAuditEvent = {
      eventId,
      disputeId: disputeRecord.disputeId,
      tradeId,
      adminAddress: userAddress,
      action: adminAction,
      reason: reason ? String(reason).trim() : undefined,
      timestamp: new Date().toISOString(),
    };

    await recordAdminAuditEvent(auditEvent);

    // Update Dispute Record Status
    if (adminAction === 'MARK_BUYER_FAVOURED') {
      disputeRecord.status = 'CLOSED_BUYER_FAVORED';
      disputeRecord.resolvedAt = new Date().toISOString();
      disputeRecord.resolutionNotes =
        resolutionNotes || reason || 'Admin favored buyer after evidence review.';
    } else if (adminAction === 'MARK_SELLER_FAVOURED') {
      disputeRecord.status = 'CLOSED_SELLER_FAVORED';
      disputeRecord.resolvedAt = new Date().toISOString();
      disputeRecord.resolutionNotes =
        resolutionNotes || reason || 'Admin favored seller after evidence review.';
    } else if (adminAction === 'CLOSE_DISPUTE') {
      disputeRecord.resolvedAt = new Date().toISOString();
      disputeRecord.resolutionNotes = resolutionNotes || reason || 'Dispute closed by Admin.';
    } else {
      disputeRecord.status = 'RESOLUTION_PENDING';
    }

    disputeRecord.updatedAt = new Date().toISOString();
    await saveDisputeRecord(disputeRecord);

    // Add System Chat Message for Transparency
    await addDisputeMessage({
      messageId: `msg-${Date.now()}-admin-sys`,
      tradeId,
      disputeId: disputeRecord.disputeId,
      senderAddress: userAddress,
      senderRole: 'ADMIN',
      content: `[ADMIN ACTION: ${adminAction}] ${reason ? 'Reason: ' + reason : ''} ${
        resolutionNotes ? 'Notes: ' + resolutionNotes : ''
      }`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      auditEvent,
      dispute: disputeRecord,
      statusMessage:
        'Admin audit event recorded off-chain. Note: On-chain release requires seller wallet transaction.',
    });
  } catch (err: any) {
    console.error('Admin dispute action API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error.' },
      { status: 500 },
    );
  }
}
