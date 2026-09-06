export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import {
  recordOffchainReferral,
  getOffchainDirects,
  getOffchainUpline,
} from '../../../lib/referral/referralStore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address || !isAddress(address)) {
    return NextResponse.json({ success: false, error: 'Invalid wallet address' }, { status: 400 });
  }

  const directs = getOffchainDirects(address);
  const upline = getOffchainUpline(address);

  return NextResponse.json({
    success: true,
    address: address.toLowerCase(),
    directs,
    upline,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userAddress, referrerAddress } = body;

    if (
      !userAddress ||
      !isAddress(userAddress) ||
      !referrerAddress ||
      !isAddress(referrerAddress)
    ) {
      return NextResponse.json(
        { success: false, error: 'Valid userAddress and referrerAddress required' },
        { status: 400 },
      );
    }

    const recorded = recordOffchainReferral(userAddress, referrerAddress);

    return NextResponse.json({
      success: true,
      recorded,
      userAddress: userAddress.toLowerCase(),
      referrerAddress: referrerAddress.toLowerCase(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to record referral' },
      { status: 500 },
    );
  }
}
