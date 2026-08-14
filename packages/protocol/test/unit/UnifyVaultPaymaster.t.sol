// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/aa/UnifyVaultPaymaster.sol';
import '../../src/aa/GasTreasury.sol';
import '../../src/aa/interfaces/IPaymasterV07.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/vault/CustodyVault.sol';
import '../../src/treasury/FeeManager.sol';
import '../../src/treasury/CostBasisManagerV2.sol';
import '../../src/token/UVBEV2.sol';
import '../../src/escrow/P2PEscrowV2.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/constants/ModuleIds.sol';
import '../../src/types/EscrowTypes.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol';

contract MockERC20USDC is ERC20 {
  constructor() ERC20('USD Coin', 'USDC') {
    _mint(msg.sender, 1_000_000 * 1e6);
  }

  function decimals() public pure override returns (uint8) {
    return 6;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract MockEntryPointV07Test is IEntryPointV07 {
  mapping(address => uint256) public deposits;
  mapping(address => uint112) public stakes;
  mapping(address => uint32) public unstakeDelays;

  function depositTo(address account) external payable override {
    deposits[account] += msg.value;
  }

  function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external override {
    require(deposits[msg.sender] >= withdrawAmount, 'Insufficient deposit');
    deposits[msg.sender] -= withdrawAmount;
    (bool s, ) = withdrawAddress.call{ value: withdrawAmount }('');
    require(s, 'Withdraw failed');
  }

  function getDepositInfo(address account) external view override returns (DepositInfo memory) {
    return
      DepositInfo({
        deposit: deposits[account],
        staked: stakes[account] > 0,
        stake: stakes[account],
        unstakeDelaySec: unstakeDelays[account],
        withdrawTime: 0
      });
  }

  function balanceOf(address account) external view override returns (uint256) {
    return deposits[account];
  }

  function addStake(uint32 unstakeDelaySec) external payable override {
    stakes[msg.sender] += uint112(msg.value);
    unstakeDelays[msg.sender] = unstakeDelaySec;
  }

  function unlockStake() external override {}

  function withdrawStake(address payable withdrawAddress) external override {
    uint112 s = stakes[msg.sender];
    stakes[msg.sender] = 0;
    (bool ok, ) = withdrawAddress.call{ value: s }('');
    require(ok, 'Stake withdraw failed');
  }

  receive() external payable {}
}

contract UnifyVaultPaymasterTest is Test {
  using ECDSA for bytes32;
  using MessageHashUtils for bytes32;

  MockEntryPointV07Test public entryPoint;
  UnifyVaultPaymaster public paymaster;
  GasTreasury public gasTreasury;

  MockERC20USDC public usdc;
  UVBEV2 public uvbe;
  CustodyVault public vault;
  address public mockController = address(0xC01);
  address public mockEscrow = address(0xEC1);

  address public owner = address(this);
  uint256 public signerPrivateKey = 0x5168;
  address public signerAddress;

  address public userSmartAccount = address(0x777);
  address public receiver = address(0x888);

  function setUp() public {
    signerAddress = vm.addr(signerPrivateKey);
    entryPoint = new MockEntryPointV07Test();

    usdc = new MockERC20USDC();
    uvbe = new UVBEV2(address(this));

    // Deploy Paymaster with requireSigner = true
    paymaster = new UnifyVaultPaymaster(
      address(entryPoint),
      owner,
      signerAddress,
      0.05 ether // max cost per userOp
    );

    // Deploy Gas Treasury
    gasTreasury = new GasTreasury(
      owner,
      address(this), // operator
      address(paymaster),
      0.5 ether,
      2.0 ether
    );

    // Fund Gas Treasury with 5 ETH
    vm.deal(address(gasTreasury), 5 ether);

    // Configure Paymaster Whitelists
    paymaster.setApprovedTarget(address(usdc), true);
    paymaster.setApprovedTarget(mockController, true);
    paymaster.setApprovedTarget(address(uvbe), true);
    paymaster.setApprovedTarget(mockEscrow, true);

    // Selectors
    paymaster.setApprovedSelector(address(usdc), IERC20.approve.selector, true);
    paymaster.setApprovedSelector(mockController, 0x8b6099db, true); // deposit(address,uint256,uint256,address)
    paymaster.setApprovedSelector(mockController, 0x49903d4a, true); // redeem(address,uint256,uint256,address,uint256)
    paymaster.setApprovedSelector(address(uvbe), IERC20.transfer.selector, true);
    paymaster.setApprovedSelector(address(uvbe), IERC20.approve.selector, true);
    paymaster.setApprovedSelector(mockEscrow, 0x00867bd2, true); // submitPayment(uint256,bytes32,bytes32)
    paymaster.setApprovedSelector(mockEscrow, 0xe307b694, true); // confirmAndRelease(uint256)
    paymaster.setApprovedSelector(mockEscrow, 0x278ecde1, true); // refund(uint256)
    paymaster.setApprovedSelector(mockEscrow, 0x636bf26d, true); // raiseDispute(uint256,bytes32)
  }

  // 1. Gas Treasury top up Paymaster on EntryPoint
  function test_GasTreasury_RefillsPaymasterDeposit() public {
    assertEq(paymaster.getDeposit(), 0);

    // Refill 0.2 ETH
    gasTreasury.refillPaymaster(0.2 ether);

    assertEq(paymaster.getDeposit(), 0.2 ether);
    assertEq(address(gasTreasury).balance, 4.8 ether);
  }

  // 2. Gas Treasury respects per-tx and daily limits
  function test_GasTreasury_RevertOnExcessiveRefill() public {
    // Exceeds maxRefillPerTx (0.5 ether limit)
    vm.expectRevert(
      abi.encodeWithSelector(GasTreasury.ExceedsMaxRefillPerTx.selector, 0.6 ether, 0.5 ether)
    );
    gasTreasury.refillPaymaster(0.6 ether);
  }

  // 3. Valid Batched Deposit Sponsorship with Valid Signature
  function test_Paymaster_SponsorsValidBatchedDeposit() public {
    uint256 amount = 100 * 1e6;
    uint256 minShares = 99 * 1e18;

    address[] memory dests = new address[](2);
    dests[0] = address(usdc);
    dests[1] = mockController;

    uint256[] memory values = new uint256[](2);
    values[0] = 0;
    values[1] = 0;

    bytes[] memory funcs = new bytes[](2);
    funcs[0] = abi.encodeWithSelector(IERC20.approve.selector, mockController, amount);
    funcs[1] = abi.encodeWithSelector(0x8b6099db, address(usdc), amount, minShares, receiver);

    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_BATCH_SELECTOR(),
      dests,
      values,
      funcs
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    // EntryPoint calls validatePaymasterUserOp
    vm.prank(address(entryPoint));
    (bytes memory context, uint256 validationData) = paymaster.validatePaymasterUserOp(
      userOp,
      bytes32(uint256(1)),
      0.01 ether
    );

    assertEq(uint160(validationData), 0, 'Validation should succeed with 0 (no sig failure)');
    (address sender, ) = abi.decode(context, (address, bytes32));
    assertEq(sender, userSmartAccount);
  }

  // 4. Valid Redeem Call Sponsorship
  function test_Paymaster_SponsorsValidRedeem() public {
    uint256 shares = 50 * 1e18;
    bytes memory func = abi.encodeWithSelector(
      0x49903d4a,
      address(usdc),
      shares,
      49 * 1e6,
      receiver,
      block.timestamp + 3600
    );

    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      mockController,
      0,
      func
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    vm.prank(address(entryPoint));
    (, uint256 validationData) = paymaster.validatePaymasterUserOp(
      userOp,
      bytes32(uint256(2)),
      0.005 ether
    );

    assertEq(uint160(validationData), 0);
  }

  // 5. Valid UVBE Transfer Sponsorship
  function test_Paymaster_SponsorsValidUVBETransfer() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10 * 1e18);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    vm.prank(address(entryPoint));
    (, uint256 validationData) = paymaster.validatePaymasterUserOp(
      userOp,
      bytes32(uint256(3)),
      0.005 ether
    );

    assertEq(uint160(validationData), 0);
  }

  // 6. Reverts on Unauthorized Target Contract
  function test_Paymaster_Revert_UnauthorizedTarget() public {
    address attackerContract = address(0xBAD);
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      attackerContract,
      0,
      func
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    vm.prank(address(entryPoint));
    vm.expectRevert(
      abi.encodeWithSelector(UnifyVaultPaymaster.InvalidTarget.selector, attackerContract)
    );
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(4)), 0.01 ether);
  }

  // 7. Reverts on Unauthorized Selector on Approved Target
  function test_Paymaster_Revert_UnauthorizedSelector() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      mockController,
      0,
      func
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    vm.prank(address(entryPoint));
    vm.expectRevert(
      abi.encodeWithSelector(
        UnifyVaultPaymaster.InvalidSelector.selector,
        mockController,
        IERC20.transfer.selector
      )
    );
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(5)), 0.01 ether);
  }

  // 8. Reverts on Non-Zero Native ETH Value (ETH Drain Protection)
  function test_Paymaster_Revert_NativeETHValue() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      1 ether, // Attempting to send 1 ETH value
      func
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    vm.prank(address(entryPoint));
    vm.expectRevert(
      abi.encodeWithSelector(UnifyVaultPaymaster.NativeValueForbidden.selector, 1 ether)
    );
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(6)), 0.01 ether);
  }

  // 9. Reverts on Mismatched Approval Amount in Batch Deposit
  function test_Paymaster_Revert_MismatchedApprovalAmount() public {
    uint256 approvedAmount = 1000 * 1e6;
    uint256 depositAmount = 100 * 1e6;

    address[] memory dests = new address[](2);
    dests[0] = address(usdc);
    dests[1] = mockController;

    uint256[] memory values = new uint256[](2);
    values[0] = 0;
    values[1] = 0;

    bytes[] memory funcs = new bytes[](2);
    funcs[0] = abi.encodeWithSelector(IERC20.approve.selector, mockController, approvedAmount);
    funcs[1] = abi.encodeWithSelector(
      0x8b6099db,
      address(usdc),
      depositAmount,
      99 * 1e18,
      receiver
    );

    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_BATCH_SELECTOR(),
      dests,
      values,
      funcs
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    vm.prank(address(entryPoint));
    vm.expectRevert(
      abi.encodeWithSelector(
        UnifyVaultPaymaster.ExactApprovalViolation.selector,
        approvedAmount,
        depositAmount
      )
    );
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(7)), 0.01 ether);
  }

  // 10. Reverts when Max Cost Exceeds Limit
  function test_Paymaster_Revert_MaxCostExceeded() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    vm.prank(address(entryPoint));
    vm.expectRevert(
      abi.encodeWithSelector(
        UnifyVaultPaymaster.MaxCostExceeded.selector,
        0.1 ether, // requested
        0.05 ether // limit
      )
    );
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(8)), 0.1 ether);
  }

  // 11. Reverts when Paused
  function test_Paymaster_Revert_WhenPaused() public {
    paymaster.setPaused(true);

    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    vm.prank(address(entryPoint));
    vm.expectRevert(UnifyVaultPaymaster.PaymasterPaused.selector);
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(9)), 0.01 ether);
  }

  // 12. Only EntryPoint can call validatePaymasterUserOp
  function test_Paymaster_Revert_CallerNotEntryPoint() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    vm.prank(userSmartAccount); // Not entryPoint
    vm.expectRevert(UnifyVaultPaymaster.OnlyEntryPoint.selector);
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(10)), 0.01 ether);
  }

  // 13. Owner Deposit and Withdrawal from EntryPoint
  function test_Paymaster_OwnerDepositAndWithdrawal() public {
    vm.deal(owner, 1 ether);
    paymaster.deposit{ value: 1 ether }();
    assertEq(paymaster.getDeposit(), 1 ether);

    address payable coldWallet = payable(address(0xC01D));
    paymaster.withdrawTo(coldWallet, 0.6 ether);

    assertEq(paymaster.getDeposit(), 0.4 ether);
    assertEq(coldWallet.balance, 0.6 ether);
  }

  // 14. Sponsors valid P2P submitPayment call
  function test_Paymaster_SponsorsP2PSubmitPayment() public {
    bytes memory func = abi.encodeWithSelector(
      0x00867bd2,
      uint256(1),
      keccak256('UTR-123'),
      keccak256('EVIDENCE-456')
    );
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      mockEscrow,
      0,
      func
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    vm.prank(address(entryPoint));
    (, uint256 validationData) = paymaster.validatePaymasterUserOp(
      userOp,
      bytes32(uint256(11)),
      0.005 ether
    );

    assertEq(uint160(validationData), 0);
  }

  // 15. Sponsors valid P2P confirmAndRelease call
  function test_Paymaster_SponsorsP2PConfirmAndRelease() public {
    bytes memory func = abi.encodeWithSelector(0xe307b694, uint256(1));
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      mockEscrow,
      0,
      func
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    vm.prank(address(entryPoint));
    (, uint256 validationData) = paymaster.validatePaymasterUserOp(
      userOp,
      bytes32(uint256(12)),
      0.005 ether
    );

    assertEq(uint160(validationData), 0);
  }

  // 16. Reverts on unapproved P2P admin selector (e.g. resolveDispute)
  function test_Paymaster_Revert_P2PAdminFunction() public {
    bytes memory func = abi.encodeWithSelector(0xe55e4211, uint256(1), uint8(0));
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      mockEscrow,
      0,
      func
    );

    PackedUserOperation memory userOp = _buildUserOp(userSmartAccount, callData);

    vm.prank(address(entryPoint));
    vm.expectRevert(
      abi.encodeWithSelector(
        UnifyVaultPaymaster.InvalidSelector.selector,
        mockEscrow,
        bytes4(0xe55e4211)
      )
    );
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(13)), 0.005 ether);
  }

  // =========================================================================
  // ECDSA SIGNATURE HARDENING TESTS (PHASE 1)
  // =========================================================================

  // 17. Revert on Missing Signature (Direct EntryPoint Bypass Attempt)
  function test_Paymaster_Revert_MissingSignature() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10 * 1e18);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    // Construct userOp WITHOUT signature in paymasterAndData
    PackedUserOperation memory userOp = PackedUserOperation({
      sender: userSmartAccount,
      nonce: 0,
      initCode: '',
      callData: callData,
      accountGasLimits: bytes32(abi.encodePacked(uint128(100000), uint128(100000))),
      preVerificationGas: 50000,
      gasFees: bytes32(abi.encodePacked(uint128(2 gwei), uint128(20 gwei))),
      paymasterAndData: abi.encodePacked(address(paymaster), uint128(100000), uint128(50000)), // Only 52 bytes
      signature: ''
    });

    vm.prank(address(entryPoint));
    vm.expectRevert(
      abi.encodeWithSelector(UnifyVaultPaymaster.InvalidSignatureLength.selector, 52)
    );
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(14)), 0.005 ether);
  }

  // 18. Revert on Wrong Signer (Unauthorized Signer Key)
  function test_Paymaster_Revert_WrongSigner() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10 * 1e18);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    uint256 rogueSignerKey = 0x99999;
    address rogueSigner = vm.addr(rogueSignerKey);

    uint48 validUntil = uint48(block.timestamp + 300);
    uint48 validAfter = 0;

    PackedUserOperation memory userOp = _buildUserOpWithSigner(
      userSmartAccount,
      callData,
      rogueSignerKey,
      validUntil,
      validAfter
    );

    vm.prank(address(entryPoint));
    vm.expectRevert(
      abi.encodeWithSelector(UnifyVaultPaymaster.InvalidSigner.selector, rogueSigner, signerAddress)
    );
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(15)), 0.005 ether);
  }

  // 19. Revert on Modified Sender (Signature Binding Integrity)
  function test_Paymaster_Revert_ModifiedSender() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10 * 1e18);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    uint48 validUntil = uint48(block.timestamp + 300);
    uint48 validAfter = 0;

    // Signed for userSmartAccount
    PackedUserOperation memory userOp = _buildUserOpWithSigner(
      userSmartAccount,
      callData,
      signerPrivateKey,
      validUntil,
      validAfter
    );

    // Attacker modifies sender to attackerSmartAccount
    userOp.sender = address(0x999111);

    vm.prank(address(entryPoint));
    vm.expectRevert(); // Recovered address will not match signerAddress
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(16)), 0.005 ether);
  }

  // 20. Revert on Modified Nonce (Replay Attack Prevention)
  function test_Paymaster_Revert_ModifiedNonce() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10 * 1e18);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    uint48 validUntil = uint48(block.timestamp + 300);
    uint48 validAfter = 0;

    PackedUserOperation memory userOp = _buildUserOpWithSigner(
      userSmartAccount,
      callData,
      signerPrivateKey,
      validUntil,
      validAfter
    );

    // Attacker changes nonce from 0 to 1
    userOp.nonce = 1;

    vm.prank(address(entryPoint));
    vm.expectRevert();
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(17)), 0.005 ether);
  }

  // 21. Revert on Modified CallData
  function test_Paymaster_Revert_ModifiedCallData() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10 * 1e18);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    uint48 validUntil = uint48(block.timestamp + 300);
    uint48 validAfter = 0;

    PackedUserOperation memory userOp = _buildUserOpWithSigner(
      userSmartAccount,
      callData,
      signerPrivateKey,
      validUntil,
      validAfter
    );

    // Attacker increases transfer amount to 100 tokens
    bytes memory modifiedFunc = abi.encodeWithSelector(
      IERC20.transfer.selector,
      receiver,
      100 * 1e18
    );
    userOp.callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      modifiedFunc
    );

    vm.prank(address(entryPoint));
    vm.expectRevert();
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(18)), 0.005 ether);
  }

  // 22. Revert on Modified Gas Limits
  function test_Paymaster_Revert_ModifiedGasLimits() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10 * 1e18);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    uint48 validUntil = uint48(block.timestamp + 300);
    uint48 validAfter = 0;

    PackedUserOperation memory userOp = _buildUserOpWithSigner(
      userSmartAccount,
      callData,
      signerPrivateKey,
      validUntil,
      validAfter
    );

    // Attacker modifies accountGasLimits
    userOp.accountGasLimits = bytes32(abi.encodePacked(uint128(200000), uint128(200000)));

    vm.prank(address(entryPoint));
    vm.expectRevert();
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(19)), 0.005 ether);
  }

  // 23. Revert on Modified Gas Fees
  function test_Paymaster_Revert_ModifiedGasFees() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10 * 1e18);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    uint48 validUntil = uint48(block.timestamp + 300);
    uint48 validAfter = 0;

    PackedUserOperation memory userOp = _buildUserOpWithSigner(
      userSmartAccount,
      callData,
      signerPrivateKey,
      validUntil,
      validAfter
    );

    // Attacker modifies gasFees
    userOp.gasFees = bytes32(abi.encodePacked(uint128(5 gwei), uint128(50 gwei)));

    vm.prank(address(entryPoint));
    vm.expectRevert();
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(20)), 0.005 ether);
  }

  // 24. Revert on Expired Signature
  function test_Paymaster_Revert_ExpiredSignature() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10 * 1e18);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    uint48 validUntil = uint48(block.timestamp + 300);
    uint48 validAfter = 0;

    PackedUserOperation memory userOp = _buildUserOpWithSigner(
      userSmartAccount,
      callData,
      signerPrivateKey,
      validUntil,
      validAfter
    );

    // Fast forward past validUntil
    vm.warp(block.timestamp + 301);

    vm.prank(address(entryPoint));
    vm.expectRevert(
      abi.encodeWithSelector(
        UnifyVaultPaymaster.SignatureExpired.selector,
        validUntil,
        uint48(block.timestamp)
      )
    );
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(21)), 0.005 ether);
  }

  // 25. Revert on Not Yet Valid Signature
  function test_Paymaster_Revert_NotYetValidSignature() public {
    bytes memory func = abi.encodeWithSelector(IERC20.transfer.selector, receiver, 10 * 1e18);
    bytes memory callData = abi.encodeWithSelector(
      paymaster.EXECUTE_SELECTOR(),
      address(uvbe),
      0,
      func
    );

    uint48 validUntil = uint48(block.timestamp + 600);
    uint48 validAfter = uint48(block.timestamp + 100);

    PackedUserOperation memory userOp = _buildUserOpWithSigner(
      userSmartAccount,
      callData,
      signerPrivateKey,
      validUntil,
      validAfter
    );

    vm.prank(address(entryPoint));
    vm.expectRevert(
      abi.encodeWithSelector(
        UnifyVaultPaymaster.SignatureNotYetValid.selector,
        validAfter,
        uint48(block.timestamp)
      )
    );
    paymaster.validatePaymasterUserOp(userOp, bytes32(uint256(22)), 0.005 ether);
  }

  // 26. Revert when requireSigner is enabled with zero verifyingSigner
  function test_Paymaster_Revert_VerifyingSignerRequired() public {
    paymaster.setVerifyingSigner(address(0));

    vm.expectRevert(UnifyVaultPaymaster.VerifyingSignerRequired.selector);
    paymaster.setPolicyConfig(0.05 ether, 100 gwei, 0, true);
  }

  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================

  function _buildUserOp(
    address sender,
    bytes memory callData
  ) internal returns (PackedUserOperation memory) {
    uint48 validUntil = uint48(block.timestamp + 300);
    uint48 validAfter = 0;
    return _buildUserOpWithSigner(sender, callData, signerPrivateKey, validUntil, validAfter);
  }

  function _buildUserOpWithSigner(
    address sender,
    bytes memory callData,
    uint256 signingKey,
    uint48 validUntil,
    uint48 validAfter
  ) internal returns (PackedUserOperation memory) {
    PackedUserOperation memory userOp = PackedUserOperation({
      sender: sender,
      nonce: 0,
      initCode: '',
      callData: callData,
      accountGasLimits: bytes32(abi.encodePacked(uint128(100000), uint128(100000))),
      preVerificationGas: 50000,
      gasFees: bytes32(abi.encodePacked(uint128(2 gwei), uint128(20 gwei))),
      paymasterAndData: '',
      signature: ''
    });

    bytes32 hashToSign = paymaster.getHash(userOp, validUntil, validAfter);
    bytes32 ethSignedHash = hashToSign.toEthSignedMessageHash();
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(signingKey, ethSignedHash);
    bytes memory signature = abi.encodePacked(r, s, v);

    bytes memory paymasterData = abi.encodePacked(
      bytes6(validUntil),
      bytes6(validAfter),
      signature
    );

    userOp.paymasterAndData = abi.encodePacked(
      address(paymaster),
      uint128(100000),
      uint128(50000),
      paymasterData
    );

    return userOp;
  }
}
