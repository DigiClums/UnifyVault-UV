// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/aa/UnifyVaultPaymaster.sol';
import '../src/aa/GasTreasury.sol';
import '../src/aa/interfaces/IPaymasterV07.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/token/UVBEV2.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IEntryPointV07Live {
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

contract ExecuteLiveGaslessDepositAndRedeem is Script {
  address public constant CANONICAL_ENTRYPOINT_V07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
  address public constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant DEPLOYED_CONTROLLER = 0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec;
  address public constant DEPLOYED_TOKEN = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant DEPLOYED_PAYMASTER = 0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6;

  function run() external {
    address deployer = msg.sender;
    IEntryPointV07Live entryPoint = IEntryPointV07Live(CANONICAL_ENTRYPOINT_V07);
    IERC20 usdc = IERC20(BASE_SEPOLIA_USDC);
    UVBEV2 uvbe = UVBEV2(DEPLOYED_TOKEN);

    console.log('=== UNIFYVAULT LIVE ON-CHAIN AA EXECUTION ===');
    console.log('Relayer / Deployer Address:', deployer);
    console.log('Paymaster Deposit on EntryPoint:', entryPoint.balanceOf(DEPLOYED_PAYMASTER));

    vm.startBroadcast();

    // 1. Deploy Test Smart Account with STRICTLY 0 ETH
    LiveSimSimpleAccount smartAccount = new LiveSimSimpleAccount(
      CANONICAL_ENTRYPOINT_V07,
      deployer
    );
    console.log('Smart Account Deployed At:', address(smartAccount));
    console.log('Smart Account Initial ETH Balance:', address(smartAccount).balance);
    require(address(smartAccount).balance == 0, 'Smart account must start with 0 ETH');

    // 2. Fund Smart Account with 0.20 USDC (200,000 units)
    uint256 depositAmount = 200_000;
    usdc.transfer(address(smartAccount), depositAmount);
    console.log('Smart Account USDC Balance:', usdc.balanceOf(address(smartAccount)));
    require(usdc.balanceOf(address(smartAccount)) == depositAmount, 'USDC funding failed');

    // 3. Construct Gasless Deposit UserOp (Batch: Approve + Deposit)
    address[] memory dests = new address[](2);
    dests[0] = BASE_SEPOLIA_USDC;
    dests[1] = DEPLOYED_CONTROLLER;

    uint256[] memory values = new uint256[](2);
    values[0] = 0;
    values[1] = 0;

    bytes[] memory funcs = new bytes[](2);
    funcs[0] = abi.encodeWithSelector(IERC20.approve.selector, DEPLOYED_CONTROLLER, depositAmount);
    funcs[1] = abi.encodeWithSelector(
      UnifyVaultController.deposit.selector,
      BASE_SEPOLIA_USDC,
      depositAmount,
      0, // minShares
      address(smartAccount)
    );

    bytes memory batchCallData = abi.encodeWithSelector(
      smartAccount.executeBatch.selector,
      dests,
      values,
      funcs
    );

    uint256 nonce = entryPoint.getNonce(address(smartAccount), 0);

    PackedUserOperation memory depositOp;
    depositOp.sender = address(smartAccount);
    depositOp.nonce = nonce;
    depositOp.initCode = '';
    depositOp.callData = batchCallData;
    depositOp.accountGasLimits = bytes32(abi.encodePacked(uint128(250_000), uint128(1_500_000)));
    depositOp.preVerificationGas = 100_000;
    depositOp.gasFees = bytes32(abi.encodePacked(uint128(1 gwei), uint128(1 gwei)));
    depositOp.paymasterAndData = abi.encodePacked(
      DEPLOYED_PAYMASTER,
      uint128(100_000), // verificationGasLimit
      uint128(100_000) // postOpGasLimit
    );
    depositOp.signature = hex'01';

    bytes32 depositOpHash = entryPoint.getUserOpHash(depositOp);
    console.log('Deposit UserOperation Hash:');
    console.logBytes32(depositOpHash);

    // 4. Submit Gasless Deposit UserOperation to Canonical EntryPoint v0.7
    PackedUserOperation[] memory depositOps = new PackedUserOperation[](1);
    depositOps[0] = depositOp;

    entryPoint.handleOps(depositOps, payable(deployer));
    console.log('Gasless Deposit Executed Successfully on Base Sepolia!');

    // 5. Verify Post-Deposit Invariants on Live Chain
    console.log('Smart Account ETH Balance After Deposit:', address(smartAccount).balance);
    require(
      address(smartAccount).balance == 0,
      'CRITICAL: Smart account ETH balance must remain strictly 0'
    );

    uint256 sharesMinted = uvbe.balanceOf(address(smartAccount));
    console.log('Smart Account UVBE Shares Minted:', sharesMinted);
    require(sharesMinted > 0, 'Shares must have minted');
    console.log('Smart Account USDC Balance After Deposit:', usdc.balanceOf(address(smartAccount)));
    require(usdc.balanceOf(address(smartAccount)) == 0, 'Deposit USDC must be fully consumed');

    // 6. Construct Gasless Redeem UserOp
    bytes memory redeemCallData = abi.encodeWithSelector(
      UnifyVaultController.redeem.selector,
      BASE_SEPOLIA_USDC,
      sharesMinted,
      0, // minAssetsOut
      address(smartAccount),
      block.timestamp + 3600
    );

    bytes memory executeRedeemData = abi.encodeWithSelector(
      smartAccount.execute.selector,
      DEPLOYED_CONTROLLER,
      0,
      redeemCallData
    );

    uint256 redeemNonce = entryPoint.getNonce(address(smartAccount), 0);

    PackedUserOperation memory redeemOp;
    redeemOp.sender = address(smartAccount);
    redeemOp.nonce = redeemNonce;
    redeemOp.initCode = '';
    redeemOp.callData = executeRedeemData;
    redeemOp.accountGasLimits = bytes32(abi.encodePacked(uint128(250_000), uint128(1_800_000)));
    redeemOp.preVerificationGas = 100_000;
    redeemOp.gasFees = bytes32(abi.encodePacked(uint128(1 gwei), uint128(1 gwei)));
    redeemOp.paymasterAndData = abi.encodePacked(
      DEPLOYED_PAYMASTER,
      uint128(100_000),
      uint128(100_000)
    );
    redeemOp.signature = hex'01';

    bytes32 redeemOpHash = entryPoint.getUserOpHash(redeemOp);
    console.log('Redeem UserOperation Hash:');
    console.logBytes32(redeemOpHash);

    // 7. Submit Gasless Redeem UserOperation to EntryPoint v0.7
    PackedUserOperation[] memory redeemOps = new PackedUserOperation[](1);
    redeemOps[0] = redeemOp;

    entryPoint.handleOps(redeemOps, payable(deployer));
    console.log('Gasless Redeem Executed Successfully on Base Sepolia!');

    // 8. Verify Post-Redeem Invariants on Live Chain
    console.log('Smart Account ETH Balance After Redeem:', address(smartAccount).balance);
    require(
      address(smartAccount).balance == 0,
      'CRITICAL: Smart account ETH balance must remain strictly 0'
    );

    uint256 sharesRemaining = uvbe.balanceOf(address(smartAccount));
    console.log('Smart Account Remaining UVBE Shares:', sharesRemaining);
    require(sharesRemaining == 0, 'All shares must be redeemed');

    uint256 usdcReturned = usdc.balanceOf(address(smartAccount));
    console.log('Smart Account USDC Returned After Redeem:', usdcReturned);
    require(usdcReturned > 0, 'USDC must have been returned to Smart Account');

    console.log(
      'Remaining Paymaster EntryPoint Deposit:',
      entryPoint.balanceOf(DEPLOYED_PAYMASTER)
    );

    vm.stopBroadcast();
    console.log('=== ALL LIVE ON-CHAIN ACCOUNT ABSTRACTION VERIFICATIONS PASSED ===');
  }
}
