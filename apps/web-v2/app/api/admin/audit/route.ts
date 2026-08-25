export const dynamic = "force-static";
import { NextRequest, NextResponse } from 'next/server';
import {
  readAdminAuditRecords,
  appendAdminAuditRecord,
} from '../../../../lib/admin/adminMigrationStore';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chainIdParam = searchParams.get('chainId');
    const chainId = chainIdParam ? Number(chainIdParam) : 84532;

    const records = await readAdminAuditRecords(chainId);
    return NextResponse.json({ success: true, records });
  } catch (err: any) {
    console.error('[API /admin/audit GET] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      chainId,
      oldAdmin,
      newAdmin,
      contractName,
      contractAddress,
      roleName,
      roleIdentifier,
      grantTxHash,
      grantBlockNumber,
      grantVerified,
      revokeTxHash,
      revokeBlockNumber,
      revokeVerified,
      status,
    } = body;

    if (!chainId || !oldAdmin || !newAdmin || !contractAddress || !roleIdentifier) {
      return NextResponse.json(
        { success: false, error: 'Missing required audit fields' },
        { status: 400 },
      );
    }

    const newRecord = {
      chainId,
      oldAdmin,
      newAdmin,
      contractName,
      contractAddress,
      roleName,
      roleIdentifier,
      grantTxHash,
      grantBlockNumber,
      grantVerified: !!grantVerified,
      revokeTxHash,
      revokeBlockNumber,
      revokeVerified: !!revokeVerified,
      timestamp: Date.now(),
      status: status || 'completed',
    };

    await appendAdminAuditRecord(newRecord);
    return NextResponse.json({ success: true, record: newRecord });
  } catch (err: any) {
    console.error('[API /admin/audit POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500 },
    );
  }
}
