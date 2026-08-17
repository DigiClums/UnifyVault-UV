// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/aa/UnifyVaultPaymaster.sol';
import '../../src/aa/GasTreasury.sol';
import '../../src/aa/interfaces/IPaymasterV07.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/vault/CustodyVault.sol';
import '../../src/treasury/CostBasisManagerV2.sol';
import '../../src/token/UVBEV2.sol';
import '../../src/ProtocolDirectory.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol';

interface IEntryPointV07Canonical {
  struct ReturnInfo {
    uint256 preOpGas;
    uint256 paid;
    bool sigFailed;
    uint48 validAfter;
    uint48 validUntil;
    bytes paymasterContext;
  }

  function handleOps(PackedUserOperation[] calldata ops, address payable beneficiary) external;

  function depositTo(address account) external payable;
  function balanceOf(address account) external view returns (uint256);
}

/**
 * @notice Standard ERC-4337 v0.7 SimpleAccount implementation for live simulation
 */
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
    PackedUserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 missingAccountFunds
  ) external returns (uint256 validationData) {
    require(msg.sender == entryPoint, 'account: not EntryPoint');
    // In live test environment, check owner signature or validate call
    if (missingAccountFunds > 0) {
      (bool success, ) = payable(msg.sender).call{ value: missingAccountFunds }('');
      require(success, 'account: failed to pay missing funds');
    }
    return 0; // Valid
  }

  receive() external payable {}
}

/**
 * @title BaseSepoliaAALiveTest
 * @notice End-to-end verification of UnifyVault Account Abstraction on Base Sepolia
 * Validates that a user with 0 native ETH can deposit and redeem via self-managed Paymaster & GasTreasury.
 */
interface VmExtAA {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
  function envString(string calldata key) external returns (string memory);
}

contract BaseSepoliaAALiveTest is Test {
  VmExtAA internal constant vmExt = VmExtAA(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));
  using ECDSA for bytes32;
  using MessageHashUtils for bytes32;

  // Canonical Base Sepolia Addresses
  address public constant CANONICAL_ENTRYPOINT_V07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
  address public constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant DEPLOYED_DIRECTORY = 0x8040006d6907a84911aaC0a9aC08278311B156e2;
  address public constant DEPLOYED_CONTROLLER = 0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec;
  address public constant DEPLOYED_VAULT = 0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0;
  address public constant DEPLOYED_TOKEN = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant DEPLOYED_CBM = 0x57869372AFbd7b61752f2f8d3e7F37701e28517B;
  address public constant DEPLOYED_ESCROW = 0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb;

  UnifyVaultPaymaster public paymaster;
  GasTreasury public gasTreasury;
  IEntryPointV07Canonical public entryPoint;
  LiveSimSimpleAccount public smartAccount;

  uint256 public userPrivateKey = 0xA11CE;
  address public userEOA;

  address public bundlerRelayer = address(0xB0B);
  address public admin = 0xd905920c91853039060246Ed5724AA72B91a96DA;

  function setUp() public {
    string memory rpcUrl = vmExt.envString('BASE_SEPOLIA_RPC_URL');
    vmExt.createSelectFork(rpcUrl);

    userEOA = vm.addr(userPrivateKey);
    entryPoint = IEntryPointV07Canonical(CANONICAL_ENTRYPOINT_V07);

    // 1. Deploy UnifyVaultPaymaster
    paymaster = new UnifyVaultPaymaster(
      CANONICAL_ENTRYPOINT_V07,
      admin,
      address(0), // Pure on-chain policy mode
      0.05 ether
    );

    // 2. Deploy GasTreasury
    gasTreasury = new GasTreasury(
      admin,
      admin, // Refill operator
      address(paymaster),
      0.5 ether,
      2.0 ether
    );

    // Configure Paymaster approved targets & selectors as admin
    vm.startPrank(admin);
    paymaster.setApprovedTarget(BASE_SEPOLIA_USDC, true);
    paymaster.setApprovedTarget(DEPLOYED_CONTROLLER, true);
    paymaster.setApprovedTarget(DEPLOYED_TOKEN, true);
    paymaster.setApprovedTarget(DEPLOYED_ESCROW, true);

    paymaster.setApprovedSelector(BASE_SEPOLIA_USDC, IERC20.approve.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_CONTROLLER, UnifyVaultController.deposit.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_CONTROLLER, UnifyVaultController.redeem.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_TOKEN, IERC20.transfer.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_TOKEN, IERC20.approve.selector, true);
    vm.stopPrank();

    // 3. Fund GasTreasury with 1 ETH testnet infrastructure funds
    vm.deal(address(gasTreasury), 1 ether);

    // 4. Refill Paymaster deposit via GasTreasury
    vm.prank(admin);
    gasTreasury.refillPaymaster(0.2 ether);

    // 5. Deploy Smart Account owned by userEOA with STRICTLY 0 ETH
    smartAccount = new LiveSimSimpleAccount(CANONICAL_ENTRYPOINT_V07, userEOA);
    vm.deal(address(smartAccount), 0); // 0 ETH invariant

    // 6. Fund Smart Account with 100 USDC (0 native ETH)
    deal(BASE_SEPOLIA_USDC, address(smartAccount), 100 * 1e6);

    // Top up SwapRouter with strategy token liquidity on testnet
    address swapRouter = 0x63f3432b1ca616bb8fdF46058e6d855262C195f7;
    deal(0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29, swapRouter, 100_000_000); // 1 cbBTC
    deal(0xd116ab1c943cf15904eC4c8dd701086f175FA323, swapRouter, 10 ether); // 10 WETH

    // Fund Bundler Relayer with 0.1 ETH to submit handleOps
    vm.deal(bundlerRelayer, 0.1 ether);
  }

  function test_DirectDepositDebug() public {
    address testUser = address(0x123);
    deal(BASE_SEPOLIA_USDC, testUser, 50 * 1e6);
    vm.startPrank(testUser);
    IERC20(BASE_SEPOLIA_USDC).approve(DEPLOYED_CONTROLLER, 50 * 1e6);
    UnifyVaultController(DEPLOYED_CONTROLLER).deposit(BASE_SEPOLIA_USDC, 50 * 1e6, 0, testUser);
    vm.stopPrank();
  }

  // Verification 1: Pre-deposit state (0 ETH invariant)
  function test_BaseSepolia_PreStateInvariants() public {
    assertEq(address(smartAccount).balance, 0, 'Smart Account native ETH balance MUST be 0');
    assertEq(
      IERC20(BASE_SEPOLIA_USDC).balanceOf(address(smartAccount)),
      100 * 1e6,
      'Smart Account must have 100 USDC'
    );
    assertEq(
      paymaster.getDeposit(),
      0.2 ether,
      'Paymaster must have 0.2 ETH deposit in EntryPoint'
    );
  }

  // Verification 2: End-to-End Gasless Deposit with 0 ETH
  function test_BaseSepolia_EndToEndGaslessDeposit() public {
    uint256 depositAmount = 50 * 1e6; // $50 USDC
    uint256 minSharesOut = 0;

    // Build Batched UserOp calls: [USDC.approve(Controller, 50e6), Controller.deposit(USDC, 50e6, ...)]
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
      minSharesOut,
      address(smartAccount)
    );

    bytes memory callData = abi.encodeWithSelector(
      smartAccount.executeBatch.selector,
      dests,
      values,
      funcs
    );

    // Construct UserOperation
    PackedUserOperation[] memory ops = new PackedUserOperation[](1);
    ops[0] = PackedUserOperation({
      sender: address(smartAccount),
      nonce: 0,
      initCode: '',
      callData: callData,
      accountGasLimits: bytes32(abi.encodePacked(uint128(250000), uint128(1500000))),
      preVerificationGas: 100000,
      gasFees: bytes32(abi.encodePacked(uint128(1 gwei), uint128(5 gwei))),
      paymasterAndData: abi.encodePacked(address(paymaster), uint128(150000), uint128(100000)),
      signature: ''
    });

    // Record pre-execution balances
    uint256 smartAccountEthBefore = address(smartAccount).balance;
    assertEq(smartAccountEthBefore, 0, 'Smart account MUST have 0 native ETH before deposit');

    // Bundler submits bundle to EntryPoint v0.7
    vm.prank(bundlerRelayer);
    entryPoint.handleOps(ops, payable(bundlerRelayer));

    // Post-execution Invariant Checks
    uint256 smartAccountEthAfter = address(smartAccount).balance;
    assertEq(
      smartAccountEthAfter,
      0,
      'Smart account MUST maintain 0 native ETH after gasless deposit'
    );

    // USDC moved correctly
    assertEq(
      IERC20(BASE_SEPOLIA_USDC).balanceOf(address(smartAccount)),
      50 * 1e6,
      'Smart Account remaining USDC is 50'
    );
    assertEq(
      IERC20(BASE_SEPOLIA_USDC).allowance(address(smartAccount), DEPLOYED_CONTROLLER),
      0,
      'USDC allowance must be 0 (exact approval consumed)'
    );

    // UVBE shares received
    uint256 uvbeShares = IERC20(DEPLOYED_TOKEN).balanceOf(address(smartAccount));
    assertGt(uvbeShares, 0, 'Smart Account received UVBE shares without paying gas');

    // Paymaster sponsored the gas
    assertLt(paymaster.getDeposit(), 0.2 ether, 'Paymaster deposit paid for execution gas');
  }

  // Verification 3: End-to-End Gasless Redeem with 0 ETH
  function test_BaseSepolia_EndToEndGaslessRedeem() public {
    // 1. First perform deposit
    test_BaseSepolia_EndToEndGaslessDeposit();

    uint256 sharesToRedeem = IERC20(DEPLOYED_TOKEN).balanceOf(address(smartAccount));
    assertGt(sharesToRedeem, 0);

    // 2. Build Redeem UserOp call: [Controller.redeem(USDC, shares, minAssetsOut, receiver, deadline)]
    bytes memory redeemCalldata = abi.encodeWithSelector(
      UnifyVaultController.redeem.selector,
      BASE_SEPOLIA_USDC,
      sharesToRedeem,
      0, // minAssetsOut
      address(smartAccount),
      block.timestamp + 3600
    );

    bytes memory callData = abi.encodeWithSelector(
      smartAccount.execute.selector,
      DEPLOYED_CONTROLLER,
      0,
      redeemCalldata
    );

    PackedUserOperation[] memory ops = new PackedUserOperation[](1);
    ops[0] = PackedUserOperation({
      sender: address(smartAccount),
      nonce: 1,
      initCode: '',
      callData: callData,
      accountGasLimits: bytes32(abi.encodePacked(uint128(250000), uint128(1500000))),
      preVerificationGas: 100000,
      gasFees: bytes32(abi.encodePacked(uint128(1 gwei), uint128(5 gwei))),
      paymasterAndData: abi.encodePacked(address(paymaster), uint128(150000), uint128(100000)),
      signature: ''
    });

    // Record pre-execution balances
    assertEq(
      address(smartAccount).balance,
      0,
      'Smart account MUST have 0 native ETH before redeem'
    );

    // Bundler submits redeem to EntryPoint v0.7
    vm.prank(bundlerRelayer);
    entryPoint.handleOps(ops, payable(bundlerRelayer));

    // Post-execution Invariant Checks
    assertEq(
      address(smartAccount).balance,
      0,
      'Smart account MUST maintain 0 native ETH after gasless redeem'
    );
    assertEq(IERC20(DEPLOYED_TOKEN).balanceOf(address(smartAccount)), 0, 'UVBE shares burned');
    assertGt(
      IERC20(BASE_SEPOLIA_USDC).balanceOf(address(smartAccount)),
      50 * 1e6,
      'Smart Account received USDC payout'
    );
  }

  // Verification 4: Security policy rejects unauthorized target on Base Sepolia
  function test_BaseSepolia_Revert_UnauthorizedTarget() public {
    address attackerContract = address(0x666);
    bytes memory callData = abi.encodeWithSelector(
      smartAccount.execute.selector,
      attackerContract,
      0,
      '0x1234'
    );

    PackedUserOperation[] memory ops = new PackedUserOperation[](1);
    ops[0] = PackedUserOperation({
      sender: address(smartAccount),
      nonce: 0,
      initCode: '',
      callData: callData,
      accountGasLimits: bytes32(abi.encodePacked(uint128(150000), uint128(250000))),
      preVerificationGas: 50000,
      gasFees: bytes32(abi.encodePacked(uint128(1 gwei), uint128(5 gwei))),
      paymasterAndData: abi.encodePacked(address(paymaster), uint128(100000), uint128(50000)),
      signature: ''
    });

    vm.prank(bundlerRelayer);
    // EntryPoint reverts UserOp with AA33 (revert in paymaster validation)
    vm.expectRevert();
    entryPoint.handleOps(ops, payable(bundlerRelayer));
  }

  // Verification 5: Security policy rejects native ETH transfer
  function test_BaseSepolia_Revert_NativeETHTransfer() public {
    bytes memory callData = abi.encodeWithSelector(
      smartAccount.execute.selector,
      DEPLOYED_CONTROLLER,
      1 ether, // Attempting native ETH value transfer
      '0x'
    );

    PackedUserOperation[] memory ops = new PackedUserOperation[](1);
    ops[0] = PackedUserOperation({
      sender: address(smartAccount),
      nonce: 0,
      initCode: '',
      callData: callData,
      accountGasLimits: bytes32(abi.encodePacked(uint128(150000), uint128(250000))),
      preVerificationGas: 50000,
      gasFees: bytes32(abi.encodePacked(uint128(1 gwei), uint128(5 gwei))),
      paymasterAndData: abi.encodePacked(address(paymaster), uint128(100000), uint128(50000)),
      signature: ''
    });

    vm.prank(bundlerRelayer);
    vm.expectRevert();
    entryPoint.handleOps(ops, payable(bundlerRelayer));
  }

  // Verification 6: Unauthorized selector rejected
  function test_BaseSepolia_Revert_UnauthorizedSelector() public {
    bytes memory callData = abi.encodeWithSelector(
      smartAccount.execute.selector,
      BASE_SEPOLIA_USDC,
      0,
      abi.encodeWithSelector(0xdeadbeef)
    );

    PackedUserOperation[] memory ops = new PackedUserOperation[](1);
    ops[0] = PackedUserOperation({
      sender: address(smartAccount),
      nonce: 0,
      initCode: '',
      callData: callData,
      accountGasLimits: bytes32(abi.encodePacked(uint128(150000), uint128(250000))),
      preVerificationGas: 50000,
      gasFees: bytes32(abi.encodePacked(uint128(1 gwei), uint128(5 gwei))),
      paymasterAndData: abi.encodePacked(address(paymaster), uint128(100000), uint128(50000)),
      signature: ''
    });

    vm.prank(bundlerRelayer);
    vm.expectRevert();
    entryPoint.handleOps(ops, payable(bundlerRelayer));
  }

  // Verification 7: Excessive approval rejected
  function test_BaseSepolia_Revert_ExcessiveApproval() public {
    // Attempting unlimited approval (type(uint256).max) with deposit of only 50 USDC
    address[] memory dests = new address[](2);
    dests[0] = BASE_SEPOLIA_USDC;
    dests[1] = DEPLOYED_CONTROLLER;

    uint256[] memory values = new uint256[](2);
    values[0] = 0;
    values[1] = 0;

    bytes[] memory funcs = new bytes[](2);
    funcs[0] = abi.encodeWithSelector(
      IERC20.approve.selector,
      DEPLOYED_CONTROLLER,
      type(uint256).max
    );
    funcs[1] = abi.encodeWithSelector(
      UnifyVaultController.deposit.selector,
      BASE_SEPOLIA_USDC,
      50 * 1e6,
      0,
      address(smartAccount)
    );

    bytes memory callData = abi.encodeWithSelector(
      smartAccount.executeBatch.selector,
      dests,
      values,
      funcs
    );

    PackedUserOperation[] memory ops = new PackedUserOperation[](1);
    ops[0] = PackedUserOperation({
      sender: address(smartAccount),
      nonce: 0,
      initCode: '',
      callData: callData,
      accountGasLimits: bytes32(abi.encodePacked(uint128(250000), uint128(1500000))),
      preVerificationGas: 100000,
      gasFees: bytes32(abi.encodePacked(uint128(1 gwei), uint128(5 gwei))),
      paymasterAndData: abi.encodePacked(address(paymaster), uint128(150000), uint128(100000)),
      signature: ''
    });

    vm.prank(bundlerRelayer);
    vm.expectRevert();
    entryPoint.handleOps(ops, payable(bundlerRelayer));
  }

  // Verification 8: Paused paymaster rejects sponsorship
  function test_BaseSepolia_Revert_PausedPaymaster() public {
    vm.prank(admin);
    paymaster.setPaused(true);

    bytes memory callData = abi.encodeWithSelector(
      smartAccount.execute.selector,
      BASE_SEPOLIA_USDC,
      0,
      abi.encodeWithSelector(IERC20.approve.selector, DEPLOYED_CONTROLLER, 50 * 1e6)
    );

    PackedUserOperation[] memory ops = new PackedUserOperation[](1);
    ops[0] = PackedUserOperation({
      sender: address(smartAccount),
      nonce: 0,
      initCode: '',
      callData: callData,
      accountGasLimits: bytes32(abi.encodePacked(uint128(150000), uint128(250000))),
      preVerificationGas: 50000,
      gasFees: bytes32(abi.encodePacked(uint128(1 gwei), uint128(5 gwei))),
      paymasterAndData: abi.encodePacked(address(paymaster), uint128(100000), uint128(50000)),
      signature: ''
    });

    vm.prank(bundlerRelayer);
    vm.expectRevert();
    entryPoint.handleOps(ops, payable(bundlerRelayer));
  }

  // Verification 9: GasTreasury unauthorized refill rejected
  function test_BaseSepolia_Revert_GasTreasury_UnauthorizedRefill() public {
    address unauthorizedAttacker = address(0x999);
    vm.prank(unauthorizedAttacker);
    vm.expectRevert();
    gasTreasury.refillPaymaster(0.1 ether);
  }

  // Verification 10: GasTreasury excessive refill per tx rejected
  function test_BaseSepolia_Revert_GasTreasury_ExcessiveRefillPerTx() public {
    vm.prank(admin);
    // maxRefillPerTx is 0.5 ether
    vm.expectRevert();
    gasTreasury.refillPaymaster(0.6 ether);
  }

  // Verification 11: Accounting Isolation Invariant: CustodyVault funds NEVER used for gas
  function test_BaseSepolia_AccountingIsolation_GasDepositUntouchedFromCustodyVault() public {
    uint256 custodyVaultUsdcBefore = IERC20(BASE_SEPOLIA_USDC).balanceOf(DEPLOYED_VAULT);
    uint256 custodyVaultEthBefore = DEPLOYED_VAULT.balance;

    // Perform gasless deposit
    test_BaseSepolia_EndToEndGaslessDeposit();

    // CustodyVault ETH balance must remain identical (0)
    assertEq(
      DEPLOYED_VAULT.balance,
      custodyVaultEthBefore,
      'CustodyVault ETH balance must remain 0'
    );

    // Gas was exclusively paid by Paymaster deposit on EntryPoint
    assertLt(
      paymaster.getDeposit(),
      0.2 ether,
      'Paymaster paid gas from GasTreasury refill deposit'
    );
  }
}
