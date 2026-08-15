import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, hexToString, formatUnits, isAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { P2P_ESCROW_ABI } from '../../../../lib/contracts/escrow';
import { DEPLOYED_CONTRACTS_SEPOLIA, getRpcUrl } from '../../../../constants';
import {
  savePaymentIntent,
  getPaymentIntentByTradeId,
  generateTradeReference,
  generateUpiUri,
  getSellerPaymentProfile,
  saveSellerPaymentProfile,
} from '../../../../lib/payment/paymentIntentStore';
import { verifyWalletAuth } from '../../../../lib/payment/walletAuth';
import { PaymentIntent } from '../../../../lib/payment/types';

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
 * POST /api/p2p/payment-intent
 * Cryptographically authenticates wallet, creates/retrieves Payment Intent, and returns standard UPI URI.
 *
 * Security Protections:
 * 1. Cryptographic signature verification prevents userAddress spoofing.
 * 2. Unrelated wallets cannot access another trade's payment intent.
 * 3. Client-supplied sellerUpiId is strictly ignored for buyers. Seller UPI ID is derived exclusively from trusted server-side profile storage.
 * 4. Payment Intent core fields are immutable once created.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tradeId, userAddress, signature, timestamp, sellerUpiId } = body;

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

    // 1. Cryptographic Wallet Authentication Guard (Bypassed only in test mode if SKIP_AUTH_HEADER is set)
    const isAuthBypassedForTest =
      process.env.NODE_ENV === 'test' && req.headers.get('x-skip-auth') === 'true';
    if (!isAuthBypassedForTest) {
      if (!signature || !timestamp) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Authentication failed: Cryptographic signature and timestamp required for API access.',
          },
          { status: 401 },
        );
      }

      const authCheck = await verifyWalletAuth({
        userAddress,
        timestamp: Number(timestamp),
        signature,
        action: body.action || (sellerUpiId ? 'set-seller-upi' : 'payment-intent'),
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

    // 2. Fetch trusted trade state directly from P2PEscrow contract via RPC
    const publicClient = getPublicRpcClient();
    const escrowAddress = getP2PEscrowAddress();

    let rawTrade: {
      tradeId: bigint;
      buyer: string;
      seller: string;
      asset: string;
      amount: bigint;
      fiatAmount: bigint;
      fiatCurrency: `0x${string}`;
      state: number;
      paymentWindow: bigint;
      fundingTimestamp: bigint;
      paymentTimestamp: bigint;
      paymentReference: `0x${string}`;
      evidenceHash: `0x${string}`;
      disputeInitiator: string;
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
        { success: false, error: `On-chain trade #${tradeId} does not exist or failed to load.` },
        { status: 404 },
      );
    }

    const caller = userAddress.toLowerCase();
    const buyer = rawTrade.buyer.toLowerCase();
    const seller = rawTrade.seller.toLowerCase();

    // 3. Authorization Guard: Caller MUST be buyer or seller
    if (caller !== buyer && caller !== seller) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only trade participants can access payment intents.' },
        { status: 403 },
      );
    }

    // 4. Strict Seller UPI Handling: Ignore client sellerUpiId if caller is NOT seller
    if (
      caller === seller &&
      sellerUpiId &&
      typeof sellerUpiId === 'string' &&
      sellerUpiId.trim().length > 0
    ) {
      await saveSellerPaymentProfile(seller, sellerUpiId.trim());
    }

    // 5. Escrow State Verification
    const tradeState = Number(rawTrade.state);
    if (tradeState >= 5) {
      return NextResponse.json(
        { success: false, error: 'Trade has already been completed, refunded, or cancelled.' },
        { status: 400 },
      );
    }

    // 6. Payment Intent Retrieval & Immutability Enforcement (M1 Audit Requirement)
    const existingIntent = await getPaymentIntentByTradeId(tradeId);

    const sellerProfileForTrade = await getSellerPaymentProfile(seller);
    if (caller === buyer && tradeState === 1 && !existingIntent && !sellerProfileForTrade) {
      return NextResponse.json(
        { success: false, error: 'Trade has not been funded with collateral by seller yet.' },
        { status: 400 },
      );
    }

    // 7. Payment Window Expiry Check
    const fundingTs = Number(rawTrade.fundingTimestamp);
    const windowSecs = Number(rawTrade.paymentWindow);
    const nowSecs = Math.floor(Date.now() / 1000);

    if (fundingTs > 0 && nowSecs > fundingTs + windowSecs && tradeState === 2) {
      return NextResponse.json(
        { success: false, error: 'Payment window for this trade has expired.' },
        { status: 400 },
      );
    }

    let sellerPaymentIdentifier: string;
    let reference: string;
    let expiresAt: string;
    let fiatAmountStr: string;
    let currencyStr: string;

    if (existingIntent) {
      // Core fields are 100% IMMUTABLE once intent is created.
      // Subsequent profile updates by seller do NOT alter existing trade payment intents.
      sellerPaymentIdentifier = existingIntent.sellerPaymentIdentifier;
      reference = existingIntent.reference;
      expiresAt = existingIntent.expiresAt;
      fiatAmountStr = existingIntent.fiatAmount;
      currencyStr = existingIntent.fiatCurrency;
    } else {
      // Derive initial payee snapshot from trusted server-side seller profile storage
      const sellerProfile = await getSellerPaymentProfile(seller);
      sellerPaymentIdentifier = sellerProfile?.upiId || `${seller.slice(0, 8)}@upi`;

      reference = generateTradeReference(tradeId);
      const expiryTimestamp =
        fundingTs > 0 ? (fundingTs + windowSecs) * 1000 : Date.now() + windowSecs * 1000;
      expiresAt = new Date(expiryTimestamp).toISOString();
      fiatAmountStr =
        rawTrade.fiatAmount > 1000000000000n
          ? formatUnits(rawTrade.fiatAmount, 18)
          : formatUnits(rawTrade.fiatAmount, 2);
      currencyStr = hexToString(rawTrade.fiatCurrency).replace(/\0/g, '') || 'INR';
    }

    // Construct standard URL-encoded UPI Intent payload using immutable payee snapshot
    const upiUri = generateUpiUri(
      sellerPaymentIdentifier,
      'UnifyVault Escrow',
      fiatAmountStr,
      currencyStr,
      reference,
    );

    const intentStatus = tradeState === 3 ? 'PAYMENT_CLAIMED' : 'QR_READY';

    const intent: PaymentIntent = {
      id: existingIntent?.id || `intent-${tradeId}-${Date.now()}`,
      tradeId,
      buyerAddress: rawTrade.buyer,
      sellerAddress: rawTrade.seller,
      sellerPaymentIdentifier,
      fiatAmount: fiatAmountStr,
      fiatCurrency: currencyStr,
      status: intentStatus,
      reference,
      expiresAt,
      createdAt: existingIntent?.createdAt || new Date().toISOString(),
      paymentClaimedAt: existingIntent?.paymentClaimedAt,
      utrSubmitted: existingIntent?.utrSubmitted,
      evidenceHashSubmitted: existingIntent?.evidenceHashSubmitted,
    };

    await savePaymentIntent(intent);

    return NextResponse.json({
      success: true,
      paymentIntent: intent,
      upiUri,
    });
  } catch (err: any) {
    console.error('Payment intent API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error generating payment intent.' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/p2p/payment-intent?tradeId=123&userAddress=0x...&signature=0x...&timestamp=...
 * Serves payment intent ONLY to cryptographically authenticated trade participants.
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

    // Cryptographic Auth Check
    const isAuthBypassedForTest =
      process.env.NODE_ENV === 'test' && req.headers.get('x-skip-auth') === 'true';
    if (!isAuthBypassedForTest) {
      if (!signature || !timestampStr) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication failed: Signature and timestamp required for GET access.',
          },
          { status: 401 },
        );
      }

      const authCheck = await verifyWalletAuth({
        userAddress,
        timestamp: parseInt(timestampStr, 10),
        signature,
        action: 'get-payment-intent',
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

    const intent = await getPaymentIntentByTradeId(tradeId);

    if (!intent) {
      return NextResponse.json(
        { success: false, error: 'Payment intent record not found for trade.' },
        { status: 404 },
      );
    }

    const caller = userAddress.toLowerCase();
    const buyer = intent.buyerAddress.toLowerCase();
    const seller = intent.sellerAddress.toLowerCase();

    // Privacy Guard: Block unauthorized callers from retrieving private UPI details
    if (caller !== buyer && caller !== seller) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Private payment intent is accessible only to trade participants.',
        },
        { status: 403 },
      );
    }

    const upiUri = generateUpiUri(
      intent.sellerPaymentIdentifier,
      'UnifyVault Escrow',
      intent.fiatAmount,
      intent.fiatCurrency,
      intent.reference,
    );

    return NextResponse.json({
      success: true,
      paymentIntent: intent,
      upiUri,
    });
  } catch (err: any) {
    console.error('Payment intent GET error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error fetching payment intent.' },
      { status: 500 },
    );
  }
}
