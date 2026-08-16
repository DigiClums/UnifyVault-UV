import { keccak256 } from 'viem';
import { ExtractedReceiptData } from './types';

export interface HasherResult {
  fileHash: `0x${string}`;
  ipfsCid: string;
  size?: number;
  mimeType?: string;
  ocrRawText?: string;
  extractedData?: ExtractedReceiptData;
}

export interface UploadEvidenceResponse {
  success: boolean;
  cid?: string;
  evidenceHash?: `0x${string}`;
  size?: number;
  mimeType?: string;
  error?: string;
  ocrRawText?: string;
  extractedData?: ExtractedReceiptData;
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
 * Uploads exact receipt file bytes to server-side VPS evidence endpoint
 * Runs real OCR and returns real CID, keccak256 evidenceHash, and extracted OCR data.
 */
export async function uploadReceiptEvidence(file: File): Promise<HasherResult> {
  const formData = new FormData();
  formData.append('file', file);

  let res: Response;
  try {
    res = await fetch('/api/p2p/evidence', {
      method: 'POST',
      body: formData,
    });
  } catch (networkErr: any) {
    throw new Error(
      'Receipt upload failed due to network connectivity issues. Please verify your connection and try again.',
    );
  }

  const contentType = res.headers?.get ? res.headers.get('content-type') || '' : 'application/json';
  if (contentType && !contentType.includes('application/json') && !contentType.includes('json')) {
    throw new Error(
      `Receipt OCR service is temporarily unavailable (HTTP ${res.status}). Payment proof submission blocked.`,
    );
  }

  let data: UploadEvidenceResponse;
  try {
    data = await res.json();
  } catch (parseErr) {
    throw new Error(
      'Receipt OCR service returned an unreadable response. Payment proof submission blocked.',
    );
  }

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
    ocrRawText: data.ocrRawText,
    extractedData: data.extractedData,
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
    ipfsCid: `vps-${fileHash}`,
  };
}
