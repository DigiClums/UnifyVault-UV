// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/aa/UnifyVaultPaymaster.sol';
import '../src/aa/interfaces/IPaymasterV07.sol';
import '../src/token/UVBEV2.sol';
import '../src/treasury/CostBasisManagerV2.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IEntryPointV07SingleTransfer {
  function handleOps(PackedUserOperation[] calldata ops, address payable beneficiary) external;

  function getNonce(address sender, uint192 key) external view returns (uint256 nonce);
  function getUserOpHash(PackedUserOperation calldata userOp) external view returns (bytes32);
}

contract BroadcastGaslessTransferOnly is Script {
  address public constant CANONICAL_ENTRYPOINT_V07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
  address public constant DEPLOYED_TOKEN = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant DEPLOYED_PAYMASTER = 0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6;
  address public constant SENDER_SMART_ACCOUNT = 0x7d7a2FbCc9ee851a58B179E15f55ED83195511C0;
  address public constant RECIPIENT_SMART_ACCOUNT = 0x63b81Fc51688F89b479f90f08b09510D62cB9B18;
  address public constant DEPLOYED_CBM = 0x57869372AFbd7b61752f2f8d3e7F37701e28517B;

  function run() external {
    address relayer = msg.sender;
    IEntryPointV07SingleTransfer entryPoint = IEntryPointV07SingleTransfer(
      CANONICAL_ENTRYPOINT_V07
    );
    UVBEV2 uvbe = UVBEV2(DEPLOYED_TOKEN);
    CostBasisManagerV2 cbm = CostBasisManagerV2(DEPLOYED_CBM);

    console.log('=== PHASE 2B-1 BROADCAST GASLESS TRANSFER ===');
    console.log('Relayer Address:', relayer);
    console.log('Sender Smart Account:', SENDER_SMART_ACCOUNT);
    console.log('Recipient Smart Account:', RECIPIENT_SMART_ACCOUNT);

    uint256 senderUVBEBefore = uvbe.balanceOf(SENDER_SMART_ACCOUNT);
    uint256 recipientUVBEBefore = uvbe.balanceOf(RECIPIENT_SMART_ACCOUNT);
    uint256 totalSupplyBefore = uvbe.totalSupply();
    uint256 senderBasisBefore = cbm.costBasis(SENDER_SMART_ACCOUNT);
    uint256 recipientBasisBefore = cbm.costBasis(RECIPIENT_SMART_ACCOUNT);

    console.log('Sender UVBE Before:', senderUVBEBefore);
    console.log('Recipient UVBE Before:', recipientUVBEBefore);
    console.log('Sender ETH Before:', SENDER_SMART_ACCOUNT.balance);
    console.log('Recipient ETH Before:', RECIPIENT_SMART_ACCOUNT.balance);
    require(SENDER_SMART_ACCOUNT.balance == 0, 'Sender ETH must be strictly 0');
    require(RECIPIENT_SMART_ACCOUNT.balance == 0, 'Recipient ETH must be strictly 0');

    uint256 transferAmount = senderUVBEBefore / 2;
    require(transferAmount > 0, 'Transfer amount must be > 0');

    bytes memory transferFunc = abi.encodeWithSelector(
      IERC20.transfer.selector,
      RECIPIENT_SMART_ACCOUNT,
      transferAmount
    );

    // Call sender.execute(token, 0, transferFunc)
    bytes memory callData = abi.encodeWithSignature(
      'execute(address,uint256,bytes)',
      DEPLOYED_TOKEN,
      uint256(0),
      transferFunc
    );

    PackedUserOperation memory userOp;
    userOp.sender = SENDER_SMART_ACCOUNT;
    userOp.nonce = entryPoint.getNonce(SENDER_SMART_ACCOUNT, 0);
    userOp.initCode = '';
    userOp.callData = callData;
    userOp.accountGasLimits = bytes32(abi.encodePacked(uint128(250_000), uint128(500_000)));
    userOp.preVerificationGas = 100_000;
    userOp.gasFees = bytes32(abi.encodePacked(uint128(1 gwei), uint128(1 gwei)));
    userOp.paymasterAndData = abi.encodePacked(
      DEPLOYED_PAYMASTER,
      uint128(100_000),
      uint128(100_000)
    );
    userOp.signature = hex'01';

    bytes32 userOpHash = entryPoint.getUserOpHash(userOp);
    console.log('UserOperation Hash:');
    console.logBytes32(userOpHash);

    PackedUserOperation[] memory ops = new PackedUserOperation[](1);
    ops[0] = userOp;

    vm.startBroadcast();
    entryPoint.handleOps(ops, payable(relayer));
    vm.stopBroadcast();

    console.log('=== VERIFYING POST-TRANSFER ON-CHAIN INVARIANTS ===');
    uint256 senderUVBEAfter = uvbe.balanceOf(SENDER_SMART_ACCOUNT);
    uint256 recipientUVBEAfter = uvbe.balanceOf(RECIPIENT_SMART_ACCOUNT);
    uint256 totalSupplyAfter = uvbe.totalSupply();
    uint256 senderBasisAfter = cbm.costBasis(SENDER_SMART_ACCOUNT);
    uint256 recipientBasisAfter = cbm.costBasis(RECIPIENT_SMART_ACCOUNT);

    console.log('Sender UVBE After:', senderUVBEAfter);
    console.log('Recipient UVBE After:', recipientUVBEAfter);
    console.log('Sender ETH After:', SENDER_SMART_ACCOUNT.balance);
    console.log('Recipient ETH After:', RECIPIENT_SMART_ACCOUNT.balance);
    console.log('Total Supply After:', totalSupplyAfter);
    console.log('Sender Cost Basis After:', senderBasisAfter);
    console.log('Recipient Cost Basis After:', recipientBasisAfter);

    require(SENDER_SMART_ACCOUNT.balance == 0, 'CRITICAL: Sender ETH must remain strictly 0');
    require(RECIPIENT_SMART_ACCOUNT.balance == 0, 'CRITICAL: Recipient ETH must remain strictly 0');
    require(senderUVBEAfter == senderUVBEBefore - transferAmount, 'Sender balance mismatch');
    require(
      recipientUVBEAfter == recipientUVBEBefore + transferAmount,
      'Recipient balance mismatch'
    );
    require(totalSupplyAfter == totalSupplyBefore, 'Total supply must be strictly unchanged');
    require(
      senderBasisAfter + recipientBasisAfter == senderBasisBefore + recipientBasisBefore,
      'Cost basis conservation mismatch'
    );
    require(cbm.realizedPnL(SENDER_SMART_ACCOUNT) == 0, 'No P&L on sender');
    require(cbm.realizedPnL(RECIPIENT_SMART_ACCOUNT) == 0, 'No P&L on recipient');

    console.log('=== PHASE 2B-1 ON-CHAIN VERIFICATION 100% SUCCESSFUL ===');
  }
}
