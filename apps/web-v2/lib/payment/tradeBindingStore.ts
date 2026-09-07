import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { TradePaymentBinding } from './types';
import { encryptData, decryptData } from './encryption';

/**
 * Returns canonical VPS trade-bindings storage root directory with mode 0o700
 */
export function getTradeBindingStorageRoot(): string {
  const envRoot = process.env.P2P_BINDING_ROOT;
  if (envRoot) {
    try {
      if (!fs.existsSync(envRoot)) {
        fs.mkdirSync(envRoot, { recursive: true, mode: 0o700 });
      }
      fs.accessSync(envRoot, fs.constants.R_OK | fs.constants.W_OK);
      return envRoot;
    } catch {
      // Fall through to defaultRoot / fallbackRoot
    }
  }

  const defaultRoot = '/var/lib/unifyvault/p2p-bindings';
  try {
    if (!fs.existsSync(defaultRoot)) {
      fs.mkdirSync(defaultRoot, { recursive: true, mode: 0o700 });
    }
    fs.accessSync(defaultRoot, fs.constants.R_OK | fs.constants.W_OK);
    return defaultRoot;
  } catch {
    const fallbackRoot = path.join(process.cwd(), 'var', 'p2p-bindings');
    if (!fs.existsSync(fallbackRoot)) {
      fs.mkdirSync(fallbackRoot, { recursive: true, mode: 0o700 });
    }
    return fallbackRoot;
  }
}

export interface SaveTradeBindingResult {
  success: boolean;
  binding: TradePaymentBinding;
  isIdempotent: boolean;
}

/**
 * Persists an immutable Trade Payment Binding with AES-256-GCM encryption at rest.
 * Enforces atomic creation and strict write-once semantics.
 */
export async function saveTradePaymentBinding(
  binding: TradePaymentBinding,
): Promise<SaveTradeBindingResult> {
  if (
    !binding.tradeId ||
    binding.tradeId <= 0 ||
    !Number.isInteger(binding.tradeId) ||
    binding.tradeId >= 1_000_000_000
  ) {
    throw new Error('Invalid tradeId parameter.');
  }

  if (!binding.paymentDestination || typeof binding.paymentDestination !== 'string') {
    throw new Error('Invalid paymentDestination.');
  }

  const root = getTradeBindingStorageRoot();
  const filePath = path.resolve(root, `binding-trade-${binding.tradeId}.json`);
  const resolvedRoot = path.resolve(root);

  // Path Traversal Guard
  if (!filePath.startsWith(resolvedRoot)) {
    throw new Error('Forbidden: Invalid tradeId path traversal attempt.');
  }

  // Idempotency & Conflict Check
  if (fs.existsSync(filePath)) {
    try {
      const existingContent = await fs.promises.readFile(filePath, 'utf-8');
      const existingRaw = JSON.parse(existingContent);
      const decryptedExistingDest = decryptData(existingRaw.paymentDestination);

      const existingBinding: TradePaymentBinding = {
        ...existingRaw,
        paymentDestination: decryptedExistingDest,
      };

      // Strict Exact Match Check
      const isDestinationMatch =
        decryptedExistingDest.toLowerCase().trim() ===
        binding.paymentDestination.toLowerCase().trim();
      const isOrderMatch = existingBinding.marketplaceOrderId === binding.marketplaceOrderId;
      const isSellerMatch =
        existingBinding.sellerAddress.toLowerCase() === binding.sellerAddress.toLowerCase();

      if (isDestinationMatch && isOrderMatch && isSellerMatch) {
        return {
          success: true,
          binding: existingBinding,
          isIdempotent: true,
        };
      }

      throw new Error(
        `Conflict: Trade #${binding.tradeId} is already bound to a payment destination and cannot be modified.`,
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('Conflict:')) {
        throw err;
      }
      throw new Error(
        `Failed reading existing trade binding: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Clone and encrypt sensitive payment destination at rest
  const encRecord = {
    ...binding,
    paymentDestination: encryptData(binding.paymentDestination.trim()),
  };

  // Atomic Two-Stage Write: Stage to temporary file in same directory then rename (atomic inode swap)
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const tempPath = path.resolve(root, `binding-trade-${binding.tradeId}.tmp.${randomSuffix}`);

  try {
    await fs.promises.writeFile(tempPath, JSON.stringify(encRecord, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });

    // POSIX Atomic Rename
    await fs.promises.rename(tempPath, filePath);

    return {
      success: true,
      binding,
      isIdempotent: false,
    };
  } catch (err: unknown) {
    if (fs.existsSync(tempPath)) {
      try {
        await fs.promises.unlink(tempPath);
      } catch {}
    }
    throw err;
  }
}

/**
 * Retrieves an immutable Trade Payment Binding by tradeId, decrypting the payment destination.
 */
export async function getTradePaymentBinding(tradeId: number): Promise<TradePaymentBinding | null> {
  if (!tradeId || tradeId <= 0 || !Number.isInteger(tradeId) || tradeId >= 1_000_000_000) {
    return null;
  }

  const root = getTradeBindingStorageRoot();
  const filePath = path.resolve(root, `binding-trade-${tradeId}.json`);
  const resolvedRoot = path.resolve(root);

  if (!filePath.startsWith(resolvedRoot) || !fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const raw = JSON.parse(content);

    const binding: TradePaymentBinding = {
      ...raw,
      paymentDestination: decryptData(raw.paymentDestination),
    };

    return binding;
  } catch (err) {
    console.error(`Error reading trade payment binding for trade #${tradeId}:`, err);
    return null;
  }
}
