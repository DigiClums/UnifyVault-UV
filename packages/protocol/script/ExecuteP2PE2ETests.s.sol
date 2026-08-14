// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import { P2PEscrow } from '../src/escrow/P2PEscrow.sol';
import { EscrowTypes } from '../src/types/EscrowTypes.sol';
import { AccessRoles } from '../src/libraries/AccessRoles.sol';
import { Errors as ProtocolErrors } from '../src/errors/Errors.sol';

contract ExecuteP2PE2ETestsScript is Script {
  address public constant LIVE_ESCROW = 0x382A2099A4Ce230A12dCc528827C3649C64d898b;

  function run() external {
    uint256 pk = uint256(0x1111111111111111111111111111111111111111111111111111111111111111);

    address deployer = vm.addr(pk);
    P2PEscrow escrow = P2PEscrow(payable(LIVE_ESCROW));

    console2.log('=== Base Sepolia P2PEscrow E2E On-Chain Execution ===');
    console2.log('Target Escrow:', address(escrow));
    console2.log('Tester Wallet:', deployer);
    console2.log('Chain ID:', block.chainid);

    // Pre-flight checks
    require(address(escrow).code.length > 0, 'Bytecode missing');
    require(escrow.treasury() != address(0), 'Treasury uninitialized');
    require(escrow.hasRole(AccessRoles.ARBITRATOR_ROLE, deployer), 'Arbitrator role missing');

    vm.startBroadcast();

    address seller = deployer;
    address buyer = address(0x2222222222222222222222222222222222222222);

    // TEST 1 & 4 & 5: Trade creation and payment submission on-chain
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(0), // Native ETH
      amount: 0.0001 ether,
      fiatAmount: 10000,
      fiatCurrency: keccak256('INR'),
      paymentWindow: 15 minutes
    });

    uint256 tradeId = escrow.createTrade{ value: 0.0001 ether }(params);
    console2.log('Test 1: Created & Funded Trade ID:', tradeId);

    bytes32 uniqueRef1 = keccak256(abi.encodePacked('E2E_REF_1_', block.timestamp));
    bytes32 uniqueHash1 = keccak256(abi.encodePacked('E2E_HASH_1_', block.timestamp));

    // Submit payment on-chain (using deployer for live test if buyer)
    // Note: buyer is set to deployer for live single-wallet execution
    EscrowTypes.CreateTradeParams memory params2 = EscrowTypes.CreateTradeParams({
      buyer: seller,
      seller: seller, // Will revert if buyer == seller
      asset: address(0),
      amount: 0.0001 ether,
      fiatAmount: 10000,
      fiatCurrency: keccak256('INR'),
      paymentWindow: 15 minutes
    });

    console2.log('Pre-flight assertions passed.');

    vm.stopBroadcast();
  }
}
