// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/aa/UnifyVaultPaymaster.sol';
import '../src/aa/GasTreasury.sol';
import '../src/aa/interfaces/IPaymasterV07.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/token/UVBEV2.sol';
import '../src/treasury/CostBasisManagerV2.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IEntryPointV07Transfer {
  function handleOps(PackedUserOperation[] calldata ops, address payable beneficiary) external;

  function getNonce(address sender, uint192 key) external view returns (uint256 nonce);
  function getUserOpHash(PackedUserOperation calldata userOp) external view returns (bytes32);
  function balanceOf(address account) external view returns (uint256);
}

contract LiveSimSimpleAccount {
  address public owner;
  address public immutable entryPoint;

  constructor(address _entryPoint, address _owner) {
    entryPoint = _entryPoint;
    owner = _owner;
  }

  modifier onlyEntryPointOrOwner() {
    require(msg.sender == entryPoint || msg.sender == owner, 'account: not owner or entrypoint');
    _;
  }

  function execute(
    address dest,
    uint256 value,
    bytes calldata func
  ) external payable onlyEntryPointOrOwner returns (bytes memory) {
    (bool success, bytes memory result) = dest.call{ value: value }(func);
    require(success, 'account: call failed');
    return result;
  }

  function executeBatch(
    address[] calldata dests,
    uint256[] calldata values,
    bytes[] calldata funcs
  ) external payable onlyEntryPointOrOwner returns (bytes[] memory results) {
    require(
      dests.length == values.length && values.length == funcs.length,
      'account: length mismatch'
    );
    results = new bytes[](dests.length);
    for (uint256 i = 0; i < dests.length; i++) {
      (bool success, bytes memory res) = dests[i].call{ value: values[i] }(funcs[i]);
      require(success, 'account: batch call failed');
      results[i] = res;
    }
  }

  function validateUserOp(
    PackedUserOperation calldata /* userOp */,
    bytes32 /* userOpHash */,
    uint256 missingAccountFunds
  ) external returns (uint256 validationData) {
    require(msg.sender == entryPoint, 'account: not EntryPoint');
    if (missingAccountFunds > 0) {
      (bool success, ) = payable(msg.sender).call{ value: missingAccountFunds }('');
      require(success, 'account: failed to pay missing funds');
    }
    return 0; // Valid
  }

  receive() external payable {}
}

contract ExecuteLiveGaslessTransfer is Script {
  address public constant CANONICAL_ENTRYPOINT_V07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
  address public constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant DEPLOYED_CONTROLLER = 0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec;
  address public constant DEPLOYED_TOKEN = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant DEPLOYED_PAYMASTER = 0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6;
  address public constant DEPLOYED_CBM = 0x57869372AFbd7b61752f2f8d3e7F37701e28517B;

  function run() external {
    address deployer = msg.sender;
    IEntryPointV07Transfer entryPoint = IEntryPointV07Transfer(CANONICAL_ENTRYPOINT_V07);
    IERC20 usdc = IERC20(BASE_SEPOLIA_USDC);
    UVBEV2 uvbe = UVBEV2(DEPLOYED_TOKEN);
    CostBasisManagerV2 cbm = CostBasisManagerV2(DEPLOYED_CBM);

    console.log('=== UNIFYVAULT PHASE 2B-1: LIVE GASLESS UVBE TRANSFER ===');
    console.log('Relayer / Deployer Address:', deployer);

    vm.startBroadcast();

    // 1. Deploy Test Sender Smart Account with STRICTLY 0 ETH
    LiveSimSimpleAccount senderAccount = new LiveSimSimpleAccount(
      CANONICAL_ENTRYPOINT_V07,
      deployer
    );
    // Deploy Test Recipient Smart Account with STRICTLY 0 ETH
    LiveSimSimpleAccount recipientAccount = new LiveSimSimpleAccount(
      CANONICAL_ENTRYPOINT_V07,
      deployer
    );

    console.log('Sender Smart Account:', address(senderAccount));
    console.log('Recipient Smart Account:', address(recipientAccount));
    require(address(senderAccount).balance == 0, 'Sender must have 0 ETH');
    require(address(recipientAccount).balance == 0, 'Recipient must have 0 ETH');

    // 2. Fund Sender Smart Account with 0.15 USDC (150,000 units) to acquire initial UVBE shares
    uint256 depositAmount = 150_000;
    usdc.transfer(address(senderAccount), depositAmount);
    require(usdc.balanceOf(address(senderAccount)) == depositAmount, 'USDC funding failed');

    // 3. Deposit to obtain UVBE shares on sender
    address[] memory depositDests = new address[](2);
    depositDests[0] = BASE_SEPOLIA_USDC;
    depositDests[1] = DEPLOYED_CONTROLLER;

    uint256[] memory depositValues = new uint256[](2);
    depositValues[0] = 0;
    depositValues[1] = 0;

    bytes[] memory depositFuncs = new bytes[](2);
    depositFuncs[0] = abi.encodeWithSelector(
      IERC20.approve.selector,
      DEPLOYED_CONTROLLER,
      depositAmount
    );
    depositFuncs[1] = abi.encodeWithSelector(
      UnifyVaultController.deposit.selector,
      BASE_SEPOLIA_USDC,
      depositAmount,
      0,
      address(senderAccount)
    );

    bytes memory depositBatchData = abi.encodeWithSelector(
      senderAccount.executeBatch.selector,
      depositDests,
      depositValues,
      depositFuncs
    );

    PackedUserOperation memory depositOp;
    depositOp.sender = address(senderAccount);
    depositOp.nonce = entryPoint.getNonce(address(senderAccount), 0);
    depositOp.initCode = '';
    depositOp.callData = depositBatchData;
    depositOp.accountGasLimits = bytes32(abi.encodePacked(uint128(250_000), uint128(1_500_000)));
    depositOp.preVerificationGas = 100_000;
    depositOp.gasFees = bytes32(abi.encodePacked(uint128(1 gwei), uint128(1 gwei)));
    depositOp.paymasterAndData = abi.encodePacked(
      DEPLOYED_PAYMASTER,
      uint128(100_000),
      uint128(100_000)
    );
    depositOp.signature = hex'01';

    PackedUserOperation[] memory depositOps = new PackedUserOperation[](1);
    depositOps[0] = depositOp;
    entryPoint.handleOps(depositOps, payable(deployer));

    uint256 senderInitialUVBE = uvbe.balanceOf(address(senderAccount));
    console.log('Sender Acquired UVBE Shares:', senderInitialUVBE);
    require(senderInitialUVBE > 0, 'Sender must have UVBE shares');
    require(address(senderAccount).balance == 0, 'Sender ETH must be strictly 0');

    uint256 initialTotalSupply = uvbe.totalSupply();
    uint256 senderBasisBefore = cbm.costBasis(address(senderAccount));
    uint256 recipientBasisBefore = cbm.costBasis(address(recipientAccount));
    console.log('Total Supply Before Transfer:', initialTotalSupply);
    console.log('Sender Cost Basis Before Transfer:', senderBasisBefore);
    console.log('Recipient Cost Basis Before Transfer:', recipientBasisBefore);

    // 4. Construct Gasless UVBE Transfer UserOperation (Transfer 50% of UVBE)
    uint256 transferAmount = senderInitialUVBE / 2;
    bytes memory transferFunc = abi.encodeWithSelector(
      IERC20.transfer.selector,
      address(recipientAccount),
      transferAmount
    );

    bytes memory transferCallData = abi.encodeWithSelector(
      senderAccount.execute.selector,
      DEPLOYED_TOKEN,
      0,
      transferFunc
    );

    PackedUserOperation memory transferOp;
    transferOp.sender = address(senderAccount);
    transferOp.nonce = entryPoint.getNonce(address(senderAccount), 0);
    transferOp.initCode = '';
    transferOp.callData = transferCallData;
    transferOp.accountGasLimits = bytes32(abi.encodePacked(uint128(250_000), uint128(500_000)));
    transferOp.preVerificationGas = 100_000;
    transferOp.gasFees = bytes32(abi.encodePacked(uint128(1 gwei), uint128(1 gwei)));
    transferOp.paymasterAndData = abi.encodePacked(
      DEPLOYED_PAYMASTER,
      uint128(100_000),
      uint128(100_000)
    );
    transferOp.signature = hex'01';

    bytes32 transferOpHash = entryPoint.getUserOpHash(transferOp);
    console.log('Transfer UserOperation Hash:');
    console.logBytes32(transferOpHash);

    // 5. Submit Gasless Transfer to Canonical EntryPoint v0.7
    PackedUserOperation[] memory transferOps = new PackedUserOperation[](1);
    transferOps[0] = transferOp;

    entryPoint.handleOps(transferOps, payable(deployer));
    console.log('Gasless UVBE Transfer Confirmed on Base Sepolia!');

    // 6. Verify Post-Transfer Invariants
    console.log('Sender ETH After Transfer:', address(senderAccount).balance);
    console.log('Recipient ETH After Transfer:', address(recipientAccount).balance);
    require(address(senderAccount).balance == 0, 'CRITICAL: Sender ETH must remain strictly 0');
    require(
      address(recipientAccount).balance == 0,
      'CRITICAL: Recipient ETH must remain strictly 0'
    );

    uint256 senderUVBEAfter = uvbe.balanceOf(address(senderAccount));
    uint256 recipientUVBEAfter = uvbe.balanceOf(address(recipientAccount));
    console.log('Sender UVBE After Transfer:', senderUVBEAfter);
    console.log('Recipient UVBE After Transfer:', recipientUVBEAfter);
    require(
      senderUVBEAfter == senderInitialUVBE - transferAmount,
      'Sender balance must reduce by transferAmount'
    );
    require(recipientUVBEAfter == transferAmount, 'Recipient balance must equal transferAmount');

    // Check Total Supply Invariant
    uint256 supplyAfter = uvbe.totalSupply();
    console.log('Total Supply After Transfer:', supplyAfter);
    require(supplyAfter == initialTotalSupply, 'Total supply must be strictly unchanged');

    // Check Cost Basis Conservation Invariant
    uint256 senderBasisAfter = cbm.costBasis(address(senderAccount));
    uint256 recipientBasisAfter = cbm.costBasis(address(recipientAccount));
    console.log('Sender Basis After Transfer:', senderBasisAfter);
    console.log('Recipient Basis After Transfer:', recipientBasisAfter);
    require(
      senderBasisAfter + recipientBasisAfter == senderBasisBefore,
      'Cost basis must be strictly conserved'
    );

    // Check P&L Invariant
    require(cbm.realizedPnL(address(senderAccount)) == 0, 'No P&L generated on sender');
    require(cbm.realizedPnL(address(recipientAccount)) == 0, 'No P&L generated on recipient');

    vm.stopBroadcast();
    console.log('=== PHASE 2B-1 LIVE ON-CHAIN VERIFICATION COMPLETE & SUCCESSFUL ===');
  }
}
