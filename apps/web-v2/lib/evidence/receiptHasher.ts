import { keccak256 } from 'viem';

export interface HasherResult {
  fileHash: `0x${string}`;
  ipfsCid: string;
  size?: number;
  mimeType?: string;
}

export interface UploadEvidenceResponse {
  success: boolean;
  cid?: string;
  evidenceHash?: `0x${string}`;
  size?: number;
  mimeType?: string;
  error?: string;
}

/**
 * Computes deterministic Keccak256 file hash from exact receipt bytes
 */
export function computeReceiptKeccak256(
  fileBytes: Uint8Array | ArrayBuffer | string,
): `0x${string}` {
  let bytes: Uint8Array;

  if (typeof fileBytes === 'string') {
    bytes = new TextEncoder().encode(fileBytes);
  } else if (fileBytes instanceof ArrayBuffer) {
    bytes = new Uint8Array(fileBytes);
  } else {
    bytes = fileBytes;
  }

  return keccak256(bytes);
}

/**
 * Uploads exact receipt file bytes to server-side W3UP/IPFS endpoint
 * Returns real CID and keccak256 evidenceHash. Throws if upload fails.
 */
export async function uploadReceiptEvidence(file: File): Promise<HasherResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/p2p/evidence', {
    method: 'POST',
    body: formData,
  });

  const data: UploadEvidenceResponse = await res.json();

  if (!res.ok || !data.success || !data.cid || !data.evidenceHash) {
    throw new Error(
      data.error ||
        `Evidence upload failed with status ${res.status}. Payment proof submission blocked.`,
    );
  }

  return {
    fileHash: data.evidenceHash,
    ipfsCid: data.cid,
    size: data.size || file.size,
    mimeType: data.mimeType || file.type,
  };
}

/**
 * Keccak256 hash helper compatible with existing pipeline
 */
export async function computeReceiptHashes(
  fileBytes: Uint8Array | ArrayBuffer | string,
): Promise<HasherResult> {
  const fileHash = computeReceiptKeccak256(fileBytes);
  return {
    fileHash,
    ipfsCid: '', // Empty until uploaded to real W3UP/IPFS
  };
}
