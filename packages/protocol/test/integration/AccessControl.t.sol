// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/oracle/OracleManager.sol';
import '../../src/oracle/MockOracleProvider.sol';
import '../../src/vault/CustodyVault.sol';
import '../../src/token/UVBTCETHToken.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/libraries/AccessRoles.sol';
import '../../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

// Interface for Treasury to avoid compiling Treasury.sol directly (namespace clash)
interface ITestTreasury {
  function registerAsset(address asset, uint8 decimals) external;
  function grantRole(bytes32 role, address account) external;
  function revokeRole(bytes32 role, address account) external;
  function renounceRole(bytes32 role, address account) external;
  function hasRole(bytes32 role, address account) external view returns (bool);
  function getRoleAdmin(bytes32 role) external view returns (bytes32);
  function CONTROLLER_ROLE() external view returns (bytes32);
  function collectFee(address asset, uint256 amount) external;
}

contract MockERC20 is ERC20 {
  constructor() ERC20('Mock Collateral', 'MCOL') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract AccessControlTest is Test {
  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  ITestTreasury public treasury;
  CustodyVault public vault;
  UVBTCETHToken public token;
  UnifyVaultController public controller;
  MockERC20 public mockCollateral;

  address public admin = address(0xABC);
  address public governance = address(0xDEF);
  address public guardian = address(0x111);
  address public controllerAddr;
  address public attacker = address(0x666);
  address public rando = address(0x777);

  bytes32 public constant GOVERNANCE_ROLE = AccessRoles.GOVERNANCE_ROLE;
  bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

  // AccessControl events
  event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
  event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

  function setUp() public {
    _deployProtocol();
    _configureProtocol();
    _grantRoles();
  }

  // --- Helpers ---

  function _deployProtocol() internal {
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();

    // Deploy Treasury via bytecode to bypass compiler namespace collisions
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
    controllerAddr = address(controller);
  }

  function _configureProtocol() internal {
    directory.registerAddress(ModuleIds.TREASURY, address(treasury));
    directory.registerAddress(ModuleIds.VAULT, address(vault));
    directory.registerAddress(ModuleIds.DEPOSIT_MANAGER, controllerAddr);
    directory.registerAddress(ModuleIds.ORACLE, address(oracleManager));
    directory.registerAddress(ModuleIds.TOKEN, address(token));

    bytes32 assetId = bytes32(uint256(uint160(address(mockCollateral))));
    oracleProvider.registerAsset(assetId, 1000 * 10 ** 18, 18, block.timestamp, 1);
    oracleManager.configureAsset(assetId, address(oracleProvider), address(0), 3600, true);

    vault.registerAsset(address(mockCollateral), 18);
    treasury.registerAsset(address(mockCollateral), 18);
  }

  function _grantRoles() internal {
    // Grant Vault permissions
    vault.grantRole(vault.CONTROLLER_ROLE(), controllerAddr);
    vault.grantRole(DEFAULT_ADMIN_ROLE, admin);
    vault.grantRole(GOVERNANCE_ROLE, governance);
    vault.grantRole(vault.GUARDIAN_ROLE(), guardian);

    // Grant Treasury permissions
    treasury.grantRole(treasury.CONTROLLER_ROLE(), controllerAddr);
    treasury.grantRole(DEFAULT_ADMIN_ROLE, admin);
    treasury.grantRole(GOVERNANCE_ROLE, governance);
    treasury.grantRole(vault.GUARDIAN_ROLE(), guardian);

    // Grant Token permissions
    token.grantRole(token.CONTROLLER_ROLE(), controllerAddr);
    token.grantRole(DEFAULT_ADMIN_ROLE, admin);
    token.grantRole(GOVERNANCE_ROLE, governance);
    token.grantRole(token.GUARDIAN_ROLE(), guardian);

    token.revokeRole(token.CONTROLLER_ROLE(), address(this));
    vault.revokeRole(DEFAULT_ADMIN_ROLE, address(this));
    token.revokeRole(DEFAULT_ADMIN_ROLE, address(this));
  }

  // --- Tests ---

  function testOnlyControllerCanMint() public {
    // Controller should be able to trigger a deposit which mints
    mockCollateral.mint(rando, 10 * 10 ** 18);
    vm.startPrank(rando);
    mockCollateral.approve(address(vault), 10 * 10 ** 18);
    mockCollateral.approve(controllerAddr, 10 * 10 ** 18);
    controller.deposit(address(mockCollateral), 10 * 10 ** 18, 0, rando);
    vm.stopPrank();

    // Attacker cannot mint directly to themselves
    vm.prank(attacker);
    vm.expectRevert();
    token.mint(attacker, 100);
  }

  function testOnlyControllerCanBurn() public {
    // Attacker cannot burn directly
    vm.prank(attacker);
    vm.expectRevert();
    token.burn(rando, 100);
  }

  function testOnlyControllerCanCollectFees() public {
    mockCollateral.mint(attacker, 100);
    vm.startPrank(attacker);
    mockCollateral.approve(address(treasury), 100);
    vm.expectRevert();
    treasury.collectFee(address(mockCollateral), 100);
    vm.stopPrank();
  }

  function testOnlyControllerCanMoveVaultAssets() public {
    // Attacker cannot call CustodyVault.withdraw directly
    vm.prank(attacker);
    vm.expectRevert();
    vault.withdraw(address(mockCollateral), attacker, 100);
  }

  function testUnauthorizedCannotRegisterOracle() public {
    vm.prank(attacker);
    vm.expectRevert();
    oracleProvider.registerAsset(bytes32(uint256(1)), 1, 18, block.timestamp, 1);
  }

  function testUnauthorizedCannotRegisterAsset() public {
    address mock2 = address(0x888);
    vm.prank(attacker);
    vm.expectRevert();
    vault.registerAsset(mock2, 18);
  }

  function testUnauthorizedCannotGrantRoles() public {
    bytes32 controllerRole = vault.CONTROLLER_ROLE();
    vm.prank(attacker);
    vm.expectRevert();
    vault.grantRole(controllerRole, attacker);
  }

  function testUnauthorizedCannotPause() public {
    vm.prank(attacker);
    vm.expectRevert();
    vault.pause();
  }

  function testUnauthorizedCannotConfigureOracle() public {
    bytes32 assetId2 = bytes32(uint256(2));
    vm.prank(attacker);
    vm.expectRevert();
    oracleManager.configureAsset(assetId2, address(oracleProvider), address(0), 3600, true);
  }

  function testRoleRevocationWorks() public {
    // Admin revokes governance
    vm.prank(admin);
    vault.revokeRole(GOVERNANCE_ROLE, governance);

    assertFalse(vault.hasRole(GOVERNANCE_ROLE, governance));

    // Governance can no longer register assets
    address mock2 = address(0x888);
    vm.prank(governance);
    vm.expectRevert();
    vault.registerAsset(mock2, 18);
  }

  function testAdminRoleManagement() public {
    // DEFAULT_ADMIN_ROLE is the admin of GOVERNANCE_ROLE
    assertEq(vault.getRoleAdmin(GOVERNANCE_ROLE), DEFAULT_ADMIN_ROLE);

    // Admin grants role to rando
    vm.prank(admin);
    vault.grantRole(GOVERNANCE_ROLE, rando);

    assertTrue(vault.hasRole(GOVERNANCE_ROLE, rando));
  }

  function testControllerRoleManagement() public {
    // DEFAULT_ADMIN_ROLE is the admin of CONTROLLER_ROLE
    bytes32 controllerRole = vault.CONTROLLER_ROLE();
    assertEq(vault.getRoleAdmin(controllerRole), DEFAULT_ADMIN_ROLE);

    // Admin grants controller role to rando
    vm.prank(admin);
    vault.grantRole(controllerRole, rando);

    assertTrue(vault.hasRole(controllerRole, rando));
  }

  function testAccessControlEvents() public {
    // Admin grants role, should emit RoleGranted
    vm.prank(admin);
    vm.expectEmit(true, true, true, true);
    emit RoleGranted(GOVERNANCE_ROLE, rando, admin);
    vault.grantRole(GOVERNANCE_ROLE, rando);

    // Admin revokes role, should emit RoleRevoked
    vm.prank(admin);
    vm.expectEmit(true, true, true, true);
    emit RoleRevoked(GOVERNANCE_ROLE, rando, admin);
    vault.revokeRole(GOVERNANCE_ROLE, rando);
  }
}
