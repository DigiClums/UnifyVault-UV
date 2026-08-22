export type AccessControlModel = 'ACCESS_CONTROL' | 'OWNABLE' | 'CUSTOM' | 'UNSUPPORTED';

export type MigrationStepStatus =
  | 'pending'
  | 'checking'
  | 'ready_to_grant'
  | 'granting'
  | 'granted_pending_verification'
  | 'ready_to_revoke'
  | 'revoking'
  | 'revoked_pending_verification'
  | 'completed'
  | 'manual_required'
  | 'failed';

export interface ContractRoleMigrationItem {
  contractName: string;
  contractAddress: `0x${string}`;
  roleIdentifier: `0x${string}`;
  roleName: string;
  accessModel: AccessControlModel;
  currentAuthority: `0x${string}`;
  newAuthority?: `0x${string}`;
  isCurrentAuthorityVerified: boolean;
  isNewAuthorityVerified: boolean;
  status: MigrationStepStatus;
  grantTxHash?: `0x${string}`;
  revokeTxHash?: `0x${string}`;
  notes?: string;
}

export interface AdminMigrationAuditRecord {
  chainId: number;
  oldAdmin: `0x${string}`;
  newAdmin: `0x${string}`;
  contractName: string;
  contractAddress: `0x${string}`;
  roleName: string;
  roleIdentifier: `0x${string}`;
  grantTxHash?: `0x${string}`;
  grantBlockNumber?: number;
  grantVerified: boolean;
  revokeTxHash?: `0x${string}`;
  revokeBlockNumber?: number;
  revokeVerified: boolean;
  timestamp: number;
  status: 'in_progress' | 'completed' | 'failed';
}
