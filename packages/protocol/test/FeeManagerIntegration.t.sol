// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/treasury/FeeManager.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/constants/ModuleIds.sol';

interface IIntegrationTreasury {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

contract MockFeeToken is ERC20 {
  constructor() ERC20('MOCK_USDC', 'USDC') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract FeeManagerIntegrationTest is Test {
  UnifyVaultController public controller;
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  IIntegrationTreasury public treasury;
  FeeManager public feeManager;
  UVBTCETHToken public token;

  MockFeeToken public usdc;

  address public gov = address(0xABC);
  address public user = address(0x222);
  bytes32 public assetId;

  function setUp() public {
    vm.warp(100000);
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();

    address treasuryAddr = deployCode('Treasury');
    treasury = IIntegrationTreasury(treasuryAddr);

    feeManager = new FeeManager(address(treasury));
    token = new UVBTCETHToken();
    usdc = new MockFeeToken();

    // Register FeeManager in ProtocolDirectory
    directory.registerAddress(ModuleIds.FEE_MANAGER, address(feeManager));

    // Grant Governance roles
    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    treasury.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    feeManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    token.grantRole(token.CONTROLLER_ROLE(), address(this));

    // Configure USDC Asset
    assetId = bytes32(uint256(uint160(address(usdc))));
    oracleProvider.registerAsset(assetId, 1 * 10 ** 18, 18, block.timestamp, 1);
    oracleManager.configureAsset(assetId, address(oracleProvider), address(0), 3600, true);
    vault.registerAsset(address(usdc), 18);
    treasury.registerAsset(address(usdc), 18);

    // Deploy Controller
    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    // Renounce setup rights
    token.revokeRole(token.CONTROLLER_ROLE(), address(this));
  }

  function testDefaultFeeManagerResolution() public {
    assertEq(controller.feeManager(), address(feeManager));
    assertEq(controller.getDepositFeeBps(), 25);
    assertEq(controller.getRedeemFeeBps(), 200);
  }

  function testDepositFeeUpdateChangesCalculation() public {
    uint256 depositAmt = 10000 * 10 ** 18;
    usdc.mint(user, depositAmt);

    // 1. Initial Deposit Quote at 25 BPS (0.25%)
    UnifyVaultController.DepositQuote memory quoteInitial = controller.getDepositQuote(
      address(usdc),
      depositAmt,
      0,
      user
    );
    assertEq(quoteInitial.protocolFee, 25 * 10 ** 18); // 0.25% of 10,000 = 25
    assertEq(quoteInitial.netDeposit, 9975 * 10 ** 18);

    // 2. Update Deposit Fee to 100 BPS (1.00%) via FeeManager
    feeManager.setDepositFeeBps(100);
    assertEq(controller.getDepositFeeBps(), 100);

    // 3. Deposit Quote after update at 100 BPS (1.00%)
    UnifyVaultController.DepositQuote memory quoteUpdated = controller.getDepositQuote(
      address(usdc),
      depositAmt,
      0,
      user
    );
    assertEq(quoteUpdated.protocolFee, 100 * 10 ** 18); // 1.00% of 10,000 = 100
    assertEq(quoteUpdated.netDeposit, 9900 * 10 ** 18);

    // 4. Execute Deposit and verify Treasury fee routing
    uint256 treasuryBefore = usdc.balanceOf(address(treasury));

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);
    controller.deposit(address(usdc), depositAmt, 0, user);
    vm.stopPrank();

    uint256 treasuryAfter = usdc.balanceOf(address(treasury));
    assertEq(treasuryAfter - treasuryBefore, 100 * 10 ** 18);
  }

  function testRedeemFeeUpdateChangesCalculation() public {
    uint256 depositAmt = 10000 * 10 ** 18;
    usdc.mint(user, depositAmt);

    vm.startPrank(user);
    usdc.approve(address(controller), depositAmt);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      address(usdc),
      depositAmt,
      0,
      user
    );
    vm.stopPrank();

    uint256 shares = token.balanceOf(user);

    // 1. Initial Preview Redeem at 200 BPS (2.00%)
    uint256 previewInitial = controller.previewRedeem(address(usdc), shares);
    // Net deposit was 9975. 2% fee of 9975 = 199.5. Net redemption = 9775.5
    assertEq(previewInitial, 97755 * 10 ** 17);

    // 2. Update Redeem Fee to 500 BPS (5.00%) via FeeManager
    feeManager.setRedeemFeeBps(500);
    assertEq(controller.getRedeemFeeBps(), 500);

    // 3. Updated Preview Redeem at 500 BPS (5.00%)
    uint256 previewUpdated = controller.previewRedeem(address(usdc), shares);
    // Net deposit was 9975. 5% fee of 9975 = 498.75. Net redemption = 9476.25
    assertEq(previewUpdated, 947625 * 10 ** 16);

    // 4. Execute Redeem and verify Treasury routing
    uint256 treasuryBefore = usdc.balanceOf(address(treasury));

    vm.startPrank(user);
    uint256 netReceived = controller.redeem(address(usdc), shares, 0, user, block.timestamp + 1000);
    vm.stopPrank();

    assertEq(netReceived, previewUpdated);
    uint256 treasuryAfter = usdc.balanceOf(address(treasury));
    // Treasury received initial deposit fee (25) + updated redeem fee (498.75)
    assertEq(treasuryAfter - treasuryBefore, 49875 * 10 ** 16);
  }
}
