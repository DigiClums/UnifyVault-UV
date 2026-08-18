// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console2 } from 'forge-std/Script.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { UnifyVaultControllerUpgradeable } from '../src/controller/UnifyVaultControllerUpgradeable.sol';
import { UVBEStakingVault } from '../src/staking/UVBEStakingVault.sol';
import { UVBEV2 } from '../src/token/UVBEV2.sol';

/**
 * @title ExecuteStake50FlowScript
 * @notice Executes the complete 5-step deposit, share verification, and 50 UVBE staking flow on Base Sepolia.
 * @dev Steps:
 *      1. Approve USDC to Controller Proxy
 *      2. Call Controller.deposit(USDC, requiredCollateral, minSharesOut, user)
 *      3. Verify UVBE balance >= 50 * 1e18
 *      4. Approve 50 UVBE to UVBEStakingVault
 *      5. Call StakingVault.stake(50 UVBE, referrer)
 */
contract ExecuteStake50FlowScript is Script {
  // Verified Base Sepolia Contract Addresses (Checksummed)
  address public constant CONTROLLER_PROXY = 0x7DC190a0bFa08c9596DfdC20E602821619E776ea;
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant UVBE = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant STAKING_VAULT = 0xcbb989E0Cf69A1919ED06DD2Be88b7310E325b1D;

  // Economic Parameters
  // Minimum required USDC collateral to mint >= 50 UVBE (with safety margin for 0.25% fee + NAV + swap slippage)
  uint256 public constant DEPOSIT_USDC_AMOUNT = 51_000_000; // 51.0 USDC (Exact math threshold is 50.383864 USDC)
  uint256 public constant MIN_UVBE_SHARES = 50_000_000_000_000_000_000; // 50.0 UVBE
  uint256 public constant STAKE_AMOUNT = 50_000_000_000_000_000_000; // 50.0 UVBE (MIN_STAKE)

  function run() external {
    address caller = msg.sender;
    address referrer = caller; // Genesis / self referral default

    console2.log('===============================================================');
    console2.log('  50 UVBE DEPOSIT & STAKING WORKFLOW (BASE SEPOLIA)');
    console2.log('===============================================================');
    console2.log('Caller / Staker:     ', caller);
    console2.log('Referrer:            ', referrer);
    console2.log('Controller Proxy:    ', CONTROLLER_PROXY);
    console2.log('USDC Collateral:     ', USDC);
    console2.log('UVBE Token:          ', UVBE);
    console2.log('Staking Vault:       ', STAKING_VAULT);

    IERC20 usdcToken = IERC20(USDC);
    UVBEV2 uvbeToken = UVBEV2(UVBE);
    UnifyVaultControllerUpgradeable controller = UnifyVaultControllerUpgradeable(CONTROLLER_PROXY);
    UVBEStakingVault stakingVault = UVBEStakingVault(STAKING_VAULT);

    uint256 initialUSDC = usdcToken.balanceOf(caller);
    uint256 initialUVBE = uvbeToken.balanceOf(caller);
    console2.log('Initial USDC Balance:', initialUSDC);
    console2.log('Initial UVBE Balance:', initialUVBE);

    require(
      initialUSDC >= DEPOSIT_USDC_AMOUNT,
      'Insufficient USDC balance in caller wallet. Need >= 51.0 USDC'
    );

    vm.startBroadcast();

    // -----------------------------------------------------------------
    // STEP 1: Approve Collateral (USDC -> Controller Proxy)
    // -----------------------------------------------------------------
    usdcToken.approve(CONTROLLER_PROXY, DEPOSIT_USDC_AMOUNT);
    console2.log('[1/5] Collateral Approved: 51.0 USDC to Controller');

    // -----------------------------------------------------------------
    // STEP 2: Controller.deposit(...)
    // -----------------------------------------------------------------
    UnifyVaultControllerUpgradeable.DepositQuote memory quote = controller.deposit(
      USDC,
      DEPOSIT_USDC_AMOUNT,
      MIN_UVBE_SHARES,
      caller
    );
    console2.log('[2/5] Controller Deposit Executed:');
    console2.log('      Gross Deposit:   ', quote.depositAmount);
    console2.log('      Protocol Fee:    ', quote.protocolFee);
    console2.log('      Net Deposit:     ', quote.netDeposit);
    console2.log('      Shares Minted:   ', quote.sharesPreview);

    // -----------------------------------------------------------------
    // STEP 3: Verify UVBE Balance >= 50
    // -----------------------------------------------------------------
    uint256 currentUVBE = uvbeToken.balanceOf(caller);
    console2.log('[3/5] Verified UVBE Balance:', currentUVBE);
    require(currentUVBE >= STAKE_AMOUNT, 'UVBE balance < 50 UVBE after deposit');

    // -----------------------------------------------------------------
    // STEP 4: Approve 50 UVBE -> StakingVault
    // -----------------------------------------------------------------
    uvbeToken.approve(STAKING_VAULT, STAKE_AMOUNT);
    console2.log('[4/5] Approved 50 UVBE to UVBEStakingVault');

    // -----------------------------------------------------------------
    // STEP 5: StakingVault.stake(50 UVBE, referrer)
    // -----------------------------------------------------------------
    stakingVault.stake(STAKE_AMOUNT, referrer);
    console2.log('[5/5] Successfully Staked 50 UVBE into UVBEStakingVault!');

    vm.stopBroadcast();

    // -----------------------------------------------------------------
    // FINAL POST-MINT & STAKE SUMMARY
    // -----------------------------------------------------------------
    console2.log('===============================================================');
    console2.log('  FLOW COMPLETED SUCCESSFULLY');
    console2.log('===============================================================');
    console2.log('Final USDC Balance:  ', usdcToken.balanceOf(caller));
    console2.log('Final UVBE Balance:  ', uvbeToken.balanceOf(caller));
    console2.log('===============================================================');
  }
}
