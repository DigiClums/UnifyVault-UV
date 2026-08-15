import { createPublicClient, http, parseAbi, keccak256, toHex, type Address, type Hex } from 'viem';
import { baseSepolia } from 'viem/chains';

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://base-sepolia.g.alchemy.com/v2/MkIl1aCbfeHNPO7ZBU7S8';
const TARGET_96DA: Address = '0xd905920c91853039060246Ed5724AA72B91a96DA';
const DEPLOYER_OLD_ADMIN: Address = '0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1';
const TIMELOCK_ADDRESS: Address = '0x9094145Cd2AEA2f309eDf14237444a07edF98d02';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const ROLES: Record<string, Hex> = {
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

const TIMELOCK_ABI = parseAbi([
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function getRoleAdmin(bytes32 role) view returns (bytes32)',
  'function getRoleMemberCount(bytes32 role) view returns (uint256)',
  'function getRoleMember(bytes32 role, uint256 index) view returns (address)',
  'function getMinDelay() view returns (uint256)',
  'function isOperation(bytes32 id) view returns (bool)',
  'function isOperationPending(bytes32 id) view returns (bool)',
  'function isOperationReady(bytes32 id) view returns (bool)',
  'function isOperationDone(bytes32 id) view returns (bool)',
]);

const GENERIC_ABI = parseAbi([
  'function owner() view returns (address)',
  'function pendingOwner() view returns (address)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function getRoleAdmin(bytes32 role) view returns (bytes32)',
  'function getRoleMemberCount(bytes32 role) view returns (uint256)',
  'function getRoleMember(bytes32 role, uint256 index) view returns (address)',
]);

async function main() {
  console.log('=== DETAILED TIMELOCK & ROLE HOLDER INSPECTION ===\n');

  console.log('--- 1. UnifyVaultTimelock Roles (0x9094145Cd2AEA2f309eDf14237444a07edF98d02) ---');
  const delay = await client.readContract({
    address: TIMELOCK_ADDRESS,
    abi: TIMELOCK_ABI,
    functionName: 'getMinDelay',
  });
  console.log('Min Delay:', delay.toString(), `seconds (${Number(delay) / 3600} hours)`);

  for (const [roleName, roleHash] of Object.entries(ROLES)) {
    const has96da = await client.readContract({
      address: TIMELOCK_ADDRESS,
      abi: TIMELOCK_ABI,
      functionName: 'hasRole',
      args: [roleHash, TARGET_96DA],
    });
    const hasOld = await client.readContract({
      address: TIMELOCK_ADDRESS,
      abi: TIMELOCK_ABI,
      functionName: 'hasRole',
      args: [roleHash, DEPLOYER_OLD_ADMIN],
    });
    const hasSelf = await client.readContract({
      address: TIMELOCK_ADDRESS,
      abi: TIMELOCK_ABI,
      functionName: 'hasRole',
      args: [roleHash, TIMELOCK_ADDRESS],
    });

    let members: string[] = [];
    try {
      const count = await client.readContract({
        address: TIMELOCK_ADDRESS,
        abi: TIMELOCK_ABI,
        functionName: 'getRoleMemberCount',
        args: [roleHash],
      });
      for (let i = 0n; i < count; i++) {
        const m = await client.readContract({
          address: TIMELOCK_ADDRESS,
          abi: TIMELOCK_ABI,
          functionName: 'getRoleMember',
          args: [roleHash, i],
        });
        members.push(m);
      }
    } catch {}

    const adminRoleHash = await client.readContract({
      address: TIMELOCK_ADDRESS,
      abi: TIMELOCK_ABI,
      functionName: 'getRoleAdmin',
      args: [roleHash],
    });
    const adminRoleName =
      Object.keys(ROLES).find((k) => ROLES[k].toLowerCase() === adminRoleHash.toLowerCase()) ||
      adminRoleHash;

    console.log(`Role: ${roleName.padEnd(20)} | AdminRole: ${adminRoleName}`);
    console.log(`  Target 96da has role:  ${has96da}`);
    console.log(`  OldAdmin has role:     ${hasOld}`);
    console.log(`  Timelock itself has:   ${hasSelf}`);
    if (members.length > 0) {
      console.log(`  Members: [${members.join(', ')}]`);
    }
  }

  // Inspect all contracts for any role held by oldAdmin
  console.log(
    '\n--- 2. Full Scan: Checking if Old Admin (0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1) holds ANY roles ---',
  );
  const { ALL_CONTRACTS } = require('./comprehensive_audit');
  for (const c of ALL_CONTRACTS) {
    const heldRoles: string[] = [];
    for (const [rName, rHash] of Object.entries(ROLES)) {
      try {
        const has = await client.readContract({
          address: c.address,
          abi: GENERIC_ABI,
          functionName: 'hasRole',
          args: [rHash, DEPLOYER_OLD_ADMIN],
        });
        if (has) heldRoles.push(rName);
      } catch {}
    }
    let owner = '';
    try {
      owner = await client.readContract({
        address: c.address,
        abi: GENERIC_ABI,
        functionName: 'owner',
      });
    } catch {}

    if (
      heldRoles.length > 0 ||
      (owner && owner.toLowerCase() === DEPLOYER_OLD_ADMIN.toLowerCase())
    ) {
      console.log(`Contract: ${c.name.padEnd(28)} | Address: ${c.address}`);
      if (owner && owner.toLowerCase() === DEPLOYER_OLD_ADMIN.toLowerCase()) {
        console.log(`  -> Old Admin is OWNER!`);
      }
      if (heldRoles.length > 0) {
        console.log(`  -> Old Admin holds roles: [${heldRoles.join(', ')}]`);
      }
    }
  }
}

main().catch(console.error);
