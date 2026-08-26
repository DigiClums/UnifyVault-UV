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
  it('creates default manifests for Base Mainnet (8453)', () => {
    const mainnet = createDefaultManifest(8453);

    expect(mainnet.chainId).toBe(8453);
    expect(mainnet.network).toBe('Base Mainnet');
    expect(mainnet.isLocked).toBe(false);
    expect(Object.keys(mainnet.contracts).length).toBe(0);
  });

  it('enforces optimistic locking when writing manifests', async () => {
    const current = await readDeploymentManifest(8453);
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
      ProtocolDirectory: '0xe74b400f4aea3a0b593be5acbc54f56631c0d60e' as `0x${string}`,
      CustodyVault: '0xbb35a3434c689942e0b7d58909eae0d2cc0769ca' as `0x${string}`,
      Treasury: '0x57561f781b2f558a7445d2e93a365c03ba2c9b53' as `0x${string}`,
      UnifyVaultController: '0xe6cd99f3dcf39bd76d91d211dce7f4bdf801c366' as `0x${string}`,
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
      chainId: 8453,
      oldAdmin: '0x441dbf8076d0b143EC17199baE94Daa884161454' as `0x${string}`,
      newAdmin: '0x1111111111111111111111111111111111111111' as `0x${string}`,
      contractName: 'ProtocolDirectory',
      contractAddress: '0xe74b400f4aea3a0b593be5acbc54f56631c0d60e' as `0x${string}`,
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
    const records = await readAdminAuditRecords(8453);
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records[records.length - 1].contractName).toBe('ProtocolDirectory');
    expect(records[records.length - 1].grantVerified).toBe(true);
  });
});
