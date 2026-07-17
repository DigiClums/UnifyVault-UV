// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/ProtocolDirectory.sol';
import '../src/oracle/OracleManager.sol';
import '../src/oracle/MockOracleProvider.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import { Errors as ProtocolErrors } from '../src/errors/Errors.sol';
import '../src/libraries/AccessRoles.sol';
import '../src/libraries/FeeLib.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

// Simple mock for Treasury to avoid Address.sol global naming collision
contract MockTreasury {
  function collectFee(address asset, uint256 amount) external {
    IERC20(asset).transferFrom(msg.sender, address(this), amount);
  }
}

contract MockERC20 is ERC20 {
  uint8 private _decimals;

  constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
    _decimals = decimals_;
  }

  function decimals() public view override returns (uint8) {
    return _decimals;
  }

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }
}

contract DepositValidationTest is Test {
  UnifyVaultController public controller;

  ProtocolDirectory public directory;
  OracleManager public oracleManager;
  MockOracleProvider public oracleProvider;
  CustodyVault public vault;
  MockTreasury public treasury;
  UVBTCETHToken public token;

  address public tokenA;
  address public tokenB;

  address public gov = address(0xABC);
  address public guardian = address(0x111);
  address public user = address(0x222);

  bytes32 public assetIdA;
  bytes32 public assetIdB;

  function setUp() public {
    vm.warp(100000);
    directory = new ProtocolDirectory();
    oracleManager = new OracleManager();
    oracleProvider = new MockOracleProvider();
    vault = new CustodyVault();
    treasury = new MockTreasury();
    token = new UVBTCETHToken();

    tokenA = address(new MockERC20('TokenA', 'TKA', 18));
    tokenB = address(new MockERC20('TokenB', 'TKB', 8));

    // 1. Grant governance access to this test contract for config
    oracleManager.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    oracleProvider.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    vault.grantRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    token.grantRole(token.CONTROLLER_ROLE(), address(this));

    // 2. Register assets in Oracle Provider
    assetIdA = bytes32(uint256(uint160(tokenA)));
    assetIdB = bytes32(uint256(uint160(tokenB)));
    oracleProvider.registerAsset(assetIdA, 1000 * 10 ** 18, 18, block.timestamp, 1);
    oracleProvider.registerAsset(assetIdB, 50000 * 10 ** 8, 8, block.timestamp, 1);

    // 4. Register config in Oracle Manager
    oracleManager.configureAsset(assetIdA, address(oracleProvider), address(0), 3600, true);
    oracleManager.configureAsset(assetIdB, address(oracleProvider), address(0), 3600, true);

    // 5. Register config in Vault
    vault.registerAsset(tokenA, 18);
    vault.registerAsset(tokenB, 8);

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

    // Grant CONTROLLER_ROLE of CustodyVault and UVBTCETHToken to controller
    vault.grantRole(vault.CONTROLLER_ROLE(), address(controller));
    token.grantRole(token.CONTROLLER_ROLE(), address(controller));

    // Renounce setup rights
    controller.renounceRole(AccessRoles.GOVERNANCE_ROLE, address(this));
    controller.renounceRole(controller.GUARDIAN_ROLE(), address(this));
  }

  // --- Unit Tests ---

  function testDepositValidationSuccess() public {
    uint256 amount = 10 * 10 ** 18;
    uint256 expectedFee = (amount * FeeLib.DEPOSIT_FEE_BPS) / FeeLib.BPS_DENOMINATOR;
    uint256 expectedNet = amount - expectedFee;
    uint256 expectedShares = expectedNet;

    deal(tokenA, user, amount);
    vm.startPrank(user);
    IERC20(tokenA).approve(address(vault), expectedNet);
    IERC20(tokenA).approve(address(controller), expectedFee);

    UnifyVaultController.DepositQuote memory quote = controller.deposit(tokenA, amount, 0, user);
    vm.stopPrank();

    assertEq(quote.sharesPreview, expectedShares);
  }

  function testPreviewDepositReturnsExpectedShares() public {
    uint256 amount = 10 * 10 ** 18;
    uint256 expectedNet = amount - (amount * FeeLib.DEPOSIT_FEE_BPS) / FeeLib.BPS_DENOMINATOR;
    uint256 expectedShares = expectedNet;

    uint256 shares = controller.previewDeposit(tokenA, amount);
    assertEq(shares, expectedShares);

    uint256 estimate = controller.estimateMint(tokenA, amount);
    assertEq(estimate, expectedShares);
  }

  function testQuoteDeterministicAndMatching() public {
    uint256 amount = 10 * 10 ** 18;
    uint256 expectedFee = (amount * FeeLib.DEPOSIT_FEE_BPS) / FeeLib.BPS_DENOMINATOR;
    uint256 expectedNet = amount - expectedFee;
    uint256 expectedShares = expectedNet;

    UnifyVaultController.DepositQuote memory quote1 = controller.getDepositQuote(
      tokenA,
      amount,
      0,
      user
    );
    UnifyVaultController.DepositQuote memory quote2 = controller.getDepositQuote(
      tokenA,
      amount,
      0,
      user
    );

    // Assert deterministic fields
    assertEq(quote1.assetId, assetIdA);
    assertEq(quote1.asset, tokenA);
    assertEq(quote1.receiver, user);
    assertEq(quote1.depositAmount, amount);
    assertEq(quote1.rawPrice, 1000 * 10 ** 18);
    assertEq(quote1.normalizedPrice, 1000 * 10 ** 18);
    assertEq(quote1.sharesPreview, expectedShares);
    assertEq(quote1.protocolFee, expectedFee);
    assertEq(quote1.netDeposit, expectedNet);
    assertEq(quote1.timestamp, block.timestamp);

    // Assert equality between runs
    assertEq(quote1.assetId, quote2.assetId);
    assertEq(quote1.sharesPreview, quote2.sharesPreview);
    assertEq(quote1.rawPrice, quote2.rawPrice);

    // Assert that preview and estimate match quote
    assertEq(controller.previewDeposit(tokenA, amount), quote1.sharesPreview);
    assertEq(controller.estimateMint(tokenA, amount), quote1.sharesPreview);
  }

  function testUnsupportedAssetRevert() public {
    address unsupported = address(0x999);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.AssetNotSupported.selector,
        bytes32(uint256(uint160(unsupported)))
      )
    );
    controller.deposit(unsupported, 10 * 10 ** 18, 0, user);
  }

  function testDisabledAssetRevert() public {
    vault.disableAsset(tokenA);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.AssetNotSupported.selector,
        bytes32(uint256(uint160(tokenA)))
      )
    );
    controller.deposit(tokenA, 10 * 10 ** 18, 0, user);
  }

  function testZeroAmountRevert() public {
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.MathCalculationOverflow.selector));
    controller.deposit(tokenA, 0, 0, user);
  }

  function testZeroReceiverRevert() public {
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.ZeroAddressDetected.selector));
    controller.deposit(tokenA, 10 * 10 ** 18, 0, address(0));
  }

  function testStaleOracleRevert() public {
    // Advance time past heartbeat
    oracleProvider.setTimestamp(assetIdA, uint32(block.timestamp - 4000));
    vm.expectRevert(
      abi.encodeWithSelector(ProtocolErrors.OraclePriceStale.selector, tokenA, 3600, 3600)
    );
    controller.deposit(tokenA, 10 * 10 ** 18, 0, user);
  }

  function testUnhealthyOracleRevert() public {
    oracleProvider.setOffline(assetIdA, true);
    vm.expectRevert(
      abi.encodeWithSelector(ProtocolErrors.OraclePriceStale.selector, tokenA, 3600, 3600)
    );
    controller.deposit(tokenA, 10 * 10 ** 18, 0, user);
  }

  function testSlippageLimitExceededRevert() public {
    // expectedShares is 9.975 * 10 ** 18. Slippage requests 11000 * 10 ** 18 minSharesOut
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.SlippageLimitExceeded.selector,
        11000 * 10 ** 18,
        9975000000000000000
      )
    );
    controller.deposit(tokenA, 10 * 10 ** 18, 11000 * 10 ** 18, user);
  }

  function testMaxDepositLimitRevert() public {
    vm.prank(gov);
    controller.setMaxDeposit(5 * 10 ** 18);

    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.MathCalculationOverflow.selector));
    controller.deposit(tokenA, 6 * 10 ** 18, 0, user);
  }

  // --- Fuzz Tests ---

  function testFuzzDepositValidation(uint256 amount, uint256 price) public {
    vm.assume(amount > 10000 && amount < 10000000 * 10 ** 18);
    vm.assume(price > 0 && price < 10000000 * 10 ** 18);

    oracleProvider.setPrice(assetIdA, price);
    oracleProvider.setTimestamp(assetIdA, uint32(block.timestamp));

    // Previews do not revert, they calculate
    uint256 shares = controller.previewDeposit(tokenA, amount);
    uint256 expectedNet = amount - (amount * FeeLib.DEPOSIT_FEE_BPS) / FeeLib.BPS_DENOMINATOR;
    uint256 expectedShares = expectedNet;
    assertEq(shares, expectedShares);
  }
}
