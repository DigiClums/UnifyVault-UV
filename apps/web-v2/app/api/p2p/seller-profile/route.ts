import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { saveSellerProfile, getSellerProfile } from '../../../../lib/payment/paymentProfileStore';
import { verifyWalletAuth } from '../../../../lib/payment/walletAuth';

/**
 * POST /api/p2p/seller-profile
 * Creates or updates a seller's payment profile.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userAddress,
      paymentRail,
      upiVpa,
      accountHolderName,
      bankAccountReference,
      signature,
      timestamp,
    } = body;

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing seller wallet address.' },
        { status: 400 },
      );
    }

    if (!upiVpa || typeof upiVpa !== 'string' || !upiVpa.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Invalid UPI VPA format.' },
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
        action: 'save-seller-profile',
      });

      if (!authCheck.isValid) {
        return NextResponse.json(
          { success: false, error: `Authentication failed: ${authCheck.error}` },
          { status: 401 },
        );
      }
    }

    const savedProfile = await saveSellerProfile({
      walletAddress: userAddress as `0x${string}`,
      paymentRail: paymentRail || 'UPI',
      upiVpa,
      accountHolderName,
      bankAccountReference,
      verificationStatus: 'PENDING_VERIFICATION',
    });

    return NextResponse.json({
      success: true,
      profile: {
        walletAddress: savedProfile.walletAddress,
        paymentRail: savedProfile.paymentRail,
        verificationStatus: savedProfile.verificationStatus,
        updatedAt: savedProfile.updatedAt,
      },
    });
  } catch (err: any) {
    console.error('Seller profile save error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error saving seller profile.' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/p2p/seller-profile?userAddress=0x...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid userAddress parameter.' },
        { status: 400 },
      );
    }

    const profile = await getSellerProfile(userAddress);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Seller payment profile not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        walletAddress: profile.walletAddress,
        paymentRail: profile.paymentRail,
        verificationStatus: profile.verificationStatus,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (err: any) {
    console.error('Seller profile fetch error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error fetching profile.' },
      { status: 500 },
    );
  }
}
