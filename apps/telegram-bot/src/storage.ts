import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(__dirname, '../data/user_wallets.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

export interface UserRecord {
  userId: string;
  username?: string;
  firstName?: string;
  address?: string;
  p2pAlertsEnabled?: boolean;
  joinedAt: string;
  lastActive: string;
}

interface StorageData {
  users: { [telegramUserId: string]: UserRecord };
}

function loadStorage(): StorageData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (!data.users) {
        const users: { [id: string]: UserRecord } = {};
        for (const [id, val] of Object.entries(data)) {
          const w = val as { address: string; linkedAt: string };
          users[id] = {
            userId: id,
            address: w.address,
            p2pAlertsEnabled: true,
            joinedAt: w.linkedAt || new Date().toISOString(),
            lastActive: new Date().toISOString(),
          };
        }
        return { users };
      }
      return data;
    }
  } catch (e) {
    console.error('Error loading storage:', e);
  }
  return { users: {} };
}

function saveStorage(data: StorageData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving storage:', e);
  }
}

export function registerUser(userId: number | string, username?: string, firstName?: string) {
  const data = loadStorage();
  const idStr = userId.toString();
  if (!data.users[idStr]) {
    data.users[idStr] = {
      userId: idStr,
      username,
      firstName,
      p2pAlertsEnabled: true,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };
  } else {
    data.users[idStr].lastActive = new Date().toISOString();
    if (username) data.users[idStr].username = username;
    if (firstName) data.users[idStr].firstName = firstName;
  }
  saveStorage(data);
}

export function getAllUsers(): UserRecord[] {
  const data = loadStorage();
  return Object.values(data.users);
}

export function linkWallet(userId: number | string, address: string) {
  const data = loadStorage();
  const idStr = userId.toString();
  if (!data.users[idStr]) {
    data.users[idStr] = {
      userId: idStr,
      address: address.toLowerCase(),
      p2pAlertsEnabled: true,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };
  } else {
    data.users[idStr].address = address.toLowerCase();
    data.users[idStr].lastActive = new Date().toISOString();
  }
  saveStorage(data);
}

export function getLinkedWallet(userId: number | string): string | null {
  const data = loadStorage();
  return data.users[userId.toString()]?.address || null;
}

export function getUserByWallet(address: string): UserRecord | null {
  const data = loadStorage();
  const normalized = address.toLowerCase();
  for (const user of Object.values(data.users)) {
    if (user.address && user.address.toLowerCase() === normalized) {
      return user;
    }
  }
  return null;
}

export function setP2PAlerts(userId: number | string, enabled: boolean) {
  const data = loadStorage();
  const idStr = userId.toString();
  if (data.users[idStr]) {
    data.users[idStr].p2pAlertsEnabled = enabled;
    saveStorage(data);
    return true;
  }
  return false;
}

export function unlinkWallet(userId: number | string) {
  const data = loadStorage();
  const idStr = userId.toString();
  if (data.users[idStr] && data.users[idStr].address) {
    delete data.users[idStr].address;
    saveStorage(data);
    return true;
  }
  return false;
}
