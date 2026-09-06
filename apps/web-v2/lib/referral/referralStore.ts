import fs from 'fs';
import path from 'path';
import { isAddress } from 'viem';

export interface OffchainReferralRecord {
  userAddress: string;
  referrerAddress: string;
  joinedAt: string;
  lastSeenAt: string;
}

interface ReferralRegistryStorage {
  referralsByUpline: { [upline: string]: OffchainReferralRecord[] };
  uplineByUser: { [user: string]: string };
}

function getStoragePath(): string {
  const defaultDir = '/var/lib/unifyvault/referrals';
  try {
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true, mode: 0o755 });
    }
    return path.join(defaultDir, 'referral_registry.json');
  } catch {
    const fallbackDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true, mode: 0o755 });
    }
    return path.join(fallbackDir, 'referral_registry.json');
  }
}

function loadStorage(): ReferralRegistryStorage {
  try {
    const filePath = getStoragePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn('Error reading referral storage:', e);
  }
  return { referralsByUpline: {}, uplineByUser: {} };
}

function saveStorage(data: ReferralRegistryStorage) {
  try {
    const filePath = getStoragePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error saving referral storage:', e);
  }
}

export function recordOffchainReferral(user: string, referrer: string): boolean {
  if (!user || !isAddress(user) || !referrer || !isAddress(referrer)) return false;
  if (user.toLowerCase() === referrer.toLowerCase()) return false;

  const data = loadStorage();
  const userKey = user.toLowerCase();
  const uplineKey = referrer.toLowerCase();

  // If user already bound to an upline, do not overwrite
  if (data.uplineByUser[userKey]) {
    return false;
  }

  data.uplineByUser[userKey] = uplineKey;
  if (!data.referralsByUpline[uplineKey]) {
    data.referralsByUpline[uplineKey] = [];
  }

  const existingIndex = data.referralsByUpline[uplineKey].findIndex(
    (r) => r.userAddress.toLowerCase() === userKey,
  );

  const now = new Date().toISOString();
  if (existingIndex === -1) {
    data.referralsByUpline[uplineKey].push({
      userAddress: userKey,
      referrerAddress: uplineKey,
      joinedAt: now,
      lastSeenAt: now,
    });
  }

  saveStorage(data);
  return true;
}

export function getOffchainDirects(upline: string): string[] {
  if (!upline || !isAddress(upline)) return [];
  const data = loadStorage();
  const uplineKey = upline.toLowerCase();
  return (data.referralsByUpline[uplineKey] || []).map((r) => r.userAddress);
}

export function getOffchainUpline(user: string): string | null {
  if (!user || !isAddress(user)) return null;
  const data = loadStorage();
  return data.uplineByUser[user.toLowerCase()] || null;
}
