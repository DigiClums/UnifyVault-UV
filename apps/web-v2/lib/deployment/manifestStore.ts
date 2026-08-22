import fs from 'fs';
import path from 'path';
import type { DeployedContractsMap, StepExecutionRecord, GenesisVerificationCheck } from './types';

export interface ServerDeploymentManifest {
  manifestVersion: number;
  chainId: number;
  network: string;
  deploymentVersion: string;
  protocolVersion: string;
  deployer: `0x${string}`;
  status: 'in_progress' | 'completed' | 'locked';
  isLocked: boolean;
  currentStepIndex: number;
  totalSteps: number;
  contracts: DeployedContractsMap;
  stepRecords: Record<number, StepExecutionRecord>;
  verificationResults: GenesisVerificationCheck[];
  lastUpdated: number;
  lockedAt?: number;
}

export function getDeploymentManifestDir(): string {
  const custom = process.env.DEPLOYMENT_STORAGE_DIR;
  if (custom) return path.resolve(custom);
  return path.resolve(process.cwd(), 'var', 'deployment');
}

export function getManifestPath(chainId: number): string {
  const dir = getDeploymentManifestDir();
  if (chainId === 8453) {
    return path.join(dir, 'base-mainnet-8453.json');
  }
  return path.join(dir, `base-sepolia-${chainId}.json`);
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
}

export function createDefaultManifest(chainId: number): ServerDeploymentManifest {
  const isMainnet = chainId === 8453;
  return {
    manifestVersion: 1,
    chainId,
    network: isMainnet ? 'Base Mainnet' : 'Base Sepolia',
    deploymentVersion: 'V2',
    protocolVersion: '2.0.0',
    deployer: '0x441dbf8076d0b143EC17199baE94Daa884161454',
    status: 'in_progress',
    isLocked: false,
    currentStepIndex: 0,
    totalSteps: 55,
    contracts: {},
    stepRecords: {},
    verificationResults: [],
    lastUpdated: Date.now(),
  };
}

export async function readDeploymentManifest(chainId: number): Promise<ServerDeploymentManifest> {
  const filePath = getManifestPath(chainId);
  if (!fs.existsSync(filePath)) {
    const defaultManifest = createDefaultManifest(chainId);
    await writeDeploymentManifest(defaultManifest);
    return defaultManifest;
  }

  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as ServerDeploymentManifest;
  } catch (err) {
    console.error(`[readDeploymentManifest] Error reading ${filePath}:`, err);
    return createDefaultManifest(chainId);
  }
}

export async function writeDeploymentManifest(
  manifest: ServerDeploymentManifest,
  expectedVersion?: number,
): Promise<{ success: boolean; manifest?: ServerDeploymentManifest; error?: string }> {
  const dir = getDeploymentManifestDir();
  ensureDir(dir);

  const filePath = getManifestPath(manifest.chainId);

  if (expectedVersion !== undefined && fs.existsSync(filePath)) {
    try {
      const existingRaw = await fs.promises.readFile(filePath, 'utf-8');
      const existing = JSON.parse(existingRaw) as ServerDeploymentManifest;
      if (existing.manifestVersion !== expectedVersion) {
        return {
          success: false,
          error: `Concurrent modification detected. Server manifest version is ${existing.manifestVersion}, expected ${expectedVersion}.`,
          manifest: existing,
        };
      }
    } catch (readErr) {
      console.warn('[writeDeploymentManifest] Optimistic lock read warning:', readErr);
    }
  }

  const updated: ServerDeploymentManifest = {
    ...manifest,
    manifestVersion: (manifest.manifestVersion || 0) + 1,
    lastUpdated: Date.now(),
  };

  const tempPath = `${filePath}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tempPath, JSON.stringify(updated, null, 2), { mode: 0o600 });
  await fs.promises.rename(tempPath, filePath);

  return { success: true, manifest: updated };
}
