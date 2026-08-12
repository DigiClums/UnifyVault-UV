import { signTypedData, recoverTypedDataAddress, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { VerificationResult } from './types';

export const ATTESTATION_TYPES = {
  Attestation: [
    { name: 'tradeId', type: 'uint256' },
    { name: 'paymentIntentId', type: 'string' },
    { name: 'verifiedAmount', type: 'string' },
    { name: 'verifiedCurrency', type: 'string' },
    { name: 'sellerRecipient', type: 'string' },
    { name: 'provider', type: 'string' },
    { name: 'providerReference', type: 'string' },
    { name: 'verifiedAt', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

export function getAttestationDomain(escrowAddress: string, chainId: number = 84532) {
  return {
    name: 'UnifyVault Verification Attestation',
    version: '1',
    chainId,
    verifyingContract: escrowAddress as `0x${string}`,
  };
}

/**
 * Generates an EIP-712 signed verification attestation from the trusted verification service
 */
export async function generateSignedAttestation(
  result: VerificationResult,
  escrowAddress: string,
  chainId: number = 84532,
  signerPrivateKey?: string,
): Promise<string> {
  const privateKey =
    signerPrivateKey ||
    process.env.VERIFIER_SIGNER_PRIVATE_KEY ||
    '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f3623f8'; // Default dev key

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const domain = getAttestationDomain(escrowAddress, chainId);

  const verifiedAtTimestamp = Math.floor(new Date(result.verifiedAt).getTime() / 1000);
  const nonce = keccak256(
    toBytes(`${result.tradeId}:${result.paymentIntentId}:${result.providerReference}`),
  );

  const message = {
    tradeId: BigInt(result.tradeId),
    paymentIntentId: result.paymentIntentId,
    verifiedAmount: result.verifiedAmount,
    verifiedCurrency: result.verifiedCurrency,
    sellerRecipient: result.verifiedRecipient,
    provider: result.provider,
    providerReference: result.providerReference,
    verifiedAt: BigInt(verifiedAtTimestamp),
    nonce,
  };

  const signature = await account.signTypedData({
    domain,
    types: ATTESTATION_TYPES,
    primaryType: 'Attestation',
    message,
  });

  return signature;
}

/**
 * Cryptographically verifies an EIP-712 verification attestation signature.
 * Prevents cross-trade, cross-chain, and recipient substitution attacks.
 */
export async function verifySignedAttestation(
  result: VerificationResult,
  signature: string,
  escrowAddress: string,
  chainId: number = 84532,
  expectedSignerAddress?: string,
): Promise<boolean> {
  try {
    const domain = getAttestationDomain(escrowAddress, chainId);
    const verifiedAtTimestamp = Math.floor(new Date(result.verifiedAt).getTime() / 1000);
    const nonce = keccak256(
      toBytes(`${result.tradeId}:${result.paymentIntentId}:${result.providerReference}`),
    );

    const message = {
      tradeId: BigInt(result.tradeId),
      paymentIntentId: result.paymentIntentId,
      verifiedAmount: result.verifiedAmount,
      verifiedCurrency: result.verifiedCurrency,
      sellerRecipient: result.verifiedRecipient,
      provider: result.provider,
      providerReference: result.providerReference,
      verifiedAt: BigInt(verifiedAtTimestamp),
      nonce,
    };

    const recoveredAddress = await recoverTypedDataAddress({
      domain,
      types: ATTESTATION_TYPES,
      primaryType: 'Attestation',
      message,
      signature: signature as `0x${string}`,
    });

    if (expectedSignerAddress) {
      return recoveredAddress.toLowerCase() === expectedSignerAddress.toLowerCase();
    }

    return recoveredAddress !== '0x0000000000000000000000000000000000000000';
  } catch (err) {
    console.error('Error verifying EIP-712 attestation:', err);
    return false;
  }
}
