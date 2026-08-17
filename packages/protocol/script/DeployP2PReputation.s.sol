// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/reputation/P2PReputation.sol';

/**
 * @title DeployP2PReputationScript
 * @notice Deterministic deployment script for Phase 6 P2PReputation on Base Sepolia.
 *
 * Security Invariants:
 * 1. Zero Admin Initialization: P2PReputation has no admin or owner roles.
 * 2. Zero Token Approvals: P2PReputation does not approve or transfer tokens.
 * 3. Zero ETH Funding: P2PReputation has no payable functions and holds 0 ETH.
 * 4. Zero Protocol Role Mutations: Does not alter AccessRoles or Directory.
 * 5. Zero Vault/Accounting Interaction: 100% isolated deployment.
 */
contract DeployP2PReputationScript is Script {
  // Canonical Base Sepolia P2PEscrowV2 Address
  address public constant CANONICAL_P2P_ESCROW = 0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb;

  function run() external returns (address reputationAddr) {
    console.log('=== Deploying Audited P2PReputation to Base Sepolia ===');
    console.log('Target P2PEscrow:', CANONICAL_P2P_ESCROW);

    vm.startBroadcast();

    // Deploy isolated P2PReputation contract immutably bound to canonical P2PEscrowV2
    P2PReputation reputation = new P2PReputation(CANONICAL_P2P_ESCROW);
    reputationAddr = address(reputation);

    vm.stopBroadcast();

    console.log('----------------------------------------------------');
    console.log('P2PReputation deployed at:', reputationAddr);
    console.log('Bound to P2PEscrowV2:     ', CANONICAL_P2P_ESCROW);
    console.log('----------------------------------------------------');
  }
}
