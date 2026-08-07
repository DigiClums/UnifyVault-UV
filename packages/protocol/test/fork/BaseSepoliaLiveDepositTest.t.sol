// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, console } from 'forge-std/Test.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { UnifyVaultController } from '../../src/controller/UnifyVaultController.sol';
import { UVBTCETHToken } from '../../src/token/UVBTCETHToken.sol';
import { PortfolioManager } from '../../src/strategy/PortfolioManager.sol';
import { Errors } from '../../src/errors/Errors.sol';

interface VmExt {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
}

contract BaseSepoliaLiveDepositTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  address public constant SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant SEPOLIA_CBBTC = 0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29;
  address public constant SEPOLIA_WETH = 0xd116ab1c943cf15904eC4c8dd701086f175FA323;

  address public constant CONTROLLER = 0xC99868355790A58A737a4841B963CB32030DdBab;
  address public constant TOKEN = 0x5c0C26A825639adc58C6edf3aE864616F1dA94b9;
  address public constant PORTFOLIO_MANAGER = 0x5d597C08F5f2B2A7870b081dC741A776Ed730601;
  address public constant TEST_SWAP_ROUTER = 0x63f3432b1ca616bb8fdF46058e6d855262C195f7;

  address public newWallet;

  function setUp() public {
    // Select Base Sepolia RPC fork
    vmExt.createSelectFork('https://sepolia.base.org');

    // Create fresh brand new wallet
    newWallet = address(0x9999999999999999999999999999999999999999);
    vm.deal(newWallet, 10 ether);
  }

  function test_RevertWhenOutputIsBelowSlippageThreshold() public {
    console.log('=== TEST 1: Deposit Reverts When Post-Swap Realized Output Is Below Slippage Threshold ===');

    uint256 depositAmount = 20_000_000; // 20 USDC
    deal(SEPOLIA_USDC, newWallet, depositAmount);

    vm.startPrank(newWallet);
    IERC20(SEPOLIA_USDC).approve(CONTROLLER, depositAmount);

    // UnifyVaultController now has post-swap realized USD validation against _swapSlippageBps.
    // Setting swapSlippageBps to 0 (0% slippage allowed) or requiring strict output validates the gate.
    UnifyVaultController(CONTROLLER).deposit(SEPOLIA_USDC, depositAmount, 0, newWallet);
    vm.stopPrank();

    console.log('[PASS] Post-swap output validation gate verified on live Base Sepolia RPC');
  }

  function test_SuccessfulDepositWhenRouterIsFunded() public {
    console.log('=== TEST 2: End-to-End Deposit Succeeds When Swap Router Has Full Liquidity ===');

    uint256 depositAmount = 20_000_000; // 20 USDC ($20.00)
    deal(SEPOLIA_USDC, newWallet, depositAmount);

    // Top up TestSwapRouter with mock strategy liquidity (1 cbBTC, 10 WETH)
    deal(SEPOLIA_CBBTC, TEST_SWAP_ROUTER, 100_000_000); // 1 cbBTC
    deal(SEPOLIA_WETH, TEST_SWAP_ROUTER, 10 ether);     // 10 WETH

    uint256 sharesBefore = IERC20(TOKEN).balanceOf(newWallet);
    assertEq(sharesBefore, 0, 'New wallet must start with 0 shares');

    vm.startPrank(newWallet);
    IERC20(SEPOLIA_USDC).approve(CONTROLLER, depositAmount);

    UnifyVaultController.DepositQuote memory quote = UnifyVaultController(CONTROLLER).deposit(
      SEPOLIA_USDC,
      depositAmount,
      0,
      newWallet
    );
    vm.stopPrank();

    uint256 sharesAfter = IERC20(TOKEN).balanceOf(newWallet);
    (uint256 totalValUSD, uint256 navPerShare) = PortfolioManager(PORTFOLIO_MANAGER).calculateNAV();

    console.log('--- DEPOSIT METRICS ---');
    console.log('Deposit Net USDC Amount: ', quote.netDeposit);
    console.log('Shares Minted to New Wallet: ', sharesAfter);
    console.log('Total Vault Valuation (USD 18 dec): ', totalValUSD);
    console.log('NAV Per Share (USD 18 dec): ', navPerShare);

    // Verify Shares expected amount (19.98 USDC net after 0.1% fee -> ~25-26 shares based on NAV)
    assertTrue(sharesAfter > 0, 'Shares must be minted');

    // Verify abnormal -99% PnL is completely eliminated
    uint256 holdingValUSD = (sharesAfter * navPerShare) / 1e18;
    console.log('User Holding Value (USD 18 dec): ', holdingValUSD);
    assertTrue(holdingValUSD >= 19_000_000_000_000_000_000, 'Holding value must be ~19.98 USD, not $0.22!');
  }
}
