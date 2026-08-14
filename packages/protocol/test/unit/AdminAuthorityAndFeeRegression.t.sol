// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/escrow/P2PEscrowV2.sol';
import '../../src/token/UVBEV2.sol';
import '../../src/treasury/CostBasisManagerV2.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/types/EscrowTypes.sol';
import { Errors as ProtocolErrors } from '../../src/errors/Errors.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockERC20ForFeeRegression is ERC20 {
  constructor() ERC20('Mock UVBE', 'UVBE') {
    _mint(msg.sender, 1_000_000 * 1e18);
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract AdminAuthorityAndFeeRegressionTest is Test {
  address public constant ADMIN_96DA = 0xd905920c91853039060246Ed5724AA72B91a96DA;
  address public constant TREASURY = 0x8Aa2e812D244b0C30D45035C3C843f4CdD02aCe6;
  address public constant SELLER = 0x1111111111111111111111111111111111111111;
  address public constant BUYER = 0x2222222222222222222222222222222222222222;
  address public constant ATTACKER = 0x3333333333333333333333333333333333333333;

  P2PEscrowV2 public escrow;
  MockERC20ForFeeRegression public token;
  ProtocolDirectory public directory;
  UVBEV2 public uvbe;
  CostBasisManagerV2 public cbm;

  function setUp() public {
    // 1. Deploy Protocol Directory with Admin 96da
    vm.prank(ADMIN_96DA);
    directory = new ProtocolDirectory();

    // 2. Deploy P2PEscrowV2 with 1% fee (100 bps)
    vm.prank(ADMIN_96DA);
    escrow = new P2PEscrowV2(TREASURY, 100);

    // 3. Deploy UVBEV2 and CostBasisManagerV2
    vm.startPrank(ADMIN_96DA);
    uvbe = new UVBEV2(ADMIN_96DA);
    cbm = new CostBasisManagerV2(ADMIN_96DA, address(directory));
    uvbe.setCostBasisManager(address(cbm));
    cbm.setModules(address(0x123), address(uvbe));
    cbm.setEscrowStatus(address(escrow), true);
    vm.stopPrank();

    token = new MockERC20ForFeeRegression();
    token.mint(SELLER, 100_000 * 1e18);
    token.mint(BUYER, 100_000 * 1e18);

    vm.prank(SELLER);
    token.approve(address(escrow), type(uint256).max);

    vm.prank(BUYER);
    token.approve(address(escrow), type(uint256).max);
  }

  // =========================================================================
  // 1. ADMIN 96DA AUTHORITY REGRESSION TEST
  // =========================================================================

  function test_Regression_Admin96daDefaultRoles() public {
    // Directory roles
    assertTrue(directory.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));
    assertTrue(directory.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA));

    // Escrow roles
    assertTrue(escrow.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));
    assertTrue(escrow.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA));
    assertTrue(escrow.hasRole(AccessRoles.GUARDIAN_ROLE, ADMIN_96DA));
    assertTrue(escrow.hasRole(AccessRoles.ARBITRATOR_ROLE, ADMIN_96DA));

    // UVBE roles
    assertTrue(uvbe.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));

    // CBM roles
    assertTrue(cbm.hasRole(AccessRoles.DEFAULT_ADMIN_ROLE, ADMIN_96DA));
    assertTrue(cbm.hasRole(AccessRoles.GOVERNANCE_ROLE, ADMIN_96DA));
  }

  function test_Regression_NonAdminCannotMutateGovernanceRoles() public {
    vm.startPrank(ATTACKER);

    vm.expectRevert();
    directory.grantRole(AccessRoles.GOVERNANCE_ROLE, ATTACKER);

    vm.expectRevert();
    escrow.grantRole(AccessRoles.GOVERNANCE_ROLE, ATTACKER);

    vm.expectRevert();
    escrow.setFeeConfig(200);

    vm.expectRevert();
    escrow.setTreasury(ATTACKER);

    vm.stopPrank();
  }

  // =========================================================================
  // 2. P2P 1% FEE ENFORCEMENT & MATHEMATICAL PRECISION
  // =========================================================================

  function test_Regression_P2P1PercentFeeExactSplit_ERC20() public {
    uint256 tradeAmount = 1000 * 1e18; // 1000 Tokens
    uint256 expectedFee = 10 * 1e18; // 1.00% = 10 Tokens
    uint256 expectedNet = 990 * 1e18; // 99.00% = 990 Tokens

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: BUYER,
      seller: SELLER,
      asset: address(token),
      amount: tradeAmount,
      fiatAmount: 1000 * 1e2,
      fiatCurrency: keccak256('INR'),
      paymentWindow: 1 hours
    });

    vm.prank(SELLER);
    uint256 tradeId = escrow.createTrade(params);
    // Note: Auto-funded on createTrade since seller is caller and allowance >= amount

    vm.prank(BUYER);
    escrow.submitPayment(tradeId, keccak256('UTR_123'), keccak256('EVIDENCE_123'));

    uint256 buyerBalBefore = token.balanceOf(BUYER);
    uint256 treasuryBalBefore = token.balanceOf(TREASURY);

    vm.prank(SELLER);
    escrow.confirmAndRelease(tradeId);

    uint256 buyerBalAfter = token.balanceOf(BUYER);
    uint256 treasuryBalAfter = token.balanceOf(TREASURY);

    assertEq(buyerBalAfter - buyerBalBefore, expectedNet, 'Buyer must receive exact 99%');
    assertEq(treasuryBalAfter - treasuryBalBefore, expectedFee, 'Treasury must receive exact 1%');
  }

  function test_Regression_P2P1PercentFeeExactSplit_NativeETH() public {
    uint256 tradeAmount = 1 ether; // 1 ETH
    uint256 expectedFee = 0.01 ether; // 1.00% = 0.01 ETH
    uint256 expectedNet = 0.99 ether; // 99.00% = 0.99 ETH

    vm.deal(SELLER, 10 ether);

    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: BUYER,
      seller: SELLER,
      asset: address(0), // Native ETH
      amount: tradeAmount,
      fiatAmount: 1000 * 1e2,
      fiatCurrency: keccak256('INR'),
      paymentWindow: 1 hours
    });

    vm.prank(SELLER);
    uint256 tradeId = escrow.createTrade{ value: tradeAmount }(params);

    vm.prank(BUYER);
    escrow.submitPayment(tradeId, keccak256('UTR_ETH'), keccak256('EVIDENCE_ETH'));

    uint256 buyerBalBefore = BUYER.balance;
    uint256 treasuryBalBefore = TREASURY.balance;

    vm.prank(SELLER);
    escrow.confirmAndRelease(tradeId);

    uint256 buyerBalAfter = BUYER.balance;
    uint256 treasuryBalAfter = TREASURY.balance;

    assertEq(buyerBalAfter - buyerBalBefore, expectedNet, 'Buyer must receive 0.99 ETH');
    assertEq(treasuryBalAfter - treasuryBalBefore, expectedFee, 'Treasury must receive 0.01 ETH');
  }

  function test_Regression_FeeExceedsMaxBpsReverts() public {
    vm.startPrank(ADMIN_96DA);

    // 500 bps is allowed (max 5%)
    escrow.setFeeConfig(500);
    assertEq(escrow.feeBps(), 500);

    // 501 bps must revert
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.FeeExceedsMaximum.selector, 501, 500));
    escrow.setFeeConfig(501);

    // Reset back to canonical 100 bps (1%)
    escrow.setFeeConfig(100);
    assertEq(escrow.feeBps(), 100);

    vm.stopPrank();
  }

  function test_Regression_FeeExceedsMaxInConstructorReverts() public {
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.FeeExceedsMaximum.selector, 501, 500));
    new P2PEscrowV2(TREASURY, 501);
  }
}
