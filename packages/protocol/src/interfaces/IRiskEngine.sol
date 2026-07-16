// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import '../types/RiskTypes.sol';

/**
 * @title IRiskEngine
 * @notice Interface for the UnifyVault Risk Engine module
 */
interface IRiskEngine {
  /**
   * @notice Performs a risk evaluation of the protocol state based on active market indicators
   * @param asset The address of the collateral asset being verified
   * @param inputs Current risk indicators gathered by off-chain keepers or oracles
   * @return evaluation Struct detailing allowed operations, fees, and pause triggers
   */
  function evaluateRisk(
    address asset,
    RiskInputs calldata inputs
  ) external view returns (RiskEvaluation memory evaluation);

  /**
   * @notice Returns the active global state of the protocol (Normal, Stressed, Emergency)
   */
  function getProtocolState() external view returns (ProtocolState);

  /**
   * @notice Manually overrides the protocol state in the event of unforeseen anomalies
   * @param newState The target protocol state
   */
  function setProtocolStateOverride(ProtocolState newState) external;
}
