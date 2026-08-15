import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { VerificationResult } from './types';
import { encryptData, decryptData } from '../payment/encryption';

/**
 * Returns canonical VPS verification storage root directory with mode 0o700
 */
export function getVerificationStorageRoot(): string {
  const envRoot = process.env.P2P_VERIFICATION_ROOT;
  if (envRoot) {
    if (!fs.existsSync(envRoot)) {
      fs.mkdirSync(envRoot, { recursive: true, mode: 0o700 });
    }
    return envRoot;
  }

  const defaultRoot = '/var/lib/unifyvault/p2p-verifications';
  try {
    if (!fs.existsSync(defaultRoot)) {
      fs.mkdirSync(defaultRoot, { recursive: true, mode: 0o700 });
    }
    return defaultRoot;
  } catch {
    const fallbackRoot = path.join(process.cwd(), 'var', 'p2p-verifications');
    if (!fs.existsSync(fallbackRoot)) {
      fs.mkdirSync(fallbackRoot, { recursive: true, mode: 0o700 });
    }
    return fallbackRoot;
  }
}

/**
 * Checks whether a providerReference has already been consumed by any trade (Replay Protection)
 */
export async function isProviderReferenceConsumed(
  provider: string,
  providerReference: string,
): Promise<boolean> {
  if (!provider || !providerReference) return false;

  const root = getVerificationStorageRoot();
  const refHash = crypto
    .createHash('sha256')
    .update(`${provider.toUpperCase()}:${providerReference.trim()}`)
    .digest('hex');

  const filePath = path.resolve(root, `provider-ref-${refHash}.json`);
  const resolvedRoot = path.resolve(root);

  if (!filePath.startsWith(resolvedRoot)) return true; // Path traversal attempt

  return fs.existsSync(filePath);
}

/**
 * Atomically marks a providerReference as consumed by a trade ID using OS-level write-exclusive locking
 */
export async function consumeProviderReference(
  provider: string,
  providerReference: string,
  tradeId: number,
): Promise<void> {
  const root = getVerificationStorageRoot();
  const refHash = crypto
    .createHash('sha256')
    .update(`${provider.toUpperCase()}:${providerReference.trim()}`)
    .digest('hex');

  const filePath = path.resolve(root, `provider-ref-${refHash}.json`);
  const resolvedRoot = path.resolve(root);

  if (!filePath.startsWith(resolvedRoot)) {
    throw new Error('Forbidden: Path traversal in provider reference.');
  }

  const indexRecord = {
    provider: provider.toUpperCase(),
    providerReference: providerReference.trim(),
    tradeId,
    consumedAt: new Date().toISOString(),
  };

  try {
    // Flag 'wx' guarantees atomic OS kernel write-exclusive creation
    const fileHandle = await fs.promises.open(filePath, 'wx', 0o600);
    await fileHandle.writeFile(JSON.stringify(indexRecord, null, 2), 'utf-8');
    await fileHandle.close();
  } catch (err: any) {
    if (err?.code === 'EEXIST') {
      throw new Error(
        `Atomic Replay Lock: Provider reference '${providerReference}' already consumed.`,
      );
    }
    throw err;
  }
}

/**
 * Saves a VerificationResult record to the VPS filesystem
 */
export async function saveVerificationResult(
  result: VerificationResult,
): Promise<VerificationResult> {
  if (!result.tradeId || result.tradeId <= 0 || !Number.isInteger(result.tradeId)) {
    throw new Error('Invalid tradeId parameter.');
  }

  const root = getVerificationStorageRoot();
  const filePath = path.resolve(root, `verification-trade-${result.tradeId}.json`);
  const resolvedRoot = path.resolve(root);

  if (!filePath.startsWith(resolvedRoot)) {
    throw new Error('Forbidden: Invalid tradeId path traversal attempt.');
  }

  // Encrypt sensitive recipient data at rest
  const encResult: VerificationResult = {
    ...result,
    verifiedRecipient: encryptData(result.verifiedRecipient),
  };

  await fs.promises.writeFile(filePath, JSON.stringify(encResult, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });

  return result;
}

/**
 * Retrieves a VerificationResult record by tradeId
 */
export async function getVerificationResultByTradeId(
  tradeId: number,
): Promise<VerificationResult | null> {
  if (!tradeId || tradeId <= 0 || !Number.isInteger(tradeId)) return null;

  const root = getVerificationStorageRoot();
  const filePath = path.resolve(root, `verification-trade-${tradeId}.json`);
  const resolvedRoot = path.resolve(root);

  if (!filePath.startsWith(resolvedRoot) || !fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const raw: VerificationResult = JSON.parse(content);

    return {
      ...raw,
      verifiedRecipient: decryptData(raw.verifiedRecipient),
    };
  } catch (err) {
    console.error(`Error reading verification result for trade ${tradeId}:`, err);
    return null;
  }
}
