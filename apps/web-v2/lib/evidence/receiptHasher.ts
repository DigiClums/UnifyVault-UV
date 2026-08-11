import { keccak256, toHex } from 'viem';

export interface HasherResult {
  fileHash: `0x${string}`;
  ipfsCid: string;
}

/**
 * Computes deterministic Keccak256 file hash and IPFS CID v1 reference hash from receipt bytes
 */
export async function computeReceiptHashes(
  fileBytes: Uint8Array | ArrayBuffer | string,
): Promise<HasherResult> {
  let bytes: Uint8Array;

  if (typeof fileBytes === 'string') {
    bytes = new TextEncoder().encode(fileBytes);
  } else if (fileBytes instanceof ArrayBuffer) {
    bytes = new Uint8Array(fileBytes);
  } else {
    bytes = fileBytes;
  }

  // 1. Keccak256 hash (on-chain commitment anchor)
  const fileHash = keccak256(bytes);

  // 2. Deterministic IPFS CID v1 hash simulator (bafy...)
  const rawHashHex = fileHash.slice(2, 34); // First 16 bytes hex
  const ipfsCid = `bafybeig${rawHashHex.toLowerCase()}p2pescrowevidence`;

  return {
    fileHash,
    ipfsCid,
  };
}
