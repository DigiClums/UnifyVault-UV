// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @title IToken
 * @notice Interface for the UnifyVault index token
 */
interface IToken is IERC20 {
  function mint(address account, uint256 amount) external;
  function burn(address account, uint256 amount) external;
}
