import fs from 'fs';
import path from 'path';
import { DisputeRecord, DisputeMessage, AdminAuditEvent } from './types';

export function getDisputeStorageRoot(): string {
  const customRoot = process.env.P2P_DISPUTE_ROOT;
  if (customRoot) return path.resolve(customRoot);
  return path.resolve(process.cwd(), 'data', 'disputes');
}

function ensureStorageDirs() {
  const root = getDisputeStorageRoot();
  const recordsDir = path.join(root, 'records');
  const messagesDir = path.join(root, 'messages');
  const auditsDir = path.join(root, 'audits');

  [root, recordsDir, messagesDir, auditsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  });
}

export async function saveDisputeRecord(record: DisputeRecord): Promise<void> {
  ensureStorageDirs();
  const root = getDisputeStorageRoot();
  const filePath = path.join(root, 'records', `dispute-trade-${record.tradeId}.json`);
  await fs.promises.writeFile(filePath, JSON.stringify(record, null, 2), { mode: 0o600 });
}

export async function getDisputeRecordByTradeId(tradeId: number): Promise<DisputeRecord | null> {
  ensureStorageDirs();
  const root = getDisputeStorageRoot();
  const filePath = path.join(root, 'records', `dispute-trade-${tradeId}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as DisputeRecord;
  } catch {
    return null;
  }
}

export async function addDisputeMessage(msg: DisputeMessage): Promise<DisputeMessage> {
  ensureStorageDirs();
  const root = getDisputeStorageRoot();
  const filePath = path.join(root, 'messages', `chat-trade-${msg.tradeId}.json`);

  let messages: DisputeMessage[] = [];
  if (fs.existsSync(filePath)) {
    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      messages = JSON.parse(raw);
    } catch {
      messages = [];
    }
  }

  messages.push(msg);
  await fs.promises.writeFile(filePath, JSON.stringify(messages, null, 2), { mode: 0o600 });
  return msg;
}

export async function getDisputeMessagesByTradeId(tradeId: number): Promise<DisputeMessage[]> {
  ensureStorageDirs();
  const root = getDisputeStorageRoot();
  const filePath = path.join(root, 'messages', `chat-trade-${tradeId}.json`);
  if (!fs.existsSync(filePath)) return [];

  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as DisputeMessage[];
  } catch {
    return [];
  }
}

export async function recordAdminAuditEvent(event: AdminAuditEvent): Promise<void> {
  ensureStorageDirs();
  const root = getDisputeStorageRoot();
  const filePath = path.join(root, 'audits', `audit-dispute-${event.disputeId}.json`);

  let audits: AdminAuditEvent[] = [];
  if (fs.existsSync(filePath)) {
    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      audits = JSON.parse(raw);
    } catch {
      audits = [];
    }
  }

  audits.push(event);
  await fs.promises.writeFile(filePath, JSON.stringify(audits, null, 2), { mode: 0o600 });
}
