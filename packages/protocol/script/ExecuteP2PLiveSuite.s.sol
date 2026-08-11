// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import { P2PEscrow } from '../src/escrow/P2PEscrow.sol';
import { EscrowTypes } from '../src/types/EscrowTypes.sol';
import { AccessRoles } from '../src/libraries/AccessRoles.sol';

contract ExecuteP2PLiveSuiteScript is Script {
  address public constant LIVE_ESCROW = 0x382A2099A4Ce230A12dCc528827C3649C64d898b;

  function run() external {
    address deployer = msg.sender;
    P2PEscrow escrow = P2PEscrow(payable(LIVE_ESCROW));

    console2.log('=== Base Sepolia P2PEscrow Live Test Suite ===');
    console2.log('Contract Address:', address(escrow));
    console2.log('Deployer / Arbitrator:', deployer);

    vm.startBroadcast();

    address buyerAddr = address(0x1111111111111111111111111111111111111111);

    // 1. Create Trade on-chain
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyerAddr,
      seller: deployer,
      asset: address(0),
      amount: 0.0001 ether,
      fiatAmount: 10000,
      fiatCurrency: keccak256('INR'),
      paymentWindow: 15 minutes
    });

    uint256 tradeId = escrow.createTrade{ value: 0.0001 ether }(params);
    console2.log('Created Trade ID:', tradeId);

    // 2. Raise Dispute on-chain
    escrow.raiseDispute(tradeId, keccak256('E2E_DISPUTE_REASON'));
    console2.log('Raised Dispute on Trade ID:', tradeId);

    // 3. Resolve Dispute on-chain by Arbitrator
    escrow.resolveDispute(tradeId, EscrowTypes.DisputeOutcome.REFUND_TO_SELLER);
    console2.log('Resolved Dispute to Seller on Trade ID:', tradeId);

    vm.stopBroadcast();
  }
}
