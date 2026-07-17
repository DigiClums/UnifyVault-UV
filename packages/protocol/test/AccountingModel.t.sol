// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/libraries/FeeLib.sol';
import '../src/libraries/ShareLib.sol';

// Extended interface for Treasury to avoid compiling Treasury.sol directly
interface ITestTreasury {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
}

contract MockERC20 is ERC20 {
  constructor() ERC20('MOCK', 'MOCK') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract AccountingModelTest is Test {
  UnifyVaultController public controller;

  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  ITestTreasury public treasury;
  UVBTCETHToken public token;

  MockERC20 public tokenA;

  address public gov = address(0xABC);
  address public guardian = address(0x111);
  address public user = address(0x222);
  address public donor = address(0x444);

  bytes32 public assetIdA;

  function setUp() public {
    vm.warp(100000);
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();

    // Deploy Treasury via bytecode
    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasury(treasuryAddr);

    token = new UVBTCETHToken();

    tokenA = new MockERC20();

    // 1. Grant governance access to this test contract for config
    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    treasury.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    token.grantRole(token.CONTROLLER_ROLE(), address(this));

    // 2. Register assets in Oracle Provider
    assetIdA = bytes32(uint256(uint160(address(tokenA))));
    oracleProvider.registerAsset(assetIdA, 1000 * 10 ** 18, 18, block.timestamp, 1);

    // 3. Register config in Oracle Manager
    oracleManager.configureAsset(assetIdA, address(oracleProvider), address(0), 3600, true);

    // 4. Register config in Vault
    vault.registerAsset(address(tokenA), 18);

    // 5. Register config in Treasury
    treasury.registerAsset(address(tokenA), 18);

    // 6. Deploy Controller
    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    controller.grantRole(AccessRoles.GOVERNANCE_ROLE, gov);
    controller.grantRole(controller.GUARDIAN_ROLE(), guardian);

    // Grant CONTROLLER_ROLE of CustodyVault, Treasury, and UVBTCETHToken to controller
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    // Renounce setup rights
    controller.renounceRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    controller.renounceRole(controller.GUARDIAN_ROLE(), address(this));
    token.revokeRole(token.CONTROLLER_ROLE(), address(this));
  }

  // --- Unit Tests ---

  function testDirectDonationIgnored() public {
    uint256 depositAmt = 10 * 10 ** 18;
    uint256 fee = FeeLib.calculateDepositFee(depositAmt);
    uint256 net = depositAmt - fee;

    // Perform initial deposit
    tokenA.mint(user, depositAmt);
    vm.startPrank(user);
    tokenA.approve(address(vault), net);
    tokenA.approve(address(controller), fee);
    controller.deposit(address(tokenA), depositAmt, 0, user);
    vm.stopPrank();

    uint256 initialTotalAssets = vault.totalAssets(address(tokenA));
    uint256 initialShares = token.balanceOf(user);

    // Donor directly transfers tokens to CustodyVault (unsolicited donation)
    uint256 donationAmt = 5 * 10 ** 18;
    tokenA.mint(address(vault), donationAmt);

    // Verify totalAssets remains unchanged
    assertEq(vault.totalAssets(address(tokenA)), initialTotalAssets);
    // Verify balance matches totalAssets + donation
    assertEq(tokenA.balanceOf(address(vault)), initialTotalAssets + donationAmt);
    // Verify surplus assets tracks the donation
    assertEq(vault.surplusAssets(address(tokenA)), donationAmt);

    // Second depositor deposits 10 tokens
    address user2 = address(0x333);
    tokenA.mint(user2, depositAmt);
    vm.startPrank(user2);
    tokenA.approve(address(vault), net);
    tokenA.approve(address(controller), fee);
    controller.deposit(address(tokenA), depositAmt, 0, user2);
    vm.stopPrank();

    // Under raw balance accounting, the second depositor would get diluted by the donation.
    // Under accountedAssets accounting, the second depositor gets the exact proportional share (net)
    assertEq(token.balanceOf(user2), net);
  }

  function testSurplusAssetsCorrect() public {
    uint256 donationAmt = 500;
    tokenA.mint(address(vault), donationAmt);

    assertEq(vault.totalAssets(address(tokenA)), 0);
    assertEq(vault.surplusAssets(address(tokenA)), donationAmt);
  }

  // --- Fuzz Tests ---

  function testFuzzDonationsAndMinting(
    uint256 depositAmt1,
    uint256 donationAmt,
    uint256 depositAmt2
  ) public {
    depositAmt1 = (depositAmt1 % 1000000) + 10000;
    donationAmt = (donationAmt % 1000000) + 1;
    depositAmt2 = (depositAmt2 % 1000000) + 10000;

    uint256 fee1 = FeeLib.calculateDepositFee(depositAmt1);
    uint256 net1 = depositAmt1 - fee1;

    uint256 fee2 = FeeLib.calculateDepositFee(depositAmt2);
    uint256 net2 = depositAmt2 - fee2;

    // 1. First Deposit (Bootstrap)
    tokenA.mint(user, depositAmt1);
    vm.startPrank(user);
    tokenA.approve(address(vault), net1);
    tokenA.approve(address(controller), fee1);
    controller.deposit(address(tokenA), depositAmt1, 0, user);
    vm.stopPrank();

    uint256 supplyAfter1 = token.totalSupply();

    // 2. Directly donate tokens
    tokenA.mint(address(vault), donationAmt);

    // 3. Second Deposit (Proportional)
    address user2 = address(0x333);
    tokenA.mint(user2, depositAmt2);
    vm.startPrank(user2);
    tokenA.approve(address(vault), net2);
    tokenA.approve(address(controller), fee2);
    controller.deposit(address(tokenA), depositAmt2, 0, user2);
    vm.stopPrank();

    // Expected shares should not be affected by the donation amount
    // shares = (net2 * supplyAfter1) / totalAssets = (net2 * net1) / net1 = net2
    assertEq(token.balanceOf(user2), net2);
    assertEq(vault.surplusAssets(address(tokenA)), donationAmt);
    assertEq(vault.totalAssets(address(tokenA)), net1 + net2);
  }
}
