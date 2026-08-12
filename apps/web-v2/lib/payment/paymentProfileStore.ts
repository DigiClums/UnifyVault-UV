import fs from 'fs';
import path from 'path';
import { isAddress } from 'viem';
import { encryptData, decryptData } from './encryption';

export interface SellerPaymentProfile {
  walletAddress: `0x${string}`;
  paymentRail: 'UPI' | 'BANK_TRANSFER';
  upiVpa: string; // Private UPI VPA (Encrypted at rest)
  accountHolderName?: string;
  bankAccountReference?: string;
  verificationStatus: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function getSellerProfileStorageRoot(): string {
  const envRoot = process.env.P2P_PROFILE_ROOT;
  if (envRoot) {
    if (!fs.existsSync(envRoot)) {
      fs.mkdirSync(envRoot, { recursive: true, mode: 0o700 });
    }
    return envRoot;
  }

  const defaultRoot = '/var/lib/unifyvault/p2p-profiles';
  try {
    if (!fs.existsSync(defaultRoot)) {
      fs.mkdirSync(defaultRoot, { recursive: true, mode: 0o700 });
    }
    return defaultRoot;
  } catch {
    const fallbackRoot = path.join(process.cwd(), 'var', 'p2p-profiles');
    if (!fs.existsSync(fallbackRoot)) {
      fs.mkdirSync(fallbackRoot, { recursive: true, mode: 0o700 });
    }
    return fallbackRoot;
  }
}

/**
 * Saves or updates a seller's payment profile. Encrypts upiVpa at rest.
 */
export async function saveSellerProfile(
  profile: Omit<SellerPaymentProfile, 'createdAt' | 'updatedAt' | 'version'>,
): Promise<SellerPaymentProfile> {
  if (!profile.walletAddress || !isAddress(profile.walletAddress)) {
    throw new Error('Invalid seller wallet address.');
  }

  if (!profile.upiVpa || !profile.upiVpa.includes('@')) {
    throw new Error('Invalid UPI VPA format.');
  }

  const root = getSellerProfileStorageRoot();
  const addressKey = profile.walletAddress.toLowerCase();
  const filePath = path.resolve(root, `profile-${addressKey}.json`);
  const resolvedRoot = path.resolve(root);

  if (!filePath.startsWith(resolvedRoot)) {
    throw new Error('Forbidden: Invalid wallet address path traversal attempt.');
  }

  let existing: SellerPaymentProfile | null = null;
  if (fs.existsSync(filePath)) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      existing = JSON.parse(content);
    } catch {
      existing = null;
    }
  }

  const now = new Date().toISOString();
  const updatedProfile: SellerPaymentProfile = {
    walletAddress: profile.walletAddress.toLowerCase() as `0x${string}`,
    paymentRail: profile.paymentRail || 'UPI',
    upiVpa: encryptData(profile.upiVpa.trim()), // Encrypted at rest
    accountHolderName: profile.accountHolderName
      ? encryptData(profile.accountHolderName)
      : undefined,
    bankAccountReference: profile.bankAccountReference
      ? encryptData(profile.bankAccountReference)
      : undefined,
    verificationStatus: profile.verificationStatus || 'PENDING_VERIFICATION',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    version: (existing?.version || 0) + 1,
  };

  await fs.promises.writeFile(filePath, JSON.stringify(updatedProfile, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });

  return {
    ...updatedProfile,
    upiVpa: profile.upiVpa.trim(), // Return decrypted for caller
    accountHolderName: profile.accountHolderName,
    bankAccountReference: profile.bankAccountReference,
  };
}

/**
 * Retrieves a seller payment profile by wallet address. Decrypts sensitive fields.
 */
export async function getSellerProfile(
  walletAddress: string,
): Promise<SellerPaymentProfile | null> {
  if (!walletAddress || !isAddress(walletAddress)) return null;

  const root = getSellerProfileStorageRoot();
  const addressKey = walletAddress.toLowerCase();
  const filePath = path.resolve(root, `profile-${addressKey}.json`);
  const resolvedRoot = path.resolve(root);

  if (!filePath.startsWith(resolvedRoot) || !fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const raw: SellerPaymentProfile = JSON.parse(content);

    return {
      ...raw,
      upiVpa: decryptData(raw.upiVpa),
      accountHolderName: raw.accountHolderName ? decryptData(raw.accountHolderName) : undefined,
      bankAccountReference: raw.bankAccountReference
        ? decryptData(raw.bankAccountReference)
        : undefined,
    };
  } catch (err) {
    console.error(`Error reading profile for ${walletAddress}:`, err);
    return null;
  }
}
