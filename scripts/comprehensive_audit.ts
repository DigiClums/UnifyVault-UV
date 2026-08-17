import {
  createPublicClient,
  http,
  parseAbi,
  keccak256,
  toHex,
  encodePacked,
  type Address,
  type Hex,
} from 'viem';
import { baseSepolia } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';
export const TARGET_96DA: Address = '0xd905920c91853039060246Ed5724AA72B91a96DA';
export const DEPLOYER_OLD_ADMIN: Address = '0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

export const ROLES: Record<string, Hex> = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  GOVERNANCE_ROLE: keccak256(toHex('GOVERNANCE_ROLE')),
  GUARDIAN_ROLE: keccak256(toHex('GUARDIAN_ROLE')),
  CONTROLLER_ROLE: keccak256(toHex('CONTROLLER_ROLE')),
  BOT_ROLE: keccak256(toHex('BOT_ROLE')),
  ORACLE_OPERATOR_ROLE: keccak256(toHex('ORACLE_OPERATOR_ROLE')),
  ARBITRATOR_ROLE: keccak256(toHex('ARBITRATOR_ROLE')),
  TIMELOCK_ROLE: keccak256(toHex('TIMELOCK_ROLE')),
  PROPOSER_ROLE: keccak256(toHex('PROPOSER_ROLE')),
  EXECUTOR_ROLE: keccak256(toHex('EXECUTOR_ROLE')),
  CANCELLER_ROLE: keccak256(toHex('CANCELLER_ROLE')),
};

const MODULE_NAMES = [
  'OracleManager',
  'CustodyVault',
  'Treasury',
  'IndexToken',
  'Governance',
  'RiskEngine',
  'DepositManager',
  'RedeemManager',
  'RebalanceManager',
  'StrategyManager',
  'PortfolioManager',
  'SwapAdapter',
  'LiquidityManager',
  'FeeManager',
  'CostBasisManager',
  'PerformanceManager',
  'P2PEscrow',
];

const DIRECTORY_ABI = parseAbi([
  'function getAddress(bytes32 name) view returns (address)',
  'function exists(bytes32 name) view returns (bool)',
  'function isFrozen() view returns (bool)',
]);

const GENERIC_ABI = parseAbi([
  'function owner() view returns (address)',
  'function pendingOwner() view returns (address)',
  'function admin() view returns (address)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function getRoleAdmin(bytes32 role) view returns (bytes32)',
  'function getRoleMemberCount(bytes32 role) view returns (uint256)',
  'function getRoleMember(bytes32 role, uint256 index) view returns (address)',
  'function verifyingSigner() view returns (address)',
  'function refillOperator() view returns (address)',
  'function paymaster() view returns (address)',
  'function p2pEscrow() view returns (address)',
  'function uvbeToken() view returns (address)',
  'function getMinDelay() view returns (uint256)',
  'function paused() view returns (bool)',
  'function isPaused() view returns (bool)',
]);

export interface ContractAuditTarget {
  name: string;
  category: string;
  address: Address;
  expectedMechanism: 'Ownable' | 'AccessControl' | 'TimelockController' | 'Ownable2Step' | 'None';
  requiredRolesFor96da?: string[];
  requiresOwner96da?: boolean;
}

export const ALL_CONTRACTS: ContractAuditTarget[] = [
  // Core V2 Architecture
  {
    name: 'ProtocolDirectory',
    category: 'Core Registry',
    address: '0x8040006d6907a84911aaC0a9aC08278311B156e2',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'UnifyVaultController',
    category: 'Core Controller',
    address: '0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE', 'GUARDIAN_ROLE'],
  },
  {
    name: 'CustodyVault',
    category: 'Vault & Collateral',
    address: '0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE', 'GUARDIAN_ROLE'],
  },
  {
    name: 'Treasury',
    category: 'Treasury & Reserves',
    address: '0xB8c8113a042f39936dD966A5983fAaE2bF7b7290',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE', 'GUARDIAN_ROLE'],
  },
  {
    name: 'FeeManager',
    category: 'Fee Routing',
    address: '0x07f8BD7DAf5002C3C62B3c1280e9258AbBEfA2f1',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'OracleManager',
    category: 'Oracle Engine',
    address: '0xc96d36Acf3ef58d03fdEA56aa90a30d02ceb73BF',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'ChainlinkOracleProvider',
    category: 'Oracle Provider',
    address: '0xCF46A80BbF2e92c16f7e1953F9AC73935340f69B',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'LiquidityManager',
    category: 'Liquidity Engine',
    address: '0xd1DCd311ACD1176E35823360652FCb356a7F227F',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'UVBEV2 (UVBEToken)',
    category: 'Protocol Token',
    address: '0x006c5DF13C716E5224b33956651C4356BB90DEc0',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE', 'GUARDIAN_ROLE'],
  },
  {
    name: 'StrategyManager',
    category: 'Strategy Engine',
    address: '0x73c894DEFBBd69F09134D53a73A0F6bfaeF5A7Bb',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'PortfolioManager',
    category: 'Portfolio NAV',
    address: '0xd34A8d9cE90ebc2987c40ceafE126E5EF2931D9b',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'SwapAdapter',
    category: 'DEX Execution',
    address: '0xbc97337dE85654aCD96182C93841f21168da65B4',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'CostBasisManagerV2',
    category: 'Cost Basis Accounting',
    address: '0x57869372AFbd7b61752f2f8d3e7F37701e28517B',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'PerformanceManager',
    category: 'Performance Accounting',
    address: '0xF1670ca0054D649d1E3dd2f1d642Cc8Ed70109F6',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },

  // Escrow & Marketplace
  {
    name: 'P2PEscrowV2',
    category: 'P2P Escrow',
    address: '0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: [
      'DEFAULT_ADMIN_ROLE',
      'GOVERNANCE_ROLE',
      'ARBITRATOR_ROLE',
      'GUARDIAN_ROLE',
    ],
  },
  {
    name: 'Marketplace',
    category: 'Marketplace Engine',
    address: '0xe908377f96F313a6b7771570ff6Fb414D38F451A',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE', 'GUARDIAN_ROLE'],
  },

  // Governance & Timelock
  {
    name: 'UnifyVaultTimelock',
    category: 'Governance Timelock',
    address: '0x9094145Cd2AEA2f309eDf14237444a07edF98d02',
    expectedMechanism: 'TimelockController',
    requiredRolesFor96da: ['PROPOSER_ROLE', 'CANCELLER_ROLE'],
  },

  // Account Abstraction & Paymaster Infrastructure
  {
    name: 'UnifyVaultPaymaster (V1/Active)',
    category: 'Paymaster AA',
    address: '0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6',
    expectedMechanism: 'Ownable',
    requiresOwner96da: true,
  },
  {
    name: 'GasTreasury',
    category: 'Paymaster Gas Reserve',
    address: '0xD4B19A48c270B720FeeEd57CcAb5aa4eCfcC1fD9',
    expectedMechanism: 'Ownable',
    requiresOwner96da: true,
  },
  {
    name: 'Phase1 Paymaster (Legacy)',
    category: 'Paymaster AA (Legacy)',
    address: '0x42c6342516714CFd64474bd41Ce360605b9fEA88',
    expectedMechanism: 'Ownable',
    requiresOwner96da: false,
  },

  // Legacy Deprecated Contracts (from base_sepolia.json)
  {
    name: 'Legacy ProtocolDirectory',
    category: 'Deprecated V1/V2-early',
    address: '0x329158A24DdC8ED267cc5D3f3D9C2905149C596D',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: [],
  },
  {
    name: 'Legacy Controller',
    category: 'Deprecated V1/V2-early',
    address: '0x9499Ad93fa257D4d20925FDc4B6D6F6b2b565Bc2',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: [],
  },
  {
    name: 'Legacy CustodyVault',
    category: 'Deprecated V1/V2-early',
    address: '0xa9284887B8670890F675386dA85877c34b40EE44',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: [],
  },
  {
    name: 'Legacy Treasury',
    category: 'Deprecated V1/V2-early',
    address: '0x8Aa2e812D244b0C30D45035C3C843f4CdD02aCe6',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: [],
  },
  {
    name: 'Legacy V1 Token',
    category: 'Deprecated V1/V2-early',
    address: '0xa34596D38Be381A4764141105A91C338Ca5503bB',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: [],
  },
  {
    name: 'Legacy V2 Token (Symbol)',
    category: 'Deprecated V1/V2-early',
    address: '0x4A33d001D7F81C12c0C9262256Af83000e64457D',
    expectedMechanism: 'AccessControl',
    requiredRolesFor96da: [],
  },
];

export async function runFullAudit() {
  console.log('================================================================================');
  console.log('UNIFYVAULT LIVE ON-CHAIN ADMIN & ROLE AUDIT (BASE SEPOLIA)');
  console.log('RPC Endpoint        :', RPC_URL);
  console.log('Target Admin (96da) :', TARGET_96DA);
  console.log('Deployer / OldAdmin :', DEPLOYER_OLD_ADMIN);
  console.log('Timestamp           :', new Date().toISOString());
  console.log('================================================================================\n');

  // STEP 1: Query Canonical ProtocolDirectory Modules
  console.log('--- STEP 1: PROTOCOL DIRECTORY REGISTERED MODULES ---');
  const directoryAddress = '0x8040006d6907a84911aaC0a9aC08278311B156e2';
  for (const mod of MODULE_NAMES) {
    const modHash = keccak256(toHex(mod));
    try {
      const exists = await client.readContract({
        address: directoryAddress,
        abi: DIRECTORY_ABI,
        functionName: 'exists',
        args: [modHash],
      });
      if (exists) {
        const addr = await client.readContract({
          address: directoryAddress,
          abi: DIRECTORY_ABI,
          functionName: 'getAddress',
          args: [modHash],
        });
        console.log(`  Module [${mod.padEnd(20)}]: ${addr}`);
      } else {
        console.log(`  Module [${mod.padEnd(20)}]: [NOT REGISTERED]`);
      }
    } catch (e: any) {
      console.log(`  Module [${mod.padEnd(20)}]: Error: ${e.message}`);
    }
  }

  // STEP 2: Audit each contract
  console.log('\n--- STEP 2: CONTRACT-BY-CONTRACT LIVE AUDIT ---');
  const results = [];

  for (const target of ALL_CONTRACTS) {
    const r: any = {
      name: target.name,
      category: target.category,
      address: target.address,
      expectedMechanism: target.expectedMechanism,
      isDeployed: false,
      owner: null,
      pendingOwner: null,
      admin: null,
      supportedRoles: [] as string[],
      rolesHeldBy96da: [] as string[],
      rolesMissingFor96da: [] as string[],
      rolesHeldByOldAdmin: [] as string[],
      roleAdmins: {} as Record<string, string>,
      extra: {} as Record<string, any>,
      status: 'PASS',
      notes: [] as string[],
    };

    // Check code length
    const code = await client.getBytecode({ address: target.address });
    if (!code || code === '0x') {
      r.status = 'MISSING';
      r.notes.push('NOT DEPLOYED (no bytecode on Base Sepolia)');
      results.push(r);
      continue;
    }
    r.isDeployed = true;

    // Check owner()
    try {
      const owner = await client.readContract({
        address: target.address,
        abi: GENERIC_ABI,
        functionName: 'owner',
      });
      r.owner = owner;
      try {
        const pending = await client.readContract({
          address: target.address,
          abi: GENERIC_ABI,
          functionName: 'pendingOwner',
        });
        if (pending !== '0x0000000000000000000000000000000000000000') {
          r.pendingOwner = pending;
        }
      } catch {}
    } catch {}

    // Check admin()
    try {
      const admin = await client.readContract({
        address: target.address,
        abi: GENERIC_ABI,
        functionName: 'admin',
      });
      r.admin = admin;
    } catch {}

    // Check extra fields
    try {
      r.extra.verifyingSigner = await client.readContract({
        address: target.address,
        abi: GENERIC_ABI,
        functionName: 'verifyingSigner',
      });
    } catch {}
    try {
      r.extra.refillOperator = await client.readContract({
        address: target.address,
        abi: GENERIC_ABI,
        functionName: 'refillOperator',
      });
    } catch {}
    try {
      r.extra.paymaster = await client.readContract({
        address: target.address,
        abi: GENERIC_ABI,
        functionName: 'paymaster',
      });
    } catch {}
    try {
      r.extra.minDelay = (
        await client.readContract({
          address: target.address,
          abi: GENERIC_ABI,
          functionName: 'getMinDelay',
        })
      ).toString();
    } catch {}

    // Check AccessControl roles
    for (const [roleName, roleHash] of Object.entries(ROLES)) {
      try {
        const has96da = await client.readContract({
          address: target.address,
          abi: GENERIC_ABI,
          functionName: 'hasRole',
          args: [roleHash, TARGET_96DA],
        });
        if (!r.supportedRoles.includes(roleName)) {
          r.supportedRoles.push(roleName);
        }
        if (has96da) {
          r.rolesHeldBy96da.push(roleName);
        } else if (target.requiredRolesFor96da?.includes(roleName)) {
          r.rolesMissingFor96da.push(roleName);
        }

        // Check if Old Admin holds it
        const hasOld = await client.readContract({
          address: target.address,
          abi: GENERIC_ABI,
          functionName: 'hasRole',
          args: [roleHash, DEPLOYER_OLD_ADMIN],
        });
        if (hasOld) {
          r.rolesHeldByOldAdmin.push(roleName);
        }

        // Check role admin
        try {
          const roleAdminHash = await client.readContract({
            address: target.address,
            abi: GENERIC_ABI,
            functionName: 'getRoleAdmin',
            args: [roleHash],
          });
          const adminName =
            Object.keys(ROLES).find(
              (k) => ROLES[k].toLowerCase() === roleAdminHash.toLowerCase(),
            ) || roleAdminHash;
          r.roleAdmins[roleName] = adminName;
        } catch {}
      } catch {}
    }

    // Determine status
    if (target.expectedMechanism === 'None' || (!r.owner && r.supportedRoles.length === 0)) {
      r.status = 'N/A';
    } else {
      let isPass = true;
      if (target.requiresOwner96da) {
        if (!r.owner || r.owner.toLowerCase() !== TARGET_96DA.toLowerCase()) {
          isPass = false;
          r.notes.push(`Owner is ${r.owner}, expected ${TARGET_96DA}`);
        }
      }
      if (target.requiredRolesFor96da && target.requiredRolesFor96da.length > 0) {
        for (const req of target.requiredRolesFor96da) {
          if (!r.rolesHeldBy96da.includes(req)) {
            isPass = false;
            r.notes.push(`Missing role ${req}`);
          }
        }
      }
      r.status = isPass ? 'PASS' : 'MISSING';
    }

    results.push(r);

    // Print summary line
    console.log(`Contract: ${r.name.padEnd(28)} | Address: ${r.address} | Status: [${r.status}]`);
    if (r.owner) {
      console.log(
        `  Owner: ${r.owner} (Matches 96da: ${r.owner.toLowerCase() === TARGET_96DA.toLowerCase()})`,
      );
      if (r.pendingOwner) console.log(`  Pending Owner: ${r.pendingOwner}`);
    }
    if (r.rolesHeldBy96da.length > 0) {
      console.log(`  Roles Held by 96da:    [${r.rolesHeldBy96da.join(', ')}]`);
    }
    if (r.rolesMissingFor96da.length > 0) {
      console.log(`  Roles MISSING for 96da: [${r.rolesMissingFor96da.join(', ')}]`);
    }
    if (r.rolesHeldByOldAdmin.length > 0) {
      console.log(
        `  Roles Held by OldAdmin: [${r.rolesHeldByOldAdmin.join(', ')}] (WARNING: Deployer still holds authority)`,
      );
    }
    if (r.extra.verifyingSigner) console.log(`  Verifying Signer: ${r.extra.verifyingSigner}`);
    if (r.extra.refillOperator) console.log(`  Refill Operator: ${r.extra.refillOperator}`);
    if (r.extra.minDelay)
      console.log(
        `  Timelock Min Delay: ${r.extra.minDelay}s (${Number(r.extra.minDelay) / 3600}h)`,
      );
  }

  return results;
}

if (require.main === module) {
  runFullAudit().catch(console.error);
}
