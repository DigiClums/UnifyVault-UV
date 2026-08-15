// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

/**
 * @notice Global operational states of the protocol
 */
enum ProtocolState {
  NORMAL,
  STRESSED,
  EMERGENCY
}

/**
 * @notice Structural parameters gathered to perform risk evaluation
 */
struct RiskInputs {
  uint256 priceFeedAge; // Heartbeat age in seconds
  uint256 priceDeviationBps; // Deviation between primary and fallback feeds in bps
  uint256 poolLiquidityDepth; // Collateral depth in secondary DEX pools
  bool isSequencerUp; // L2 Sequencer online status flag
  uint256 volatilityMetric; // Custom volatility variance metric
}

/**
 * @notice Evaluation result output containing active parameter overrides
 */
struct RiskEvaluation {
  bool allowMint;
  bool allowBurn;
  uint24 recommendedMintFeeBps;
  uint24 recommendedBurnFeeBps;
  bool triggerPauseMint;
  bool triggerPauseBurn;
  bool raiseEmergencyAlert;
}
