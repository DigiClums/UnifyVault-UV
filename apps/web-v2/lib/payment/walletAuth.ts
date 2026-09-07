import {
  verifyMessage,
  isAddress,
  hashMessage,
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  type Hex,
} from 'viem';
import { getRpcUrl, CHAIN_CONFIG } from '../../constants';

export interface WalletAuthPayload {
  userAddress: string;
  timestamp: number;
  signature: string;
  action: string; // e.g. "payment-intent" or "payment-claim" or "set-seller-upi"
  tradeId?: number;
}

export interface VerifyWalletAuthOptions {
  publicClient?: any;
}

/**
 * Standard ERC-1271 magic value: bytes4(keccak256("isValidSignature(bytes32,bytes)"))
 */
export const ERC1271_MAGIC_VALUE = '0x1626ba7e';

/**
 * Minimal ABI for ERC-1271 standard isValidSignature
 */
export const ERC1271_ABI = [
  {
    type: 'function',
    name: 'isValidSignature',
    inputs: [
      { name: 'hash', type: 'bytes32' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: 'magicValue', type: 'bytes4' }],
    stateMutability: 'view',
  },
] as const;

/**
 * Constructs canonical message string for wallet authentication signing
 */
export function constructAuthMessage(action: string, tradeId: number, timestamp: number): string {
  return `UnifyVault Authentication\nAction: ${action}\nTrade ID: ${tradeId}\nTimestamp: ${timestamp}`;
}

let defaultPublicClient: any = undefined;

function getDefaultPublicClient(): any {
  if (!defaultPublicClient) {
    defaultPublicClient = createPublicClient({
      chain: CHAIN_CONFIG,
      transport: http(getRpcUrl(), {
        timeout: 1200,
        retryCount: 0,
      }),
    });
  }
  return defaultPublicClient;
}

/**
 * Cryptographically verifies wallet control via:
 * 1. Viem verifyMessage (ECDSA / EOA)
 * 2. ERC-1271 isValidSignature (Smart Account contract validation)
 *
 * Prevents userAddress spoofing for both EOA and Smart Accounts.
 */
export async function verifyWalletAuth(
  payload: WalletAuthPayload,
  options?: VerifyWalletAuthOptions,
): Promise<{ isValid: boolean; error?: string; isSmartAccount?: boolean }> {
  const { userAddress, timestamp, signature, action, tradeId = 0 } = payload;

  if (!userAddress || !isAddress(userAddress)) {
    return { isValid: false, error: 'Invalid userAddress format.' };
  }

  if (!signature || typeof signature !== 'string' || !signature.startsWith('0x')) {
    return { isValid: false, error: 'Missing or invalid cryptographic signature.' };
  }

  // Timestamp Freshness Check (5 minute window)
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  if (isNaN(timestamp) || diff > 5 * 60 * 1000) {
    return {
      isValid: false,
      error: 'Authentication signature expired or timestamp out of bounds.',
    };
  }

  // Reconstruct canonical message string
  const message = constructAuthMessage(action, tradeId, timestamp);

  // 1. Primary path: EOA ECDSA verification
  try {
    const isAuthenticEOA = await verifyMessage({
      address: userAddress as Address,
      message,
      signature: signature as Hex,
    });

    if (isAuthenticEOA) {
      return { isValid: true, isSmartAccount: false };
    }
  } catch {
    // If EOA verification throws (e.g. non-standard signature length from Smart Account),
    // proceed to check ERC-1271 contract verification.
  }

  // 2. Secondary path: ERC-1271 Smart Account contract signature verification
  try {
    const client = options?.publicClient || getDefaultPublicClient();
    const hash = hashMessage(message);

    const magicValue = await client.readContract({
      address: userAddress as Address,
      abi: ERC1271_ABI,
      functionName: 'isValidSignature',
      args: [hash, signature as Hex],
    });

    if (magicValue === ERC1271_MAGIC_VALUE) {
      return { isValid: true, isSmartAccount: true };
    }

    return {
      isValid: false,
      error: 'Cryptographic signature verification failed (ERC-1271 invalid magic value).',
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: 'Cryptographic signature verification failed.',
    };
  }
}

export interface TradePaymentBindingMessageParams {
  chainId: number;
  escrowAddress: string;
  marketplaceOrderId: number;
  sellerAddress: string;
  paymentRail: string;
  paymentDestination: string;
  timestamp: number;
}

/**
 * Constructs canonical domain-separated message string for trade payment binding authorization
 */
export function constructTradePaymentBindingMessage(
  params: TradePaymentBindingMessageParams,
): string {
  const cleanEscrow = params.escrowAddress.toLowerCase().trim();
  const cleanSeller = params.sellerAddress.toLowerCase().trim();
  const cleanRail = (params.paymentRail || 'UPI').toUpperCase().trim();
  const cleanDestination = params.paymentDestination.toLowerCase().trim();

  return [
    'UnifyVault P2P Trade Payment Binding',
    `Chain ID: ${params.chainId}`,
    `Escrow Contract: ${cleanEscrow}`,
    `Marketplace Order ID: ${params.marketplaceOrderId}`,
    `Seller Wallet: ${cleanSeller}`,
    `Payment Rail: ${cleanRail}`,
    `Payment Destination: ${cleanDestination}`,
    `Timestamp: ${params.timestamp}`,
  ].join('\n');
}

export interface ComputeTradeBindingHashParams {
  tradeId: number;
  chainId: number;
  escrowAddress: string;
  marketplaceOrderId: number;
  takeOrderTxHash: string;
  sellerAddress: string;
  buyerAddress: string;
  paymentRail: string;
  paymentDestination: string;
}

/**
 * Computes deterministic Keccak-256 hash across all immutable binding fields
 */
export function computeTradeBindingHash(params: ComputeTradeBindingHashParams): `0x${string}` {
  const canonical = [
    `tradeId:${params.tradeId}`,
    `chainId:${params.chainId}`,
    `escrow:${params.escrowAddress.toLowerCase().trim()}`,
    `orderId:${params.marketplaceOrderId}`,
    `txHash:${params.takeOrderTxHash.toLowerCase().trim()}`,
    `seller:${params.sellerAddress.toLowerCase().trim()}`,
    `buyer:${params.buyerAddress.toLowerCase().trim()}`,
    `rail:${(params.paymentRail || 'UPI').toUpperCase().trim()}`,
    `destination:${params.paymentDestination.toLowerCase().trim()}`,
  ].join('|');

  return hashMessage(canonical);
}

export interface VerifyTradePaymentBindingAuthParams {
  sellerAddress: string;
  signature: string;
  signatureTimestamp: number;
  chainId: number;
  escrowAddress: string;
  marketplaceOrderId: number;
  paymentRail: string;
  paymentDestination: string;
}

/**
 * Cryptographically verifies seller's trade payment binding authorization
 * Supporting both EOA ECDSA and ERC-1271 Smart Accounts
 */
export async function verifyTradePaymentBindingAuth(
  params: VerifyTradePaymentBindingAuthParams,
  options?: VerifyWalletAuthOptions,
): Promise<{ isValid: boolean; error?: string; isSmartAccount?: boolean }> {
  const {
    sellerAddress,
    signature,
    signatureTimestamp,
    chainId,
    escrowAddress,
    marketplaceOrderId,
    paymentRail,
    paymentDestination,
  } = params;

  if (!sellerAddress || !isAddress(sellerAddress)) {
    return { isValid: false, error: 'Invalid sellerAddress format.' };
  }

  if (!signature || typeof signature !== 'string' || !signature.startsWith('0x')) {
    return { isValid: false, error: 'Missing or invalid cryptographic signature.' };
  }

  const now = Date.now();
  const diff = Math.abs(now - signatureTimestamp);
  if (isNaN(signatureTimestamp) || diff > 5 * 60 * 1000) {
    return {
      isValid: false,
      error: 'Authentication signature expired or timestamp out of bounds.',
    };
  }

  const message = constructTradePaymentBindingMessage({
    chainId,
    escrowAddress,
    marketplaceOrderId,
    sellerAddress,
    paymentRail,
    paymentDestination,
    timestamp: signatureTimestamp,
  });

  // 1. Primary path: EOA ECDSA verification
  try {
    const isAuthenticEOA = await verifyMessage({
      address: sellerAddress as Address,
      message,
      signature: signature as Hex,
    });

    if (isAuthenticEOA) {
      return { isValid: true, isSmartAccount: false };
    }
  } catch {
    // Proceed to ERC-1271
  }

  // 2. Secondary path: ERC-1271 Smart Account contract signature verification
  try {
    const client = options?.publicClient || getDefaultPublicClient();
    const hash = hashMessage(message);

    const magicValue = await client.readContract({
      address: sellerAddress as Address,
      abi: ERC1271_ABI,
      functionName: 'isValidSignature',
      args: [hash, signature as Hex],
    });

    if (magicValue === ERC1271_MAGIC_VALUE) {
      return { isValid: true, isSmartAccount: true };
    }

    return {
      isValid: false,
      error: 'Cryptographic signature verification failed (ERC-1271 invalid magic value).',
    };
  } catch {
    return {
      isValid: false,
      error: 'Cryptographic signature verification failed.',
    };
  }
}
