// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import 'forge-std/Test.sol';

contract PhaseENavV4StabilizerForkSimulationTest is Test {
  address constant PORTFOLIO_MANAGER = 0x66182F56BD5E523c655f6890290aB519f528e83f;
  address constant ORACLE_MANAGER = 0x91B488cdE0f2Ef28141FE4ffD8531c4179B48EA7;
  address constant V4_POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
  bytes32 constant V4_POOL_ID = 0x21db2ac844f3933a74135e6feed4bd06c0f6a4a9dcc13c9b22dde903710c5daa;

  address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
  address constant UVBE = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;
  address constant TREASURY = 0x57561F781b2f558A7445D2E93a365C03BA2c9B53;

  enum ActionDecision {
    NO_ACTION,
    MONITOR_ONLY,
    STABILIZE_BUY_UVBE,
    STABILIZE_SELL_UVBE,
    CIRCUIT_BREAKER_INSUFFICIENT_LIQ,
    CIRCUIT_BREAKER_STALE_ORACLE,
    EMERGENCY_DEVIATION_HALT,
    COOLDOWN_ACTIVE
  }

  struct StabilizerConfig {
    uint256 minDeviationBps; // 50 bps (0.50%)
    uint256 maxDeviationBps; // 200 bps (2.00%)
    uint256 maxTradeUsdc; // 100 USDC per trade
    uint256 dailyMaxUsdc; // 500 USDC per day
    uint256 cooldownSeconds; // 300s (5 mins)
    uint256 minPoolLiquidity; // Minimum liquidity threshold
  }

  StabilizerConfig config;
  uint256 lastActionTimestamp;

  function setUp() public {
    config = StabilizerConfig({
      minDeviationBps: 50,
      maxDeviationBps: 200,
      maxTradeUsdc: 100e6,
      dailyMaxUsdc: 500e6,
      cooldownSeconds: 300,
      minPoolLiquidity: 1000
    });
    lastActionTimestamp = 0;
  }

  function evaluateStabilizer(
    uint256 navPriceWei,
    uint256 dexPriceWei,
    uint256 poolLiquidity,
    uint256 oracleAgeSeconds,
    uint256 currentTimestamp
  ) internal view returns (ActionDecision decision, uint256 deviationBps, uint256 tradeAmount) {
    // 1. Oracle Freshness Check
    if (oracleAgeSeconds > 3600) {
      return (ActionDecision.CIRCUIT_BREAKER_STALE_ORACLE, 0, 0);
    }

    // 2. Pool Liquidity Check
    if (poolLiquidity < config.minPoolLiquidity) {
      return (ActionDecision.CIRCUIT_BREAKER_INSUFFICIENT_LIQ, 0, 0);
    }

    // 3. Calculate Deviation in BPS
    if (dexPriceWei >= navPriceWei) {
      deviationBps = ((dexPriceWei - navPriceWei) * 10000) / navPriceWei;
    } else {
      deviationBps = ((navPriceWei - dexPriceWei) * 10000) / navPriceWei;
    }

    // 4. Band Evaluation
    if (deviationBps <= 10) {
      return (ActionDecision.NO_ACTION, deviationBps, 0);
    }

    if (deviationBps < config.minDeviationBps) {
      return (ActionDecision.MONITOR_ONLY, deviationBps, 0);
    }

    if (deviationBps > config.maxDeviationBps) {
      return (ActionDecision.EMERGENCY_DEVIATION_HALT, deviationBps, 0);
    }

    // 5. Cooldown Check (Only if previous action happened)
    if (
      lastActionTimestamp > 0 && currentTimestamp < lastActionTimestamp + config.cooldownSeconds
    ) {
      return (ActionDecision.COOLDOWN_ACTIVE, deviationBps, 0);
    }

    // 6. Action Direction
    if (dexPriceWei < navPriceWei) {
      tradeAmount = config.maxTradeUsdc;
      return (ActionDecision.STABILIZE_BUY_UVBE, deviationBps, tradeAmount);
    } else {
      tradeAmount = (config.maxTradeUsdc * 1e18) / navPriceWei;
      return (ActionDecision.STABILIZE_SELL_UVBE, deviationBps, tradeAmount);
    }
  }

  function test_Scenario1_Equilibrium_NoAction() public {
    uint256 nav = 1004200000000000000; // $1.0042
    uint256 dex = 1004200000000000000; // $1.0042
    (ActionDecision decision, uint256 devBps, ) = evaluateStabilizer(
      nav,
      dex,
      50000,
      60,
      block.timestamp
    );
    assertEq(uint256(decision), uint256(ActionDecision.NO_ACTION));
    assertEq(devBps, 0);
  }

  function test_Scenario2_DexUndervalued_CalculateCorrection() public {
    uint256 nav = 1004200000000000000; // $1.0042
    uint256 dex = 998000000000000000; // $0.9980 (Deviation ~61 BPS)
    (ActionDecision decision, uint256 devBps, uint256 tradeAmount) = evaluateStabilizer(
      nav,
      dex,
      50000,
      60,
      block.timestamp
    );
    assertEq(uint256(decision), uint256(ActionDecision.STABILIZE_BUY_UVBE));
    assertGt(devBps, 50);
    assertLe(devBps, 200);
    assertEq(tradeAmount, 100e6);
  }

  function test_Scenario3_DexOvervalued_CalculateCorrection() public {
    uint256 nav = 1004200000000000000; // $1.0042
    uint256 dex = 1020000000000000000; // $1.0200 (Deviation ~157 BPS)
    (ActionDecision decision, uint256 devBps, uint256 tradeAmount) = evaluateStabilizer(
      nav,
      dex,
      50000,
      60,
      block.timestamp
    );
    assertEq(uint256(decision), uint256(ActionDecision.STABILIZE_SELL_UVBE));
    assertGt(devBps, 50);
    assertLe(devBps, 200);
    assertGt(tradeAmount, 0);
  }

  function test_Scenario4_InsufficientLiquidity_CircuitBreaker() public {
    uint256 nav = 1004200000000000000;
    uint256 dex = 990000000000000000;
    (ActionDecision decision, , ) = evaluateStabilizer(nav, dex, 500, 60, block.timestamp);
    assertEq(uint256(decision), uint256(ActionDecision.CIRCUIT_BREAKER_INSUFFICIENT_LIQ));
  }

  function test_Scenario5_StaleOracle_NoTrade() public {
    uint256 nav = 1004200000000000000;
    uint256 dex = 990000000000000000;
    (ActionDecision decision, , ) = evaluateStabilizer(nav, dex, 50000, 4000, block.timestamp);
    assertEq(uint256(decision), uint256(ActionDecision.CIRCUIT_BREAKER_STALE_ORACLE));
  }

  function test_Scenario6_ExtremeDeviation_EmergencyHalt() public {
    uint256 nav = 1004200000000000000;
    uint256 dex = 1035000000000000000;
    (ActionDecision decision, uint256 devBps, ) = evaluateStabilizer(
      nav,
      dex,
      50000,
      60,
      block.timestamp
    );
    assertEq(uint256(decision), uint256(ActionDecision.EMERGENCY_DEVIATION_HALT));
    assertGt(devBps, 200);
  }

  function test_Scenario7_CooldownProtection() public {
    uint256 nav = 1004200000000000000;
    uint256 dex = 998000000000000000;
    lastActionTimestamp = block.timestamp;

    (ActionDecision decision, , ) = evaluateStabilizer(nav, dex, 50000, 60, block.timestamp + 30);
    assertEq(uint256(decision), uint256(ActionDecision.COOLDOWN_ACTIVE));
  }
}
