import fs from 'fs';
import path from 'path';
import type { AdminMigrationAuditRecord } from './types';

export function getAdminAuditDir(): string {
  const custom = process.env.ADMIN_AUDIT_STORAGE_DIR;
  if (custom) return path.resolve(custom);
  return path.resolve(process.cwd(), 'var', 'admin');
}

export function getAuditFilePath(chainId: number): string {
  const dir = getAdminAuditDir();
  if (chainId === 8453) {
    return path.join(dir, 'base-mainnet-8453-admin-migration.json');
  }
  return path.join(dir, `base-sepolia-${chainId}-admin-migration.json`);
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
}

export async function readAdminAuditRecords(chainId: number): Promise<AdminMigrationAuditRecord[]> {
  const filePath = getAuditFilePath(chainId);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as AdminMigrationAuditRecord[];
  } catch (err) {
    console.error(`[readAdminAuditRecords] Error reading ${filePath}:`, err);
    return [];
  }
}

export async function appendAdminAuditRecord(record: AdminMigrationAuditRecord): Promise<void> {
  const dir = getAdminAuditDir();
  ensureDir(dir);
  const filePath = getAuditFilePath(record.chainId);

  const existing = await readAdminAuditRecords(record.chainId);
  existing.push(record);

  const tempPath = `${filePath}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tempPath, JSON.stringify(existing, null, 2), { mode: 0o600 });
  await fs.promises.rename(tempPath, filePath);
}
