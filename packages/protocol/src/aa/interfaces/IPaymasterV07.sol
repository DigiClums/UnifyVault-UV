// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @notice ERC-4337 v0.7 PackedUserOperation struct
 */
struct PackedUserOperation {
  address sender;
  uint256 nonce;
  bytes initCode;
  bytes callData;
  bytes32 accountGasLimits;
  uint256 preVerificationGas;
  bytes32 gasFees;
  bytes paymasterAndData;
  bytes signature;
}

/**
 * @notice ERC-4337 v0.7 IPaymaster interface
 */
interface IPaymasterV07 {
  enum PostOpMode {
    opSucceeded,
    opReverted,
    postOpReverted
  }

  function validatePaymasterUserOp(
    PackedUserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
  ) external returns (bytes memory context, uint256 validationData);

  function postOp(
    PostOpMode mode,
    bytes calldata context,
    uint256 actualGasCost,
    uint256 actualUserOpFeePerGas
  ) external;
}

/**
 * @notice ERC-4337 v0.7 IEntryPoint interface (gas deposit & stake management)
 */
interface IEntryPointV07 {
  struct DepositInfo {
    uint256 deposit;
    bool staked;
    uint112 stake;
    uint32 unstakeDelaySec;
    uint48 withdrawTime;
  }

  function depositTo(address account) external payable;
  function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external;
  function getDepositInfo(address account) external view returns (DepositInfo memory info);
  function balanceOf(address account) external view returns (uint256);
  function addStake(uint32 unstakeDelaySec) external payable;
  function unlockStake() external;
  function withdrawStake(address payable withdrawAddress) external;
}
