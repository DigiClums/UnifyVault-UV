// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console2 } from 'forge-std/Script.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { UnifyVaultControllerUpgradeable } from '../src/controller/UnifyVaultControllerUpgradeable.sol';
import { CostBasisManagerV2 } from '../src/treasury/CostBasisManagerV2.sol';
import { ProtocolDirectory } from '../src/ProtocolDirectory.sol';
import { CustodyVault } from '../src/vault/CustodyVault.sol';
import { UVBEV2 } from '../src/token/UVBEV2.sol';
import { AccessRoles } from '../src/libraries/AccessRoles.sol';
import { ModuleIds } from '../src/constants/ModuleIds.sol';

/**
 * @title ExecuteBaseSepoliaSmokeTestScript
 * @notice Executes the controlled Base Sepolia smoke test against the newly deployed Proxy.
 * @dev Performs:
 *      1. Approve 10 USDC
 *      2. Deposit 10 USDC with minSharesOut = 9.0 UVBE
 *      3. Approve 1 UVBE
 *      4. Redeem 1 UVBE with minAssetsOut = 0.95 USDC
 *      5. Emergency Pause
 *      6. Resume
 */
contract ExecuteBaseSepoliaSmokeTestScript is Script {
  address public constant PROXY = 0x7DC190a0bFa08c9596DfdC20E602821619E776ea;
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant TOKEN = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant TREASURY = 0xB8c8113a042f39936dD966A5983fAaE2bF7b7290;
  address public constant COST_BASIS_MANAGER = 0x57869372AFbd7b61752f2f8d3e7F37701e28517B;
  address public constant DIRECTORY = 0x8040006d6907a84911aaC0a9aC08278311B156e2;
  address public constant LEGACY_CONTROLLER = 0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec;

  uint256 public constant DEPOSIT_AMOUNT = 10_000_000; // 10 USDC
  uint256 public constant MIN_SHARES_OUT = 9_000_000_000_000_000_000; // 9.0 UVBE
  uint256 public constant REDEEM_SHARES = 1_000_000_000_000_000_000; // 1.0 UVBE
  uint256 public constant MIN_ASSETS_OUT = 950_000; // 0.95 USDC

  function run() external {
    address caller = msg.sender;
    console2.log('===============================================================');
    console2.log('  EXECUTING CONTROLLED SMOKE TEST ON BASE SEPOLIA PROXY');
    console2.log('===============================================================');
    console2.log('Caller / Admin:       ', caller);
    console2.log('Proxy Address:        ', PROXY);

    UnifyVaultControllerUpgradeable controller = UnifyVaultControllerUpgradeable(PROXY);
    IERC20 usdcToken = IERC20(USDC);
    UVBEV2 uvbeToken = UVBEV2(TOKEN);
    CostBasisManagerV2 cbm = CostBasisManagerV2(COST_BASIS_MANAGER);

    uint256 usdcBefore = usdcToken.balanceOf(caller);
    uint256 uvbeBefore = uvbeToken.balanceOf(caller);
    uint256 cbmBasisBefore = cbm.costBasis(caller);

    console2.log('Initial USDC Balance: ', usdcBefore);
    console2.log('Initial UVBE Balance: ', uvbeBefore);
    console2.log('Initial Cost Basis:   ', cbmBasisBefore);

    vm.startBroadcast();

    // -----------------------------------------------------------------
    // STEP 1: Approve 10 USDC
    // -----------------------------------------------------------------
    usdcToken.approve(PROXY, DEPOSIT_AMOUNT);
    console2.log('[OK] STEP 1: Approved 10 USDC to Proxy');

    // -----------------------------------------------------------------
    // STEP 2: Deposit 10 USDC through Proxy
    // -----------------------------------------------------------------
    UnifyVaultControllerUpgradeable.DepositQuote memory depQuote = controller.deposit(
      USDC,
      DEPOSIT_AMOUNT,
      MIN_SHARES_OUT,
      caller
    );
    console2.log('[OK] STEP 2: Deposited 10 USDC through Proxy');
    console2.log('  Shares Minted:      ', depQuote.sharesPreview);
    console2.log('  Net Deposit:        ', depQuote.netDeposit);
    console2.log('  Protocol Fee:       ', depQuote.protocolFee);

    // -----------------------------------------------------------------
    // STEP 3: Approve 1 UVBE
    // -----------------------------------------------------------------
    uvbeToken.approve(PROXY, REDEEM_SHARES);
    console2.log('[OK] STEP 3: Approved 1 UVBE to Proxy');

    // -----------------------------------------------------------------
    // STEP 4: Redeem 1 UVBE through Proxy
    // -----------------------------------------------------------------
    uint256 deadline = block.timestamp + 3600;
    uint256 netAssetsOut = controller.redeem(USDC, REDEEM_SHARES, MIN_ASSETS_OUT, caller, deadline);
    console2.log('[OK] STEP 4: Redeemed 1 UVBE through Proxy');
    console2.log('  Net USDC Received:  ', netAssetsOut);

    // -----------------------------------------------------------------
    // STEP 5: Emergency Pause Test
    // -----------------------------------------------------------------
    controller.emergencyPause();
    require(controller.paused(), 'PAUSE: emergencyPause failed');
    console2.log('[OK] STEP 5: emergencyPause() executed; paused() == true');

    // -----------------------------------------------------------------
    // STEP 6: Resume Test
    // -----------------------------------------------------------------
    controller.resume();
    require(!controller.paused(), 'RESUME: resume failed');
    console2.log('[OK] STEP 6: resume() executed; paused() == false');

    vm.stopBroadcast();

    // -----------------------------------------------------------------
    // POST-FLIGHT VERIFICATIONS
    // -----------------------------------------------------------------
    uint256 usdcAfter = usdcToken.balanceOf(caller);
    uint256 uvbeAfter = uvbeToken.balanceOf(caller);
    uint256 cbmBasisAfter = cbm.costBasis(caller);

    console2.log('===============================================================');
    console2.log('  SMOKE TEST COMPLETED SUCCESSFULLY');
    console2.log('===============================================================');
    console2.log('Final USDC Balance:   ', usdcAfter);
    console2.log('Final UVBE Balance:   ', uvbeAfter);
    console2.log('Final Cost Basis:     ', cbmBasisAfter);
    console2.log('===============================================================');
  }
}
