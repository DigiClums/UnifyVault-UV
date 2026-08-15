// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script } from 'forge-std/Script.sol';
import { console2 } from 'forge-std/console2.sol';
import { Marketplace } from '../src/marketplace/Marketplace.sol';
import { P2PEscrow } from '../src/escrow/P2PEscrow.sol';
import { AccessRoles } from '../src/libraries/AccessRoles.sol';

contract DeployMarketplaceScript is Script {
  address public constant P2P_ESCROW_TARGET = 0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb;
  address public constant CANONICAL_UVBE = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

  function run() external returns (address marketplaceAddress) {
    require(
      block.chainid == BASE_SEPOLIA_CHAIN_ID,
      'Must deploy only to Base Sepolia (Chain ID: 84532)'
    );

    // 1. Verify P2PEscrow bytecode and state prior to deployment
    require(P2P_ESCROW_TARGET.code.length > 0, 'P2PEscrow has no bytecode');
    uint256 trades = P2PEscrow(payable(P2P_ESCROW_TARGET)).totalTrades();

    // 2. Verify Canonical UVBE token bytecode
    require(CANONICAL_UVBE.code.length > 0, 'Canonical UVBE token has no bytecode');

    console2.log('=== Deploying Audited Marketplace to Base Sepolia ===');
    console2.log('Deployer:', msg.sender);
    console2.log('Target P2PEscrow:', P2P_ESCROW_TARGET);
    console2.log('P2PEscrow verified totalTrades:', trades);
    console2.log('Canonical UVBE Token:', CANONICAL_UVBE);

    vm.startBroadcast();

    Marketplace marketplace = new Marketplace(P2P_ESCROW_TARGET);
    marketplaceAddress = address(marketplace);

    // Set canonical UVBE token for strict UVBE-only enforcement
    marketplace.setUvbeToken(CANONICAL_UVBE);

    vm.stopBroadcast();

    // Post-deployment wiring assertions
    require(address(marketplace.p2pEscrow()) == P2P_ESCROW_TARGET, 'Wiring mismatch: p2pEscrow');
    require(marketplace.uvbeToken() == CANONICAL_UVBE, 'Wiring mismatch: uvbeToken');
    require(marketplace.defaultPaymentWindow() == 900, 'Wiring mismatch: defaultPaymentWindow');
    require(marketplace.getOrderCount() == 0, 'Initial order count must be 0');
    require(!marketplace.paused(), 'Marketplace must not be paused');
    require(
      marketplace.hasRole(marketplace.DEFAULT_ADMIN_ROLE(), msg.sender),
      'Missing DEFAULT_ADMIN_ROLE'
    );
    require(
      marketplace.hasRole(AccessRoles.GOVERNANCE_ROLE, msg.sender),
      'Missing GOVERNANCE_ROLE'
    );
    require(marketplace.hasRole(AccessRoles.GUARDIAN_ROLE, msg.sender), 'Missing GUARDIAN_ROLE');

    console2.log('--- Deployment Successful & Verified ---');
    console2.log('Marketplace deployed at:', marketplaceAddress);
    console2.log('Verified p2pEscrow():', address(marketplace.p2pEscrow()));
    console2.log('Verified uvbeToken():', marketplace.uvbeToken());
    console2.log('Verified defaultPaymentWindow():', marketplace.defaultPaymentWindow());
    console2.log('Verified getOrderCount():', marketplace.getOrderCount());
    console2.log('Verified paused():', marketplace.paused());
  }
}
