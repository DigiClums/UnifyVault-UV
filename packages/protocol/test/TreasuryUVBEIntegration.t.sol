// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../src/vault/Treasury.sol';
import '../src/staking/UVBEStakingVault.sol';
import '../src/staking/UVBEReferralRegistry.sol';
import '../src/staking/UVBERewardDistributor.sol';
import { Errors as ProtocolErrors } from '../src/errors/Errors.sol';
import '../src/libraries/AccessRoles.sol';

contract MockUVBEToken is ERC20 {
  constructor() ERC20('UnifyVault Base Ecosystem', 'UVBE') {
    _mint(msg.sender, 10_000_000 * 1e18);
  }
}

contract MockUSDCToken is ERC20 {
  constructor() ERC20('USD Coin', 'USDC') {
    _mint(msg.sender, 10_000_000 * 1e6);
  }

  function decimals() public pure override returns (uint8) {
    return 6;
  }
}

contract TreasuryUVBEIntegrationTest is Test {
  Treasury public treasury;
  UVBEStakingVault public stakingVault;
  UVBEReferralRegistry public referralRegistry;
  UVBERewardDistributor public rewardDistributor;

  MockUVBEToken public uvbe;
  MockUSDCToken public usdc;

  address public admin = address(0xAA11);
  address public governance = address(0xAA22);
  address public genesisReferrer = address(0xAA33);
  address public userA = address(0xBB11);
  address public userB = address(0xBB22);
  address public treasuryRecipient = address(0xCC11);

  event TreasuryWithdrawal(
    address indexed asset,
    address indexed recipient,
    uint256 amount,
    address indexed caller
  );
  event FeeCollected(address indexed asset, address indexed from, uint256 amount);

  function setUp() public {
    vm.startPrank(admin);

    // 1. Deploy Tokens
    uvbe = new MockUVBEToken();
    usdc = new MockUSDCToken();

    // 2. Deploy Treasury
    treasury = new Treasury();
    treasury.grantRole(AccessRoles.GOVERNANCE_ROLE, governance);

    // Register USDC and UVBE in Treasury
    treasury.registerAsset(address(usdc), 6);
    treasury.registerAsset(address(uvbe), 18);

    // 3. Deploy Staking Subsystem (treasury receives the 5% staking fees)
    referralRegistry = new UVBEReferralRegistry(admin, genesisReferrer);
    rewardDistributor = new UVBERewardDistributor(admin, address(uvbe));
    stakingVault = new UVBEStakingVault(address(treasury), address(uvbe));

    // Connect modules
    referralRegistry.setModules(address(stakingVault), address(rewardDistributor));
    rewardDistributor.setModules(address(stakingVault), address(referralRegistry));
    vm.stopPrank();

    vm.prank(address(treasury));
    stakingVault.setModules(address(referralRegistry), address(rewardDistributor));

    // 4. Distribute tokens for testing
    vm.startPrank(admin);
    uvbe.transfer(userA, 10_000 * 1e18);
    uvbe.transfer(userB, 10_000 * 1e18);
    usdc.transfer(address(treasury), 50_000 * 1e6); // Pre-fund Treasury USDC fees
    vm.stopPrank();

    // User approvals for staking
    vm.prank(userA);
    uvbe.approve(address(stakingVault), type(uint256).max);
    vm.prank(userB);
    uvbe.approve(address(stakingVault), type(uint256).max);
  }

  // --- 1. Balance Read Tests ---

  function testTreasuryUVBEBalanceRead() public {
    // Initially Treasury has 0 UVBE
    assertEq(treasury.balance(address(uvbe)), 0);
    assertEq(treasury.totalAssetBalance(address(uvbe)), 0);
    assertEq(uvbe.balanceOf(address(treasury)), 0);

    // Stake 100 UVBE -> 5% (5 UVBE) goes to Treasury
    vm.prank(userA);
    stakingVault.stake(100 * 1e18, genesisReferrer);

    // Treasury balance must be exactly 5 UVBE
    assertEq(treasury.balance(address(uvbe)), 5 * 1e18);
    assertEq(treasury.totalAssetBalance(address(uvbe)), 5 * 1e18);
    assertEq(uvbe.balanceOf(address(treasury)), 5 * 1e18);

    // StakingVault balance must be exactly 95 UVBE
    assertEq(stakingVault.getPermanentStake(userA), 95 * 1e18);
    assertEq(stakingVault.totalPermanentStaked(), 95 * 1e18);
    assertEq(stakingVault.getAvailableProtocolCapital(), 95 * 1e18);
  }

  // --- 2. Authorized Withdrawal Tests ---

  function testAuthorizedUVBEWithdrawalSuccess() public {
    // User A stakes 1000 UVBE -> 50 UVBE fee sent to Treasury
    vm.prank(userA);
    stakingVault.stake(1000 * 1e18, genesisReferrer);

    assertEq(treasury.balance(address(uvbe)), 50 * 1e18);
    assertEq(uvbe.balanceOf(treasuryRecipient), 0);

    // Governance admin withdraws 20 UVBE from Treasury
    vm.prank(governance);
    vm.expectEmit(true, true, false, true);
    emit TreasuryWithdrawal(address(uvbe), treasuryRecipient, 20 * 1e18, governance);
    treasury.withdraw(address(uvbe), treasuryRecipient, 20 * 1e18);

    // Verify balances
    assertEq(treasury.balance(address(uvbe)), 30 * 1e18);
    assertEq(uvbe.balanceOf(treasuryRecipient), 20 * 1e18);
  }

  // --- 3. Unauthorized Withdrawal Reverts ---

  function testUnauthorizedUVBEWithdrawalReverts() public {
    vm.prank(userA);
    stakingVault.stake(1000 * 1e18, genesisReferrer);

    // Non-governance user attempts to withdraw
    vm.prank(userB);
    vm.expectRevert(
      abi.encodeWithSignature(
        'AccessControlUnauthorizedAccount(address,bytes32)',
        userB,
        AccessRoles.GOVERNANCE_ROLE
      )
    );
    treasury.withdraw(address(uvbe), userB, 10 * 1e18);
  }

  // --- 4. Zero Amount Reverts ---

  function testZeroAmountUVBEWithdrawalReverts() public {
    vm.prank(governance);
    vm.expectRevert(abi.encodeWithSelector(ProtocolErrors.MathCalculationOverflow.selector));
    treasury.withdraw(address(uvbe), treasuryRecipient, 0);
  }

  // --- 5. Insufficient Balance Reverts ---

  function testInsufficientTreasuryUVBEBalanceReverts() public {
    vm.prank(userA);
    stakingVault.stake(100 * 1e18, genesisReferrer); // Treasury gets 5 UVBE

    // Attempt to withdraw 10 UVBE
    vm.prank(governance);
    vm.expectRevert(
      abi.encodeWithSelector(
        ProtocolErrors.InsufficientReserves.selector,
        address(uvbe),
        10 * 1e18,
        5 * 1e18
      )
    );
    treasury.withdraw(address(uvbe), treasuryRecipient, 10 * 1e18);
  }

  // --- 6. USDC Withdrawal Regression Protection ---

  function testUSDCWithdrawalRemainsWorking() public {
    assertEq(treasury.balance(address(usdc)), 50_000 * 1e6);

    vm.prank(governance);
    vm.expectEmit(true, true, false, true);
    emit TreasuryWithdrawal(address(usdc), treasuryRecipient, 10_000 * 1e6, governance);
    treasury.withdraw(address(usdc), treasuryRecipient, 10_000 * 1e6);

    assertEq(treasury.balance(address(usdc)), 40_000 * 1e6);
    assertEq(usdc.balanceOf(treasuryRecipient), 10_000 * 1e6);
  }

  // --- 7. CRITICAL SECURITY BOUNDARY ISOLATION CHECK ---

  function testUVBEWithdrawalDoesNotAffectStakingVaultBalanceOrLiabilities() public {
    // User A stakes 1000 UVBE -> 50 UVBE Treasury, 950 UVBE Vault
    vm.prank(userA);
    stakingVault.stake(1000 * 1e18, genesisReferrer);

    uint256 vaultBalanceBefore = uvbe.balanceOf(address(stakingVault));
    uint256 vaultStakedBefore = stakingVault.totalPermanentStaked();
    uint256 userAStakeBefore = stakingVault.getPermanentStake(userA);
    uint256 vaultCapitalBefore = stakingVault.getAvailableProtocolCapital();
    uint256 liabilitiesBefore = rewardDistributor.totalOutstandingLiabilities();

    assertEq(vaultBalanceBefore, 950 * 1e18);
    assertEq(vaultStakedBefore, 950 * 1e18);
    assertEq(userAStakeBefore, 950 * 1e18);
    assertEq(vaultCapitalBefore, 950 * 1e18);

    // Governance withdraws ALL 50 UVBE from Treasury
    vm.prank(governance);
    treasury.withdraw(address(uvbe), treasuryRecipient, 50 * 1e18);

    // Treasury is now empty
    assertEq(treasury.balance(address(uvbe)), 0);
    assertEq(uvbe.balanceOf(treasuryRecipient), 50 * 1e18);

    // PROOF: StakingVault parameters are 100% UNCHANGED and UNTOUCHED
    assertEq(
      uvbe.balanceOf(address(stakingVault)),
      vaultBalanceBefore,
      'Vault token balance modified!'
    );
    assertEq(
      stakingVault.totalPermanentStaked(),
      vaultStakedBefore,
      'Total permanent staked modified!'
    );
    assertEq(stakingVault.getPermanentStake(userA), userAStakeBefore, 'User stake modified!');
    assertEq(
      stakingVault.getAvailableProtocolCapital(),
      vaultCapitalBefore,
      'Available capital modified!'
    );
    assertEq(
      rewardDistributor.totalOutstandingLiabilities(),
      liabilitiesBefore,
      'Liabilities modified!'
    );
  }
}
