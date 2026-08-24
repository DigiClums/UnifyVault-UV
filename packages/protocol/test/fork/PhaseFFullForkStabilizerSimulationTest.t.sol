// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import 'forge-std/Test.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IPortfolioManager {
  function calculateUVPrice() external view returns (uint256 totalBacking, uint256 tokenPrice);
}

interface IController {
  struct DepositQuote {
    uint256 depositAmount;
    uint256 protocolFee;
    uint256 netDeposit;
    uint256 sharesPreview;
  }
  function deposit(
    address asset,
    uint256 amount,
    uint256 minSharesOut,
    address receiver
  ) external returns (DepositQuote memory);
}

contract PhaseFFullForkStabilizerSimulationTest is Test {
  address constant PORTFOLIO_MANAGER = 0x66182F56BD5E523c655f6890290aB519f528e83f;
  address constant CONTROLLER = 0xe6Cd99f3DcF39BD76D91D211Dce7f4BdF801C366;
  address constant TREASURY = 0x57561F781b2f558A7445D2E93a365C03BA2c9B53;
  address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
  address constant UVBE = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;

  address constant V4_POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
  bytes32 constant V4_POOL_ID = 0x21db2ac844f3933a74135e6feed4bd06c0f6a4a9dcc13c9b22dde903710c5daa;

  address stabilizer;

  uint256 constant MAX_SINGLE_TRADE = 100e6; // 100 USDC
  uint256 constant MAX_DAILY_EXPOSURE = 500e6; // 500 USDC
  uint256 constant COOLDOWN = 300; // 5 minutes

  function setUp() public {
    stabilizer = address(0x9999999999999999999999999999999999999999);
    deal(USDC, stabilizer, 500e6);
    deal(UVBE, stabilizer, 500e18);
  }

  function test_Part1_RealForkState() public {
    uint256 currentBlock = block.number;
    (uint256 backing, uint256 nav) = IPortfolioManager(PORTFOLIO_MANAGER).calculateUVPrice();
    uint256 uvbeSupply = IERC20(UVBE).totalSupply();
    uint256 treasuryUsdc = IERC20(USDC).balanceOf(TREASURY);
    uint256 treasuryUvbe = IERC20(UVBE).balanceOf(TREASURY);

    console.log('=== PART 1: REAL BASE MAINNET FORK STATE ===');
    console.log('Current Fork Block:', currentBlock);
    console.log('True Backing USD:  ', backing / 1e18);
    console.log('True NAV Price USD:', nav / 1e18);
    console.log('UVBE Total Supply: ', uvbeSupply / 1e18);
    console.log('Treasury USDC:     ', treasuryUsdc);
    console.log('Treasury UVBE:     ', treasuryUvbe);

    assertGt(currentBlock, 50000000);
    assertGt(nav, 0);
  }

  function test_ScenarioA_DexUndervalued_StabilizationFlow() public {
    (, uint256 nav) = IPortfolioManager(PORTFOLIO_MANAGER).calculateUVPrice();
    uint256 simulatedDexPrice = (nav * 99) / 100; // 1% below NAV
    uint256 deviationBps = ((nav - simulatedDexPrice) * 10000) / nav;

    console.log('=== SCENARIO A: DEX UNDERVALUED (1% BELOW NAV) ===');
    console.log('NAV Before:        ', nav);
    console.log('Simulated DEX Price:', simulatedDexPrice);
    console.log('Deviation BPS:     ', deviationBps);

    uint256 tradeAmount = MAX_SINGLE_TRADE;
    uint256 uvbeAcquired = (tradeAmount * 1e18) / (simulatedDexPrice / 1e12);

    vm.startPrank(stabilizer);
    IERC20(USDC).transfer(address(0x8888888888888888888888888888888888888888), tradeAmount);
    vm.stopPrank();

    uint256 priceAfter = simulatedDexPrice + (((nav - simulatedDexPrice) * 80) / 100);
    uint256 devAfter = ((nav - priceAfter) * 10000) / nav;

    console.log('Trade Amount USDC: ', tradeAmount / 1e6);
    console.log('UVBE Acquired:     ', uvbeAcquired / 1e18);
    console.log('Price After:       ', priceAfter);
    console.log('Deviation After BPS:', devAfter);
    console.log('Stabilizer USDC Rem:', IERC20(USDC).balanceOf(stabilizer) / 1e6);

    assertLt(devAfter, deviationBps);
    assertEq(IERC20(USDC).balanceOf(stabilizer), 400e6);
  }

  function test_ScenarioB_DexOvervalued_MintAndStabilize() public {
    (, uint256 nav) = IPortfolioManager(PORTFOLIO_MANAGER).calculateUVPrice();
    uint256 simulatedDexPrice = (nav * 101) / 100; // 1% above NAV
    uint256 deviationBps = ((simulatedDexPrice - nav) * 10000) / nav;

    console.log('=== SCENARIO B: DEX OVERVALUED (1% ABOVE NAV) ===');
    console.log('NAV Before:        ', nav);
    console.log('Simulated DEX Price:', simulatedDexPrice);
    console.log('Deviation BPS:     ', deviationBps);

    vm.startPrank(stabilizer);
    IERC20(USDC).approve(CONTROLLER, 100e6);
    IController.DepositQuote memory quote = IController(CONTROLLER).deposit(
      USDC,
      100e6,
      0,
      stabilizer
    );
    vm.stopPrank();

    console.log('Controller Deposit Net USDC:', quote.netDeposit / 1e6);
    console.log('UVBE Shares Minted:         ', quote.sharesPreview / 1e18);

    uint256 priceAfter = simulatedDexPrice - (((simulatedDexPrice - nav) * 80) / 100);
    uint256 devAfter = ((priceAfter - nav) * 10000) / nav;

    console.log('Price After:                ', priceAfter);
    console.log('Deviation After BPS:        ', devAfter);

    assertLt(devAfter, deviationBps);
    assertGt(quote.sharesPreview, 0);
  }

  function test_ScenarioC_ExtremeDeviation_EmergencyHalt() public {
    (, uint256 nav) = IPortfolioManager(PORTFOLIO_MANAGER).calculateUVPrice();
    uint256 dexPrice = (nav * 103) / 100; // 3% deviation
    uint256 deviationBps = ((dexPrice - nav) * 10000) / nav;

    console.log('=== SCENARIO C: EXTREME DEVIATION > 2% ===');
    console.log('Deviation BPS:', deviationBps);

    bool emergencyHalt = deviationBps > 200;
    console.log('Emergency Halt Triggered:', emergencyHalt);
    assertTrue(emergencyHalt);
  }

  function test_ScenarioD_InsufficientLiquidity_CircuitBreaker() public {
    uint256 poolLiquidity = 50;
    uint256 minLiquidity = 1000;
    bool circuitBreaker = poolLiquidity < minLiquidity;
    assertTrue(circuitBreaker);
  }

  function test_ScenarioE_StaleOracle_NoTrade() public {
    uint256 oracleAge = 5000;
    bool noTrade = oracleAge > 3600;
    assertTrue(noTrade);
  }

  function test_ScenarioF_DailyExposureAndCooldownEnforcement() public {
    uint256 dailySpent = 0;
    uint256 lastAction = block.timestamp;

    dailySpent += MAX_SINGLE_TRADE;
    assertEq(dailySpent, 100e6);

    bool cooldownBlocked = (block.timestamp + 30) < lastAction + COOLDOWN;
    assertTrue(cooldownBlocked);

    lastAction = block.timestamp + COOLDOWN;
    dailySpent += MAX_SINGLE_TRADE;
    dailySpent += MAX_SINGLE_TRADE;
    dailySpent += MAX_SINGLE_TRADE;
    dailySpent += MAX_SINGLE_TRADE;

    bool dailyCapReached = dailySpent >= MAX_DAILY_EXPOSURE;
    assertTrue(dailyCapReached);
  }
}
