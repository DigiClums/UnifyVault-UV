export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, hexToString, formatUnits, isAddress } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { P2P_ESCROW_ABI } from '../../../../lib/contracts/escrow';
import {
  DEPLOYED_CONTRACTS_MAINNET,
  DEPLOYED_CONTRACTS_SEPOLIA,
  getDefaultChainId,
  getRpcUrl,
} from '../../../../constants';
import {
  savePaymentIntent,
  getPaymentIntentByTradeId,
  generateTradeReference,
  generateUpiUri,
} from '../../../../lib/payment/paymentIntentStore';
import { getTradePaymentBinding } from '../../../../lib/payment/tradeBindingStore';
import { verifyWalletAuth } from '../../../../lib/payment/walletAuth';
import { PaymentIntent } from '../../../../lib/payment/types';

function getPublicRpcClient(chainId: number) {
  const rpc = getRpcUrl(chainId);
  const chain = chainId === baseSepolia.id ? baseSepolia : base;
  return createPublicClient({
    chain,
    transport: http(rpc, {
      timeout: 15000,
      retryCount: 2,
    }),
  });
}

function getP2PEscrowAddress(chainId: number): `0x${string}` {
  if (chainId === baseSepolia.id) {
    return (
      (process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_SEPOLIA as `0x${string}`) ||
      (process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS as `0x${string}`) ||
      DEPLOYED_CONTRACTS_SEPOLIA.P2PEscrow
    );
  }
  return (
    (process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS_MAINNET as `0x${string}`) ||
    (process.env.NEXT_PUBLIC_P2P_ESCROW_ADDRESS as `0x${string}`) ||
    DEPLOYED_CONTRACTS_MAINNET.P2PEscrow
  );
}

/**
 * POST /api/p2p/payment-intent
 * Cryptographically authenticates wallet, creates/retrieves Payment Intent, and returns standard UPI URI.
 *
 * Security Protections:
 * 1. Cryptographic signature verification prevents userAddress spoofing.
 * 2. Unrelated wallets cannot access another trade's payment intent.
 * 3. Payment destination is derived SOLELY and IMMUTABLY from per-trade TradePaymentBinding.
 *    Client parameters or mutable seller profile CANNOT override the bound payment destination.
 * 4. Payment Intent core fields are immutable once created.
 * 5. Fails closed (400) if an active trade lacks an authoritative TradePaymentBinding.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tradeId, userAddress, signature, timestamp } = body;

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
        action: body.action || 'payment-intent',
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

    const reqChainId = body.chainId;
    const targetChainId = reqChainId || getDefaultChainId();
    if (targetChainId !== base.id && targetChainId !== baseSepolia.id) {
      return NextResponse.json(
        { success: false, error: `Unsupported network (Chain ID: ${targetChainId}).` },
        { status: 400 },
      );
    }

    // 2. Fetch trusted trade state directly from P2PEscrow contract via RPC
    const publicClient = getPublicRpcClient(targetChainId);
    const escrowAddress = getP2PEscrowAddress(targetChainId);

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

    // 4. Escrow State Verification
    const tradeState = Number(rawTrade.state);
    if (tradeState >= 5) {
      return NextResponse.json(
        { success: false, error: 'Trade has already been completed, refunded, or cancelled.' },
        { status: 400 },
      );
    }

    // 5. Authoritative Per-Trade Payment Binding Resolution
    const tradeBinding = await getTradePaymentBinding(tradeId);

    // If trade is in state 1 (CREATED) and not funded yet, ensure it is not blocked if caller is seller
    if (!tradeBinding) {
      return NextResponse.json(
        {
          success: false,
          error: `Authoritative payment binding not found for trade #${tradeId}. Payment intent requires a signed trade payment binding.`,
        },
        { status: 400 },
      );
    }

    // 6. Payment Window Expiry Check
    const fundingTs = Number(rawTrade.fundingTimestamp);
    const windowSecs = Number(rawTrade.paymentWindow);
    const nowSecs = Math.floor(Date.now() / 1000);

    if (fundingTs > 0 && nowSecs > fundingTs + windowSecs && tradeState === 2) {
      return NextResponse.json(
        { success: false, error: 'Payment window for this trade has expired.' },
        { status: 400 },
      );
    }

    // 7. Payment Intent Retrieval & Authoritative Binding Enforcement
    const existingIntent = await getPaymentIntentByTradeId(tradeId);

    // Sole authoritative payment destination is the immutable TradePaymentBinding
    const sellerPaymentIdentifier = tradeBinding.paymentDestination;
    let reference: string;
    let expiresAt: string;
    let fiatAmountStr: string;
    let currencyStr: string;

    if (existingIntent) {
      reference = existingIntent.reference;
      expiresAt = existingIntent.expiresAt;
      fiatAmountStr = existingIntent.fiatAmount;
      currencyStr = existingIntent.fiatCurrency;
    } else {
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

    // Construct standard URL-encoded UPI Intent payload using immutable binding payee
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
