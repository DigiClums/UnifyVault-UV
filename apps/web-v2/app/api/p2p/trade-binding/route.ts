export const dynamic = 'force-static';
import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  http,
  isAddress,
  decodeEventLog,
  encodeEventTopics,
  type Address,
  type Hex,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { P2P_ESCROW_ABI } from '../../../../lib/contracts/escrow';
import { MARKETPLACE_ABI } from '../../../../lib/contracts/marketplace';
import {
  DEPLOYED_CONTRACTS_MAINNET,
  DEPLOYED_CONTRACTS_SEPOLIA,
  getDefaultChainId,
  getRpcUrl,
} from '../../../../constants';
import {
  saveTradePaymentBinding,
  getTradePaymentBinding,
} from '../../../../lib/payment/tradeBindingStore';
import {
  verifyTradePaymentBindingAuth,
  verifyWalletAuth,
  computeTradeBindingHash,
} from '../../../../lib/payment/walletAuth';
import { validateUpiId } from '../../../../lib/p2p/upiValidation';
import { TradePaymentBinding } from '../../../../lib/payment/types';

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

function getDeployedEscrowAddress(chainId: number): `0x${string}` {
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

function getDeployedMarketplaceAddress(chainId: number): `0x${string}` {
  if (chainId === baseSepolia.id) {
    return (
      (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_SEPOLIA as `0x${string}`) ||
      (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS as `0x${string}`) ||
      DEPLOYED_CONTRACTS_SEPOLIA.Marketplace
    );
  }
  return (
    (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_MAINNET as `0x${string}`) ||
    (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS as `0x${string}`) ||
    DEPLOYED_CONTRACTS_MAINNET.Marketplace
  );
}

/**
 * POST /api/p2p/trade-binding
 * Creates an immutable, write-once trade payment binding.
 *
 * Authoritative Security Verifications:
 * 1. Resolves on-chain trade from P2PEscrow contract via RPC.
 * 2. Resolves transaction receipt and verifies correlation: takeOrderTxHash -> Marketplace.takeOrder() -> escrowTradeId.
 * 3. Cryptographically verifies seller's domain-separated signature against on-chain trade.seller.
 * 4. Atomically commits AES-256-GCM encrypted binding record.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tradeId,
      marketplaceOrderId,
      takeOrderTxHash,
      paymentRail = 'UPI',
      paymentDestination,
      signature,
      signatureTimestamp,
      chainId: reqChainId,
    } = body;

    // 1. Parameter Validation
    if (!tradeId || typeof tradeId !== 'number' || tradeId <= 0 || !Number.isInteger(tradeId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing tradeId parameter.' },
        { status: 400 },
      );
    }

    if (
      !marketplaceOrderId ||
      typeof marketplaceOrderId !== 'number' ||
      marketplaceOrderId <= 0 ||
      !Number.isInteger(marketplaceOrderId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing marketplaceOrderId parameter.' },
        { status: 400 },
      );
    }

    if (
      !takeOrderTxHash ||
      typeof takeOrderTxHash !== 'string' ||
      !/^0x[a-fA-F0-9]{64}$/.test(takeOrderTxHash)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing takeOrderTxHash format.' },
        { status: 400 },
      );
    }

    if (!paymentDestination || typeof paymentDestination !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing paymentDestination.' },
        { status: 400 },
      );
    }

    if (!signature || typeof signature !== 'string' || !signature.startsWith('0x')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid cryptographic signature.' },
        { status: 401 },
      );
    }

    if (!signatureTimestamp || typeof signatureTimestamp !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid signatureTimestamp.' },
        { status: 401 },
      );
    }

    // 2. Validate Payment Destination Format (UPI VPA)
    const upiCheck = validateUpiId(paymentDestination);
    if (!upiCheck.isValid) {
      return NextResponse.json(
        { success: false, error: upiCheck.error || 'Invalid UPI ID format.' },
        { status: 400 },
      );
    }
    const normalizedDestination = upiCheck.trimmedUpi;

    // 3. Resolve Chain & Canonical Deployment Addresses
    const targetChainId = reqChainId || getDefaultChainId();
    if (targetChainId !== base.id && targetChainId !== baseSepolia.id) {
      return NextResponse.json(
        { success: false, error: `Unsupported network (Chain ID: ${targetChainId}).` },
        { status: 400 },
      );
    }

    const escrowAddress = getDeployedEscrowAddress(targetChainId);
    const marketplaceAddress = getDeployedMarketplaceAddress(targetChainId);
    const publicClient = getPublicRpcClient(targetChainId);

    // 4. On-Chain Trade Verification
    let rawTrade: {
      tradeId: bigint;
      buyer: string;
      seller: string;
      asset: string;
      amount: bigint;
      fiatAmount: bigint;
      fiatCurrency: `0x${string}`;
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
        { success: false, error: `On-chain trade #${tradeId} does not exist or failed to load.` },
        { status: 404 },
      );
    }

    if (!rawTrade || Number(rawTrade.tradeId) === 0 || rawTrade.amount === 0n) {
      return NextResponse.json(
        { success: false, error: `On-chain trade #${tradeId} is not initialized.` },
        { status: 404 },
      );
    }

    const authoritativeSeller = rawTrade.seller as `0x${string}`;
    const authoritativeBuyer = rawTrade.buyer as `0x${string}`;

    // 5. On-Chain Transaction Receipt & Correlation Check
    let receipt: any = null;
    try {
      receipt = await publicClient.getTransactionReceipt({
        hash: takeOrderTxHash as Hex,
      });
    } catch {
      return NextResponse.json(
        { success: false, error: `Transaction ${takeOrderTxHash} receipt not found on chain.` },
        { status: 400 },
      );
    }

    if (!receipt || receipt.status !== 'success') {
      return NextResponse.json(
        { success: false, error: `Transaction ${takeOrderTxHash} failed or reverted on chain.` },
        { status: 400 },
      );
    }

    // Verify event logs in receipt correlate to escrowTradeId
    let isTxCorrelated = false;
    const escrowTradeLinkedTopic0 = encodeEventTopics({
      abi: MARKETPLACE_ABI,
      eventName: 'EscrowTradeLinked',
    })[0]?.toLowerCase();

    for (const log of receipt.logs || []) {
      const topic0 = log.topics?.[0]?.toLowerCase();
      if (topic0 === escrowTradeLinkedTopic0) {
        try {
          const decoded = decodeEventLog({
            abi: MARKETPLACE_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'EscrowTradeLinked' && decoded.args) {
            const rawEventTradeId =
              (decoded.args as any).tradeId ?? (decoded.args as any).escrowTradeId;
            const rawEventBuyOrderId = (decoded.args as any).buyOrderId;
            const rawEventSeller = (decoded.args as any).seller;

            const matchesTradeId =
              rawEventTradeId !== undefined && Number(rawEventTradeId) === tradeId;
            const matchesOrderId =
              rawEventBuyOrderId !== undefined &&
              (Number(rawEventBuyOrderId) === marketplaceOrderId ||
                Number(rawEventBuyOrderId) === 0);
            const matchesSeller =
              !rawEventSeller || rawEventSeller.toLowerCase() === authoritativeSeller.toLowerCase();

            if (matchesTradeId && matchesOrderId && matchesSeller) {
              isTxCorrelated = true;
              break;
            }
          }
        } catch {
          // Fallback parsing from topics: topics[1]=matchId, topics[2]=tradeId
          if (log.topics && log.topics.length >= 3 && log.topics[2]) {
            try {
              const topicTradeId = Number(BigInt(log.topics[2]));
              if (topicTradeId === tradeId) {
                isTxCorrelated = true;
                break;
              }
            } catch {}
          }
        }
      }
    }

    if (!isTxCorrelated) {
      return NextResponse.json(
        {
          success: false,
          error: `Transaction ${takeOrderTxHash} does not correlate to trade #${tradeId} and order #${marketplaceOrderId}.`,
        },
        { status: 400 },
      );
    }

    // 6. Cryptographic Seller Signature Verification
    const authCheck = await verifyTradePaymentBindingAuth(
      {
        sellerAddress: authoritativeSeller,
        signature,
        signatureTimestamp,
        chainId: targetChainId,
        escrowAddress,
        marketplaceOrderId,
        paymentRail,
        paymentDestination: normalizedDestination,
      },
      { publicClient },
    );

    if (!authCheck.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: `Authentication failed: ${authCheck.error || 'Invalid seller signature'}`,
        },
        { status: 401 },
      );
    }

    // 7. Compute Deterministic Canonical Binding Hash
    const bindingHash = computeTradeBindingHash({
      tradeId,
      chainId: targetChainId,
      escrowAddress,
      marketplaceOrderId,
      takeOrderTxHash,
      sellerAddress: authoritativeSeller,
      buyerAddress: authoritativeBuyer,
      paymentRail: 'UPI',
      paymentDestination: normalizedDestination,
    });

    // 8. Construct Immutable Trade Payment Binding Record
    const bindingRecord: TradePaymentBinding = {
      tradeId,
      chainId: targetChainId,
      escrowAddress,
      marketplaceOrderId,
      takeOrderTxHash: takeOrderTxHash as `0x${string}`,
      sellerAddress: authoritativeSeller,
      buyerAddress: authoritativeBuyer,
      paymentRail: 'UPI',
      paymentDestination: normalizedDestination,
      sellerSignature: signature as `0x${string}`,
      signatureTimestamp,
      bindingHash,
      createdAt: new Date().toISOString(),
    };

    // 9. Persist to Encrypted Filesystem Store
    const saveResult = await saveTradePaymentBinding(bindingRecord);

    return NextResponse.json(
      {
        success: true,
        binding: saveResult.binding,
        isIdempotent: saveResult.isIdempotent,
      },
      { status: saveResult.isIdempotent ? 200 : 201 },
    );
  } catch (err: unknown) {
    console.error('Trade payment binding POST error:', err);
    const message =
      err instanceof Error ? err.message : 'Server error creating trade payment binding.';
    const isConflict = message.includes('Conflict:');
    return NextResponse.json(
      { success: false, error: message },
      { status: isConflict ? 409 : 500 },
    );
  }
}

/**
 * GET /api/p2p/trade-binding?tradeId=123&userAddress=0x...&signature=0x...&timestamp=...
 * Serves trade payment binding ONLY to cryptographically authenticated trade participants.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tradeIdStr = searchParams.get('tradeId');
    const userAddress = searchParams.get('userAddress');
    const signature = searchParams.get('signature');
    const timestampStr = searchParams.get('timestamp');
    const reqChainId = searchParams.get('chainId');

    if (!tradeIdStr || !userAddress || !isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid tradeId or userAddress parameter.' },
        { status: 400 },
      );
    }

    const tradeId = parseInt(tradeIdStr, 10);
    if (isNaN(tradeId) || tradeId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid tradeId parameter.' },
        { status: 400 },
      );
    }

    if (!signature || !timestampStr) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed: Signature and timestamp required.' },
        { status: 401 },
      );
    }

    const timestamp = parseInt(timestampStr, 10);
    const authCheck = await verifyWalletAuth({
      userAddress,
      timestamp,
      signature,
      action: 'get-trade-binding',
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

    // Retrieve Binding from Store
    const binding = await getTradePaymentBinding(tradeId);

    if (!binding) {
      return NextResponse.json(
        { success: false, error: `Trade payment binding not found for trade #${tradeId}.` },
        { status: 404 },
      );
    }

    const caller = userAddress.toLowerCase();
    const buyer = binding.buyerAddress.toLowerCase();
    const seller = binding.sellerAddress.toLowerCase();

    // Authorization Guard: Caller MUST be buyer or seller
    if (caller !== buyer && caller !== seller) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Private trade binding is accessible only to trade participants.',
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      binding,
    });
  } catch (err: unknown) {
    console.error('Trade payment binding GET error:', err);
    const message =
      err instanceof Error ? err.message : 'Server error fetching trade payment binding.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
