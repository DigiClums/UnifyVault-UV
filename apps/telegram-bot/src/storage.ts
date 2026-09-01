import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(__dirname, '../data/user_wallets.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

interface WalletStorage {
  [telegramUserId: string]: {
    address: string;
    linkedAt: string;
  };
}

function loadWallets(): WalletStorage {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Error loading wallet storage:', e);
  }
  return {};
}

function saveWallets(data: WalletStorage) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving wallet storage:', e);
  }
}

export function linkWallet(userId: number | string, address: string) {
  const wallets = loadWallets();
  wallets[userId.toString()] = {
    address: address.toLowerCase(),
    linkedAt: new Date().toISOString(),
  };
  saveWallets(wallets);
}

export function getLinkedWallet(userId: number | string): string | null {
  const wallets = loadWallets();
  return wallets[userId.toString()]?.address || null;
}

export function unlinkWallet(userId: number | string) {
  const wallets = loadWallets();
  if (wallets[userId.toString()]) {
    delete wallets[userId.toString()];
    saveWallets(wallets);
    return true;
  }
  return false;
}
