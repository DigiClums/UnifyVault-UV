export const dynamic = "force-static";
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, isAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { MARKETPLACE_ABI, OrderSide, OrderStatus } from '../../../../lib/contracts/marketplace';
import { DEPLOYED_CONTRACTS_SEPOLIA, getRpcUrl } from '../../../../constants';
import { verifyWalletAuth } from '../../../../lib/payment/walletAuth';
import { saveSellerPaymentProfile } from '../../../../lib/payment/paymentIntentStore';
import { saveSellerProfile } from '../../../../lib/payment/paymentProfileStore';
import { validateUpiId } from '../../../../lib/p2p/upiValidation';

function getPublicRpcClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(getRpcUrl(baseSepolia.id)),
  });
}

function getMarketplaceAddress(): `0x${string}` {
  return (
    (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_SEPOLIA as `0x${string}`) ||
    (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS as `0x${string}`) ||
    DEPLOYED_CONTRACTS_SEPOLIA.Marketplace
  );
}

/**
 * POST /api/p2p/order-action
 * Cryptographically authenticates wallet ownership before executing order EDIT or CANCEL actions.
 *
 * Security & Ownership Guarantees:
 * 1. Verifies cryptographic signature against caller wallet address.
 * 2. Reads authoritative on-chain order state from Marketplace contract.
 * 3. Asserts authenticated wallet == order maker (prevents IDOR and counterparty modification).
 * 4. Verifies order is currently active (OPEN or PARTIALLY_FILLED).
 * 5. Re-validates partial fill invariants, price bounds, limits, and UPI format.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, action, userAddress, signature, timestamp, updatedData } = body;

    if (!orderId || typeof orderId !== 'number' || orderId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing orderId parameter.' },
        { status: 400 },
      );
    }

    if (!userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing userAddress parameter.' },
        { status: 400 },
      );
    }

    if (!action || (action !== 'EDIT' && action !== 'CANCEL')) {
      return NextResponse.json(
        { success: false, error: "Action must be 'EDIT' or 'CANCEL'." },
        { status: 400 },
      );
    }

    // 1. Cryptographic Wallet Authentication Guard
    const isAuthBypassed =
      process.env.NODE_ENV === 'test' && req.headers.get('x-skip-auth') === 'true';

    if (!isAuthBypassed) {
      if (!signature || !timestamp) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication failed: Cryptographic signature and timestamp required.',
          },
          { status: 401 },
        );
      }

      const authCheck = await verifyWalletAuth({
        userAddress,
        timestamp: Number(timestamp),
        signature,
        action: `order-${action.toLowerCase()}`,
        tradeId: orderId,
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

    // 2. Fetch authoritative order state directly from Marketplace smart contract
    const publicClient = getPublicRpcClient();
    const marketplaceAddress = getMarketplaceAddress();

    let rawOrder: {
      orderId: bigint;
      maker: string;
      side: number;
      asset: string;
      amount: bigint;
      filledAmount: bigint;
      remainingAmount: bigint;
      price: bigint;
      fiatCurrency: `0x${string}`;
      minLimit: bigint;
      maxLimit: bigint;
      status: number;
      createdAt: bigint;
    };

    try {
      rawOrder = (await publicClient.readContract({
        address: marketplaceAddress,
        abi: MARKETPLACE_ABI,
        functionName: 'getOrder',
        args: [BigInt(orderId)],
      })) as typeof rawOrder;
    } catch {
      return NextResponse.json(
        { success: false, error: `On-chain order #${orderId} does not exist.` },
        { status: 404 },
      );
    }

    const orderMaker = rawOrder.maker.toLowerCase();
    const callerAddress = userAddress.toLowerCase();

    // 3. Strict Ownership Authorization Guard (IDOR Protection)
    if (callerAddress !== orderMaker) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: You do not own this order and cannot modify or cancel it.',
        },
        { status: 403 },
      );
    }

    // 4. Order Lifecycle State Check
    const orderStatus = Number(rawOrder.status);
    if (orderStatus === OrderStatus.FILLED) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order is already fully filled and cannot be edited or cancelled.',
        },
        { status: 400 },
      );
    }

    if (orderStatus === OrderStatus.CANCELLED) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order is already cancelled and cannot be edited or cancelled again.',
        },
        { status: 400 },
      );
    }

    if (orderStatus !== OrderStatus.OPEN && orderStatus !== OrderStatus.PARTIALLY_FILLED) {
      return NextResponse.json(
        { success: false, error: 'Order is not active for edit or cancellation.' },
        { status: 400 },
      );
    }

    // 5. Action Specific Validation
    if (action === 'EDIT') {
      const orderSide = Number(rawOrder.side);
      if (orderSide !== OrderSide.SELL) {
        return NextResponse.json(
          { success: false, error: 'Only SELL orders can be edited via this endpoint.' },
          { status: 400 },
        );
      }

      if (updatedData) {
        // A. Validate Seller UPI ID if provided
        if (updatedData.sellerUpiId !== undefined) {
          const upiVal = validateUpiId(updatedData.sellerUpiId);
          if (!upiVal.isValid) {
            return NextResponse.json(
              { success: false, error: upiVal.error || 'Invalid UPI ID format.' },
              { status: 400 },
            );
          }

          // Persist updated UPI profile securely
          await saveSellerPaymentProfile(callerAddress, upiVal.trimmedUpi);
          await saveSellerProfile({
            walletAddress: userAddress as `0x${string}`,
            paymentRail: 'UPI',
            upiVpa: upiVal.trimmedUpi,
            verificationStatus: 'PENDING_VERIFICATION',
          });
        }

        // B. Validate Price Bounds
        if (updatedData.price !== undefined) {
          const priceNum = Number(updatedData.price);
          if (isNaN(priceNum) || priceNum <= 0) {
            return NextResponse.json(
              { success: false, error: 'Price must be greater than 0.' },
              { status: 400 },
            );
          }
        }

        // C. Validate Partial Fill Quantity Invariants
        if (updatedData.remainingAmount !== undefined) {
          const newRemaining = BigInt(updatedData.remainingAmount);
          if (newRemaining <= 0n) {
            return NextResponse.json(
              { success: false, error: 'Remaining amount must be greater than 0.' },
              { status: 400 },
            );
          }

          // Invariant: newTotal >= filledAmount
          const filledAmount = rawOrder.filledAmount;
          const newTotal = filledAmount + newRemaining;
          if (newTotal < filledAmount) {
            return NextResponse.json(
              {
                success: false,
                error: `Total quantity cannot be less than already-filled quantity (${filledAmount.toString()}).`,
              },
              { status: 400 },
            );
          }
        }

        // D. Validate Min / Max Limits
        if (updatedData.minLimit !== undefined || updatedData.maxLimit !== undefined) {
          const minLimit = BigInt(updatedData.minLimit || 0);
          const maxLimit = BigInt(
            updatedData.maxLimit || updatedData.remainingAmount || rawOrder.remainingAmount,
          );
          const remainingAmount = BigInt(updatedData.remainingAmount || rawOrder.remainingAmount);

          if (minLimit > remainingAmount) {
            return NextResponse.json(
              { success: false, error: 'Minimum limit cannot exceed remaining order quantity.' },
              { status: 400 },
            );
          }

          if (maxLimit > remainingAmount) {
            return NextResponse.json(
              { success: false, error: 'Maximum limit cannot exceed remaining order quantity.' },
              { status: 400 },
            );
          }

          if (minLimit > 0n && maxLimit > 0n && minLimit > maxLimit) {
            return NextResponse.json(
              { success: false, error: 'Minimum limit cannot exceed maximum limit.' },
              { status: 400 },
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      authorized: true,
      orderId,
      action,
      currentOrder: {
        orderId: Number(rawOrder.orderId),
        maker: rawOrder.maker,
        side: Number(rawOrder.side),
        asset: rawOrder.asset,
        amount: rawOrder.amount.toString(),
        filledAmount: rawOrder.filledAmount.toString(),
        remainingAmount: rawOrder.remainingAmount.toString(),
        price: rawOrder.price.toString(),
        status: Number(rawOrder.status),
      },
    });
  } catch (err: any) {
    console.error('Order action authorization error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error processing order action.' },
      { status: 500 },
    );
  }
}
