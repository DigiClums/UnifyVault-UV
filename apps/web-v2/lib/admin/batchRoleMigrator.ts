import type { Address } from 'viem';

export interface BatchRoleTransferCall {
  target: Address;
  role: `0x${string}`;
  roleName: string;
  contractName: string;
}

export function getAllAdminRoleTransferCalls(
  contracts: Record<string, Address>,
  newAdmin: Address,
  oldAdmin: Address,
): {
  grantCalls: { target: Address; allowFailure: boolean; callData: `0x${string}` }[];
  revokeCalls: { target: Address; allowFailure: boolean; callData: `0x${string}` }[];
} {
  const DEFAULT_ADMIN_ROLE =
    '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
  const GOVERNANCE_ROLE =
    '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1' as `0x${string}`;
  const GUARDIAN_ROLE =
    '0x55435dd261a4b9b3364963f7738a7a662ad9c84396d64be3365284bb7f0a5041' as `0x${string}`;

  const roleMappings: { contractName: string; roles: `0x${string}`[] }[] = [
    { contractName: 'ProtocolDirectory', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE] },
    { contractName: 'OracleManager', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE] },
    { contractName: 'ChainlinkOracleProvider', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE] },
    { contractName: 'Treasury', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE, GUARDIAN_ROLE] },
    { contractName: 'FeeManager', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE] },
    { contractName: 'CustodyVault', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE, GUARDIAN_ROLE] },
    { contractName: 'LiquidityManager', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE] },
    { contractName: 'UVBEV2', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE, GUARDIAN_ROLE] },
    { contractName: 'SwapAdapter', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE] },
    { contractName: 'StrategyManager', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE] },
    { contractName: 'PortfolioManager', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE] },
    {
      contractName: 'UnifyVaultController',
      roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE, GUARDIAN_ROLE],
    },
    { contractName: 'CostBasisManagerV2', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE] },
    { contractName: 'P2PEscrowV2', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE, GUARDIAN_ROLE] },
    { contractName: 'PerformanceManager', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE] },
    { contractName: 'Marketplace', roles: [DEFAULT_ADMIN_ROLE, GOVERNANCE_ROLE, GUARDIAN_ROLE] },
  ];

  const encodeCall = (selector: string, role: `0x${string}`, account: Address): `0x${string}` => {
    const roleClean = role.slice(2).padStart(64, '0');
    const accountClean = account.slice(2).toLowerCase().padStart(64, '0');
    return `${selector}${roleClean}${accountClean}` as `0x${string}`;
  };

  const grantCalls: { target: Address; allowFailure: boolean; callData: `0x${string}` }[] = [];
  const revokeCalls: { target: Address; allowFailure: boolean; callData: `0x${string}` }[] = [];

  for (const { contractName, roles } of roleMappings) {
    const target = contracts[contractName];
    if (target) {
      for (const role of roles) {
        grantCalls.push({
          target,
          allowFailure: true,
          callData: encodeCall('0x2f2ff15d', role, newAdmin),
        });
        revokeCalls.push({
          target,
          allowFailure: true,
          callData: encodeCall('0xd5477283', role, oldAdmin),
        });
      }
    }
  }

  return { grantCalls, revokeCalls };
}
