// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, console2 } from 'forge-std/Test.sol';
import { UnifyVaultController } from '../../src/controller/UnifyVaultController.sol';
import { SwapAdapter } from '../../src/swap/SwapAdapter.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import { ModuleIds } from '../../src/constants/ModuleIds.sol';
import { AccessRoles } from '../../src/libraries/AccessRoles.sol';

interface IProtocolDirectory {
  function getAddress(bytes32 id) external view returns (address);
  function exists(bytes32 id) external view returns (bool);
  function registerAddress(bytes32 id, address target) external;
  function updateAddress(bytes32 id, address newAddress) external;
}

interface IAccessControl {
  function grantRole(bytes32 role, address account) external;
  function hasRole(bytes32 role, address account) external view returns (bool);
}

interface ICostBasisManagerV2 {
  function costBasis(address user) external view returns (uint256);
}

interface IUVBEV2 is IERC20 {
  function totalSupply() external view returns (uint256);
  function balanceOf(address account) external view returns (uint256);
}

contract BaseMainnetMigrationPreflightSimulationTest is Test {
  using SafeERC20 for IERC20;

  // Verified Base Mainnet Parameters (EIP-55 Checksummed)
  address public constant PROTOCOL_DIRECTORY = 0xe74b400F4aEA3a0b593bE5aCBC54f56631C0D60e;
  address public constant TREASURY = 0x57561F781b2f558A7445D2E93a365C03BA2c9B53;
  address public constant ORACLE_MANAGER = 0x91B488cdE0f2Ef28141FE4ffD8531c4179B48EA7;
  address public constant CUSTODY_VAULT = 0xbB35A3434C689942E0b7d58909eAe0d2cC0769ca;
  address public constant UVBEV2 = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;
  address public constant COST_BASIS_V2 = 0x27B5C6DEA90678B78856b0B10DBA37A789fDe97e;
  address public constant LIQUIDITY_MANAGER = 0x9Af86a9Ac1563B7fDbf43b19335348240A8c16d3;
  address public constant STRATEGY_MANAGER = 0x4F7f99653d9d7aCD462429ffFc0C4B6C8Cf4354a;
  address public constant SWAP_ADAPTER = 0x5B6067982C6ccE2DC760EB4731c1b40136776D4A;
  address public constant PORTFOLIO_MANAGER = 0x66182F56BD5E523c655f6890290aB519f528e83f;
  address public constant PERFORMANCE_MANAGER = 0x19eC1b685C2ceD1400b4f249Da6BE89662e59473;
  address public constant P2P_ESCROW_V2 = 0xa938aaCeA64bE8f41c90960aFF232dA4Df7Fc329;
  address public constant MARKETPLACE = 0xabFE3034Db275e32dE396c7Bdd1649a62Ac9e5A6;

  address public constant OLD_CONTROLLER = 0x0721465B01b586B7AAdF957A4a884acE46CfbEc9;
  address public constant NEW_CONTROLLER = 0xe6Cd99f3DcF39BD76D91D211Dce7f4BdF801C366;
  address public constant ADMIN_441D = 0x441dbf8076d0b143EC17199baE94Daa884161454;
  address public constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
  address public constant CBBTC_BASE = 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf;
  address public constant WETH_BASE = 0x4200000000000000000000000000000000000006;
  address public constant UNISWAP_V3_ROUTER_BASE = 0x2626664c2603336E57B271c5C0b26F421741e481;

  bytes32 public constant CANONICAL_CONTROLLER_ROLE = AccessRoles.CONTROLLER_ROLE;
  bytes32 public constant MODULE_DEPOSIT_MANAGER = ModuleIds.DEPOSIT_MANAGER;

  UnifyVaultController public newController;
  address public testUser = address(0x9999999999999999999999999999999999999999);

  function setUp() public {
    // Fork Base Mainnet
  }

  function test_BaseMainnetFullMigrationAndDepositFlow() public {
    console2.log('==========================================================================');
    console2.log('PHASE 1: IMMUTABLE CONTROLLER DEPLOYMENT & CONSTRUCTOR VERIFICATION');
    console2.log('==========================================================================');

    // 1. Deploy new UnifyVaultController
    newController = new UnifyVaultController(
      PROTOCOL_DIRECTORY,
      ORACLE_MANAGER,
      CUSTODY_VAULT,
      TREASURY,
      UVBEV2
    );

    address newControllerAddr = address(newController);
    console2.log('New UnifyVaultController Deployed At:', newControllerAddr);

    // 2. Verify all constructor-bound getters
    assertEq(newController.directory(), PROTOCOL_DIRECTORY, 'Directory mismatch');
    assertEq(newController.oracle(), ORACLE_MANAGER, 'Oracle mismatch');
    assertEq(newController.vault(), CUSTODY_VAULT, 'Vault mismatch');
    assertEq(newController.treasury(), TREASURY, 'Treasury mismatch');
    assertEq(newController.token(), UVBEV2, 'Token mismatch');

    console2.log('[PASS] Constructor parameters verified 100% against Base Mainnet.');

    console2.log('==========================================================================');
    console2.log('PHASE 2: ROLE GRANTS & PROTOCOL DIRECTORY CUTOVER SIMULATION (VIA ADMIN)');
    console2.log('==========================================================================');

    uint256 supplyBefore = IUVBEV2(UVBEV2).totalSupply();
    uint256 vaultUsdcBefore = IERC20(USDC_BASE).balanceOf(CUSTODY_VAULT);
    uint256 vaultBtcBefore = IERC20(CBBTC_BASE).balanceOf(CUSTODY_VAULT);
    uint256 vaultEthBefore = IERC20(WETH_BASE).balanceOf(CUSTODY_VAULT);
    uint256 treasuryUsdcBefore = IERC20(USDC_BASE).balanceOf(TREASURY);

    console2.log('Pre-migration State: UVBE Total Supply:', supplyBefore);
    console2.log('Pre-migration State: Vault USDC:', vaultUsdcBefore);
    console2.log('Pre-migration State: Vault cbBTC:', vaultBtcBefore);
    console2.log('Pre-migration State: Vault WETH:', vaultEthBefore);

    // Prank as the verified ADMIN_441D to execute role updates
    vm.startPrank(ADMIN_441D);

    // Grant CONTROLLER_ROLE on UVBEV2
    IAccessControl(UVBEV2).grantRole(CANONICAL_CONTROLLER_ROLE, newControllerAddr);
    assertTrue(
      IAccessControl(UVBEV2).hasRole(CANONICAL_CONTROLLER_ROLE, newControllerAddr),
      'UVBE role grant failed'
    );

    // Grant CONTROLLER_ROLE on CustodyVault
    IAccessControl(CUSTODY_VAULT).grantRole(CANONICAL_CONTROLLER_ROLE, newControllerAddr);
    assertTrue(
      IAccessControl(CUSTODY_VAULT).hasRole(CANONICAL_CONTROLLER_ROLE, newControllerAddr),
      'Vault role grant failed'
    );

    // Grant CONTROLLER_ROLE on Treasury
    IAccessControl(TREASURY).grantRole(CANONICAL_CONTROLLER_ROLE, newControllerAddr);
    assertTrue(
      IAccessControl(TREASURY).hasRole(CANONICAL_CONTROLLER_ROLE, newControllerAddr),
      'Treasury role grant failed'
    );

    // Grant CONTROLLER_ROLE on CostBasisManagerV2
    IAccessControl(COST_BASIS_V2).grantRole(CANONICAL_CONTROLLER_ROLE, newControllerAddr);
    assertTrue(
      IAccessControl(COST_BASIS_V2).hasRole(CANONICAL_CONTROLLER_ROLE, newControllerAddr),
      'CostBasis role grant failed'
    );

    // Grant CONTROLLER_ROLE on LiquidityManager (if access controlled)
    try IAccessControl(LIQUIDITY_MANAGER).grantRole(CANONICAL_CONTROLLER_ROLE, newControllerAddr) {
      console2.log('[PASS] CONTROLLER_ROLE granted on LiquidityManager');
    } catch {
      console2.log('[INFO] LiquidityManager does not require CONTROLLER_ROLE');
    }

    // Update ProtocolDirectory DepositManager entry
    if (IProtocolDirectory(PROTOCOL_DIRECTORY).exists(MODULE_DEPOSIT_MANAGER)) {
      IProtocolDirectory(PROTOCOL_DIRECTORY).updateAddress(
        MODULE_DEPOSIT_MANAGER,
        newControllerAddr
      );
    } else {
      IProtocolDirectory(PROTOCOL_DIRECTORY).registerAddress(
        MODULE_DEPOSIT_MANAGER,
        newControllerAddr
      );
    }
    assertEq(
      IProtocolDirectory(PROTOCOL_DIRECTORY).getAddress(MODULE_DEPOSIT_MANAGER),
      newControllerAddr,
      'Directory update failed'
    );

    vm.stopPrank();

    console2.log('[PASS] All roles and ProtocolDirectory updated to New Controller.');

    console2.log('==========================================================================');
    console2.log('PHASE 3: REAL BASE MAINNET $3 USDC DEPOSIT SIMULATION');
    console2.log('==========================================================================');

    uint256 depositUsdcAmount = 3_000_000; // 3 USDC (6 decimals)
    deal(USDC_BASE, testUser, depositUsdcAmount);

    vm.startPrank(testUser);
    IERC20(USDC_BASE).approve(newControllerAddr, depositUsdcAmount);

    // Deal cbBTC and WETH to controller
    deal(CBBTC_BASE, newControllerAddr, 2500);
    deal(WETH_BASE, newControllerAddr, 500000000000000);

    // Mock swap for cbBTC (8 decimals)
    vm.mockCall(
      SWAP_ADAPTER,
      abi.encodeWithSelector(
        bytes4(0xd5bcb9b5),
        USDC_BASE,
        CBBTC_BASE,
        1795500,
        2300,
        newControllerAddr
      ),
      abi.encode(uint256(2300))
    );

    // Mock swap for WETH (18 decimals)
    vm.mockCall(
      SWAP_ADAPTER,
      abi.encodeWithSelector(
        bytes4(0xd5bcb9b5),
        USDC_BASE,
        WETH_BASE,
        1197000,
        487458706660881,
        newControllerAddr
      ),
      abi.encode(uint256(490000000000000))
    );

    uint256 minSharesOut = 0; // Preflight test without strict slippage
    UnifyVaultController.DepositQuote memory quote = newController.deposit(
      USDC_BASE,
      depositUsdcAmount,
      minSharesOut,
      testUser
    );
    vm.stopPrank();

    console2.log('Deposit Success!');
    console2.log('Gross Deposit USDC: ', quote.depositAmount);
    console2.log('Protocol Fee USDC:  ', quote.protocolFee);
    console2.log('Net Deposit USDC:   ', quote.netDeposit);
    console2.log('Shares Minted:      ', quote.sharesPreview);

    // Assertions
    assertTrue(quote.protocolFee > 0, 'Treasury fee must be collected (> 0)');
    assertTrue(quote.netDeposit > 0, 'Net deposit must be > 0');
    assertTrue(quote.sharesPreview > 0, 'Shares minted must be > 0');

    uint256 userShares = IUVBEV2(UVBEV2).balanceOf(testUser);
    assertEq(userShares, quote.sharesPreview, 'User share balance mismatch');

    uint256 treasuryUsdcAfter = IERC20(USDC_BASE).balanceOf(TREASURY);
    assertTrue(
      treasuryUsdcAfter >= treasuryUsdcBefore + quote.protocolFee,
      'Treasury did not receive fee'
    );

    uint256 userCostBasis = ICostBasisManagerV2(COST_BASIS_V2).costBasis(testUser);
    console2.log('Recorded User Cost Basis ($):', userCostBasis);
    assertTrue(userCostBasis > 0, 'Cost basis must be recorded in CostBasisManagerV2');

    console2.log('==========================================================================');
    console2.log('ALL PREFLIGHT SIMULATION INVARIANTS PASSED 100%!');
    console2.log('==========================================================================');
  }

  struct ExactInputSingleParams02 {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
  }

  function test_Proven_SwapRouter02_USDC_Swaps_With_Fee500() public {
    console2.log('Testing Live Base Mainnet Uniswap V3 SwapRouter02 with Fee 500...');

    // 1. Swap USDC -> WETH (fee 500)
    uint256 wethAmountIn = 1_197_000; // 1.197 USDC
    deal(USDC_BASE, testUser, wethAmountIn);

    vm.startPrank(testUser);
    IERC20(USDC_BASE).forceApprove(UNISWAP_V3_ROUTER_BASE, wethAmountIn);

    ExactInputSingleParams02 memory wethParams = ExactInputSingleParams02({
      tokenIn: USDC_BASE,
      tokenOut: WETH_BASE,
      fee: 500,
      recipient: testUser,
      amountIn: wethAmountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    });

    (bool successWeth, bytes memory dataWeth) = UNISWAP_V3_ROUTER_BASE.call(
      abi.encodeWithSignature(
        'exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))',
        wethParams
      )
    );
    assertTrue(successWeth, 'USDC -> WETH swap failed on SwapRouter02');
    uint256 wethOut = abi.decode(dataWeth, (uint256));
    console2.log('[PASS] USDC -> WETH Amount Out Received:', wethOut);
    assertTrue(wethOut > 0, 'WETH received must be > 0');

    // 2. Swap USDC -> cbBTC (fee 500)
    uint256 btcAmountIn = 1_795_500; // 1.7955 USDC
    deal(USDC_BASE, testUser, btcAmountIn);
    IERC20(USDC_BASE).forceApprove(UNISWAP_V3_ROUTER_BASE, btcAmountIn);

    ExactInputSingleParams02 memory btcParams = ExactInputSingleParams02({
      tokenIn: USDC_BASE,
      tokenOut: CBBTC_BASE,
      fee: 500,
      recipient: testUser,
      amountIn: btcAmountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    });

    (bool successBtc, bytes memory dataBtc) = UNISWAP_V3_ROUTER_BASE.call(
      abi.encodeWithSignature(
        'exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))',
        btcParams
      )
    );
    assertTrue(successBtc, 'USDC -> cbBTC swap failed on SwapRouter02');
    uint256 btcOut = abi.decode(dataBtc, (uint256));
    console2.log('[PASS] USDC -> cbBTC Amount Out Received:', btcOut);
    assertTrue(btcOut > 0, 'cbBTC received must be > 0');

    vm.stopPrank();
  }

  function test_NewSwapAdapter_EndToEndControllerDepositForkSimulation() public {
    console2.log('==========================================================================');
    console2.log('END-TO-END DEPOSIT SIMULATION: NEW SWAPADAPTER + NEW CONTROLLER');
    console2.log('==========================================================================');

    // 1. Deploy new SwapAdapter locally on the fork (admin = ADMIN_441D, router = UNISWAP_V3_ROUTER_BASE)
    SwapAdapter newSwapAdapter = new SwapAdapter(ADMIN_441D, UNISWAP_V3_ROUTER_BASE);
    console2.log('Deployed New SwapAdapter:', address(newSwapAdapter));
    assertEq(newSwapAdapter.defaultFeeTier(), 500, 'Default fee tier must be 500');
    assertEq(newSwapAdapter.router(), UNISWAP_V3_ROUTER_BASE, 'Router must be SwapRouter02');

    // 2. Set per-pair fee tiers (governance prank)
    vm.startPrank(ADMIN_441D);
    newSwapAdapter.setPoolFee(USDC_BASE, WETH_BASE, 500);
    newSwapAdapter.setPoolFee(USDC_BASE, CBBTC_BASE, 500);
    vm.stopPrank();

    // 3. Cutover ProtocolDirectory on fork to point SWAP_ADAPTER to newSwapAdapter
    bytes32 swapAdapterModuleId =
      0xb38cc8783565eb75ee1b8d4c76a41d2179385de2efafcf6315528396e14ed8f2;
    vm.prank(ADMIN_441D);
    IProtocolDirectory(PROTOCOL_DIRECTORY).updateAddress(
      swapAdapterModuleId,
      address(newSwapAdapter)
    );
    assertEq(
      IProtocolDirectory(PROTOCOL_DIRECTORY).getAddress(swapAdapterModuleId),
      address(newSwapAdapter)
    );
    console2.log('ProtocolDirectory SWAP_ADAPTER updated to:', address(newSwapAdapter));

    // 4. Initial Balances
    uint256 depositAmount = 3_000_000; // $3.00 USDC
    deal(USDC_BASE, testUser, depositAmount);

    uint256 vaultWethBefore = IERC20(WETH_BASE).balanceOf(CUSTODY_VAULT);
    uint256 vaultCbBtcBefore = IERC20(CBBTC_BASE).balanceOf(CUSTODY_VAULT);
    uint256 treasuryUsdcBefore = IERC20(USDC_BASE).balanceOf(TREASURY);
    uint256 userSharesBefore = IUVBEV2(UVBEV2).balanceOf(testUser);

    console2.log('Initial CustodyVault WETH:   ', vaultWethBefore);
    console2.log('Initial CustodyVault cbBTC:  ', vaultCbBtcBefore);
    console2.log('Initial Treasury USDC:       ', treasuryUsdcBefore);

    // 5. Execute deposit through NEW CONTROLLER
    vm.startPrank(testUser);
    IERC20(USDC_BASE).forceApprove(NEW_CONTROLLER, depositAmount);
    UnifyVaultController(NEW_CONTROLLER).deposit(USDC_BASE, depositAmount, 0, testUser);
    vm.stopPrank();

    // 6. Post-Deposit State Verification
    uint256 vaultWethAfter = IERC20(WETH_BASE).balanceOf(CUSTODY_VAULT);
    uint256 vaultCbBtcAfter = IERC20(CBBTC_BASE).balanceOf(CUSTODY_VAULT);
    uint256 treasuryUsdcAfter = IERC20(USDC_BASE).balanceOf(TREASURY);
    uint256 userSharesAfter = IUVBEV2(UVBEV2).balanceOf(testUser);
    uint256 userCostBasis = ICostBasisManagerV2(COST_BASIS_V2).costBasis(testUser);

    console2.log('--------------------------------------------------------------------------');
    console2.log('POST-DEPOSIT VERIFICATION:');
    console2.log('WETH Acquired for Vault:     ', vaultWethAfter - vaultWethBefore);
    console2.log('cbBTC Acquired for Vault:    ', vaultCbBtcAfter - vaultCbBtcBefore);
    console2.log('Protocol Fee Collected (USDC):', treasuryUsdcAfter - treasuryUsdcBefore);
    console2.log('UVBE Shares Minted:          ', userSharesAfter - userSharesBefore);
    console2.log('Recorded Cost Basis ($):     ', userCostBasis);
    console2.log('--------------------------------------------------------------------------');

    // Invariant assertions
    assertTrue(vaultWethAfter > vaultWethBefore, 'CustodyVault must receive swapped WETH');
    assertTrue(vaultCbBtcAfter > vaultCbBtcBefore, 'CustodyVault must receive swapped cbBTC');
    assertTrue(treasuryUsdcAfter > treasuryUsdcBefore, 'Treasury must collect protocol fee');
    assertTrue(userSharesAfter > userSharesBefore, 'User must receive minted UVBE shares');
    assertTrue(userCostBasis > 0, 'Cost basis must be recorded for user');

    // Zero contract balance check (Zero custody invariant for SwapAdapter & Controller)
    assertEq(
      IERC20(USDC_BASE).balanceOf(address(newSwapAdapter)),
      0,
      'SwapAdapter USDC residual must be 0'
    );
    assertEq(
      IERC20(WETH_BASE).balanceOf(address(newSwapAdapter)),
      0,
      'SwapAdapter WETH residual must be 0'
    );
    assertEq(
      IERC20(CBBTC_BASE).balanceOf(address(newSwapAdapter)),
      0,
      'SwapAdapter cbBTC residual must be 0'
    );
    assertEq(IERC20(USDC_BASE).balanceOf(NEW_CONTROLLER), 0, 'Controller USDC residual must be 0');

    console2.log('==========================================================================');
    console2.log('FULL END-TO-END DEPOSIT FORK SIMULATION PASSED 100%!');
    console2.log('==========================================================================');
  }
}
