// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/Test.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/libraries/FeeLib.sol';
import '../src/libraries/ShareLib.sol';
import '../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

// Interface for Treasury to avoid compiling Treasury.sol directly (namespace clash)
interface ITestTreasury {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function CONTROLLER_ROLE() external view returns (bytes32);
  function collectFee(address asset, uint256 amount) external;
}

contract MockERC20 is ERC20 {
  constructor() ERC20('Mock Collateral', 'MCOL') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract DeployScript is Script, Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  ITestTreasury public treasury;
  CustodyVault public vault;
  UVBTCETHToken public token;
  UnifyVaultController public controller;
  MockERC20 public mockCollateral;

  address public deployerAddress;

  function setUp() public {
    deployerAddress = msg.sender;
  }

  function run() external {
    vm.startBroadcast();

    // --------------------------------------------------
    // Phase 1: Deployments
    // --------------------------------------------------
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();

    // Deploy Treasury via bytecode to avoid namespace collision
    address treasuryAddr = deployCode('Treasury');
    treasury = ITestTreasury(treasuryAddr);

    vault = new CustodyVault();
    token = new UVBTCETHToken();
    mockCollateral = new MockERC20();

    controller = new UnifyVaultController(
      address(directory),
      address(oracleManager),
      address(vault),
      address(treasury),
      address(token)
    );

    // --------------------------------------------------
    // Phase 2: Configuration & Registry
    // --------------------------------------------------
    // Protocol Directory registrations
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, address(controller));
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));

    // Setup Asset ID and Oracle Config
    bytes32 assetId = bytes32(uint256(uint160(address(mockCollateral))));
    oracleProvider.registerAsset(assetId, 1000 * 10 ** 18, 18, block.timestamp, 1);
    oracleManager.configureAsset(assetId, address(oracleProvider), address(0), 3600, true);

    // Setup Vault Configurations
    vault.registerAsset(address(mockCollateral), 18);

    // Setup Treasury Configurations
    treasury.registerAsset(address(mockCollateral), 18);

    // Grant Roles to Controller
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    treasury.grantRole(treasury.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    // Revoke deployer control from token controller role to conform to production standards
    token.revokeRole(token.CONTROLLER_ROLE(), deployerAddress);

    vm.stopBroadcast();

    // --------------------------------------------------
    // Phase 3: Integration Tests Verification
    // --------------------------------------------------
    address tester = address(0x999);
    uint256 depositAmt = 100 * 10 ** 18;
    uint256 fee = FeeLib.calculateDepositFee(depositAmt);
    uint256 net = depositAmt - fee;

    mockCollateral.mint(tester, depositAmt * 2);

    // 1. Initial Deposit
    vm.startPrank(tester);
    mockCollateral.approve(address(vault), net);
    mockCollateral.approve(address(controller), fee);
    UnifyVaultController.DepositQuote memory quote1 = controller.deposit(
      address(mockCollateral),
      depositAmt,
      0,
      tester
    );
    vm.stopPrank();

    require(token.balanceOf(tester) == net, 'Initial shares mismatch');
    require(vault.totalAssets(address(mockCollateral)) == net, 'Vault total assets mismatch');
    require(mockCollateral.balanceOf(address(treasury)) == fee, 'Treasury fee mismatch');

    // 2. Second Deposit (Proportional check)
    vm.startPrank(tester);
    mockCollateral.approve(address(vault), net);
    mockCollateral.approve(address(controller), fee);
    UnifyVaultController.DepositQuote memory quote2 = controller.deposit(
      address(mockCollateral),
      depositAmt,
      0,
      tester
    );
    vm.stopPrank();

    require(token.balanceOf(tester) == net * 2, 'Second deposit shares mismatch');

    // 3. Partial Redemption
    uint256 redeemShares = net; // Redeem half the shares
    uint256 grossRedeemAssets = ShareLib.sharesToAssets(
      redeemShares,
      token.totalSupply(),
      vault.totalAssets(address(mockCollateral))
    );
    (, uint256 redeemFee, uint256 netRedeemOut) = FeeLib.calculateRedemptionFee(grossRedeemAssets);

    vm.startPrank(tester);
    uint256 netAssetsOut = controller.redeem(
      address(mockCollateral),
      redeemShares,
      0,
      tester,
      block.timestamp + 100
    );
    vm.stopPrank();

    require(netAssetsOut == netRedeemOut, 'Redemption net assets mismatch');
    require(token.balanceOf(tester) == net, 'Remaining shares mismatch');

    // 4. Full Redemption
    uint256 remainingShares = token.balanceOf(tester);
    vm.startPrank(tester);
    controller.redeem(address(mockCollateral), remainingShares, 0, tester, block.timestamp + 100);
    vm.stopPrank();

    require(token.balanceOf(tester) == 0, 'Shares not fully burned');
    require(vault.totalAssets(address(mockCollateral)) == 0, 'Vault assets not zero');
    require(mockCollateral.balanceOf(address(controller)) == 0, 'Controller balance not zero');

    // 5. Donation Immunity Test
    mockCollateral.mint(address(vault), 10 * 10 ** 18);
    require(vault.surplusAssets(address(mockCollateral)) == 10 * 10 ** 18, 'Surplus not tracked');
    require(
      vault.totalAssets(address(mockCollateral)) == 0,
      'Accounted assets altered by donation'
    );
  }
}
