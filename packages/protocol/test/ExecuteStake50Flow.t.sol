// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, console2 } from 'forge-std/Test.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { UnifyVaultControllerUpgradeable } from '../src/controller/UnifyVaultControllerUpgradeable.sol';
import { UVBEStakingVault } from '../src/staking/UVBEStakingVault.sol';
import { UVBEV2 } from '../src/token/UVBEV2.sol';

contract ExecuteStake50FlowTest is Test {
  address public constant CONTROLLER_PROXY = 0x7DC190a0bFa08c9596DfdC20E602821619E776ea;
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant UVBE = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant STAKING_VAULT = 0xcbb989E0Cf69A1919ED06DD2Be88b7310E325b1D;

  address public user = address(0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1);
  address public referrer = address(0x516FaAad5bce5a9269AC4a1A2FD986DdaBa1AbA1);

  uint256 public constant DEPOSIT_USDC_AMOUNT = 51_000_000; // 51 USDC
  uint256 public constant MIN_UVBE_SHARES = 50_000_000_000_000_000_000; // 50 UVBE
  uint256 public constant STAKE_AMOUNT = 50_000_000_000_000_000_000; // 50 UVBE

  function testFork_Complete50UVBEDepositAndStakeFlow() public {
    IERC20 usdcToken = IERC20(USDC);
    UVBEV2 uvbeToken = UVBEV2(UVBE);
    UnifyVaultControllerUpgradeable controller = UnifyVaultControllerUpgradeable(CONTROLLER_PROXY);
    UVBEStakingVault stakingVault = UVBEStakingVault(STAKING_VAULT);

    // Provide test user with 51 USDC
    deal(USDC, user, DEPOSIT_USDC_AMOUNT);
    assertEq(usdcToken.balanceOf(user), DEPOSIT_USDC_AMOUNT);

    vm.startPrank(user);

    // 1. Approve Collateral
    usdcToken.approve(CONTROLLER_PROXY, DEPOSIT_USDC_AMOUNT);

    // 2. Deposit Collateral -> Mint UVBE
    UnifyVaultControllerUpgradeable.DepositQuote memory quote = controller.deposit(
      USDC,
      DEPOSIT_USDC_AMOUNT,
      MIN_UVBE_SHARES,
      user
    );

    console2.log('Shares minted: ', quote.sharesPreview);
    console2.log('Net deposit:   ', quote.netDeposit);
    console2.log('Protocol fee:  ', quote.protocolFee);

    // 3. Verify UVBE balance >= 50
    uint256 uvbeBal = uvbeToken.balanceOf(user);
    console2.log('User UVBE balance after deposit:', uvbeBal);
    assertGe(uvbeBal, STAKE_AMOUNT, 'UVBE balance must be >= 50 UVBE');

    // 4. Approve 50 UVBE -> StakingVault
    uvbeToken.approve(STAKING_VAULT, STAKE_AMOUNT);

    // 5. Stake 50 UVBE
    stakingVault.stake(STAKE_AMOUNT, referrer);

    vm.stopPrank();

    // Verification
    assertEq(stakingVault.getPermanentStake(user), STAKE_AMOUNT);
    console2.log('User successfully staked in vault:', stakingVault.getPermanentStake(user));
  }
}
