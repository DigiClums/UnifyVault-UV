import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PaymentIntent } from './types';
import { encryptData, decryptData } from './encryption';
import { getSellerProfile } from './paymentProfileStore';

/**
 * Returns canonical VPS payment-intents storage root directory with mode 0o700
 */
export function getPaymentIntentStorageRoot(): string {
  const envRoot = process.env.P2P_INTENT_ROOT;
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

  const defaultRoot = '/var/lib/unifyvault/p2p-payment-intents';
  try {
    if (!fs.existsSync(defaultRoot)) {
      fs.mkdirSync(defaultRoot, { recursive: true, mode: 0o700 });
    }
    fs.accessSync(defaultRoot, fs.constants.R_OK | fs.constants.W_OK);
    return defaultRoot;
  } catch {
    const fallbackRoot = path.join(process.cwd(), 'var', 'p2p-payment-intents');
    if (!fs.existsSync(fallbackRoot)) {
      fs.mkdirSync(fallbackRoot, { recursive: true, mode: 0o700 });
    }
    return fallbackRoot;
  }
}

/**
 * Generates a unique, trade-bound payment reference string.
 * Example: UV-TRD-10482-8F3A
 */
export function generateTradeReference(tradeId: number): string {
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `UV-TRD-${tradeId}-${randomSuffix}`;
}

/**
 * Generates standard, fully URL-encoded UPI Intent payload URI.
 * Format: upi://pay?pa=...&pn=...&am=...&cu=...&tn=...
 */
export function generateUpiUri(
  sellerUpiId: string,
  payeeName: string,
  fiatAmountStr: string,
  fiatCurrency: string,
  tradeReference: string,
): string {
  const normalizedCurrency = (fiatCurrency || 'INR').trim().toUpperCase();
  if (normalizedCurrency !== 'INR') {
    throw new Error(
      `Invalid UPI currency: UPI payment flows strictly require INR fiat settlement currency (received '${fiatCurrency}').`,
    );
  }

  const pa = encodeURIComponent(sellerUpiId.trim());
  const pn = encodeURIComponent(payeeName.trim());
  const am = encodeURIComponent(fiatAmountStr.trim());
  const cu = encodeURIComponent(normalizedCurrency);
  const tn = encodeURIComponent(tradeReference.trim());

  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}`;
}

/**
 * Saves or updates a Payment Intent record on the VPS filesystem with AES-256-GCM encryption
 */
export async function savePaymentIntent(intent: PaymentIntent): Promise<PaymentIntent> {
  if (!intent.tradeId || intent.tradeId <= 0 || !Number.isInteger(intent.tradeId)) {
    throw new Error('Invalid tradeId parameter.');
  }

  const root = getPaymentIntentStorageRoot();
  const filePath = path.resolve(root, `intent-trade-${intent.tradeId}.json`);

  // Path Traversal Security Guard
  const resolvedRoot = path.resolve(root);
  if (!filePath.startsWith(resolvedRoot)) {
    throw new Error('Forbidden: Invalid tradeId path traversal attempt.');
  }

  // Clone intent and encrypt sellerPaymentIdentifier at rest
  const encIntent: PaymentIntent = {
    ...intent,
    sellerPaymentIdentifier: encryptData(intent.sellerPaymentIdentifier),
  };

  await fs.promises.writeFile(filePath, JSON.stringify(encIntent, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });

  return intent;
}

/**
 * Retrieves a Payment Intent record by tradeId, decrypting private payment identifier
 */
export async function getPaymentIntentByTradeId(tradeId: number): Promise<PaymentIntent | null> {
  if (!tradeId || tradeId <= 0 || !Number.isInteger(tradeId)) return null;

  const root = getPaymentIntentStorageRoot();
  const filePath = path.resolve(root, `intent-trade-${tradeId}.json`);
  const resolvedRoot = path.resolve(root);

  if (!filePath.startsWith(resolvedRoot) || !fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const rawIntent: PaymentIntent = JSON.parse(content);

    // Decrypt sellerPaymentIdentifier at rest
    const intent: PaymentIntent = {
      ...rawIntent,
      sellerPaymentIdentifier: decryptData(rawIntent.sellerPaymentIdentifier),
    };

    return intent;
  } catch (err) {
    console.error(`Error reading payment intent for trade ${tradeId}:`, err);
    return null;
  }
}

/**
 * Saves a private seller payment profile (UPI ID) mapped to seller address with AES-256-GCM encryption
 */
export async function saveSellerPaymentProfile(
  sellerAddress: string,
  upiId: string,
): Promise<void> {
  if (!sellerAddress || !upiId) return;

  const root = getPaymentIntentStorageRoot();
  const cleanAddr = sellerAddress.toLowerCase().trim();
  if (!/^0x[a-f0-9]{40}$/.test(cleanAddr)) {
    throw new Error('Invalid seller address format.');
  }

  const filePath = path.resolve(root, `seller-profile-${cleanAddr}.json`);
  const resolvedRoot = path.resolve(root);

  if (!filePath.startsWith(resolvedRoot)) {
    throw new Error('Forbidden: Invalid seller address path traversal attempt.');
  }

  const profile = {
    sellerAddress: cleanAddr,
    upiIdEncrypted: encryptData(upiId.trim()),
    updatedAt: new Date().toISOString(),
  };

  await fs.promises.writeFile(filePath, JSON.stringify(profile, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
}

/**
 * Retrieves a private seller payment profile (UPI ID) by seller address
 */
export async function getSellerPaymentProfile(
  sellerAddress: string,
): Promise<{ sellerAddress: string; upiId: string } | null> {
  if (!sellerAddress) return null;

  const root = getPaymentIntentStorageRoot();
  const cleanAddr = sellerAddress.toLowerCase().trim();
  if (!/^0x[a-f0-9]{40}$/.test(cleanAddr)) return null;

  const filePath = path.resolve(root, `seller-profile-${cleanAddr}.json`);
  const resolvedRoot = path.resolve(root);

  if (filePath.startsWith(resolvedRoot) && fs.existsSync(filePath)) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const raw = JSON.parse(content);
      const decryptedUpi = decryptData(raw.upiIdEncrypted || raw.upiId);
      if (decryptedUpi) {
        return {
          sellerAddress: raw.sellerAddress,
          upiId: decryptedUpi,
        };
      }
    } catch (err: unknown) {
      console.error(
        `Error reading seller payment profile from intent store for ${cleanAddr}:`,
        err,
      );
      throw err;
    }
  }

  // Fallback to getSellerProfile from paymentProfileStore
  try {
    const profile = await getSellerProfile(cleanAddr);
    if (profile && profile.upiVpa) {
      return {
        sellerAddress: cleanAddr,
        upiId: profile.upiVpa,
      };
    }
  } catch (err: unknown) {
    console.error(`Fallback error reading seller payment profile for ${cleanAddr}:`, err);
    throw err;
  }

  return null;
}
