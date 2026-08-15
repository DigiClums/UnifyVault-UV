import { createPublicClient, http, parseAbi, keccak256, toHex } from 'viem';
import { baseSepolia } from 'viem/chains';

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia.g.alchemy.com/v2/MkIl1aCbfeHNPO7ZBU7S8';
const TARGET_ADMIN = '0xd905920c91853039060246Ed5724AA72B91a96DA'; // Canonical 96da wallet

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  GOVERNANCE_ROLE: keccak256(toHex('GOVERNANCE_ROLE')),
  GUARDIAN_ROLE: keccak256(toHex('GUARDIAN_ROLE')),
  OPERATOR_ROLE: keccak256(toHex('OPERATOR_ROLE')),
  CONTROLLER_ROLE: keccak256(toHex('CONTROLLER_ROLE')),
  TIMELOCK_ROLE: keccak256(toHex('TIMELOCK_ROLE')),
  ARBITRATOR_ROLE: keccak256(toHex('ARBITRATOR_ROLE')),
  PROPOSER_ROLE: keccak256(toHex('PROPOSER_ROLE')),
  EXECUTOR_ROLE: keccak256(toHex('EXECUTOR_ROLE')),
  CANCELLER_ROLE: keccak256(toHex('CANCELLER_ROLE')),
};

const CONTRACTS: {
  name: string;
  address: `0x${string}`;
  expectedMechanism: string;
  requiredRoles?: string[];
}[] = [
  {
    name: 'ProtocolDirectory',
    address: '0x8040006d6907a84911aaC0a9aC08278311B156e2',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'Treasury',
    address: '0xB8c8113a042f39936dD966A5983fAaE2bF7b7290',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'CustodyVault',
    address: '0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE', 'GUARDIAN_ROLE'],
  },
  {
    name: 'FeeManager',
    address: '0x07f8BD7DAf5002C3C62B3c1280e9258AbBEfA2f1',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'OracleManager',
    address: '0xc96d36Acf3ef58d03fdEA56aa90a30d02ceb73BF',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'ChainlinkOracleProvider',
    address: '0xCF46A80BbF2e92c16f7e1953F9AC73935340f69B',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'LiquidityManager',
    address: '0xd1DCd311ACD1176E35823360652FCb356a7F227F',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE', 'CONTROLLER_ROLE'],
  },
  {
    name: 'UVBEV2 (UVBEToken)',
    address: '0x006c5DF13C716E5224b33956651C4356BB90DEc0',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE', 'GUARDIAN_ROLE'],
  },
  {
    name: 'UnifyVaultController',
    address: '0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE', 'GUARDIAN_ROLE'],
  },
  {
    name: 'StrategyManager',
    address: '0x73c894DEFBBd69F09134D53a73A0F6bfaeF5A7Bb',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'PortfolioManager',
    address: '0xd34A8d9cE90ebc2987c40ceafE126E5EF2931D9b',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'SwapAdapter',
    address: '0xbc97337dE85654aCD96182C93841f21168da65B4',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'CostBasisManagerV2',
    address: '0x57869372AFbd7b61752f2f8d3e7F37701e28517B',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'PerformanceManager',
    address: '0xF1670ca0054D649d1E3dd2f1d642Cc8Ed70109F6',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
  {
    name: 'P2PEscrowV2',
    address: '0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE', 'ARBITRATOR_ROLE', 'GUARDIAN_ROLE'],
  },
  {
    name: 'Marketplace',
    address: '0xe908377f96F313a6b7771570ff6Fb414D38F451A',
    expectedMechanism: 'Ownable',
    requiredRoles: [],
  },
  {
    name: 'UnifyVaultTimelock',
    address: '0x9094145Cd2AEA2f309eDf14237444a07edF98d02',
    expectedMechanism: 'TimelockController / AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'PROPOSER_ROLE', 'EXECUTOR_ROLE', 'CANCELLER_ROLE'],
  },
  {
    name: 'UnifyVaultPaymaster',
    address: '0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6',
    expectedMechanism: 'Ownable',
    requiredRoles: [],
  },
  {
    name: 'Phase1 Paymaster (Legacy)',
    address: '0x42c6342516714CFd64474bd41Ce360605b9fEA88',
    expectedMechanism: 'Ownable',
    requiredRoles: [],
  },
  {
    name: 'Legacy ProtocolDirectory',
    address: '0x329158A24DdC8ED267cc5D3f3D9C2905149C596D',
    expectedMechanism: 'AccessControl',
    requiredRoles: ['DEFAULT_ADMIN_ROLE', 'GOVERNANCE_ROLE'],
  },
];

const GENERIC_ABI = parseAbi([
  'function owner() view returns (address)',
  'function pendingOwner() view returns (address)',
  'function admin() view returns (address)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function getRoleAdmin(bytes32 role) view returns (bytes32)',
  'function getRoleMemberCount(bytes32 role) view returns (uint256)',
  'function getRoleMember(bytes32 role, uint256 index) view returns (address)',
  'function verifyingSigner() view returns (address)',
  'function treasury() view returns (address)',
  'function feeBps() view returns (uint256)',
]);

async function inspectContract(c: (typeof CONTRACTS)[0]) {
  const result: any = {
    name: c.name,
    address: c.address,
    hasOwner: false,
    owner: null,
    pendingOwner: null,
    hasAccessControl: false,
    rolesHeldByTarget: [] as string[],
    rolesMissingForTarget: [] as string[],
    allRoleHolders: {} as Record<string, string[]>,
    extra: {} as Record<string, any>,
    targetStatus: 'UNKNOWN',
  };

  // 1. Check owner() & pendingOwner()
  try {
    const owner = await client.readContract({
      address: c.address,
      abi: GENERIC_ABI,
      functionName: 'owner',
    });
    result.hasOwner = true;
    result.owner = owner;

    try {
      const pendingOwner = await client.readContract({
        address: c.address,
        abi: GENERIC_ABI,
        functionName: 'pendingOwner',
      });
      result.pendingOwner = pendingOwner;
    } catch {}
  } catch {}

  // 2. Check admin() if any
  try {
    const admin = await client.readContract({
      address: c.address,
      abi: GENERIC_ABI,
      functionName: 'admin',
    });
    result.extra.admin = admin;
  } catch {}

  // 3. Check verifyingSigner if paymaster
  try {
    const signer = await client.readContract({
      address: c.address,
      abi: GENERIC_ABI,
      functionName: 'verifyingSigner',
    });
    result.extra.verifyingSigner = signer;
  } catch {}

  // 4. Check AccessControl
  let supportsAC = false;
  for (const [roleName, roleHash] of Object.entries(ROLES)) {
    try {
      const has = await client.readContract({
        address: c.address,
        abi: GENERIC_ABI,
        functionName: 'hasRole',
        args: [roleHash as `0x${string}`, TARGET_ADMIN as `0x${string}`],
      });
      supportsAC = true;
      if (has) {
        result.rolesHeldByTarget.push(roleName);
      }

      // Check if target is missing this role if required
      if (c.requiredRoles?.includes(roleName) && !has) {
        result.rolesMissingForTarget.push(roleName);
      }

      // Try reading role members if Enumerable
      try {
        const count = await client.readContract({
          address: c.address,
          abi: GENERIC_ABI,
          functionName: 'getRoleMemberCount',
          args: [roleHash as `0x${string}`],
        });
        const members: string[] = [];
        for (let i = 0n; i < count; i++) {
          const m = await client.readContract({
            address: c.address,
            abi: GENERIC_ABI,
            functionName: 'getRoleMember',
            args: [roleHash as `0x${string}`, i],
          });
          members.push(m);
        }
        if (members.length > 0) {
          result.allRoleHolders[roleName] = members;
        }
      } catch {}
    } catch {}
  }
  result.hasAccessControl = supportsAC;

  // Determine status
  if (!result.hasOwner && !result.hasAccessControl) {
    result.targetStatus = 'N/A';
  } else {
    let pass = true;
    if (result.hasOwner) {
      if (result.owner?.toLowerCase() !== TARGET_ADMIN.toLowerCase()) {
        pass = false;
      }
    }
    if (c.requiredRoles && c.requiredRoles.length > 0) {
      for (const req of c.requiredRoles) {
        if (!result.rolesHeldByTarget.includes(req)) {
          pass = false;
        }
      }
    }
    result.targetStatus = pass ? 'PASS' : 'MISSING';
  }

  return result;
}

async function main() {
  console.log('================================================================================');
  console.log('UNIFYVAULT LIVE ON-CHAIN ADMIN & ROLE AUDIT (BASE SEPOLIA)');
  console.log('Target Canonical Admin (96da):', TARGET_ADMIN);
  console.log('RPC:', RPC_URL);
  console.log('================================================================================\n');

  const auditResults: any[] = [];
  for (const c of CONTRACTS) {
    const res = await inspectContract(c);
    auditResults.push(res);
    console.log(`Contract: ${res.name.padEnd(26)} | Address: ${res.address}`);
    if (res.hasOwner) {
      console.log(
        `  Owner: ${res.owner} (Target matches: ${res.owner?.toLowerCase() === TARGET_ADMIN.toLowerCase()})`,
      );
      if (res.pendingOwner && res.pendingOwner !== '0x0000000000000000000000000000000000000000') {
        console.log(`  Pending Owner: ${res.pendingOwner}`);
      }
    }
    if (res.hasAccessControl) {
      console.log(`  Target Held Roles:    [${res.rolesHeldByTarget.join(', ')}]`);
      if (res.rolesMissingForTarget.length > 0) {
        console.log(`  Target MISSING Roles: [${res.rolesMissingForTarget.join(', ')}]`);
      }
    }
    if (res.extra.verifyingSigner) {
      console.log(`  Paymaster Signer: ${res.extra.verifyingSigner}`);
    }
    console.log(`  Overall Target Status: [${res.targetStatus}]\n`);
  }

  console.log('\n================================================================================');
  console.log('SUMMARY TABLE:');
  console.log('================================================================================');
  console.table(
    auditResults.map((r) => ({
      Contract: r.name,
      Address: r.address,
      Mechanism: r.hasOwner
        ? r.hasAccessControl
          ? 'Ownable + AccessControl'
          : 'Ownable'
        : r.hasAccessControl
          ? 'AccessControl'
          : 'N/A',
      CurrentOwnerOrAdmin:
        r.owner || (r.rolesHeldByTarget.length > 0 ? r.rolesHeldByTarget.join(',') : 'See details'),
      Target96daStatus: r.targetStatus,
    })),
  );
}

main().catch(console.error);
