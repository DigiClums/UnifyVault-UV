import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  createDefaultManifest,
  readDeploymentManifest,
  writeDeploymentManifest,
  getManifestPath,
} from '../manifestStore';
import { getContractRolesMatrix } from '../../admin/adminRolesMatrix';
import { readAdminAuditRecords, appendAdminAuditRecord } from '../../admin/adminMigrationStore';

describe('Server Deployment Manifest Store & Admin Migration Engine', () => {
  it('creates independent manifests for Base Sepolia (84532) and Base Mainnet (8453)', () => {
    const sepolia = createDefaultManifest(84532);
    const mainnet = createDefaultManifest(8453);

    expect(sepolia.chainId).toBe(84532);
    expect(sepolia.network).toBe('Base Sepolia');
    expect(sepolia.isLocked).toBe(true);
    expect(sepolia.contracts.ProtocolDirectory).toBeDefined();

    expect(mainnet.chainId).toBe(8453);
    expect(mainnet.network).toBe('Base Mainnet');
    expect(mainnet.isLocked).toBe(false);
    expect(Object.keys(mainnet.contracts).length).toBe(0);
  });

  it('enforces optimistic locking when writing manifests', async () => {
    const current = await readDeploymentManifest(84532);
    current.currentStepIndex = 10;

    const res1 = await writeDeploymentManifest(current, current.manifestVersion);
    expect(res1.success).toBe(true);
    expect(res1.manifest?.manifestVersion).toBe(current.manifestVersion + 1);

    // Concurrent write with stale version should fail
    const res2 = await writeDeploymentManifest(current, current.manifestVersion);
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('Concurrent modification detected');
  });

  it('builds role matrix mapping correctly for all core contracts', () => {
    const contracts = {
      ProtocolDirectory: '0xd2715141a0f5998b707baa963990bfc2e94cf145' as `0x${string}`,
      CustodyVault: '0x63856ae48d9b3e74b538a0d720b8d8a5e5f7eb64' as `0x${string}`,
      Treasury: '0xe0764477914f8eb0fe90c7f27bca0ade1ee95316' as `0x${string}`,
      UnifyVaultController: '0x07f3d3432b64dbf67c5b061af2bc8aef70221cea' as `0x${string}`,
    };
    const currentAdmin = '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`;
    const hardwareWallet = '0x1111111111111111111111111111111111111111' as `0x${string}`;

    const matrix = getContractRolesMatrix(contracts, currentAdmin, hardwareWallet);
    expect(matrix.length).toBeGreaterThanOrEqual(4);

    const dirItem = matrix.find(
      (m) => m.contractName === 'ProtocolDirectory' && m.roleName === 'DEFAULT_ADMIN_ROLE',
    );
    expect(dirItem).toBeDefined();
    expect(dirItem?.accessModel).toBe('ACCESS_CONTROL');
    expect(dirItem?.currentAuthority).toBe(currentAdmin);
    expect(dirItem?.newAuthority).toBe(hardwareWallet);
  });

  it('appends and reads admin migration audit logs safely', async () => {
    const auditLog = {
      chainId: 84532,
      oldAdmin: '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`,
      newAdmin: '0x1111111111111111111111111111111111111111' as `0x${string}`,
      contractName: 'ProtocolDirectory',
      contractAddress: '0xd2715141a0f5998b707baa963990bfc2e94cf145' as `0x${string}`,
      roleName: 'DEFAULT_ADMIN_ROLE',
      roleIdentifier:
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      grantTxHash:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
      grantBlockNumber: 1234567,
      grantVerified: true,
      timestamp: Date.now(),
      status: 'in_progress' as const,
    };

    await appendAdminAuditRecord(auditLog);
    const records = await readAdminAuditRecords(84532);
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records[records.length - 1].contractName).toBe('ProtocolDirectory');
    expect(records[records.length - 1].grantVerified).toBe(true);
  });
});
